const KEY = "smart_mess_manager_v1";

const id = () => {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

export const today = () => new Date().toISOString().slice(0, 10);

export const monthKey = () => new Date().toISOString().slice(0, 7);

export const defaultData = () => {
  const messId = id();
  const managerUserId = id();
  const memberOne = id();
  const memberTwo = id();
  const memberThree = id();
  const m = monthKey();

  return {
    users: [
      {
        id: managerUserId,
        name: "Demo Manager",
        email: "manager@demo.com",
        password: "123456",
        phone: "01700000000",
      },
    ],
    currentUserId: null,
    activeMessId: messId,
    messes: [
      {
        id: messId,
        name: "Green View Mess",
        address: "Bashundhara R/A, Dhaka",
        month: m,
        currency: "BDT",
        monthlyRent: 12000,
        serviceCharge: 1500,
        managerUserId,
      },
    ],
    members: [
      {
        id: memberOne,
        messId,
        userId: managerUserId,
        name: "Demo Manager",
        email: "manager@demo.com",
        phone: "01700000000",
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
      { id: id(), messId, memberId: memberThree, mealDate: `${m}-02`, breakfast: 0, lunch: 1, dinner: 1, note: "" }
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
      { id: id(), messId, actorName: "Demo Manager", action: "Created demo mess account", createdAt: new Date().toISOString() },
    ],
    notices: [
      { id: id(), messId, senderName: "Demo Manager", message: "Please update your meal before 10 PM.", pinned: true, createdAt: new Date().toISOString() },
    ],
    toletPosts: [
      {
        id: id(),
        messId,
        title: "Single seat available from next month",
        location: "Bashundhara R/A",
        rent: 6500,
        facilities: "WiFi, gas, fridge, attached balcony",
        contact: "01700000000",
        availableFrom: `${m}-20`,
        imageUrl: "",
        createdAt: new Date().toISOString(),
      },
    ],
  };
};

export const loadStore = () => {
  const raw = localStorage.getItem(KEY);
  if (!raw) {
    const data = defaultData();
    localStorage.setItem(KEY, JSON.stringify(data));
    return data;
  }
  try {
    return JSON.parse(raw);
  } catch {
    const data = defaultData();
    localStorage.setItem(KEY, JSON.stringify(data));
    return data;
  }
};

export const saveStore = (data) => {
  localStorage.setItem(KEY, JSON.stringify(data));
};

export const makeId = id;

export const resetStore = () => {
  const data = defaultData();
  saveStore(data);
  return data;
};
