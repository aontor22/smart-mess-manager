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
  authProvider: "supabase",
});

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authMode, setAuthMode] = useState(isSupabaseConfigured ? "supabase" : "local");

  useEffect(() => {
    let mounted = true;

    const initAuth = async () => {
      const cached = await getCachedAuthUser();
      if (mounted && cached) setCurrentUser(cached);

      if (isSupabaseConfigured && supabase) {
        const { data } = await supabase.auth.getSession();
        if (data?.session?.user && mounted) {
          const user = formatSupabaseUser(data.session.user);
          setCurrentUser(user);
          setAuthMode("supabase");
          await cacheAuthUser(user);
        }

        const { data: listener } = supabase.auth.onAuthStateChange(async (_event, session) => {
          if (session?.user) {
            const user = formatSupabaseUser(session.user);
            setCurrentUser(user);
            setAuthMode("supabase");
            await cacheAuthUser(user);
          } else {
            setCurrentUser(null);
            await clearCachedAuthUser();
          }
        });

        if (mounted) setAuthLoading(false);
        return () => listener?.subscription?.unsubscribe?.();
      }

      if (mounted) setAuthLoading(false);
    };

    initAuth();

    return () => {
      mounted = false;
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
      setCurrentUser(user);
      setAuthMode("supabase");
      await cacheAuthUser(user);
      await upsertProfile(user);
      return user;
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
    return user;
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
      signup,
      logout,
    }),
    [currentUser, authLoading, authMode]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
