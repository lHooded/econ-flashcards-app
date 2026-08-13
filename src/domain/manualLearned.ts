export const MANUAL_LEARNED_KINDS = ["card", "concept", "question"] as const;

export type ManualLearnedKind = (typeof MANUAL_LEARNED_KINDS)[number];

export interface ManualLearnedOverride {
  readonly kind: ManualLearnedKind;
  readonly targetId: string;
  readonly createdAt: string;
}

export interface ManualLearnedConcept {
  readonly id: string;
  readonly linkedCardIds: readonly string[];
  readonly linkedQuestionIds: readonly string[];
}

export interface ManualLearnedQuestion {
  readonly id: string;
  readonly reviewCardId: string;
}

export interface EffectiveManualLearned {
  readonly conceptIds: ReadonlySet<string>;
  readonly cardIds: ReadonlySet<string>;
  readonly questionIds: ReadonlySet<string>;
}

export function manualLearnedKey(kind: ManualLearnedKind, targetId: string): string {
  return `${kind}:${targetId}`;
}

export function isManualLearnedKind(value: unknown): value is ManualLearnedKind {
  return (
    typeof value === "string" &&
    MANUAL_LEARNED_KINDS.includes(value as ManualLearnedKind)
  );
}

/**
 * Validate the durable source records at a backup/repository boundary. Target
 * IDs are deliberately checked here rather than inferred from review history.
 */
export function validateManualLearnedOverrides(
  value: unknown,
  validCardIds: ReadonlySet<string>,
  validQuestionIds: ReadonlySet<string>,
  validConceptIds: ReadonlySet<string>,
): ManualLearnedOverride[] {
  if (!Array.isArray(value)) {
    throw new Error("Manual learned overrides must be an array.");
  }

  const keys = new Set<string>();
  return value.map((entry, index) => {
    if (!isRecord(entry)) {
      throw new Error(`Manual learned override ${index} must be an object.`);
    }

    const kind = entry.kind;
    if (!isManualLearnedKind(kind)) {
      throw new Error(`Manual learned override ${index} has an invalid kind.`);
    }
    const targetId = entry.targetId;
    if (typeof targetId !== "string" || targetId.trim().length === 0) {
      throw new Error(
        `Manual learned override ${index} targetId must be a non-empty string.`,
      );
    }
    const createdAt = entry.createdAt;
    if (typeof createdAt !== "string" || !Number.isFinite(Date.parse(createdAt))) {
      throw new Error(
        `Manual learned override ${index} createdAt must be a valid date-time.`,
      );
    }

    const key = manualLearnedKey(kind, targetId);
    if (keys.has(key)) {
      throw new Error(`Duplicate manual learned override ${key}.`);
    }
    keys.add(key);

    const validTargets =
      kind === "card"
        ? validCardIds
        : kind === "concept"
          ? validConceptIds
          : validQuestionIds;
    if (!validTargets.has(targetId)) {
      throw new Error(`Unknown ${kind} ID "${targetId}" in manual learned override.`);
    }

    return { kind, targetId, createdAt };
  });
}

/**
 * Resolve explicit source overrides against the current immutable content.
 * Orphaned records are retained by local persistence but ignored here, so a
 * future deck update cannot make the app fail during startup.
 */
export function deriveEffectiveManualLearned(input: {
  readonly overrides: readonly ManualLearnedOverride[];
  readonly cards: readonly { readonly id: string }[];
  readonly concepts: readonly ManualLearnedConcept[];
  readonly questions: readonly ManualLearnedQuestion[];
}): EffectiveManualLearned {
  const validCardIds = new Set(input.cards.map((card) => card.id));
  const conceptsById = new Map(input.concepts.map((concept) => [concept.id, concept]));
  const validQuestionIds = new Set(input.questions.map((question) => question.id));
  const conceptIds = new Set<string>();
  const cardIds = new Set<string>();
  const questionIds = new Set<string>();

  for (const override of input.overrides) {
    if (override.kind === "card") {
      if (validCardIds.has(override.targetId)) cardIds.add(override.targetId);
      continue;
    }

    if (override.kind === "question") {
      if (validQuestionIds.has(override.targetId)) questionIds.add(override.targetId);
      continue;
    }

    const concept = conceptsById.get(override.targetId);
    if (concept === undefined) continue;
    conceptIds.add(concept.id);
    for (const cardId of concept.linkedCardIds) {
      if (validCardIds.has(cardId)) cardIds.add(cardId);
    }
    for (const questionId of concept.linkedQuestionIds) {
      if (validQuestionIds.has(questionId)) questionIds.add(questionId);
    }
  }

  // A canonical card override suppresses only questions whose canonical review
  // card is that card. Source-card overlap is intentionally not enough.
  for (const question of input.questions) {
    if (cardIds.has(question.reviewCardId)) questionIds.add(question.id);
  }

  return { conceptIds, cardIds, questionIds };
}

/** Naming that reads naturally at application boundaries. */
export const resolveManualLearned = deriveEffectiveManualLearned;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
