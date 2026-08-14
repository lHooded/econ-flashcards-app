import { describe, expect, it } from "vitest";
import { cards } from "../data/deck";
import type { ExamQuestion } from "../exam/model";
import { examQuestions } from "../exam/questionBank";
import { DEFAULT_APP_SETTINGS } from "../domain/progress";
import {
  applySuperCramAnswer,
  buildSuperCramCandidates,
  createEmptySuperCramSession,
  getQuestionReasonKind,
  scoreSuperCramCandidate,
  selectSuperCramQuestion,
} from "../superCram/selector";
import { getQuestionCheatSheetProfile } from "../superCram/selector";
import { validateSuperCramRegistry } from "../superCram/validate";
import type {
  SuperCramQuestionCandidate,
  SuperCramSessionState,
} from "../superCram/model";

const NOW = Date.parse("2026-08-14T00:00:00.000Z");

function question(id: string, reviewCardId: string, chapter: number): ExamQuestion {
  const source = examQuestions[0];
  return {
    ...source,
    id,
    reviewCardId,
    sourceCardIds: [reviewCardId],
    chapter,
    topic: id,
  };
}

function candidate(
  overrides: Partial<SuperCramQuestionCandidate> = {},
): SuperCramQuestionCandidate {
  const baseQuestion = question("synthetic-question", "ch01-001", 1);
  return {
    question: baseQuestion,
    examYieldScore: 100,
    examYieldTier: "critical",
    studyWorthiness: 3,
    cheatSheetClass: "mixed",
    cheatSheetSections: ["Q1"],
    formulaFamilyId: null,
    reasonKind: "reasoning-heavy",
    isUrgent: false,
    srsPriority: 1100,
    score: 0,
    ...overrides,
  };
}

function session(
  overrides: Partial<SuperCramSessionState> = {},
): SuperCramSessionState {
  return { ...createEmptySuperCramSession(), ...overrides };
}

describe("Super Cram metadata and selector", () => {
  it("validates the complete cheat-sheet and Formula Application registries", () => {
    const stats = validateSuperCramRegistry();
    expect(stats.examSkillCount).toBe(33);
    expect(stats.cheatSheetProfileCount).toBe(33);
    expect(stats.formulaApplicationQuestionCount).toBeGreaterThanOrEqual(32);
    expect(stats.newFormulaApplicationQuestionCount).toBeGreaterThanOrEqual(16);
    expect(stats.byChapter["1"]).toBeGreaterThanOrEqual(1);
    expect(stats.byChapter["10"]).toBeGreaterThanOrEqual(1);
  });

  it("keeps direct lookup material below equal-yield reasoning material", () => {
    const lookup = candidate({
      question: question("lookup", "ch01-001", 1),
      studyWorthiness: 1,
      cheatSheetClass: "direct-lookup",
      reasonKind: "lookup-validation",
    });
    const reasoning = candidate({
      question: question("reasoning", "ch01-002", 1),
      studyWorthiness: 5,
      cheatSheetClass: "reasoning-heavy",
      reasonKind: "reasoning-heavy",
    });
    const state = session();
    expect(
      scoreSuperCramCandidate({ candidate: reasoning, session: state, nowMs: NOW }),
    ).toBeGreaterThan(
      scoreSuperCramCandidate({ candidate: lookup, session: state, nowMs: NOW }),
    );
  });

  it("lets genuine due/relearning evidence beat unseen fashionable material", () => {
    const urgent = candidate({
      question: question("urgent", "ch02-001", 2),
      examYieldScore: 40,
      studyWorthiness: 1,
      isUrgent: true,
      srsPriority: 1400,
      reasonKind: "urgent-weakness",
    });
    const fashionable = candidate({
      question: question("fashionable", "ch09-001", 9),
      examYieldScore: 200,
      studyWorthiness: 5,
      isUrgent: false,
    });
    const selected = selectSuperCramQuestion({
      candidates: [urgent, fashionable],
      session: session(),
      nowMs: NOW,
    });
    expect(selected?.question.id).toBe("urgent");
  });

  it("samples a cold formula family and lowers its bonus after success", () => {
    const formula = candidate({
      question: question("formula-one", "ch03-001", 3),
      examYieldScore: 70,
      studyWorthiness: 2,
      formulaFamilyId: "formula-test",
      reasonKind: "formula-application",
    });
    const state = session();
    const coldScore = scoreSuperCramCandidate({
      candidate: formula,
      session: state,
      nowMs: NOW,
    });
    const next = applySuperCramAnswer(state, formula, true);
    const coveredScore = scoreSuperCramCandidate({
      candidate: formula,
      session: next,
      nowMs: NOW,
    });
    expect(coldScore).toBeGreaterThan(coveredScore);
    expect(next.formulaFamiliesCovered.has("formula-test")).toBe(true);
  });

  it("remediates a failed formula family with a different question after spacing", () => {
    const first = candidate({
      question: question("formula-one", "ch03-001", 3),
      formulaFamilyId: "formula-test",
      reasonKind: "formula-application",
    });
    const second = candidate({
      question: question("formula-two", "ch03-002", 3),
      formulaFamilyId: "formula-test",
      reasonKind: "formula-application",
    });
    const failed = applySuperCramAnswer(session(), first, false);
    const selected = selectSuperCramQuestion({
      candidates: [first, second].map((item) => ({
        ...item,
        score: scoreSuperCramCandidate({
          candidate: item,
          session: failed,
          nowMs: NOW,
        }),
      })),
      session: failed,
      nowMs: NOW,
    });
    expect(failed.formulaFamiliesFailed.has("formula-test")).toBe(true);
    expect(selected?.question.id).toBe("formula-two");
  });

  it("excludes manually learned question and card targets", () => {
    const sampleQuestion = examQuestions.find(
      (item) => item.id === "auth-form-ch10-013",
    )!;
    const questionExcluded = buildSuperCramCandidates({
      questions: [sampleQuestion],
      cards,
      reviewEvents: [],
      settings: DEFAULT_APP_SETTINGS,
      nowMs: NOW,
      manuallyLearnedQuestionIds: new Set([sampleQuestion.id]),
    });
    const cardExcluded = buildSuperCramCandidates({
      questions: [sampleQuestion],
      cards,
      reviewEvents: [],
      settings: DEFAULT_APP_SETTINGS,
      nowMs: NOW,
      manuallyLearnedCardIds: new Set([sampleQuestion.reviewCardId]),
    });
    expect(questionExcluded).toEqual([]);
    expect(cardExcluded).toEqual([]);
  });

  it("does not classify MPK/MPL formula recognition as formula application", () => {
    const recognition = examQuestions.find((item) => item.id === "auth-ch10-011")!;
    const profile = getQuestionCheatSheetProfile(recognition);
    expect(recognition.style).toBe("concept");
    expect(getQuestionReasonKind(recognition, profile, false, undefined)).toBe(
      "lookup-validation",
    );
  });

  it("keeps scenario/form bonuses bounded against an urgent target", () => {
    const urgent = candidate({
      question: question("urgent", "ch03-003", 3),
      examYieldScore: 50,
      isUrgent: true,
      srsPriority: 1400,
      reasonKind: "urgent-weakness",
    });
    const scenario = candidate({
      question: { ...question("scenario", "ch09-003", 9), style: "scenario" },
      examYieldScore: 220,
      studyWorthiness: 5,
      reasonKind: "reasoning-heavy",
    });
    expect(
      scoreSuperCramCandidate({ candidate: urgent, session: session(), nowMs: NOW }),
    ).toBeGreaterThan(
      scoreSuperCramCandidate({ candidate: scenario, session: session(), nowMs: NOW }),
    );
  });
});
