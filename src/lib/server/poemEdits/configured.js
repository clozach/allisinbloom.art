import { resolve } from 'node:path';
import { env } from '$env/dynamic/private';
import { validatePoemDocument } from '$lib/poemDocument.js';
import { fileStore } from './file.js';
import { poemEditService } from './service.js';

/** @param {'local'|'preview'|null} mode */
export async function configuredPoemEdits(mode) {
	if (mode === 'local')
		return {
			service: poemEditService(fileStore(resolve('.poem-edits')), validatePoemDocument),
			reason: null
		};
	if (mode !== 'preview' || env.POEM_EDIT_PREVIEW_ENABLED !== 'true' || !env.BLOB_STORE_ID) {
		return { service: null, reason: 'Saving has not been connected for this preview yet.' };
	}
	const { blobStore } = await import('./blob.js');
	return {
		service: poemEditService(blobStore(env.BLOB_STORE_ID), validatePoemDocument),
		reason: null
	};
}
