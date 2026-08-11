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
  readonly CORS_ORIGINS?: string;
}

const PRODUCTION_ORIGIN = "https://lhooded.github.io";

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const origin = request.headers.get("Origin");
    const allowed = allowedOrigins(env);
    if (origin !== null && !allowed.has(origin)) {
      return jsonResponse({ error: "Origin is not allowed." }, 403);
    }

    if (request.method === "OPTIONS") {
      return withCors(new Response(null, { status: 204 }), origin);
    }

    const url = new URL(request.url);
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
    const id = env.SYNC_GROUPS.idFromName(syncId);
    const response = await env.SYNC_GROUPS.get(id).fetch(request);
    return withCors(response, origin);
  },
};

export { SyncGroup };

function allowedOrigins(env: Env): Set<string> {
  const configured = env.CORS_ORIGINS?.split(",")
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0 && origin !== "*");
  return new Set(configured === undefined ? [PRODUCTION_ORIGIN] : configured);
}

function withCors(response: Response, origin: string | null): Response {
  if (origin === null) return response;
  const headers = new Headers(response.headers);
  headers.set("Access-Control-Allow-Origin", origin);
  headers.set("Access-Control-Allow-Methods", "GET, PUT, DELETE, OPTIONS");
  headers.set("Access-Control-Allow-Headers", "Authorization, Content-Type");
  headers.set("Vary", "Origin");
  return new Response(response.body, { status: response.status, headers });
}
