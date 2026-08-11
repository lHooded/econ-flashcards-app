import { getDirectDependants, getLearningPath } from "../../knowledge/graph";
import { knowledgeConceptById } from "../../knowledge/data";
import type { KnowledgeConceptStatus } from "../../knowledge/model";

export function KnowledgeGraph({
  conceptId,
  statuses,
  onSelect,
}: {
  readonly conceptId: string;
  readonly statuses: ReadonlyMap<string, KnowledgeConceptStatus>;
  readonly onSelect: (conceptId: string) => void;
}) {
  const path = getLearningPath(conceptId);
  const ancestors = path.slice(0, -1).slice(-7);
  const dependants = getDirectDependants(conceptId).slice(0, 7);
  const ids = [...new Set([...ancestors, conceptId, ...dependants])];
  const centerIndex = ancestors.length;
  const rowHeight = 72;
  const height = Math.max(
    220,
    (Math.max(ancestors.length, dependants.length) + 1) * rowHeight,
  );
  const positions = new Map<string, { x: number; y: number }>();
  ancestors.forEach((id, index) =>
    positions.set(id, { x: 150, y: 60 + index * rowHeight }),
  );
  positions.set(conceptId, { x: 400, y: 60 + centerIndex * rowHeight });
  dependants.forEach((id, index) =>
    positions.set(id, { x: 650, y: 60 + index * rowHeight }),
  );

  const edges = ids.flatMap((id) => {
    const concept = knowledgeConceptById.get(id);
    const from = positions.get(id);
    if (concept === undefined || from === undefined) return [];
    return concept.prerequisites.flatMap((prerequisiteId) => {
      const to = positions.get(prerequisiteId);
      return to === undefined
        ? []
        : [{ from: to, to: from, key: `${prerequisiteId}-${id}` }];
    });
  });

  return (
    <section
      className="knowledge-graph-section"
      aria-labelledby="knowledge-graph-title"
    >
      <div className="section-heading-row">
        <div>
          <p className="section-kicker">Focused graph</p>
          <h3 id="knowledge-graph-title">Prerequisite direction</h3>
        </div>
        <span className="muted-text">Arrow: know first → learn next</span>
      </div>
      <div className="knowledge-graph-scroll">
        <svg
          className="knowledge-graph"
          viewBox={`0 0 800 ${height}`}
          role="img"
          aria-labelledby="knowledge-graph-title knowledge-graph-description"
        >
          <desc id="knowledge-graph-description">
            A focused prerequisite graph around the selected concept. Prerequisites
            point toward the selected concept and its direct dependants.
          </desc>
          <defs>
            <marker
              id="knowledge-arrow"
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" />
            </marker>
          </defs>
          {edges.map((edge) => (
            <line
              className="knowledge-graph-edge"
              key={edge.key}
              x1={edge.from.x}
              y1={edge.from.y}
              x2={edge.to.x}
              y2={edge.to.y}
              markerEnd="url(#knowledge-arrow)"
            />
          ))}
          {[...positions].map(([id, position]) => {
            const concept = knowledgeConceptById.get(id);
            if (concept === undefined) return null;
            const isCurrent = id === conceptId;
            return (
              <g
                className={`knowledge-graph-node ${isCurrent ? "knowledge-graph-node-current" : ""}`}
                key={id}
                role="button"
                tabIndex={0}
                aria-label={`Open ${concept.name}`}
                onClick={() => onSelect(id)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onSelect(id);
                  }
                }}
                transform={`translate(${position.x}, ${position.y})`}
              >
                <rect x="-105" y="-25" width="210" height="50" rx="12" />
                <text x="0" y="-3" textAnchor="middle">
                  {truncate(concept.name, 26)}
                </text>
                <text
                  className="knowledge-graph-status"
                  x="0"
                  y="15"
                  textAnchor="middle"
                >
                  {statuses.get(id) ?? "Unseen"}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
      <div className="knowledge-graph-links">
        <p className="muted-text">The same relationships as text:</p>
        <div>
          <strong>Prerequisites:</strong>{" "}
          {ancestors.length === 0
            ? "none"
            : ancestors.map((id) => (
                <button
                  className="knowledge-inline-link"
                  type="button"
                  key={`ancestor-${id}`}
                  onClick={() => onSelect(id)}
                >
                  {knowledgeConceptById.get(id)?.name}
                </button>
              ))}
        </div>
        <div>
          <strong>Unlocks:</strong>{" "}
          {dependants.length === 0
            ? "none yet"
            : dependants.map((id) => (
                <button
                  className="knowledge-inline-link"
                  type="button"
                  key={`dependant-${id}`}
                  onClick={() => onSelect(id)}
                >
                  {knowledgeConceptById.get(id)?.name}
                </button>
              ))}
        </div>
      </div>
    </section>
  );
}

function truncate(value: string, length: number): string {
  return value.length <= length ? value : `${value.slice(0, length - 1)}…`;
}
