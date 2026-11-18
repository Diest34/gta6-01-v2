// Boot and the one loop: input is read every frame, the world advances in fixed
// 1/60 s steps, and the renderer paints what is there. Screens: title, play,
// paused and wasted. The title lists Sable's five jobs with done / current
// markers, and offers Continue when a save exists.
//
// ?seed=N fixes the city's random layout. ?shot=start|play|chase|mission (with
// &seed=N) stages that scene instead of running the loop, paints it twice and
// sets window.__shotReady for a screenshot.
import { STEP } from './config.js';
import { createGame, stepAmbient, stepGame, EVENT_BUSTED, EVENT_DEAD, EVENT_MISSION_DONE } from './game.js';
import { ACTION_CONFIRM, ACTION_NEW, ACTION_PAUSE, createInput } from './input.js';
import { createRenderer, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE } from './render.js';
import { createAudio } from './audio.js';
import { applySave, clearSave, loadGame, saveGame } from './save.js';
import { shotDebug, stageShot } from './shots.js';

/** The longest frame the loop catches up on; a longer stall is dropped. */
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const audio = createAudio();

/** Turn the mouse's screen position into the world point it aims at. */
function aimFromMouse(input, renderer) {
  const mouse = input.mouse();
  const view = renderer.view;
  const camera = renderer.camera;
  const lx = (mouse.x - view.ox) / view.scale;
  const ly = (mouse.y - view.oy) / view.scale;
  input.setAim(camera.x + lx, camera.y + ly);
}

function runShot(name) {
  const { state, screen } = stageShot(name, seed);
  const renderer = createRenderer(canvas);
  window.__shotDebug = shotDebug(state);
  let painted = 0;
  function paint() {
    renderer.draw(state, screen, { hasSave: false });
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  const renderer = createRenderer(canvas);
  let state = createGame(seed);
  let screen = SCREEN_TITLE;
  let saved = loadGame();
  let accumulator = 0;
  let last = performance.now();

  function announce(message) {
    status.textContent = message;
  }

  function startFresh() {
    clearSave();
    state = createGame(seed);
    saved = null;
    screen = SCREEN_PLAY;
    announce('Sunset Keys. First job: First Fare at Coral Market.');
  }

  function startContinued() {
    const data = loadGame();
    state = createGame(seed);
    if (data) applySave(state, data);
    saved = data;
    screen = SCREEN_PLAY;
    announce('Continued. Sable is waiting.');
  }

  function startPlaying() {
    state = createGame(seed);
    screen = SCREEN_PLAY;
    announce('Sunset Keys. First job: First Fare at Coral Market.');
  }

  function pauseGame() {
    screen = SCREEN_PAUSED;
    saveGame(state);
    announce('Paused. Run saved.');
  }

  function resumeGame() {
    screen = SCREEN_PLAY;
    announce('Playing.');
  }

  function wasteGame() {
    screen = SCREEN_OVER;
    announce('Wasted. Rook wakes up at Harbor Clinic.');
  }

  function handleActions() {
    const actions = input.takeActions();
    if (screen === SCREEN_TITLE) {
      if (actions & ACTION_CONFIRM) {
        audio.unlock();
        if (saved) startContinued();
        else startPlaying();
      } else if (actions & ACTION_NEW) {
        audio.unlock();
        startFresh();
      }
      return;
    }
    if (screen === SCREEN_OVER) {
      if (actions & ACTION_CONFIRM) {
        const clinic = state.city.landmarks.clinic;
        state.player.x = clinic.x;
        state.player.y = clinic.y + 90;
        state.player.hp = 100;
        state.money = Math.floor(state.money * 0.9);
        state.wanted = 0;
        screen = SCREEN_PLAY;
        announce('Back on the streets.');
      }
      return;
    }
    if (actions & ACTION_PAUSE) {
      if (screen === SCREEN_PLAY) pauseGame();
      else if (screen === SCREEN_PAUSED) resumeGame();
    }
  }

  function step() {
    aimFromMouse(input, renderer);
    if (screen === SCREEN_TITLE) {
      stepAmbient(state, STEP);
      return;
    }
    if (screen !== SCREEN_PLAY) return;
    const flags = stepGame(state, input, STEP, audio);
    if (flags & EVENT_MISSION_DONE) saveGame(state);
    if (flags & EVENT_BUSTED) saveGame(state);
    if (flags & EVENT_DEAD) wasteGame();
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    handleActions();
    while (accumulator >= STEP && (screen === SCREEN_TITLE || screen === SCREEN_PLAY)) {
      step();
      accumulator -= STEP;
    }
    if (screen !== SCREEN_TITLE && screen !== SCREEN_PLAY) accumulator = 0;
    renderer.draw(state, screen, { hasSave: !!saved });
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) pauseGame();
  });
  canvas.addEventListener('pointerdown', () => audio.unlock(), { once: true });

  announce('Sunset Keys. Press Enter or click to start.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
