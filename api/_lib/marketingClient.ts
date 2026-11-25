import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { MarketingData, StorageObjectRef } from "./loadPresentation.js";
import { cleanSecret } from "./safety.js";
import type {
  MarketingApartmentRow,
  MarketingDocumentRow,
  MarketingProjectRow,
  MarketingRenderGroupRow,
  MarketingRenderRow,
  ShareLinkRow,
} from "./types";

const PROJECT_COLUMNS =
  "id, slug, name, address, city, status, units, new_units, existing_units, building_count, description, project_type, construction_stage, block, parcel, sort_order, deleted_at, developer_company, financing_bank, construction_start_date, construction_completion_date, project_website_url, additional_links";
const APARTMENT_COLUMNS =
  "id, project_id, apartment_number, building, floor, rooms, area, balcony_area, price, status, deleted_at, plan_storage_path, plan_filename, plan_content_type";
const RENDER_COLUMNS = "id, project_id, filename, storage_bucket, storage_path, sort_order, is_featured, modified_at, group_id";
const RENDER_GROUP_COLUMNS = "id, project_id, name, is_building, sort_order";
const DOCUMENT_COLUMNS = "id, project_id, document_type, filename, storage_bucket, storage_path, created_at";

export class MarketingConfigurationError extends Error {
  constructor() {
    super("Marketing database connection is not configured.");
    this.name = "MarketingConfigurationError";
  }
}

let cachedClient: SupabaseClient | null = null;

function getClient() {
  if (cachedClient) return cachedClient;

  const url = cleanSecret(process.env.MARKETING_SUPABASE_URL);
  const serviceRoleKey = cleanSecret(process.env.MARKETING_SUPABASE_SERVICE_ROLE_KEY);
  if (!url || !serviceRoleKey) throw new MarketingConfigurationError();

  cachedClient = createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return cachedClient;
}

function unwrap<T>(result: { data: T | null; error: { message: string } | null }, fallback: T): T {
  if (result.error) throw new Error(result.error.message);
  return result.data ?? fallback;
}

/** Read-only access to the marketing database. This is the only module that holds the service-role client. */
export function createMarketingData(): MarketingData {
  const client = getClient();

  return {
    async verifyToken(token) {
      const { data, error } = await client.auth.getUser(token);
      if (error || !data.user) return null;
      return data.user.id;
    },

    async getUserByAuthId(authUserId) {
      const result = await client
        .from("users")
        .select("id, email, full_name, role, active, deleted_at")
        .eq("auth_user_id", authUserId)
        .maybeSingle();
      return unwrap(result, null);
    },

    async getActiveMarketerId(userId) {
      const result = await client
        .from("marketers")
        .select("id")
        .eq("user_id", userId)
        .eq("is_active", true)
        .maybeSingle();
      return unwrap(result, null)?.id ?? null;
    },

    async getMarketerProjectIds(marketerId) {
      const result = await client.from("marketer_projects").select("project_id").eq("marketer_id", marketerId);
      return unwrap(result, []).map((row) => row.project_id as string);
    },

    async listProjects(scope) {
      let query = client.from("projects").select(PROJECT_COLUMNS).is("deleted_at", null);
      if (scope !== null) query = query.in("id", scope);
      return unwrap(await query, []) as MarketingProjectRow[];
    },

    async listApartments(projectIds) {
      const result = await client
        .from("project_apartments")
        .select(APARTMENT_COLUMNS)
        .in("project_id", projectIds)
        .is("deleted_at", null);
      return unwrap(result, []) as MarketingApartmentRow[];
    },

    async listRenders(projectIds) {
      const result = await client
        .from("project_render_assets")
        .select(RENDER_COLUMNS)
        .in("project_id", projectIds)
        .is("deleted_at", null);
      return unwrap(result, []) as MarketingRenderRow[];
    },

    async listRenderGroups(projectIds) {
      const result = await client
        .from("project_render_groups")
        .select(RENDER_GROUP_COLUMNS)
        .in("project_id", projectIds);
      return unwrap(result, []) as MarketingRenderGroupRow[];
    },

    async listDocuments(projectIds) {
      const result = await client
        .from("project_document_assets")
        .select(DOCUMENT_COLUMNS)
        .in("project_id", projectIds)
        .in("document_type", ["price_list", "presentation"]);
      return unwrap(result, []) as MarketingDocumentRow[];
    },

    async insertUsageEvent(event) {
      const { error } = await client.from("presentation_usage_events").insert({
        project_id: event.projectId,
        user_id: event.userId,
        event_type: event.eventType,
        share_link_id: event.shareLinkId ?? null,
      });
      if (error) throw new Error(error.message);
    },

    async hasRecentUsageEvent({ userId, projectId, eventType, since }) {
      const { count, error } = await client
        .from("presentation_usage_events")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("project_id", projectId)
        .eq("event_type", eventType)
        .gte("created_at", since);
      if (error) throw new Error(error.message);
      return (count ?? 0) > 0;
    },

    async insertShareLink(row) {
      const result = await client.from("presentation_share_links").insert(row).select("id").single();
      return unwrap(result, { id: "" }) as { id: string };
    },

    async findShareLink(tokenHash) {
      const result = await client
        .from("presentation_share_links")
        .select("id, project_id, created_by, apartment_ids, show_prices, language, expires_at, revoked_at, view_count, last_viewed_at, token_hash")
        .eq("token_hash", tokenHash)
        .maybeSingle();
      return unwrap(result, null) as (ShareLinkRow & { token_hash: string }) | null;
    },

    async markShareLinkViewed(id, viewCount, at) {
      const { error } = await client.from("presentation_share_links").update({ view_count: viewCount, last_viewed_at: at }).eq("id", id);
      if (error) throw new Error(error.message);
    },

    async getAgentContact(userId) {
      const [{ data: user }, { data: marketer }] = await Promise.all([
        client.from("users").select("full_name, active, deleted_at").eq("id", userId).maybeSingle(),
        client.from("marketers").select("whatsapp_phone, phone").eq("user_id", userId).eq("is_active", true).maybeSingle(),
      ]);
      if (!user || !user.active || user.deleted_at) return null;
      const phone = ((marketer?.whatsapp_phone as string | null) || (marketer?.phone as string | null) || "").trim();
      return { name: ((user.full_name as string) || "").trim(), phone };
    },

    async signUrls(items: StorageObjectRef[], ttlSeconds: number) {
      const signed = new Map<string, string>();
      const pathsByBucket = new Map<string, string[]>();
      for (const item of items) {
        const paths = pathsByBucket.get(item.bucket);
        if (paths) paths.push(item.path);
        else pathsByBucket.set(item.bucket, [item.path]);
      }

      await Promise.all(
        Array.from(pathsByBucket.entries()).map(async ([bucket, paths]) => {
          const { data, error } = await client.storage.from(bucket).createSignedUrls(paths, ttlSeconds);
          if (error) throw new Error(error.message);
          for (const entry of data ?? []) {
            if (entry.signedUrl && entry.path) signed.set(`${bucket}/${entry.path}`, entry.signedUrl);
          }
        }),
      );

      return signed;
    },
  };
}
