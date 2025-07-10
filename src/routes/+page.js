import { getFeaturedPoems, getQuotes } from '$lib/poemUtils';

/** @type {import('./$types').PageLoad} */
export async function load() {
  const featuredPoems = await getFeaturedPoems(3);
  const quotes = getQuotes();
  
  return {
    featuredPoems,
    quotes
  };
}
