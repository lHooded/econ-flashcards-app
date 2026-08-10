import rawDeck from "../../flashcards/MACRO1_master_flashcards.json";
import {
  CARD_KINDS,
  type CardKind,
  type Difficulty,
  type DeckMetadata,
  type Flashcard,
  type FlashcardDeck,
} from "../domain/content";

const EXPECTED_CHAPTERS = new Set(Array.from({ length: 11 }, (_, index) => index));
const EXPECTED_DIFFICULTIES = new Set<Difficulty>([1, 2, 3]);

export function parseDeck(input: unknown): FlashcardDeck {
  if (!isRecord(input)) {
    throw new Error("Deck validation failed: top-level value must be an object.");
  }

  const metadata = parseMetadata(input.metadata);
  if (!Array.isArray(input.cards)) {
    throw new Error("Deck validation failed: cards must be an array.");
  }

  const cards = input.cards.map((card, index) => parseCard(card, index));
  if (cards.length !== metadata.cardCount) {
    throw new Error(
      `Deck validation failed: metadata.card_count is ${metadata.cardCount}, but ${cards.length} cards were found.`,
    );
  }

  const ids = new Set<string>();
  for (const card of cards) {
    if (ids.has(card.id)) {
      throw new Error(`Deck validation failed: duplicate card ID "${card.id}".`);
    }
    ids.add(card.id);
  }

  return deepFreeze({ metadata, cards });
}

function parseMetadata(value: unknown): DeckMetadata {
  if (!isRecord(value)) {
    throw new Error("Deck validation failed: metadata must be an object.");
  }

  const exam = requireRecord(value.exam, "metadata.exam");
  const metadata = {
    title: requireString(value.title, "metadata.title"),
    version: requireString(value.version, "metadata.version"),
    generatedFrom: requireString(value.generated_from, "metadata.generated_from"),
    cardCount: requireInteger(value.card_count, "metadata.card_count"),
    chapterNames: parseStringRecord(value.chapter_names, "metadata.chapter_names"),
    exam: {
      format: requireString(exam.format, "metadata.exam.format"),
      durationMinutes: requireInteger(
        exam.duration_minutes,
        "metadata.exam.duration_minutes",
      ),
      readingMinutes: requireInteger(
        exam.reading_minutes,
        "metadata.exam.reading_minutes",
      ),
      writingMinutes: requireInteger(
        exam.writing_minutes,
        "metadata.exam.writing_minutes",
      ),
      scope: requireString(exam.scope, "metadata.exam.scope"),
      allowedMaterials: requireString(
        exam.allowed_materials,
        "metadata.exam.allowed_materials",
      ),
    },
    schema: parseStringRecord(value.schema, "metadata.schema"),
    recommendedAppModes: parseStringArray(
      value.recommended_app_modes,
      "metadata.recommended_app_modes",
    ),
  } satisfies DeckMetadata;

  if (metadata.cardCount < 0) {
    throw new Error("Deck validation failed: metadata.card_count cannot be negative.");
  }

  return metadata;
}

function parseCard(value: unknown, index: number): Flashcard {
  const path = `cards[${index}]`;
  const card = requireRecord(value, path);
  const chapter = requireInteger(card.chapter, `${path}.chapter`);
  if (!EXPECTED_CHAPTERS.has(chapter)) {
    throw new Error(`${path}.chapter must be an integer from 0 through 10.`);
  }

  const kindValue = requireString(card.kind, `${path}.kind`);
  if (!CARD_KINDS.includes(kindValue as CardKind)) {
    throw new Error(`${path}.kind has unsupported value "${kindValue}".`);
  }

  const difficulty = requireInteger(card.difficulty, `${path}.difficulty`);
  if (!EXPECTED_DIFFICULTIES.has(difficulty as Difficulty)) {
    throw new Error(`${path}.difficulty must be 1, 2, or 3.`);
  }

  const choices =
    card.choices === undefined
      ? undefined
      : parseStringArray(card.choices, `${path}.choices`);
  const correctChoice =
    card.correct_choice === undefined
      ? undefined
      : requireInteger(card.correct_choice, `${path}.correct_choice`);

  if ((choices === undefined) !== (correctChoice === undefined)) {
    throw new Error(
      `${path} must provide both choices and correct_choice, or neither.`,
    );
  }

  if (choices !== undefined && correctChoice !== undefined) {
    if (choices.length < 2) {
      throw new Error(`${path}.choices must contain at least two choices.`);
    }
    if (correctChoice < 0 || correctChoice >= choices.length) {
      throw new Error(
        `${path}.correct_choice must reference an existing choice index.`,
      );
    }
  }

  return {
    id: requireString(card.id, `${path}.id`),
    chapter,
    topic: requireString(card.topic, `${path}.topic`),
    kind: kindValue as CardKind,
    front: requireString(card.front, `${path}.front`),
    answer: requireString(card.answer, `${path}.answer`),
    explanation: requireString(card.explanation, `${path}.explanation`),
    commonTrap: requireString(card.common_trap, `${path}.common_trap`),
    difficulty: difficulty as Difficulty,
    tags: parseStringArray(card.tags, `${path}.tags`),
    sources: parseStringArray(card.sources, `${path}.sources`),
    ...(choices === undefined ? {} : { choices, correctChoice }),
  };
}

function requireRecord(value: unknown, path: string): Record<string, unknown> {
  if (!isRecord(value)) {
    throw new Error(`Deck validation failed: ${path} must be an object.`);
  }
  return value;
}

function requireString(value: unknown, path: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`Deck validation failed: ${path} must be a non-empty string.`);
  }
  return value;
}

function requireInteger(value: unknown, path: string): number {
  if (typeof value !== "number" || !Number.isInteger(value)) {
    throw new Error(`Deck validation failed: ${path} must be an integer.`);
  }
  return value;
}

function parseStringArray(value: unknown, path: string): string[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error(`Deck validation failed: ${path} must be a non-empty array.`);
  }

  return value.map((entry, index) => requireString(entry, `${path}[${index}]`));
}

function parseStringRecord(value: unknown, path: string): Record<string, string> {
  const record = requireRecord(value, path);
  return Object.fromEntries(
    Object.entries(record).map(([key, entry]) => [
      key,
      requireString(entry, `${path}.${key}`),
    ]),
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function deepFreeze<T>(value: T): T {
  if (typeof value !== "object" || value === null) {
    return value;
  }

  Object.freeze(value);
  for (const nested of Object.values(value as Record<string, unknown>)) {
    deepFreeze(nested);
  }
  return value;
}

export const deck = parseDeck(rawDeck);
export const cards = deck.cards;
export const cardIds: ReadonlySet<string> = new Set(cards.map((card) => card.id));
