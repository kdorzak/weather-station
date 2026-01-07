import { Handler, json } from "../lib/http";

export const health: Handler = async () =>
  json({ status: "ok", service: "weather-station-api" });
