// Per-poem persistence for the bloom: the first render of a poem rolls a
// seed, generates its tune, and stores both under `bloom-page-v1:<slug>`, so
// the same visitor sees the same blot every time they return to that poem.
// Tweaks overwrite the stored values; "reroll" replaces the seed — both
// scoped to one page. A test pins a seed by storing `{ seed }` alone.
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

/**
 * The page's seed + tune, rolling and persisting a fresh one on first visit.
 * Stored keys win over generated ones, so a tweak survives reloads and a
 * stored `{ seed }` alone reproduces the full generated tune.
 * @param {string} slug
 */
export function loadPage(slug) {
  const stored = readJSON(pageKey(slug));
  const fresh = typeof stored.seed !== 'number';
  const seed = fresh ? randomSeed() : stored.seed >>> 0;
  const tune = { ...generateTune(seed), ...stored, seed };
  if (fresh) savePage(slug, tune);
  return tune;
}

/** @param {string} slug @param {Record<string, any>} tune (includes `seed`) */
export function savePage(slug, tune) {
  if (hasStorage()) localStorage.setItem(pageKey(slug), JSON.stringify(tune));
}

/** A new blot for this page only. @param {string} slug */
export function rerollPage(slug) {
  const seed = randomSeed();
  const tune = { ...generateTune(seed), seed };
  savePage(slug, tune);
  return tune;
}
