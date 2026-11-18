// The game itself: one state, one step. stepGame runs the whole world for a
// fixed tick — player, traffic, pedestrians, police, combat, missions — and
// turns raw events into toasts, cash, crime and saves.
import { COMBAT } from './config.js';
import { createRandom } from './random.js';
import { buildCity } from './city.js';
import { createPlayer, stepPlayer, tryEnterExitCar } from './player.js';
import { collideCars, spawnParked, spawnTraffic, stepPlayerCar, stepTraffic } from './cars.js';
import { spawnPeds, stepPeds } from './pedestrians.js';
import { addCrime, stepPolice } from './police.js';
import { stepCombat, tryPunch } from './combat.js';
import { startMission, stepMission } from './missions.js';
import { ACTION_BUY, ACTION_ENTER, ACTION_PUNCH } from './input.js';

export const EVENT_NONE = 0;
export const EVENT_MISSION_DONE = 1;
export const EVENT_BUSTED = 2;
export const EVENT_DEAD = 4;

/** A fresh run: city, Rook at the garage, parked rows, traffic, pedestrians. */
export function createGame(seed) {
  const rng = createRandom(seed);
  const city = buildCity(rng);
  const garage = city.landmarks.garage;
  const state = {
    seed,
    rng,
    city,
    clock: 0,
    player: createPlayer(garage.x, garage.y + 120),
    cars: [],
    peds: [],
    cops: [],
    bullets: [],
    enemies: [],
    money: 0,
    ammo: COMBAT.startAmmo,
    wanted: 0,
    lastCrimeAt: -999,
    missionIndex: 0,
    done: [false, false, false, false, false],
    mission: null,
    fare: null,
    marker: null,
    toasts: [],
    stats: { shots: 0, kills: 0, rams: 0 },
    events: [],
  };
  state.cars = [...spawnParked(city, rng), ...spawnTraffic(city, rng)];
  state.peds = spawnPeds(city, rng);
  return state;
}

/** Ambient life only, for the title screen: traffic and pedestrians move. */
export function stepAmbient(state, dt) {
  state.clock += dt;
  stepTraffic(state, dt);
  stepPeds(state, dt);
  for (const toast of state.toasts) toast.ttl -= dt;
  state.toasts = state.toasts.filter((t) => t.ttl > 0);
}

function pushToast(state, text, ttl) {
  state.toasts.push({ text, ttl: ttl || 3.2 });
  if (state.toasts.length > 3) state.toasts.shift();
}

/** Resolve the events a step produced: crime, cash, busts, deaths, mission ends. */
function resolveEvents(state, audio) {
  let flags = EVENT_NONE;
  for (const event of state.events) {
    if (event.type === 'crime') {
      addCrime(state, event.stars);
      pushToast(state, `${event.what} — wanted ${state.wanted}★`);
      flags |= 0;
    } else if (event.type === 'crash') {
      if (event.hard && audio) audio.crash();
    } else if (event.type === 'ram') {
      state.stats.rams += 1;
      if (state.mission && state.mission.index === 3 && state.mission.step === 0) {
        state.mission.data.rams += 1;
        pushToast(state, `Ram ${state.mission.data.rams}/3`);
      }
    } else if (event.type === 'shot') {
      if (audio) audio.shot();
    } else if (event.type === 'punch') {
      if (audio) audio.punch();
    } else if (event.type === 'cash') {
      pushToast(state, `${event.what} (+$${event.amount})`);
      if (audio) audio.cash();
    } else if (event.type === 'toast') {
      pushToast(state, event.text);
    } else if (event.type === 'mission-done') {
      pushToast(state, `${event.def.name} done — $${event.pay}`, 4);
      if (audio) audio.jingle();
      flags |= EVENT_MISSION_DONE;
    } else if (event.type === 'busted') {
      pushToast(state, `Busted — fined $${event.fine}`, 4);
      if (audio) audio.busted();
      flags |= EVENT_BUSTED;
      // A bust restarts the getaway job from its first step.
      if (state.mission && state.mission.index === 2) {
        state.mission = null;
        startMission(state, 2);
      }
    } else if (event.type === 'dead') {
      flags |= EVENT_DEAD;
    } else if (event.type === 'hurt') {
      if (audio) audio.punch();
    } else if (event.type === 'car-wrecked') {
      const car = event.car;
      if (state.player.inCar === car) {
        state.player.inCar = null;
        car.driven = false;
        car.kind = 'wreck';
        pushToast(state, 'Your car is wrecked');
      }
    } else if (event.type === 'enemy-down') {
      if (audio) audio.crash();
    } else if (event.type === 'wanted-down') {
      pushToast(state, `Wanted down to ${event.stars}★`);
    } else if (event.type === 'enter-car') {
      if (audio) audio.pickup();
    }
  }
  state.events.length = 0;
  return flags;
}

/**
 * One fixed step of the whole game. `audio` may be null (headless shots).
 * Returns EVENT_* flags for the loop to react to.
 */
export function stepGame(state, input, dt, audio) {
  state.clock += dt;
  const actions = input.takeActions();
  if (actions & ACTION_ENTER) tryEnterExitCar(state); // E: in / out of a car
  if (actions & ACTION_PUNCH) tryPunch(state); // F: punch
  if (actions & ACTION_BUY) {
    // R buys 12 rounds for $10.
    if (state.money >= 10 && state.ammo < COMBAT.maxAmmo) {
      state.money -= 10;
      state.ammo = Math.min(COMBAT.maxAmmo, state.ammo + COMBAT.ammoPack);
      pushToast(state, `Bought ${COMBAT.ammoPack} rounds — $10`);
      if (audio) audio.pickup();
    }
  }

  stepPlayer(state, input, dt);
  if (state.player.inCar) stepPlayerCar(state, input, dt);
  stepTraffic(state, dt);
  collideCars(state);
  stepPeds(state, dt);
  stepPolice(state, dt);
  stepCombat(state, input, dt);
  stepMission(state, dt);

  // A wrecked car throws Rook out on foot.
  if (state.player.inCar && state.player.inCar.hp <= 0) {
    const car = state.player.inCar;
    state.player.inCar = null;
    car.driven = false;
    car.kind = 'wreck';
    state.events.push({ type: 'toast', text: 'Your car is wrecked' });
  }

  for (const toast of state.toasts) toast.ttl -= dt;
  state.toasts = state.toasts.filter((t) => t.ttl > 0);

  const flags = resolveEvents(state, audio);
  if (audio) {
    const car = state.player.inCar;
    audio.update(dt, {
      inCar: !!car,
      speed01: car ? Math.min(1, Math.abs(car.speed) / 420) : 0,
      wanted: state.wanted,
    });
  }
  return flags;
}
