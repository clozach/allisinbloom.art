import { configuredPoemEdits } from './configured.js';
import { poemSourceHash } from './catalog.js';
import { validSlug } from './record.js';

/**
 * The saved site version of a poem, for every reader, or null when this
 * environment has none. Reading needs no credentials: it is what the page shows.
 * @param {string} slug
 * @param {'local'|'preview'|null} mode
 * @returns {Promise<{title: string, html: string} | null>}
 */
export async function savedPoemDocument(slug, mode) {
	if (!mode || !validSlug(slug)) return null;
	const sourceHash = poemSourceHash(slug);
	if (!sourceHash) return null;
	try {
		const { service } = await configuredPoemEdits(mode);
		if (!service) return null;
		return (await service.read(slug, sourceHash)).document ?? null;
	} catch {
		return null;
	}
}
