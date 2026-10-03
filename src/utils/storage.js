import { idbDelete, idbGet, idbSet } from "./indexedDb";

const KEY_PREFIX = "smart_mess_manager_v2";
const AUTH_CACHE_KEY = `${KEY_PREFIX}_cached_auth_user`;

const demoUser = {
  id: "demo-manager-user",
  name: "Demo Manager",
  email: "manager@demo.com",
  password: "123456",
  phone: "01700000000",
  authProvider: "local",
};

const id = () => {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const codeAlphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export const generateMessCode = () => {
  const bytes = new Uint8Array(8);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i += 1) bytes[i] = Math.floor(Math.random() * 256);
  }

  const body = Array.from(bytes, (value) => codeAlphabet[value % codeAlphabet.length]).join("");
  return `SMM-${body}`;
};

export const today = () => new Date().toISOString().slice(0, 10);
export const monthKey = () => new Date().toISOString().slice(0, 7);
export const makeId = id;

const normalizeUser = (user = demoUser) => ({
  id: user.id || demoUser.id,
  name: user.name || user.full_name || user.email?.split("@")[0] || demoUser.name,
  email: user.email || demoUser.email,
  password: user.password || "",
  phone: user.phone || "",
  authProvider: user.authProvider || "local",
});

export const defaultWarningSettings = {
  enabled: true,
  warningAfterDays: 4,
  mealOffAfterDays: 7,
  minimumDue: 1,
  autoSuspendMeals: true,
};

export const ownerKey = (ownerId = "guest") => `${KEY_PREFIX}_store_${ownerId || "guest"}`;

export const normalizeStore = (store) => {
  if (!store) return store;

  return {
    ...store,
    version: 3,
    users: store.users || [],
    messes: (store.messes || []).map((mess) => ({
      ...mess,
      joinCode: mess.joinCode || "",
      warningSettings: {
        ...defaultWarningSettings,
        ...(mess.warningSettings || {}),
      },
    })),
    members: (store.members || []).map((member) => ({
      mealStatus: "active",
      autoMealSuspended: false,
      dueSince: null,
      paymentWarningSentAt: null,
      mealSuspendedAt: null,
      ...member,
    })),
    meals: store.meals || [],
    marketCosts: store.marketCosts || [],
    deposits: store.deposits || [],
    expenses: store.expenses || [],
    activityLogs: store.activityLogs || [],
    notices: store.notices || [],
    toletPosts: store.toletPosts || [],
    syncMeta: store.syncMeta || {
      updatedAt: new Date().toISOString(),
      lastSyncedAt: null,
      lastSyncSource: "local",
      pendingSync: true,
    },
  };
};

export const createMessStore = (
  user,
  {
    messId = id(),
    joinCode = generateMessCode(),
    name = "My Mess",
    address = "",
  } = {}
) => {
  const manager = normalizeUser(user);
  const memberId = id();
  const m = monthKey();
  const now = new Date().toISOString();

  return normalizeStore({
    version: 3,
    ownerId: manager.id,
    users: [
      {
        id: manager.id,
        name: manager.name,
        email: manager.email,
        password: manager.password || "",
        phone: manager.phone,
        authProvider: manager.authProvider,
      },
    ],
    currentUserId: manager.id,
    activeMessId: messId,
    syncMeta: {
      updatedAt: now,
      lastSyncedAt: null,
      lastSyncSource: "local",
      pendingSync: true,
    },
    messes: [
      {
        id: messId,
        joinCode,
        name,
        address,
        month: m,
        currency: "BDT",
        monthlyRent: 0,
        serviceCharge: 0,
        managerUserId: manager.id,
        warningSettings: { ...defaultWarningSettings },
      },
    ],
    members: [
      {
        id: memberId,
        messId,
        userId: manager.id,
        name: manager.name,
        email: manager.email,
        phone: manager.phone,
        roomNo: "",
        role: "manager",
        joinDate: today(),
        status: "active",
        mealStatus: "active",
        autoMealSuspended: false,
        dueSince: null,
        paymentWarningSentAt: null,
        mealSuspendedAt: null,
      },
    ],
    meals: [],
    marketCosts: [],
    deposits: [],
    expenses: [],
    activityLogs: [
      {
        id: id(),
        messId,
        actorName: manager.name,
        action: "Created mess workspace",
        createdAt: now,
      },
    ],
    notices: [],
    toletPosts: [],
  });
};

export const defaultData = (user = demoUser) => {
  const manager = normalizeUser(user);
  const messId = id();
  const memberOne = id();
  const memberTwo = id();
  const memberThree = id();
  const m = monthKey();
  const now = new Date().toISOString();

  return normalizeStore({
    version: 3,
    ownerId: manager.id,
    users: [
      {
        id: manager.id,
        name: manager.name,
        email: manager.email,
        password: manager.password || "123456",
        phone: manager.phone,
        authProvider: manager.authProvider,
      },
    ],
    currentUserId: manager.id,
    activeMessId: messId,
    syncMeta: {
      updatedAt: now,
      lastSyncedAt: null,
      lastSyncSource: "local",
      pendingSync: true,
    },
    messes: [
      {
        id: messId,
        joinCode: "LOCAL-DEMO",
        name: "Green View Mess",
        address: "Bashundhara R/A, Dhaka",
        month: m,
        currency: "BDT",
        monthlyRent: 12000,
        serviceCharge: 1500,
        managerUserId: manager.id,
        warningSettings: { ...defaultWarningSettings },
      },
    ],
    members: [
      {
        id: memberOne,
        messId,
        userId: manager.id,
        name: manager.name,
        email: manager.email,
        phone: manager.phone || "01700000000",
        roomNo: "A1",
        role: "manager",
        joinDate: `${m}-01`,
        status: "active",
      },
      {
        id: memberTwo,
        messId,
        userId: null,
        name: "Rafi Hasan",
        email: "rafi@example.com",
        phone: "01800000000",
        roomNo: "A2",
        role: "member",
        joinDate: `${m}-02`,
        status: "active",
      },
      {
        id: memberThree,
        messId,
        userId: null,
        name: "Nayeem Islam",
        email: "nayeem@example.com",
        phone: "01900000000",
        roomNo: "B1",
        role: "member",
        joinDate: `${m}-03`,
        status: "active",
      },
    ],
    meals: [
      { id: id(), messId, memberId: memberOne, mealDate: `${m}-01`, breakfast: 1, lunch: 1, dinner: 1, note: "" },
      { id: id(), messId, memberId: memberTwo, mealDate: `${m}-01`, breakfast: 0, lunch: 1, dinner: 1, note: "" },
      { id: id(), messId, memberId: memberThree, mealDate: `${m}-01`, breakfast: 1, lunch: 1, dinner: 0.5, note: "Half dinner" },
      { id: id(), messId, memberId: memberOne, mealDate: `${m}-02`, breakfast: 1, lunch: 1, dinner: 1, note: "" },
      { id: id(), messId, memberId: memberTwo, mealDate: `${m}-02`, breakfast: 1, lunch: 1, dinner: 1, note: "" },
      { id: id(), messId, memberId: memberThree, mealDate: `${m}-02`, breakfast: 0, lunch: 1, dinner: 1, note: "" },
    ],
    marketCosts: [
      { id: id(), messId, buyerMemberId: memberOne, costDate: `${m}-01`, amount: 1450, items: "Rice, egg, vegetables", note: "" },
      { id: id(), messId, buyerMemberId: memberTwo, costDate: `${m}-02`, amount: 980, items: "Fish, potato, spices", note: "" },
    ],
    deposits: [
      { id: id(), messId, memberId: memberOne, depositDate: `${m}-01`, amount: 4000, paymentMethod: "Cash", note: "" },
      { id: id(), messId, memberId: memberTwo, depositDate: `${m}-01`, amount: 3500, paymentMethod: "bKash", note: "" },
      { id: id(), messId, memberId: memberThree, depositDate: `${m}-01`, amount: 3000, paymentMethod: "Cash", note: "" },
    ],
    expenses: [
      { id: id(), messId, expenseDate: `${m}-01`, title: "Monthly rent", category: "Rent", amount: 12000, splitType: "shared", assignedMemberId: "", note: "" },
      { id: id(), messId, expenseDate: `${m}-03`, title: "WiFi bill", category: "WiFi", amount: 1200, splitType: "shared", assignedMemberId: "", note: "" },
    ],
    activityLogs: [
      { id: id(), messId, actorName: manager.name, action: "Created demo mess account", createdAt: now },
    ],
    notices: [
      { id: id(), messId, senderName: manager.name, message: "Please update your meal before 10 PM.", pinned: true, createdAt: now },
    ],
    toletPosts: [
      {
        id: id(),
        messId,
        title: "Single seat available from next month",
        location: "Bashundhara R/A",
        rent: 6500,
        facilities: "WiFi, gas, fridge, attached balcony",
        contact: manager.phone || "01700000000",
        availableFrom: `${m}-20`,
        imageUrl: "",
        createdAt: now,
      },
    ],
  });
};

export const touchStore = (store, extra = {}) =>
  normalizeStore({
    ...store,
    syncMeta: {
      ...(store.syncMeta || {}),
      updatedAt: new Date().toISOString(),
      pendingSync: true,
      ...extra,
    },
  });

export const loadStore = (ownerId = "guest", user = demoUser) => {
  const key = ownerKey(ownerId);
  const raw = localStorage.getItem(key);
  if (!raw) {
    const data = defaultData(user);
    saveStore(data, ownerId);
    return data;
  }

  try {
    return normalizeStore(JSON.parse(raw));
  } catch {
    const data = defaultData(user);
    saveStore(data, ownerId);
    return data;
  }
};

export const loadStoreAsync = async (ownerId = "guest", user = demoUser) => {
  const key = ownerKey(ownerId);
  const fromIndexedDb = await idbGet(key);
  if (fromIndexedDb) {
    const normalized = normalizeStore(fromIndexedDb);
    localStorage.setItem(key, JSON.stringify(normalized));
    return normalized;
  }
  return loadStore(ownerId, user);
};

export const saveStore = (data, ownerId = data?.ownerId || "guest") => {
  const normalized = normalizeStore(data);
  const key = ownerKey(ownerId);
  localStorage.setItem(key, JSON.stringify(normalized));
  idbSet(key, normalized);
};

export const resetStore = (ownerId = "guest", user = demoUser) => {
  const data = defaultData(user);
  saveStore(data, ownerId);
  return data;
};

export const cacheAuthUser = async (user) => {
  if (!user) return;
  const cleanUser = normalizeUser(user);
  localStorage.setItem(AUTH_CACHE_KEY, JSON.stringify(cleanUser));
  await idbSet(AUTH_CACHE_KEY, cleanUser);
};

export const getCachedAuthUser = async () => {
  const fromIdb = await idbGet(AUTH_CACHE_KEY);
  if (fromIdb) return fromIdb;

  const raw = localStorage.getItem(AUTH_CACHE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

export const clearCachedAuthUser = async () => {
  localStorage.removeItem(AUTH_CACHE_KEY);
  await idbDelete(AUTH_CACHE_KEY);
};

export const demoCredentials = {
  email: demoUser.email,
  password: demoUser.password,
};
