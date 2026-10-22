// Which poem pages Vercel's CDN may keep, and for how long.
//
// On production a published poem's page is the same for every reader: editing
// does not exist there (editMode returns null) and saved edits arrive by deploy.
// Its HTML can therefore come from the CDN instead of waking the server function
// each time; Vercel keeps a separate cache per deployment, so a release starts
// afresh. Everywhere else (previews, staging, local) the page reads saved edits
// on every request and must stay uncached.
//
// vercel-cdn-cache-control is meant for Vercel's CDN only; the browser keeps the
// default cache-control. Using its own header name also avoids a clash with the
// 'cache-control: private, no-store' a draft page sets (SvelteKit refuses the same
// header twice).

export const POEM_CDN_CACHE = { 'vercel-cdn-cache-control': 'max-age=31536000' };

/**
 * @param {string|null} slug the poem slug from /poems/<slug>, or null for any other page
 * @param {{environment?: string, published: string[], drafts?: string[]}} options
 *   environment: VERCEL_ENV; published: static/route.txt; drafts: draft slugs
 * @returns {Record<string, string>|null} headers to set, or null for none
 */
export function poemCdnCacheHeaders(slug, { environment, published, drafts = [] }) {
	if (environment !== 'production' || !slug) return null;
	if (!published.includes(slug) || drafts.includes(slug)) return null;
	return { ...POEM_CDN_CACHE };
}
