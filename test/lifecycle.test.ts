import { test } from "node:test";
import assert from "node:assert/strict";
import { defaultState } from "../src/state.ts";
import { tick } from "../src/vitality.ts";

test("a brand-new, never-synced pet holds vitality across ticks (no wilting from missing data)", () => {
  let state = defaultState("2026-06-01T00:00:00.000Z");
  const start = state.vitality;
  // advance several days without any sync
  for (const day of ["02", "03", "04", "05"]) {
    state = tick(state, `2026-06-${day}T09:00:00.000Z`).state;
  }
  assert.equal(state.vitality, start, "vitality should not drop before the first sync");
});

test("evolution needs real age: a very fit pet hatches fast but cannot reach juvenile in 4 days", () => {
  let state = defaultState("2026-06-01T00:00:00.000Z");
  state.fitness.rollingScore = 100; // max fitness -> vitality eases up and stays Healthy+
  for (const day of ["02", "03", "04", "05"]) {
    state = tick(state, `2026-06-${day}T09:00:00.000Z`).state;
  }
  // ~4 healthy days, age 4 -> hatchling yes; juvenile blocked (needs age>=5 AND healthy>=7)
  assert.equal(state.stage, "hatchling");
  assert.ok(state.healthyDays >= 3 && state.ageDays === 4);
});
