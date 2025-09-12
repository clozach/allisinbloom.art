import { getPoemBySlug } from '$lib/poemUtils.js';

/** @type {import('./$types').PageLoad} */
export async function load({ parent }) {
  // Get routes from parent layout
  const { routes } = await parent();
  
  // Get the first route as the home page poem
  const firstRoute = routes && routes.length > 0 ? routes[0] : 'opening-in-sight';
  const poem = getPoemBySlug(firstRoute);
  
  return {
    poem,
    firstRoute
  };
}
