import { describe, expect, it } from "vitest";
import { isSecureSyncAppUrl, resolveSyncRuntimeConfig } from "../sync/config";
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
      isSecureContext: true,
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
        isSecureContext: true,
      }).enabled,
    ).toBe(true);
    expect(
      resolveSyncRuntimeConfig({
        apiUrl,
        appUrl: "https://macro.example.com/",
        currentOrigin: "https://other.example.com",
        isSecureContext: true,
      }).enabled,
    ).toBe(false);
  });

  it("requires HTTPS and a secure browser context for production sync", () => {
    expect(
      resolveSyncRuntimeConfig({
        apiUrl: "https://sync.example.com/",
        appUrl: "https://macro.example.com/",
        currentOrigin: "https://macro.example.com",
        isSecureContext: true,
      }).enabled,
    ).toBe(true);
    expect(
      resolveSyncRuntimeConfig({
        apiUrl: "https://sync.example.com/",
        appUrl: "https://macro.example.com/",
        currentOrigin: "https://macro.example.com",
        isSecureContext: false,
      }).enabled,
    ).toBe(false);
    expect(
      resolveSyncRuntimeConfig({
        apiUrl: "http://sync.example.com/",
        appUrl: "https://macro.example.com/",
        currentOrigin: "https://macro.example.com",
        isSecureContext: true,
      }).enabled,
    ).toBe(false);
    expect(
      resolveSyncRuntimeConfig({
        apiUrl: "https://lhooded.github.io/sync/",
        appUrl: "https://macro.example.com/",
        currentOrigin: "https://macro.example.com",
        isSecureContext: true,
      }).enabled,
    ).toBe(false);
    expect(
      resolveSyncRuntimeConfig({
        apiUrl: "https://sync.example.com/",
        appUrl: "http://macro.example.com/",
        currentOrigin: "http://macro.example.com",
        isSecureContext: true,
      }).enabled,
    ).toBe(false);
    expect(isSecureSyncAppUrl("http://macro.example.com/")).toBe(false);
  });

  it("allows HTTP only for explicit loopback development", () => {
    expect(
      resolveSyncRuntimeConfig({
        apiUrl: "http://127.0.0.1:8787/",
        appUrl: "http://localhost:5173/",
        currentOrigin: "http://localhost:5173",
        isSecureContext: true,
      }).enabled,
    ).toBe(true);
    expect(isSecureSyncAppUrl("http://localhost:5173/")).toBe(true);
    expect(isSecureSyncAppUrl("http://192.168.1.20:5173/")).toBe(false);
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

  it("refuses insecure public pairing destinations", () => {
    const code = serializePairingCredential(createSyncGroupCredentials());
    expect(() => buildPairingDeepLink(code, "http://macro.example.com/")).toThrow(
      /secure|HTTPS/i,
    );
    expect(buildPairingDeepLink(code, "http://localhost:5173/")).toContain(
      "http://localhost:5173/",
    );
  });
});
