import { knowledgeMatcher } from "../../knowledge/matching";
import type { ReactNode } from "react";
import { useContext } from "react";
import {
  KnowledgeContext,
  type KnowledgeDisclosure,
} from "../../knowledge/KnowledgeContext";

export function KnowledgeText({
  text,
  disclosure = "full",
}: {
  readonly text: string;
  readonly disclosure?: KnowledgeDisclosure | "disabled";
}) {
  const context = useContext(KnowledgeContext);
  if (disclosure === "disabled") return <>{text}</>;
  // Keep prose components embeddable in existing isolated surfaces and tests.
  // The app provider opts the same text into clickable term rendering.
  if (context === undefined) return <>{text}</>;
  const { pushConcept, openConceptChoices } = context;

  const matches = knowledgeMatcher.findTerms(text);
  if (matches.length === 0) return <>{text}</>;
  const pieces: ReactNode[] = [];
  let cursor = 0;
  for (const match of matches) {
    if (match.start > cursor) pieces.push(text.slice(cursor, match.start));
    const label = match.alias;
    const onClick = () => {
      if (match.conceptId !== null) pushConcept(match.conceptId, disclosure);
      else openConceptChoices(match.conceptIds, disclosure);
    };
    pieces.push(
      <button
        className="knowledge-term"
        type="button"
        key={`${match.start}-${match.end}-${label}`}
        onClick={onClick}
        aria-label={`Explain ${label}`}
      >
        {label}
      </button>,
    );
    cursor = match.end;
  }
  if (cursor < text.length) pieces.push(text.slice(cursor));
  return <>{pieces}</>;
}
