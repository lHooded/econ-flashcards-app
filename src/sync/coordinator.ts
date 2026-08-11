import {
  SyncCryptoError,
  SyncPayloadTooLargeError,
  decryptSyncPayload,
  encryptSyncPayload,
} from "./crypto";
import {
  buildSyncPayload,
  mergeSyncPayloads,
  SyncMergeConflictError,
  SyncValidationError,
  syncPayloadsEqual,
  validateSyncPayload,
} from "./merge";
import {
  parsePairingCredential,
  serializePairingCredential,
  createSyncGroupCredentials,
  buildPairingDeepLink,
} from "./pairing";
import { SyncApiError, type SyncApi } from "./client";
import type {
  SettingsStamp,
  SyncConfig,
  SyncGroupConfig,
  SyncLocalState,
  SyncPayloadV1,
  SyncStatus,
  SyncGroupCredentials,
} from "./model";
import type { MockAttempt } from "../exam/mock/model";

export interface SyncStateRepository {
  loadSyncState(): Promise<SyncLocalState>;
  saveSyncConfig(config: SyncConfig): Promise<void>;
  connectSyncConfig(
    credentials: SyncGroupCredentials,
    remoteVersion: number,
    settingsStamp: SettingsStamp,
    initialPayload: SyncPayloadV1,
    completedAt: string,
  ): Promise<{ readonly config: SyncConfig; readonly reconciled: boolean }>;
  joinSyncConfig(
    credentials: SyncGroupCredentials,
    remoteVersion: number,
    remotePayload: SyncPayloadV1,
    snapshotSettings: SyncLocalState["settings"],
    completedAt: string,
    isCurrent: () => boolean,
  ): Promise<{
    readonly config: SyncConfig;
    readonly payload: SyncPayloadV1;
    readonly reconciled: boolean;
  }>;
  applyMergedSyncPayload(
    incoming: SyncPayloadV1,
    nextConfig: SyncConfig,
    options?: { readonly joining?: boolean },
  ): Promise<SyncPayloadV1>;
  disconnectSync(): Promise<void>;
}

export interface SyncCoordinatorOptions {
  readonly repository: SyncStateRepository;
  readonly api?: SyncApi;
  readonly validCardIds: ReadonlySet<string>;
  readonly syncAppUrl?: string;
  readonly unavailableMessage?: string;
  readonly now?: () => string;
  readonly debounceMs?: number;
  readonly onApplied?: () => Promise<void> | void;
}

const MAX_CAS_RETRIES = 4;

export class SyncCoordinator {
  private readonly repository: SyncStateRepository;
  private readonly api: SyncApi | undefined;
  private readonly validCardIds: ReadonlySet<string>;
  private readonly syncAppUrl: string | undefined;
  private readonly unavailableMessage: string;
  private readonly now: () => string;
  private readonly debounceMs: number;
  private readonly onApplied: (() => Promise<void> | void) | undefined;
  private readonly listeners = new Set<(status: SyncStatus) => void>();
  private timer: ReturnType<typeof setTimeout> | undefined;
  private running: Promise<void> | null = null;
  private activeAbortController: AbortController | null = null;
  private trailing = false;
  private generation = 0;
  private joining = false;
  private started = false;
  private status: SyncStatus;

  public constructor(options: SyncCoordinatorOptions) {
    this.repository = options.repository;
    this.api = options.api;
    this.validCardIds = options.validCardIds;
    this.syncAppUrl = options.syncAppUrl;
    this.unavailableMessage =
      options.unavailableMessage ?? "Cloud sync is not configured for this deployment.";
    this.now = options.now ?? (() => new Date().toISOString());
    this.debounceMs = options.debounceMs ?? 3000;
    this.onApplied = options.onApplied;
    this.status = {
      apiConfigured: this.api !== undefined,
      connected: false,
      phase: this.api === undefined ? "unavailable" : "disconnected",
      lastSyncedAt: null,
      message: this.api === undefined ? this.unavailableMessage : null,
    };
  }

  public getStatus(): SyncStatus {
    return this.status;
  }

  public subscribe(listener: (status: SyncStatus) => void): () => void {
    this.listeners.add(listener);
    listener(this.status);
    return () => this.listeners.delete(listener);
  }

  public start(): () => void {
    if (this.started) return () => undefined;
    this.started = true;
    const onOnline = () => this.request("online", true);
    const onVisibility = () => {
      if (document.visibilityState === "visible") this.request("visible", true);
    };
    if (typeof window !== "undefined") {
      window.addEventListener("online", onOnline);
      document.addEventListener("visibilitychange", onVisibility);
    }
    void this.refreshStatus();
    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("online", onOnline);
        document.removeEventListener("visibilitychange", onVisibility);
      }
      this.started = false;
    };
  }

  public dispose(): void {
    if (this.timer !== undefined) clearTimeout(this.timer);
    this.timer = undefined;
    this.generation += 1;
    this.activeAbortController?.abort();
    this.activeAbortController = null;
    this.listeners.clear();
  }

  public request(reason = "local-change", immediate = false): void {
    void reason;
    if (this.api === undefined) {
      this.setStatus({
        phase: "unavailable",
        message: this.unavailableMessage,
      });
      return;
    }
    if (this.running !== null) {
      this.trailing = true;
      return;
    }
    if (this.timer !== undefined) clearTimeout(this.timer);
    if (immediate) {
      this.timer = undefined;
      void this.startPipeline().catch(() => undefined);
      return;
    }
    this.timer = setTimeout(() => {
      this.timer = undefined;
      void this.startPipeline().catch(() => undefined);
    }, this.debounceMs);
  }

  public async syncNow(): Promise<void> {
    if (this.api === undefined) {
      this.setStatus({
        phase: "unavailable",
        message: this.unavailableMessage,
      });
      return;
    }
    if (this.running !== null) {
      this.trailing = true;
      return this.running;
    }
    if (this.timer !== undefined) clearTimeout(this.timer);
    this.timer = undefined;
    return this.startPipeline();
  }

  public async createGroup(): Promise<void> {
    this.requireApi();
    await this.waitForCurrentPass();
    const generation = this.generation;
    const state = await this.repository.loadSyncState();
    if (state.syncConfig.group !== null)
      throw new Error("This device is already connected.");
    const credentials = createSyncGroupCredentials();
    const stamp = this.createSettingsStamp(state);
    const payload = buildSyncPayload(state, stamp);
    const envelope = await encryptSyncPayload(payload, credentials);
    const result = await this.api!.create(credentials, envelope);
    if (generation !== this.generation)
      throw new Error("Sync connection changed while creating a group.");
    const connected = await this.repository.connectSyncConfig(
      credentials,
      result.version,
      stamp,
      payload,
      this.now(),
    );
    if (connected.reconciled) {
      this.setStatus({
        connected: true,
        phase: "synced",
        lastSyncedAt: connected.config.lastSyncedAt,
        message: null,
      });
      return;
    }
    try {
      await this.runPass(generation);
    } catch (error: unknown) {
      this.handleError(error, generation);
      throw error;
    }
  }

  public async joinGroup(pairingCode: string): Promise<void> {
    this.requireApi();
    await this.waitForCurrentPass();
    if (this.joining) throw new Error("A sync join is already in progress.");
    const credentials = parsePairingCredential(pairingCode.trim());
    const generation = this.generation;
    this.joining = true;

    try {
      for (let attempt = 0; attempt < MAX_CAS_RETRIES; attempt += 1) {
        const state = await this.repository.loadSyncState();
        if (state.syncConfig.group !== null)
          throw new Error("This device is already connected.");
        const remote = await this.pullPayload(credentials);
        const local = buildSyncPayload(state, remote.payload.settings);
        const merged = mergeSyncPayloads(local, remote.payload, {
          joining: true,
          activeAttempt: activeAttemptOf(state),
        });
        let version = remote.version;
        let remotePayload = remote.payload;
        if (!syncPayloadsEqual(merged, remote.payload)) {
          try {
            const pushed = await this.api!.push(
              credentials,
              remote.version,
              await encryptSyncPayload(merged, credentials),
            );
            version = pushed.version;
            remotePayload = merged;
          } catch (error: unknown) {
            if (error instanceof SyncApiError && error.kind === "conflict") continue;
            throw error;
          }
        }
        if (generation !== this.generation)
          throw new Error("Sync connection changed while joining.");
        const joined = await this.repository.joinSyncConfig(
          credentials,
          version,
          remotePayload,
          state.settings,
          this.now(),
          () => generation === this.generation && this.joining,
        );
        if (generation !== this.generation)
          throw new Error("Sync connection changed while joining.");

        // A scheduled local request may have run while the device was still
        // disconnected. It is safe to discard that no-op now: the transaction
        // above included the current durable state, and the normal pipeline
        // below reconciles any payload that differs from the remote version.
        this.joining = false;
        await this.waitForCurrentPass();
        if (!joined.reconciled) {
          await this.syncNow();
          return;
        }
        await this.onApplied?.();
        this.setStatus({
          connected: true,
          phase: "synced",
          lastSyncedAt: joined.config.lastSyncedAt,
          message: null,
        });
        return;
      }
      throw new Error("Remote state kept changing; try joining again.");
    } finally {
      this.joining = false;
    }
  }

  public async getPairingCode(): Promise<string> {
    const state = await this.repository.loadSyncState();
    if (state.syncConfig.group === null)
      throw new Error("This device is not connected.");
    return serializePairingCredential({
      syncId: state.syncConfig.group.syncId,
      authToken: state.syncConfig.group.authToken,
      encryptionKey: state.syncConfig.group.encryptionKey,
    });
  }

  public async getPairingLink(): Promise<string> {
    if (this.syncAppUrl === undefined) {
      throw new Error("A dedicated sync app URL is not configured.");
    }
    return buildPairingDeepLink(await this.getPairingCode(), this.syncAppUrl);
  }

  public async disconnect(): Promise<void> {
    this.generation += 1;
    this.trailing = false;
    if (this.timer !== undefined) clearTimeout(this.timer);
    this.timer = undefined;
    this.activeAbortController?.abort();
    this.activeAbortController = null;
    // A stale pass may still be awaiting a fetch, but it is detached now. Its
    // generation checks prevent it from applying data or changing status.
    this.running = null;
    await this.repository.disconnectSync();
    this.setStatus({
      connected: false,
      phase: this.api === undefined ? "unavailable" : "disconnected",
      lastSyncedAt: null,
      message: this.api === undefined ? this.unavailableMessage : null,
    });
  }

  public async deleteRemote(): Promise<void> {
    this.requireApi();
    this.generation += 1;
    this.trailing = false;
    await this.waitForCurrentPass();
    const state = await this.repository.loadSyncState();
    if (state.syncConfig.group === null)
      throw new Error("This device is not connected.");
    await this.api!.delete(state.syncConfig.group);
    await this.repository.disconnectSync();
    this.setStatus({
      connected: false,
      phase: "disconnected",
      lastSyncedAt: null,
      message: null,
    });
  }

  private async startPipeline(): Promise<void> {
    if (this.running !== null) {
      this.trailing = true;
      return this.running;
    }
    const controller = new AbortController();
    this.activeAbortController = controller;
    const run = this.runPipeline(controller.signal);
    this.running = run;
    try {
      await run;
    } finally {
      if (this.running === run) this.running = null;
      if (this.activeAbortController === controller) this.activeAbortController = null;
    }
  }

  private async runPipeline(signal: AbortSignal): Promise<void> {
    const generation = this.generation;
    try {
      await this.runPass(generation, signal);
      if (this.trailing && generation === this.generation) {
        this.trailing = false;
        await this.runPass(generation, signal);
      }
    } catch (error: unknown) {
      this.handleError(error, generation);
      throw error;
    } finally {
      if (this.trailing && generation === this.generation) {
        this.trailing = false;
        this.request("trailing");
      }
    }
  }

  private async runPass(generation: number, signal?: AbortSignal): Promise<void> {
    if (generation !== this.generation) return;
    const initial = await this.repository.loadSyncState();
    if (generation !== this.generation) return;
    if (this.joining) return;
    if (initial.syncConfig.group === null) {
      this.setStatus({
        connected: false,
        phase: "disconnected",
        lastSyncedAt: null,
        message: null,
      });
      return;
    }
    this.setStatus({
      connected: true,
      phase: "syncing",
      lastSyncedAt: initial.syncConfig.lastSyncedAt,
      message: null,
    });

    for (let retry = 0; retry < MAX_CAS_RETRIES; retry += 1) {
      if (generation !== this.generation) return;
      const state = await this.repository.loadSyncState();
      if (generation !== this.generation) return;
      const group = state.syncConfig.group;
      if (group === null) return;
      const remote = await this.pullPayload(group, signal);
      if (generation !== this.generation) return;
      const stamp = state.syncConfig.settingsStamp ?? remote.payload.settings;
      const local = buildSyncPayload(state, stamp);
      const merged = mergeSyncPayloads(local, remote.payload, {
        activeAttempt: activeAttemptOf(state),
      });
      let version = remote.version;
      if (!syncPayloadsEqual(merged, remote.payload)) {
        try {
          const pushed = await this.api!.push(
            group,
            remote.version,
            await encryptSyncPayload(merged, group),
            signal,
          );
          version = pushed.version;
        } catch (error: unknown) {
          if (error instanceof SyncApiError && error.kind === "conflict") continue;
          throw error;
        }
      }
      if (generation !== this.generation) return;
      const nextConfig: SyncConfig = {
        ...state.syncConfig,
        group: { ...group, remoteVersion: version },
        lastSyncedAt: this.now(),
        settingsStamp: merged.settings,
      };
      await this.repository.applyMergedSyncPayload(merged, nextConfig);
      await this.onApplied?.();
      if (generation !== this.generation) return;
      this.setStatus({
        connected: true,
        phase: "synced",
        lastSyncedAt: nextConfig.lastSyncedAt,
        message: null,
      });
      return;
    }
    throw new SyncApiError(
      "conflict",
      "Remote state kept changing; try again later.",
      409,
    );
  }

  private async pullPayload(
    credentials: SyncGroupConfig | ReturnType<typeof parsePairingCredential>,
    signal?: AbortSignal,
  ): Promise<{ readonly version: number; readonly payload: SyncPayloadV1 }> {
    const remote = await this.api!.pull(credentials, signal);
    let plaintext: unknown;
    try {
      plaintext = await decryptSyncPayload(remote.envelope, credentials);
    } catch (error: unknown) {
      if (error instanceof SyncCryptoError || error instanceof SyncPayloadTooLargeError)
        throw error;
      throw new SyncCryptoError();
    }
    return {
      version: remote.version,
      payload: validateSyncPayload(plaintext, this.validCardIds),
    };
  }

  private createSettingsStamp(state: SyncLocalState): SettingsStamp {
    return {
      value: { ...state.settings },
      updatedAt: this.now(),
      deviceId: state.syncConfig.deviceId,
    };
  }

  private async refreshStatus(): Promise<void> {
    if (this.api === undefined) return;
    const generation = this.generation;
    const state = await this.repository.loadSyncState();
    if (generation !== this.generation) return;
    if (state.syncConfig.group === null) {
      this.setStatus({
        connected: false,
        phase: "disconnected",
        lastSyncedAt: null,
        message: null,
      });
    } else {
      this.setStatus({
        connected: true,
        phase: "synced",
        lastSyncedAt: state.syncConfig.lastSyncedAt,
        message: null,
      });
    }
  }

  private async waitForCurrentPass(): Promise<void> {
    if (this.timer !== undefined) clearTimeout(this.timer);
    this.timer = undefined;
    if (this.running !== null) await this.running.catch(() => undefined);
  }

  private requireApi(): void {
    if (this.api === undefined) throw new Error(this.unavailableMessage);
  }

  private handleError(error: unknown, generation = this.generation): void {
    if (generation !== this.generation) return;
    if (
      error instanceof SyncCryptoError ||
      error instanceof SyncValidationError ||
      error instanceof SyncMergeConflictError ||
      (error instanceof SyncApiError &&
        (error.kind === "auth" ||
          error.kind === "invalid" ||
          error.kind === "not-found"))
    ) {
      this.setStatus({
        phase: "needs-attention",
        message:
          error instanceof SyncMergeConflictError
            ? "Synced histories conflict; local progress is unchanged."
            : error instanceof SyncApiError && error.kind === "not-found"
              ? "Sync group was not found; local progress is unchanged."
              : "Sync credentials or encrypted data could not be verified.",
      });
      return;
    }
    if (
      error instanceof SyncPayloadTooLargeError ||
      (error instanceof SyncApiError &&
        (error.kind === "too-large" || error.kind === "rate-limited"))
    ) {
      this.setStatus({
        phase: "needs-attention",
        message:
          error instanceof SyncApiError && error.kind === "rate-limited"
            ? "Sync is temporarily rate-limited; try again shortly."
            : "Sync data is too large for v1; use/export the manual JSON backup.",
      });
      return;
    }
    const offline = typeof navigator !== "undefined" && navigator.onLine === false;
    this.setStatus({
      phase: offline ? "offline" : "retry",
      message: offline ? "Offline — progress saved locally." : "Sync failed — retry.",
    });
  }

  private setStatus(patch: Partial<SyncStatus>): void {
    this.status = { ...this.status, ...patch };
    for (const listener of this.listeners) listener(this.status);
  }
}

function activeAttemptOf(state: SyncLocalState): MockAttempt | undefined {
  return state.mockAttempts.find((attempt) => attempt.status === "active");
}
