// ── Canvas & Grid ────────────────────────────────────────────────────────────
// Full-screen layout: 1280 × 800 base, scaled to fit with Phaser Scale.FIT
export const TILE_SIZE = 80;
export const GRID_COLS = 12;
export const GRID_ROWS = 8;
export const GRID_OFFSET_X = 80;   // left margin (room for HUD)
export const GRID_OFFSET_Y = 60;   // top margin (room for header bar)
export const CANVAS_WIDTH  = 1280;
export const CANVAS_HEIGHT = 800;

// Mech sprite size inside a tile
export const MECH_SPRITE_SIZE = 64;
// Texture generation size for mechs (high-detail procedural)
export const MECH_TEX_SIZE = 96;

// ── Tile types ───────────────────────────────────────────────────────────────
export const TILE_GRASS     = 0;
export const TILE_WALL      = 1;
export const TILE_WATER     = 2;
export const TILE_OBJECTIVE = 3;

// Tile colors (hex numbers for Phaser)
export const TILE_COLORS = {
  [TILE_GRASS]:     0x3a6b2a,
  [TILE_WALL]:      0x555566,
  [TILE_WATER]:     0x1a5a8a,
  [TILE_OBJECTIVE]: 0x8b6914,
};

export const TILE_ACCENT_COLORS = {
  [TILE_GRASS]:     0x4a8a36,
  [TILE_WALL]:      0x444455,
  [TILE_WATER]:     0x226699,
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
  // Metal frame
  BORDER_OUTER:  0x5a5a50,
  BORDER_INNER:  0x3a3a34,
  BORDER_RIVET:  0x888878,
  PANEL_BG:      0x1a1a14,

  // CRT phosphor green
  CRT_BG:        0x0a1a0a,
  CRT_TEXT:      0x33ff33,
  CRT_DIM:       0x115511,
  CRT_BORDER:    0x2a3a2a,

  // Amber accent
  AMBER:         0xffcc44,
  AMBER_DIM:     0x886622,

  // Cyan accent
  CYAN:          0x00eedd,
  CYAN_DIM:      0x006666,

  // Status
  STATUS_ACTIVE: 0x44ff44,
  STATUS_LOCKED: 0xff4444,
};
