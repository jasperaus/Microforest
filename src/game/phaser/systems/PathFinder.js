import { TILE_WALL, TILE_WATER } from '../../config.js';

/**
 * BFS flood-fill: returns all tiles reachable within `steps` moves.
 * Blocked by walls, water, and optionally enemy mechs.
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
 * Get all tiles within attack range (simple Manhattan radius, ignoring walls).
 */
export function getAttackTiles(grid, fromRow, fromCol, range) {
  const rows = grid.length;
  const cols = grid[0].length;
  const tiles = [];

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (r === fromRow && c === fromCol) continue;
      const dist = manhattanDistance(fromRow, fromCol, r, c);
      if (dist <= range) {
        tiles.push({ row: r, col: c });
      }
    }
  }

  return tiles;
}

/**
 * Simple A* pathfinding — returns array of {row, col} steps from start to goal.
 * Used by AI to navigate toward targets.
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
      // Reconstruct path
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
        const f = tentativeG + heuristic(nr, nc);
        open.push({ row: nr, col: nc, g: tentativeG, f });
      }
    }
  }

  return []; // No path found
}
