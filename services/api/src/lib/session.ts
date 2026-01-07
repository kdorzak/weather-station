const sessions = new Map<
  string,
  { user: { email: string }; csrfToken: string; createdAt: number }
>();

const randomId = () => crypto.randomUUID();

export const createSession = (email: string) => {
  const id = randomId();
  const csrfToken = randomId();
  sessions.set(id, { user: { email }, csrfToken, createdAt: Date.now() });
  return { id, csrfToken };
};

export const getSession = (id: string | undefined | null) => {
  if (!id) return null;
  return sessions.get(id) ?? null;
};

export const deleteSession = (id: string | undefined | null) => {
  if (!id) return;
  sessions.delete(id);
};

export const getSessionIdFromRequest = (request: Request, cookieName: string) => {
  const auth = request.headers.get("authorization");
  if (auth?.toLowerCase().startsWith("bearer ")) {
    return auth.slice(7).trim();
  }
  const cookie = request.headers.get("cookie");
  if (!cookie) return null;
  const parts = cookie.split(";").map((p) => p.trim());
  for (const part of parts) {
    if (part.startsWith(`${cookieName}=`)) {
      return decodeURIComponent(part.substring(cookieName.length + 1));
    }
  }
  return null;
};
