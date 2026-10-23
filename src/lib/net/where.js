// Which node answered this request. On Vercel the first segment of x-vercel-id names
// the region that handled the request (https://vercel.com/docs/headers/request-headers);
// failing that, the geolocation headers give a point and the nearest node is taken;
// a `?node=` query names one outright (a way to look at the Net from elsewhere, and
// the dev server's only way to light a node). Pure: headers and a URL in, a code out.
import { nodeByCode, nearestNode } from './nodes.js';

const CODE = /^[a-z]{3}\d$/;

/**
 * @param {Headers} headers @param {URL} [url]
 * @returns {{ code: string | null, source: 'query' | 'network' | 'geo' | 'none' }}
 */
export function whereFrom(headers, url) {
  const asked = url?.searchParams.get('node')?.toLowerCase();
  if (asked && nodeByCode(asked)) return { code: asked, source: 'query' };
  const first = (headers.get('x-vercel-id') || '').split('::')[0].trim().toLowerCase();
  if (CODE.test(first) && nodeByCode(first)) return { code: first, source: 'network' };
  const lat = parseFloat(headers.get('x-vercel-ip-latitude') || '');
  const lon = parseFloat(headers.get('x-vercel-ip-longitude') || '');
  if (Number.isFinite(lat) && Number.isFinite(lon)) return { code: nearestNode(lat, lon).code, source: 'geo' };
  return { code: null, source: 'none' };
}
