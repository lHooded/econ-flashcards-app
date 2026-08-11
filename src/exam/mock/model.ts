import type {
  ExamChoiceIndex,
  ExamQuestion,
  ExamQuestionStyle,
  ExamDifficulty,
} from "../model";
import { createReviewEvent, type ReviewEvent } from "../../domain/progress";

export type MockAttemptStatus = "active" | "submitted" | "abandoned";
export type MockClockPhase =
  "reading" | "writing" | "expired" | "submitted" | "abandoned";

export interface MockQuestionAttemptState {
  readonly questionId: string;
  readonly selectedChoice: ExamChoiceIndex | null;
  readonly flagged: boolean;
  readonly firstViewedAt: string | null;
  readonly lastAnsweredAt: string | null;
  readonly timeSpentMs: number;
}

export interface MockQuestionManifest {
  readonly questionId: string;
  readonly reviewCardId: string;
  readonly chapter: number;
  readonly style: ExamQuestionStyle;
  readonly difficulty: ExamDifficulty;
  readonly stimulusType: "econ_graph" | "table" | null;
  readonly correctChoice: ExamChoiceIndex;
}

export interface MockAttempt {
  readonly id: string;
  readonly seed: number | string;
  readonly createdAt: string;
  readonly readingEndsAt: string;
  readonly writingEndsAt: string;
  readonly status: MockAttemptStatus;
  readonly submittedAt: string | null;
  readonly abandonedAt: string | null;
  readonly questionOrder: readonly string[];
  readonly manifest: readonly MockQuestionManifest[];
  readonly questionStates: readonly MockQuestionAttemptState[];
  readonly currentQuestionIndex: number;
  readonly reviewEventsCommittedAt: string | null;
}

export interface MockExamBuild {
  readonly questionOrder: readonly string[];
  readonly manifest: readonly MockQuestionManifest[];
}

export interface MockAttemptResult {
  readonly score: number;
  readonly total: number;
  readonly percentage: number;
  readonly answered: number;
  readonly unanswered: number;
  readonly flagged: number;
  readonly writingTimeUsedMs: number;
  readonly averageActiveTimeMs: number;
  readonly slowQuestionCount: number;
}

export function manifestForQuestion(question: ExamQuestion): MockQuestionManifest {
  return {
    questionId: question.id,
    reviewCardId: question.reviewCardId,
    chapter: question.chapter,
    style: question.style,
    difficulty: question.difficulty,
    stimulusType: question.stimulus?.type ?? null,
    correctChoice: question.correctChoice,
  };
}

export function createMockAttempt(
  input: MockExamBuild & { id: string; seed: number | string; createdAt: string },
  durations: { readonly readingMs: number; readonly writingMs: number } = {
    readingMs: 10 * 60 * 1000,
    writingMs: 100 * 60 * 1000,
  },
): MockAttempt {
  const createdAt = input.createdAt;
  const createdMs = Date.parse(createdAt);
  if (!Number.isFinite(createdMs)) throw new Error("Mock creation time must be valid.");
  if (input.questionOrder.length !== input.manifest.length) {
    throw new Error("Mock question order and manifest must have equal length.");
  }
  const questionStates = input.questionOrder.map(
    (questionId) =>
      ({
        questionId,
        selectedChoice: null,
        flagged: false,
        firstViewedAt: null,
        lastAnsweredAt: null,
        timeSpentMs: 0,
      }) satisfies MockQuestionAttemptState,
  );
  return {
    id: input.id,
    seed: input.seed,
    createdAt,
    readingEndsAt: new Date(createdMs + durations.readingMs).toISOString(),
    writingEndsAt: new Date(
      createdMs + durations.readingMs + durations.writingMs,
    ).toISOString(),
    status: "active",
    submittedAt: null,
    abandonedAt: null,
    questionOrder: [...input.questionOrder],
    manifest: [...input.manifest],
    questionStates,
    currentQuestionIndex: 0,
    reviewEventsCommittedAt: null,
  };
}

export function questionStateById(
  attempt: MockAttempt,
): ReadonlyMap<string, MockQuestionAttemptState> {
  return new Map(attempt.questionStates.map((state) => [state.questionId, state]));
}

/**
 * The immutable mock manifest and persisted answer states are the source of
 * truth for the objective review events committed at finalisation. Sync uses
 * this same construction so a terminal attempt cannot be paired with forged
 * review evidence.
 */
export function buildMockReviewEvents(attempt: MockAttempt): ReviewEvent[] {
  const submitted = validateMockAttempt(attempt);
  if (submitted.status !== "submitted" || submitted.submittedAt === null) {
    throw new Error("Only submitted mock attempts can produce review events.");
  }
  const submittedAt = submitted.submittedAt;
  const stateById = questionStateById(submitted);
  return submitted.manifest.map((manifest) => {
    const state = stateById.get(manifest.questionId);
    if (state === undefined)
      throw new Error(`Missing state for ${manifest.questionId}.`);
    const selectedChoice = state.selectedChoice;
    return createReviewEvent({
      id: `mock:${submitted.id}:${manifest.questionId}`,
      cardId: manifest.reviewCardId,
      reviewedAt: state.lastAnsweredAt ?? submittedAt,
      mode: "mcq",
      rating: null,
      correct: selectedChoice !== null && selectedChoice === manifest.correctChoice,
      responseTimeMs: state.timeSpentMs,
      selectedChoice,
    });
  });
}

export function validateMockAttempt(
  value: unknown,
  validQuestionIds?: ReadonlySet<string>,
): MockAttempt {
  if (!isRecord(value)) throw new Error("Mock attempt must be an object.");
  const id = nonEmptyString(value.id, "id");
  const seed = value.seed;
  if (!(
    typeof seed === "string" ||
    (typeof seed === "number" && Number.isFinite(seed))
  )) {
    throw new Error("Mock attempt seed is invalid.");
  }
  const createdAt = timestamp(value.createdAt, "createdAt");
  const readingEndsAt = timestamp(value.readingEndsAt, "readingEndsAt");
  const writingEndsAt = timestamp(value.writingEndsAt, "writingEndsAt");
  const status = value.status;
  if (status !== "active" && status !== "submitted" && status !== "abandoned") {
    throw new Error("Mock attempt status is invalid.");
  }
  const submittedAt = nullableTimestamp(value.submittedAt, "submittedAt");
  const abandonedAt = nullableTimestamp(value.abandonedAt, "abandonedAt");
  const committedAt = nullableTimestamp(
    value.reviewEventsCommittedAt,
    "reviewEventsCommittedAt",
  );
  if (status === "submitted" && submittedAt === null)
    throw new Error("Submitted mock needs submittedAt.");
  if (status === "submitted" && committedAt === null)
    throw new Error("Submitted mock needs reviewEventsCommittedAt.");
  if (status === "abandoned" && abandonedAt === null)
    throw new Error("Abandoned mock needs abandonedAt.");
  if (
    status === "active" &&
    (submittedAt !== null || abandonedAt !== null || committedAt !== null)
  ) {
    throw new Error("Active mock cannot have terminal timestamps.");
  }
  if (status !== "submitted" && committedAt !== null)
    throw new Error("Only submitted mocks can commit reviews.");
  const questionOrder = stringArray(value.questionOrder, "questionOrder");
  if (questionOrder.length !== 60)
    throw new Error("A full mock must contain exactly 60 questions.");
  if (new Set(questionOrder).size !== questionOrder.length)
    throw new Error("Mock question IDs must be unique.");
  const manifest = parseManifest(value.manifest);
  if (manifest.length !== 60)
    throw new Error("A full mock must contain exactly 60 manifest entries.");
  if (manifest.some((item, index) => item.questionId !== questionOrder[index])) {
    throw new Error("Mock manifest must follow questionOrder.");
  }
  if (validQuestionIds !== undefined) {
    for (const questionId of questionOrder)
      if (!validQuestionIds.has(questionId))
        throw new Error(`Unknown mock question ID "${questionId}".`);
  }
  if (new Set(manifest.map((item) => item.reviewCardId)).size !== manifest.length) {
    throw new Error("Mock manifest cannot repeat a reviewCardId.");
  }
  const questionStates = parseQuestionStates(
    value.questionStates,
    new Set(questionOrder),
  );
  const currentQuestionIndex = integer(
    value.currentQuestionIndex,
    "currentQuestionIndex",
  );
  if (currentQuestionIndex < 0 || currentQuestionIndex >= 60)
    throw new Error("Mock current question index is invalid.");
  return {
    id,
    seed,
    createdAt,
    readingEndsAt,
    writingEndsAt,
    status,
    submittedAt,
    abandonedAt,
    questionOrder,
    manifest,
    questionStates,
    currentQuestionIndex,
    reviewEventsCommittedAt: committedAt,
  };
}

function parseManifest(value: unknown): MockQuestionManifest[] {
  if (!Array.isArray(value)) throw new Error("Mock manifest must be an array.");
  return value.map((entry, index) => {
    const path = `manifest[${index}]`;
    if (!isRecord(entry)) throw new Error(`${path} must be an object.`);
    const chapter = integer(entry.chapter, `${path}.chapter`);
    if (chapter < 0 || chapter > 10) throw new Error(`${path}.chapter is invalid.`);
    const style = entry.style;
    if (
      ![
        "concept",
        "scenario",
        "calculation",
        "model_discrimination",
        "sequence",
      ].includes(String(style))
    )
      throw new Error(`${path}.style is invalid.`);
    const difficulty = integer(entry.difficulty, `${path}.difficulty`);
    if (difficulty < 1 || difficulty > 3)
      throw new Error(`${path}.difficulty is invalid.`);
    const stimulusType = entry.stimulusType;
    if (
      stimulusType !== null &&
      stimulusType !== "econ_graph" &&
      stimulusType !== "table"
    )
      throw new Error(`${path}.stimulusType is invalid.`);
    const correctChoice = integer(entry.correctChoice, `${path}.correctChoice`);
    if (correctChoice < 0 || correctChoice > 3)
      throw new Error(`${path}.correctChoice is invalid.`);
    return {
      questionId: nonEmptyString(entry.questionId, `${path}.questionId`),
      reviewCardId: nonEmptyString(entry.reviewCardId, `${path}.reviewCardId`),
      chapter,
      style: style as ExamQuestionStyle,
      difficulty: difficulty as ExamDifficulty,
      stimulusType,
      correctChoice: correctChoice as ExamChoiceIndex,
    };
  });
}

function parseQuestionStates(
  value: unknown,
  questionIds: ReadonlySet<string>,
): MockQuestionAttemptState[] {
  if (!Array.isArray(value) || value.length !== questionIds.size)
    throw new Error("Mock questionStates must cover every question exactly once.");
  const seen = new Set<string>();
  return value.map((entry, index) => {
    const path = `questionStates[${index}]`;
    if (!isRecord(entry)) throw new Error(`${path} must be an object.`);
    const questionId = nonEmptyString(entry.questionId, `${path}.questionId`);
    if (!questionIds.has(questionId) || seen.has(questionId))
      throw new Error(`${path}.questionId is duplicated or unknown.`);
    seen.add(questionId);
    const selectedChoice = entry.selectedChoice;
    if (
      selectedChoice !== null &&
      (typeof selectedChoice !== "number" ||
        !Number.isInteger(selectedChoice) ||
        selectedChoice < 0 ||
        selectedChoice > 3)
    )
      throw new Error(`${path}.selectedChoice is invalid.`);
    if (typeof entry.flagged !== "boolean")
      throw new Error(`${path}.flagged is invalid.`);
    const timeSpentMs = number(entry.timeSpentMs, `${path}.timeSpentMs`);
    if (timeSpentMs < 0) throw new Error(`${path}.timeSpentMs cannot be negative.`);
    return {
      questionId,
      selectedChoice: selectedChoice as ExamChoiceIndex | null,
      flagged: entry.flagged,
      firstViewedAt: nullableTimestamp(entry.firstViewedAt, `${path}.firstViewedAt`),
      lastAnsweredAt: nullableTimestamp(entry.lastAnsweredAt, `${path}.lastAnsweredAt`),
      timeSpentMs,
    };
  });
}

function nonEmptyString(value: unknown, path: string): string {
  if (typeof value !== "string" || value.trim() === "")
    throw new Error(`Mock ${path} must be a non-empty string.`);
  return value;
}
function stringArray(value: unknown, path: string): string[] {
  if (!Array.isArray(value)) throw new Error(`Mock ${path} must be an array.`);
  return value.map((item, index) => nonEmptyString(item, `${path}[${index}]`));
}
function integer(value: unknown, path: string): number {
  if (typeof value !== "number" || !Number.isInteger(value))
    throw new Error(`Mock ${path} must be an integer.`);
  return value;
}
function number(value: unknown, path: string): number {
  if (typeof value !== "number" || !Number.isFinite(value))
    throw new Error(`Mock ${path} must be finite.`);
  return value;
}
function timestamp(value: unknown, path: string): string {
  if (typeof value !== "string" || !Number.isFinite(Date.parse(value)))
    throw new Error(`Mock ${path} must be a valid date-time.`);
  return value;
}
function nullableTimestamp(value: unknown, path: string): string | null {
  return value === null ? null : timestamp(value, path);
}
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
