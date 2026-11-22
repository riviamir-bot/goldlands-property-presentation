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

  it("adds plans, technical spec and location only when present", () => {
    const project: Project = {
      ...base,
      googleMapsEmbedUrl: "https://maps",
      technicalSpecSections: [{ id: "s", title: "t", items: ["i"], displayOrder: 0 }],
    };
    expect(visibleSections(project, [{ ...apt, planAttached: true }])).toEqual([
      "opening", "apartments", "prices", "plans", "technical", "location",
    ]);
  });
});
