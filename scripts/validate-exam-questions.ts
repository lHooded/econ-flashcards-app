import {
  examQuestionStats,
  examQuestionValidationWarnings,
} from "../src/exam/questionBank";

const { byChapter, byDifficulty, byPosition, byStyle } = examQuestionStats;

console.log("Exam question bank valid");
console.log(`Total: ${examQuestionStats.total}`);
console.log(`Canonical MCQ: ${examQuestionStats.canonical}`);
console.log(`New authored: ${examQuestionStats.authored}`);
for (let chapter = 0; chapter <= 10; chapter += 1) {
  const label = chapter === 0 ? "Mixed" : `Chapter ${chapter}`;
  console.log(`${label}: ${byChapter[String(chapter)]}`);
}
console.log(
  `Styles: concept ${byStyle.concept} / scenario ${byStyle.scenario} / calculation ${byStyle.calculation} / model ${byStyle.model_discrimination} / sequence ${byStyle.sequence}`,
);
console.log(
  `Difficulty: 1 ${byDifficulty[1]} / 2 ${byDifficulty[2]} / 3 ${byDifficulty[3]}`,
);
console.log(
  `Correct positions: A ${byPosition.A} / B ${byPosition.B} / C ${byPosition.C} / D ${byPosition.D}`,
);
console.log(`Calculation questions: ${examQuestionStats.calculationCount}`);
console.log(`Unique reviewCardId: ${examQuestionStats.uniqueReviewCardIds}`);

if (examQuestionValidationWarnings.length === 0) {
  console.log("Warnings: none");
} else {
  console.log(`Warnings: ${examQuestionValidationWarnings.length}`);
  for (const warning of examQuestionValidationWarnings) console.log(`- ${warning}`);
}
