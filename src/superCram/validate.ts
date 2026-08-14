import { cards } from "../data/deck";
import { examQuestions } from "../exam/questionBank";
import { examSkillEvidence } from "../examYield/skills";
import { examYieldBlueprint } from "../examYield/blueprint";
import {
  assertCheatSheetRegistryUsesCurrentSkills,
  cheatSheetSkillProfiles,
  questionStudyWorthinessOverrides,
} from "./cheatSheet";
import {
  assertFormulaApplicationFamiliesUseCurrentData,
  formulaApplicationFamilies,
  formulaApplicationFamilyById,
  formulaApplicationMetaByQuestionId,
  formulaApplicationQuestionMeta,
} from "./formulaFamilies";
import type { StudyWorthiness } from "./model";

export interface SuperCramValidationStats {
  readonly examSkillCount: number;
  readonly cheatSheetProfileCount: number;
  readonly formulaFamilyCount: number;
  readonly formulaApplicationQuestionCount: number;
  readonly newFormulaApplicationQuestionCount: number;
  readonly byChapter: Readonly<Record<string, number>>;
  readonly stimulusCount: number;
}

const VALID_WORTHINESS = new Set<StudyWorthiness>([1, 2, 3, 4, 5]);

export function validateSuperCramRegistry(): SuperCramValidationStats {
  const issues: string[] = [];
  try {
    assertCheatSheetRegistryUsesCurrentSkills();
    assertFormulaApplicationFamiliesUseCurrentData();
  } catch (error: unknown) {
    issues.push(error instanceof Error ? error.message : String(error));
  }

  const skillIds = new Set(examSkillEvidence.map((skill) => skill.id));
  const questionById = new Map(
    examQuestions.map((question) => [question.id, question]),
  );
  const sourceIds = new Set(examYieldBlueprint.sources.map((source) => source.id));
  const cardIds = new Set(cards.map((card) => card.id));

  if (cheatSheetSkillProfiles.length !== skillIds.size) {
    issues.push(
      `Expected one cheat-sheet profile per current exam skill (${skillIds.size}), found ${cheatSheetSkillProfiles.length}.`,
    );
  }
  for (const profile of cheatSheetSkillProfiles) {
    if (!skillIds.has(profile.skillId)) {
      issues.push(`Unknown cheat-sheet skill profile "${profile.skillId}".`);
    }
    if (!VALID_WORTHINESS.has(profile.studyWorthiness)) {
      issues.push(`Invalid study-worthiness for "${profile.skillId}".`);
    }
    if (profile.cheatSheetSections.some((section) => section.trim().length === 0)) {
      issues.push(`Empty cheat-sheet section in "${profile.skillId}".`);
    }
  }

  for (const override of questionStudyWorthinessOverrides) {
    if (!questionById.has(override.questionId)) {
      issues.push(`Unknown Super Cram question override "${override.questionId}".`);
    }
    if (!VALID_WORTHINESS.has(override.studyWorthiness)) {
      issues.push(`Invalid question study-worthiness for "${override.questionId}".`);
    }
    if (override.note.trim().length === 0) {
      issues.push(`Empty question override note for "${override.questionId}".`);
    }
  }

  if (
    new Set(questionStudyWorthinessOverrides.map((item) => item.questionId)).size !==
    questionStudyWorthinessOverrides.length
  ) {
    issues.push("Question-level Super Cram overrides are not unique.");
  }

  const familyQuestionIds = new Set<string>();
  const byChapter: Record<string, number> = {};
  let stimulusCount = 0;
  for (const family of formulaApplicationFamilies) {
    if (family.chapters.length === 0)
      issues.push(`Family "${family.id}" has no chapter.`);
    if (family.cheatSheetSections.some((section) => section.trim().length === 0)) {
      issues.push(`Family "${family.id}" has an empty cheat-sheet section.`);
    }
    for (const sourceId of family.practiceEvidenceSourceIds) {
      if (!sourceIds.has(sourceId)) {
        issues.push(`Family "${family.id}" references unknown source "${sourceId}".`);
      }
    }
    for (const questionId of family.questionIds) {
      const question = questionById.get(questionId);
      if (question === undefined) continue;
      if (question.style !== "calculation") {
        issues.push(
          `Formula Application question "${questionId}" must be a calculation/application style, found "${question.style}".`,
        );
      }
      if (!family.chapters.includes(question.chapter)) {
        issues.push(
          `Formula Application question "${questionId}" is outside family "${family.id}" chapter scope.`,
        );
      }
      if (!cardIds.has(question.reviewCardId)) {
        issues.push(
          `Formula Application question "${questionId}" has an unknown review card.`,
        );
      }
      familyQuestionIds.add(questionId);
      byChapter[String(question.chapter)] =
        (byChapter[String(question.chapter)] ?? 0) + 1;
      if (question.stimulus !== undefined) stimulusCount += 1;
      const meta = formulaApplicationMetaByQuestionId.get(questionId);
      if (meta === undefined || meta.familyId !== family.id) {
        issues.push(
          `Missing or inconsistent Formula Application metadata for "${questionId}".`,
        );
      }
    }
  }

  for (const meta of formulaApplicationQuestionMeta) {
    if (meta.form.trim().length === 0 || meta.analogueNote.trim().length === 0) {
      issues.push(
        `Formula Application metadata for "${meta.questionId}" is incomplete.`,
      );
    }
    for (const sourceId of meta.practiceEvidenceSourceIds) {
      if (!sourceIds.has(sourceId)) {
        issues.push(
          `Formula Application metadata for "${meta.questionId}" references unknown source "${sourceId}".`,
        );
      }
    }
  }

  if (familyQuestionIds.size !== formulaApplicationQuestionMeta.length) {
    issues.push(
      "Formula Application question metadata and family membership are not total.",
    );
  }
  const newQuestionCount = [...familyQuestionIds].filter((id) =>
    id.startsWith("auth-form-"),
  ).length;
  if (familyQuestionIds.size < 32) {
    issues.push(
      `Formula Application needs at least 32 questions; found ${familyQuestionIds.size}.`,
    );
  }
  if (newQuestionCount < 16) {
    issues.push(
      `Formula Application needs at least 16 newly authored questions; found ${newQuestionCount}.`,
    );
  }
  const chapterRanges: readonly [number, number, number][] = [
    [1, 4, 7],
    [5, 7, 10],
    [8, 10, 15],
  ];
  for (const [start, end, minimum] of chapterRanges) {
    const count = [...familyQuestionIds].filter((questionId) => {
      const chapter = questionById.get(questionId)?.chapter;
      return chapter !== undefined && chapter >= start && chapter <= end;
    }).length;
    if (count < minimum) {
      issues.push(
        `Formula Application Chapters ${start}–${end} need ${minimum} questions; found ${count}.`,
      );
    }
  }

  if (formulaApplicationFamilyById.size !== formulaApplicationFamilies.length) {
    issues.push("Formula Application family IDs are not unique.");
  }
  if (
    formulaApplicationMetaByQuestionId.size !== formulaApplicationQuestionMeta.length
  ) {
    issues.push("Formula Application question metadata IDs are not unique.");
  }
  if (issues.length > 0) {
    throw new Error(`Super Cram validation failed:\n- ${issues.join("\n- ")}`);
  }

  return {
    examSkillCount: examSkillEvidence.length,
    cheatSheetProfileCount: cheatSheetSkillProfiles.length,
    formulaFamilyCount: formulaApplicationFamilies.length,
    formulaApplicationQuestionCount: familyQuestionIds.size,
    newFormulaApplicationQuestionCount: newQuestionCount,
    byChapter,
    stimulusCount,
  };
}
