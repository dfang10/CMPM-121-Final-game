export class SaveManager {
  constructor(slotName = "slot1") {
    this.slotName = slotName;
  }

  // Save data object to localStorage
  save(data) {
    const wrapped = {
        currentLevel: data.currentLevel,
        state: data.state
    };
    localStorage.setItem(this.slotName, JSON.stringify(wrapped));
  }

  // Load and parse JSON
  load() {
    const raw = localStorage.getItem(this.slotName);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch (e) {
      console.error("Failed to parse save slot", this.slotName, e);
      return null;
    }
  }

  exists() {
    return localStorage.getItem(this.slotName) !== null;
  }

  delete() {
    localStorage.removeItem(this.slotName);
  }

  setSlot(slotName) {
    this.slotName = slotName;
  }
}
