import assert from "node:assert/strict";
import test from "node:test";
import { getMemberAlertState } from "../src/utils/memberStatus.js";

test("member alert state is neutral with active meals before a warning", () => {
  assert.deepEqual(
    getMemberAlertState({ status: "active", mealStatus: "active" }),
    { warning: "none", meal: "active" }
  );
});

test("first payment warning keeps meal active and turns warning state yellow", () => {
  assert.deepEqual(
    getMemberAlertState({
      status: "active",
      mealStatus: "active",
      paymentWarningSentAt: "2026-10-05T10:00:00.000Z",
    }),
    { warning: "warning", meal: "active" }
  );
});

test("meal suspension is treated as final red warning with crossed meal icon", () => {
  assert.deepEqual(
    getMemberAlertState({
      status: "active",
      mealStatus: "suspended",
      paymentWarningSentAt: "2026-10-05T10:00:00.000Z",
      mealSuspendedAt: "2026-10-08T10:00:00.000Z",
      autoMealSuspended: true,
    }),
    { warning: "final", meal: "off" }
  );
});

test("inactive members use neutral inactive meal state", () => {
  assert.deepEqual(
    getMemberAlertState({ status: "inactive", mealStatus: "active" }),
    { warning: "none", meal: "inactive" }
  );
});
