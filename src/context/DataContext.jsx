import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { loadStore, makeId, resetStore, saveStore } from "../utils/storage";
import { calculateMonthly } from "../utils/calculations";
import { useAuth } from "./AuthContext";

const DataContext = createContext(null);

export function DataProvider({ children }) {
  const { currentUser } = useAuth();
  const [store, setStore] = useState(() => loadStore());

  useEffect(() => {
    const update = () => setStore(loadStore());
    window.addEventListener("smm-store-updated", update);
    return () => window.removeEventListener("smm-store-updated", update);
  }, []);

  const persist = (nextStore) => {
    saveStore(nextStore);
    setStore(nextStore);
    window.dispatchEvent(new Event("smm-store-updated"));
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
    const fresh = loadStore();
    const next = {
      ...fresh,
      [collection]: [...fresh[collection], { id: makeId(), messId, ...row }],
    };
    persist(log(next, action));
  };

  const updateRow = (collection, rowId, patch, action) => {
    const fresh = loadStore();
    const next = {
      ...fresh,
      [collection]: fresh[collection].map((row) => (row.id === rowId ? { ...row, ...patch } : row)),
    };
    persist(log(next, action));
  };

  const deleteRow = (collection, rowId, action) => {
    const fresh = loadStore();
    const next = {
      ...fresh,
      [collection]: fresh[collection].filter((row) => row.id !== rowId),
    };
    persist(log(next, action));
  };

  const updateMess = (patch) => {
    const fresh = loadStore();
    const next = {
      ...fresh,
      messes: fresh.messes.map((mess) => (mess.id === messId ? { ...mess, ...patch } : mess)),
    };
    persist(log(next, "Updated mess settings"));
  };

  const transferManager = (memberId) => {
    const fresh = loadStore();
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
    const data = resetStore();
    setStore(data);
    window.dispatchEvent(new Event("smm-store-updated"));
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
      addRow,
      updateRow,
      deleteRow,
      updateMess,
      transferManager,
      resetDemoData,
    }),
    [store, activeMess, currentUser]
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export const useData = () => useContext(DataContext);
