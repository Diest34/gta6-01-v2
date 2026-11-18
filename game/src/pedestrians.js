// Pedestrians: sidewalk strolls, fleeing from gunshots, and getting knocked down
// by cars. A pedestrian Rook's car flattens is a crime; a scared one just runs.
import { PEDS } from './config.js';
import { collideCircle, randomRoadPoint } from './city.js';
import { range } from './random.js';

export function spawnPeds(city, rng) {
  const peds = [];
  for (let i = 0; i < PEDS.count; i += 1) {
    const at = randomRoadPoint(rng);
    peds.push({
      x: at.x + range(rng, -24, 24),
      y: at.y + range(rng, -24, 24),
      angle: range(rng, 0, Math.PI * 2),
      speed: PEDS.walkSpeed,
      state: 'walk', // walk | flee | down
      target: randomRoadPoint(rng),
      downAt: 0,
      fleeX: 0,
      fleeY: 0,
      hitByPlayer: false,
    });
  }
  return peds;
}

/** Every pedestrian within radius of a gunshot starts running away from it. */
export function scarePeds(state, x, y, radius) {
  for (const ped of state.peds) {
    if (ped.state === 'down') continue;
    const d = Math.hypot(ped.x - x, ped.y - y);
    if (d < radius) {
      ped.state = 'flee';
      ped.fleeX = ped.x - x;
      ped.fleeY = ped.y - y;
      const len = Math.hypot(ped.fleeX, ped.fleeY) || 1;
      ped.fleeX /= len;
      ped.fleeY /= len;
    }
  }
}

function stepPed(state, ped, dt) {
  if (ped.state === 'down') {
    ped.downAt -= dt;
    if (ped.downAt <= 0) {
      ped.state = 'walk';
      ped.hitByPlayer = false;
      ped.target = randomRoadPoint(state.rng);
    }
    return;
  }
  let tx;
  let ty;
  let speed = ped.speed;
  if (ped.state === 'flee') {
    tx = ped.x + ped.fleeX * 200;
    ty = ped.y + ped.fleeY * 200;
    speed = PEDS.fleeSpeed;
    if (Math.hypot(tx - ped.x, ty - ped.y) < 30) ped.state = 'walk';
  } else {
    tx = ped.target.x;
    ty = ped.target.y;
    if (Math.hypot(tx - ped.x, ty - ped.y) < 24) {
      ped.target = randomRoadPoint(state.rng);
      return;
    }
  }
  const angle = Math.atan2(ty - ped.y, tx - ped.x);
  ped.angle = angle;
  const nx = ped.x + Math.cos(angle) * speed * dt;
  const ny = ped.y + Math.sin(angle) * speed * dt;
  const snapped = collideCircle(state.city, nx, ny, 10);
  ped.x = snapped.x;
  ped.y = snapped.y;
}

export function stepPeds(state, dt) {
  for (const ped of state.peds) stepPed(state, ped, dt);

  // Cars knock pedestrians down. A player-driven car doing it is a crime.
  for (const car of state.cars) {
    if (car.kind === 'wreck') continue;
    if (Math.abs(car.speed) < 55) continue;
    for (const ped of state.peds) {
      if (ped.state === 'down') continue;
      if (Math.hypot(ped.x - car.x, ped.y - car.y) < 26) {
        ped.state = 'down';
        ped.downAt = 4;
        if (car.driven && !ped.hitByPlayer) {
          ped.hitByPlayer = true;
          state.events.push({ type: 'crime', stars: 1, what: 'Ran over a pedestrian' });
        }
      }
    }
  }
}
