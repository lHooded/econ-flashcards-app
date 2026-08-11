import { SyncGroup } from "./SyncGroup";
import { jsonResponse, validateSyncId } from "./protocol";

interface DurableObjectStubLike {
  fetch(request: Request): Promise<Response>;
}

interface DurableObjectNamespaceLike {
  idFromName(name: string): unknown;
  get(id: unknown): DurableObjectStubLike;
}

export interface Env {
  readonly SYNC_GROUPS: DurableObjectNamespaceLike;
  readonly CLIENT_LIMITER?: RateLimiterLike;
  readonly CREATION_LIMITER?: RateLimiterLike;
  readonly GROUP_LIMITER?: RateLimiterLike;
  readonly CORS_ORIGINS?: string;
  readonly SYNC_ALLOWED_ORIGIN?: string;
}

interface RateLimiterLike {
  limit(options: { readonly key: string }): Promise<{ readonly success: boolean }>;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin");
    const allowed = allowedOrigins(env);
    const isSyncPath = /^\/v1\/sync\//u.test(url.pathname);
    if (isSyncPath && allowed.size === 0) {
      return jsonResponse({ error: "Sync service origin is not configured." }, 503);
    }
    if (origin !== null && !allowed.has(origin)) {
      return jsonResponse({ error: "Origin is not allowed." }, 403);
    }

    if (url.pathname === "/health") {
      if (request.method !== "GET")
        return withCors(
          jsonResponse({ error: "Method is not supported." }, 405),
          origin,
        );
      return withCors(jsonResponse({ ok: true, protocol: 1 }), origin);
    }

    const match = /^\/v1\/sync\/([^/]+)$/u.exec(url.pathname);
    if (match === null)
      return withCors(jsonResponse({ error: "Not found." }, 404), origin);
    let syncId: string;
    try {
      syncId = decodeURIComponent(match[1]);
    } catch {
      return withCors(jsonResponse({ error: "Not found." }, 404), origin);
    }
    if (!validateSyncId(syncId))
      return withCors(jsonResponse({ error: "Not found." }, 404), origin);
    const clientLimit = await enforceRateLimit(
      env.CLIENT_LIMITER,
      `client:${clientKey(request)}`,
    );
    if (clientLimit !== null) return withCors(clientLimit, origin);
    const groupLimit = await enforceRateLimit(env.GROUP_LIMITER, `group:${syncId}`);
    if (groupLimit !== null) return withCors(groupLimit, origin);
    if (request.method === "OPTIONS") {
      return withCors(new Response(null, { status: 204 }), origin);
    }
    if (request.method === "POST") {
      const creationLimit = await enforceRateLimit(
        env.CREATION_LIMITER,
        `client:${clientKey(request)}`,
      );
      if (creationLimit !== null) return withCors(creationLimit, origin);
    }
    const id = env.SYNC_GROUPS.idFromName(syncId);
    const response = await env.SYNC_GROUPS.get(id).fetch(request);
    return withCors(response, origin);
  },
};

export { SyncGroup };

function allowedOrigins(env: Env): Set<string> {
  const configured = env.CORS_ORIGINS ?? env.SYNC_ALLOWED_ORIGIN;
  if (configured === undefined) return new Set();
  const origins = configured
    .split(",")
    .map((value) => parseAllowedOrigin(value))
    .filter((value): value is string => value !== null);
  return new Set(origins);
}

async function enforceRateLimit(
  limiter: RateLimiterLike | undefined,
  key: string,
): Promise<Response | null> {
  if (limiter === undefined) {
    return jsonResponse({ error: "Sync abuse protection is not configured." }, 503);
  }
  try {
    const result = await limiter.limit({ key });
    return result.success
      ? null
      : jsonResponse({ error: "Too many sync requests; try again later." }, 429);
  } catch {
    return jsonResponse({ error: "Sync abuse protection is unavailable." }, 503);
  }
}

function clientKey(request: Request): string {
  const cloudflareIp = request.headers.get("CF-Connecting-IP")?.trim();
  if (cloudflareIp !== undefined && cloudflareIp !== "") return cloudflareIp;
  return "unknown";
}

function parseAllowedOrigin(value: string): string | null {
  const trimmed = value.trim();
  if (trimmed === "" || trimmed === "*") return null;
  try {
    const url = new URL(trimmed);
    if (
      (url.protocol !== "https:" && url.protocol !== "http:") ||
      url.username !== "" ||
      url.password !== "" ||
      url.search !== "" ||
      url.hash !== ""
    ) {
      return null;
    }
    const host = url.hostname.toLowerCase().replace(/\.$/u, "");
    if (host === "github.io" || host.endsWith(".github.io")) return null;
    if (url.protocol === "http:" && !isLoopbackHostname(url.hostname)) return null;
    return url.origin;
  } catch {
    return null;
  }
}

function isLoopbackHostname(hostname: string): boolean {
  const normalized = hostname.toLowerCase().replace(/^\[|\]$/gu, "");
  return (
    normalized === "localhost" || normalized === "127.0.0.1" || normalized === "::1"
  );
}

function withCors(response: Response, origin: string | null): Response {
  if (origin === null) return response;
  const headers = new Headers(response.headers);
  headers.set("Access-Control-Allow-Origin", origin);
  headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  headers.set("Access-Control-Allow-Headers", "Authorization, Content-Type");
  headers.set("Vary", "Origin");
  return new Response(response.body, { status: response.status, headers });
}
