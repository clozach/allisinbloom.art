import { error } from '@sveltejs/kit';

/** @typedef {{slug: string, title: string, date: string, html: string, sourceUrl: string, lastEdited: string, blueskyUrls: string[], sourceText: string, showTitle: boolean, status: string, reviewWarnings: string[], translator: string|null, author: string, sourceSelection: string, sourceAssets: {alt:string,url:string}[], format: string}} Draft */
/** @type {Record<string, Draft>} */
const files = import.meta.glob('./drafts/*.json', { eager: true, import: 'default' });
export const drafts = Object.values(files);
export const draftBySlug = new Map(drafts.map(draft => [draft.slug, draft]));

/**
 * Page data for one draft, or a 404. Shared by the generic `poems/[slug]` route
 * and by any poem that has a route of its own for a style scoped to it.
 * @param {string} slug
 * @param {(headers: Record<string, string>) => void} setHeaders
 */
export function draftPageData(slug, setHeaders) {
  const draft = draftBySlug.get(slug);
  if (!draft) error(404, 'Poem not found');
  setHeaders({ 'cache-control': 'private, no-store', 'x-robots-tag': 'noindex, nofollow' });
  return { ...draft, scale: 1 };
}
