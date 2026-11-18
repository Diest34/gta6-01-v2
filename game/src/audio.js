// Sound, synthesised with WebAudio only — no audio files, no network.
// Everything is guarded: no AudioContext, no sound, no crash (headless shots run silent).

export function createAudio() {
  let ctx = null;
  let engineOsc = null;
  let engineGain = null;
  let sirenOsc = null;
  let sirenGain = null;
  let sirenHigh = false;
  let sirenFlipAt = 0;
  let started = false;

  function ensure() {
    if (ctx) return true;
    try {
      const Ctor = window.AudioContext || window.webkitAudioContext;
      if (!Ctor) return false;
      ctx = new Ctor();
      started = true;
      return true;
    } catch {
      return false;
    }
  }

  /** Call from a user gesture: browsers only let audio start after one. */
  function unlock() {
    if (ensure() && ctx.state === 'suspended') ctx.resume().catch(() => {});
  }

  function blip(freq, dur, type, vol, slideTo) {
    if (!ensure()) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type || 'square';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, ctx.currentTime + dur);
      gain.gain.setValueAtTime(vol || 0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
      osc.connect(gain).connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + dur);
    } catch {
      // Audio is decoration; a failure never stops the game.
    }
  }

  function noise(dur, vol, lowpass) {
    if (!ensure()) return;
    try {
      const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
      const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = lowpass || 1200;
      const gain = ctx.createGain();
      gain.gain.value = vol || 0.12;
      src.connect(filter).connect(gain).connect(ctx.destination);
      src.start();
    } catch {
      // Ignore.
    }
  }

  return {
    unlock,
    /** Engine hum follows speed (0..1); the siren wails while wanted. */
    update(dt, info) {
      if (!started || !ctx) return;
      try {
        if (info.inCar && info.speed01 > 0.02) {
          if (!engineOsc) {
            engineOsc = ctx.createOscillator();
            engineGain = ctx.createGain();
            engineOsc.type = 'sawtooth';
            engineGain.gain.value = 0;
            engineOsc.connect(engineGain).connect(ctx.destination);
            engineOsc.start();
          }
          engineOsc.frequency.setValueAtTime(55 + info.speed01 * 130, ctx.currentTime);
          engineGain.gain.setTargetAtTime(0.03 + info.speed01 * 0.035, ctx.currentTime, 0.08);
        } else if (engineGain) {
          engineGain.gain.setTargetAtTime(0, ctx.currentTime, 0.08);
        }
        if (info.wanted > 0) {
          if (!sirenOsc) {
            sirenOsc = ctx.createOscillator();
            sirenGain = ctx.createGain();
            sirenOsc.type = 'sine';
            sirenGain.gain.value = 0.028;
            sirenOsc.connect(sirenGain).connect(ctx.destination);
            sirenOsc.start();
          }
          if (ctx.currentTime >= sirenFlipAt) {
            sirenHigh = !sirenHigh;
            sirenFlipAt = ctx.currentTime + 0.42;
            sirenOsc.frequency.setValueAtTime(sirenHigh ? 920 : 660, ctx.currentTime);
          }
        } else if (sirenGain) {
          sirenGain.gain.setTargetAtTime(0, ctx.currentTime, 0.1);
        }
      } catch {
        // Ignore.
      }
    },
    shot() {
      noise(0.09, 0.16, 2600);
      blip(220, 0.07, 'square', 0.05, 70);
    },
    punch() {
      noise(0.07, 0.12, 700);
    },
    crash() {
      noise(0.22, 0.2, 500);
      blip(90, 0.18, 'sawtooth', 0.08, 45);
    },
    pickup() {
      blip(660, 0.09, 'sine', 0.09, 990);
    },
    cash() {
      blip(880, 0.1, 'sine', 0.09);
      setTimeout(() => blip(1318, 0.14, 'sine', 0.09), 90);
    },
    jingle() {
      const notes = [523, 659, 784, 1046];
      notes.forEach((freq, i) => setTimeout(() => blip(freq, 0.16, 'triangle', 0.09), i * 110));
    },
    busted() {
      blip(392, 0.18, 'sawtooth', 0.08, 311);
      setTimeout(() => blip(311, 0.25, 'sawtooth', 0.08, 233), 160);
    },
  };
}
