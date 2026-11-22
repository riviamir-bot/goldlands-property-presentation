import { describe, expect, it } from "vitest";
import {
  EXCLUDED_PROJECT_IDS,
  mapApartment,
  mapApartmentStatus,
  mapProject,
  mapProjectType,
  pickCurrentDocuments,
} from "./mapping";
import type {
  MarketingApartmentRow,
  MarketingDocumentRow,
  MarketingProjectRow,
  MarketingRenderRow,
} from "./types";

const projectRow: MarketingProjectRow = {
  id: "p1", slug: "p-1", name: "ערבי נחל", address: "ערבי נחל 5", city: "תל אביב", status: "בשיווק",
  units: 12, new_units: 16, existing_units: 8, building_count: 1, description: null,
  project_type: 'תמ"א 38/2', construction_stage: "בבניה", block: null, parcel: null, sort_order: 1, deleted_at: null,
  developer_company: null, financing_bank: null, construction_start_date: null, construction_completion_date: null,
  project_website_url: null, additional_links: null,
};
const aptRow: MarketingApartmentRow = {
  id: "a1", project_id: "p1", apartment_number: "7", building: null, floor: 3, rooms: 4, area: 98,
  balcony_area: 12, price: 3_200_000, status: "available", deleted_at: null,
};
const apt = (rooms: number): MarketingApartmentRow => ({ ...aptRow, id: `a-${rooms}-${Math.random()}`, rooms });
const render = (id: string, sort: number | null, featured = false): MarketingRenderRow => ({
  id, project_id: "p1", filename: `${id}.jpg`, storage_bucket: "project-materials", storage_path: `p1/${id}.jpg`,
  sort_order: sort, is_featured: featured, modified_at: null,
});
const r1Featured = render("r1", 5, true);
const r2 = render("r2", 1);
const r3 = render("r3", 2);
const doc = (id: string, type: string, created: string): MarketingDocumentRow => ({
  id, project_id: "p1", document_type: type, filename: `${id}.pdf`, storage_bucket: "project-materials",
  storage_path: `p1/docs/${id}.pdf`, created_at: created,
});
const oldPriceList = doc("old-prices", "price_list", "2026-01-01T00:00:00Z");
const newPriceList = doc("new-prices", "price_list", "2026-06-01T00:00:00Z");
const deck = doc("deck", "presentation", "2026-03-01T00:00:00Z");
const urlFor = (bucket: string, path: string) => `https://signed/${bucket}/${path}`;

describe("mapping", () => {
  it("maps statuses", () => {
    expect(mapApartmentStatus("available")).toBe("available");
    expect(mapApartmentStatus("negotiation")).toBe("reserved");
    expect(mapApartmentStatus("sold")).toBe("sold");
    expect(mapApartmentStatus("signing")).toBe("reserved");
    expect(mapApartmentStatus("weird")).toBe("notMarketing");
    expect(mapApartmentStatus(null)).toBe("notMarketing");
  });

  it("maps project types across quote and slash variants", () => {
    expect(mapProjectType('תמ"א 38/1')).toBe("תמ״א 38/1");
    expect(mapProjectType('תמ"א 38\\1')).toBe("תמ״א 38/1");
    expect(mapProjectType('תמ"א 38/2')).toBe("תמ״א 38/2 / פינוי בינוי");
    expect(mapProjectType(null)).toBe("פרויקט חדש");
  });

  it("hides the price of a sold apartment and never emits NaN", () => {
    const sold = mapApartment({ ...aptRow, status: "sold", price: 3_200_000 });
    expect(sold.price).toBe(0);
    expect(sold.specialPrice).toBe(0);
    const empty = mapApartment({ ...aptRow, price: null, area: null, floor: null, rooms: null, balcony_area: null });
    expect([empty.price, empty.apartmentArea, empty.floor, empty.rooms, empty.balconyArea]).toEqual([0, 0, 0, 0, 0]);
  });

  it("never copies internal notes", () => {
    const mapped = mapApartment({ ...aptRow, notes: "לקוח לחוץ" } as never);
    expect(mapped.notes).toBe("");
    const project = mapProject({ ...projectRow, notes: "פנימי" } as never, [], [], [], () => undefined);
    expect(JSON.stringify(project)).not.toContain("פנימי");
  });

  it("uses the featured render as hero, else the first by sort order, else empty", () => {
    expect(mapProject(projectRow, [r2, r1Featured], [], [], urlFor).heroImage).toBe(
      urlFor(r1Featured.storage_bucket, r1Featured.storage_path),
    );
    expect(mapProject(projectRow, [r3, r2], [], [], urlFor).heroImage).toBe(urlFor(r2.storage_bucket, r2.storage_path));
    const none = mapProject(projectRow, [], [], [], urlFor);
    expect(none.heroImage).toBe("");
    expect(none.gallery.exterior).toEqual([]);
  });

  it("skips renders whose url could not be signed", () => {
    const partial = (bucket: string, path: string) => (path.includes("r2") ? undefined : urlFor(bucket, path));
    expect(mapProject(projectRow, [r2, r3], [], [], partial).gallery.exterior).toEqual([
      urlFor(r3.storage_bucket, r3.storage_path),
    ]);
  });

  it("derives the apartment mix from inventory", () => {
    const project = mapProject(projectRow, [], [], [apt(3), apt(3), apt(4), apt(5), apt(4.5)], urlFor);
    expect(project.apartmentMix).toMatchObject({ threeRooms: "2", fourRooms: "1", fiveRooms: "1" });
  });

  it("keeps only the newest document per type and maps it to a project file", () => {
    expect(pickCurrentDocuments([oldPriceList, newPriceList, deck]).map((d) => d.id).sort()).toEqual(["deck", "new-prices"]);
    const project = mapProject(projectRow, [], [oldPriceList, newPriceList, deck], [], urlFor);
    expect(project.projectFiles?.map((f) => [f.type, f.name])).toEqual([
      ["מחירון", newPriceList.filename],
      ["מצגת", deck.filename],
    ]);
  });

  it("maps the basic project facts", () => {
    const project = mapProject(projectRow, [], [], [], urlFor);
    expect(project).toMatchObject({
      id: "p1", name: "ערבי נחל", city: "תל אביב", location: "ערבי נחל 5, תל אביב",
      projectType: "תמ״א 38/2 / פינוי בינוי", isSupabaseBacked: true, sortOrder: 1,
    });
    expect(project.stats).toMatchObject({ units: "16", newApartments: "16", existingApartments: "8", buildings: "1", floors: "" });
    expect(project.keyFacts).toEqual(["בבניה", "16 דירות"]);
  });

  it("lists the two test projects as excluded", () => {
    expect(EXCLUDED_PROJECT_IDS).toEqual([
      "1d02af7d-d119-47ac-bec8-2f11149f848e",
      "71e9deae-2d8b-4776-822c-3788e8a38c99",
    ]);
  });

  it("does not repeat the city when the address already contains it", () => {
    expect(mapProject({ ...projectRow, address: "ערבי נחל 28, תל אביב" }, [], [], [], urlFor).location).toBe("ערבי נחל 28, תל אביב");
    expect(mapProject({ ...projectRow, address: "בוגרשוב 30 תל אביב" }, [], [], [], urlFor).location).toBe("בוגרשוב 30 תל אביב");
    expect(mapProject({ ...projectRow, address: "ערבי נחל 28" }, [], [], [], urlFor).location).toBe("ערבי נחל 28, תל אביב");
  });

  it("maps the client-facing project details", () => {
    const project = mapProject({
      ...projectRow,
      developer_company: " גולדלנדס בע״מ ",
      financing_bank: "בנק הפועלים",
      construction_start_date: "2025-03-01",
      construction_completion_date: "2027-09-30",
      project_website_url: "https://example.co.il/project",
      block: "6906",
      parcel: "12",
    }, [], [], [], urlFor);
    expect(project.details).toEqual({
      developerCompany: "גולדלנדס בע״מ",
      financingBank: "בנק הפועלים",
      constructionStage: "בבניה",
      constructionStartDate: "2025-03-01",
      constructionCompletionDate: "2027-09-30",
      websiteUrl: "https://example.co.il/project",
    });
    expect(project.block).toBe("6906");
  });

  it("drops unsafe or empty links", () => {
    const project = mapProject({ ...projectRow, project_website_url: "javascript:alert(1)" }, [], [], [], urlFor);
    expect(project.details?.websiteUrl).toBe("");
  });

  it("takes the 3D model link from the additional links and exposes no other link", () => {
    const links = [
      { label: "ארכיון", url: "https://drive.example.com/internal" },
      { label: "תלת מימד", url: "https://my.matterport.com/show/?m=abc" },
    ];
    const project = mapProject({ ...projectRow, additional_links: links }, [], [], [], urlFor);
    expect(project.model3dUrl).toBe("https://my.matterport.com/show/?m=abc");
    expect(JSON.stringify(project)).not.toContain("drive.example.com");
    expect(mapProject({ ...projectRow, additional_links: [{ label: "3D Model", url: "https://x.example/3d" }] }, [], [], [], urlFor).model3dUrl).toBe("https://x.example/3d");
    expect(mapProject({ ...projectRow, additional_links: [{ label: "תלת מימד", url: "http://insecure.example" }] }, [], [], [], urlFor).model3dUrl).toBe("");
    expect(mapProject({ ...projectRow, additional_links: "garbage" }, [], [], [], urlFor).model3dUrl).toBe("");
  });
});
