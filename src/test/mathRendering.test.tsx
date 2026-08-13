import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { StudyCard } from "../components/StudyCard";
import { GeneratedCalculation } from "../components/calculations/GeneratedCalculation";
import { ConceptArticle } from "../components/knowledge/KnowledgeSheet";
import { KnowledgeText } from "../components/knowledge/KnowledgeText";
import { GuidedKnowledgeCheck } from "../components/knowledge/guided/GuidedKnowledgeCheck";
import { MockQuestion } from "../components/mock/MockQuestion";
import { MathExpression } from "../components/math/MathExpression";
import { MathText } from "../components/math/MathText";
import {
  validateFreeMathContent,
  validateStructuredVariableSymbol,
} from "../math/contentValidation";
import { validateMathText } from "../math/markup";
import { cards } from "../data/deck";
import { examQuestions } from "../exam/questionBank";
import { KnowledgeProvider } from "../knowledge/KnowledgeProvider";
import { knowledgeConcepts } from "../knowledge/data";
import { guidedKnowledgeCheckSkills } from "../knowledge/guided/checks";
import { getGeneratedCalculationInstance } from "../calculations/templates";

describe("math rendering", () => {
  it("keeps plain prose unchanged and renders inline/display fragments", () => {
    const { container } = render(
      <MathText
        text={String.raw`Plain prose. The identity is \(Y=C+I\), followed by \(NX=X-M\).\n\[Y=AK^\alpha L^{1-\alpha}\]`}
      />,
    );

    expect(container.querySelector(".math-prose")?.textContent).toContain(
      "Plain prose. The identity is",
    );
    expect(container.querySelectorAll(".math-inline .katex")).toHaveLength(2);
    expect(container.querySelector(".math-display .katex-display")).toBeInTheDocument();
    expect(container.querySelector(".katex-mathml")).toBeInTheDocument();
    expect(container.querySelector(".math-text-fallback")).not.toBeInTheDocument();
  });

  it("falls back locally when a formula is malformed instead of throwing", () => {
    const { container } = render(
      <MathText text={String.raw`Broken formula: \(\frac{1}\)`} />,
    );

    expect(container.querySelector(".math-expression-fallback")).toBeInTheDocument();
    expect(container.querySelector(".math-text-fallback")).not.toBeInTheDocument();
  });

  it("rejects malformed committed math during validation", () => {
    expect(() =>
      validateMathText(String.raw`Broken \(\frac{1}\)`, "test.content"),
    ).toThrow(/not valid KaTeX/);
    expect(() => validateMathText(String.raw`Unclosed \(x_1`, "test.content")).toThrow(
      /unclosed/i,
    );
    expect(() => validateMathText("Stray \\)", "test.content")).toThrow(/closing/i);
  });

  it("rejects syntactically valid KaTeX when ordinary prose is inside math", () => {
    expect(() =>
      validateMathText(
        "The Fisher relation \\(r\\approx i-\\pi^e gives r\\approx2\\%\\).",
        "test.content",
      ),
    ).toThrow(/ordinary prose inside math/i);
    expect(() =>
      validateMathText(
        "The Fisher relation \\(r\\approx i-\\pi^e\\) gives \\(r\\approx2\\%\\).",
        "test.content",
      ),
    ).not.toThrow();
  });

  it("rejects raw fractions and broken cross-boundary formulas in content validation", () => {
    expect(() =>
      validateFreeMathContent("The multiplier is 1/(1-c).", "test.content"),
    ).toThrow(/LaTeX-like notation outside/i);
    expect(() =>
      validateFreeMathContent("\\(\\delta=30\\)/500", "test.content"),
    ).toThrow(/broken math fragment boundary/i);
    expect(() =>
      validateFreeMathContent("\\(\\pi\\)≈\\(g_M-g_Y\\)", "test.content"),
    ).toThrow(/broken math fragment boundary/i);
  });

  it("requires descriptive structured symbols to be explicit text while accepting math symbols", () => {
    expect(() => validateStructuredVariableSymbol("x", "test.symbol")).not.toThrow();
    expect(() => validateStructuredVariableSymbol("\\pi", "test.symbol")).not.toThrow();
    expect(() =>
      validateStructuredVariableSymbol("P_{t-1}", "test.symbol"),
    ).not.toThrow();
    expect(() =>
      validateStructuredVariableSymbol("\\mathrm{GDP}", "test.symbol"),
    ).not.toThrow();
    expect(() => validateStructuredVariableSymbol("debt stock", "test.symbol")).toThrow(
      /bare word-valued symbol/i,
    );
    expect(() =>
      validateStructuredVariableSymbol("\\text{debt stock}", "test.symbol"),
    ).not.toThrow();
  });

  it("keeps valid KaTeX MathML accessible without masking it with a wrapper label", () => {
    const { container } = render(
      <MathExpression expression="\\frac{P_t-P_{t-1}}{P_{t-1}}" />,
    );
    const wrapper = container.querySelector(".math-expression");
    expect(wrapper).toBeInTheDocument();
    expect(wrapper).not.toHaveAttribute("aria-label");
    expect(wrapper?.querySelector(".katex")).toBeInTheDocument();
    expect(wrapper?.querySelector(".katex-mathml math")).toBeTruthy();
    expect(wrapper?.querySelector("annotation")).toHaveTextContent("P_t");
  });

  it("renders math without context and keeps disabled disclosure non-clickable", () => {
    const { container, rerender } = render(
      <KnowledgeText text={String.raw`Inflation is \(\pi_t\).`} />,
    );
    expect(container.querySelector(".katex")).toBeInTheDocument();
    expect(container.querySelector(".knowledge-term")).not.toBeInTheDocument();

    rerender(
      <KnowledgeProvider>
        <KnowledgeText
          disclosure="disabled"
          text={String.raw`Inflation is \(\pi_t\).`}
        />
      </KnowledgeProvider>,
    );
    expect(container.querySelector(".katex")).toBeInTheDocument();
    expect(container.querySelector(".knowledge-term")).not.toBeInTheDocument();
  });

  it("matches concepts only in prose surrounding a formula", () => {
    const { container } = render(
      <KnowledgeProvider>
        <KnowledgeText
          text={String.raw`Inflation follows the Fisher relationship \(r\approx i-\pi^e\).`}
        />
      </KnowledgeProvider>,
    );

    expect(
      container.querySelector('button[aria-label="Explain Inflation"]'),
    ).toBeInTheDocument();
    expect(container.querySelector(".katex")).toBeInTheDocument();
    expect(container.querySelector(".katex")?.closest("button")).toBeNull();
    expect(
      [...container.querySelectorAll(".knowledge-term")].some((button) =>
        /pi|^t$/i.test(button.textContent ?? ""),
      ),
    ).toBe(false);
  });
});

describe("math integration regressions", () => {
  it("keeps auth-ch07-012's Fisher prose outside both math fragments", () => {
    const question = examQuestions.find(
      (candidate) => candidate.id === "auth-ch07-012",
    );
    if (question === undefined) throw new Error("Missing auth-ch07-012.");
    const { container } = render(<MathText text={question.explanation} />);
    expect(
      [...container.querySelectorAll(".math-prose")].some((prose) =>
        prose.textContent?.includes("gives"),
      ),
    ).toBe(true);
    expect(
      [...container.querySelectorAll(".math-expression")].every(
        (expression) => !expression.textContent?.includes("gives"),
      ),
    ).toBe(true);
  });

  it("preserves notation qualifiers and teaching prose in corrected canonical cards", () => {
    const transmission = cards.find((candidate) => candidate.id === "ch07-016");
    const labourForce = cards.find((candidate) => candidate.id === "ch02-003");
    const householdSaving = cards.find((candidate) => candidate.id === "ch03-021");
    const publicSaving = cards.find((candidate) => candidate.id === "ch03-026");
    if (
      transmission === undefined ||
      labourForce === undefined ||
      householdSaving === undefined ||
      publicSaving === undefined
    ) {
      throw new Error("Missing notation-preservation regression card.");
    }
    expect(transmission.answer).toContain("for given inflation expectations");
    expect(labourForce.answer).toContain("employed");
    expect(labourForce.answer).toContain("unemployed");
    expect(householdSaving.answer).toContain("disposable income");
    expect(householdSaving.answer).toContain("consumption");
    expect(publicSaving.answer).toContain("tax receipts minus transfers");
  });

  it("preserves the corrected disposable-income, C-and-I, money-stock, and quantity-theory wording", () => {
    const disposableCards = cards.filter((candidate) =>
      ["ch04-008", "ch04-009"].includes(candidate.id),
    );
    expect(disposableCards).toHaveLength(2);
    expect(disposableCards.every((card) => !/Y_D|Yᴰ/u.test(JSON.stringify(card)))).toBe(
      true,
    );
    expect(disposableCards.every((card) => JSON.stringify(card).includes("Y^D"))).toBe(
      true,
    );

    const mix = cards.find((candidate) => candidate.id === "mix-030");
    const money = cards.find((candidate) => candidate.id === "ch06-009");
    const quantity = cards.find((candidate) => candidate.id === "ch06-028");
    expect(mix?.choices?.join("\n")).not.toMatch(/\bC\/I\b/u);
    expect(money?.answer).not.toContain("..");
    expect(money?.answer).toContain("bank deposits usable for payment");
    expect(quantity?.commonTrap).toBe(
      "Do not call \\(MV=PY\\) itself a theory; it becomes causal only after behavioural assumptions are added.",
    );

    const multiplier = cards.find((candidate) => candidate.id === "ch04-027");
    if (multiplier === undefined) throw new Error("Missing multiplier card.");
    const multiplierRender = render(<MathText text={multiplier.explanation} />);
    expect(multiplierRender.container.querySelector(".katex")).toBeInTheDocument();
    expect(multiplierRender.container).not.toHaveTextContent("1/(1-c)");
  });

  it("typesets the canonical ch01-019 inflation answer", async () => {
    const user = userEvent.setup();
    const card = cards.find((candidate) => candidate.id === "ch01-019");
    if (card === undefined) throw new Error("Missing canonical ch01-019.");
    const { container } = render(
      <StudyCard
        card={card}
        onSubmitReview={vi.fn().mockResolvedValue(undefined)}
        onFinish={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Show answer" }));
    const visibleMath = container.querySelector(".math-inline .katex-html");
    expect(visibleMath).toBeInTheDocument();
    expect(visibleMath).not.toHaveTextContent("_t");
    expect(visibleMath).not.toHaveTextContent("{t-1}");
    expect(container.querySelector(".math-text-fallback")).not.toBeInTheDocument();
  });

  it("typesets a long canonical formula and an MCQ choice", () => {
    const formulaCard = cards.find((candidate) => candidate.id === "ch10-014");
    const mcqCard = cards.find((candidate) => candidate.id === "mix-029");
    if (formulaCard === undefined || mcqCard === undefined) {
      throw new Error("Missing canonical formula regression card.");
    }

    const formulaRender = render(
      <StudyCard
        card={formulaCard}
        onSubmitReview={vi.fn().mockResolvedValue(undefined)}
        onFinish={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Show answer" }));
    expect(formulaRender.container.querySelector(".katex")).toBeInTheDocument();
    formulaRender.unmount();

    const { container } = render(
      <StudyCard
        card={mcqCard}
        onSubmitReview={vi.fn().mockResolvedValue(undefined)}
        onFinish={vi.fn()}
      />,
    );
    expect(container.querySelector(".choice-option .katex")).toBeInTheDocument();
  });

  it("renders Mock math without adding knowledge lookup controls", () => {
    const question = examQuestions.find(
      (candidate) => candidate.id === "auth-ch03-005",
    );
    if (question === undefined)
      throw new Error("Missing capital-accumulation question.");
    const { container } = render(
      <MockQuestion
        question={question}
        questionNumber={1}
        selectedChoice={null}
        reading={false}
        onSelect={vi.fn()}
      />,
    );
    expect(container.querySelector(".katex")).toBeInTheDocument();
    expect(container.querySelector(".knowledge-term")).not.toBeInTheDocument();
  });

  it("keeps native graph labels source-faithful", () => {
    const wageFloor = examQuestions.find(
      (candidate) => candidate.id === "auth-stim-ch02-001",
    );
    const inflationGraph = examQuestions.find(
      (candidate) => candidate.id === "auth-stim-ch08-002",
    );
    if (
      wageFloor?.stimulus?.type !== "econ_graph" ||
      inflationGraph?.stimulus?.type !== "econ_graph"
    ) {
      throw new Error("Missing graph-label regression stimuli.");
    }
    const wageLabels = [
      wageFloor.stimulus.description,
      ...(wageFloor.stimulus.points ?? []).map((point) => point.label),
      ...(wageFloor.stimulus.referenceLines ?? []).map((line) => line.label),
    ].join("\n");
    const inflationLabels = [
      inflationGraph.stimulus.description,
      ...inflationGraph.stimulus.curves.map((curve) => curve.label),
    ].join("\n");
    expect(wageLabels).toContain("w_f");
    expect(wageLabels).toContain("L_D");
    expect(wageLabels).toContain("L_S");
    expect(inflationLabels).toContain("π0");
    expect(inflationLabels).toContain("π1");
  });

  it("renders a structured Knowledge equation as KaTeX, not code", () => {
    const concept = knowledgeConcepts.find(
      (candidate) =>
        candidate.equations !== undefined && candidate.equations.length > 0,
    );
    if (concept === undefined) throw new Error("Missing equation-bearing concept.");
    const { container } = render(
      <ConceptArticle concept={concept} disclosure="full" onNavigate={vi.fn()} />,
    );
    expect(
      container.querySelector(".knowledge-equation .katex-display"),
    ).toBeInTheDocument();
    expect(container.querySelector(".knowledge-equation code")).not.toBeInTheDocument();
  });

  it("renders a descriptive Knowledge variable symbol as textual math", () => {
    const concept = knowledgeConcepts.find((candidate) => candidate.id === "debt-gdp");
    if (concept === undefined) throw new Error("Missing debt-to-GDP concept.");
    const { container } = render(
      <ConceptArticle concept={concept} disclosure="full" onNavigate={vi.fn()} />,
    );
    const variableMath = [
      ...container.querySelectorAll(".knowledge-equation .math-inline"),
    ];
    expect(variableMath.some((node) => node.textContent?.includes("debt stock"))).toBe(
      true,
    );
    expect(variableMath.some((node) => node.textContent === "d e b t s t o c k")).toBe(
      false,
    );
  });

  it("renders a generated calculation formula", () => {
    const instance = getGeneratedCalculationInstance(
      "generated-capital-accumulation",
      "math-rendering-regression",
    );
    const { container } = render(
      <GeneratedCalculation
        instance={instance}
        index={0}
        total={1}
        recordReview={vi.fn().mockResolvedValue(undefined)}
        onNext={vi.fn()}
        onNewNumbers={vi.fn()}
      />,
    );
    expect(container.querySelector(".mock-stem .katex")).toBeInTheDocument();
    expect(container.querySelector(".math-text-fallback")).not.toBeInTheDocument();
  });

  it("renders math in Guided choices without changing answer semantics", () => {
    const skill = guidedKnowledgeCheckSkills.find(
      (candidate) => candidate.kind === "mcq",
    );
    if (skill === undefined) throw new Error("Missing MCQ Guided skill.");
    const source = skill.variants[0];
    if (source === undefined || source.kind !== "mcq") {
      throw new Error("Missing MCQ Guided variant.");
    }
    const variant = {
      ...source,
      prompt: String.raw`Choose the correct value of \(x_1\).`,
      choices: [String.raw`\(x_1\)`, String.raw`\(x_2\)`, "Neither"],
      correctChoice: 0 as const,
      explanation: String.raw`The first choice identifies \(x_1\).`,
    };
    const { container } = render(
      <GuidedKnowledgeCheck
        skill={skill}
        variant={variant}
        onSubmitReview={vi.fn().mockResolvedValue(undefined)}
        onFinish={vi.fn()}
      />,
    );
    expect(container.querySelectorAll(".choice-option .katex")).toHaveLength(2);
    expect(container.querySelector(".guided-check-prompt .katex")).toBeInTheDocument();
  });
});
