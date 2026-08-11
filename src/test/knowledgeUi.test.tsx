import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { KnowledgeProvider } from "../knowledge/KnowledgeProvider";
import { KnowledgeText } from "../components/knowledge/KnowledgeText";

describe("knowledge explainer UI", () => {
  it("opens a term, drills into a prerequisite, returns with the local back stack, and closes with Escape", () => {
    render(
      <KnowledgeProvider>
        <p>
          A <KnowledgeText text="bond" /> is a tradable promise.
        </p>
      </KnowledgeProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Explain bond" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Bond" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Borrowing" }));
    expect(screen.getByRole("heading", { name: "Borrowing" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "← Back" }));
    expect(screen.getByRole("heading", { name: "Bond" })).toBeInTheDocument();

    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("keeps long prose safe text and exposes keyboard-focusable term controls", () => {
    render(
      <KnowledgeProvider>
        <p>
          <KnowledgeText text="A bond price changes when the interest rate changes; this is plain app text, not injected HTML." />
        </p>
      </KnowledgeProvider>,
    );
    const term = screen.getByRole("button", { name: "Explain bond price" });
    expect(term).toHaveAttribute("type", "button");
    expect(term).toHaveClass("knowledge-term");
    expect(document.querySelector("script")).toBeNull();
  });
});
