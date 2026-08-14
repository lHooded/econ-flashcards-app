import { cards } from "../src/data/deck";
import { createReviewEvent } from "../src/domain/progress";
import { examQuestions } from "../src/exam/questionBank";
import {
  applySuperCramAnswer,
  buildSuperCramCandidates,
  createEmptySuperCramSession,
  selectSuperCramQuestion,
  summarizeSuperCramSelection,
} from "../src/superCram/selector";

const nowMs = Date.parse("2026-08-14T12:00:00.000Z");
const settings = { examAt: null, studyBufferHours: 24 } as const;

function simulate(reviewEvents: readonly ReturnType<typeof createReviewEvent>[]) {
  let session = createEmptySuperCramSession();
  const selected = [];
  for (let index = 0; index < 30; index += 1) {
    const candidates = buildSuperCramCandidates({
      questions: examQuestions,
      cards,
      reviewEvents,
      settings,
      nowMs,
      session,
    });
    const next = selectSuperCramQuestion({ candidates, session, nowMs });
    if (next === null) break;
    selected.push(next);
    session = applySuperCramAnswer(session, next, true);
  }
  return summarizeSuperCramSelection(selected);
}

const weakCardId = "ch10-031";
const weakReview = createReviewEvent({
  id: "simulation-weak-mpk-mpl",
  cardId: weakCardId,
  reviewedAt: new Date(nowMs - 11 * 60 * 1000).toISOString(),
  mode: "mcq",
  correct: false,
  rating: null,
  responseTimeMs: 1_200,
  selectedChoice: 0,
});

console.log("Super Cram deterministic audit");
console.log(`Empty/new learner: ${JSON.stringify(simulate([]))}`);
console.log(
  `Weak learner (failed ${weakCardId}): ${JSON.stringify(simulate([weakReview]))}`,
);
