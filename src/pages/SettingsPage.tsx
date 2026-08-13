import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { useProgress } from "../app/progressContext";
import { useSync } from "../app/syncContext";
import { SyncPanel } from "../components/sync/SyncPanel";
import { examQuestions } from "../exam/questionBank";
import { cards } from "../data/deck";
import { parseProgressBackupText } from "../domain/backup";
import {
  manualLearnedKey,
  type ManualLearnedKind,
  type ManualLearnedOverride,
} from "../domain/manualLearned";
import { knowledgeConceptById } from "../knowledge/data";
import { type AppSettings } from "../domain/progress";
import {
  formatLocalDateTime,
  getStudyDeadline,
  localDateTimeInputToIso,
  toLocalDateTimeInputValue,
} from "../utils/date";
import { reviewableProgressIds } from "../knowledge/guided/registry";

export function SettingsPage({
  initialPairingCode,
}: {
  readonly initialPairingCode?: string | null;
}) {
  const {
    snapshot,
    saveSettings,
    exportProgress,
    replaceProgress,
    resetProgress,
    restoreManualLearned: restoreManualLearnedFromContext,
  } = useProgress();
  const restoreManualLearned =
    restoreManualLearnedFromContext ??
    (async () => {
      throw new Error("Manual learned settings are unavailable in this view.");
    });
  const { status: syncStatus } = useSync();
  const fileInput = useRef<HTMLInputElement>(null);
  const [examAt, setExamAt] = useState("");
  const [bufferHours, setBufferHours] = useState("24");
  const [formMessage, setFormMessage] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [dataMessage, setDataMessage] = useState<string | null>(null);
  const [dataError, setDataError] = useState<string | null>(null);
  const [restoringKey, setRestoringKey] = useState<string | null>(null);
  const savedExamAt = snapshot?.settings.examAt ?? null;
  const savedBufferHours = snapshot?.settings.studyBufferHours ?? 24;

  useEffect(() => {
    setExamAt(toLocalDateTimeInputValue(savedExamAt));
    setBufferHours(String(savedBufferHours));
  }, [savedBufferHours, savedExamAt]);

  if (snapshot === null) {
    return null;
  }

  const currentDeadline = getStudyDeadline(
    snapshot.settings.examAt,
    snapshot.settings.studyBufferHours,
  );

  const restore = async (override: ManualLearnedOverride) => {
    const key = manualLearnedKey(override.kind, override.targetId);
    setRestoringKey(key);
    setDataError(null);
    try {
      await restoreManualLearned(override.kind, override.targetId);
      setDataMessage(
        "Manual learned item restored. Its previous review history remains intact.",
      );
    } catch (error: unknown) {
      setDataError(
        error instanceof Error ? error.message : "The item could not be restored.",
      );
    } finally {
      setRestoringKey(null);
    }
  };

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormMessage(null);
    setFormError(null);

    const parsedBuffer = Number(bufferHours);
    if (!Number.isFinite(parsedBuffer) || parsedBuffer < 0) {
      setFormError("Study buffer must be a non-negative number of hours.");
      return;
    }

    try {
      const settings: AppSettings = {
        examAt: localDateTimeInputToIso(examAt),
        studyBufferHours: parsedBuffer,
      };
      await saveSettings(settings);
      setFormMessage("Exam target saved on this device.");
    } catch (error: unknown) {
      setFormError(
        error instanceof Error ? error.message : "Settings could not be saved.",
      );
    }
  };

  const downloadBackup = () => {
    setDataError(null);
    setDataMessage(null);
    try {
      const blob = new Blob([exportProgress()], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `econ-flashcards-progress-${new Date()
        .toISOString()
        .slice(0, 10)}.json`;
      document.body.append(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      setDataMessage("Progress backup downloaded.");
    } catch (error: unknown) {
      setDataError(
        error instanceof Error ? error.message : "Backup could not be exported.",
      );
    }
  };

  const importBackup = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file === undefined) {
      return;
    }

    setDataError(null);
    setDataMessage(null);
    try {
      const backup = parseProgressBackupText(
        await file.text(),
        reviewableProgressIds,
        new Set(examQuestions.map((question) => question.id)),
      );
      if (
        !window.confirm(
          "Replace all progress and settings on this device with this backup? This cannot be undone.",
        )
      ) {
        return;
      }
      await replaceProgress(backup);
      setDataMessage("Backup imported. Your local progress has been replaced.");
    } catch (error: unknown) {
      setDataError(
        error instanceof Error ? error.message : "Backup could not be imported.",
      );
    }
  };

  const reset = async () => {
    setDataError(null);
    setDataMessage(null);
    if (
      !window.confirm(
        syncStatus.connected
          ? "Reset local progress and disconnect this device? The remote cloud copy will remain. This also clears manual learned overrides and cannot be undone unless you have an export."
          : "Delete every review, card state, exam setting, Guided lesson acknowledgement, manual learned override, and mock history stored on this device? This cannot be undone unless you have an export.",
      )
    ) {
      return;
    }

    try {
      await resetProgress();
      setDataMessage(
        "Local progress, settings, Guided lesson acknowledgements, manual learned overrides, and mock history were reset.",
      );
    } catch (error: unknown) {
      setDataError(
        error instanceof Error ? error.message : "Progress could not be reset.",
      );
    }
  };

  return (
    <div className="page-stack">
      <section className="page-heading">
        <div>
          <p className="eyebrow">Settings / Data</p>
          <h1>Set the target. Keep the data portable.</h1>
          <p className="lede">
            Progress is stored locally first. Optional encrypted sync can merge progress
            across your devices; JSON export remains available as a manual backup.
          </p>
        </div>
      </section>

      <section className="settings-grid">
        <form className="panel form-panel" onSubmit={save}>
          <div className="panel-heading">
            <p className="section-kicker">Exam target</p>
            <h2>Give the cram window an end point.</h2>
          </div>
          <label className="field-label" htmlFor="exam-at">
            Exam date and time
            <input
              id="exam-at"
              type="datetime-local"
              value={examAt}
              onChange={(event) => setExamAt(event.target.value)}
            />
          </label>
          <p className="field-help">
            Leave blank if you do not want to configure an exam yet. The value uses your
            browser’s local timezone.
          </p>
          <label className="field-label" htmlFor="buffer-hours">
            Deliberate study buffer (hours)
            <input
              id="buffer-hours"
              type="number"
              min="0"
              step="1"
              inputMode="numeric"
              value={bufferHours}
              onChange={(event) => setBufferHours(event.target.value)}
            />
          </label>
          <p className="field-help">
            Default: 24 hours. Exam-SRS aims to bring cards to its current learning
            criterion by the effective deadline, leaving this buffer before the actual
            exam.
          </p>
          <div className="computed-deadline">
            <span>Current effective study deadline</span>
            <strong>{formatLocalDateTime(currentDeadline)}</strong>
          </div>
          <button className="primary-button" type="submit">
            Save exam settings
          </button>
          {formMessage && <p className="success-message">{formMessage}</p>}
          {formError && (
            <p className="inline-error" role="alert">
              {formError}
            </p>
          )}
        </form>

        <section className="panel data-panel">
          <div className="panel-heading">
            <p className="section-kicker">Progress backup</p>
            <h2>Take your study history with you.</h2>
          </div>
          <p>
            Export includes settings, card states, review history, Guided lesson
            acknowledgements, manual learned overrides, and mock attempts. It does not
            copy the canonical deck; IDs reconnect the backup to this bundled content.
          </p>
          <div className="data-actions">
            <button className="secondary-button" type="button" onClick={downloadBackup}>
              Export progress JSON
            </button>
            <label className="secondary-button file-button" htmlFor="import-progress">
              Import progress JSON
              <input
                ref={fileInput}
                id="import-progress"
                type="file"
                accept="application/json,.json"
                onChange={importBackup}
              />
            </label>
          </div>
          <p className="field-help">
            Imports are validated first and then replace the current local progress only
            after confirmation.
          </p>
          <ManualLearnedManagement
            overrides={snapshot.manualLearnedOverrides ?? []}
            restoringKey={restoringKey}
            onRestore={(override) => void restore(override)}
          />
          {syncStatus.connected && (
            <p className="field-help">
              While connected, the next sync merges imported review history with the
              remote history; importing an older backup does not delete reviews kept on
              another device. Manual learned overrides are included in backups but are
              local-device-only under sync protocol v1.
            </p>
          )}
          <div className="danger-zone">
            <p className="section-kicker">Danger zone</p>
            <p>
              {syncStatus.connected
                ? "Reset clears local progress and disconnects this device; it does not delete the remote cloud copy. Export first if you may need the local state later."
                : "Reset clears all mutable local state. Export first if you may need it later."}
            </p>
            <button className="danger-button" type="button" onClick={reset}>
              {syncStatus.connected
                ? "Reset local progress and disconnect"
                : "Reset all progress"}
            </button>
          </div>
          {dataMessage && <p className="success-message">{dataMessage}</p>}
          {dataError && (
            <p className="inline-error" role="alert">
              {dataError}
            </p>
          )}
        </section>
      </section>

      <SyncPanel initialPairingCode={initialPairingCode} />

      <section className="callout">
        <div>
          <p className="section-kicker">Architecture note</p>
          <p>
            The flashcards are immutable bundled content. IndexedDB stores only mutable
            progress, reviews, and settings. Exam-SRS derives strength, learning state,
            and due times from that history each time; no due dates or scheduler scores
            are persisted. See the{" "}
            <a
              href="https://github.com/lHooded/econ-flashcards-app/blob/agent/initial-import/docs/EXAM_SRS.md"
              target="_blank"
              rel="noreferrer"
            >
              Exam-SRS documentation
            </a>{" "}
            for the transparent heuristic and its limitations.
          </p>
        </div>
      </section>
    </div>
  );
}

function ManualLearnedManagement({
  overrides,
  restoringKey,
  onRestore,
}: {
  readonly overrides: readonly ManualLearnedOverride[];
  readonly restoringKey: string | null;
  readonly onRestore: (override: ManualLearnedOverride) => void;
}) {
  return (
    <section
      className="manual-learned-management"
      aria-labelledby="manual-learned-title"
    >
      <div className="panel-heading">
        <p className="section-kicker">Manual learned content</p>
        <h3 id="manual-learned-title">Items you explicitly marked as already known.</h3>
      </div>
      <p>
        Listed items are excluded from future study while active. Restoring one removes
        only that source override; previous review history is never erased.
      </p>
      {overrides.length === 0 ? (
        <p className="muted-text">No content has been manually marked learned.</p>
      ) : (
        <div className="manual-learned-groups">
          {(["concept", "card", "question"] as const).map((kind) => {
            const group = overrides.filter((override) => override.kind === kind);
            if (group.length === 0) return null;
            return (
              <section key={kind} aria-labelledby={`manual-learned-${kind}`}>
                <h4 id={`manual-learned-${kind}`}>{manualKindLabel(kind)}</h4>
                <div className="manual-learned-list">
                  {group.map((override) => {
                    const key = manualLearnedKey(override.kind, override.targetId);
                    return (
                      <div className="manual-learned-row" key={key}>
                        <span>
                          <strong>{manualOverrideLabel(override)}</strong>
                          <small>{override.targetId}</small>
                        </span>
                        <button
                          className="secondary-button"
                          type="button"
                          disabled={restoringKey === key}
                          onClick={() => onRestore(override)}
                        >
                          {restoringKey === key ? "Restoring…" : "Restore"}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </section>
  );
}

function manualKindLabel(kind: ManualLearnedKind): string {
  return kind === "concept" ? "Concepts" : kind === "card" ? "Cards" : "Questions";
}

function manualOverrideLabel(override: ManualLearnedOverride): string {
  if (override.kind === "concept") {
    return knowledgeConceptById.get(override.targetId)?.name ?? "Unknown concept";
  }
  if (override.kind === "card") {
    const card = cards.find((candidate) => candidate.id === override.targetId);
    return card === undefined ? "Unknown card" : `Ch. ${card.chapter} · ${card.front}`;
  }
  const question = examQuestions.find(
    (candidate) => candidate.id === override.targetId,
  );
  return question === undefined
    ? "Unknown question"
    : `Ch. ${question.chapter} · ${question.topic} · ${question.stem}`;
}
