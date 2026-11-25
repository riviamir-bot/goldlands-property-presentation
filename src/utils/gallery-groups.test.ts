import { describe, expect, it } from "vitest";
import { buildGalleryGroups, groupGalleryByApartment } from "./gallery-groups";

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

describe("buildGalleryGroups", () => {
  it("puts manual groups first in their order and groups the rest automatically", async () => {
    const { buildGalleryGroups } = await import("./gallery-groups");
    const captions = { a: "דירת גן", b: "דירה 3", c: "הבניין", d: "לובי" };
    const groups = buildGalleryGroups(["a", "b", "c", "d"], captions, [
      { id: "building", name: "הבניין", images: ["c", "d"] },
      { id: "garden", name: "דירות גן", images: ["a"] },
    ]);
    expect(groups.map((group) => [group.key, group.label, group.images])).toEqual([
      ["building", "הבניין", ["c", "d"]],
      ["garden", "דירות גן", ["a"]],
      ["דירה 3", "דירה 3", ["b"]],
    ]);
  });

  it("drops manual groups with no images, and ignores images that are not in the gallery", async () => {
    const { buildGalleryGroups } = await import("./gallery-groups");
    const groups = buildGalleryGroups(["a"], {}, [
      { id: "empty", name: "ריקה", images: ["x"] },
      { id: "one", name: "אחת", images: ["a", "a"] },
    ]);
    expect(groups).toEqual([{ key: "one", label: "אחת", images: ["a"] }]);
  });

  it("falls back to the automatic grouping when there are no manual groups", async () => {
    const { buildGalleryGroups } = await import("./gallery-groups");
    const captions = { a: "דירה 2", b: "דירה 1" };
    expect(buildGalleryGroups(["a", "b"], captions, [])).toEqual(
      groupGalleryByApartment(["a", "b"], captions),
    );
  });
});
