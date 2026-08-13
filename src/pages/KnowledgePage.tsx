import { useMemo, useState } from "react";
import { useProgress } from "../app/progressContext";
import { cards } from "../data/deck";
import { deriveExamSrsSnapshot } from "../study/examSrs/deriveState";
import { useNow } from "../utils/useNow";
import { ConceptArticle } from "../components/knowledge/KnowledgeSheet";
import { ConceptStatus } from "../components/knowledge/ConceptStatus";
import { KnowledgeGraph } from "../components/knowledge/KnowledgeGraph";
import { MathText } from "../components/math/MathText";
import { knowledgeConceptById, knowledgeConcepts } from "../knowledge/data";
import { getKnowledgeTags, searchKnowledge } from "../knowledge/search";
import { getLearningPath, prerequisiteTopologicalOrder } from "../knowledge/graph";
import {
  deriveGuidedCheckStates,
  deriveConceptStatuses,
  deriveFoundationCurriculum,
} from "../knowledge/mastery";
import type { KnowledgeConceptStatus } from "../knowledge/model";

export function KnowledgePage({
  initialConceptId,
}: {
  readonly initialConceptId: string | null;
}) {
  const { snapshot } = useProgress();
  const nowMs = useNow(60 * 1000);
  const [query, setQuery] = useState("");
  const [browse, setBrowse] = useState<"all" | "foundation" | "chapter" | "tag">("all");
  const [chapter, setChapter] = useState<number | null>(null);
  const [tag, setTag] = useState<string | null>(null);
  const selectedId =
    initialConceptId !== null && knowledgeConceptById.has(initialConceptId)
      ? initialConceptId
      : null;
  const scheduler = useMemo(
    () =>
      snapshot === null
        ? null
        : deriveExamSrsSnapshot(cards, snapshot.reviewEvents, snapshot.settings, nowMs),
    [nowMs, snapshot],
  );
  const statuses = useMemo(
    () =>
      scheduler === null
        ? new Map<string, KnowledgeConceptStatus>()
        : deriveConceptStatuses(
            scheduler,
            knowledgeConcepts,
            deriveGuidedCheckStates(
              snapshot?.reviewEvents ?? [],
              snapshot?.settings ?? { examAt: null, studyBufferHours: 24 },
              nowMs,
            ),
          ),
    [nowMs, scheduler, snapshot],
  );
  const searchResults = useMemo(
    () =>
      searchKnowledge(query, {
        chapter: browse === "chapter" ? chapter : null,
        tag: browse === "tag" ? tag : null,
        foundationOnly: browse === "foundation",
      }).slice(0, 40),
    [browse, chapter, query, tag],
  );
  const selected =
    selectedId === null ? undefined : knowledgeConceptById.get(selectedId);
  const browseConcepts = useMemo(() => {
    if (query.trim()) return searchResults.map((result) => result.concept);
    return knowledgeConcepts
      .filter((concept) => {
        if (browse === "foundation") return concept.tags.includes("foundation");
        if (browse === "chapter")
          return chapter !== null && concept.chapters.includes(chapter);
        if (browse === "tag") return tag !== null && concept.tags.includes(tag);
        return true;
      })
      .slice(0, 80);
  }, [browse, chapter, query, searchResults, tag]);
  const selectedPath = selected === undefined ? [] : getLearningPath(selected.id);
  const foundationCurriculum = useMemo(
    () => deriveFoundationCurriculum(prerequisiteTopologicalOrder, statuses),
    [statuses],
  );
  const selectedFoundationIndex =
    selectedId === null ? -1 : foundationCurriculum.indexOf(selectedId);
  const foundationIndex = selectedFoundationIndex >= 0 ? selectedFoundationIndex : 0;
  const foundationId = foundationCurriculum[foundationIndex] ?? null;
  const foundationConcept =
    foundationId === null ? undefined : knowledgeConceptById.get(foundationId);

  const openConcept = (conceptId: string) => {
    if (knowledgeConceptById.has(conceptId))
      window.location.hash = `#/knowledge?concept=${encodeURIComponent(conceptId)}`;
  };

  return (
    <div className="page-stack knowledge-page">
      <section className="page-heading">
        <div>
          <p className="eyebrow">Course map · offline explanations</p>
          <h1>Build the ideas from the ground up.</h1>
          <p className="lede">
            Search formal course language, browse foundations, and follow the arrows
            from prerequisite to dependent concept. Inline terms throughout the app open
            the same explainer.
          </p>
        </div>
        <a
          className="primary-button heading-action"
          href={
            foundationId === null
              ? "#/knowledge"
              : "#/knowledge?concept=" + encodeURIComponent(foundationId)
          }
        >
          Learn from foundations
        </a>
        <a className="secondary-button heading-action" href="#/guided">
          Guided Cram
        </a>
      </section>
      <section className="knowledge-search panel">
        <label className="field-label" htmlFor="knowledge-search">
          Search the course knowledge base
        </label>
        <input
          id="knowledge-search"
          className="text-input"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Try: government IOU, cost of borrowing, prices going up…"
        />
        <div className="knowledge-browse-controls" aria-label="Browse knowledge">
          {(["all", "foundation", "chapter", "tag"] as const).map((value) => (
            <button
              type="button"
              key={value}
              className={`filter-chip ${browse === value ? "filter-chip-active" : ""}`}
              onClick={() => setBrowse(value)}
            >
              {value === "all"
                ? "All concepts"
                : value === "foundation"
                  ? "Foundations"
                  : value === "chapter"
                    ? "By chapter"
                    : "By topic"}
            </button>
          ))}
          {browse === "chapter" && (
            <select
              className="select-input"
              value={chapter ?? ""}
              onChange={(event) =>
                setChapter(
                  event.target.value === "" ? null : Number(event.target.value),
                )
              }
            >
              <option value="">Choose chapter</option>
              {Array.from({ length: 11 }, (_, value) => (
                <option key={value} value={value}>
                  {value === 0 ? "Foundations" : `Chapter ${value}`}
                </option>
              ))}
            </select>
          )}
          {browse === "tag" && (
            <select
              className="select-input"
              value={tag ?? ""}
              onChange={(event) => setTag(event.target.value || null)}
            >
              <option value="">Choose topic</option>
              {getKnowledgeTags()
                .filter((value) => value !== "foundation")
                .map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
            </select>
          )}
        </div>
      </section>
      <div className="knowledge-layout">
        <aside className="knowledge-results panel" aria-label="Concept results">
          <div className="section-heading-row">
            <div>
              <p className="section-kicker">Browse</p>
              <h2>{query.trim() ? `${searchResults.length} matches` : "Concepts"}</h2>
            </div>
            <span className="muted-text">{knowledgeConcepts.length} total</span>
          </div>
          <div className="knowledge-result-list">
            {browseConcepts.map((concept) => (
              <button
                type="button"
                className={`knowledge-result ${selected?.id === concept.id ? "knowledge-result-active" : ""}`}
                key={concept.id}
                onClick={() => openConcept(concept.id)}
              >
                <span>
                  <strong>{concept.name}</strong>
                  <small>
                    {concept.tags.includes("foundation")
                      ? "Foundation"
                      : `Ch. ${concept.chapters.join(" · ")}`}
                  </small>
                </span>
                <ConceptStatus status={statuses.get(concept.id) ?? "unseen"} />
              </button>
            ))}
            {browseConcepts.length === 0 && (
              <p className="muted-text">
                No local concept matches yet. Try a formal term or a beginner phrase.
              </p>
            )}
          </div>
        </aside>
        <main className="knowledge-detail panel">
          {selected === undefined ? (
            <KnowledgeLanding statuses={statuses} onSelect={openConcept} />
          ) : (
            <>
              <div className="knowledge-detail-heading">
                <div>
                  <p className="section-kicker">Concept detail</p>
                  <h2>{selected.name}</h2>
                </div>
                <ConceptStatus status={statuses.get(selected.id) ?? "unseen"} />
              </div>
              <ConceptArticle
                concept={selected}
                disclosure="full"
                onNavigate={openConcept}
              />
              <KnowledgeGraph
                conceptId={selected.id}
                statuses={statuses}
                onSelect={openConcept}
              />
              <section className="knowledge-path-section">
                <h3>Learning path</h3>
                <p className="muted-text">
                  A deterministic prerequisite-respecting path to this concept:
                </p>
                <ol>
                  {selectedPath.map((id) => (
                    <li key={id}>
                      <button
                        type="button"
                        className="knowledge-inline-link"
                        onClick={() => openConcept(id)}
                      >
                        {knowledgeConceptById.get(id)?.name}
                      </button>
                      <span> · {statuses.get(id) ?? "unseen"}</span>
                    </li>
                  ))}
                </ol>
              </section>
            </>
          )}
        </main>
      </div>
      {foundationConcept !== undefined && (
        <section className="foundation-callout panel">
          <div>
            <p className="section-kicker">Learn from foundations</p>
            <h2>
              Foundation {foundationIndex + 1} of {foundationCurriculum.length}:{" "}
              {foundationConcept.name}
            </h2>
            <p>
              <strong>
                <MathText text={foundationConcept.summary} />
              </strong>{" "}
              <MathText text={foundationConcept.intuition} />
            </p>
            <p className="muted-text">
              This is a deterministic prerequisite-respecting curriculum. Reading is not
              recorded as mastery; linked cards and questions use the existing review
              evidence system.
              {foundationConcept.linkedCardIds.length === 0
                ? " This background concept has no direct review card, so it remains available for manual learning."
                : ""}
            </p>
          </div>
          <div className="button-row">
            <button
              className="secondary-button"
              type="button"
              disabled={foundationIndex === 0}
              onClick={() => {
                const previous = foundationCurriculum[foundationIndex - 1];
                if (previous !== undefined) openConcept(previous);
              }}
            >
              Previous foundation
            </button>
            <button
              className="primary-button"
              type="button"
              onClick={() => openConcept(foundationConcept.id)}
            >
              Read explanation
            </button>
            <button
              className="secondary-button"
              type="button"
              disabled={foundationIndex >= foundationCurriculum.length - 1}
              onClick={() => {
                const next = foundationCurriculum[foundationIndex + 1];
                if (next !== undefined) openConcept(next);
              }}
            >
              Next foundation
            </button>
            {foundationConcept.linkedCardIds.length > 0 && (
              <a
                className="secondary-button"
                href={"#/study?concept=" + encodeURIComponent(foundationConcept.id)}
              >
                Study linked cards
              </a>
            )}
            {foundationConcept.linkedQuestionIds.length > 0 && (
              <a
                className="secondary-button"
                href={
                  "#/practice?mode=mcq&concept=" +
                  encodeURIComponent(foundationConcept.id)
                }
              >
                Practise linked questions
              </a>
            )}
          </div>
        </section>
      )}
      <p className="knowledge-offline-note">
        Knowledge content, search, graph traversal, status labels, and source references
        are bundled static data; no runtime network lookup is used.
      </p>
    </div>
  );
}

function KnowledgeLanding({
  statuses,
  onSelect,
}: {
  readonly statuses: ReadonlyMap<string, KnowledgeConceptStatus>;
  readonly onSelect: (id: string) => void;
}) {
  const roots = knowledgeConcepts
    .filter((concept) => concept.prerequisites.length === 0)
    .slice(0, 10);
  return (
    <div className="knowledge-landing">
      <p className="eyebrow">Start where the graph starts</p>
      <h2>Choose a concept to inspect.</h2>
      <p>
        Foundations cover the small amount of maths, market language, accounting, and
        finance needed to make the course’s macro terms less mysterious.
      </p>
      <div className="knowledge-root-grid">
        {roots.map((concept) => (
          <button
            type="button"
            className="knowledge-root-card"
            key={concept.id}
            onClick={() => onSelect(concept.id)}
          >
            <strong>{concept.name}</strong>
            <span>
              <MathText text={concept.summary} />
            </span>
            <ConceptStatus status={statuses.get(concept.id) ?? "unseen"} />
          </button>
        ))}
      </div>
    </div>
  );
}
