import { describe, expect, it } from "vitest";
import { loadPresentation, SIGNED_URL_TTL_SECONDS, type MarketingData } from "./loadPresentation";
import { EXCLUDED_PROJECT_IDS } from "./mapping";
import type { MarketingApartmentRow, MarketingDocumentRow, MarketingProjectRow, MarketingRenderRow } from "./types";

const u = { id: "u1", email: "user@example.com", full_name: "דנה לוי", role: "admin", active: true, deleted_at: null as string | null };

const project = (id: string, name: string, sort: number | null, extra: Partial<MarketingProjectRow> = {}): MarketingProjectRow => ({
  id, slug: id, name, address: "", city: "תל אביב", status: "בשיווק", units: 4, new_units: 4, existing_units: null,
  building_count: 1, description: null, project_type: null, construction_stage: null, block: null, parcel: null,
  sort_order: sort, deleted_at: null, ...extra,
});
const apartment = (id: string, projectId: string, floor: number, number: string, extra: Partial<MarketingApartmentRow> = {}): MarketingApartmentRow => ({
  id, project_id: projectId, apartment_number: number, building: null, floor, rooms: 4, area: 90, balcony_area: 10,
  price: 3_000_000, status: "available", deleted_at: null, ...extra,
});
const renderRow = (id: string, projectId: string): MarketingRenderRow => ({
  id, project_id: projectId, filename: `${id}.jpg`, storage_bucket: "project-materials", storage_path: `${projectId}/${id}.jpg`,
  sort_order: 1, is_featured: false, modified_at: null,
});
const documentRow = (id: string, projectId: string): MarketingDocumentRow => ({
  id, project_id: projectId, document_type: "price_list", filename: `${id}.pdf`, storage_bucket: "project-materials",
  storage_path: `${projectId}/docs/${id}.pdf`, created_at: "2026-06-01T00:00:00Z",
});

const allProjects = [
  project("p2", "בוגרשוב 30", 2),
  project("p1", "ערבי נחל", 1),
  project("p3", "אבן גבירול", null),
  project("p4", "אלנבי", null),
  project("gone", "נמחק", 0, { deleted_at: "2026-01-01" }),
  project(EXCLUDED_PROJECT_IDS[0], "פרויקט טסט שמירה", 0),
];
const allApartments = [
  apartment("a3", "p1", 2, "10"),
  apartment("a1", "p1", 1, "2"),
  apartment("a2", "p1", 1, "10"),
  apartment("a4", "p2", 1, "1"),
  apartment("a-del", "p1", 1, "1", { deleted_at: "2026-01-01" }),
];

function fake(options: {
  authUserId?: string | null;
  user?: typeof u | null;
  role?: string;
  projectIds?: string[];
} = {}) {
  const calls = { listProjects: 0, listApartments: 0, listRenders: 0, listDocuments: 0, signUrls: [] as { count: number; ttlSeconds: number }[] };
  const user = options.user === undefined ? { ...u, role: options.role ?? "admin" } : options.user;
  const data: MarketingData & { calls: typeof calls } = {
    calls,
    verifyToken: async () => (options.authUserId === undefined ? "auth-1" : options.authUserId),
    getUserByAuthId: async () => user,
    getActiveMarketerId: async () => "m1",
    getMarketerProjectIds: async () => options.projectIds ?? [],
    listProjects: async (scope) => {
      calls.listProjects += 1;
      return allProjects.filter((row) => scope === null || scope.includes(row.id));
    },
    listApartments: async (ids) => {
      calls.listApartments += 1;
      return allApartments.filter((row) => ids.includes(row.project_id));
    },
    listRenders: async (ids) => {
      calls.listRenders += 1;
      return [renderRow("r1", "p1"), renderRow("r2", "p2")].filter((row) => ids.includes(row.project_id));
    },
    listDocuments: async (ids) => {
      calls.listDocuments += 1;
      return [documentRow("d1", "p1")].filter((row) => ids.includes(row.project_id));
    },
    signUrls: async (items, ttlSeconds) => {
      calls.signUrls.push({ count: items.length, ttlSeconds });
      return new Map(items.map((item) => [`${item.bucket}/${item.path}`, `https://signed/${item.path}`]));
    },
  };
  return data;
}

describe("loadPresentation", () => {
  it("401 without a bearer token or with one that does not verify", async () => {
    expect((await loadPresentation(fake(), undefined)).status).toBe(401);
    expect((await loadPresentation(fake(), "Basic abc")).status).toBe(401);
    expect((await loadPresentation(fake({ authUserId: null }), "Bearer x")).status).toBe(401);
  });

  it("403 for a deactivated user with a valid token, with no data reads", async () => {
    const data = fake({ user: { ...u, active: false } });
    expect((await loadPresentation(data, "Bearer x")).status).toBe(403);
    expect(data.calls.listProjects).toBe(0);
  });

  it("returns only in-scope projects and their apartments", async () => {
    const res = await loadPresentation(fake({ role: "marketer", projectIds: ["p1"] }), "Bearer x");
    expect(res.status).toBe(200);
    if (res.status !== 200) return;
    expect(res.body.projects.map((p) => p.id)).toEqual(["p1"]);
    expect(new Set(res.body.apartments.map((a) => a.projectId))).toEqual(new Set(["p1"]));
    expect(res.body.user).toMatchObject({ role: "sales", name: "דנה לוי" });
  });

  it("returns 200 with empty lists for an empty scope and performs no data reads", async () => {
    const data = fake({ role: "marketer", projectIds: [] });
    const res = await loadPresentation(data, "Bearer x");
    expect(res).toMatchObject({ status: 200, body: { projects: [], apartments: [] } });
    expect(data.calls.listProjects).toBe(0);
    expect(data.calls.listApartments).toBe(0);
  });

  it("drops excluded test projects, deleted projects and deleted apartments", async () => {
    const res = await loadPresentation(fake(), "Bearer x");
    if (res.status !== 200) throw new Error("expected 200");
    const ids = res.body.projects.map((p) => p.id);
    expect(ids).not.toContain("gone");
    expect(ids).not.toContain(EXCLUDED_PROJECT_IDS[0]);
    expect(res.body.apartments.map((a) => a.id)).not.toContain("a-del");
  });

  it("orders projects by sort_order then name, apartments by floor then number", async () => {
    const res = await loadPresentation(fake(), "Bearer x");
    if (res.status !== 200) throw new Error("expected 200");
    expect(res.body.projects.map((p) => p.id)).toEqual(["p1", "p2", "p3", "p4"]);
    expect(res.body.apartments.filter((a) => a.projectId === "p1").map((a) => a.id)).toEqual(["a1", "a2", "a3"]);
  });

  it("signs every storage object in one call with the 6 hour ttl and uses the urls", async () => {
    const data = fake();
    const res = await loadPresentation(data, "Bearer x");
    expect(SIGNED_URL_TTL_SECONDS).toBe(21600);
    expect(data.calls.signUrls).toEqual([{ count: 3, ttlSeconds: 21600 }]);
    if (res.status !== 200) throw new Error("expected 200");
    const p1 = res.body.projects.find((p) => p.id === "p1");
    expect(p1?.heroImage).toBe("https://signed/p1/r1.jpg");
    expect(p1?.projectFiles?.[0]?.url).toBe("https://signed/p1/docs/d1.pdf");
  });
});
