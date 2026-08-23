// Seeded, a11y-checked bloom configurations — pure functions, no DOM.
//
// One 32-bit seed → one complete `tune` (every shader knob + both palettes).
// Same seed, same tune, on every machine: tests pin a seed and get the same
// pixels; real visitors get a fresh seed per poem (see store.js), so every
// page is its own hand-made blot. Palettes are searched, not trusted: each
// endpoint is nudged until it clears MIN_CONTRAST against that theme's ink.

/** WCAG floor every palette endpoint must clear against the page ink. */
export const MIN_CONTRAST = 4.5;

/** Page ink per theme — mirrors `--ink` in src/routes/+layout.svelte. */
export const INK = { light: '#533737', dark: hslToHex(9, 0.25, 0.86) };

// Generation ranges: deliberately narrower than the tuner's slider extents —
// every draw should look like *this* site, just never the same twice.
/** @type {Record<string, [number, number]>} */
const RANGES = {
  speed: [0.5, 2],
  doubling: [60, 240],
  zoom: [1.4, 3.2],
  unfold: [0.1, 0.6],
  churn: [0.05, 0.3],
  lw1: [0.03, 0.09],
  lw2: [0.02, 0.06],
  lv1: [0.35, 0.55],
  lv2: [0.55, 0.75],
  inkGain: [1.2, 2.6],
  inkFloor: [0.2, 0.6],
  annA: [0.15, 0.4],
  annB: [0.45, 0.9],
  core: [1.2, 3.5],
  originX: [0.3, 0.7],
  originY: [0.3, 0.6],
  phase: [0, 1], // the moment in the loop a still frame shows
};

/** mulberry32: tiny, fast, good-enough PRNG. @param {number} seed uint32 */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A fresh seed for a real visitor: crypto when available, Math.random otherwise. */
export function randomSeed() {
  const c = globalThis.crypto;
  if (c?.getRandomValues) return c.getRandomValues(new Uint32Array(1))[0];
  return Math.floor(Math.random() * 4294967296) >>> 0;
}

/**
 * @param {number} h degrees @param {number} s 0–1 @param {number} l 0–1
 * @returns {string} "#rrggbb"
 */
export function hslToHex(h, s, l) {
  const k = (/** @type {number} */ n) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (/** @type {number} */ n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const to = (/** @type {number} */ v) => Math.round(v * 255).toString(16).padStart(2, '0');
  return `#${to(f(0))}${to(f(8))}${to(f(4))}`;
}

/** @param {string} hex "#rrggbb" → relative luminance per WCAG 2.x */
export function luminance(hex) {
  const n = parseInt(hex.slice(1), 16);
  const ch = (/** @type {number} */ v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * ch((n >> 16) & 255) + 0.7152 * ch((n >> 8) & 255) + 0.0722 * ch(n & 255);
}

/** @param {string} a @param {string} b @returns {number} WCAG contrast ratio ≥ 1 */
export function contrast(a, b) {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/**
 * Nudge lightness (by `dir`, ±1) until the color clears MIN_CONTRAST vs ink.
 * @param {number} h @param {number} s @param {number} l @param {number} dir
 * @param {string} ink
 */
function passing(h, s, l, dir, ink) {
  let hex = hslToHex(h, s, l);
  let guard = 0;
  while (contrast(hex, ink) < MIN_CONTRAST && guard++ < 60) {
    l = Math.max(0, Math.min(1, l + dir * 0.015));
    hex = hslToHex(h, s, l);
  }
  // a saturated hue that still can't clear the floor loses chroma instead
  while (contrast(hex, ink) < MIN_CONTRAST && s > 0) {
    s = Math.max(0, s - 0.1);
    hex = hslToHex(h, s, l);
  }
  return hex;
}

/**
 * The whole tune for one seed: every knob inside RANGES, plus a light and a
 * dark palette whose four endpoints each clear MIN_CONTRAST against that
 * theme's ink. Deterministic: same seed → identical object.
 * @param {number} seed
 * @returns {Record<string, number | string>}
 */
export function generateTune(seed) {
  const rnd = mulberry32(seed);
  const between = (/** @type {[number, number]} */ [lo, hi]) => lo + rnd() * (hi - lo);
  /** @type {Record<string, number | string>} */
  const t = {};
  for (const [key, range] of Object.entries(RANGES)) {
    const v = between(range);
    t[key] = key === 'doubling' ? Math.round(v) : Math.round(v * 1000) / 1000;
  }

  // palettes: one base hue per poem; ground is a near-white / near-black
  // wash, lace drifts to an analogous or complementary hue
  const hue = rnd() * 360;
  const laceHue = (hue + (rnd() < 0.5 ? 30 + rnd() * 60 : 150 + rnd() * 60)) % 360;
  const wash = hue + (rnd() - 0.5) * 40;

  t.lightGroundA = passing(wash, 0.4 + rnd() * 0.5, 0.9 + rnd() * 0.06, +1, INK.light);
  t.lightGroundB = passing(hue, 0.3 + rnd() * 0.5, 0.84 + rnd() * 0.08, +1, INK.light);
  t.lightLaceA = passing(laceHue, 0.25 + rnd() * 0.4, 0.8 + rnd() * 0.1, +1, INK.light);
  t.lightLaceB = passing(laceHue, 0.25 + rnd() * 0.4, 0.62 + rnd() * 0.12, +1, INK.light);

  t.darkGroundA = passing(wash, 0.1 + rnd() * 0.25, 0.06 + rnd() * 0.04, -1, INK.dark);
  t.darkGroundB = passing(hue, 0.1 + rnd() * 0.3, 0.1 + rnd() * 0.05, -1, INK.dark);
  t.darkLaceA = passing(laceHue, 0.15 + rnd() * 0.3, 0.18 + rnd() * 0.06, -1, INK.dark);
  t.darkLaceB = passing(laceHue, 0.15 + rnd() * 0.35, 0.26 + rnd() * 0.08, -1, INK.dark);
  return t;
}

/** Keys whose palette must clear MIN_CONTRAST, by theme. */
export const PALETTE_KEYS = {
  light: ['lightGroundA', 'lightGroundB', 'lightLaceA', 'lightLaceB'],
  dark: ['darkGroundA', 'darkGroundB', 'darkLaceA', 'darkLaceB'],
};

/**
 * Lowest contrast any palette endpoint has against its theme's ink.
 * @param {Record<string, number | string>} tune
 */
export function minPaletteContrast(tune) {
  let m = Infinity;
  for (const [theme, keys] of Object.entries(PALETTE_KEYS)) {
    for (const k of keys) m = Math.min(m, contrast(String(tune[k]), INK[/** @type {'light'|'dark'} */ (theme)]));
  }
  return m;
}
