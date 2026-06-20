import { test } from "node:test";
import assert from "node:assert/strict";

import { EGG, SPROUT, type TierName } from "../src/desktop/renderer/sprites/sprout.ts";
import { idleClassForSnap, idleClassForSport, reactionAnimationClass, spriteFor } from "../src/desktop/renderer/view-model.ts";

const TIERS: TierName[] = ["thriving", "healthy", "wilting", "dormant"];

test("spriteFor maps egg to the egg sprite regardless of tier", () => {
  for (const tier of TIERS) {
    assert.equal(spriteFor({ stage: "egg", tier }), EGG);
  }
});

test("spriteFor maps every non-egg tier to a sprite", () => {
  for (const tier of TIERS) {
    assert.equal(spriteFor({ stage: "adult", tier }), SPROUT[tier]);
  }
});

test("idleClassForSport maps common Garmin sport names and falls back safely", () => {
  assert.equal(idleClassForSport("road_biking"), "idle-cycling");
  assert.equal(idleClassForSport("virtual_ride"), "idle-cycling");
  assert.equal(idleClassForSport("lap_swimming"), "idle-swimming");
  assert.equal(idleClassForSport("trail_running"), "idle-running");
  assert.equal(idleClassForSport("hiking"), "idle-walking");
  assert.equal(idleClassForSport("pickleball"), "idle-default");
  assert.equal(idleClassForSport(null), "idle-default");
});

test("idleClassForSnap makes dormant pets breathe calmly instead of using last sport", () => {
  assert.equal(idleClassForSnap({ tier: "dormant", lastSport: "run" }), "idle-default");
  assert.equal(idleClassForSnap({ tier: "healthy", lastSport: "run" }), "idle-running");
});

test("reactionAnimationClass maps reaction tone to animation", () => {
  assert.equal(reactionAnimationClass("test_fail"), "shake");
  assert.equal(reactionAnimationClass("error"), "shake");
  assert.equal(reactionAnimationClass("test_pass"), "bounce");
  assert.equal(reactionAnimationClass("fed"), "bounce");
  assert.equal(reactionAnimationClass("unknown_event"), "pop");
});
