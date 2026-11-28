import { createHash, randomBytes } from "node:crypto";
import type { Apartment, Project } from "../../src/types";
import { authenticate, renderObject, SIGNED_URL_TTL_SECONDS, type MarketingData } from "./loadPresentation.js";
import { mapApartment, mapProject, PLAN_BUCKET } from "./mapping.js";
import { applyProjectContent } from "./projectContent.js";
import { applyVisibility, hiddenTopics } from "./visibility.js";

export const SHARE_TTL_DAYS = 30;
const EVENT_THROTTLE_MS = 30 * 60 * 1000;
const MAX_APARTMENTS = 50;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** New links have 12 characters (72 random bits); links sent before have 43, and keep working. */
const TOKEN = /^(?:[A-Za-z0-9_-]{12}|[A-Za-z0-9_-]{43})$/;
const LANGUAGES = ["he", "en", "fr"] as const;
type ShareLanguage = (typeof LANGUAGES)[number];

type Failure<S extends number> = { status: S; body: { error: string } };
const fail = <S extends number>(status: S, error: string): Failure<S> => ({ status, body: { error } });

export function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function newToken() {
  return randomBytes(9).toString("base64url");
}

interface ShareRequest {
  projectId: string;
  apartmentIds: string[];
  showPrices: boolean;
  language: ShareLanguage;
}

function parseShareRequest(value: unknown): ShareRequest | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const input = value as Record<string, unknown>;
  const { projectId, apartmentIds, showPrices, language } = input;
  if (typeof projectId !== "string" || !UUID.test(projectId)) return null;
  if (!Array.isArray(apartmentIds) || apartmentIds.length > MAX_APARTMENTS) return null;
  if (!apartmentIds.every((id) => typeof id === "string" && UUID.test(id))) return null;
  if (typeof showPrices !== "boolean") return null;
  if (!LANGUAGES.includes(language as ShareLanguage)) return null;
  return { projectId, apartmentIds: Array.from(new Set(apartmentIds as string[])), showPrices, language: language as ShareLanguage };
}

/** Creates a client summary link. Only the SHA-256 of the token is stored; the token itself appears once, in the URL. */
export async function createShareLink(
  data: MarketingData,
  bearer: string | undefined,
  body: unknown,
  baseUrl: string,
  now = new Date(),
): Promise<{ status: 201; body: { url: string; expiresAt: string } } | Failure<400 | 401 | 403>> {
  const auth = await authenticate(data, bearer);
  if (!auth.ok) return fail(auth.status, auth.body.error);

  const request = parseShareRequest(body);
  if (!request) return fail(400, "פרטי הסיכום אינם תקינים.");
  if (auth.scope !== null && !auth.scope.includes(request.projectId)) return fail(403, "הפרויקט אינו משויך אליך.");

  const projects = await data.listProjects([request.projectId]);
  if (!projects.some((row) => row.id === request.projectId && !row.deleted_at)) return fail(403, "הפרויקט אינו זמין.");

  const offered = new Set(
    (await data.listApartments([request.projectId]))
      .filter((row) => !row.deleted_at && row.project_id === request.projectId && mapApartment(row).status !== "sold" && mapApartment(row).status !== "notMarketing")
      .map((row) => row.id),
  );
  if (!request.apartmentIds.every((id) => offered.has(id))) return fail(400, "חלק מהדירות שנבחרו אינן זמינות עוד. רעננו ונסו שוב.");

  const token = newToken();
  const expiresAt = new Date(now.getTime() + SHARE_TTL_DAYS * 86_400_000).toISOString();
  const { id } = await data.insertShareLink({
    token_hash: hashToken(token),
    project_id: request.projectId,
    created_by: auth.user.id,
    apartment_ids: request.apartmentIds,
    show_prices: request.showPrices,
    language: request.language,
    expires_at: expiresAt,
  });
  await data.insertUsageEvent({ projectId: request.projectId, userId: auth.user.id, eventType: "share_link_created", shareLinkId: id });

  return { status: 201, body: { url: `${baseUrl}/s/${token}`, expiresAt } };
}

export interface SharedPresentationPayload {
  project: Project;
  apartments: Apartment[];
  showPrices: boolean;
  language: ShareLanguage;
  agent: { name: string; phone: string } | null;
  expiresAt: string;
}

/** Details kept for the meeting with a marketer: financing bank, block and parcel. */
const MEETING_ONLY_FACT = /גוש|חלקה|בנק|ליווי|מימון|מלווה/;

/** Removes from a project what is discussed in a meeting and not shown on the client's page. */
export function forClient(project: Project): Project {
  return {
    ...project,
    block: undefined,
    parcel: undefined,
    details: project.details ? { ...project.details, financingBank: "" } : project.details,
    facts: project.facts?.filter((fact) => !MEETING_ONLY_FACT.test(fact.label) && !MEETING_ONLY_FACT.test(fact.value)),
  };
}

/** Public: the client's view of a summary link. No sign-in; everything is limited to what the marketer chose. */
export async function loadSharedPresentation(
  data: MarketingData,
  token: string,
  now = new Date(),
): Promise<{ status: 200; body: SharedPresentationPayload } | Failure<404 | 410>> {
  if (!TOKEN.test(token)) return fail(404, "הקישור לא נמצא.");
  const link = await data.findShareLink(hashToken(token));
  if (!link) return fail(404, "הקישור לא נמצא.");
  if (link.revoked_at || Date.parse(link.expires_at) <= now.getTime()) return fail(410, "הקישור אינו בתוקף.");

  const project = (await data.listProjects([link.project_id])).find((row) => row.id === link.project_id && !row.deleted_at);
  if (!project) return fail(410, "הקישור אינו בתוקף.");

  // Internal details (who sent the link, marketer contact) never reach the client; leads come back through the contact form.
  const agent = null;
  const [apartmentRows, renderRows, renderGroupRows, contentRows, translationRows] = await Promise.all([
    data.listApartments([project.id]),
    data.listRenders([project.id]),
    data.listRenderGroups ? data.listRenderGroups([project.id]) : Promise.resolve([]),
    data.listProjectContent ? data.listProjectContent([project.id]) : Promise.resolve([]),
    data.listProjectTranslations ? data.listProjectTranslations([project.id]) : Promise.resolve([]),
  ]);
  const hidden = hiddenTopics(project.presentation_hidden_topics);
  // Apartments hidden from the client view in the marketing system are not shown on links either.
  const activeRows = hidden.has("apartments")
    ? []
    : apartmentRows.filter((row) => !row.deleted_at && row.project_id === project.id);
  // A link with no chosen apartments is a project link: it shows every apartment still on the market, as of now.
  const selectedRows =
    link.apartment_ids.length === 0
      ? activeRows.filter((row) => {
          const status = mapApartment(row).status;
          return status !== "sold" && status !== "notMarketing";
        })
      : link.apartment_ids
          .map((id) => activeRows.find((row) => row.id === id))
          .filter((row): row is NonNullable<typeof row> => Boolean(row));

  const objects = [
    ...renderRows.filter((row) => row.project_id === project.id).map((row) => renderObject(row.storage_bucket, row.storage_path)),
    ...selectedRows.filter((row) => row.plan_storage_path).map((row) => ({ bucket: PLAN_BUCKET, path: row.plan_storage_path as string })),
  ];
  const signed = objects.length ? await data.signUrls(objects, SIGNED_URL_TTL_SECONDS) : new Map<string, string>();
  const urlFor = (bucket: string, path: string) => signed.get(`${bucket}/${path}`);

  // An apartment taken off the market after the link was sent is no longer shown. The storage file name stays internal.
  const apartments = selectedRows
    .map((row) => ({ ...mapApartment(row, urlFor), planFileName: undefined }))
    .filter((apartment) => apartment.status !== "notMarketing")
    .map((apartment) => (link.show_prices ? apartment : { ...apartment, price: 0, specialPrice: 0 }));

  const viewedAt = now.toISOString();
  const lastViewed = link.last_viewed_at ? Date.parse(link.last_viewed_at) : 0;
  await data.markShareLinkViewed(link.id, link.view_count + 1, viewedAt);
  if (now.getTime() - lastViewed >= EVENT_THROTTLE_MS) {
    await data.insertUsageEvent({ projectId: project.id, userId: null, eventType: "share_link_viewed", shareLinkId: link.id });
  }

  return {
    status: 200,
    body: {
      project: forClient(
        applyVisibility(
          applyProjectContent(
            mapProject(project, renderRows, [], activeRows, urlFor, renderGroupRows),
            contentRows.find((row) => row.project_id === project.id),
            translationRows.filter((row) => row.project_id === project.id),
          ),
          hidden,
        ),
      ),
      apartments,
      showPrices: link.show_prices,
      language: LANGUAGES.includes(link.language as ShareLanguage) ? (link.language as ShareLanguage) : "he",
      agent,
      expiresAt: link.expires_at,
    },
  };
}

/** Logs that a marketer opened a project, at most once per half hour per user and project. */
export async function recordProjectOpened(
  data: MarketingData,
  bearer: string | undefined,
  body: unknown,
  now = new Date(),
): Promise<{ status: 204 } | Failure<400 | 401 | 403>> {
  const auth = await authenticate(data, bearer);
  if (!auth.ok) return fail(auth.status, auth.body.error);

  const projectId = (body as { projectId?: unknown } | null)?.projectId;
  if (typeof projectId !== "string" || !UUID.test(projectId)) return fail(400, "פרויקט לא תקין.");
  if (auth.scope !== null && !auth.scope.includes(projectId)) return fail(403, "הפרויקט אינו משויך אליך.");

  const since = new Date(now.getTime() - EVENT_THROTTLE_MS).toISOString();
  if (!(await data.hasRecentUsageEvent({ userId: auth.user.id, projectId, eventType: "project_opened", since }))) {
    await data.insertUsageEvent({ projectId, userId: auth.user.id, eventType: "project_opened" });
  }
  return { status: 204 };
}
