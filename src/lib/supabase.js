import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const hasRealValue = (value) =>
  Boolean(value && !String(value).startsWith("your_") && String(value).trim().length > 10);

export const isSupabaseConfigured = hasRealValue(supabaseUrl) && hasRealValue(supabaseAnonKey);

// Supabase already uses localStorage in browsers by default. We pass it
// explicitly so the auth session survives normal tab/window/browser closes.
// Refresh tokens then keep the session alive across access-token expirations.
const browserStorage =
  typeof window !== "undefined" && window.localStorage ? window.localStorage : undefined;

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        storage: browserStorage,
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;
