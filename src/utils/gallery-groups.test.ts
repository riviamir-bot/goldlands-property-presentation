import { describe, expect, it } from "vitest";
import { groupGalleryByApartment } from "./gallery-groups";

describe("groupGalleryByApartment", () => {
  it("groups renders by the apartment in their caption, in numeric order", () => {
    const captions = {
      a: "דירה 26 · מטבח",
      b: "דירה 4 · סלון",
      c: "דירה 26 · חדר שינה",
    };
    const groups = groupGalleryByApartment(["a", "b", "c"], captions);
    expect(groups).toEqual([
      { apartmentNumber: "4", images: ["b"] },
      { apartmentNumber: "26", images: ["a", "c"] },
    ]);
  });

  it("puts renders without an apartment in one general group at the end", () => {
    const captions = { a: "דירה 3", b: "הבניין", c: "" };
    const groups = groupGalleryByApartment(["a", "b", "c", "d"], captions);
    expect(groups).toEqual([
      { apartmentNumber: "3", images: ["a"] },
      { apartmentNumber: null, images: ["b", "c", "d"] },
    ]);
  });

  it("returns only the general group when no caption names an apartment", () => {
    const groups = groupGalleryByApartment(["a", "b"], undefined);
    expect(groups).toEqual([{ apartmentNumber: null, images: ["a", "b"] }]);
  });

  it("returns no groups for an empty gallery", () => {
    expect(groupGalleryByApartment([], {})).toEqual([]);
  });
});
