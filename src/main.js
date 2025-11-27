import * as THREE from "three";
import * as CANNON from "cannon-es";

console.log("main.js loaded");

let scene, camera, renderer;
let world;
let boardMesh, boardBody;
let ballMesh, ballBody;
const wallMeshes = []; // 围墙的 three.js 网格

// 当前角度 & 目标角度（用于平滑倾斜）
const tilt = { x: 0, z: 0 };
const tiltTarget = { x: 0, z: 0 };

// 基础尺寸常量
const BOARD_SIZE = 10;
const BOARD_THICK = 0.5;
const BALL_RADIUS = 0.5;

const BALL_VISUAL_OFFSET_Y = -0.05;

let lastTime = 0;

initScene();
initPhysics();
createBoard();
createWalls();   // 👈 新增：创建四周围墙（视觉 + 物理）
createBall();
initControls();
animate();

function initScene() {
  console.log("initScene");
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
  console.log("initPhysics");
  world = new CANNON.World({
    gravity: new CANNON.Vec3(0, -9.82, 0), // 始终向下
  });

  world.broadphase = new CANNON.NaiveBroadphase();
  world.solver.iterations = 10;

  // 让接触更“滑”，球更容易滚动
  world.defaultContactMaterial.friction = 0.01;
  world.defaultContactMaterial.restitution = 0.2;
}

function createBoard() {
  // Three.js 板子
  const geo = new THREE.BoxGeometry(BOARD_SIZE, BOARD_THICK, BOARD_SIZE);
  const mat = new THREE.MeshStandardMaterial({ color: 0x1e90ff });
  boardMesh = new THREE.Mesh(geo, mat);
  scene.add(boardMesh);

  // Cannon 板子刚体（后面会把围墙也加进同一个 Body 做复合刚体）
  const boardShape = new CANNON.Box(
    new CANNON.Vec3(BOARD_SIZE / 2, BOARD_THICK / 2, BOARD_SIZE / 2)
  );
  boardBody = new CANNON.Body({
    mass: 0, // 静态板子
  });
  boardBody.addShape(boardShape);
  boardBody.position.set(0, 0, 0);
  world.addBody(boardBody);
}

function createWalls() {
  // 围墙厚度 & 高度
  const wallThickness = 0.4;
  const wallHeight = 1.0;

  const halfThick = wallThickness / 2;
  const halfHeight = wallHeight / 2;

  // 四面围墙的位置（板子中心在 0,0,0，板子躺在 XZ 平面）
  const wallConfig = [
    // +X 右边
    {
      x: BOARD_SIZE / 2 + halfThick,
      z: 0,
      len: BOARD_SIZE,
      axis: "x",
    },
    // -X 左边
    {
      x: -BOARD_SIZE / 2 - halfThick,
      z: 0,
      len: BOARD_SIZE,
      axis: "x",
    },
    // +Z 上边
    {
      x: 0,
      z: BOARD_SIZE / 2 + halfThick,
      len: BOARD_SIZE,
      axis: "z",
    },
    // -Z 下边
    {
      x: 0,
      z: -BOARD_SIZE / 2 - halfThick,
      len: BOARD_SIZE,
      axis: "z",
    },
  ];

  wallConfig.forEach((w) => {
    let meshGeo, halfExtents;

    if (w.axis === "x") {
      // 沿 Z 方向延伸的墙（竖边）
      meshGeo = new THREE.BoxGeometry(wallThickness, wallHeight, w.len);
      halfExtents = new CANNON.Vec3(halfThick, halfHeight, w.len / 2);
    } else {
      // 沿 X 方向延伸的墙（横边）
      meshGeo = new THREE.BoxGeometry(w.len, wallHeight, wallThickness);
      halfExtents = new CANNON.Vec3(w.len / 2, halfHeight, halfThick);
    }

    const mat = new THREE.MeshStandardMaterial({ color: 0x144a9b });
    const mesh = new THREE.Mesh(meshGeo, mat);

    // 围墙相对于板子中心的位置
    const y = BOARD_THICK / 2 + halfHeight;
    mesh.position.set(w.x, y, w.z);

    // 👉 关键：把围墙作为 boardMesh 的子物体，这样板子倾斜时墙也跟着动
    boardMesh.add(mesh);
    wallMeshes.push(mesh);

    // 物理里，把围墙当成 boardBody 的一个子 shape（复合刚体）
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

  // 起始位置：板子偏中间一点
  ballBody.position.set(0, 2, 0);
  ballBody.linearDamping = 0.03;
  ballBody.angularDamping = 0.03;
  ballBody.allowSleep = false;

  world.addBody(ballBody);
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
  // three.js 这边直接设置欧拉角
  boardMesh.rotation.set(tilt.x, 0, tilt.z);

  // 同步给物理刚体（复合刚体：板子 + 4 面墙）
  const q = new CANNON.Quaternion();
  q.setFromEuler(tilt.x, 0, tilt.z, "XYZ");
  boardBody.quaternion.copy(q);

  // 确保球是醒着的
  ballBody.wakeUp && ballBody.wakeUp();
}

function animate(time) {
  requestAnimationFrame(animate);

  const dt = lastTime ? (time - lastTime) / 1000 : 0;
  lastTime = time;

  // 平滑追踪目标角度（避免瞬间翻转导致穿模）
  const tiltSpeed = 12;
  const t = Math.min(1, tiltSpeed * dt);
  tilt.x += (tiltTarget.x - tilt.x) * t;
  tilt.z += (tiltTarget.z - tilt.z) * t;

  updateBoardTilt();

  world.step(1 / 60, dt, 5);



  // 同步可视化
  ballMesh.position.copy(ballBody.position);
  ballMesh.quaternion.copy(ballBody.quaternion);
  boardMesh.position.copy(boardBody.position);
  boardMesh.quaternion.copy(boardBody.quaternion);

  renderer.render(scene, camera);
}
