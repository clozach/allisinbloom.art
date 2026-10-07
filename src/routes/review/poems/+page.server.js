import { error } from '@sveltejs/kit';
/** @type {Record<string, any>} */
const inventories = import.meta.glob('$lib/server/review/*.json', { eager: true, import: 'default' });
/** @type {import('./$types').PageServerLoad} */
export function load({ setHeaders }) {
  const inventory = Object.values(inventories)[0];
  if (!inventory) error(404, 'No private poem review in this build');
  setHeaders({ 'cache-control': 'private, no-store', 'x-robots-tag': 'noindex, nofollow' });
  return { inventory };
}
