// ── Canvas & Grid ────────────────────────────────────────────────────────────
// Full-screen layout: 1280 × 800 base, scaled to fit with Phaser Scale.FIT
export const TILE_SIZE = 80;     // retained for BootScene tile texture generation
export const GRID_COLS = 12;
export const GRID_ROWS = 8;
export const GRID_OFFSET_X = 240;  // left margin — must clear the 220px HUD left panel
export const GRID_OFFSET_Y = 60;   // top margin (room for header bar)
export const CANVAS_WIDTH  = 1280;
export const CANVAS_HEIGHT = 800;

// Mech sprite size inside a tile
export const MECH_SPRITE_SIZE = 64;
// Texture generation size for mechs (high-detail procedural)
export const MECH_TEX_SIZE = 96;

// ── Hex Grid ─────────────────────────────────────────────────────────────────
// Pointy-top hexagons with odd-r offset coordinates.
// At 12 cols × 8 rows this grid fits in the 1040 × 740 px play area.
export const HEX_SIZE     = 44;                      // circumradius (centre → vertex)
export const HEX_W        = Math.sqrt(3) * HEX_SIZE; // ≈ 76.21 px flat-to-flat width
export const HEX_H        = 2 * HEX_SIZE;            // 88 px  point-to-point height
export const HEX_ROW_STEP = HEX_H * 0.75;            // 66 px  row-to-row spacing

// 6-direction neighbour deltas for pointy-top odd-r offset (NW, NE, E, SE, SW, W).
export const HEX_DIRS_EVEN = [[-1,-1],[-1,0],[0,1],[1,0],[1,-1],[0,-1]];
export const HEX_DIRS_ODD  = [[-1,0],[-1,1],[0,1],[1,1],[1,0],[0,-1]];

/** Return the 6 hex neighbours of (row, col). */
export function hexNeighbors(row, col) {
  const dirs = row % 2 === 0 ? HEX_DIRS_EVEN : HEX_DIRS_ODD;
  return dirs.map(([dr, dc]) => ({ row: row + dr, col: col + dc }));
}

/** Convert pointy-top odd-r offset to cube coordinates [x, y, z]. */
export function offsetToCube(row, col) {
  const x = col - (row - (row & 1)) / 2;
  const z = row;
  return [x, -x - z, z];
}

/** Hex grid distance (cube-coordinate method). */
export function hexDistance(r1, c1, r2, c2) {
  const [x1, y1, z1] = offsetToCube(r1, c1);
  const [x2, y2, z2] = offsetToCube(r2, c2);
  return (Math.abs(x1 - x2) + Math.abs(y1 - y2) + Math.abs(z1 - z2)) / 2;
}

// ── Facing directions ────────────────────────────────────────────────────────
// Six hex directions for pointy-top grid (NW, NE, E, SE, SW, W).
export const FACING = { NW: 'NW', NE: 'NE', E: 'E', SE: 'SE', SW: 'SW', W: 'W' };

/**
 * Derive hex facing direction from a move delta (pointy-top odd-r).
 * Primary rule: row changes first; if same row use col direction.
 */
export function getFacingFromMovement(fromRow, fromCol, toRow, toCol) {
  const dr = toRow - fromRow;
  const dc = toCol - fromCol;
  if (dr === 0 && dc > 0) return 'E';
  if (dr === 0 && dc < 0) return 'W';
  if (dr < 0) {
    if (fromRow % 2 === 0) return dc < 0 ? 'NW' : 'NE';
    return dc <= 0 ? 'NW' : 'NE';
  }
  if (dr > 0) {
    if (fromRow % 2 === 0) return dc < 0 ? 'SW' : 'SE';
    return dc <= 0 ? 'SW' : 'SE';
  }
  return 'E';
}

// ── Tile types ───────────────────────────────────────────────────────────────
export const TILE_GRASS     = 0;
export const TILE_WALL      = 1;
export const TILE_WATER     = 2;
export const TILE_OBJECTIVE = 3;

// Hex fill colours per tile type
export const TILE_COLORS = {
  [TILE_GRASS]:     0x3a6b2a,
  [TILE_WALL]:      0x555566,
  [TILE_WATER]:     0x1a5a8a,
  [TILE_OBJECTIVE]: 0x8b6914,
};

// Lighter accent colours for top-edge highlight
export const TILE_ACCENT_COLORS = {
  [TILE_GRASS]:     0x4a8a36,
  [TILE_WALL]:      0x666677,
  [TILE_WATER]:     0x2266aa,
  [TILE_OBJECTIVE]: 0xaa8820,
};

// ── Highlight colors ─────────────────────────────────────────────────────────
export const HIGHLIGHT_MOVE    = 0x4488ff;
export const HIGHLIGHT_ATTACK  = 0xff3333;
export const HIGHLIGHT_SELECT  = 0xffff00;
export const HIGHLIGHT_SPECIAL = 0xaa44ff;

// ── Mech palette ─────────────────────────────────────────────────────────────
export const MECH_COLORS = {
  zip:         0x00eedd,
  rex:         0xff8c00,
  bolt:        0x00dd44,
  nova:        0xffd700,
  vex:         0xff2244,
  drone_alpha: 0x9922cc,
  drone_heavy: 0xaa0000,
};

// ── Game phases ──────────────────────────────────────────────────────────────
export const PHASE = {
  IDLE:           'IDLE',
  MECH_SELECTED:  'MECH_SELECTED',
  MOVING:         'MOVING',
  ATTACK_SELECT:  'ATTACK_SELECT',
  RESOLVING:      'RESOLVING',
  SPECIAL_SELECT: 'SPECIAL_SELECT',
  ENEMY_TURN:     'ENEMY_TURN',
  GAME_OVER:      'GAME_OVER',
};

// ── UI palette (command-centre aesthetic) ────────────────────────────────────
export const UI = {
  BORDER_OUTER:  0x5a5a50,
  BORDER_INNER:  0x3a3a34,
  BORDER_RIVET:  0x888878,
  PANEL_BG:      0x1a1a14,
  CRT_BG:        0x0a1a0a,
  CRT_TEXT:      0x33ff33,
  CRT_DIM:       0x115511,
  CRT_BORDER:    0x2a3a2a,
  AMBER:         0xffcc44,
  AMBER_DIM:     0x886622,
  CYAN:          0x00eedd,
  CYAN_DIM:      0x006666,
  STATUS_ACTIVE: 0x44ff44,
  STATUS_LOCKED: 0xff4444,
};
