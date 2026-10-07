# Shared inline editing

Both this Svelte site and SwamiKK’s React editor use `@courselit/inline-edit`
0.1.0. It contains the ordered asynchronous undo/redo journal, DOM snapshot and
restore helpers, caret helper and reversible change mapping extracted from
SwamiKK’s existing editor. It has no runtime dependencies.

Canonical source: [`clozach/swamikk`, branch `inline-edit-shared`](https://github.com/clozach/swamikk/tree/inline-edit-shared/packages/inline-edit), commit
`63786a5a4f253756257e954181e02e54ed11c83a`, `packages/inline-edit`.
This repository carries the full package source, declarations, AGPL-3.0 license
and provenance in [`vendor/courselit-inline-edit-0.1.0.tgz`](../vendor/courselit-inline-edit-0.1.0.tgz).
SHA256: `be02f51e8d06443518b86d1e43fcf61e72b176b4a08c164bd0984dfebb9e37f6`.

To update it, test and version the canonical package, run `pnpm pack` there,
replace this repository’s versioned archive, and run `pnpm add ./vendor/<archive>`.
Commit the archive and lockfile together. Deployment never depends on an absolute
path to the SwamiKK checkout, an unpublished workspace, or a package registry
credential.

Poem-specific whitespace handling, HTML validation, Svelte controls, and private
storage remain here. SwamiKK’s tenant authentication and MongoDB services remain
there. No draft text or credentials are included in the shared package.
