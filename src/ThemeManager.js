import * as THREE from "three";

export class ThemeManager {
  constructor(scene, materials = []) {
    this.scene = scene;
    this.materials = materials || [];

    // Lights
    this.dirLight = new THREE.DirectionalLight(0xffffff, 1);
    this.dirLight.position.set(5, 10, 7);
    scene.add(this.dirLight);

    this.hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.7);
    scene.add(this.hemiLight);

    this.mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    // Animation state
    this.currentTheme = null;     
    this.targetTheme = null;
    this.transitionDuration = 0.6; 
    this.transitionProgress = 1;    
    this.startValues = null;
    this.endValues = null;

    this._tmpColor = new THREE.Color();

    const isDark = this.mediaQuery.matches;
    this.currentTheme = isDark ? "dark" : "light";
    this.targetTheme = this.currentTheme;
    this._applyThemeInstant(this.currentTheme);
  }

  // helper function
  _themeValues(theme) {
    if (theme === "dark") {
      return {
        bg: new THREE.Color(0x000000),
        dirColor: new THREE.Color(0x99bbff),
        dirIntensity: 0.6,
        hemiColor: new THREE.Color(0x334466),
        hemiIntensity: 0.3,

         materialColor: new THREE.Color(0x77C2FF),
      };
    } else if (theme === "light"){
      return {
        bg: new THREE.Color(0xffffff),
        dirColor: new THREE.Color(0xffffff),
        dirIntensity: 1.0,
        hemiColor: new THREE.Color(0xddddff),
        hemiIntensity: 0.7,

        materialColor: new THREE.Color(0xffe34d),
      };
    }
  }

  // initial load
  _applyThemeInstant(theme) {
    const v = this._themeValues(theme);

    this.scene.background = v.bg.clone();
    this.dirLight.color.copy(v.dirColor);
    this.dirLight.intensity = v.dirIntensity;
    this.hemiLight.color.copy(v.hemiColor);
    this.hemiLight.intensity = v.hemiIntensity;

    this.materials.forEach((mat) => {
      if (mat.color) mat.color.copy(v.materialColor);
    });
  }

  // start smooth transition
  _startTransition(newTheme) {
    this.targetTheme = newTheme;
    this.transitionProgress = 0;

    this.startValues = {
        bg: this.scene.background.clone(),
        dirColor: this.dirLight.color.clone(),
        dirIntensity: this.dirLight.intensity,
        hemiColor: this.hemiLight.color.clone(),
        hemiIntensity: this.hemiLight.intensity,
        matColors: this.materials.map((mat) => mat.color?.clone()),
    };

    this.endValues = this._themeValues(newTheme);
  }

  // update scene
  update(dt) {
    const shouldBeDark = this.mediaQuery.matches;
    const desiredTheme = shouldBeDark ? "dark" : "light";

    if (desiredTheme !== this.currentTheme && desiredTheme !== this.targetTheme) {
      this._startTransition(desiredTheme);
    }

    if (this.transitionProgress >= 1 || !this.startValues || !this.endValues) {
      return;
    }

    this.transitionProgress = Math.min(
      1,
      this.transitionProgress + dt / this.transitionDuration
    );
    const t = this.transitionProgress;

    const smooth = t * t * (3 - 2 * t);

    this.dirLight.color.copy(
      this._tmpColor.copy(this.startValues.dirColor).lerp(this.endValues.dirColor, smooth)
    );
    this.dirLight.intensity =
      this.startValues.dirIntensity +
      (this.endValues.dirIntensity - this.startValues.dirIntensity) * smooth;

    this.hemiLight.color.copy(
      this._tmpColor.copy(this.startValues.hemiColor).lerp(this.endValues.hemiColor, smooth)
    );
    this.hemiLight.intensity =
      this.startValues.hemiIntensity +
      (this.endValues.hemiIntensity - this.startValues.hemiIntensity) * smooth;

    this.materials.forEach((mat, i) => {
      if (!mat.color || !this.startValues.matColors[i]) return;

      mat.color.copy(
        this._tmpColor
          .copy(this.startValues.matColors[i])
          .lerp(this.endValues.materialColor, smooth)
      );
    });

    this.scene.background = this._tmpColor
    .copy(this.startValues.bg)
    .lerp(this.endValues.bg, smooth);

    if (this.transitionProgress >= 1) {
      this.currentTheme = this.targetTheme;
    }
  }
}
