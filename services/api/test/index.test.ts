import { describe, it, expect } from "vitest";
import worker from "../src/index";

describe("Worker index (routing smoke)", () => {
  const env = {
    DATABASE_URL: "test",
  };

  it("returns health status", async () => {
    const request = new Request("http://localhost/health");
    const response = await worker.fetch(request, env);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ status: "ok", service: "weather-station-api" });
  });

  it("returns 404 for unknown path", async () => {
    const request = new Request("http://localhost/unknown");

    const response = await worker.fetch(request, env);
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error).toBe("Not Found");
  });
});