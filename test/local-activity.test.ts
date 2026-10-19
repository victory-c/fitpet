import { test } from "node:test";
import assert from "node:assert/strict";
import { deriveCodingTelemetry, localDayStart, toSessions } from "../src/local-activity/derive.ts";
import { classifyHook } from "../src/local-activity/classify.ts";
import { createSessionReminder } from "../src/local-activity/reminder.ts";
import { createCompanionReader } from "../src/desktop/activity-snapshot.ts";
import { defaultState } from "../src/state.ts";
import type { ActivityEvent, ActivityReadResult } from "../src/local-activity/log.ts";

const start = Date.parse("2026-10-15T10:00:00Z");
const at = (minute: number) => new Date(start + minute * 60_000);
const event = (minute: number): ActivityEvent => ({ t: at(minute).toISOString(), kind: "edit" });
const continuous = [0, 10, 20, 30, 40, 50, 59].map(event);

test("session derivation sorts, ignores future events, and breaks at exactly 15 minutes", () => {
  const sessions = toSessions([event(30), event(0), event(10), event(25), event(100)], at(40).getTime());
  assert.equal(sessions.length, 2);
  assert.equal(sessions[1]!.start, at(25).getTime());
  assert.equal(deriveCodingTelemetry([event(0)], at(14)).active, true);
  assert.equal(deriveCodingTelemetry([event(0)], at(15)).active, false);
  assert.equal(deriveCodingTelemetry([], at(15)).lastActivityAt, null);
});

test("current session uses floor minutes; daily totals clip midnight and stop only records activity", () => {
  const events = [event(-5), event(5), { t: at(10).toISOString(), kind: "stop" as const }];
  const d = deriveCodingTelemetry(events, at(12), { dayStartMs: start, tailMinutes: 0 });
  assert.equal(d.currentCodingSessionMinutes, 17);
  assert.equal(d.codingMinutesToday, 10);
  assert.equal(d.minutesSinceLastBreak, 17);
  assert.equal(deriveCodingTelemetry(continuous, new Date(at(60).getTime() - 1)).currentCodingSessionMinutes, 59);
  const day = new Date(); day.setHours(12, 30, 0, 0);
  assert.equal(new Date(localDayStart(day)).getHours(), 0);
});

test("classification reuses FitPet reactions without requiring text or session identifiers", () => {
  assert.equal(classifyHook({ hook_event_name: "UserPromptSubmit" }), "prompt");
  assert.equal(classifyHook({ hook_event_name: "PostToolUse", tool_name: "Read" }), "tool");
  assert.equal(classifyHook({ hook_event_name: "PostToolUse", tool_name: "Write" }), "edit");
  assert.equal(classifyHook({ hook_event_name: "PostToolUseFailure", tool_name: "Bash", tool_input: { command: "npm test" } }), "test_fail");
  assert.equal(classifyHook({ hook_event_name: "Notification" }), null);
});

test("reminder fires at threshold, expires, does not repeat, and re-arms for a new session", () => {
  const remind = createSessionReminder(60, () => 0);
  const telemetry = (min: number) => deriveCodingTelemetry(continuous, at(min));
  assert.equal(remind(telemetry(59), "sarcastic", at(59).getTime()), null);
  const first = remind(telemetry(60), "sarcastic", at(60).getTime());
  assert.equal(first?.event, "long_session");
  assert.match(first!.text, /grass/i);
  assert.deepEqual(remind(telemetry(61), "sarcastic", at(61).getTime()), first);
  assert.equal(remind(telemetry(62), "sarcastic", at(62).getTime()), null);
  assert.equal(remind(telemetry(63), "sarcastic", at(63).getTime()), null);
  assert.equal(remind(null, "sarcastic", at(63).getTime()), null);
  assert.equal(remind(telemetry(63), "sarcastic", at(63).getTime()), null);
  const later = Array.from({ length: 7 }, (_, i) => event(90 + i * 10));
  assert.ok(remind(deriveCodingTelemetry(later, at(150)), "earnest", at(150).getTime()));
});

test("desktop clock triggers reminder without new events, overlays edits, and never mutates fitness", () => {
  const pet = defaultState(at(0).toISOString());
  let now = at(59).toISOString();
  let log: ActivityReadResult = { ok: true, events: continuous };
  const before = structuredClone(pet);
  const reader = createCompanionReader(() => ({ ok: true, state: pet }), () => now, () => log);
  assert.equal(reader().coding?.currentCodingSessionMinutes, 59);
  now = at(60).toISOString();
  assert.equal(reader().reaction?.event, "long_session");
  pet.reaction = { text: "edit quip", event: "edit", face: "", setAt: now, ttlSeconds: 90 };
  assert.equal(reader().reaction?.event, "long_session");
  now = at(74).toISOString();
  assert.equal(reader().coding?.active, false);
  assert.equal(reader().reaction, null);
  log = { ok: false, reason: "unreadable" };
  assert.equal(reader().activityStatus, "unreadable");
  assert.equal(reader().coding, null);
  assert.equal(pet.vitality, before.vitality);
  assert.equal(pet.healthyDays, before.healthyDays);
  assert.equal(pet.lastTickAt, before.lastTickAt);
});