# Microforest Lab

> **Version 2.0** — Updated April 4, 2026  
> R3F 3D battle engine, bug fixes, graphics uplift, deps upgraded

A collection of interactive simulations and games built with **React 18**, **React Three Fiber**, and **Vite 6**.

Live site: https://jasperaus.github.io/Microforest/

---

## What's inside

| App | Description |
|-----|-------------|
| **Iron Cadets** | BattleTech-style turn-based tactical RPG. Command a squad of mechs across 5 missions in a fully 3D hex-grid battlefield. Armor zones, heat system, special abilities, post-processing effects. |
| **Boarding Simulator** | Compare 6 airplane boarding strategies with live visualisation and timing data. |

---

## Running locally

### Prerequisites

- **Node.js 18 or later** — [nodejs.org](https://nodejs.org)
- **npm 9+** (bundled with Node)

Check your versions:

```bash
node --version   # should print v18.x or higher
npm --version    # should print 9.x or higher
```

### Quick start

```bash
# 1. Clone the repo
git clone https://github.com/jasperaus/Microforest.git
cd Microforest

# 2. Install dependencies (~1–2 minutes first time)
npm install

# 3. Start the dev server
npm start
```

The app opens at **http://localhost:5173** (Vite default port).
Hot-reload is active — edits to any `src/` file refresh the browser instantly.

> **No API keys or environment variables required.**
> All textures and geometry are generated procedurally.

### Run in the browser (no install)

Open in **StackBlitz** — runs entirely in your browser, no local install needed:

```
https://stackblitz.com/github/jasperaus/Microforest/tree/claude/iron-cadets-review-O3nMf
```

Allow 3–5 minutes on first load for dependency install and compilation. This branch contains the latest R3F 3D engine, bug fixes, and graphics upgrades.

---

## Project structure

```
src/
├── index.js                 # React entry point
├── App.jsx                  # Home screen launcher
├── App.css                  # Global styles
│
├── boarding/                # ── Airplane Boarding Simulator ──────────────
│   ├── AirplaneBoardingSimulator.jsx
│   └── simulation/
│       └── boardingEngine.js
│
└── game/                    # ── Iron Cadets RPG ──────────────────────────
    ├── config.js             # Tile constants, PHASE enum, grid dimensions
    ├── GameContext.js        # Shared dependency container (grid, mechs, combat)
    │
    ├── components/           # React HUD (HTML overlay above 3D canvas)
    │   ├── HUDOverlay.jsx    # Main HUD: mech roster, combat log, turn banner
    │   ├── ActionBar.jsx     # Move / Attack / Special / End Turn buttons
    │   └── MechCard.jsx      # Selected mech stats panel
    │
    ├── data/                 # Static game data (JSON)
    │   ├── mechs.json        # 5 player mechs + 2 enemy types
    │   ├── weapons.json      # 5 weapon types with stats
    │   └── campaigns.json    # 5 missions with tile maps and spawn points
    │
    ├── r3f/                  # ── React Three Fiber 3D scene ──────────────
    │   ├── GameRoot.jsx      # Scene router (Menu→Story→Battle→Victory)
    │   ├── BattleScene3D.jsx # Main 3D battle scene + input handling
    │   ├── HexGrid.jsx       # Hex tile prisms with highlight overlays
    │   ├── MechModel.jsx     # Procedural mech geometry (USE_GLTF_MODELS flag)
    │   ├── Lighting.jsx      # Directional + team point lights + fog + stars
    │   ├── PostProcessing.jsx# SSAO, Bloom, ChromaticAberration, Vignette
    │   ├── CameraRig.jsx     # Orbit controls + idle drift + combat shake
    │   ├── animUtils.js      # safeAnim() Promise.race timeout helper
    │   │
    │   ├── effects/
    │   │   └── CombatEffects.jsx  # Impact rings, muzzle flash, floating numbers
    │   │
    │   └── scenes/           # Non-battle R3F scenes (menus, story, victory)
    │
    └── phaser/               # ── Game systems (pure JS, no Phaser runtime) ─
        ├── EventBridge.js    # Multi-listener event bus (game logic → React)
        │
        ├── scenes/           # Legacy Phaser scene stubs (BootScene, MenuScene…)
        │                     # These render procedural textures; R3F handles 3D.
        │
        └── systems/
            ├── TurnManager.js      # Phase state machine + player/enemy turn flow
            ├── AIController.js     # Enemy AI: move toward + attack nearest player
            ├── CombatResolver.js   # Hit rolls, armor zones, flanking, heat
            ├── PathFinder.js       # BFS reachability, A* AI pathfinding
            └── AbilityFactory.js   # Special ability resolution per mech class
```

---

## Available scripts

| Command | Description |
|---------|-------------|
| `npm start` or `npm run dev` | Dev server at localhost:5173 with hot reload |
| `npm run build` | Production build into `dist/` (uses `/Microforest/` base for GitHub Pages) |
| `npm run preview` | Preview the production build locally |

---

## Controls

### Mouse
| Action | Input |
|--------|-------|
| Select a mech | Left-click on mech or its tile |
| Move to tile | Left-click a blue highlighted tile |
| Attack enemy | Left-click a red highlighted enemy tile |
| Deselect | Left-click empty terrain or press DESELECT |
| Orbit camera | Right-click + drag |
| Zoom | Scroll wheel |

### HUD Buttons
| Button | AP Cost | Description |
|--------|---------|-------------|
| MOVE | 1 | Show reachable tiles; click tile to move |
| ATTACK | 1 | Show enemy targets; click to fire |
| SPECIAL | 2 | Activate mech's unique ability |
| END TURN | — | Pass to enemy AI (pulses when all mechs are exhausted) |
| DESELECT | — | Deselect current mech |

---

## How Iron Cadets works

### Game flow
```
Menu → Story (4 cinematic slides) → Squad Select → Battle → Victory/Defeat
```

### Renderer architecture

The 3D battle scene runs entirely in **React Three Fiber** (Three.js). Phaser is retained only for the legacy menu/story scenes (procedural canvas textures). The two worlds share state via:

- `GameContext` — plain JS dependency container; holds grid, mechs, weapons; injected with R3F callbacks (`_setHighlights`, `_mechAnimations`, `spawnEffect`, `_shakeCamera`)
- `EventBridge` — multi-listener event bus; game systems emit events that HUDOverlay (React) consumes without coupling to Three.js

### Combat mechanics

- **2 AP per mech per turn** — spend on Move (1 AP), Attack (1 AP), or Special (2 AP)
- **Armor zones** — front and rear armor absorbs damage before HP is reduced; flanking attacks (attacking from behind) bypass front armor and hit rear armor
- **Heat system** — weapons generate heat; at max heat a mech cannot attack; 25% dissipates each turn; overheating locks attacks for one turn
- **Flanking** — attack from the arc behind a mech for rear-armor hits; adjacency also enables flank bonuses
- **Specials** — each mech has a unique 2-AP ability (see table below)

### Mechs

| Name | Class | HP | Speed | Heat | Special Ability | Unlocked |
|------|-------|----|-------|------|-----------------|----------|
| Zip | Scout | 60 | 5 | 80 | Ghost Protocol (stealth) | Always |
| Rex | Brawler | 100 | 3 | 100 | Shield Bash (melee push) | Always |
| Bolt | Sniper | 50 | 2 | 60 | Called Shot (armor pierce) | Mission 2 |
| Nova | Support | 70 | 3 | 90 | Field Repair (self-heal) | Mission 3 |
| Vex | Assault | 90 | 3 | 120 | Missile Barrage (AoE) | Mission 4 |

### Enemies

| Name | Class | HP | Speed | Notes |
|------|-------|----|-------|-------|
| Drone Alpha | Fast | 40 | 4 | Spinning-fin geometry, light armour |
| Tank Bravo | Heavy | 120 | 2 | High armour, slow, hits hard |

---

## Graphics

### 3D pipeline

The battle scene renders on a React Three Fiber `<Canvas>` with:

- **PCFSoft shadows** at 4096×4096 resolution
- **ACES filmic tonemapping** (exposure 1.1)
- **Post-processing**: SSAO (ambient occlusion), Bloom (threshold 0.5, intensity 1.6), Chromatic Aberration, Vignette
- **Fog** for atmospheric depth
- **Procedural stars** (`@react-three/drei` `<Stars>`)
- **Team-coloured point lights** (blue for player zone, red for enemy zone)
- **Combat VFX**: impact rings, muzzle flash, floating damage numbers (auto-cleanup after ~1 s)
- **Hex tile prisms** with per-type heights (wall tallest, water lowest) and animated objective tiles
- **CameraRig**: slow idle drift orbit + shake on hits/deaths

### GLTF model toggle

`MechModel.jsx` contains a `USE_GLTF_MODELS = false` flag at the top. When `false`, rich procedural geometry is used (default). Set to `true` and place `.glb` files at `/public/models/{mechId}.glb` to use GLTF models instead.

---

## Deployment

The site deploys to **GitHub Pages** via GitHub Actions on every push to `main`.

The workflow builds with `npm run build` and publishes the `dist/` folder.

---

## Tech stack

| Technology | Version | Role |
|-----------|---------|------|
| React | 18 | App shell, HUD overlay |
| Vite | 6 | Build tool + dev server |
| Three.js | 0.183 | 3D rendering engine |
| React Three Fiber | 9 | React renderer for Three.js |
| @react-three/drei | 10 | Stars, Sparkles, OrbitControls helpers |
| @react-three/postprocessing | 3 | SSAO, Bloom, ChromaticAberration |
| Phaser 3 | 3.88 | Legacy menu/story scene canvas (not used in battle) |
| Ant Design | 5 | UI components (Boarding Simulator) |
| Chart.js | 4 | Boarding strategy charts |

---

## Troubleshooting

**Black / dark screen on load**
- Ensure your browser supports WebGL 2. Check at [webglreport.com](https://webglreport.com).
- Try disabling browser extensions that block canvas (some ad-blockers interfere).

**Game freezes on "Enemy turn"**
- This was a known bug (async callback chain with no error handling) — fixed in this version.
- If it recurs, open the browser console and check for uncaught errors.

**Performance issues**
- The post-processing stack (SSAO + Bloom) is GPU-intensive. Disable `PostProcessing.jsx` import in `BattleScene3D.jsx` for lower-end hardware.
- Reduce shadow map resolution in `Lighting.jsx` (`mapSize` from 4096 → 1024).

**`npm run dev` fails**
- Delete `node_modules/` and `package-lock.json`, then re-run `npm install`.
- Ensure Node.js 18+ is installed.
