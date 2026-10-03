import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { isSupabaseConfigured, supabase } from "../lib/supabase";
import {
  cacheAuthUser,
  clearCachedAuthUser,
  demoCredentials,
  getCachedAuthUser,
  loadStore,
  makeId,
  saveStore,
} from "../utils/storage";
import { upsertProfile } from "../utils/cloudSync";

const AuthContext = createContext(null);

const formatSupabaseUser = (supabaseUser) => ({
  id: supabaseUser.id,
  name:
    supabaseUser.user_metadata?.full_name ||
    supabaseUser.user_metadata?.name ||
    supabaseUser.email?.split("@")[0] ||
    "User",
  email: supabaseUser.email,
  phone: supabaseUser.user_metadata?.phone || "",
  avatarUrl: supabaseUser.user_metadata?.avatar_url || supabaseUser.user_metadata?.picture || "",
  authProvider: supabaseUser.app_metadata?.provider || "supabase",
});

// Do not await another Supabase request from inside onAuthStateChange.
// Deferring the profile write avoids blocking the auth client's token/session work.
const syncProfileLater = (user) => {
  if (!user) return;
  window.setTimeout(() => {
    upsertProfile(user).catch((error) => {
      console.warn("Deferred profile sync failed:", error?.message || error);
    });
  }, 0);
};

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authMode, setAuthMode] = useState(isSupabaseConfigured ? "supabase" : "local");

  useEffect(() => {
    let mounted = true;
    let subscription = null;

    const applySessionUser = (sessionUser, { syncProfile = false } = {}) => {
      if (!sessionUser || !mounted) return null;

      const user = formatSupabaseUser(sessionUser);
      setCurrentUser(user);
      setAuthMode("supabase");

      // Local cache is only an offline/UI fallback. Supabase remains the source
      // of truth for the authenticated session.
      cacheAuthUser(user).catch((error) => {
        console.warn("Auth cache write failed:", error?.message || error);
      });

      if (syncProfile) syncProfileLater(user);
      return user;
    };

    const clearLocalAuth = () => {
      if (!mounted) return;
      setCurrentUser(null);
      clearCachedAuthUser().catch((error) => {
        console.warn("Auth cache clear failed:", error?.message || error);
      });
    };

    const initAuth = async () => {
      const cached = await getCachedAuthUser();
      if (!mounted) return;

      // Register the listener before the initial lookup so token refreshes and
      // OAuth callback events cannot slip through during app startup.
      if (isSupabaseConfigured && supabase) {
        const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
          if (!mounted) return;

          if (session?.user) {
            applySessionUser(session.user, {
              syncProfile: event === "SIGNED_IN" || event === "USER_UPDATED",
            });
          } else if (event === "SIGNED_OUT") {
            clearLocalAuth();
          }
        });
        subscription = listener?.subscription || null;

        const { data, error } = await supabase.auth.getSession();
        if (!mounted) return;

        if (data?.session?.user) {
          applySessionUser(data.session.user, { syncProfile: true });
        } else if (error) {
          // A temporary network/refresh error should not destroy the local
          // offline identity. The persisted Supabase tokens remain untouched
          // and can refresh when connectivity is restored.
          if (cached) {
            setCurrentUser(cached);
            setAuthMode("supabase");
          }
        } else {
          clearLocalAuth();
        }

        setAuthLoading(false);
        return;
      }

      if (cached) {
        setCurrentUser(cached);
        setAuthMode("local");
      }
      setAuthLoading(false);
    };

    initAuth().catch((error) => {
      console.error("Auth initialization failed:", error);
      if (mounted) setAuthLoading(false);
    });

    return () => {
      mounted = false;
      subscription?.unsubscribe?.();
    };
  }, []);

  const login = async (email, password) => {
    if (isSupabaseConfigured && supabase && navigator.onLine) {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw new Error(error.message);

      const user = formatSupabaseUser(data.user);
      setCurrentUser(user);
      setAuthMode("supabase");
      await cacheAuthUser(user);
      await upsertProfile(user);
      return user;
    }

    const guestStore = loadStore("guest");
    const user = guestStore.users.find(
      (item) => item.email.toLowerCase() === email.toLowerCase() && item.password === password
    );

    if (!user) {
      throw new Error(
        isSupabaseConfigured
          ? "You are offline. Reconnect and login once, then the app can reopen offline in this browser."
          : "Invalid email or password"
      );
    }

    const cleanUser = { ...user, authProvider: "local" };
    setCurrentUser(cleanUser);
    setAuthMode("local");
    await cacheAuthUser(cleanUser);
    return cleanUser;
  };

  const loginWithGoogle = async () => {
    if (!isSupabaseConfigured || !supabase) {
      throw new Error("Supabase is not configured.");
    }
    if (!navigator.onLine) {
      throw new Error("Internet connection is required for Google sign in.");
    }

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/app`,
        queryParams: {
          access_type: "offline",
          prompt: "select_account",
        },
      },
    });

    if (error) throw new Error(error.message);
    return data;
  };

  const signup = async ({ name, email, password, phone }) => {
    if (isSupabaseConfigured && supabase && navigator.onLine) {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name,
            phone,
          },
        },
      });

      if (error) throw new Error(error.message);
      if (!data?.user) throw new Error("Signup failed. Please try again.");

      const user = formatSupabaseUser(data.user);
      if (data.session) {
        setCurrentUser(user);
        setAuthMode("supabase");
        await cacheAuthUser(user);
        await upsertProfile(user);
      }
      return { user, hasSession: Boolean(data.session) };
    }

    const guestStore = loadStore("guest");
    const exists = guestStore.users.some((user) => user.email.toLowerCase() === email.toLowerCase());
    if (exists) throw new Error("This email is already registered in local demo mode");

    const user = {
      id: makeId(),
      name,
      email,
      password,
      phone,
      authProvider: "local",
    };

    const nextStore = {
      ...guestStore,
      users: [...guestStore.users, user],
    };

    saveStore(nextStore, "guest");
    setCurrentUser(user);
    setAuthMode("local");
    await cacheAuthUser(user);
    return { user, hasSession: true };
  };

  const logout = async () => {
    if (isSupabaseConfigured && supabase && authMode === "supabase") {
      // Only sign out this browser session. Other devices stay signed in.
      await supabase.auth.signOut({ scope: "local" });
    }
    await clearCachedAuthUser();
    setCurrentUser(null);
  };

  const value = useMemo(
    () => ({
      currentUser,
      isAuthenticated: Boolean(currentUser),
      authLoading,
      authMode,
      isSupabaseConfigured,
      demoCredentials,
      login,
      loginWithGoogle,
      signup,
      logout,
    }),
    [currentUser, authLoading, authMode]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
