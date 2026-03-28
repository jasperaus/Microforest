import { TILE_WALL, TILE_WATER } from '../../config.js';

/**
 * BFS flood-fill: returns all tiles reachable within `steps` moves.
 * Blocked by walls, water, and optionally other mechs.
 */
export function getReachableTiles(grid, startRow, startCol, steps, blockedByMechs = []) {
  const rows = grid.length;
  const cols = grid[0].length;
  const visited = new Set();
  const reachable = [];

  const key = (r, c) => `${r},${c}`;
  const blockedSet = new Set(blockedByMechs.map(m => key(m.row, m.col)));

  const queue = [{ row: startRow, col: startCol, stepsLeft: steps }];
  visited.add(key(startRow, startCol));

  while (queue.length > 0) {
    const { row, col, stepsLeft } = queue.shift();
    if (stepsLeft === 0) continue;

    const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    for (const [dr, dc] of dirs) {
      const nr = row + dr;
      const nc = col + dc;
      const k = key(nr, nc);

      if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;
      if (visited.has(k)) continue;

      const tile = grid[nr][nc];
      if (tile.type === TILE_WALL || tile.type === TILE_WATER) continue;
      if (blockedSet.has(k)) continue;

      visited.add(k);
      reachable.push({ row: nr, col: nc });
      queue.push({ row: nr, col: nc, stepsLeft: stepsLeft - 1 });
    }
  }

  return reachable;
}

/**
 * Manhattan distance between two tile positions.
 */
export function manhattanDistance(r1, c1, r2, c2) {
  return Math.abs(r1 - r2) + Math.abs(c1 - c2);
}

/**
 * Bresenham's line-of-sight check.
 * Returns false if any intermediate tile between origin and target is a wall.
 */
export function hasLineOfSight(grid, fromRow, fromCol, toRow, toCol) {
  let x0 = fromCol, y0 = fromRow;
  const x1 = toCol,  y1 = toRow;

  const dx = Math.abs(x1 - x0);
  const dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;

  while (true) {
    // Check intermediate tiles (not origin, not destination)
    const isOrigin      = x0 === fromCol && y0 === fromRow;
    const isDestination = x0 === x1      && y0 === y1;

    if (!isOrigin && !isDestination) {
      if (!grid[y0] || !grid[y0][x0]) return false;
      if (grid[y0][x0].type === TILE_WALL) return false;
    }

    if (isDestination) break;

    const e2 = 2 * err;
    if (e2 > -dy) { err -= dy; x0 += sx; }
    if (e2 <  dx) { err += dx; y0 += sy; }
  }

  return true;
}

/**
 * Get all tiles within attack range (Manhattan radius).
 * When checkLoS is true, tiles blocked by walls are excluded.
 */
export function getAttackTiles(grid, fromRow, fromCol, range, checkLoS = false) {
  const rows = grid.length;
  const cols = grid[0].length;
  const tiles = [];

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (r === fromRow && c === fromCol) continue;
      if (manhattanDistance(fromRow, fromCol, r, c) > range) continue;
      if (checkLoS && !hasLineOfSight(grid, fromRow, fromCol, r, c)) continue;
      tiles.push({ row: r, col: c });
    }
  }

  return tiles;
}

/**
 * A* pathfinding — returns array of {row, col} steps from start toward goal.
 */
export function findPath(grid, startRow, startCol, goalRow, goalCol, blockedByMechs = []) {
  const rows = grid.length;
  const cols = grid[0].length;
  const key = (r, c) => `${r},${c}`;
  const blockedSet = new Set(blockedByMechs.map(m => key(m.row, m.col)));

  const heuristic = (r, c) => manhattanDistance(r, c, goalRow, goalCol);

  const open = [{ row: startRow, col: startCol, g: 0, f: heuristic(startRow, startCol) }];
  const cameFrom = new Map();
  const gScore = new Map();
  gScore.set(key(startRow, startCol), 0);

  while (open.length > 0) {
    open.sort((a, b) => a.f - b.f);
    const current = open.shift();
    const { row, col } = current;

    if (row === goalRow && col === goalCol) {
      const path = [];
      let k = key(row, col);
      while (cameFrom.has(k)) {
        const [r, c] = k.split(',').map(Number);
        path.unshift({ row: r, col: c });
        k = cameFrom.get(k);
      }
      return path;
    }

    const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    for (const [dr, dc] of dirs) {
      const nr = row + dr;
      const nc = col + dc;
      const nk = key(nr, nc);

      if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;
      const tile = grid[nr][nc];
      if (tile.type === TILE_WALL || tile.type === TILE_WATER) continue;
      if (blockedSet.has(nk) && !(nr === goalRow && nc === goalCol)) continue;

      const tentativeG = (gScore.get(key(row, col)) || 0) + 1;
      if (tentativeG < (gScore.get(nk) || Infinity)) {
        cameFrom.set(nk, key(row, col));
        gScore.set(nk, tentativeG);
        open.push({ row: nr, col: nc, g: tentativeG, f: tentativeG + heuristic(nr, nc) });
      }
    }
  }

  return [];
}
