/** @typedef {{slug: string, title: string, date: string, html: string, sourceUrl: string, lastEdited: string, blueskyUrls: string[]}} Draft */
/** @type {Record<string, Draft>} */
const files = import.meta.glob('./drafts/*.json', { eager: true, import: 'default' });
export const drafts = Object.values(files);
export const draftBySlug = new Map(drafts.map(draft => [draft.slug, draft]));
