import { test } from "node:test";
import assert from "node:assert/strict";
import { applyReaction, reactionIsLive } from "../src/reactions.ts";
import { defaultState } from "../src/state.ts";

const NOW = "2026-06-02T00:00:00.000Z";

test("reactionIsLive: no reaction -> false", () => {
  assert.equal(reactionIsLive(defaultState(NOW), NOW), false);
});

test("reactionIsLive: true within the TTL, false once expired (drives the speech bubble)", () => {
  const s = defaultState(NOW);
  applyReaction(s, "test_pass", NOW); // ttl is 90s
  assert.equal(reactionIsLive(s, NOW), true);
  assert.equal(reactionIsLive(s, "2026-06-02T00:00:30.000Z"), true); // 30s later
  assert.equal(reactionIsLive(s, "2026-06-02T00:01:40.000Z"), false); // 100s later
});

test("applyReaction stores a non-empty quip and the event", () => {
  const s = defaultState(NOW);
  applyReaction(s, "error", NOW);
  assert.equal(s.reaction?.event, "error");
  assert.ok((s.reaction?.text ?? "").length > 0);
});
