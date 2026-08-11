import { cards } from "../data/deck";
import { examQuestions } from "../exam/questionBank";
import { courseRecordsA } from "./courseRecordsA";
import { courseRecordsB } from "./courseRecordsB";
import { courseRecordsC } from "./courseRecordsC";
import { courseRecordsD } from "./courseRecordsD";
import { cardConceptMap } from "./contentMap";
import { foundationRecords } from "./foundationRecords";
import type { KnowledgeConcept } from "./model";
import { freezeConceptRecords } from "./records";

const records = freezeConceptRecords([
  ...foundationRecords,
  ...courseRecordsA,
  ...courseRecordsB,
  ...courseRecordsC,
  ...courseRecordsD,
]);

const cardIdsByConcept = new Map<string, string[]>();
for (const card of cards) {
  for (const conceptId of cardConceptMap[card.id] ?? []) {
    const linked = cardIdsByConcept.get(conceptId) ?? [];
    linked.push(card.id);
    cardIdsByConcept.set(conceptId, linked);
  }
}

const questionIdsByConcept = new Map<string, string[]>();
for (const question of examQuestions) {
  for (const conceptId of cardConceptMap[question.reviewCardId] ?? []) {
    const linked = questionIdsByConcept.get(conceptId) ?? [];
    linked.push(question.id);
    questionIdsByConcept.set(conceptId, linked);
  }
}

export const knowledgeConcepts: readonly KnowledgeConcept[] = Object.freeze(
  records.map((record) =>
    Object.freeze({
      ...record,
      linkedCardIds: Object.freeze(cardIdsByConcept.get(record.id) ?? []),
      linkedQuestionIds: Object.freeze(questionIdsByConcept.get(record.id) ?? []),
    }),
  ),
);

export const knowledgeConceptById: ReadonlyMap<string, KnowledgeConcept> = new Map(
  knowledgeConcepts.map((concept) => [concept.id, concept]),
);

export const knowledgeConceptIds: ReadonlySet<string> = new Set(
  knowledgeConcepts.map((concept) => concept.id),
);
