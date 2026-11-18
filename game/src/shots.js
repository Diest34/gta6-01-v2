// The four screenshot scenes behind ?shot=start|play|chase|mission. Each one
// plays the real rules forward from a fresh world for a fixed number of steps,
// steered by a simple autopilot (drive toward a waypoint), so the frame is what
// a short game really looks like and the same seed always gives the same frame.
import { STEP, roadX, roadY } from './config.js';
import { createGame, stepAmbient, stepGame } from './game.js';
import { createScriptedInput } from './input.js';
import { startMission } from './missions.js';
import { createCar } from './cars.js';
import { SCREEN_PLAY, SCREEN_TITLE } from './render.js';

/**
 * Steer a scripted input toward a world point: forward throttle, steering by
 * the angle to the target, and the aim point kept on the target.
 */
export function steerToward(input, state, tx, ty) {
  const player = state.player;
  const dx = tx - player.x;
  const dy = ty - player.y;
  const want = Math.atan2(dy, dx);
  let diff = want - player.angle;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  const steer = Math.max(-1, Math.min(1, diff * 1.6));
  input.setMove(steer, -1); // forward
  input.setAim(tx, ty);
}

/** Drive straight east along a road: the chase scene's autopilot. */
function driveEast(input, state) {
  const player = state.player;
  const want = 0; // east
  let diff = want - player.angle;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  input.setMove(Math.max(-1, Math.min(1, diff * 2)), -1);
  input.setAim(player.x + 300, player.y);
}

/** Walk east along a road on foot: the play scene's autopilot. */
function walkEast(input, state) {
  input.setMove(1, 0);
  input.setAim(state.player.x + 200, state.player.y);
}

/**
 * Set up the named scene (start, play, chase or mission; any other name is
 * start) and return the state plus the screen to draw over it.
 */
export function stageShot(name, seed) {
  const state = createGame(seed);
  const input = createScriptedInput();
  const L = state.city.landmarks;

  if (name !== 'play' && name !== 'chase' && name !== 'mission') {
    // Title over five seconds of city life: traffic and pedestrians only.
    for (let i = 0; i < 5 / STEP; i += 1) stepAmbient(state, STEP);
    return { state, screen: SCREEN_TITLE };
  }

  if (name === 'play') {
    // Rook on foot, walking east along the Coral Market road for five seconds.
    state.player.x = roadX(3);
    state.player.y = roadY(1);
    state.player.angle = 0;
    for (let i = 0; i < 5 / STEP; i += 1) {
      walkEast(input, state);
      stepGame(state, input, STEP, null);
    }
    return { state, screen: SCREEN_PLAY };
  }

  if (name === 'chase') {
    // Rook in a Gull GT on the Palmetto Heights road, three Interceptors on
    // his tail, three stars, four seconds driving east.
    const car = createCar('Gull GT', roadX(2), roadY(1), 0, 'parked');
    car.driven = true;
    state.cars.push(car);
    state.player.inCar = car;
    state.player.x = car.x;
    state.player.y = car.y;
    state.player.angle = 0;
    state.wanted = 3;
    state.lastCrimeAt = state.clock;
    for (let i = 0; i < 3; i += 1) {
      const cop = createCar('Interceptor', roadX(2) - 130 - i * 70, roadY(1) + (i - 1) * 26, 0, 'police');
      cop.speed = 330;
      cop.ramCd = 0;
      cop.bustCd = 0;
      state.cars.push(cop);
      state.cops.push(cop);
    }
    for (let i = 0; i < 4 / STEP; i += 1) {
      driveEast(input, state);
      stepGame(state, input, STEP, null);
    }
    return { state, screen: SCREEN_PLAY };
  }

  // Mission: the Hot Delivery's second leg — the Comet driving south toward
  // Dune Strip with 68 seconds on the clock, three and a half seconds in.
  const mission = startMission(state, 1);
  mission.step = 1;
  mission.timer = 71.4; // 68 on the clock after the 3.5 s of driving below
  // Clear the southbound corridor first: a staged shot should not start with
  // the Comet wedged against a traffic car that happened to be on this road,
  // or running down a pedestrian strolling across it.
  const corridorX = roadX(6);
  state.cars = state.cars.filter((c) => !(Math.abs(c.x - corridorX) < 70 && c.y > roadY(2) - 80 && c.y < 2050));
  state.peds = state.peds.filter((p) => !(Math.abs(p.x - corridorX) < 90 && p.y > roadY(2) - 80 && p.y < 2050));
  const car = createCar('Comet', corridorX, roadY(2), Math.PI / 2, 'parked');
  car.driven = true;
  state.cars.push(car);
  state.player.inCar = car;
  state.player.x = car.x;
  state.player.y = car.y;
  state.player.angle = Math.PI / 2;
  state.player.hp = 86;
  state.money = 250;
  state.ammo = 18;
  for (let i = 0; i < 3.5 / STEP; i += 1) {
    steerToward(input, state, roadX(6), 1980);
    stepGame(state, input, STEP, null);
  }
  return { state, screen: SCREEN_PLAY };
}

/** Probing values for a shot: money, health, wanted, car and position. */
export function shotDebug(state) {
  const player = state.player;
  return {
    money: Math.floor(state.money),
    health: Math.round(player.hp),
    wanted: state.wanted,
    inCar: player.inCar ? player.inCar.model : null,
    carHp: player.inCar ? Math.round(player.inCar.hp) : null,
    x: Math.round(player.x),
    y: Math.round(player.y),
    cops: state.cops.filter((c) => c.kind === 'police').length,
  };
}
