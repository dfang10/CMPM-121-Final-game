import * as THREE from "three";
import * as CANNON from "cannon-es";

console.log("main.js loaded");

let scene, camera, renderer;
let world;
let boardMesh, boardBody;
let ballMesh, ballBody;

// 当前角度 & 目标角度
const tilt = { x: 0, z: 0 };
const tiltTarget = { x: 0, z: 0 };

// 一些常量
const BOARD_SIZE = 10;
const BOARD_THICK = 0.5;
const BALL_RADIUS = 0.5;

let lastTime = 0;

initScene();
initPhysics();
createBoard();
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
  const geo = new THREE.BoxGeometry(BOARD_SIZE, BOARD_THICK, BOARD_SIZE);
  const mat = new THREE.MeshStandardMaterial({ color: 0x1e90ff });
  boardMesh = new THREE.Mesh(geo, mat);
  scene.add(boardMesh);

  const shape = new CANNON.Box(
    new CANNON.Vec3(BOARD_SIZE / 2, BOARD_THICK / 2, BOARD_SIZE / 2)
  );
  boardBody = new CANNON.Body({
    mass: 0, // 静态板子
    shape,
  });
  boardBody.position.set(0, 0, 0);
  world.addBody(boardBody);
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

  // 落在板子上方
  ballBody.position.set(0, 2, 0);
  ballBody.linearDamping = 0.03;
  ballBody.angularDamping = 0.03;
  ballBody.allowSleep = false;

  world.addBody(ballBody);
}

function initControls() {
  // 倾斜角稍微大一点，球更明显地滚
  const maxTilt = (40 * Math.PI) / 180; // 40°

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

  // 同步给物理刚体
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

  // 平滑追踪目标角度：把 tiltSpeed 调大一点会更“跟手”
  const tiltSpeed = 12; // 之前是 6，翻倍更快
  const t = Math.min(1, tiltSpeed * dt);
  tilt.x += (tiltTarget.x - tilt.x) * t;
  tilt.z += (tiltTarget.z - tilt.z) * t;

  updateBoardTilt();

  world.step(1 / 60, dt, 5);

  // 简单防掉落：球不会穿到板子下面
  const minBallY = BOARD_THICK / 2 + BALL_RADIUS;
const halfSize = BOARD_SIZE / 2;

// 只有在“水平位置还在板子范围内”的时候，才防止掉穿板子
if (
  Math.abs(ballBody.position.x) <= halfSize &&
  Math.abs(ballBody.position.z) <= halfSize &&
  ballBody.position.y < minBallY
) {
  ballBody.position.y = minBallY;
  if (ballBody.velocity.y < 0) {
    ballBody.velocity.y = 0;
  }
}

  // 同步位置/旋转
  ballMesh.position.copy(ballBody.position);
  ballMesh.quaternion.copy(ballBody.quaternion);
  boardMesh.position.copy(boardBody.position);
  boardMesh.quaternion.copy(boardBody.quaternion);

  renderer.render(scene, camera);
}
