import type { VercelRequest, VercelResponse } from "@vercel/node";
import { recordProjectOpened } from "./_lib/clientShare.js";
import { respond } from "./_lib/http.js";
import { createMarketingData } from "./_lib/marketingClient.js";

export default function handler(request: VercelRequest, response: VercelResponse) {
  return respond(request, response, "POST", "events", () =>
    recordProjectOpened(createMarketingData(), request.headers.authorization, request.body),
  );
}
