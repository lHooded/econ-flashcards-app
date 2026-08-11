import { describe, expect, it } from "vitest";
import {
  gradeNumericAnswer,
  parseAndGradeNumericAnswer,
  parseNumericAnswer,
} from "../calculations/grade";
import { makeNumericAnswer } from "../calculations/instantiate";

function numericAnswer(
  value: number,
  unit: "none" | "percent" | "percentage_points" = "none",
  decimals = 0,
) {
  return makeNumericAnswer(value, {
    unit,
    displayUnit:
      unit === "percent"
        ? "%"
        : unit === "percentage_points"
          ? "percentage points"
          : "units",
    decimals,
    roundingInstruction: `Round to ${decimals} decimal places.`,
  });
}

describe("generated numeric grading", () => {
  it("grades exact integer and negative answers", () => {
    const answer = numericAnswer(-25);
    expect(parseAndGradeNumericAnswer("-25", answer).correct).toBe(true);
    expect(parseAndGradeNumericAnswer("25", answer).correct).toBe(false);
  });

  it("grades decimal answers at the declared rounding boundary", () => {
    const answer = numericAnswer(3.5, "none", 2);
    expect(gradeNumericAnswer(3.505, answer)).toBe(true);
    expect(gradeNumericAnswer(3.5051, answer)).toBe(false);
    expect(gradeNumericAnswer(3.4949, answer)).toBe(false);
  });

  it("accepts a percent suffix only for percent answers and keeps percent units in percent form", () => {
    const answer = numericAnswer(5, "percent", 2);
    expect(parseAndGradeNumericAnswer("5", answer).correct).toBe(true);
    expect(parseAndGradeNumericAnswer("5%", answer).correct).toBe(true);
    expect(parseAndGradeNumericAnswer("0.05", answer).correct).toBe(false);

    const percentagePoints = numericAnswer(5, "percentage_points", 2);
    expect(parseNumericAnswer("5", percentagePoints)).toEqual({ value: 5 });
    expect(parseNumericAnswer("5%", percentagePoints)).toBeNull();
  });

  it("supports comma-separated ordinary numbers", () => {
    const answer = numericAnswer(1250);
    expect(parseAndGradeNumericAnswer("1,250", answer).correct).toBe(true);
    expect(parseNumericAnswer("1,25", answer)).toBeNull();
  });

  it.each(["", "   ", "abc", "1+2", "3/7", "1e3", "NaN", "Infinity"])(
    "rejects invalid or expression-like input %j",
    (input) => {
      expect(parseNumericAnswer(input, numericAnswer(3))).toBeNull();
    },
  );
});
