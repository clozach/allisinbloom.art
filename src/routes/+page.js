import { redirect } from '@sveltejs/kit';

/** @type {import('./$types').PageLoad} */
export async function load({ parent }) {
  const { routes } = await parent();
  const randomIndex = Math.floor(Math.random() * routes.length);
  const randomRoute = routes[randomIndex] || 'opening-in-sight';
  redirect(307, `/poems/${randomRoute}`);
}
