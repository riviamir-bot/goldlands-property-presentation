import { describe, expect, it } from "vitest";
import { planKind } from "./plans";
import type { Apartment } from "../types";

const apt = (extra: Partial<Apartment>) => ({ planAttached: true, planUrl: "https://signed/x", ...extra }) as Apartment;

describe("planKind", () => {
  it("uses the content type first, then the file name", () => {
    expect(planKind(apt({ planContentType: "application/pdf" }))).toBe("pdf");
    expect(planKind(apt({ planContentType: "image/png" }))).toBe("image");
    expect(planKind(apt({ planFileName: "דירה 7.PDF" }))).toBe("pdf");
    expect(planKind(apt({ planFileName: "plan.webp" }))).toBe("image");
  });

  it("reports none without a usable url", () => {
    expect(planKind(apt({ planUrl: undefined, planContentType: "application/pdf" }))).toBe("none");
    expect(planKind(apt({ planAttached: false, planContentType: "application/pdf" }))).toBe("none");
  });

  it("treats an unknown type as a document", () => {
    expect(planKind(apt({ planFileName: "plan" }))).toBe("pdf");
  });
});

describe("pdfRenderScale", () => {
  it("renders a page about 3200px wide, never upscaling more than 4x or below 1x", async () => {
    const { pdfRenderScale } = await import("./plans");
    expect(pdfRenderScale(1440)).toBeCloseTo(3200 / 1440);
    expect(pdfRenderScale(1984)).toBeCloseTo(3200 / 1984);
    expect(pdfRenderScale(400)).toBe(4);
    expect(pdfRenderScale(8000)).toBe(1);
    expect(pdfRenderScale(0)).toBe(1);
  });
});
