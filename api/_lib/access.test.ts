import { describe, expect, it } from "vitest";
import { resolveUser, type MarketingReader } from "./access";

const u = { id: "u1", email: "user@example.com", full_name: "דנה לוי", role: "marketer", active: true, deleted_at: null };

function reader(options: {
  user?: typeof u | null;
  marketerId?: string | null;
  projectIds?: string[];
}): MarketingReader {
  return {
    getUserByAuthId: async () => (options.user === undefined ? u : options.user),
    getActiveMarketerId: async () => (options.marketerId === undefined ? "m1" : options.marketerId),
    getMarketerProjectIds: async () => options.projectIds ?? [],
  };
}

describe("resolveUser", () => {
  it("returns null for unknown, inactive or deleted users", async () => {
    expect(await resolveUser(reader({ user: null }), "a")).toBeNull();
    expect(await resolveUser(reader({ user: { ...u, active: false } }), "a")).toBeNull();
    expect(await resolveUser(reader({ user: { ...u, deleted_at: "2026-01-01" } }), "a")).toBeNull();
  });

  it("gives admin and team every project", async () => {
    expect(await resolveUser(reader({ user: { ...u, role: "admin" } }), "a")).toMatchObject({
      scope: null,
      user: { role: "admin", sourceRole: "admin" },
    });
    expect(await resolveUser(reader({ user: { ...u, role: "team" } }), "a")).toMatchObject({
      scope: null,
      user: { role: "sales", sourceRole: "team" },
    });
  });

  it("scopes a marketer to assigned projects", async () => {
    const result = await resolveUser(reader({ marketerId: "m1", projectIds: ["p1", "p2"] }), "a");
    expect(result).toMatchObject({ scope: ["p1", "p2"], user: { role: "sales", sourceRole: "marketer", name: "דנה לוי" } });
  });

  it("gives a marketer with no marketer row an empty scope, not everything", async () => {
    expect((await resolveUser(reader({ marketerId: null }), "a"))?.scope).toEqual([]);
  });

  it("applies marketer rules to an unknown role", async () => {
    const result = await resolveUser(reader({ user: { ...u, role: "something" }, marketerId: null }), "a");
    expect(result).toMatchObject({ scope: [], user: { sourceRole: "marketer" } });
  });

  it("does not expose the email address", async () => {
    expect(JSON.stringify(await resolveUser(reader({}), "a"))).not.toContain("example.com");
  });
});
