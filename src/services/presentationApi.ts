import type { PresentationPayload } from "../../api/_lib/loadPresentation";

export type { PresentationPayload };

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
