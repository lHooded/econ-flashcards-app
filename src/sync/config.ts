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
  readonly isSecureContext?: boolean;
}

/**
 * Sync credentials are deliberately unavailable on a GitHub Pages project-site
 * origin. Browser storage is scoped to the origin, not to the project path.
 */
export function resolveSyncRuntimeConfig(
  input: SyncRuntimeConfigInput,
): SyncRuntimeConfig {
  const rawApiUrl = cleanUrl(input.apiUrl);
  const rawAppUrl = cleanUrl(input.appUrl);
  if (rawApiUrl === null) {
    return {
      apiUrl: null,
      appUrl: parseSyncUrl(rawAppUrl)?.href ?? null,
      enabled: false,
      reason: "Cloud sync is not configured for this deployment.",
    };
  }

  const apiUrl = parseSyncUrl(rawApiUrl);
  const appUrl = parseSyncUrl(rawAppUrl);
  if (
    apiUrl === null ||
    !isAllowedSyncTransport(apiUrl) ||
    isGithubIoHost(apiUrl.hostname)
  ) {
    return {
      apiUrl: null,
      appUrl: appUrl?.href ?? null,
      enabled: false,
      reason:
        "Cloud sync requires an HTTPS sync API; HTTP is allowed only for loopback development.",
    };
  }
  if (appUrl === null || !isAllowedSyncTransport(appUrl)) {
    return {
      apiUrl: apiUrl.href,
      appUrl: appUrl?.href ?? null,
      enabled: false,
      reason:
        "Cloud sync requires an HTTPS dedicated frontend origin; HTTP is allowed only for loopback development.",
    };
  }
  if (isGithubIoHost(appUrl.hostname)) {
    return {
      apiUrl: apiUrl.href,
      appUrl: appUrl.href,
      enabled: false,
      reason:
        "Cloud sync stays disabled on shared github.io project-site origins; use a dedicated frontend origin.",
    };
  }
  const currentOrigin = input.currentOrigin?.trim() ?? null;
  if (currentOrigin === null || currentOrigin !== appUrl.origin) {
    return {
      apiUrl: apiUrl.href,
      appUrl: appUrl.href,
      enabled: false,
      reason:
        "Cloud sync is available only when this app is served from its configured dedicated origin.",
    };
  }
  if (input.isSecureContext !== true) {
    return {
      apiUrl: apiUrl.href,
      appUrl: appUrl.href,
      enabled: false,
      reason: "Cloud sync requires a secure browser context.",
    };
  }
  return { apiUrl: apiUrl.href, appUrl: appUrl.href, enabled: true, reason: null };
}

export function configuredSyncRuntime(): SyncRuntimeConfig {
  return resolveSyncRuntimeConfig({
    apiUrl: import.meta.env.VITE_SYNC_API_URL,
    appUrl: import.meta.env.VITE_SYNC_APP_URL,
    currentOrigin: typeof window === "undefined" ? null : window.location.origin,
    isSecureContext:
      typeof window === "undefined" ? false : window.isSecureContext === true,
  });
}

export function validateSyncAppUrl(value: string): URL {
  const parsed = parseSyncUrl(value);
  if (
    parsed === null ||
    !isAllowedSyncTransport(parsed) ||
    isGithubIoHost(parsed.hostname)
  ) {
    throw new Error(
      "A secure dedicated sync app URL is required; use HTTPS except for loopback development.",
    );
  }
  return parsed;
}

export function validateSyncApiUrl(value: string): URL {
  const parsed = parseSyncUrl(value);
  if (
    parsed === null ||
    !isAllowedSyncTransport(parsed) ||
    isGithubIoHost(parsed.hostname)
  ) {
    throw new Error(
      "A secure sync API URL is required; use HTTPS except for loopback development.",
    );
  }
  return parsed;
}

export function isSecureSyncAppUrl(value: string): boolean {
  try {
    validateSyncAppUrl(value);
    return true;
  } catch {
    return false;
  }
}

export function isLoopbackSyncHostname(hostname: string): boolean {
  const normalized = hostname.toLowerCase().replace(/^\[|\]$/gu, "");
  return (
    normalized === "localhost" || normalized === "127.0.0.1" || normalized === "::1"
  );
}

function parseSyncUrl(value: string | null): URL | null {
  if (value === null) return null;
  let parsed: URL;
  try {
    parsed = new URL(value);
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

function isAllowedSyncTransport(url: URL): boolean {
  return (
    url.protocol === "https:" ||
    (url.protocol === "http:" && isLoopbackSyncHostname(url.hostname))
  );
}

function cleanUrl(value: string | null | undefined): string | null {
  const clean = value?.trim() ?? "";
  return clean === "" ? null : clean;
}

function isGithubIoHost(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/\.$/u, "");
  return host === "github.io" || host.endsWith(".github.io");
}
