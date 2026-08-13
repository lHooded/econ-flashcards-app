import {
  isReviewMode,
  isReviewRating,
  validateSettings,
  type AppSettings,
  type CardState,
  type ProgressSnapshot,
  type ReviewEvent,
} from "./progress";
import {
  validateManualLearnedOverrides as validateManualLearnedOverrideRecords,
  type ManualLearnedOverride,
} from "./manualLearned";
import { validateMockAttempt, type MockAttempt } from "../exam/mock/model";
import { cardIds } from "../data/deck";
import { examQuestions } from "../exam/questionBank";
import { knowledgeConceptIds } from "../knowledge/data";

export const BACKUP_FORMAT = "econ-flashcards-progress" as const;
export const BACKUP_VERSION = 2 as const;

export interface ProgressBackupV1 {
  readonly format: typeof BACKUP_FORMAT;
  readonly version: 1;
  readonly exportedAt: string;
  readonly settings: AppSettings;
  readonly cardStates: readonly CardState[];
  readonly reviews: readonly ReviewEvent[];
}

export interface ProgressBackupV2 {
  readonly format: typeof BACKUP_FORMAT;
  readonly version: 2;
  readonly exportedAt: string;
  readonly settings: AppSettings;
  readonly cardStates: readonly CardState[];
  readonly reviews: readonly ReviewEvent[];
  readonly mockAttempts: readonly MockAttempt[];
  /** Optional so version-2 backups created before Guided lesson persistence remain valid. */
  readonly lessonSeenConceptIds?: readonly string[];
  /** Optional so existing version-2 backups migrate with no exclusions. */
  readonly manualLearnedOverrides?: readonly ManualLearnedOverride[];
}

export function createProgressBackup(
  snapshot: ProgressSnapshot,
  exportedAt = new Date().toISOString(),
): ProgressBackupV2 {
  if (!Number.isFinite(Date.parse(exportedAt))) {
    throw new Error("Export timestamp must be a valid ISO date-time.");
  }

  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt,
    settings: { ...snapshot.settings },
    cardStates: Object.values(snapshot.cardStates).map((state) => ({ ...state })),
    reviews: snapshot.reviewEvents.map((review) => ({ ...review })),
    mockAttempts: (snapshot.mockAttempts ?? []).map((attempt) => ({
      ...attempt,
      questionOrder: [...attempt.questionOrder],
      manifest: attempt.manifest.map((entry) => ({ ...entry })),
      questionStates: attempt.questionStates.map((state) => ({ ...state })),
    })),
    lessonSeenConceptIds: [...(snapshot.lessonSeenConceptIds ?? [])],
    manualLearnedOverrides: (snapshot.manualLearnedOverrides ?? []).map((override) => ({
      ...override,
    })),
  };
}

export function serializeProgressBackup(
  snapshot: ProgressSnapshot,
  exportedAt?: string,
): string {
  return JSON.stringify(createProgressBackup(snapshot, exportedAt), null, 2);
}

export function parseProgressBackup(
  input: unknown,
  validCardIds: ReadonlySet<string>,
  validQuestionIds: ReadonlySet<string> = new Set(
    examQuestions.map((question) => question.id),
  ),
  validLessonConceptIds: ReadonlySet<string> = knowledgeConceptIds,
  validManualCardIds: ReadonlySet<string> = new Set(cardIds),
): ProgressBackupV2 {
  if (!isRecord(input)) {
    throw new Error("Backup validation failed: the top-level value must be an object.");
  }

  if (input.format !== BACKUP_FORMAT) {
    throw new Error(`Unsupported backup format: expected "${BACKUP_FORMAT}".`);
  }

  if (input.version !== 1 && input.version !== BACKUP_VERSION) {
    throw new Error(
      `Unsupported backup version: expected 1 or ${BACKUP_VERSION}, received ${String(input.version)}.`,
    );
  }

  const exportedAt = requireTimestamp(input.exportedAt, "exportedAt");
  const settings = validateSettings(input.settings);
  const cardStates = parseCardStates(input.cardStates, validCardIds);
  const reviews = parseReviews(input.reviews, validCardIds);
  const mockAttempts =
    input.version === 1
      ? []
      : parseMockAttempts(input.mockAttempts, validQuestionIds, reviews);
  const lessonSeenConceptIds =
    input.version === 1 || input.lessonSeenConceptIds === undefined
      ? []
      : validateLessonSeenConceptIds(input.lessonSeenConceptIds, validLessonConceptIds);
  const manualLearnedOverrides =
    input.version === 1 || input.manualLearnedOverrides === undefined
      ? []
      : validateBackupManualLearnedOverrides(
          input.manualLearnedOverrides,
          validManualCardIds,
          validQuestionIds,
          validLessonConceptIds,
        );

  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt,
    settings,
    cardStates,
    reviews,
    mockAttempts,
    lessonSeenConceptIds,
    manualLearnedOverrides,
  };
}

export function parseProgressBackupText(
  text: string,
  validCardIds: ReadonlySet<string>,
  validQuestionIds: ReadonlySet<string> = new Set(
    examQuestions.map((question) => question.id),
  ),
  validLessonConceptIds: ReadonlySet<string> = knowledgeConceptIds,
  validManualCardIds: ReadonlySet<string> = new Set(cardIds),
): ProgressBackupV2 {
  let input: unknown;
  try {
    input = JSON.parse(text) as unknown;
  } catch {
    throw new Error("Backup validation failed: the file is not valid JSON.");
  }

  return parseProgressBackup(
    input,
    validCardIds,
    validQuestionIds,
    validLessonConceptIds,
    validManualCardIds,
  );
}

function validateBackupManualLearnedOverrides(
  value: unknown,
  validCardIds: ReadonlySet<string>,
  validQuestionIds: ReadonlySet<string>,
  validConceptIds: ReadonlySet<string>,
): ManualLearnedOverride[] {
  try {
    return validateManualLearnedOverrideRecords(
      value,
      validCardIds,
      validQuestionIds,
      validConceptIds,
    );
  } catch (error: unknown) {
    throw new Error(
      `Backup validation failed: ${
        error instanceof Error ? error.message : "manual learned overrides are invalid."
      }`,
    );
  }
}

export function validateLessonSeenConceptIds(
  value: unknown,
  validLessonConceptIds: ReadonlySet<string> = knowledgeConceptIds,
): string[] {
  if (!Array.isArray(value)) {
    throw new Error("Backup validation failed: lessonSeenConceptIds must be an array.");
  }

  const ids = new Set<string>();
  return value.map((entry, index) => {
    const path = `lessonSeenConceptIds[${index}]`;
    const conceptId = requireNonEmptyString(entry, path);
    if (!validLessonConceptIds.has(conceptId)) {
      throw new Error(
        `Backup validation failed: unknown knowledge concept ID "${conceptId}".`,
      );
    }
    if (ids.has(conceptId)) {
      throw new Error(`Backup validation failed: duplicate lesson ID ${conceptId}.`);
    }
    ids.add(conceptId);
    return conceptId;
  });
}

function parseMockAttempts(
  value: unknown,
  validQuestionIds: ReadonlySet<string>,
  reviews: readonly ReviewEvent[],
): MockAttempt[] {
  if (!Array.isArray(value)) {
    throw new Error("Backup validation failed: mockAttempts must be an array.");
  }
  const ids = new Set<string>();
  const attempts = value.map((entry) => {
    // Current question content is required to resume/update an active
    // attempt. Historical terminal attempts remain structurally portable when
    // a future app version no longer ships one of their display questions.
    const structuralAttempt = validateMockAttempt(entry);
    const attempt =
      structuralAttempt.status === "active" && validQuestionIds.size > 0
        ? validateMockAttempt(structuralAttempt, validQuestionIds)
        : structuralAttempt;
    if (ids.has(attempt.id))
      throw new Error(
        `Backup validation failed: duplicate mock attempt ${attempt.id}.`,
      );
    ids.add(attempt.id);
    return attempt;
  });
  const active = attempts.filter((attempt) => attempt.status === "active");
  if (active.length > 1)
    throw new Error("Backup validation failed: more than one active mock attempt.");
  const reviewIds = new Set(reviews.map((review) => review.id));
  for (const attempt of attempts) {
    if (attempt.status === "submitted" && attempt.reviewEventsCommittedAt !== null) {
      for (const questionId of attempt.questionOrder) {
        const reviewId = `mock:${attempt.id}:${questionId}`;
        if (!reviewIds.has(reviewId)) {
          throw new Error(
            `Backup validation failed: committed mock review ${reviewId} is missing.`,
          );
        }
      }
    }
  }
  // A submitted attempt is restored as data, never replayed. The repository
  // restores its committed events together with the attempt in one replacement.
  return attempts;
}

function parseCardStates(
  value: unknown,
  validCardIds: ReadonlySet<string>,
): CardState[] {
  if (!Array.isArray(value)) {
    throw new Error("Backup validation failed: cardStates must be an array.");
  }

  const ids = new Set<string>();
  return value.map((entry, index) => {
    const path = `cardStates[${index}]`;
    const state = requireRecord(entry, path);
    const cardId = requireKnownCardId(state.cardId, path, validCardIds);
    if (ids.has(cardId)) {
      throw new Error(`Backup validation failed: duplicate card state for ${cardId}.`);
    }
    ids.add(cardId);

    const firstSeenAt = nullableTimestamp(state.firstSeenAt, `${path}.firstSeenAt`);
    const lastSeenAt = nullableTimestamp(state.lastSeenAt, `${path}.lastSeenAt`);
    const totalReviews = nonNegativeInteger(state.totalReviews, `${path}.totalReviews`);
    const correctReviews = nonNegativeInteger(
      state.correctReviews,
      `${path}.correctReviews`,
    );
    const consecutiveCorrect = nonNegativeInteger(
      state.consecutiveCorrect,
      `${path}.consecutiveCorrect`,
    );

    if (correctReviews > totalReviews) {
      throw new Error(
        `Backup validation failed: ${path}.correctReviews cannot exceed totalReviews.`,
      );
    }
    if (consecutiveCorrect > totalReviews) {
      throw new Error(
        `Backup validation failed: ${path}.consecutiveCorrect cannot exceed totalReviews.`,
      );
    }

    return {
      cardId,
      firstSeenAt,
      lastSeenAt,
      totalReviews,
      correctReviews,
      consecutiveCorrect,
    };
  });
}

function parseReviews(
  value: unknown,
  validCardIds: ReadonlySet<string>,
): ReviewEvent[] {
  if (!Array.isArray(value)) {
    throw new Error("Backup validation failed: reviews must be an array.");
  }

  const ids = new Set<string>();
  return value.map((entry, index) => {
    const path = `reviews[${index}]`;
    const review = requireRecord(entry, path);
    const id = requireNonEmptyString(review.id, `${path}.id`);
    if (ids.has(id)) {
      throw new Error(`Backup validation failed: duplicate review ID ${id}.`);
    }
    ids.add(id);

    const cardId = requireKnownCardId(review.cardId, path, validCardIds);
    const mode = review.mode;
    if (!isReviewMode(mode)) {
      throw new Error(`Backup validation failed: ${path}.mode is invalid.`);
    }

    const rating = review.rating;
    if (rating !== null && !isReviewRating(rating)) {
      throw new Error(`Backup validation failed: ${path}.rating is invalid.`);
    }

    const correct = review.correct;
    if (correct !== null && typeof correct !== "boolean") {
      throw new Error(`Backup validation failed: ${path}.correct is invalid.`);
    }

    const responseTimeMs = review.responseTimeMs;
    if (
      responseTimeMs !== null &&
      (typeof responseTimeMs !== "number" ||
        !Number.isFinite(responseTimeMs) ||
        responseTimeMs < 0)
    ) {
      throw new Error(`Backup validation failed: ${path}.responseTimeMs is invalid.`);
    }

    const selectedChoice = review.selectedChoice;
    if (
      selectedChoice !== null &&
      (typeof selectedChoice !== "number" ||
        !Number.isInteger(selectedChoice) ||
        selectedChoice < 0)
    ) {
      throw new Error(`Backup validation failed: ${path}.selectedChoice is invalid.`);
    }

    return {
      id,
      cardId,
      reviewedAt: requireTimestamp(review.reviewedAt, `${path}.reviewedAt`),
      mode,
      correct,
      rating,
      responseTimeMs,
      selectedChoice,
    };
  });
}

function requireKnownCardId(
  value: unknown,
  path: string,
  validCardIds: ReadonlySet<string>,
): string {
  const cardId = requireNonEmptyString(value, `${path}.cardId`);
  if (!validCardIds.has(cardId)) {
    throw new Error(`Backup validation failed: unknown card ID "${cardId}".`);
  }
  return cardId;
}

function requireTimestamp(value: unknown, path: string): string {
  if (typeof value !== "string" || !Number.isFinite(Date.parse(value))) {
    throw new Error(`Backup validation failed: ${path} must be a valid date-time.`);
  }
  return value;
}

function nullableTimestamp(value: unknown, path: string): string | null {
  return value === null ? null : requireTimestamp(value, path);
}

function requireNonEmptyString(value: unknown, path: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`Backup validation failed: ${path} must be a non-empty string.`);
  }
  return value;
}

function nonNegativeInteger(value: unknown, path: string): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
    throw new Error(
      `Backup validation failed: ${path} must be a non-negative integer.`,
    );
  }
  return value;
}

function requireRecord(value: unknown, path: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`Backup validation failed: ${path} must be an object.`);
  }
  return value as Record<string, unknown>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
