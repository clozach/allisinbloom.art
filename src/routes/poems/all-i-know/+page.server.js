import { draftPageData } from '$lib/server/poemDrafts.js';

/** @type {import('./$types').PageServerLoad} */
export function load({ setHeaders }) {
  return draftPageData('all-i-know', setHeaders);
}
