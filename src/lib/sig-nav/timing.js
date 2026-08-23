// timing.js — every beat of the signature nav in one place, plus the test
// hook that freezes it. The orchestrator schedules phases with TIMERS from
// this table (scaled); it never waits on animationend/transitionend, which do
// not fire at 0 s or under reduced motion.

export const TIMINGS = {
  badgeFade: 350, // ⌃ badge opacity 0 → 1
  bloomStartDelay: 350, // first calla frame starts this long after the trigger
  frameBeat: 850, // a new frame every beat
  frameFade: 1000, // each frame cross-fades in over this long
  frames: 7, // cumulative frames in CALLA
  flyIn: 1200, // hoverfly flight to the bloom
  letterStagger: 90, // Gilliam drop: per-letter offset
  letterDrop: 420, // Gilliam drop: one letter's fall
  hintFade: 3000, // ⌃h keycap fades this long AFTER you leave the word
  hintDelay: 0,
  phoneSpeed: 2.5, // both phases chained at this multiplier on coarse pointers
  swayPeriod: 6000 // one full ±2.5° sway of the bloom
};

/** Total hover-phase length (trigger → last frame fully in). */
export const bloomLength = (t = TIMINGS) =>
  t.bloomStartDelay + (t.frames - 1) * t.frameBeat + t.frameFade;

/** Total click-phase length (trigger → fly landed and every letter at rest). */
export const labelLength = (t = TIMINGS, letters = 4) =>
  Math.max(t.flyIn, (letters - 1) * t.letterStagger + t.letterDrop);

/**
 * A duration at a speed multiplier: 2.5 runs 2.5× faster, 1 is real time,
 * 0 (instant) collapses every duration to 0.
 * @param {number} t ms @param {number} speed
 */
export function scaled(t, speed = 1) {
  if (!(speed > 0)) return 0;
  return Math.round(t / speed);
}

export const TEST_KEY = 'sig-nav-test';

/**
 * Determinism hook, mirroring the shader's `bloom-prefs-v1` pattern:
 * `localStorage['sig-nav-test'] = '{"seed":11,"speed":0}'` pins the placement
 * PRNG and the speed multiplier (0 = instant). Absent or malformed → null.
 * @returns {{ seed?: number, speed?: number } | null}
 */
export function testHook() {
  if (typeof window === 'undefined' || !window.localStorage) return null;
  try {
    const v = JSON.parse(localStorage.getItem(TEST_KEY) || 'null');
    if (!v || typeof v !== 'object') return null;
    /** @type {{ seed?: number, speed?: number }} */
    const out = {};
    if (typeof v.seed === 'number') out.seed = v.seed >>> 0;
    if (typeof v.speed === 'number' && v.speed >= 0) out.speed = v.speed;
    return out;
  } catch {
    return null;
  }
}

/** A fresh 32-bit placement seed (the hook's `seed` overrides it). */
export const randomSeed = () => (Math.random() * 2 ** 32) >>> 0;
