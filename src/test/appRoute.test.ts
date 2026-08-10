import { describe, expect, it } from "vitest";
import { parseHashLocation } from "../app/hashRoute";
import { buildStudyHash, parseStudyScopeQuery } from "../study/studyScope";

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
});
