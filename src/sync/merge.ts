import {
  createReviewEvent,
  deriveCardStateFromReviews,
  sortReviewEventsChronologically,
  validateSettings,
  type AppSettings,
  type ReviewEvent,
} from "../domain/progress";
import { validateMockAttempt, type MockAttempt } from "../exam/mock/model";
import { fromBase64Url, hasExactKeys, isRecord } from "./encoding";
import {
  SYNC_PAYLOAD_FORMAT,
  SYNC_PROTOCOL_VERSION,
  type SettingsStamp,
  type SyncPayloadV1,
} from "./model";

export class SyncValidationError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "SyncValidationError";
  }
}

export class SyncMergeConflictError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "SyncMergeConflictError";
  }
}

export interface MergeOptions {
  readonly joining?: boolean;
  readonly activeAttempt?: MockAttempt;
}

export interface SyncPayloadSource {
  readonly settings: AppSettings;
  readonly reviews: readonly ReviewEvent[];
  readonly mockAttempts: readonly MockAttempt[];
}

export function buildSyncPayload(
  source: SyncPayloadSource,
  settingsStamp: SettingsStamp,
): SyncPayloadV1 {
  return {
    format: SYNC_PAYLOAD_FORMAT,
    version: SYNC_PROTOCOL_VERSION,
    reviews: sortReviewEventsChronologically(source.reviews.map(cloneReview)),
    settings: {
      value: { ...source.settings },
      updatedAt: settingsStamp.updatedAt,
      deviceId: settingsStamp.deviceId,
    },
    mockAttempts: source.mockAttempts
      .filter((attempt) => attempt.status !== "active")
      .map(cloneMockAttempt)
      .sort((left, right) => left.id.localeCompare(right.id)),
  };
}

export function validateSyncPayload(
  value: unknown,
  validCardIds: ReadonlySet<string>,
  validQuestionIds?: ReadonlySet<string>,
): SyncPayloadV1 {
  if (
    !isRecord(value) ||
    !hasExactKeys(value, ["format", "version", "reviews", "settings", "mockAttempts"])
  ) {
    throw new SyncValidationError("Sync payload is malformed.");
  }
  if (value.format !== SYNC_PAYLOAD_FORMAT || value.version !== SYNC_PROTOCOL_VERSION) {
    throw new SyncValidationError("Sync payload version is unsupported.");
  }

  const settings = parseSettingsStamp(value.settings);
  if (!Array.isArray(value.reviews)) {
    throw new SyncValidationError("Sync payload reviews are malformed.");
  }
  const reviewIds = new Set<string>();
  const reviews = value.reviews.map((entry, index) => {
    const path = `reviews[${index}]`;
    if (
      !isRecord(entry) ||
      !hasExactKeys(entry, [
        "id",
        "cardId",
        "reviewedAt",
        "mode",
        "correct",
        "rating",
        "responseTimeMs",
        "selectedChoice",
      ])
    ) {
      throw new SyncValidationError(`${path} is malformed.`);
    }
    if (typeof entry.id !== "string" || entry.id.trim() === "") {
      throw new SyncValidationError(`${path}.id is invalid.`);
    }
    if (reviewIds.has(entry.id)) {
      throw new SyncValidationError(`Duplicate review ID ${entry.id}.`);
    }
    reviewIds.add(entry.id);
    if (typeof entry.cardId !== "string" || !validCardIds.has(entry.cardId)) {
      throw new SyncValidationError(`${path}.cardId is unknown.`);
    }
    if (entry.correct !== null && typeof entry.correct !== "boolean") {
      throw new SyncValidationError(`${path}.correct is invalid.`);
    }
    try {
      return createReviewEvent({
        id: entry.id,
        cardId: entry.cardId,
        reviewedAt: entry.reviewedAt as string | undefined,
        mode: entry.mode as ReviewEvent["mode"],
        correct: entry.correct as boolean | null,
        rating: entry.rating as ReviewEvent["rating"],
        responseTimeMs: entry.responseTimeMs as number | null,
        selectedChoice: entry.selectedChoice as number | null,
      });
    } catch {
      throw new SyncValidationError(`${path} is invalid.`);
    }
  });

  if (!Array.isArray(value.mockAttempts)) {
    throw new SyncValidationError("Sync payload mock history is malformed.");
  }
  const attemptIds = new Set<string>();
  const mockAttempts = value.mockAttempts.map((entry, index) => {
    let attempt: MockAttempt;
    try {
      attempt = validateMockAttempt(entry, validQuestionIds);
      if (attempt.status === "active") throw new Error("active");
    } catch {
      throw new SyncValidationError(`mockAttempts[${index}] is invalid.`);
    }
    if (attemptIds.has(attempt.id)) {
      throw new SyncValidationError(`Duplicate mock attempt ${attempt.id}.`);
    }
    attemptIds.add(attempt.id);
    return attempt;
  });

  const byReviewId = new Map(reviews.map((review) => [review.id, review]));
  for (const attempt of mockAttempts) {
    if (attempt.status !== "submitted") continue;
    for (const manifest of attempt.manifest) {
      const id = `mock:${attempt.id}:${manifest.questionId}`;
      const review = byReviewId.get(id);
      if (
        review === undefined ||
        review.cardId !== manifest.reviewCardId ||
        review.mode !== "mcq"
      ) {
        throw new SyncValidationError(`Committed mock review ${id} is missing.`);
      }
    }
  }

  return {
    format: SYNC_PAYLOAD_FORMAT,
    version: SYNC_PROTOCOL_VERSION,
    reviews: sortReviewEventsChronologically(reviews),
    settings,
    mockAttempts: [...mockAttempts].sort((left, right) =>
      left.id.localeCompare(right.id),
    ),
  };
}

export function mergeSyncPayloads(
  local: SyncPayloadV1,
  remote: SyncPayloadV1,
  options: MergeOptions = {},
): SyncPayloadV1 {
  const reviewsById = new Map<string, ReviewEvent>();
  for (const event of local.reviews) reviewsById.set(event.id, event);
  for (const event of remote.reviews) {
    const existing = reviewsById.get(event.id);
    if (existing !== undefined && !reviewEventsEqual(existing, event)) {
      throw new SyncMergeConflictError(`Review event ${event.id} conflicts.`);
    }
    if (existing === undefined) reviewsById.set(event.id, event);
  }

  const attemptsById = new Map<string, MockAttempt>();
  for (const attempt of local.mockAttempts) attemptsById.set(attempt.id, attempt);
  for (const attempt of remote.mockAttempts) {
    const existing = attemptsById.get(attempt.id);
    if (existing !== undefined && !stableEqual(existing, attempt)) {
      throw new SyncMergeConflictError(`Mock attempt ${attempt.id} conflicts.`);
    }
    if (existing === undefined) attemptsById.set(attempt.id, attempt);
  }

  const mergedReviews = sortReviewEventsChronologically([...reviewsById.values()]);
  const mergedAttempts = [...attemptsById.values()]
    .map(cloneMockAttempt)
    .sort((left, right) => left.id.localeCompare(right.id));
  const settings = options.joining
    ? cloneSettingsStamp(remote.settings)
    : chooseSettings(local.settings, remote.settings);
  const merged = {
    format: SYNC_PAYLOAD_FORMAT,
    version: SYNC_PROTOCOL_VERSION,
    reviews: mergedReviews,
    settings,
    mockAttempts: mergedAttempts,
  } satisfies SyncPayloadV1;

  ensureTerminalReviews(merged);
  const active = options.activeAttempt;
  if (active !== undefined) {
    const sameId = merged.mockAttempts.find((attempt) => attempt.id === active.id);
    if (sameId !== undefined) {
      if (sameId.status !== "submitted") {
        throw new SyncMergeConflictError(
          `Active mock ${active.id} conflicts with terminal history.`,
        );
      }
      ensureAttemptReviews(sameId, merged.reviews);
    }
  }
  return merged;
}

export function syncPayloadsEqual(left: SyncPayloadV1, right: SyncPayloadV1): boolean {
  return stableEqual(left, right);
}

export function deriveSyncedCardStates(
  validCardIds: ReadonlySet<string>,
  reviews: readonly ReviewEvent[],
) {
  return [...validCardIds]
    .sort()
    .map((cardId) => deriveCardStateFromReviews(cardId, reviews));
}

export function ensureAttemptReviews(
  attempt: MockAttempt,
  reviews: readonly ReviewEvent[],
): void {
  if (attempt.status !== "submitted") return;
  const reviewById = new Map(reviews.map((review) => [review.id, review]));
  for (const manifest of attempt.manifest) {
    const id = `mock:${attempt.id}:${manifest.questionId}`;
    const review = reviewById.get(id);
    if (
      review === undefined ||
      review.cardId !== manifest.reviewCardId ||
      review.mode !== "mcq"
    ) {
      throw new SyncMergeConflictError(`Committed mock review ${id} is missing.`);
    }
  }
}

function parseSettingsStamp(value: unknown): SettingsStamp {
  if (
    !isRecord(value) ||
    !hasExactKeys(value, ["value", "updatedAt", "deviceId"]) ||
    !isRecord(value.value) ||
    !hasExactKeys(value.value, ["examAt", "studyBufferHours"]) ||
    typeof value.updatedAt !== "string" ||
    !Number.isFinite(Date.parse(value.updatedAt)) ||
    typeof value.deviceId !== "string"
  ) {
    throw new SyncValidationError("Sync settings stamp is malformed.");
  }
  try {
    if (fromBase64Url(value.deviceId).length !== 16) throw new Error();
  } catch {
    throw new SyncValidationError("Sync settings device ID is invalid.");
  }
  let settings: AppSettings;
  try {
    settings = validateSettings(value.value);
  } catch {
    throw new SyncValidationError("Sync settings value is invalid.");
  }
  return { value: settings, updatedAt: value.updatedAt, deviceId: value.deviceId };
}

function chooseSettings(left: SettingsStamp, right: SettingsStamp): SettingsStamp {
  const leftTime = Date.parse(left.updatedAt);
  const rightTime = Date.parse(right.updatedAt);
  if (leftTime > rightTime) return cloneSettingsStamp(left);
  if (rightTime > leftTime) return cloneSettingsStamp(right);
  if (left.deviceId < right.deviceId) return cloneSettingsStamp(left);
  if (right.deviceId < left.deviceId) return cloneSettingsStamp(right);
  if (!stableEqual(left.value, right.value)) {
    throw new SyncMergeConflictError(
      "Settings have an identical stamp but different values.",
    );
  }
  return cloneSettingsStamp(left);
}

function ensureTerminalReviews(payload: SyncPayloadV1): void {
  for (const attempt of payload.mockAttempts)
    ensureAttemptReviews(attempt, payload.reviews);
}

function reviewEventsEqual(left: ReviewEvent, right: ReviewEvent): boolean {
  return (
    left.id === right.id &&
    left.cardId === right.cardId &&
    left.reviewedAt === right.reviewedAt &&
    left.mode === right.mode &&
    left.correct === right.correct &&
    left.rating === right.rating &&
    left.responseTimeMs === right.responseTimeMs &&
    left.selectedChoice === right.selectedChoice
  );
}

function cloneReview(review: ReviewEvent): ReviewEvent {
  return { ...review };
}

function cloneSettingsStamp(stamp: SettingsStamp): SettingsStamp {
  return {
    value: { ...stamp.value },
    updatedAt: stamp.updatedAt,
    deviceId: stamp.deviceId,
  };
}

function cloneMockAttempt(attempt: MockAttempt): MockAttempt {
  return {
    ...attempt,
    questionOrder: [...attempt.questionOrder],
    manifest: attempt.manifest.map((entry) => ({ ...entry })),
    questionStates: attempt.questionStates.map((state) => ({ ...state })),
  };
}

function stableEqual(left: unknown, right: unknown): boolean {
  return stableSerialize(left) === stableSerialize(right);
}

function stableSerialize(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableSerialize).join(",")}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableSerialize(record[key])}`)
    .join(",")}}`;
}
