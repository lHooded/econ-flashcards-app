import { describe, expect, it } from "vitest";
import { examQuestions } from "../exam/questionBank";
import {
  formulaApplicationMetaByQuestionId,
  formulaApplicationQuestionIds,
} from "../superCram/formulaFamilies";
import {
  auditFormulaApplicationAnswerKeys,
  FORMULA_APPLICATION_AUDITED_EXPECTED_CHOICES,
} from "../superCram/formulaAudit";

const questionById = new Map(examQuestions.map((question) => [question.id, question]));

function getQuestion(id: string) {
  const question = questionById.get(id);
  if (question === undefined) throw new Error("Missing question " + id);
  return question;
}

describe("Formula Application semantic audit", () => {
  it("audits every curated question against an independent answer-key record", () => {
    expect(auditFormulaApplicationAnswerKeys(examQuestions)).toEqual([]);
    expect(Object.keys(FORMULA_APPLICATION_AUDITED_EXPECTED_CHOICES)).toHaveLength(45);
    expect(formulaApplicationQuestionIds.size).toBe(45);
    expect([...formulaApplicationQuestionIds].sort()).toEqual(
      Object.keys(FORMULA_APPLICATION_AUDITED_EXPECTED_CHOICES).sort(),
    );
  });

  it("keeps the four corrected application items semantically keyed", () => {
    const reversePae = getQuestion("auth-form-ch08-013");
    const pae = 500 + 0.4 * 750;
    const realRate = (pae - 750) / 25;
    expect(realRate).toBe(2);
    expect(reversePae.choices[reversePae.correctChoice]).toBe("2%");

    const realFx = getQuestion("auth-form-ch09-016");
    const q = (0.8 * 110) / 100;
    expect(q).toBeCloseTo(0.88);
    expect(realFx.choices[realFx.correctChoice]).toBe("0.88");

    const fourSector = getQuestion("auth-form-ch05-013");
    const multiplier = 1 / (1 - 0.8 * (1 - 0.25) + 0.1);
    expect(multiplier).toBeCloseTo(2);
    expect(fourSector.choices[fourSector.correctChoice]).toBe("2.00");
    expect(fourSector.explanation).toContain("+ m");

    const capitalTechnology = getQuestion("auth-form-ch10-016");
    const capitalDeepeningOutput = Math.sqrt(121);
    const tfpOutput = 1.1 * Math.sqrt(100);
    expect(capitalDeepeningOutput).toBe(11);
    expect(tfpOutput).toBe(11);
    expect(capitalTechnology.choices[capitalTechnology.correctChoice]).toMatch(
      /A rises from 10 to 11.*B rises from 10 to 11/,
    );
    expect(
      formulaApplicationMetaByQuestionId.get("auth-form-ch10-016")?.operations,
    ).toContain("calculate");
  });

  it("pins the current-course conventions for high-risk formula families", () => {
    const fisher = getQuestion("auth-form-ch03-011");
    const exactFisher = 1.08 / 1.03 - 1;
    expect(exactFisher).toBeCloseTo(0.0485, 4);
    expect(fisher.choices[fisher.correctChoice]).toBe("4.85%");

    const investment = getQuestion("auth-form-ch03-012");
    const userCost = (0.05 + 0.1) * 100;
    expect(userCost).toBeCloseTo(15);
    expect(investment.choices[investment.correctChoice]).toBe("1");

    const gapClosure = getQuestion("auth-form-ch05-015");
    expect(200 / 2.5).toBe(80);
    expect(gapClosure.choices[gapClosure.correctChoice]).toContain("$80");

    const budget = getQuestion("auth-form-ch05-016");
    expect(250 + 50 + 1000 * 0.05 - 200).toBe(150);
    expect(budget.choices[budget.correctChoice]).toBe("$150 million");

    const paePrf = getQuestion("auth-form-ch08-012");
    const rate = 2 + 0.5 * 4;
    const output = (300 - 20 * rate) / (1 - 0.5);
    expect(rate).toBe(4);
    expect(output).toBe(440);
    expect(paePrf.choices[paePrf.correctChoice]).toContain("Y = 440");

    const peg = getQuestion("auth-form-ch09-014");
    expect(180 - 120).toBe(60);
    expect(peg.choices[peg.correctChoice]).toContain("Buy $60 million");

    const bop = getQuestion("auth-ch09-013");
    expect(1000 - 3500 - 1200).toBe(-3700);
    expect(bop.choices[bop.correctChoice]).toBe("-$3,700 million");

    const mpl = getQuestion("auth-form-ch10-013");
    const mpk = getQuestion("auth-form-ch10-014");
    expect(((1 - 0.35) * 1200) / 60).toBe(13);
    expect(mpl.choices[mpl.correctChoice]).toBe("13");
    expect((0.35 * 1200) / 100).toBe(4.2);
    expect(mpk.choices[mpk.correctChoice]).toBe("4.2");

    const growth = getQuestion("auth-stim-ch10-003");
    expect(0.02 + 0.3 * 0.06 + 0.7 * 0.01).toBeCloseTo(0.045);
    expect(growth.choices[growth.correctChoice]).toBe("4.5%");
  });

  it("does not admit formula recognition as Formula Application", () => {
    expect(formulaApplicationQuestionIds.has("auth-ch10-011")).toBe(false);
    expect(getQuestion("auth-ch10-011").style).toBe("concept");
  });
});
