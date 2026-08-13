import { knowledgeMatcher } from "../../knowledge/matching";
import type { ReactNode } from "react";
import { useContext } from "react";
import {
  KnowledgeContext,
  type KnowledgeDisclosure,
} from "../../knowledge/KnowledgeContext";
import { MathText } from "../math/MathText";

export function KnowledgeText({
  text,
  disclosure = "full",
  testedConceptIds,
}: {
  readonly text: string;
  readonly disclosure?: KnowledgeDisclosure | "disabled";
  readonly testedConceptIds?: readonly string[];
}) {
  const context = useContext(KnowledgeContext);
  if (disclosure === "disabled") return <MathText text={text} />;
  // Keep prose components embeddable in existing isolated surfaces and tests.
  // The app provider opts the same text into clickable term rendering.
  if (context === undefined) return <MathText text={text} />;
  const { pushConcept, openConceptChoices, openBlockedTerm } = context;
  const tested = new Set(testedConceptIds ?? []);

  return (
    <MathText
      text={text}
      renderProse={(prose, tokenIndex) => {
        const matches = knowledgeMatcher.findTerms(prose);
        if (matches.length === 0) return prose;
        const pieces: ReactNode[] = [];
        let cursor = 0;
        for (const match of matches) {
          if (match.start > cursor) pieces.push(prose.slice(cursor, match.start));
          const label = match.alias;
          const candidateIds = match.conceptIds.filter((id) => !tested.has(id));
          const isBlocked =
            disclosure === "preview" &&
            (match.conceptId !== null
              ? tested.has(match.conceptId)
              : candidateIds.length === 0);
          const onClick = () => {
            if (isBlocked) {
              openBlockedTerm(label);
            } else if (match.conceptId !== null) {
              pushConcept(match.conceptId, disclosure, { testedConceptIds });
            } else {
              openConceptChoices(candidateIds, disclosure, {
                testedConceptIds,
              });
            }
          };
          const accessibleLabel = isBlocked
            ? label +
              " is part of the current question; explanation unlocks after answering"
            : "Explain " + label;
          pieces.push(
            <button
              className="knowledge-term"
              type="button"
              key={`${tokenIndex}-${match.start}-${match.end}-${label}`}
              onClick={onClick}
              aria-label={accessibleLabel}
            >
              {label}
            </button>,
          );
          cursor = match.end;
        }
        if (cursor < prose.length) pieces.push(prose.slice(cursor));
        return <>{pieces}</>;
      }}
    />
  );
}
