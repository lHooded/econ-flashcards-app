import type { KnowledgeConceptStatus } from "../../knowledge/model";

const labels: Readonly<Record<KnowledgeConceptStatus, string>> = {
  unseen: "Unseen",
  learning: "Learning",
  "needs-work": "Needs work",
  solid: "Solid",
};

export function ConceptStatus({ status }: { readonly status: KnowledgeConceptStatus }) {
  return (
    <span className={`concept-status concept-status-${status}`}>{labels[status]}</span>
  );
}
