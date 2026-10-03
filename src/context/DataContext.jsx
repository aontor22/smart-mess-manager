import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  createMessStore,
  generateMessCode,
  loadStore,
  loadStoreAsync,
  makeId,
  saveStore,
  touchStore,
} from "../utils/storage";
import { calculateMonthly } from "../utils/calculations";
import { useAuth } from "./AuthContext";
import {
  createMessWorkspace,
  joinMessWorkspace,
  pushStoreToSupabase,
  rotateMessJoinCode,
  syncLocalWithSupabase,
  transferMessManager,
} from "../utils/cloudSync";
import { applyWarningAutomation } from "../utils/warnings";

const DataContext = createContext(null);

const attachUserToMess = (store, user, messId, role = "member") => {
  if (!store || !user || !messId) return { store, changed: false };

  const lowerEmail = String(user.email || "").toLowerCase();
  const existing = store.members.find(
    (member) =>
      member.messId === messId &&
      (member.userId === user.id ||
        (lowerEmail && String(member.email || "").toLowerCase() === lowerEmail))
  );

  let changed = false;
  let members = store.members;

  if (existing) {
    if (existing.userId !== user.id || (role === "manager" && existing.role !== "manager")) {
      changed = true;
      members = store.members.map((member) =>
        member.id === existing.id
          ? {
              ...member,
              userId: user.id,
              role: role === "manager" ? "manager" : member.role,
              email: member.email || user.email,
              phone: member.phone || user.phone || "",
              status: "active",
            }
          : member
      );
    }
  } else {
    changed = true;
    members = [
      ...store.members,
      {
        id: makeId(),
        messId,
        userId: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone || "",
        roomNo: "",
        role,
        joinDate: new Date().toISOString().slice(0, 10),
        status: "active",
        mealStatus: "active",
        autoMealSuspended: false,
        dueSince: null,
        paymentWarningSentAt: null,
        mealSuspendedAt: null,
      },
    ];
  }

  const hasUser = store.users?.some((item) => item.id === user.id);
  const users = hasUser
    ? store.users
    : [
        ...(store.users || []),
        {
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone || "",
          authProvider: user.authProvider,
        },
      ];

  if (!hasUser) changed = true;

  return {
    changed,
    store: {
      ...store,
      ownerId: user.id,
      currentUserId: user.id,
      activeMessId: messId,
      members,
      users,
    },
  };
};

export function DataProvider({ children }) {
  const { currentUser, authLoading, isSupabaseConfigured } = useAuth();
  const ownerId = currentUser?.id || "guest";
  const [store, setStore] = useState(() => loadStore("guest"));
  const [syncStatus, setSyncStatus] = useState("offline-ready");
  const [workspaceStatus, setWorkspaceStatus] = useState("loading");
  const [membership, setMembership] = useState(null);
  const storeRef = useRef(store);

  useEffect(() => {
    storeRef.current = store;
  }, [store]);

  useEffect(() => {
    if (authLoading) return undefined;

    let cancelled = false;

    const hydrate = async () => {
      setWorkspaceStatus("loading");
      const local = await loadStoreAsync(ownerId, currentUser || undefined);
      if (cancelled) return;

      setStore(local);

      if (currentUser && isSupabaseConfigured && navigator.onLine) {
        setSyncStatus("syncing");
        const result = await syncLocalWithSupabase(local, currentUser);
        if (cancelled) return;

        if (result?.needsSetup) {
          setMembership(null);
          setWorkspaceStatus("needs-setup");
          setSyncStatus("synced");
          return;
        }

        if (result?.store && result?.membership?.mess_id) {
          const attached = attachUserToMess(
            result.store,
            currentUser,
            result.membership.mess_id,
            result.membership.role
          );
          const nextStore = touchStore(attached.store, {
            lastSyncSource: result.source || "supabase",
            pendingSync: attached.changed,
          });

          saveStore(nextStore, ownerId);
          setStore(nextStore);
          setMembership(result.membership);
          setWorkspaceStatus("ready");
          setSyncStatus(result.ok ? "synced" : "local-only");

          if (attached.changed) {
            const pushed = await pushStoreToSupabase(nextStore, currentUser);
            if (!cancelled && pushed.ok && pushed.store) {
              saveStore(pushed.store, ownerId);
              setStore(pushed.store);
            }
          }
          return;
        }

        setWorkspaceStatus("needs-setup");
        setSyncStatus("local-only");
        return;
      }

      setMembership(null);
      setWorkspaceStatus("ready");
      setSyncStatus(navigator.onLine ? "local-only" : "offline");
    };

    hydrate();

    return () => {
      cancelled = true;
    };
  }, [ownerId, currentUser?.email, authLoading, isSupabaseConfigured]);

  useEffect(() => {
    const handleOnline = async () => {
      if (!currentUser || !storeRef.current || !isSupabaseConfigured) return;
      setSyncStatus("syncing");
      const result = await syncLocalWithSupabase(storeRef.current, currentUser);

      if (result?.needsSetup) {
        setMembership(null);
        setWorkspaceStatus("needs-setup");
        setSyncStatus("synced");
        return;
      }

      if (result?.store) {
        saveStore(result.store, ownerId);
        setStore(result.store);
      }
      if (result?.membership) setMembership(result.membership);
      setWorkspaceStatus(result?.membership ? "ready" : workspaceStatus);
      setSyncStatus(result.ok ? "synced" : "local-only");
    };

    const handleOffline = () => setSyncStatus("offline");

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [currentUser, ownerId, isSupabaseConfigured, workspaceStatus]);

  useEffect(() => {
    if (!currentUser || !isSupabaseConfigured || workspaceStatus !== "ready") return undefined;

    const interval = window.setInterval(async () => {
      if (!navigator.onLine || storeRef.current?.syncMeta?.pendingSync) return;
      const result = await syncLocalWithSupabase(storeRef.current, currentUser);
      if (result?.store && result.source === "cloud") {
        saveStore(result.store, ownerId);
        setStore(result.store);
      }
      if (result?.membership) setMembership(result.membership);
      setSyncStatus(result.ok ? "synced" : "pending");
    }, 30000);

    return () => window.clearInterval(interval);
  }, [currentUser, ownerId, isSupabaseConfigured, workspaceStatus]);

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

    if (
      currentUser &&
      isSupabaseConfigured &&
      navigator.onLine &&
      workspaceStatus === "ready"
    ) {
      setSyncStatus("syncing");
      pushStoreToSupabase(touched, currentUser).then((result) => {
        if (result.ok && result.store) {
          saveStore(result.store, ownerId);
          setStore(result.store);
          if (result.membership) setMembership(result.membership);
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

  const currentMember = members.find((member) => member.userId === currentUser?.id);
  const isManager = isSupabaseConfigured && membership
    ? membership.role === "manager"
    : currentMember?.role === "manager" || activeMess?.managerUserId === currentUser?.id;

  const notices = store.notices
    .filter((item) => item.messId === messId)
    .filter(
      (item) =>
        isManager ||
        (!item.targetUserId && !item.targetMemberId) ||
        item.targetUserId === currentUser?.id ||
        item.targetMemberId === currentMember?.id
    )
    .sort((a, b) => Number(b.pinned) - Number(a.pinned) || new Date(b.createdAt) - new Date(a.createdAt));

  const toletPosts = [...store.toletPosts].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const monthly = activeMess
    ? calculateMonthly({ mess: activeMess, members, meals, marketCosts, deposits, expenses })
    : {
        month: "",
        activeMembers: [],
        totalMeals: 0,
        totalMarketCost: 0,
        totalDeposits: 0,
        totalExpenses: 0,
        mealRate: 0,
        sharedTotal: 0,
        sharedPerMember: 0,
        memberRows: [],
        highestMealTaker: null,
        highestDepositor: null,
        dueMembers: [],
      };

  useEffect(() => {
    if (workspaceStatus !== "ready" || !messId || !activeMess) return;

    const automated = applyWarningAutomation(storeRef.current, messId, monthly);
    if (automated.changed) persist(automated.store);
    // Intentionally keyed to financial/member changes. persist() is guarded by changed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    workspaceStatus,
    messId,
    activeMess?.month,
    activeMess?.warningSettings?.enabled,
    activeMess?.warningSettings?.warningAfterDays,
    activeMess?.warningSettings?.mealOffAfterDays,
    activeMess?.warningSettings?.minimumDue,
    activeMess?.warningSettings?.autoSuspendMeals,
    store.members,
    store.deposits,
    store.meals,
    store.marketCosts,
    store.expenses,
  ]);

  const log = (data, action) => ({
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
  });

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

  const createMess = async ({ name, address }) => {
    if (!currentUser) throw new Error("Please login first.");
    if (!navigator.onLine || !isSupabaseConfigured) {
      throw new Error("Internet connection and Supabase are required to create a shared mess.");
    }

    const nextStore = createMessStore(currentUser, { name, address });
    const result = await createMessWorkspace(nextStore, currentUser);
    if (!result.ok) throw new Error(result.error?.message || "Could not create the mess.");

    const syncResult = await syncLocalWithSupabase(result.store, currentUser);
    const finalStore = syncResult.store || result.store;
    saveStore(finalStore, ownerId);
    setStore(finalStore);
    setMembership(syncResult.membership || { mess_id: result.messId, user_id: currentUser.id, role: "manager", status: "active" });
    setWorkspaceStatus("ready");
    setSyncStatus("synced");
    return finalStore;
  };

  const joinMess = async (joinCode) => {
    if (!currentUser) throw new Error("Please login first.");
    const result = await joinMessWorkspace(joinCode);
    if (!result.ok) throw new Error(result.error?.message || "Could not join this mess.");

    const attached = attachUserToMess(result.store, currentUser, result.messId, "member");
    const nextStore = touchStore(attached.store);
    saveStore(nextStore, ownerId);
    setStore(nextStore);
    setMembership({ mess_id: result.messId, user_id: currentUser.id, role: "member", status: "active" });
    setWorkspaceStatus("ready");
    setSyncStatus("syncing");

    const pushed = await pushStoreToSupabase(nextStore, currentUser);
    if (pushed.ok && pushed.store) {
      saveStore(pushed.store, ownerId);
      setStore(pushed.store);
      setSyncStatus("synced");
    } else {
      setSyncStatus("pending");
    }

    return nextStore;
  };

  const regenerateJoinCode = async () => {
    if (!isManager) throw new Error("Only the manager can change the mess ID.");
    const nextCode = generateMessCode();

    if (currentUser && isSupabaseConfigured) {
      const result = await rotateMessJoinCode(messId, nextCode);
      if (!result.ok) throw new Error(result.error?.message || "Could not regenerate the mess ID.");
    }

    updateMess({ joinCode: nextCode });
    return nextCode;
  };

  const transferManager = async (memberId) => {
    const fresh = loadStore(ownerId, currentUser || undefined);
    const selectedMember = fresh.members.find((member) => member.id === memberId);
    if (!selectedMember?.userId) {
      throw new Error("This member must join the mess with their own account before becoming manager.");
    }

    if (currentUser && isSupabaseConfigured && navigator.onLine) {
      const result = await transferMessManager(messId, selectedMember.userId);
      if (!result.ok) throw new Error(result.error?.message || "Could not transfer manager role.");
    }

    const next = {
      ...fresh,
      messes: fresh.messes.map((mess) =>
        mess.id === messId ? { ...mess, managerUserId: selectedMember.userId } : mess
      ),
      members: fresh.members.map((member) =>
        member.messId !== messId
          ? member
          : { ...member, role: member.id === memberId ? "manager" : "member" }
      ),
    };
    persist(log(next, `Transferred manager role to ${selectedMember.name}`));

    if (membership?.user_id === currentUser?.id) {
      setMembership((prev) => (prev ? { ...prev, role: "member" } : prev));
    }
  };

  const resetDemoData = () => {
    const fresh = loadStore(ownerId, currentUser || undefined);
    const now = new Date().toISOString();
    const next = {
      ...fresh,
      meals: fresh.meals.filter((row) => row.messId !== messId),
      marketCosts: fresh.marketCosts.filter((row) => row.messId !== messId),
      deposits: fresh.deposits.filter((row) => row.messId !== messId),
      expenses: fresh.expenses.filter((row) => row.messId !== messId),
      notices: fresh.notices.filter((row) => row.messId !== messId),
      toletPosts: fresh.toletPosts.filter((row) => row.messId !== messId),
      activityLogs: [
        ...fresh.activityLogs.filter((row) => row.messId !== messId),
        {
          id: makeId(),
          messId,
          actorName: currentUser?.name || "Manager",
          action: "Cleared mess transaction data",
          createdAt: now,
        },
      ],
      members: fresh.members.map((member) =>
        member.messId === messId
          ? {
              ...member,
              mealStatus: "active",
              autoMealSuspended: false,
              dueSince: null,
              paymentWarningSentAt: null,
              mealSuspendedAt: null,
            }
          : member
      ),
    };
    persist(next);
  };

  const manualSync = async () => {
    if (!currentUser || !isSupabaseConfigured) return;
    setSyncStatus("syncing");
    const result = await syncLocalWithSupabase(storeRef.current, currentUser);
    if (result?.needsSetup) {
      setWorkspaceStatus("needs-setup");
      setMembership(null);
      setSyncStatus("synced");
      return;
    }
    if (result?.store) {
      saveStore(result.store, ownerId);
      setStore(result.store);
    }
    if (result?.membership) setMembership(result.membership);
    setSyncStatus(result.ok ? "synced" : "pending");
  };

  const warningNotices = notices.filter((notice) =>
    ["payment_warning", "meal_suspended"].includes(notice.type)
  );

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
      warningNotices,
      toletPosts,
      currentMember,
      isManager,
      monthly,
      syncStatus,
      workspaceStatus,
      membership,
      manualSync,
      createMess,
      joinMess,
      regenerateJoinCode,
      addRow,
      updateRow,
      deleteRow,
      updateMess,
      transferManager,
      resetDemoData,
    }),
    [
      store,
      activeMess,
      currentUser,
      syncStatus,
      workspaceStatus,
      membership,
      isManager,
    ]
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export const useData = () => useContext(DataContext);
