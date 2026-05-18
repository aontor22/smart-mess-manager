import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { loadStore, makeId, saveStore } from "../utils/storage";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [store, setStore] = useState(() => loadStore());
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const fresh = loadStore();
    setStore(fresh);
    setCurrentUser(fresh.users.find((u) => u.id === fresh.currentUserId) || null);
  }, []);

  const persist = (nextStore) => {
    saveStore(nextStore);
    setStore(nextStore);
    setCurrentUser(nextStore.users.find((u) => u.id === nextStore.currentUserId) || null);
    window.dispatchEvent(new Event("smm-store-updated"));
  };

  const login = (email, password) => {
    const fresh = loadStore();
    const user = fresh.users.find(
      (item) => item.email.toLowerCase() === email.toLowerCase() && item.password === password
    );
    if (!user) throw new Error("Invalid email or password");
    persist({ ...fresh, currentUserId: user.id });
    return user;
  };

  const signup = ({ name, email, password, phone }) => {
    const fresh = loadStore();
    const exists = fresh.users.some((user) => user.email.toLowerCase() === email.toLowerCase());
    if (exists) throw new Error("This email is already registered");

    const userId = makeId();
    const messId = makeId();
    const memberId = makeId();
    const month = new Date().toISOString().slice(0, 7);

    const user = { id: userId, name, email, password, phone };
    const nextStore = {
      ...fresh,
      users: [...fresh.users, user],
      currentUserId: userId,
      activeMessId: messId,
      messes: [
        ...fresh.messes,
        {
          id: messId,
          name: `${name}'s Mess`,
          address: "",
          month,
          currency: "BDT",
          monthlyRent: 0,
          serviceCharge: 0,
          managerUserId: userId,
        },
      ],
      members: [
        ...fresh.members,
        {
          id: memberId,
          messId,
          userId,
          name,
          email,
          phone,
          roomNo: "",
          role: "manager",
          joinDate: `${month}-01`,
          status: "active",
        },
      ],
      activityLogs: [
        ...fresh.activityLogs,
        {
          id: makeId(),
          messId,
          actorName: name,
          action: "Created a new mess workspace",
          createdAt: new Date().toISOString(),
        },
      ],
    };

    persist(nextStore);
    return user;
  };

  const logout = () => {
    const fresh = loadStore();
    persist({ ...fresh, currentUserId: null });
  };

  const value = useMemo(
    () => ({
      currentUser,
      isAuthenticated: Boolean(currentUser),
      login,
      signup,
      logout,
      store,
    }),
    [currentUser, store]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
