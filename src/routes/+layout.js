import { getAllPoems } from '$lib/poemUtils.js';
import routeText from '../../static/route.txt?raw';

/** @type {import('./$types').LayoutLoad} */
export function load({ data }) {
  // Build a slug → title map from poem metadata
  const allPoems = getAllPoems();
  /** @type {Record<string, string>} */
  const poemTitles = {};
  for (const poem of allPoems) {
    poemTitles[poem.slug] = poem.title;
  }
  for (const poem of data.draftPoems || []) poemTitles[poem.slug] = poem.title;

  const routes = [...routeText.split('\n').map(route => route.trim()).filter(Boolean), ...(data.draftPoems || []).map(poem => poem.slug)];
  return { ...data, routes, poemTitles };
}
