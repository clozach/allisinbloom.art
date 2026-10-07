# Publishing allisinbloom.art

Development → protected staging → approved production uses the existing Vercel project, `allisinbloom-art`, in Elbong Q Gearny's projects. No new server, DNS record, subscription or deployment token is required.

Press backtick on any page to see the three environments, the current build revision, CI checks and the release comparison. On a phone, hold the bottom-left corner for 600 ms. On poem pages this lives above the existing bloom controls. Escape closes the panel; typing in a field does not toggle it.

## CI and staging

`.github/workflows/ci.yml` runs on staging/main pushes and pull requests. It installs from the locked pnpm graph, checks Svelte types, verifies the seeded bloom generator, builds, and runs Chromium and iPhone WebKit browser tests. It has read-only repository permissions and uses pinned action commits. Vercel's existing Git integration deploys the staging branch as a Preview with Vercel Authentication; CI does not need an added deployment credential.

Staging: https://allisinbloom-art-git-staging-elbong-q-gearnys-projects.vercel.app

Main is the production branch. A push/merge to main can publish to allisinbloom.art. Do not push main without Al's approval for the complete release. This change does not alter that Vercel setting or branch protection. CI verification is visible; enforcement as a required main-branch check is a separate repository-settings action.

## Private Notion drafts

This repository is public. Latest unpublished revisions go in ignored `src/lib/server/drafts/*.json`, with title, slug, HTML, date, source URL, last-edited time and Bluesky post links. The generic server route and rendering code are tracked; draft text is excluded from Git. Direct authenticated Preview deployment includes those files via `.vercelignore` and is the review surface. Public branch previews contain only the already-public poems.

`pnpm build` rejects draft files when `VERCEL_ENV` or `SITE_ENV` is production. The Vercel build command runs that guard. Private pages send `private, no-store` and `noindex, nofollow`; Vercel Authentication protects the complete deployment, including bundles and server data. No share/bypass link is issued for owner review.

Direct preview: from the linked staging checkout, `vercel deploy --target preview`. Preserve the exact deployment URL as the poem review URL; a later automatic Git preview can replace the branch alias with a public-source-only build. Do not delete the local draft source or its audit until an approved publication is reconciled into the public repo.

## Production preparation and rollback

After Al approves both text and public availability, copy the accepted sources into tracked poem pages, remove the private copies, rerun CI, and review the full main…staging comparison. Then publish only the approved commit. Vercel retains prior deployments; use its deployment dashboard to restore the last accepted production build if needed. A production deploy, promotion or rollback requires its own authorization. No browser-facing deployment endpoint or long-lived credential has been added.

## Source import and owner review

Materialize the private Bluesky/Notion source manifest outside the public checkout, then run `node scripts/import-poems.mjs /absolute/path/to/manifest.json`. It imports confirmed latest Poems records and clearly labelled standalone matches, preserves the selected literal text and layout, and writes an ignored server-side inventory. `/review/poems` links every imported page to its exact Notion source and original Bluesky posting, with unresolved matches and layout choices kept visible.

Local draft verification runs on loopback only (`pnpm dev --host 127.0.0.1 --port 5211 --strictPort`). Do not copy these ignored sources to the always-on LAN development checkout. `tests/private-poems.spec.ts` verifies every imported page on desktop Chromium and iPhone WebKit when the private files are present; public CI explicitly skips that source-dependent test and still runs the renderer, build and dashboard regression tests.

Code-block poems preserve literal Markdown punctuation and whitespace in a monospace face. Long code lines scroll within their own block on narrow screens, preserving indentation instead of rewriting line breaks. Rich-text poems retain soft breaks, emphasis and explicit empty blocks. The inventory records title-as-poem lines, attribution, source selection and version warnings. Source-page research and unrelated media remain linked in Notion for review.
