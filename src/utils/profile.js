import { calculateMonthly, mealTotal } from "./calculations.js";

const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

export const normalizeEditableProfile = ({ name, phone } = {}) => {
  const cleanName = String(name || "").trim();
  const cleanPhone = String(phone || "").trim();
  if (!cleanName) throw new Error("Name is required.");
  return { name: cleanName, phone: cleanPhone };
};

export const updateOwnProfileInStore = (store, { messId, userId, name, phone }) => {
  if (!store || !messId || !userId) throw new Error("Your mess membership is not available.");
  const clean = normalizeEditableProfile({ name, phone });

  const member = (store.members || []).find(
    (item) => item.messId === messId && item.userId === userId
  );
  if (!member) throw new Error("Your linked member profile could not be found.");

  return {
    ...store,
    members: (store.members || []).map((item) =>
      item.id === member.id ? { ...item, name: clean.name, phone: clean.phone } : item
    ),
    users: (store.users || []).map((user) =>
      user.id === userId ? { ...user, name: clean.name, phone: clean.phone } : user
    ),
  };
};

const addMonth = (set, value) => {
  const month = String(value || "").slice(0, 7);
  if (MONTH_RE.test(month)) set.add(month);
};

export const collectAvailableMonths = ({ activeMess, meals = [], deposits = [], marketCosts = [], expenses = [] }) => {
  const months = new Set();
  addMonth(months, activeMess?.month);
  addMonth(months, new Date().toISOString().slice(0, 7));
  meals.forEach((row) => addMonth(months, row.mealDate));
  deposits.forEach((row) => addMonth(months, row.depositDate));
  marketCosts.forEach((row) => addMonth(months, row.costDate));
  expenses.forEach((row) => addMonth(months, row.expenseDate));
  return [...months].sort((a, b) => b.localeCompare(a));
};

export const getProfileMonthlySnapshot = ({
  month,
  activeMess,
  members = [],
  meals = [],
  marketCosts = [],
  deposits = [],
  expenses = [],
  memberId,
}) => {
  if (!activeMess || !month) {
    return {
      month: month || "",
      calculation: null,
      memberRow: null,
    };
  }

  const calculation = calculateMonthly({
    mess: { ...activeMess, month },
    members,
    meals,
    marketCosts,
    deposits,
    expenses,
  });

  return {
    month,
    calculation,
    memberRow: calculation.memberRows.find((row) => row.memberId === memberId) || null,
  };
};

export const getRecentProfileEntries = ({ month, memberId, meals = [], deposits = [], limit = 6 }) => {
  const safeLimit = Math.max(0, Number(limit) || 0);
  const ownMeals = meals
    .filter((row) => row.memberId === memberId && String(row.mealDate || "").startsWith(month))
    .map((row) => ({
      ...row,
      type: "meal",
      date: row.mealDate,
      totalMeals: mealTotal(row),
    }))
    .sort((a, b) => String(b.date).localeCompare(String(a.date)))
    .slice(0, safeLimit);

  const ownDeposits = deposits
    .filter((row) => row.memberId === memberId && String(row.depositDate || "").startsWith(month))
    .map((row) => ({ ...row, type: "deposit", date: row.depositDate }))
    .sort((a, b) => String(b.date).localeCompare(String(a.date)))
    .slice(0, safeLimit);

  return { meals: ownMeals, deposits: ownDeposits };
};
