import { knowledgeConceptById, knowledgeConcepts } from "./data";
import type { KnowledgeConcept } from "./model";

export const prerequisiteDependantsById: ReadonlyMap<string, readonly string[]> =
  buildReverseEdges();
export const prerequisiteTopologicalOrder: readonly string[] = buildTopologicalOrder();
export const prerequisiteDepthById: ReadonlyMap<string, number> = buildDepths();
export const prerequisiteRootIds: readonly string[] = Object.freeze(
  prerequisiteTopologicalOrder.filter(
    (id) => (knowledgeConceptById.get(id)?.prerequisites.length ?? 0) === 0,
  ),
);

export function getConcept(id: string): KnowledgeConcept | undefined {
  return knowledgeConceptById.get(id);
}

export function getPrerequisiteAncestors(id: string): readonly string[] {
  const visited = new Set<string>();
  const visit = (conceptId: string) => {
    for (const prerequisiteId of knowledgeConceptById.get(conceptId)?.prerequisites ??
      []) {
      if (!visited.has(prerequisiteId)) {
        visited.add(prerequisiteId);
        visit(prerequisiteId);
      }
    }
  };
  visit(id);
  return Object.freeze(
    prerequisiteTopologicalOrder.filter((conceptId) => visited.has(conceptId)),
  );
}

export function getDirectDependants(id: string): readonly string[] {
  return prerequisiteDependantsById.get(id) ?? [];
}

export function getDescendants(id: string): readonly string[] {
  const visited = new Set<string>();
  const queue = [...(prerequisiteDependantsById.get(id) ?? [])];
  while (queue.length > 0) {
    const next = queue.shift();
    if (next === undefined || visited.has(next)) {
      continue;
    }
    visited.add(next);
    queue.push(...(prerequisiteDependantsById.get(next) ?? []));
  }
  return Object.freeze(
    prerequisiteTopologicalOrder.filter((conceptId) => visited.has(conceptId)),
  );
}

export function getLearningPath(id: string): readonly string[] {
  if (!knowledgeConceptById.has(id)) {
    return [];
  }
  return Object.freeze([...getPrerequisiteAncestors(id), id]);
}

/**
 * Returns one short, deterministic downstream path. It is intentionally a
 * teaching aid rather than a promise that every descendant must be studied.
 */
export function getWhyPath(id: string, maximumLength = 4): readonly string[] {
  const path = [id];
  let current = id;
  while (path.length < maximumLength) {
    const next = (prerequisiteDependantsById.get(current) ?? [])[0];
    if (next === undefined) {
      break;
    }
    path.push(next);
    current = next;
  }
  return Object.freeze(path);
}

function buildReverseEdges(): ReadonlyMap<string, readonly string[]> {
  const reverse = new Map<string, string[]>();
  for (const concept of knowledgeConcepts) {
    reverse.set(concept.id, []);
  }
  for (const concept of knowledgeConcepts) {
    for (const prerequisiteId of concept.prerequisites) {
      const dependants = reverse.get(prerequisiteId);
      if (dependants === undefined) {
        throw new Error(
          `Knowledge graph references missing prerequisite "${prerequisiteId}".`,
        );
      }
      dependants.push(concept.id);
    }
  }
  return new Map(
    [...reverse].map(([id, dependants]) => [
      id,
      Object.freeze([...dependants].sort(compareIds)),
    ]),
  );
}

function buildTopologicalOrder(): readonly string[] {
  const indegree = new Map(
    knowledgeConcepts.map((concept) => [concept.id, concept.prerequisites.length]),
  );
  const ready = knowledgeConcepts
    .filter((concept) => (indegree.get(concept.id) ?? 0) === 0)
    .map((concept) => concept.id)
    .sort(compareIds);
  const order: string[] = [];

  while (ready.length > 0) {
    const id = ready.shift();
    if (id === undefined) {
      continue;
    }
    order.push(id);
    for (const dependantId of prerequisiteDependantsById.get(id) ?? []) {
      const nextIndegree = (indegree.get(dependantId) ?? 0) - 1;
      indegree.set(dependantId, nextIndegree);
      if (nextIndegree === 0) {
        ready.push(dependantId);
        ready.sort(compareIds);
      }
    }
  }

  if (order.length !== knowledgeConcepts.length) {
    const remaining = knowledgeConcepts
      .map((concept) => concept.id)
      .filter((id) => !order.includes(id));
    throw new Error(
      `Knowledge prerequisite graph contains a cycle: ${remaining.join(", ")}.`,
    );
  }
  return Object.freeze(order);
}

function buildDepths(): ReadonlyMap<string, number> {
  const depths = new Map<string, number>();
  for (const id of prerequisiteTopologicalOrder) {
    const concept = knowledgeConceptById.get(id);
    const prerequisiteDepth =
      concept?.prerequisites.map((prerequisiteId) => depths.get(prerequisiteId) ?? 0) ??
      [];
    depths.set(
      id,
      prerequisiteDepth.length === 0 ? 0 : Math.max(...prerequisiteDepth) + 1,
    );
  }
  return depths;
}

function compareIds(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}
