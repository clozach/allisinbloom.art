import { getRandomPoem } from '$lib/poemUtils';

/** @type {import('./$types').PageLoad} */
export function load() {
  const randomPoem = getRandomPoem();
  
  return {
    title: 'Home',
    randomPoem
  };
}
