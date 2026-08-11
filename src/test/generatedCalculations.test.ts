import { describe, expect, it } from "vitest";
import { cards } from "../data/deck";
import {
  buildGeneratedCalculationSet,
  generatedCalculationFingerprint,
} from "../calculations/session";
import {
  calculationTemplates,
  getGeneratedCalculationInstance,
} from "../calculations/templates";
import { validateCalculationTemplateRegistry } from "../calculations/validate";

const canonicalCalculationIds = cards
  .filter((card) => card.kind === "calculation")
  .map((card) => card.id);

describe("generated calculation templates", () => {
  it("covers all 26 canonical calculation cards and validates 500 seeds per template", () => {
    const stats = validateCalculationTemplateRegistry(calculationTemplates, 500);
    expect(stats).toMatchObject({
      canonicalCalculationCards: 26,
      enabledCards: 26,
      templateCount: 26,
      generatedTables: 2,
      fuzzSeedsPerTemplate: 500,
    });
    expect(
      new Set(calculationTemplates.map((template) => template.reviewCardId)),
    ).toEqual(new Set(canonicalCalculationIds));
  }, 20_000);

  it("reproduces every instance exactly from template and seed", () => {
    for (const template of calculationTemplates) {
      const first = template.instantiate("same-seed");
      const second = template.instantiate("same-seed");
      expect(second).toEqual(first);
      expect(Object.isFrozen(first)).toBe(true);
      expect(Object.isFrozen(first.answer)).toBe(true);
      expect(Object.isFrozen(first.parameters)).toBe(true);
    }
  });

  it("keeps representative formulas independently correct", () => {
    const inventory = getGeneratedCalculationInstance(
      "generated-inventory-investment",
      "independent-inventory",
    );
    expect(inventory.answer.value).toBe(
      Number(inventory.parameters.ending) - Number(inventory.parameters.beginning),
    );

    const labour = getGeneratedCalculationInstance(
      "generated-labour-statistics",
      "independent-labour",
    );
    expect(labour.answer.value).toBeCloseTo(
      (Number(labour.parameters.unemployed) / Number(labour.parameters.labourForce)) *
        100,
      10,
    );

    const fisher = getGeneratedCalculationInstance(
      "generated-fisher-effect",
      "independent-fisher",
    );
    expect(fisher.answer.value).toBe(
      Number(fisher.parameters.nominal) - Number(fisher.parameters.real),
    );

    const multiplier = getGeneratedCalculationInstance(
      "generated-simple-multiplier",
      "independent-multiplier",
    );
    expect(multiplier.answer.value).toBeCloseTo(
      Number(multiplier.parameters.autonomousChange) /
        (1 - Number(multiplier.parameters.c)),
      10,
    );

    const crossRate = getGeneratedCalculationInstance(
      "generated-cross-rate",
      "independent-cross-rate",
    );
    expect(crossRate.answer.value).toBeCloseTo(
      Number(crossRate.parameters.audUsd) / Number(crossRate.parameters.eurUsd),
      10,
    );

    const tfp = getGeneratedCalculationInstance(
      "generated-tfp-growth",
      "independent-tfp",
    );
    const alpha = Number(tfp.parameters.alpha);
    expect(tfp.answer.value).toBeCloseTo(
      Number(tfp.parameters.outputGrowth) -
        alpha * Number(tfp.parameters.capitalGrowth) -
        (1 - alpha) * Number(tfp.parameters.labourGrowth),
      10,
    );

    for (const [seed, target] of [
      ["seed-0", "intercept"],
      ["seed-4", "rate_coefficient"],
    ] as const) {
      const pae = getGeneratedCalculationInstance("generated-pae-with-real-rate", seed);
      const paeExpected =
        target === "intercept"
          ? Number(pae.parameters.consumptionIntercept) +
            Number(pae.parameters.investmentIntercept)
          : -(
              Number(pae.parameters.consumptionRateCoefficient) +
              Number(pae.parameters.investmentRateCoefficient)
            );
      expect(pae.parameters.target).toBe(target);
      expect(pae.answer.value).toBe(paeExpected);
      expect(pae.answer.unit).toBe(
        target === "intercept"
          ? "currency_millions"
          : "currency_millions_per_percentage_point",
      );
      expect(pae.prompt).not.toContain("calculate PAE");
      expect(pae.prompt).not.toContain("With Y =");
      expect(pae.workedSolution.join(" ")).toContain("PAE =");
    }

    for (const [seed, target] of [
      ["seed-0", "intercept"],
      ["seed-4", "inflation_coefficient"],
    ] as const) {
      const ad = getGeneratedCalculationInstance("generated-ad-substitution", seed);
      const adExpected =
        target === "intercept"
          ? Number(ad.parameters.equilibriumIntercept) -
            Number(ad.parameters.equilibriumRateCoefficient) *
              Number(ad.parameters.policyIntercept)
          : -Number(ad.parameters.equilibriumRateCoefficient) *
            Number(ad.parameters.policyInflationCoefficient);
      expect(ad.parameters.target).toBe(target);
      expect(ad.answer.value).toBeCloseTo(adExpected, 10);
      expect(ad.answer.unit).toBe(
        target === "intercept"
          ? "currency_millions"
          : "currency_millions_per_percentage_point",
      );
      expect(ad.prompt).not.toContain("At π =");
      expect(ad.prompt).not.toContain("calculate equilibrium output");
      expect(ad.workedSolution.join(" ")).toContain("AD equation:");
    }
  });

  it("shows meaningful answer and prompt/stimulus content diversity across 100 seeds", () => {
    for (const template of calculationTemplates) {
      const instances = Array.from({ length: 100 }, (_, index) =>
        template.instantiate(`diversity-${index}`),
      );
      const answers = new Set(instances.map((instance) => instance.answer.value));
      const promptStimulusContent = new Set(
        instances.map((instance) =>
          JSON.stringify({ prompt: instance.prompt, stimulus: instance.stimulus }),
        ),
      );
      expect(answers.size).toBeGreaterThan(1);
      expect(promptStimulusContent.size).toBeGreaterThan(1);
    }
  });

  it("keeps generated economics within template constraints", () => {
    for (const template of calculationTemplates) {
      for (let index = 0; index < 100; index += 1) {
        const instance = template.instantiate(`constraints-${index}`);
        for (const value of Object.values(instance.parameters)) {
          if (typeof value === "number") expect(Number.isFinite(value)).toBe(true);
        }
        if (template.id === "generated-labour-statistics") {
          expect(Number(instance.parameters.labourForce)).toBeGreaterThanOrEqual(
            Number(instance.parameters.employment),
          );
          expect(Number(instance.parameters.unemployed)).toBeGreaterThanOrEqual(0);
        }
        if (template.id === "generated-cross-rate") {
          expect(Number(instance.parameters.audUsd)).toBeGreaterThan(0);
          expect(Number(instance.parameters.eurUsd)).toBeGreaterThan(0);
        }
        if (template.id === "generated-capital-accumulation") {
          expect(Number(instance.parameters.beginningCapital)).toBeGreaterThan(0);
          expect(Number(instance.parameters.endingCapital)).toBeGreaterThan(0);
        }
      }
    }
  });

  it("matches known seed snapshots for major calculation families", () => {
    expect(
      getGeneratedCalculationInstance(
        "generated-inventory-investment",
        "snapshot-inventory",
      ),
    ).toMatchObject({
      parameters: { beginning: 260, ending: 290, change: 30 },
      answer: { value: 30, unit: "units" },
    });
    expect(
      getGeneratedCalculationInstance("generated-real-gdp-fixed-base", "snapshot-gdp"),
    ).toMatchObject({
      parameters: {
        price1: 5,
        quantity1: 120,
        price2: 9,
        quantity2: 90,
        price3: 7,
        quantity3: 140,
      },
      answer: { value: 2390, unit: "currency" },
    });
    expect(
      getGeneratedCalculationInstance("generated-labour-statistics", "snapshot-labour"),
    ).toMatchObject({
      parameters: { population: 2200, participation: 80, employmentRatio: 65 },
      answer: { value: 18.75, unit: "percent" },
    });
    expect(
      getGeneratedCalculationInstance("generated-cross-rate", "snapshot-cross"),
    ).toMatchObject({
      parameters: { audUsd: 0.65, eurUsd: 0.95 },
      answer: { value: 0.6842105263157895, unit: "ratio", decimals: 4 },
    });
    expect(
      getGeneratedCalculationInstance("generated-tfp-growth", "snapshot-growth"),
    ).toMatchObject({
      parameters: { outputGrowth: 2, capitalGrowth: 0.5, labourGrowth: 0, alpha: 0.2 },
      answer: { value: 1.9, unit: "percent", displayUnit: "%" },
    });
    expect(
      getGeneratedCalculationInstance(
        "generated-output-growth-accounting",
        "correction-a",
      ),
    ).toMatchObject({
      parameters: { alpha: 0.2, capitalGrowth: 0, labourGrowth: 5, tfpGrowth: 2 },
      answer: { value: 6, unit: "percent", displayUnit: "%" },
    });
  });
});

describe("generated calculation sessions", () => {
  it.each([5, 10, 20] as const)("builds a requested %d-question set", (size) => {
    const instances = buildGeneratedCalculationSet(calculationTemplates, {
      chapter: null,
      size,
      seed: `session-${size}`,
    });
    expect(instances).toHaveLength(size);
  });

  it("uses unique canonical concepts when enough eligible concepts exist", () => {
    const instances = buildGeneratedCalculationSet(calculationTemplates, {
      chapter: null,
      size: 20,
      seed: "unique-concepts",
    });
    expect(new Set(instances.map((instance) => instance.reviewCardId)).size).toBe(20);
    expect(
      new Set(
        instances.map((instance) =>
          JSON.stringify({ prompt: instance.prompt, stimulus: instance.stimulus }),
        ),
      ).size,
    ).toBe(instances.length);
  });

  it("falls back to fresh variants after exhausting chapter concepts", () => {
    const instances = buildGeneratedCalculationSet(calculationTemplates, {
      chapter: 1,
      size: 20,
      seed: "small-chapter",
    });
    expect(instances).toHaveLength(20);
    expect(new Set(instances.map((instance) => instance.reviewCardId)).size).toBe(2);
    expect(new Set(instances.map(generatedCalculationFingerprint)).size).toBe(20);
  });

  it("fills Chapter 5 size-20 sets with unique content across 100 session seeds", () => {
    for (let seed = 0; seed < 100; seed += 1) {
      const instances = buildGeneratedCalculationSet(calculationTemplates, {
        chapter: 5,
        size: 20,
        seed: `chapter-five-stress-${seed}`,
      });
      expect(instances).toHaveLength(20);
      expect(new Set(instances.map(generatedCalculationFingerprint)).size).toBe(20);
    }
  });

  it("does not offer a misleading Chapter 0 generated set", () => {
    expect(
      buildGeneratedCalculationSet(calculationTemplates, {
        chapter: 0,
        size: 5,
        seed: "chapter-zero",
      }),
    ).toEqual([]);
  });

  it("is deterministic for a session seed and changes for a different seed", () => {
    const options = { chapter: null, size: 10 as const, seed: "same-session" };
    expect(buildGeneratedCalculationSet(calculationTemplates, options)).toEqual(
      buildGeneratedCalculationSet(calculationTemplates, options),
    );
    expect(buildGeneratedCalculationSet(calculationTemplates, options)).not.toEqual(
      buildGeneratedCalculationSet(calculationTemplates, {
        ...options,
        seed: "other-session",
      }),
    );
  });

  it("prefers concepts that were not reviewed most recently", () => {
    const all = buildGeneratedCalculationSet(calculationTemplates, {
      chapter: null,
      size: 5,
      seed: "recent-filter",
    });
    const recent = all.slice(0, 2).map((instance) => instance.reviewCardId);
    const next = buildGeneratedCalculationSet(calculationTemplates, {
      chapter: null,
      size: 5,
      seed: "recent-filter",
      recentReviewCardIds: recent,
    });
    expect(
      next.slice(0, 3).every((instance) => !recent.includes(instance.reviewCardId)),
    ).toBe(true);
  });
});
