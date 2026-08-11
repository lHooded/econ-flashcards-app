/// <reference types="@cloudflare/vitest-pool-workers/types" />

import { env } from "cloudflare:workers";
import { describe, expect, it } from "vitest";
import { toBase64Url } from "../../src/sync/encoding";
import type { Env } from "./index";

const syncId = toBase64Url(new Uint8Array(16).fill(21));
const authToken = toBase64Url(new Uint8Array(32).fill(22));
const envelope = {
  format: "econ-flashcards-sync-ciphertext" as const,
  version: 1 as const,
  iv: toBase64Url(new Uint8Array(12).fill(23)),
  ciphertext: toBase64Url(new Uint8Array(16).fill(24)),
};

function request(method: "GET" | "POST" | "PUT" | "DELETE", body?: unknown): Request {
  return new Request(`https://runtime.test/v1/sync/${syncId}`, {
    method,
    headers: {
      Authorization: `Bearer ${authToken}`,
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

describe("SQLite-backed Durable Object runtime", () => {
  it("persists across request/stub lifecycles and serializes CAS", async () => {
    const runtimeEnv = env as unknown as Env;
    const firstStub = runtimeEnv.SYNC_GROUPS.get(
      runtimeEnv.SYNC_GROUPS.idFromName(syncId),
    );
    const created = await firstStub.fetch(
      request("POST", { expectedVersion: null, envelope }),
    );
    expect(created.status).toBe(200);

    const secondStub = runtimeEnv.SYNC_GROUPS.get(
      runtimeEnv.SYNC_GROUPS.idFromName(syncId),
    );
    const pulled = await secondStub.fetch(request("GET"));
    expect(pulled.status).toBe(200);
    expect(await pulled.json()).toEqual({ version: 1, envelope });

    const envelopeA = {
      ...envelope,
      ciphertext: toBase64Url(new Uint8Array(16).fill(25)),
    };
    const envelopeB = {
      ...envelope,
      ciphertext: toBase64Url(new Uint8Array(16).fill(26)),
    };
    const [a, b] = await Promise.all([
      secondStub.fetch(request("PUT", { expectedVersion: 1, envelope: envelopeA })),
      secondStub.fetch(request("PUT", { expectedVersion: 1, envelope: envelopeB })),
    ]);
    expect([a.status, b.status].sort()).toEqual([200, 409]);

    const afterCas = await secondStub.fetch(request("GET"));
    expect(afterCas.status).toBe(200);
    expect(((await afterCas.json()) as { version: number }).version).toBe(2);

    const deleted = await secondStub.fetch(request("DELETE"));
    expect(deleted.status).toBe(204);
    const missing = await firstStub.fetch(request("GET"));
    expect(missing.status).toBe(404);
  });

  it("does not create an application record for an unknown group", async () => {
    const runtimeEnv = env as unknown as Env;
    const unknownId = toBase64Url(new Uint8Array(16).fill(99));
    const unknownStub = runtimeEnv.SYNC_GROUPS.get(
      runtimeEnv.SYNC_GROUPS.idFromName(unknownId),
    );
    const missingGet = await unknownStub.fetch(requestFor(unknownId, "GET"));
    const missingDelete = await unknownStub.fetch(requestFor(unknownId, "DELETE"));
    expect(missingGet.status).toBe(404);
    expect(missingDelete.status).toBe(404);
  });
});

function requestFor(id: string, method: "GET" | "DELETE"): Request {
  return new Request(`https://sync.test/v1/sync/${id}`, {
    method,
    headers: { Authorization: `Bearer ${authToken}` },
  });
}
