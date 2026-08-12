import { examYieldBlueprint } from "../src/examYield/blueprint";
import { validateExamYieldBlueprint } from "../src/examYield/validate";

const stats = validateExamYieldBlueprint({
  sources: examYieldBlueprint.sources,
  skills: examYieldBlueprint.skills,
});

console.log("Exam-yield blueprint valid");
console.log(`Evidence sources: ${stats.sourceCount}`);
console.log(`Skills: ${stats.skillCount}`);
console.log(`Critical skills: ${stats.criticalCount}`);
console.log(`Very-high skills: ${stats.veryHighCount}`);
console.log(`Core skills: ${stats.coreCount}`);
console.log(`Support skills: ${stats.supportCount}`);
console.log(`Mapped concepts: ${stats.mappedConcepts} / ${stats.totalConcepts}`);
console.log(`Mapped canonical cards: ${stats.mappedCards} / ${stats.totalCards}`);
console.log(
  `Mapped exam questions: ${stats.mappedQuestions} / ${stats.totalQuestions}`,
);
console.log(
  `Critical skills with retrieval evidence: ${stats.criticalWithRetrieval} / ${stats.criticalCount}`,
);
console.log(
  `Critical skills without retrieval evidence: ${stats.criticalWithoutRetrieval}`,
);
