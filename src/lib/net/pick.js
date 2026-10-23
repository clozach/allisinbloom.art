// Which poem the Net offers, and which picture a day brings: deterministic picks, so
// everyone answered by the same node in the same minute is offered the same poem,
// and a region's picture of the day is the same for everyone there.

/** FNV-1a over a string's code points, as a uint32. @param {string} str */
export function fnv1a(str) {
  let h = 0x811c9dc5;
  for (const ch of str) {
    h ^= /** @type {number} */ (ch.codePointAt(0));
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

/** The UTC minute a moment falls in, e.g. "2026-10-23T18:40". @param {Date} d */
export const minuteKey = (d) => d.toISOString().slice(0, 16);

/** The reader's own calendar day, e.g. "2026-10-23" (local time, not UTC). @param {Date} d */
export function dayKey(d) {
  const p = (/** @type {number} */ n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/**
 * The poem for a node and a minute. Same inputs, same slug.
 * @param {string[]} slugs @param {string} node a node code, or any label for "nowhere"
 * @param {string} minute from minuteKey
 * @returns {string | null}
 */
export function pickPoem(slugs, node, minute) {
  if (!slugs.length) return null;
  return slugs[fnv1a(`${node}:${minute}`) % slugs.length];
}

/** The seed of a region's picture for one day. @param {string} node @param {string} day from dayKey */
export const pictureSeed = (node, day) => fnv1a(`picture:${node}:${day}`);
