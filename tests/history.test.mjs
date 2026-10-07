import assert from "node:assert/strict";
import test from "node:test";
import { calculateMonthly } from "../src/utils/calculations.js";

const mess = { id: "mess-1", month: "2026-09", currency: "BDT" };
const members = [
  { id: "active", messId: "mess-1", name: "Active Member", status: "active" },
  { id: "historical", messId: "mess-1", name: "Historical Member", status: "inactive", archived: true },
  { id: "inactive-no-data", messId: "mess-1", name: "No Data", status: "inactive" },
];

const result = calculateMonthly({
  mess,
  members,
  meals: [
    { memberId: "active", mealDate: "2026-09-01", breakfast: 0, lunch: 2, dinner: 0 },
    { memberId: "historical", mealDate: "2026-09-01", breakfast: 0, lunch: 1, dinner: 0 },
  ],
  marketCosts: [{ costDate: "2026-09-30", amount: 300 }],
  deposits: [
    { memberId: "active", depositDate: "2026-09-30", amount: 250 },
    { memberId: "historical", depositDate: "2026-09-30", amount: 100 },
  ],
  expenses: [],
});

test("historical settlement retains inactive members who had transactions in the selected month", () => {
  assert.equal(result.memberRows.length, 2);
  assert.deepEqual(result.memberRows.map((row) => row.name), ["Active Member", "Historical Member"]);
  assert.equal(result.totalMeals, 3);
  assert.equal(result.mealRate, 100);
  assert.equal(result.memberRows.find((row) => row.memberId === "historical").balance, 0);
});
