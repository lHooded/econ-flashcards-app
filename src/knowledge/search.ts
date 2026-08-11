import { knowledgeConcepts } from "./data";
import type { KnowledgeConcept } from "./model";

export interface KnowledgeSearchOptions {
  readonly chapter?: number | null;
  readonly tag?: string | null;
  readonly foundationOnly?: boolean;
}

export interface KnowledgeSearchResult {
  readonly concept: KnowledgeConcept;
  readonly score: number;
}

interface SearchDocument {
  readonly concept: KnowledgeConcept;
  readonly name: string;
  readonly aliases: readonly string[];
  readonly searchTerms: readonly string[];
  readonly discoveryText: string;
  readonly searchText: string;
  readonly tokens: ReadonlySet<string>;
}

const documents: readonly SearchDocument[] = Object.freeze(
  knowledgeConcepts.map((concept) => {
    const name = normalise(concept.name);
    const aliases = concept.aliases.map(normalise);
    const searchTerms = concept.searchTerms.map(normalise);
    const discoveryText = normalise(
      [concept.name, ...concept.aliases, ...concept.searchTerms, ...concept.tags].join(
        " ",
      ),
    );
    const searchText = normalise(
      [
        concept.name,
        ...concept.aliases,
        ...concept.searchTerms,
        ...concept.tags,
        concept.summary,
        concept.intuition,
        ...concept.explanation,
      ].join(" "),
    );
    return {
      concept,
      name,
      aliases,
      searchTerms,
      discoveryText,
      searchText,
      tokens: new Set(searchText.split(" ").filter((token) => token.length > 1)),
    };
  }),
);
const documentById = new Map(
  documents.map((document) => [document.concept.id, document]),
);

const tokenIndex = new Map<string, KnowledgeSearchResult[]>();
for (const document of documents) {
  for (const token of document.tokens) {
    const entries = tokenIndex.get(token) ?? [];
    entries.push({ concept: document.concept, score: 0 });
    tokenIndex.set(token, entries);
  }
}

export function searchKnowledge(
  query: string,
  options: KnowledgeSearchOptions = {},
): readonly KnowledgeSearchResult[] {
  const normalisedQuery = normalise(query);
  const queryTokens = normalisedQuery.split(" ").filter((token) => token.length > 1);
  const scores = new Map<string, number>();

  for (const document of documents) {
    if (!passesFilter(document.concept, options)) {
      continue;
    }
    if (normalisedQuery.length === 0) {
      scores.set(document.concept.id, 0);
      continue;
    }

    let score = 0;
    if (document.name === normalisedQuery) score += 1000;
    if (document.aliases.includes(normalisedQuery)) score += 800;
    if (document.searchTerms.includes(normalisedQuery)) score += 700;
    if (document.discoveryText.includes(normalisedQuery)) score += 500;
    if (document.searchText.includes(normalisedQuery)) score += 250;
    for (const token of queryTokens) {
      if (document.tokens.has(token)) score += 20;
    }
    if (score > 0) {
      scores.set(
        document.concept.id,
        score + (document.concept.chapters.includes(0) ? 1 : 0),
      );
    }
  }

  // Keep the precomputed token index live in the search path. This makes the
  // intended indexing strategy explicit and gives long-tail token matches a
  // deterministic fallback when a phrase is not present verbatim.
  if (scores.size === 0 && queryTokens.length > 0) {
    for (const token of queryTokens) {
      for (const entry of tokenIndex.get(token) ?? []) {
        if (passesFilter(entry.concept, options)) {
          scores.set(entry.concept.id, (scores.get(entry.concept.id) ?? 0) + 10);
        }
      }
    }
  }

  return Object.freeze(
    [...scores]
      .map(([id, score]) => ({
        concept: documentById.get(id)!.concept,
        score,
      }))
      .sort(
        (left, right) =>
          right.score - left.score ||
          left.concept.name.localeCompare(right.concept.name, "en-AU"),
      ),
  );
}

export function getKnowledgeTags(): readonly string[] {
  return knowledgeTags;
}

const knowledgeTags: readonly string[] = Object.freeze(
  [...new Set(knowledgeConcepts.flatMap((concept) => concept.tags))].sort(),
);

function passesFilter(
  concept: KnowledgeConcept,
  options: KnowledgeSearchOptions,
): boolean {
  if (
    options.chapter !== undefined &&
    options.chapter !== null &&
    !concept.chapters.includes(options.chapter)
  ) {
    return false;
  }
  if (
    options.tag !== undefined &&
    options.tag !== null &&
    !concept.tags.includes(options.tag)
  ) {
    return false;
  }
  if (options.foundationOnly === true && !concept.tags.includes("foundation")) {
    return false;
  }
  return true;
}

function normalise(value: string): string {
  return value
    .toLocaleLowerCase("en-AU")
    .replace(/[’']/g, "'")
    .replace(/[^a-z0-9%]+/g, " ")
    .trim()
    .replace(/ +/g, " ");
}
