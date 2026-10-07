import { error } from '@sveltejs/kit';
import { draftBySlug } from '$lib/server/poemDrafts.js';

/** @type {import('./$types').PageServerLoad} */
export function load({ params, setHeaders }) {
  const draft = draftBySlug.get(params.slug);
  if (!draft) error(404, 'Poem not found');
  setHeaders({ 'cache-control': 'private, no-store', 'x-robots-tag': 'noindex, nofollow' });
  return { ...draft, scale: 1 };
}
