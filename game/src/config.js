// Sunset Keys — every tuning number, colour and model in one place.
// The world is a fixed 2796x2400 map; the renderer shows a 1280x720 window of it,
// so no rule here depends on the screen size.

/** The simulation's fixed step, in seconds: 60 updates a second. */
export const STEP = 1 / 60;

export const WORLD = { width: 2796, height: 2400 };

/** City grid: 8 columns x 6 rows of blocks, pitch 340, road 76, block 264. */
export const GRID = { cols: 8, rows: 6, pitch: 340, road: 76, block: 264 };

/** South edge: sand from here down, water from WATER_Y down. */
export const BEACH_Y = 2040;
export const WATER_Y = 2260;

/** Centre line of vertical road i (0..8) and horizontal road j (0..5). */
export function roadX(i) {
  return i * GRID.pitch + GRID.road / 2;
}
export function roadY(j) {
  return j * GRID.pitch + GRID.road / 2;
}

/** Centre of block (col, row). */
export function blockCenter(col, row) {
  return {
    x: col * GRID.pitch + GRID.road + GRID.block / 2,
    y: row * GRID.pitch + GRID.road + GRID.block / 2,
  };
}

export const PALETTE = {
  backdrop: '#0d0f16',
  grass: '#2e4d2a',
  park: '#356b31',
  sand: '#c9a86a',
  water: '#1d5f7a',
  waterDeep: '#144a61',
  asphalt: '#33363d',
  asphaltDark: '#2b2e35',
  sidewalk: '#565a63',
  line: '#c8b45a',
  building: '#4a4f5a',
  buildingRoof: '#5d6270',
  shop: '#7a5a3a',
  warehouse: '#5a5f6b',
  tower: '#3f4a63',
  clinic: '#e8e4da',
  garage: '#8a5a2e',
  market: '#a03d2d',
  palm: '#3f7a34',
  trunk: '#6b4a2f',
  player: '#f2c94c',
  playerCar: '#e8b73a',
  cop: '#3a6fd8',
  copLight: '#ff3b30',
  enemy: '#c0392b',
  bullet: '#ffd94d',
  text: '#f2f0e8',
  muted: '#9aa0ad',
  panel: '#1c1f28',
  gold: '#f2c94c',
  red: '#e5534b',
  green: '#58b368',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

export const PLAYER = {
  radius: 14,
  walkSpeed: 175,
  hp: 100,
  enterRange: 78,
  invulnerable: 1.0,
};

export const CAR_MODELS = [
  { name: 'Gull GT', length: 46, width: 22, accel: 340, topSpeed: 420, reverse: 150, turn: 2.6, hp: 100, color: '#d84a4a' },
  { name: 'Comet', length: 44, width: 21, accel: 300, topSpeed: 380, reverse: 140, turn: 2.8, hp: 90, color: '#4a90d8' },
  { name: 'Mule', length: 52, width: 24, accel: 210, topSpeed: 300, reverse: 120, turn: 2.1, hp: 400, color: '#5a6b52', armored: true },
  { name: 'Interceptor', length: 48, width: 22, accel: 380, topSpeed: 440, reverse: 160, turn: 2.9, hp: 120, color: '#3a6fd8' },
  { name: 'Taxi', length: 44, width: 21, accel: 260, topSpeed: 330, reverse: 130, turn: 2.7, hp: 80, color: '#e8c832' },
  { name: 'Sedan', length: 44, width: 21, accel: 240, topSpeed: 320, reverse: 130, turn: 2.6, hp: 80, color: '#8a8f99' },
  { name: 'Van', length: 50, width: 23, accel: 200, topSpeed: 280, reverse: 110, turn: 2.2, hp: 110, color: '#7a6a8a' },
  { name: 'Pickup', length: 48, width: 22, accel: 260, topSpeed: 340, reverse: 130, turn: 2.5, hp: 100, color: '#4a7a5a' },
];

export const MODEL_BY_NAME = {};
for (const model of CAR_MODELS) MODEL_BY_NAME[model.name] = model;

export const WANTED = {
  maxStars: 5,
  decaySeconds: 22,
  copNear: 420,
  fine: 0.2,
  maxCops: 4,
  ramDamage: 6,
  ramCooldown: 1.0,
  bustRange: 42,
};

export const COMBAT = {
  punchDamage: 34,
  punchRange: 48,
  punchCooldown: 0.45,
  bulletDamage: 34,
  bulletSpeed: 920,
  bulletLife: 0.9,
  startAmmo: 24,
  maxAmmo: 96,
  ammoPack: 12,
  ammoPrice: 10,
  enemyHp: 100,
  enemyDrop: 40,
  enemyRange: 430,
  enemyShootCooldown: 1.1,
};

export const TRAFFIC = { count: 14, speed: 135, parked: 22 };

export const PEDS = { count: 26, walkSpeed: 55, fleeSpeed: 150 };

/** Where a run is kept between visits (this browser only). */
export const SAVE_KEY = 'sunset-keys.save.v1';
