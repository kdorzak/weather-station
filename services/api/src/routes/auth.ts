import { Handler, json, getCookie } from "../lib/http";
import {
  createSession,
  deleteSession,
  getSession,
  getSessionIdFromRequest,
} from "../lib/session";

const sessionCookieName = "ws_session";
const stateCookieName = "oauth_state";
const nonceCookieName = "oauth_nonce";

const randomString = () => crypto.randomUUID().replace(/-/g, "");
const domainSegment = (request: Request, env: { COOKIE_DOMAIN?: string }) => {
  const host = new URL(request.url).hostname;
  const domain = env.COOKIE_DOMAIN?.replace(/^\./, "");
  if (domain && host.endsWith(domain)) {
    return `; Domain=.${domain}`;
  }
  return "";
};
const setSessionCookie = (sessionId: string, request: Request, env: { COOKIE_DOMAIN?: string }) => {
  const secure = request.url.startsWith("https:");
  const sameSite = "Lax";
  const domain = domainSegment(request, env);
  return `${sessionCookieName}=${encodeURIComponent(sessionId)}; HttpOnly; Path=/; SameSite=${sameSite}${domain}${
    secure ? "; Secure" : ""
  }`;
};
const clearSessionCookie = (request: Request, env: { COOKIE_DOMAIN?: string }) => {
  const secure = request.url.startsWith("https:");
  const sameSite = "Lax";
  const domain = domainSegment(request, env);
  return `${sessionCookieName}=deleted; Path=/; Max-Age=0; SameSite=${sameSite}${domain}${secure ? "; Secure" : ""}`;
};
const parseAllowlist = (env: { ALLOWLIST_EMAILS?: string }) =>
  (env.ALLOWLIST_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

export const login: Handler = async (request, env) => {
  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, { status: 405 });
  }
  let body: { email?: string };
  try {
    body = await request.json();
  } catch {
    return json({ error: "invalid_payload", message: "Invalid JSON" }, { status: 400 });
  }
  const email = body.email?.trim().toLowerCase();
  if (!email) {
    return json({ error: "invalid_payload", message: "email is required" }, { status: 400 });
  }

  const allowlist = parseAllowlist(env);
  if (allowlist.length > 0 && !allowlist.includes(email)) {
    return json({ error: "forbidden", message: "User not allowed" }, { status: 403 });
  }

  const session = createSession(email);
  return json(
    {
      status: "ok",
      user: { email },
      session_id: session.id,
      csrf_token: session.csrfToken,
    },
    {
      headers: {
        "set-cookie": setSessionCookie(session.id, request, env),
      },
    }
  );
};

export const me: Handler = async (request) => {
  const sessionId =
    getSessionIdFromRequest(request, sessionCookieName) ??
    getCookie(request.headers.get("cookie"), sessionCookieName);
  const session = getSession(sessionId);
  if (!session) {
    return json({ status: "unauthenticated" }, { status: 401 });
  }
  return json({
    status: "ok",
    user: session.user,
    csrf_token: session.csrfToken,
  });
};

export const logout: Handler = async (request, env) => {
  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, { status: 405 });
  }
  const sessionId =
    getSessionIdFromRequest(request, sessionCookieName) ??
    getCookie(request.headers.get("cookie"), sessionCookieName);
  deleteSession(sessionId);
  return json(
    { status: "ok" },
    {
      headers: {
        "set-cookie": clearSessionCookie(request, env),
      },
    }
  );
};

export const googleAuthStart: Handler = async (request, env) => {
  if (request.method !== "GET") {
    return json({ error: "Method not allowed" }, { status: 405 });
  }
  const clientId = env.GOOGLE_CLIENT_ID;
  const clientSecret = env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return json({ error: "server_config", message: "Google OAuth not configured" }, { status: 500 });
  }
  const state = randomString();
  const nonce = randomString();
  const redirectUri =
    env.GOOGLE_REDIRECT_URI?.trim() ||
    new URL("/auth/google/callback", request.url).toString();
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    state,
    nonce,
    access_type: "online",
    prompt: "consent",
  });
  const secure = request.url.startsWith("https:");
  const domain = env.COOKIE_DOMAIN ? `; Domain=${env.COOKIE_DOMAIN}` : "";
  const cookieAttrs = `Path=/; HttpOnly; SameSite=Lax${domain}${secure ? "; Secure" : ""}`;
  const headers = new Headers({ location: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}` });
  headers.append("set-cookie", `${stateCookieName}=${state}; Max-Age=600; ${cookieAttrs}`);
  headers.append("set-cookie", `${nonceCookieName}=${nonce}; Max-Age=600; ${cookieAttrs}`);
  return new Response(null, { status: 302, headers });
};

const decodeJwt = (token: string) => {
  const [, payload] = token.split(".");
  if (!payload) return null;
  const decoded = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
  try {
    return JSON.parse(decoded);
  } catch {
    return null;
  }
};

export const googleAuthCallback: Handler = async (request, env) => {
  if (request.method !== "GET") {
    return json({ error: "Method not allowed" }, { status: 405 });
  }
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const storedState = getCookie(request.headers.get("cookie"), stateCookieName);
  const storedNonce = getCookie(request.headers.get("cookie"), nonceCookieName);
  if (!code || !state) {
    return json({ error: "invalid_state" }, { status: 400 });
  }
  if (storedState && state !== storedState) {
    return json({ error: "invalid_state" }, { status: 400 });
  }
  const clientId = env.GOOGLE_CLIENT_ID;
  const clientSecret = env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return json({ error: "server_config", message: "Google OAuth not configured" }, { status: 500 });
  }
  const redirectUri =
    env.GOOGLE_REDIRECT_URI?.trim() ||
    new URL("/auth/google/callback", request.url).toString();
  const body = new URLSearchParams({
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    grant_type: "authorization_code",
  });
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!tokenRes.ok) {
    const text = await tokenRes.text();
    return json({ error: "oauth_exchange_failed", detail: text }, { status: 400 });
  }
  const tokenJson = (await tokenRes.json()) as any;
  const idToken = tokenJson.id_token as string | undefined;
  if (!idToken) {
    return json({ error: "missing_id_token" }, { status: 400 });
  }
  const payload = decodeJwt(idToken);
  if (!payload) {
    return json({ error: "invalid_id_token" }, { status: 400 });
  }
  const now = Math.floor(Date.now() / 1000);
  if (payload.aud !== clientId || !["https://accounts.google.com", "accounts.google.com"].includes(payload.iss)) {
    return json({ error: "invalid_id_token" }, { status: 400 });
  }
  if (payload.exp && payload.exp < now) {
    return json({ error: "expired_id_token" }, { status: 400 });
  }
  if (storedNonce && payload.nonce && payload.nonce !== storedNonce) {
    return json({ error: "invalid_nonce" }, { status: 400 });
  }
  const email = (payload.email as string | undefined)?.toLowerCase();
  if (!email) {
    return json({ error: "email_required" }, { status: 400 });
  }
  const allowlist = parseAllowlist(env);
  if (allowlist.length > 0 && !allowlist.includes(email)) {
    return json({ error: "forbidden", message: "User not allowed" }, { status: 403 });
  }
  const session = createSession(email);
  const redirectTo = env.FRONTEND_ORIGIN ?? "/";
  const secure = request.url.startsWith("https:");
  const domain = env.COOKIE_DOMAIN ? `; Domain=${env.COOKIE_DOMAIN}` : "";
  const baseAttrs = `Path=/; SameSite=Lax${domain}${secure ? "; Secure" : ""}`;
  const headers = new Headers({ location: redirectTo });
  headers.append("set-cookie", setSessionCookie(session.id, request, env));
  headers.append("set-cookie", `${stateCookieName}=deleted; Max-Age=0; ${baseAttrs}`);
  headers.append("set-cookie", `${nonceCookieName}=deleted; Max-Age=0; ${baseAttrs}`);
  return new Response(null, { status: 302, headers });
};
