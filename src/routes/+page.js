import { getFeaturedPoems, getQuotes } from '$lib/poemUtils';

/** @type {import('./$types').PageLoad} */
export function load() {
  const featuredPoems = getFeaturedPoems(3);
  const quotes = getQuotes();
  
  return {
    featuredPoems,
    quotes
  };
}
