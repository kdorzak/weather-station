export interface Env {
  ENVIRONMENT: string;
  DATABASE_URL: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    return new Response(`Weather Station API (${env.ENVIRONMENT}): OK`, { status: 200 });
  },
};