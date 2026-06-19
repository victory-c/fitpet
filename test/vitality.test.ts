import { test } from "node:test";
import assert from "node:assert/strict";
import {
  tierOf,
  easeTowardScore,
  computeWindowLoad,
  rollingScoreFromLoad,
  advanceStage,
  tick,
  sportFactor,
} from "../src/vitality.ts";
import type { PetState } from "../src/types.ts";

function makePet(overrides: Partial<PetState> = {}): PetState {
  return {
    schemaVersion: 1,
    pet: { name: "Test", species: "sprout", personality: "earnest", bornAt: "2026-06-01T00:00:00.000Z" },
    vitality: 50,
    stage: "egg",
    ageDays: 0,
    healthyDays: 0,
    lastHealthyDayCounted: null,
    lastTickAt: "2026-06-01T00:00:00.000Z",
    fitness: { rollingScore: 50, windowDays: 7, source: null, lastActivityAt: null, lastSyncAt: null },
    reaction: null,
    ...overrides,
  };
}

test("tierOf maps vitality to the right tier at boundaries", () => {
  assert.equal(tierOf(100), "thriving");
  assert.equal(tierOf(75), "thriving");
  assert.equal(tierOf(74), "healthy");
  assert.equal(tierOf(45), "healthy");
  assert.equal(tierOf(44), "wilting");
  assert.equal(tierOf(15), "wilting");
  assert.equal(tierOf(14), "dormant");
  assert.equal(tierOf(0), "dormant");
});

test("easeTowardScore moves toward the target, both directions", () => {
  assert.ok(easeTowardScore(30, 100) > 30);
  assert.ok(easeTowardScore(80, 0) < 80);
  // exactly on target -> unchanged
  assert.equal(easeTowardScore(60, 60), 60);
});

test("CORE PROPERTY: a tick never drops vitality on its own (no time decay)", () => {
  // vitality already equals rollingScore -> a tick must leave it unchanged.
  const pet = makePet({ vitality: 80, fitness: { ...makePet().fitness, rollingScore: 80 } });
  const { state } = tick(pet, "2026-06-02T00:00:00.000Z");
  assert.equal(state.vitality, 80);
});

test("a tick eases vitality UP toward a higher rollingScore", () => {
  const pet = makePet({ vitality: 30, fitness: { ...makePet().fitness, rollingScore: 100 } });
  const { state } = tick(pet, "2026-06-02T00:00:00.000Z");
  assert.ok(state.vitality > 30);
});

test("computeWindowLoad prefers native windowLoad, else sums effort/duration", () => {
  assert.equal(computeWindowLoad({ activities: [], windowDays: 7, windowLoad: 42 }), 42);
  // effort present -> used directly
  assert.equal(
    computeWindowLoad({ windowDays: 7, activities: [{ date: "x", durationMin: 30, sport: "run", effort: 10 }] }),
    10,
  );
  // no effort -> duration * sportFactor (run = 1.0)
  assert.equal(
    computeWindowLoad({ windowDays: 7, activities: [{ date: "x", durationMin: 30, sport: "run" }] }),
    30,
  );
});

test("rollingScoreFromLoad clamps to 0-100 and handles a zero goal", () => {
  assert.equal(rollingScoreFromLoad(30, 60), 50);
  assert.equal(rollingScoreFromLoad(120, 60), 100);
  assert.equal(rollingScoreFromLoad(10, 0), 0);
});

test("sportFactor is case-insensitive with a default", () => {
  assert.equal(sportFactor("RUN"), 1.0);
  assert.equal(sportFactor("lap_swimming"), 1.1);
  assert.equal(sportFactor("something_unknown"), 0.6);
});

test("advanceStage is gated by Healthy and never regresses", () => {
  // signature: advanceStage(current, healthyDays, ageDays, tier)
  // enough healthy days but currently wilting -> no advance
  assert.equal(advanceStage("egg", 10, 30, "wilting"), "egg");
  // healthy + 1 healthy day -> hatchling, even at age 0 (intentional instant first hatch)
  assert.equal(advanceStage("egg", 1, 0, "healthy"), "hatchling");
  // healthy + 7 healthy days AND >=5 days old -> juvenile
  assert.equal(advanceStage("hatchling", 7, 7, "healthy"), "juvenile");
  // never regress, even with few days
  assert.equal(advanceStage("adult", 1, 0, "healthy"), "adult");
});

test("advanceStage age gate: enough healthy days but too young cannot reach juvenile/adult", () => {
  // 7 healthy days but only 2 days old -> juvenile is blocked (needs age >= 5)
  assert.equal(advanceStage("hatchling", 7, 2, "healthy"), "hatchling");
  // 21 healthy days but only 10 days old -> adult blocked (needs age >= 14); juvenile ok
  assert.equal(advanceStage("hatchling", 21, 10, "healthy"), "juvenile");
  // old enough AND healthy enough -> adult
  assert.equal(advanceStage("juvenile", 21, 14, "healthy"), "adult");
});

test("healthyDays increments at most once per calendar day", () => {
  let pet = makePet({ vitality: 80, fitness: { ...makePet().fitness, rollingScore: 80 } });
  const r1 = tick(pet, "2026-06-02T08:00:00.000Z");
  assert.equal(r1.state.healthyDays, 1);
  const r2 = tick(r1.state, "2026-06-02T20:00:00.000Z"); // same day
  assert.equal(r2.state.healthyDays, 1);
  const r3 = tick(r2.state, "2026-06-03T08:00:00.000Z"); // next day
  assert.equal(r3.state.healthyDays, 2);
});
