// How long a poem is given before the page offers anything else, and how long the
// picture then takes: the pacing of a poem page, in one place.
//
// The reading time leans toward the slow, careful reader: the words divided by a
// reading rate two standard deviations below the mean. Brysbaert (2019, Journal of
// Memory and Language, "How many words do we read per minute?") puts silent adult
// reading of English non-fiction at a mean of 238 words per minute; the spread
// between readers is taken as 50 wpm, so the rate used is 138 wpm. The mean is the
// anchor rather than the median because the standard deviation is defined around
// it; a poem also pays a pause for every line break, since verse is read line by
// line. The numbers are site-wide preferences the bloom tuner can change.

export const PACE_KEY = 'net-pace-v1';

/** @typedef {{ wpmMean: number, wpmSd: number, sdBelow: number, linePauseMs: number, floorMs: number, waitMs: number, waitJitterMs: number }} Pace */

/** @type {Pace} */
export const DEFAULT_PACE = {
  wpmMean: 238,
  wpmSd: 50,
  sdBelow: 2,
  linePauseMs: 500,
  floorMs: 8000,
  waitMs: 90000,
  waitJitterMs: 12000
};

/** Words per minute for the slow reader the page waits for. @param {Pace} pace */
export function slowWpm(pace) {
  return Math.max(20, pace.wpmMean - pace.sdBelow * pace.wpmSd);
}

/**
 * Milliseconds a poem is given before the page offers anything else.
 * @param {{ words: number, lines: number }} text @param {Pace} [pace]
 */
export function readingTime({ words, lines }, pace = DEFAULT_PACE) {
  const ms = (words / slowWpm(pace)) * 60000 + lines * pace.linePauseMs;
  return Math.round(Math.max(pace.floorMs, ms));
}

/**
 * The words and lines of a poem's text as rendered.
 * @param {string} text textContent of the title and the body
 */
export function measureText(text) {
  const words = (text.match(/[\p{L}\p{N}][\p{L}\p{N}'’\-]*/gu) || []).length;
  const lines = text.split('\n').filter((l) => l.trim()).length;
  return { words, lines };
}

/**
 * About ninety seconds, never exactly: the base plus a random offset of at least a
 * second either way.
 * @param {Pace} [pace] @param {() => number} [rnd]
 */
export function jitteredWait(pace = DEFAULT_PACE, rnd = Math.random) {
  const j = Math.max(1000, pace.waitJitterMs);
  let off = 0;
  for (let i = 0; i < 20 && Math.abs(off) < 1000; i++) off = Math.round((rnd() * 2 - 1) * j);
  if (Math.abs(off) < 1000) off = 1000;
  return pace.waitMs + off;
}

/** "about 90 seconds", for the message, from the actual wait. @param {Pace} pace */
export function aboutWait(pace) {
  const s = pace.waitMs / 1000;
  if (s < 90) return `about ${Math.round(s / 5) * 5 || 5} seconds`;
  if (s < 120) return 'about 90 seconds';
  const m = Math.round(s / 60);
  return `about ${m} minute${m === 1 ? '' : 's'}`;
}

const hasStorage = () => typeof window !== 'undefined' && !!window.localStorage;

/** The site-wide pace, with the tuner's changes if any. @returns {Pace} */
export function loadPace() {
  if (!hasStorage()) return { ...DEFAULT_PACE };
  try {
    const v = JSON.parse(localStorage.getItem(PACE_KEY) || '{}');
    /** @type {Pace} */
    const pace = { ...DEFAULT_PACE };
    for (const k of /** @type {(keyof Pace)[]} */ (Object.keys(DEFAULT_PACE))) {
      if (typeof v?.[k] === 'number' && Number.isFinite(v[k])) pace[k] = v[k];
    }
    return pace;
  } catch {
    return { ...DEFAULT_PACE };
  }
}

/** @param {Pace} pace */
export function savePace(pace) {
  if (hasStorage()) localStorage.setItem(PACE_KEY, JSON.stringify(pace));
}

export function resetPace() {
  if (hasStorage()) localStorage.removeItem(PACE_KEY);
  return { ...DEFAULT_PACE };
}

/** The record of poems read to the end while the page was in view. */
export const READ_KEY = 'net-read-v1';

/** @returns {Record<string, string>} slug → the day the reading time elapsed */
export function loadRead() {
  if (!hasStorage()) return {};
  try {
    const v = JSON.parse(localStorage.getItem(READ_KEY) || '{}');
    return v && typeof v === 'object' ? v : {};
  } catch {
    return {};
  }
}

/** @param {string} slug @param {string} day */
export function recordRead(slug, day) {
  if (!hasStorage()) return;
  const read = loadRead();
  if (!read[slug]) {
    read[slug] = day;
    localStorage.setItem(READ_KEY, JSON.stringify(read));
  }
}
