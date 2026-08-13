import { useState, type ReactNode } from "react";

export function ManualLearnedBadge() {
  return <span className="manual-learned-badge">Manually learned</span>;
}

export function ManualLearnedAction({
  label,
  confirmationTitle,
  confirmationDescription,
  onConfirm,
  disabled = false,
}: {
  readonly label: string;
  readonly confirmationTitle: string;
  readonly confirmationDescription: ReactNode;
  readonly onConfirm: () => Promise<void>;
  readonly disabled?: boolean;
}) {
  const [isConfirming, setIsConfirming] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isConfirming) {
    return (
      <button
        className="secondary-button manual-learned-action"
        type="button"
        disabled={disabled}
        onClick={() => {
          setError(null);
          setIsConfirming(true);
        }}
      >
        {label}
      </button>
    );
  }

  return (
    <div className="manual-learned-confirmation" aria-live="polite">
      <strong>{confirmationTitle}</strong>
      <p>{confirmationDescription}</p>
      <div className="button-row">
        <button
          className="primary-button"
          type="button"
          disabled={isSaving}
          onClick={() => {
            setIsSaving(true);
            setError(null);
            void Promise.resolve()
              .then(onConfirm)
              .then(() => setIsConfirming(false))
              .catch((confirmError: unknown) => {
                setError(
                  confirmError instanceof Error
                    ? confirmError.message
                    : "The manual learned setting could not be saved.",
                );
              })
              .finally(() => setIsSaving(false));
          }}
        >
          {isSaving ? "Saving…" : "Mark learned"}
        </button>
        <button
          className="secondary-button"
          type="button"
          disabled={isSaving}
          onClick={() => setIsConfirming(false)}
        >
          Cancel
        </button>
      </div>
      {error !== null && (
        <p className="inline-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
