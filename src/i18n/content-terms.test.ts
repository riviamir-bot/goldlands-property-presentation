import { describe, expect, it } from "vitest";
import { translateCaption, translateTitle } from "./content-terms";

describe("content terms", () => {
  it("translates generated render captions", () => {
    expect(translateCaption("דירה 26 · מטבח", "en")).toBe("Apartment 26 · Kitchen");
    expect(translateCaption("קומה 3 · דירת 4 חדרים · סלון", "fr")).toBe("Étage 3 · Appartement 4 pièces · Salon");
  });
  it("keeps Hebrew and unknown text as is", () => {
    expect(translateCaption("דירה 26 · מטבח", "he")).toBe("דירה 26 · מטבח");
    expect(translateCaption("Custom group", "en")).toBe("Custom group");
    expect(translateTitle("בניין", "en")).toBe("Building");
  });
});
