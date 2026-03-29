import {
  GRID_OFFSET_X, GRID_OFFSET_Y,
  HEX_SIZE, HEX_W, HEX_H, HEX_ROW_STEP,
  HIGHLIGHT_MOVE, HIGHLIGHT_ATTACK,
  TILE_COLORS, TILE_ACCENT_COLORS,
  hexNeighbors,
} from '../../config.js';
import { getReachableTiles, getAttackTiles } from './PathFinder.js';

// ── Hex polygon helpers ───────────────────────────────────────────────────────

/** Generate 6 vertex points for a pointy-top hex centred at (0, 0). */
function hexPoints(radius) {
  const pts = [];
  for (let i = 0; i < 6; i++) {
    const angle = -Math.PI / 2 + (Math.PI / 3) * i;
    pts.push({ x: radius * Math.cos(angle), y: radius * Math.sin(angle) });
  }
  return pts;
}

// Pre-computed vertex sets
const TILE_RADIUS   = HEX_SIZE - 1;   // slight inset so borders are visible
const HL_RADIUS     = HEX_SIZE - 3;   // highlight polygon fits inside tile border
const TILE_PTS      = hexPoints(TILE_RADIUS);
const HL_PTS        = hexPoints(HL_RADIUS);

/**
 * GridManager: owns the tile grid array, highlight objects, and all
 * hex grid-to-pixel / pixel-to-grid coordinate helpers.
 *
 * BattleScene instantiates one GridManager and delegates all
 * grid-related calls to it via thin wrappers.
 */
export default class GridManager {
  constructor(scene) {
    this.scene = scene;
    this.grid = [];
    this.highlightSprites = [];
    this._tileRows = 0;
    this._tileCols = 0;
  }

  /**
   * Build the grid from a 2-D tile-type array.
   * Draws all tiles onto a single Graphics object and returns the grid.
   */
  build(mapData) {
    this._tileRows = mapData.length;
    this._tileCols = mapData[0].length;

    // Single Graphics object for all hex tiles — fast and memory-efficient
    const gfx = this.scene.add.graphics().setDepth(0);

    for (let row = 0; row < mapData.length; row++) {
      this.grid[row] = [];
      for (let col = 0; col < mapData[row].length; col++) {
        const type = mapData[row][col];
        const x = this.tileX(col, row);
        const y = this.tileY(row);

        const fill   = TILE_COLORS[type]        ?? TILE_COLORS[0];
        const accent = TILE_ACCENT_COLORS[type] ?? TILE_ACCENT_COLORS[0];

        // ── Hex fill ──────────────────────────────────────────────────────────
        gfx.fillStyle(fill, 1);
        gfx.beginPath();
        TILE_PTS.forEach(({ x: px, y: py }, i) => {
          i === 0 ? gfx.moveTo(x + px, y + py) : gfx.lineTo(x + px, y + py);
        });
        gfx.closePath();
        gfx.fillPath();

        // ── Hex border ────────────────────────────────────────────────────────
        gfx.lineStyle(1, 0x000000, 0.45);
        gfx.beginPath();
        TILE_PTS.forEach(({ x: px, y: py }, i) => {
          i === 0 ? gfx.moveTo(x + px, y + py) : gfx.lineTo(x + px, y + py);
        });
        gfx.closePath();
        gfx.strokePath();

        // ── Top-edge accent (simulates light from above) ──────────────────────
        gfx.lineStyle(1.5, accent, 0.55);
        gfx.beginPath();
        // Points 0-2 form the upper three edges of a pointy-top hex
        for (let k = 0; k <= 2; k++) {
          const { x: px, y: py } = TILE_PTS[k];
          k === 0 ? gfx.moveTo(x + px, y + py) : gfx.lineTo(x + px, y + py);
        }
        gfx.strokePath();

        // ── Objective tile marker ─────────────────────────────────────────────
        if (type === 3) {
          gfx.fillStyle(0xffcc00, 0.55);
          gfx.fillCircle(x, y, 8);
          gfx.fillStyle(0xffffff, 0.35);
          gfx.fillCircle(x, y, 4);
        }

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

  // ── Coordinate helpers ─────────────────────────────────────────────────────

  /** Pixel X centre of hex at (col, row). Odd rows are offset right by HEX_W/2. */
  tileX(col, row = 0) {
    return GRID_OFFSET_X + col * HEX_W + HEX_W / 2
         + (row % 2 === 1 ? HEX_W / 2 : 0);
  }

  /** Pixel Y centre of hex at row. */
  tileY(row) {
    return GRID_OFFSET_Y + row * HEX_ROW_STEP + HEX_H / 2;
  }

  /** Find the grid cell whose centre is closest to pixel (px, py). */
  pixelToGrid(px, py) {
    let bestRow = 0, bestCol = 0, bestDist = Infinity;
    for (let r = 0; r < this._tileRows; r++) {
      for (let c = 0; c < this._tileCols; c++) {
        const cx = this.tileX(c, r);
        const cy = this.tileY(r);
        const dist = (px - cx) ** 2 + (py - cy) ** 2;
        if (dist < bestDist) {
          bestDist = dist;
          bestRow  = r;
          bestCol  = c;
        }
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
    for (let row = 0; row < this.grid.length; row++) {
      for (let col = 0; col < this.grid[0].length; col++) {
        this.grid[row][col].highlight = null;
      }
    }
    [...this.scene.playerMechs, ...this.scene.enemyMechs]
      .forEach(m => m.alive && m.setSelected && m.setSelected(false));
  }

  _addHexHighlight(tile, color, fillAlpha, strokeAlpha) {
    const hl = this.scene.add
      .polygon(tile.x, tile.y, HL_PTS, color, fillAlpha)
      .setStrokeStyle(2, color, strokeAlpha)
      .setDepth(5);
    this.highlightSprites.push(hl);
    return hl;
  }

  showMoveHighlights(mech) {
    if (mech.ap < 1) return;
    const allMechs = [...this.scene.playerMechs, ...this.scene.enemyMechs]
      .filter(m => m.alive && m !== mech);
    const tiles = getReachableTiles(this.grid, mech.row, mech.col, mech.speed, allMechs);

    tiles.forEach(({ row, col }) => {
      const tile = this.grid[row][col];
      if (!tile.walkable || tile.mech) return;
      this._addHexHighlight(tile, HIGHLIGHT_MOVE, 0.35, 0.9);
      tile.highlight = 'move';
    });

    mech.setSelected(true);

    // Faint attack-range preview over reachable enemy tiles
    const weapon = this.scene.getWeapon(mech, 0);
    if (weapon) {
      const attackTiles = getAttackTiles(this.grid, mech.row, mech.col, weapon.range);
      attackTiles.forEach(({ row, col }) => {
        const tile = this.grid[row][col];
        if (tile.mech && tile.mech.team === 'enemy' && tile.mech.alive) {
          this._addHexHighlight(tile, HIGHLIGHT_ATTACK, 0.18, 0.5);
        }
      });
    }
  }

  showAttackHighlights(mech, rangeOverride) {
    const weapon = this.scene.getWeapon(mech, 0);
    const range  = rangeOverride !== undefined ? rangeOverride : (weapon ? weapon.range : 3);
    const tiles  = getAttackTiles(this.grid, mech.row, mech.col, range, true);

    tiles.forEach(({ row, col }) => {
      const tile = this.grid[row][col];
      if (tile.mech && tile.mech.team === 'enemy' && tile.mech.alive) {
        this._addHexHighlight(tile, HIGHLIGHT_ATTACK, 0.4, 1.0);
        tile.highlight = 'attack';
      }
    });

    mech.setSelected(true);
  }

  // ── Adjacency helpers ──────────────────────────────────────────────────────

  getAdjacentMechs(row, col, team) {
    const result = [];
    for (const { row: nr, col: nc } of hexNeighbors(row, col)) {
      if (!this.isValidTile(nr, nc)) continue;
      const m = this.grid[nr][nc].mech;
      if (m && m.alive && (team === 'any' || m.team === team)) result.push(m);
    }
    return result;
  }
}
