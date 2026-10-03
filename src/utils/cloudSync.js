import { isSupabaseConfigured, supabase } from "../lib/supabase";
import { generateMessCode, normalizeStore, touchStore } from "./storage";

const canSync = () => isSupabaseConfigured && supabase && navigator.onLine;

const cloudDate = (row) =>
  new Date(row?.state?.syncMeta?.updatedAt || row?.updated_at || 0).getTime();

const localDate = (store) => new Date(store?.syncMeta?.updatedAt || 0).getTime();

const isUuid = (value) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    String(value || "")
  );

const freshUuid = () => {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  throw new Error("This browser cannot generate a secure mess ID. Please use a modern browser.");
};

export function rekeyStoreMess(store, nextMessId) {
  const oldMessId = store?.activeMessId || store?.messes?.[0]?.id;
  if (!oldMessId || oldMessId === nextMessId) return normalizeStore(store);

  const replaceMessId = (rows = []) =>
    rows.map((row) => (row.messId === oldMessId ? { ...row, messId: nextMessId } : row));

  return normalizeStore({
    ...store,
    activeMessId: nextMessId,
    messes: (store.messes || []).map((mess) =>
      mess.id === oldMessId ? { ...mess, id: nextMessId } : mess
    ),
    members: replaceMessId(store.members),
    meals: replaceMessId(store.meals),
    marketCosts: replaceMessId(store.marketCosts),
    deposits: replaceMessId(store.deposits),
    expenses: replaceMessId(store.expenses),
    activityLogs: replaceMessId(store.activityLogs),
    notices: replaceMessId(store.notices),
    toletPosts: replaceMessId(store.toletPosts),
  });
}

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

export async function getCurrentMessMembership(userId) {
  if (!canSync() || !userId) return null;

  const { data, error } = await supabase
    .from("mess_memberships")
    .select("mess_id,user_id,role,status,joined_at")
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle();

  if (error) {
    console.warn("Membership lookup failed:", error.message);
    return null;
  }

  return data;
}

export async function pullMessWorkspace(messId) {
  if (!canSync() || !messId) return null;

  const { data, error } = await supabase
    .from("mess_workspaces")
    .select("id,join_code,name,manager_user_id,state,updated_at")
    .eq("id", messId)
    .maybeSingle();

  if (error) {
    console.warn("Mess workspace pull failed:", error.message);
    return null;
  }

  if (!data?.state) return data;

  const state = normalizeStore(data.state);
  const activeMessId = state.activeMessId || data.id;
  const messes = (state.messes || []).map((mess) =>
    mess.id === activeMessId || mess.id === data.id
      ? {
          ...mess,
          id: data.id,
          joinCode: data.join_code,
          name: data.name || mess.name,
          managerUserId: data.manager_user_id || mess.managerUserId,
        }
      : mess
  );

  return {
    ...data,
    state: normalizeStore({ ...state, activeMessId: data.id, messes }),
  };
}

export async function pullLegacyAppState(userId) {
  if (!canSync() || !userId) return null;

  const { data, error } = await supabase
    .from("app_states")
    .select("user_id,email,state,updated_at")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.warn("Legacy cloud pull failed:", error.message);
    return null;
  }

  return data;
}

export async function createMessWorkspace(store, user) {
  if (!canSync() || !store || !user?.id) {
    return { ok: false, error: new Error("Internet connection is required to create a mess.") };
  }

  let cleanStore = normalizeStore(store);
  let messId = cleanStore.activeMessId || cleanStore.messes?.[0]?.id;
  if (!isUuid(messId)) {
    messId = freshUuid();
    cleanStore = rekeyStoreMess(cleanStore, messId);
  }

  const activeMess = cleanStore.messes.find((mess) => mess.id === messId) || cleanStore.messes[0];
  if (!activeMess) return { ok: false, error: new Error("Mess data is missing.") };

  const joinCode = String(activeMess.joinCode || generateMessCode()).trim().toUpperCase();
  cleanStore = normalizeStore({
    ...cleanStore,
    ownerId: user.id,
    currentUserId: user.id,
    activeMessId: messId,
    messes: cleanStore.messes.map((mess) =>
      mess.id === messId ? { ...mess, joinCode, managerUserId: user.id } : mess
    ),
  });

  const { data, error } = await supabase.rpc("create_mess_workspace", {
    p_mess_id: messId,
    p_join_code: joinCode,
    p_name: activeMess.name || "My Mess",
    p_state: cleanStore,
  });

  if (error) return { ok: false, error };

  return {
    ok: true,
    messId: data?.mess_id || messId,
    joinCode: data?.join_code || joinCode,
    store: cleanStore,
  };
}

export async function joinMessWorkspace(joinCode) {
  if (!canSync()) {
    return { ok: false, error: new Error("Internet connection is required to join a mess.") };
  }

  const normalizedCode = String(joinCode || "").trim().toUpperCase();
  const { data, error } = await supabase.rpc("join_mess_by_code", {
    p_join_code: normalizedCode,
  });

  if (error) return { ok: false, error };

  const messId = data?.mess_id;
  if (!messId) return { ok: false, error: new Error("Mess could not be joined.") };

  const workspace = await pullMessWorkspace(messId);
  if (!workspace?.state) return { ok: false, error: new Error("Mess workspace could not be loaded.") };

  return {
    ok: true,
    messId,
    joinCode: workspace.join_code,
    store: workspace.state,
  };
}

export async function rotateMessJoinCode(messId, nextCode) {
  if (!canSync() || !messId) return { ok: false, error: new Error("Internet connection is required.") };

  const { data, error } = await supabase.rpc("rotate_mess_join_code", {
    p_mess_id: messId,
    p_join_code: String(nextCode || "").trim().toUpperCase(),
  });

  if (error) return { ok: false, error };
  return { ok: true, joinCode: data?.join_code || nextCode };
}

export async function transferMessManager(messId, nextManagerUserId) {
  if (!canSync() || !messId || !nextManagerUserId) {
    return { ok: false, error: new Error("The selected member must have joined with an account first.") };
  }

  const { error } = await supabase.rpc("transfer_mess_manager", {
    p_mess_id: messId,
    p_new_manager_user_id: nextManagerUserId,
  });

  if (error) return { ok: false, error };
  return { ok: true };
}

export async function pushStoreToSupabase(store, user) {
  if (!canSync() || !store || !user?.id) return { ok: false, skipped: true };

  const membership = await getCurrentMessMembership(user.id);
  if (!membership?.mess_id) return { ok: false, needsSetup: true };

  if (store.activeMessId !== membership.mess_id) {
    const workspace = await pullMessWorkspace(membership.mess_id);
    return {
      ok: Boolean(workspace?.state),
      store: workspace?.state || store,
      membership,
      source: "cloud",
    };
  }

  const now = new Date().toISOString();
  const activeMess = store.messes.find((mess) => mess.id === membership.mess_id) || store.messes[0];
  const cleanStore = normalizeStore({
    ...store,
    ownerId: user.id,
    currentUserId: user.id,
    syncMeta: {
      ...(store.syncMeta || {}),
      lastSyncedAt: now,
      lastSyncSource: "supabase",
      pendingSync: false,
    },
  });

  const { error } = await supabase
    .from("mess_workspaces")
    .update({
      name: activeMess?.name || "My Mess",
      state: cleanStore,
    })
    .eq("id", membership.mess_id);

  if (error) {
    console.warn("Shared mess push failed:", error.message);
    return { ok: false, error, membership };
  }

  return { ok: true, store: cleanStore, membership };
}

export async function syncLocalWithSupabase(localStore, user) {
  if (!canSync() || !localStore || !user?.id) {
    return { store: localStore, source: "local", ok: false, skipped: true };
  }

  await upsertProfile(user);

  let membership = await getCurrentMessMembership(user.id);

  if (!membership) {
    const legacyRow = await pullLegacyAppState(user.id);
    if (legacyRow?.state?.messes?.length) {
      let legacyStore = normalizeStore(legacyRow.state);
      const legacyMess = legacyStore.messes.find((mess) => mess.id === legacyStore.activeMessId) || legacyStore.messes[0];
      const nextJoinCode = legacyMess.joinCode || generateMessCode();
      legacyStore = normalizeStore({
        ...legacyStore,
        messes: legacyStore.messes.map((mess) =>
          mess.id === legacyMess.id ? { ...mess, joinCode: nextJoinCode, managerUserId: user.id } : mess
        ),
      });

      const migrated = await createMessWorkspace(legacyStore, user);
      if (migrated.ok) {
        membership = await getCurrentMessMembership(user.id);
        return {
          store: migrated.store,
          membership,
          source: "legacy-migration",
          ok: true,
        };
      }
    }

    return {
      store: localStore,
      source: "local",
      ok: true,
      needsSetup: true,
      membership: null,
    };
  }

  const workspace = await pullMessWorkspace(membership.mess_id);
  if (!workspace?.state) {
    return { store: localStore, membership, source: "local", ok: false };
  }

  if (localStore.activeMessId !== membership.mess_id || cloudDate(workspace) > localDate(localStore)) {
    return {
      store: workspace.state,
      membership,
      source: "cloud",
      ok: true,
    };
  }

  const pushed = await pushStoreToSupabase(localStore, user);
  return {
    store: pushed.store || localStore,
    membership,
    source: pushed.source || "local",
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
