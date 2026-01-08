import { describe, it, expect } from "vitest";
import { formatNumber } from "./format";

describe("formatNumber", () => {
  it("formats number with default decimals (1 digit)", () => {
    expect(formatNumber(123.456)).toBe("123.5");
  });

  it("formats number with specified decimals", () => {
    expect(formatNumber(123.456, 1)).toBe("123.5");
    expect(formatNumber(123.456, 0)).toBe("123");
    expect(formatNumber(123.456, 3)).toBe("123.456");
  });

  it("handles undefined values", () => {
    expect(formatNumber(undefined)).toBe("—");
  });

  it("handles zero", () => {
    expect(formatNumber(0)).toBe("0.0");
    expect(formatNumber(0, 0)).toBe("0");
  });

  it("handles negative numbers", () => {
    expect(formatNumber(-5.5, 1)).toBe("-5.5");
  });
});
