import { Env, Handler, json, buildCorsHeaders, withCors } from "./lib/http";
import { health } from "./routes/health";
import { ingest } from "./routes/ingest";
import { chartData } from "./routes/chart-data";
import { login, me, logout, googleAuthStart, googleAuthCallback } from "./routes/auth";
import { openMeteoCurrent, openMeteoForecast, openMeteoAnalytics } from "./routes/open-meteo";

const notFound: Handler = async () =>
  json({ error: "Not Found" }, { status: 404 });

const route = (pathname: string): Handler => {
  if (pathname === "/health") return health;
  if (pathname === "/v1/ingest") return ingest;
  if (pathname === "/v1/chart-data") return chartData;
  if (pathname === "/auth/login") return login;
  if (pathname === "/auth/me") return me;
  if (pathname === "/auth/logout") return logout;
  if (pathname === "/auth/google") return googleAuthStart;
  if (pathname === "/auth/google/callback") return googleAuthCallback;
  if (pathname === "/external/open-meteo/current") return openMeteoCurrent;
  if (pathname === "/external/open-meteo/forecast") return openMeteoForecast;
  if (pathname === "/external/open-meteo/analytics") return openMeteoAnalytics;
  return notFound;
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: buildCorsHeaders(request, env) });
    }
    const res = await route(url.pathname)(request, env);
    return withCors(res, request, env);
  },
};