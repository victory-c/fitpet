import { test } from "node:test";
import assert from "node:assert/strict";
import {
  shellTierForStage,
  stageScale,
  eyeStateForTier,
  tintFactorForVitality,
  postureForTier,
  vitalsParams,
  sportKindFor,
  bodySportActive,
  screenSportRecent,
  reactionFlashKind,
  screenMode,
  partsFor,
  safeComposition,
  type VmSnap,
} from "../src/desktop/renderer/view-model.ts";
import { mixToGrey } from "../src/desktop/renderer/draw.ts";

const NOW = Date.parse("2026-06-20T12:00:00.000Z");
const ago = (ms: number) => new Date(NOW - ms).toISOString();
const H = 60 * 60 * 1000;

function snap(o: Partial<VmSnap> = {}): VmSnap {
  return { stage: "adult", tier: "healthy", vitality: 60, lastSport: null, lastActivityAt: null, reaction: null, ...o };
}

test("shellTier + stageScale derive from growth stage", () => {
  assert.equal(shellTierForStage("egg"), "boot");
  assert.equal(shellTierForStage("hatchling"), "mono");
  assert.equal(shellTierForStage("juvenile"), "color");
  assert.equal(shellTierForStage("adult"), "flat");
  assert.ok(stageScale("hatchling") < stageScale("juvenile"));
  assert.ok(stageScale("juvenile") < stageScale("adult"));
  assert.equal(stageScale("adult"), 1);
});

test("eyes + posture track tier", () => {
  assert.equal(eyeStateForTier("thriving"), "happy");
  assert.equal(eyeStateForTier("dormant"), "closed");
  assert.ok(postureForTier("thriving").clawDy < 0, "claws high when thriving");
  assert.ok(postureForTier("wilting").clawDy > 0, "claws sag when wilting");
  assert.ok(postureForTier("dormant").eyeDy > postureForTier("wilting").eyeDy);
});

test("tintFactorForVitality: 100 -> colour, 0 -> grey, clamped", () => {
  assert.equal(tintFactorForVitality(100), 0);
  assert.equal(tintFactorForVitality(0), 1);
  assert.equal(tintFactorForVitality(140), 0);
});

test("vitalsParams is monotonic and changes phosphor colour by tier band", () => {
  assert.ok(vitalsParams(100).rate > vitalsParams(0).rate);
  assert.ok(vitalsParams(100).amp > vitalsParams(0).amp);
  assert.equal(vitalsParams(80).color, "#54f07a"); // green
  assert.equal(vitalsParams(30).color, "#e0b341"); // amber
  assert.equal(vitalsParams(5).color, "#9a6b2f"); // dim
});

test("sportKindFor maps raw Garmin names", () => {
  assert.equal(sportKindFor("road_biking"), "cycle");
  assert.equal(sportKindFor("lap_swimming"), "swim");
  assert.equal(sportKindFor("trail_running"), "run");
  assert.equal(sportKindFor("yoga"), "none");
  assert.equal(sportKindFor(null), "none");
});

test("body performs sport only briefly; screen readout lasts longer", () => {
  const recent = snap({ lastSport: "road_biking", lastActivityAt: ago(1 * H) });
  const stale = snap({ lastSport: "road_biking", lastActivityAt: ago(10 * H) });
  const old = snap({ lastSport: "road_biking", lastActivityAt: ago(30 * H) });
  assert.equal(bodySportActive(recent, NOW), true);
  assert.equal(bodySportActive(stale, NOW), false, "no full-body performance after a few hours");
  assert.equal(screenSportRecent(recent, NOW), true);
  assert.equal(screenSportRecent(stale, NOW), true, "screen still shows sport within a day");
  assert.equal(screenSportRecent(old, NOW), false);
  assert.equal(bodySportActive(snap({ ...recent, tier: "dormant" }), NOW), false);
});

test("reactionFlashKind classifies events", () => {
  assert.equal(reactionFlashKind("test_pass"), "pos");
  assert.equal(reactionFlashKind("error"), "neg");
  assert.equal(reactionFlashKind("edit"), "neutral");
});

test("screenMode precedence: flash > boot > standby > sport > vitals", () => {
  // fresh reaction flashes (overrides everything), then expires
  const flashing = snap({ tier: "dormant", reaction: { event: "test_fail", setAtMs: NOW - 500 } });
  assert.equal(screenMode(flashing, NOW), "flash-neg");
  const expired = snap({ tier: "dormant", reaction: { event: "test_fail", setAtMs: NOW - 3000 } });
  assert.equal(screenMode(expired, NOW), "standby", "after the flash window, dormant -> standby");

  assert.equal(screenMode(snap({ stage: "egg" }), NOW), "boot");
  assert.equal(screenMode(snap({ tier: "dormant" }), NOW), "standby");
  assert.equal(screenMode(snap({ lastSport: "run", lastActivityAt: ago(2 * H) }), NOW), "sport");
  assert.equal(screenMode(snap(), NOW), "vitals");
  assert.equal(screenMode(snap({ lastSport: "run", lastActivityAt: ago(40 * H) }), NOW), "vitals", "old sport -> vitals");
});

test("partsFor selects keys for an adult healthy idle pet", () => {
  const p = partsFor(snap({ stage: "adult", tier: "healthy", vitality: 100 }), NOW);
  assert.deepEqual(p, {
    stage: "adult",
    shellTier: "flat",
    eyes: "neutral",
    claws: "rest",
    sport: "none",
    tintFactor: 0,
    posture: { bodyDy: 0, clawDy: 0, eyeDy: 0 },
  });
});

test("partsFor: thriving raises claws, recent sport overrides to a sport pose", () => {
  assert.equal(partsFor(snap({ tier: "thriving" }), NOW).claws, "raised");
  const sporty = partsFor(snap({ tier: "thriving", lastSport: "lap_swimming", lastActivityAt: ago(1 * H) }), NOW);
  assert.equal(sporty.claws, "sport");
  assert.equal(sporty.sport, "swim");
});

test("safeComposition is a healthy adult idle", () => {
  assert.equal(safeComposition().stage, "adult");
  assert.equal(safeComposition().shellTier, "flat");
  assert.equal(safeComposition().tintFactor, 0);
});

test("mixToGrey: f=0 keeps colour, f=1 -> mid grey", () => {
  assert.equal(mixToGrey("#ef7d3a", 0), "#ef7d3a");
  assert.equal(mixToGrey("#ef7d3a", 1), "#969696");
});
