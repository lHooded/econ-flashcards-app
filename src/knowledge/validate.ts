import type { Flashcard } from "../domain/content";
import type { ExamQuestion } from "../exam/model";
import type { KnowledgeConcept, KnowledgeContentMap, KnowledgeSource } from "./model";

export interface KnowledgeValidationInput {
  readonly concepts: readonly KnowledgeConcept[];
  readonly cards: readonly Flashcard[];
  readonly questions: readonly ExamQuestion[];
  readonly cardConceptMap: KnowledgeContentMap["cards"];
  readonly cardConceptEntries: KnowledgeContentMap["entries"];
  readonly fallbackMappings: number;
  readonly sources: readonly KnowledgeSource[];
}

export interface KnowledgeValidationStats {
  readonly conceptCount: number;
  readonly prerequisiteEdgeCount: number;
  readonly relatedEdgeCount: number;
  readonly rootCount: number;
  readonly foundationCount: number;
  readonly maximumPrerequisiteDepth: number;
  readonly chapterCoverage: Readonly<Record<number, number>>;
  readonly cardsMapped: number;
  readonly totalCards: number;
  readonly explicitCardMappings: number;
  readonly fallbackMappings: number;
  readonly questionsMapped: number;
  readonly totalQuestions: number;
  readonly conceptsWithLectureSource: number;
  readonly conceptsWithTextbookSource: number;
  readonly conceptsWithoutSources: number;
  readonly conceptsWithLinkedCanonicalCards: number;
  readonly conceptsWithoutLinkedCanonicalCards: number;
  readonly ambiguousInlineAliases: number;
  readonly cycles: number;
}

export class KnowledgeValidationError extends Error {
  readonly issues: readonly string[];

  constructor(issues: readonly string[]) {
    super(
      `Knowledge validation failed:\n${issues.map((issue) => `- ${issue}`).join("\n")}`,
    );
    this.name = "KnowledgeValidationError";
    this.issues = issues;
  }
}

export const SOURCE_PAGE_LIMITS: Readonly<Record<string, number>> = {
  textbook: 296,
  "lecture-w1-l1": 89,
  "lecture-w1-l2": 64,
  "lecture-w2-l1": 73,
  "lecture-w2-l2": 115,
  "lecture-w3-l1": 88,
  "lecture-w3-l2": 72,
  "lecture-w4-l1": 65,
  "lecture-w4-l2": 46,
  "lecture-w5-l1": 96,
  "lecture-w5-l2": 55,
  "lecture-w7-l1": 54,
  "lecture-w7-l2": 46,
  "lecture-w8-l1": 69,
  "lecture-w8-l2": 122,
  "lecture-w9-l1": 75,
};

export function validateKnowledgeGraph(
  input: KnowledgeValidationInput,
): KnowledgeValidationStats {
  const issues: string[] = [];
  const conceptById = new Map<string, KnowledgeConcept>();
  const cardIds = new Set(input.cards.map((card) => card.id));
  const questionIds = new Set(input.questions.map((question) => question.id));
  const sourceById = new Map<string, KnowledgeSource>();

  for (const source of input.sources) {
    if (sourceById.has(source.id)) issues.push(`duplicate source ID "${source.id}"`);
    sourceById.set(source.id, source);
    if (
      source.id.trim() === "" ||
      source.label.trim() === "" ||
      source.path.trim() === ""
    ) {
      issues.push(`malformed source "${source.id}"`);
    }
  }

  for (const concept of input.concepts) {
    if (conceptById.has(concept.id))
      issues.push(`duplicate concept ID "${concept.id}"`);
    conceptById.set(concept.id, concept);
    if (!concept.id.trim()) issues.push("concept with empty ID");
    if (!concept.name.trim()) issues.push(`concept "${concept.id}" has an empty name`);
    if (
      !concept.summary.trim() ||
      !concept.intuition.trim() ||
      concept.explanation.length === 0 ||
      concept.explanation.some((line) => !line.trim()) ||
      !concept.whyItMatters.trim()
    ) {
      issues.push(`concept "${concept.id}" has empty required explanation content`);
    }
    if (
      concept.aliases.length === 0 ||
      concept.aliases.some((alias) => !isWellFormedAlias(alias))
    ) {
      issues.push(`concept "${concept.id}" has malformed aliases`);
    }
    if (hasDuplicates(concept.aliases.map(normalise)))
      issues.push(`concept "${concept.id}" has duplicate aliases`);
    if (hasDuplicates(concept.prerequisites))
      issues.push(`concept "${concept.id}" has duplicate prerequisite edges`);
    if (hasDuplicates(concept.relatedConcepts))
      issues.push(`concept "${concept.id}" has duplicate related edges`);
    if (concept.prerequisites.includes(concept.id))
      issues.push(`concept "${concept.id}" has a self prerequisite`);
    for (const prerequisiteId of concept.prerequisites) {
      if (
        !conceptById.has(prerequisiteId) &&
        !input.concepts.some((candidate) => candidate.id === prerequisiteId)
      ) {
        issues.push(
          `concept "${concept.id}" references missing prerequisite "${prerequisiteId}"`,
        );
      }
    }
    for (const relatedId of concept.relatedConcepts) {
      if (
        !conceptById.has(relatedId) &&
        !input.concepts.some((candidate) => candidate.id === relatedId)
      ) {
        issues.push(
          `concept "${concept.id}" references missing related concept "${relatedId}"`,
        );
      }
    }
    for (const contrast of concept.contrasts ?? []) {
      if (
        !conceptById.has(contrast.conceptId) &&
        !input.concepts.some((candidate) => candidate.id === contrast.conceptId)
      ) {
        issues.push(
          `concept "${concept.id}" references missing contrast concept "${contrast.conceptId}"`,
        );
      }
      if (!contrast.title.trim() || !contrast.difference.trim())
        issues.push(`concept "${concept.id}" has malformed contrast content`);
    }
    if (concept.sourceRefs.length === 0)
      issues.push(`concept "${concept.id}" has no source references`);
    for (const sourceRef of concept.sourceRefs) {
      const source = sourceById.get(sourceRef.sourceId);
      if (source === undefined)
        issues.push(
          `concept "${concept.id}" references unknown source "${sourceRef.sourceId}"`,
        );
      if (!Number.isInteger(sourceRef.page) || sourceRef.page < 1)
        issues.push(`concept "${concept.id}" has an invalid source page`);
      const limit = SOURCE_PAGE_LIMITS[sourceRef.sourceId];
      if (limit !== undefined && sourceRef.page > limit)
        issues.push(
          `concept "${concept.id}" cites page ${sourceRef.page} beyond ${sourceRef.sourceId} (${limit} pages)`,
        );
      if (!sourceRef.note.trim())
        issues.push(`concept "${concept.id}" has an empty source note`);
    }
    for (const cardId of concept.linkedCardIds)
      if (!cardIds.has(cardId))
        issues.push(`concept "${concept.id}" links unknown card "${cardId}"`);
    for (const questionId of concept.linkedQuestionIds)
      if (!questionIds.has(questionId))
        issues.push(`concept "${concept.id}" links unknown question "${questionId}"`);
  }

  const aliasToConceptIds = new Map<string, Set<string>>();
  for (const concept of input.concepts) {
    for (const alias of [concept.name, ...concept.aliases]) {
      const canonical = normalise(alias);
      if (canonical.length < 2) continue;
      const ids = aliasToConceptIds.get(canonical) ?? new Set<string>();
      ids.add(concept.id);
      aliasToConceptIds.set(canonical, ids);
    }
  }

  if (!Number.isInteger(input.fallbackMappings) || input.fallbackMappings !== 0) {
    issues.push("production card mappings must not use chapter/topic fallbacks");
  }

  const mappingEntryIds = new Set<string>();
  for (const entry of input.cardConceptEntries) {
    if (mappingEntryIds.has(entry.cardId)) {
      issues.push(`duplicate explicit card mapping "${entry.cardId}"`);
    }
    mappingEntryIds.add(entry.cardId);
    if (!cardIds.has(entry.cardId)) {
      issues.push(`explicit mapping contains unknown card "${entry.cardId}"`);
    }
    const mapValue = input.cardConceptMap[entry.cardId];
    if (mapValue === undefined) {
      issues.push(`explicit mapping "${entry.cardId}" is missing from the card map`);
    } else if (!sameStringArray(mapValue, entry.conceptIds)) {
      issues.push(`explicit mapping "${entry.cardId}" disagrees with the card map`);
    }
  }
  for (const cardId of cardIds) {
    if (!mappingEntryIds.has(cardId)) {
      issues.push(`canonical card "${cardId}" has no explicit mapping entry`);
    }
  }
  if (input.cardConceptEntries.length !== cardIds.size) {
    issues.push(
      `explicit card mapping count is ${input.cardConceptEntries.length}, expected ${cardIds.size}`,
    );
  }

  for (const card of input.cards) {
    const mapped = input.cardConceptMap[card.id];
    if (mapped === undefined || mapped.length === 0)
      issues.push(`canonical card "${card.id}" has no concept coverage`);
    if (mapped !== undefined) {
      if (hasDuplicates(mapped))
        issues.push(`card "${card.id}" has duplicate concept edges`);
      for (const conceptId of mapped)
        if (!conceptById.has(conceptId))
          issues.push(`card "${card.id}" maps to unknown concept "${conceptId}"`);
    }
  }
  for (const cardId of Object.keys(input.cardConceptMap))
    if (!cardIds.has(cardId)) issues.push(`mapping contains unknown card "${cardId}"`);
  if (Object.keys(input.cardConceptMap).length !== cardIds.size) {
    issues.push(
      `card map key count is ${Object.keys(input.cardConceptMap).length}, expected ${cardIds.size}`,
    );
  }

  for (const question of input.questions) {
    if (!cardIds.has(question.reviewCardId))
      issues.push(
        `question "${question.id}" references unknown review card "${question.reviewCardId}"`,
      );
    if ((input.cardConceptMap[question.reviewCardId] ?? []).length === 0)
      issues.push(`question "${question.id}" has no transitive concept coverage`);
  }

  const { depths, cycles } = topologicalData(input.concepts, conceptById, issues);
  const chapterCoverage: Record<number, number> = {};
  for (const concept of input.concepts)
    for (const chapter of concept.chapters)
      chapterCoverage[chapter] = (chapterCoverage[chapter] ?? 0) + 1;
  const conceptsWithLectureSource = input.concepts.filter((concept) =>
    concept.sourceRefs.some((ref) => sourceById.get(ref.sourceId)?.kind === "lecture"),
  ).length;
  const conceptsWithTextbookSource = input.concepts.filter((concept) =>
    concept.sourceRefs.some((ref) => sourceById.get(ref.sourceId)?.kind === "textbook"),
  ).length;

  if (issues.length > 0) throw new KnowledgeValidationError(issues);

  return {
    conceptCount: input.concepts.length,
    prerequisiteEdgeCount: input.concepts.reduce(
      (count, concept) => count + concept.prerequisites.length,
      0,
    ),
    relatedEdgeCount: input.concepts.reduce(
      (count, concept) => count + concept.relatedConcepts.length,
      0,
    ),
    rootCount: input.concepts.filter((concept) => concept.prerequisites.length === 0)
      .length,
    foundationCount: input.concepts.filter((concept) =>
      concept.tags.includes("foundation"),
    ).length,
    maximumPrerequisiteDepth: Math.max(...[...depths.values(), 0]),
    chapterCoverage: Object.freeze(chapterCoverage),
    cardsMapped: input.cards.filter(
      (card) => (input.cardConceptMap[card.id]?.length ?? 0) > 0,
    ).length,
    totalCards: input.cards.length,
    explicitCardMappings: input.cardConceptEntries.filter((entry) =>
      cardIds.has(entry.cardId),
    ).length,
    fallbackMappings: input.fallbackMappings,
    questionsMapped: input.questions.filter(
      (question) => (input.cardConceptMap[question.reviewCardId]?.length ?? 0) > 0,
    ).length,
    totalQuestions: input.questions.length,
    conceptsWithLectureSource,
    conceptsWithTextbookSource,
    conceptsWithoutSources: input.concepts.filter(
      (concept) => concept.sourceRefs.length === 0,
    ).length,
    conceptsWithLinkedCanonicalCards: input.concepts.filter(
      (concept) => concept.linkedCardIds.length > 0,
    ).length,
    conceptsWithoutLinkedCanonicalCards: input.concepts.filter(
      (concept) => concept.linkedCardIds.length === 0,
    ).length,
    ambiguousInlineAliases: [...aliasToConceptIds.values()].filter(
      (ids) => ids.size > 1,
    ).length,
    cycles,
  };
}

function topologicalData(
  concepts: readonly KnowledgeConcept[],
  conceptById: ReadonlyMap<string, KnowledgeConcept>,
  issues: string[],
): {
  readonly order: readonly string[];
  readonly depths: ReadonlyMap<string, number>;
  readonly cycles: number;
} {
  const indegree = new Map(concepts.map((concept) => [concept.id, 0]));
  const dependants = new Map(concepts.map((concept) => [concept.id, [] as string[]]));
  for (const concept of concepts) {
    for (const prerequisiteId of concept.prerequisites) {
      if (!conceptById.has(prerequisiteId)) continue;
      indegree.set(concept.id, (indegree.get(concept.id) ?? 0) + 1);
      dependants.get(prerequisiteId)?.push(concept.id);
    }
  }
  const queue = concepts
    .filter((concept) => indegree.get(concept.id) === 0)
    .map((concept) => concept.id)
    .sort(compareIds);
  const order: string[] = [];
  while (queue.length > 0) {
    const id = queue.shift()!;
    order.push(id);
    for (const dependant of (dependants.get(id) ?? []).sort(compareIds)) {
      const next = indegree.get(dependant)! - 1;
      indegree.set(dependant, next);
      if (next === 0) queue.push(dependant);
    }
    queue.sort(compareIds);
  }
  const cycleIds = concepts
    .map((concept) => concept.id)
    .filter((id) => !order.includes(id));
  if (cycleIds.length > 0)
    issues.push(`prerequisite cycle detected involving ${cycleIds.join(", ")}`);
  const depths = new Map<string, number>();
  for (const id of order) {
    const concept = conceptById.get(id)!;
    const depth =
      concept.prerequisites.length === 0
        ? 0
        : Math.max(
            ...concept.prerequisites.map(
              (prerequisiteId) => depths.get(prerequisiteId) ?? 0,
            ),
          ) + 1;
    depths.set(id, depth);
  }
  return { order, depths, cycles: cycleIds.length > 0 ? 1 : 0 };
}

function isWellFormedAlias(alias: string): boolean {
  return (
    alias.trim() === alias &&
    alias.length > 0 &&
    alias.length <= 160 &&
    !/[\r\n\t]/.test(alias)
  );
}

function normalise(value: string): string {
  return value
    .toLocaleLowerCase("en-AU")
    .replace(/[’']/g, "'")
    .replace(/[^a-z0-9%]+/g, " ")
    .trim()
    .replace(/ +/g, " ");
}

function hasDuplicates(values: readonly string[]): boolean {
  return new Set(values).size !== values.length;
}

function sameStringArray(left: readonly string[], right: readonly string[]): boolean {
  return (
    left.length === right.length && left.every((value, index) => value === right[index])
  );
}

function compareIds(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}
