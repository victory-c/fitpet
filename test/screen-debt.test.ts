import { test } from "node:test";
import assert from "node:assert/strict";
import { computeScreenDebt } from "../src/screen-debt/score.ts";
import { defaultScreenDebt, creditWorkouts, addRecovery, recoveryId, sanitizeScreenDebt } from "../src/screen-debt/state.ts";
import { severityOf, severityTransitions } from "../src/screen-debt/severity.ts";
import { createConcernReminder } from "../src/screen-debt/concern.ts";
import { defaultState, sanitizeState } from "../src/state.ts";
import { applySnapshot } from "../src/engine.ts";
import { GarminSource } from "../src/sources/garmin.ts";
import type { ActivityEvent } from "../src/local-activity/log.ts";

const zero = Date.parse("2026-10-15T10:00:00Z");
const at = (minutes: number) => new Date(zero + minutes * 60_000);
const iso = (minutes: number) => at(minutes).toISOString();
const events = (start: number, finish: number): ActivityEvent[] => Array.from({ length: Math.floor((finish - start) / 10) + 1 }, (_, i) => ({ t: iso(start + i * 10), kind: "edit" }));
const blank = () => defaultScreenDebt(iso(0));

test("debt uses elapsed time, grace and long-session rate; duplicates do not multiply it", () => {
  assert.equal(computeScreenDebt(events(0, 20), blank(), at(20)).score, 0);
  assert.equal(computeScreenDebt(events(0, 60), blank(), at(60)).score, 7.5);
  const activity = events(0, 120);
  const score = computeScreenDebt(activity, blank(), at(120));
  assert.equal(score.score, 37.5);
  assert.equal(score.severity, "CONCERNING");
  assert.deepEqual(computeScreenDebt([...activity, ...activity].reverse(), blank(), at(120)), score);
  assert.equal(computeScreenDebt([...activity, { t: iso(999), kind: "tool" }], blank(), at(120)).score, score.score);
  assert.equal(computeScreenDebt(events(0, 400), blank(), at(400)).score, 100);
});

test("polling/restarts never change accounting; breaks recover a bounded amount", () => {
  const activity = events(0, 180);
  for (let i = 0; i <= 180; i++) computeScreenDebt(activity, blank(), at(i));
  assert.equal(computeScreenDebt(activity, blank(), at(180)).score, 67.5);
  assert.equal(computeScreenDebt(activity, blank(), at(195)).score, 68);
  assert.equal(computeScreenDebt(activity, blank(), at(225)).score, 53);
  assert.equal(computeScreenDebt(activity, blank(), at(1000)).score, 53);
  assert.equal(computeScreenDebt(activity, blank(), at(8 * 1440)).score, 0);
});

test("late workout sync replays credit when workout finished, never prepays later code", () => {
  const activity = events(60, 180);
  const workout = { id: "workout-1", date: iso(0), durationMin: 30, sport: "run" };
  const before = computeScreenDebt(activity, blank(), at(180));
  const debt = creditWorkouts(blank(), [workout], "garmin", iso(180));
  assert.equal(computeScreenDebt(activity, debt, at(180)).score, before.score);
  const afterCoding = creditWorkouts(debt, [{ ...workout, id: "workout-2", date: iso(160), durationMin: 20 }], "garmin", iso(180));
  assert.equal(computeScreenDebt(activity, afterCoding, at(180)).score, 17.5);
  assert.deepEqual(creditWorkouts(afterCoding, [workout, { ...workout, id: "workout-2", date: iso(160), durationMin: 20 }], "garmin", iso(180)), afterCoding);
});

test("credit requires completed recent workouts, caps credit, and ignores rolling load", () => {
  const debt = blank();
  const activity = events(0, 180);
  const unfinished = { date: iso(180), durationMin: 20, sport: "run" };
  assert.equal(creditWorkouts(debt, [unfinished], "garmin", iso(180)).recoveries.length, 0);
  const credited = creditWorkouts(debt, [{ date: iso(0), durationMin: 180, sport: "run" }], "garmin", iso(180));
  assert.equal(computeScreenDebt(activity, credited, at(180)).score, 27.5);
  const pet = defaultState(iso(0));
  const { state } = applySnapshot(pet, { activities: [], windowDays: 7, windowLoad: 500 }, GarminSource, iso(180));
  assert.equal(state.screenDebt!.recoveries.length, 0);
});

test("stable IDs and fallback identities prevent repeated/amended sync credit", () => {
  const workout = { date: iso(60), durationMin: 30, sport: "run" };
  const once = creditWorkouts(blank(), [workout], "garmin", iso(180));
  const twice = creditWorkouts(once, [{ ...workout, durationMin: 31 }], "garmin", iso(180));
  assert.equal(twice.recoveries.length, 1);
  assert.deepEqual(twice, once);
  const explicit = creditWorkouts(blank(), [{ ...workout, id: "123" }], "garmin", iso(180));
  assert.equal(creditWorkouts(explicit, [{ ...workout, id: "123", date: iso(61) }], "garmin", iso(180)).recoveries.length, 1);
});

test("outdoor recovery and schema sanitation strip invalid/duplicate entries without touching growth", () => {
  const recovery = { id: recoveryId("walk"), at: iso(180), minutes: 10, kind: "outdoor" as const };
  const debt = addRecovery(blank(), recovery, iso(180));
  assert.equal(computeScreenDebt(events(0, 180), debt, at(180)).score, 57.5);
  assert.equal(sanitizeScreenDebt({ since: "bad", recoveries: [null, recovery, recovery, { ...recovery, id: "command-text" }] }, iso(0)).recoveries.length, 1);
  const pet = defaultState(iso(0)); pet.stage = "adult"; pet.healthyDays = 30;
  const migrated = sanitizeState({ ...pet, schemaVersion: 1, screenDebt: undefined });
  assert.equal(migrated.schemaVersion, 2);
  assert.equal(migrated.stage, "adult");
  assert.equal(migrated.healthyDays, 30);
  assert.equal(migrated.vitality, pet.vitality);
  assert.deepEqual(migrated.screenDebt!.recoveries, []);
});

test("severity boundaries, transitions, and local concern quips", () => {
  assert.deepEqual([0, 35, 60, 80, 100].map(severityOf), ["NORMAL", "CONCERNING", "DEGRADED", "CRITICAL", "CRITICAL"]);
  assert.deepEqual(severityTransitions(20, 85), ["escalated", "entered_critical"]);
  assert.deepEqual(severityTransitions(85, 0), ["deescalated", "recovered"]);
  const concern = createConcernReminder();
  assert.equal(concern(0, "sarcastic", zero), null);
  const first = concern(40, "sarcastic", zero);
  assert.match(first!.text, /grass/);
  assert.deepEqual(concern(41, "sarcastic", zero + 1000), first);
  assert.equal(concern(41, "sarcastic", zero + 91_000), null);
  assert.equal(concern(90, "sarcastic", zero + 92_000)?.event, "debt_critical");
  assert.equal(concern(0, "sarcastic", zero + 93_000)?.event, "debt_normal");
});