import { test } from "node:test";
import assert from "node:assert/strict";
import { GarminSource } from "../src/sources/garmin.ts";
import { computeWindowLoad } from "../src/vitality.ts";

const nowIso = new Date().toISOString();

test("GarminSource maps real activity fields, using training_load as effort", () => {
  const raw = {
    activities: [
      { start_time_local: nowIso, type: "road_biking", moving_duration_seconds: 5120, training_load: 155.7 },
    ],
  };
  const snap = GarminSource.normalize(raw);
  assert.equal(snap.activities.length, 1);
  const a = snap.activities[0]!;
  assert.equal(a.sport, "road_biking");
  assert.ok(Math.abs(a.durationMin - 5120 / 60) < 0.01);
  assert.equal(a.effort, 155.7);
  assert.equal(computeWindowLoad(snap), 155.7);
});

test("GarminSource unwraps the MCP {result:'<json>'} envelope", () => {
  const raw = {
    activities: {
      result: JSON.stringify({
        activities: [{ start_time: nowIso, type: "run", moving_duration_seconds: 1800, training_load: 60 }],
      }),
    },
  };
  const snap = GarminSource.normalize(raw);
  assert.equal(snap.activities.length, 1);
  assert.equal(snap.activities[0]!.effort, 60);
});

test("GarminSource falls back to duration x sportFactor when training_load is missing", () => {
  const raw = { activities: [{ start_time: nowIso, type: "run", moving_duration_seconds: 1800 }] }; // 30-min run
  const snap = GarminSource.normalize(raw);
  assert.equal(snap.activities[0]!.effort, undefined);
  assert.equal(computeWindowLoad(snap), 30); // 30 * 1.0
});

test("GarminSource drops activities older than the rolling window", () => {
  const old = new Date(Date.now() - 30 * 86_400_000).toISOString();
  const raw = { activities: [{ start_time: old, type: "run", moving_duration_seconds: 1800, training_load: 50 }] };
  assert.equal(GarminSource.normalize(raw).activities.length, 0);
});
