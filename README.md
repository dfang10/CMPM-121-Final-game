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

## Date

Final Devlog Update: **November 2025**
