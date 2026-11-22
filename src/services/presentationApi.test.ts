import { describe, expect, it, vi } from "vitest";
import { fetchPresentation } from "./presentationApi";

const payload = { user: { id: "u", name: "n", role: "sales", sourceRole: "marketer" }, projects: [], apartments: [], generatedAt: "t" };
const respond = (status: number, body: unknown) =>
  vi.fn(async () => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } }));

describe("fetchPresentation", () => {
  it("maps 200, 401, 403 and failures to result kinds", async () => {
    expect(await fetchPresentation("t", respond(200, payload))).toEqual({ kind: "ok", payload });
    expect(await fetchPresentation("t", respond(401, {}))).toEqual({ kind: "unauthenticated" });
    expect(await fetchPresentation("t", respond(403, {}))).toEqual({ kind: "forbidden" });
    expect((await fetchPresentation("t", respond(500, { error: "x" }))).kind).toBe("error");
    const offline = vi.fn(async () => { throw new TypeError("Failed to fetch"); });
    expect((await fetchPresentation("t", offline)).kind).toBe("error");
  });

  it("treats a 200 with a malformed body as an error", async () => {
    expect((await fetchPresentation("t", respond(200, { nope: true }))).kind).toBe("error");
  });

  it("sends the token as a bearer header to /api/presentation", async () => {
    const fetchImpl = respond(200, payload);
    await fetchPresentation("abc", fetchImpl);
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("/api/presentation");
    expect(new Headers(init.headers).get("Authorization")).toBe("Bearer abc");
  });
});
