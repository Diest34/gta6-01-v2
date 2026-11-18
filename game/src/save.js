// Save / continue through localStorage. Only the run's own numbers are stored:
// money, health, ammo, mission progress, where Rook stands and the game clock.
import { SAVE_KEY } from './config.js';

export function saveGame(state) {
  try {
    const data = {
      version: 1,
      money: Math.floor(state.money),
      hp: Math.round(state.player.hp),
      ammo: state.ammo,
      missionIndex: state.missionIndex,
      done: state.done.slice(),
      px: Math.round(state.player.x),
      py: Math.round(state.player.y),
      clock: Math.round(state.clock),
      savedAt: Date.now(),
    };
    window.localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

export function loadGame() {
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || data.version !== 1) return null;
    return data;
  } catch {
    return null;
  }
}

export function clearSave() {
  try {
    window.localStorage.removeItem(SAVE_KEY);
  } catch {
    // Storage off: nothing to clear.
  }
}

/** Apply a loaded save to a fresh state (position, money, progress). */
export function applySave(state, data) {
  state.money = data.money || 0;
  state.player.hp = data.hp > 0 ? data.hp : 100;
  state.ammo = data.ammo || 0;
  state.missionIndex = data.missionIndex || 0;
  state.done = Array.isArray(data.done) && data.done.length === 5 ? data.done.slice() : [false, false, false, false, false];
  state.player.x = data.px || state.player.x;
  state.player.y = data.py || state.player.y;
  state.clock = data.clock || 0;
  state.player.inCar = null;
}
