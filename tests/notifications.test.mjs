import test from "node:test";
import assert from "node:assert/strict";
import { getPinnedNoticeTokens, pinnedNoticeToken } from "../src/utils/notifications.js";

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
