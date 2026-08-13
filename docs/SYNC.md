# Optional encrypted cross-device sync

PR #7 adds an accountless, local-first sync path. The existing PWA remains a static
GitHub Pages site:

```text
GitHub Pages                         static React PWA
Cloudflare Worker                    HTTP protocol and CORS
SQLite-backed Durable Object         one encrypted blob/version record per sync group
IndexedDB                            local source of truth for immediate study UX
```

The Worker and Durable Object never understand cards, reviews, settings, questions,
or mock attempts. The client encrypts a version-1 `SyncPayloadV1` with AES-256-GCM
before upload. The server can observe request metadata, IP/network metadata, sync ID,
payload size, timing, version, and authentication success/failure. It cannot decrypt
the progress payload and it never receives the encryption key by design.

Production sync requires both an HTTPS API URL and an HTTPS dedicated frontend
origin. The existing `https://lhooded.github.io/econ-flashcards-app/` project site
continues to work as a local-only PWA. Its path is not an origin boundary, so it is
never allowed to persist sync credentials. HTTP is accepted only for explicit
loopback development (`localhost`, `127.0.0.1`, or `::1`).

The storage migration is DB version 5. Manual portable backups remain
`ProgressBackupV3` (backup version 3; V1/V2 imports remain supported), and the encrypted sync payload/envelope and
Worker API use sync protocol version 1. These formats are deliberately separate:
manual backups never contain sync credentials.

## Owner setup for production

The Worker workflow is intentionally manual and does not run from ordinary PR CI.
Cloudflare's current Wrangler configuration uses declarative `exports` with
`storage: "sqlite"` for a new Durable Object class. See Cloudflare's
[Durable Object class exports](https://developers.cloudflare.com/durable-objects/reference/durable-objects-migrations/)
and [GitHub Actions authentication guide](https://developers.cloudflare.com/workers/ci-cd/external-cicd/github-actions/)
for the current platform details.

1. Create or sign in to a free Cloudflare account.
2. Establish a dedicated frontend origin for this app. Acceptable choices include a
   repository-specific custom domain for the Pages site or another static host serving
   the same built frontend. Buying a domain is not required.
3. Add a GitHub repository **variable** named `SYNC_APP_URL` containing the complete
   canonical frontend URL, including any app base path, for example:

   ```text
   https://macro.example.com/
   ```

   Do not set it to `https://lhooded.github.io/econ-flashcards-app/`. A repository
   path is not an origin boundary, and the existing shared GitHub Pages deployment
   must remain local-only.

4. Find the account ID in the Cloudflare dashboard.
5. On the Account API Tokens page, create a custom token using the **Edit Cloudflare
   Workers** policy/template. Scope it to only the account that will host this Worker.
6. Add these GitHub repository **secrets** (not variables and not files):

   ```text
   CLOUDFLARE_ACCOUNT_ID
   CLOUDFLARE_API_TOKEN
   ```

7. Run **Actions → Deploy Sync Worker → Run workflow**. The workflow refuses to publish
   if `SYNC_APP_URL` is absent, invalid, public HTTP, or a `github.io` origin. It passes
   the configured origin to the Worker as the explicit CORS allow-list. CORS is browser
   access control, not authentication or bot protection.
8. Copy the deployed public URL, normally similar to:

   ```text
   https://econ-flashcards-sync.<your-subdomain>.workers.dev
   ```

9. Add a GitHub repository **variable** named `SYNC_API_URL` containing that HTTPS URL.
   The frontend rejects public HTTP, credential-bearing, and non-HTTP(S) API URLs before
   constructing a client. This is public frontend configuration, not a secret.
10. Build/deploy the frontend on the dedicated origin with both public variables:
    `VITE_SYNC_API_URL` from `SYNC_API_URL` and `VITE_SYNC_APP_URL` from
    `SYNC_APP_URL`. If the dedicated origin is a custom domain for this Pages site,
    re-run **Deploy to GitHub Pages**; the existing `github.io` URL is still
    intentionally local-only even when these values are present in the artifact.
11. Open Settings / Data → Cross-device sync on the dedicated-origin laptop, create a
    group, and use
    **Pair another device** to show the locally generated QR or copyable credential.
12. Scan the QR with the phone's normal camera, let the configured fragment-only link open the PWA,
    and verify that a review made offline on each device appears on the other device.

The repository currently contains deploy-ready infrastructure only. No production
Worker or dedicated frontend deployment is assumed or fabricated by this change; the
owner must perform the steps above after reviewing the PR.

## Local development

Unit and integration tests do not need a Cloudflare account. For a local Worker and
PWA session, use two terminals:

```bash
# terminal 1 — Vite/PWA
VITE_SYNC_API_URL=http://localhost:8787 \
VITE_SYNC_APP_URL=http://localhost:5173/ npm run dev

# terminal 2 — local Wrangler Durable Object storage; localhost CORS is explicit
CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173 npm run sync:dev
```

Wrangler's local Durable Object storage is used by `wrangler dev`. A normal
`npm run dev` without either sync variable, or when opened on a non-matching origin,
remains fully local-only and does not require the Worker. The browser must report a
secure context for sync admission; browsers normally treat loopback development as
potentially trustworthy. Localhost is the only HTTP exception; public HTTP and all
`github.io` origins are rejected.

## Credentials and pairing

Each device that creates a group generates three independent random values with Web
Crypto:

```text
syncId        128 bits; Durable Object routing name
authToken     256 bits; bearer capability, stored server-side only as SHA-256(authToken)
encryptionKey 256 bits; AES-GCM key, never sent to Cloudflare
```

The portable credential is strict and versioned:

```text
ecs1:<base64url(JSON({"i":syncId,"a":authToken,"k":encryptionKey}))>
```

The parser accepts exactly the prefix, base64url payload, and three fixed-size fields;
it rejects extra fields and arbitrary configuration. Pairing links use the configured
`VITE_SYNC_APP_URL` and put the credential only in the URL fragment
(`#/settings?pair=...`). The app captures it in memory and
uses `history.replaceState` to remove it from the visible URL and history before the
join operation continues. The QR is generated locally by the bundled `qrcode`
dependency; no QR service receives the credential.

Treat a pairing code like a password. The server cannot recover the encryption key. If
all paired devices lose the credential, the encrypted remote copy cannot be recovered;
manual JSON exports are the separate recovery path.

## Merge and durability rules

- Review events are a union by event ID. Identical duplicates deduplicate; a duplicate
  ID with different fields fails closed and leaves local progress unchanged.
- `CardState` is never uploaded. After a merge, derived card state is rebuilt from
  the complete chronological merged review history.
- Settings carry `{ value, updatedAt, deviceId }`. The later parsed timestamp wins;
  an exact timestamp uses lexical device ID order. This is symmetric and deterministic.
- Only terminal mock attempts (`submitted` and `abandoned`) are syncable. Active mocks
  remain on their starting device. A matching remote submitted terminal attempt can
  replace a local active attempt only when its immutable seed/timing/order/manifest
  identity matches and every deterministic `mock:<attemptId>:<questionId>` review
  exists and validates exactly against the stored answer states. Historical manifest
  question IDs do not need to remain in the current display-question bank.
- Successful local IndexedDB writes schedule a debounced sync. Study, Practice,
  Settings, and mock finalisation do not await the network.
- Joining uses an atomic transaction boundary that re-reads current local settings,
  reviews, and terminal mock history. Settings changed after the join snapshot receive
  a stamp strictly newer than the observed remote stamp; if the resulting payload is
  not already on the remote version, the normal bounded pull/merge/CAS pipeline runs
  before the UI reports `synced`.
- Creation uses `POST /v1/sync/:syncId`; updates use `PUT` with an expected version.
  Pull, decrypt, validate, merge, encrypt with a fresh IV, and conditional PUT use
  optimistic versions. A stale PUT receives `409`; the coordinator pulls and merges
  again for a bounded number of attempts.
- A successful remote write is not reported as complete until the merged state and
  new remote version are committed locally in one IndexedDB transaction.
- Network/5xx/offline errors keep local data and credentials. Authentication,
  decryption, malformed-payload, and size errors do not apply remote data.
- Guided lesson acknowledgement is legitimate local-device progress stored in the
  separate `guidedLessonSeen` IndexedDB store. It is intentionally not a field in
  `SyncPayloadV1`; ordinary reconciliation leaves the local set intact and does
  not provide cross-device lesson acknowledgement.

The v1 decoded ciphertext limit is 1 MiB. If a future progress history exceeds it,
the app reports `Sync data is too large for v1` rather than a cryptographic or
authentication failure, and the independent ProgressBackupV3 JSON export remains
available. There is no chunking or R2 path in v1.

The Worker applies three conservative accountless abuse guards before Durable Object
routing:

- 240 total sync-group operations per client key per 60 seconds;
- 10 group-creation calls per client key per 60 seconds; and
- 120 operations per sync group per 60 seconds.

The client-wide counter is evaluated before `idFromName()`/`get()` routing, so rotating
random valid sync IDs does not create a fresh bucket for every probe. In production the
client key is Cloudflare's `CF-Connecting-IP`; local tests/Wrangler use the fixed
`unknown` fallback when that header is absent. Users behind the same NAT may share the
operational quota. Cloudflare Worker Rate Limiting counters are fast and eventually
consistent, so these values are basic abuse guards, not exact accounting, authentication,
or formal DDoS protection.

## Privacy and non-goals

The sync server stores an auth hash, encrypted envelope, blob version, and timestamps
inside one SQLite-backed Durable Object. It does not store plaintext progress, a
question bank, scheduler fields, CardState rows, accounts, or identity-provider data.

The Worker allows only the explicitly configured HTTPS dedicated app origin (or explicit
loopback HTTP origins during Wrangler development), never `*` and never a default
`github.io` origin. A production Worker without its origin or required limiter bindings
fails closed. Authenticated responses use `Cache-Control: no-store`.

This is client-side encrypted capability-based sync, not a formal security audit. It
does not add accounts, shared study groups, active-mock handoff, server-side scheduling,
notifications, deletion tombstones for individual reviews, or remote reset of local
progress. **Delete cloud copy** is the one explicit destructive remote operation.

## Tests

The frontend tests cover DB-v2→v3 and v3→v4 preservation, secure-origin admission, pairing/deep-link
behavior, AES-GCM tamper failures, merge algebra and conflicts, API responses, two
independent IndexedDB databases, offline laptop/phone convergence (including a normal
`mode: "calculation"` ReviewEvent), terminal mock history, active-mock preservation,
and scheduler snapshot equality. Worker tests exercise creation, auth, CAS versions,
deletion, malformed/oversized envelopes, CORS, all three rate-limit layers, rotating-ID
probing, and no-store responses using a deterministic storage fixture. A separate
Workers Vitest runtime suite exercises SQLite-backed Durable Object persistence,
concurrent CAS, and unknown-ID reads/deletes. The Worker typecheck and tests run in
separate CI steps; deployment is never part of PR CI.
