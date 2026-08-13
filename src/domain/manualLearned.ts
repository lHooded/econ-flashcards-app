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
  /** Explicit concept source records only. */
  readonly conceptIds: ReadonlySet<string>;
  /** Concepts operationally satisfied by a direct override or full card coverage. */
  readonly coveredConceptIds: ReadonlySet<string>;
  /** Cards directly excluded or conservatively covered by all mapped concepts. */
  readonly cardIds: ReadonlySet<string>;
  /** Questions directly excluded or attached to an effectively excluded card. */
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
 * Validate only the structural shape of a locally stored record. This does
 * not validate that the target still exists in today's immutable deck: a
 * structurally valid orphan is retained and ignored by the resolver.
 */
export function validateManualLearnedOverrideRecord(
  value: unknown,
  label = "Manual learned override",
): ManualLearnedOverride {
  if (!isRecord(value)) {
    throw new Error(`${label} must be an object.`);
  }

  const kind = value.kind;
  if (!isManualLearnedKind(kind)) {
    throw new Error(`${label} has an invalid kind.`);
  }
  const targetId = value.targetId;
  if (typeof targetId !== "string" || targetId.trim().length === 0) {
    throw new Error(`${label} targetId must be a non-empty string.`);
  }
  const createdAt = value.createdAt;
  if (typeof createdAt !== "string" || !Number.isFinite(Date.parse(createdAt))) {
    throw new Error(`${label} createdAt must be a valid date-time.`);
  }

  return { kind, targetId, createdAt };
}

/**
 * Parse an IndexedDB row without allowing malformed data to enter the
 * application. A mismatching storage key is treated as malformed; a valid
 * target that no longer exists is deliberately not rejected here.
 */
export function parseStoredManualLearnedOverride(
  value: unknown,
  expectedKey: unknown,
): ManualLearnedOverride | null {
  try {
    const override = validateManualLearnedOverrideRecord(value);
    return expectedKey === manualLearnedKey(override.kind, override.targetId)
      ? override
      : null;
  } catch {
    return null;
  }
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
  /** Production card→concept mappings; used to protect multi-concept cards. */
  readonly cardConceptIds?: Readonly<Record<string, readonly string[]>>;
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
  }

  // A multi-concept card remains available until every production-mapped
  // concept on it is an explicit manual concept source. Never use the derived
  // card coverage set as a new concept source: that would recursively spread
  // an override to neighbouring concepts.
  for (const card of input.cards) {
    const mappedConceptIds =
      input.cardConceptIds?.[card.id] ??
      input.concepts
        .filter((concept) => concept.linkedCardIds.includes(card.id))
        .map((concept) => concept.id);
    if (
      mappedConceptIds.length > 0 &&
      mappedConceptIds.every((conceptId) => conceptIds.has(conceptId))
    ) {
      cardIds.add(card.id);
    }
  }

  // Only a direct question override or a suppressed canonical review card
  // excludes a question. Source-card overlap and concept linkedQuestionIds are
  // intentionally not enough.
  for (const question of input.questions) {
    if (cardIds.has(question.reviewCardId)) questionIds.add(question.id);
  }

  const coveredConceptIds = new Set(conceptIds);
  for (const concept of input.concepts) {
    if (
      concept.linkedCardIds.length > 0 &&
      concept.linkedCardIds.every((cardId) => cardIds.has(cardId))
    ) {
      coveredConceptIds.add(concept.id);
    }
  }

  return { conceptIds, coveredConceptIds, cardIds, questionIds };
}

/** Naming that reads naturally at application boundaries. */
export const resolveManualLearned = deriveEffectiveManualLearned;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
