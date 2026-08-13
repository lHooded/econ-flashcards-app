import { deleteDB } from "idb";
import { describe, expect, it } from "vitest";
import { cards, cardIds } from "../data/deck";
import { examQuestions } from "../exam/questionBank";
import { buildMockExam, MockSelectionError } from "../exam/mock/selector";
import { deriveConceptStatuses, isConceptIntroducedEnough } from "../knowledge/mastery";
import { knowledgeConcepts } from "../knowledge/data";
import { selectGuidedNextStep } from "../knowledge/guided/selector";
import { ProgressRepository } from "../db/progressRepository";
import {
  deriveEffectiveManualLearned,
  type ManualLearnedOverride,
} from "../domain/manualLearned";
import {
  createProgressBackup,
  parseProgressBackupText,
  serializeProgressBackup,
} from "../domain/backup";
import type { ReviewEvent } from "../domain/progress";
import { buildPracticeSet } from "../practice/selector";
import { selectScopedNextCard } from "../study/scopedSelector";
import { deriveExamSrsSnapshot } from "../study/examSrs/deriveState";
import { selectNextCard } from "../study/examSrs/selector";
import { summarizeExamSrs } from "../study/examSrs/summary";

const NOW = Date.parse("2026-08-13T00:00:00.000Z");
const NO_EXAM = { examAt: null, studyBufferHours: 24 } as const;

describe("manual learned resolver", () => {
  const content = {
    cards: [{ id: "card-a" }, { id: "card-b" }, { id: "card-c" }],
    concepts: [
      {
        id: "concept-x",
        linkedCardIds: ["card-a", "card-b"],
        linkedQuestionIds: ["question-a", "question-b"],
      },
      {
        id: "concept-y",
        linkedCardIds: ["card-b"],
        linkedQuestionIds: ["question-b"],
      },
    ],
    questions: [
      { id: "question-a", reviewCardId: "card-a" },
      { id: "question-b", reviewCardId: "card-b" },
      { id: "question-source-only", reviewCardId: "card-c" },
    ],
  };

  it("keeps empty, direct, and expanded source semantics distinct", () => {
    expect(deriveEffectiveManualLearned({ overrides: [], ...content })).toEqual({
      conceptIds: new Set(),
      cardIds: new Set(),
      questionIds: new Set(),
    });

    expect(
      deriveEffectiveManualLearned({
        overrides: [
          { kind: "card", targetId: "card-a", createdAt: "2026-08-13T00:00:00Z" },
          {
            kind: "question",
            targetId: "question-source-only",
            createdAt: "2026-08-13T00:01:00Z",
          },
        ],
        ...content,
      }),
    ).toEqual({
      conceptIds: new Set(),
      cardIds: new Set(["card-a"]),
      questionIds: new Set(["question-a", "question-source-only"]),
    });

    expect(
      deriveEffectiveManualLearned({
        overrides: [
          { kind: "concept", targetId: "concept-x", createdAt: "2026-08-13T00:00:00Z" },
        ],
        ...content,
      }),
    ).toEqual({
      conceptIds: new Set(["concept-x"]),
      cardIds: new Set(["card-a", "card-b"]),
      questionIds: new Set(["question-a", "question-b"]),
    });
  });

  it("composes overlapping sources and restores only the removed source", () => {
    const concept = {
      kind: "concept" as const,
      targetId: "concept-x",
      createdAt: "2026-08-13T00:00:00Z",
    };
    const card = {
      kind: "card" as const,
      targetId: "card-a",
      createdAt: "2026-08-13T00:01:00Z",
    };
    const withBoth = deriveEffectiveManualLearned({
      overrides: [concept, card],
      ...content,
    });
    expect(withBoth.cardIds).toEqual(new Set(["card-a", "card-b"]));

    const afterConceptRestore = deriveEffectiveManualLearned({
      overrides: [card],
      ...content,
    });
    expect(afterConceptRestore.cardIds).toEqual(new Set(["card-a"]));
    expect(afterConceptRestore.questionIds).toEqual(new Set(["question-a"]));
  });
});

describe("manual learned Exam-SRS contract", () => {
  const card = cards[0];

  it("makes an unseen card operationally learned without adding evidence", () => {
    const snapshot = deriveExamSrsSnapshot(
      [card],
      [],
      NO_EXAM,
      NOW,
      new Set([card.id]),
    );
    expect(snapshot.stateByCardId[card.id]).toMatchObject({
      learningState: "learned",
      reviewCount: 0,
      strength: 0,
      dueAt: null,
      isDue: false,
      isManuallyLearned: true,
    });
  });

  it("keeps prior failure evidence and restores it after exclusion", () => {
    const failure: ReviewEvent = {
      id: "manual-history-failure",
      cardId: card.id,
      reviewedAt: "2026-08-12T00:00:00.000Z",
      mode: "recall",
      correct: false,
      rating: "forgot",
      responseTimeMs: null,
      selectedChoice: null,
    };
    const manuallyLearned = deriveExamSrsSnapshot(
      [card],
      [failure],
      NO_EXAM,
      NOW,
      new Set([card.id]),
    ).stateByCardId[card.id];
    const restored = deriveExamSrsSnapshot([card], [failure], NO_EXAM, NOW)
      .stateByCardId[card.id];

    expect(manuallyLearned).toMatchObject({
      learningState: "learned",
      reviewCount: 1,
      lastOutcome: "failure",
      dueAt: null,
      isDue: false,
      isManuallyLearned: true,
    });
    expect(restored).toMatchObject({
      learningState: "relearning",
      reviewCount: 1,
      lastOutcome: "failure",
    });
  });

  it("never selects an overridden card, including Study Ahead", () => {
    const selection = selectNextCard({
      cards: [card],
      reviews: [],
      settings: NO_EXAM,
      nowMs: NOW,
      studyAhead: true,
      manuallyLearnedCardIds: new Set([card.id]),
    });
    expect(selection.selection).toBeNull();
    expect(selection.nextDueAt).toBeNull();
  });

  it("keeps every ordinary Study focus from selecting an overridden card", () => {
    const focusCards = [
      { preset: "smart" as const, card },
      { preset: "needs_work" as const, card },
      { preset: "new" as const, card },
      { preset: "due" as const, card },
      {
        preset: "calculations" as const,
        card: cards.find((candidate) => candidate.kind === "calculation")!,
      },
      {
        preset: "mcq" as const,
        card: cards.find((candidate) => candidate.choices !== undefined)!,
      },
      {
        preset: "high_yield" as const,
        card: cards.find((candidate) => candidate.tags.includes("high-yield"))!,
      },
    ];

    for (const focus of focusCards) {
      const scheduler = deriveExamSrsSnapshot(
        [focus.card],
        [],
        NO_EXAM,
        NOW,
        new Set([focus.card.id]),
      );
      const selection = selectScopedNextCard({
        cards: [focus.card],
        scheduler,
        scope: { preset: focus.preset, chapter: null },
        nowMs: NOW,
      });
      expect(selection.selection, focus.preset).toBeNull();
    }
  });

  it("counts manual cards toward the unchanged summary denominator", () => {
    const scheduler = deriveExamSrsSnapshot(
      [card],
      [],
      NO_EXAM,
      NOW,
      new Set([card.id]),
    );
    const summary = summarizeExamSrs([card], scheduler, {});
    expect(summary).toMatchObject({
      total: 1,
      seen: 1,
      learned: 1,
      manuallyLearned: 1,
      coveragePercent: 100,
    });
  });
});

describe("manual learned knowledge, practice, and mock boundaries", () => {
  it("marks an explicitly overridden concept solid while keeping content available", () => {
    const concept = knowledgeConcepts.find(
      (candidate) => candidate.linkedCardIds.length > 0,
    );
    expect(concept).toBeDefined();
    const status = deriveConceptStatuses(
      { stateByCardId: {} },
      [concept!],
      {},
      new Set([concept!.id]),
    ).get(concept!.id);
    expect(status).toBe("solid");
    expect(knowledgeConcepts).toContain(concept);
  });

  it("only treats a direct card override as concept coverage when all linked cards are covered", () => {
    expect(
      isConceptIntroducedEnough("graph-axis", [], new Set(), new Set(["ch04-015"])),
    ).toBe(true);
    expect(
      isConceptIntroducedEnough("growth-rate", [], new Set(), new Set(["ch04-015"])),
    ).toBe(false);
  });

  it("skips a manually learned concept in Guided Cram instead of teaching it", () => {
    const concept = knowledgeConcepts.find(
      (candidate) => candidate.linkedCardIds.length > 0,
    );
    expect(concept).toBeDefined();
    const manual = deriveEffectiveManualLearned({
      overrides: [
        { kind: "concept", targetId: concept!.id, createdAt: "2026-08-13T00:00:00Z" },
      ],
      cards,
      concepts: knowledgeConcepts,
      questions: examQuestions,
    });
    const step = selectGuidedNextStep({
      cards,
      reviews: [],
      settings: NO_EXAM,
      nowMs: NOW,
      candidateCardIds: new Set(concept!.linkedCardIds),
      manualLearned: manual,
    });
    expect(step.kind).toBe("idle");
  });

  it("filters direct questions without filtering a sibling question on the same card", () => {
    const questionA = examQuestions[0];
    const sibling = { ...questionA, id: `${questionA.id}-sibling` };
    const set = buildPracticeSet([questionA, sibling], {
      chapter: null,
      style: "all",
      stimulus: "all",
      size: 5,
      seed: "manual-question",
      excludedQuestionIds: new Set([questionA.id]),
    });
    expect(set.map((question) => question.id)).toEqual([sibling.id]);
  });

  it("filters new mocks and fails clearly when a blueprint quota is impossible", () => {
    const first = examQuestions[0];
    const build = buildMockExam({
      bank: examQuestions,
      seed: "manual-mock",
      excludedQuestionIds: new Set([first.id]),
    });
    expect(build.questionOrder).not.toContain(first.id);

    const chapterOneCardIds = new Set(
      examQuestions
        .filter((question) => question.chapter === 1)
        .map((question) => question.reviewCardId),
    );
    expect(() =>
      buildMockExam({
        bank: examQuestions,
        seed: "manual-impossible-mock",
        excludedReviewCardIds: chapterOneCardIds,
      }),
    ).toThrow(MockSelectionError);
  });
});

describe("manual learned persistence and backups", () => {
  it("is idempotent, survives reload, restores, and does not touch reviews", async () => {
    const databaseName = `manual-learned-${Date.now()}-${Math.random()}`;
    const repository = new ProgressRepository(cardIds, databaseName);
    try {
      await repository.resetAll();
      await repository.recordReview({
        id: "manual-persistence-review",
        cardId: cards[0].id,
        reviewedAt: "2026-08-12T00:00:00.000Z",
        mode: "recall",
        correct: true,
        rating: "got_it",
        responseTimeMs: null,
        selectedChoice: null,
      });
      const first = await repository.markLearnedPermanently("card", cards[0].id);
      const second = await repository.markLearnedPermanently("card", cards[0].id);
      expect(second).toEqual(first);
      const reloaded = await repository.load();
      expect(reloaded.manualLearnedOverrides).toHaveLength(1);
      expect(reloaded.reviews).toHaveLength(1);

      await repository.restoreManualLearned("card", cards[0].id);
      expect((await repository.load()).manualLearnedOverrides).toEqual([]);
      expect((await repository.load()).reviews).toHaveLength(1);

      const replacementOverride: ManualLearnedOverride = {
        kind: "card",
        targetId: cards[0].id,
        createdAt: "2026-08-13T00:00:00.000Z",
      };
      await repository.replaceAll(
        createProgressBackup({
          settings: NO_EXAM,
          cardStates: {},
          reviewEvents: [],
          manualLearnedOverrides: [replacementOverride],
        }),
      );
      expect((await repository.load()).manualLearnedOverrides).toEqual([
        replacementOverride,
      ]);

      await repository.resetAll();
      expect((await repository.load()).manualLearnedOverrides).toEqual([]);
    } finally {
      await repository.close();
      await deleteDB(databaseName);
    }
  });

  it("round-trips overrides and migrates old backups with an empty set", () => {
    const override: ManualLearnedOverride = {
      kind: "card",
      targetId: cards[0].id,
      createdAt: "2026-08-12T00:00:00.000Z",
    };
    const backup = createProgressBackup({
      settings: NO_EXAM,
      cardStates: {},
      reviewEvents: [],
      manualLearnedOverrides: [override],
    });
    const parsed = parseProgressBackupText(
      serializeProgressBackup({
        settings: NO_EXAM,
        cardStates: {},
        reviewEvents: [],
        manualLearnedOverrides: [override],
      }),
      cardIds,
    );
    expect(parsed.manualLearnedOverrides).toEqual([override]);

    const legacy = { ...backup };
    delete (legacy as { manualLearnedOverrides?: readonly ManualLearnedOverride[] })
      .manualLearnedOverrides;
    expect(
      parseProgressBackupText(JSON.stringify(legacy), cardIds).manualLearnedOverrides,
    ).toEqual([]);
  });

  it("rejects malformed, duplicate, and unknown override records before replacement", () => {
    const base = createProgressBackup({
      settings: NO_EXAM,
      cardStates: {},
      reviewEvents: [],
    });
    const invalid = (manualLearnedOverrides: unknown[]) =>
      parseProgressBackupText(
        JSON.stringify({ ...base, manualLearnedOverrides }),
        cardIds,
      );
    expect(() => invalid([{ kind: "card", targetId: cards[0].id }])).toThrow(
      /createdAt/,
    );
    expect(() =>
      invalid([
        {
          kind: "card",
          targetId: cards[0].id,
          createdAt: "2026-08-12T00:00:00Z",
        },
        {
          kind: "card",
          targetId: cards[0].id,
          createdAt: "2026-08-12T00:01:00Z",
        },
      ]),
    ).toThrow(/Duplicate/);
    expect(() =>
      invalid([
        {
          kind: "question",
          targetId: "not-a-question",
          createdAt: "2026-08-12T00:00:00Z",
        },
      ]),
    ).toThrow(/Unknown question/);
  });
});
