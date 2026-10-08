import assert from "node:assert/strict";
import test from "node:test";
import {
  applyWarningAutomation,
  dueDayNumber,
  localDateKey,
  normalizeWarningSettings,
} from "../src/utils/warnings.js";

const messId = "mess-1";
const memberId = "member-1";

const buildStore = ({ member = {}, warningSettings = {}, notices = [] } = {}) => ({
  messes: [
    {
      id: messId,
      month: "2026-10",
      currency: "BDT",
      warningSettings: {
        enabled: true,
        warningAfterDays: 4,
        mealOffAfterDays: 7,
        minimumDue: 1,
        autoSuspendMeals: true,
        ...warningSettings,
      },
    },
  ],
  members: [
    {
      id: memberId,
      messId,
      name: "Demo Member",
      status: "active",
      mealStatus: "active",
      autoMealSuspended: false,
      dueSince: null,
      paymentWarningSentAt: null,
      mealSuspendedAt: null,
      ...member,
    },
  ],
  notices,
});

const monthly = (balance = -100) => ({
  memberRows: [{ memberId, balance }],
});

test("warning settings enforce whole-day sequence and non-negative due", () => {
  assert.deepEqual(
    normalizeWarningSettings({ warningAfterDays: 0, mealOffAfterDays: 0, minimumDue: -10 }),
    {
      enabled: true,
      warningAfterDays: 1,
      mealOffAfterDays: 2,
      minimumDue: 0,
      autoSuspendMeals: true,
    }
  );
  assert.equal(normalizeWarningSettings({ warningAfterDays: 4, mealOffAfterDays: 4 }).mealOffAfterDays, 5);
});

test("due day counting is inclusive and stable across calendar dates", () => {
  assert.equal(dueDayNumber("2026-10-01", "2026-10-01"), 1);
  assert.equal(dueDayNumber("2026-10-01", "2026-10-04"), 4);
  assert.equal(dueDayNumber("2026-10-04", "2026-10-01"), 0);
  assert.equal(localDateKey(new Date(2026, 9, 8, 0, 30)), "2026-10-08");
});

test("first negative day starts Day 1 without sending an early warning", () => {
  const result = applyWarningAutomation(buildStore(), messId, monthly(), {
    todayKey: "2026-10-01",
    nowIso: "2026-10-01T10:00:00.000Z",
  });
  const member = result.store.members[0];
  assert.equal(member.dueSince, "2026-10-01");
  assert.equal(member.paymentWarningSentAt, null);
  assert.equal(result.store.notices.length, 0);
});

test("warning fires exactly on configured inclusive due day", () => {
  const store = buildStore({ member: { dueSince: "2026-10-01" } });
  const result = applyWarningAutomation(store, messId, monthly(), {
    todayKey: "2026-10-04",
    nowIso: "2026-10-04T10:00:00.000Z",
  });
  assert.equal(result.store.members[0].mealStatus, "active");
  assert.equal(result.store.members[0].paymentWarningSentAt, "2026-10-04T10:00:00.000Z");
  assert.equal(result.store.notices.length, 1);
  assert.equal(result.store.notices[0].type, "payment_warning");
  assert.match(result.store.notices[0].message, /day 4/i);
});

test("meal is suspended exactly on configured meal-off day", () => {
  const store = buildStore({
    member: {
      dueSince: "2026-10-01",
      paymentWarningSentAt: "2026-10-04T10:00:00.000Z",
    },
  });
  const result = applyWarningAutomation(store, messId, monthly(), {
    todayKey: "2026-10-07",
    nowIso: "2026-10-07T10:00:00.000Z",
  });
  const member = result.store.members[0];
  assert.equal(member.mealStatus, "suspended");
  assert.equal(member.autoMealSuspended, true);
  assert.equal(member.mealSuspendedAt, "2026-10-07T10:00:00.000Z");
  assert.equal(result.store.notices.length, 1);
  assert.equal(result.store.notices[0].type, "meal_suspended");
});

test("opening the app first on meal-off day sends only the final alert", () => {
  const store = buildStore({ member: { dueSince: "2026-10-01" } });
  const result = applyWarningAutomation(store, messId, monthly(), {
    todayKey: "2026-10-07",
    nowIso: "2026-10-07T10:00:00.000Z",
  });
  assert.equal(result.store.notices.length, 1);
  assert.equal(result.store.notices[0].type, "meal_suspended");
  assert.ok(result.store.members[0].paymentWarningSentAt);
});

test("clearing the due resets timer and restores only auto-suspended meals", () => {
  const store = buildStore({
    member: {
      dueSince: "2026-10-01",
      paymentWarningSentAt: "2026-10-04T10:00:00.000Z",
      mealStatus: "suspended",
      autoMealSuspended: true,
      mealSuspendedAt: "2026-10-07T10:00:00.000Z",
    },
  });
  const result = applyWarningAutomation(store, messId, monthly(50), {
    todayKey: "2026-10-08",
    nowIso: "2026-10-08T10:00:00.000Z",
  });
  const member = result.store.members[0];
  assert.equal(member.dueSince, null);
  assert.equal(member.paymentWarningSentAt, null);
  assert.equal(member.mealStatus, "active");
  assert.equal(member.autoMealSuspended, false);
});

test("turning off auto suspension or moving meal-off day later restores an automatic suspension", () => {
  const member = {
    dueSince: "2026-10-01",
    paymentWarningSentAt: "2026-10-04T10:00:00.000Z",
    mealStatus: "suspended",
    autoMealSuspended: true,
    mealSuspendedAt: "2026-10-07T10:00:00.000Z",
  };

  const disabled = applyWarningAutomation(
    buildStore({ member, warningSettings: { autoSuspendMeals: false } }),
    messId,
    monthly(),
    { todayKey: "2026-10-08", nowIso: "2026-10-08T10:00:00.000Z" }
  );
  assert.equal(disabled.store.members[0].mealStatus, "active");
  assert.equal(disabled.store.members[0].autoMealSuspended, false);

  const movedLater = applyWarningAutomation(
    buildStore({ member, warningSettings: { mealOffAfterDays: 10 } }),
    messId,
    monthly(),
    { todayKey: "2026-10-08", nowIso: "2026-10-08T10:00:00.000Z" }
  );
  assert.equal(movedLater.store.members[0].mealStatus, "active");
});

test("a new due cycle in the same month gets a distinct alert key", () => {
  const oldNotice = {
    id: "old",
    messId,
    type: "payment_warning",
    autoKey: `payment-warning:2026-10:${memberId}:2026-10-01`,
    createdAt: "2026-10-04T10:00:00.000Z",
  };
  const store = buildStore({
    member: { dueSince: "2026-10-10" },
    notices: [oldNotice],
  });
  const result = applyWarningAutomation(store, messId, monthly(), {
    todayKey: "2026-10-13",
    nowIso: "2026-10-13T10:00:00.000Z",
  });
  assert.equal(result.store.notices.length, 2);
  assert.match(result.store.notices[1].autoKey, /2026-10-10$/);
});

test("disabling warning automation clears automation state and restores auto-suspended meals", () => {
  const store = buildStore({
    warningSettings: { enabled: false },
    member: {
      dueSince: "2026-10-01",
      paymentWarningSentAt: "2026-10-04T10:00:00.000Z",
      mealStatus: "suspended",
      autoMealSuspended: true,
      mealSuspendedAt: "2026-10-07T10:00:00.000Z",
    },
  });
  const result = applyWarningAutomation(store, messId, monthly(), {
    todayKey: "2026-10-08",
    nowIso: "2026-10-08T10:00:00.000Z",
  });
  const member = result.store.members[0];
  assert.equal(member.mealStatus, "active");
  assert.equal(member.autoMealSuspended, false);
  assert.equal(member.dueSince, null);
  assert.equal(member.paymentWarningSentAt, null);
});
