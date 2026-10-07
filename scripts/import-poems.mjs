import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { renderPoem } from './notion-poem.mjs';

const input = process.argv[2];
if (!input) throw new Error('Usage: node scripts/import-poems.mjs <private source manifest.json>');
const manifest = JSON.parse(readFileSync(input, 'utf8'));
const poems = Array.isArray(manifest) ? manifest : manifest.poems;
if (!Array.isArray(poems)) throw new Error('Manifest needs a poems array');
const output = new URL('../src/lib/server/drafts/', import.meta.url);
mkdirSync(output, { recursive: true });
const audit = [];
const seen = new Set();
for (const poem of poems) {
  const { slug, title, sourceUrl, lastEdited, content, blueskyUrls } = poem;
  if (poem.status !== 'verified') { audit.push({ ...poem, content: undefined, disposition: 'held for source review' }); continue; }
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || seen.has(slug)) throw new Error(`Invalid or repeated slug: ${slug}`);
  if (existsSync(new URL(`../src/routes/poems/${slug}/+page.svx`, import.meta.url))) throw new Error(`Slug shadows existing page: ${slug}`);
  if (!title || !sourceUrl?.startsWith('https://') || !lastEdited || typeof content !== 'string' || !Array.isArray(blueskyUrls)) throw new Error(`Incomplete verified source: ${slug}`);
  const rendered = renderPoem(content);
  if (rendered.warnings.length) {
    audit.push({ ...poem, content: undefined, warnings: rendered.warnings, disposition: 'held for layout review' });
    continue;
  }
  const draft = { title, slug, sourceUrl, lastEdited, date: poem.date || lastEdited.split('T')[0], blueskyUrls, html: rendered.html };
  writeFileSync(new URL(`${slug}.json`, output), JSON.stringify(draft, null, 2) + '\n');
  seen.add(slug);
  audit.push({ ...poem, content: undefined, disposition: 'staged', path: `/poems/${slug}` });
}
const auditFile = new URL('../private-sources/import-audit.json', import.meta.url);
mkdirSync(new URL('../private-sources/', import.meta.url), { recursive: true });
writeFileSync(auditFile, JSON.stringify(audit, null, 2) + '\n');
console.log(JSON.stringify({ staged: seen.size, held: audit.length - seen.size, audit: auditFile.pathname }));
