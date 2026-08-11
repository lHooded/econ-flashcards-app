import rawCardConceptEntries from "../../knowledge/card-concept-map.json";
import type { KnowledgeCardConceptEntry, KnowledgeContentMap } from "./model";

const entries = rawCardConceptEntries as readonly KnowledgeCardConceptEntry[];

export const cardConceptEntries: KnowledgeContentMap["entries"] = Object.freeze(
  entries.map((entry) =>
    Object.freeze({
      cardId: entry.cardId,
      conceptIds: Object.freeze([...entry.conceptIds]),
    }),
  ),
);

export const cardConceptMap: KnowledgeContentMap["cards"] = Object.freeze(
  Object.fromEntries(
    cardConceptEntries.map((entry) => [entry.cardId, entry.conceptIds]),
  ),
) as KnowledgeContentMap["cards"];

/** Production mappings are explicit; an unknown card never receives a fallback. */
export const cardConceptMappingStats = Object.freeze({
  explicitCardMappings: cardConceptEntries.length,
  fallbackMappings: 0,
});

export const knowledgeContentMap: KnowledgeContentMap = Object.freeze({
  cards: cardConceptMap,
  entries: cardConceptEntries,
  fallbackMappings: 0,
});

export function conceptIdsForQuestion(reviewCardId: string): readonly string[] {
  return cardConceptMap[reviewCardId] ?? [];
}
