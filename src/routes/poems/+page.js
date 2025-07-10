import { getAllPoems } from '$lib/poemUtils';

/** @type {import('./$types').PageLoad} */
export function load() {
  const poems = getAllPoems();
  
  return {
    poems
  };
}
