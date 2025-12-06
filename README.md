# CMPM 121 Final Game -- Gravity Maze (Three.js Version)

## Team Members

-   **Anson Fong** -- Testing Lead\
-   **Daisy Fragoso** -- Tools Lead (Backup)\
-   **Darren Fang** -- Engine Lead\
-   **Diego Tiscareno** -- Tools Lead\
-   **Mandy Lau** -- Design Lead

------------------------------------------------------------------------

## Project Overview

This project is a 3D **Gravity-Based Maze Game** built using
**Three.js** and the physics engine **cannon-es**.

The player tilts the board to guide a ball through a maze using gravity
instead of direct movement controls. The challenge comes from
controlling momentum, angle, and balance while navigating the maze
layout.

Originally, this project was planned to be developed in **LÖVE2D
(Lua)**, but was later migrated to a web-based solution using JavaScript
and Three.js to better support 3D interaction, advanced physics, and
real-time rendering.

------------------------------------------------------------------------

## Technologies Used

### Core Libraries

-   Three.js -- 3D rendering
-   cannon-es -- Physics simulation
-   Vite -- Development server and bundler

### Language

-   JavaScript (ES6)

### Development Tools

-   Visual Studio Code
-   GitHub
-   npm

------------------------------------------------------------------------

## Controls

  Key     Function
  ------- ---------------------
  W / ↑   Tilt board forward
  S / ↓   Tilt board backward
  A / ←   Tilt board left
  D / →   Tilt board right

------------------------------------------------------------------------

## How to Run the Project

``` bash
npm install
npm run dev
```

Then open:

    http://localhost:5173

For mobile: 

  ``` bash
  npm run dev -- --host 0.0.0.0
  ```

  Then open local LAN address link:
    ex. http://10.0.0.0:5173/

------------------------------------------------------------------------

## Use of Generative AI

We used AI tools including: - ChatGPT - Brace

These tools were used for: - Debugging and error diagnosis - Feature
design discussions - Physics tuning suggestions - Project structure
advice

AI was not used to auto-generate the complete game. All implementation
decisions and final code were written and reviewed by the team.

------------------------------------------------------------------------

## Reflection

Switching from LÖVE2D to Three.js required learning 3D rendering,
physics systems, and real-time animation workflows. Integrating physics
with visual representation proved to be the biggest technical challenge.

We learned important concepts such as rigid body systems, time-based
simulation, debugging 3D environments, and how to adapt quickly when
technical constraints change.

Despite initial difficulty, the project result exceeded our expectations
in both realism and interactivity.

------------------------------------------------------------------------

## Future Plans

Potential improvements include: - Complex maze layouts - Start/goal
zones - Timer and scoring system - Mobile tilt support - Sound effects
and UI overlay - Obstacles and hazards

------------------------------------------------------------------------

## Dec 6, 2025

## Selected Requirements from F3

### Touchscreen gameplay

We decided to implement this feature because our tilt-based mechanic is naturally suited for mobile controls. It also expands our game's accessibility by allowing players to interact without a keyboad.

### Visual themes

We selected this because our project uses very obvious contrasting colors already and tying the theme to the system's light/dark mode adds a visual polish without having to redesign our core mechanics.

### Save system

A save system allows for players to keep progress across multiple play sessions. We chose this because it helps build essential software engineering patters like separation of game state and persistent storage.

### External DSL

We decided to add this because it makes level design more maintainable and customizable if we were to expand on this game in the future. Moving level rules into a structured format teaches how to build game data pipelines as well.

## How we satisfied the software requirements

### Touchscreen display

We built a virutal touchpad UI that detects finger movement and converts it into board tilt values. On touchscreens, dragging left/right/up/down sets our tiltTarget.x and tiltTarget.z just like keyboard controls. We added multitouch safeguards, clamped tilt angles, and smoothed input so the gameplay feels natural on mobile devices. The game can be fully completed on a phone with no mouse or keyboard required.

### Visual themes

We implemented a full ThemeManager class that watches the browser's value. When users switch between light and dark mode, our scene transitions smoothly over ~0.6 seconds. The system animates the background color, lighting and material colors for the board and walls. We also decided to exclude changing the color of certain objects like the kill zone and the goal to preserve gameplay readability. This makes the scene feel different between day/night modes while keeping gameplay elements consistent.

### Save system

We implemented a SaveManager that stores and reload game state using localStorage. The system supports 3 save slots that the player can select in the UI. The game will auto-save to a slot every second during the gameplay and will save progress across levels, including currentLevel so that players can continue on the level where they left off. Each save file stores: ball position, tilt values, key collection state, hole and kill zone positions, kill zone count and current level number. Players can also load or delete any slot and progress will persist between brower sessions.

### External DSL 

We created an external JSON file that defines all configurable level rules. This includes the base kill zone size, kill zone growth per level (which was removed later), hole radius, and any other future level properties. Our game loads this JSON before initializing the scene and uses the values to generate randomized levels. This counts as an "external DSL" because the game logic depends on structured externa data and not hard-coded settings. The JSON could be later extended to make level editors and other configuration tools. 

## Reflection for F3
Our plan evolved significantly during the F3 milestone. Originally, we thought the touchscreen controls and visual themes would be small additions, but they later required us to perform deeper refactorings. The ThemeManager pushed us to rethink how materials are shared and updated across objects, and building the saver system required defining clear game state structures instead of letting state live "inside the scene".

We also learned that making a level progression system and an external DSL naturally go hand-in-hand. Once we were able to externalize the level rules, it was easier to support scaling difficulty and multiple kill zones. Throughout this milestone, we practiced better software engineering habits like refactoring before adding features and separating concerns more efficiently. These changes made our codebase smoother to work with and more extensible than our F2 design.

Final Devlog Update: **November 2025**
