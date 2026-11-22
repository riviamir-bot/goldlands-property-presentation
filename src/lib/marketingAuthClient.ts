import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_MARKETING_SUPABASE_URL?.trim();
const anonKey = import.meta.env.VITE_MARKETING_SUPABASE_ANON_KEY?.trim();

export const isMarketingAuthConfigured = Boolean(url && anonKey);

/** Sign-in only. All project data is read through /api/presentation, never from the browser. */
export const marketingAuth: SupabaseClient | null =
  url && anonKey
    ? createClient(url, anonKey, {
        auth: {
          autoRefreshToken: true,
          persistSession: true,
          storageKey: "goldlands-presentation-auth",
        },
      })
    : null;
