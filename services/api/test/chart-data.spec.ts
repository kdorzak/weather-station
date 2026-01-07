import { describe, it, expect } from "vitest";
import { chartData } from "../src/routes/chart-data";

describe("chart-data route", () => {
  const env = { DATABASE_URL: "test" };

  it("returns ok with series and device id", async () => {
    const response = await chartData(new Request("http://localhost/v1/chart-data"), env);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status).toBe("ok");
    expect(body.device_id).toBeTruthy();
    expect(Array.isArray(body.series)).toBe(true);
    expect(body.series.length).toBeGreaterThan(0);
    expect(body.series[0]).toMatchObject({
      metric: expect.any(String),
      label: expect.any(String),
      unit: expect.any(String),
    });
    expect(body.series[0].data?.length).toBeGreaterThan(0);
  });
});
