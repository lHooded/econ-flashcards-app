export const CARD_KINDS = [
  "recall",
  "formula",
  "calculation",
  "scenario",
  "relationship",
  "contrast",
  "sequence",
  "classification",
  "mcq",
  "exam-trap",
] as const;

export type CardKind = (typeof CARD_KINDS)[number];
export type Difficulty = 1 | 2 | 3;

export interface Flashcard {
  readonly id: string;
  readonly chapter: number;
  readonly topic: string;
  readonly kind: CardKind;
  readonly front: string;
  readonly answer: string;
  readonly explanation: string;
  readonly commonTrap: string;
  readonly difficulty: Difficulty;
  readonly tags: readonly string[];
  readonly sources: readonly string[];
  readonly choices?: readonly string[];
  readonly correctChoice?: number;
}

export interface DeckMetadata {
  readonly title: string;
  readonly version: string;
  readonly generatedFrom: string;
  readonly cardCount: number;
  readonly chapterNames: Readonly<Record<string, string>>;
  readonly exam: {
    readonly format: string;
    readonly durationMinutes: number;
    readonly readingMinutes: number;
    readonly writingMinutes: number;
    readonly scope: string;
    readonly allowedMaterials: string;
  };
  readonly schema: Readonly<Record<string, string>>;
  readonly recommendedAppModes: readonly string[];
}

export interface FlashcardDeck {
  readonly metadata: DeckMetadata;
  readonly cards: readonly Flashcard[];
}
