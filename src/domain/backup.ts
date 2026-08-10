import {
  isReviewMode,
  isReviewRating,
  validateSettings,
  type AppSettings,
  type CardState,
  type ProgressSnapshot,
  type ReviewEvent,
} from "./progress";

export const BACKUP_FORMAT = "econ-flashcards-progress" as const;
export const BACKUP_VERSION = 1 as const;

export interface ProgressBackupV1 {
  readonly format: typeof BACKUP_FORMAT;
  readonly version: typeof BACKUP_VERSION;
  readonly exportedAt: string;
  readonly settings: AppSettings;
  readonly cardStates: readonly CardState[];
  readonly reviews: readonly ReviewEvent[];
}

export function createProgressBackup(
  snapshot: ProgressSnapshot,
  exportedAt = new Date().toISOString(),
): ProgressBackupV1 {
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
): ProgressBackupV1 {
  if (!isRecord(input)) {
    throw new Error("Backup validation failed: the top-level value must be an object.");
  }

  if (input.format !== BACKUP_FORMAT) {
    throw new Error(`Unsupported backup format: expected "${BACKUP_FORMAT}".`);
  }

  if (input.version !== BACKUP_VERSION) {
    throw new Error(
      `Unsupported backup version: expected ${BACKUP_VERSION}, received ${String(input.version)}.`,
    );
  }

  const exportedAt = requireTimestamp(input.exportedAt, "exportedAt");
  const settings = validateSettings(input.settings);
  const cardStates = parseCardStates(input.cardStates, validCardIds);
  const reviews = parseReviews(input.reviews, validCardIds);

  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt,
    settings,
    cardStates,
    reviews,
  };
}

export function parseProgressBackupText(
  text: string,
  validCardIds: ReadonlySet<string>,
): ProgressBackupV1 {
  let input: unknown;
  try {
    input = JSON.parse(text) as unknown;
  } catch {
    throw new Error("Backup validation failed: the file is not valid JSON.");
  }

  return parseProgressBackup(input, validCardIds);
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
