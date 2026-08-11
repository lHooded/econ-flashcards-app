# Optional encrypted cross-device sync

PR #6 adds an accountless, local-first sync path. The existing PWA remains a static
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

## Owner setup for production

The Worker workflow is intentionally manual and does not run from ordinary PR CI.
Cloudflare's current Wrangler configuration uses declarative `exports` with
`storage: "sqlite"` for a new Durable Object class. See Cloudflare's
[Durable Object class exports](https://developers.cloudflare.com/durable-objects/reference/durable-objects-migrations/)
and [GitHub Actions authentication guide](https://developers.cloudflare.com/workers/ci-cd/external-cicd/github-actions/)
for the current platform details.

1. Create or sign in to a free Cloudflare account.
2. Find the account ID in the Cloudflare dashboard.
3. On the Account API Tokens page, create a custom token using the **Edit Cloudflare
   Workers** policy/template. Scope it to only the account that will host this Worker.
4. Add these GitHub repository **secrets** (not variables and not files):

   ```text
   CLOUDFLARE_ACCOUNT_ID
   CLOUDFLARE_API_TOKEN
   ```

5. Run **Actions → Deploy Sync Worker → Run workflow**.
6. Copy the deployed public URL, normally similar to:

   ```text
   https://econ-flashcards-sync.<your-subdomain>.workers.dev
   ```

7. Add a GitHub repository **variable** named `SYNC_API_URL` containing that URL.
   This is public frontend configuration, not a secret.
8. Re-run **Deploy to GitHub Pages**. The Pages workflow passes the variable to Vite as
   `VITE_SYNC_API_URL`.
9. Open Settings / Data → Cross-device sync on the laptop, create a group, and use
   **Pair another device** to show the locally generated QR or copyable credential.
10. Scan the QR with the phone's normal camera, let the fragment-only link open the PWA,
    and verify that a review made offline on each device appears on the other device.

The repository currently contains deploy-ready infrastructure only. No production
Worker deployment is assumed or fabricated by this change; the owner must perform the
steps above after reviewing the PR.

## Local development

Unit and integration tests do not need a Cloudflare account. For a local Worker and
PWA session, use two terminals:

```bash
# terminal 1 — Vite/PWA
VITE_SYNC_API_URL=http://localhost:8787 npm run dev

# terminal 2 — local Wrangler Durable Object storage; localhost CORS is explicit
CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173 npm run sync:dev
```

Wrangler's local Durable Object storage is used by `wrangler dev`. A normal
`npm run dev` without `VITE_SYNC_API_URL` remains fully local-only and does not require
the Worker.

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
it rejects extra fields and arbitrary configuration. Pairing links put the credential
only in the URL fragment (`#/settings?pair=...`). The app captures it in memory and
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
  replace a local active attempt only when every deterministic `mock:<attemptId>:<questionId>`
  review exists and validates.
- Successful local IndexedDB writes schedule a debounced sync. Study, Practice,
  Settings, and mock finalisation do not await the network.
- Pull, decrypt, validate, merge, encrypt with a fresh IV, and conditional PUT use
  optimistic versions. A stale PUT receives `409`; the coordinator pulls and merges
  again for a bounded number of attempts.
- A successful remote write is not reported as complete until the merged state and
  new remote version are committed locally in one IndexedDB transaction.
- Network/5xx/offline errors keep local data and credentials. Authentication,
  decryption, malformed-payload, and size errors do not apply remote data.

The v1 decoded ciphertext limit is 1 MiB. If a future progress history exceeds it,
the app reports that sync data is too large and the independent ProgressBackupV2 JSON
export remains available. There is no chunking or R2 path in v1.

## Privacy and non-goals

The sync server stores an auth hash, encrypted envelope, blob version, and timestamps
inside one SQLite-backed Durable Object. It does not store plaintext progress, a
question bank, scheduler fields, CardState rows, accounts, or identity-provider data.

This is client-side encrypted capability-based sync, not a formal security audit. It
does not add accounts, shared study groups, active-mock handoff, server-side scheduling,
notifications, deletion tombstones for individual reviews, or remote reset of local
progress. **Delete cloud copy** is the one explicit destructive remote operation.

## Tests

The frontend tests cover DB-v2→v3 preservation, pairing/deep-link behavior, AES-GCM
tamper failures, merge algebra and conflicts, API responses, two independent IndexedDB
databases, offline laptop/phone convergence, terminal mock history, active-mock
preservation, and scheduler snapshot equality. Worker tests exercise creation,
auth, CAS versions, deletion, malformed/oversized envelopes, CORS, and no-store
responses using a deterministic storage fixture. The Worker typecheck and tests run in
separate CI steps; deployment is never part of PR CI.
