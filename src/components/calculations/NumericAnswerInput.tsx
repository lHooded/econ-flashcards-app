import { useId } from "react";
import type { NumericAnswerSpec } from "../../calculations/model";

export function NumericAnswerInput({
  answer,
  value,
  error,
  disabled,
  onChange,
  onEnter,
}: {
  readonly answer: NumericAnswerSpec;
  readonly value: string;
  readonly error: string | null;
  readonly disabled: boolean;
  readonly onChange: (value: string) => void;
  readonly onEnter?: () => void;
}) {
  const rawId = useId();
  const inputId = `${rawId.replace(/[^a-zA-Z0-9_-]/g, "")}-numeric-answer`;
  const helpId = `${inputId}-help`;
  const errorId = `${inputId}-error`;
  const describedBy = error === null ? helpId : `${helpId} ${errorId}`;
  const unit = answer.displayUnit ?? answer.unit;

  return (
    <div className="generated-calculation-answer-field">
      <label className="field-label" htmlFor={inputId}>
        Numeric answer
        <span className="generated-calculation-input-row">
          <input
            id={inputId}
            type="text"
            inputMode="decimal"
            autoComplete="off"
            value={value}
            disabled={disabled}
            aria-describedby={describedBy}
            aria-invalid={error === null ? undefined : true}
            onChange={(event) => onChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && onEnter !== undefined) {
                event.preventDefault();
                onEnter();
              }
            }}
          />
          <span className="generated-calculation-unit" aria-label={`Unit: ${unit}`}>
            {unit}
          </span>
        </span>
      </label>
      <p id={helpId} className="field-help generated-calculation-answer-help">
        Enter the number in the displayed unit. {answer.roundingInstruction}
        {answer.unit === "percent" ? " For example, enter 5 for 5%." : ""}
      </p>
      {error === null ? null : (
        <p id={errorId} className="inline-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
