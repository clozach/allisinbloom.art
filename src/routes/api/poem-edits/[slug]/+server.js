import { json } from '@sveltejs/kit';
import { poemEditAccess } from '$lib/server/poemEditAccess.js';
import { isSameOriginMutation } from '$lib/server/poemEdits/access.js';
import { poemSourceHash } from '$lib/server/poemEdits/catalog.js';
import { configuredPoemEdits } from '$lib/server/poemEdits/configured.js';
import { readEditBody } from '$lib/server/poemEdits/body.js';
import { validSlug } from '$lib/server/poemEdits/record.js';
import { PoemEditError } from '$lib/server/poemEdits/errors.js';

const headers = { 'cache-control': 'private, no-store', 'x-robots-tag': 'noindex, nofollow' };
/** @param {unknown} problem */
function failure(problem) {
	const status = problem instanceof PoemEditError ? problem.status : 503;
	const reason =
		problem instanceof PoemEditError
			? problem.message
			: 'Your changes have not been saved. Please try again.';
	return json({ error: reason, reason, available: false }, { status, headers });
}

/** @type {import('./$types').RequestHandler} */
export async function GET(event) {
	const access = poemEditAccess(event);
	const sourceHash = validSlug(event.params.slug) ? poemSourceHash(event.params.slug) : null;
	if (!access.allowed || !sourceHash)
		return json({ error: 'Poem editing is unavailable.' }, { status: 404, headers });
	try {
		const { service, reason } = await configuredPoemEdits(access.mode);
		if (!service)
			return json({ document: null, revision: null, available: false, reason }, { headers });
		return json(
			{ ...(await service.read(event.params.slug, sourceHash)), available: true },
			{ headers }
		);
	} catch (error) {
		return failure(error);
	}
}

/** @type {import('./$types').RequestHandler} */
export async function PUT(event) {
	const access = poemEditAccess(event);
	const sourceHash = validSlug(event.params.slug) ? poemSourceHash(event.params.slug) : null;
	if (!access.allowed || !sourceHash)
		return json({ error: 'Poem editing is unavailable.' }, { status: 404, headers });
	if (!isSameOriginMutation(event.request, event.url))
		return json({ error: 'Save from this poem’s own page.' }, { status: 403, headers });
	try {
		const { service, reason } = await configuredPoemEdits(access.mode);
		if (!service)
			return json({ available: false, error: reason, reason }, { status: 503, headers });
		const input = await readEditBody(event.request);
		return json(await service.save(event.params.slug, sourceHash, input), { headers });
	} catch (error) {
		return failure(error);
	}
}
