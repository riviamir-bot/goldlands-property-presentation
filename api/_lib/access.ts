export interface MarketingUserRecord {
  id: string;
  email: string;
  full_name: string;
  role: string;
  active: boolean;
  deleted_at: string | null;
}

export interface MarketingReader {
  getUserByAuthId(authUserId: string): Promise<MarketingUserRecord | null>;
  getActiveMarketerId(userId: string): Promise<string | null>;
  getMarketerProjectIds(marketerId: string): Promise<string[]>;
}

export type AppRole = "admin" | "team" | "marketer";

export interface PresentationUser {
  id: string;
  name: string;
  role: "admin" | "sales";
  sourceRole: AppRole;
}

/** null means every project; an array lists the only projects the user may see. */
export type ProjectScope = string[] | null;

function toAppRole(role: string): AppRole {
  // Unknown roles get the most restrictive treatment on purpose.
  if (role === "admin" || role === "team") return role;
  return "marketer";
}

export async function resolveUser(
  reader: MarketingReader,
  authUserId: string,
): Promise<{ user: PresentationUser; scope: ProjectScope } | null> {
  const record = await reader.getUserByAuthId(authUserId);
  if (!record || !record.active || record.deleted_at) return null;

  const sourceRole = toAppRole(record.role);
  const user: PresentationUser = {
    id: record.id,
    name: record.full_name.trim() || "משתמש",
    role: sourceRole === "admin" ? "admin" : "sales",
    sourceRole,
  };

  if (sourceRole !== "marketer") return { user, scope: null };

  const marketerId = await reader.getActiveMarketerId(record.id);
  if (!marketerId) return { user, scope: [] };

  return { user, scope: await reader.getMarketerProjectIds(marketerId) };
}
