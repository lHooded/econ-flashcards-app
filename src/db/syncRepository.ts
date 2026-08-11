import { fromBase64Url } from "../sync/encoding";
import { validateSettings } from "../domain/progress";
import {
  SYNC_CONFIG_KEY,
  type SettingsStamp,
  type SyncConfig,
  type SyncGroupConfig,
} from "../sync/model";

export function createDisconnectedSyncConfig(deviceId: string): SyncConfig {
  validateDeviceId(deviceId);
  return {
    key: SYNC_CONFIG_KEY,
    deviceId,
    group: null,
    lastSyncedAt: null,
    settingsStamp: null,
  };
}

export function validateSyncConfig(value: unknown): SyncConfig {
  if (!isRecord(value)) throw new Error("Sync configuration is malformed.");
  if (value.key !== SYNC_CONFIG_KEY || typeof value.deviceId !== "string") {
    throw new Error("Sync configuration is malformed.");
  }
  validateDeviceId(value.deviceId);
  if (value.group !== null) validateGroupConfig(value.group);
  if (value.lastSyncedAt !== null && !isTimestamp(value.lastSyncedAt)) {
    throw new Error("Sync last-synced timestamp is malformed.");
  }
  if (value.settingsStamp !== null) validateSettingsStamp(value.settingsStamp);
  return value as unknown as SyncConfig;
}

function validateGroupConfig(value: unknown): asserts value is SyncGroupConfig {
  if (!isRecord(value)) throw new Error("Sync group configuration is malformed.");
  if (
    typeof value.syncId !== "string" ||
    typeof value.authToken !== "string" ||
    typeof value.encryptionKey !== "string" ||
    typeof value.remoteVersion !== "number" ||
    !Number.isInteger(value.remoteVersion) ||
    value.remoteVersion < 1
  ) {
    throw new Error("Sync group configuration is malformed.");
  }
  validateFixedBytes(value.syncId, 16, "sync ID");
  validateFixedBytes(value.authToken, 32, "authentication token");
  validateFixedBytes(value.encryptionKey, 32, "encryption key");
}

function validateSettingsStamp(value: unknown): asserts value is SettingsStamp {
  if (
    !isRecord(value) ||
    !isRecord(value.value) ||
    !Object.keys(value.value).every(
      (key) => key === "examAt" || key === "studyBufferHours",
    ) ||
    Object.keys(value.value).length !== 2
  ) {
    throw new Error("Sync settings stamp is malformed.");
  }
  if (typeof value.updatedAt !== "string" || !isTimestamp(value.updatedAt)) {
    throw new Error("Sync settings stamp is malformed.");
  }
  try {
    validateSettings(value.value);
  } catch {
    throw new Error("Sync settings stamp is malformed.");
  }
  if (typeof value.deviceId !== "string") {
    throw new Error("Sync settings stamp is malformed.");
  }
  validateDeviceId(value.deviceId);
}

function validateDeviceId(value: string): void {
  validateFixedBytes(value, 16, "device ID");
}

function validateFixedBytes(value: string, length: number, label: string): void {
  try {
    if (fromBase64Url(value).length !== length) throw new Error();
  } catch {
    throw new Error(`Sync ${label} is malformed.`);
  }
}

function isTimestamp(value: unknown): value is string {
  return typeof value === "string" && Number.isFinite(Date.parse(value));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
