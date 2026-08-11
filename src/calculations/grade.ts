import type { NumericAnswerSpec } from "./model";

export interface ParsedNumericAnswer {
  readonly value: number;
}

export function parseNumericAnswer(
  input: string,
  answer: NumericAnswerSpec,
): ParsedNumericAnswer | null {
  const trimmed = input.trim();
  if (trimmed.length === 0) return null;

  const hasPercent = trimmed.endsWith("%");
  if (trimmed.includes("%") && !hasPercent) return null;
  if (hasPercent && answer.unit !== "percent") return null;

  const numberText = (hasPercent ? trimmed.slice(0, -1) : trimmed).trim();
  const commaNumber = /^[+-]?(?:\d{1,3}(?:,\d{3})+)(?:\.\d+)?$/;
  const plainNumber = /^[+-]?(?:(?:\d+(?:\.\d*)?)|(?:\.\d+))$/;
  if (!commaNumber.test(numberText) && !plainNumber.test(numberText)) return null;

  const value = Number(numberText.replaceAll(",", ""));
  return Number.isFinite(value) ? { value } : null;
}

export function numericTolerance(answer: NumericAnswerSpec): number {
  if (answer.tolerance.type === "absolute") return answer.tolerance.value;
  return Math.max(
    answer.tolerance.value * Math.abs(answer.value),
    answer.tolerance.value,
  );
}

export function gradeNumericAnswer(
  entered: number | ParsedNumericAnswer,
  answer: NumericAnswerSpec,
): boolean {
  const value = typeof entered === "number" ? entered : entered.value;
  if (!Number.isFinite(value)) return false;
  return Math.abs(value - answer.value) <= numericTolerance(answer);
}

export function parseAndGradeNumericAnswer(
  input: string,
  answer: NumericAnswerSpec,
): { readonly parsed: ParsedNumericAnswer | null; readonly correct: boolean } {
  const parsed = parseNumericAnswer(input, answer);
  return { parsed, correct: parsed !== null && gradeNumericAnswer(parsed, answer) };
}
