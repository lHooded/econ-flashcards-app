import type { Flashcard } from "../domain/content";
import type { ExamSrsCardState } from "./examSrs/model";

export const STUDY_PRESETS = [
  "smart",
  "needs_work",
  "new",
  "due",
  "calculations",
  "mcq",
  "high_yield",
] as const;

export type StudyPreset = (typeof STUDY_PRESETS)[number];

export interface StudyScope {
  readonly preset: StudyPreset;
  readonly chapter: number | null;
}

export const DEFAULT_STUDY_SCOPE: StudyScope = Object.freeze({
  preset: "smart",
  chapter: null,
});

export interface StudyPresetOption {
  readonly value: StudyPreset;
  readonly label: string;
  readonly description: string;
}

export const STUDY_PRESET_OPTIONS: readonly StudyPresetOption[] = [
  {
    value: "smart",
    label: "Smart",
    description: "Exam-SRS chooses from everything due or unseen.",
  },
  {
    value: "needs_work",
    label: "Needs work",
    description: "Due Relearning, Weak, and Learning cards only.",
  },
  {
    value: "new",
    label: "New",
    description: "Unseen cards only.",
  },
  {
    value: "due",
    label: "Due",
    description: "Scheduled reviews only; no new material.",
  },
  {
    value: "calculations",
    label: "Calculations",
    description: "Calculation cards only.",
  },
  {
    value: "mcq",
    label: "MCQs",
    description: "Existing authored multiple-choice cards only.",
  },
  {
    value: "high_yield",
    label: "High yield",
    description: "Cards tagged high-yield.",
  },
];

export function isStudyPreset(value: unknown): value is StudyPreset {
  return typeof value === "string" && STUDY_PRESETS.includes(value as StudyPreset);
}

/**
 * Parses only the small, shareable study query state. Invalid values are
 * deliberately harmless: they fall back to Smart and All chapters.
 */
export function parseStudyScopeQuery(query: string): StudyScope {
  let params: URLSearchParams;
  try {
    params = new URLSearchParams(query);
  } catch {
    return DEFAULT_STUDY_SCOPE;
  }

  const presetValue = params.get("preset");
  const chapterValue = params.get("chapter");

  return {
    preset: isStudyPreset(presetValue) ? presetValue : "smart",
    chapter: parseChapterValue(chapterValue),
  };
}

export function buildStudyHash(scope: StudyScope): string {
  const params = new URLSearchParams();
  if (scope.preset !== "smart") {
    params.set("preset", scope.preset);
  }
  if (scope.chapter !== null) {
    params.set("chapter", String(scope.chapter));
  }

  const query = params.toString();
  return `#/study${query === "" ? "" : `?${query}`}`;
}

export function getStudyPresetLabel(preset: StudyPreset): string {
  return (
    STUDY_PRESET_OPTIONS.find((option) => option.value === preset)?.label ?? "Smart"
  );
}

export function getStudyPresetDescription(preset: StudyPreset): string {
  return (
    STUDY_PRESET_OPTIONS.find((option) => option.value === preset)?.description ??
    STUDY_PRESET_OPTIONS[0].description
  );
}

export function getChapterName(
  chapter: number,
  chapterNames?: Readonly<Record<string, string>>,
): string {
  return (
    chapterNames?.[String(chapter)] ??
    (chapter === 0 ? "Mixed exam discrimination" : `Chapter ${chapter}`)
  );
}

export function getChapterLabel(
  chapter: number,
  chapterNames?: Readonly<Record<string, string>>,
): string {
  return `Chapter ${chapter} · ${getChapterName(chapter, chapterNames)}`;
}

export function getStudyScopeLabel(
  scope: StudyScope,
  chapterNames?: Readonly<Record<string, string>>,
): string {
  const chapterLabel =
    scope.chapter === null
      ? "All chapters"
      : getChapterLabel(scope.chapter, chapterNames);
  return `${getStudyPresetLabel(scope.preset)} · ${chapterLabel}`;
}

/**
 * Returns the content/chapter part of a scope without applying learning state.
 * This lets the UI distinguish an empty canonical focus from a focus whose
 * matching cards have simply been seen or are not due yet.
 */
export function contentMatchesStudyScope(card: Flashcard, scope: StudyScope): boolean {
  if (scope.chapter !== null && card.chapter !== scope.chapter) {
    return false;
  }

  switch (scope.preset) {
    case "calculations":
      return card.kind === "calculation";
    case "mcq":
      return hasAuthoredMcq(card);
    case "high_yield":
      return card.tags.includes("high-yield");
    case "smart":
    case "needs_work":
    case "new":
    case "due":
      return true;
  }
}

/**
 * Returns the candidate-pool restriction for a preset. Normal unseen/due
 * eligibility is still applied by the Exam-SRS selector after this filter.
 */
export function matchesStudyScope(
  card: Flashcard,
  state: ExamSrsCardState | undefined,
  scope: StudyScope,
): boolean {
  if (!contentMatchesStudyScope(card, scope)) {
    return false;
  }

  switch (scope.preset) {
    case "smart":
    case "calculations":
    case "mcq":
    case "high_yield":
      return true;
    case "needs_work":
      return (
        state?.learningState === "relearning" ||
        state?.learningState === "weak" ||
        state?.learningState === "learning"
      );
    case "new":
      return state?.learningState === "unseen";
    case "due":
      return state !== undefined && state.learningState !== "unseen";
  }
}

export function hasAuthoredMcq(card: Flashcard): boolean {
  const correctChoice = card.correctChoice;
  return (
    card.choices !== undefined &&
    typeof correctChoice === "number" &&
    Number.isInteger(correctChoice) &&
    correctChoice >= 0 &&
    correctChoice < card.choices.length
  );
}

function parseChapterValue(value: string | null): number | null {
  if (value === null || value === "all") {
    return null;
  }

  if (!/^(?:0|[1-9]|10)$/.test(value)) {
    return null;
  }

  const chapter = Number(value);
  return chapter >= 0 && chapter <= 10 ? chapter : null;
}
