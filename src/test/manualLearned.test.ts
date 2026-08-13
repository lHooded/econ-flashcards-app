import { deleteDB } from "idb";
import { describe, expect, it } from "vitest";
import { cards, cardIds } from "../data/deck";
import { examQuestions } from "../exam/questionBank";
import { buildMockExam, MockSelectionError } from "../exam/mock/selector";
import { deriveConceptStatuses, isConceptIntroducedEnough } from "../knowledge/mastery";
import { knowledgeConcepts } from "../knowledge/data";
import { selectGuidedNextStep } from "../knowledge/guided/selector";
import { ProgressRepository } from "../db/progressRepository";
import { openProgressDatabase, type ManualLearnedOverrideRecord } from "../db/database";
import {
  deriveEffectiveManualLearned,
  manualLearnedKey,
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
import { cardConceptMap } from "../knowledge/contentMap";

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
      coveredConceptIds: new Set(),
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
      coveredConceptIds: new Set(),
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
      coveredConceptIds: new Set(["concept-x"]),
      cardIds: new Set(["card-a"]),
      questionIds: new Set(["question-a"]),
    });
  });

  it("keeps production multi-concept cards active until every mapped concept is covered", () => {
    const cardId = "mix-002";
    const mappedConceptIds = cardConceptMap[cardId];
    expect(mappedConceptIds).toEqual(["nominal-gdp", "real-gdp", "nominal", "real"]);
    const makeOverride = (targetId: string): ManualLearnedOverride => ({
      kind: "concept",
      targetId,
      createdAt: "2026-08-13T00:00:00Z",
    });
    const questionIds = examQuestions
      .filter((question) => question.reviewCardId === cardId)
      .map((question) => question.id);

    const oneConcept = deriveEffectiveManualLearned({
      overrides: [makeOverride(mappedConceptIds[0])],
      cards,
      concepts: knowledgeConcepts,
      questions: examQuestions,
      cardConceptIds: cardConceptMap,
    });
    expect(oneConcept.cardIds).not.toContain(cardId);
    expect(
      questionIds.every((questionId) => !oneConcept.questionIds.has(questionId)),
    ).toBe(true);

    const allConcepts = deriveEffectiveManualLearned({
      overrides: mappedConceptIds.map(makeOverride),
      cards,
      concepts: knowledgeConcepts,
      questions: examQuestions,
      cardConceptIds: cardConceptMap,
    });
    expect(allConcepts.cardIds).toContain(cardId);
    expect(
      questionIds.every((questionId) => allConcepts.questionIds.has(questionId)),
    ).toBe(true);

    const restoredOne = deriveEffectiveManualLearned({
      overrides: mappedConceptIds.slice(1).map(makeOverride),
      cards,
      concepts: knowledgeConcepts,
      questions: examQuestions,
      cardConceptIds: cardConceptMap,
    });
    expect(restoredOne.cardIds).not.toContain(cardId);
  });

  it("keeps explicit concepts distinct from concepts covered by a direct card", () => {
    const singletonConcept = knowledgeConcepts.find(
      (concept) => concept.linkedCardIds.length === 1,
    );
    expect(singletonConcept).toBeDefined();
    const cardId = singletonConcept!.linkedCardIds[0];
    const resolved = deriveEffectiveManualLearned({
      overrides: [
        {
          kind: "card",
          targetId: cardId,
          createdAt: "2026-08-13T00:00:00Z",
        },
      ],
      cards,
      concepts: knowledgeConcepts,
      questions: examQuestions,
      cardConceptIds: cardConceptMap,
    });
    expect(resolved.conceptIds).not.toContain(singletonConcept!.id);
    expect(resolved.coveredConceptIds).toContain(singletonConcept!.id);
  });

  it("feeds the conservative card set into normal Study and its future-date path", () => {
    const card = cards.find((candidate) => candidate.id === "mix-002");
    expect(card).toBeDefined();
    const mappedConceptIds = cardConceptMap["mix-002"] ?? [];
    const oneConcept = deriveEffectiveManualLearned({
      overrides: [
        {
          kind: "concept",
          targetId: mappedConceptIds[0],
          createdAt: "2026-08-13T00:00:00Z",
        },
      ],
      cards,
      concepts: knowledgeConcepts,
      questions: examQuestions,
      cardConceptIds: cardConceptMap,
    });
    const active = selectNextCard({
      cards: [card!],
      reviews: [],
      settings: NO_EXAM,
      nowMs: NOW,
      manuallyLearnedCardIds: oneConcept.cardIds,
      studyAhead: true,
    });
    expect(active.selection?.card.id).toBe("mix-002");

    const allConcepts = deriveEffectiveManualLearned({
      overrides: mappedConceptIds.map((targetId) => ({
        kind: "concept" as const,
        targetId,
        createdAt: "2026-08-13T00:00:00Z",
      })),
      cards,
      concepts: knowledgeConcepts,
      questions: examQuestions,
      cardConceptIds: cardConceptMap,
    });
    const excluded = selectNextCard({
      cards: [card!],
      reviews: [],
      settings: NO_EXAM,
      nowMs: NOW,
      manuallyLearnedCardIds: allConcepts.cardIds,
      studyAhead: true,
    });
    expect(excluded.selection).toBeNull();
  });

  it("keeps direct card, concept, and question sources independent", () => {
    const cardId = "ch01-019";
    const question = examQuestions.find(
      (candidate) => candidate.reviewCardId === cardId,
    );
    expect(question).toBeDefined();
    const conceptIds = cardConceptMap[cardId];
    expect(conceptIds).toEqual(["inflation", "price-level", "percentage-change"]);
    const source = (kind: ManualLearnedOverride["kind"], targetId: string) => ({
      kind,
      targetId,
      createdAt: "2026-08-13T00:00:00Z",
    });

    const directCard = deriveEffectiveManualLearned({
      overrides: [source("card", cardId)],
      cards,
      concepts: knowledgeConcepts,
      questions: examQuestions,
      cardConceptIds: cardConceptMap,
    });
    expect(directCard.cardIds).toContain(cardId);
    expect(directCard.questionIds).toContain(question!.id);

    const directQuestion = deriveEffectiveManualLearned({
      overrides: [source("question", question!.id)],
      cards,
      concepts: knowledgeConcepts,
      questions: examQuestions,
      cardConceptIds: cardConceptMap,
    });
    expect(directQuestion.cardIds).not.toContain(cardId);
    expect(directQuestion.questionIds).toEqual(new Set([question!.id]));

    const twoConceptsAndQuestion = deriveEffectiveManualLearned({
      overrides: [
        source("concept", conceptIds[0]),
        source("concept", conceptIds[1]),
        source("question", question!.id),
      ],
      cards,
      concepts: knowledgeConcepts,
      questions: examQuestions,
      cardConceptIds: cardConceptMap,
    });
    expect(twoConceptsAndQuestion.cardIds).not.toContain(cardId);
    expect(twoConceptsAndQuestion.questionIds).toEqual(new Set([question!.id]));
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
    expect(withBoth.cardIds).toEqual(new Set(["card-a"]));

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
      evidenceLearned: 0,
      manuallyLearned: 1,
      manuallyLearnedOnly: 1,
      coveragePercent: 100,
    });
  });

  it("does not double-count a manually excluded card with prior evidence", () => {
    const reviews: ReviewEvent[] = [
      {
        id: "manual-provenance-a",
        cardId: card.id,
        reviewedAt: "2026-08-10T00:00:00.000Z",
        mode: "recall",
        correct: true,
        rating: "got_it",
        responseTimeMs: null,
        selectedChoice: null,
      },
      {
        id: "manual-provenance-b",
        cardId: card.id,
        reviewedAt: "2026-08-11T00:00:00.000Z",
        mode: "recall",
        correct: true,
        rating: "got_it",
        responseTimeMs: null,
        selectedChoice: null,
      },
    ];
    const evidenceScheduler = deriveExamSrsSnapshot([card], reviews, NO_EXAM, NOW);
    const manualScheduler = deriveExamSrsSnapshot(
      [card],
      reviews,
      NO_EXAM,
      NOW,
      new Set([card.id]),
    );
    const summary = summarizeExamSrs([card], manualScheduler, {}, evidenceScheduler);
    expect(summary).toMatchObject({
      learned: 1,
      evidenceLearned: 1,
      manuallyLearned: 1,
      manuallyLearnedOnly: 0,
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
    expect(
      step.kind === "lesson"
        ? step.conceptId
        : step.kind === "knowledge-check"
          ? step.skill.conceptId
          : null,
    ).not.toBe(concept!.id);
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

  it("round-trips V3 overrides and migrates V1/V2 backups safely", () => {
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
    expect(backup.version).toBe(3);
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

    const ordinaryV2: Record<string, unknown> = {
      ...backup,
      version: 2,
      manualLearnedOverrides: undefined,
    };
    expect(
      parseProgressBackupText(JSON.stringify(ordinaryV2), cardIds)
        .manualLearnedOverrides,
    ).toEqual([]);
    const transitionalV2: Record<string, unknown> = {
      ...ordinaryV2,
      manualLearnedOverrides: [override],
    };
    expect(
      parseProgressBackupText(JSON.stringify(transitionalV2), cardIds)
        .manualLearnedOverrides,
    ).toEqual([override]);
    expect(
      parseProgressBackupText(
        JSON.stringify({
          format: "econ-flashcards-progress",
          version: 1,
          exportedAt: "2026-08-12T00:00:00.000Z",
          settings: NO_EXAM,
          cardStates: [],
          reviews: [],
        }),
        cardIds,
      ).manualLearnedOverrides,
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
        { kind: "garbage", targetId: cards[0].id, createdAt: "2026-08-12T00:00:00Z" },
      ]),
    ).toThrow(/invalid kind/);
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

  it("ignores malformed local rows but retains harmless orphan records", async () => {
    const databaseName = `manual-learned-validation-${Date.now()}-${Math.random()}`;
    const repository = new ProgressRepository(cardIds, databaseName);
    try {
      await repository.resetAll();
      const database = await openProgressDatabase(databaseName);
      const transaction = database.transaction("manualLearnedOverrides", "readwrite");
      const rows: readonly Record<string, unknown>[] = [
        {
          key: manualLearnedKey("card", cards[0].id),
          kind: "card",
          targetId: cards[0].id,
          createdAt: "2026-08-13T00:00:00Z",
        },
        {
          key: "garbage:some-concept",
          kind: "garbage",
          targetId: "some-concept",
          createdAt: "2026-08-13T00:00:00Z",
        },
        {
          key: manualLearnedKey("card", cards[1].id),
          kind: "card",
          targetId: cards[1].id,
          createdAt: "not-a-date",
        },
        {
          key: "card:wrong-key",
          kind: "card",
          targetId: cards[2].id,
          createdAt: "2026-08-13T00:00:00Z",
        },
        {
          key: manualLearnedKey("card", "removed-by-future-deck"),
          kind: "card",
          targetId: "removed-by-future-deck",
          createdAt: "2026-08-13T00:00:00Z",
        },
      ];
      for (const row of rows) {
        transaction.store.put(row as unknown as ManualLearnedOverrideRecord);
      }
      await transaction.done;
      database.close();

      const loaded = await repository.load();
      expect(loaded.manualLearnedOverrides).toEqual([
        {
          kind: "card",
          targetId: cards[0].id,
          createdAt: "2026-08-13T00:00:00Z",
        },
        {
          kind: "card",
          targetId: "removed-by-future-deck",
          createdAt: "2026-08-13T00:00:00Z",
        },
      ]);
      expect(
        deriveEffectiveManualLearned({
          overrides: loaded.manualLearnedOverrides,
          cards,
          concepts: knowledgeConcepts,
          questions: examQuestions,
          cardConceptIds: cardConceptMap,
        }).cardIds,
      ).toEqual(new Set([cards[0].id]));
    } finally {
      await repository.close();
      await deleteDB(databaseName);
    }
  });
});
