const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function validDateKey(value) {
  if (!DATE_PATTERN.test(String(value || ""))) return false;
  const [year, month, day] = String(value).split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}

const positiveAmount = (value, label = "Amount") => {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error(`${label} must be greater than 0.`);
  }
  return Math.round((amount + Number.EPSILON) * 100) / 100;
};

const requiredText = (value, label) => {
  const text = String(value ?? "").trim();
  if (!text) throw new Error(`${label} is required.`);
  return text;
};

const requireDate = (value, label) => {
  const date = String(value || "");
  if (!validDateKey(date)) throw new Error(`${label} must be a valid calendar date.`);
  return date;
};

const requireMessMember = (memberId, { messId, members }, label = "Member") => {
  const id = String(memberId || "");
  const member = members.find((item) => item.id === id && item.messId === messId);
  if (!member) throw new Error(`${label} does not belong to the active mess.`);
  return id;
};

const PAYMENT_METHODS = new Set(["Cash", "bKash", "Nagad", "Bank", "Other"]);
const EXPENSE_SPLITS = new Set(["shared", "assigned"]);

export function normalizeTransactionRow(collection, row, context) {
  if (!row || typeof row !== "object") throw new Error("Transaction data is invalid.");

  if (collection === "deposits") {
    const paymentMethod = String(row.paymentMethod || "Cash");
    if (!PAYMENT_METHODS.has(paymentMethod)) throw new Error("Payment method is invalid.");

    return {
      ...row,
      memberId: requireMessMember(row.memberId, context),
      depositDate: requireDate(row.depositDate, "Deposit date"),
      amount: positiveAmount(row.amount, "Deposit amount"),
      paymentMethod,
      note: String(row.note || "").trim(),
    };
  }

  if (collection === "marketCosts") {
    return {
      ...row,
      buyerMemberId: requireMessMember(row.buyerMemberId, context, "Buyer"),
      costDate: requireDate(row.costDate, "Market cost date"),
      amount: positiveAmount(row.amount, "Market cost amount"),
      items: requiredText(row.items, "Items"),
      note: String(row.note || "").trim(),
    };
  }

  if (collection === "expenses") {
    const splitType = String(row.splitType || "shared");
    if (!EXPENSE_SPLITS.has(splitType)) throw new Error("Expense split type is invalid.");

    const assignedMemberId =
      splitType === "assigned"
        ? requireMessMember(row.assignedMemberId, context, "Assigned member")
        : "";

    return {
      ...row,
      expenseDate: requireDate(row.expenseDate, "Expense date"),
      title: requiredText(row.title, "Expense title"),
      category: requiredText(row.category || "Misc", "Expense category"),
      amount: positiveAmount(row.amount, "Expense amount"),
      splitType,
      assignedMemberId,
      note: String(row.note || "").trim(),
    };
  }

  return { ...row };
}

export function isFinancialCollection(collection) {
  return ["deposits", "marketCosts", "expenses"].includes(collection);
}
