import { describe, expect, it } from "vitest";
import { MemorySyncRecordStore, handleSyncGroupRequest } from "./SyncGroup";
import { MAX_CIPHERTEXT_BYTES } from "./protocol";
import worker, { type Env } from "./index";
import { toBase64Url } from "../../src/sync/encoding";

const syncId = toBase64Url(new Uint8Array(16).fill(1));
const authToken = toBase64Url(new Uint8Array(32).fill(2));
const wrongToken = toBase64Url(new Uint8Array(32).fill(3));
const envelope = {
  format: "econ-flashcards-sync-ciphertext" as const,
  version: 1 as const,
  iv: toBase64Url(new Uint8Array(12).fill(4)),
  ciphertext: toBase64Url(new Uint8Array(16).fill(5)),
};

function request(
  method: "GET" | "PUT" | "DELETE",
  token = authToken,
  body?: unknown,
): Request {
  return new Request(`https://sync.test/v1/sync/${syncId}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

describe("encrypted sync Durable Object protocol", () => {
  it("creates, authenticates, versions, and deletes the encrypted envelope", async () => {
    const store = new MemorySyncRecordStore();
    const timestamps = ["2026-08-11T00:00:00.000Z", "2026-08-11T00:01:00.000Z"];
    const now = () => timestamps.shift() ?? "2026-08-11T00:02:00.000Z";
    const create = await handleSyncGroupRequest(
      request("PUT", authToken, { expectedVersion: null, envelope }),
      store,
      now,
    );
    expect(create.status).toBe(200);
    expect((await create.json()) as unknown).toEqual({ version: 1 });
    expect(store.get()?.authHash).not.toContain(authToken);
    expect(store.get()?.authHash).toHaveLength(64);
    expect(store.get()?.envelope).toEqual(envelope);

    const read = await handleSyncGroupRequest(request("GET"), store, now);
    expect(read.status).toBe(200);
    expect((await read.json()) as unknown).toEqual({ version: 1, envelope });
    expect(read.headers.get("Cache-Control")).toBe("no-store");

    const updatedEnvelope = {
      ...envelope,
      ciphertext: toBase64Url(new Uint8Array(16).fill(6)),
    };
    const update = await handleSyncGroupRequest(
      request("PUT", authToken, { expectedVersion: 1, envelope: updatedEnvelope }),
      store,
      now,
    );
    expect(update.status).toBe(200);
    expect((await update.json()) as unknown).toEqual({ version: 2 });

    const stale = await handleSyncGroupRequest(
      request("PUT", authToken, { expectedVersion: 1, envelope }),
      store,
      now,
    );
    expect(stale.status).toBe(409);
    expect(store.get()?.blobVersion).toBe(2);
    expect(store.get()?.envelope).toEqual(updatedEnvelope);

    const badAuth = await handleSyncGroupRequest(
      request("GET", wrongToken),
      store,
      now,
    );
    expect(badAuth.status).toBe(401);
    const deleted = await handleSyncGroupRequest(request("DELETE"), store, now);
    expect(deleted.status).toBe(204);
    const missing = await handleSyncGroupRequest(request("GET"), store, now);
    expect(missing.status).toBe(404);
  });

  it("rejects malformed and oversized envelopes without truncation", async () => {
    const store = new MemorySyncRecordStore();
    const malformed = await handleSyncGroupRequest(
      request("PUT", authToken, {
        expectedVersion: null,
        envelope: { ...envelope, iv: "not-base64" },
      }),
      store,
    );
    expect(malformed.status).toBe(400);

    const oversized = {
      ...envelope,
      ciphertext: toBase64Url(new Uint8Array(MAX_CIPHERTEXT_BYTES + 1).fill(7)),
    };
    const tooLarge = await handleSyncGroupRequest(
      request("PUT", authToken, { expectedVersion: null, envelope: oversized }),
      store,
    );
    expect(tooLarge.status).toBe(413);
    expect(store.get()).toBeUndefined();
  });

  it("does not expose private state from a health-style response in the DO", async () => {
    const store = new MemorySyncRecordStore();
    const response = await handleSyncGroupRequest(request("GET"), store);
    const body = await response.text();
    expect(body).not.toContain("cardId");
    expect(body).not.toContain("question");
  });

  it("enforces the production CORS allow-list and never emits a wildcard", async () => {
    const env = {
      SYNC_GROUPS: {
        idFromName: () => "id",
        get: () => ({ fetch: async () => new Response("ok") }),
      },
    } satisfies Env;
    const allowed = await worker.fetch(
      new Request("https://sync.test/health", {
        headers: { Origin: "https://lhooded.github.io" },
      }),
      env,
    );
    expect(allowed.status).toBe(200);
    expect(allowed.headers.get("Access-Control-Allow-Origin")).toBe(
      "https://lhooded.github.io",
    );
    expect(allowed.headers.get("Access-Control-Allow-Origin")).not.toBe("*");
    expect(await allowed.json()).toEqual({ ok: true, protocol: 1 });

    const preflight = await worker.fetch(
      new Request("https://sync.test/v1/sync/anything", {
        method: "OPTIONS",
        headers: { Origin: "https://lhooded.github.io" },
      }),
      env,
    );
    expect(preflight.status).toBe(204);
    expect(preflight.headers.get("Access-Control-Allow-Methods")).toContain("PUT");

    const denied = await worker.fetch(
      new Request("https://sync.test/health", {
        headers: { Origin: "https://evil.example" },
      }),
      env,
    );
    expect(denied.status).toBe(403);
    expect(denied.headers.get("Access-Control-Allow-Origin")).toBeNull();

    const local = await worker.fetch(
      new Request("https://sync.test/health", {
        headers: { Origin: "http://localhost:5173" },
      }),
      { ...env, CORS_ORIGINS: "http://localhost:5173,http://127.0.0.1:5173" },
    );
    expect(local.status).toBe(200);
    expect(local.headers.get("Access-Control-Allow-Origin")).toBe(
      "http://localhost:5173",
    );
  });
});
