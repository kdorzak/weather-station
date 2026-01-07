export interface Env {
  DATABASE_URL: string;
  ALLOWLIST_EMAILS?: string; // comma-separated allowlist for dev auth
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

export const buildCorsHeaders = (request: Request): HeadersInit => {
  const origin = request.headers.get("origin");
  const allowOrigin = origin || "*";
  return {
    "access-control-allow-origin": allowOrigin,
    "access-control-allow-methods": "GET,POST,OPTIONS",
    "access-control-allow-headers": "content-type,authorization",
    "access-control-allow-credentials": "true",
  };
};

export const withCors = (response: Response, request: Request) => {
  const headers = new Headers(response.headers);
  const cors = buildCorsHeaders(request);
  Object.entries(cors).forEach(([k, v]) => headers.set(k, v));
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
};
