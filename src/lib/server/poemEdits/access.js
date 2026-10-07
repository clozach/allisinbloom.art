/** @param {string} value */
export function isLoopback(value) {
	const host = value.toLowerCase().replace(/^\[|\]$/g, '');
	return (
		host === 'localhost' || host === '::1' || host === '127.0.0.1' || host === '::ffff:127.0.0.1'
	);
}

/**
 * Preview admission relies on the existing deployment perimeter, not an app user identity.
 * Hostnames alone never authorize local writes: the connecting address must also be loopback.
 * @param {{url:URL, getClientAddress:()=>string}} event
 * @param {{dev?:boolean, environment?:string, siteEnvironment?:string}} options
 * @returns {{allowed:boolean, mode:'local'|'preview'|null}}
 */
export function editAccess(event, options = {}) {
	if (options.environment === 'production' || options.siteEnvironment === 'production')
		return { allowed: false, mode: null };
	if (options.environment === 'preview') return { allowed: true, mode: 'preview' };
	if (!options.dev || !isLoopback(event.url.hostname)) return { allowed: false, mode: null };
	try {
		return isLoopback(event.getClientAddress())
			? { allowed: true, mode: 'local' }
			: { allowed: false, mode: null };
	} catch {
		return { allowed: false, mode: null };
	}
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
