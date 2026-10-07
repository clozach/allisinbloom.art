import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileStore } from '../../src/lib/server/poemEdits/file.js';
import { poemEditService } from '../../src/lib/server/poemEdits/service.js';
import { editAccess, isSameOriginMutation } from '../../src/lib/server/poemEdits/access.js';
import { readEditBody } from '../../src/lib/server/poemEdits/body.js';
import { MAX_REQUEST_BYTES } from '../../src/lib/server/poemEdits/record.js';
import { blobStore } from '../../src/lib/server/poemEdits/blob.js';
import { BlobError, BlobPreconditionFailedError } from '@vercel/blob';

const document = (text = 'Two lines\n    keep their spaces') => ({
	title: 'A poem',
	html: `<div class="verse stanza">${text}</div>`
});
const validate = (value) => {
	if (!value || typeof value.title !== 'string' || typeof value.html !== 'string')
		throw new Error('Invalid document');
	return { title: value.title, html: value.html };
};
const operation = (id, value = document(), revision = null) => ({
	operationId: id,
	document: value,
	revision
});
async function fixture(t) {
	const directory = await mkdtemp(join(tmpdir(), 'ab-poem-edits-'));
	t.after(() => rm(directory, { recursive: true, force: true }));
	return {
		directory,
		store: fileStore(directory),
		service: poemEditService(fileStore(directory), validate)
	};
}

test('durable overlays survive a fresh Node process and retain exact source-independent text', async (t) => {
	const { directory, service } = await fixture(t);
	assert.deepEqual(await service.read('opening-in-sight'), { document: null, revision: null });
	const saved = await service.save(
		'opening-in-sight',
		'original-source-hash',
		operation('first-save')
	);
	const moduleUrl = new URL('../../src/lib/server/poemEdits/file.js', import.meta.url).href;
	const fresh = JSON.parse(
		execFileSync(
			process.execPath,
			[
				'--input-type=module',
				'-e',
				`import {fileStore} from ${JSON.stringify(moduleUrl)}; console.log(JSON.stringify(await fileStore(process.argv[1]).read('opening-in-sight')));`,
				directory
			],
			{ encoding: 'utf8' }
		)
	);
	assert.deepEqual(fresh.record.document, document());
	assert.equal(fresh.record.revision, saved.revision);
	assert.equal(fresh.record.sourceHash, 'original-source-hash');
	assert.equal((await stat(join(directory, 'opening-in-sight.json'))).mode & 0o777, 0o600);
	assert.deepEqual(await readdir(directory), ['opening-in-sight.json']);
});

test('competing first saves cannot silently replace each other', async (t) => {
	const { service } = await fixture(t);
	const outcomes = await Promise.allSettled([
		service.save('a-poem', 'source', operation('first-tab', document('One'))),
		service.save('a-poem', 'source', operation('other-tab', document('Two')))
	]);
	assert.equal(outcomes.filter((result) => result.status === 'fulfilled').length, 1);
	const failure = outcomes.find((result) => result.status === 'rejected');
	assert.equal(failure.reason.status, 409);
	const winner = outcomes.find((result) => result.status === 'fulfilled').value;
	assert.deepEqual(await service.read('a-poem'), winner);
});

test('stale saves preserve the winning document and do not add history', async (t) => {
	const { service, store } = await fixture(t);
	const first = await service.save('a-poem', 'source', operation('first-tab'));
	const second = await service.save(
		'a-poem',
		'new-import-hash',
		operation('next-save', document('Newer'), first.revision)
	);
	await assert.rejects(
		service.save('a-poem', 'source', operation('stale-tab', document('Older'), first.revision)),
		(error) => error.status === 409
	);
	assert.deepEqual(await service.read('a-poem'), second);
	const record = (await store.read('a-poem')).record;
	assert.equal(record.sourceHash, 'source');
	assert.deepEqual(
		record.history.map((entry) => entry.document),
		[document()]
	);
	assert.equal(record.operations.length, 2);
});

test('parallel retries apply once, while operation ID reuse with different words is refused', async (t) => {
	const { service, store } = await fixture(t);
	const input = operation('retry-safe');
	const results = await Promise.all([
		service.save('a-poem', 'source', input),
		service.save('a-poem', 'source', input)
	]);
	assert.deepEqual(results[0], results[1]);
	assert.equal((await store.read('a-poem')).record.operations.length, 1);
	assert.deepEqual(await service.save('a-poem', 'source', input), results[0]);
	await assert.rejects(
		service.save('a-poem', 'source', operation('retry-safe', document('Different'))),
		(error) => error.status === 409
	);
});

test('a superseded retry conflicts instead of replacing the caller draft with other words', async (t) => {
	const { service } = await fixture(t);
	const input = operation('old-retry');
	const first = await service.save('a-poem', 'source', input);
	const latest = await service.save(
		'a-poem',
		'source',
		operation('newer-one', document('Current'), first.revision)
	);
	await assert.rejects(service.save('a-poem', 'source', input), (error) => error.status === 409);
	assert.deepEqual(await service.read('a-poem'), latest);
});

test('changed imports are reported while both the saved overlay and source baseline are preserved', async (t) => {
	const { service, store } = await fixture(t);
	assert.equal((await service.read('a-poem', 'original-import')).sourceChanged, false);
	const saved = await service.save('a-poem', 'original-import', operation('source-first'));
	assert.equal((await service.read('a-poem', 'original-import')).sourceChanged, false);
	const changed = await service.read('a-poem', 'updated-import');
	assert.equal(changed.sourceChanged, true);
	assert.deepEqual(changed.document, saved.document);
	await service.save(
		'a-poem',
		'updated-import',
		operation('site-update', document('More site edits'), saved.revision)
	);
	assert.equal((await store.read('a-poem')).record.sourceHash, 'original-import');
	assert.equal((await service.read('a-poem', 'updated-import')).sourceChanged, true);
});

test('history and receipts stay bounded without losing current text', async (t) => {
	const { service, store } = await fixture(t);
	let revision = null;
	for (let index = 0; index < 55; index++) {
		({ revision } = await service.save(
			'a-poem',
			'source',
			operation(`save-${String(index).padStart(4, '0')}`, document(`Version ${index}`), revision)
		));
	}
	const { record } = await store.read('a-poem');
	assert.equal(record.history.length, 20);
	assert.equal(record.operations.length, 50);
	assert.deepEqual(record.document, document('Version 54'));
	assert.deepEqual(record.history.at(-1).document, document('Version 53'));
});

test('malformed records and storage failures fail closed with safe errors', async (t) => {
	const { directory, service } = await fixture(t);
	await writeFile(join(directory, 'a-poem.json'), '{secret-storage-error');
	await assert.rejects(
		service.read('a-poem'),
		(error) => error.status === 503 && !error.message.includes('secret')
	);
	await assert.rejects(
		service.save('a-poem', 'source', operation('valid-id')),
		(error) => error.status === 503
	);
	assert.equal(await readFile(join(directory, 'a-poem.json'), 'utf8'), '{secret-storage-error');
	const failing = poemEditService(
		{
			read: async () => {
				throw new Error('secret token');
			},
			write: async () => ''
		},
		validate
	);
	await assert.rejects(
		failing.read('a-poem'),
		(error) => error.status === 503 && !error.message.includes('token')
	);
});

test('invalid edit bodies and traversal never reach storage', async () => {
	let reads = 0;
	const service = poemEditService(
		{
			read: async () => {
				reads++;
				return null;
			},
			write: async () => ''
		},
		validate
	);
	for (const value of [
		null,
		{},
		{ ...operation('valid-id'), revision: undefined },
		{ ...operation('valid-id'), operationId: '../../x' },
		operation('valid-id', { html: 'No title' })
	]) {
		await assert.rejects(service.save('a-poem', 'source', value), (error) => error.status === 400);
	}
	assert.equal(reads, 0);
	await assert.rejects(fileStore('/tmp').read('../secret'), /Invalid poem path/);
});

test('production and LAN requests cannot obtain editing admission', () => {
	const local = { url: new URL('http://127.0.0.1:5211'), getClientAddress: () => '127.0.0.1' };
	assert.deepEqual(editAccess(local, { dev: true }), { allowed: true, mode: 'local' });
	assert.equal(editAccess(local, { dev: true, environment: 'production' }).allowed, false);
	assert.equal(
		editAccess(local, { environment: 'preview', siteEnvironment: 'production' }).allowed,
		false
	);
	assert.equal(editAccess(local, {}).allowed, false);
	assert.equal(
		editAccess({ ...local, getClientAddress: () => '192.168.1.2' }, { dev: true }).allowed,
		false
	);
	assert.equal(
		editAccess({ ...local, url: new URL('http://t.local:5211') }, { dev: true }).allowed,
		false
	);
	assert.equal(
		editAccess(
			{
				...local,
				getClientAddress: () => {
					throw new Error();
				}
			},
			{ dev: true }
		).allowed,
		false
	);
	assert.deepEqual(editAccess(local, { environment: 'preview' }), {
		allowed: true,
		mode: 'preview'
	});
});

test('mutation guard requires same Origin and JSON regardless of cookies', () => {
	const url = new URL('http://localhost:5211/api/poem-edits/a-poem');
	const request = (headers) => new Request(url, { method: 'PUT', headers, body: '{}' });
	assert.equal(
		isSameOriginMutation(
			request({
				origin: url.origin,
				'content-type': 'application/json',
				'sec-fetch-site': 'same-origin'
			}),
			url
		),
		true
	);
	for (const headers of [
		{ 'content-type': 'application/json' },
		{ origin: 'https://other.example', 'content-type': 'application/json' },
		{ origin: url.origin, 'content-type': 'text/plain' },
		{ origin: url.origin, 'content-type': 'application/json', 'sec-fetch-site': 'cross-site' }
	])
		assert.equal(isSameOriginMutation(request(headers), url), false);
});

test('request byte bound holds without Content-Length and malformed JSON is rejected', async () => {
	const request = (body) => new Request('http://localhost/api', { method: 'PUT', body });
	assert.deepEqual(await readEditBody(request('{"document":null}')), { document: null });
	await assert.rejects(
		readEditBody(request('x'.repeat(MAX_REQUEST_BYTES + 1))),
		(error) => error.status === 413
	);
	await assert.rejects(readEditBody(request('{')), (error) => error.status === 400);
	await assert.rejects(
		readEditBody(
			new Request('http://localhost/api', {
				method: 'PUT',
				headers: { 'content-length': String(MAX_REQUEST_BYTES + 1) },
				body: '{}'
			})
		),
		(error) => error.status === 413
	);
});

test('Blob adapter uses private fresh reads and actual SDK conditional-write errors', async () => {
	const calls = [];
	let stored = null;
	const sdk = {
		get: async (path, options) => {
			calls.push({ kind: 'get', path, options });
			return stored
				? {
						stream: new Blob([JSON.stringify(stored)]).stream(),
						blob: { etag: 'storage-etag', size: 100 }
					}
				: null;
		},
		put: async (path, body, options) => {
			calls.push({ kind: 'put', path, options });
			if (options.ifMatch === 'stale-etag') throw new BlobPreconditionFailedError();
			if (stored && !options.allowOverwrite) throw new BlobError('That pathname already exists');
			stored = JSON.parse(body);
			return { etag: 'storage-etag' };
		}
	};
	const store = blobStore('store_private', sdk);
	assert.equal(await store.read('a-poem'), null);
	assert.deepEqual(calls[0].options, {
		access: 'private',
		storeId: 'store_private',
		useCache: false
	});
	await store.write('a-poem', { revision: 'document-revision' }, null);
	assert.equal(calls.find((call) => call.kind === 'put').options.allowOverwrite, false);
	assert.equal(calls.find((call) => call.kind === 'put').options.addRandomSuffix, false);
	const saved = await store.read('a-poem');
	assert.equal(saved.version, 'storage-etag');
	assert.equal(saved.record.revision, 'document-revision');
	await assert.rejects(store.write('a-poem', {}, 'stale-etag'), (error) => error.status === 409);
	await assert.rejects(store.write('a-poem', {}, null), (error) => error.status === 409);
	await store.write('a-poem', { revision: 'new-document-revision' }, 'storage-etag');
	assert.equal(calls.at(-1).options.ifMatch, 'storage-etag');
	assert.equal(calls.at(-1).options.allowOverwrite, true);
});
