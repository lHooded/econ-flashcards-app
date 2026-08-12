import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { PracticeMcq } from "../pages/PracticePage";
import { StudyCard } from "../components/StudyCard";
import { GeneratedCalculation } from "../components/calculations/GeneratedCalculation";
import { KnowledgeText } from "../components/knowledge/KnowledgeText";
import { getGeneratedCalculationInstance } from "../calculations/templates";
import { cards } from "../data/deck";
import { examQuestions } from "../exam/questionBank";
import { cardConceptMap } from "../knowledge/contentMap";
import { KnowledgeProvider } from "../knowledge/KnowledgeProvider";

function CpiQuestionHarness() {
  const question = examQuestions.find((candidate) => candidate.id === "auth-ch01-006")!;
  const [selected, setSelected] = useState<number | null>(null);
  const [saved, setSaved] = useState(false);
  return (
    <KnowledgeProvider>
      <PracticeMcq
        question={question}
        testedConceptIds={cardConceptMap[question.reviewCardId] ?? []}
        index={0}
        total={1}
        selected={selected}
        saved={saved}
        saving={false}
        pending={false}
        error={null}
        onSelect={setSelected}
        onSubmit={() => setSaved(true)}
        onRetry={vi.fn()}
        onNext={vi.fn()}
      />
    </KnowledgeProvider>
  );
}

describe("question-aware knowledge disclosure", () => {
  it("blocks CPI's answer-bearing explanation before auth-ch01-006 is submitted", () => {
    render(<CpiQuestionHarness />);

    fireEvent.click(
      screen.getByRole("button", {
        name: /consumer price index is part of the current question/i,
      }),
    );
    const blockedDialog = screen.getByRole("dialog");
    expect(blockedDialog).toHaveTextContent(
      /explanation unavailable before your answer/i,
    );
    expect(blockedDialog).toHaveTextContent(/part of what this question is testing/i);
    expect(blockedDialog).not.toHaveTextContent(/specified.*basket/i);
    expect(blockedDialog).not.toHaveTextContent(/base period/i);

    fireEvent.click(screen.getByRole("button", { name: "Close explanation" }));
    fireEvent.click(screen.getAllByRole("radio")[1]);
    fireEvent.click(screen.getByRole("button", { name: "Submit answer" }));

    fireEvent.click(
      screen.getByRole("button", { name: "Explain consumer price index" }),
    );
    const fullDialog = screen.getByRole("dialog");
    expect(fullDialog).toHaveTextContent("Build the idea");
    expect(fullDialog).toHaveTextContent(/specified basket/i);
    expect(fullDialog).toHaveTextContent(/base period/i);
  });

  it("blocks the bond-price/rate mechanism before ch06-004 and unlocks it after reveal", () => {
    const card = cards.find((candidate) => candidate.id === "ch06-004")!;
    render(
      <KnowledgeProvider>
        <StudyCard
          card={card}
          testedConceptIds={cardConceptMap[card.id]}
          onSubmitReview={vi.fn().mockResolvedValue(undefined)}
          onFinish={vi.fn()}
        />
      </KnowledgeProvider>,
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: /interest rates is part of the current question/i,
      }),
    );
    expect(screen.getByRole("dialog")).not.toHaveTextContent(/lower price/i);
    fireEvent.click(screen.getByRole("button", { name: "Close explanation" }));
    fireEvent.click(screen.getByRole("button", { name: "Show answer" }));

    fireEvent.click(screen.getByRole("button", { name: "Explain bond prices" }));
    const fullDialog = screen.getByRole("dialog");
    expect(fullDialog).toHaveTextContent(/market interest rates rise/i);
    expect(fullDialog).toHaveTextContent(/lower price/i);
  });

  it("blocks the Rule-of-70 formula before generated numeric submission", async () => {
    const instance = getGeneratedCalculationInstance(
      "generated-rule-of-70",
      "disclosure-regression",
    );
    render(
      <KnowledgeProvider>
        <GeneratedCalculation
          instance={instance}
          index={0}
          total={1}
          recordReview={vi.fn().mockResolvedValue(undefined)}
          onNext={vi.fn()}
          onNewNumbers={vi.fn()}
        />
      </KnowledgeProvider>,
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: /rule of 70 is part of the current question/i,
      }),
    );
    expect(screen.getByRole("dialog")).not.toHaveTextContent(/70\s*\/\s*annual/i);
    fireEvent.click(screen.getByRole("button", { name: "Close explanation" }));

    const input = screen.getByLabelText(/Numeric answer/);
    fireEvent.change(input, { target: { value: String(instance.answer.value) } });
    fireEvent.click(screen.getByRole("button", { name: "Submit answer" }));
    await waitFor(() => expect(screen.getByText("Correct")).toBeInTheDocument());
    fireEvent.click(
      screen
        .getAllByRole("button", { name: /Explain rule of 70/i })
        .find((button) => button.textContent === "Rule of 70")!,
    );
    expect(screen.getByRole("dialog")).toHaveTextContent(/doubling time/i);
    const dialog = screen.getByRole("dialog");
    expect(
      dialog.querySelector(".knowledge-equation .katex-mathml"),
    ).toBeInTheDocument();
    expect(
      dialog.querySelector(".knowledge-equation .katex-mathml annotation")?.textContent,
    ).toMatch(/70.*annual growth rate/i);
  });

  it("does not let preview ambiguity navigate to a blocked meaning", () => {
    const { rerender } = render(
      <KnowledgeProvider>
        <KnowledgeText
          text="depreciation"
          disclosure="preview"
          testedConceptIds={["depreciation", "currency-depreciation"]}
        />
      </KnowledgeProvider>,
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: /depreciation is part of the current question/i,
      }),
    );
    expect(screen.getByRole("dialog")).toHaveTextContent(
      /explanation unavailable before your answer/i,
    );
    fireEvent.click(screen.getByRole("button", { name: "Close explanation" }));

    rerender(
      <KnowledgeProvider>
        <KnowledgeText
          text="depreciation"
          disclosure="preview"
          testedConceptIds={["depreciation"]}
        />
      </KnowledgeProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Explain depreciation" }));
    expect(screen.getByRole("dialog")).toHaveTextContent(/which concept did you mean/i);
    expect(
      screen.getByRole("button", { name: /^Currency depreciation/ }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Depreciation/ })).toBeNull();
  });
});
