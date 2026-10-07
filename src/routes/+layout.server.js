import { drafts } from '$lib/server/poemDrafts.js';
import { canEditPoems } from '$lib/server/poemEditAccess.js';

/** @type {import('./$types').LayoutServerLoad} */
export function load(event) {
	return {
		canEditPoems: canEditPoems(event),
		draftPoems: drafts.map(({ title, slug, date }) => ({
			title,
			slug,
			date,
			path: `/poems/${slug}`
		}))
	};
}
