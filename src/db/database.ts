import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { AppSettings, CardState, ReviewEvent } from "../domain/progress";
import type { MockAttempt } from "../exam/mock/model";

export const DATABASE_NAME = "econ-flashcards";
export const DATABASE_VERSION = 2;
export const SETTINGS_KEY = "app";

export interface SettingsRecord {
  readonly key: typeof SETTINGS_KEY;
  readonly value: AppSettings;
}

export interface EconDatabase extends DBSchema {
  cardStates: {
    key: string;
    value: CardState;
  };
  reviewEvents: {
    key: string;
    value: ReviewEvent;
  };
  settings: {
    key: string;
    value: SettingsRecord;
  };
  mockAttempts: {
    key: string;
    value: MockAttempt;
  };
}

export function openProgressDatabase(): Promise<IDBPDatabase<EconDatabase>> {
  return openDB<EconDatabase>(DATABASE_NAME, DATABASE_VERSION, {
    upgrade(database) {
      if (!database.objectStoreNames.contains("cardStates")) {
        database.createObjectStore("cardStates", { keyPath: "cardId" });
      }
      if (!database.objectStoreNames.contains("reviewEvents")) {
        database.createObjectStore("reviewEvents", { keyPath: "id" });
      }
      if (!database.objectStoreNames.contains("settings")) {
        database.createObjectStore("settings", { keyPath: "key" });
      }
      if (!database.objectStoreNames.contains("mockAttempts")) {
        database.createObjectStore("mockAttempts", { keyPath: "id" });
      }
    },
  });
}
