import type { PresentationPayload } from "../services/presentationApi";

export interface SessionState {
  phase: "signedOut" | "loading" | "ready" | "forbidden";
  payload: PresentationPayload | null;
  /** The session ended while data was on screen: keep showing it and ask to reconnect. */
  needsReconnect: boolean;
  error: string | null;
}

export type SessionEvent =
  | { type: "loading" }
  | { type: "loaded"; payload: PresentationPayload }
  | { type: "unauthenticated" }
  | { type: "forbidden" }
  | { type: "failed"; message: string }
  | { type: "signedOut" };

export const initialSessionState: SessionState = {
  phase: "signedOut",
  payload: null,
  needsReconnect: false,
  error: null,
};

export function sessionReducer(state: SessionState, event: SessionEvent): SessionState {
  switch (event.type) {
    case "loading":
      return state.payload ? state : { ...state, phase: "loading", error: null };
    case "loaded":
      return { phase: "ready", payload: event.payload, needsReconnect: false, error: null };
    case "unauthenticated":
      return state.payload ? { ...state, needsReconnect: true } : { ...initialSessionState };
    case "forbidden":
      return { phase: "forbidden", payload: null, needsReconnect: false, error: null };
    case "failed":
      return state.payload
        ? { ...state, error: event.message }
        : { ...initialSessionState, error: event.message };
    case "signedOut":
      return { ...initialSessionState };
  }
}
