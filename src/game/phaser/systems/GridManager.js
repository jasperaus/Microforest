import {
  TILE_SIZE, GRID_OFFSET_X, GRID_OFFSET_Y,
  HIGHLIGHT_MOVE, HIGHLIGHT_ATTACK,
} from '../../config.js';
import { getReachableTiles, getAttackTiles } from './PathFinder.js';

/**
 * GridManager: owns the tile grid array, highlight sprites, and all
 * grid-to-pixel / pixel-to-grid coordinate helpers.
 *
 * BattleScene instantiates one GridManager and delegates all
 * grid-related calls to it, keeping backward-compat wrappers on the scene.
 */
export default class GridManager {
  constructor(scene) {
    this.scene = scene;
    this.grid = [];
    this.highlightSprites = [];
  }

  /**
   * Build the grid from a 2-D tile-type array.
   * Returns the grid so BattleScene can store a reference.
   */
  build(mapData) {
    for (let row = 0; row < mapData.length; row++) {
      this.grid[row] = [];
      for (let col = 0; col < mapData[row].length; col++) {
        const type = mapData[row][col];
        const x = this.tileX(col);
        const y = this.tileY(row);

        const textureKey = ['tile_grass', 'tile_wall', 'tile_water', 'tile_objective'][type] || 'tile_grass';
        const sprite = this.scene.add.image(x, y, textureKey).setDepth(0);

        const border = this.scene.add.rectangle(x, y, TILE_SIZE - 1, TILE_SIZE - 1, 0x000000, 0)
          .setStrokeStyle(0.5, 0x000000, 0.3).setDepth(1);

        this.grid[row][col] = {
          row, col, type, x, y,
          walkable: type === 0 || type === 3, // GRASS or OBJECTIVE
          mech: null,
          sprite,
          border,
          highlight: null,
        };
      }
    }
    return this.grid;
  }

  // ── Coordinate helpers ─────────────────────────────────────────────────────

  tileX(col) { return GRID_OFFSET_X + col * TILE_SIZE + TILE_SIZE / 2; }
  tileY(row) { return GRID_OFFSET_Y + row * TILE_SIZE + TILE_SIZE / 2; }

  pixelToGrid(px, py) {
    const col = Math.floor((px - GRID_OFFSET_X) / TILE_SIZE);
    const row = Math.floor((py - GRID_OFFSET_Y) / TILE_SIZE);
    return { row, col };
  }

  isValidTile(row, col) {
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

  showMoveHighlights(mech) {
    if (mech.ap < 1) return;
    const allMechs = [...this.scene.playerMechs, ...this.scene.enemyMechs]
      .filter(m => m.alive && m !== mech);
    const tiles = getReachableTiles(this.grid, mech.row, mech.col, mech.speed, allMechs);

    tiles.forEach(({ row, col }) => {
      const tile = this.grid[row][col];
      if (!tile.walkable || tile.mech) return;
      const hl = this.scene.add.rectangle(
        tile.x, tile.y, TILE_SIZE - 2, TILE_SIZE - 2, HIGHLIGHT_MOVE, 0.35
      ).setStrokeStyle(1.5, HIGHLIGHT_MOVE, 0.9).setDepth(5);
      tile.highlight = 'move';
      this.highlightSprites.push(hl);
    });

    mech.setSelected(true);

    // Faint attack-range preview over enemy tiles within weapon range
    const weapon = this.scene.getWeapon(mech, 0);
    if (weapon) {
      const attackTiles = getAttackTiles(this.grid, mech.row, mech.col, weapon.range);
      attackTiles.forEach(({ row, col }) => {
        const tile = this.grid[row][col];
        if (tile.mech && tile.mech.team === 'enemy' && tile.mech.alive) {
          const hl = this.scene.add.rectangle(
            tile.x, tile.y, TILE_SIZE - 2, TILE_SIZE - 2, HIGHLIGHT_ATTACK, 0.18
          ).setStrokeStyle(1, HIGHLIGHT_ATTACK, 0.5).setDepth(5);
          this.highlightSprites.push(hl);
        }
      });
    }
  }

  showAttackHighlights(mech, rangeOverride) {
    const weapon = this.scene.getWeapon(mech, 0);
    const range = rangeOverride !== undefined ? rangeOverride : (weapon ? weapon.range : 3);

    // Use LoS-aware tile lookup so blocked tiles are excluded
    const tiles = getAttackTiles(this.grid, mech.row, mech.col, range, true);
    tiles.forEach(({ row, col }) => {
      const tile = this.grid[row][col];
      if (tile.mech && tile.mech.team === 'enemy' && tile.mech.alive) {
        const hl = this.scene.add.rectangle(
          tile.x, tile.y, TILE_SIZE - 2, TILE_SIZE - 2, HIGHLIGHT_ATTACK, 0.4
        ).setStrokeStyle(2, HIGHLIGHT_ATTACK, 1).setDepth(5);
        tile.highlight = 'attack';
        this.highlightSprites.push(hl);
      }
    });

    mech.setSelected(true);
  }

  // ── Adjacency helpers ──────────────────────────────────────────────────────

  getAdjacentMechs(row, col, team) {
    const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    const result = [];
    dirs.forEach(([dr, dc]) => {
      const nr = row + dr, nc = col + dc;
      if (!this.isValidTile(nr, nc)) return;
      const m = this.grid[nr][nc].mech;
      if (m && m.alive && (team === 'any' || m.team === team)) result.push(m);
    });
    return result;
  }
}
