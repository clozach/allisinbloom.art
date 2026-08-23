// platform.js — who gets which layer of the signature nav. Every function
// here touches `window`/`navigator`, so call them only from onMount (SSR is
// on). Desktop = a fine pointer that can hover; Mac = the only platform whose
// keyboard has a ⌃ key worth advertising (iPad Safari spoofs MacIntel but
// reports touch points, so it is excluded).

const DESKTOP_QUERY = '(hover: hover) and (pointer: fine)';
const REDUCE_QUERY = '(prefers-reduced-motion: reduce)';

/** @param {string} q */
const mq = (q) => (typeof window !== 'undefined' && window.matchMedia ? window.matchMedia(q) : null);

/** A mouse-class pointer that can hover. */
export const isDesktop = () => !!mq(DESKTOP_QUERY)?.matches;

/** The visitor asked for less motion. */
export const prefersReducedMotion = () => !!mq(REDUCE_QUERY)?.matches;

/** macOS with a physical keyboard (no touch points). */
export function isMac() {
  if (typeof navigator === 'undefined') return false;
  const n = /** @type {any} */ (navigator);
  const platform = n.userAgentData?.platform === 'macOS' || n.platform === 'MacIntel';
  return platform && (n.maxTouchPoints || 0) === 0;
}

/**
 * Live-subscribe to a media query; `fn` runs with the current value at once
 * and again on every change. Returns the unsubscribe.
 * @param {string} query @param {(matches: boolean) => void} fn
 */
export function subscribeMedia(query, fn) {
  const m = mq(query);
  if (!m) {
    fn(false);
    return () => {};
  }
  const onChange = () => fn(m.matches);
  fn(m.matches);
  m.addEventListener?.('change', onChange);
  return () => m.removeEventListener?.('change', onChange);
}

/** @param {(matches: boolean) => void} fn */
export const subscribeDesktop = (fn) => subscribeMedia(DESKTOP_QUERY, fn);

/** @param {(matches: boolean) => void} fn */
export const subscribeReducedMotion = (fn) => subscribeMedia(REDUCE_QUERY, fn);
