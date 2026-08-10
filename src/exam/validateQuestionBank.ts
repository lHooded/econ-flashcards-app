import {
  EXAM_QUESTION_PROVENANCES,
  EXAM_QUESTION_STYLES,
  type ExamChoiceIndex,
  type ExamDifficulty,
  type ExamQuestion,
  type ExamQuestionProvenance,
  type ExamQuestionStyle,
  type FourChoices,
} from "./model";
import type { QuestionStimulusSpec } from "../stimulus/model";
import { parseQuestionStimulus } from "../stimulus/validateStimulus";

const CHAPTERS = new Set(Array.from({ length: 11 }, (_, index) => index));
const DIFFICULTIES = new Set<ExamDifficulty>([1, 2, 3]);
const CHAPTER_SPECIFIC = Array.from({ length: 10 }, (_, index) => index + 1);

export interface QuestionBankValidationOptions {
  readonly canonicalCardIds: ReadonlySet<string>;
  readonly enforceBankInvariants?: boolean;
  readonly minimumTotal?: number;
  readonly minimumChapterSpecific?: number;
  readonly minimumMixed?: number;
  readonly maximumPositionImbalance?: number;
  readonly minimumStimulus?: number;
  readonly minimumGraphs?: number;
  readonly minimumTables?: number;
  readonly minimumChapterStimulus?: number;
}

export interface ExamQuestionBankStats {
  readonly total: number;
  readonly canonical: number;
  readonly authored: number;
  readonly byChapter: Readonly<Record<string, number>>;
  readonly byStyle: Readonly<Record<ExamQuestionStyle, number>>;
  readonly byDifficulty: Readonly<Record<ExamDifficulty, number>>;
  readonly byPosition: Readonly<Record<"A" | "B" | "C" | "D", number>>;
  readonly byChapterStimulus: Readonly<Record<string, number>>;
  readonly calculationCount: number;
  readonly stimulusCount: number;
  readonly graphCount: number;
  readonly tableCount: number;
  readonly uniqueReviewCardIds: number;
}

export interface ExamQuestionBankValidationResult {
  readonly questions: readonly ExamQuestion[];
  readonly stats: ExamQuestionBankStats;
  readonly warnings: readonly string[];
}

export function validateExamQuestionBank(
  input: unknown,
  options: QuestionBankValidationOptions,
): readonly ExamQuestion[] {
  return inspectExamQuestionBank(input, options).questions;
}

export function inspectExamQuestionBank(
  input: unknown,
  options: QuestionBankValidationOptions,
): ExamQuestionBankValidationResult {
  if (!Array.isArray(input)) {
    throw new Error(
      "Exam question bank validation failed: top-level value must be an array.",
    );
  }

  const questions = input.map((value, index) =>
    parseExamQuestion(value, index, options),
  );
  validateBankRecords(questions, options);

  const result = {
    questions: deepFreeze(questions),
    stats: getExamQuestionBankStats(questions),
    warnings: getLexicalOverlapWarnings(questions),
  } satisfies ExamQuestionBankValidationResult;

  return deepFreeze(result);
}

export function getExamQuestionBankStats(
  questions: readonly ExamQuestion[],
): ExamQuestionBankStats {
  const byChapter: Record<string, number> = Object.fromEntries(
    Array.from({ length: 11 }, (_, chapter) => [String(chapter), 0]),
  );
  const byStyle = Object.fromEntries(
    EXAM_QUESTION_STYLES.map((style) => [style, 0]),
  ) as Record<ExamQuestionStyle, number>;
  const byDifficulty = { 1: 0, 2: 0, 3: 0 } satisfies Record<ExamDifficulty, number>;
  const byPosition = { A: 0, B: 0, C: 0, D: 0 } as Record<
    "A" | "B" | "C" | "D",
    number
  >;
  const byChapterStimulus: Record<string, number> = Object.fromEntries(
    Array.from({ length: 11 }, (_, chapter) => [String(chapter), 0]),
  );

  let canonical = 0;
  let authored = 0;
  let calculationCount = 0;
  let stimulusCount = 0;
  let graphCount = 0;
  let tableCount = 0;

  for (const question of questions) {
    byChapter[String(question.chapter)] += 1;
    byStyle[question.style] += 1;
    byDifficulty[question.difficulty] += 1;
    byPosition[positionLabel(question.correctChoice)] += 1;
    if (question.style === "calculation") calculationCount += 1;
    if (question.stimulus !== undefined) {
      stimulusCount += 1;
      byChapterStimulus[String(question.chapter)] += 1;
      if (question.stimulus.type === "econ_graph") graphCount += 1;
      else tableCount += 1;
    }
    if (question.provenance === "canonical_mcq") canonical += 1;
    else authored += 1;
  }

  return {
    total: questions.length,
    canonical,
    authored,
    byChapter,
    byStyle,
    byDifficulty,
    byPosition,
    byChapterStimulus,
    calculationCount,
    stimulusCount,
    graphCount,
    tableCount,
    uniqueReviewCardIds: new Set(questions.map((question) => question.reviewCardId))
      .size,
  };
}

function parseExamQuestion(
  value: unknown,
  index: number,
  options: QuestionBankValidationOptions,
): ExamQuestion {
  const path = `questions[${index}]`;
  const question = requireRecord(value, path);
  const chapter = requireInteger(question.chapter, `${path}.chapter`);
  if (!CHAPTERS.has(chapter)) {
    throw new Error(`${path}.chapter must be an integer from 0 through 10.`);
  }

  const difficulty = requireInteger(question.difficulty, `${path}.difficulty`);
  if (!DIFFICULTIES.has(difficulty as ExamDifficulty)) {
    throw new Error(`${path}.difficulty must be 1, 2, or 3.`);
  }

  const style = requireEnum(question.style, EXAM_QUESTION_STYLES, `${path}.style`);
  const provenance = requireEnum(
    question.provenance,
    EXAM_QUESTION_PROVENANCES,
    `${path}.provenance`,
  );
  const choices = parseFourStrings(question.choices, `${path}.choices`);
  const choiceRationales = parseFourStrings(
    question.choiceRationales,
    `${path}.choiceRationales`,
  );
  const stimulus: QuestionStimulusSpec | undefined =
    question.stimulus === undefined
      ? undefined
      : parseQuestionStimulus(question.stimulus, `${path}.stimulus`);
  const correctChoice = requireInteger(question.correctChoice, `${path}.correctChoice`);
  if (correctChoice < 0 || correctChoice > 3) {
    throw new Error(`${path}.correctChoice must be an integer from 0 through 3.`);
  }

  const normalizedChoices = choices.map(normalizeText);
  if (new Set(normalizedChoices).size !== 4) {
    throw new Error(
      `${path}.choices must not contain duplicate values after normalization.`,
    );
  }

  const sourceCardIds = parseStringArray(
    question.sourceCardIds,
    `${path}.sourceCardIds`,
  );
  if (new Set(sourceCardIds).size !== sourceCardIds.length) {
    throw new Error(`${path}.sourceCardIds must not contain duplicate card IDs.`);
  }

  const reviewCardId = requireString(question.reviewCardId, `${path}.reviewCardId`);
  if (!sourceCardIds.includes(reviewCardId)) {
    throw new Error(`${path}.reviewCardId must be included in sourceCardIds.`);
  }
  for (const cardId of sourceCardIds) {
    if (!options.canonicalCardIds.has(cardId)) {
      throw new Error(
        `${path}.sourceCardIds references unknown canonical card "${cardId}".`,
      );
    }
  }

  return {
    id: requireString(question.id, `${path}.id`),
    chapter,
    topic: requireString(question.topic, `${path}.topic`),
    style: style as ExamQuestionStyle,
    difficulty: difficulty as ExamDifficulty,
    stem: requireString(question.stem, `${path}.stem`),
    choices,
    correctChoice: correctChoice as ExamChoiceIndex,
    explanation: requireString(question.explanation, `${path}.explanation`),
    choiceRationales,
    reviewCardId,
    sourceCardIds,
    tags: parseStringArray(question.tags, `${path}.tags`),
    provenance: provenance as ExamQuestionProvenance,
    ...(stimulus === undefined ? {} : { stimulus }),
  };
}

function validateBankRecords(
  questions: readonly ExamQuestion[],
  options: QuestionBankValidationOptions,
): void {
  const ids = new Set<string>();
  const reviewCardIds = new Set<string>();
  const stems = new Set<string>();
  const authoredChoiceSets = new Map<string, string>();

  for (const question of questions) {
    if (ids.has(question.id)) {
      throw new Error(
        `Exam question bank validation failed: duplicate question ID "${question.id}".`,
      );
    }
    ids.add(question.id);

    if (reviewCardIds.has(question.reviewCardId)) {
      throw new Error(
        `Exam question bank validation failed: duplicate reviewCardId "${question.reviewCardId}".`,
      );
    }
    reviewCardIds.add(question.reviewCardId);

    const normalizedStem = normalizeText(question.stem);
    if (stems.has(normalizedStem)) {
      throw new Error(
        `Exam question bank validation failed: duplicate normalized stem for "${question.id}".`,
      );
    }
    stems.add(normalizedStem);

    if (question.provenance === "authored_from_flashcards") {
      const choiceSet = question.choices.map(normalizeText).sort().join("\u001f");
      const priorId = authoredChoiceSets.get(choiceSet);
      if (priorId !== undefined) {
        throw new Error(
          `Exam question bank validation failed: authored questions "${priorId}" and "${question.id}" have identical choice sets.`,
        );
      }
      authoredChoiceSets.set(choiceSet, question.id);
    }
  }

  if (!options.enforceBankInvariants) return;

  const minimumTotal = options.minimumTotal ?? 160;
  const minimumChapterSpecific = options.minimumChapterSpecific ?? 10;
  const minimumMixed = options.minimumMixed ?? 30;
  const maximumPositionImbalance = options.maximumPositionImbalance ?? 3;
  const minimumStimulus = options.minimumStimulus ?? 30;
  const minimumGraphs = options.minimumGraphs ?? 20;
  const minimumTables = options.minimumTables ?? 10;
  const minimumChapterStimulus = options.minimumChapterStimulus ?? 2;
  const stats = getExamQuestionBankStats(questions);

  if (stats.total < minimumTotal) {
    throw new Error(
      `Exam question bank validation failed: total ${stats.total} is below minimum ${minimumTotal}.`,
    );
  }
  for (const chapter of CHAPTER_SPECIFIC) {
    const count = stats.byChapter[String(chapter)];
    if (count < minimumChapterSpecific) {
      throw new Error(
        `Exam question bank validation failed: Chapter ${chapter} has ${count} chapter-specific questions; minimum is ${minimumChapterSpecific}.`,
      );
    }
  }
  if (stats.byChapter["0"] < minimumMixed) {
    throw new Error(
      `Exam question bank validation failed: mixed question count ${stats.byChapter["0"]} is below minimum ${minimumMixed}.`,
    );
  }
  if (stats.stimulusCount < minimumStimulus) {
    throw new Error(
      `Exam question bank validation failed: stimulus count ${stats.stimulusCount} is below minimum ${minimumStimulus}.`,
    );
  }
  if (stats.graphCount < minimumGraphs) {
    throw new Error(
      `Exam question bank validation failed: graph count ${stats.graphCount} is below minimum ${minimumGraphs}.`,
    );
  }
  if (stats.tableCount < minimumTables) {
    throw new Error(
      `Exam question bank validation failed: table count ${stats.tableCount} is below minimum ${minimumTables}.`,
    );
  }
  for (const chapter of CHAPTER_SPECIFIC) {
    const count = stats.byChapterStimulus[String(chapter)];
    if (count < minimumChapterStimulus) {
      throw new Error(
        `Exam question bank validation failed: Chapter ${chapter} has ${count} stimulus questions; minimum is ${minimumChapterStimulus}.`,
      );
    }
  }

  const positions = Object.values(stats.byPosition);
  if (Math.max(...positions) - Math.min(...positions) > maximumPositionImbalance) {
    throw new Error(
      `Exam question bank validation failed: correct-answer position imbalance exceeds ${maximumPositionImbalance}.`,
    );
  }

  assertDifficultyRange(stats.byDifficulty[1], stats.total, 0.25, 0.35, "1");
  assertDifficultyRange(stats.byDifficulty[2], stats.total, 0.45, 0.55, "2");
  assertDifficultyRange(stats.byDifficulty[3], stats.total, 0.15, 0.25, "3");
}

function assertDifficultyRange(
  count: number,
  total: number,
  minimum: number,
  maximum: number,
  label: string,
): void {
  const share = total === 0 ? 0 : count / total;
  if (share < minimum || share > maximum) {
    throw new Error(
      `Exam question bank validation failed: difficulty ${label} share ${(share * 100).toFixed(1)}% is outside ${(minimum * 100).toFixed(0)}–${(maximum * 100).toFixed(0)}%.`,
    );
  }
}

function getLexicalOverlapWarnings(
  questions: readonly ExamQuestion[],
): readonly string[] {
  const warnings: string[] = [];
  for (let leftIndex = 0; leftIndex < questions.length; leftIndex += 1) {
    const leftTokens = tokenSet(questions[leftIndex].stem);
    if (leftTokens.size < 6) continue;
    for (
      let rightIndex = leftIndex + 1;
      rightIndex < questions.length;
      rightIndex += 1
    ) {
      const rightTokens = tokenSet(questions[rightIndex].stem);
      if (rightTokens.size < 6) continue;
      const union = new Set([...leftTokens, ...rightTokens]);
      const intersection = [...leftTokens].filter((token) =>
        rightTokens.has(token),
      ).length;
      if (intersection / union.size >= 0.82) {
        warnings.push(
          `High stem overlap (${((intersection / union.size) * 100).toFixed(0)}%): ${questions[leftIndex].id} / ${questions[rightIndex].id}`,
        );
      }
    }
  }
  return warnings;
}

function tokenSet(value: string): Set<string> {
  return new Set(
    normalizeText(value)
      .split(" ")
      .filter((token) => token.length > 2),
  );
}

function normalizeText(value: string): string {
  return value.trim().toLocaleLowerCase().replace(/\s+/g, " ");
}

function positionLabel(index: ExamChoiceIndex): "A" | "B" | "C" | "D" {
  return (["A", "B", "C", "D"] as const)[index];
}

function requireRecord(value: unknown, path: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`Exam question bank validation failed: ${path} must be an object.`);
  }
  return value as Record<string, unknown>;
}

function requireString(value: unknown, path: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(
      `Exam question bank validation failed: ${path} must be a non-empty string.`,
    );
  }
  return value;
}

function requireInteger(value: unknown, path: string): number {
  if (typeof value !== "number" || !Number.isInteger(value)) {
    throw new Error(
      `Exam question bank validation failed: ${path} must be an integer.`,
    );
  }
  return value;
}

function requireEnum<T extends readonly string[]>(
  value: unknown,
  values: T,
  path: string,
): T[number] {
  if (typeof value !== "string" || !values.includes(value)) {
    throw new Error(
      `Exam question bank validation failed: ${path} has unsupported value "${String(value)}".`,
    );
  }
  return value as T[number];
}

function parseFourStrings(value: unknown, path: string): FourChoices {
  if (!Array.isArray(value) || value.length !== 4) {
    throw new Error(
      `Exam question bank validation failed: ${path} must contain exactly four strings.`,
    );
  }
  return value.map((entry, index) =>
    requireString(entry, `${path}[${index}]`),
  ) as unknown as FourChoices;
}

function parseStringArray(value: unknown, path: string): readonly string[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error(
      `Exam question bank validation failed: ${path} must be a non-empty array.`,
    );
  }
  return value.map((entry, index) => requireString(entry, `${path}[${index}]`));
}

function deepFreeze<T>(value: T): T {
  if (typeof value !== "object" || value === null || Object.isFrozen(value)) {
    return value;
  }
  Object.freeze(value);
  for (const nested of Object.values(value as Record<string, unknown>)) {
    deepFreeze(nested);
  }
  return value;
}
