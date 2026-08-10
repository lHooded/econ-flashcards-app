import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { QuestionStimulus } from "../components/stimulus/QuestionStimulus";
import { examQuestions } from "../exam/questionBank";

function stimulusFor(id: string) {
  const question = examQuestions.find((candidate) => candidate.id === id);
  if (question?.stimulus === undefined) {
    throw new Error(`Question ${id} should contain a stimulus.`);
  }
  return question.stimulus;
}

describe("QuestionStimulus", () => {
  it("renders graph axes, labels, line styles, primitives and accessible text", () => {
    const stimulus = stimulusFor("auth-stim-ch04-001");
    if (stimulus.type !== "econ_graph") throw new Error("Expected a graph stimulus.");

    const { container } = render(<QuestionStimulus stimulus={stimulus} />);
    const svg = container.querySelector("svg");
    expect(svg).not.toBeNull();
    expect(screen.getByText("Output, Y")).toBeInTheDocument();
    expect(screen.getByText("Planned aggregate expenditure, PAE")).toBeInTheDocument();
    expect(screen.getByText("PAE1")).toBeInTheDocument();
    expect(screen.getByText("E1")).toBeInTheDocument();
    expect(container.querySelector(".econ-graph-arrow")).toBeNull();
    expect(
      container
        .querySelector(".econ-graph-curve path")
        ?.getAttribute("stroke-dasharray"),
    ).toBe("10 7");

    const labelledBy = svg?.getAttribute("aria-labelledby");
    expect(labelledBy).toBeTruthy();
    const ids = labelledBy?.split(" ") ?? [];
    expect(ids).toHaveLength(2);
    expect(document.getElementById(ids[0])).toHaveTextContent(stimulus.title);
    expect(document.getElementById(ids[1])).toHaveTextContent(stimulus.description);
  });

  it("renders arrows and dashed reference lines without relying on colour", () => {
    const stimulus = stimulusFor("auth-stim-ch07-001");
    if (stimulus.type !== "econ_graph") throw new Error("Expected a graph stimulus.");

    const { container } = render(<QuestionStimulus stimulus={stimulus} />);
    expect(
      container.querySelector(".econ-graph-arrow line")?.getAttribute("marker-end"),
    ).toContain("arrow");
    expect(container.querySelectorAll(".econ-graph-reference-line")).toHaveLength(2);
    expect(container.querySelectorAll(".econ-graph-point")).toHaveLength(2);
  });

  it("renders declarative annotations", () => {
    const stimulus = stimulusFor("auth-stim-ch05-002");
    if (stimulus.type !== "econ_graph") throw new Error("Expected a graph stimulus.");

    render(<QuestionStimulus stimulus={stimulus} />);
    expect(screen.getByText("r > g")).toBeInTheDocument();
  });

  it("renders a semantic table with caption, headers and every cell", () => {
    const stimulus = stimulusFor("auth-stim-ch01-003");
    if (stimulus.type !== "table") throw new Error("Expected a table stimulus.");

    render(<QuestionStimulus stimulus={stimulus} />);
    const table = screen.getByRole("table");
    expect(within(table).getByRole("caption")).toHaveTextContent(stimulus.caption);
    expect(within(table).getAllByRole("columnheader")).toHaveLength(3);
    expect(within(table).getAllByRole("cell")).toHaveLength(6);
    expect(screen.getByText(stimulus.note!)).toBeInTheDocument();
  });

  it("renders nothing for a text-only question", () => {
    const { container } = render(<QuestionStimulus />);
    expect(container).toBeEmptyDOMElement();
  });
});
