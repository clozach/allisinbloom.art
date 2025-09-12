/** @type {import('@sveltejs/kit').Load} */
export async function load({ fetch, data }) {
  try {
    const response = await fetch('/routes.txt');
    const text = await response.text();
    const routes = text.split('\n').filter(route => route.trim() !== '');
    const r = {
      ...data,
      routes
    };
    // console.log('🕉️', r)
    return r;
  } catch (error) {
    console.error('Failed to load routes:', error);
    return {
      ...data,
      routes: ['opening-in-sight'] // fallback
    };
  }
}
