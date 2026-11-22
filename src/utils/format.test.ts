import { describe, expect, it } from "vitest";
import { formatNumber, formatPrice } from "./format";

describe("format", () => {
  it("formats missing numbers as a dash", () => {
    expect(formatPrice(0)).toBe("—");
    expect(formatPrice(Number.NaN)).toBe("—");
    expect(formatPrice(-5)).toBe("—");
    expect(formatNumber(0, "מ״ר")).toBe("—");
    expect(formatNumber(Number.NaN)).toBe("—");
  });

  it("formats real values", () => {
    expect(formatPrice(3250000)).toContain("3,250,000");
    expect(formatPrice(3250000)).toContain("₪");
    expect(formatNumber(98, "מ״ר")).toBe("98 מ״ר");
    expect(formatNumber(4.5)).toBe("4.5");
  });
});
