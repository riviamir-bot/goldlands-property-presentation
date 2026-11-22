import { describe, expect, it } from "vitest";
import { escapeHtml } from "./html";

describe("escapeHtml", () => {
  it("neutralises markup in text placed into map labels and popups", () => {
    expect(escapeHtml(`<img src=x onerror="alert(1)">`)).toBe("&lt;img src=x onerror=&quot;alert(1)&quot;&gt;");
    expect(escapeHtml("ערבי נחל & בניין 'א'")).toBe("ערבי נחל &amp; בניין &#39;א&#39;");
  });
});
