import type { Apartment, Project } from "../../src/types";
import { resolveUser, type MarketingReader, type PresentationUser, type ProjectScope } from "./access.js";
import { EXCLUDED_PROJECT_IDS, mapApartment, mapProject, PLAN_BUCKET } from "./mapping.js";
import { applyProjectContent, mapTranslations } from "./projectContent.js";
import type {
  MarketingProjectContentRow,
  MarketingProjectTranslationRow,
  MarketingApartmentRow,
  MarketingDocumentRow,
  MarketingProjectRow,
  MarketingRenderGroupRow,
  MarketingRenderRow,
  ShareLinkRow,
  UsageEventType,
} from "./types";

export const SIGNED_URL_TTL_SECONDS = 21600;

export interface StorageObjectRef {
  bucket: string;
  path: string;
  /** Serve a resized copy (Supabase image transformation) instead of the original file. */
  resizeWidth?: number;
}

/** Renders are uploaded at print size (often 3–8 MB). Screens get a resized copy, about a tenth of the weight. */
export const RENDER_DISPLAY_WIDTH = 1920;
const RESIZABLE_IMAGE = /\.(jpe?g|png|webp)$/i;

export function renderObject(bucket: string, path: string): StorageObjectRef {
  return RESIZABLE_IMAGE.test(path) ? { bucket, path, resizeWidth: RENDER_DISPLAY_WIDTH } : { bucket, path };
}

export interface MarketingData extends MarketingReader {
  /** Returns the auth user id for a valid access token, otherwise null. */
  verifyToken(token: string): Promise<string | null>;
  listProjects(scope: ProjectScope): Promise<MarketingProjectRow[]>;
  listApartments(projectIds: string[]): Promise<MarketingApartmentRow[]>;
  listRenders(projectIds: string[]): Promise<MarketingRenderRow[]>;
  listRenderGroups?(projectIds: string[]): Promise<MarketingRenderGroupRow[]>;
  /** Published Gold View content; [] when none (or before the table exists). */
  listProjectContent?(projectIds: string[]): Promise<MarketingProjectContentRow[]>;
  /** Reviewed English/French texts; [] when none (or before the table exists). */
  listProjectTranslations?(projectIds: string[]): Promise<MarketingProjectTranslationRow[]>;
  listDocuments(projectIds: string[]): Promise<MarketingDocumentRow[]>;
  /** Result is keyed by `${bucket}/${path}`. */
  signUrls(items: StorageObjectRef[], ttlSeconds: number): Promise<Map<string, string>>;
  /** The only writes: presentation usage events and client summary links. */
  insertUsageEvent(event: { projectId: string; userId: string | null; eventType: UsageEventType; shareLinkId?: string | null }): Promise<void>;
  hasRecentUsageEvent(input: { userId: string; projectId: string; eventType: UsageEventType; since: string }): Promise<boolean>;
  insertShareLink(row: {
    token_hash: string;
    project_id: string;
    created_by: string;
    apartment_ids: string[];
    show_prices: boolean;
    language: string;
    expires_at: string;
  }): Promise<{ id: string }>;
  findShareLink(tokenHash: string): Promise<(ShareLinkRow & { token_hash: string }) | null>;
  markShareLinkViewed(id: string, viewCount: number, at: string): Promise<void>;
  getAgentContact(userId: string): Promise<{ name: string; phone: string } | null>;
}

export type AuthenticationResult =
  | { ok: true; user: PresentationUser; scope: ProjectScope }
  | { ok: false; status: 401 | 403; body: { error: string } };

/** Verifies the bearer token and resolves the marketing user and their project scope. */
export async function authenticate(data: MarketingData, bearer: string | undefined): Promise<AuthenticationResult> {
  const token = readBearer(bearer);
  if (!token) return { ok: false, status: 401, body: { error: "נדרשת התחברות." } };

  const authUserId = await data.verifyToken(token);
  if (!authUserId) return { ok: false, status: 401, body: { error: "נדרשת התחברות." } };

  const resolved = await resolveUser(data, authUserId);
  if (!resolved) return { ok: false, status: 403, body: { error: "אין הרשאה למערכת המצגות." } };

  return { ok: true, ...resolved };
}

export interface PresentationPayload {
  user: PresentationUser;
  projects: Project[];
  apartments: Apartment[];
  generatedAt: string;
}

export type PresentationResult =
  | { status: 200; body: PresentationPayload }
  | { status: 401 | 403; body: { error: string } };

function readBearer(header: string | undefined) {
  const match = /^Bearer\s+(.+)$/i.exec(header?.trim() ?? "");
  return match ? match[1].trim() : null;
}

function byKey<T>(rows: T[], keyOf: (row: T) => string) {
  const groups = new Map<string, T[]>();
  for (const row of rows) {
    const key = keyOf(row);
    const group = groups.get(key);
    if (group) group.push(row);
    else groups.set(key, [row]);
  }
  return groups;
}

function compareProjects(a: MarketingProjectRow, b: MarketingProjectRow) {
  const aOrder = a.sort_order ?? Number.MAX_SAFE_INTEGER;
  const bOrder = b.sort_order ?? Number.MAX_SAFE_INTEGER;
  if (aOrder !== bOrder) return aOrder - bOrder;
  return a.name.localeCompare(b.name, "he");
}

function compareApartments(a: MarketingApartmentRow, b: MarketingApartmentRow) {
  const floorDelta = (a.floor ?? 0) - (b.floor ?? 0);
  if (floorDelta !== 0) return floorDelta;
  return (a.apartment_number ?? "").localeCompare(b.apartment_number ?? "", "he", { numeric: true });
}

export async function loadPresentation(data: MarketingData, bearer: string | undefined): Promise<PresentationResult> {
  const auth = await authenticate(data, bearer);
  if (!auth.ok) return { status: auth.status, body: auth.body };

  const { user, scope } = auth;
  const generatedAt = new Date().toISOString();
  if (scope !== null && scope.length === 0) {
    return { status: 200, body: { user, projects: [], apartments: [], generatedAt } };
  }

  const projectRows = (await data.listProjects(scope))
    .filter((row) => !row.deleted_at && !EXCLUDED_PROJECT_IDS.includes(row.id))
    .filter((row) => scope === null || scope.includes(row.id))
    .sort(compareProjects);
  const projectIds = projectRows.map((row) => row.id);
  if (projectIds.length === 0) {
    return { status: 200, body: { user, projects: [], apartments: [], generatedAt } };
  }

  const [apartmentRowsRaw, renderRows, documentRows, renderGroupRows, contentRows, translationRows] = await Promise.all([
    data.listApartments(projectIds),
    data.listRenders(projectIds),
    data.listDocuments(projectIds),
    data.listRenderGroups ? data.listRenderGroups(projectIds) : Promise.resolve([]),
    data.listProjectContent ? data.listProjectContent(projectIds) : Promise.resolve([]),
    data.listProjectTranslations ? data.listProjectTranslations(projectIds) : Promise.resolve([]),
  ]);
  const translationsByProject = byKey(translationRows, (row) => row.project_id);
  const contentByProject = new Map(contentRows.map((row) => [row.project_id, row]));
  const inScope = new Set(projectIds);
  const apartmentRows = apartmentRowsRaw
    .filter((row) => !row.deleted_at && inScope.has(row.project_id))
    .sort(compareApartments);

  const storageObjects = [
    ...renderRows.filter((row) => inScope.has(row.project_id)).map((row) => renderObject(row.storage_bucket, row.storage_path)),
    ...documentRows
      .filter((row) => inScope.has(row.project_id))
      .map((row) => ({ bucket: row.storage_bucket, path: row.storage_path })),
    ...apartmentRows
      .filter((row) => row.plan_storage_path)
      .map((row) => ({ bucket: PLAN_BUCKET, path: row.plan_storage_path as string })),
  ];
  const signedUrls = storageObjects.length
    ? await data.signUrls(storageObjects, SIGNED_URL_TTL_SECONDS)
    : new Map<string, string>();
  const urlFor = (bucket: string, path: string) => signedUrls.get(`${bucket}/${path}`);

  const apartmentsByProject = byKey(apartmentRows, (row) => row.project_id);
  const rendersByProject = byKey(renderRows, (row) => row.project_id);
  const documentsByProject = byKey(documentRows, (row) => row.project_id);
  const renderGroupsByProject = byKey(renderGroupRows, (row) => row.project_id);

  return {
    status: 200,
    body: {
      user,
      projects: projectRows.map((row) =>
        applyProjectContent(
          mapProject(
            row,
            rendersByProject.get(row.id) ?? [],
            documentsByProject.get(row.id) ?? [],
            apartmentsByProject.get(row.id) ?? [],
            urlFor,
            renderGroupsByProject.get(row.id) ?? [],
          ),
          contentByProject.get(row.id),
          translationsByProject.get(row.id) ?? [],
        ),
      ),
      apartments: apartmentRows.map((row) => mapApartment(row, urlFor)),
      generatedAt,
    },
  };
}
