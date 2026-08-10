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
import type { ProgressBackupV1 } from "../domain/backup";
import { openProgressDatabase, SETTINGS_KEY, type SettingsRecord } from "./database";

export interface RecordedReview {
  readonly event: ReviewEvent;
  readonly cardState: CardState;
}

export class ProgressRepository {
  private readonly database: ReturnType<typeof openProgressDatabase>;

  public constructor(private readonly validCardIds: ReadonlySet<string>) {
    this.database = openProgressDatabase();
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
    await database.put("settings", { key: SETTINGS_KEY, value: validated });
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

  public async replaceAll(backup: ProgressBackupV1): Promise<void> {
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

    const database = await this.database;
    const transaction = database.transaction(
      ["settings", "cardStates", "reviewEvents"],
      "readwrite",
    );

    transaction.objectStore("settings").clear();
    transaction.objectStore("cardStates").clear();
    transaction.objectStore("reviewEvents").clear();
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
    await transaction.done;
  }

  public async resetAll(): Promise<void> {
    const database = await this.database;
    const transaction = database.transaction(
      ["settings", "cardStates", "reviewEvents"],
      "readwrite",
    );
    transaction.objectStore("settings").clear();
    transaction.objectStore("cardStates").clear();
    transaction.objectStore("reviewEvents").clear();
    await transaction.done;
  }

  public async close(): Promise<void> {
    const database = await this.database;
    database.close();
  }
}
