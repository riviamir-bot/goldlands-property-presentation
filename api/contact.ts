import type { VercelRequest, VercelResponse } from "@vercel/node";
import { listContactProjects, submitContact } from "./_lib/contact.js";
import { respond } from "./_lib/http.js";
import { createContactData } from "./_lib/marketingClient.js";

/** Public contact form: GET lists projects to choose from, POST sends the lead to the marketing system. */
export default function handler(request: VercelRequest, response: VercelResponse) {
  response.setHeader("X-Robots-Tag", "noindex, nofollow");
  if (request.method === "POST") {
    return respond(request, response, "POST", "contact", () => submitContact(createContactData(), request.body));
  }
  return respond(request, response, "GET", "contact", () => listContactProjects(createContactData()));
}
