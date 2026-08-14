import { describe, expect, it } from "vitest";
import { cards } from "../data/deck";
import { createReviewEvent, DEFAULT_APP_SETTINGS } from "../domain/progress";
import { examQuestions } from "../exam/questionBank";
import {
  buildSuperCramCandidates,
  createEmptySuperCramSession,
  findUrgentCanonicalFallback,
  isReviewSnapshotStale,
  selectSuperCramQuestion,
} from "../superCram/selector";
import { deriveExamSrsSnapshot } from "../study/examSrs/deriveState";
import {
  isExamSrsAttemptedDueReview,
  isExamSrsDueReview,
  rankExamSrsCandidatesFromSnapshot,
} from "../study/examSrs/selector";
import { MINUTE_MS } from "../study/examSrs/intervals";

const NOW = Date.parse("2026-08-14T00:00:00.000Z");

function review(
  cardId: string,
  reviewedAt: number,
  input: { readonly correct: boolean; readonly rating: "forgot" | "struggled" },
) {
  return createReviewEvent({
    id: cardId + "-" + input.rating,
    cardId,
    reviewedAt: new Date(reviewedAt).toISOString(),
    mode: "mcq",
    correct: input.correct,
    rating: input.rating,
    responseTimeMs: 900,
    selectedChoice: 0,
  });
}

function candidateFor(
  cardId: string,
  reviewEvents: readonly ReturnType<typeof review>[],
  nowMs: number,
) {
  const question = examQuestions.find((item) => item.reviewCardId === cardId);
  if (question === undefined) throw new Error("No question for " + cardId);
  return buildSuperCramCandidates({
    questions: [question],
    cards,
    reviewEvents,
    settings: DEFAULT_APP_SETTINGS,
    nowMs,
  })[0];
}

describe("Super Cram scheduler invariants", () => {
  it("does not treat a non-due failure/relearning card as urgent", () => {
    const event = review("ch08-003", NOW, { correct: false, rating: "forgot" });
    const beforeDue = candidateFor("ch08-003", [event], NOW + 5 * MINUTE_MS);
    expect(beforeDue?.isUrgent).toBe(false);
    expect(beforeDue?.hasWeakEvidence).toBe(true);
    expect(beforeDue?.reasonKind).not.toBe("urgent-weakness");

    const due = candidateFor("ch08-003", [event], NOW + 10 * MINUTE_MS);
    expect(due?.isUrgent).toBe(true);
    expect(due?.reasonKind).toBe("urgent-weakness");
  });

  it("does not treat a non-due weak success as urgent", () => {
    const event = review("ch08-003", NOW, { correct: true, rating: "struggled" });
    const beforeDue = candidateFor("ch08-003", [event], NOW + 30 * MINUTE_MS);
    expect(beforeDue?.isUrgent).toBe(false);
    expect(beforeDue?.hasWeakEvidence).toBe(true);

    const due = candidateFor("ch08-003", [event], NOW + 45 * MINUTE_MS);
    expect(due?.isUrgent).toBe(true);
  });

  it("agrees with ordinary Exam-SRS due eligibility for attempted cards", () => {
    const event = review("ch08-003", NOW, { correct: false, rating: "forgot" });
    for (const nowMs of [NOW + 5 * MINUTE_MS, NOW + 10 * MINUTE_MS]) {
      const snapshot = deriveExamSrsSnapshot(
        cards,
        [event],
        DEFAULT_APP_SETTINGS,
        nowMs,
      );
      const state = snapshot.stateByCardId["ch08-003"];
      const ordinary = rankExamSrsCandidatesFromSnapshot({
        cards,
        scheduler: snapshot,
        nowMs,
        candidateCardIds: new Set(["ch08-003"]),
      });
      const superCandidate = candidateFor("ch08-003", [event], nowMs);
      expect(superCandidate?.isUrgent).toBe(isExamSrsAttemptedDueReview(state));
      expect(ordinary.length > 0).toBe(isExamSrsDueReview(state));
    }
  });

  it("keeps a recent eligible MCQ available instead of losing the due card", () => {
    const cardId = "ch08-003";
    const event = review(cardId, NOW, { correct: false, rating: "forgot" });
    const question = examQuestions.find((item) => item.reviewCardId === cardId);
    expect(question).toBeDefined();
    const candidates = buildSuperCramCandidates({
      questions: [question!],
      cards,
      reviewEvents: [event],
      settings: DEFAULT_APP_SETTINGS,
      nowMs: NOW + 10 * MINUTE_MS,
      session: {
        recentQuestionIds: [question!.id],
        recentReviewCardIds: [cardId],
        chaptersTouched: [],
        formulaCoverageUnitsCovered: new Set(),
        formulaCoverageUnitsFailed: new Set(),
        answeredCount: 1,
        correctCount: 0,
        reasoningGaps: 0,
        kindCounts: {
          "reasoning-heavy": 0,
          "formula-application": 0,
          "lookup-validation": 0,
          "urgent-weakness": 0,
        },
      },
    });
    expect(candidates[0]?.isUrgent).toBe(true);
    expect(
      selectSuperCramQuestion({
        candidates,
        session: {
          recentQuestionIds: [question!.id],
          recentReviewCardIds: [cardId],
          chaptersTouched: [],
          formulaCoverageUnitsCovered: new Set(),
          formulaCoverageUnitsFailed: new Set(),
          answeredCount: 1,
          correctCount: 0,
          reasoningGaps: 0,
          kindCounts: {
            "reasoning-heavy": 0,
            "formula-application": 0,
            "lookup-validation": 0,
            "urgent-weakness": 0,
          },
        },
        nowMs: NOW + 10 * MINUTE_MS,
      })?.question.id,
    ).toBe(question!.id);
    expect(
      findUrgentCanonicalFallback({
        cards,
        questions: [question!],
        reviewEvents: [event],
        settings: DEFAULT_APP_SETTINGS,
        nowMs: NOW + 10 * MINUTE_MS,
      }),
    ).toBeNull();
  });

  it("uses acknowledged Exam-SRS dueAt, not recency suppression, for a later return", () => {
    const cardId = "ch08-003";
    const question = examQuestions.find((item) => item.reviewCardId === cardId)!;
    const first = review(cardId, NOW, { correct: false, rating: "forgot" });
    const acknowledged = createReviewEvent({
      id: "acknowledged-review",
      cardId,
      reviewedAt: new Date(NOW).toISOString(),
      mode: "mcq",
      correct: false,
      rating: "forgot",
      responseTimeMs: 900,
      selectedChoice: 0,
    });
    const recentSession = {
      ...createEmptySuperCramSession(),
      recentQuestionIds: [question.id],
      recentReviewCardIds: [cardId],
    };
    const beforeDue = buildSuperCramCandidates({
      questions: [question],
      cards,
      reviewEvents: [first, acknowledged],
      settings: DEFAULT_APP_SETTINGS,
      nowMs: NOW + 5 * MINUTE_MS,
      session: recentSession,
    });
    expect(beforeDue[0]?.isUrgent).toBe(false);
    expect(
      selectSuperCramQuestion({
        candidates: beforeDue,
        session: recentSession,
        nowMs: NOW + 5 * MINUTE_MS,
      }),
    ).toBeNull();

    const due = buildSuperCramCandidates({
      questions: [question],
      cards,
      reviewEvents: [first, acknowledged],
      settings: DEFAULT_APP_SETTINGS,
      nowMs: NOW + 10 * MINUTE_MS + 1,
      session: recentSession,
    });
    expect(due[0]?.isUrgent).toBe(true);
    expect(
      selectSuperCramQuestion({
        candidates: due,
        session: recentSession,
        nowMs: NOW + 10 * MINUTE_MS + 1,
      })?.question.id,
    ).toBe(question.id);
  });

  it("offers sequential canonical fallbacks without a stale first-card loop", () => {
    const first = cards.find((card) => card.id === "ch01-001")!;
    const second = cards.find((card) => card.id === "ch01-002")!;
    const reviews = [
      review(first.id, NOW, { correct: false, rating: "forgot" }),
      review(second.id, NOW, { correct: false, rating: "forgot" }),
    ];
    const input = {
      cards: [first, second],
      questions: [],
      reviewEvents: reviews,
      settings: DEFAULT_APP_SETTINGS,
      nowMs: NOW + 10 * MINUTE_MS,
    };
    const fallbackA = findUrgentCanonicalFallback(input);
    expect(fallbackA).not.toBeNull();
    const fallbackB = findUrgentCanonicalFallback({
      ...input,
      excludedCardIds: new Set([fallbackA!.id]),
    });
    expect(fallbackB).not.toBeNull();
    expect(fallbackB?.id).not.toBe(fallbackA?.id);
  });

  it("clears fallback suppression when the snapshot acknowledges the review", () => {
    const acknowledgement = { cardId: "ch01-001", reviewCountBefore: 1 } as const;
    expect(isReviewSnapshotStale(1, acknowledgement)).toBe(true);
    expect(isReviewSnapshotStale(2, acknowledgement)).toBe(false);
  });

  it("lets the same fallback return only after its new Exam-SRS dueAt", () => {
    const card = cards.find((item) => item.id === "ch01-001")!;
    const first = review(card.id, NOW, { correct: false, rating: "forgot" });
    const second = createReviewEvent({
      id: "ch01-001-second-failure",
      cardId: card.id,
      reviewedAt: new Date(NOW + 10 * MINUTE_MS).toISOString(),
      mode: "mcq",
      correct: false,
      rating: "forgot",
      responseTimeMs: 900,
      selectedChoice: 0,
    });
    const input = {
      cards: [card],
      questions: [],
      reviewEvents: [first, second],
      settings: DEFAULT_APP_SETTINGS,
    };
    expect(
      findUrgentCanonicalFallback({
        ...input,
        nowMs: NOW + 10 * MINUTE_MS + 1,
      }),
    ).toBeNull();
    expect(
      findUrgentCanonicalFallback({
        ...input,
        nowMs: NOW + 20 * MINUTE_MS + 1,
      })?.id,
    ).toBe(card.id);
  });
});
