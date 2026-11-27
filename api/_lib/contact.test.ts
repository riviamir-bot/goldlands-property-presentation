import { describe, expect, it, vi } from "vitest";
import { normalizePhone, submitContact, type ContactData } from "./contact";

const A = "7a50f821-d3b7-4c14-a512-340730023ee2";
const B = "530ad0a3-0419-4b47-8abc-a5be8844a056";
const NOW = 1_800_000_000_000;

function data(overrides: Partial<ContactData> = {}): ContactData & { deliverLead: ReturnType<typeof vi.fn> } {
  return {
    listContactProjects: async () => [
      { id: A, name: "ערבי נחל", city: "תל אביב", sort_order: 1 },
      { id: B, name: "בוגרשוב 13", city: "תל אביב", sort_order: 2 },
    ],
    listContactInboxes: async () => [
      { project_id: A, source: "other", token: "other-token-aaaaaaaaaaaa" },
      { project_id: A, source: "gold_view", token: "gold-token-aaaaaaaaaaaaa" },
      { project_id: B, source: "other", token: "other-token-bbbbbbbbbbbb" },
    ],
    deliverLead: vi.fn(async () => true),
    ...overrides,
  } as ContactData & { deliverLead: ReturnType<typeof vi.fn> };
}

const valid = {
  name: "ישראל ישראלי",
  phone: "050-123 4567",
  email: "",
  message: "מעוניין בדירת 4 חדרים",
  projectIds: [A, B],
  consent: true,
  startedAt: NOW - 10_000,
  company: "",
  pageUrl: "https://view.example/s/abc?x=1",
};

describe("submitContact", () => {
  it("sends one lead per project, preferring the Gold View inbox", async () => {
    const d = data();
    const result = await submitContact(d, valid, NOW);
    expect(result).toEqual({ status: 200, body: { ok: true, delivered: 2 } });
    expect(d.deliverLead).toHaveBeenCalledTimes(2);
    const [token, payload] = d.deliverLead.mock.calls[0];
    expect(token).toBe("gold-token-aaaaaaaaaaaaa");
    expect(payload).toMatchObject({ name: "ישראל ישראלי", phone: "0501234567", utm_source: "gold_view", page_url: "https://view.example/s/abc" });
    expect(payload.message).toContain("התעניין/ה גם ב: בוגרשוב 13");
    expect(d.deliverLead.mock.calls[1][0]).toBe("other-token-bbbbbbbbbbbb");
  });

  it("quietly drops bots (honeypot or instant submit) without sending", async () => {
    const d = data();
    expect((await submitContact(d, { ...valid, company: "spam inc" }, NOW)).status).toBe(200);
    expect((await submitContact(d, { ...valid, startedAt: NOW - 500 }, NOW)).status).toBe(200);
    expect(d.deliverLead).not.toHaveBeenCalled();
  });

  it("validates fields with a pointer to the field", async () => {
    const d = data();
    expect(await submitContact(d, { ...valid, phone: "12" }, NOW)).toMatchObject({ status: 422, body: { field: "phone" } });
    expect(await submitContact(d, { ...valid, consent: false }, NOW)).toMatchObject({ status: 422, body: { field: "consent" } });
    expect(await submitContact(d, { ...valid, projectIds: ["not-a-uuid"] }, NOW)).toMatchObject({ status: 422, body: { field: "projectIds" } });
    expect(await submitContact(d, "x", NOW)).toMatchObject({ status: 400 });
  });

  it("ignores unknown or test projects and fails clearly when nothing can be delivered", async () => {
    const d = data({ listContactInboxes: async () => [] });
    const result = await submitContact(d, valid, NOW);
    expect(result.status).toBe(503);
    const unknown = await submitContact(data(), { ...valid, projectIds: ["1d02af7d-d119-47ac-bec8-2f11149f848e"] }, NOW);
    expect(unknown).toMatchObject({ status: 422, body: { field: "projectIds" } });
  });
});

describe("normalizePhone", () => {
  it("accepts local and international numbers", () => {
    expect(normalizePhone("050-123-4567")).toBe("0501234567");
    expect(normalizePhone("+972 50 123 4567")).toBe("+972501234567");
    expect(normalizePhone("abc")).toBe("");
  });
});
