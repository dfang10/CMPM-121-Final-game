// Level1Scene.js
import * as THREE from "three";
import * as CANNON from "cannon-es";
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export class Level1Scene {
  constructor(renderer) {
    this.renderer = renderer;
    this.scene = null;
    this.camera = null;
    this.world = null;
    
    // Game objects
    this.boardMesh = null;
    this.boardBody = null;
    this.ballMesh = null;
    this.ballBody = null;
    this.wallMeshes = [];
    this.holeMesh = null;
    this.killMesh = null;
    this.keyMesh = null;
    
    // Game state
    this.tilt = { x: 0, z: 0 };
    this.tiltTarget = { x: 0, z: 0 };
    this.levelComplete = false;
    this.winShown = false;
    this.keyCollected = false;
    this.keyMessageDiv = null;
    this.lastTime = 0;
    
    // Constants
    this.FIXED_TIME_STEP = 1 / 120;
    this.MAX_SUB_STEPS = 10;
    this.WALL_THICKNESS = 0.4;
    this.WALL_HEIGHT = 5.0;
    this.BOARD_SIZE = 10;
    this.BOARD_THICK = 1;
    this.BALL_RADIUS = 0.5;
    this.HOLE_RADIUS = 0.9;
    this.KILL_RADIUS = 1.0;
    this.keyPickupRadius = 0.8;
    this.PHYSICS_BOARD_MARGIN = 5;
    
    // World positions
    this.holeWorldPos = new THREE.Vector3();
    this.killWorldPos = new THREE.Vector3();
    this.keyWorldPosition = new THREE.Vector3();
    
    this.init();
  }
  
  init() {
    this.initScene();
    this.initPhysics();
    this.createBoard();
    this.createWalls();
    this.createLid();
    this.createBall();
    this.createGoalHole();
    this.createKillZone();
    this.createKeyFromGLB();
    this.initControls();
  }
  
  initScene() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x202020);

    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      100
    );
    this.camera.position.set(8, 8, 8);
    this.camera.lookAt(0, 0, 0);

    window.addEventListener("resize", () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });

    const dirLight = new THREE.DirectionalLight(0xffffff, 1);
    dirLight.position.set(5, 10, 7);
    this.scene.add(dirLight);

    const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 0.7);
    this.scene.add(hemi);
  }
  
  initPhysics() {
    this.world = new CANNON.World({
      gravity: new CANNON.Vec3(0, -9.82, 0),
    });

    this.world.broadphase = new CANNON.NaiveBroadphase();
    this.world.solver.iterations = 20;
    this.world.solver.tolerance = 0.001;

    this.world.defaultContactMaterial.friction = 0.01;
    this.world.defaultContactMaterial.restitution = 0.2;
  }
  
  createBoard() {
    // three.js board
    const geo = new THREE.BoxGeometry(this.BOARD_SIZE, this.BOARD_THICK, this.BOARD_SIZE);
    const mat = new THREE.MeshStandardMaterial({ color: 0x1e90ff });
    this.boardMesh = new THREE.Mesh(geo, mat);
    this.scene.add(this.boardMesh);

    // cannon board rigid body
    const boardShape = new CANNON.Box(
      new CANNON.Vec3(
        this.BOARD_SIZE / 2 + this.PHYSICS_BOARD_MARGIN,
        this.BOARD_THICK / 2,
        this.BOARD_SIZE / 2 + this.PHYSICS_BOARD_MARGIN
      )
    );
    this.boardBody = new CANNON.Body({ mass: 0 });
    this.boardBody.addShape(boardShape);
    this.boardBody.position.set(0, 0, 0);
    this.world.addBody(this.boardBody);
  }
  
  createWalls() {
    const wallThickness = this.WALL_THICKNESS;
    const fullWallHeight = this.WALL_HEIGHT;   // physics height
    const WALL_OVERLAP = 0.4;

    // visual heights
    const bottomHeight = 1.0;                  // blue lower rim
    const topHeight = fullWallHeight - bottomHeight; // clear upper section

    const halfThick = wallThickness / 2;
    const halfFullHeight = fullWallHeight / 2;
    const halfBottom = bottomHeight / 2;
    const halfTop = topHeight / 2;

    // walls material
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
      // +X right
      { x:  this.BOARD_SIZE / 2 + halfThick, z: 0, len: this.BOARD_SIZE + WALL_OVERLAP, axis: "x" },
      // -X left
      { x: -this.BOARD_SIZE / 2 - halfThick, z: 0, len: this.BOARD_SIZE + WALL_OVERLAP, axis: "x" },
      // +Z top
      { x: 0, z:  this.BOARD_SIZE / 2 + halfThick, len: this.BOARD_SIZE + WALL_OVERLAP, axis: "z" },
      // -Z bottom
      { x: 0, z: -this.BOARD_SIZE / 2 - halfThick, len: this.BOARD_SIZE + WALL_OVERLAP, axis: "z" },
    ];

    wallConfig.forEach((w) => {
      // geometry extents for each axis
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
        topGeo = new THREE.BoxGeometry(w.len, topHeight, wallThickness);
      }

      // ---- blue bottom wall 
      const bottomMesh = new THREE.Mesh(bottomGeo, bottomMat);
      const bottomY = this.BOARD_THICK / 2 + halfBottom;
      bottomMesh.position.set(w.x, bottomY, w.z);
      this.boardMesh.add(bottomMesh);

      // ---- clear wall - visual 
      const topMesh = new THREE.Mesh(topGeo, topMat);
      const topY = this.BOARD_THICK / 2 + bottomHeight + halfTop;
      topMesh.position.set(w.x, topY, w.z);
      this.boardMesh.add(topMesh);

      this.wallMeshes.push(bottomMesh, topMesh);

      // physics barrier 
      const shape = new CANNON.Box(physicsHalfExtents);
      const physicsCenterY = this.BOARD_THICK / 2 - 0.05 + halfFullHeight;
      const offset = new CANNON.Vec3(w.x, physicsCenterY, w.z);
      this.boardBody.addShape(shape, offset);
    });
  }
  
  createLid() {
    const wallThickness = this.WALL_THICKNESS;
    const wallHeight = this.WALL_HEIGHT;

    const lidWidth = this.BOARD_SIZE + 2 * wallThickness + 0.4;
    const lidDepth = this.BOARD_SIZE + 2 * wallThickness + 0.4;
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

    const lidY = this.BOARD_THICK / 2 + wallHeight + lidHeight / 2;
    lidMesh.position.set(0, lidY, 0);
    this.boardMesh.add(lidMesh);

    // physics for lid 
    const halfWidth = lidWidth / 2;
    const halfDepth = lidDepth / 2;
    const halfHeight = lidHeight / 2;

    const lidShape = new CANNON.Box(
      new CANNON.Vec3(halfWidth, halfHeight, halfDepth)
    );
    const lidOffset = new CANNON.Vec3(0, lidY, 0);
    this.boardBody.addShape(lidShape, lidOffset);
  }
  
  createKeyFromGLB() {
    const loader = new GLTFLoader();

    loader.load(
      "key_converted.glb",
      (gltf) => {
        this.keyMesh = gltf.scene;

        const margin = 1.5;
        const range = this.BOARD_SIZE / 2 - margin;
        const x = (Math.random() * 2 - 1) * range;
        const z = (Math.random() * 2 - 1) * range;
        const y = this.BOARD_THICK / 2 + 0.2;

        this.keyMesh.position.set(x, y, z);

        // Adjust scale if needed
        this.keyMesh.scale.set(0.3, 0.3, 0.3);

        this.boardMesh.add(this.keyMesh);
      },
      undefined, // onProgress callback
      (error) => {
        console.error("Error loading key model:", error);
        // Create a fallback cube if GLB fails to load
        this.createFallbackKey();
      }
    );
  }
  
  createFallbackKey() {
    const geo = new THREE.BoxGeometry(0.5, 0.1, 0.2);
    const mat = new THREE.MeshStandardMaterial({ color: 0xffd700 });
    this.keyMesh = new THREE.Mesh(geo, mat);

    const margin = 1.5;
    const range = this.BOARD_SIZE / 2 - margin;
    const x = (Math.random() * 2 - 1) * range;
    const z = (Math.random() * 2 - 1) * range;
    const y = this.BOARD_THICK / 2 + 0.2;

    this.keyMesh.position.set(x, y, z);
    this.boardMesh.add(this.keyMesh);
  }
  
  createKillZone() {
    const margin = 1.5;
    const range = this.BOARD_SIZE / 2 - margin;

    const x = (Math.random() * 2 - 1) * range;
    const z = (Math.random() * 2 - 1) * range;
    const y = this.BOARD_THICK / 2 + 0.001;

    const geo = new THREE.CylinderGeometry(this.KILL_RADIUS, this.KILL_RADIUS, 0.02, 32);
    const mat = new THREE.MeshBasicMaterial({ color: 0xff0000 }); // red color zone

    this.killMesh = new THREE.Mesh(geo, mat);
    this.killMesh.position.set(x, y, z);

    this.boardMesh.add(this.killMesh);
  }
  
  createBall() {
    const geo = new THREE.SphereGeometry(this.BALL_RADIUS, 32, 32);
    const mat = new THREE.MeshStandardMaterial({ color: 0xff5555 });
    this.ballMesh = new THREE.Mesh(geo, mat);
    this.scene.add(this.ballMesh);

    const shape = new CANNON.Sphere(this.BALL_RADIUS);
    this.ballBody = new CANNON.Body({
      mass: 1,
      shape,
    });

    // initial position
    this.ballBody.position.set(0, 2, 0);
    this.ballBody.linearDamping = 0.03;
    this.ballBody.angularDamping = 0.03;
    this.ballBody.allowSleep = false;

    this.world.addBody(this.ballBody);
  }
  
  createGoalHole() {
    const margin = 1.5;
    const range = this.BOARD_SIZE / 2 - margin;

    const x = (Math.random() * 2 - 1) * range;
    const z = (Math.random() * 2 - 1) * range;
    const y = this.BOARD_THICK / 2 + 0.001; // almost on board surface

    const geo = new THREE.CylinderGeometry(this.HOLE_RADIUS, this.HOLE_RADIUS, 0.02, 32);
    const mat = new THREE.MeshBasicMaterial({ color: 0x000000 });
    this.holeMesh = new THREE.Mesh(geo, mat);
    this.holeMesh.position.set(x, y, z);

    // attach to board so it moves with board tilt
    this.boardMesh.add(this.holeMesh);
  }
  
  initControls() {
    const maxTilt = (25 * Math.PI) / 180; // max 25°

    window.addEventListener("keydown", (e) => {
      if (this.levelComplete) return;
      
      if (e.key === "w" || e.key === "ArrowUp") this.tiltTarget.x = -maxTilt;
      if (e.key === "s" || e.key === "ArrowDown") this.tiltTarget.x = maxTilt;
      if (e.key === "a" || e.key === "ArrowLeft") this.tiltTarget.z = maxTilt;
      if (e.key === "d" || e.key === "ArrowRight") this.tiltTarget.z = -maxTilt;
    });

    window.addEventListener("keyup", (e) => {
      if (["w", "ArrowUp", "s", "ArrowDown"].includes(e.key)) this.tiltTarget.x = 0;
      if (["a", "ArrowLeft", "d", "ArrowRight"].includes(e.key)) this.tiltTarget.z = 0;
    });
  }
  
  updateBoardTilt() {
    this.boardMesh.rotation.set(this.tilt.x, 0, this.tilt.z);

    const q = new CANNON.Quaternion();
    q.setFromEuler(this.tilt.x, 0, this.tilt.z, "XYZ");
    this.boardBody.quaternion.copy(q);

    if (this.ballBody && this.ballBody.wakeUp) {
      this.ballBody.wakeUp();
    }
  }
  
  checkKeyPickup() {
    // if key doesn't exist or already collected, skip
    if (!this.keyMesh || this.keyCollected) return;

    this.keyMesh.getWorldPosition(this.keyWorldPosition);

    const dx = this.ballBody.position.x - this.keyWorldPosition.x;
    const dz = this.ballBody.position.z - this.keyWorldPosition.z;
    const horizontalDist = Math.sqrt(dx * dx + dz * dz);

    if (horizontalDist < this.keyPickupRadius) {
      this.keyCollected = true;
      this.keyMesh.visible = false;        // hide it once collected
      console.log("Key collected!");
      this.showKeyMessage();           
    }
  }
  
  showKeyMessage() {
    if (this.keyMessageDiv) return;

    this.keyMessageDiv = document.createElement("div");
    this.keyMessageDiv.textContent = "Key collected!";

    Object.assign(this.keyMessageDiv.style, {
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

    document.body.appendChild(this.keyMessageDiv);
  }
  
  checkKillZone() {
    if (!this.killMesh) return;

    this.killMesh.getWorldPosition(this.killWorldPos);

    const dx = this.ballBody.position.x - this.killWorldPos.x;
    const dz = this.ballBody.position.z - this.killWorldPos.z;
    const horizontalDist = Math.sqrt(dx * dx + dz * dz);

    if (horizontalDist < this.KILL_RADIUS) {
      this.handleDeath();
    }
  }
  
  handleDeath() {
    console.log("You died!");

    // respawn at start
    this.ballBody.position.set(0, 2, 0);
    this.ballBody.velocity.set(0, 0, 0);
    this.ballBody.angularVelocity.set(0, 0, 0);

    // reset board tilt
    this.tilt.x = 0;
    this.tilt.z = 0;
    this.tiltTarget.x = 0;
    this.tiltTarget.z = 0;

    // reset key
    if (this.keyMesh) {
      this.keyMesh.visible = true;
    }
    this.keyCollected = false;

    if (this.keyMessageDiv) {
      this.keyMessageDiv.remove();
      this.keyMessageDiv = null; 
    }
  }
  
  checkGoal() {
    if (!this.holeMesh || this.levelComplete) return;

    if (!this.keyCollected) {
      // haven't picked up key so can't complete   
      return;
    }

    // hole position in world coordinates (it's a child of boardMesh)
    this.holeMesh.getWorldPosition(this.holeWorldPos);

    const dx = this.ballBody.position.x - this.holeWorldPos.x;
    const dz = this.ballBody.position.z - this.holeWorldPos.z;
    const horizontalDist = Math.sqrt(dx * dx + dz * dz);

    // trigger radius: slightly smaller than hole for better feel
    const triggerRadius = this.HOLE_RADIUS * 0.9;

    if (horizontalDist < triggerRadius) {
      this.levelComplete = true;

      // remove physics body & hide ball
      this.world.removeBody(this.ballBody);
      this.ballMesh.visible = false;

      console.log("Level complete!");
      this.showWinMessage();
    }
  }
  
  showWinMessage() {
    if (this.winShown) return;
    this.winShown = true;

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
  
  update(time) {
    const timeSinceLastCalled = this.lastTime ? (time - this.lastTime) / 1000 : 0;
    this.lastTime = time;

    // clamp dt so a giant lag spike doesn't explode physics
    const dt = Math.min(timeSinceLastCalled, 1 / 30); // cap at ~33ms

    // smooth tilt first
    const tiltSpeed = 12;
    const t = Math.min(1, tiltSpeed * dt);
    this.tilt.x += (this.tiltTarget.x - this.tilt.x) * t;
    this.tilt.z += (this.tiltTarget.z - this.tilt.z) * t;

    this.updateBoardTilt();

    if (!this.levelComplete) {
      this.world.step(this.FIXED_TIME_STEP, dt, this.MAX_SUB_STEPS);
      this.checkKeyPickup();
      this.checkKillZone();
      this.checkGoal();
    } else {
      // after level complete, stop physics simulation but keep board in final state
      this.world.step(this.FIXED_TIME_STEP, dt, 0);
    }

    // sync visuals (ball is hidden after level complete)
    if (!this.levelComplete) {
      this.ballMesh.position.copy(this.ballBody.position);
      this.ballMesh.quaternion.copy(this.ballBody.quaternion);
    }

    if (this.boardMesh && this.boardBody) {
      this.boardMesh.position.copy(this.boardBody.position);
      this.boardMesh.quaternion.copy(this.boardBody.quaternion);
    }
  }
  
  render() {
    this.renderer.render(this.scene, this.camera);
  }
  
  dispose() {
    
    if (this.keyMessageDiv) {
      this.keyMessageDiv.remove();
    }
  }
  
  getScene() {
    return this.scene;
  }
  
  getCamera() {
    return this.camera;
  }
  
  isComplete() {
    return this.levelComplete;
  }
}