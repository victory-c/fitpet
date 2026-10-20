import { test } from "node:test";
import assert from "node:assert/strict";
import { defaultState, type StateReadResult } from "../src/state.ts";
import { createCompanionReader } from "../src/desktop/activity-snapshot.ts";
import { addRecovery, creditWorkouts, defaultScreenDebt, recoveryId } from "../src/screen-debt/state.ts";
import type { ActivityEvent } from "../src/local-activity/log.ts";

const zero = Date.parse("2026-10-15T10:00:00Z");
const iso = (minutes: number) => new Date(zero + minutes * 60_000).toISOString();
const events = (finish: number): ActivityEvent[] => Array.from({ length: Math.floor(finish / 10) + 1 }, (_, i) => ({ t: iso(i * 10), kind: "edit" }));

test("snooze dismisses live nudges, preserves ordinary reactions and never replays consumed session reminder", () => {
  const pet = defaultState(iso(0));
  let now = iso(60);
  const reader = createCompanionReader(() => ({ ok: true, state: pet }), () => now, () => ({ ok: true, events: events(90) }));
  assert.equal(reader().reaction?.event, "long_session");
  pet.notifications = { nagIntensity: "normal", snoozedUntil: iso(80) };
  assert.equal(reader().reaction, null);
  assert.equal(reader().notifications.snoozed, true);
  pet.reaction = { text: "forced grass", event: "long_session", face: "", setAt: now, ttlSeconds: 90 };
  assert.equal(reader().reaction, null);
  pet.notifications.dismissedThrough = now;
  pet.notifications.snoozedUntil = null;
  assert.equal(reader().reaction, null, "unsnooze must not revive a forced nudge");
  pet.notifications.snoozedUntil = iso(80);
  pet.reaction = { ...pet.reaction, text: "green tests", event: "test_pass" };
  assert.equal(reader().reaction?.event, "test_pass");
  now = iso(80);
  assert.equal(reader().notifications.snoozed, false);
  assert.equal(reader().reaction, null);
});

test("restart mid-snooze and last-good settings survive unreadable state and expire by clock", () => {
  const pet = defaultState(iso(0));
  pet.notifications = { nagIntensity: "gentle", snoozedUntil: iso(100) };
  let now = iso(90);
  let result: StateReadResult = { ok: true, state: pet };
  const reader = createCompanionReader(() => result, () => now, () => ({ ok: true, events: events(100) }));
  assert.equal(reader().reaction, null);
  assert.equal(reader().notifications.remainingMinutes, 10);
  result = { ok: false, reason: "unreadable", state: defaultState() };
  now = iso(95);
  assert.equal(reader().notifications.nagIntensity, "gentle");
  assert.equal(reader().notifications.remainingMinutes, 5);
  now = iso(100);
  assert.equal(reader().notifications.snoozed, false);
  assert.equal(reader().reaction, null);
});

test("persisted nudges stay consumed after restart and first read after expiry", () => {
  const pet = defaultState(iso(0));
  pet.notifications = { nagIntensity: "normal", snoozedUntil: iso(60) };
  pet.reaction = { text: "muted grass", face: "", event: "long_session", setAt: iso(59.5), ttlSeconds: 90 };
  const reader = () => createCompanionReader(() => ({ ok: true, state: pet }), () => iso(60.5), () => ({ ok: true, events: [] }));
  assert.equal(reader()().reaction, null, "deadline also consumes nudges written during snooze without observing it");
  pet.notifications = { nagIntensity: "normal", snoozedUntil: null, dismissedThrough: iso(60) };
  assert.equal(reader()().reaction, null, "durable unsnooze cutoff survives a new reader");
  pet.reaction.setAt = iso(60.25);
  assert.equal(reader()().reaction?.event, "long_session", "new post-unsnooze nudges still work");
  pet.reaction.event = "test_pass";
  pet.reaction.setAt = iso(59.5);
  assert.equal(reader()().reaction?.event, "test_pass");
});

test("intensity changes first display without changing debt or pet state", () => {
  const activity = events(50);
  const pet = defaultState(iso(0));
  pet.notifications = { nagIntensity: "gentle", snoozedUntil: null };
  const gentle = createCompanionReader(() => ({ ok: true, state: pet }), () => iso(50), () => ({ ok: true, events: activity }));
  const g = gentle();
  assert.equal(g.reaction, null);
  pet.notifications.nagIntensity = "persistent";
  const before = structuredClone(pet);
  const p = gentle();
  assert.equal(p.reaction?.event, "long_session");
  assert.deepEqual(p.screenDebt, g.screenDebt);
  assert.deepEqual(pet, before);
});

test("debt accounting is identical across all presentation policies, snooze, breaks and recoveries", () => {
  const activity = [...events(180), ...events(60).map(e => ({ ...e, t: new Date(Date.parse(e.t) + 250 * 60_000).toISOString() }))];
  const pet = defaultState(iso(0));
  pet.screenDebt = addRecovery(defaultScreenDebt(iso(0)), { id: recoveryId("outdoor-test"), at: iso(170), minutes: 20, kind: "outdoor" }, iso(180));
  pet.screenDebt = creditWorkouts(pet.screenDebt, [{ id: "workout-test", date: iso(250), durationMin: 20, sport: "run" }], "garmin", iso(300));
  const outputs: unknown[] = [];
  for (const nagIntensity of ["gentle", "normal", "persistent"] as const) {
    for (const snoozedUntil of [null, iso(1000)]) {
      pet.notifications = { nagIntensity, snoozedUntil };
      const before = structuredClone(pet);
      let now = iso(0);
      const reader = createCompanionReader(() => ({ ok: true, state: pet }), () => now, () => ({ ok: true, events: activity }));
      const scores = [60, 120, 180, 195, 225, 300, 360].map(minute => { now = iso(minute); return reader().screenDebt; });
      outputs.push(scores);
      assert.deepEqual(pet, before);
    }
  }
  for (const scores of outputs) assert.deepEqual(scores, outputs[0]);
});
