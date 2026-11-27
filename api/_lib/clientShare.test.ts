import { describe, expect, it } from "vitest";
import {
  createShareLink,
  hashToken,
  loadSharedPresentation,
  recordProjectOpened,
  SHARE_TTL_DAYS,
} from "./clientShare";
import type { MarketingData } from "./loadPresentation";
import type { MarketingApartmentRow, MarketingProjectRow, ShareLinkRow } from "./types";

const PROJECT = "11111111-1111-4111-8111-111111111111";
const OTHER = "22222222-2222-4222-8222-222222222222";
const A1 = "aaaaaaaa-0000-4000-8000-000000000001";
const A2 = "aaaaaaaa-0000-4000-8000-000000000002";
const SOLD = "aaaaaaaa-0000-4000-8000-000000000003";
const now = new Date("2026-11-22T12:00:00Z");

const project: MarketingProjectRow = {
  id: PROJECT, slug: "p", name: "ערבי נחל", address: "ערבי נחל 28, תל אביב", city: "תל אביב", status: "בשיווק", units: 4,
  new_units: 4, existing_units: null, building_count: 1, description: null, project_type: null, construction_stage: null,
  block: null, parcel: null, sort_order: 1, deleted_at: null, developer_company: null, financing_bank: null,
  construction_start_date: null, construction_completion_date: null, project_website_url: null, additional_links: null,
};
const apt = (id: string, status = "available", extra: Partial<MarketingApartmentRow> = {}): MarketingApartmentRow => ({
  id, project_id: PROJECT, apartment_number: id.slice(-1), building: null, floor: 1, rooms: 4, area: 90, balcony_area: 10,
  price: 3_000_000, status, deleted_at: null, ...extra,
});

type Fake = MarketingData & {
  links: Array<ShareLinkRow & { token_hash: string }>;
  events: Array<{ projectId: string; userId: string | null; eventType: string; shareLinkId?: string | null }>;
};

function fake(options: { role?: string; scope?: string[]; recentOpen?: boolean; link?: Partial<ShareLinkRow> & { token?: string } } = {}): Fake {
  const links: Fake["links"] = [];
  if (options.link) {
    const { token = "t".repeat(43), ...row } = options.link;
    links.push({
      id: "link-1", project_id: PROJECT, created_by: "u1", apartment_ids: [A1], show_prices: true, language: "en",
      expires_at: "2026-12-22T12:00:00Z", revoked_at: null, view_count: 0, last_viewed_at: null, token_hash: hashToken(token), ...row,
    });
  }
  const events: Fake["events"] = [];
  return {
    links,
    events,
    verifyToken: async (token) => (token === "good" ? "auth-1" : null),
    getUserByAuthId: async () => ({ id: "u1", email: "x@example.com", full_name: "דנה לוי", role: options.role ?? "marketer", active: true, deleted_at: null }),
    getActiveMarketerId: async () => "m1",
    getMarketerProjectIds: async () => options.scope ?? [PROJECT],
    listProjects: async (scope) => [project].filter((row) => scope === null || scope.includes(row.id)),
    listApartments: async (ids) => [apt(A1), apt(A2), apt(SOLD, "sold")].filter((row) => ids.includes(row.project_id)),
    listRenders: async () => [],
    listDocuments: async () => [{ id: "d", project_id: PROJECT, document_type: "price_list", filename: "internal.xlsx", storage_bucket: "b", storage_path: "p/d.xlsx", created_at: "2026-01-01" }],
    signUrls: async (items) => new Map(items.map((item) => [`${item.bucket}/${item.path}`, `https://signed/${item.path}`])),
    insertUsageEvent: async (event) => { events.push(event); },
    hasRecentUsageEvent: async () => options.recentOpen ?? false,
    insertShareLink: async (row) => { links.push({ ...row, id: `link-${links.length + 1}`, revoked_at: null, view_count: 0, last_viewed_at: null }); return { id: `link-${links.length}` }; },
    findShareLink: async (tokenHash) => links.find((link) => link.token_hash === tokenHash) ?? null,
    markShareLinkViewed: async (id, viewCount, at) => {
      const link = links.find((item) => item.id === id);
      if (link) Object.assign(link, { view_count: viewCount, last_viewed_at: at });
    },
    getAgentContact: async () => ({ name: "דנה לוי", phone: "0501234567" }),
  };
}

const body = (extra: Record<string, unknown> = {}) => ({ projectId: PROJECT, apartmentIds: [A1, A2], showPrices: true, language: "en", ...extra });

describe("createShareLink", () => {
  it("requires a signed-in user with the project in scope", async () => {
    expect((await createShareLink(fake(), undefined, body(), "https://app.example", now)).status).toBe(401);
    expect((await createShareLink(fake({ scope: [OTHER] }), "Bearer good", body(), "https://app.example", now)).status).toBe(403);
  });

  it("stores only a hash of the token, for 30 days, and logs the event", async () => {
    const data = fake();
    const res = await createShareLink(data, "Bearer good", body(), "https://app.example", now);
    expect(res.status).toBe(201);
    if (res.status !== 201) return;
    const token = res.body.url.split("/s/")[1];
    expect(res.body.url).toMatch(/^https:\/\/app\.example\/s\/[A-Za-z0-9_-]{43}$/);
    expect(data.links[0].token_hash).toBe(hashToken(token));
    expect(JSON.stringify(data.links)).not.toContain(token);
    expect(data.links[0]).toMatchObject({ project_id: PROJECT, created_by: "u1", apartment_ids: [A1, A2], show_prices: true, language: "en" });
    expect(Date.parse(data.links[0].expires_at) - now.getTime()).toBe(SHARE_TTL_DAYS * 86_400_000);
    expect(data.events).toEqual([{ projectId: PROJECT, userId: "u1", eventType: "share_link_created", shareLinkId: "link-1" }]);
  });

  it("rejects apartments that are sold, deleted or from another project, and malformed input", async () => {
    for (const bad of [
      body({ apartmentIds: [SOLD] }),
      body({ apartmentIds: ["aaaaaaaa-0000-4000-8000-000000000099"] }),
      body({ apartmentIds: [] }),
      body({ apartmentIds: Array.from({ length: 51 }, () => A1) }),
      body({ language: "de" }),
      body({ showPrices: "yes" }),
      body({ projectId: "not-a-uuid" }),
      null,
    ]) {
      expect((await createShareLink(fake(), "Bearer good", bad, "https://app.example", now)).status, JSON.stringify(bad)).toBe(400);
    }
  });

  it("removes duplicate apartment ids", async () => {
    const data = fake();
    await createShareLink(data, "Bearer good", body({ apartmentIds: [A1, A1] }), "https://app.example", now);
    expect(data.links[0].apartment_ids).toEqual([A1]);
  });
});

describe("loadSharedPresentation", () => {
  const token = "T".repeat(43);

  it("returns only the selected apartments, no marketer details and no project documents", async () => {
    const data = fake({ link: { token, apartment_ids: [A1, SOLD] } });
    const res = await loadSharedPresentation(data, token, now);
    expect(res.status).toBe(200);
    if (res.status !== 200) return;
    expect(res.body.apartments.map((a) => a.id)).toEqual([A1, SOLD]);
    expect(res.body.apartments.find((a) => a.id === SOLD)?.price).toBe(0);
    expect(res.body.agent).toBeNull();
    expect(res.body.language).toBe("en");
    expect(JSON.stringify(res.body)).not.toContain("internal.xlsx");
  });

  it("hides every price when the link was created without prices", async () => {
    const res = await loadSharedPresentation(fake({ link: { token, show_prices: false, apartment_ids: [A1, A2] } }), token, now);
    if (res.status !== 200) throw new Error("expected 200");
    expect(res.body.showPrices).toBe(false);
    expect(res.body.apartments.every((a) => a.price === 0 && a.specialPrice === 0)).toBe(true);
  });

  it("refuses expired, revoked, unknown and malformed tokens", async () => {
    expect((await loadSharedPresentation(fake({ link: { token, expires_at: "2026-11-01T00:00:00Z" } }), token, now)).status).toBe(410);
    expect((await loadSharedPresentation(fake({ link: { token, revoked_at: "2026-11-20T00:00:00Z" } }), token, now)).status).toBe(410);
    expect((await loadSharedPresentation(fake(), token, now)).status).toBe(404);
    expect((await loadSharedPresentation(fake(), "short", now)).status).toBe(404);
  });

  it("counts every view and logs at most one view event per half hour", async () => {
    const data = fake({ link: { token } });
    await loadSharedPresentation(data, token, now);
    await loadSharedPresentation(data, token, new Date(now.getTime() + 60_000));
    expect(data.links[0].view_count).toBe(2);
    expect(data.events.filter((event) => event.eventType === "share_link_viewed")).toHaveLength(1);
  });
});

describe("recordProjectOpened", () => {
  it("logs an opening once per half hour per user and project", async () => {
    const data = fake();
    expect((await recordProjectOpened(data, "Bearer good", { projectId: PROJECT }, now)).status).toBe(204);
    expect(data.events).toEqual([{ projectId: PROJECT, userId: "u1", eventType: "project_opened" }]);
    const throttled = fake({ recentOpen: true });
    await recordProjectOpened(throttled, "Bearer good", { projectId: PROJECT }, now);
    expect(throttled.events).toEqual([]);
  });

  it("refuses projects outside the user's scope and bad input", async () => {
    expect((await recordProjectOpened(fake({ scope: [OTHER] }), "Bearer good", { projectId: PROJECT }, now)).status).toBe(403);
    expect((await recordProjectOpened(fake(), "Bearer good", { projectId: 5 }, now)).status).toBe(400);
    expect((await recordProjectOpened(fake(), "Bearer bad", { projectId: PROJECT }, now)).status).toBe(401);
  });
});
