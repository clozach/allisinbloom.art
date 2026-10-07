/** @typedef {{slug: string, title: string, date: string, html: string, sourceUrl: string, lastEdited: string, blueskyUrls: string[], sourceText: string, showTitle: boolean, status: string, reviewWarnings: string[], translator: string|null, author: string, sourceSelection: string, sourceAssets: {alt:string,url:string}[], format: string}} Draft */
/** @type {Record<string, Draft>} */
const files = import.meta.glob('./drafts/*.json', { eager: true, import: 'default' });
export const drafts = Object.values(files);
export const draftBySlug = new Map(drafts.map(draft => [draft.slug, draft]));
