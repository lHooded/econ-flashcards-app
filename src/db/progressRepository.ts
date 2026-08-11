import {
  createReviewEvent,
  applyReviewToCardState,
  DEFAULT_APP_SETTINGS,
  sortReviewEventsChronologically,
  validateSettings,
  type AppSettings,
  type CardState,
  type NewReviewEvent,
  type ReviewEvent,
} from "../domain/progress";
import type { ProgressBackupV2 } from "../domain/backup";
import { validateMockAttempt, type MockAttempt } from "../exam/mock/model";
import { openProgressDatabase, SETTINGS_KEY, type SettingsRecord } from "./database";
import { createDisconnectedSyncConfig, validateSyncConfig } from "./syncRepository";
import {
  buildSyncPayload,
  deriveSyncedCardStates,
  mergeSyncPayloads,
  syncPayloadsEqual,
  type SyncPayloadSource,
} from "../sync/merge";
import type {
  SyncGroupCredentials,
  SyncConfig,
  SyncLocalState,
  SyncPayloadV1,
  SettingsStamp,
} from "../sync/model";
import { SYNC_CONFIG_KEY } from "../sync/model";

export interface RecordedReview {
  readonly event: ReviewEvent;
  readonly cardState: CardState;
}

export class ProgressRepository {
  private readonly database: ReturnType<typeof openProgressDatabase>;

  public constructor(
    private readonly validCardIds: ReadonlySet<string>,
    databaseName?: string,
  ) {
    this.database = openProgressDatabase(databaseName);
  }

  public async load(): Promise<{
    settings: AppSettings;
    cardStates: CardState[];
    reviews: ReviewEvent[];
  }> {
    const database = await this.database;
    const transaction = database.transaction(
      ["settings", "cardStates", "reviewEvents"],
      "readonly",
    );
    const settingsRecord = (await transaction
      .objectStore("settings")
      .get(SETTINGS_KEY)) as SettingsRecord | undefined;
    const cardStates = (await transaction
      .objectStore("cardStates")
      .getAll()) as CardState[];
    const rawReviews = (await transaction
      .objectStore("reviewEvents")
      .getAll()) as ReviewEvent[];
    await transaction.done;

    // IndexedDB returns reviewEvents in primary-key order, but IDs are random.
    // The repository boundary guarantees chronological history for consumers.
    const reviews = sortReviewEventsChronologically(rawReviews);

    return {
      settings: settingsRecord?.value ?? DEFAULT_APP_SETTINGS,
      cardStates,
      reviews,
    };
  }

  public async saveSettings(settings: AppSettings): Promise<void> {
    const validated = validateSettings(settings);
    const database = await this.database;
    const transaction = database.transaction(["settings", "syncConfig"], "readwrite");
    const syncRecord = (await transaction
      .objectStore("syncConfig")
      .get(SYNC_CONFIG_KEY)) as SyncConfig | undefined;
    transaction.objectStore("settings").put({ key: SETTINGS_KEY, value: validated });
    if (syncRecord?.group !== null && syncRecord !== undefined) {
      const stamp: SettingsStamp = {
        value: validated,
        updatedAt: new Date().toISOString(),
        deviceId: syncRecord.deviceId,
      };
      transaction
        .objectStore("syncConfig")
        .put({ ...syncRecord, settingsStamp: stamp });
    }
    await transaction.done;
  }

  public async loadSyncState(): Promise<SyncLocalState> {
    const database = await this.database;
    const transaction = database.transaction(
      ["settings", "reviewEvents", "mockAttempts", "syncConfig"],
      "readonly",
    );
    const settingsRecord = (await transaction
      .objectStore("settings")
      .get(SETTINGS_KEY)) as SettingsRecord | undefined;
    const reviews = (await transaction
      .objectStore("reviewEvents")
      .getAll()) as ReviewEvent[];
    const mockAttempts = (await transaction
      .objectStore("mockAttempts")
      .getAll()) as MockAttempt[];
    const syncRecord = (await transaction
      .objectStore("syncConfig")
      .get(SYNC_CONFIG_KEY)) as SyncConfig | undefined;
    await transaction.done;
    if (syncRecord === undefined) {
      throw new Error("Sync configuration is missing from the local database.");
    }
    const syncConfig = validateSyncConfig(syncRecord);
    return {
      settings: settingsRecord?.value ?? DEFAULT_APP_SETTINGS,
      reviews: sortReviewEventsChronologically(reviews),
      mockAttempts: mockAttempts.map((attempt) => validateMockAttempt(attempt)),
      syncConfig,
    };
  }

  public async saveSyncConfig(syncConfig: SyncConfig): Promise<void> {
    const validated = validateSyncConfig(syncConfig);
    const database = await this.database;
    await database.put("syncConfig", validated);
  }

  /**
   * Atomically transitions a disconnected device to a connected group while
   * stamping the settings value that is current at the transaction boundary.
   * Reviews and mock history are read by the first reconciliation pass after
   * this operation; no stale pre-network snapshot is installed here.
   */
  public async connectSyncConfig(
    credentials: SyncGroupCredentials,
    remoteVersion: number,
    settingsStamp: SettingsStamp,
    initialPayload: SyncPayloadV1,
    completedAt: string,
  ): Promise<{ readonly config: SyncConfig; readonly reconciled: boolean }> {
    const database = await this.database;
    const transaction = database.transaction(
      ["settings", "reviewEvents", "mockAttempts", "syncConfig"],
      "readwrite",
    );
    const syncStore = transaction.objectStore("syncConfig");
    const settingsStore = transaction.objectStore("settings");
    const current = (await syncStore.get(SYNC_CONFIG_KEY)) as SyncConfig | undefined;
    if (current === undefined) {
      throw new Error("Sync configuration is missing from the local database.");
    }
    if (current.group !== null) {
      throw new Error("This device is already connected.");
    }
    const settingsRecord = (await settingsStore.get(SETTINGS_KEY)) as
      SettingsRecord | undefined;
    const currentReviews = (await transaction
      .objectStore("reviewEvents")
      .getAll()) as ReviewEvent[];
    const currentAttempts = (await transaction
      .objectStore("mockAttempts")
      .getAll()) as MockAttempt[];
    const currentSettings = settingsRecord?.value ?? DEFAULT_APP_SETTINGS;
    const currentStamp: SettingsStamp = {
      ...settingsStamp,
      value: currentSettings,
      deviceId: current.deviceId,
      updatedAt: settingsEqual(currentSettings, settingsStamp.value)
        ? settingsStamp.updatedAt
        : nextTimestamp(settingsStamp.updatedAt),
    };
    const currentPayload = buildSyncPayload(
      {
        settings: currentSettings,
        reviews: currentReviews,
        mockAttempts: currentAttempts,
      },
      currentStamp,
    );
    const reconciled = syncPayloadsEqual(currentPayload, initialPayload);
    const connected: SyncConfig = {
      ...current,
      group: { ...credentials, remoteVersion },
      lastSyncedAt: reconciled ? completedAt : null,
      settingsStamp: currentStamp,
    };
    const validated = validateSyncConfig(connected);
    syncStore.put(validated);
    await transaction.done;
    return { config: validated, reconciled };
  }

  /**
   * Atomically completes a join from the current durable state. The caller's
   * settings snapshot identifies writes made during the network portion of the
   * join; those writes receive a stamp strictly newer than the observed remote
   * stamp and are reconciled by the normal pipeline after this transaction.
   */
  public async joinSyncConfig(
    credentials: SyncGroupCredentials,
    remoteVersion: number,
    remotePayload: SyncPayloadV1,
    snapshotSettings: AppSettings,
    completedAt: string,
    isCurrent: () => boolean,
  ): Promise<{
    readonly config: SyncConfig;
    readonly payload: SyncPayloadV1;
    readonly reconciled: boolean;
  }> {
    for (const review of remotePayload.reviews) {
      if (!this.validCardIds.has(review.cardId)) {
        throw new Error(`Cannot apply unknown card ID "${review.cardId}".`);
      }
    }

    const database = await this.database;
    const transaction = database.transaction(
      ["settings", "cardStates", "reviewEvents", "mockAttempts", "syncConfig"],
      "readwrite",
    );
    const syncStore = transaction.objectStore("syncConfig");
    const currentConfig = (await syncStore.get(SYNC_CONFIG_KEY)) as
      SyncConfig | undefined;
    if (currentConfig === undefined) {
      throw new Error("Sync configuration is missing from the local database.");
    }
    if (currentConfig.group !== null) {
      throw new Error("This device is already connected.");
    }

    const settingsRecord = (await transaction
      .objectStore("settings")
      .get(SETTINGS_KEY)) as SettingsRecord | undefined;
    const currentReviews = (await transaction
      .objectStore("reviewEvents")
      .getAll()) as ReviewEvent[];
    const currentAttempts = (await transaction
      .objectStore("mockAttempts")
      .getAll()) as MockAttempt[];
    const currentSettings = settingsRecord?.value ?? DEFAULT_APP_SETTINGS;
    const settingsChanged = !settingsEqual(currentSettings, snapshotSettings);
    const localSettingsStamp: SettingsStamp = settingsChanged
      ? {
          value: { ...currentSettings },
          updatedAt: nextTimestampAfter(remotePayload.settings.updatedAt, completedAt),
          deviceId: currentConfig.deviceId,
        }
      : remotePayload.settings;
    const currentSource: SyncPayloadSource = {
      // An unchanged disconnected setting deliberately adopts the remote
      // value. A changed value is represented by the causally-newer local
      // stamp above and must remain the local source value.
      settings: settingsChanged ? currentSettings : remotePayload.settings.value,
      reviews: currentReviews,
      mockAttempts: currentAttempts,
    };
    const currentPayload = buildSyncPayload(currentSource, localSettingsStamp);
    const activeAttempts = currentAttempts.filter(
      (attempt) => attempt.status === "active",
    );
    if (activeAttempts.length > 1) {
      throw new Error("Local database contains more than one active mock attempt.");
    }
    const merged = mergeSyncPayloads(currentPayload, remotePayload, {
      activeAttempt: activeAttempts[0],
    });
    const reconciled = syncPayloadsEqual(merged, remotePayload);

    // This check is deliberately immediately before the writes. A disconnect
    // invalidates the generation synchronously; no await follows this check
    // before the transaction is populated, and a later disconnect transaction
    // will serialize after this one and clear the group again.
    if (!isCurrent()) {
      throw new Error("Sync connection changed while joining.");
    }

    const cardStates = deriveSyncedCardStates(this.validCardIds, merged.reviews);
    const persistedConfig: SyncConfig = {
      ...currentConfig,
      group: { ...credentials, remoteVersion },
      lastSyncedAt: reconciled ? completedAt : null,
      settingsStamp: merged.settings,
    };
    const validated = validateSyncConfig(persistedConfig);
    const terminalIds = new Set(merged.mockAttempts.map((attempt) => attempt.id));

    transaction.objectStore("settings").clear();
    transaction.objectStore("cardStates").clear();
    transaction.objectStore("reviewEvents").clear();
    transaction.objectStore("mockAttempts").clear();
    transaction.objectStore("settings").put({
      key: SETTINGS_KEY,
      value: merged.settings.value,
    });
    for (const state of cardStates) transaction.objectStore("cardStates").put(state);
    for (const review of merged.reviews)
      transaction.objectStore("reviewEvents").put(review);
    const activeAttempt = activeAttempts[0];
    if (activeAttempt !== undefined && !terminalIds.has(activeAttempt.id)) {
      transaction.objectStore("mockAttempts").put(activeAttempt);
    }
    for (const attempt of merged.mockAttempts) {
      transaction.objectStore("mockAttempts").put(attempt);
    }
    syncStore.put(validated);
    await transaction.done;
    return { config: validated, payload: merged, reconciled };
  }

  public async recordReview(input: NewReviewEvent): Promise<RecordedReview> {
    if (!this.validCardIds.has(input.cardId)) {
      throw new Error(`Cannot record review for unknown card ID "${input.cardId}".`);
    }

    const event = createReviewEvent(input);
    const database = await this.database;
    const transaction = database.transaction(
      ["cardStates", "reviewEvents"],
      "readwrite",
    );
    const cardStateStore = transaction.objectStore("cardStates");
    const previous = (await cardStateStore.get(event.cardId)) as CardState | undefined;
    const cardState = applyReviewToCardState(previous, event);
    await cardStateStore.put(cardState);
    await transaction.objectStore("reviewEvents").add(event);
    await transaction.done;

    return { event, cardState };
  }

  public async replaceAll(backup: ProgressBackupV2): Promise<void> {
    for (const state of backup.cardStates) {
      if (!this.validCardIds.has(state.cardId)) {
        throw new Error(`Cannot import unknown card ID "${state.cardId}".`);
      }
    }
    for (const review of backup.reviews) {
      if (!this.validCardIds.has(review.cardId)) {
        throw new Error(`Cannot import unknown card ID "${review.cardId}".`);
      }
    }
    for (const attempt of backup.mockAttempts) {
      validateMockAttempt(attempt);
    }

    const database = await this.database;
    const transaction = database.transaction(
      ["settings", "cardStates", "reviewEvents", "mockAttempts", "syncConfig"],
      "readwrite",
    );

    const syncStore = transaction.objectStore("syncConfig");
    const syncRecord = (await syncStore.get(SYNC_CONFIG_KEY)) as SyncConfig | undefined;

    transaction.objectStore("settings").clear();
    transaction.objectStore("cardStates").clear();
    transaction.objectStore("reviewEvents").clear();
    transaction.objectStore("mockAttempts").clear();
    transaction.objectStore("settings").put({
      key: SETTINGS_KEY,
      value: backup.settings,
    });
    const cardStateStore = transaction.objectStore("cardStates");
    const reviewStore = transaction.objectStore("reviewEvents");
    for (const state of backup.cardStates) {
      cardStateStore.put(state);
    }
    for (const review of backup.reviews) {
      reviewStore.put(review);
    }
    const mockStore = transaction.objectStore("mockAttempts");
    for (const attempt of backup.mockAttempts) mockStore.put(attempt);
    if (syncRecord?.group !== null && syncRecord !== undefined) {
      syncStore.put({
        ...syncRecord,
        settingsStamp: {
          value: { ...backup.settings },
          updatedAt: new Date().toISOString(),
          deviceId: syncRecord.deviceId,
        },
      });
    }
    await transaction.done;
  }

  /**
   * Apply a validated merged sync payload in one IndexedDB transaction. The
   * transaction re-reads local history before merging so a local review saved
   * while the network request was in flight is never replaced by a stale pass.
   */
  public async applyMergedSyncPayload(
    incoming: SyncPayloadV1,
    nextConfig: SyncConfig,
    options: { readonly joining?: boolean } = {},
  ): Promise<SyncPayloadV1> {
    validateSyncConfig(nextConfig);
    for (const review of incoming.reviews) {
      if (!this.validCardIds.has(review.cardId)) {
        throw new Error(`Cannot apply unknown card ID "${review.cardId}".`);
      }
    }

    const database = await this.database;
    const transaction = database.transaction(
      ["settings", "cardStates", "reviewEvents", "mockAttempts", "syncConfig"],
      "readwrite",
    );
    const settingsRecord = (await transaction
      .objectStore("settings")
      .get(SETTINGS_KEY)) as SettingsRecord | undefined;
    const currentReviews = (await transaction
      .objectStore("reviewEvents")
      .getAll()) as ReviewEvent[];
    const currentAttempts = (await transaction
      .objectStore("mockAttempts")
      .getAll()) as MockAttempt[];
    const currentConfig = (await transaction
      .objectStore("syncConfig")
      .get(SYNC_CONFIG_KEY)) as SyncConfig | undefined;
    if (currentConfig === undefined) {
      throw new Error("Sync configuration is missing from the local database.");
    }
    if (
      !options.joining &&
      (currentConfig.group === null ||
        nextConfig.group === null ||
        currentConfig.group.syncId !== nextConfig.group.syncId)
    ) {
      throw new Error("Local sync connection changed while syncing.");
    }

    const activeAttempts = currentAttempts.filter(
      (attempt) => attempt.status === "active",
    );
    if (activeAttempts.length > 1) {
      throw new Error("Local database contains more than one active mock attempt.");
    }
    const activeAttempt = activeAttempts[0];
    const currentSource: SyncPayloadSource = {
      settings: settingsRecord?.value ?? DEFAULT_APP_SETTINGS,
      reviews: currentReviews,
      mockAttempts: currentAttempts,
    };
    const currentStamp = currentConfig.settingsStamp ?? incoming.settings;
    const currentPayload = buildSyncPayload(currentSource, currentStamp);
    const merged = mergeSyncPayloads(currentPayload, incoming, {
      joining: options.joining,
      activeAttempt,
    });
    const cardStates = deriveSyncedCardStates(this.validCardIds, merged.reviews);
    const persistedConfig: SyncConfig = {
      ...nextConfig,
      settingsStamp: merged.settings,
    };
    const terminalIds = new Set(merged.mockAttempts.map((attempt) => attempt.id));

    transaction.objectStore("settings").clear();
    transaction.objectStore("cardStates").clear();
    transaction.objectStore("reviewEvents").clear();
    transaction.objectStore("mockAttempts").clear();
    transaction.objectStore("settings").put({
      key: SETTINGS_KEY,
      value: merged.settings.value,
    });
    for (const state of cardStates) transaction.objectStore("cardStates").put(state);
    for (const review of merged.reviews)
      transaction.objectStore("reviewEvents").put(review);
    if (activeAttempt !== undefined && !terminalIds.has(activeAttempt.id)) {
      transaction.objectStore("mockAttempts").put(activeAttempt);
    }
    for (const attempt of merged.mockAttempts) {
      transaction.objectStore("mockAttempts").put(attempt);
    }
    transaction.objectStore("syncConfig").put(persistedConfig);
    await transaction.done;
    return merged;
  }

  public async resetAll(): Promise<void> {
    const database = await this.database;
    const transaction = database.transaction(
      ["settings", "cardStates", "reviewEvents", "mockAttempts", "syncConfig"],
      "readwrite",
    );
    const syncRecord = (await transaction
      .objectStore("syncConfig")
      .get(SYNC_CONFIG_KEY)) as SyncConfig | undefined;
    transaction.objectStore("settings").clear();
    transaction.objectStore("cardStates").clear();
    transaction.objectStore("reviewEvents").clear();
    transaction.objectStore("mockAttempts").clear();
    if (syncRecord !== undefined) {
      transaction
        .objectStore("syncConfig")
        .put(createDisconnectedSyncConfig(syncRecord.deviceId));
    }
    await transaction.done;
  }

  public async disconnectSync(): Promise<void> {
    const database = await this.database;
    const transaction = database.transaction("syncConfig", "readwrite");
    const syncRecord = (await transaction.store.get(SYNC_CONFIG_KEY)) as
      SyncConfig | undefined;
    if (syncRecord !== undefined) {
      transaction.store.put(createDisconnectedSyncConfig(syncRecord.deviceId));
    }
    await transaction.done;
  }

  public async close(): Promise<void> {
    const database = await this.database;
    database.close();
  }
}

function settingsEqual(left: AppSettings, right: AppSettings): boolean {
  return (
    left.examAt === right.examAt && left.studyBufferHours === right.studyBufferHours
  );
}

function nextTimestamp(previous: string): string {
  const parsed = Date.parse(previous);
  const base = Number.isFinite(parsed) ? parsed : Date.now();
  return new Date(Math.max(base + 1, Date.now())).toISOString();
}

function nextTimestampAfter(previous: string, now: string): string {
  const previousTime = Date.parse(previous);
  const nowTime = Date.parse(now);
  const current = Number.isFinite(nowTime) ? nowTime : Date.now();
  const strictlyAfter = Number.isFinite(previousTime) ? previousTime + 1 : current;
  return new Date(Math.max(current, strictlyAfter)).toISOString();
}
