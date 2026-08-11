import { calculationTemplates } from "../src/calculations/templates";
import { generatedCalculationFingerprint } from "../src/calculations/session";
import { validateCalculationTemplateRegistry } from "../src/calculations/validate";

const stats = validateCalculationTemplateRegistry(calculationTemplates, 500);
console.log("Generated calculation templates valid");
console.log(`Canonical calculation cards: ${stats.canonicalCalculationCards}`);
console.log(`Generated-enabled cards: ${stats.enabledCards}`);
console.log(`Templates: ${stats.templateCount}`);
console.log(`Generated table templates: ${stats.generatedTables}`);
console.log(
  `Fuzz instances validated: ${stats.templateCount * stats.fuzzSeedsPerTemplate}`,
);
console.log("Answer-diversity sample (100 seeds per template):");

for (const template of calculationTemplates) {
  const instances = Array.from({ length: 100 }, (_, index) =>
    template.instantiate(`calculation-diversity-${index}`),
  );
  const answers = instances.map((instance) => instance.answer.value);
  const distinctAnswers = new Set(answers.map((value) => String(value))).size;
  const distinctContent = new Set(instances.map(generatedCalculationFingerprint)).size;
  const positive = answers.filter((value) => value > 0).length;
  const negative = answers.filter((value) => value < 0).length;
  const zero = answers.filter((value) => value === 0).length;
  console.log(
    `- ${template.id}: answers ${distinctAnswers}, prompt/stimulus content ${distinctContent}, range ${Math.min(...answers)}..${Math.max(...answers)}, signs +${positive}/−${negative}/0${zero}`,
  );
}
