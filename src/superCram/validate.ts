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
  formulaApplicationCoverageUnitByQuestionId,
  formulaApplicationMetaByQuestionId,
  formulaApplicationQuestionMeta,
} from "./formulaFamilies";
import { assertValidCheatSheetSections } from "./cheatSheetCatalog";
import { auditFormulaApplicationAnswerKeys } from "./formulaAudit";
import type { FormulaApplicationOperation, StudyWorthiness } from "./model";

export interface SuperCramValidationStats {
  readonly examSkillCount: number;
  readonly cheatSheetProfileCount: number;
  readonly formulaFamilyCount: number;
  readonly formulaCoverageUnitCount: number;
  readonly formulaApplicationQuestionCount: number;
  readonly newFormulaApplicationQuestionCount: number;
  readonly byChapter: Readonly<Record<string, number>>;
  readonly stimulusCount: number;
}

const VALID_WORTHINESS = new Set<StudyWorthiness>([1, 2, 3, 4, 5]);
const VALID_FORMULA_OPERATIONS = new Set<FormulaApplicationOperation>([
  "select-formula",
  "extract-inputs",
  "rearrange",
  "substitute",
  "calculate",
  "sign-or-units",
]);

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
  issues.push(...auditFormulaApplicationAnswerKeys(examQuestions));

  if (cheatSheetSkillProfiles.length !== skillIds.size) {
    issues.push(
      `Expected one cheat-sheet profile per current exam skill (${skillIds.size}), found ${cheatSheetSkillProfiles.length}.`,
    );
  }
  for (const profile of cheatSheetSkillProfiles) {
    try {
      assertValidCheatSheetSections(profile.cheatSheetSections, "Cheat-sheet profile");
    } catch (error: unknown) {
      issues.push(error instanceof Error ? error.message : String(error));
    }
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
    if (override.cheatSheetSections !== undefined) {
      try {
        assertValidCheatSheetSections(
          override.cheatSheetSections,
          "Question study-worthiness override",
        );
      } catch (error: unknown) {
        issues.push(error instanceof Error ? error.message : String(error));
      }
    }
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
  const coverageUnitIds = new Set<string>();
  const byChapter: Record<string, number> = {};
  let stimulusCount = 0;
  for (const family of formulaApplicationFamilies) {
    try {
      assertValidCheatSheetSections(
        family.cheatSheetSections,
        "Formula Application family",
      );
    } catch (error: unknown) {
      issues.push(error instanceof Error ? error.message : String(error));
    }
    for (const skillId of family.examSkillIds) {
      if (!skillIds.has(skillId)) {
        issues.push(
          "Formula Application family references unknown exam skill " + skillId,
        );
      }
    }
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
      if (question === undefined) {
        issues.push(
          "Formula Application family references unknown question " + questionId,
        );
        continue;
      }
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
      if (!question.sourceCardIds.includes(question.reviewCardId)) {
        issues.push(
          "Formula Application question does not include its review card in sourceCardIds: " +
            questionId,
        );
      }
      if (question.choices.length !== 4 || question.choiceRationales.length !== 4) {
        issues.push(
          "Formula Application question must have four choices and four rationales: " +
            questionId,
        );
      }
      if (
        question.correctChoice < 0 ||
        question.correctChoice >= question.choices.length
      ) {
        issues.push(
          "Formula Application question has an invalid answer key: " + questionId,
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
    if (!questionById.has(meta.questionId)) {
      issues.push(
        "Formula Application metadata references unknown question " + meta.questionId,
      );
    }
    if (meta.operations.length === 0) {
      issues.push("Formula Application metadata has no operations: " + meta.questionId);
    }
    if (
      !meta.operations.some((operation) =>
        ["rearrange", "substitute", "calculate", "sign-or-units"].includes(operation),
      )
    ) {
      issues.push(
        "Formula Application metadata is recognition-only: " + meta.questionId,
      );
    }
    for (const operation of meta.operations) {
      if (!VALID_FORMULA_OPERATIONS.has(operation)) {
        issues.push(
          "Formula Application metadata has an unknown operation " +
            operation +
            ": " +
            meta.questionId,
        );
      }
    }
    if (meta.form.trim().length === 0 || meta.analogueNote.trim().length === 0) {
      issues.push(
        `Formula Application metadata for "${meta.questionId}" is incomplete.`,
      );
    }
    if (meta.coverageUnitId.trim().length === 0) {
      issues.push(
        `Formula Application metadata for "${meta.questionId}" has no coverage unit.`,
      );
    } else {
      coverageUnitIds.add(meta.coverageUnitId);
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
  const coverageMapQuestionIds = new Set(
    Object.keys(formulaApplicationCoverageUnitByQuestionId),
  );
  if (coverageMapQuestionIds.size !== formulaApplicationQuestionMeta.length) {
    issues.push("Formula Application coverage-unit metadata is not total.");
  }
  for (const meta of formulaApplicationQuestionMeta) {
    if (!coverageMapQuestionIds.has(meta.questionId)) {
      issues.push(
        "Formula Application coverage-unit metadata is missing question " +
          meta.questionId,
      );
    }
  }
  for (const questionId of coverageMapQuestionIds) {
    if (!familyQuestionIds.has(questionId)) {
      issues.push(
        "Formula Application coverage-unit metadata references unknown question " +
          questionId,
      );
    }
  }
  if (issues.length > 0) {
    throw new Error(`Super Cram validation failed:\n- ${issues.join("\n- ")}`);
  }

  return {
    examSkillCount: examSkillEvidence.length,
    cheatSheetProfileCount: cheatSheetSkillProfiles.length,
    formulaFamilyCount: formulaApplicationFamilies.length,
    formulaCoverageUnitCount: coverageUnitIds.size,
    formulaApplicationQuestionCount: familyQuestionIds.size,
    newFormulaApplicationQuestionCount: newQuestionCount,
    byChapter,
    stimulusCount,
  };
}
