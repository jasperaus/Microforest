import Phaser from 'phaser';
import { MECH_COLORS, MECH_TEX_SIZE, TILE_SIZE } from '../../config.js';

// ── Isometric voxel helpers ──────────────────────────────────────────────────

/** Darken a hex colour by a factor (0–1, lower = darker) */
function shade(hex, factor) {
  const r = ((hex >> 16) & 0xff) * factor;
  const g = ((hex >> 8)  & 0xff) * factor;
  const b = ( hex        & 0xff) * factor;
  return (Math.round(r) << 16) | (Math.round(g) << 8) | Math.round(b);
}

/** Lighten a hex colour toward white */
function tint(hex, factor) {
  const r = ((hex >> 16) & 0xff);
  const g = ((hex >> 8)  & 0xff);
  const b = ( hex        & 0xff);
  return ((Math.round(r + (255 - r) * factor)) << 16)
       | ((Math.round(g + (255 - g) * factor)) << 8)
       |  (Math.round(b + (255 - b) * factor));
}

/**
 * Draw a shaded box (3 faces) to simulate isometric voxel.
 * x, y = top-left of the front face. w, h = front face dims.
 * d = depth offset for top/side faces.
 */
function isoBox(g, x, y, w, h, d, color) {
  const top   = tint(color, 0.35);
  const front = color;
  const side  = shade(color, 0.55);

  // Front face
  g.fillStyle(front);
  g.fillRect(x, y, w, h);

  // Top face (parallelogram)
  g.fillStyle(top);
  g.fillPoints([
    { x: x,     y: y },
    { x: x + d, y: y - d },
    { x: x + w + d, y: y - d },
    { x: x + w, y: y },
  ], true);

  // Right side face (parallelogram)
  g.fillStyle(side);
  g.fillPoints([
    { x: x + w,     y: y },
    { x: x + w + d, y: y - d },
    { x: x + w + d, y: y + h - d },
    { x: x + w,     y: y + h },
  ], true);
}

/** Draw a panel line (thin dark rectangle) on the front face */
function panelLine(g, x, y, w, color) {
  g.fillStyle(shade(color, 0.3));
  g.fillRect(x, y, w, 1);
}

/** Draw a rivet dot */
function rivet(g, x, y, color) {
  g.fillStyle(tint(color, 0.5));
  g.fillCircle(x, y, 1.5);
  g.fillStyle(shade(color, 0.35));
  g.fillCircle(x + 0.5, y + 0.5, 1);
}

/** Draw a glowing accent rect */
function glow(g, x, y, w, h, color) {
  g.fillStyle(color, 0.2);
  g.fillRect(x - 2, y - 2, w + 4, h + 4);
  g.fillStyle(color, 0.5);
  g.fillRect(x - 1, y - 1, w + 2, h + 2);
  g.fillStyle(color, 1);
  g.fillRect(x, y, w, h);
  g.fillStyle(0xffffff, 0.4);
  g.fillRect(x + 1, y + 1, Math.max(1, w - 2), Math.max(1, Math.floor(h / 3)));
}

/** Draw a glowing circle accent */
function glowCircle(g, x, y, r, color) {
  g.fillStyle(color, 0.15);
  g.fillCircle(x, y, r + 4);
  g.fillStyle(color, 0.35);
  g.fillCircle(x, y, r + 2);
  g.fillStyle(color, 1);
  g.fillCircle(x, y, r);
  g.fillStyle(0xffffff, 0.5);
  g.fillCircle(x - 1, y - 1, Math.max(1, r - 2));
}

// ── BootScene ────────────────────────────────────────────────────────────────

export default class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  create() {
    this._generateTileTextures();
    this._generateMechTextures();
    this._generateParticleTextures();
    this.scene.start('MenuScene');
  }

  // ── Tile textures (isometric stone blocks) ────────────────────────────────

  _generateTileTextures() {
    const S = TILE_SIZE;

    // Grass — stone slab with moss accents
    this._makeTile('tile_grass', S, (g) => {
      const base = 0x4a5a3a;
      isoBox(g, 0, 8, S, S - 8, 8, base);
      // Grid lines on top
      g.fillStyle(shade(base, 0.7), 0.4);
      g.fillRect(0, 0, S, 1);
      g.fillRect(0, 0, 1, S);
      // Moss patches
      g.fillStyle(0x5a7a3a, 0.5);
      g.fillRect(12, 4, 8, 3);
      g.fillRect(45, 2, 10, 2);
      g.fillRect(22, 5, 6, 2);
      g.fillRect(55, 6, 12, 2);
      // Stone crack detail
      g.fillStyle(shade(base, 0.55), 0.6);
      g.fillRect(30, 3, 1, 4);
      g.fillRect(60, 1, 1, 5);
    });

    // Wall — dark metal block
    this._makeTile('tile_wall', S, (g) => {
      const base = 0x556068;
      isoBox(g, 0, 8, S, S - 8, 8, base);
      // Armour plate seams
      panelLine(g, 2, 20, S - 4, base);
      panelLine(g, 2, 40, S - 4, base);
      panelLine(g, 2, 55, S - 4, base);
      // Rivets
      rivet(g, 6, 14, base); rivet(g, S - 8, 14, base);
      rivet(g, 6, 34, base); rivet(g, S - 8, 34, base);
      rivet(g, 6, 50, base); rivet(g, S - 8, 50, base);
      // Hazard stripe on top face
      g.fillStyle(0xddaa00, 0.3);
      for (let i = 0; i < 6; i++) {
        g.fillRect(i * 14, 2, 7, 5);
      }
    });

    // Water — dark pool with shimmer
    this._makeTile('tile_water', S, (g) => {
      const base = 0x1a3a5a;
      g.fillStyle(base);
      g.fillRect(0, 0, S, S);
      // Depth gradient
      g.fillStyle(0x0a2040, 0.5);
      g.fillRect(0, S / 2, S, S / 2);
      // Shimmer lines
      g.fillStyle(0x3388cc, 0.35);
      g.fillRect(8, 14, 30, 2);
      g.fillRect(20, 30, 40, 2);
      g.fillRect(5, 46, 25, 2);
      g.fillRect(40, 58, 30, 2);
      g.fillStyle(0x55bbee, 0.2);
      g.fillRect(15, 22, 18, 1);
      g.fillRect(42, 40, 22, 1);
      // Edge highlight
      g.fillStyle(0x4488aa, 0.4);
      g.fillRect(0, 0, S, 2);
      g.fillRect(0, 0, 2, S);
    });

    // Objective — gold-trimmed command tile
    this._makeTile('tile_objective', S, (g) => {
      const base = 0x5a5040;
      isoBox(g, 0, 8, S, S - 8, 8, base);
      // Gold border trim on top face
      g.fillStyle(0xddaa22, 0.7);
      g.fillRect(0, 0, S, 2);
      g.fillRect(0, 6, S, 2);
      g.fillRect(0, 0, 2, 8);
      g.fillRect(S - 2, 0, 2, 8);
      // Central marker
      g.fillStyle(0xffcc00, 0.8);
      g.fillRect(S / 2 - 8, 20, 16, 16);
      g.fillStyle(0xffee66, 0.6);
      g.fillRect(S / 2 - 4, 24, 8, 8);
      // Diamond icon
      g.fillStyle(0xffffff, 0.5);
      g.fillPoints([
        { x: S / 2, y: 22 },
        { x: S / 2 + 5, y: 28 },
        { x: S / 2, y: 34 },
        { x: S / 2 - 5, y: 28 },
      ], true);
    });
  }

  _makeTile(key, size, drawFn) {
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    drawFn(g);
    g.generateTexture(key, size, size);
    g.destroy();
  }

  // ── Mech textures (pseudo-isometric voxel) ────────────────────────────────

  _generateMechTextures() {
    this._makeZip();
    this._makeRex();
    this._makeBolt();
    this._makeNova();
    this._makeVex();
    this._makeDroneAlpha();
    this._makeDroneHeavy();
  }

  _makeMech(key, drawFn) {
    const S = MECH_TEX_SIZE;
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    drawFn(g, S);
    g.generateTexture(key, S, S);
    g.destroy();
  }

  // ── Zip: Scout — slim, fast, antenna, cyan ────────────────────────────────
  _makeZip() {
    this._makeMech('mech_zip', (g, S) => {
      const c = 0x00ccbb;
      const armor = 0x667788;
      const joint = 0x334455;
      const d = 5; // iso depth

      // Legs (thin, fast-looking)
      isoBox(g, 30, 68, 10, 18, d, joint);
      isoBox(g, 52, 68, 10, 18, d, joint);
      // Feet
      isoBox(g, 27, 84, 14, 6, d, armor);
      isoBox(g, 49, 84, 14, 6, d, armor);

      // Torso (slim)
      isoBox(g, 28, 40, 36, 30, d, c);
      panelLine(g, 30, 50, 32, c);
      panelLine(g, 30, 58, 32, c);

      // Shoulder pads (small, aerodynamic)
      isoBox(g, 18, 40, 12, 14, d, armor);
      isoBox(g, 62, 40, 12, 14, d, armor);

      // Arms
      isoBox(g, 20, 52, 8, 16, 3, joint);
      isoBox(g, 64, 52, 8, 16, 3, joint);

      // Head (sleek)
      isoBox(g, 34, 24, 24, 18, d, c);
      // Visor (wide cyan)
      glow(g, 37, 30, 18, 5, 0x00ffee);

      // Antenna
      g.fillStyle(armor);
      g.fillRect(45, 10, 2, 16);
      glowCircle(g, 46, 9, 3, 0xffffff);

      // Chest power indicator
      glow(g, 42, 46, 8, 4, 0x00ffcc);

      // Rivets
      rivet(g, 22, 44, armor);
      rivet(g, 70, 44, armor);
    });
  }

  // ── Rex: Brawler — wide, heavy, orange ────────────────────────────────────
  _makeRex() {
    this._makeMech('mech_rex', (g, S) => {
      const c = 0xcc7700;
      const armor = 0x778088;
      const joint = 0x3a3a40;
      const d = 6;

      // Legs (thick)
      isoBox(g, 26, 64, 16, 20, d, joint);
      isoBox(g, 50, 64, 16, 20, d, joint);
      // Armoured shin guards
      isoBox(g, 24, 70, 8, 12, 3, armor);
      isoBox(g, 60, 70, 8, 12, 3, armor);
      // Feet (wide)
      isoBox(g, 22, 82, 22, 8, d, armor);
      isoBox(g, 48, 82, 22, 8, d, armor);

      // Torso (massive)
      isoBox(g, 22, 34, 48, 32, d, c);
      panelLine(g, 26, 44, 42, c);
      panelLine(g, 26, 52, 42, c);
      panelLine(g, 26, 58, 42, c);
      // Chest emblem (red insignia)
      g.fillStyle(0xff2200, 0.8);
      g.fillRect(40, 38, 12, 8);
      g.fillStyle(0xff4422);
      g.fillPoints([
        { x: 46, y: 37 }, { x: 50, y: 42 }, { x: 46, y: 46 }, { x: 42, y: 42 },
      ], true);

      // Shoulder pads (huge, blocky)
      isoBox(g, 8, 32, 18, 18, d, armor);
      isoBox(g, 66, 32, 18, 18, d, armor);
      rivet(g, 12, 36, armor); rivet(g, 22, 36, armor);
      rivet(g, 70, 36, armor); rivet(g, 80, 36, armor);
      rivet(g, 12, 46, armor); rivet(g, 22, 46, armor);
      rivet(g, 70, 46, armor); rivet(g, 80, 46, armor);

      // Fists (large)
      isoBox(g, 10, 50, 12, 14, 4, joint);
      isoBox(g, 70, 50, 12, 14, 4, joint);
      glow(g, 12, 54, 8, 4, 0x44aaff);
      glow(g, 72, 54, 8, 4, 0x44aaff);

      // Head (squat, armoured)
      isoBox(g, 30, 18, 32, 18, d, armor);
      // Visor (narrow angry slit)
      glow(g, 34, 26, 24, 4, 0xff6600);

      // Missile pod on left shoulder
      g.fillStyle(0x444444);
      g.fillRect(10, 33, 4, 3); g.fillRect(10, 37, 4, 3); g.fillRect(10, 41, 4, 3);
      g.fillStyle(0xff2200, 0.6);
      g.fillCircle(12, 34, 1); g.fillCircle(12, 38, 1); g.fillCircle(12, 42, 1);
    });
  }

  // ── Bolt: Sniper — tall, one big cannon arm, green ────────────────────────
  _makeBolt() {
    this._makeMech('mech_bolt', (g, S) => {
      const c = 0x22aa44;
      const armor = 0x556a5a;
      const joint = 0x2a3a30;
      const d = 5;

      // Legs (thin, bipod stance)
      isoBox(g, 32, 66, 10, 20, d, joint);
      isoBox(g, 54, 66, 10, 20, d, joint);
      // Stabiliser feet
      isoBox(g, 28, 84, 16, 6, d, armor);
      isoBox(g, 50, 84, 16, 6, d, armor);
      g.fillStyle(0x00ddaa, 0.4);
      g.fillRect(30, 87, 4, 2); g.fillRect(52, 87, 4, 2);

      // Torso (slim, tall)
      isoBox(g, 30, 36, 32, 32, d, c);
      panelLine(g, 32, 46, 28, c);
      panelLine(g, 32, 54, 28, c);

      // LEFT: Big cannon arm
      isoBox(g, 8, 36, 22, 12, d, armor);
      // Barrel
      g.fillStyle(0x2a3a30);
      g.fillRect(2, 40, 24, 6);
      g.fillStyle(0x1a2a20);
      g.fillRect(0, 41, 6, 4);
      // Muzzle glow
      glow(g, 0, 42, 4, 2, 0x00ff66);

      // RIGHT: Normal arm
      isoBox(g, 62, 42, 12, 14, 4, joint);

      // Shoulder pad (cannon side wider)
      isoBox(g, 10, 30, 20, 8, d, armor);
      rivet(g, 14, 33, armor); rivet(g, 26, 33, armor);

      // Head (tall with scope)
      isoBox(g, 34, 16, 24, 22, d, c);
      // Scope extends right
      isoBox(g, 56, 18, 16, 8, 3, armor);
      glow(g, 60, 20, 10, 4, 0x00ffaa);
      // Main visor
      glow(g, 38, 24, 16, 6, 0x00ff66);

      // Chest scanner
      glow(g, 42, 40, 6, 4, 0x00ddaa);
    });
  }

  // ── Nova: Support — round, medical cross, gold ────────────────────────────
  _makeNova() {
    this._makeMech('mech_nova', (g, S) => {
      const c = 0xccaa00;
      const armor = 0x8a8060;
      const joint = 0x4a4a38;
      const d = 5;

      // Legs (medium)
      isoBox(g, 30, 66, 12, 18, d, joint);
      isoBox(g, 52, 66, 12, 18, d, joint);
      // Rounded feet
      isoBox(g, 28, 82, 16, 8, d, armor);
      isoBox(g, 50, 82, 16, 8, d, armor);

      // Torso (rounded / boxy)
      isoBox(g, 24, 36, 44, 32, d, c);
      // Medical cross on chest
      g.fillStyle(0xffffff, 0.85);
      g.fillRect(42, 40, 8, 22);
      g.fillRect(36, 46, 20, 8);
      // Cross outline
      g.fillStyle(0xdd0000, 0.6);
      g.fillRect(43, 41, 6, 20);
      g.fillRect(37, 47, 18, 6);

      // Shoulder pads (round)
      isoBox(g, 14, 38, 12, 14, d, armor);
      isoBox(g, 66, 38, 12, 14, d, armor);

      // Arms (repair tools)
      isoBox(g, 16, 50, 10, 14, 3, joint);
      isoBox(g, 68, 50, 10, 14, 3, joint);
      // Tool tips glow
      glow(g, 18, 62, 6, 3, 0x44ffaa);
      glow(g, 70, 62, 6, 3, 0x44ffaa);

      // Head (round, friendly)
      isoBox(g, 32, 18, 28, 20, d, c);
      // Eyes (round, blue)
      glowCircle(g, 40, 28, 4, 0x44aaff);
      glowCircle(g, 54, 28, 4, 0x44aaff);

      // Antenna (small)
      g.fillStyle(armor);
      g.fillRect(45, 10, 2, 10);
      g.fillStyle(0x44ff88);
      g.fillCircle(46, 9, 2);
    });
  }

  // ── Vex: Assault — massive, shoulder rockets, red ─────────────────────────
  _makeVex() {
    this._makeMech('mech_vex', (g, S) => {
      const c = 0xcc1122;
      const armor = 0x6a6070;
      const joint = 0x3a2a30;
      const d = 6;

      // Legs (very thick)
      isoBox(g, 24, 62, 18, 22, d, joint);
      isoBox(g, 52, 62, 18, 22, d, joint);
      // Armoured knee guards
      isoBox(g, 22, 66, 8, 10, 3, armor);
      isoBox(g, 64, 66, 8, 10, 3, armor);
      // Heavy feet
      isoBox(g, 20, 82, 24, 8, d, armor);
      isoBox(g, 50, 82, 24, 8, d, armor);
      // Chevron markings on legs
      g.fillStyle(0x44aaff, 0.5);
      g.fillRect(28, 76, 10, 2); g.fillRect(30, 78, 8, 2);
      g.fillRect(56, 76, 10, 2); g.fillRect(58, 78, 8, 2);

      // Torso (massive)
      isoBox(g, 20, 32, 54, 32, d, c);
      panelLine(g, 24, 42, 46, c);
      panelLine(g, 24, 50, 46, c);
      panelLine(g, 24, 56, 46, c);
      rivet(g, 26, 38, c); rivet(g, 68, 38, c);
      rivet(g, 26, 48, c); rivet(g, 68, 48, c);

      // Shoulder ROCKET PODS
      isoBox(g, 4, 24, 18, 22, d, armor);
      isoBox(g, 72, 24, 18, 22, d, armor);
      // Rocket tube openings
      g.fillStyle(0x333333);
      g.fillRect(6, 26, 6, 4); g.fillRect(6, 32, 6, 4); g.fillRect(6, 38, 6, 4);
      g.fillRect(74, 26, 6, 4); g.fillRect(74, 32, 6, 4); g.fillRect(74, 38, 6, 4);
      g.fillStyle(0xff3300, 0.5);
      g.fillCircle(9, 28, 1.5); g.fillCircle(9, 34, 1.5); g.fillCircle(9, 40, 1.5);
      g.fillCircle(77, 28, 1.5); g.fillCircle(77, 34, 1.5); g.fillCircle(77, 40, 1.5);

      // Arms (barrel guns)
      isoBox(g, 6, 46, 12, 16, 4, joint);
      isoBox(g, 76, 46, 12, 16, 4, joint);
      glow(g, 8, 60, 8, 3, 0xff4400);
      glow(g, 78, 60, 8, 3, 0xff4400);

      // Head (command dome, flat)
      isoBox(g, 28, 16, 38, 18, d, armor);
      // Visor (angry orange slit)
      glow(g, 34, 24, 26, 4, 0xff8800);

      // Chest power core
      glow(g, 44, 44, 6, 6, 0xff2200);
    });
  }

  // ── Drone Alpha: fast insectoid, purple ───────────────────────────────────
  _makeDroneAlpha() {
    this._makeMech('mech_drone_alpha', (g, S) => {
      const c = 0x8822aa;
      const armor = 0x5a4a6a;
      const joint = 0x3a2a4a;
      const d = 4;

      // Insect legs (3 pairs)
      g.fillStyle(joint);
      g.fillRect(14, 56, 16, 3); g.fillRect(62, 56, 16, 3);
      g.fillRect(10, 66, 16, 3); g.fillRect(66, 66, 16, 3);
      g.fillRect(16, 76, 12, 3); g.fillRect(64, 76, 12, 3);
      // Claws
      g.fillStyle(0xff00ff, 0.4);
      g.fillCircle(12, 77, 2); g.fillCircle(80, 77, 2);

      // Thorax
      isoBox(g, 26, 48, 40, 24, d, c);
      panelLine(g, 28, 58, 36, c);

      // Wings
      g.fillStyle(c, 0.35);
      for (let i = 0; i < 3; i++) {
        g.fillRect(14 - i * 2, 38 + i * 4, 20, 6);
        g.fillRect(60 + i * 2, 38 + i * 4, 20, 6);
      }
      g.fillStyle(0xcc44ff, 0.15);
      g.fillRect(12, 36, 22, 18);
      g.fillRect(58, 36, 22, 18);

      // Head
      isoBox(g, 30, 24, 32, 26, d, c);

      // Single glowing eye
      glowCircle(g, 46, 36, 6, 0xff00ff);

      // Antennae
      g.fillStyle(joint);
      g.fillRect(34, 14, 2, 12);
      g.fillRect(56, 14, 2, 12);
      g.fillStyle(0xff44ff);
      g.fillCircle(35, 13, 2);
      g.fillCircle(57, 13, 2);
    });
  }

  // ── Drone Heavy: tank with treads, dark red ───────────────────────────────
  _makeDroneHeavy() {
    this._makeMech('mech_drone_heavy', (g, S) => {
      const c = 0x991111;
      const armor = 0x6a5a5a;
      const joint = 0x333333;
      const d = 6;

      // Tread base
      isoBox(g, 10, 70, 72, 16, d, joint);
      // Tread wheels
      g.fillStyle(0x555555);
      for (let i = 0; i < 7; i++) {
        g.fillCircle(16 + i * 10, 78, 5);
        g.fillStyle(0x444444);
        g.fillCircle(16 + i * 10, 78, 3);
        g.fillStyle(0x555555);
      }

      // Heavy body
      isoBox(g, 14, 34, 64, 38, d, c);
      panelLine(g, 18, 44, 56, c);
      panelLine(g, 18, 56, 56, c);
      panelLine(g, 18, 64, 56, c);
      rivet(g, 20, 40, c); rivet(g, 72, 40, c);
      rivet(g, 20, 52, c); rivet(g, 72, 52, c);

      // Turret
      isoBox(g, 24, 18, 44, 20, d, armor);
      panelLine(g, 28, 28, 36, armor);

      // Twin cannons (extending left)
      isoBox(g, 4, 30, 24, 7, 4, joint);
      isoBox(g, 4, 40, 24, 7, 4, joint);
      // Muzzles
      g.fillStyle(0x1a1a1a);
      g.fillRect(0, 31, 8, 5);
      g.fillRect(0, 41, 8, 5);
      glow(g, 1, 32, 3, 3, 0xff4400);
      glow(g, 1, 42, 3, 3, 0xff4400);

      // Red optics
      glow(g, 32, 22, 28, 6, 0xff0000);

      // Armour plate reinforcement
      isoBox(g, 16, 34, 8, 16, 3, armor);
      isoBox(g, 68, 34, 8, 16, 3, armor);
    });
  }

  // ── Particle textures ─────────────────────────────────────────────────────

  _generateParticleTextures() {
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0xffffff);
    g.fillCircle(4, 4, 4);
    g.generateTexture('particle', 8, 8);
    g.destroy();
  }
}
