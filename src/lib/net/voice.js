// The picture, described for a visitor who will hear it rather than see it, in the
// voice of a British aristocrat turned documentarian: the one who narrates the
// copulation of wildebeests and the orcas toying with seal pups in the breaking
// surf. Deterministic: the same picture is always described the same way.
import { mulberry32 } from '../bloom/generate.js';

/** @param {string} hex "#rrggbb" → a plain colour word */
export function hueName(hex) {
  const n = parseInt(hex.slice(1), 16);
  const r = ((n >> 16) & 255) / 255;
  const g = ((n >> 8) & 255) / 255;
  const b = (n & 255) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  if (d < 0.04) return l > 0.85 ? 'pearl' : l > 0.5 ? 'dove grey' : l > 0.2 ? 'slate' : 'soot';
  let h = 0;
  if (max === r) h = ((g - b) / d) % 6;
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  h = ((h * 60) + 360) % 360;
  const dark = l < 0.35;
  if (h < 15 || h >= 345) return dark ? 'oxblood' : 'rose';
  if (h < 45) return dark ? 'umber' : 'apricot';
  if (h < 70) return dark ? 'olive' : 'straw';
  if (h < 160) return dark ? 'moss' : 'celadon';
  if (h < 200) return dark ? 'deep teal' : 'teal';
  if (h < 250) return dark ? 'indigo' : 'cornflower';
  if (h < 290) return dark ? 'plum' : 'lilac';
  if (h < 345) return dark ? 'mulberry' : 'mauve';
  return 'rose';
}

const OPENINGS = [
  'Here, at the very edge of the network, something is stirring.',
  'Dawn, or what passes for it on a screen, and the bloom has already begun.',
  'We have waited a long time for this. The lace does not hurry for anyone.',
  'Observe, if you will, and keep perfectly still.',
  'It is a rare privilege to witness this at all.'
];
const CLOSINGS = [
  'The orcas, one imagines, would approve.',
  'Not a wildebeest in sight, and yet the effect is much the same.',
  'We shall leave them to it.',
  'And then, as suddenly as it began, it is over. Until tomorrow.',
  'Extraordinary. Quite, quite extraordinary.'
];

/**
 * @param {Record<string, number | string>} tune the picture's bloom values
 * @param {{ city: string, country?: string } | null} place
 * @param {string} day from dayKey
 * @param {boolean} dark the palette on show
 */
export function describePicture(tune, place, day, dark) {
  const rnd = mulberry32(Number(tune.seed ?? 0) ^ 0x5eed);
  const pick = (/** @type {string[]} */ list) => list[Math.floor(rnd() * list.length)];
  const lace = hueName(String(dark ? tune.darkLaceB : tune.lightLaceB));
  const ground = hueName(String(dark ? tune.darkGroundA : tune.lightGroundA));
  const dense = Number(tune.inkGain) > 2 ? 'dense' : Number(tune.inkGain) < 1.6 ? 'sparse' : 'unhurried';
  const temper = Number(tune.churn) > 0.2 ? 'restless' : Number(tune.churn) < 0.12 ? 'placid' : 'patient';
  const distance = Number(tune.zoom) > 2.5 ? 'seen from a great height' : Number(tune.zoom) < 1.8 ? 'at the closest of quarters' : 'at a respectful distance';
  const where = place ? `${place.city}${place.country ? ', ' + place.country : ''}` : 'an undisclosed location';
  const date = new Date(`${day}T12:00:00`);
  const when = Number.isNaN(date.getTime()) ? day : date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  return [
    `${where}, ${when}.`,
    pick(OPENINGS),
    `A ${dense} lace of ${lace} unfolds across a ${ground} ground, ${temper} as it goes, ${distance}: six layers of contour, each born as a hairline and dissolving, in time, into a broad band.`,
    `Every line, watched long enough, divides into finer lines. It has been doing this since before we arrived and will continue long after we have gone.`,
    pick(CLOSINGS)
  ].join(' ');
}
