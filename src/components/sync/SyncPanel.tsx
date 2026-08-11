import { useCallback, useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { useSync } from "../../app/syncContext";

export function SyncPanel({
  initialPairingCode,
}: {
  readonly initialPairingCode?: string | null;
}) {
  const {
    status,
    createGroup,
    joinGroup,
    syncNow,
    getPairingCode,
    getPairingLink,
    disconnect,
    deleteRemote,
  } = useSync();
  const [pairingInput, setPairingInput] = useState("");
  const [shownPairingCode, setShownPairingCode] = useState<string | null>(null);
  const [pairingLink, setPairingLink] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const autoJoinAttempted = useRef(false);
  const previousConnected = useRef(status.connected);

  const clearPairingDetails = useCallback(() => {
    setShownPairingCode(null);
    setPairingLink(null);
    setQrDataUrl(null);
    setPairingInput("");
  }, []);

  const run = useCallback(
    async (operation: () => Promise<void>, success: string) => {
      setBusy(true);
      setError(null);
      setMessage(null);
      try {
        await operation();
        clearPairingDetails();
        setMessage(success);
      } catch (operationError: unknown) {
        setError(
          operationError instanceof Error
            ? operationError.message
            : "Sync operation failed.",
        );
      } finally {
        setBusy(false);
      }
    },
    [clearPairingDetails],
  );

  const join = useCallback(
    (code: string, automatic = false) =>
      run(
        () => joinGroup(code),
        automatic
          ? "This device joined the encrypted sync group."
          : "This device is connected.",
      ),
    [joinGroup, run],
  );

  useEffect(() => {
    if (
      initialPairingCode !== undefined &&
      initialPairingCode !== null &&
      !autoJoinAttempted.current &&
      !status.connected
    ) {
      autoJoinAttempted.current = true;
      setPairingInput(initialPairingCode);
      void join(initialPairingCode, true);
    }
  }, [initialPairingCode, join, status.connected]);

  useEffect(() => {
    if (previousConnected.current !== status.connected) clearPairingDetails();
    previousConnected.current = status.connected;
  }, [clearPairingDetails, status.connected]);

  if (!status.apiConfigured) {
    return (
      <section className="panel sync-panel">
        <div className="panel-heading">
          <p className="section-kicker">Cross-device sync</p>
          <h2>Optional encrypted device sync.</h2>
        </div>
        <p>
          Progress is stored locally first. Sync is unavailable on this deployment, so
          local Study, Practice, Settings, and JSON backup continue to work normally.
        </p>
        <p className="field-help">
          Sync requires both <code>VITE_SYNC_API_URL</code> and a dedicated-origin{" "}
          <code>VITE_SYNC_APP_URL</code>. The shared github.io project site remains
          intentionally local-only.
        </p>
      </section>
    );
  }

  const showPairing = async () => {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const code = await getPairingCode();
      const link = await getPairingLink();
      const qr = await QRCode.toDataURL(link, {
        errorCorrectionLevel: "M",
        margin: 1,
        width: 256,
      });
      setShownPairingCode(code);
      setPairingLink(link);
      setQrDataUrl(qr);
    } catch (operationError: unknown) {
      setError(
        operationError instanceof Error
          ? operationError.message
          : "Pairing details could not be shown.",
      );
    } finally {
      setBusy(false);
    }
  };

  const copyPairingCode = async () => {
    if (shownPairingCode === null) return;
    try {
      await navigator.clipboard.writeText(shownPairingCode);
      setMessage("Pairing code copied. Treat it like a password.");
    } catch {
      setError("Pairing code could not be copied; select the text manually.");
    }
  };

  const connected = status.connected;
  return (
    <section className="panel sync-panel">
      <div className="panel-heading">
        <p className="section-kicker">Cross-device sync</p>
        <h2>{connected ? "Keep devices in step." : "Connect another device."}</h2>
      </div>
      <p>
        Progress is stored locally first. Optional encrypted sync merges review history
        across devices; no account is required and JSON export remains an independent
        manual backup.
      </p>
      <p className="sync-privacy-note">
        The payload is encrypted in this browser before upload. The sync server does not
        receive the encryption key. Anyone with the pairing code can decrypt the synced
        progress.
      </p>

      <div className="sync-status" aria-live="polite">
        <strong>Cross-device sync · {statusLabel(status.phase, connected)}</strong>
        <span>
          {status.lastSyncedAt === null
            ? "No successful sync yet."
            : `Last successful sync: ${formatSyncTime(status.lastSyncedAt)}`}
        </span>
        {status.message !== null && (
          <span className="sync-warning">{status.message}</span>
        )}
      </div>

      {!connected ? (
        <div className="sync-connect-actions">
          <button
            className="primary-button"
            type="button"
            disabled={busy}
            onClick={() =>
              void run(
                createGroup,
                "Sync group created. Show the pairing code when you are ready to pair another device.",
              )
            }
          >
            {busy ? "Connecting…" : "Create cross-device sync"}
          </button>
          <div className="pairing-join">
            <label className="field-label" htmlFor="pairing-code">
              Paste a pairing code
              <input
                id="pairing-code"
                value={pairingInput}
                onChange={(event) => setPairingInput(event.target.value)}
                placeholder="ecs1:…"
                autoComplete="off"
                spellCheck={false}
              />
            </label>
            <button
              className="secondary-button"
              type="button"
              disabled={busy || pairingInput.trim() === ""}
              onClick={() => void join(pairingInput.trim())}
            >
              Join existing sync
            </button>
          </div>
        </div>
      ) : (
        <div className="sync-connect-actions">
          <div className="button-row">
            <button
              className="secondary-button"
              type="button"
              disabled={busy || status.phase === "syncing"}
              onClick={() => void run(syncNow, "Sync complete.")}
            >
              {status.phase === "syncing" ? "Syncing…" : "Sync now"}
            </button>
            <button
              className="secondary-button"
              type="button"
              disabled={busy}
              onClick={() => void showPairing()}
            >
              Pair another device
            </button>
          </div>
          <p className="field-help">
            An unfinished full mock stays on the device where it started. Submitted or
            abandoned mock history syncs after finalisation.
          </p>
          {shownPairingCode !== null && pairingLink !== null && (
            <div className="pairing-display">
              {qrDataUrl !== null && (
                <img className="pairing-qr" src={qrDataUrl} alt="Pairing QR code" />
              )}
              <div>
                <p className="field-help">
                  Scan this QR with the normal phone camera, or copy the code.
                </p>
                <code className="pairing-code">{shownPairingCode}</code>
                <div className="button-row">
                  <button
                    className="secondary-button"
                    type="button"
                    onClick={() => void copyPairingCode()}
                  >
                    Copy pairing code
                  </button>
                  <button
                    className="secondary-button"
                    type="button"
                    onClick={clearPairingDetails}
                  >
                    Hide pairing details
                  </button>
                </div>
                <p className="field-help pairing-link">{pairingLink}</p>
                <p className="sync-warning">
                  Anyone with this code can access and decrypt your synced progress.
                </p>
              </div>
            </div>
          )}
          <div className="button-row">
            <button
              className="secondary-button"
              type="button"
              disabled={busy}
              onClick={() => {
                if (
                  window.confirm(
                    "Disconnect this device? Local progress stays here, but reconnecting requires another device's pairing code.",
                  )
                ) {
                  void run(
                    disconnect,
                    "This device was disconnected. Local progress was kept.",
                  );
                }
              }}
            >
              Disconnect this device
            </button>
            <button
              className="danger-button"
              type="button"
              disabled={busy}
              onClick={() => {
                if (
                  window.confirm(
                    "Delete the encrypted cloud copy for every device? Local progress on this device stays here.",
                  )
                ) {
                  void run(
                    deleteRemote,
                    "The cloud copy was deleted and this device was disconnected.",
                  );
                }
              }}
            >
              Delete cloud copy
            </button>
          </div>
        </div>
      )}
      {message !== null && <p className="success-message">{message}</p>}
      {error !== null && (
        <p className="inline-error" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}

function statusLabel(phase: string, connected: boolean): string {
  if (!connected) return "Not connected";
  if (phase === "syncing") return "Syncing";
  if (phase === "offline") return "Offline — progress saved locally";
  if (phase === "needs-attention") return "Needs attention";
  if (phase === "retry") return "Needs retry";
  return "Connected";
}

function formatSyncTime(value: string): string {
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? new Date(timestamp).toLocaleString() : "unknown";
}
