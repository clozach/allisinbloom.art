import { MAX_REQUEST_BYTES } from './record.js';
import { PoemEditError } from './errors.js';

/** Bound the actual streamed body, including requests with a missing/false Content-Length. @param {Request} request */
export async function readEditBody(request) {
	const declared = request.headers.get('content-length');
	if (declared && Number(declared) > MAX_REQUEST_BYTES)
		throw new PoemEditError(413, 'This poem is too long to save.');
	if (!request.body) throw new PoemEditError(400, 'Choose a valid poem edit.');
	const reader = request.body.getReader();
	const decoder = new TextDecoder();
	let text = '';
	let length = 0;
	try {
		while (true) {
			const { done, value } = await reader.read();
			if (done) break;
			length += value.byteLength;
			if (length > MAX_REQUEST_BYTES) {
				await reader.cancel();
				throw new PoemEditError(413, 'This poem is too long to save.');
			}
			text += decoder.decode(value, { stream: true });
		}
		text += decoder.decode();
		try {
			return JSON.parse(text);
		} catch {
			throw new PoemEditError(400, 'Choose a valid poem edit.');
		}
	} finally {
		reader.releaseLock();
	}
}
