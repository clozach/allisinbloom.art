import { nextRecord, repeatedOperation, validateInput, validateRecord } from './record.js';
import { PoemEditError, unavailable } from './errors.js';

/** @typedef {import('./record.js').PoemDocument} PoemDocument */
/** @typedef {import('./record.js').EditRecord} EditRecord */
/** @typedef {{read:(slug:string)=>Promise<{record:unknown,version:string}|null>,write:(slug:string,record:EditRecord,version:string|null)=>Promise<string>}} Store */

/** @param {Store} store @param {(document:unknown)=>PoemDocument} validate */
export function poemEditService(store, validate) {
	/** @param {string} slug @param {string} [sourceHash] */
	async function read(slug, sourceHash) {
		try {
			const stored = await store.read(slug);
			if (!stored)
				return {
					document: null,
					revision: null,
					...(sourceHash === undefined ? {} : { sourceChanged: false })
				};
			const record = validateRecord(stored.record, slug, validate);
			return {
				document: record.document,
				revision: record.revision,
				...(sourceHash === undefined ? {} : { sourceChanged: record.sourceHash !== sourceHash })
			};
		} catch {
			throw unavailable();
		}
	}
	/** @param {string} slug @param {string} sourceHash @param {unknown} body */
	async function save(slug, sourceHash, body) {
		const input = validateInput(body, validate);
		try {
			const stored = await store.read(slug);
			const previous = stored ? validateRecord(stored.record, slug, validate) : null;
			if (repeatedOperation(previous, input) && previous)
				return { document: previous.document, revision: previous.revision };
			const record = nextRecord(slug, sourceHash, previous, input);
			try {
				await store.write(slug, record, stored?.version ?? null);
			} catch (error) {
				// A simultaneous retry can lose the CAS after its identical operation won.
				if (error instanceof PoemEditError && error.status === 409) {
					const winner = await store.read(slug);
					const winningRecord = winner ? validateRecord(winner.record, slug, validate) : null;
					if (winningRecord && repeatedOperation(winningRecord, input))
						return { document: winningRecord.document, revision: winningRecord.revision };
				}
				throw error;
			}
			return { document: record.document, revision: record.revision };
		} catch (error) {
			if (error instanceof PoemEditError) throw error;
			throw unavailable();
		}
	}
	return { read, save };
}
