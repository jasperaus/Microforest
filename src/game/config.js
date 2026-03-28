export const TILE_SIZE = 60;
export const GRID_COLS = 12;
export const GRID_ROWS = 8;
export const GRID_OFFSET_X = 8;
export const GRID_OFFSET_Y = 8;
export const CANVAS_WIDTH = GRID_COLS * TILE_SIZE + GRID_OFFSET_X * 2;
export const CANVAS_HEIGHT = GRID_ROWS * TILE_SIZE + GRID_OFFSET_Y * 2;

// Tile types
export const TILE_GRASS = 0;
export const TILE_WALL = 1;
export const TILE_WATER = 2;
export const TILE_OBJECTIVE = 3;

// Tile colors (hex numbers for Phaser)
export const TILE_COLORS = {
  [TILE_GRASS]: 0x3a6b2a,
  [TILE_WALL]: 0x555566,
  [TILE_WATER]: 0x1a5a8a,
  [TILE_OBJECTIVE]: 0x8b6914,
};

export const TILE_ACCENT_COLORS = {
  [TILE_GRASS]: 0x4a8a36,
  [TILE_WALL]: 0x444455,
  [TILE_WATER]: 0x226699,
  [TILE_OBJECTIVE]: 0xaa8820,
};

// Highlight colors (ARGB for Phaser)
export const HIGHLIGHT_MOVE   = 0x4488ff;
export const HIGHLIGHT_ATTACK = 0xff3333;
export const HIGHLIGHT_SELECT = 0xffff00;
export const HIGHLIGHT_SPECIAL = 0xaa44ff;

// Mech palette
export const MECH_COLORS = {
  zip:         0x00eedd,
  rex:         0xff8c00,
  bolt:        0x00dd44,
  nova:        0xffd700,
  vex:         0xff2244,
  drone_alpha: 0x9922cc,
  drone_heavy: 0xaa0000,
};

// Game phases
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

// Phaser game config (partial — scenes injected at game creation)
export const PHASER_CONFIG = {
  type: window.Phaser ? window.Phaser.AUTO : 1, // AUTO
  width: CANVAS_WIDTH,
  height: CANVAS_HEIGHT,
  backgroundColor: '#1a1a2e',
  pixelArt: true,
  antialias: false,
  roundPixels: true,
  scale: {
    mode: 3, // FIT
    autoCenter: 1, // CENTER_HORIZONTALLY
  },
};
