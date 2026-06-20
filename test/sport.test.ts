import { test } from "node:test";
import assert from "node:assert/strict";
import { applySnapshot } from "../src/engine.ts";
import { defaultState } from "../src/state.ts";
import { ManualSource } from "../src/sources/manual.ts";
import type { FitnessSnapshot, FitnessSource } from "../src/sources/types.ts";

const NOW = "2026-06-10T00:00:00.000Z";
const src: FitnessSource = { id: "test", loadGoal: 60, normalize: (r) => r as FitnessSnapshot };

test("applySnapshot records the most recent activity's sport as lastSport", () => {
  const snap: FitnessSnapshot = {
    windowDays: 7,
    activities: [
      { date: "2026-06-08T10:00:00.000Z", durationMin: 30, sport: "run" },
      { date: "2026-06-09T10:00:00.000Z", durationMin: 60, sport: "road_biking" }, // latest
    ],
  };
  const { state } = applySnapshot(defaultState(NOW), snap, src, NOW);
  assert.equal(state.fitness.lastSport, "road_biking");
});

test("manual feed records sport 'run'", () => {
  const { state } = applySnapshot(defaultState(NOW), ManualSource.normalize(30), ManualSource, NOW);
  assert.equal(state.fitness.lastSport, "run");
});

test("a windowLoad-only sync keeps the previous lastSport (no activities to read)", () => {
  let s = applySnapshot(defaultState(NOW), ManualSource.normalize(30), ManualSource, NOW).state; // run
  const trendOnly: FitnessSnapshot = { windowDays: 7, activities: [], windowLoad: 200 };
  s = applySnapshot(s, trendOnly, src, NOW).state;
  assert.equal(s.fitness.lastSport, "run", "no new activity -> keep the previous sport");
});
