import { drafts } from '$lib/server/poemDrafts.js';
import { poemEditMode, poemEditingAvailable } from '$lib/server/poemEditAccess.js';
import { savedPoemDocument } from '$lib/server/poemEdits/saved.js';

/** @type {import('./$types').LayoutServerLoad} */
export async function load(event) {
	// A poem page shows its saved site version to every reader; the owner's chord edits it.
	const slug = event.url.pathname.match(/^\/poems\/([^/]+)\/?$/)?.[1] ?? null;
	const editedPoem = slug ? await savedPoemDocument(decodeURIComponent(slug), poemEditMode(event)) : null;
	return {
		poemEditing: poemEditingAvailable(event),
		editedPoem,
		draftPoems: drafts.map(({ title, slug, date }) => ({
			title,
			slug,
			date,
			path: `/poems/${slug}`
		}))
	};
}
