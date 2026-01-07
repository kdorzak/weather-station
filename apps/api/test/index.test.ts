import { describe, it, expect } from "vitest";
import worker from "../src/index";

describe("Worker index", () => {
  it("returns OK response", async () => {
    const request = new Request("http://localhost/");
    const env = {
      ENVIRONMENT: "test",
      DATABASE_URL: "test",
    };

    const response = await worker.fetch(request, env);
    const text = await response.text();

    expect(response.status).toBe(200);
    expect(text).toContain("Weather Station API");
  });
});