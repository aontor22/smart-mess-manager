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

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authMode, setAuthMode] = useState(isSupabaseConfigured ? "supabase" : "local");

  useEffect(() => {
    let mounted = true;
    let subscription = null;

    const applySessionUser = async (sessionUser) => {
      const user = formatSupabaseUser(sessionUser);
      if (!mounted) return;
      setCurrentUser(user);
      setAuthMode("supabase");
      await cacheAuthUser(user);
      await upsertProfile(user);
    };

    const initAuth = async () => {
      const cached = await getCachedAuthUser();
      if (mounted && cached) setCurrentUser(cached);

      if (isSupabaseConfigured && supabase) {
        const { data, error } = await supabase.auth.getSession();
        if (!mounted) return;

        if (!error && data?.session?.user) {
          await applySessionUser(data.session.user);
        } else if (!data?.session) {
          setCurrentUser(null);
          await clearCachedAuthUser();
        }

        const { data: listener } = supabase.auth.onAuthStateChange(async (_event, session) => {
          if (session?.user) {
            await applySessionUser(session.user);
          } else if (mounted) {
            setCurrentUser(null);
            await clearCachedAuthUser();
          }
        });

        subscription = listener?.subscription || null;
        if (mounted) setAuthLoading(false);
        return;
      }

      if (mounted) setAuthLoading(false);
    };

    initAuth();

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
      await supabase.auth.signOut();
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
