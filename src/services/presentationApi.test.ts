import { describe, expect, it, vi } from "vitest";
import { createShareLink, fetchPresentation, fetchSharedPresentation } from "./presentationApi";

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

describe("createShareLink and fetchSharedPresentation", () => {
  it("posts the summary request with the bearer token and returns the url", async () => {
    const fetchImpl = respond(201, { url: "https://app/s/x", expiresAt: "2026-12-22" });
    const result = await createShareLink("tok", { projectId: "p", apartmentIds: ["a"], showPrices: true, language: "he" }, fetchImpl);
    expect(result).toEqual({ kind: "ok", url: "https://app/s/x" });
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("/api/share-links");
    expect(init.method).toBe("POST");
    expect(new Headers(init.headers).get("Authorization")).toBe("Bearer tok");
    expect(JSON.parse(String(init.body))).toMatchObject({ projectId: "p", apartmentIds: ["a"] });
  });

  it("reports the server's message when the link cannot be created", async () => {
    expect(await createShareLink("tok", { projectId: "p", apartmentIds: [], showPrices: true, language: "he" }, respond(400, { error: "חלק מהדירות אינן זמינות" }))).toEqual({
      kind: "error",
      message: "חלק מהדירות אינן זמינות",
    });
  });

  it("loads a shared summary without sign-in and maps expiry", async () => {
    const shared = { project: { id: "p" }, apartments: [], showPrices: true, language: "en", agent: null, expiresAt: "x" };
    expect(await fetchSharedPresentation("T", respond(200, shared))).toEqual({ kind: "ok", payload: shared });
    expect((await fetchSharedPresentation("T", respond(410, {}))).kind).toBe("expired");
    expect((await fetchSharedPresentation("T", respond(404, {}))).kind).toBe("expired");
    expect((await fetchSharedPresentation("T", respond(500, {}))).kind).toBe("error");
  });
});
