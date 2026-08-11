import { cards } from "../data/deck";
import { examQuestions } from "../exam/questionBank";
import { cardConceptMap } from "../knowledge/contentMap";
import { knowledgeConcepts } from "../knowledge/data";
import {
  EXAM_EVIDENCE_KINDS,
  EXAM_YIELD_TIERS,
  type ExamEvidenceSource,
  type ExamSkillEvidence,
} from "./model";

export interface ExamYieldValidationStats {
  readonly sourceCount: number;
  readonly skillCount: number;
  readonly criticalCount: number;
  readonly veryHighCount: number;
  readonly coreCount: number;
  readonly supportCount: number;
  readonly mappedConcepts: number;
  readonly totalConcepts: number;
  readonly mappedCards: number;
  readonly totalCards: number;
  readonly mappedQuestions: number;
  readonly totalQuestions: number;
  readonly criticalWithRetrieval: number;
  readonly criticalWithoutRetrieval: number;
}

export interface ExamYieldValidationInput {
  readonly sources: readonly ExamEvidenceSource[];
  readonly skills: readonly ExamSkillEvidence[];
  readonly concepts?: readonly { readonly id: string }[];
  readonly cards?: readonly { readonly id: string }[];
  readonly questions?: readonly { readonly id: string }[];
}

const FORBIDDEN_FIELD_FRAGMENTS = [
  "probability",
  "expectedmark",
  "predictedmark",
  "examyieldmastery",
  "skillprobability",
] as const;

export function validateExamYieldBlueprint(
  input: ExamYieldValidationInput,
): ExamYieldValidationStats {
  const concepts = input.concepts ?? knowledgeConcepts;
  const canonicalCards = input.cards ?? cards;
  const questions = input.questions ?? examQuestions;
  const issues: string[] = [];

  rejectForbiddenFields(input, "blueprint", issues);
  const sourceById = validateSources(input.sources, issues);
  const conceptIds = new Set(concepts.map((concept) => concept.id));
  const cardIds = new Set(canonicalCards.map((card) => card.id));
  const questionIds = new Set(questions.map((question) => question.id));
  const skillIds = new Set<string>();
  const mappedConceptIds = new Set<string>();
  const mappedCardIds = new Set<string>();
  const mappedQuestionIds = new Set<string>();

  for (const skill of input.skills) {
    if (skillIds.has(skill.id)) {
      issues.push(`duplicate skill ID "${skill.id}"`);
    }
    skillIds.add(skill.id);
    if (!skill.id.trim() || !skill.label.trim()) {
      issues.push(`skill "${skill.id}" must have a non-empty ID and label`);
    }
    if (!EXAM_YIELD_TIERS.includes(skill.tier)) {
      issues.push(`skill "${skill.id}" has an invalid tier "${skill.tier}"`);
    }
    for (const chapter of skill.chapterHints) {
      if (!Number.isInteger(chapter) || chapter < 0 || chapter > 10) {
        issues.push(`skill "${skill.id}" has invalid chapter hint ${String(chapter)}`);
      }
    }
    if (skill.conceptIds.length === 0) {
      issues.push(`skill "${skill.id}" must map at least one concept`);
    }
    validateUniqueIds(skill.id, "concept", skill.conceptIds, issues);
    validateUniqueIds(skill.id, "card", skill.cardIds, issues);
    validateUniqueIds(skill.id, "question", skill.questionIds, issues);
    for (const conceptId of skill.conceptIds) {
      mappedConceptIds.add(conceptId);
      if (!conceptIds.has(conceptId)) {
        issues.push(`skill "${skill.id}" references unknown concept "${conceptId}"`);
      }
    }
    for (const cardId of skill.cardIds) {
      mappedCardIds.add(cardId);
      if (!cardIds.has(cardId)) {
        issues.push(
          `skill "${skill.id}" references unknown canonical card "${cardId}"`,
        );
      }
    }
    for (const questionId of skill.questionIds) {
      mappedQuestionIds.add(questionId);
      if (!questionIds.has(questionId)) {
        issues.push(
          `skill "${skill.id}" references unknown exam question "${questionId}"`,
        );
      }
    }
    if (skill.tier === "critical" && skill.cardIds.length === 0) {
      issues.push(`critical skill "${skill.id}" has no canonical retrieval path`);
    }
    if (skill.tier === "critical" && skill.questionIds.length === 0) {
      issues.push(`critical skill "${skill.id}" has no exam-style retrieval evidence`);
    }
    for (const evidence of skill.sourceEvidence) {
      if (!sourceById.has(evidence.sourceId)) {
        issues.push(
          `skill "${skill.id}" references unknown evidence source "${evidence.sourceId}"`,
        );
      }
      if (
        !Number.isFinite(evidence.strength) ||
        evidence.strength < 0 ||
        evidence.strength > 1
      ) {
        issues.push(
          `skill "${skill.id}" has source strength outside [0, 1] for "${evidence.sourceId}"`,
        );
      }
      if (!evidence.note.trim()) {
        issues.push(`skill "${skill.id}" has an empty source note`);
      }
    }
  }

  for (const skill of input.skills) {
    for (const cardId of skill.cardIds) {
      if ((cardConceptMap[cardId] ?? []).length === 0) {
        issues.push(`skill "${skill.id}" card "${cardId}" has no knowledge mapping`);
      }
    }
  }

  if (issues.length > 0) {
    throw new Error(
      `Exam-yield blueprint validation failed:\n- ${issues.join("\n- ")}`,
    );
  }

  const counts = new Map(input.skills.map((skill) => [skill.tier, 0]));
  for (const skill of input.skills)
    counts.set(skill.tier, (counts.get(skill.tier) ?? 0) + 1);
  const criticalCount = counts.get("critical") ?? 0;
  const criticalWithRetrieval = input.skills.filter(
    (skill) =>
      skill.tier === "critical" &&
      skill.conceptIds.length > 0 &&
      skill.cardIds.length > 0,
  ).length;

  return {
    sourceCount: input.sources.length,
    skillCount: input.skills.length,
    criticalCount,
    veryHighCount: counts.get("very-high") ?? 0,
    coreCount: counts.get("core") ?? 0,
    supportCount: counts.get("support") ?? 0,
    mappedConcepts: mappedConceptIds.size,
    totalConcepts: concepts.length,
    mappedCards: mappedCardIds.size,
    totalCards: canonicalCards.length,
    mappedQuestions: mappedQuestionIds.size,
    totalQuestions: questions.length,
    criticalWithRetrieval,
    criticalWithoutRetrieval: criticalCount - criticalWithRetrieval,
  };
}

function validateSources(
  sources: readonly ExamEvidenceSource[],
  issues: string[],
): ReadonlyMap<string, ExamEvidenceSource> {
  const sourceById = new Map<string, ExamEvidenceSource>();
  for (const source of sources) {
    if (sourceById.has(source.id))
      issues.push(`duplicate evidence source ID "${source.id}"`);
    sourceById.set(source.id, source);
    if (!source.id.trim() || !source.notes.trim()) {
      issues.push(`evidence source "${source.id}" must have an ID and notes`);
    }
    if (!EXAM_EVIDENCE_KINDS.includes(source.kind)) {
      issues.push(`evidence source "${source.id}" has invalid kind "${source.kind}"`);
    }
    if (!Number.isInteger(source.year) || source.year < 1900 || source.year > 2100) {
      issues.push(
        `evidence source "${source.id}" has invalid year ${String(source.year)}`,
      );
    }
    for (const [label, weight] of [
      ["authenticityWeight", source.authenticityWeight],
      ["formatFitWeight", source.formatFitWeight],
    ] as const) {
      if (!Number.isFinite(weight) || weight < 0 || weight > 1) {
        issues.push(`evidence source "${source.id}" ${label} is outside [0, 1]`);
      }
    }
    if (source.url !== undefined) {
      try {
        const url = new URL(source.url);
        if (url.protocol !== "https:" && url.protocol !== "http:") {
          issues.push(`evidence source "${source.id}" URL must use HTTP(S)`);
        }
      } catch {
        issues.push(`evidence source "${source.id}" has malformed URL`);
      }
    }
  }
  return sourceById;
}

function validateUniqueIds(
  skillId: string,
  kind: string,
  ids: readonly string[],
  issues: string[],
): void {
  if (new Set(ids).size !== ids.length) {
    issues.push(`skill "${skillId}" has duplicate ${kind} mapping IDs`);
  }
}

function rejectForbiddenFields(value: unknown, path: string, issues: string[]): void {
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      rejectForbiddenFields(item, `${path}[${index}]`, issues),
    );
    return;
  }
  if (typeof value !== "object" || value === null) return;
  for (const [key, child] of Object.entries(value)) {
    const normalised = key.toLowerCase().replace(/[_-]/g, "");
    if (FORBIDDEN_FIELD_FRAGMENTS.some((fragment) => normalised.includes(fragment))) {
      issues.push(`forbidden probability/expected-mark field "${path}.${key}"`);
    }
    rejectForbiddenFields(child, `${path}.${key}`, issues);
  }
}
