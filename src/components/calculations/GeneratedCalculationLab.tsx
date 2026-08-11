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

const FRESHNESS_EXHAUSTION_MESSAGE =
  "No more unseen number variants are available for this concept in the current session. Start a new set to continue.";
const BASE_SET_ERROR_MESSAGE =
  "Could not build a fresh calculation set for these filters.";

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
  buildSet: buildSetOverride,
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
  readonly buildSet?: typeof buildGeneratedCalculationSet;
}) {
  const [index, setIndex] = useState(0);
  const [overrides, setOverrides] = useState<
    Readonly<Record<number, GeneratedCalculationInstance>>
  >({});
  const [saving, setSaving] = useState(false);
  const [freshnessError, setFreshnessError] = useState<string | null>(null);
  const refreshCounter = useRef(0);
  const shownFingerprints = useRef<Record<number, Set<string>>>({});
  const buildSet = buildSetOverride ?? buildGeneratedCalculationSet;
  const options = useMemo<GeneratedCalculationSessionOptions>(
    () => ({ chapter, size, seed }),
    [chapter, seed, size],
  );
  const baseSetResult = useMemo(() => {
    try {
      return {
        instances: buildSet(calculationTemplates, options),
        error: null,
      };
    } catch {
      return {
        instances: [] as readonly GeneratedCalculationInstance[],
        error: BASE_SET_ERROR_MESSAGE,
      };
    }
  }, [buildSet, options]);
  const baseInstances = baseSetResult.instances;
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
    setFreshnessError(null);
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
    try {
      const fresh = instantiateFreshCalculationVariant(
        template,
        [seed, "new-numbers", index, refreshCounter.current],
        fingerprints,
      );
      setFreshnessError(null);
      setOverrides((previous) => ({ ...previous, [index]: fresh }));
    } catch {
      setFreshnessError(FRESHNESS_EXHAUSTION_MESSAGE);
    }
  }, [current, index, saving, seed]);

  const next = useCallback(() => {
    if (saving || current === undefined) return;
    if (index + 1 < instances.length) {
      setFreshnessError(null);
      setIndex((value) => value + 1);
      return;
    }
    setFreshnessError(null);
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
        {baseSetResult.error !== null
          ? "Fresh calculation set unavailable."
          : instances.length === size
            ? `${instances.length}-question set · each canonical concept appears once before any variant repeats.`
            : `${instances.length}-question set · all eligible canonical concepts are included; there are not enough for ${size} unique concepts.`}
      </p>
      {baseSetResult.error !== null ? (
        <section className="callout" role="alert">
          <h2>{BASE_SET_ERROR_MESSAGE}</h2>
          <p>Try a smaller set or start a new set.</p>
        </section>
      ) : current === undefined ? (
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
          freshnessError={freshnessError}
          newNumbersDisabled={freshnessError !== null}
        />
      )}
    </div>
  );
}
