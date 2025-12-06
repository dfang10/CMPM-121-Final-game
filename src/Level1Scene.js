// Level1Scene.js
import * as THREE from "three";
import * as CANNON from "cannon-es";
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { InputController } from "./InputController.js";
import { ThemeManager } from "./ThemeManager.js";
import { SaveManager } from "./SaveManager.js";


export class Level1Scene {
  constructor(renderer, levelNumber = 1) {
    this.renderer = renderer;
    this.levelNumber = levelNumber;
    this.scene = null;
    this.camera = null;
    this.world = null;

    this.levelRules = null;
    
    // Game objects
    this.boardMesh = null;
    this.boardBody = null;
    this.ballMesh = null;
    this.ballBody = null;
    this.wallMeshes = [];
    this.holeMesh = null;
    this.killMeshes = [];
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
    
    this.themableMaterials = [];

    this.saveManager = new SaveManager("slot1");

     fetch("/levels.json")
      .then(res => res.json())
      .then(data => {
        this.levelRules = data.levelRules;
        this.init();
      });
  }
  
  init() {
    this.initScene();
    this.initPhysics();
    this.createBoard();
    this.createWalls();
    this.createLid();
    this.createBall();
    this.createGoalHole();
    this.createKillZones();
    this.createKeyFromGLB();
    this.initControls();

    const saved = this.saveManager.load();
    if (saved) {
      console.log("Loaded save:", saved);
      this.applySaveData(saved);
    }
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

    this.themeManager = new ThemeManager(this.scene, this.themableMaterials); 

    window.addEventListener("resize", () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });

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
    this.themableMaterials.push(mat);
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
    this.themableMaterials.push(bottomMat);

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
  
  createKillZones() {
    this.killMeshes.forEach(mesh => this.boardMesh.remove(mesh));
    this.killMeshes = [];
    
    const count = Math.min(this.levelNumber, 10);

    const margin = 1.5;
    const range = this.BOARD_SIZE / 2 - margin;

    const radius = this.levelRules
    ? this.levelRules.killZoneStartRadius
    : this.KILL_RADIUS;

    this.KILL_RADIUS = radius;

    for (let i = 0; i < count; i++) {
      const x = (Math.random() * 2 - 1) * range;
      const z = (Math.random() * 2 - 1) * range;
      const y = this.BOARD_THICK / 2 + 0.001;

      const geo = new THREE.CylinderGeometry(radius, radius, 0.02, 32);
      const mat = new THREE.MeshBasicMaterial({ color: 0xff0000 });

      const kill = new THREE.Mesh(geo, mat);
      kill.position.set(x, y, z);

      this.boardMesh.add(kill);
      this.killMeshes.push(kill);
    }
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

    const geo = new THREE.CylinderGeometry(
      this.levelRules.holeRadius,
      this.levelRules.holeRadius,
      0.02,
      32
    );
    const mat = new THREE.MeshBasicMaterial({ color: 0x000000 });

    this.holeMesh = new THREE.Mesh(geo, mat);
    this.holeMesh.position.set(x, y, z);

    // attach to board so it moves with board tilt
    this.boardMesh.add(this.holeMesh);
  }
  
  initControls() {
    this.inputController = new InputController(
      this.tiltTarget,
      () => this.levelComplete  // callback to check level completion
    );
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
    if (!this.killMeshes || this.killMeshes.length === 0) return;

    for (const kill of this.killMeshes) {
      kill.getWorldPosition(this.killWorldPos);

      const dx = this.ballBody.position.x - this.killWorldPos.x;
      const dz = this.ballBody.position.z - this.killWorldPos.z;
      const dist = Math.sqrt(dx * dx + dz * dz);

      if (dist < this.KILL_RADIUS) {
        this.handleDeath();
        return;
      }
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

    this.holeMesh.getWorldPosition(this.holeWorldPos);

    const dx = this.ballBody.position.x - this.holeWorldPos.x;
    const dz = this.ballBody.position.z - this.holeWorldPos.z;
    const horizontalDist = Math.sqrt(dx * dx + dz * dz);

    const triggerRadius = this.HOLE_RADIUS * 0.9;

    if (horizontalDist < triggerRadius) {
      
      this.levelComplete = true;
      console.log("Level complete! Loading next level...");

      // save current state, including currentLevel
      this.saveManager.save(this.getSaveData());

      setTimeout(() => {
        this.loadNextLevel();
      }, 1000);
    }
  }
  

  loadNextLevel() {
    const nextLevel = this.levelNumber + 1;
    this.levelNumber = nextLevel;

    this.saveManager.save({
      currentLevel: nextLevel,
    });

    window.sceneManager.switchToScene("level1", nextLevel);
  }
  
  update(time) {
    const timeSinceLastCalled = this.lastTime ? (time - this.lastTime) / 1000 : 0;
    this.lastTime = time;

    // clamp dt so a giant lag spike doesn't explode physics
    const dt = Math.min(timeSinceLastCalled, 1 / 30); // cap at ~33ms

    if (this.themeManager) this.themeManager.update(dt);

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

    if (!this._nextAutosaveTime) this._nextAutosaveTime = time;

    if (time >= this._nextAutosaveTime) {
      this.saveManager.save(this.getSaveData());
      this._nextAutosaveTime = time + 1000; // save every second
    }
  }

  getSaveData() {
    return {
      currentLevel: this.levelNumber,
      state: {
        ball: {
          x: this.ballBody.position.x,
          y: this.ballBody.position.y,
          z: this.ballBody.position.z
        },
        tilt: {
          x: this.tilt.x,
          z: this.tilt.z
        },
        keyCollected: this.keyCollected,

        hole: {
          x: this.holeMesh.position.x,
          y: this.holeMesh.position.y,
          z: this.holeMesh.position.z
        },

        killZones: this.killMeshes.map(mesh => ({
          x: mesh.position.x,
          y: mesh.position.y,
          z: mesh.position.z
        }))
      }
    };
  }

  applySaveData(data) {
    if (!data) return;

    this.levelNumber = data.currentLevel ?? 1;

    const state = data.state ?? data;

    // restore ball
    this.ballBody.position.set(state.ball.x, state.ball.y, state.ball.z);
    this.ballMesh.position.copy(this.ballBody.position);

    // restore tilt
    this.tilt.x = data.tilt.x;
    this.tilt.z = data.tilt.z;
    this.tiltTarget.x = data.tilt.x;
    this.tiltTarget.z = data.tilt.z;

    // restore key
    this.keyCollected = state.keyCollected;
    if (state.keyCollected && this.keyMesh) {
      this.keyMesh.visible = false;
    }

    // restore hole position
    this.holeMesh.position.set(data.hole.x, data.hole.y, data.hole.z);

    // restore kill zone
    if (state.killZones && Array.isArray(state.killZones)) {
      
      this.killMeshes.forEach(mesh => this.boardMesh.remove(mesh));
      this.killMeshes = [];

      state.killZones.forEach(kz => {
        const geo = new THREE.CylinderGeometry(
          this.KILL_RADIUS,
          this.KILL_RADIUS,
          0.02,
          32
        );
        const mat = new THREE.MeshBasicMaterial({ color: 0xff0000 });

        const kill = new THREE.Mesh(geo, mat);
        kill.position.set(kz.x, kz.y, kz.z);

        this.boardMesh.add(kill);
        this.killMeshes.push(kill);
      });
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