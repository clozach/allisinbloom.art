import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { poemCdnCacheHeaders, POEM_CDN_CACHE } from '../../src/lib/server/poemCdnCache.js';

const published = readFileSync(new URL('../../static/route.txt', import.meta.url), 'utf8')
	.split('\n')
	.map((route) => route.trim())
	.filter(Boolean);
const first = published[0];

test('production caches a published poem at the CDN only, under its own header name', () => {
	const headers = poemCdnCacheHeaders(first, { environment: 'production', published });
	assert.deepEqual(headers, { 'vercel-cdn-cache-control': 'max-age=31536000' });
	assert.equal(Object.keys(headers).includes('cache-control'), false);
	headers['vercel-cdn-cache-control'] = 'changed';
	assert.equal(POEM_CDN_CACHE['vercel-cdn-cache-control'], 'max-age=31536000');
});

test('previews, staging, development and unset environments never cache', () => {
	for (const environment of ['preview', 'development', undefined, '', 'Production']) {
		assert.equal(poemCdnCacheHeaders(first, { environment, published }), null, String(environment));
	}
});

test('only poems listed in route.txt, never a draft or another page', () => {
	assert.equal(poemCdnCacheHeaders(null, { environment: 'production', published }), null);
	assert.equal(poemCdnCacheHeaders('width-test', { environment: 'production', published }), null);
	assert.equal(
		poemCdnCacheHeaders('wood-between-the-worlds', { environment: 'production', published }),
		null
	);
	assert.equal(
		poemCdnCacheHeaders(first, { environment: 'production', published, drafts: [first] }),
		null
	);
});
