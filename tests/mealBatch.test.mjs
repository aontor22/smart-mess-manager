import test from 'node:test';
import assert from 'node:assert/strict';
import { buildMealBatch, dayMemberMeals, mealFingerprint, summarizeMealRows, localMealDate, validMealDate } from '../src/utils/mealBatch.js';
const members = [
  { id: 'a', name: 'A', messId: 'mess', status: 'active' },
  { id: 'b', name: 'B', messId: 'mess', status: 'active' },
  { id: 'blocked', name: 'Blocked', messId: 'mess', status: 'active', mealStatus: 'suspended' },
  { id: 'inactive', name: 'Inactive', messId: 'mess', status: 'inactive' },
  { id: 'foreign', name: 'Foreign', messId: 'other', status: 'active' },
];
const row = (id, memberId, patch = {}) => ({ id, memberId, messId: 'mess', mealDate: '2026-10-05', breakfast: 0, lunch: 1, dinner: 1, note: '', ...patch });
let id = 0;
const batch = (meals, entries, patch = {}) => buildMealBatch({ meals, members, messId: 'mess', mealDate: '2026-10-05', entries, makeId: () => `new-${++id}`, ...patch });
const entry = (memberId, meals = [], patch = {}) => ({ memberId, breakfast: 0, lunch: 1, dinner: 1, note: '', expected: mealFingerprint(dayMemberMeals(meals, 'mess', '2026-10-05', memberId)), ...patch });
test('saves all members with half meals without mutating original records', () => {
  const original = [row('other-day', 'a', { mealDate: '2026-10-04' }), row('other-mess', 'a', { messId: 'other' })];
  const before = structuredClone(original);
  const result = batch(original, [entry('a', original, { dinner: 0.5 }), entry('b', original)]);
  assert.equal(result.changedCount, 2); assert.equal(result.meals.length, 4); assert.equal(result.meals[2].dinner, 0.5); assert.deepEqual(original, before);
});
test('loading sums existing duplicate entries and retains both notes', () => {
  const summary = summarizeMealRows([row('1','a',{note:'First',dinner:0.5}), row('2','a',{note:'Second'})]);
  assert.deepEqual(summary, { breakfast:0, lunch:2, dinner:1.5, note:'First | Second' });
});
test('updates an existing day and consolidates duplicates only for edited member', () => {
  const old = [row('1','a',{note:'First'}),row('2','a',{note:'Second'}),row('3','b'),row('4','b')];
  const result = batch(old, [entry('a',old,{lunch:2, dinner:1.5, note:'First | Second'})]);
  assert.equal(result.meals.length, 3); assert.equal(result.meals.filter(r => r.memberId === 'a').length, 1);
  const saved = result.meals.find(r=>r.memberId==='a'); assert.equal(saved.id,'1'); assert.equal(saved.note,'First | Second');
  const repeat = batch(result.meals, [entry('a',result.meals,{lunch:2,dinner:1.5,note:saved.note})]);
  assert.equal(repeat.meals.length,3);
});
test('does not add zero records for new members; can zero existing meals', () => {
  assert.equal(batch([], [entry('a',[],{lunch:0,dinner:0})]).changedCount,0);
  const old = [row('1','a')]; assert.equal(batch(old,[entry('a',old,{lunch:0,dinner:0})]).meals[0].lunch,0);
});
test('rejects suspended, inactive, missing and cross-mess members', () => {
  for (const memberId of ['blocked','inactive','missing','foreign']) assert.throws(()=>batch([], [entry(memberId)]));
});
test('rejects an invalid member in a batch without making partial changes', () => {
  const old = [row('1','a')]; const before = structuredClone(old);
  assert.throws(()=>batch(old,[entry('a',old,{lunch:3}),entry('blocked',old)])); assert.deepEqual(old,before);
});
test('rejects stale edits, even if aggregate totals still match', () => {
  const old = [row('1','a')]; const draft = entry('a',old);
  assert.throws(()=>batch([row('1','a',{note:'new note'})],[draft]),/changed/);
  assert.throws(()=>batch([row('replacement','a')],[draft]),/changed/);
  assert.throws(()=>batch([row('1','a')],[entry('a')]),/changed/);
});
test('rejects negatives, invalid values and non half meal counts', () => {
  for (const lunch of [-1, NaN, Infinity, '', ' ', [], {}, null, undefined, true, 'abc', 0.25]) assert.throws(()=>batch([], [entry('a',[],{lunch})]));
});
test('validates real dates and uses local calendar date', () => {
  for (const mealDate of ['2026-02-30','2026-13-01','bad','2026-1-01','']) assert.throws(()=>batch([],[entry('a')],{mealDate}));
  assert.equal(validMealDate('2024-02-29'),true); assert.equal(validMealDate('2025-02-29'),false);
  assert.equal(localMealDate(new Date(2026,9,5,0,15)), '2026-10-05');
});
test('rejects duplicate member inputs and empty batches change no records', () => {
  assert.throws(()=>batch([],[entry('a'),entry('a')]),/twice/);
  const old = [row('1','a')]; assert.deepEqual(batch(old,[]).meals,old);
});
