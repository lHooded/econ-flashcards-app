import { describe, expect, it } from "vitest";
import { resolveSyncRuntimeConfig } from "../sync/config";
import {
  buildPairingDeepLink,
  createSyncGroupCredentials,
  serializePairingCredential,
} from "../sync/pairing";

const apiUrl = "https://econ-flashcards-sync.example.workers.dev";

describe("sync dedicated-origin admission", () => {
  it("keeps the shared github.io project origin local-only", () => {
    const runtime = resolveSyncRuntimeConfig({
      apiUrl,
      appUrl: "https://lhooded.github.io/econ-flashcards-app/",
      currentOrigin: "https://lhooded.github.io",
    });
    expect(runtime.enabled).toBe(false);
    expect(runtime.reason).toMatch(/github\.io|dedicated/i);
  });

  it("enables sync only on the configured dedicated origin", () => {
    expect(
      resolveSyncRuntimeConfig({
        apiUrl,
        appUrl: "https://macro.example.com/",
        currentOrigin: "https://macro.example.com",
      }).enabled,
    ).toBe(true);
    expect(
      resolveSyncRuntimeConfig({
        apiUrl,
        appUrl: "https://macro.example.com/",
        currentOrigin: "https://other.example.com",
      }).enabled,
    ).toBe(false);
  });

  it("uses the configured app path for fragment-only pairing links", () => {
    const code = serializePairingCredential(createSyncGroupCredentials());
    const link = buildPairingDeepLink(code, "https://macro.example.com/app/");
    const hashIndex = link.indexOf("#");
    const parsed = new URL(link);
    expect(parsed.origin).toBe("https://macro.example.com");
    expect(parsed.pathname).toBe("/app/");
    expect(parsed.search).toBe("");
    expect(hashIndex).toBeGreaterThan(0);
    expect(link.slice(0, hashIndex)).not.toContain(code);
    expect(parsed.hash).toContain("#/settings?pair=");
  });

  it("refuses a github.io pairing destination instead of falling back", () => {
    const code = serializePairingCredential(createSyncGroupCredentials());
    expect(() =>
      buildPairingDeepLink(code, "https://lhooded.github.io/econ-flashcards-app/"),
    ).toThrow(/dedicated/i);
  });
});
