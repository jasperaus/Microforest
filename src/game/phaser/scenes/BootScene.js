import { MECH_COLORS, TILE_COLORS, TILE_GRASS, TILE_WALL, TILE_WATER, TILE_OBJECTIVE } from '../../config.js';

/**
 * BootScene: generates all game textures procedurally (no external assets needed).
 */
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

  // ── Tile textures ─────────────────────────────────────────────────────────

  _generateTileTextures() {
    // Grass tile
    this._makeTile('tile_grass', (g) => {
      g.fillStyle(0x3a6b2a); g.fillRect(0, 0, 60, 60);
      g.fillStyle(0x4a8a36, 0.6);
      g.fillRect(8, 12, 6, 6); g.fillRect(25, 8, 4, 4);
      g.fillRect(40, 20, 5, 5); g.fillRect(15, 35, 4, 4);
      g.fillRect(48, 42, 5, 3); g.fillRect(30, 48, 6, 4);
    });

    // Wall tile
    this._makeTile('tile_wall', (g) => {
      g.fillStyle(0x555566); g.fillRect(0, 0, 60, 60);
      g.fillStyle(0x444455);
      // Brick pattern
      for (let row = 0; row < 4; row++) {
        const offset = row % 2 === 0 ? 0 : 15;
        for (let col = -1; col < 5; col++) {
          g.strokeRect(col * 20 + offset, row * 15, 18, 13);
        }
      }
      g.lineStyle(1, 0x333344, 0.8);
    });

    // Water tile
    this._makeTile('tile_water', (g) => {
      g.fillStyle(0x1a5a8a); g.fillRect(0, 0, 60, 60);
      g.fillStyle(0x226699, 0.7);
      g.fillRect(4, 10, 52, 3); g.fillRect(4, 24, 52, 3);
      g.fillRect(4, 38, 52, 3); g.fillRect(4, 52, 52, 3);
      g.fillStyle(0x44aadd, 0.3);
      g.fillRect(10, 14, 20, 2); g.fillRect(34, 28, 18, 2);
      g.fillRect(8, 42, 24, 2);
    });

    // Objective tile
    this._makeTile('tile_objective', (g) => {
      g.fillStyle(0x5a4010); g.fillRect(0, 0, 60, 60);
      g.fillStyle(0xffcc00, 0.8);
      // Star shape approximation
      const cx = 30, cy = 30, r1 = 14, r2 = 7;
      const pts = [];
      for (let i = 0; i < 10; i++) {
        const angle = (i * Math.PI / 5) - Math.PI / 2;
        const r = i % 2 === 0 ? r1 : r2;
        pts.push({ x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) });
      }
      g.fillPoints(pts, true);
    });
  }

  _makeTile(key, drawFn) {
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    drawFn(g);
    g.generateTexture(key, 60, 60);
    g.destroy();
  }

  // ── Mech textures ─────────────────────────────────────────────────────────

  _generateMechTextures() {
    this._makeZip();
    this._makeRex();
    this._makeBolt();
    this._makeNova();
    this._makeVex();
    this._makeDroneAlpha();
    this._makeDroneHeavy();
  }

  _makeMechTexture(key, drawFn) {
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    drawFn(g);
    g.generateTexture(key, 48, 48);
    g.destroy();
  }

  // Zip — slim cyan scout with antenna
  _makeZip() {
    this._makeMechTexture('mech_zip', (g) => {
      const c = 0x00eedd;
      const dark = 0x009988;
      // Legs
      g.fillStyle(dark);
      g.fillRect(13, 34, 7, 12); g.fillRect(28, 34, 7, 12);
      // Body
      g.fillStyle(c);
      g.fillRect(14, 18, 20, 18);
      // Shoulder pads (slim)
      g.fillRect(10, 20, 6, 10); g.fillRect(32, 20, 6, 10);
      // Arms
      g.fillStyle(dark);
      g.fillRect(10, 26, 5, 8); g.fillRect(33, 26, 5, 8);
      // Head
      g.fillStyle(c);
      g.fillRect(17, 10, 14, 10);
      // Visor
      g.fillStyle(0xffffff, 0.9);
      g.fillRect(19, 12, 10, 5);
      g.fillStyle(0x00ffcc);
      g.fillRect(20, 13, 8, 3);
      // Antenna
      g.fillStyle(c);
      g.fillRect(23, 4, 2, 8);
      g.fillStyle(0xffffff);
      g.fillCircle(24, 3, 2);
    });
  }

  // Rex — wide orange brawler
  _makeRex() {
    this._makeMechTexture('mech_rex', (g) => {
      const c = 0xff8c00;
      const dark = 0xcc6600;
      // Thick legs
      g.fillStyle(dark);
      g.fillRect(11, 33, 10, 13); g.fillRect(27, 33, 10, 13);
      // Big body
      g.fillStyle(c);
      g.fillRect(12, 16, 24, 19);
      // Wide shoulder pads
      g.fillStyle(0xff6600);
      g.fillRect(6, 16, 8, 14); g.fillRect(34, 16, 8, 14);
      // Armor plates on body
      g.fillStyle(dark);
      g.fillRect(16, 20, 16, 3);
      g.fillRect(16, 26, 16, 3);
      // Head — square
      g.fillStyle(c);
      g.fillRect(15, 8, 18, 10);
      // Visor — narrow
      g.fillStyle(0xff3300);
      g.fillRect(17, 11, 14, 4);
      // Fists
      g.fillStyle(dark);
      g.fillRect(5, 28, 7, 7); g.fillRect(36, 28, 7, 7);
    });
  }

  // Bolt — green sniper with long cannon arm
  _makeBolt() {
    this._makeMechTexture('mech_bolt', (g) => {
      const c = 0x00dd44;
      const dark = 0x009922;
      // Slim legs (bipod stance)
      g.fillStyle(dark);
      g.fillRect(14, 34, 6, 12); g.fillRect(30, 34, 6, 12);
      g.fillRect(10, 44, 10, 2); g.fillRect(28, 44, 10, 2); // feet
      // Slim body
      g.fillStyle(c);
      g.fillRect(17, 18, 14, 18);
      // One shoulder wider (cannon side)
      g.fillStyle(dark);
      g.fillRect(8, 18, 10, 8);
      // Long barrel
      g.fillStyle(0x224400);
      g.fillRect(2, 22, 20, 4);
      g.fillStyle(dark);
      g.fillRect(0, 21, 5, 6); // muzzle
      // Right arm
      g.fillStyle(dark);
      g.fillRect(31, 22, 8, 6);
      // Tall head with scope
      g.fillStyle(c);
      g.fillRect(18, 8, 12, 11);
      g.fillStyle(dark);
      g.fillRect(28, 10, 10, 4); // scope
      g.fillStyle(0x00ffaa);
      g.fillRect(29, 11, 8, 2);  // scope lens
      // Visor
      g.fillStyle(0x00ff66);
      g.fillRect(20, 11, 8, 4);
    });
  }

  // Nova — yellow support with cross symbol
  _makeNova() {
    this._makeMechTexture('mech_nova', (g) => {
      const c = 0xffd700;
      const dark = 0xcc9900;
      // Legs
      g.fillStyle(dark);
      g.fillRect(14, 34, 8, 12); g.fillRect(26, 34, 8, 12);
      // Round body
      g.fillStyle(c);
      g.fillCircle(24, 26, 14);
      g.fillRect(10, 20, 28, 14); // body base
      // Medical cross on chest
      g.fillStyle(0xffffff, 0.9);
      g.fillRect(21, 18, 6, 16);
      g.fillRect(16, 22, 16, 6);
      // Round arms
      g.fillStyle(dark);
      g.fillCircle(10, 26, 5); g.fillCircle(38, 26, 5);
      // Round head
      g.fillStyle(c);
      g.fillCircle(24, 12, 9);
      // Visor — wide friendly eyes
      g.fillStyle(0xffffff);
      g.fillCircle(20, 12, 3); g.fillCircle(28, 12, 3);
      g.fillStyle(0x00aaff);
      g.fillCircle(20, 12, 2); g.fillCircle(28, 12, 2);
    });
  }

  // Vex — red assault with shoulder rockets
  _makeVex() {
    this._makeMechTexture('mech_vex', (g) => {
      const c = 0xff2244;
      const dark = 0xcc0022;
      // Wide legs
      g.fillStyle(dark);
      g.fillRect(10, 33, 12, 13); g.fillRect(26, 33, 12, 13);
      // Massive body
      g.fillStyle(c);
      g.fillRect(10, 15, 28, 20);
      // Shoulder rocket pods
      g.fillStyle(0x880011);
      g.fillRect(5, 14, 8, 14);  // left pod
      g.fillRect(35, 14, 8, 14); // right pod
      // Rocket tubes
      g.fillStyle(0x444444);
      g.fillRect(6, 15, 6, 3); g.fillRect(6, 20, 6, 3); g.fillRect(6, 25, 6, 3);
      g.fillRect(36, 15, 6, 3); g.fillRect(36, 20, 6, 3); g.fillRect(36, 25, 6, 3);
      // Arms - big barrel guns
      g.fillStyle(dark);
      g.fillRect(6, 28, 6, 6); g.fillRect(36, 28, 6, 6);
      // Head — flat rectangular command dome
      g.fillStyle(c);
      g.fillRect(14, 7, 20, 10);
      // Visor — angry red slit
      g.fillStyle(0xff8800);
      g.fillRect(16, 10, 16, 3);
      // Armor ribs
      g.fillStyle(dark, 0.7);
      g.fillRect(14, 22, 20, 2);
      g.fillRect(14, 27, 20, 2);
    });
  }

  // Drone Alpha — purple fast insectoid
  _makeDroneAlpha() {
    this._makeMechTexture('mech_drone_alpha', (g) => {
      const c = 0x9922cc;
      const dark = 0x661199;
      // Insect legs (3 pairs)
      g.fillStyle(dark);
      g.fillRect(8, 28, 12, 3); g.fillRect(28, 28, 12, 3);   // upper legs
      g.fillRect(6, 36, 12, 3); g.fillRect(30, 36, 12, 3);   // lower legs
      g.fillRect(10, 42, 8, 3); g.fillRect(30, 42, 8, 3);    // feet
      // Thorax (main body)
      g.fillStyle(c);
      g.fillEllipse(24, 28, 22, 16);
      // Wings
      g.fillStyle(c, 0.5);
      g.fillEllipse(14, 20, 14, 8);  g.fillEllipse(34, 20, 14, 8);
      // Head
      g.fillStyle(c);
      g.fillEllipse(24, 14, 14, 12);
      // Glowing eye
      g.fillStyle(0xff00ff);
      g.fillCircle(24, 13, 4);
      g.fillStyle(0xffffff);
      g.fillCircle(23, 12, 2);
      // Antennae
      g.lineStyle(1, dark, 1);
      g.strokeRect(16, 6, 1, 8); g.strokeRect(31, 6, 1, 8);
    });
  }

  // Drone Heavy — dark red tank
  _makeDroneHeavy() {
    this._makeMechTexture('mech_drone_heavy', (g) => {
      const c = 0xaa0000;
      const dark = 0x660000;
      // Tread base
      g.fillStyle(0x333333);
      g.fillRect(6, 36, 36, 10);
      g.fillStyle(0x444444);
      for (let i = 0; i < 5; i++) {
        g.fillCircle(10 + i * 8, 41, 4);
      }
      // Heavy body
      g.fillStyle(c);
      g.fillRect(8, 16, 32, 22);
      // Turret top
      g.fillStyle(dark);
      g.fillRect(14, 10, 20, 10);
      // Twin cannons
      g.fillStyle(0x222222);
      g.fillRect(5, 18, 15, 5);  // left barrel
      g.fillRect(5, 25, 15, 5);  // right barrel
      g.fillStyle(0x111111);
      g.fillRect(2, 19, 6, 3); g.fillRect(2, 26, 6, 3); // muzzles
      // Armor rivets
      g.fillStyle(dark);
      g.fillRect(8, 16, 32, 3);
      g.fillRect(8, 32, 32, 3);
      // Red optics
      g.fillStyle(0xff0000);
      g.fillRect(18, 13, 12, 4);
      g.fillStyle(0xff8888);
      g.fillRect(20, 14, 8, 2);
    });
  }

  // ── Particle textures ─────────────────────────────────────────────────────

  _generateParticleTextures() {
    // Small white dot for particles
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0xffffff);
    g.fillCircle(4, 4, 4);
    g.generateTexture('particle', 8, 8);
    g.destroy();
  }
}
