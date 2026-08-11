export interface SyncRuntimeConfig {
  readonly apiUrl: string | null;
  readonly appUrl: string | null;
  readonly enabled: boolean;
  readonly reason: string | null;
}

export interface SyncRuntimeConfigInput {
  readonly apiUrl?: string | null;
  readonly appUrl?: string | null;
  readonly currentOrigin?: string | null;
}

/**
 * Sync credentials are deliberately unavailable on a GitHub Pages project-site
 * origin. Browser storage is scoped to the origin, not to the project path.
 */
export function resolveSyncRuntimeConfig(
  input: SyncRuntimeConfigInput,
): SyncRuntimeConfig {
  const apiUrl = cleanUrl(input.apiUrl);
  const appUrl = parseAppUrl(input.appUrl);
  if (apiUrl === null) {
    return {
      apiUrl: null,
      appUrl: appUrl?.href ?? null,
      enabled: false,
      reason: "Cloud sync is not configured for this deployment.",
    };
  }
  if (appUrl === null) {
    return {
      apiUrl,
      appUrl: null,
      enabled: false,
      reason:
        "Cloud sync requires a dedicated frontend origin configured with VITE_SYNC_APP_URL.",
    };
  }
  const currentOrigin = input.currentOrigin?.trim() ?? null;
  if (currentOrigin === null || currentOrigin !== appUrl.origin) {
    return {
      apiUrl,
      appUrl: appUrl.href,
      enabled: false,
      reason:
        "Cloud sync is available only when this app is served from its configured dedicated origin.",
    };
  }
  if (isGithubIoHost(appUrl.hostname)) {
    return {
      apiUrl,
      appUrl: appUrl.href,
      enabled: false,
      reason:
        "Cloud sync stays disabled on shared github.io project-site origins; use a dedicated frontend origin.",
    };
  }
  return { apiUrl, appUrl: appUrl.href, enabled: true, reason: null };
}

export function configuredSyncRuntime(): SyncRuntimeConfig {
  return resolveSyncRuntimeConfig({
    apiUrl: import.meta.env.VITE_SYNC_API_URL,
    appUrl: import.meta.env.VITE_SYNC_APP_URL,
    currentOrigin: typeof window === "undefined" ? null : window.location.origin,
  });
}

export function validateSyncAppUrl(value: string): URL {
  const parsed = parseAppUrl(value);
  if (parsed === null || isGithubIoHost(parsed.hostname)) {
    throw new Error("A dedicated sync app URL is required.");
  }
  return parsed;
}

function parseAppUrl(value: string | null | undefined): URL | null {
  const clean = cleanUrl(value);
  if (clean === null) return null;
  let parsed: URL;
  try {
    parsed = new URL(clean);
  } catch {
    return null;
  }
  if (
    (parsed.protocol !== "https:" && parsed.protocol !== "http:") ||
    parsed.username !== "" ||
    parsed.password !== "" ||
    parsed.search !== "" ||
    parsed.hash !== "" ||
    parsed.hostname === ""
  ) {
    return null;
  }
  return parsed;
}

function cleanUrl(value: string | null | undefined): string | null {
  const clean = value?.trim() ?? "";
  return clean === "" ? null : clean;
}

function isGithubIoHost(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/\.$/u, "");
  return host === "github.io" || host.endsWith(".github.io");
}
