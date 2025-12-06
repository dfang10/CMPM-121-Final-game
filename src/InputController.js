export class InputController {
  constructor(tiltTarget, isLevelCompleteFunc) {
    this.tiltTarget = tiltTarget;
    this.isLevelComplete = isLevelCompleteFunc;
    this.maxTilt = (25 * Math.PI) / 180;

    this.IS_TOUCH_DEVICE = "ontouchstart" in window || navigator.maxTouchPoints > 0;

    this.initKeyboard();
    if (this.IS_TOUCH_DEVICE) {
      this.initTouch();
    }
  }

  // --------------------------
  // KEYBOARD CONTROLS
  // --------------------------
  initKeyboard() {
    window.addEventListener("keydown", (e) => {
      if (this.isLevelComplete()) return;

      if (e.key === "w" || e.key === "ArrowUp") this.tiltTarget.x = -this.maxTilt;
      if (e.key === "s" || e.key === "ArrowDown") this.tiltTarget.x = this.maxTilt;
      if (e.key === "a" || e.key === "ArrowLeft") this.tiltTarget.z = this.maxTilt;
      if (e.key === "d" || e.key === "ArrowRight") this.tiltTarget.z = -this.maxTilt;
    });

    window.addEventListener("keyup", (e) => {
      if (["w", "ArrowUp", "s", "ArrowDown"].includes(e.key)) this.tiltTarget.x = 0;
      if (["a", "ArrowLeft", "d", "ArrowRight"].includes(e.key)) this.tiltTarget.z = 0;
    });
  }

  // --------------------------
  // TOUCH CONTROLS
  // --------------------------
  initTouch() {
    const overlay = document.createElement("div");
    Object.assign(overlay.style, {
      position: "fixed",
      inset: "0",
      pointerEvents: "none",
      zIndex: 9998,
    });

    // Left half for left/right
    const leftPad = document.createElement("div");
    Object.assign(leftPad.style, {
      position: "absolute",
      left: "0",
      top: "0",
      bottom: "0",
      width: "50%",
      pointerEvents: "auto",
      touchAction: "none",
    });

    // Right half for forward/back
    const rightPad = document.createElement("div");
    Object.assign(rightPad.style, {
      position: "absolute",
      right: "0",
      top: "0",
      bottom: "0",
      width: "50%",
      pointerEvents: "auto",
      touchAction: "none",
    });

    overlay.appendChild(leftPad);
    overlay.appendChild(rightPad);
    document.body.appendChild(overlay);

    // LEFT PAD
    const updateHorizontal = (e) => {
      e.preventDefault();
      if (this.isLevelComplete()) {
        this.tiltTarget.z = 0;
        return;
      }
      if (e.touches.length === 0) {
        this.tiltTarget.z = 0;
        return;
      }

      const touch = e.touches[0];
      const rect = leftPad.getBoundingClientRect();
      const midX = rect.left + rect.width / 2;

      this.tiltTarget.z = touch.clientX < midX ? this.maxTilt : -this.maxTilt;
    };

    const resetHorizontal = () => {
      this.tiltTarget.z = 0;
    };

    leftPad.addEventListener("touchstart", updateHorizontal, { passive: false });
    leftPad.addEventListener("touchmove", updateHorizontal, { passive: false });
    leftPad.addEventListener("touchend", resetHorizontal);
    leftPad.addEventListener("touchcancel", resetHorizontal);

    // RIGHT PAD
    const updateVertical = (e) => {
      e.preventDefault();
      if (this.isLevelComplete()) {
        this.tiltTarget.x = 0;
        return;
      }
      if (e.touches.length === 0) {
        this.tiltTarget.x = 0;
        return;
      }

      const touch = e.touches[0];
      const rect = rightPad.getBoundingClientRect();
      const midY = rect.top + rect.height / 2;

      this.tiltTarget.x = touch.clientY < midY ? -this.maxTilt : this.maxTilt;
    };

    const resetVertical = () => {
      this.tiltTarget.x = 0;
    };

    rightPad.addEventListener("touchstart", updateVertical, { passive: false });
    rightPad.addEventListener("touchmove", updateVertical, { passive: false });
    rightPad.addEventListener("touchend", resetVertical);
    rightPad.addEventListener("touchcancel", resetVertical);
  }
}
