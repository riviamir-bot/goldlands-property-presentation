import type { VercelRequest, VercelResponse } from "@vercel/node";
import { loadPresentation } from "./_lib/loadPresentation.js";
import { createMarketingData } from "./_lib/marketingClient.js";
import { describeErrorForLog } from "./_lib/safety.js";

export default async function handler(request: VercelRequest, response: VercelResponse) {
  response.setHeader("Cache-Control", "private, no-store");

  if (request.method !== "GET") {
    response.setHeader("Allow", "GET");
    response.status(405).json({ error: "שיטה לא נתמכת." });
    return;
  }

  try {
    const result = await loadPresentation(createMarketingData(), request.headers.authorization);
    response.status(result.status).json(result.body);
  } catch (error) {
    console.error("[presentation] failed to load", describeErrorForLog(error));
    response.status(500).json({ error: "לא ניתן לטעון את הנתונים כרגע." });
  }
}
