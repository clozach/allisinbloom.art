import { getAllPoems } from '$lib/poemUtils.js';

/** @type {import('@sveltejs/kit').Load} */
export async function load({ fetch, data }) {
  // Build a slug → title map from poem metadata
  const allPoems = getAllPoems();
  /** @type {Record<string, string>} */
  const poemTitles = {};
  for (const poem of allPoems) {
    poemTitles[poem.slug] = poem.title;
  }

  try {
    const response = await fetch('/route.txt');
    const text = await response.text();
    const routes = text.split('\n').filter(route => route.trim() !== '');
    return {
      ...data,
      routes,
      poemTitles
    };
  } catch (error) {
    console.error('Failed to load routes:', error);
    return {
      ...data,
      routes: ['opening-in-sight'],
      poemTitles
    };
  }
}
