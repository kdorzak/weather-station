export interface Env {
  DATABASE_URL: string;
  ALLOWLIST_EMAILS?: string; // comma-separated allowlist for dev auth
  FRONTEND_ORIGIN?: string; // e.g. https://weather.kdorzak.online
  COOKIE_DOMAIN?: string; // e.g. .kdorzak.online
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  GOOGLE_REDIRECT_URI?: string;
}

export type Handler = (request: Request, env: Env) => Promise<Response>;

export const json = (data: unknown, init?: ResponseInit) =>
  new Response(JSON.stringify(data), {
    headers: { "content-type": "application/json" },
    ...init,
  });

export const getCookie = (cookieHeader: string | null | undefined, name: string) => {
  if (!cookieHeader) return null;
  const parts = cookieHeader.split(";").map((p) => p.trim());
  for (const part of parts) {
    if (part.startsWith(`${name}=`)) {
      return decodeURIComponent(part.substring(name.length + 1));
    }
  }
  return null;
};

const isOriginAllowed = (origin: string | null, allowed: string | undefined) => {
  if (!origin) return false;
  if (!allowed) return true;
  return origin === allowed;
};

export const buildCorsHeaders = (request: Request, env: Env): HeadersInit => {
  const origin = request.headers.get("origin");
  const allowOrigin = isOriginAllowed(origin, env.FRONTEND_ORIGIN) ? origin : "";
  return {
    ...(allowOrigin ? { "access-control-allow-origin": allowOrigin } : {}),
    "access-control-allow-methods": "GET,POST,OPTIONS",
    "access-control-allow-headers": "content-type,authorization",
    "access-control-allow-credentials": "true",
    "vary": "Origin",
  };
};

export const withCors = (response: Response, request: Request, env: Env) => {
  const headers = new Headers(response.headers);
  const cors = buildCorsHeaders(request, env);
  Object.entries(cors).forEach(([k, v]) => headers.set(k, v));
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
};
