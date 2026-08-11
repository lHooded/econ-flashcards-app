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
  type SyncPayloadSource,
} from "../sync/merge";
import type {
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
