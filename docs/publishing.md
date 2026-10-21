# Publishing allisinbloom.art

Development → protected staging → approved production uses the existing Vercel project, `allisinbloom-art`, in Elbong Q Gearny's projects. No new server, DNS record, subscription or deployment token is required.

Press backtick on any page to see the three environments, the current build revision, CI checks and the release comparison. On a phone, hold the bottom-left corner for 600 ms. On poem pages this lives above the existing bloom controls. Drag the title to move the panel, or focus it and use arrows (Shift moves 10px). Drag any edge to resize that side, or a corner to resize both dimensions. Focus an edge or corner and use arrows (Shift changes 10px). It reopens at the same location and requested size during the page session, fits a smaller screen, and restores that size when space returns. The title and resize margins stay fixed while its contents scroll. Escape, an outside tap or the summon gesture closes it; typing and pending-value Escape keep the field’s existing behavior.

## CI and staging

`.github/workflows/ci.yml` runs on staging/main pushes and pull requests. It installs from the locked pnpm graph, checks Svelte types, verifies the seeded bloom generator, builds, and runs Chromium and iPhone WebKit browser tests. It has read-only repository permissions and uses pinned action commits. Vercel's existing Git integration deploys the staging branch as a Preview with Vercel Authentication; CI does not need an added deployment credential.

Staging: https://allisinbloom-art-git-staging-elbong-q-gearnys-projects.vercel.app

Main is the production branch. A push/merge to main can publish to allisinbloom.art. Do not push main without Al's approval for the complete release. This change does not alter that Vercel setting or branch protection. CI verification is visible; enforcement as a required main-branch check is a separate repository-settings action.

## Private Notion drafts

This repository is public. Latest unpublished revisions go in ignored `src/lib/server/drafts/*.json`, with title, slug, HTML, date, source URL, last-edited time and Bluesky post links. The generic server route and rendering code are tracked; draft text is excluded from Git. Direct authenticated Preview deployment includes those files via `.vercelignore` and is the review surface. Public branch previews contain only the already-public poems.

`pnpm build` rejects draft files when `VERCEL_ENV` or `SITE_ENV` is production. The Vercel build command runs that guard. Private pages send `private, no-store` and `noindex, nofollow`; Vercel Authentication protects the complete deployment, including bundles and server data. No share/bypass link is issued for owner review.

Editing a poem on a preview (⌥⌘E on its page) needs the owner's credentials in the project's Preview environment variables, `POEM_EDIT_USER` and `POEM_EDIT_PASSWORD`; the browser asks for them once per session. CI sets test-only values for its loopback server. [Editing guide](editing-poems.md).

Direct preview: from the linked staging checkout, `vercel deploy --target preview`. Preserve the exact deployment URL as the poem review URL; a later automatic Git preview can replace the branch alias with a public-source-only build. Do not delete the local draft source or its audit until an approved publication is reconciled into the public repo.

## A poem with its own design

A poem that needs its own layout gets its own route folder, `src/routes/poems/<slug>/`, and nothing else changes. For a draft, that folder holds a `+page.server.js` that loads the draft by its slug through `draftPageData` and a `+page.svelte` that wraps the generic draft page (`../[slug]/+page.svelte`) in one element and carries a `<style>` block. Svelte scopes that block to the wrapper, so its rules reach this poem alone and do not follow a client-side navigation to the next poem. A published `.svx` poem carries its `<style>` block directly. Poems with nothing to customise stay on the generic `[slug]` route and gain no files, flags or class names. Write the rules under a wrapper of your own (`.my-poem :global(.verse)`), never as scoped classes on the words themselves: a saved edit stores the words' markup, and a scope hash in it would stop matching after the next style change. First case: `all-i-know`, which carries Al's target layout (line-height 2.8, the byline 8rem below); `tests/private-poems.spec.ts` checks the rhythm and that it stays on its own page.

## Production preparation and rollback

After Al approves both text and public availability, copy the accepted sources into tracked poem pages, remove the private copies, rerun CI, and review the full main…staging comparison. Then publish only the approved commit. Vercel retains prior deployments; use its deployment dashboard to restore the last accepted production build if needed. A production deploy, promotion or rollback requires its own authorization. No browser-facing deployment endpoint or long-lived credential has been added.

## Source import and owner review

Materialize the private Bluesky/Notion source manifest outside the public checkout, then run `node scripts/import-poems.mjs /absolute/path/to/manifest.json`. It imports confirmed latest Poems records and clearly labelled standalone matches, preserves the selected literal text and layout, and writes an ignored server-side inventory. `/review/poems` links every imported page to its exact Notion source and original Bluesky posting, with unresolved matches and layout choices kept visible.

Local draft verification runs on loopback only (`pnpm dev --host 127.0.0.1 --port 5211 --strictPort`). Do not copy these ignored sources to the always-on LAN development checkout. `tests/private-poems.spec.ts` verifies every imported page on desktop Chromium and iPhone WebKit when the private files are present; public CI explicitly skips that source-dependent test and still runs the renderer, build and dashboard regression tests.

Code-block poems preserve literal Markdown punctuation and whitespace in a monospace face. Long code lines scroll within their own block on narrow screens, preserving indentation instead of rewriting line breaks. Rich-text poems retain soft breaks, emphasis and explicit empty blocks. The inventory records title-as-poem lines, attribution, source selection and version warnings. Source-page research and unrelated media remain linked in Notion for review.
