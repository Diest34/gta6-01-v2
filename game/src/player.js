// Rook on foot: walking with building collision, getting in and out of cars,
// and taking damage (with a short invulnerability window after each hit).
import { PLAYER } from './config.js';
import { collideCircle } from './city.js';
import { nearestCar } from './cars.js';

export function createPlayer(x, y) {
  return {
    x, y,
    angle: 0,
    hp: PLAYER.hp,
    inCar: null,
    invuln: 0,
    punchCd: 0,
    shootCd: 0,
    moving: false,
  };
}

/** Damage Rook, respecting the invulnerability window. Returns true if it landed. */
export function hurtPlayer(state, damage) {
  const player = state.player;
  if (player.invuln > 0 || player.hp <= 0) return false;
  player.hp -= damage;
  player.invuln = PLAYER.invulnerable;
  state.events.push({ type: 'hurt', damage });
  if (player.hp <= 0) {
    player.hp = 0;
    state.events.push({ type: 'dead' });
  }
  return true;
}

/** Step Rook: drive the car, or walk, enter and exit on E. */
export function stepPlayer(state, input, dt) {
  const player = state.player;
  if (player.invuln > 0) player.invuln -= dt;
  if (player.punchCd > 0) player.punchCd -= dt;
  if (player.shootCd > 0) player.shootCd -= dt;
  if (player.inCar) return; // driving is handled by stepPlayerCar

  const move = input.move();
  const speed = PLAYER.walkSpeed;
  let nx = player.x + move.x * speed * dt;
  let ny = player.y + move.y * speed * dt;
  player.moving = move.x !== 0 || move.y !== 0;
  if (player.moving) player.angle = Math.atan2(move.y, move.x);
  const snapped = collideCircle(state.city, nx, ny, PLAYER.radius);
  player.x = snapped.x;
  player.y = snapped.y;

  // Aim where the mouse points while shooting; otherwise face the walk direction.
  const aim = input.aim;
  if (input.shootHeld || (aim.x !== 0 || aim.y !== 0)) {
    const dx = aim.x - player.x;
    const dy = aim.y - player.y;
    if (Math.hypot(dx, dy) > 24) player.angle = Math.atan2(dy, dx);
  }
}

/** E near a car: climb in (stealing a parked car is a crime). E in a car: climb out. */
export function tryEnterExitCar(state) {
  const player = state.player;
  if (player.inCar) {
    const car = player.inCar;
    car.driven = false;
    car.kind = car.model === 'Interceptor' ? 'police' : 'parked';
    car.speed = 0;
    player.inCar = null;
    // Step out to the side of the car, clear of the walls.
    const side = { x: player.x + Math.cos(car.angle + Math.PI / 2) * 34, y: player.y + Math.sin(car.angle + Math.PI / 2) * 34 };
    const snapped = collideCircle(state.city, side.x, side.y, PLAYER.radius);
    player.x = snapped.x;
    player.y = snapped.y;
    state.events.push({ type: 'exit-car' });
    return true;
  }
  const car = nearestCar(state, player.x, player.y, PLAYER.enterRange, ['parked', 'traffic']);
  if (!car) return false;
  if (car.kind === 'traffic' && Math.abs(car.speed) > 12) return false; // too fast to grab
  const stolen = car.kind === 'parked';
  car.driven = true;
  car.kind = 'parked';
  player.inCar = car;
  player.x = car.x;
  player.y = car.y;
  player.angle = car.angle;
  state.events.push({ type: 'enter-car', car });
  if (stolen) state.events.push({ type: 'crime', stars: 1, what: 'Stole a car' });
  return true;
}
