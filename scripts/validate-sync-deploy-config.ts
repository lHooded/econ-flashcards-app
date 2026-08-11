import { validateSyncApiUrl, validateSyncAppUrl } from "../src/sync/config";

export interface SyncDeploymentConfig {
  readonly appUrl: URL;
  readonly apiUrl: URL | null;
}

export function validateSyncDeploymentConfig(
  appValue: string | undefined,
  apiValue: string | undefined,
): SyncDeploymentConfig {
  const appValueTrimmed = appValue?.trim() ?? "";
  if (appValueTrimmed === "") {
    throw new Error("SYNC_APP_URL must be configured for production sync deployment.");
  }
  const appUrl = validateSyncAppUrl(appValueTrimmed);
  requireHttps(appUrl, "SYNC_APP_URL");

  const apiValueTrimmed = apiValue?.trim() ?? "";
  if (apiValueTrimmed === "") return { appUrl, apiUrl: null };
  const apiUrl = validateSyncApiUrl(apiValueTrimmed);
  requireHttps(apiUrl, "SYNC_API_URL");
  return { appUrl, apiUrl };
}

function requireHttps(url: URL, label: string): void {
  if (url.protocol !== "https:") {
    throw new Error(`${label} must use HTTPS outside loopback local development.`);
  }
}

const processLike = (
  globalThis as {
    process?: {
      readonly env?: Record<string, string | undefined>;
      exitCode?: number;
    };
  }
).process;
const environment = processLike?.env;

try {
  const config = validateSyncDeploymentConfig(
    environment?.SYNC_APP_URL,
    environment?.SYNC_API_URL,
  );
  console.log(`Validated production sync app origin: ${config.appUrl.origin}`);
  if (config.apiUrl !== null) {
    console.log(`Validated production sync API origin: ${config.apiUrl.origin}`);
  }
} catch (error: unknown) {
  console.error(
    error instanceof Error
      ? error.message
      : "Sync deployment configuration is invalid.",
  );
  if (processLike !== undefined) processLike.exitCode = 1;
}
