import test from 'node:test';
import assert from 'node:assert/strict';
import {
  collectAvailableMonths,
  getProfileMonthlySnapshot,
  getRecentProfileEntries,
  normalizeEditableProfile,
  updateOwnProfileInStore,
} from '../src/utils/profile.js';
import { calculateMonthly } from '../src/utils/calculations.js';

const messId = 'mess-1';
const userId = 'user-1';
const memberId = 'member-1';

const baseStore = {
  users: [{ id: userId, name: 'Old Name', phone: '017', email: 'me@example.com' }],
  members: [
    { id: memberId, messId, userId, name: 'Old Name', phone: '017', roomNo: 'A-1', role: 'member', status: 'active', mealStatus: 'active' },
    { id: 'member-2', messId, userId: 'user-2', name: 'Other', phone: '018', roomNo: 'B-1', role: 'manager', status: 'active', mealStatus: 'active' },
  ],
  meals: [{ id: 'meal-1', messId, memberId, mealDate: '2026-10-05', breakfast: 1, lunch: 1, dinner: 1 }],
  deposits: [{ id: 'dep-1', messId, memberId, depositDate: '2026-10-03', amount: 1000 }],
  marketCosts: [{ id: 'market-1', messId, costDate: '2026-10-01', amount: 600 }],
  expenses: [{ id: 'exp-1', messId, expenseDate: '2026-10-02', amount: 200, splitType: 'shared', assignedMemberId: '' }],
};

test('normalizes editable profile values and accepts a blank phone', () => {
  assert.deepEqual(normalizeEditableProfile({ name: '  New Name  ', phone: '  ' }), { name: 'New Name', phone: '' });
});

test('rejects an empty profile name', () => {
  assert.throws(() => normalizeEditableProfile({ name: '   ', phone: '017' }), /Name is required/);
});

test('updates only the linked member name and phone', () => {
  const next = updateOwnProfileInStore(baseStore, { messId, userId, name: 'New Name', phone: '019' });
  const own = next.members.find((item) => item.id === memberId);
  assert.equal(own.name, 'New Name');
  assert.equal(own.phone, '019');
  assert.equal(own.roomNo, 'A-1');
  assert.equal(own.role, 'member');
  assert.equal(own.mealStatus, 'active');
});

test('profile update leaves other members and financial collections untouched', () => {
  const before = structuredClone(baseStore);
  const next = updateOwnProfileInStore(baseStore, { messId, userId, name: 'New Name', phone: '' });
  assert.deepEqual(next.members[1], before.members[1]);
  assert.deepEqual(next.meals, before.meals);
  assert.deepEqual(next.deposits, before.deposits);
  assert.deepEqual(next.marketCosts, before.marketCosts);
  assert.deepEqual(next.expenses, before.expenses);
  assert.deepEqual(baseStore, before);
});

test('profile update also keeps the local account record in sync', () => {
  const next = updateOwnProfileInStore(baseStore, { messId, userId, name: 'New Name', phone: '016' });
  assert.equal(next.users[0].name, 'New Name');
  assert.equal(next.users[0].phone, '016');
  assert.equal(next.users[0].email, 'me@example.com');
});

test('rejects an update when no linked member exists', () => {
  assert.throws(
    () => updateOwnProfileInStore(baseStore, { messId, userId: 'missing-user', name: 'Name', phone: '' }),
    /linked member profile/
  );
});

test('collects unique available months from every financial source in newest-first order', () => {
  const months = collectAvailableMonths({
    activeMess: { month: '2026-10' },
    meals: [{ mealDate: '2026-09-01' }],
    deposits: [{ depositDate: '2026-08-02' }],
    marketCosts: [{ costDate: '2026-10-03' }],
    expenses: [{ expenseDate: '2026-07-04' }],
  });
  assert.ok(months.includes('2026-10'));
  assert.ok(months.includes('2026-09'));
  assert.ok(months.includes('2026-08'));
  assert.ok(months.includes('2026-07'));
  assert.deepEqual([...months].sort((a, b) => b.localeCompare(a)), months);
});

test('profile monthly snapshot uses the same Reports calculation', () => {
  const activeMess = { id: messId, month: '2026-10', currency: 'BDT' };
  const args = {
    activeMess,
    members: baseStore.members,
    meals: baseStore.meals,
    deposits: baseStore.deposits,
    marketCosts: baseStore.marketCosts,
    expenses: baseStore.expenses,
    memberId,
    month: '2026-10',
  };
  const snapshot = getProfileMonthlySnapshot(args);
  const report = calculateMonthly({ mess: activeMess, members: baseStore.members, meals: baseStore.meals, deposits: baseStore.deposits, marketCosts: baseStore.marketCosts, expenses: baseStore.expenses });
  assert.deepEqual(snapshot.memberRow, report.memberRows.find((row) => row.memberId === memberId));
});

test('recent entries include only the current member and selected month', () => {
  const recent = getRecentProfileEntries({
    month: '2026-10',
    memberId,
    meals: [
      ...baseStore.meals,
      { id: 'other', messId, memberId: 'member-2', mealDate: '2026-10-06', breakfast: 1, lunch: 1, dinner: 1 },
      { id: 'old', messId, memberId, mealDate: '2026-09-30', breakfast: 1, lunch: 1, dinner: 1 },
    ],
    deposits: [
      ...baseStore.deposits,
      { id: 'other-dep', messId, memberId: 'member-2', depositDate: '2026-10-07', amount: 2000 },
      { id: 'old-dep', messId, memberId, depositDate: '2026-09-29', amount: 500 },
    ],
    limit: 10,
  });
  assert.deepEqual(recent.meals.map((row) => row.id), ['meal-1']);
  assert.deepEqual(recent.deposits.map((row) => row.id), ['dep-1']);
  assert.equal(recent.meals[0].totalMeals, 3);
});

test('recent entries are newest-first and respect the requested limit', () => {
  const meals = [1, 2, 3].map((day) => ({ id: `m${day}`, messId, memberId, mealDate: `2026-10-0${day}`, breakfast: 1, lunch: 0, dinner: 0 }));
  const deposits = [1, 2, 3].map((day) => ({ id: `d${day}`, messId, memberId, depositDate: `2026-10-0${day}`, amount: day * 100 }));
  const recent = getRecentProfileEntries({ month: '2026-10', memberId, meals, deposits, limit: 2 });
  assert.deepEqual(recent.meals.map((row) => row.id), ['m3', 'm2']);
  assert.deepEqual(recent.deposits.map((row) => row.id), ['d3', 'd2']);
});
