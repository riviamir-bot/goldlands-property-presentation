import { describe, expect, it } from "vitest";
import { groupGalleryByApartment } from "./gallery-groups";

describe("groupGalleryByApartment", () => {
  it("groups numbered apartments in numeric order, with their renders in order", () => {
    const captions = { a: "דירה 26 · מטבח", b: "דירה 4 · סלון", c: "דירה 26 · חדר שינה" };
    expect(groupGalleryByApartment(["a", "b", "c"], captions)).toEqual([
      { key: "דירה 4", label: "דירה 4", images: ["b"] },
      { key: "דירה 26", label: "דירה 26", images: ["a", "c"] },
    ]);
  });

  it("groups renders that name only an apartment type, e.g. garden or 4-room apartments", () => {
    const captions = {
      a: "דירת גן · סלון",
      b: "דירת 4 חדרים · מטבח",
      c: "דירת 4 חדרים",
      d: "דירת גן",
    };
    const groups = groupGalleryByApartment(["a", "b", "c", "d"], captions);
    expect(groups.map((group) => group.label)).toEqual(["דירת 4 חדרים", "דירת גן"]);
    expect(groups[0].images).toEqual(["b", "c"]);
    expect(groups[1].images).toEqual(["a", "d"]);
  });

  it("puts numbered apartments before types, and renders with no apartment last", () => {
    const captions = { a: "דירת 3 חדרים", b: "דירה 7", c: "הבניין", d: "לובי" };
    const groups = groupGalleryByApartment(["a", "b", "c", "d"], captions);
    expect(groups).toEqual([
      { key: "דירה 7", label: "דירה 7", images: ["b"] },
      { key: "דירת 3 חדרים", label: "דירת 3 חדרים", images: ["a"] },
      { key: "", label: "", images: ["c", "d"] },
    ]);
  });

  it("returns one general group when no caption names an apartment", () => {
    expect(groupGalleryByApartment(["a", "b"], undefined)).toEqual([{ key: "", label: "", images: ["a", "b"] }]);
  });

  it("returns no groups for an empty gallery", () => {
    expect(groupGalleryByApartment([], {})).toEqual([]);
  });
});
