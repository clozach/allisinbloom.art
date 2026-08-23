// Per-poem persistence for the bloom: the first render of a poem rolls a
// seed, generates its tune, and stores both under `bloom-page-v1:<slug>`, so
// the same visitor sees the same blot every time they return to that poem.
// Edits, die rolls and pasted sets live in a `current` layer beside the
// seed; "revert" drops that layer. A test pins a page by storing `{ seed }` alone.
//
// Visibility lives apart, site-wide: `bloom-prefs-v1` = { shaderOn, animate }.
import { generateTune, randomSeed } from './generate.js';

export const PREFS_KEY = 'bloom-prefs-v1';
const LEGACY_KEY = 'bloom-tune-v1'; // pre-2026-08-23 single global blob

export const PREFS_DEFAULTS = { shaderOn: false, animate: false };

/** @param {string} slug */
export const pageKey = (slug) => `bloom-page-v1:${slug}`;

const hasStorage = () => typeof window !== 'undefined' && !!window.localStorage;

/** @param {string} key @returns {Record<string, any>} */
function readJSON(key) {
  if (!hasStorage()) return {};
  try {
    const v = JSON.parse(localStorage.getItem(key) || '{}');
    return v && typeof v === 'object' ? v : {};
  } catch {
    return {};
  }
}

export function loadPrefs() {
  if (hasStorage()) localStorage.removeItem(LEGACY_KEY);
  return { ...PREFS_DEFAULTS, ...readJSON(PREFS_KEY) };
}

/** @param {{ shaderOn: boolean, animate: boolean }} prefs */
export function savePrefs(prefs) {
  if (hasStorage()) localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
}

/** @param {Record<string, any>} tune */
const stripSeed = ({ seed: _seed, ...rest }) => rest;

/**
 * The page's tune. Record shape: `{ seed, current? }` — `seed` is the
 * write-once default (rolled on first visit, regenerable, never rewritten
 * unless the visitor clears site data); `current` is the edited layer
 * (tweaks, dice rolls), absent until something changes. A stored `{ seed }`
 * alone therefore reproduces the generated tune.
 * @param {string} slug
 */
export function loadPage(slug) {
  const stored = readJSON(pageKey(slug));
  const fresh = typeof stored.seed !== 'number';
  const seed = fresh ? randomSeed() : stored.seed >>> 0;
  if (fresh) writeRecord(slug, seed, null);
  const current = stored.current && typeof stored.current === 'object' ? stored.current : null;
  return { ...generateTune(seed), ...(current || {}), seed };
}

/** @param {string} slug @param {number} seed @param {Record<string, any> | null} current */
function writeRecord(slug, seed, current) {
  if (!hasStorage()) return;
  localStorage.setItem(pageKey(slug), JSON.stringify(current ? { seed, current } : { seed }));
}

/** Persist an edit into the page's current layer. @param {string} slug @param {Record<string, any>} tune */
export function savePage(slug, tune) {
  writeRecord(slug, tune.seed, stripSeed(tune));
}

/** Drop the edited layer: back to the page's own generated default. @param {string} slug */
export function revertPage(slug) {
  const { seed } = loadPage(slug);
  writeRecord(slug, seed, null);
  return { ...generateTune(seed), seed };
}

/**
 * The die: a whole new blot (every knob + both palettes) into the page's
 * current layer. The default seed stays, so revert still works.
 * @param {string} slug @param {number} seed the page's default seed
 */
export function rollPage(slug, seed) {
  const next = { ...generateTune(randomSeed()), seed };
  savePage(slug, next);
  return next;
}

/** Every key a pasted set may carry (numbers + palette hexes) — no seed. */
export const TUNE_KEYS = Object.keys(generateTune(0));

/**
 * Paste: accept a set copied from another browser (or a friend's) and make
 * it this page's current values. Only known keys are taken; numbers must be
 * finite, colors must be #rrggbb; the pasted seed (if any) is ignored so
 * revert still returns to THIS page's own blot. Returns null when the text
 * isn't a bloom set at all.
 * @param {string} slug @param {Record<string, any>} tune @param {string} text
 */
export function pasteValues(slug, tune, text) {
  /** @type {any} */
  let obj;
  try {
    obj = JSON.parse(text);
  } catch {
    return null;
  }
  if (!obj || typeof obj !== 'object') return null;
  const next = { ...tune };
  let taken = 0;
  for (const k of TUNE_KEYS) {
    if (!(k in obj)) continue;
    const v = obj[k];
    const isColor = typeof tune[k] === 'string';
    if (isColor ? /^#[0-9a-f]{6}$/i.test(v) : typeof v === 'number' && Number.isFinite(v)) {
      next[k] = isColor ? v.toLowerCase() : v;
      taken++;
    }
  }
  if (!taken) return null;
  savePage(slug, next);
  return next;
}
