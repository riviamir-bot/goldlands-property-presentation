import { describe, expect, it } from "vitest";
import { visibleSections } from "./sections";
import type { Apartment, Project } from "../types";

const base: Project = {
  id: "p", name: "n", location: "", city: "", neighborhood: "", address: "", googleMapsUrl: "", googleMapsEmbedUrl: "",
  projectType: "פרויקט חדש", tagline: "", description: "", logoMark: "n", projectLogo: "", heroImage: "", keyFacts: [],
  stats: { floors: "", units: "", occupancy: "", parking: "", buildings: "", existingApartments: "", newApartments: "", storage: "" },
  apartmentMix: { threeRooms: "", fourRooms: "", fiveRooms: "", gardenApartments: "", penthouses: "" },
  gallery: { exterior: [], interior: [], lobby: [], surroundings: [] },
};
const apt = { id: "a", projectId: "p", planAttached: false } as Apartment;

describe("visibleSections", () => {
  it("shows only the opening screen for a project with no content", () => {
    expect(visibleSections(base, [])).toEqual(["opening"]);
  });

  it("adds apartments, prices and gallery when they have content", () => {
    const project = { ...base, gallery: { ...base.gallery, interior: ["u"] } };
    expect(visibleSections(project, [apt])).toEqual(["opening", "apartments", "prices", "gallery"]);
  });

  it("adds plans, technical spec, 3D and location only when present", () => {
    const project: Project = {
      ...base,
      address: "ערבי נחל 28",
      model3dUrl: "https://my.matterport.com/show/?m=1",
      technicalSpecSections: [{ id: "s", title: "t", items: ["i"], displayOrder: 0 }],
    };
    expect(visibleSections(project, [{ ...apt, planAttached: true, planUrl: "https://x/p.pdf" }])).toEqual([
      "opening", "apartments", "prices", "plans", "technical", "model3d", "location",
    ]);
  });

  it("does not offer the plans tab for a plan flag without a file", () => {
    expect(visibleSections(base, [{ ...apt, planAttached: true }])).not.toContain("plans");
  });

  it("hides the price list when prices are hidden", () => {
    expect(visibleSections(base, [apt], { showPrices: false })).toEqual(["opening", "apartments"]);
  });
});
