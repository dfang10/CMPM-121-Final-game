// SceneManager.js
export class SceneManager {
  constructor(renderer) {
    this.renderer = renderer;
    this.currentScene = null;
    this.scenes = new Map();
    this.currentSceneName = null;
    this.clock = null;
  }
  
  registerScene(name, SceneClass) {
    this.scenes.set(name, SceneClass);
  }
  
  switchToScene(sceneName, ...args) {
    if (this.currentScene && this.currentScene.dispose) {
      this.currentScene.dispose();
    }
    
    const SceneClass = this.scenes.get(sceneName);
    if (!SceneClass) {
      console.error(`Scene "${sceneName}" not registered`);
      return false;
    }
    
    this.currentScene = new SceneClass(this.renderer, ...args);
    this.currentSceneName = sceneName;
    
    console.log(`Switched to scene: ${sceneName}`);
    return true;
  }
  
  getCurrentScene() {
    return this.currentScene;
  }
  
  getCurrentSceneName() {
    return this.currentSceneName;
  }
  
  update(time) {
    if (this.currentScene && this.currentScene.update) {
      this.currentScene.update(time);
    }
  }
  
  render() {
    if (this.currentScene && this.currentScene.render) {
      this.currentScene.render();
    }
  }
  
  switchToNextLevel() {
    const sceneNames = Array.from(this.scenes.keys());
    const currentIndex = sceneNames.indexOf(this.currentSceneName);
    
    if (currentIndex >= 0 && currentIndex < sceneNames.length - 1) {
      const nextSceneName = sceneNames[currentIndex + 1];
      this.switchToScene(nextSceneName);
      return true;
    }
    
    return false; 
  }
}