import { useCallback, useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { demoCurrentUser } from "../data/mockCurrentUser";
import { isSupabaseConfigured, supabase } from "../lib/supabaseClient";
import type { CurrentUser, UserRole } from "../types";

interface ProfileRow {
  id: string;
  full_name: string | null;
  role: string | null;
  is_active: boolean | null;
}

interface SignInInput {
  email: string;
  password: string;
}

export type AuthMode = "signed-out" | "supabase" | "demo";

const authNotConfiguredMessage = "Supabase אינו מוגדר. אפשר להיכנס רק למצב דמו מקומי.";
const adminOnlyMessage = "הכניסה למערכת מותרת רק למשתמש admin פעיל.";

function isUserRole(value: string | null | undefined): value is UserRole {
  return value === "admin" || value === "sales" || value === "viewer";
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;

  return "אירעה שגיאה בכניסה למערכת.";
}

function getSignInErrorMessage(error: unknown) {
  const message = getErrorMessage(error).toLowerCase();

  if (message.includes("invalid login credentials")) {
    return "האימייל או הסיסמה אינם נכונים.";
  }

  if (message.includes("email not confirmed")) {
    return "יש לאשר את כתובת האימייל לפני הכניסה.";
  }

  if (message.includes("supabase is not configured")) {
    return authNotConfiguredMessage;
  }

  return getErrorMessage(error);
}

async function loadProfileForUser(user: User): Promise<CurrentUser> {
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, role, is_active")
    .eq("id", user.id)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error("No profile row was found for the authenticated user.");

  const profile = data as ProfileRow;

  if (profile.is_active === false) {
    throw new Error(adminOnlyMessage);
  }

  if (!isUserRole(profile.role)) {
    throw new Error(adminOnlyMessage);
  }

  if (profile.role !== "admin") {
    throw new Error(adminOnlyMessage);
  }

  return {
    id: profile.id,
    name: profile.full_name?.trim() || user.email || "משתמש",
    email: user.email ?? undefined,
    role: profile.role,
  };
}

export function useAuthProfile() {
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [isLoading, setIsLoading] = useState(isSupabaseConfigured);
  const [error, setError] = useState<string | null>(null);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [hasSupabaseSession, setHasSupabaseSession] = useState(false);
  const authMode: AuthMode = currentUser ? (isDemoMode ? "demo" : "supabase") : "signed-out";

  const resetToSignedOut = useCallback((message?: string | null, sessionExists = false) => {
    setCurrentUser(null);
    setIsDemoMode(false);
    setHasSupabaseSession(sessionExists);
    setIsLoading(false);
    setError(message ?? null);
  }, []);

  const loadAuthenticatedUser = useCallback(async (user: User) => {
    const profileUser = await loadProfileForUser(user);

    setCurrentUser(profileUser);
    setIsDemoMode(false);
    setHasSupabaseSession(true);
    setError(null);
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      resetToSignedOut(null);
      return undefined;
    }

    const client = supabase;
    let isCancelled = false;

    const loadInitialSession = async () => {
      setIsLoading(true);

      const { data, error: sessionError } = await client.auth.getSession();

      if (sessionError) throw sessionError;
      if (!data.session?.user) {
        setCurrentUser(null);
        setIsDemoMode(false);
        setHasSupabaseSession(false);
        setError(null);
        return;
      }

      setHasSupabaseSession(true);
      await loadAuthenticatedUser(data.session.user);
    };

    void loadInitialSession()
      .catch((initialError: unknown) => {
        if (isCancelled) return;

        console.warn("[GOLDLANDS] Supabase auth initialization failed. Staying signed out.", initialError);
        void client.auth.signOut();
        resetToSignedOut(getSignInErrorMessage(initialError));
      })
      .finally(() => {
        if (!isCancelled) setIsLoading(false);
      });

    const { data } = client.auth.onAuthStateChange((event, session) => {
      setHasSupabaseSession(Boolean(session?.user));

      if (event === "SIGNED_OUT" || !session?.user) {
        setCurrentUser(null);
        setIsDemoMode(false);
        setError(null);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      void loadAuthenticatedUser(session.user)
        .catch((profileError: unknown) => {
          if (isCancelled) return;

          console.warn("[GOLDLANDS] Supabase profile load failed. Staying signed out.", profileError);
          void client.auth.signOut();
          resetToSignedOut(getSignInErrorMessage(profileError), false);
        })
        .finally(() => {
          if (!isCancelled) setIsLoading(false);
        });
    });

    return () => {
      isCancelled = true;
      data.subscription.unsubscribe();
    };
  }, [loadAuthenticatedUser, resetToSignedOut]);

  useEffect(() => {
    console.info("[GOLDLANDS] Auth state", {
      authMode,
      profileRole: currentUser?.role ?? null,
      hasSupabaseSession,
      isSupabaseConfigured,
    });
  }, [authMode, currentUser?.role, hasSupabaseSession]);

  const signIn = useCallback(
    async ({ email, password }: SignInInput) => {
      setError(null);

      if (!isSupabaseConfigured || !supabase) {
        setCurrentUser(null);
        setIsDemoMode(false);
        setHasSupabaseSession(false);
        setError(authNotConfiguredMessage);
        return false;
      }

      setIsLoading(true);

      try {
        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (signInError) {
          setError(getSignInErrorMessage(signInError));
          return false;
        }

        if (!data.user) throw new Error("Supabase did not return an authenticated user.");

        try {
          await loadAuthenticatedUser(data.user);
        } catch (profileError: unknown) {
          console.warn("[GOLDLANDS] Supabase profile load failed after sign in.", profileError);
          await supabase.auth.signOut();
          resetToSignedOut(getSignInErrorMessage(profileError), false);
          return false;
        }

        return true;
      } catch (signInError: unknown) {
        setError(getSignInErrorMessage(signInError));
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [loadAuthenticatedUser, resetToSignedOut],
  );

  const signInDemo = useCallback(async () => {
    setCurrentUser(demoCurrentUser);
    setIsDemoMode(true);
    setHasSupabaseSession(false);
    setIsLoading(false);
    setError(null);

    return true;
  }, []);

  const signOut = useCallback(async () => {
    setError(null);

    if (supabase && !isDemoMode) {
      const { error: signOutError } = await supabase.auth.signOut();

      if (signOutError) {
        setError(getErrorMessage(signOutError));
        return false;
      }
    }

    setCurrentUser(null);
    setIsDemoMode(false);
    setHasSupabaseSession(false);

    return true;
  }, [isDemoMode]);

  return {
    currentUser,
    isLoading,
    error,
    authMode,
    hasSupabaseSession,
    isDemoMode,
    isSupabaseConfigured,
    signIn,
    signInDemo,
    signOut,
  };
}
