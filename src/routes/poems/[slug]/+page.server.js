import { draftPageData } from '$lib/server/poemDrafts.js';

/** @type {import('./$types').PageServerLoad} */
export function load({ params, setHeaders }) {
  return draftPageData(params.slug, setHeaders);
}
