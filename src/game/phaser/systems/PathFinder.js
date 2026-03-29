import {
  TILE_WALL, TILE_WATER,
  hexNeighbors, hexDistance, offsetToCube,
} from '../../config.js';

/**
 * BFS flood-fill: returns all tiles reachable within `steps` hex moves.
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

    for (const { row: nr, col: nc } of hexNeighbors(row, col)) {
      if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;
      const k = key(nr, nc);
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

// Re-export for callers that imported from here previously.
export { hexDistance };

/**
 * Hex line-of-sight via cube-coordinate lerp.
 * Returns false if any intermediate tile is a wall.
 */
export function hasLineOfSight(grid, fromRow, fromCol, toRow, toCol) {
  const [x1, y1, z1] = offsetToCube(fromRow, fromCol);
  const [x2, y2, z2] = offsetToCube(toRow, toCol);
  const N = Math.round((Math.abs(x1 - x2) + Math.abs(y1 - y2) + Math.abs(z1 - z2)) / 2);

  if (N === 0) return true;

  for (let i = 1; i < N; i++) {
    const t = i / N;
    const fx = x1 + (x2 - x1) * t;
    const fy = y1 + (y2 - y1) * t;
    const fz = z1 + (z2 - z1) * t;

    // Round to nearest hex using cube rounding
    let rx = Math.round(fx);
    let ry = Math.round(fy);
    let rz = Math.round(fz);
    const dx = Math.abs(rx - fx);
    const dy = Math.abs(ry - fy);
    const dz = Math.abs(rz - fz);
    if (dx > dy && dx > dz)      rx = -ry - rz;
    else if (dy > dz)             ry = -rx - rz;
    else                          rz = -rx - ry;

    // Convert cube back to offset
    const r = rz;
    const c = rx + (rz - (rz & 1)) / 2;

    if (r < 0 || r >= grid.length || c < 0 || c >= grid[0].length) return false;
    if (!grid[r] || !grid[r][c]) return false;
    if (grid[r][c].type === TILE_WALL) return false;
  }

  return true;
}

/**
 * Get all tiles within hex attack range (hex distance ≤ range).
 * When checkLoS is true, tiles blocked by walls are excluded.
 */
export function getAttackTiles(grid, fromRow, fromCol, range, checkLoS = false) {
  const rows = grid.length;
  const cols = grid[0].length;
  const tiles = [];

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (r === fromRow && c === fromCol) continue;
      if (hexDistance(fromRow, fromCol, r, c) > range) continue;
      if (checkLoS && !hasLineOfSight(grid, fromRow, fromCol, r, c)) continue;
      tiles.push({ row: r, col: c });
    }
  }

  return tiles;
}

/**
 * A* pathfinding for the hex grid.
 * Returns array of {row, col} steps from start toward goal (not including start).
 */
export function findPath(grid, startRow, startCol, goalRow, goalCol, blockedByMechs = []) {
  const rows = grid.length;
  const cols = grid[0].length;
  const key = (r, c) => `${r},${c}`;
  const blockedSet = new Set(blockedByMechs.map(m => key(m.row, m.col)));

  const heuristic = (r, c) => hexDistance(r, c, goalRow, goalCol);

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

    for (const { row: nr, col: nc } of hexNeighbors(row, col)) {
      if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;
      const nk = key(nr, nc);
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
