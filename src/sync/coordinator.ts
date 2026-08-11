import { SyncCryptoError, decryptSyncPayload, encryptSyncPayload } from "./crypto";
import {
  buildSyncPayload,
  mergeSyncPayloads,
  syncPayloadsEqual,
  validateSyncPayload,
} from "./merge";
import {
  parsePairingCredential,
  serializePairingCredential,
  createSyncGroupCredentials,
} from "./pairing";
import { SyncApiError, type SyncApi } from "./client";
import type {
  SettingsStamp,
  SyncConfig,
  SyncGroupConfig,
  SyncLocalState,
  SyncPayloadV1,
  SyncStatus,
} from "./model";
import type { MockAttempt } from "../exam/mock/model";

export interface SyncStateRepository {
  loadSyncState(): Promise<SyncLocalState>;
  saveSyncConfig(config: SyncConfig): Promise<void>;
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
  readonly validQuestionIds?: ReadonlySet<string>;
  readonly now?: () => string;
  readonly debounceMs?: number;
  readonly onApplied?: () => Promise<void> | void;
}

const MAX_CAS_RETRIES = 4;

export class SyncCoordinator {
  private readonly repository: SyncStateRepository;
  private readonly api: SyncApi | undefined;
  private readonly validCardIds: ReadonlySet<string>;
  private readonly validQuestionIds: ReadonlySet<string>;
  private readonly now: () => string;
  private readonly debounceMs: number;
  private readonly onApplied: (() => Promise<void> | void) | undefined;
  private readonly listeners = new Set<(status: SyncStatus) => void>();
  private timer: ReturnType<typeof setTimeout> | undefined;
  private running: Promise<void> | null = null;
  private trailing = false;
  private generation = 0;
  private started = false;
  private status: SyncStatus;

  public constructor(options: SyncCoordinatorOptions) {
    this.repository = options.repository;
    this.api = options.api;
    this.validCardIds = options.validCardIds;
    this.validQuestionIds = options.validQuestionIds ?? new Set();
    this.now = options.now ?? (() => new Date().toISOString());
    this.debounceMs = options.debounceMs ?? 3000;
    this.onApplied = options.onApplied;
    this.status = {
      apiConfigured: this.api !== undefined,
      connected: false,
      phase: this.api === undefined ? "unavailable" : "disconnected",
      lastSyncedAt: null,
      message:
        this.api === undefined
          ? "Cloud sync is not configured for this deployment."
          : null,
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
    this.listeners.clear();
  }

  public request(reason = "local-change", immediate = false): void {
    void reason;
    if (this.api === undefined) {
      this.setStatus({
        phase: "unavailable",
        message: "Cloud sync is not configured for this deployment.",
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
        message: "Cloud sync is not configured for this deployment.",
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
    const state = await this.repository.loadSyncState();
    if (state.syncConfig.group !== null)
      throw new Error("This device is already connected.");
    const credentials = createSyncGroupCredentials();
    const stamp = this.createSettingsStamp(state);
    const payload = buildSyncPayload(state, stamp);
    const envelope = await encryptSyncPayload(payload, credentials);
    const result = await this.api!.create(credentials, envelope);
    const connected: SyncConfig = {
      ...state.syncConfig,
      group: { ...credentials, remoteVersion: result.version },
      lastSyncedAt: this.now(),
      settingsStamp: stamp,
    };
    await this.repository.saveSyncConfig(connected);
    this.setStatus({
      connected: true,
      phase: "synced",
      lastSyncedAt: connected.lastSyncedAt,
      message: null,
    });
  }

  public async joinGroup(pairingCode: string): Promise<void> {
    this.requireApi();
    await this.waitForCurrentPass();
    const credentials = parsePairingCredential(pairingCode.trim());
    const generation = this.generation;

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
      if (!syncPayloadsEqual(merged, remote.payload)) {
        try {
          const pushed = await this.api!.push(
            credentials,
            remote.version,
            await encryptSyncPayload(merged, credentials),
          );
          version = pushed.version;
        } catch (error: unknown) {
          if (error instanceof SyncApiError && error.kind === "conflict") continue;
          throw error;
        }
      }
      if (generation !== this.generation)
        throw new Error("Sync connection changed while joining.");
      const connected: SyncConfig = {
        ...state.syncConfig,
        group: { ...credentials, remoteVersion: version },
        lastSyncedAt: this.now(),
        settingsStamp: merged.settings,
      };
      await this.repository.applyMergedSyncPayload(merged, connected, {
        joining: true,
      });
      await this.onApplied?.();
      this.setStatus({
        connected: true,
        phase: "synced",
        lastSyncedAt: connected.lastSyncedAt,
        message: null,
      });
      return;
    }
    throw new Error("Remote state kept changing; try joining again.");
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

  public async disconnect(): Promise<void> {
    this.generation += 1;
    this.trailing = false;
    await this.waitForCurrentPass();
    await this.repository.disconnectSync();
    this.setStatus({
      connected: false,
      phase: this.api === undefined ? "unavailable" : "disconnected",
      lastSyncedAt: null,
      message: null,
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
    const run = this.runPipeline();
    this.running = run;
    try {
      await run;
    } finally {
      if (this.running === run) this.running = null;
    }
  }

  private async runPipeline(): Promise<void> {
    const generation = this.generation;
    try {
      await this.runPass(generation);
      if (this.trailing && generation === this.generation) {
        this.trailing = false;
        await this.runPass(generation);
      }
    } catch (error: unknown) {
      this.handleError(error);
      throw error;
    } finally {
      if (this.trailing && generation === this.generation) {
        this.trailing = false;
        this.request("trailing");
      }
    }
  }

  private async runPass(generation: number): Promise<void> {
    const initial = await this.repository.loadSyncState();
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
      const state = await this.repository.loadSyncState();
      const group = state.syncConfig.group;
      if (group === null) return;
      const remote = await this.pullPayload(group);
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
  ): Promise<{ readonly version: number; readonly payload: SyncPayloadV1 }> {
    const remote = await this.api!.pull(credentials);
    let plaintext: unknown;
    try {
      plaintext = await decryptSyncPayload(remote.envelope, credentials);
    } catch (error: unknown) {
      if (error instanceof SyncCryptoError) throw error;
      throw new SyncCryptoError();
    }
    return {
      version: remote.version,
      payload: validateSyncPayload(plaintext, this.validCardIds, this.validQuestionIds),
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
    const state = await this.repository.loadSyncState();
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
    if (this.api === undefined)
      throw new Error("Cloud sync is not configured for this deployment.");
  }

  private handleError(error: unknown): void {
    if (
      error instanceof SyncCryptoError ||
      (error instanceof SyncApiError &&
        (error.kind === "auth" ||
          error.kind === "invalid" ||
          error.kind === "not-found"))
    ) {
      this.setStatus({
        phase: "needs-attention",
        message:
          error instanceof SyncApiError && error.kind === "not-found"
            ? "Sync group was not found; local progress is unchanged."
            : "Sync credentials or encrypted data could not be verified.",
      });
      return;
    }
    if (error instanceof SyncApiError && error.kind === "too-large") {
      this.setStatus({
        phase: "needs-attention",
        message: "Sync data is too large for v1; use the manual JSON backup.",
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
