import type { SharedPresentationPayload } from "../../api/_lib/clientShare";
import type { PresentationPayload } from "../../api/_lib/loadPresentation";

export type { PresentationPayload, SharedPresentationPayload };

export type PresentationFetchResult =
  | { kind: "ok"; payload: PresentationPayload }
  | { kind: "unauthenticated" }
  | { kind: "forbidden" }
  | { kind: "error"; message: string };

const loadFailedMessage = "לא ניתן לטעון את הנתונים כרגע.";

function isPayload(value: unknown): value is PresentationPayload {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<PresentationPayload>;
  return Boolean(candidate.user) && Array.isArray(candidate.projects) && Array.isArray(candidate.apartments);
}

export async function fetchPresentation(
  token: string,
  fetchImpl: typeof fetch = fetch,
): Promise<PresentationFetchResult> {
  try {
    const response = await fetchImpl("/api/presentation", {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });

    if (response.status === 401) return { kind: "unauthenticated" };
    if (response.status === 403) return { kind: "forbidden" };
    if (!response.ok) return { kind: "error", message: loadFailedMessage };

    const body: unknown = await response.json();
    if (!isPayload(body)) return { kind: "error", message: loadFailedMessage };

    return { kind: "ok", payload: body };
  } catch {
    return { kind: "error", message: "אין חיבור לשרת. הנתונים המוצגים הם מהטעינה האחרונה." };
  }
}

export interface ShareLinkInput {
  projectId: string;
  apartmentIds: string[];
  showPrices: boolean;
  language: "he" | "en" | "fr";
}

async function errorMessage(response: Response, fallback: string) {
  const body = (await response.json().catch(() => null)) as { error?: unknown } | null;
  return typeof body?.error === "string" && body.error ? body.error : fallback;
}

export async function createShareLink(
  token: string,
  input: ShareLinkInput,
  fetchImpl: typeof fetch = fetch,
): Promise<{ kind: "ok"; url: string } | { kind: "error"; message: string }> {
  try {
    const response = await fetchImpl("/api/share-links", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    if (!response.ok) return { kind: "error", message: await errorMessage(response, "") };
    const body = (await response.json()) as { url?: unknown };
    return typeof body.url === "string" ? { kind: "ok", url: body.url } : { kind: "error", message: "" };
  } catch {
    return { kind: "error", message: "" };
  }
}

export async function fetchSharedPresentation(
  shareToken: string,
  fetchImpl: typeof fetch = fetch,
): Promise<{ kind: "ok"; payload: SharedPresentationPayload } | { kind: "expired" } | { kind: "error" }> {
  try {
    const response = await fetchImpl(`/api/share?token=${encodeURIComponent(shareToken)}`, { cache: "no-store" });
    if (response.status === 404 || response.status === 410) return { kind: "expired" };
    if (!response.ok) return { kind: "error" };
    return { kind: "ok", payload: (await response.json()) as SharedPresentationPayload };
  } catch {
    return { kind: "error" };
  }
}

/** Best effort: a failed usage log never interrupts a presentation. */
export async function logProjectOpened(token: string, projectId: string, fetchImpl: typeof fetch = fetch) {
  try {
    await fetchImpl("/api/events", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ projectId }),
      keepalive: true,
    });
  } catch {
    // ignored
  }
}
