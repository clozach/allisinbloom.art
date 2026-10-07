import { mkdir, open, readFile, rename, stat, unlink } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { MAX_RECORD_BYTES, validSlug } from './record.js';
import { conflict } from './errors.js';

/** @typedef {import('./record.js').EditRecord} EditRecord */
/** @type {Map<string, Promise<unknown>>} */
const queues = new Map();

/** @template T @param {string} key @param {()=>Promise<T>} work @returns {Promise<T>} */
async function serialized(key, work) {
	const previous = queues.get(key) ?? Promise.resolve();
	const current = previous.catch(() => {}).then(work);
	queues.set(key, current);
	try {
		return await current;
	} finally {
		if (queues.get(key) === current) queues.delete(key);
	}
}

/** Local development only. Files are overlays; imported poem sources stay untouched. @param {string} directory */
export function fileStore(directory) {
	const root = resolve(directory);
	/** @param {string} slug */
	const path = (slug) => {
		if (!validSlug(slug)) throw new Error('Invalid poem path');
		return join(root, `${slug}.json`);
	};
	/** @param {string} slug @returns {Promise<{record:unknown,version:string}|null>} */
	async function read(slug) {
		const filename = path(slug);
		try {
			if ((await stat(filename)).size > MAX_RECORD_BYTES)
				throw new Error('Stored poem is too large');
			const record = JSON.parse(await readFile(filename, 'utf8'));
			if (typeof record?.revision !== 'string') throw new Error('Stored poem has no revision');
			return { record, version: record.revision };
		} catch (error) {
			if (/** @type {NodeJS.ErrnoException} */ (error).code === 'ENOENT') return null;
			throw error;
		}
	}
	/** @param {string} slug @param {EditRecord} record @param {string|null} expectedVersion */
	async function write(slug, record, expectedVersion) {
		const filename = path(slug);
		return serialized(filename, async () => {
			const previous = await read(slug);
			if ((previous?.version ?? null) !== expectedVersion) throw conflict();
			const text = JSON.stringify(record);
			if (Buffer.byteLength(text) > MAX_RECORD_BYTES) throw new Error('Stored poem is too large');
			await mkdir(root, { recursive: true, mode: 0o700 });
			const temporary = join(root, `.${slug}-${randomUUID()}.tmp`);
			try {
				const handle = await open(temporary, 'wx', 0o600);
				try {
					await handle.writeFile(text, 'utf8');
					await handle.sync();
				} finally {
					await handle.close();
				}
				await rename(temporary, filename);
				const dir = await open(root, 'r');
				try {
					await dir.sync();
				} finally {
					await dir.close();
				}
			} finally {
				await unlink(temporary).catch(() => {});
			}
			return record.revision;
		});
	}
	return { read, write };
}
