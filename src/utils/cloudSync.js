import { isSupabaseConfigured, supabase } from "../lib/supabase";
import { touchStore } from "./storage";

const canSync = () => isSupabaseConfigured && supabase && navigator.onLine;

const cloudDate = (row) =>
  new Date(row?.state?.syncMeta?.updatedAt || row?.updated_at || 0).getTime();

const localDate = (store) => new Date(store?.syncMeta?.updatedAt || 0).getTime();

export async function upsertProfile(user) {
  if (!canSync() || !user?.id) return { ok: false, skipped: true };

  const { error } = await supabase.from("profiles").upsert(
    {
      id: user.id,
      full_name: user.name,
      email: user.email,
      phone: user.phone || "",
    },
    { onConflict: "id" }
  );

  if (error) {
    console.warn("Profile sync failed:", error.message);
    return { ok: false, error };
  }

  return { ok: true };
}

export async function pullStoreFromSupabase(userId) {
  if (!canSync() || !userId) return null;

  const { data, error } = await supabase
    .from("app_states")
    .select("user_id,email,state,updated_at")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.warn("Cloud pull failed:", error.message);
    return null;
  }

  return data;
}

export async function pushStoreToSupabase(store, user) {
  if (!canSync() || !store || !user?.id) return { ok: false, skipped: true };

  const now = new Date().toISOString();
  const cleanStore = {
    ...store,
    ownerId: user.id,
    currentUserId: user.id,
    syncMeta: {
      ...(store.syncMeta || {}),
      lastSyncedAt: now,
      lastSyncSource: "supabase",
      pendingSync: false,
    },
  };

  const { error } = await supabase.from("app_states").upsert(
    {
      user_id: user.id,
      email: user.email,
      state: cleanStore,
      updated_at: cleanStore.syncMeta.updatedAt || now,
    },
    { onConflict: "user_id" }
  );

  if (error) {
    console.warn("Cloud push failed:", error.message);
    return { ok: false, error };
  }

  return { ok: true, store: cleanStore };
}

export async function syncLocalWithSupabase(localStore, user) {
  if (!canSync() || !localStore || !user?.id) {
    return { store: localStore, source: "local", ok: false, skipped: true };
  }

  await upsertProfile(user);

  const cloudRow = await pullStoreFromSupabase(user.id);

  if (cloudRow?.state && cloudDate(cloudRow) > localDate(localStore)) {
    const cloudStore = {
      ...cloudRow.state,
      ownerId: user.id,
      currentUserId: user.id,
      syncMeta: {
        ...(cloudRow.state.syncMeta || {}),
        lastSyncedAt: new Date().toISOString(),
        lastSyncSource: "supabase",
        pendingSync: false,
      },
    };
    return { store: cloudStore, source: "cloud", ok: true };
  }

  const pushed = await pushStoreToSupabase(localStore, user);
  return {
    store: pushed.store || localStore,
    source: "local",
    ok: pushed.ok,
    error: pushed.error,
  };
}

export function markOfflineChange(store) {
  return touchStore(store, {
    lastSyncSource: "indexeddb",
    pendingSync: true,
  });
}
