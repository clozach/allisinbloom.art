import { readdirSync } from 'node:fs';
const drafts = readdirSync(new URL('../src/lib/server/drafts/', import.meta.url)).filter(name => name.endsWith('.json'));
if (drafts.length && (process.env.VERCEL_ENV === 'production' || process.env.SITE_ENV === 'production')) {
  throw new Error('Private Notion drafts cannot be built for production. Obtain approval and publish reviewed sources first.');
}
