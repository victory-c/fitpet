import { test } from "node:test";
import assert from "node:assert/strict";
import { applySnapshot, pickTopEvent } from "../src/engine.ts";
import { ManualSource } from "../src/sources/manual.ts";
import type { PetState } from "../src/types.ts";
import type { FitnessSource } from "../src/sources/types.ts";

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

test("first feed from a low start raises score, fires fed + tier_up + evolved", () => {
  const pet = makePet({
    vitality: 30,
    stage: "egg",
    fitness: { rollingScore: 0, windowDays: 7, source: null, lastActivityAt: null, lastSyncAt: null },
  });
  const { state, events } = applySnapshot(pet, ManualSource.normalize(60), ManualSource, "2026-06-02T00:00:00.000Z");
  assert.equal(state.fitness.rollingScore, 100); // 60 load / 60 goal
  assert.ok(state.vitality > 30);
  assert.ok(events.includes("fed"));
  assert.ok(events.includes("tier_up")); // wilting -> healthy
  assert.ok(events.includes("evolved")); // egg -> hatchling on first healthy day
  assert.equal(state.stage, "hatchling");
});

test("recompute is idempotent: same snapshot twice -> same rollingScore", () => {
  const snap = ManualSource.normalize(30);
  const a = applySnapshot(makePet(), snap, ManualSource, "2026-06-02T00:00:00.000Z");
  const b = applySnapshot(a.state, snap, ManualSource, "2026-06-02T00:00:00.000Z");
  assert.equal(a.state.fitness.rollingScore, b.state.fitness.rollingScore);
});

test("a lower fresh window is data-driven decay: fires tier_down, vitality eases down", () => {
  const pet = makePet({
    vitality: 80,
    fitness: { rollingScore: 80, windowDays: 7, source: "manual", lastActivityAt: null, lastSyncAt: null },
  });
  const { state, events } = applySnapshot(pet, ManualSource.normalize(0), ManualSource, "2026-06-02T00:00:00.000Z");
  assert.equal(state.fitness.rollingScore, 0);
  assert.ok(state.vitality < 80);
  assert.ok(events.includes("tier_down"));
});

test("a native windowLoad is used directly", () => {
  const pet = makePet({
    vitality: 10,
    fitness: { rollingScore: 10, windowDays: 7, source: null, lastActivityAt: null, lastSyncAt: null },
  });
  const garminLike: FitnessSource = { id: "garmin", loadGoal: 50, normalize: (r) => r as never };
  const { state } = applySnapshot(pet, { activities: [], windowDays: 7, windowLoad: 25 }, garminLike, "2026-06-02T00:00:00.000Z");
  assert.equal(state.fitness.rollingScore, 50); // 25 / 50 -> 50
});

test("reviving a dormant pet fires revived", () => {
  const pet = makePet({
    vitality: 8,
    fitness: { rollingScore: 8, windowDays: 7, source: "manual", lastActivityAt: null, lastSyncAt: null },
  });
  const { state, events } = applySnapshot(pet, ManualSource.normalize(60), ManualSource, "2026-06-02T00:00:00.000Z");
  assert.ok(state.vitality >= 15); // out of dormant
  assert.ok(events.includes("revived"));
});

test("pickTopEvent prefers the most salient event", () => {
  assert.equal(pickTopEvent(["fed", "evolved", "tier_up"]), "evolved");
  assert.equal(pickTopEvent(["fed"]), "fed");
  assert.equal(pickTopEvent([]), null);
});
