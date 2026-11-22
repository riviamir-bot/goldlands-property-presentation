import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createShareLink } from "./_lib/clientShare.js";
import { publicBaseUrl, respond } from "./_lib/http.js";
import { createMarketingData } from "./_lib/marketingClient.js";

export default function handler(request: VercelRequest, response: VercelResponse) {
  return respond(request, response, "POST", "share-links", () =>
    createShareLink(createMarketingData(), request.headers.authorization, request.body, publicBaseUrl(request)),
  );
}
