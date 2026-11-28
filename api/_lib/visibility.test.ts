import { describe, expect, it } from "vitest";
import type { Project } from "../../src/types";
import type { MarketingProjectRow } from "./types";
import { applyVisibility, buildSharedDetails, hiddenTopics } from "./visibility";

const project = {
  id: "p1",
  name: "ערבי נחל",
  city: "תל אביב",
  address: "ערבי נחל 5, תל אביב",
  location: "ערבי נחל 5, תל אביב",
  description: "תיאור",
  keyFacts: ["שלד", "40 דירות"],
  stats: { floors: "", units: "40", occupancy: "", parking: "", buildings: "", existingApartments: "10", newApartments: "40", storage: "" },
  apartmentMix: { threeRooms: "2", fourRooms: "3", fiveRooms: "1", gardenApartments: "", penthouses: "" },
  gallery: { exterior: ["https://x/a.jpg"], interior: [], lobby: [], surroundings: [] },
  galleryCaptions: { "https://x/a.jpg": "הבניין" },
  renderGroups: [{ id: "g", name: "בניין", isBuilding: true, images: ["https://x/a.jpg"] }],
  heroImage: "https://x/a.jpg",
  model3dUrl: "https://3d.example/m",
  developerAbout: "אודות היזם",
  facts: [
    { label: "צפי סיום עבודה", value: "2028" },
    { label: "קומות", value: "8" },
  ],
  details: {
    developerCompany: "מרכז העיר",
    financingBank: "",
    constructionStage: "שלד",
    constructionStartDate: "",
    constructionCompletionDate: "2028-01-01",
    websiteUrl: "",
  },
  translations: { en: { address: "5 Arvei Nahal", description: "About", developerAbout: "Developer" } },
} as unknown as Project;

describe("hiddenTopics", () => {
  it("keeps known topics only", () => {
    expect([...hiddenTopics(["address", "bogus", 4, "renders"])]).toEqual(["address", "renders"]);
    expect(hiddenTopics(null).size).toBe(0);
  });
});

describe("applyVisibility", () => {
  it("returns the project untouched when nothing is hidden", () => {
    expect(applyVisibility(project, new Set())).toBe(project);
  });

  it("removes each hidden topic, in every language", () => {
    const result = applyVisibility(
      project,
      hiddenTopics(["address", "developer", "construction_stage", "completion_date", "units", "description", "renders", "model_3d", "apartments"]),
    );
    expect(result.address).toBe("");
    expect(result.location).toBe("תל אביב");
    expect(result.details?.developerCompany).toBe("");
    expect(result.developerAbout).toBe("");
    expect(result.details?.constructionStage).toBe("");
    expect(result.details?.constructionCompletionDate).toBe("");
    expect(result.facts).toEqual([{ label: "קומות", value: "8" }]);
    expect(result.stats.units).toBe("");
    expect(result.keyFacts).toEqual([]);
    expect(result.description).toBe("");
    expect(result.gallery.exterior).toEqual([]);
    expect(result.renderGroups).toEqual([]);
    expect(result.heroImage).toBe("https://x/a.jpg");
    expect(result.model3dUrl).toBe("");
    expect(result.apartmentMix.fourRooms).toBe("");
    expect(result.translations?.en).toEqual({ address: "", description: "", developerAbout: "" });
  });

  it("hides one topic and leaves the rest, without changing the source project", () => {
    const result = applyVisibility(project, hiddenTopics(["units"]));
    expect(result.stats.units).toBe("");
    expect(result.keyFacts).toEqual(["שלד"]);
    expect(result.description).toBe("תיאור");
    expect(project.stats.units).toBe("40");
  });
});

describe("buildSharedDetails", () => {
  const row = {
    id: "p1",
    project_type: "פרויקט חדש",
    company_number: " 515000000 ",
    financing_bank: "בנק הפועלים",
    block: "6100",
    parcel: "12",
    building_count: 2,
    existing_units: 0,
    new_units: 40,
    construction_start_date: "2027-03-01T00:00:00Z",
    price_list_url: "https://example.com/prices.pdf",
    presentation_url: "http://insecure.example.com/deck",
    registration_form_url: "https://example.com/form",
    project_website_url: "https://example.com",
  } as unknown as MarketingProjectRow;

  it("shows nothing unless a topic is ticked", () => {
    expect(buildSharedDetails(row, new Set())).toBeUndefined();
  });

  it("shows only the ticked topics that have a value", () => {
    const result = buildSharedDetails(row, hiddenTopics(["block", "parcel", "existing_units", "new_units", "company_number", "construction_start_date"]));
    expect(result).toEqual({
      block: "6100",
      parcel: "12",
      newUnits: "40",
      companyNumber: "515000000",
      constructionStartDate: "2027-03-01",
    });
  });

  it("links only https addresses, preferring a stored file", () => {
    const shown = hiddenTopics(["price_list", "presentation_link", "registration_form", "website"]);
    expect(buildSharedDetails(row, shown, { price_list: "https://signed/prices" })?.links).toEqual({
      priceList: "https://signed/prices",
      registrationForm: "https://example.com/form",
      website: "https://example.com/",
    });
  });
});
