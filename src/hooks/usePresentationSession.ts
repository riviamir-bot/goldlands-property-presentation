import { useCallback, useEffect, useReducer, useRef } from "react";
import { isMarketingAuthConfigured, marketingAuth } from "../lib/marketingAuthClient";
import { fetchPresentation } from "../services/presentationApi";
import { initialSessionState, sessionReducer } from "./presentationSessionReducer";

const REFRESH_INTERVAL_MS = 120_000;

export const signInMessages = {
  wrongCredentials: "האימייל או הסיסמה אינם נכונים.",
  forbidden: "אין לך הרשאה למערכת המצגות. יש לפנות למנהל המערכת.",
  notConfigured: "המערכת אינה מוגדרת. יש לפנות למנהל המערכת.",
  generic: "הכניסה נכשלה. נסו שוב.",
};

export function usePresentationSession() {
  const [state, dispatch] = useReducer(sessionReducer, initialSessionState);
  const isLoadingRef = useRef(false);

  const load = useCallback(async () => {
    if (!marketingAuth || isLoadingRef.current) return;
    isLoadingRef.current = true;

    try {
      const { data } = await marketingAuth.auth.getSession();
      const token = data.session?.access_token;
      if (!token) {
        dispatch({ type: "unauthenticated" });
        return;
      }

      const result = await fetchPresentation(token);
      if (result.kind === "ok") dispatch({ type: "loaded", payload: result.payload });
      else if (result.kind === "unauthenticated") dispatch({ type: "unauthenticated" });
      else if (result.kind === "forbidden") {
        await marketingAuth.auth.signOut();
        dispatch({ type: "forbidden" });
      } else dispatch({ type: "failed", message: result.message });
    } finally {
      isLoadingRef.current = false;
    }
  }, []);

  useEffect(() => {
    if (!marketingAuth) return undefined;

    dispatch({ type: "loading" });
    void load();

    const onFocus = () => void load();
    const onVisible = () => {
      if (document.visibilityState === "visible") void load();
    };
    const timer = window.setInterval(() => void load(), REFRESH_INTERVAL_MS);
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [load]);

  const signIn = useCallback(
    async (email: string, password: string): Promise<{ ok: true } | { ok: false; message: string }> => {
      if (!marketingAuth) return { ok: false, message: signInMessages.notConfigured };

      const { error } = await marketingAuth.auth.signInWithPassword({ email: email.trim(), password });
      if (error) {
        const isCredentials = error.message.toLowerCase().includes("invalid login credentials");
        return { ok: false, message: isCredentials ? signInMessages.wrongCredentials : signInMessages.generic };
      }

      dispatch({ type: "loading" });
      await load();
      return { ok: true };
    },
    [load],
  );

  const signOut = useCallback(async () => {
    if (marketingAuth) await marketingAuth.auth.signOut();
    dispatch({ type: "signedOut" });
  }, []);

  return { state, isConfigured: isMarketingAuthConfigured, signIn, signOut, reload: load };
}
