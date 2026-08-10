import {
  getChapterLabel,
  getStudyPresetDescription,
  getStudyPresetLabel,
  getStudyScopeLabel,
  STUDY_PRESET_OPTIONS,
  type StudyScope,
} from "../study/studyScope";
import type { ScopedStudyCounts } from "../study/scopedSelector";

interface StudyFocusControlsProps {
  readonly scope: StudyScope;
  readonly counts: ScopedStudyCounts;
  readonly chapterNames: Readonly<Record<string, string>>;
  readonly onScopeChange: (scope: StudyScope) => void;
}

export function StudyFocusControls({
  scope,
  counts,
  chapterNames,
  onScopeChange,
}: StudyFocusControlsProps) {
  return (
    <section className="study-focus-panel panel" aria-labelledby="study-focus-title">
      <div className="study-focus-copy">
        <p className="section-kicker">Study focus</p>
        <h2 id="study-focus-title">{getStudyScopeLabel(scope, chapterNames)}</h2>
        <p className="focus-counts" aria-live="polite">
          {counts.matchingCount} matching{" "}
          {counts.matchingCount === 1 ? "card" : "cards"} · {counts.unseenCount} unseen
          · {counts.dueNowCount} due now
        </p>
      </div>

      <div className="study-focus-controls">
        <label className="focus-select-label">
          <span>Preset</span>
          <select
            aria-label="Study preset"
            value={scope.preset}
            onChange={(event) =>
              onScopeChange({
                preset: event.target.value as StudyScope["preset"],
                chapter: scope.chapter,
              })
            }
          >
            {STUDY_PRESET_OPTIONS.map((option) => (
              <option value={option.value} key={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="focus-select-label">
          <span>Chapter</span>
          <select
            aria-label="Study chapter"
            value={scope.chapter === null ? "all" : String(scope.chapter)}
            onChange={(event) =>
              onScopeChange({
                preset: scope.preset,
                chapter:
                  event.target.value === "all" ? null : Number(event.target.value),
              })
            }
          >
            <option value="all">All chapters</option>
            {Array.from({ length: 11 }, (_, chapter) => (
              <option value={chapter} key={chapter}>
                {getChapterLabel(chapter, chapterNames)}
              </option>
            ))}
          </select>
        </label>
      </div>

      <details className="focus-help">
        <summary>Focus guide</summary>
        <div className="focus-help-list">
          {STUDY_PRESET_OPTIONS.map((option) => (
            <p key={option.value}>
              <strong>{getStudyPresetLabel(option.value)}.</strong>{" "}
              {getStudyPresetDescription(option.value)}
            </p>
          ))}
        </div>
      </details>
    </section>
  );
}
