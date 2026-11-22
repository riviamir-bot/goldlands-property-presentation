import type { VercelRequest, VercelResponse } from "@vercel/node";
import { describeErrorForLog } from "./safety.js";

/** Runs a handler with the shared method check, no-store caching and safe error logging. */
export async function respond(
  request: VercelRequest,
  response: VercelResponse,
  method: "GET" | "POST",
  label: string,
  run: () => Promise<{ status: number; body?: unknown }>,
) {
  response.setHeader("Cache-Control", "private, no-store");
  if (request.method !== method) {
    response.setHeader("Allow", method);
    response.status(405).json({ error: "שיטה לא נתמכת." });
    return;
  }
  try {
    const result = await run();
    if (result.body === undefined) response.status(result.status).end();
    else response.status(result.status).json(result.body);
  } catch (error) {
    console.error(`[${label}] failed`, describeErrorForLog(error));
    response.status(500).json({ error: "הפעולה נכשלה. נסו שוב." });
  }
}

/** Public origin of this deployment, used to build links that clients open. */
export function publicBaseUrl(request: VercelRequest) {
  const configured = process.env.PUBLIC_APP_URL?.trim();
  if (configured) {
    try {
      const url = new URL(configured);
      if (url.protocol === "https:") return url.origin;
    } catch {
      // fall through to the request host
    }
  }
  const host = String(request.headers["x-forwarded-host"] ?? request.headers.host ?? "").split(",")[0].trim();
  return `https://${host}`;
}
