// The law: wanted stars, Interceptors that chase and ram, busts for on-foot
// Rook, and the slow decay back to clean when the heat dies down.
import { MODEL_BY_NAME, WANTED } from './config.js';
import { createCar, spawnPointNear } from './cars.js';
import { hurtPlayer } from './player.js';

export function addCrime(state, stars, what) {
  state.wanted = Math.min(WANTED.maxStars, state.wanted + stars);
  state.lastCrimeAt = state.clock;
  if (what) state.events.push({ type: 'crime', stars, what });
}

/** One Interceptor, rolling in from a road out of sight. */
function spawnCop(state) {
  const at = spawnPointNear(state, 620);
  const cop = createCar('Interceptor', at.x, at.y, 0, 'police');
  cop.speed = 200;
  cop.ramCd = 0;
  cop.bustCd = 0;
  state.cars.push(cop);
  state.cops.push(cop);
  return cop;
}

function angleToward(from, to, maxStep) {
  let diff = to - from;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return from + Math.max(-maxStep, Math.min(maxStep, diff));
}

/** A cop chases Rook: steer hard, ram on contact, bounce off after the hit. */
function stepCop(state, cop, dt) {
  const player = state.player;
  const model = MODEL_BY_NAME[cop.model];
  if (cop.ramCd > 0) cop.ramCd -= dt;
  if (cop.bustCd > 0) cop.bustCd -= dt;
  const want = Math.atan2(player.y - cop.y, player.x - cop.x);
  cop.angle = angleToward(cop.angle, want, model.turn * 1.15 * dt);
  const dist = Math.hypot(player.x - cop.x, player.y - cop.y);
  const targetSpeed = dist > 300 ? model.topSpeed : model.topSpeed * 0.85;
  cop.speed += (targetSpeed - cop.speed) * Math.min(1, 1.4 * dt);
  cop.x += Math.cos(cop.angle) * cop.speed * dt;
  cop.y += Math.sin(cop.angle) * cop.speed * dt;

  // Ram: 6 damage, one hit a second, then the cop bounces off.
  if (dist < 48 && cop.ramCd <= 0) {
    cop.ramCd = WANTED.ramCooldown;
    cop.speed *= -0.45;
    cop.x += Math.cos(cop.angle) * -30;
    cop.y += Math.sin(cop.angle) * -30;
    if (player.inCar) {
      player.inCar.hp -= WANTED.ramDamage;
      state.events.push({ type: 'crash', x: cop.x, y: cop.y, hard: true });
      if (player.inCar.hp <= 0) {
        state.events.push({ type: 'car-wrecked', car: player.inCar });
      }
    } else {
      hurtPlayer(state, WANTED.ramDamage);
    }
  }

  // Bust: on-foot Rook, slow and close, gets cuffed — 20% fine, clinic respawn.
  if (!player.inCar && dist < WANTED.bustRange && Math.abs(cop.speed) < 190 && cop.bustCd <= 0) {
    cop.bustCd = 3;
    const fine = Math.floor(state.money * WANTED.fine);
    state.money -= fine;
    state.wanted = 0;
    state.cops.length = 0;
    for (const car of state.cars) {
      if (car.kind === 'police') car.kind = 'wreck';
    }
    const clinic = state.city.landmarks.clinic;
    player.x = clinic.x;
    player.y = clinic.y + 90;
    player.hp = Math.max(player.hp, 40);
    state.events.push({ type: 'busted', fine });
  }
}

export function stepPolice(state, dt) {
  // Keep the heat staffed: one Interceptor per star, up to four.
  if (state.wanted > 0) {
    const active = state.cops.filter((c) => c.kind === 'police').length;
    const want = Math.min(state.wanted, WANTED.maxCops);
    if (active < want) spawnCop(state);
  }
  for (const cop of state.cops) {
    if (cop.kind !== 'police') continue;
    stepCop(state, cop, dt);
  }
  // Decay: 22 seconds with no crime and no cop close by drops one star.
  if (state.wanted > 0 && state.clock - state.lastCrimeAt > WANTED.decaySeconds) {
    let near = false;
    for (const cop of state.cops) {
      if (cop.kind === 'police' && Math.hypot(cop.x - state.player.x, cop.y - state.player.y) < WANTED.copNear) {
        near = true;
        break;
      }
    }
    if (!near) {
      state.wanted -= 1;
      state.lastCrimeAt = state.clock;
      state.events.push({ type: 'wanted-down', stars: state.wanted });
      if (state.wanted === 0) {
        for (const cop of state.cops) {
          if (cop.kind === 'police') cop.kind = 'wreck';
        }
      }
    }
  }
}
