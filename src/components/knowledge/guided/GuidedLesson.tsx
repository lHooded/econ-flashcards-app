import type { KnowledgeConcept } from "../../../knowledge/model";
import { knowledgeConceptById } from "../../../knowledge/data";
import { KnowledgeText } from "../KnowledgeText";

export function GuidedLesson({
  concept,
  onContinue,
}: {
  readonly concept: KnowledgeConcept;
  readonly onContinue: () => void;
}) {
  const prerequisites = concept.prerequisites
    .map((id) => knowledgeConceptById.get(id))
    .filter((value): value is KnowledgeConcept => value !== undefined);
  return (
    <article className="guided-lesson panel" aria-labelledby="guided-lesson-title">
      <div className="guided-step-label">
        <span className="section-kicker">New idea</span>
        <span className="guided-lesson-pill">Read first, then retrieve</span>
      </div>
      <h2 id="guided-lesson-title">{concept.name}</h2>
      {prerequisites.length > 0 && (
        <p className="guided-breadcrumb">
          Builds on: {prerequisites.map((item) => item.name).join(" · ")}
        </p>
      )}
      <p className="knowledge-summary">
        <KnowledgeText text={concept.summary} />
      </p>
      <section>
        <h3>Intuition</h3>
        <p>
          <KnowledgeText text={concept.intuition} />
        </p>
      </section>
      <section>
        <h3>The essential model</h3>
        {concept.explanation.slice(0, 2).map((paragraph) => (
          <p key={paragraph}>
            <KnowledgeText text={paragraph} />
          </p>
        ))}
        {concept.mechanism && concept.mechanism.length > 0 && (
          <ol className="guided-mechanism-list">
            {concept.mechanism.slice(0, 3).map((step) => (
              <li key={step}>
                <KnowledgeText text={step} />
              </li>
            ))}
          </ol>
        )}
      </section>
      {(concept.misconceptions?.[0] ?? concept.contrasts?.[0]?.difference) !==
        undefined && (
        <aside className="guided-trap">
          <strong>Watch for this beginner trap</strong>
          <p>
            <KnowledgeText
              text={
                concept.misconceptions?.[0] ?? concept.contrasts?.[0]?.difference ?? ""
              }
            />
          </p>
        </aside>
      )}
      <section>
        <h3>Why this matters</h3>
        <p>
          <KnowledgeText text={concept.whyItMatters} />
        </p>
      </section>
      <div className="guided-lesson-actions">
        <a
          className="secondary-button"
          href={`#/knowledge?concept=${encodeURIComponent(concept.id)}`}
        >
          Open full explanation
        </a>
        <button className="primary-button" type="button" onClick={onContinue}>
          Check understanding
        </button>
      </div>
    </article>
  );
}
