// Fetches the Net's two sources into data/raw/<YYYY-MM-DD>/, with the licence
// evidence beside them and a sources.json that records every file's URL, size,
// SHA-256 and fetch time. Run: node scripts/net/fetch.mjs
//
// 1. TeleGeography's Submarine Cable Map, the 2021 snapshot preserved in a fork of
//    the deleted telegeography/www.submarinecablemap.com repository (commit
//    85198ba3, CC BY-NC-SA 3.0 per its README). Never the live API: its data has no
//    stated licence.
// 2. The Internet Topology Zoo, Adelaide University's figshare release (CC BY 4.0).
//
// Every JSON file is parsed before it is kept and every fork file is checked
// against the git blob hash in the commit's tree, so an HTML error page or a
// moved branch can never be saved as data. The build (scripts/net/build.mjs) is
// offline and reads only what this script saved.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const UA = 'allisinbloom.art-net-data/1.0 (builds a wire globe of Internet hubs; https://allisinbloom.art)';
const CONCURRENCY = 4;

const FORK = 'stealthscooty/www.submarinecablemap.com';
const COMMIT = '85198ba3';
const TREE_URL = `https://api.github.com/repos/${FORK}/git/trees/${COMMIT}?recursive=1`;
const LICENSE_LINE_NEEDLE = 'Attribution-NonCommercial-ShareAlike 3.0 Unported (CC BY-NC-SA 3.0)';

const ZOO_ARTICLE = 'https://api.figshare.com/v2/articles/30153949';
const ZOO_FILE_ID = 58057744;
const ZOO_FILE_URL = `https://ndownloader.figshare.com/files/${ZOO_FILE_ID}`;

const day = new Date().toISOString().slice(0, 10);
const OUT = path.join(ROOT, 'data', 'raw', day);

/** @param {Buffer} b */
const sha256 = (b) => crypto.createHash('sha256').update(b).digest('hex');
/** @param {Buffer} b */
const md5 = (b) => crypto.createHash('md5').update(b).digest('hex');
/** git's blob id: sha1 of "blob <size>\0<content>" @param {Buffer} b */
const gitBlob = (b) =>
  crypto.createHash('sha1').update(`blob ${b.length}\0`).update(b).digest('hex');

/** @param {Buffer} b */
function looksLikeHtml(b) {
  const head = b.subarray(0, 512).toString('utf8').trimStart().toLowerCase();
  return head.startsWith('<!doctype') || head.startsWith('<html');
}

/** @param {Buffer} b @param {string} url */
function parseJson(b, url) {
  if (looksLikeHtml(b)) throw new Error(`${url}: got an HTML page, not JSON`);
  try {
    return JSON.parse(b.toString('utf8'));
  } catch (e) {
    throw new Error(`${url}: not JSON (${/** @type {Error} */ (e).message})`);
  }
}

/** @param {number} ms */
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * GET with a descriptive User-Agent and a few retries on network errors and 5xx/429.
 * @param {string} url @param {Record<string, string>} [headers]
 */
async function get(url, headers = {}) {
  let last;
  for (let attempt = 0; attempt < 4; attempt++) {
    if (attempt) await sleep(1000 * 2 ** attempt);
    try {
      const res = await fetch(url, { headers: { 'User-Agent': UA, ...headers }, redirect: 'follow' });
      if (res.status === 429 || res.status >= 500) {
        last = new Error(`${url}: HTTP ${res.status}`);
        continue;
      }
      if (!res.ok) throw Object.assign(new Error(`${url}: HTTP ${res.status}`), { fatal: true });
      const body = Buffer.from(await res.arrayBuffer());
      return { body, contentType: res.headers.get('content-type') || '', fetchedAt: new Date().toISOString() };
    } catch (e) {
      if (/** @type {any} */ (e).fatal) throw e;
      last = e;
    }
  }
  throw last;
}

/** @type {{ name: string, url: string, path: string, bytes: number, sha256: string, contentType: string, fetchedAt: string, gitBlob?: string }[]} */
const records = [];

/** @param {string} rel @param {Buffer} body @param {string} url @param {{ contentType: string, fetchedAt: string }} meta @param {object} [extra] */
function save(rel, body, url, meta, extra = {}) {
  const file = path.join(OUT, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, body);
  records.push({
    name: rel,
    url,
    path: rel,
    bytes: body.length,
    sha256: sha256(body),
    contentType: meta.contentType,
    fetchedAt: meta.fetchedAt,
    ...extra
  });
}

/** Runs tasks with at most CONCURRENCY in flight. @template T @param {(() => Promise<T>)[]} tasks */
async function pool(tasks) {
  const results = new Array(tasks.length);
  let next = 0;
  const worker = async () => {
    while (next < tasks.length) {
      const i = next++;
      results[i] = await tasks[i]();
    }
  };
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, tasks.length) }, worker));
  return results;
}

async function fetchTeleGeography() {
  const tree = await get(TREE_URL, { Accept: 'application/vnd.github+json' });
  const t = parseJson(tree.body, TREE_URL);
  if (!t.sha || !String(t.sha).startsWith(COMMIT)) throw new Error(`tree sha ${t.sha} is not ${COMMIT}`);
  if (t.truncated) throw new Error('the GitHub tree listing came back truncated');
  save('telegeography/tree.json', tree.body, TREE_URL, tree);
  const full = t.sha;
  /** @type {Map<string, { sha: string, size: number }>} */
  const blobs = new Map();
  for (const e of t.tree) if (e.type === 'blob') blobs.set(e.path, { sha: e.sha, size: e.size });

  const wanted = ['README.md', 'public/api/v2/config.json', 'public/api/v2/cable/all.json',
    'public/api/v2/cable/cable-geo.json', 'public/api/v2/landing-point/landing-point-geo.json'];
  const cables = [...blobs.keys()]
    .filter((p) => /^public\/api\/v2\/cable\/[^/]+\.json$/.test(p))
    .filter((p) => !/\/(all|cable-geo)\.json$/.test(p))
    .sort();
  if (cables.length < 100) throw new Error(`only ${cables.length} cable files in the tree`);
  for (const p of wanted) if (!blobs.has(p)) throw new Error(`${p} is not in the tree at ${full}`);

  const files = [...wanted, ...cables];
  let done = 0;
  await pool(
    files.map((p) => async () => {
      const url = `https://raw.githubusercontent.com/${FORK}/${full}/${p}`;
      const r = await get(url);
      const blob = blobs.get(p);
      const id = gitBlob(r.body);
      if (!blob || id !== blob.sha) throw new Error(`${p}: git blob ${id} does not match the tree's ${blob?.sha}`);
      if (p.endsWith('.json')) parseJson(r.body, url);
      else if (looksLikeHtml(r.body)) throw new Error(`${url}: got an HTML page`);
      save(`telegeography/${p.replace(/^public\//, '')}`, r.body, url, r, { gitBlob: id });
      if (++done % 100 === 0) console.log(`telegeography: ${done}/${files.length}`);
    })
  );

  const readme = fs.readFileSync(path.join(OUT, 'telegeography/README.md'), 'utf8');
  const line = readme.split('\n').find((l) => l.includes(LICENSE_LINE_NEEDLE));
  if (!line) throw new Error('the fork README no longer states the CC BY-NC-SA 3.0 licence');
  const config = JSON.parse(fs.readFileSync(path.join(OUT, 'telegeography/api/v2/config.json'), 'utf8'));
  return {
    repository: `https://github.com/${FORK}`,
    commit: full,
    creationTime: config.creation_time ?? null,
    cableFiles: cables.length,
    license: {
      name: 'CC BY-NC-SA 3.0',
      url: 'https://creativecommons.org/licenses/by-nc-sa/3.0/',
      statement: line.trim(),
      evidence: 'telegeography/README.md'
    }
  };
}

async function fetchZoo() {
  const art = await get(ZOO_ARTICLE, { Accept: 'application/json' });
  const a = parseJson(art.body, ZOO_ARTICLE);
  save('topozoo/article.json', art.body, ZOO_ARTICLE, art);
  const licence = a.license?.name;
  if (licence !== 'CC BY 4.0') throw new Error(`figshare article licence is ${licence}, not CC BY 4.0`);
  const file = (a.files || []).find((/** @type {any} */ f) => f.id === ZOO_FILE_ID);
  if (!file) throw new Error(`figshare article has no file ${ZOO_FILE_ID}`);

  const r = await get(ZOO_FILE_URL);
  if (r.body[0] !== 0x1f || r.body[1] !== 0x8b) throw new Error(`${ZOO_FILE_URL}: not gzip data`);
  const sum = md5(r.body);
  if (file.supplied_md5 && sum !== file.supplied_md5)
    throw new Error(`${ZOO_FILE_URL}: md5 ${sum} does not match figshare's ${file.supplied_md5}`);
  save('topozoo/gml.tar.gz', r.body, ZOO_FILE_URL, r, { md5: sum });
  return {
    article: ZOO_ARTICLE,
    doi: a.doi,
    citation: a.citation,
    published: a.published_date,
    file: { id: ZOO_FILE_ID, name: file.name, suppliedMd5: file.supplied_md5 ?? null },
    license: { name: licence, url: a.license.url, evidence: 'topozoo/article.json' }
  };
}

const started = new Date().toISOString();
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });
const telegeography = await fetchTeleGeography();
const topozoo = await fetchZoo();
records.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
const sources = { started, finished: new Date().toISOString(), userAgent: UA, telegeography, topozoo, files: records };
fs.writeFileSync(path.join(OUT, 'sources.json'), JSON.stringify(sources, null, 2) + '\n');
console.log(`saved ${records.length} files to ${path.relative(ROOT, OUT)}`);
