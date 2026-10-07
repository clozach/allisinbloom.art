import { createHash, randomUUID } from 'node:crypto';
import { conflict, PoemEditError } from './errors.js';

/** @typedef {{title:string,html:string}} PoemDocument */
/** @typedef {{revision:string, document:PoemDocument, at:string}} HistoryItem */
/** @typedef {{id:string,fingerprint:string,revision:string}} Operation */
/** @typedef {{schema:1,slug:string,sourceHash:string,document:PoemDocument,revision:string,at:string,history:HistoryItem[],operations:Operation[]}} EditRecord */
/** @typedef {{document:PoemDocument,revision:string|null,operationId:string}} EditInput */
export const MAX_RECORD_BYTES = 8 * 1024 * 1024;
export const MAX_REQUEST_BYTES = 256 * 1024;

/** @param {unknown} value */
export function validSlug(value) {
	return (
		typeof value === 'string' && value.length <= 160 && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)
	);
}

/** @param {unknown} input @param {(document:unknown)=>PoemDocument} validate */
export function validateInput(input, validate) {
	if (!input || typeof input !== 'object' || Array.isArray(input))
		throw new PoemEditError(400, 'Choose a valid poem edit.');
	const data = /** @type {Record<string,unknown>} */ (input);
	if (
		data.revision !== null &&
		(typeof data.revision !== 'string' || data.revision.length > 100 || !data.revision.length)
	)
		throw new PoemEditError(400, 'The saved version is missing. Reload this poem.');
	if (typeof data.operationId !== 'string' || !/^[a-zA-Z0-9_-]{8,100}$/.test(data.operationId))
		throw new PoemEditError(400, 'This save needs a valid operation ID.');
	let document;
	try {
		document = validate(data.document);
	} catch {
		throw new PoemEditError(400, 'This poem contains unsupported formatting or is too long.');
	}
	return /** @type {EditInput} */ ({
		document,
		revision: data.revision,
		operationId: data.operationId
	});
}

/** @param {EditInput} input */
function operationFingerprint(input) {
	return createHash('sha256')
		.update(JSON.stringify([input.revision, input.document.title, input.document.html]))
		.digest('hex');
}

/** @param {EditRecord|null} previous @param {EditInput} input */
export function repeatedOperation(previous, input) {
	const operation = previous?.operations.find((item) => item.id === input.operationId);
	if (!operation) return false;
	if (operation.fingerprint !== operationFingerprint(input)) throw conflict();
	// A retry of an older operation must not masquerade as saving a newer tab's words.
	// Leave the caller's draft intact and require an explicit conflict resolution.
	if (operation.revision !== previous?.revision) throw conflict();
	return true;
}

/**
 * The document and its history/receipt share one atomic storage write.
 * @param {string} slug @param {string} sourceHash @param {EditRecord|null} previous @param {EditInput} input
 * @returns {EditRecord}
 */
export function nextRecord(slug, sourceHash, previous, input) {
	if (input.revision !== (previous?.revision ?? null)) throw conflict();
	const revision = randomUUID();
	const at = new Date().toISOString();
	const history = previous
		? [
				...previous.history,
				{ revision: previous.revision, document: previous.document, at: previous.at }
			].slice(-20)
		: [];
	return {
		schema: 1,
		slug,
		sourceHash: previous?.sourceHash || sourceHash,
		document: input.document,
		revision,
		at,
		history,
		operations: [
			...(previous?.operations ?? []),
			{ id: input.operationId, fingerprint: operationFingerprint(input), revision }
		].slice(-50)
	};
}

/** @param {unknown} value @param {string} slug @param {(document:unknown)=>PoemDocument} validate @returns {EditRecord} */
export function validateRecord(value, slug, validate) {
	if (!value || typeof value !== 'object' || Array.isArray(value))
		throw new Error('Invalid stored record');
	const record = /** @type {EditRecord} */ (value);
	if (
		record.schema !== 1 ||
		record.slug !== slug ||
		!/^[a-f0-9-]{36}$/.test(record.revision) ||
		typeof record.sourceHash !== 'string' ||
		typeof record.at !== 'string' ||
		!Array.isArray(record.history) ||
		record.history.length > 20 ||
		!Array.isArray(record.operations) ||
		record.operations.length > 50
	)
		throw new Error('Invalid stored record');
	validate(record.document);
	for (const operation of record.operations) {
		if (!operation || typeof operation.id !== 'string' || typeof operation.fingerprint !== 'string')
			throw new Error('Invalid stored receipt');
	}
	return record;
}
