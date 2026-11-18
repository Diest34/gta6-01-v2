// Solmar Bay's layout: the 8x6 block grid, its buildings, parks, palms, districts
// and landmarks, plus the collision and road helpers every system shares.
import { BEACH_Y, GRID, WATER_Y, WORLD, blockCenter, roadX, roadY } from './config.js';
import { int, pick, range } from './random.js';

/** District rectangles: name plus the block range they cover. */
const DISTRICT_DEFS = [
  { name: 'Palmetto Heights', col0: 0, col1: 3, row0: 0, row1: 1 },
  { name: 'Coral Market', col0: 4, col1: 7, row0: 0, row1: 1 },
  { name: 'Old Cannery', col0: 0, col1: 3, row0: 2, row1: 3 },
  { name: 'Harbor Point', col0: 4, col1: 7, row0: 2, row1: 3 },
  { name: 'Marina Row', col0: 0, col1: 3, row0: 4, row1: 5 },
  { name: 'Dune Strip', col0: 4, col1: 7, row0: 4, row1: 5 },
];

/** Blocks that are parks (grass and palms, no buildings). */
const PARK_BLOCKS = [[2, 1], [5, 4]];

/** Landmark plots: block, kind and the name shown on the map. */
const LANDMARK_DEFS = [
  { key: 'garage', name: "Sable's Garage", col: 1, row: 0, kind: 'garage' },
  { key: 'market', name: 'Coral Market', col: 6, row: 0, kind: 'market' },
  { key: 'cannery', name: 'Old Cannery', col: 1, row: 3, kind: 'warehouse' },
  { key: 'clinic', name: 'Harbor Clinic', col: 5, row: 2, kind: 'clinic' },
  { key: 'marina', name: 'Marina Row', col: 2, row: 5, kind: 'shop' },
  { key: 'dunes', name: 'Dune Strip', col: 6, row: 5, kind: 'shop' },
  { key: 'plaza', name: 'Sunset Plaza', col: 4, row: 2, kind: 'plaza' },
];

const BUILDING_KINDS = ['house', 'shop', 'tower', 'warehouse'];

/** Build the whole city from a seeded rng. */
export function buildCity(rng) {
  const buildings = [];
  const parks = [];
  const palms = [];
  const landmarks = {};

  const isPark = (col, row) => PARK_BLOCKS.some(([c, r]) => c === col && r === row);
  const landmarkAt = (col, row) => LANDMARK_DEFS.find((d) => d.col === col && d.row === row);

  for (let row = 0; row < GRID.rows; row += 1) {
    for (let col = 0; col < GRID.cols; col += 1) {
      const centre = blockCenter(col, row);
      if (isPark(col, row)) {
        parks.push({ x: centre.x - GRID.block / 2, y: centre.y - GRID.block / 2, w: GRID.block, h: GRID.block });
        for (let i = 0; i < 7; i += 1) {
          palms.push({ x: range(rng, centre.x - 110, centre.x + 110), y: range(rng, centre.y - 110, centre.y + 110) });
        }
        continue;
      }
      const landmark = landmarkAt(col, row);
      if (landmark) {
        landmarks[landmark.key] = { x: centre.x, y: centre.y, name: landmark.name };
        if (landmark.kind === 'plaza') {
          // An open square: fountain in the middle, palms at the corners, no walls.
          parks.push({ x: centre.x - GRID.block / 2, y: centre.y - GRID.block / 2, w: GRID.block, h: GRID.block });
          for (const [dx, dy] of [[-100, -100], [100, -100], [-100, 100], [100, 100]]) {
            palms.push({ x: centre.x + dx, y: centre.y + dy });
          }
          continue;
        }
        buildings.push({
          x: centre.x - 95, y: centre.y - 70, w: 190, h: 140,
          kind: landmark.kind, name: landmark.name,
        });
        continue;
      }
      // An ordinary block: one or two buildings, inset from the block edge.
      // Two buildings sit side by side, each inside the block — a building
      // must never jut into the road, or cars would crash into a wall
      // where the asphalt should be clear.
      const count = rng() < 0.45 ? 2 : 1;
      for (let i = 0; i < count; i += 1) {
        const kind = pick(rng, BUILDING_KINDS);
        const w = int(rng, 90, 150);
        const h = int(rng, 70, 120);
        const x = count === 1
          ? centre.x + range(rng, -50, 50) - w / 2
          : (i === 0 ? centre.x - 124 : centre.x + 124 - w);
        const y = centre.y + range(rng, -55, 55) - h / 2;
        buildings.push({ x, y, w, h, kind, name: null });
      }
    }
  }

  // Palm rows along the beach, and a few scattered on sidewalks.
  for (let x = 120; x < WORLD.width - 80; x += 170) {
    palms.push({ x: x + range(rng, -30, 30), y: BEACH_Y + range(rng, 24, 70) });
  }

  const districts = DISTRICT_DEFS.map((d) => ({
    name: d.name,
    x0: d.col0 * GRID.pitch,
    x1: (d.col1 + 1) * GRID.pitch,
    y0: d.row0 * GRID.pitch,
    y1: (d.row1 + 1) * GRID.pitch,
  }));

  return { buildings, parks, palms, landmarks, districts };
}

/** Which district a world point is in (the beach counts as Dune Strip / Marina Row). */
export function districtAt(city, x, y) {
  for (const d of city.districts) {
    if (x >= d.x0 && x < d.x1 && y >= d.y0 && y < d.y1) return d.name;
  }
  return y >= BEACH_Y ? (x < WORLD.width / 2 ? 'Marina Row' : 'Dune Strip') : 'Solmar Bay';
}

/** Push a circle out of buildings, the water and the map edge. Returns true on a hit. */
export function collideCircle(city, x, y, radius) {
  let hit = false;
  for (const b of city.buildings) {
    const cx = Math.max(b.x, Math.min(x, b.x + b.w));
    const cy = Math.max(b.y, Math.min(y, b.y + b.h));
    const dx = x - cx;
    const dy = y - cy;
    const distSq = dx * dx + dy * dy;
    if (distSq >= radius * radius) continue;
    hit = true;
    if (distSq > 0.0001) {
      const dist = Math.sqrt(distSq);
      x = cx + (dx / dist) * radius;
      y = cy + (dy / dist) * radius;
    } else {
      // Dead centre of a wall: shove out along the smallest penetration.
      const left = x - b.x + radius;
      const right = b.x + b.w - x + radius;
      const top = y - b.y + radius;
      const bottom = b.y + b.h - y + radius;
      const min = Math.min(left, right, top, bottom);
      if (min === left) x = b.x - radius;
      else if (min === right) x = b.x + b.w + radius;
      else if (min === top) y = b.y - radius;
      else y = b.y + b.h + radius;
    }
  }
  if (y + radius > WATER_Y) {
    y = WATER_Y - radius;
    hit = true;
  }
  if (x < radius) { x = radius; hit = true; }
  if (x > WORLD.width - radius) { x = WORLD.width - radius; hit = true; }
  if (y < radius) { y = radius; hit = true; }
  if (y > WORLD.height - radius) { y = WORLD.height - radius; hit = true; }
  return { x, y, hit };
}

/** True when a world point is in the sea. */
export function isInWater(x, y) {
  return y >= WATER_Y;
}

/** The nearest point on any road centre line to (x, y). */
export function nearestRoadPoint(x, y) {
  let best = null;
  let bestDist = Infinity;
  for (let i = 0; i <= GRID.cols; i += 1) {
    const cx = roadX(i);
    const d = Math.abs(x - cx);
    if (d < bestDist && y < BEACH_Y) {
      bestDist = d;
      best = { x: cx, y: Math.max(GRID.road / 2, Math.min(y, BEACH_Y - GRID.road / 2)) };
    }
  }
  for (let j = 0; j < GRID.rows; j += 1) {
    const cy = roadY(j);
    const d = Math.abs(y - cy);
    if (d < bestDist) {
      bestDist = d;
      best = { x: Math.max(GRID.road / 2, Math.min(x, WORLD.width - GRID.road / 2)), y: cy };
    }
  }
  return best;
}

/** A random point on a random road, away from the map edge. */
export function randomRoadPoint(rng) {
  if (rng() < 0.5) {
    return { x: roadX(int(rng, 1, GRID.cols - 1)), y: range(rng, 200, BEACH_Y - 200) };
  }
  return { x: range(rng, 200, WORLD.width - 200), y: roadY(int(rng, 0, GRID.rows - 1)) };
}

/** A random intersection (road crossing) inside the grid. */
export function randomIntersection(rng) {
  return { x: roadX(int(rng, 0, GRID.cols)), y: roadY(int(rng, 0, GRID.rows - 1)) };
}
