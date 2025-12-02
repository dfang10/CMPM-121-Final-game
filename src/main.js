import * as THREE from "three";
import * as CANNON from "cannon-es";
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';


console.log("main.js loaded");

let scene, camera, renderer;
let world;
let boardMesh, boardBody;
let ballMesh, ballBody;
const wallMeshes = [];

const FIXED_TIME_STEP = 1 / 120; 
const MAX_SUB_STEPS   = 10;  

//wall 
const WALL_THICKNESS = 0.4;
const WALL_HEIGHT = 5.0;   

// 倾斜状态
const tilt = { x: 0, z: 0 };
const tiltTarget = { x: 0, z: 0 };

// 尺寸常量
const BOARD_SIZE = 10;
const BOARD_THICK = 1;
const BALL_RADIUS = 0.5;

// 终点洞参数
const HOLE_RADIUS = 0.9;
let holeMesh;
const holeWorldPos = new THREE.Vector3();

let levelComplete = false;
let winShown = false;

let lastTime = 0;

//kill zone
const KILL_RADIUS = 1.0;
let killMesh;
const killWorldPos = new THREE.Vector3();

//KEY
let keyMesh;
let keyCollected = false;
const keyWorldPosition = new THREE.Vector3();   // world position of key
const keyPickupRadius = 0.8;
let keyMessageDiv = null;

// physics constraints
const PHYSICS_BOARD_MARGIN = 5;


initScene();
initPhysics();
createBoard();
createWalls();
createLid(); //lid cover
createBall();
createGoalHole();   // 👈 随机生成终点洞
createKillZone();
createKeyFromGLB();
initControls();
animate();

function initScene() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x202020);

  camera = new THREE.PerspectiveCamera(
    60,
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
  new CANNON.Vec3(
    BOARD_SIZE / 2 + PHYSICS_BOARD_MARGIN,
    BOARD_THICK / 2,
    BOARD_SIZE / 2 + PHYSICS_BOARD_MARGIN
  )
);
  boardBody = new CANNON.Body({ mass: 0 });
  boardBody.addShape(boardShape);
  boardBody.position.set(0, 0, 0);
  world.addBody(boardBody);
}

function createWalls() {
  const wallThickness = WALL_THICKNESS;
  const fullWallHeight = WALL_HEIGHT;   // physics height
  const WALL_OVERLAP = 0.4;

  // visual heights
  const bottomHeight = 1.0;                  // blue lower rim
  const topHeight = fullWallHeight - bottomHeight; // clear upper section

  const halfThick = wallThickness / 2;
  const halfFullHeight = fullWallHeight / 2;
  const halfBottom = bottomHeight / 2;
  const halfTop = topHeight / 2;

  //walls material
  const bottomMat = new THREE.MeshStandardMaterial({
    color: 0x1e90ff,  
  });

  const topMat = new THREE.MeshPhysicalMaterial({
    color: 0x144a9b, 
    transparent: true,
    opacity: 0.35,
    transmission: 0.9,
    thickness: 0.3,
    roughness: 0.1,
    metalness: 0.0,
  });

  const wallConfig = [
    // +X 右边
    { x:  BOARD_SIZE / 2 + halfThick, z: 0, len: BOARD_SIZE + WALL_OVERLAP, axis: "x" },
    // -X 左边
    { x: -BOARD_SIZE / 2 - halfThick, z: 0, len: BOARD_SIZE + WALL_OVERLAP, axis: "x" },
    // +Z 上边
    { x: 0, z:  BOARD_SIZE / 2 + halfThick, len: BOARD_SIZE + WALL_OVERLAP, axis: "z" },
    // -Z 下边
    { x: 0, z: -BOARD_SIZE / 2 - halfThick, len: BOARD_SIZE + WALL_OVERLAP, axis: "z" },
  
  ];

  wallConfig.forEach((w) => {
    //  geometry extents for each axis
    let physicsHalfExtents;
    let bottomGeo, topGeo;

    if (w.axis === "x") {
      // along Z
      physicsHalfExtents = new CANNON.Vec3(halfThick, halfFullHeight, w.len / 2);

      bottomGeo = new THREE.BoxGeometry(wallThickness, bottomHeight, w.len);
      topGeo = new THREE.BoxGeometry(wallThickness, topHeight, w.len);
    } else {
      // along X
      physicsHalfExtents = new CANNON.Vec3(w.len / 2, halfFullHeight, halfThick);

      bottomGeo = new THREE.BoxGeometry(w.len, bottomHeight, wallThickness);
      topGeo    = new THREE.BoxGeometry(w.len, topHeight, wallThickness);
    }

    // ---- blue bottom wall 
    const bottomMesh = new THREE.Mesh(bottomGeo, bottomMat);
    const bottomY = BOARD_THICK / 2 + halfBottom;
    bottomMesh.position.set(w.x, bottomY, w.z);
    boardMesh.add(bottomMesh);

    // ---- clear wall - visual 
    const topMesh = new THREE.Mesh(topGeo, topMat);
    const topY = BOARD_THICK / 2 + bottomHeight + halfTop;
    topMesh.position.set(w.x, topY, w.z);
    boardMesh.add(topMesh);

    wallMeshes.push(bottomMesh, topMesh);

    //  physics barrier 
    const shape = new CANNON.Box(physicsHalfExtents);
    const physicsCenterY = BOARD_THICK / 2 - 0.05 + halfFullHeight;
    const offset = new CANNON.Vec3(w.x, physicsCenterY, w.z);
    boardBody.addShape(shape, offset);
  });
}

//  clear lid to prevent it from going over the box 
function createLid() {
   const wallThickness = WALL_THICKNESS;
  const wallHeight = WALL_HEIGHT;

  const lidWidth  = BOARD_SIZE + 2 * wallThickness + 0.4;
  const lidDepth  = BOARD_SIZE + 2 * wallThickness + 0.4;
  const lidHeight = 0.1;

  const lidGeo = new THREE.BoxGeometry(lidWidth, lidHeight, lidDepth);
  const lidMat = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.15,
    transmission: 0.95,
    thickness: 0.4,
    roughness: 0.1,
    metalness: 0.0,
  });

  const lidMesh = new THREE.Mesh(lidGeo, lidMat);

  const lidY = BOARD_THICK / 2 + wallHeight + lidHeight / 2;
  lidMesh.position.set(0, lidY, 0);
  boardMesh.add(lidMesh);

  // physics for lid 
  const halfWidth  = lidWidth  / 2;
  const halfDepth  = lidDepth  / 2;
  const halfHeight = lidHeight / 2;

  const lidShape = new CANNON.Box(
    new CANNON.Vec3(halfWidth, halfHeight, halfDepth)
  );
  const lidOffset = new CANNON.Vec3(0, lidY, 0);
  boardBody.addShape(lidShape, lidOffset);
}

function createKeyFromGLB() {
  const loader = new GLTFLoader();

  loader.load("key_converted.glb", (gltf) => {
    keyMesh = gltf.scene;

    const margin = 1.5;
    const range = BOARD_SIZE / 2 - margin;
    const x = (Math.random() * 2 - 1) * range;
    const z = (Math.random() * 2 - 1) * range;
    const y = BOARD_THICK / 2 + 0.2;

    keyMesh.position.set(x, y, z);

    // Adjust scale if needed
    keyMesh.scale.set(0.3, 0.3, 0.3);

    boardMesh.add(keyMesh);
  });
}

function createKillZone() {
  const margin = 1.5;
  const range = BOARD_SIZE / 2 - margin;

  const x = (Math.random() * 2 - 1) * range;
  const z = (Math.random() * 2 - 1) * range;
  const y = BOARD_THICK / 2 + 0.001;

  const geo = new THREE.CylinderGeometry(KILL_RADIUS, KILL_RADIUS, 0.02, 32);
  const mat = new THREE.MeshBasicMaterial({ color: 0xff0000 }); // red color zone

  killMesh = new THREE.Mesh(geo, mat);
  killMesh.position.set(x, y, z);

  boardMesh.add(killMesh);
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
  const maxTilt = (25 * Math.PI) / 180; // 最大 40°

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

function checkKeyPickup() {
  // if key doesn't exist or already collected, skip
  if (!keyMesh || keyCollected) return;

  keyMesh.getWorldPosition(keyWorldPosition);

  const dx = ballBody.position.x - keyWorldPosition.x;
  const dz = ballBody.position.z - keyWorldPosition.z;
  const horizontalDist = Math.sqrt(dx * dx + dz * dz);

  if (horizontalDist < keyPickupRadius) {
    keyCollected = true;
    keyMesh.visible = false;        // hide it once collected
    console.log("Key collected!");
    showKeyMessage();           
  }
}

function showKeyMessage() {
  if (keyMessageDiv) return;

  keyMessageDiv = document.createElement("div");
  keyMessageDiv.textContent = "Key collected!";

  Object.assign(keyMessageDiv.style, {
    position: "fixed",
    top: "60px",
    left: "50%",
    transform: "translateX(-50%)",
    color: "#ffffffff",
    fontSize: "22px",
    fontFamily: "system-ui, sans-serif",
    textShadow: "0 0 6px rgba(0,0,0,0.7)",
    padding: "4px 10px",
    background: "rgba(0,0,0,0.4)",
    borderRadius: "8px",
    zIndex: 9998,
  });

  document.body.appendChild(keyMessageDiv);
}

function checkKillZone() {
  if (!killMesh) return;

  killMesh.getWorldPosition(killWorldPos);

  const dx = ballBody.position.x - killWorldPos.x;
  const dz = ballBody.position.z - killWorldPos.z;
  const horizontalDist = Math.sqrt(dx * dx + dz * dz);

  if (horizontalDist < KILL_RADIUS) {
    handleDeath();
  }
}

function handleDeath() {
  console.log("You died!");

  // respawn at start
  ballBody.position.set(0, 2, 0);

  ballBody.velocity.set(0, 0, 0);
  ballBody.angularVelocity.set(0, 0, 0);

  // reset board tilt
  tilt.x = 0;
  tilt.z = 0;
  tiltTarget.x = 0;
  tiltTarget.z = 0;

  keyMesh.visible = true;
  keyCollected = false;

  if (keyMessageDiv) {
    keyMessageDiv.remove();
    keyMessageDiv = null; 
  }
}

function checkGoal() {
  if (!holeMesh || levelComplete) return;

   if (!keyCollected) {
    // havent picked it up so no complete   
    return;
  }

  // 洞在世界坐标中的位置（因为它是 boardMesh 的子物体）
  holeMesh.getWorldPosition(holeWorldPos);

  const dx = ballBody.position.x - holeWorldPos.x;
  const dz = ballBody.position.z - holeWorldPos.z;
  const horizontalDist = Math.sqrt(dx * dx + dz * dz);

  // 判定半径：比洞稍微小一点，这样看起来差不多对准就会进
  const triggerRadius = HOLE_RADIUS * 0.9;

  if (horizontalDist < triggerRadius) {
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

// const FIXED_TIME_STEP = 1 / 120; 
// const MAX_SUB_STEPS   = 10;  

function animate(time) {
  requestAnimationFrame(animate);

  let dt = lastTime ? (time - lastTime) / 1000 : 0;
  lastTime = time;

  // clamp dt so a giant lag spike doesn’t explode physics
  dt = Math.min(dt, 1 / 30); // cap at ~33ms

  // smooth tilt first
  const tiltSpeed = 12;
  const t = Math.min(1, tiltSpeed * dt);
  tilt.x += (tiltTarget.x - tilt.x) * t;
  tilt.z += (tiltTarget.z - tilt.z) * t;

  updateBoardTilt();

  if (!levelComplete) {
    world.step(FIXED_TIME_STEP, dt, MAX_SUB_STEPS);
    checkKeyPickup();
    checkKillZone();
    checkGoal();
  } else {
    // 通关后停止物理模拟，让板子还保持最后姿态
    world.step(FIXED_TIME_STEP, dt, 0);
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