import rawSources from "../knowledge/sources.json";
import { cards } from "../src/data/deck";
import { knowledgeConcepts } from "../src/knowledge/data";
import { guidedKnowledgeCheckSkills } from "../src/knowledge/guided/checks";
import { validateGuidedKnowledgeChecks } from "../src/knowledge/guided/validate";
import type { KnowledgeSource } from "../src/knowledge/model";

const stats = validateGuidedKnowledgeChecks({
  concepts: knowledgeConcepts,
  cards,
  sources: rawSources as readonly KnowledgeSource[],
  skills: guidedKnowledgeCheckSkills,
});

console.log("Guided learning valid");
console.log(`No-card concepts: ${stats.noCardConcepts}`);
console.log(
  `No-card concepts with checks: ${stats.coveredNoCardConcepts} / ${stats.noCardConcepts}`,
);
console.log(`Check skills: ${stats.skillCount}`);
console.log(`Static variants: ${stats.staticVariants}`);
console.log(`Generated check templates: ${stats.generatedCheckTemplates}`);
console.log(`Generated check fuzz instances: ${stats.generatedFuzzInstances}`);
console.log(`Canonical card collisions: ${stats.canonicalCardCollisions}`);
console.log(`Missing source support: ${stats.missingSourceSupport}`);
