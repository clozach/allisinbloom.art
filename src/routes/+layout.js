/** @type {import('@sveltejs/kit').Load} */
export function load({ data }) {
  return {
    ...data
  };
}
