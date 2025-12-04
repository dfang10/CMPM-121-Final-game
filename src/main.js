// main.js - Entry point
import * as THREE from "three";
import { Level1Scene } from "./Level1Scene.js";
import { SceneManager } from "./sceneManager.js";

console.log("main.js loaded");

// Initialize renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Initialize scene manager
const sceneManager = new SceneManager(renderer);

// Register scenes 
sceneManager.registerScene("level1", Level1Scene);

// Start with level 1
sceneManager.switchToScene("level1");

function checkLevelCompletion() {
  const currentScene = sceneManager.getCurrentScene();
  if (currentScene && currentScene.isComplete && currentScene.isComplete()) {

    console.log("Level 1 complete! Ready for level 2...");

  }
}

// Animation loop
let lastTime = 0;
function animate(time) {
  requestAnimationFrame(animate);
  
  // Update current scene
  sceneManager.update(time);
  
  // Render current scene
  sceneManager.render();
  
  // Check for level completion
  checkLevelCompletion();
  
  lastTime = time;
}

animate(0);

window.sceneManager = sceneManager;