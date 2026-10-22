// Which poem pages Vercel's CDN may keep, and for how long.
//
// A published poem's page can come from the CDN only where no saved version of it
// can be shown: the layout passes the edit mode it already gave savedPoemDocument,
// and any mode other than null (saved edits read on every request) keeps the page
// uncached. Today that mode is null on production, so production poems are cached
// and saved edits arrive there by deploy; if editing on production is ever approved,
// those pages stop being cached here without this file changing. Vercel keeps a
// separate cache per deployment, so a release starts afresh. Previews, staging and
// local servers are never cached.
//
// vercel-cdn-cache-control is meant for Vercel's CDN only; the browser keeps the
// default cache-control. Using its own header name also avoids a clash with the
// 'cache-control: private, no-store' a draft page sets (SvelteKit refuses the same
// header twice).

export const POEM_CDN_CACHE = { 'vercel-cdn-cache-control': 'max-age=31536000' };

/**
 * @param {string|null} slug the poem slug from /poems/<slug>, or null for any other page
 * @param {{environment?: string, editMode: 'local'|'preview'|null, published: string[], drafts?: string[]}} options
 *   environment: VERCEL_ENV; editMode: poemEditMode(event), required (anything but null
 *   means no caching); published: static/route.txt; drafts: draft slugs
 * @returns {Record<string, string>|null} headers to set, or null for none
 */
export function poemCdnCacheHeaders(slug, { environment, editMode, published, drafts = [] }) {
	if (environment !== 'production' || editMode !== null || !slug) return null;
	if (!published.includes(slug) || drafts.includes(slug)) return null;
	return { ...POEM_CDN_CACHE };
}
