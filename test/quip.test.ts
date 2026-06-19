import { test } from "node:test";
import assert from "node:assert/strict";
import { selectQuip } from "../src/quip.ts";
import { quipsFor } from "../src/content/quips.ts";
import { PERSONALITIES } from "../src/content/personalities.ts";
import type { ReactionEvent } from "../src/types.ts";

test("selectQuip returns a member of the pool", () => {
  const pool = ["a", "b", "c"];
  for (let i = 0; i < 30; i++) assert.ok(pool.includes(selectQuip(pool)));
});

test("selectQuip avoids the immediate previous line when possible", () => {
  const pool = ["a", "b"];
  for (let i = 0; i < 20; i++) assert.equal(selectQuip(pool, "a"), "b");
});

test("selectQuip handles empty and single pools", () => {
  assert.equal(selectQuip([]), "");
  assert.equal(selectQuip(["only"], "only"), "only");
});

test("quipsFor always returns a non-empty pool for every event x personality", () => {
  const events: ReactionEvent[] = [
    "session_start", "test_pass", "test_fail", "error", "edit", "long_session",
    "idle", "fed", "tier_up", "tier_down", "evolved", "revived", "stale",
  ];
  for (const ev of events) {
    for (const p of PERSONALITIES) {
      assert.ok(quipsFor(ev, p).length > 0, `${ev}/${p} should have quips`);
    }
  }
});
