import assert from "node:assert/strict";
import test from "node:test";
import { calculateMonthly } from "../src/utils/calculations.js";
import { normalizeTransactionRow, validDateKey } from "../src/utils/transactions.js";

const messId = "mess-a";
const members = [
  { id: "a", messId, name: "A", status: "active" },
  { id: "b", messId, name: "B", status: "active" },
  { id: "foreign", messId: "mess-b", name: "Foreign", status: "active" },
];
const context = { messId, members };

test("financial transaction dates must be real calendar dates", () => {
  assert.equal(validDateKey("2026-10-14"), true);
  assert.equal(validDateKey("2024-02-29"), true);
  for (const value of ["2025-02-29", "2026-02-30", "2026-13-01", "2026-1-01", "bad", ""]) {
    assert.equal(validDateKey(value), false);
  }
});

test("deposit normalization accepts valid data and rejects unsafe amounts or members", () => {
  assert.deepEqual(
    normalizeTransactionRow(
      "deposits",
      {
        memberId: "a",
        depositDate: "2026-10-14",
        amount: "500.505",
        paymentMethod: "bKash",
        note: "  paid  ",
      },
      context
    ),
    {
      memberId: "a",
      depositDate: "2026-10-14",
      amount: 500.51,
      paymentMethod: "bKash",
      note: "paid",
    }
  );

  for (const amount of [0, -1, NaN, Infinity, "", "abc"]) {
    assert.throws(
      () => normalizeTransactionRow("deposits", { memberId: "a", depositDate: "2026-10-14", amount, paymentMethod: "Cash" }, context),
      /greater than 0/
    );
  }
  assert.throws(
    () => normalizeTransactionRow("deposits", { memberId: "foreign", depositDate: "2026-10-14", amount: 100, paymentMethod: "Cash" }, context),
    /active mess/
  );
  assert.throws(
    () => normalizeTransactionRow("deposits", { memberId: "a", depositDate: "2026-10-14", amount: 100, paymentMethod: "Crypto" }, context),
    /Payment method/
  );
});

test("market cost validation requires a same-mess buyer, positive amount, date and items", () => {
  const row = normalizeTransactionRow(
    "marketCosts",
    { buyerMemberId: "b", costDate: "2026-10-14", amount: "880", items: " Rice, vegetables ", note: " bazar " },
    context
  );
  assert.equal(row.amount, 880);
  assert.equal(row.items, "Rice, vegetables");
  assert.equal(row.note, "bazar");

  assert.throws(
    () => normalizeTransactionRow("marketCosts", { buyerMemberId: "a", costDate: "2026-02-30", amount: 100, items: "Rice" }, context),
    /valid calendar date/
  );
  assert.throws(
    () => normalizeTransactionRow("marketCosts", { buyerMemberId: "a", costDate: "2026-10-14", amount: 100, items: "   " }, context),
    /Items is required/
  );
});

test("expense normalization enforces split semantics and clears stale assignment for shared expenses", () => {
  const shared = normalizeTransactionRow(
    "expenses",
    {
      expenseDate: "2026-10-14",
      title: " Electricity ",
      category: "Electricity",
      amount: 900,
      splitType: "shared",
      assignedMemberId: "a",
    },
    context
  );
  assert.equal(shared.assignedMemberId, "");
  assert.equal(shared.title, "Electricity");

  const assigned = normalizeTransactionRow(
    "expenses",
    {
      expenseDate: "2026-10-14",
      title: "Damage",
      category: "Maintenance",
      amount: 125,
      splitType: "assigned",
      assignedMemberId: "b",
    },
    context
  );
  assert.equal(assigned.assignedMemberId, "b");

  assert.throws(
    () => normalizeTransactionRow("expenses", { expenseDate: "2026-10-14", title: "Damage", category: "Misc", amount: 20, splitType: "assigned", assignedMemberId: "foreign" }, context),
    /active mess/
  );
  assert.throws(
    () => normalizeTransactionRow("expenses", { expenseDate: "2026-10-14", title: "Damage", category: "Misc", amount: 20, splitType: "random" }, context),
    /split type/
  );
});

test("monthly settlement conserves market and extra expenses across member balances", () => {
  const result = calculateMonthly({
    mess: { id: messId, month: "2026-10", currency: "BDT" },
    members,
    meals: [
      { messId, memberId: "a", mealDate: "2026-10-01", breakfast: 0, lunch: 1, dinner: 1 },
      { messId, memberId: "b", mealDate: "2026-10-01", breakfast: 0, lunch: 1, dinner: 0 },
    ],
    marketCosts: [{ messId, costDate: "2026-10-02", amount: 300 }],
    deposits: [
      { messId, memberId: "a", depositDate: "2026-10-03", amount: 400 },
      { messId, memberId: "b", depositDate: "2026-10-03", amount: 150 },
      { messId, memberId: "a", depositDate: "2026-11-01", amount: 999 },
    ],
    expenses: [
      { messId, expenseDate: "2026-10-04", amount: 60, splitType: "shared", assignedMemberId: "" },
      { messId, expenseDate: "2026-10-05", amount: 40, splitType: "assigned", assignedMemberId: "a" },
    ],
  });

  assert.equal(result.totalMeals, 3);
  assert.equal(result.mealRate, 100);
  assert.equal(result.totalMarketCost, 300);
  assert.equal(result.totalExpenses, 100);
  assert.equal(result.totalDeposits, 550);
  assert.equal(result.sharedPerMember, 30);

  const a = result.memberRows.find((row) => row.memberId === "a");
  const b = result.memberRows.find((row) => row.memberId === "b");
  assert.equal(a.payable, 270);
  assert.equal(a.balance, 130);
  assert.equal(b.payable, 130);
  assert.equal(b.balance, 20);

  const totalPayable = result.memberRows.reduce((sum, row) => sum + row.payable, 0);
  const totalBalance = result.memberRows.reduce((sum, row) => sum + row.balance, 0);
  assert.equal(totalPayable, result.totalMarketCost + result.totalExpenses);
  assert.equal(totalBalance, result.totalDeposits - totalPayable);
});
