// main.js - Entry point
import * as THREE from "three";
import { Level1Scene } from "./Level1Scene.js";
import { SceneManager } from "./sceneManager.js";
import { SaveManager } from "./SaveManager.js";

console.log("main.js loaded");

// Initialize renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Initialize scene manager
const sceneManager = new SceneManager(renderer);
sceneManager.registerScene("level1", Level1Scene);

// Save slot
const slotButtons = document.querySelectorAll("#saveSlots button[data-slot]");
const deleteButtons = document.querySelectorAll("#saveSlots button.delete");

// highlight function
function setActiveSlotButton(clickedBtn) {
  slotButtons.forEach(btn => btn.classList.remove("activeSlot"));
  clickedBtn.classList.add("activeSlot");
}

// clicking a slot = switch slot + load data
slotButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    const slot = btn.dataset.slot;

    const level = sceneManager.getCurrentScene();
    if (!level) return;

    setActiveSlotButton(btn);

    level.saveManager.setSlot(slot);
    const saved = level.saveManager.load();

    if (saved) {
      level.applySaveData(saved);
      console.log("Loaded save slot:", slot);
    } else {
      console.log("Empty slot:", slot);
    }
  });
});

// clicking delete = clear slot
deleteButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    const slot = btn.dataset.delete;

    localStorage.removeItem(slot);
    console.log("Deleted save data for", slot);
  });
});

// load level
const bootSlot = "slot1";
const bootSave = new SaveManager(bootSlot).load();
const startingLevel = bootSave?.currentLevel || 1;

sceneManager.switchToScene("level1", startingLevel);

// level progression check
function checkLevelCompletion() {
  const scene = sceneManager.getCurrentScene();
  if (!scene) return;

  if (scene.isComplete && scene.isComplete()) {
    const nextLevel = scene.levelNumber + 1;

    console.log("Level complete! Loading level", nextLevel);

    // Save next level progress
    scene.saveManager.save({ currentLevel: nextLevel });

    // Load new scene instance
    sceneManager.switchToScene("level1", nextLevel);
  }
}

// animation loop
function animate(time) {
  requestAnimationFrame(animate);

  sceneManager.update(time);
  sceneManager.render();

  checkLevelCompletion();
}

animate(0);

window.sceneManager = sceneManager;
