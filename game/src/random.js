// A small seeded generator (mulberry32) plus the few helpers the game needs.
// The same seed always builds the same city and the same screenshot scenes.

export function createRandom(seed) {
  let state = (seed >>> 0) || 1;
  return function random() {
    state = (state + 0x6d2b79f5) | 0;
    let mixed = Math.imul(state ^ (state >>> 15), 1 | state);
    mixed = (mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed)) ^ mixed;
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };
}

/** A float in [low, high). */
export function range(rng, low, high) {
  return low + rng() * (high - low);
}

/** An integer in [low, high] inclusive. */
export function int(rng, low, high) {
  return low + Math.floor(rng() * (high - low + 1));
}

/** One element of an array, uniformly. */
export function pick(rng, items) {
  return items[Math.floor(rng() * items.length)];
}

/** Fisher-Yates shuffle, in place, driven by the seeded rng. */
export function shuffle(rng, items) {
  for (let i = items.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = items[i];
    items[i] = items[j];
    items[j] = tmp;
  }
  return items;
}
