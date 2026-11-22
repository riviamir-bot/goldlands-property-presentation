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
