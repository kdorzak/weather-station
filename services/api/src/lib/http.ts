export interface Env {
  DATABASE_URL: string;
}

export type Handler = (request: Request, env: Env) => Promise<Response>;

export const json = (data: unknown, init?: ResponseInit) =>
  new Response(JSON.stringify(data), {
    headers: { "content-type": "application/json" },
    ...init,
  });
