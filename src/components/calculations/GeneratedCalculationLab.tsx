import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { NewReviewEvent } from "../../domain/progress";
import {
  buildGeneratedCalculationSet,
  generatedCalculationFingerprint,
  instantiateFreshCalculationVariant,
  type GeneratedCalculationSessionOptions,
} from "../../calculations/session";
import {
  calculationTemplates,
  getGeneratedCalculationTemplate,
} from "../../calculations/templates";
import type { GeneratedCalculationInstance } from "../../calculations/model";
import { GeneratedCalculation } from "./GeneratedCalculation";

export function GeneratedCalculationLab({
  chapter,
  setChapter,
  size,
  setSize,
  seed,
  onNewSet,
  onBack,
  onUseAuthored,
  recordReview,
}: {
  readonly chapter: number | null;
  readonly setChapter: (value: number | null) => void;
  readonly size: 5 | 10 | 20;
  readonly setSize: (value: 5 | 10 | 20) => void;
  readonly seed: string | number;
  readonly onNewSet: () => void;
  readonly onBack: () => void;
  readonly onUseAuthored: () => void;
  readonly recordReview: (input: NewReviewEvent) => Promise<unknown>;
}) {
  const [index, setIndex] = useState(0);
  const [overrides, setOverrides] = useState<
    Readonly<Record<number, GeneratedCalculationInstance>>
  >({});
  const [saving, setSaving] = useState(false);
  const refreshCounter = useRef(0);
  const shownFingerprints = useRef<Record<number, Set<string>>>({});
  const options = useMemo<GeneratedCalculationSessionOptions>(
    () => ({ chapter, size, seed }),
    [chapter, seed, size],
  );
  const baseInstances = useMemo(
    () => buildGeneratedCalculationSet(calculationTemplates, options),
    [options],
  );
  const instances = useMemo(
    () =>
      baseInstances.map(
        (instance, instanceIndex) => overrides[instanceIndex] ?? instance,
      ),
    [baseInstances, overrides],
  );
  const current = instances[index];

  useEffect(() => {
    setIndex(0);
    setOverrides({});
    refreshCounter.current = 0;
    const fingerprints: Record<number, Set<string>> = {};
    baseInstances.forEach((instance, instanceIndex) => {
      fingerprints[instanceIndex] = new Set([
        generatedCalculationFingerprint(instance),
      ]);
    });
    shownFingerprints.current = fingerprints;
    setSaving(false);
  }, [baseInstances]);

  const newNumbers = useCallback(() => {
    if (current === undefined || saving) return;
    const template = getGeneratedCalculationTemplate(current.templateId);
    if (template === undefined) return;
    refreshCounter.current += 1;
    const fingerprints =
      shownFingerprints.current[index] ??
      new Set([generatedCalculationFingerprint(current)]);
    shownFingerprints.current[index] = fingerprints;
    const fresh = instantiateFreshCalculationVariant(
      template,
      [seed, "new-numbers", index, refreshCounter.current],
      fingerprints,
    );
    setOverrides((previous) => ({ ...previous, [index]: fresh }));
  }, [current, index, saving, seed]);

  const next = useCallback(() => {
    if (saving || current === undefined) return;
    if (index + 1 < instances.length) {
      setIndex((value) => value + 1);
      return;
    }
    onNewSet();
  }, [current, index, instances.length, onNewSet, saving]);

  return (
    <div className="page-stack practice-page generated-calculation-lab">
      <section className="page-heading">
        <div>
          <p className="eyebrow">Practice Lab · generated numeric calculations</p>
          <h1>Repeat the reasoning with fresh numbers.</h1>
          <p className="lede">
            Fresh values require you to repeat the calculation instead of recognising a
            memorised question. Each answer is graded objectively and mapped to the
            canonical Exam-SRS calculation card.
          </p>
        </div>
        <button
          className="secondary-button heading-action"
          type="button"
          disabled={saving}
          onClick={onBack}
        >
          Change format
        </button>
      </section>
      <section className="panel generated-calculation-mode-panel">
        <div
          className="generated-calculation-mode-tabs"
          role="tablist"
          aria-label="Calculation practice mode"
        >
          <button
            className="primary-button"
            type="button"
            role="tab"
            aria-selected="true"
          >
            Generated numeric
          </button>
          <button
            className="secondary-button"
            type="button"
            role="tab"
            aria-selected="false"
            disabled={saving}
            onClick={onUseAuthored}
          >
            Authored MCQs
          </button>
        </div>
        <p className="muted-text">
          Generated numeric practice creates a new instance of the same canonical
          concept. It does not change full mocks or scheduled Study cards.
        </p>
      </section>
      <section className="panel practice-controls">
        <label className="field-label">
          Chapter
          <select
            value={chapter === null ? "all" : chapter}
            disabled={saving}
            onChange={(event) =>
              setChapter(
                event.target.value === "all" ? null : Number(event.target.value),
              )
            }
          >
            <option value="all">All chapters</option>
            {Array.from({ length: 10 }, (_, indexValue) => indexValue + 1).map(
              (value) => (
                <option value={value} key={value}>
                  Chapter {value}
                </option>
              ),
            )}
          </select>
        </label>
        <label className="field-label">
          Set size
          <select
            value={size}
            disabled={saving}
            onChange={(event) => setSize(Number(event.target.value) as 5 | 10 | 20)}
          >
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value={20}>20</option>
          </select>
        </label>
        <button
          className="secondary-button"
          type="button"
          disabled={saving}
          onClick={onNewSet}
        >
          New set
        </button>
      </section>
      <p className="generated-calculation-session-note" role="status">
        {instances.length === size
          ? `${instances.length}-question set · each canonical concept appears once before any variant repeats.`
          : `${instances.length}-question set · all eligible canonical concepts are included; there are not enough for ${size} unique concepts.`}
      </p>
      {current === undefined ? (
        <section className="callout">
          <h2>No generated calculations match this filter.</h2>
          <p>Try All chapters or a broader set size.</p>
        </section>
      ) : (
        <GeneratedCalculation
          instance={current}
          index={index}
          total={instances.length}
          recordReview={recordReview}
          onNext={next}
          onNewNumbers={newNumbers}
          onPendingChange={setSaving}
        />
      )}
    </div>
  );
}
