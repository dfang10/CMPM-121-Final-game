import * as THREE from "three";
import * as CANNON from "cannon-es";

console.log("main.js loaded");

let scene, camera, renderer;
let world;
let boardMesh, boardBody;
let ballMesh, ballBody;
const wallMeshes = [];

// 倾斜状态
const tilt = { x: 0, z: 0 };
const tiltTarget = { x: 0, z: 0 };

// 尺寸常量
const BOARD_SIZE = 10;
const BOARD_THICK = 0.5;
const BALL_RADIUS = 0.5;

// 终点洞参数
const HOLE_RADIUS = 0.6;
let holeMesh;
const holeWorldPos = new THREE.Vector3();

let levelComplete = false;
let winShown = false;

let lastTime = 0;

initScene();
initPhysics();
createBoard();
createWalls();
createBall();
createGoalHole();   // 👈 随机生成终点洞
initControls();
animate();

function initScene() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x202020);

  camera = new THREE.PerspectiveCamera(
    45,
    window.innerWidth / window.innerHeight,
    0.1,
    100
  );
  camera.position.set(8, 8, 8);
  camera.lookAt(0, 0, 0);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  const dirLight = new THREE.DirectionalLight(0xffffff, 1);
  dirLight.position.set(5, 10, 7);
  scene.add(dirLight);

  const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 0.7);
  scene.add(hemi);
}

function initPhysics() {
  world = new CANNON.World({
    gravity: new CANNON.Vec3(0, -9.82, 0),
  });

  world.broadphase = new CANNON.NaiveBroadphase();
  world.solver.iterations = 20;
  world.solver.tolerance = 0.001;

  world.defaultContactMaterial.friction = 0.01;
  world.defaultContactMaterial.restitution = 0.2;
}

function createBoard() {
  // three.js 板子
  const geo = new THREE.BoxGeometry(BOARD_SIZE, BOARD_THICK, BOARD_SIZE);
  const mat = new THREE.MeshStandardMaterial({ color: 0x1e90ff });
  boardMesh = new THREE.Mesh(geo, mat);
  scene.add(boardMesh);

  // cannon 板子刚体（后面围墙也作为它的子 shape）
  const boardShape = new CANNON.Box(
    new CANNON.Vec3(BOARD_SIZE / 2, BOARD_THICK / 2, BOARD_SIZE / 2)
  );
  boardBody = new CANNON.Body({ mass: 0 });
  boardBody.addShape(boardShape);
  boardBody.position.set(0, 0, 0);
  world.addBody(boardBody);
}

function createWalls() {
  const wallThickness = 0.4;
  const wallHeight = 1.0;
  const WALL_OVERLAP = 0.4; // 墙比板子略长，避免角落有缝

  const halfThick = wallThickness / 2;
  const halfHeight = wallHeight / 2;

  const wallConfig = [
    // +X 右边
    {
      x: BOARD_SIZE / 2 + halfThick,
      z: 0,
      len: BOARD_SIZE + WALL_OVERLAP,
      axis: "x",
    },
    // -X 左边
    {
      x: -BOARD_SIZE / 2 - halfThick,
      z: 0,
      len: BOARD_SIZE + WALL_OVERLAP,
      axis: "x",
    },
    // +Z 上边
    {
      x: 0,
      z: BOARD_SIZE / 2 + halfThick,
      len: BOARD_SIZE + WALL_OVERLAP,
      axis: "z",
    },
    // -Z 下边
    {
      x: 0,
      z: -BOARD_SIZE / 2 - halfThick,
      len: BOARD_SIZE + WALL_OVERLAP,
      axis: "z",
    },
  ];

  wallConfig.forEach((w) => {
    let meshGeo, halfExtents;

    if (w.axis === "x") {
      meshGeo = new THREE.BoxGeometry(wallThickness, wallHeight, w.len);
      halfExtents = new CANNON.Vec3(halfThick, halfHeight, w.len / 2);
    } else {
      meshGeo = new THREE.BoxGeometry(w.len, wallHeight, wallThickness);
      halfExtents = new CANNON.Vec3(w.len / 2, halfHeight, halfThick);
    }

    const mat = new THREE.MeshStandardMaterial({ color: 0x144a9b });
    const mesh = new THREE.Mesh(meshGeo, mat);
    const y = BOARD_THICK / 2 + halfHeight;
    mesh.position.set(w.x, y, w.z);
    boardMesh.add(mesh); // 可视上绑定到板子
    wallMeshes.push(mesh);

    // 物理上作为 boardBody 的附加 shape
    const shape = new CANNON.Box(halfExtents);
    const offset = new CANNON.Vec3(w.x, y, w.z);
    boardBody.addShape(shape, offset);
  });
}

function createBall() {
  const geo = new THREE.SphereGeometry(BALL_RADIUS, 32, 32);
  const mat = new THREE.MeshStandardMaterial({ color: 0xff5555 });
  ballMesh = new THREE.Mesh(geo, mat);
  scene.add(ballMesh);

  const shape = new CANNON.Sphere(BALL_RADIUS);
  ballBody = new CANNON.Body({
    mass: 1,
    shape,
  });

  // 初始位置
  ballBody.position.set(0, 2, 0);
  ballBody.linearDamping = 0.03;
  ballBody.angularDamping = 0.03;
  ballBody.allowSleep = false;

  world.addBody(ballBody);
}

// 在板子上随机生成一个黑色终点洞
function createGoalHole() {
  const margin = 1.5;
  const range = BOARD_SIZE / 2 - margin;

  const x = (Math.random() * 2 - 1) * range;
  const z = (Math.random() * 2 - 1) * range;
  const y = BOARD_THICK / 2 + 0.001; // 几乎贴在板面

  const geo = new THREE.CylinderGeometry(HOLE_RADIUS, HOLE_RADIUS, 0.02, 32);
  const mat = new THREE.MeshBasicMaterial({ color: 0x000000 });
  holeMesh = new THREE.Mesh(geo, mat);
  holeMesh.position.set(x, y, z);

  // 绑在板子上：板子怎么倾斜，洞就怎么跟着动
  boardMesh.add(holeMesh);
}

function initControls() {
  const maxTilt = (40 * Math.PI) / 180; // 最大 40°

  window.addEventListener("keydown", (e) => {
    if (e.key === "w" || e.key === "ArrowUp") tiltTarget.x = -maxTilt;
    if (e.key === "s" || e.key === "ArrowDown") tiltTarget.x = maxTilt;
    if (e.key === "a" || e.key === "ArrowLeft") tiltTarget.z = maxTilt;
    if (e.key === "d" || e.key === "ArrowRight") tiltTarget.z = -maxTilt;
  });

  window.addEventListener("keyup", (e) => {
    if (["w", "ArrowUp", "s", "ArrowDown"].includes(e.key)) tiltTarget.x = 0;
    if (["a", "ArrowLeft", "d", "ArrowRight"].includes(e.key)) tiltTarget.z = 0;
  });
}

function updateBoardTilt() {
  boardMesh.rotation.set(tilt.x, 0, tilt.z);

  const q = new CANNON.Quaternion();
  q.setFromEuler(tilt.x, 0, tilt.z, "XYZ");
  boardBody.quaternion.copy(q);

  ballBody.wakeUp && ballBody.wakeUp();
}

function checkGoal() {
  if (!holeMesh || levelComplete) return;

  // 洞在世界坐标中的位置（因为它是 boardMesh 的子物体）
  holeMesh.getWorldPosition(holeWorldPos);

  const dx = ballBody.position.x - holeWorldPos.x;
  const dz = ballBody.position.z - holeWorldPos.z;
  const horizontalDist = Math.sqrt(dx * dx + dz * dz);

  const effectiveRadius = HOLE_RADIUS * 0.7;
  const verticalDelta = ballBody.position.y - holeWorldPos.y;

  // 条件：水平距离足够近 & 球比洞中心低一些 → 认为掉进洞
  if (
    horizontalDist < effectiveRadius &&
    verticalDelta < BALL_RADIUS * 0.5
  ) {
    levelComplete = true;

    // 移除物理刚体 & 隐藏球
    world.removeBody(ballBody);
    ballMesh.visible = false;

    console.log("Level complete!");
    showWinMessage();
  }
}

function showWinMessage() {
  if (winShown) return;
  winShown = true;

  const div = document.createElement("div");
  div.textContent = "Level complete!";
  Object.assign(div.style, {
    position: "fixed",
    top: "20px",
    left: "50%",
    transform: "translateX(-50%)",
    color: "#ffffff",
    fontSize: "28px",
    fontFamily: "system-ui, sans-serif",
    textShadow: "0 0 8px rgba(0,0,0,0.7)",
    padding: "8px 16px",
    background: "rgba(0,0,0,0.4)",
    borderRadius: "8px",
    zIndex: 9999,
  });
  document.body.appendChild(div);
}

function animate(time) {
  requestAnimationFrame(animate);

  const dt = lastTime ? (time - lastTime) / 1000 : 0;
  lastTime = time;

  const tiltSpeed = 12;
  const t = Math.min(1, tiltSpeed * dt);
  tilt.x += (tiltTarget.x - tilt.x) * t;
  tilt.z += (tiltTarget.z - tilt.z) * t;

  updateBoardTilt();

  if (!levelComplete) {
    world.step(1 / 90, dt, 8);
    checkGoal();
  } else {
    // 通关后停止物理模拟，让板子还保持最后姿态
    world.step(1 / 90, dt, 0);
  }

  // 同步可视化（通关后球已经隐藏）
  if (!levelComplete) {
    ballMesh.position.copy(ballBody.position);
    ballMesh.quaternion.copy(ballBody.quaternion);
  }

  boardMesh.position.copy(boardBody.position);
  boardMesh.quaternion.copy(boardBody.quaternion);

  renderer.render(scene, camera);
}
