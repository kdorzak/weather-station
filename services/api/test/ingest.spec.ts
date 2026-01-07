import { describe, it, expect } from "vitest";
import { ingest } from "../src/routes/ingest";

const env = { DATABASE_URL: "test" };

const post = (body: unknown) =>
  new Request("http://localhost/v1/ingest", {
    method: "POST",
    body: typeof body === "string" ? body : JSON.stringify(body),
  });

describe("ingest route", () => {
  it("rejects invalid JSON", async () => {
    const response = await ingest(
      new Request("http://localhost/v1/ingest", { method: "POST", body: "not json" }),
      env
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe("invalid_payload");
  });

  it("rejects invalid envelope", async () => {
    const response = await ingest(post({ device_id: "d-1" }), env);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe("invalid_payload");
  });

  it("rejects when all readings invalid", async () => {
    const response = await ingest(
      post({
        schema: "measurements.v1",
        device_id: "d-1",
        sent_at: "2025-01-01T00:00:10Z",
        readings: [{}],
      }),
      env
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe("invalid_payload");
    expect(body.rejections).toHaveLength(1);
  });

  it("accepts valid batch", async () => {
    const response = await ingest(
      post({
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
      env
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status).toBe("ok");
    expect(body.ingested).toBe(1);
  });

  it("returns partial when some readings invalid", async () => {
    const response = await ingest(
      post({
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
      env
    );
    const body = await response.json();

    expect(response.status).toBe(207);
    expect(body.status).toBe("partial");
    expect(body.ingested).toBe(1);
    expect(body.rejected).toBe(1);
  });

  it("rejects unsupported method", async () => {
    const response = await ingest(
      new Request("http://localhost/v1/ingest", { method: "GET" }),
      env
    );
    const body = await response.json();

    expect(response.status).toBe(405);
    expect(body.error).toBe("Method not allowed");
  });
});
