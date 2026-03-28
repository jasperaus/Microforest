# Microforest Lab

A collection of interactive simulations and games built with **React 18** and **Phaser 3**.

Live site: https://jasperaus.github.io/Microforest/

---

## What's inside

| App | Description |
|-----|-------------|
| **Iron Cadets** | BattleTech-style turn-based tactical RPG. Command a squad of mechs across 5 missions. Pixel art, armor zones, heat system, special abilities. |
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

The app opens automatically at **http://localhost:3000**.
Hot-reload is active — edits to any `src/` file refresh the browser instantly.

> **No API keys or environment variables required.**
> All game textures are generated procedurally (no image files to download).

---

## Project structure

```
src/
├── App.jsx                  # Home screen launcher
├── App.css                  # Global styles
│
├── components/              # Airplane Boarding Simulator UI
│   └── AirplaneBoardingSimulator.jsx
│
└── game/                    # Iron Cadets RPG
    ├── index.jsx             # React wrapper + Phaser canvas mount
    ├── config.js             # Canvas size, tile constants, phase enum
    │
    ├── components/           # React HUD (overlays the Phaser canvas)
    │   ├── HUDOverlay.jsx
    │   ├── ActionBar.jsx
    │   └── MechCard.jsx
    │
    ├── data/                 # Static game data (JSON)
    │   ├── mechs.json        # 5 player mechs + 2 enemy types
    │   ├── weapons.json      # 5 weapon types
    │   └── campaigns.json    # 5 missions with maps and spawn points
    │
    └── phaser/
        ├── EventBridge.js    # Phaser → React event bus
        │
        ├── entities/
        │   └── Mech.js       # Mech container: sprite, HP bar, animations
        │
        ├── scenes/
        │   ├── BootScene.js        # Procedural texture generation
        │   ├── MenuScene.js        # Animated title screen
        │   ├── StoryScene.js       # 4-slide cinematic intro
        │   ├── MechSelectScene.js  # Squad builder with loadout viewer
        │   ├── BattleScene.js      # Main tactical combat
        │   └── VictoryScene.js     # Win / defeat screen
        │
        └── systems/
            ├── TurnManager.js      # Phase state machine + player actions
            ├── AIController.js     # Enemy AI (move + attack each turn)
            ├── CombatResolver.js   # Hit rolls, damage, armor, heat
            └── PathFinder.js       # BFS movement range, A* AI pathing
```

---

## Available scripts

| Command | Description |
|---------|-------------|
| `npm start` | Dev server at localhost:3000 with hot reload |
| `npm run build` | Production build into `build/` |
| `npm test` | Run test suite |

For a production build without treating warnings as errors:

```bash
CI=false npm run build
```

---

## How Iron Cadets works

### Game flow
```
Menu → Story (4 cinematic slides) → Squad Select → Battle → Victory/Defeat
```

### Combat mechanics
- **2 AP per mech per turn** — spend on Move, Attack, or Special
- **Armor zones** — front and rear armor absorbs damage before HP is reduced; flanking attacks hit rear armor
- **Heat system** — weapons generate heat; at max heat a mech skips its next attack; 25% cools each turn
- **Specials** — each mech has a unique 2-AP ability (stealth, called shot, repair, shield bash, missile barrage)

### Mechs

| Name | Class | HP | Speed | Locked |
|------|-------|----|-------|--------|
| Zip | Scout | 60 | 5 | No |
| Rex | Brawler | 100 | 3 | No |
| Bolt | Sniper | 50 | 2 | Mission 2 |
| Nova | Support | 70 | 3 | Mission 3 |
| Vex | Assault | 90 | 3 | Mission 4 |

---

## Deployment

The site is deployed to **GitHub Pages** via GitHub Actions on every push to `main`.

To trigger a manual deploy:

```bash
CI=false npm run build
# then push — Actions picks it up automatically
```

The workflow file lives at `.github/workflows/` and builds with `CI=false npm run build`, then publishes the `build/` folder.

---

## Tech stack

- **React 18** — app shell, HUD overlay, home screen
- **Phaser 3** — game engine (canvas rendering, tweens, input, scene manager)
- **Ant Design** — UI components used in the Boarding Simulator
- **Chart.js / react-chartjs-2** — boarding strategy comparison charts
- **Leaflet / react-leaflet** — map components
- No backend, no database, no API keys
