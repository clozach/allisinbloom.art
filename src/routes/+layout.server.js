import { env } from '$env/dynamic/private';
import { drafts } from '$lib/server/poemDrafts.js';
import { poemEditMode, poemEditingAvailable } from '$lib/server/poemEditAccess.js';
import { savedPoemDocument } from '$lib/server/poemEdits/saved.js';
import { poemCdnCacheHeaders } from '$lib/server/poemCdnCache.js';
import routeText from '../../static/route.txt?raw';

const published = routeText
	.split('\n')
	.map((route) => route.trim())
	.filter(Boolean);
const draftSlugs = drafts.map((draft) => draft.slug);

/** @type {import('./$types').LayoutServerLoad} */
export async function load(event) {
	// A poem page shows its saved site version to every reader; the owner's chord edits it.
	const match = event.url.pathname.match(/^\/poems\/([^/]+)\/?$/)?.[1];
	const slug = match ? decodeURIComponent(match) : null;
	const editedPoem = slug ? await savedPoemDocument(slug, poemEditMode(event)) : null;
	// Production only: a published poem's HTML may come from Vercel's CDN (see poemCdnCache.js).
	const cdn = poemCdnCacheHeaders(slug, {
		environment: env.VERCEL_ENV,
		published,
		drafts: draftSlugs
	});
	if (cdn) event.setHeaders(cdn);
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
