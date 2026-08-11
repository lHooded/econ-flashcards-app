import rawSources from "../knowledge/sources.json";
import { cards } from "../src/data/deck";
import { examQuestions } from "../src/exam/questionBank";
import { cardConceptMap } from "../src/knowledge/contentMap";
import { knowledgeConcepts } from "../src/knowledge/data";
import type { KnowledgeSource } from "../src/knowledge/model";
import { validateKnowledgeGraph } from "../src/knowledge/validate";

const stats = validateKnowledgeGraph({
  concepts: knowledgeConcepts,
  cards,
  questions: examQuestions,
  cardConceptMap,
  sources: rawSources as readonly KnowledgeSource[],
});

console.log("Knowledge graph valid");
console.log(`Concepts: ${stats.conceptCount}`);
console.log(`Prerequisite edges: ${stats.prerequisiteEdgeCount}`);
console.log(`Related edges: ${stats.relatedEdgeCount}`);
console.log(`Roots: ${stats.rootCount}`);
console.log(`Foundation concepts: ${stats.foundationCount}`);
console.log(`Maximum prerequisite depth: ${stats.maximumPrerequisiteDepth}`);
console.log(`Cards mapped: ${stats.cardsMapped} / ${stats.totalCards}`);
console.log(
  `Exam questions mapped: ${stats.questionsMapped} / ${stats.totalQuestions}`,
);
console.log(`Concepts with lecture source: ${stats.conceptsWithLectureSource}`);
console.log(`Concepts with textbook source: ${stats.conceptsWithTextbookSource}`);
console.log(`Concepts without source support: ${stats.conceptsWithoutSources}`);
console.log(`Ambiguous inline aliases: ${stats.ambiguousInlineAliases}`);
console.log(`Cycles: ${stats.cycles}`);
console.log(
  `Chapter coverage: ${Object.entries(stats.chapterCoverage)
    .sort(([left], [right]) => Number(left) - Number(right))
    .map(([chapter, count]) => `${chapter}:${count}`)
    .join(" ")}`,
);
