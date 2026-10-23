// The Net's known nodes: Vercel's nineteen compute regions, the places a request
// to this site is answered from (https://vercel.com/docs/regions). The first
// segment of a request's x-vercel-id names the one that answered. Pure data and
// pure functions; no DOM, no server.

/** @typedef {{ code: string, city: string, country: string, lat: number, lon: number }} NetNode */

/** @type {NetNode[]} */
export const NODES = [
  { code: 'arn1', city: 'Stockholm', country: 'Sweden', lat: 59.33, lon: 18.07 },
  { code: 'bom1', city: 'Mumbai', country: 'India', lat: 19.08, lon: 72.88 },
  { code: 'cdg1', city: 'Paris', country: 'France', lat: 48.86, lon: 2.35 },
  { code: 'cle1', city: 'Cleveland', country: 'USA', lat: 41.5, lon: -81.69 },
  { code: 'cpt1', city: 'Cape Town', country: 'South Africa', lat: -33.93, lon: 18.42 },
  { code: 'dub1', city: 'Dublin', country: 'Ireland', lat: 53.35, lon: -6.26 },
  { code: 'fra1', city: 'Frankfurt', country: 'Germany', lat: 50.11, lon: 8.68 },
  { code: 'gru1', city: 'São Paulo', country: 'Brazil', lat: -23.55, lon: -46.63 },
  { code: 'hkg1', city: 'Hong Kong', country: 'Hong Kong', lat: 22.32, lon: 114.17 },
  { code: 'hnd1', city: 'Tokyo', country: 'Japan', lat: 35.68, lon: 139.69 },
  { code: 'iad1', city: 'Washington', country: 'USA', lat: 38.91, lon: -77.04 },
  { code: 'icn1', city: 'Seoul', country: 'South Korea', lat: 37.57, lon: 126.98 },
  { code: 'kix1', city: 'Osaka', country: 'Japan', lat: 34.69, lon: 135.5 },
  { code: 'lhr1', city: 'London', country: 'United Kingdom', lat: 51.51, lon: -0.13 },
  { code: 'pdx1', city: 'Portland', country: 'USA', lat: 45.52, lon: -122.68 },
  { code: 'sfo1', city: 'San Francisco', country: 'USA', lat: 37.77, lon: -122.42 },
  { code: 'sin1', city: 'Singapore', country: 'Singapore', lat: 1.35, lon: 103.82 },
  { code: 'syd1', city: 'Sydney', country: 'Australia', lat: -33.87, lon: 151.21 },
  { code: 'yul1', city: 'Montréal', country: 'Canada', lat: 45.5, lon: -73.57 }
];

const byCode = new Map(NODES.map((n) => [n.code, n]));

/** @param {string | null | undefined} code @returns {NetNode | null} */
export function nodeByCode(code) {
  return (code && byCode.get(code.toLowerCase())) || null;
}

const RAD = Math.PI / 180;

/**
 * Angular distance between two points on the sphere, in radians.
 * @param {number} lat1 @param {number} lon1 @param {number} lat2 @param {number} lon2
 */
export function angle(lat1, lon1, lat2, lon2) {
  const a = lat1 * RAD;
  const b = lat2 * RAD;
  const d = (lon2 - lon1) * RAD;
  const c = Math.sin(a) * Math.sin(b) + Math.cos(a) * Math.cos(b) * Math.cos(d);
  return Math.acos(Math.max(-1, Math.min(1, c)));
}

/** The node nearest a point, by great circle. @param {number} lat @param {number} lon @param {NetNode[]} [nodes] */
export function nearestNode(lat, lon, nodes = NODES) {
  let best = nodes[0];
  let bestD = Infinity;
  for (const n of nodes) {
    const d = angle(lat, lon, n.lat, n.lon);
    if (d < bestD) {
      bestD = d;
      best = n;
    }
  }
  return best;
}

// A browser with no network headers (the dev server) guesses from its clock:
// the time zone names a city, and the UTC offset is a longitude for the rest.
/** @type {Record<string, string>} */
const ZONES = {
  'America/Los_Angeles': 'sfo1', 'America/Tijuana': 'sfo1', 'America/Phoenix': 'sfo1', 'America/Denver': 'sfo1',
  'America/Vancouver': 'pdx1', 'America/Anchorage': 'pdx1', 'Pacific/Honolulu': 'sfo1',
  'America/Chicago': 'cle1', 'America/Mexico_City': 'cle1', 'America/Detroit': 'cle1', 'America/Indiana/Indianapolis': 'cle1',
  'America/New_York': 'iad1', 'America/Bogota': 'iad1', 'America/Lima': 'iad1', 'America/Panama': 'iad1',
  'America/Toronto': 'yul1', 'America/Montreal': 'yul1', 'America/Halifax': 'yul1', 'America/St_Johns': 'yul1',
  'America/Sao_Paulo': 'gru1', 'America/Argentina/Buenos_Aires': 'gru1', 'America/Santiago': 'gru1', 'America/Montevideo': 'gru1',
  'Europe/London': 'lhr1', 'Europe/Lisbon': 'lhr1', 'Atlantic/Reykjavik': 'lhr1', 'Europe/Dublin': 'dub1',
  'Europe/Paris': 'cdg1', 'Europe/Madrid': 'cdg1', 'Europe/Brussels': 'cdg1', 'Africa/Casablanca': 'cdg1',
  'Europe/Amsterdam': 'fra1', 'Europe/Berlin': 'fra1', 'Europe/Zurich': 'fra1', 'Europe/Rome': 'fra1', 'Europe/Vienna': 'fra1',
  'Europe/Prague': 'fra1', 'Europe/Warsaw': 'fra1', 'Europe/Budapest': 'fra1', 'Europe/Athens': 'fra1', 'Europe/Istanbul': 'fra1',
  'Africa/Cairo': 'fra1', 'Asia/Jerusalem': 'fra1', 'Europe/Kyiv': 'fra1',
  'Europe/Stockholm': 'arn1', 'Europe/Oslo': 'arn1', 'Europe/Copenhagen': 'arn1', 'Europe/Helsinki': 'arn1', 'Europe/Moscow': 'arn1',
  'Africa/Johannesburg': 'cpt1', 'Africa/Lagos': 'cpt1', 'Africa/Nairobi': 'cpt1',
  'Asia/Dubai': 'bom1', 'Asia/Kolkata': 'bom1', 'Asia/Calcutta': 'bom1', 'Asia/Karachi': 'bom1', 'Asia/Tehran': 'bom1',
  'Asia/Bangkok': 'sin1', 'Asia/Jakarta': 'sin1', 'Asia/Singapore': 'sin1', 'Asia/Kuala_Lumpur': 'sin1', 'Asia/Ho_Chi_Minh': 'sin1', 'Australia/Perth': 'sin1',
  'Asia/Hong_Kong': 'hkg1', 'Asia/Shanghai': 'hkg1', 'Asia/Taipei': 'hkg1', 'Asia/Manila': 'hkg1',
  'Asia/Tokyo': 'hnd1', 'Asia/Seoul': 'icn1',
  'Australia/Sydney': 'syd1', 'Australia/Melbourne': 'syd1', 'Australia/Brisbane': 'syd1', 'Australia/Adelaide': 'syd1', 'Pacific/Auckland': 'syd1'
};

/**
 * A node for a browser that knows only its clock.
 * @param {{ timeZone?: string | null, offsetMinutes?: number | null }} clock
 *   offsetMinutes: minutes east of UTC (the negative of Date#getTimezoneOffset)
 * @returns {NetNode | null}
 */
export function guessNode({ timeZone, offsetMinutes }) {
  if (timeZone && ZONES[timeZone]) return nodeByCode(ZONES[timeZone]);
  if (typeof offsetMinutes === 'number' && Number.isFinite(offsetMinutes)) {
    return nearestNode(30, Math.max(-180, Math.min(180, offsetMinutes / 4)));
  }
  return null;
}
