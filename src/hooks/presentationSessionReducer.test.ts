import { describe, expect, it } from "vitest";
import { initialSessionState, sessionReducer } from "./presentationSessionReducer";
import type { PresentationPayload } from "../services/presentationApi";

const payload: PresentationPayload = {
  user: { id: "u", name: "n", role: "sales", sourceRole: "marketer" },
  projects: [],
  apartments: [],
  generatedAt: "t",
};
const ready = sessionReducer(initialSessionState, { type: "loaded", payload });

describe("sessionReducer", () => {
  it("becomes ready when data loads and clears earlier problems", () => {
    expect(ready).toEqual({ phase: "ready", payload, needsReconnect: false, error: null });
    const recovered = sessionReducer({ ...ready, needsReconnect: true, error: "x" }, { type: "loaded", payload });
    expect(recovered).toMatchObject({ needsReconnect: false, error: null });
  });

  it("keeps the last payload and flags reconnect when a refresh is unauthenticated", () => {
    expect(sessionReducer(ready, { type: "unauthenticated" })).toMatchObject({ phase: "ready", payload, needsReconnect: true });
  });

  it("goes to signedOut when the first load is unauthenticated", () => {
    expect(sessionReducer({ ...initialSessionState, phase: "loading" }, { type: "unauthenticated" })).toMatchObject({
      phase: "signedOut",
      payload: null,
    });
  });

  it("keeps the last payload on a refresh error", () => {
    expect(sessionReducer(ready, { type: "failed", message: "אין חיבור" })).toMatchObject({ phase: "ready", payload, error: "אין חיבור" });
  });

  it("returns to signedOut with the message when the first load fails", () => {
    expect(sessionReducer({ ...initialSessionState, phase: "loading" }, { type: "failed", message: "אין חיבור" })).toMatchObject({
      phase: "signedOut",
      error: "אין חיבור",
    });
  });

  it("clears everything on signOut and on forbidden", () => {
    expect(sessionReducer(ready, { type: "signedOut" })).toEqual(initialSessionState);
    expect(sessionReducer(ready, { type: "forbidden" })).toMatchObject({ phase: "forbidden", payload: null });
  });

  it("shows loading only when there is nothing on screen yet", () => {
    expect(sessionReducer(initialSessionState, { type: "loading" }).phase).toBe("loading");
    expect(sessionReducer(ready, { type: "loading" }).phase).toBe("ready");
  });
});
