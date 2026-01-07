import { describe, it, expect } from "vitest";
import worker from "../src/index";

describe("Worker index", () => {
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

  it("rejects invalid JSON", async () => {
    const request = new Request("http://localhost/v1/ingest", {
      method: "POST",
      body: "not json",
    });

    const response = await worker.fetch(request, env);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe("invalid_payload");
  });

  it("rejects invalid envelope", async () => {
    const request = new Request("http://localhost/v1/ingest", {
      method: "POST",
      body: JSON.stringify({ device_id: "d-1" }),
    });

    const response = await worker.fetch(request, env);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe("invalid_payload");
  });

  it("rejects when all readings invalid", async () => {
    const request = new Request("http://localhost/v1/ingest", {
      method: "POST",
      body: JSON.stringify({
        schema: "measurements.v1",
        device_id: "d-1",
        sent_at: "2025-01-01T00:00:10Z",
        readings: [{}],
      }),
    });

    const response = await worker.fetch(request, env);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe("invalid_payload");
    expect(body.rejections).toHaveLength(1);
  });

  it("accepts valid batch", async () => {
    const request = new Request("http://localhost/v1/ingest", {
      method: "POST",
      body: JSON.stringify({
        schema: "measurements.v1",
        device_id: "d-1",
        sent_at: "2025-01-01T00:00:10Z",
        readings: [
          {
            ts: "2025-01-01T00:00:00Z",
            sensor_key: "temp_1",
            metric: "temperature",
            unit: "C",
            value: 21.5,
          },
        ],
      }),
    });

    const response = await worker.fetch(request, env);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status).toBe("ok");
    expect(body.ingested).toBe(1);
  });

  it("returns partial when some readings invalid", async () => {
    const request = new Request("http://localhost/v1/ingest", {
      method: "POST",
      body: JSON.stringify({
        schema: "measurements.v1",
        device_id: "d-1",
        sent_at: "2025-01-01T00:00:10Z",
        readings: [
          {
            ts: "2025-01-01T00:00:00Z",
            sensor_key: "temp_1",
            metric: "temperature",
            unit: "C",
            value: 21.5,
          },
          { ts: "bad-ts", sensor_key: "temp_1", metric: "temperature", unit: "C", value: 21.5 },
        ],
      }),
    });

    const response = await worker.fetch(request, env);
    const body = await response.json();

    expect(response.status).toBe(207);
    expect(body.status).toBe("partial");
    expect(body.ingested).toBe(1);
    expect(body.rejected).toBe(1);
  });

  it("rejects unsupported method", async () => {
    const request = new Request("http://localhost/v1/ingest", { method: "GET" });

    const response = await worker.fetch(request, env);
    const body = await response.json();

    expect(response.status).toBe(405);
    expect(body.error).toBe("Method not allowed");
  });

  it("returns 404 for unknown path", async () => {
    const request = new Request("http://localhost/unknown");

    const response = await worker.fetch(request, env);
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error).toBe("Not Found");
  });
});