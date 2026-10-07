import { drafts } from '$lib/server/poemDrafts.js';

/** @type {import('./$types').LayoutServerLoad} */
export function load() {
  return { draftPoems: drafts.map(({ title, slug, date }) => ({ title, slug, date, path: `/poems/${slug}` })) };
}
