import { getAllPoems } from '$lib/poemUtils';

/** @type {import('./$types').PageLoad} */
export async function load({ parent }) {
  const data = await parent();
  // The index lists what the site navigates: static/route.txt and the staged drafts.
  // A tracked page outside that list (the width-test layout fixture) stays reachable, unlisted.
  const listed = new Set(data.routes);
  const poems = [...getAllPoems().filter(poem => listed.has(poem.slug)), ...(data.draftPoems || [])];

  return {
    poems
  };
}
