# Poem editing and storage

Poem edits are separate overlays. Saving never rewrites the imported Notion JSON,
its provenance, or a public `.svx` source. The server retains the imported source
hash, the current document, twenty earlier saved versions and fifty save receipts
in each private record. Each save atomically replaces that complete record.

`GET /api/poem-edits/[slug]` returns `document`, `revision` and `available`.
`PUT` accepts `document: { title, html }`, the exact preceding `revision` (or
`null` for an untouched poem), and a fresh `operationId`. A repeated operation
returns the saved document without making another history entry only while that
operation remains the current revision. A superseded retry returns 409 and leaves
the caller's draft intact. Reusing an operation ID for different words is refused.
An older revision returns 409;
unavailable storage returns 503, and the client must retain the unsaved words.

The GET response also reports `sourceChanged` when the current imported source
hash differs from the overlay's original source hash. The UI warns that the saved
site version is being shown over a changed import; neither version is replaced
automatically. Saving more site edits retains that original source hash.

The server validates the supported poem HTML before saving or rendering a stored
document. Requests have a 256 KiB byte limit, including streamed requests without
Content-Length. Stored records have an 8 MiB limit. Mutation requests must use
JSON and the exact same Origin as the page. Browser cache responses are disabled.

## Local development

Local saves use the ignored `.poem-edits/` directory in this checkout. Writes are
serialized per poem within the dev process, written to a private temporary file,
flushed, and atomically renamed. A fresh process reads the saved overlay from disk.
Only a development request with both a loopback URL and loopback connecting
address is admitted. A LAN request does not obtain editing access by setting a
localhost Host header. The filesystem adapter is for one local dev process; it
is not a multi-server database.

## Protected staging

Vercel Functions do not have a persistent shared filesystem. The implemented
hosted adapter uses private Vercel Blob through the official SDK, with cache-bypassing reads and
atomic ETag conditional writes. Simultaneous first saves use create-only writes;
subsequent saves use `ifMatch`. Content, history and idempotency receipts are all
in that one atomic write. Storage failures never fall back to ephemeral files or
browser-only storage.

The adapter is inactive until both Preview-only settings exist:

- `BLOB_STORE_ID`, added by connecting a private store to this project's Preview
  environment using Vercel OIDC.
- `POEM_EDIT_PREVIEW_ENABLED=true`, enabled only after checking that the actual
  preview perimeter still limits access to the owner.

The SDK obtains Vercel's automatically rotating OIDC credential itself. Do not
copy a local CLI token, generate a protection-bypass token, or add a long-lived
Blob token. Do not connect the draft store to Production. All editor endpoints
are disabled when `VERCEL_ENV` or `SITE_ENV` is `production`.

Existing Vercel Authentication protects Preview requests. It grants deployment
access, including any approved guest or bypass; it does not supply application
owner identity. Inspect current deployment protection, team/project membership,
external grants and bypasses before enabling saves. Public production editing
needs a separately approved owner-authentication design.

## Provisioning status — 2026-10-07

Al approved **private Preview storage**: one private store, granting only
allisinbloom-art Preview durable read/write access through **rotating OIDC** on
the existing Hobby plan. That approval did not include a long-lived Blob token,
Production access, or a paid upgrade.

The provisioning attempt created `ab-art-poem-drafts` in `iad1`. Although current
Vercel documentation describes OIDC as the default for new connections, the
installed CLI's connection API created a Preview `BLOB_READ_WRITE_TOKEN` instead.
Its value was never read or copied, and the token was not deployed. Saving was
not enabled.

That attempt was fully rolled back. Immediately before deletion,
`store_nGC62Ud5cJxlOe1D` had zero objects, zero bytes and zero project connections.
The store was deleted, then independently checked: its API returned **404**, the
team's storage list was empty, and allisinbloom-art had **no environment variables**.
The unintended token therefore has no remaining live store or application
connection. Production settings and deployments were unchanged.

The replacement private store `store_YXheZPoFZ3jEZfNW` is now connected through
Vercel's dashboard to **Preview only**, with automatically renewed OIDC access.
The connection created `BLOB_STORE_ID` and `BLOB_WEBHOOK_PUBLIC_KEY`; the optional
read/write token was not selected. `POEM_EDIT_PREVIEW_ENABLED=true` is also
Preview-only. Owner sign-in supplied browser access for verification without a
protection bypass. The team has one owner, no additional project members and no
protection bypasses; all previews remain protected by Vercel Authentication.

Reads explicitly request identity encoding: compressed responses can expose a
weak transfer ETag, which cannot serve as the strong object ETag for `ifMatch`.
The adapter retains atomic conditional writes and stale-tab conflict handling.

Hobby includes 1 GB storage, 10,000 simple operations and 2,000 advanced operations
per month; exceeding limits blocks Blob access rather than charging additional
usage. No paid plan, subscription, or production connection is requested.

- [Blob SDK: OIDC, consistent reads and conditional writes](https://vercel.com/docs/vercel-blob/using-blob-sdk)
- [Blob pricing and Hobby limits](https://vercel.com/docs/vercel-blob/usage-and-pricing)
- [Vercel Authentication access scope](https://vercel.com/docs/deployment-protection/methods-to-protect-deployments/vercel-authentication)
- [Why a function filesystem is not durable storage](https://vercel.com/kb/guide/is-sqlite-supported-in-vercel)
