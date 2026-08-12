import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { StudyCard } from "../components/StudyCard";
import { GeneratedCalculation } from "../components/calculations/GeneratedCalculation";
import { ConceptArticle } from "../components/knowledge/KnowledgeSheet";
import { KnowledgeText } from "../components/knowledge/KnowledgeText";
import { GuidedKnowledgeCheck } from "../components/knowledge/guided/GuidedKnowledgeCheck";
import { MockQuestion } from "../components/mock/MockQuestion";
import { MathText } from "../components/math/MathText";
import { validateMathText } from "../math/markup";
import { normalizeLegacyMathText } from "../math/content";
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

  it("keeps grouped generated numbers inside their math fragment", () => {
    const normalized = normalizeLegacyMathText("LF = 55% × 2,000 = 1,100 people.");
    expect(normalized).toContain("\\(LF = 55\\% \\times 2{,}000 = 1{,}100\\)");
    expect(normalized).not.toContain("\\),000");
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
