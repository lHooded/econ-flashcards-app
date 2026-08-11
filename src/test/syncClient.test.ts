import { describe, expect, it, vi } from "vitest";
import { SyncApiClient } from "../sync/client";
import { createSyncGroupCredentials } from "../sync/pairing";
import type { EncryptedSyncEnvelope } from "../sync/model";
import { toBase64Url } from "../sync/encoding";

const envelope: EncryptedSyncEnvelope = {
  format: "econ-flashcards-sync-ciphertext",
  version: 1,
  iv: toBase64Url(new Uint8Array(12).fill(1)),
  ciphertext: toBase64Url(new Uint8Array(16).fill(2)),
};

function response(status: number, body: unknown): Response {
  return new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("sync HTTP client", () => {
  it.each([
    "http://sync.example.com/",
    "ftp://sync.example.com/",
    "javascript:alert(1)",
    "https://user:password@sync.example.com/",
    "https://sync.example.com/?token=secret",
    "https://sync.example.com/#secret",
  ])("rejects insecure or credential-bearing API URL %s", (url) => {
    expect(() => new SyncApiClient(url)).toThrow(/secure sync API URL/i);
  });

  it("allows an explicit loopback HTTP API for local development", () => {
    expect(() => new SyncApiClient("http://localhost:8787/")).not.toThrow();
    expect(() => new SyncApiClient("http://127.0.0.1:8787/")).not.toThrow();
  });

  it("covers create, pull, conditional push, and delete request shapes", async () => {
    const credentials = createSyncGroupCredentials();
    const calls: RequestInit[] = [];
    const fetcher = vi.fn<typeof fetch>(async (_input, init) => {
      calls.push(init ?? {});
      const method = init?.method;
      if (method === "GET") return response(200, { version: 1, envelope });
      if (method === "DELETE") return response(204, undefined);
      return response(200, {
        version: init?.body?.toString().includes("null") ? 1 : 2,
      });
    });
    const api = new SyncApiClient("https://sync.example/", fetcher);
    await expect(api.create(credentials, envelope)).resolves.toEqual({ version: 1 });
    await expect(api.pull(credentials)).resolves.toEqual({ version: 1, envelope });
    await expect(api.push(credentials, 1, envelope)).resolves.toEqual({ version: 2 });
    await expect(api.delete(credentials)).resolves.toBeUndefined();
    expect(fetcher).toHaveBeenCalledTimes(4);
    expect(calls[0].headers).toMatchObject({
      Authorization: `Bearer ${credentials.authToken}`,
    });
    expect(calls[0].method).toBe("POST");
    expect(calls[0].cache).toBe("no-store");
    expect(calls[2].body).toContain('"expectedVersion":1');
  });

  it.each([
    [401, "auth"],
    [403, "auth"],
    [404, "not-found"],
    [409, "conflict"],
    [413, "too-large"],
    [429, "rate-limited"],
    [500, "server"],
  ] as const)("does not classify HTTP %s as offline", async (status, kind) => {
    const credentials = createSyncGroupCredentials();
    const fetcher = vi.fn<typeof fetch>(async () =>
      response(status, { error: "private" }),
    );
    await expect(
      new SyncApiClient("https://sync.example", fetcher).pull(credentials),
    ).rejects.toMatchObject({
      kind,
      status,
    });
  });

  it("distinguishes invalid JSON and network failures", async () => {
    const credentials = createSyncGroupCredentials();
    const invalid = vi.fn<typeof fetch>(
      async () => new Response("not-json", { status: 200 }),
    );
    await expect(
      new SyncApiClient("https://sync.example", invalid).pull(credentials),
    ).rejects.toMatchObject({
      kind: "invalid",
    });
    const network = vi.fn<typeof fetch>(async () => {
      throw new TypeError("offline");
    });
    await expect(
      new SyncApiClient("https://sync.example", network).pull(credentials),
    ).rejects.toMatchObject({
      kind: "network",
    });
  });
});
