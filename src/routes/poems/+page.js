import { getAllPoems } from '$lib/poemUtils';

/** @type {import('./$types').PageLoad} */
export async function load() {
  const poems = await getAllPoems();
  
  return {
    poems
  };
}
