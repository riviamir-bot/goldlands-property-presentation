import type { VercelRequest, VercelResponse } from "@vercel/node";
import { loadSharedPresentation } from "./_lib/clientShare.js";
import { respond } from "./_lib/http.js";
import { createMarketingData } from "./_lib/marketingClient.js";

/** Public endpoint behind client summary links. */
export default function handler(request: VercelRequest, response: VercelResponse) {
  response.setHeader("X-Robots-Tag", "noindex, nofollow");
  const token = typeof request.query.token === "string" ? request.query.token : "";
  return respond(request, response, "GET", "share", () => loadSharedPresentation(createMarketingData(), token));
}
