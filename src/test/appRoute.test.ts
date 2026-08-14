import { describe, expect, it } from "vitest";
import { parseHashLocation } from "../app/hashRoute";
import { capturePairingRoute } from "../app/pairingRoute";
import { buildStudyHash, parseStudyScopeQuery } from "../study/studyScope";
import {
  createSyncGroupCredentials,
  serializePairingCredential,
} from "../sync/pairing";

describe("hash routing", () => {
  it("preserves the base routes and parses shareable study focus state", () => {
    expect(parseHashLocation("#/")).toMatchObject({ route: "/" });
    expect(parseHashLocation("#/settings")).toMatchObject({ route: "/settings" });
    expect(parseHashLocation("#/study")).toMatchObject({
      route: "/study",
      studyScope: { preset: "smart", chapter: null },
    });
    expect(parseHashLocation("#/study?preset=needs_work&chapter=9")).toMatchObject({
      route: "/study",
      studyScope: { preset: "needs_work", chapter: 9 },
    });
    expect(parseHashLocation("#/study?concept=bond")).toMatchObject({
      route: "/study",
      conceptId: "bond",
    });
  });

  it("falls back safely for unknown presets and malformed chapters", () => {
    expect(parseStudyScopeQuery("preset=not-a-preset&chapter=eleven")).toEqual({
      preset: "smart",
      chapter: null,
    });
    expect(parseHashLocation("#/study?preset=mcq&chapter=11").studyScope).toEqual({
      preset: "mcq",
      chapter: null,
    });
    expect(parseHashLocation("#/unknown?%E0%A4%A").route).toBe("/");
  });

  it("builds compact reload-stable study hashes", () => {
    expect(buildStudyHash({ preset: "smart", chapter: null })).toBe("#/study");
    expect(buildStudyHash({ preset: "calculations", chapter: 8 })).toBe(
      "#/study?preset=calculations&chapter=8",
    );
    expect(buildStudyHash({ preset: "smart", chapter: 0 })).toBe("#/study?chapter=0");
  });

  it("parses mock and Practice Lab routes safely", () => {
    expect(parseHashLocation("#/mock").route).toBe("/mock");
    expect(parseHashLocation("#/mock/attempt?id=abc")).toMatchObject({
      route: "/mock/attempt",
      attemptId: "abc",
    });
    expect(parseHashLocation("#/mock/attempt?id=").route).toBe("/mock");
    expect(parseHashLocation("#/practice?mode=stimulus")).toMatchObject({
      route: "/practice",
      practiceMode: "stimulus",
    });
    expect(parseHashLocation("#/practice?mode=mcq&concept=bond")).toMatchObject({
      route: "/practice",
      practiceMode: "mcq",
      conceptId: "bond",
    });
    expect(parseHashLocation("#/practice?mode=formula-application")).toMatchObject({
      route: "/practice",
      practiceMode: "formula-application",
    });
    expect(parseHashLocation("#/practice?mode=not-real").practiceMode).toBeNull();
  });

  it("supports a hash-safe Knowledge route and concept deep link", () => {
    expect(parseHashLocation("#/knowledge")).toMatchObject({
      route: "/knowledge",
      conceptId: null,
    });
    expect(parseHashLocation("#/knowledge?concept=real-interest-rate")).toMatchObject({
      route: "/knowledge",
      conceptId: "real-interest-rate",
    });
  });

  it("supports the Guided Cram route and current-concept deep link", () => {
    expect(parseHashLocation("#/guided")).toMatchObject({
      route: "/guided",
      conceptId: null,
    });
    expect(parseHashLocation("#/guided?concept=percentage")).toMatchObject({
      route: "/guided",
      conceptId: "percentage",
    });
  });

  it("supports the additional High-Yield Cram route without changing Guided", () => {
    expect(parseHashLocation("#/high-yield")).toMatchObject({
      route: "/high-yield",
      conceptId: null,
    });
    expect(
      parseHashLocation("#/high-yield?concept=trade-weighted-index"),
    ).toMatchObject({
      route: "/high-yield",
      conceptId: "trade-weighted-index",
    });
  });

  it("supports the separate cheat-sheet-aware Super Cram route", () => {
    expect(parseHashLocation("#/super-cram")).toMatchObject({
      route: "/super-cram",
      practiceMode: null,
    });
  });

  it("captures a pairing secret from the fragment and removes it from the visible URL", () => {
    const code = serializePairingCredential(createSyncGroupCredentials());
    window.history.replaceState({}, "", `/#/settings?pair=${encodeURIComponent(code)}`);
    const captured = capturePairingRoute();
    expect(captured).toMatchObject({ route: "/settings", pairingCode: code });
    expect(window.location.hash).toBe("#/settings");
    expect(window.location.href).not.toContain(code);
  });
});
