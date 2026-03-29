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

  // ── Zip: Scout — slim, fast, twin antennas, cyan ─────────────────────────
  _makeZip() {
    this._makeMech('mech_zip', (g, S) => {
      const frame = 0x00aabb;  // cyan structural frame
      const white = 0xd0dce8;  // dominant white armor
      const dark  = 0x0a141c;  // dark joints/gaps
      const neon  = 0x00ffee;  // cyan neon glow
      const d = 7;

      // ── Legs ──
      // Thigh (frame color at joint)
      isoBox(g, 32, 62, 12, 14, d, frame);
      isoBox(g, 50, 62, 12, 14, d, frame);
      // White shin armor (dominant)
      isoBox(g, 30, 74, 14, 14, d, white);
      isoBox(g, 50, 74, 14, 14, d, white);
      panelLine(g, 31, 80, 12, white);
      // Ankle neon strip
      glow(g, 31, 86, 12, 2, neon);
      glow(g, 51, 86, 12, 2, neon);
      // Feet
      isoBox(g, 27, 88, 18, 5, d, frame);
      isoBox(g, 49, 88, 18, 5, d, frame);

      // ── Torso (slim) ──
      // Frame underlayer
      isoBox(g, 29, 38, 36, 26, d, frame);
      // White chest armor plate (dominant — covers 70% of torso)
      isoBox(g, 31, 40, 32, 22, 3, white);
      panelLine(g, 32, 50, 30, white);
      panelLine(g, 32, 57, 30, white);
      // Energy core center
      glow(g, 42, 45, 10, 6, neon);

      // ── Shoulder pads (white dominant) ──
      isoBox(g, 15, 36, 16, 14, d, white);
      isoBox(g, 63, 36, 16, 14, d, white);
      panelLine(g, 16, 42, 14, white);
      panelLine(g, 64, 42, 14, white);
      // Cyan shoulder stripe
      glow(g, 16, 37, 14, 3, neon);
      glow(g, 64, 37, 14, 3, neon);

      // ── Arms ──
      isoBox(g, 17, 48, 10, 16, 4, dark);
      isoBox(g, 67, 48, 10, 16, 4, dark);
      // White arm guard
      isoBox(g, 17, 50, 10, 8, 2, white);
      isoBox(g, 67, 50, 10, 8, 2, white);

      // ── Head ──
      // Dark crown
      isoBox(g, 35, 16, 24, 8, d, dark);
      // Wide white face plate (dominant)
      isoBox(g, 33, 22, 28, 18, d, white);
      panelLine(g, 35, 30, 24, white);
      // Twin circular cyan eyes
      glowCircle(g, 41, 28, 5, neon);
      glowCircle(g, 53, 28, 5, neon);
      // Chin detail
      g.fillStyle(frame, 1);
      g.fillRect(36, 38, 22, 3);

      // ── Twin antennas ──
      g.fillStyle(frame);
      g.fillRect(41, 6, 2, 12);
      g.fillRect(51, 4, 2, 14);
      glowCircle(g, 42, 5, 3, neon);
      glowCircle(g, 52, 3, 3, neon);

      // Rivets
      rivet(g, 17, 44, white); rivet(g, 71, 44, white);
      rivet(g, 17, 54, white); rivet(g, 71, 54, white);
    });
  }

  // ── Rex: Brawler — wide, heavy, orange ────────────────────────────────────
  _makeRex() {
    this._makeMech('mech_rex', (g, S) => {
      const frame = 0xbb6600;  // orange structural frame
      const white = 0xd8d0c4;  // warm cream dominant armor
      const dark  = 0x2a1e10;  // dark joints
      const neon  = 0xff9900;  // orange neon glow
      const d = 7;

      // ── Legs (thick brawler stance) ──
      // Thigh frame
      isoBox(g, 24, 60, 18, 14, d, frame);
      isoBox(g, 52, 60, 18, 14, d, frame);
      // Massive white shin guards
      isoBox(g, 22, 72, 20, 16, d, white);
      isoBox(g, 52, 72, 20, 16, d, white);
      panelLine(g, 23, 80, 18, white);
      // Orange shin stripe
      glow(g, 23, 85, 18, 2, neon);
      glow(g, 53, 85, 18, 2, neon);
      // Wide heavy feet
      isoBox(g, 18, 87, 28, 6, d, frame);
      isoBox(g, 52, 87, 28, 6, d, frame);

      // ── Torso (massive, white-armored) ──
      // Orange frame base
      isoBox(g, 20, 30, 54, 32, d, frame);
      // Big white front chest armor (dominant)
      isoBox(g, 22, 32, 50, 28, 4, white);
      panelLine(g, 24, 44, 46, white);
      panelLine(g, 24, 54, 46, white);
      // Chest emblem: orange diamond
      g.fillStyle(neon, 0.9);
      g.fillPoints([
        { x: 47, y: 36 }, { x: 55, y: 44 }, { x: 47, y: 52 }, { x: 39, y: 44 },
      ], true);
      g.fillStyle(0xffffff, 0.5);
      g.fillPoints([
        { x: 47, y: 39 }, { x: 51, y: 44 }, { x: 47, y: 49 }, { x: 43, y: 44 },
      ], true);

      // ── Shoulder pads (huge, white dominant) ──
      isoBox(g, 4, 28, 20, 20, d, white);
      isoBox(g, 70, 28, 20, 20, d, white);
      panelLine(g, 5, 36, 18, white);
      panelLine(g, 71, 36, 18, white);
      // Orange shoulder trim
      glow(g, 5, 29, 18, 3, neon);
      glow(g, 71, 29, 18, 3, neon);
      rivet(g, 7, 40, white);  rivet(g, 21, 40, white);
      rivet(g, 73, 40, white); rivet(g, 87, 40, white);
      // Missile pod on left shoulder
      for (let i = 0; i < 3; i++) {
        g.fillStyle(dark);
        g.fillRect(6, 30 + i * 5, 6, 3);
        g.fillStyle(0xff3300, 0.85);
        g.fillCircle(9, 31 + i * 5, 2);
      }

      // ── Fists (dark with orange vents) ──
      isoBox(g, 5, 46, 14, 16, 4, dark);
      isoBox(g, 75, 46, 14, 16, 4, dark);
      glow(g, 7, 58, 10, 4, neon);
      glow(g, 77, 58, 10, 4, neon);

      // ── Head (squat, armoured brawler) ──
      // Dark crown brow
      isoBox(g, 26, 13, 42, 9, d, dark);
      // Wide white face plate
      isoBox(g, 24, 20, 46, 14, d, white);
      panelLine(g, 26, 28, 42, white);
      // Twin large circular orange eyes
      glowCircle(g, 38, 26, 6, neon);
      glowCircle(g, 56, 26, 6, neon);
      // Chin vent plate
      g.fillStyle(frame, 1);
      g.fillRect(28, 32, 38, 3);
    });
  }

  // ── Bolt: Sniper — tall, precision, big cannon arm, green ───────────────
  _makeBolt() {
    this._makeMech('mech_bolt', (g, S) => {
      const frame = 0x228844;  // green structural frame
      const white = 0xc8dcd2;  // cool white armor
      const dark  = 0x0e1e14;  // dark joints
      const neon  = 0x00ff66;  // green neon
      const d = 7;

      // ── Legs (thin, precise) ──
      isoBox(g, 33, 64, 12, 14, d, frame);
      isoBox(g, 53, 64, 12, 14, d, frame);
      // White shin armor
      isoBox(g, 31, 76, 16, 12, d, white);
      isoBox(g, 51, 76, 16, 12, d, white);
      panelLine(g, 32, 82, 14, white);
      // Green ankle strip
      glow(g, 32, 86, 14, 2, neon);
      glow(g, 52, 86, 14, 2, neon);
      // Stabiliser feet
      isoBox(g, 27, 88, 20, 5, d, white);
      isoBox(g, 51, 88, 20, 5, d, white);

      // ── Torso (slim, tall) ──
      isoBox(g, 30, 32, 34, 34, d, frame);
      // White chest plate
      isoBox(g, 32, 34, 30, 30, 3, white);
      panelLine(g, 33, 46, 28, white);
      panelLine(g, 33, 58, 28, white);
      // Scanner core
      glow(g, 40, 40, 12, 8, neon);

      // ── LEFT: Big cannon arm (distinctive feature) ──
      // Cannon housing (white outer shell)
      isoBox(g, 4, 32, 26, 14, d, white);
      panelLine(g, 5, 38, 24, white);
      // Dark barrel
      g.fillStyle(dark);
      g.fillRect(0, 36, 30, 8);
      // Muzzle flash glow
      glow(g, 0, 38, 6, 4, neon);
      // White heat vents
      for (let i = 0; i < 5; i++) {
        isoBox(g, 6 + i * 4, 46, 2, 6, 1, white);
      }

      // ── RIGHT: Support arm ──
      isoBox(g, 64, 40, 12, 18, 4, dark);
      isoBox(g, 64, 40, 12, 8, 2, white);

      // ── Shoulder pads ──
      isoBox(g, 6, 26, 26, 10, d, white);
      panelLine(g, 7, 30, 24, white);
      rivet(g, 9, 34, white); rivet(g, 29, 34, white);
      isoBox(g, 62, 34, 16, 8, d, white);

      // ── Head (tall, precision optics) ──
      // Dark crown/scope housing
      isoBox(g, 36, 10, 26, 10, d, dark);
      // White face plate
      isoBox(g, 34, 18, 30, 18, d, white);
      panelLine(g, 36, 27, 26, white);
      // Side scope extension
      isoBox(g, 62, 14, 16, 8, 3, frame);
      glow(g, 63, 17, 13, 4, neon);
      // Twin precision eyes
      glowCircle(g, 43, 24, 5, neon);
      glowCircle(g, 55, 24, 5, neon);
    });
  }

  // ── Nova: Support — round, medical cross, gold ────────────────────────────
  _makeNova() {
    this._makeMech('mech_nova', (g, S) => {
      const frame = 0xccaa00;  // gold structural frame
      const white = 0xe8e0c8;  // warm cream dominant armor
      const dark  = 0x2c2c18;  // dark joints
      const neon  = 0xffee44;  // gold neon glow
      const d = 7;

      // ── Legs (medium support stance) ──
      isoBox(g, 31, 62, 14, 14, d, frame);
      isoBox(g, 51, 62, 14, 14, d, frame);
      // White knee guards
      isoBox(g, 29, 74, 18, 12, d, white);
      isoBox(g, 51, 74, 18, 12, d, white);
      panelLine(g, 30, 80, 16, white);
      // Gold ankle glow
      glow(g, 30, 84, 16, 2, neon);
      glow(g, 52, 84, 16, 2, neon);
      // Rounded feet
      isoBox(g, 27, 86, 20, 6, d, white);
      isoBox(g, 51, 86, 20, 6, d, white);

      // ── Torso (wide support frame) ──
      isoBox(g, 20, 32, 54, 32, d, frame);
      // White dominant front armor
      isoBox(g, 22, 34, 50, 28, 4, white);
      panelLine(g, 24, 46, 46, white);
      panelLine(g, 24, 56, 46, white);
      // Medical cross (bright red on white)
      g.fillStyle(0xffffff, 1);
      g.fillRect(42, 37, 11, 26);
      g.fillRect(35, 44, 25, 11);
      g.fillStyle(0xdd1111, 0.9);
      g.fillRect(43, 38, 9, 24);
      g.fillRect(36, 45, 23, 9);
      g.fillStyle(0xff5555, 0.6);
      g.fillRect(45, 40, 5, 20);
      g.fillRect(38, 47, 19, 5);

      // ── Shoulder pads (white dominant) ──
      isoBox(g, 10, 34, 16, 16, d, white);
      isoBox(g, 68, 34, 16, 16, d, white);
      panelLine(g, 11, 42, 14, white);
      panelLine(g, 69, 42, 14, white);
      glow(g, 11, 35, 14, 3, neon);
      glow(g, 69, 35, 14, 3, neon);

      // ── Arms (repair tools with healing vents) ──
      isoBox(g, 12, 48, 12, 18, 3, dark);
      isoBox(g, 70, 48, 12, 18, 3, dark);
      isoBox(g, 12, 50, 12, 8, 2, white);
      isoBox(g, 70, 50, 12, 8, 2, white);
      glow(g, 14, 64, 8, 4, 0x44ffaa);
      glow(g, 72, 64, 8, 4, 0x44ffaa);

      // ── Head (round, friendly medic) ──
      // Gold crown
      isoBox(g, 32, 12, 30, 8, d, frame);
      // Wide white face plate
      isoBox(g, 30, 18, 34, 18, d, white);
      panelLine(g, 32, 28, 30, white);
      // Twin warm gold circular eyes
      glowCircle(g, 40, 26, 6, neon);
      glowCircle(g, 55, 26, 6, neon);
      // Chin vent
      g.fillStyle(frame, 1);
      g.fillRect(34, 34, 26, 3);
      // Antenna
      g.fillStyle(frame);
      g.fillRect(45, 5, 2, 10);
      glowCircle(g, 46, 4, 3, neon);
    });
  }

  // ── Vex: Assault — massive, shoulder rockets, red ─────────────────────────
  _makeVex() {
    this._makeMech('mech_vex', (g, S) => {
      const frame = 0xcc1122;  // red structural frame
      const white = 0xd0c8d4;  // cool white dominant armor
      const dark  = 0x1e0e10;  // dark joints
      const neon  = 0xff3300;  // orange-red neon
      const d = 7;

      // ── Legs (massive assault stance) ──
      isoBox(g, 21, 58, 22, 14, d, frame);
      isoBox(g, 53, 58, 22, 14, d, frame);
      // Big white knee armor
      isoBox(g, 19, 70, 26, 16, d, white);
      isoBox(g, 53, 70, 26, 16, d, white);
      panelLine(g, 20, 78, 24, white);
      // Red chevron stripes
      g.fillStyle(neon, 0.75);
      g.fillRect(22, 82, 18, 2); g.fillRect(25, 85, 14, 2);
      g.fillRect(55, 82, 18, 2); g.fillRect(57, 85, 14, 2);
      // Heavy feet
      isoBox(g, 16, 86, 30, 7, d, frame);
      isoBox(g, 52, 86, 30, 7, d, frame);

      // ── Torso (massive, white armor) ──
      isoBox(g, 17, 28, 60, 32, d, frame);
      // Large white front chest armor
      isoBox(g, 19, 30, 56, 28, 4, white);
      panelLine(g, 21, 42, 52, white);
      panelLine(g, 21, 52, 52, white);
      rivet(g, 22, 36, white); rivet(g, 71, 36, white);
      rivet(g, 22, 58, white); rivet(g, 71, 58, white);
      // Central power core (red glow)
      glow(g, 41, 38, 12, 10, neon);

      // ── Shoulder ROCKET PODS (white face plates) ──
      isoBox(g, 0, 20, 20, 24, d, white);
      isoBox(g, 74, 20, 20, 24, d, white);
      panelLine(g, 1, 28, 18, white);
      panelLine(g, 75, 28, 18, white);
      // Rocket tubes (dark openings with red tips)
      for (let i = 0; i < 3; i++) {
        g.fillStyle(dark);
        g.fillRect(2, 22 + i * 6, 7, 4);
        g.fillRect(76, 22 + i * 6, 7, 4);
        g.fillStyle(0xff3300, 0.9);
        g.fillCircle(5, 24 + i * 6, 2.5);
        g.fillCircle(79, 24 + i * 6, 2.5);
      }

      // ── Arms with gun barrels ──
      isoBox(g, 2, 42, 16, 20, 4, dark);
      isoBox(g, 78, 42, 16, 20, 4, dark);
      isoBox(g, 2, 42, 16, 9, 2, white);
      isoBox(g, 78, 42, 16, 9, 2, white);
      glow(g, 4, 58, 11, 4, neon);
      glow(g, 80, 58, 11, 4, neon);

      // ── Head (command dome, imposing) ──
      // Dark crown
      isoBox(g, 24, 10, 46, 10, d, dark);
      // Wide white face plate
      isoBox(g, 22, 18, 50, 14, d, white);
      panelLine(g, 24, 26, 46, white);
      // Twin large fierce red eyes
      glowCircle(g, 37, 24, 7, neon);
      glowCircle(g, 58, 24, 7, neon);
      // Chin plate
      g.fillStyle(frame, 1);
      g.fillRect(26, 30, 42, 3);
    });
  }

  // ── Drone Alpha: fast insectoid scout, dark purple (enemy) ──────────────
  _makeDroneAlpha() {
    this._makeMech('mech_drone_alpha', (g, S) => {
      const frame = 0x6611aa;  // purple structural
      const armor = 0x3a2a44;  // dark charcoal-purple armor (enemy - dark)
      const joint = 0x1e0e2a;  // very dark joints
      const neon  = 0xcc44ff;  // bright purple neon
      const d = 5;

      // ── Insect legs (3 pairs, angular, menacing) ──
      g.fillStyle(joint);
      // Upper legs (angled out)
      g.fillRect(18, 52, 16, 4); g.fillRect(60, 52, 16, 4);
      g.fillRect(12, 64, 14, 4); g.fillRect(68, 64, 14, 4);
      g.fillRect(16, 76, 12, 4); g.fillRect(66, 76, 12, 4);
      // Leg segment markers (dark armor)
      g.fillStyle(armor);
      g.fillRect(20, 51, 10, 6); g.fillRect(64, 51, 10, 6);
      // Glowing claw tips
      glowCircle(g, 14, 78, 4, neon);
      glowCircle(g, 80, 78, 4, neon);
      glowCircle(g, 10, 66, 3, neon);
      glowCircle(g, 84, 66, 3, neon);

      // ── Thorax (dark with neon vents) ──
      isoBox(g, 24, 44, 44, 26, d, armor);
      // Purple top accent
      g.fillStyle(frame, 0.4);
      g.fillRect(26, 44, 40, 8);
      panelLine(g, 26, 56, 40, armor);
      panelLine(g, 26, 64, 40, armor);
      // Energy vents (bright neon)
      for (let i = 0; i < 4; i++) {
        glow(g, 30 + i * 9, 68, 5, 3, neon);
      }

      // ── Wings (angular, translucent) ──
      g.fillStyle(frame, 0.18);
      g.fillRect(2, 30, 22, 24);
      g.fillRect(70, 30, 22, 24);
      g.fillStyle(neon, 0.12);
      for (let i = 0; i < 3; i++) {
        g.fillRect(4 - i * 2, 32 + i * 6, 20, 4);
        g.fillRect(70 + i * 2, 32 + i * 6, 20, 4);
      }
      // Wing edge glow
      g.fillStyle(neon, 0.45);
      g.fillRect(2, 30, 2, 24);
      g.fillRect(90, 30, 2, 24);

      // ── Head (alien elongated) ──
      isoBox(g, 26, 18, 40, 28, d, armor);
      g.fillStyle(frame, 0.3);
      g.fillRect(28, 18, 36, 9);
      // Triple glowing eyes (signature feature)
      glowCircle(g, 37, 30, 5, neon);
      glowCircle(g, 46, 28, 6, 0xff00ff);  // center eye larger
      glowCircle(g, 55, 30, 5, neon);

      // ── Mandibles ──
      g.fillStyle(joint);
      g.fillRect(26, 43, 5, 8);
      g.fillRect(61, 43, 5, 8);
      glow(g, 26, 50, 4, 3, neon);
      glow(g, 62, 50, 4, 3, neon);

      // ── Antennae ──
      g.fillStyle(joint);
      g.fillRect(35, 8, 2, 12);
      g.fillRect(57, 6, 2, 14);
      glowCircle(g, 36, 7, 4, neon);
      glowCircle(g, 58, 5, 4, neon);
    });
  }

  // ── Drone Heavy: armored tank, twin cannons, dark red (enemy) ────────────
  _makeDroneHeavy() {
    this._makeMech('mech_drone_heavy', (g, S) => {
      const frame = 0xaa1100;  // dark red structural
      const armor = 0x3a3030;  // dark charcoal armor (enemy - dark)
      const joint = 0x1e1414;  // very dark
      const neon  = 0xff2200;  // red neon glow
      const d = 7;

      // ── Tread base (wide tank platform) ──
      isoBox(g, 6, 70, 80, 18, d, joint);
      // Tread track details
      g.fillStyle(0x2a2a2a);
      g.fillRect(7, 71, 78, 16);
      // Tread wheel segments
      for (let i = 0; i < 9; i++) {
        g.fillStyle(0x444444);
        g.fillCircle(11 + i * 9, 79, 5);
        g.fillStyle(0x333333);
        g.fillCircle(11 + i * 9, 79, 3);
        g.fillStyle(0x555555);
        g.fillCircle(11 + i * 9, 79, 1.5);
      }
      // Tread ground contact strip
      g.fillStyle(0x1a1a1a);
      g.fillRect(6, 85, 80, 4);

      // ── Heavy body (dark with neon accents) ──
      isoBox(g, 10, 28, 72, 44, d, armor);
      // Panel lines
      panelLine(g, 12, 40, 68, armor);
      panelLine(g, 12, 52, 68, armor);
      panelLine(g, 12, 63, 68, armor);
      rivet(g, 14, 34, armor); rivet(g, 76, 34, armor);
      rivet(g, 14, 46, armor); rivet(g, 76, 46, armor);
      rivet(g, 14, 58, armor); rivet(g, 76, 58, armor);
      // Red neon energy vents on body
      for (let i = 0; i < 5; i++) {
        glow(g, 20 + i * 12, 65, 6, 3, neon);
      }

      // ── Side armor plates (slightly lighter) ──
      isoBox(g, 12, 30, 10, 20, 3, frame);
      isoBox(g, 70, 30, 10, 20, 3, frame);

      // ── Turret (dark menacing) ──
      isoBox(g, 18, 10, 56, 22, d, armor);
      panelLine(g, 20, 20, 52, armor);
      panelLine(g, 20, 26, 52, armor);

      // ── Twin cannons (long, threatening) ──
      isoBox(g, 0, 16, 22, 8, 4, joint);
      isoBox(g, 0, 26, 22, 8, 4, joint);
      // Cannon barrel detail
      g.fillStyle(0x111111);
      g.fillRect(0, 17, 24, 6);
      g.fillRect(0, 27, 24, 6);
      // Muzzle glow
      glow(g, 0, 18, 5, 4, neon);
      glow(g, 0, 28, 5, 4, neon);
      // White barrel strips
      g.fillStyle(0x888888, 0.25);
      for (let i = 0; i < 5; i++) {
        g.fillRect(4 + i * 4, 17, 2, 6);
        g.fillRect(4 + i * 4, 27, 2, 6);
      }

      // ── Wide optic sensor bar (signature red eye) ──
      glow(g, 24, 13, 44, 8, neon);
      // Multi-sensor dots
      for (let i = 0; i < 5; i++) {
        glowCircle(g, 28 + i * 9, 17, 3, 0xff6644);
      }
      // Central dominant sensor
      glowCircle(g, 46, 15, 6, 0xff0000);
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
