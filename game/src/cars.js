// Cars: the factory, the parked rows, the traffic that drives intersection to
// intersection, the player's arcade driving, and car-on-car bumps.
import { GRID, MODEL_BY_NAME, STEP, TRAFFIC, WORLD, roadX, roadY } from './config.js';
import { int, pick, range } from './random.js';
import { collideCircle, nearestRoadPoint, randomRoadPoint } from './city.js';

let nextCarId = 1;

/** A car: model stats plus live physics. kind is parked | traffic | police. */
export function createCar(modelName, x, y, angle, kind) {
  const model = MODEL_BY_NAME[modelName];
  return {
    id: nextCarId,
    model: modelName,
    x, y, angle,
    speed: 0,
    hp: model.hp,
    maxHp: model.hp,
    kind,
    driven: false,
    // Traffic only: the intersection it is steering for, and its heading (0=E,1=S,2=W,3=N).
    target: null,
    dir: 0,
    stuckAt: 0,
  };
}

const PARKED_MODELS = ['Sedan', 'Van', 'Pickup', 'Taxi', 'Comet', 'Sedan', 'Pickup'];

/** 22 parked cars along road edges, nose to the kerb. */
export function spawnParked(city, rng) {
  const cars = [];
  const used = new Set();
  let guard = 0;
  while (cars.length < TRAFFIC.parked && guard < 400) {
    guard += 1;
    const vertical = rng() < 0.5;
    let x;
    let y;
    let angle;
    if (vertical) {
      const i = int(rng, 0, GRID.cols);
      const side = rng() < 0.5 ? -1 : 1;
      x = roadX(i) + side * (GRID.road / 2 - 16);
      y = range(rng, 160, 1960);
      angle = side < 0 ? -Math.PI / 2 : Math.PI / 2;
    } else {
      const j = int(rng, 0, GRID.rows - 1);
      const side = rng() < 0.5 ? -1 : 1;
      x = range(rng, 160, WORLD.width - 160);
      y = roadY(j) + side * (GRID.road / 2 - 16);
      angle = side < 0 ? Math.PI : 0;
    }
    const key = `${Math.round(x / 90)}:${Math.round(y / 90)}`;
    if (used.has(key)) continue;
    used.add(key);
    const snapped = collideCircle(city, x, y, 20);
    if (snapped.hit) continue;
    cars.push(createCar(pick(rng, PARKED_MODELS), snapped.x, snapped.y, angle, 'parked'));
  }
  return cars;
}

/** 14 traffic cars rolling on the roads, right-hand lane. */
export function spawnTraffic(city, rng) {
  const cars = [];
  for (let i = 0; i < TRAFFIC.count; i += 1) {
    const at = randomRoadPoint(rng);
    const dir = int(rng, 0, 3);
    const car = createCar(pick(rng, ['Sedan', 'Taxi', 'Van', 'Pickup']), at.x, at.y, (dir * Math.PI) / 2, 'traffic');
    car.dir = dir;
    car.speed = range(rng, 90, TRAFFIC.speed);
    car.target = nextTarget(car, rng);
    cars.push(car);
  }
  return cars;
}

/** Lane offset for right-hand driving: 14 px to the right of the centre line. */
function laneOffset(dir) {
  if (dir === 0) return { x: 0, y: 14 }; // east: right is south
  if (dir === 1) return { x: -14, y: 0 }; // south: right is west
  if (dir === 2) return { x: 0, y: -14 }; // west: right is north
  return { x: 14, y: 0 }; // north: right is east
}

/** The next intersection ahead of a traffic car, with its lane offset applied. */
function nextTarget(car, rng) {
  const step = GRID.pitch;
  let x = car.x;
  let y = car.y;
  if (car.dir === 0) x = Math.min(roadX(GRID.cols), Math.ceil((car.x - roadX(0)) / step) * step + roadX(0));
  else if (car.dir === 2) x = Math.max(roadX(0), Math.floor((car.x - roadX(0)) / step) * step + roadX(0));
  else if (car.dir === 1) y = Math.min(roadY(GRID.rows - 1), Math.ceil((car.y - roadY(0)) / step) * step + roadY(0));
  else y = Math.max(roadY(0), Math.floor((car.y - roadY(0)) / step) * step + roadY(0));
  // At the edge there is no road ahead: turn around at the next intersection instead.
  if ((car.dir === 0 && x >= roadX(GRID.cols)) || (car.dir === 2 && x <= roadX(0))
    || (car.dir === 1 && y >= roadY(GRID.rows - 1)) || (car.dir === 3 && y <= roadY(0))) {
    return { x: roadX(int(rng, 1, GRID.cols - 1)), y: roadY(int(rng, 1, GRID.rows - 2)) };
  }
  const off = laneOffset(car.dir);
  return { x: x + off.x, y: y + off.y };
}

/** Pick a new heading at an intersection: straight, left or right, never a U-turn. */
function chooseTurn(car, rng) {
  const roll = rng();
  if (roll < 0.55) return car.dir; // straight on
  if (roll < 0.78) return (car.dir + 1) % 4; // right
  return (car.dir + 3) % 4; // left
}

function angleToward(from, to, maxStep) {
  let diff = to - from;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return from + Math.max(-maxStep, Math.min(maxStep, diff));
}

/** One traffic car: steer for its target, pick a new heading on arrival. */
function stepTrafficCar(state, car, dt) {
  const model = MODEL_BY_NAME[car.model];
  const target = car.target;
  const dx = target.x - car.x;
  const dy = target.y - car.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 26) {
    car.dir = chooseTurn(car, state.rng);
    car.target = nextTarget(car, state.rng);
    return;
  }
  const want = Math.atan2(dy, dx);
  car.angle = angleToward(car.angle, want, model.turn * 0.9 * dt);
  const slow = Math.abs(want - car.angle) > 0.7 ? 0.45 : 1;
  car.speed += (TRAFFIC.speed * slow - car.speed) * Math.min(1, 1.6 * dt);
  car.x += Math.cos(car.angle) * car.speed * dt;
  car.y += Math.sin(car.angle) * car.speed * dt;
  const snapped = collideCircle(state.city, car.x, car.y, 18);
  if (snapped.hit) {
    car.x = snapped.x;
    car.y = snapped.y;
    car.speed *= 0.4;
    car.dir = chooseTurn(car, state.rng);
    car.target = nextTarget(car, state.rng);
  }
}

export function stepTraffic(state, dt) {
  for (const car of state.cars) {
    if (car.kind !== 'traffic') continue;
    stepTrafficCar(state, car, dt);
  }
}

/** The player's car: arcade throttle, steering that bites with speed, drift-free. */
export function stepPlayerCar(state, input, dt) {
  const player = state.player;
  const car = player.inCar;
  if (!car) return;
  const model = MODEL_BY_NAME[car.model];
  const move = input.move();
  const throttle = -move.y; // W is forward
  const steer = move.x;
  if (throttle > 0) car.speed += model.accel * throttle * dt;
  else if (throttle < 0) {
    if (car.speed > 12) car.speed -= model.accel * 1.4 * dt; // brake
    else car.speed -= model.accel * 0.5 * dt; // reverse
  } else {
    car.speed -= car.speed * 0.9 * dt; // coast drag
  }
  const top = model.topSpeed;
  const rev = -model.reverse;
  if (car.speed > top) car.speed = top;
  if (car.speed < rev) car.speed = rev;
  if (Math.abs(car.speed) < 4 && throttle === 0) car.speed = 0;
  const grip = Math.min(1, Math.abs(car.speed) / (top * 0.45));
  car.angle += steer * model.turn * grip * (car.speed >= 0 ? 1 : -1) * dt;
  car.x += Math.cos(car.angle) * car.speed * dt;
  car.y += Math.sin(car.angle) * car.speed * dt;
  const before = { x: car.x, y: car.y };
  const snapped = collideCircle(state.city, car.x, car.y, 18);
  if (snapped.hit) {
    const impact = Math.abs(car.speed);
    car.x = snapped.x;
    car.y = snapped.y;
    car.speed *= -0.25; // bounce off the wall
    if (impact > 190) {
      car.hp -= Math.round((impact - 190) / 12);
      state.events.push({ type: 'crash', x: before.x, y: before.y, hard: impact > 320 });
    }
  }
  player.x = car.x;
  player.y = car.y;
  player.angle = car.angle;
}

/** Circle-vs-circle shoves between cars; hard hits damage both and count as rams. */
export function collideCars(state) {
  const cars = state.cars;
  for (let i = 0; i < cars.length; i += 1) {
    for (let j = i + 1; j < cars.length; j += 1) {
      const a = cars[i];
      const b = cars[j];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const dist = Math.hypot(dx, dy);
      const min = 30;
      if (dist >= min || dist === 0) continue;
      const push = (min - dist) / 2;
      const nx = dx / dist;
      const ny = dy / dist;
      a.x -= nx * push;
      a.y -= ny * push;
      b.x += nx * push;
      b.y += ny * push;
      const relSpeed = Math.abs(a.speed - b.speed);
      if (relSpeed > 120) {
        a.hp -= 4;
        b.hp -= 4;
        state.events.push({ type: 'crash', x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, hard: relSpeed > 260 });
        if (a.driven || b.driven) {
          const other = a.driven ? b : a;
          if (other.kind === 'traffic') state.events.push({ type: 'ram', car: other });
          const driven = a.driven ? a : b;
          driven.speed *= 0.55;
        }
      } else {
        a.speed *= 0.8;
        b.speed *= 0.8;
      }
    }
  }
  // Wrecked traffic cars stop where they are and never drive again.
  for (const car of cars) {
    if (car.hp <= 0 && car.kind === 'traffic') {
      car.kind = 'wreck';
      car.speed = 0;
    }
    if (car.hp <= 0 && car.kind === 'police') {
      car.kind = 'wreck';
      car.speed = 0;
    }
  }
}

/** Nearest car of the given kinds within range of a point. */
export function nearestCar(state, x, y, maxDist, kinds) {
  let best = null;
  let bestDist = maxDist;
  for (const car of state.cars) {
    if (!kinds.includes(car.kind)) continue;
    const d = Math.hypot(car.x - x, car.y - y);
    if (d < bestDist) {
      bestDist = d;
      best = car;
    }
  }
  return best;
}

/** A road point near the player, for spawning police out of sight. */
export function spawnPointNear(state, minDist) {
  for (let tries = 0; tries < 12; tries += 1) {
    const at = randomRoadPoint(state.rng);
    if (Math.hypot(at.x - state.player.x, at.y - state.player.y) >= minDist) return at;
  }
  return nearestRoadPoint(state.player.x + 700, state.player.y);
}
