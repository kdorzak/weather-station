import { Env, Handler, json } from "./lib/http";
import { health } from "./routes/health";
import { ingest } from "./routes/ingest";
import { chartData } from "./routes/chart-data";

const notFound: Handler = async () =>
  json({ error: "Not Found" }, { status: 404 });

const route = (pathname: string): Handler => {
  if (pathname === "/health") return health;
  if (pathname === "/v1/ingest") return ingest;
  if (pathname === "/v1/chart-data") return chartData;
  return notFound;
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    return route(url.pathname)(request, env);
  },
};