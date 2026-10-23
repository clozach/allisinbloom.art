// The Net, at /. Rendered on the server for every visit because its first frame
// shows the node that answered, which only the request knows. On production the
// page may then come from Vercel's CDN for a minute: the CDN caches per region, so
// everyone a region answers in the same minute is offered the same poem, and
// nothing has to wake for them.
import { env } from '$env/dynamic/private';
import { drafts } from '$lib/server/poemDrafts.js';
import { whereFrom } from '$lib/net/where.js';
import { pickPoem, minuteKey } from '$lib/net/pick.js';
import { NET_CDN_CACHE } from '$lib/server/poemCdnCache.js';
import routeText from '../../static/route.txt?raw';

const published = routeText
	.split('\n')
	.map((route) => route.trim())
	.filter(Boolean);

/** @type {import('./$types').PageServerLoad} */
export function load(event) {
	const where = whereFrom(event.request.headers, event.url);
	const slugs = [...published, ...drafts.map((draft) => draft.slug)];
	const minute = minuteKey(new Date());
	if (env.VERCEL_ENV === 'production') event.setHeaders(NET_CDN_CACHE);
	return {
		title: 'The Net',
		net: {
			lit: where.code,
			source: where.source,
			poem: pickPoem(slugs, where.code ?? 'nowhere', minute),
			minute,
			slugs
		}
	};
}
