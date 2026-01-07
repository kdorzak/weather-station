import { Handler, json, getCookie } from "../lib/http";
import {
  createSession,
  deleteSession,
  getSession,
  getSessionIdFromRequest,
} from "../lib/session";

const sessionCookieName = "ws_session";
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
  const secure = request.url.startsWith("https:");
  const sameSite = secure ? "None" : "Lax";
  return json(
    {
      status: "ok",
      user: { email },
      session_id: session.id,
      csrf_token: session.csrfToken,
    },
    {
      headers: {
        "set-cookie": `${sessionCookieName}=${encodeURIComponent(
          session.id
        )}; HttpOnly; Path=/; SameSite=${sameSite}${secure ? "; Secure" : ""}`,
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

export const logout: Handler = async (request) => {
  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, { status: 405 });
  }
  const sessionId =
    getSessionIdFromRequest(request, sessionCookieName) ??
    getCookie(request.headers.get("cookie"), sessionCookieName);
  deleteSession(sessionId);
  const secure = request.url.startsWith("https:");
  const sameSite = secure ? "None" : "Lax";
  return json(
    { status: "ok" },
    {
      headers: {
        "set-cookie": `${sessionCookieName}=deleted; Path=/; Max-Age=0; SameSite=${sameSite}${secure ? "; Secure" : ""}`,
      },
    }
  );
};
