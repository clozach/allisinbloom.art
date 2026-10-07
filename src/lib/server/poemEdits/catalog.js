import { createHash } from 'node:crypto';
import { draftBySlug } from '../poemDrafts.js';

/** @type {Record<string,string>} */
const publicPoems = import.meta.glob('/src/routes/poems/*/+page.svx', {
	eager: true,
	query: '?raw',
	import: 'default'
});
const publicHashes = new Map(
	Object.entries(publicPoems).map(([path, body]) => [
		path.split('/').at(-2),
		createHash('sha256').update(body).digest('hex')
	])
);

/** @param {string} slug @returns {string|null} */
export function poemSourceHash(slug) {
	const draft = draftBySlug.get(slug);
	if (draft)
		return createHash('sha256')
			.update(JSON.stringify([draft.title, draft.html, draft.sourceUrl, draft.lastEdited]))
			.digest('hex');
	return publicHashes.get(slug) ?? null;
}
