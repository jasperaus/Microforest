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
      const c     = 0x00ccbb;
      const armor = 0x667788;
      const joint = 0x2a3d50;
      const white = 0xd0dce8;
      const d = 5;

      // Legs
      isoBox(g, 30, 68, 10, 20, d, joint);
      isoBox(g, 52, 68, 10, 20, d, joint);
      // White knee caps
      isoBox(g, 30, 72, 10, 7, 3, white);
      isoBox(g, 52, 72, 10, 7, 3, white);
      // Feet
      isoBox(g, 26, 86, 16, 6, d, armor);
      isoBox(g, 50, 86, 16, 6, d, armor);

      // Torso (slim)
      isoBox(g, 28, 40, 36, 30, d, c);
      // White chest plate
      g.fillStyle(white, 0.18);
      g.fillRect(30, 42, 32, 26);
      panelLine(g, 30, 50, 32, c);
      panelLine(g, 30, 60, 32, c);

      // Shoulder pads with white accent strip
      isoBox(g, 16, 38, 14, 16, d, armor);
      isoBox(g, 62, 38, 14, 16, d, armor);
      g.fillStyle(white, 0.55);
      g.fillRect(17, 39, 12, 4);
      g.fillRect(63, 39, 12, 4);

      // Arms
      isoBox(g, 18, 52, 9, 18, 3, joint);
      isoBox(g, 65, 52, 9, 18, 3, joint);

      // Head (sleek)
      isoBox(g, 33, 22, 26, 20, d, c);
      // White forehead panel
      g.fillStyle(white, 0.3);
      g.fillRect(35, 22, 22, 6);
      // Visor (wide cyan glow)
      glow(g, 37, 30, 18, 5, 0x00ffee);
      // Chin detail
      g.fillStyle(armor, 1);
      g.fillRect(36, 40, 20, 3);

      // Antenna
      g.fillStyle(armor);
      g.fillRect(44, 8, 2, 16);
      glowCircle(g, 45, 7, 3, 0xffffff);

      // Chest power core
      glow(g, 42, 46, 8, 5, 0x00ffcc);

      // Rivets
      rivet(g, 20, 42, armor); rivet(g, 72, 42, armor);
      rivet(g, 20, 52, armor); rivet(g, 72, 52, armor);
    });
  }

  // ── Rex: Brawler — wide, heavy, orange ────────────────────────────────────
  _makeRex() {
    this._makeMech('mech_rex', (g, S) => {
      const c     = 0xcc7700;
      const armor = 0x778088;
      const joint = 0x2e2e34;
      const white = 0xccd4dc;
      const d = 6;

      // Legs (thick)
      isoBox(g, 25, 62, 18, 22, d, joint);
      isoBox(g, 50, 62, 18, 22, d, joint);
      // White shin guards
      isoBox(g, 25, 70, 10, 13, 3, white);
      isoBox(g, 58, 70, 10, 13, 3, white);
      // Feet (wide)
      isoBox(g, 21, 82, 24, 8, d, armor);
      isoBox(g, 47, 82, 24, 8, d, armor);

      // Torso (massive)
      isoBox(g, 21, 32, 50, 32, d, c);
      // White shoulder-line accent
      g.fillStyle(white, 0.22);
      g.fillRect(23, 32, 46, 8);
      panelLine(g, 25, 44, 44, c);
      panelLine(g, 25, 52, 44, c);
      panelLine(g, 25, 60, 44, c);
      // Chest diamond emblem
      g.fillStyle(0xff2200, 0.9);
      g.fillPoints([
        { x: 46, y: 36 }, { x: 52, y: 42 }, { x: 46, y: 48 }, { x: 40, y: 42 },
      ], true);
      g.fillStyle(0xff7744, 0.8);
      g.fillPoints([
        { x: 46, y: 39 }, { x: 49, y: 42 }, { x: 46, y: 45 }, { x: 43, y: 42 },
      ], true);

      // Shoulder pads (huge, blocky) with white panels
      isoBox(g, 6, 30, 20, 20, d, armor);
      isoBox(g, 66, 30, 20, 20, d, armor);
      g.fillStyle(white, 0.2);
      g.fillRect(8, 31, 18, 6);
      g.fillRect(67, 31, 18, 6);
      rivet(g, 10, 36, armor); rivet(g, 22, 36, armor);
      rivet(g, 70, 36, armor); rivet(g, 82, 36, armor);
      rivet(g, 10, 46, armor); rivet(g, 22, 46, armor);
      rivet(g, 70, 46, armor); rivet(g, 82, 46, armor);

      // Fists
      isoBox(g, 8, 50, 13, 14, 4, joint);
      isoBox(g, 71, 50, 13, 14, 4, joint);
      glow(g, 10, 56, 8, 4, 0x44aaff);
      glow(g, 73, 56, 8, 4, 0x44aaff);

      // Head (squat, armoured) with white brow plate
      isoBox(g, 28, 16, 36, 18, d, armor);
      g.fillStyle(white, 0.28);
      g.fillRect(30, 17, 32, 5);
      // Visor (angry slit)
      glow(g, 32, 26, 28, 5, 0xff6600);

      // Missile pod on left shoulder
      g.fillStyle(0x222222);
      for (let i = 0; i < 3; i++) {
        g.fillRect(8, 32 + i * 5, 5, 3);
        g.fillStyle(0xff3300, 0.7);
        g.fillCircle(10, 33 + i * 5, 1.5);
        g.fillStyle(0x222222);
      }
    });
  }

  // ── Bolt: Sniper — tall, one big cannon arm, green ────────────────────────
  _makeBolt() {
    this._makeMech('mech_bolt', (g, S) => {
      const c     = 0x22aa44;
      const armor = 0x4a6055;
      const joint = 0x1e2e26;
      const white = 0xc8dcd2;
      const d = 5;

      // Legs (thin, precise)
      isoBox(g, 32, 66, 10, 22, d, joint);
      isoBox(g, 54, 66, 10, 22, d, joint);
      // Stabiliser feet with accent
      isoBox(g, 28, 86, 17, 6, d, armor);
      isoBox(g, 50, 86, 17, 6, d, armor);
      g.fillStyle(white, 0.4);
      g.fillRect(29, 86, 15, 3);
      g.fillRect(51, 86, 15, 3);

      // Torso (slim, tall)
      isoBox(g, 30, 34, 32, 34, d, c);
      g.fillStyle(white, 0.2);
      g.fillRect(32, 34, 28, 7);
      panelLine(g, 32, 46, 28, c);
      panelLine(g, 32, 56, 28, c);

      // LEFT: Big cannon housing + barrel
      isoBox(g, 6, 34, 24, 14, d, armor);
      g.fillStyle(white, 0.2);
      g.fillRect(8, 34, 22, 5);
      g.fillStyle(0x1a2a20);
      g.fillRect(0, 38, 28, 7);
      g.fillStyle(0x111a16);
      g.fillRect(0, 40, 7, 3);
      glow(g, 0, 40, 5, 3, 0x00ff66);
      // Heat vents on cannon
      g.fillStyle(white, 0.35);
      for (let i = 0; i < 4; i++) g.fillRect(12 + i * 4, 44, 2, 4);

      // RIGHT: Support arm
      isoBox(g, 62, 42, 12, 16, 4, joint);
      g.fillStyle(white, 0.18);
      g.fillRect(63, 43, 10, 4);

      // Shoulder pads
      isoBox(g, 8, 28, 22, 9, d, armor);
      g.fillStyle(white, 0.25);
      g.fillRect(10, 28, 20, 4);
      rivet(g, 13, 33, armor); rivet(g, 27, 33, armor);
      isoBox(g, 62, 36, 14, 8, d, armor);

      // Head (tall, precision)
      isoBox(g, 34, 14, 25, 22, d, c);
      g.fillStyle(white, 0.28);
      g.fillRect(36, 14, 22, 6);
      // Side scope housing
      isoBox(g, 57, 16, 17, 9, 3, armor);
      g.fillStyle(white, 0.2);
      g.fillRect(59, 16, 14, 4);
      glow(g, 60, 19, 12, 4, 0x00ffaa);
      // Main visor
      glow(g, 38, 25, 17, 6, 0x00ff66);

      // Chest scanner
      glow(g, 41, 40, 8, 5, 0x00ddaa);
    });
  }

  // ── Nova: Support — round, medical cross, gold ────────────────────────────
  _makeNova() {
    this._makeMech('mech_nova', (g, S) => {
      const c     = 0xccaa00;
      const armor = 0x7a7050;
      const joint = 0x3c3c2c;
      const white = 0xe8e0c8;
      const d = 5;

      // Legs (medium)
      isoBox(g, 30, 64, 12, 22, d, joint);
      isoBox(g, 52, 64, 12, 22, d, joint);
      // White knee caps
      isoBox(g, 30, 68, 12, 7, 3, white);
      isoBox(g, 52, 68, 12, 7, 3, white);
      // Rounded feet
      isoBox(g, 27, 84, 17, 8, d, armor);
      isoBox(g, 49, 84, 17, 8, d, armor);

      // Torso (wide, boxy)
      isoBox(g, 22, 34, 48, 32, d, c);
      // White top accent
      g.fillStyle(white, 0.22);
      g.fillRect(24, 34, 44, 7);
      // Medical cross (bright white with red fill)
      g.fillStyle(0xffffff, 0.95);
      g.fillRect(42, 39, 9, 24);
      g.fillRect(35, 46, 23, 9);
      g.fillStyle(0xdd1111, 0.8);
      g.fillRect(43, 40, 7, 22);
      g.fillRect(36, 47, 21, 7);
      g.fillStyle(0xff4444, 0.5);
      g.fillRect(44, 41, 5, 20);
      g.fillRect(37, 48, 19, 5);

      // Shoulder pads with white accent
      isoBox(g, 12, 36, 14, 16, d, armor);
      isoBox(g, 66, 36, 14, 16, d, armor);
      g.fillStyle(white, 0.28);
      g.fillRect(13, 37, 12, 5);
      g.fillRect(67, 37, 12, 5);

      // Arms (repair tools)
      isoBox(g, 14, 50, 11, 16, 3, joint);
      isoBox(g, 67, 50, 11, 16, 3, joint);
      glow(g, 16, 64, 7, 4, 0x44ffaa);
      glow(g, 69, 64, 7, 4, 0x44ffaa);

      // Head (round, friendly) with white brow
      isoBox(g, 30, 16, 32, 20, d, c);
      g.fillStyle(white, 0.3);
      g.fillRect(32, 16, 28, 6);
      // Eyes (dual blue sensors)
      glowCircle(g, 40, 27, 5, 0x44aaff);
      glowCircle(g, 54, 27, 5, 0x44aaff);
      // Chin vent
      g.fillStyle(armor, 1);
      g.fillRect(36, 34, 20, 3);

      // Antenna with glow
      g.fillStyle(armor);
      g.fillRect(44, 8, 2, 10);
      glowCircle(g, 45, 7, 3, 0x44ff88);
    });
  }

  // ── Vex: Assault — massive, shoulder rockets, red ─────────────────────────
  _makeVex() {
    this._makeMech('mech_vex', (g, S) => {
      const c     = 0xcc1122;
      const armor = 0x5c5460;
      const joint = 0x281820;
      const white = 0xd0c8d4;
      const d = 6;

      // Legs (very thick, imposing)
      isoBox(g, 22, 60, 20, 24, d, joint);
      isoBox(g, 52, 60, 20, 24, d, joint);
      // White knee guards
      isoBox(g, 22, 64, 12, 11, 3, white);
      isoBox(g, 60, 64, 12, 11, 3, white);
      // Heavy feet
      isoBox(g, 19, 82, 26, 8, d, armor);
      isoBox(g, 49, 82, 26, 8, d, armor);
      // Leg chevrons
      g.fillStyle(0xff8800, 0.6);
      g.fillRect(26, 74, 12, 2); g.fillRect(28, 77, 10, 2);
      g.fillRect(56, 74, 12, 2); g.fillRect(58, 77, 10, 2);

      // Torso (massive)
      isoBox(g, 19, 30, 56, 32, d, c);
      g.fillStyle(white, 0.18);
      g.fillRect(21, 30, 52, 8);
      panelLine(g, 23, 42, 48, c);
      panelLine(g, 23, 50, 48, c);
      panelLine(g, 23, 58, 48, c);
      rivet(g, 25, 36, c); rivet(g, 69, 36, c);
      rivet(g, 25, 48, c); rivet(g, 69, 48, c);

      // Shoulder ROCKET PODS with white face plates
      isoBox(g, 2, 22, 20, 24, d, armor);
      isoBox(g, 72, 22, 20, 24, d, armor);
      g.fillStyle(white, 0.2);
      g.fillRect(4, 22, 18, 6);
      g.fillRect(73, 22, 18, 6);
      // Rocket tubes
      g.fillStyle(0x1a1a1a);
      for (let i = 0; i < 3; i++) {
        g.fillRect(4, 29 + i * 6, 7, 4);
        g.fillRect(73, 29 + i * 6, 7, 4);
        g.fillStyle(0xff3300, 0.7);
        g.fillCircle(7, 31 + i * 6, 2);
        g.fillCircle(76, 31 + i * 6, 2);
        g.fillStyle(0x1a1a1a);
      }

      // Arms with gun barrels
      isoBox(g, 4, 44, 14, 18, 4, joint);
      isoBox(g, 76, 44, 14, 18, 4, joint);
      g.fillStyle(white, 0.15);
      g.fillRect(5, 45, 12, 4);
      g.fillRect(77, 45, 12, 4);
      glow(g, 6, 60, 9, 4, 0xff4400);
      glow(g, 79, 60, 9, 4, 0xff4400);

      // Head (command dome) with white brow strip
      isoBox(g, 26, 14, 42, 18, d, armor);
      g.fillStyle(white, 0.28);
      g.fillRect(28, 14, 38, 6);
      // Visor (wide angry slit)
      glow(g, 32, 24, 30, 5, 0xff8800);
      // Chin plate
      g.fillStyle(joint, 1);
      g.fillRect(30, 30, 34, 3);

      // Chest power core
      glow(g, 43, 44, 8, 8, 0xff2200);
    });
  }

  // ── Drone Alpha: fast insectoid, purple ───────────────────────────────────
  _makeDroneAlpha() {
    this._makeMech('mech_drone_alpha', (g, S) => {
      const c     = 0x8822aa;
      const armor = 0x4e3e60;
      const joint = 0x2a1c38;
      const d = 4;

      // Insect legs (3 pairs, angular)
      g.fillStyle(joint);
      g.fillRect(12, 54, 18, 3); g.fillRect(64, 54, 18, 3);
      g.fillRect(8, 65, 16, 3);  g.fillRect(70, 65, 16, 3);
      g.fillRect(14, 76, 14, 3); g.fillRect(66, 76, 14, 3);
      // Claw tips
      g.fillStyle(0xdd44ff, 0.65);
      g.fillCircle(10, 77, 3); g.fillCircle(82, 77, 3);
      g.fillCircle(7, 66, 2);  g.fillCircle(85, 66, 2);

      // Thorax
      isoBox(g, 25, 46, 42, 26, d, c);
      g.fillStyle(0xaa44cc, 0.3);
      g.fillRect(27, 47, 38, 8);
      panelLine(g, 27, 58, 38, c);
      panelLine(g, 27, 64, 38, c);
      // Thorax energy vents
      for (let i = 0; i < 3; i++) {
        glow(g, 34 + i * 10, 70, 4, 3, 0xcc00ff);
      }

      // Wings (layered, translucent)
      g.fillStyle(c, 0.22);
      g.fillRect(4, 34, 24, 22);
      g.fillRect(66, 34, 24, 22);
      g.fillStyle(0xdd66ff, 0.15);
      for (let i = 0; i < 3; i++) {
        g.fillRect(10 - i * 3, 36 + i * 5, 22, 5);
        g.fillRect(62 + i * 3, 36 + i * 5, 22, 5);
      }
      // Wing edge glow
      g.fillStyle(0xcc44ff, 0.4);
      g.fillRect(4, 34, 2, 22);
      g.fillRect(88, 34, 2, 22);

      // Head (alien, elongated)
      isoBox(g, 28, 22, 36, 26, d, c);
      g.fillStyle(0xaa22cc, 0.35);
      g.fillRect(30, 22, 32, 8);

      // Triple eye sensors
      glowCircle(g, 38, 32, 4, 0xff00ff);
      glowCircle(g, 46, 30, 5, 0xff44ff);
      glowCircle(g, 54, 32, 4, 0xff00ff);

      // Mandibles
      g.fillStyle(joint);
      g.fillRect(28, 44, 4, 6);
      g.fillRect(60, 44, 4, 6);
      g.fillStyle(0xcc44ff, 0.5);
      g.fillCircle(30, 50, 2);
      g.fillCircle(62, 50, 2);

      // Antennae
      g.fillStyle(joint);
      g.fillRect(34, 12, 2, 12);
      g.fillRect(56, 12, 2, 12);
      g.fillStyle(0xff44ff);
      g.fillCircle(35, 11, 3);
      g.fillCircle(57, 11, 3);
    });
  }

  // ── Drone Heavy: tank with treads, dark red ───────────────────────────────
  _makeDroneHeavy() {
    this._makeMech('mech_drone_heavy', (g, S) => {
      const c     = 0x991111;
      const armor = 0x5e5050;
      const joint = 0x282020;
      const white = 0xc8bcbc;
      const d = 6;

      // Tread base (wider)
      isoBox(g, 8, 70, 76, 18, d, joint);
      // Tread wheels (detailed)
      for (let i = 0; i < 8; i++) {
        g.fillStyle(0x484848);
        g.fillCircle(14 + i * 9, 79, 6);
        g.fillStyle(0x383838);
        g.fillCircle(14 + i * 9, 79, 4);
        g.fillStyle(0x555555);
        g.fillCircle(14 + i * 9, 79, 2);
      }
      // White tread stripe
      g.fillStyle(white, 0.15);
      g.fillRect(9, 70, 74, 4);

      // Heavy body with white upper accent
      isoBox(g, 12, 32, 68, 40, d, c);
      g.fillStyle(white, 0.18);
      g.fillRect(14, 32, 64, 9);
      panelLine(g, 16, 44, 60, c);
      panelLine(g, 16, 56, 60, c);
      panelLine(g, 16, 64, 60, c);
      rivet(g, 18, 38, c); rivet(g, 74, 38, c);
      rivet(g, 18, 52, c); rivet(g, 74, 52, c);
      rivet(g, 18, 64, c); rivet(g, 74, 64, c);

      // Side armour plates (white)
      isoBox(g, 14, 34, 9, 18, 3, white);
      isoBox(g, 69, 34, 9, 18, 3, white);

      // Turret with white brow
      isoBox(g, 22, 16, 48, 20, d, armor);
      g.fillStyle(white, 0.22);
      g.fillRect(24, 16, 44, 6);
      panelLine(g, 26, 28, 40, armor);

      // Twin cannons
      isoBox(g, 2, 28, 26, 7, 4, joint);
      isoBox(g, 2, 38, 26, 7, 4, joint);
      g.fillStyle(white, 0.15);
      g.fillRect(4, 28, 22, 3);
      g.fillRect(4, 38, 22, 3);
      // Muzzle housings
      g.fillStyle(0x111111);
      g.fillRect(0, 29, 6, 5);
      g.fillRect(0, 39, 6, 5);
      glow(g, 0, 30, 4, 3, 0xff4400);
      glow(g, 0, 40, 4, 3, 0xff4400);

      // Wide red optic bar
      glow(g, 28, 20, 36, 7, 0xff0000);
      // Optic centre highlight
      g.fillStyle(0xff8888, 0.4);
      g.fillRect(40, 21, 12, 5);

      // Command sensor dome (centre turret top)
      glowCircle(g, 46, 16, 5, 0xff2200);
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
