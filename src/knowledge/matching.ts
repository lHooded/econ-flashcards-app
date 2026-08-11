import { knowledgeConcepts } from "./data";
import type { KnowledgeConcept, KnowledgeTermMatch } from "./model";

interface AliasEntry {
  readonly alias: string;
  readonly conceptIds: readonly string[];
}

interface TrieNode {
  readonly children: Map<string, TrieNode>;
  readonly entries: AliasEntry[];
}

const INLINE_STOPWORDS = new Set([
  "a",
  "an",
  "as",
  "at",
  "be",
  "by",
  "if",
  "in",
  "is",
  "it",
  "of",
  "on",
  "or",
  "to",
]);

export interface KnowledgeMatcher {
  readonly aliases: readonly string[];
  readonly ambiguousAliases: ReadonlyMap<string, readonly string[]>;
  readonly findTerms: (text: string) => readonly KnowledgeTermMatch[];
  readonly resolve: (term: string) => readonly string[];
}

export const knowledgeMatcher = buildKnowledgeMatcher(knowledgeConcepts);

export function buildKnowledgeMatcher(
  concepts: readonly Pick<KnowledgeConcept, "id" | "name" | "aliases">[],
): KnowledgeMatcher {
  const conceptsByAlias = new Map<string, Set<string>>();
  const displayAliasByCanonical = new Map<string, string>();
  for (const concept of concepts) {
    for (const alias of [concept.name, ...concept.aliases]) {
      const canonical = canonicalise(alias);
      if (
        canonical.trim().length < 2 ||
        INLINE_STOPWORDS.has(canonical.trim()) ||
        !/[a-z\d]/i.test(canonical)
      ) {
        continue;
      }
      const ids = conceptsByAlias.get(canonical) ?? new Set<string>();
      ids.add(concept.id);
      conceptsByAlias.set(canonical, ids);
      displayAliasByCanonical.set(canonical, alias);
    }
  }

  const root: TrieNode = { children: new Map(), entries: [] };
  const ambiguousAliases = new Map<string, readonly string[]>();
  const aliases = [...conceptsByAlias.keys()].sort(compareAliasLength);
  for (const canonicalAlias of aliases) {
    const ids = [...(conceptsByAlias.get(canonicalAlias) ?? [])].sort(compareIds);
    if (ids.length > 1) {
      ambiguousAliases.set(
        displayAliasByCanonical.get(canonicalAlias) ?? canonicalAlias,
        ids,
      );
    }
    let node = root;
    for (const character of canonicalAlias) {
      const next = node.children.get(character) ?? { children: new Map(), entries: [] };
      node.children.set(character, next);
      node = next;
    }
    node.entries.push({
      alias: displayAliasByCanonical.get(canonicalAlias) ?? canonicalAlias,
      conceptIds: Object.freeze(ids),
    });
  }

  return {
    aliases: Object.freeze(
      aliases.map((alias) => displayAliasByCanonical.get(alias) ?? alias),
    ),
    ambiguousAliases,
    findTerms: (text) => findTerms(root, text),
    resolve: (term) =>
      Object.freeze(
        [...(conceptsByAlias.get(canonicalise(term)) ?? [])].sort(compareIds),
      ),
  };
}

function findTerms(root: TrieNode, text: string): readonly KnowledgeTermMatch[] {
  const canonicalText = canonicalisePreservingLength(text);
  const matches: KnowledgeTermMatch[] = [];
  let index = 0;

  while (index < canonicalText.length) {
    let node: TrieNode | undefined = root;
    let cursor = index;
    let best: { end: number; entry: AliasEntry } | undefined;

    while (node !== undefined && cursor < canonicalText.length) {
      node = node.children.get(canonicalText[cursor]);
      cursor += 1;
      if (
        node !== undefined &&
        node.entries.length > 0 &&
        hasBoundaries(canonicalText, index, cursor)
      ) {
        const entry = [...node.entries].sort((left, right) =>
          compareIds(left.alias, right.alias),
        )[0];
        best = { end: cursor, entry };
      }
    }

    if (best === undefined) {
      index += 1;
      continue;
    }

    matches.push({
      conceptId: best.entry.conceptIds.length === 1 ? best.entry.conceptIds[0] : null,
      conceptIds: best.entry.conceptIds,
      alias: text.slice(index, best.end),
      start: index,
      end: best.end,
    });
    index = best.end;
  }

  return Object.freeze(matches);
}

function canonicalise(value: string): string {
  return canonicalisePreservingLength(value).replace(/ +/g, " ").trim();
}

function canonicalisePreservingLength(value: string): string {
  return value
    .toLocaleLowerCase("en-AU")
    .split("")
    .map((character) => (/[a-z\d]/i.test(character) ? character : " "))
    .join("");
}

function hasBoundaries(text: string, start: number, end: number): boolean {
  const first = text[start] ?? " ";
  const last = text[end - 1] ?? " ";
  const before = text[start - 1] ?? " ";
  const after = text[end] ?? " ";
  const startsWord = /[a-z\d]/i.test(first);
  const endsWord = /[a-z\d]/i.test(last);
  return (
    !(startsWord && /[a-z\d]/i.test(before)) && !(endsWord && /[a-z\d]/i.test(after))
  );
}

function compareAliasLength(left: string, right: string): number {
  return right.length - left.length || compareIds(left, right);
}

function compareIds(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}
