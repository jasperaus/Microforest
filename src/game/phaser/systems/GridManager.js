import {
  GRID_OFFSET_X, GRID_OFFSET_Y,
  HEX_SIZE, HEX_W, HEX_H, HEX_ROW_STEP,
  HIGHLIGHT_MOVE, HIGHLIGHT_ATTACK,
  TILE_COLORS, TILE_ACCENT_COLORS,
  hexNeighbors,
} from '../../config.js';
import { getReachableTiles, getAttackTiles } from './PathFinder.js';

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Darken a packed hex colour by factor (0 = black, 1 = original). */
function darken(color, factor) {
  const r = Math.round(((color >> 16) & 0xff) * factor);
  const g = Math.round(((color >> 8)  & 0xff) * factor);
  const b = Math.round(( color        & 0xff) * factor);
  return (r << 16) | (g << 8) | b;
}

/** Lighten a packed hex colour toward white by factor (0 = original, 1 = white). */
function lighten(color, factor) {
  const r = Math.round(((color >> 16) & 0xff) + (255 - ((color >> 16) & 0xff)) * factor);
  const g = Math.round(((color >> 8)  & 0xff) + (255 - ((color >> 8)  & 0xff)) * factor);
  const b = Math.round(( color        & 0xff) + (255 - ( color        & 0xff)) * factor);
  return (r << 16) | (g << 8) | b;
}

// ── Hex polygon helpers ───────────────────────────────────────────────────────

/** Six vertices of a pointy-top hex centred at (0, 0), circumradius r. */
function hexVerts(r) {
  const v = [];
  for (let i = 0; i < 6; i++) {
    const a = -Math.PI / 2 + (Math.PI / 3) * i;
    v.push({ x: r * Math.cos(a), y: r * Math.sin(a) });
  }
  return v;
}

// Pre-computed vertex sets (relative to hex centre)
const TV = hexVerts(HEX_SIZE - 1);   // tile fill vertices (slight inset)
const HL = hexVerts(HEX_SIZE - 3);   // highlight polygon

// Isometric wall depth per tile type (pixels below the bottom hex edge)
const WALL_H = { 0: 10, 1: 32, 2: 3, 3: 16 };
// 0=GRASS, 1=WALL, 2=WATER, 3=OBJECTIVE

// Short-hand: half-width and inner radius of hex
const HW = HEX_W / 2;   // ≈ 38.1 — distance from centre to flat side
const HR = HEX_SIZE;     // 44   — distance from centre to pointy vertex

/**
 * GridManager: owns the tile grid, highlight objects, and all
 * hex grid-to-pixel / pixel-to-grid coordinate helpers.
 *
 * Renders terrain as isometric prisms — each hex tile appears as a
 * coloured block rising from a shared ground plane.  Wall tiles stand
 * tall; grass is a shallow slab; water sits at ground level; objectives
 * are raised platforms.
 */
export default class GridManager {
  constructor(scene) {
    this.scene = scene;
    this.grid = [];
    this.highlightSprites = [];
    this._tileRows = 0;
    this._tileCols = 0;
  }

  // ── Build ──────────────────────────────────────────────────────────────────

  build(mapData) {
    this._tileRows = mapData.length;
    this._tileCols = mapData[0].length;

    // Two separate Graphics objects so walls always draw behind top faces
    // (even across rows) without sorting overhead.
    const wallGfx = this.scene.add.graphics().setDepth(0);
    const topGfx  = this.scene.add.graphics().setDepth(1);

    for (let row = 0; row < mapData.length; row++) {
      this.grid[row] = [];
      for (let col = 0; col < mapData[row].length; col++) {
        const type = mapData[row][col];
        const x    = this.tileX(col, row);
        const y    = this.tileY(row);

        // ── Isometric walls ──────────────────────────────────────────────────
        this._drawWalls(wallGfx, x, y, type);

        // ── Top hex face ─────────────────────────────────────────────────────
        this._drawTop(topGfx, x, y, type);

        this.grid[row][col] = {
          row, col, type, x, y,
          walkable: type === 0 || type === 3,
          mech:      null,
          highlight: null,
        };
      }
    }

    return this.grid;
  }

  /** Draw the two visible isometric wall faces below hex (cx, cy). */
  _drawWalls(g, cx, cy, type) {
    const wallH = WALL_H[type] ?? 10;
    if (wallH <= 0) return;

    const fill  = TILE_COLORS[type]        ?? TILE_COLORS[0];
    const left  = darken(fill, 0.52);   // left-front wall (V3→V4)
    const right = darken(fill, 0.70);   // right-front wall (V2→V3)

    // V2 = lower-right vertex, V3 = bottom vertex, V4 = lower-left vertex
    // (cx, cy are hex centres; HR=44, HW≈38.1)
    const v2x = cx + HW, v2y = cy + HR / 2;   // lower-right
    const v3x = cx,      v3y = cy + HR;        // bottom
    const v4x = cx - HW, v4y = cy + HR / 2;   // lower-left

    // Right-front wall: V2 → V3 face
    g.fillStyle(right, 1);
    g.fillPoints([
      { x: v2x, y: v2y },
      { x: v3x, y: v3y },
      { x: v3x, y: v3y + wallH },
      { x: v2x, y: v2y + wallH },
    ], true);

    // Left-front wall: V3 → V4 face
    g.fillStyle(left, 1);
    g.fillPoints([
      { x: v3x, y: v3y },
      { x: v4x, y: v4y },
      { x: v4x, y: v4y + wallH },
      { x: v3x, y: v3y + wallH },
    ], true);

    // Bottom edge line (depth seam)
    g.lineStyle(1, darken(fill, 0.35), 0.8);
    g.beginPath();
    g.moveTo(v4x, v4y + wallH);
    g.lineTo(v3x, v3y + wallH);
    g.lineTo(v2x, v2y + wallH);
    g.strokePath();

    // Wall-specific surface detail
    if (type === 1) {
      // Armour plating lines on wall faces
      g.lineStyle(1, darken(fill, 0.4), 0.6);
      for (let i = 8; i < wallH; i += 10) {
        g.beginPath();
        g.moveTo(v4x, v4y + i);
        g.lineTo(v3x, v3y + i);
        g.strokePath();
        g.beginPath();
        g.moveTo(v3x, v3y + i);
        g.lineTo(v2x, v2y + i);
        g.strokePath();
      }
    }
  }

  /** Draw the top hex face at (cx, cy) with type-specific surface detail. */
  _drawTop(g, cx, cy, type) {
    const fill   = TILE_COLORS[type]        ?? TILE_COLORS[0];
    const accent = TILE_ACCENT_COLORS[type] ?? TILE_ACCENT_COLORS[0];

    // Main hex fill
    g.fillStyle(fill, 1);
    g.beginPath();
    TV.forEach(({ x: px, y: py }, i) => {
      i === 0 ? g.moveTo(cx + px, cy + py) : g.lineTo(cx + px, cy + py);
    });
    g.closePath();
    g.fillPath();

    // Hex border
    g.lineStyle(1, darken(fill, 0.45), 0.7);
    g.beginPath();
    TV.forEach(({ x: px, y: py }, i) => {
      i === 0 ? g.moveTo(cx + px, cy + py) : g.lineTo(cx + px, cy + py);
    });
    g.closePath();
    g.strokePath();

    // Top-edge highlight (simulates overhead light)
    g.lineStyle(1.5, lighten(fill, 0.35), 0.65);
    g.beginPath();
    for (let k = 0; k <= 2; k++) {
      const { x: px, y: py } = TV[k];
      k === 0 ? g.moveTo(cx + px, cy + py) : g.lineTo(cx + px, cy + py);
    }
    g.strokePath();

    // Type-specific surface detail
    switch (type) {
      case 0: // GRASS — subtle texture marks
        g.fillStyle(lighten(fill, 0.15), 0.35);
        g.fillCircle(cx - 10, cy - 6, 5);
        g.fillCircle(cx + 12, cy + 4, 4);
        g.fillCircle(cx - 4,  cy + 12, 3);
        break;

      case 1: // WALL — reinforced metal plate
        g.lineStyle(1, darken(fill, 0.5), 0.7);
        g.beginPath();
        g.moveTo(cx - HW * 0.6, cy - 4);
        g.lineTo(cx + HW * 0.6, cy - 4);
        g.strokePath();
        g.lineStyle(1, accent, 0.45);
        // Corner rivets
        [TV[0], TV[1], TV[4], TV[5]].forEach(({ x: px, y: py }) => {
          g.fillStyle(accent, 0.7);
          g.fillCircle(cx + px * 0.6, cy + py * 0.6, 2);
        });
        break;

      case 2: // WATER — shimmer
        g.fillStyle(lighten(fill, 0.3), 0.25);
        g.fillRect(cx - 22, cy - 4, 20, 3);
        g.fillRect(cx + 4,  cy + 6, 16, 2);
        g.fillRect(cx - 12, cy + 14, 22, 2);
        g.fillStyle(0x88ccee, 0.12);
        TV.forEach(({ x: px, y: py }, i) => {
          if (i === 0) g.moveTo(cx + px, cy + py); else g.lineTo(cx + px, cy + py);
        });
        break;

      case 3: // OBJECTIVE — glowing command platform
        // Outer amber ring
        g.lineStyle(2, 0xffcc00, 0.8);
        g.strokeCircle(cx, cy, HEX_SIZE * 0.55);
        // Inner gold fill
        g.fillStyle(0xffdd33, 0.4);
        g.fillCircle(cx, cy, HEX_SIZE * 0.35);
        // Core glow
        g.fillStyle(0xffffff, 0.6);
        g.fillCircle(cx, cy, HEX_SIZE * 0.15);
        // Cardinal tick marks
        g.lineStyle(1.5, 0xffcc00, 0.9);
        [0, 1, 2, 3, 4, 5].forEach(i => {
          const a = -Math.PI / 2 + (Math.PI / 3) * i;
          const r1 = HEX_SIZE * 0.42, r2 = HEX_SIZE * 0.58;
          g.beginPath();
          g.moveTo(cx + r1 * Math.cos(a), cy + r1 * Math.sin(a));
          g.lineTo(cx + r2 * Math.cos(a), cy + r2 * Math.sin(a));
          g.strokePath();
        });
        break;
    }
  }

  // ── Coordinate helpers ─────────────────────────────────────────────────────

  /** Pixel X of hex centre at (col, row). Odd rows offset right by HEX_W/2. */
  tileX(col, row = 0) {
    return GRID_OFFSET_X + col * HEX_W + HEX_W / 2
         + (row % 2 === 1 ? HEX_W / 2 : 0);
  }

  /** Pixel Y of hex centre at row. */
  tileY(row) {
    return GRID_OFFSET_Y + row * HEX_ROW_STEP + HEX_H / 2;
  }

  /** Return the grid cell whose centre is nearest pixel (px, py). */
  pixelToGrid(px, py) {
    let bestRow = 0, bestCol = 0, bestDist = Infinity;
    for (let r = 0; r < this._tileRows; r++) {
      for (let c = 0; c < this._tileCols; c++) {
        const dist = (px - this.tileX(c, r)) ** 2 + (py - this.tileY(r)) ** 2;
        if (dist < bestDist) { bestDist = dist; bestRow = r; bestCol = c; }
      }
    }
    return { row: bestRow, col: bestCol };
  }

  isValidTile(row, col) {
    if (!this.grid.length || !this.grid[0]) return false;
    return row >= 0 && row < this.grid.length &&
           col >= 0 && col < this.grid[0].length;
  }

  isValidAndEmpty(row, col) {
    if (!this.isValidTile(row, col)) return false;
    const tile = this.grid[row][col];
    return tile.walkable && tile.mech === null;
  }

  // ── Highlight management ───────────────────────────────────────────────────

  clearHighlights() {
    this.highlightSprites.forEach(s => s.destroy());
    this.highlightSprites = [];
    for (let r = 0; r < this.grid.length; r++)
      for (let c = 0; c < this.grid[0].length; c++)
        this.grid[r][c].highlight = null;
    [...this.scene.playerMechs, ...this.scene.enemyMechs]
      .forEach(m => m.alive && m.setSelected && m.setSelected(false));
  }

  _addHexHL(tile, color, fillAlpha, strokeAlpha) {
    const hl = this.scene.add
      .polygon(tile.x, tile.y, HL, color, fillAlpha)
      .setStrokeStyle(2, color, strokeAlpha)
      .setDepth(6);
    this.highlightSprites.push(hl);
  }

  showMoveHighlights(mech) {
    if (mech.ap < 1) return;
    const others = [...this.scene.playerMechs, ...this.scene.enemyMechs]
      .filter(m => m.alive && m !== mech);
    const tiles = getReachableTiles(this.grid, mech.row, mech.col, mech.speed, others);
    tiles.forEach(({ row, col }) => {
      const tile = this.grid[row][col];
      if (!tile.walkable || tile.mech) return;
      this._addHexHL(tile, HIGHLIGHT_MOVE, 0.3, 0.9);
      tile.highlight = 'move';
    });
    mech.setSelected(true);

    const weapon = this.scene.getWeapon(mech, 0);
    if (weapon) {
      getAttackTiles(this.grid, mech.row, mech.col, weapon.range).forEach(({ row, col }) => {
        const tile = this.grid[row][col];
        if (tile.mech?.team === 'enemy' && tile.mech.alive)
          this._addHexHL(tile, HIGHLIGHT_ATTACK, 0.15, 0.45);
      });
    }
  }

  showAttackHighlights(mech, rangeOverride) {
    const weapon = this.scene.getWeapon(mech, 0);
    const range  = rangeOverride ?? (weapon?.range ?? 3);
    getAttackTiles(this.grid, mech.row, mech.col, range, true).forEach(({ row, col }) => {
      const tile = this.grid[row][col];
      if (tile.mech?.team === 'enemy' && tile.mech.alive) {
        this._addHexHL(tile, HIGHLIGHT_ATTACK, 0.38, 1.0);
        tile.highlight = 'attack';
      }
    });
    mech.setSelected(true);
  }

  // ── Adjacency ──────────────────────────────────────────────────────────────

  getAdjacentMechs(row, col, team) {
    const result = [];
    for (const { row: nr, col: nc } of hexNeighbors(row, col)) {
      if (!this.isValidTile(nr, nc)) continue;
      const m = this.grid[nr][nc].mech;
      if (m?.alive && (team === 'any' || m.team === team)) result.push(m);
    }
    return result;
  }
}
