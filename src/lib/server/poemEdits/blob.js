import { get, put, BlobPreconditionFailedError } from '@vercel/blob';
import { MAX_RECORD_BYTES, validSlug } from './record.js';
import { conflict } from './errors.js';

/**
 * Uses the connected Preview project's rotating OIDC credential through the SDK.
 * No client token, shared link, or long-lived credential is created here.
 * @param {string} storeId @param {{get:typeof get,put:typeof put}} sdk
 */
export function blobStore(storeId, sdk = { get, put }) {
	/** @param {string} slug */
	const path = (slug) => {
		if (!validSlug(slug)) throw new Error('Invalid poem path');
		return `poem-edits/v1/${slug}.json`;
	};
	/** @param {string} slug @returns {Promise<{record:unknown,version:string}|null>} */
	async function read(slug) {
		// Compression can turn the object's strong ETag into a weak transfer ETag.
		// Read the identity representation so ifMatch protects the exact stored version.
		const result = await sdk.get(path(slug), {
			access: 'private',
			storeId,
			useCache: false,
			headers: { 'accept-encoding': 'identity' }
		});
		if (result === null) return null;
		if (!result.stream || !result.blob.etag || (result.blob.size ?? 0) > MAX_RECORD_BYTES)
			throw new Error('Invalid stored poem');
		const reader = result.stream.getReader();
		const chunks = [];
		let length = 0;
		try {
			while (true) {
				const { done, value } = await reader.read();
				if (done) break;
				length += value.byteLength;
				if (length > MAX_RECORD_BYTES) {
					await reader.cancel();
					throw new Error('Stored poem is too large');
				}
				chunks.push(Buffer.from(value));
			}
		} finally {
			reader.releaseLock();
		}
		return {
			record: JSON.parse(Buffer.concat(chunks).toString('utf8')),
			version: result.blob.etag
		};
	}
	/** @param {string} slug @param {import('./record.js').EditRecord} record @param {string|null} expectedVersion */
	async function write(slug, record, expectedVersion) {
		const text = JSON.stringify(record);
		if (Buffer.byteLength(text) > MAX_RECORD_BYTES) throw new Error('Stored poem is too large');
		try {
			const result = await sdk.put(path(slug), text, {
				access: 'private',
				storeId,
				contentType: 'application/json',
				addRandomSuffix: false,
				allowOverwrite: expectedVersion !== null,
				...(expectedVersion === null ? {} : { ifMatch: expectedVersion })
			});
			return result.etag;
		} catch (error) {
			if (error instanceof BlobPreconditionFailedError) throw conflict();
			// The SDK reports an existing create-only pathname as a generic BlobError.
			// Confirm a competing/acknowledgement-lost write rather than matching prose.
			if (expectedVersion === null) {
				const existing = await read(slug).catch(() => null);
				if (existing) throw conflict();
			}
			throw error;
		}
	}
	return { read, write };
}
