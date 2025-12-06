import * as THREE from "three";

export class ThemeManager {
    constructor(scene) {
        this.scene = scene;

        this.dirLight = new THREE.DirectionalLight(0xffffff, 1);
        this.dirLight.position.set(5, 10, 7);
        scene.add(this.dirLight);

        this.hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.7);
        scene.add(this.hemiLight);

        this.mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

        this.applyTheme(this.mediaQuery.matches ? "dark" : "light");

        this.mediaQuery.addEventListener("change", (e) => {
        this.applyTheme(e.matches ? "dark" : "light");
        });
    }

    applyTheme(theme) {
        if (theme === "dark") {
            this.scene.background = new THREE.Color(0x0d0d0f);

        // Dark mode atmosphere
        this.dirLight.intensity = 0.6;
        this.hemiLight.intensity = 0.3;

        this.dirLight.color.set(0x99bbff);  // moonlight tone
        this.hemiLight.color.set(0x334466);

        } else {
        this.scene.background = new THREE.Color(0xf0f8ff);

        // Day mode atmosphere
        this.dirLight.intensity = 1.0;
        this.hemiLight.intensity = 0.7;

        this.dirLight.color.set(0xffffff);
        this.hemiLight.color.set(0xddddff);
        }
    }
}