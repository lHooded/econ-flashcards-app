import { validateSuperCramRegistry } from "../src/superCram/validate";

const stats = validateSuperCramRegistry();
console.log("Super Cram registry valid");
console.log(
  `Exam skills / cheat-sheet profiles: ${stats.examSkillCount} / ${stats.cheatSheetProfileCount}`,
);
console.log(`Formula families: ${stats.formulaFamilyCount}`);
console.log(`Formula coverage units: ${stats.formulaCoverageUnitCount}`);
console.log(
  `Formula Application questions: ${stats.formulaApplicationQuestionCount} (${stats.newFormulaApplicationQuestionCount} newly authored)`,
);
console.log(`By chapter: ${JSON.stringify(stats.byChapter)}`);
console.log(`Formula Application stimuli: ${stats.stimulusCount}`);
