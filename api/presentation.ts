import type { VercelRequest, VercelResponse } from "@vercel/node";
import { respond } from "./_lib/http.js";
import { loadPresentation } from "./_lib/loadPresentation.js";
import { createMarketingData } from "./_lib/marketingClient.js";

export default function handler(request: VercelRequest, response: VercelResponse) {
  return respond(request, response, "GET", "presentation", () =>
    loadPresentation(createMarketingData(), request.headers.authorization),
  );
}
