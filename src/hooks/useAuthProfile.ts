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

const authUnavailableMessage = "Supabase Auth אינו זמין כרגע. ניתן להמשיך במצב דמו מקומי.";

function isUserRole(value: string | null | undefined): value is UserRole {
  return value === "admin" || value === "sales" || value === "viewer";
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;

  return "אירעה שגיאה בכניסה למערכת.";
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
    throw new Error("This profile is inactive.");
  }

  if (!isUserRole(profile.role)) {
    throw new Error("The profile role is missing or invalid.");
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
  const [isDemoMode, setIsDemoMode] = useState(!isSupabaseConfigured);

  const enterDemoMode = useCallback((message?: string) => {
    setCurrentUser(null);
    setIsDemoMode(true);
    setIsLoading(false);
    setError(message ?? null);
  }, []);

  const loadAuthenticatedUser = useCallback(async (user: User) => {
    const profileUser = await loadProfileForUser(user);

    setCurrentUser(profileUser);
    setIsDemoMode(false);
    setError(null);
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      enterDemoMode();
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
        setError(null);
        return;
      }

      await loadAuthenticatedUser(data.session.user);
    };

    void loadInitialSession()
      .catch((initialError: unknown) => {
        if (isCancelled) return;

        console.warn("[GOLDLANDS] Supabase auth initialization failed. Falling back to demo mode.", initialError);
        enterDemoMode(authUnavailableMessage);
      })
      .finally(() => {
        if (!isCancelled) setIsLoading(false);
      });

    const { data } = client.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT" || !session?.user) {
        setCurrentUser(null);
        setError(null);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      void loadAuthenticatedUser(session.user)
        .catch((profileError: unknown) => {
          if (isCancelled) return;

          console.warn("[GOLDLANDS] Supabase profile load failed. Falling back to demo mode.", profileError);
          enterDemoMode(authUnavailableMessage);
        })
        .finally(() => {
          if (!isCancelled) setIsLoading(false);
        });
    });

    return () => {
      isCancelled = true;
      data.subscription.unsubscribe();
    };
  }, [enterDemoMode, loadAuthenticatedUser]);

  const signIn = useCallback(
    async ({ email, password }: SignInInput) => {
      setError(null);

      if (isDemoMode || !isSupabaseConfigured || !supabase) {
        setCurrentUser(demoCurrentUser);
        setIsDemoMode(true);
        return true;
      }

      setIsLoading(true);

      try {
        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (signInError) {
          setError(signInError.message);
          return false;
        }

        if (!data.user) throw new Error("Supabase did not return an authenticated user.");

        try {
          await loadAuthenticatedUser(data.user);
        } catch (profileError: unknown) {
          console.warn("[GOLDLANDS] Supabase profile load failed after sign in.", profileError);
          enterDemoMode(authUnavailableMessage);
          return false;
        }

        return true;
      } catch (signInError: unknown) {
        setError(getErrorMessage(signInError));
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [enterDemoMode, isDemoMode, loadAuthenticatedUser],
  );

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
    setIsDemoMode(!isSupabaseConfigured || isDemoMode);

    return true;
  }, [isDemoMode]);

  return {
    currentUser,
    isLoading,
    error,
    isDemoMode,
    signIn,
    signOut,
  };
}
