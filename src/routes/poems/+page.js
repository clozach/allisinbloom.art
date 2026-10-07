import { getAllPoems } from '$lib/poemUtils';

/** @type {import('./$types').PageLoad} */
export async function load({ parent }) {
  const data = await parent();
  const poems = [...getAllPoems(), ...(data.draftPoems || [])];
  
  return {
    poems
  };
}
