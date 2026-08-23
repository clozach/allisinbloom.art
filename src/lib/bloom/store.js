// Per-poem persistence for the bloom: the first render of a poem rolls a
// seed, generates its tune, and stores both under `bloom-page-v1:<slug>`, so
// the same visitor sees the same blot every time they return to that poem.
// Edits and dice rolls live in a `current` layer beside the seed; "revert"
// drops that layer. A test pins a page by storing `{ seed }` alone.
//
// Visibility lives apart, site-wide: `bloom-prefs-v1` = { shaderOn, animate }.
import { generateTune, randomSeed } from './generate.js';

export const PREFS_KEY = 'bloom-prefs-v1';
const LEGACY_KEY = 'bloom-tune-v1'; // pre-2026-08-23 single global blob

export const PREFS_DEFAULTS = { shaderOn: true, animate: false };

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

/** Motion-only knobs — the "animate" dice rerolls just these. */
export const MOTION_KEYS = ['speed', 'doubling'];

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
 * Dice: reroll one subset of knobs into the current layer, leaving the rest
 * (and the page's default seed) untouched.
 * @param {string} slug @param {Record<string, any>} tune
 * @param {'motion' | 'still'} part
 */
export function rollPart(slug, tune, part) {
  const rolled = generateTune(randomSeed());
  const next = { ...tune };
  for (const k of Object.keys(rolled)) {
    const isMotion = MOTION_KEYS.includes(k);
    if ((part === 'motion') === isMotion) next[k] = rolled[k];
  }
  savePage(slug, next);
  return next;
}
