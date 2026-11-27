import { describe, expect, it } from "vitest";
import type { Project } from "../types";
import { localizeProject } from "./localize-project";

const base = {
  name: "בוגרשוב 13",
  city: "תל אביב",
  address: "בוגרשוב 13 תל אביב",
  neighborhood: "",
  tagline: "",
  description: "תיאור",
  locationDescription: "מיקום",
  developerAbout: "יזם",
  technicalSpecSections: [{ id: "content-0", title: "סלון", items: ["דלת"], displayOrder: 0 }],
  featureBlocks: [],
  translations: {
    en: {
      name: "Bograshov 13",
      city: "Tel Aviv",
      description: "Description",
      neighborhood: "",
      technicalSpecSections: [{ id: "content-0", title: "Living room", items: ["Door"], displayOrder: 0 }],
    },
  },
} as unknown as Project;

describe("localizeProject", () => {
  it("returns the Hebrew project untouched", () => {
    expect(localizeProject(base, "he")).toBe(base);
  });

  it("replaces translated fields and keeps Hebrew for the rest", () => {
    const en = localizeProject(base, "en");
    expect(en.name).toBe("Bograshov 13");
    expect(en.description).toBe("Description");
    expect(en.technicalSpecSections?.[0].title).toBe("Living room");
    expect(en.address).toBe("בוגרשוב 13 תל אביב");
    expect(en.locationDescription).toBe("מיקום");
    expect(en.neighborhood).toBe("");
  });

  it("falls back to Hebrew when a language has no translation", () => {
    expect(localizeProject(base, "fr")).toBe(base);
  });
});
