import { describe, expect, it } from "vitest";
import { DEFAULT_APP_SETTINGS, validateSettings } from "../domain/progress";
import { getStudyDeadline } from "../utils/date";

describe("exam settings", () => {
  it("defaults the deliberate buffer to 24 hours", () => {
    expect(DEFAULT_APP_SETTINGS).toEqual({ examAt: null, studyBufferHours: 24 });
  });

  it("derives the effective deadline by subtracting the buffer", () => {
    expect(getStudyDeadline("2026-08-20T10:00:00.000Z", 24)).toBe(
      "2026-08-19T10:00:00.000Z",
    );
    expect(getStudyDeadline("2026-08-20T10:00:00.000Z", 6)).toBe(
      "2026-08-20T04:00:00.000Z",
    );
  });

  it("validates changed buffer values without persisting a second deadline", () => {
    expect(
      validateSettings({ examAt: "2026-08-20T10:00:00.000Z", studyBufferHours: 48 }),
    ).toEqual({
      examAt: "2026-08-20T10:00:00.000Z",
      studyBufferHours: 48,
    });
    expect(() => validateSettings({ examAt: null, studyBufferHours: -1 })).toThrow(
      /non-negative/,
    );
  });
});
