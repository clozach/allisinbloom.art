import { createHash, timingSafeEqual } from 'node:crypto';

/** @param {string} value */
export function isLoopback(value) {
	const host = value.toLowerCase().replace(/^\[|\]$/g, '');
	return (
		host === 'localhost' || host === '::1' || host === '127.0.0.1' || host === '::ffff:127.0.0.1'
	);
}

/**
 * Where saved edits would go in this environment. Preview relies on the deployment
 * perimeter for the storage connection; local writes need a loopback host and client.
 * @param {{url:URL, getClientAddress:()=>string}} event
 * @param {{dev?:boolean, environment?:string, siteEnvironment?:string}} options
 * @returns {'local'|'preview'|null}
 */
export function editMode(event, options = {}) {
	if (options.environment === 'production' || options.siteEnvironment === 'production') return null;
	if (options.environment === 'preview') return 'preview';
	if (!options.dev || !isLoopback(event.url.hostname)) return null;
	try {
		return isLoopback(event.getClientAddress()) ? 'local' : null;
	} catch {
		return null;
	}
}

/** @param {string} a @param {string} b */
function sameSecret(a, b) {
	const [x, y] = [a, b].map((value) => createHash('sha256').update(value, 'utf8').digest());
	return timingSafeEqual(x, y);
}

/**
 * The owner's HTTP Basic credentials. Editing exists only where both are configured;
 * the browser asks for them the first time ⌥⌘E reaches the edit API.
 * @param {{user?:string, password?:string}} credentials
 * @param {Request} request
 * @returns {'granted'|'challenge'|'unconfigured'}
 */
export function basicAuth(credentials, request) {
	if (!credentials.user || !credentials.password) return 'unconfigured';
	const [scheme, encoded] = (request.headers.get('authorization') || '').split(' ', 2);
	if (scheme?.toLowerCase() !== 'basic' || !encoded) return 'challenge';
	const decoded = Buffer.from(encoded, 'base64').toString('utf8');
	const separator = decoded.indexOf(':');
	if (separator < 0) return 'challenge';
	const userMatches = sameSecret(decoded.slice(0, separator), credentials.user);
	const passwordMatches = sameSecret(decoded.slice(separator + 1), credentials.password);
	return userMatches && passwordMatches ? 'granted' : 'challenge';
}

/**
 * One answer for a request: no editing here, sign in first, or go ahead in this mode.
 * @param {{url:URL, getClientAddress:()=>string, request:Request}} event
 * @param {{dev?:boolean, environment?:string, siteEnvironment?:string, user?:string, password?:string}} options
 * @returns {{kind:'unavailable', mode:null} | {kind:'challenge', mode:'local'|'preview'} | {kind:'granted', mode:'local'|'preview'}}
 */
export function editAccess(event, options = {}) {
	const mode = editMode(event, options);
	if (!mode) return { kind: 'unavailable', mode: null };
	const auth = basicAuth({ user: options.user, password: options.password }, event.request);
	if (auth === 'unconfigured') return { kind: 'unavailable', mode: null };
	return auth === 'granted' ? { kind: 'granted', mode } : { kind: 'challenge', mode };
}

/** @param {Request} request @param {URL} url */
export function isSameOriginMutation(request, url) {
	const origin = request.headers.get('origin');
	const fetchSite = request.headers.get('sec-fetch-site');
	return (
		origin === url.origin &&
		(!fetchSite || fetchSite === 'same-origin') &&
		request.headers.get('content-type')?.split(';', 1)[0].trim().toLowerCase() ===
			'application/json'
	);
}
