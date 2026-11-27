import { EXCLUDED_PROJECT_IDS } from "./mapping.js";

/** Public contact form: projects a visitor can ask about, and lead delivery to the marketing system. */

export interface ContactProjectRow {
  id: string;
  name: string;
  city: string | null;
  sort_order: number | null;
}

export interface ContactInboxRow {
  project_id: string;
  source: string;
  token: string;
}

export interface ContactData {
  listContactProjects(): Promise<ContactProjectRow[]>;
  /** Active intake inboxes of the given projects, sources gold_view and other only. */
  listContactInboxes(projectIds: string[]): Promise<ContactInboxRow[]>;
  /** Posts one lead to the marketing system's public intake (POST /api/inbox/{token}). */
  deliverLead(token: string, payload: Record<string, string>): Promise<boolean>;
}

export interface ContactProject {
  id: string;
  name: string;
  city: string;
}

const MAX_PROJECTS = 8;
const MIN_FILL_MS = 2500;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** Inbox preference: the dedicated Gold View source, else the generic "other" source. */
const SOURCE_PREFERENCE = ["gold_view", "other"];

type Failure<S extends number> = { status: S; body: { error: string; field?: string } };
const fail = <S extends number>(status: S, error: string, field?: string): Failure<S> => ({
  status,
  body: field ? { error, field } : { error },
});

export async function listContactProjects(data: ContactData): Promise<{ status: 200; body: { projects: ContactProject[] } }> {
  const rows = (await data.listContactProjects())
    .filter((row) => !EXCLUDED_PROJECT_IDS.includes(row.id))
    .sort((a, b) => (a.sort_order ?? 1e9) - (b.sort_order ?? 1e9) || a.name.localeCompare(b.name, "he"));
  return {
    status: 200,
    body: { projects: rows.map((row) => ({ id: row.id, name: row.name.trim(), city: (row.city ?? "").trim() })) },
  };
}

export interface ContactRequest {
  name: string;
  phone: string;
  email: string;
  message: string;
  projectIds: string[];
  pageUrl: string;
  medium: "client_link" | "public_link";
}

function field(input: Record<string, unknown>, key: string, max: number) {
  const value = input[key];
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

/** Israeli and international phone numbers: digits, spaces, dashes, a leading +. 9 to 15 digits. */
export function normalizePhone(value: string) {
  const cleaned = value.replace(/[\s\-().]/g, "");
  if (!/^\+?\d{9,15}$/.test(cleaned)) return "";
  return cleaned;
}

export function parseContactRequest(
  value: unknown,
  now = Date.now(),
): { ok: true; request: ContactRequest } | { ok: false; error: string; field?: string; spam?: true } {
  if (!value || typeof value !== "object" || Array.isArray(value)) return { ok: false, error: "invalid" };
  const input = value as Record<string, unknown>;

  // Bots fill the hidden field or submit instantly. They get a quiet success and nothing is sent.
  // Time on the form, measured by the browser itself (immune to a wrong device clock).
  // Older pages send a startedAt timestamp instead.
  const elapsed =
    typeof input.elapsedMs === "number" && Number.isFinite(input.elapsedMs)
      ? input.elapsedMs
      : typeof input.startedAt === "number" && input.startedAt > 0
        ? now - input.startedAt
        : 0;
  if (field(input, "company", 200) || elapsed < MIN_FILL_MS) {
    return { ok: false, error: "spam", spam: true };
  }

  const name = field(input, "name", 120);
  if (name.length < 2) return { ok: false, error: "נא למלא שם מלא.", field: "name" };
  const phone = normalizePhone(field(input, "phone", 40));
  if (!phone) return { ok: false, error: "נא למלא מספר טלפון תקין.", field: "phone" };
  const email = field(input, "email", 200);
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, error: "כתובת הדוא״ל אינה תקינה.", field: "email" };
  }
  if (input.consent !== true) return { ok: false, error: "נא לאשר שניצור איתך קשר.", field: "consent" };

  const ids = Array.isArray(input.projectIds) ? input.projectIds : [];
  const projectIds = Array.from(new Set(ids.filter((id): id is string => typeof id === "string" && UUID.test(id))));
  if (projectIds.length === 0) return { ok: false, error: "נא לבחור לפחות פרויקט אחד.", field: "projectIds" };
  if (projectIds.length > MAX_PROJECTS) return { ok: false, error: `אפשר לבחור עד ${MAX_PROJECTS} פרויקטים.`, field: "projectIds" };

  let pageUrl = "";
  try {
    const url = new URL(field(input, "pageUrl", 500));
    if (url.protocol === "https:") pageUrl = `${url.origin}${url.pathname}`;
  } catch {
    // optional
  }

  return {
    ok: true,
    request: {
      name,
      phone,
      email,
      message: field(input, "message", 1500),
      projectIds,
      pageUrl,
      medium: input.medium === "public_link" ? "public_link" : "client_link",
    },
  };
}

/**
 * Sends one lead per selected project to that project's intake inbox in the marketing system,
 * so the existing duplicate detection, lead source and assignment rules apply there.
 */
export async function submitContact(
  data: ContactData,
  body: unknown,
  now = Date.now(),
): Promise<
  | { status: 200; body: { ok: true; delivered: number } }
  | Failure<400 | 422 | 503>
> {
  const parsed = parseContactRequest(body, now);
  if (!parsed.ok) {
    if (parsed.spam) return { status: 200, body: { ok: true, delivered: 0 } };
    return parsed.error === "invalid" ? fail(400, "הבקשה אינה תקינה.") : fail(422, parsed.error, parsed.field);
  }
  const request = parsed.request;

  const projects = (await data.listContactProjects()).filter(
    (row) => request.projectIds.includes(row.id) && !EXCLUDED_PROJECT_IDS.includes(row.id),
  );
  if (projects.length === 0) return fail(422, "נא לבחור לפחות פרויקט אחד.", "projectIds");

  const inboxes = await data.listContactInboxes(projects.map((row) => row.id));
  const tokenFor = (projectId: string) => {
    for (const source of SOURCE_PREFERENCE) {
      const inbox = inboxes.find((row) => row.project_id === projectId && row.source === source);
      if (inbox) return inbox.token;
    }
    return null;
  };

  const names = projects.map((row) => row.name.trim());
  let delivered = 0;
  for (const project of projects) {
    const token = tokenFor(project.id);
    if (!token) {
      console.warn("[contact] no Gold View inbox for project", project.id);
      continue;
    }
    const others = names.filter((name) => name !== project.name.trim());
    const message = [
      request.message,
      others.length ? `התעניין/ה גם ב: ${others.join(", ")}` : "",
      "נשלח מטופס Gold View",
    ]
      .filter(Boolean)
      .join("\n");
    const payload: Record<string, string> = {
      name: request.name,
      phone: request.phone,
      message,
      utm_source: "gold_view",
      utm_medium: request.medium,
    };
    if (request.email) payload.email = request.email;
    if (request.pageUrl) payload.page_url = request.pageUrl;
    if (await data.deliverLead(token, payload).catch(() => false)) delivered += 1;
  }

  if (delivered === 0) return fail(503, "לא הצלחנו לשלוח את הפרטים כרגע. אפשר לפנות אלינו בוואטסאפ או בטלפון.");
  return { status: 200, body: { ok: true, delivered } };
}
