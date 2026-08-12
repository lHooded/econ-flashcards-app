import rawSources from "../../../knowledge/sources.json";
import { useEffect, useRef } from "react";
import { useKnowledge } from "../../knowledge/KnowledgeContext";
import type { KnowledgeDisclosure } from "../../knowledge/KnowledgeContext";
import { knowledgeConceptById } from "../../knowledge/data";
import { getDirectDependants } from "../../knowledge/graph";
import type { KnowledgeConcept } from "../../knowledge/model";
import { KnowledgeText } from "./KnowledgeText";
import { MathExpression } from "../math/MathExpression";

const sourceLabels = new Map(rawSources.map((source) => [source.id, source.label]));

export function KnowledgeSheet({
  stack,
  choiceIds,
  disclosure,
  blockedLabel,
}: {
  readonly stack: readonly string[];
  readonly choiceIds: readonly string[];
  readonly disclosure: KnowledgeDisclosure;
  readonly blockedLabel: string | null;
}) {
  const { pushConcept, chooseConcept, backConcept, closeConcept } = useKnowledge();
  const dialogRef = useRef<HTMLElement>(null);
  const concept =
    stack.length > 0 ? knowledgeConceptById.get(stack[stack.length - 1]) : undefined;
  const conceptId = concept?.id;
  useEffect(() => {
    if (conceptId !== undefined || choiceIds.length > 0 || blockedLabel !== null) {
      dialogRef.current?.focus();
    }
  }, [blockedLabel, choiceIds.length, conceptId]);
  if (concept === undefined && choiceIds.length === 0 && blockedLabel === null)
    return null;

  return (
    <div
      className="knowledge-sheet-backdrop"
      role="presentation"
      onMouseDown={(event) => event.target === event.currentTarget && closeConcept()}
    >
      <section
        ref={dialogRef}
        className="knowledge-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="knowledge-sheet-title"
        tabIndex={-1}
      >
        <div className="knowledge-sheet-header">
          {stack.length > 1 || choiceIds.length > 0 ? (
            <button className="secondary-button" type="button" onClick={backConcept}>
              ← Back
            </button>
          ) : (
            <span />
          )}
          <button
            className="icon-button"
            type="button"
            onClick={closeConcept}
            aria-label="Close explanation"
          >
            ×
          </button>
        </div>
        {blockedLabel !== null ? (
          <div className="knowledge-choice-dialog">
            <p className="eyebrow">Term lookup</p>
            <h2 id="knowledge-sheet-title">
              Explanation unavailable before your answer
            </h2>
            <p className="knowledge-blocked-message" role="alert">
              <strong>{blockedLabel}</strong> is part of what this question is testing.
              Its explanation will unlock after you answer.
            </p>
          </div>
        ) : choiceIds.length > 0 ? (
          <div className="knowledge-choice-dialog">
            <p className="eyebrow">Term lookup</p>
            <h2 id="knowledge-sheet-title">Which concept did you mean?</h2>
            <div className="knowledge-choice-list">
              {choiceIds.map((id) => {
                const choice = knowledgeConceptById.get(id);
                return choice === undefined ? null : (
                  <button
                    className="knowledge-choice"
                    type="button"
                    key={id}
                    onClick={() => chooseConcept(id)}
                  >
                    {choice.name}
                    <span>{choice.summary}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : concept !== undefined ? (
          <ConceptArticle
            concept={concept}
            disclosure={disclosure}
            onNavigate={pushConcept}
          />
        ) : null}
      </section>
    </div>
  );
}

export function ConceptArticle({
  concept,
  disclosure,
  onNavigate,
}: {
  readonly concept: KnowledgeConcept;
  readonly disclosure: KnowledgeDisclosure;
  readonly onNavigate: (conceptId: string, disclosure?: KnowledgeDisclosure) => void;
}) {
  const dependants = getDirectDependants(concept.id);
  return (
    <article className="knowledge-article">
      <p className="eyebrow">
        {concept.tags.includes("foundation")
          ? "Foundation"
          : `Chapter ${concept.chapters.join(" · ")}`}
      </p>
      <h2 id="knowledge-sheet-title">{concept.name}</h2>
      <p className="knowledge-summary">
        <KnowledgeText
          text={concept.summary}
          disclosure={disclosure === "preview" ? "disabled" : disclosure}
        />
      </p>
      <section>
        <h3>Intuition</h3>
        <p>
          <KnowledgeText
            text={concept.intuition}
            disclosure={disclosure === "preview" ? "disabled" : disclosure}
          />
        </p>
      </section>
      {disclosure === "preview" ? (
        <p className="knowledge-disclosure-note">
          This is the quick meaning. Submit the current question or reveal the card
          answer to open the full mechanism and examples.
        </p>
      ) : (
        <>
          <section>
            <h3>Build the idea</h3>
            {concept.explanation.map((paragraph) => (
              <p key={paragraph}>
                <KnowledgeText text={paragraph} />
              </p>
            ))}
          </section>
          <section>
            <h3>Why it matters</h3>
            <p>
              <KnowledgeText text={concept.whyItMatters} />
            </p>
          </section>
          {concept.mechanism && (
            <ArticleList title="Mechanism" items={concept.mechanism} />
          )}
          {concept.examples && (
            <section>
              <h3>Example</h3>
              {concept.examples.map((example) => (
                <div className="knowledge-example" key={example.title}>
                  <strong>{example.title}</strong>
                  <p>
                    <KnowledgeText text={example.text} />
                  </p>
                  {example.takeaway && (
                    <p className="muted-text">
                      <KnowledgeText text={example.takeaway} />
                    </p>
                  )}
                </div>
              ))}
            </section>
          )}
          {concept.equations && (
            <section>
              <h3>Equation</h3>
              {concept.equations.map((equation) => (
                <div className="knowledge-equation" key={equation.label}>
                  <strong>{equation.label}</strong>
                  <MathExpression expression={equation.expression} displayMode />
                  <p>
                    <KnowledgeText text={equation.interpretation} />
                  </p>
                  <ul>
                    {equation.variables.map((variable) => (
                      <li key={variable.symbol}>
                        <MathExpression expression={variable.symbol} /> —{" "}
                        <KnowledgeText text={variable.meaning} />
                        {variable.units ? ` (${variable.units})` : ""}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </section>
          )}
          {concept.misconceptions && (
            <ArticleList title="Common beginner traps" items={concept.misconceptions} />
          )}
          {concept.contrasts && (
            <section>
              <h3>Do not confuse it with</h3>
              <ul className="knowledge-link-list">
                {concept.contrasts.map((contrast) => (
                  <li key={contrast.conceptId}>
                    <button
                      type="button"
                      className="knowledge-inline-link"
                      onClick={() => onNavigate(contrast.conceptId, disclosure)}
                    >
                      {contrast.title}
                    </button>
                    <span>
                      {" "}
                      — <KnowledgeText text={contrast.difference} />
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
      {disclosure === "full" && (
        <>
          <ConceptLinks
            title="What you should know first"
            ids={concept.prerequisites}
            onNavigate={onNavigate}
            disclosure={disclosure}
          />
          <ConceptLinks
            title="What this unlocks"
            ids={dependants}
            onNavigate={onNavigate}
            disclosure={disclosure}
          />
          <ConceptLinks
            title="Related concepts"
            ids={concept.relatedConcepts}
            onNavigate={onNavigate}
            disclosure={disclosure}
          />
          <ConceptStudyActions concept={concept} />
        </>
      )}
      {disclosure === "full" && (
        <section>
          <h3>Course sources</h3>
          <ul className="knowledge-source-list">
            {concept.sourceRefs.map((sourceRef) => (
              <li key={`${sourceRef.sourceId}-${sourceRef.page}-${sourceRef.note}`}>
                <span>
                  {sourceLabels.get(sourceRef.sourceId) ?? sourceRef.sourceId}, p.{" "}
                  {sourceRef.page}
                </span>
                <small>{sourceRef.note}</small>
              </li>
            ))}
          </ul>
        </section>
      )}
    </article>
  );
}

function ConceptStudyActions({ concept }: { readonly concept: KnowledgeConcept }) {
  if (concept.linkedCardIds.length === 0 && concept.linkedQuestionIds.length === 0) {
    return null;
  }
  return (
    <section className="knowledge-study-actions">
      <h3>Use this concept in practice</h3>
      <div className="button-row">
        {concept.linkedCardIds.length > 0 && (
          <a
            className="secondary-button"
            href={"#/study?concept=" + encodeURIComponent(concept.id)}
          >
            Study linked cards
          </a>
        )}
        {concept.linkedQuestionIds.length > 0 && (
          <a
            className="secondary-button"
            href={"#/practice?mode=mcq&concept=" + encodeURIComponent(concept.id)}
          >
            Practise linked questions
          </a>
        )}
      </div>
    </section>
  );
}

function ArticleList({
  title,
  items,
}: {
  readonly title: string;
  readonly items: readonly string[];
}) {
  return (
    <section>
      <h3>{title}</h3>
      <ul>
        {items.map((item) => (
          <li key={item}>
            <KnowledgeText text={item} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function ConceptLinks({
  title,
  ids,
  onNavigate,
  disclosure,
}: {
  readonly title: string;
  readonly ids: readonly string[];
  readonly onNavigate: (id: string, disclosure?: KnowledgeDisclosure) => void;
  readonly disclosure: KnowledgeDisclosure;
}) {
  if (ids.length === 0) return null;
  return (
    <section>
      <h3>{title}</h3>
      <ul className="knowledge-link-list">
        {ids.map((id) => {
          const concept = knowledgeConceptById.get(id);
          return concept === undefined ? null : (
            <li key={id}>
              <button
                type="button"
                className="knowledge-inline-link"
                onClick={() => onNavigate(id, disclosure)}
              >
                {concept.name}
              </button>
              <span> — {concept.summary}</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
