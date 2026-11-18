// Input: held keys give a movement vector, one-shot presses queue as bit flags
// that the loop takes once, and the mouse aims. The screenshot scenes drive the
// same interface with a scripted stand-in, so the game never knows the difference.

export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_ENTER = 4;
export const ACTION_PUNCH = 8;
export const ACTION_BUY = 16;
export const ACTION_NEW = 32;

const UP = new Set(['KeyW', 'ArrowUp']);
const DOWN = new Set(['KeyS', 'ArrowDown']);
const LEFT = new Set(['KeyA', 'ArrowLeft']);
const RIGHT = new Set(['KeyD', 'ArrowRight']);
const CONFIRM = new Set(['Enter', 'Space']);
const PAUSE = new Set(['KeyP', 'Escape']);

/** Live keyboard + mouse input on a canvas. */
export function createInput(canvas) {
  const keys = new Set();
  let actions = 0;
  const aim = { x: 0, y: 0 };
  let mouseX = 0;
  let mouseY = 0;
  let shootHeld = false;

  window.addEventListener('keydown', (event) => {
    if (UP.has(event.code) || DOWN.has(event.code) || LEFT.has(event.code) || RIGHT.has(event.code)) {
      keys.add(event.code);
      event.preventDefault();
    } else if (CONFIRM.has(event.code)) {
      if (!event.repeat) actions |= ACTION_CONFIRM;
      event.preventDefault();
    } else if (PAUSE.has(event.code)) {
      if (!event.repeat) actions |= ACTION_PAUSE;
      event.preventDefault();
    } else if (event.code === 'KeyE') {
      if (!event.repeat) actions |= ACTION_ENTER;
    } else if (event.code === 'KeyF') {
      if (!event.repeat) actions |= ACTION_PUNCH;
    } else if (event.code === 'KeyR') {
      if (!event.repeat) actions |= ACTION_BUY;
    } else if (event.code === 'KeyN') {
      if (!event.repeat) actions |= ACTION_NEW;
    } else if (event.code === 'KeyK') {
      // K fires the pistol, held like the mouse button.
      shootHeld = true;
    }
  });
  window.addEventListener('keyup', (event) => {
    keys.delete(event.code);
    if (event.code === 'KeyK') shootHeld = false;
  });
  window.addEventListener('blur', () => {
    keys.clear();
    shootHeld = false;
  });
  canvas.addEventListener('pointermove', (event) => {
    mouseX = event.clientX;
    mouseY = event.clientY;
  });
  canvas.addEventListener('pointerdown', (event) => {
    mouseX = event.clientX;
    mouseY = event.clientY;
    if (event.button === 0) {
      shootHeld = true;
      actions |= ACTION_CONFIRM;
    }
  });
  window.addEventListener('pointerup', () => {
    shootHeld = false;
  });

  return {
    /** Normalised movement vector: x right, y down (W is y -1). */
    move() {
      let x = 0;
      let y = 0;
      for (const code of keys) {
        if (LEFT.has(code)) x -= 1;
        else if (RIGHT.has(code)) x += 1;
        else if (UP.has(code)) y -= 1;
        else if (DOWN.has(code)) y += 1;
      }
      if (x !== 0 && y !== 0) {
        const len = Math.hypot(x, y);
        x /= len;
        y /= len;
      }
      return { x, y };
    },
    /** World point the mouse is aiming at (set by the loop from the camera). */
    aim,
    /** Screen position of the mouse, for the loop to turn into a world aim. */
    mouse() {
      return { x: mouseX, y: mouseY };
    },
    get shootHeld() {
      return shootHeld;
    },
    setAim(x, y) {
      aim.x = x;
      aim.y = y;
    },
    /** The one-shot presses since the last call, as ACTION_* flags. */
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
  };
}

/** Scripted input for the screenshot scenes: the autopilot sets it every step. */
export function createScriptedInput() {
  let mx = 0;
  let my = 0;
  let actions = 0;
  const aim = { x: 0, y: 0 };
  let shootHeld = false;

  return {
    move() {
      return { x: mx, y: my };
    },
    aim,
    mouse() {
      return { x: 0, y: 0 };
    },
    get shootHeld() {
      return shootHeld;
    },
    setAim(x, y) {
      aim.x = x;
      aim.y = y;
    },
    setMove(x, y) {
      mx = x;
      my = y;
    },
    setShoot(value) {
      shootHeld = value;
    },
    press(flag) {
      actions |= flag;
    },
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
  };
}
