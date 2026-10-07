import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { renderPoem } from './notion-poem.mjs';

const input = process.argv[2];
if (!input) throw new Error('Usage: node scripts/import-poems.mjs <private source manifest.json>');
const manifest = JSON.parse(readFileSync(input, 'utf8'));
if (!Array.isArray(manifest.works)) throw new Error('Manifest needs a works array');
const output = new URL('../src/lib/server/drafts/', import.meta.url);
mkdirSync(output, { recursive: true });
const audit = [], seen = new Set();
for (const poem of manifest.works) {
  const title = (poem.displayTitle || poem.title).replace(/\*|__/g, '');
  let slug = title.normalize('NFKD').replace(/[’']/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 90).replace(/-$/, '') || `phoenix-${poem.notionId.slice(0, 8)}`;
  if (existsSync(new URL(`../src/routes/poems/${slug}/+page.svx`, import.meta.url))) slug += '-latest';
  if (seen.has(slug)) slug += `-${poem.notionId.slice(0, 8)}`;
  if (!['verified_latest_in_poems', 'matched_standalone_review'].includes(poem.matchStatus)) throw new Error(`Unreviewed source: ${slug}`);
  if (!poem.notionUrl?.startsWith('https://') || !poem.notionLastEdited || typeof poem.selectedBodyMarkdown !== 'string') throw new Error(`Incomplete source: ${slug}`);
  let content = poem.selectedBodyMarkdown;
  if (poem.titleIsPoemLine && !poem.bodyIncludesTitle && content !== poem.title) content = `${title}\n${content}`;
  const rendered = renderPoem(content, poem.poemFormat);
  if (rendered.warnings.length) throw new Error(`Unresolved layout in ${slug}: ${rendered.warnings.join('; ')}`);
  const draft = {
    title, slug, sourceUrl: poem.notionUrl, lastEdited: poem.notionLastEdited,
    date: poem.blueskyPosts[0].postedAt.split('T')[0], blueskyUrls: poem.blueskyPosts.map(post => post.url),
    html: rendered.html, format: poem.poemFormat, sourceText: content,
    sourceHash: createHash('sha256').update(poem.selectedBodyMarkdown).digest('hex'),
    showTitle: !poem.titleIsPoemLine, author: poem.author, translator: poem.translator,
    status: poem.matchStatus, reviewWarnings: poem.reviewWarnings, sourceSelection: poem.sourceSelection,
    formattingCoverage: poem.formattingCoverage, previousDrafts: poem.previousDrafts,
    sourceAssets: poem.sourceAssets
  };
  writeFileSync(new URL(`${slug}.json`, output), JSON.stringify(draft, null, 2) + '\n');
  seen.add(slug);
  const { html, sourceText, ...metadata } = draft;
  audit.push({ ...metadata, path: `/poems/${slug}` });
}
const review = { generatedAt: manifest.generatedAt, counts: manifest.scopeCounts, works: audit, unmatched: manifest.unmatched, orphans: manifest.unclassifiedOrphanThread, imageReview: manifest.imageReview };
const auditFile = new URL('../src/lib/server/review/inventory.json', import.meta.url);
mkdirSync(new URL('../src/lib/server/review/', import.meta.url), { recursive: true });
writeFileSync(auditFile, JSON.stringify(review, null, 2) + '\n');
mkdirSync(new URL('../private-sources/', import.meta.url), { recursive: true });
writeFileSync(new URL('../private-sources/import-audit.json', import.meta.url), JSON.stringify(review, null, 2) + '\n');
console.log(JSON.stringify({ staged: seen.size, verified: audit.filter(poem => poem.status === 'verified_latest_in_poems').length, provisional: audit.filter(poem => poem.status !== 'verified_latest_in_poems').length, unmatched: manifest.unmatched.length, review: '/review/poems' }));
