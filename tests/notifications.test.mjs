import test from "node:test";
import assert from "node:assert/strict";
import {
  automaticAlertToken,
  getPinnedNoticeTokens,
  isAutomaticAlertNotice,
  pinnedNoticeToken,
} from "../src/utils/notifications.js";

test("pinned notice token uses pinnedAt so re-pinning creates a fresh notification version", () => {
  const notice = { id: "n1", pinned: true, createdAt: "2026-10-01T00:00:00.000Z", pinnedAt: "2026-10-02T00:00:00.000Z" };
  assert.equal(pinnedNoticeToken(notice), "n1:2026-10-02T00:00:00.000Z");
  assert.equal(pinnedNoticeToken({ ...notice, pinnedAt: "2026-10-03T00:00:00.000Z" }), "n1:2026-10-03T00:00:00.000Z");
});

test("unpinned notices never create notification tokens", () => {
  assert.equal(pinnedNoticeToken({ id: "n1", pinned: false }), null);
  assert.deepEqual(
    getPinnedNoticeTokens([
      { id: "n1", pinned: false, createdAt: "a" },
      { id: "n2", pinned: true, createdAt: "b" },
    ]),
    ["n2:b"]
  );
});

test("automatic warning and meal-off notices are recognized for dedicated alert sounds", () => {
  assert.equal(isAutomaticAlertNotice({ type: "payment_warning" }), true);
  assert.equal(isAutomaticAlertNotice({ type: "meal_suspended" }), true);
  assert.equal(isAutomaticAlertNotice({ type: "general" }), false);
});

test("automatic alert token remains unique per generated warning event", () => {
  const warning = {
    id: "w1",
    type: "payment_warning",
    autoKey: "payment-warning:2026-10:m1",
    createdAt: "2026-10-06T02:00:00.000Z",
  };
  const mealOff = {
    id: "m1",
    type: "meal_suspended",
    autoKey: "meal-suspended:2026-10:m1",
    createdAt: "2026-10-09T02:00:00.000Z",
  };

  assert.equal(
    automaticAlertToken(warning),
    "payment_warning:payment-warning:2026-10:m1:2026-10-06T02:00:00.000Z"
  );
  assert.equal(
    automaticAlertToken(mealOff),
    "meal_suspended:meal-suspended:2026-10:m1:2026-10-09T02:00:00.000Z"
  );
  assert.equal(automaticAlertToken({ id: "n1", type: "general" }), null);
});
