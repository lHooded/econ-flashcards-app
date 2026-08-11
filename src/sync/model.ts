import type { MockAttempt } from "../exam/mock/model";
import type { AppSettings, ReviewEvent } from "../domain/progress";

export const SYNC_PROTOCOL_VERSION = 1 as const;
export const SYNC_PAYLOAD_FORMAT = "econ-flashcards-sync" as const;
export const SYNC_ENVELOPE_FORMAT = "econ-flashcards-sync-ciphertext" as const;
export const PAIRING_PREFIX = "ecs1:" as const;
export const SYNC_CONFIG_KEY = "app" as const;

export interface SettingsStamp {
  readonly value: AppSettings;
  readonly updatedAt: string;
  readonly deviceId: string;
}

export interface SyncPayloadV1 {
  readonly format: typeof SYNC_PAYLOAD_FORMAT;
  readonly version: typeof SYNC_PROTOCOL_VERSION;
  readonly reviews: readonly ReviewEvent[];
  readonly settings: SettingsStamp;
  readonly mockAttempts: readonly MockAttempt[];
}

export interface SyncGroupCredentials {
  readonly syncId: string;
  readonly authToken: string;
  readonly encryptionKey: string;
}

export interface SyncGroupConfig extends SyncGroupCredentials {
  readonly remoteVersion: number;
}

export interface SyncConfig {
  readonly key: typeof SYNC_CONFIG_KEY;
  readonly deviceId: string;
  readonly group: SyncGroupConfig | null;
  readonly lastSyncedAt: string | null;
  readonly settingsStamp: SettingsStamp | null;
}

export interface SyncLocalState {
  readonly settings: AppSettings;
  readonly reviews: readonly ReviewEvent[];
  readonly mockAttempts: readonly MockAttempt[];
  readonly syncConfig: SyncConfig;
}

export interface EncryptedSyncEnvelope {
  readonly format: typeof SYNC_ENVELOPE_FORMAT;
  readonly version: typeof SYNC_PROTOCOL_VERSION;
  readonly iv: string;
  readonly ciphertext: string;
}

export type SyncPhase =
  | "unavailable"
  | "disconnected"
  | "synced"
  | "syncing"
  | "offline"
  | "retry"
  | "needs-attention";

export interface SyncStatus {
  readonly apiConfigured: boolean;
  readonly connected: boolean;
  readonly phase: SyncPhase;
  readonly lastSyncedAt: string | null;
  readonly message: string | null;
}
