import { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  loadStore,
  loadStoreAsync,
  makeId,
  resetStore,
  saveStore,
  touchStore,
} from "../utils/storage";
import { calculateMonthly } from "../utils/calculations";
import { useAuth } from "./AuthContext";
import { pushStoreToSupabase, syncLocalWithSupabase } from "../utils/cloudSync";

const DataContext = createContext(null);

export function DataProvider({ children }) {
  const { currentUser, authLoading, isSupabaseConfigured } = useAuth();
  const ownerId = currentUser?.id || "guest";
  const [store, setStore] = useState(() => loadStore("guest"));
  const [syncStatus, setSyncStatus] = useState("offline-ready");

  useEffect(() => {
    if (authLoading) return;

    let cancelled = false;

    const hydrate = async () => {
      const local = await loadStoreAsync(ownerId, currentUser || undefined);
      if (cancelled) return;

      setStore(local);

      if (currentUser && isSupabaseConfigured && navigator.onLine) {
        setSyncStatus("syncing");
        const result = await syncLocalWithSupabase(local, currentUser);
        if (cancelled) return;

        if (result?.store) {
          saveStore(result.store, ownerId);
          setStore(result.store);
        }

        setSyncStatus(result.ok ? "synced" : "local-only");
      } else {
        setSyncStatus(navigator.onLine ? "local-only" : "offline");
      }
    };

    hydrate();

    return () => {
      cancelled = true;
    };
  }, [ownerId, currentUser?.email, authLoading, isSupabaseConfigured]);

  useEffect(() => {
    const handleOnline = async () => {
      if (!currentUser || !store) return;
      setSyncStatus("syncing");
      const result = await syncLocalWithSupabase(store, currentUser);
      if (result?.store) {
        saveStore(result.store, ownerId);
        setStore(result.store);
      }
      setSyncStatus(result.ok ? "synced" : "local-only");
    };

    const handleOffline = () => setSyncStatus("offline");

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [currentUser, store, ownerId]);

  const persist = (nextStore) => {
    const touched = touchStore(
      {
        ...nextStore,
        ownerId,
        currentUserId: currentUser?.id || nextStore.currentUserId,
      },
      {
        lastSyncSource: navigator.onLine ? "indexeddb" : "offline-indexeddb",
      }
    );

    saveStore(touched, ownerId);
    setStore(touched);
    window.dispatchEvent(new Event("smm-store-updated"));

    if (currentUser && isSupabaseConfigured && navigator.onLine) {
      setSyncStatus("syncing");
      pushStoreToSupabase(touched, currentUser).then((result) => {
        if (result.ok && result.store) {
          saveStore(result.store, ownerId);
          setStore(result.store);
          setSyncStatus("synced");
        } else {
          setSyncStatus("pending");
        }
      });
    } else {
      setSyncStatus(navigator.onLine ? "local-only" : "offline");
    }
  };

  const activeMess = store.messes.find((mess) => mess.id === store.activeMessId) || store.messes[0];
  const messId = activeMess?.id;

  const members = store.members.filter((member) => member.messId === messId);
  const meals = store.meals.filter((meal) => meal.messId === messId);
  const marketCosts = store.marketCosts.filter((item) => item.messId === messId);
  const deposits = store.deposits.filter((item) => item.messId === messId);
  const expenses = store.expenses.filter((item) => item.messId === messId);
  const activityLogs = store.activityLogs
    .filter((item) => item.messId === messId)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const notices = store.notices
    .filter((item) => item.messId === messId)
    .sort((a, b) => Number(b.pinned) - Number(a.pinned) || new Date(b.createdAt) - new Date(a.createdAt));
  const toletPosts = [...store.toletPosts].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const currentMember = members.find((member) => member.userId === currentUser?.id);
  const isManager = currentMember?.role === "manager" || activeMess?.managerUserId === currentUser?.id;

  const log = (data, action) => {
    return {
      ...data,
      activityLogs: [
        ...data.activityLogs,
        {
          id: makeId(),
          messId,
          actorName: currentUser?.name || "System",
          action,
          createdAt: new Date().toISOString(),
        },
      ],
    };
  };

  const addRow = (collection, row, action) => {
    const fresh = loadStore(ownerId, currentUser || undefined);
    const next = {
      ...fresh,
      [collection]: [...fresh[collection], { id: makeId(), messId, ...row }],
    };
    persist(log(next, action));
  };

  const updateRow = (collection, rowId, patch, action) => {
    const fresh = loadStore(ownerId, currentUser || undefined);
    const next = {
      ...fresh,
      [collection]: fresh[collection].map((row) => (row.id === rowId ? { ...row, ...patch } : row)),
    };
    persist(log(next, action));
  };

  const deleteRow = (collection, rowId, action) => {
    const fresh = loadStore(ownerId, currentUser || undefined);
    const next = {
      ...fresh,
      [collection]: fresh[collection].filter((row) => row.id !== rowId),
    };
    persist(log(next, action));
  };

  const updateMess = (patch) => {
    const fresh = loadStore(ownerId, currentUser || undefined);
    const next = {
      ...fresh,
      messes: fresh.messes.map((mess) => (mess.id === messId ? { ...mess, ...patch } : mess)),
    };
    persist(log(next, "Updated mess settings"));
  };

  const transferManager = (memberId) => {
    const fresh = loadStore(ownerId, currentUser || undefined);
    const selectedMember = fresh.members.find((member) => member.id === memberId);
    const next = {
      ...fresh,
      messes: fresh.messes.map((mess) =>
        mess.id === messId ? { ...mess, managerUserId: selectedMember?.userId || mess.managerUserId } : mess
      ),
      members: fresh.members.map((member) =>
        member.messId !== messId
          ? member
          : { ...member, role: member.id === memberId ? "manager" : "member" }
      ),
    };
    persist(log(next, `Transferred manager role to ${selectedMember?.name || "another member"}`));
  };

  const resetDemoData = () => {
    const data = resetStore(ownerId, currentUser || undefined);
    persist(data);
  };

  const manualSync = async () => {
    if (!currentUser) return;
    setSyncStatus("syncing");
    const result = await syncLocalWithSupabase(store, currentUser);
    if (result?.store) {
      saveStore(result.store, ownerId);
      setStore(result.store);
    }
    setSyncStatus(result.ok ? "synced" : "pending");
  };

  const monthly = activeMess
    ? calculateMonthly({ mess: activeMess, members, meals, marketCosts, deposits, expenses })
    : null;

  const value = useMemo(
    () => ({
      store,
      activeMess,
      members,
      meals,
      marketCosts,
      deposits,
      expenses,
      activityLogs,
      notices,
      toletPosts,
      currentMember,
      isManager,
      monthly,
      syncStatus,
      manualSync,
      addRow,
      updateRow,
      deleteRow,
      updateMess,
      transferManager,
      resetDemoData,
    }),
    [store, activeMess, currentUser, syncStatus]
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export const useData = () => useContext(DataContext);
