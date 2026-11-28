import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { MarketingData, StorageObjectRef } from "./loadPresentation.js";
import type { ContactData, ContactInboxRow, ContactProjectRow } from "./contact.js";
import { cleanSecret } from "./safety.js";
import type {
  MarketingProjectContentRow,
  MarketingProjectTranslationRow,
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
const CONTENT_COLUMNS =
  "project_id, status, tagline, description, neighborhood, location_description, developer_name, developer_about, developer_website, architect, facts, spec_sections, feature_blocks, legal_disclaimer";
/** Postgres "undefined table" and PostgREST "table not in schema cache". */
const MISSING_TABLE_CODES = new Set(["42P01", "PGRST205"]);
const UNDEFINED_COLUMN_CODE = "42703";
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
      const read = async (columns: string) => {
        let query = client.from("projects").select(columns).is("deleted_at", null);
        if (scope !== null) query = query.in("id", scope);
        return query;
      };
      const result = await read(`${PROJECT_COLUMNS}, presentation_hidden_topics`);
      // Before the visibility column exists everything is shown, as it was.
      if ((result.error as { code?: string } | null)?.code === UNDEFINED_COLUMN_CODE) {
        return unwrap(await read(PROJECT_COLUMNS), []) as unknown as MarketingProjectRow[];
      }
      return unwrap(result, []) as unknown as MarketingProjectRow[];
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

    async listProjectContent(projectIds) {
      const result = await client
        .from("presentation_project_content")
        .select(CONTENT_COLUMNS)
        .eq("status", "published")
        .in("project_id", projectIds);
      // Extra content must never take the presentation down: on any error show projects without it.
      if (result.error) {
        const code = (result.error as { code?: string }).code ?? "";
        if (MISSING_TABLE_CODES.has(code)) console.warn("presentation_project_content is missing; migration not applied yet");
        else console.error("presentation_project_content read failed", code, result.error.message);
        return [];
      }
      return (result.data ?? []) as MarketingProjectContentRow[];
    },

    async listProjectTranslations(projectIds) {
      const result = await client
        .from("presentation_project_translations")
        .select(
          "project_id, language, name, city, address, neighborhood, tagline, description, location_description, developer_about, spec_sections, feature_blocks",
        )
        .in("project_id", projectIds);
      // Translations are optional: on any error the presentation simply stays in Hebrew.
      if (result.error) {
        const code = (result.error as { code?: string }).code ?? "";
        if (MISSING_TABLE_CODES.has(code)) console.warn("presentation_project_translations is missing; migration not applied yet");
        else console.error("presentation_project_translations read failed", code, result.error.message);
        return [];
      }
      return (result.data ?? []) as MarketingProjectTranslationRow[];
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
      const resized = items.filter((item) => item.resizeWidth);
      for (const item of items) {
        if (item.resizeWidth) continue;
        const paths = pathsByBucket.get(item.bucket);
        if (paths) paths.push(item.path);
        else pathsByBucket.set(item.bucket, [item.path]);
      }

      await Promise.all([
        ...Array.from(pathsByBucket.entries()).map(async ([bucket, paths]) => {
          const { data, error } = await client.storage.from(bucket).createSignedUrls(paths, ttlSeconds);
          if (error) throw new Error(error.message);
          for (const entry of data ?? []) {
            if (entry.signedUrl && entry.path) signed.set(`${bucket}/${entry.path}`, entry.signedUrl);
          }
        }),
        // Resized images need one signature each; if resizing is unavailable, fall back to the original file.
        ...resized.map(async (item) => {
          const bucket = client.storage.from(item.bucket);
          const { data } = await bucket.createSignedUrl(item.path, ttlSeconds, {
            transform: { width: item.resizeWidth, quality: 75, resize: "contain" },
          });
          if (data?.signedUrl) {
            signed.set(`${item.bucket}/${item.path}`, data.signedUrl);
            return;
          }
          const original = await bucket.createSignedUrl(item.path, ttlSeconds);
          if (original.error) throw new Error(original.error.message);
          if (original.data?.signedUrl) signed.set(`${item.bucket}/${item.path}`, original.data.signedUrl);
        }),
      ]);

      return signed;
    },
  };
}

const CONTACT_INBOX_SOURCES = ["gold_view", "other"];
const DELIVERY_TIMEOUT_MS = 8000;

/** Public contact form data: project names and intake inboxes (read), and lead delivery through the marketing intake. */
export function createContactData(): ContactData {
  const client = getClient();
  return {
    async listContactProjects() {
      const result = await client
        .from("projects")
        .select("id, name, city, sort_order")
        .is("deleted_at", null)
        .is("archived_at", null);
      return unwrap(result, []) as ContactProjectRow[];
    },

    async listContactInboxes(projectIds) {
      const result = await client
        .from("project_lead_inboxes")
        .select("project_id, source, token")
        .in("project_id", projectIds)
        .in("source", CONTACT_INBOX_SOURCES)
        .eq("active", true);
      return unwrap(result, []) as ContactInboxRow[];
    },

    async deliverLead(token, payload) {
      const base = cleanSecret(process.env.MARKETING_APP_URL);
      if (!base || !/^[A-Za-z0-9_-]{16,200}$/.test(token)) return false;
      let url: URL;
      try {
        url = new URL(`/api/inbox/${token}`, base);
        if (url.protocol !== "https:") return false;
      } catch {
        return false;
      }
      const response = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(DELIVERY_TIMEOUT_MS),
      });
      if (!response.ok) console.warn("[contact] intake rejected the lead", response.status);
      return response.ok;
    },
  };
}
