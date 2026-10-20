import { test } from "node:test";
import assert from "node:assert/strict";
import { createSessionReminder } from "../src/local-activity/reminder.ts";
import { createConcernReminder } from "../src/screen-debt/concern.ts";
import type { CodingTelemetry } from "../src/local-activity/derive.ts";

const base = Date.parse("2026-10-15T10:00:00Z");
const at = (minute: number) => base + minute * 60_000;
const coding = (minute: number, session = "session-a"): CodingTelemetry => ({
  active: true, sessionStartAt: session, lastActivityAt: new Date(at(minute)).toISOString(),
  codingMinutesToday: minute, currentCodingSessionMinutes: minute, minutesSinceLastBreak: minute,
});

for (const [intensity, first] of [["gentle", 90], ["normal", 60], ["persistent", 45]] as const) {
  test(`${intensity} session threshold is exact; live bubble expires at 90 seconds`, () => {
    const remind = createSessionReminder(undefined, () => 0);
    const options = { intensity };
    assert.equal(remind(coding(first - 0.001), "earnest", at(first - 0.001), options), null);
    const live = remind(coding(first), "earnest", at(first), options);
    assert.equal(live?.event, "long_session");
    assert.equal(live?.setAtMs, at(first));
    assert.deepEqual(remind(coding(first + 1), "earnest", at(first) + 89_999, options), live);
    assert.equal(remind(coding(first + 1.5), "earnest", at(first) + 90_000, options), null);
    if (intensity !== "persistent") assert.equal(remind(coding(1000), "earnest", at(1000), options), null);
  });
}

test("default normal and explicit numeric thresholds preserve the original API", () => {
  const normal = createSessionReminder();
  assert.equal(normal(coding(59), "chill", at(59)), null);
  assert.ok(normal(coding(60), "chill", at(60)));
  const custom = createSessionReminder(12, () => 0);
  assert.equal(custom(coding(11), "chill", at(11)), null);
  assert.ok(custom(coding(12), "chill", at(12)));
  assert.equal(custom(coding(200), "chill", at(200)), null);
});

test("persistent repeats exactly 30 minutes after the last observed opportunity without backlog", () => {
  const remind = createSessionReminder();
  const options = { intensity: "persistent" as const };
  assert.ok(remind(coding(45), "earnest", at(45), options));
  assert.equal(remind(coding(74), "earnest", at(75) - 1, options), null);
  assert.equal(remind(coding(75), "earnest", at(75), options)?.setAtMs, at(75));
  assert.equal(remind(coding(300), "earnest", at(300), options)?.setAtMs, at(300));
  assert.equal(remind(coding(302), "earnest", at(302), options), null);
  assert.equal(remind(coding(329), "earnest", at(330) - 1, options), null);
  assert.ok(remind(coding(330), "earnest", at(330), options));
});

test("snooze clears session bubbles and consumes first and repeated opportunities", () => {
  const remind = createSessionReminder();
  const options = { intensity: "persistent" as const };
  assert.equal(remind(coding(45), "chill", at(45), { ...options, snoozed: true }), null);
  assert.equal(remind(coding(46), "chill", at(46), options), null);
  assert.ok(remind(coding(75), "chill", at(75), options));
  assert.equal(remind(coding(75), "chill", at(75) + 1, { ...options, snoozed: true }), null);
  assert.equal(remind(coding(76), "chill", at(76), options), null);
  assert.equal(remind(coding(105), "chill", at(105), { ...options, snoozed: true }), null);
  assert.equal(remind(coding(106), "chill", at(106), options), null);
  assert.ok(remind(coding(135), "chill", at(135), options));
  const normal = createSessionReminder();
  assert.equal(normal(coding(60), "chill", at(60), { snoozed: true }), null);
  assert.equal(normal(coding(500), "chill", at(500)), null);
});

test("session intensity changes preserve history, use first threshold only before first opportunity", () => {
  const remind = createSessionReminder();
  assert.equal(remind(coding(59), "earnest", at(59), { intensity: "gentle" }), null);
  assert.ok(remind(coding(60), "earnest", at(60)));
  assert.equal(remind(coding(61), "earnest", at(61), { intensity: "gentle" }), null);
  assert.equal(remind(coding(90), "earnest", at(90), { intensity: "gentle" }), null);
  assert.equal(remind(coding(90), "earnest", at(90), { intensity: "persistent" })?.setAtMs, at(90));
  assert.equal(remind(coding(90), "earnest", at(90) + 1), null, "repeat is ineligible under normal");
  assert.equal(remind(coding(91), "earnest", at(91), { intensity: "persistent" }), null);
  assert.ok(remind(coding(120), "earnest", at(120), { intensity: "persistent" }));
});

test("inactive/null activity clears live without resetting history; active new session resets", () => {
  const remind = createSessionReminder();
  assert.ok(remind(coding(60), "earnest", at(60)));
  assert.equal(remind(null, "earnest", at(60) + 1), null);
  assert.equal(remind(coding(61), "earnest", at(61)), null);
  assert.equal(remind({ ...coding(61), active: false }, "earnest", at(61)), null);
  assert.equal(remind({ ...coding(61), sessionStartAt: null }, "earnest", at(61)), null);
  assert.equal(remind(coding(59, "session-b"), "earnest", at(120)), null);
  assert.ok(remind(coding(60, "session-b"), "earnest", at(121)));
});

test("backward clock cannot produce catchup bursts or move the repeat schedule backward", () => {
  const remind = createSessionReminder();
  const options = { intensity: "persistent" as const };
  assert.ok(remind(coding(45), "earnest", at(45), options));
  assert.equal(remind(coding(20), "earnest", at(20), options), null);
  assert.equal(remind(coding(74), "earnest", at(74), options), null);
  assert.ok(remind(coding(75), "earnest", at(75), options));
  assert.equal(remind(coding(44), "earnest", at(44), options), null);
  assert.equal(remind(coding(104), "earnest", at(104), options), null);
  assert.ok(remind(coding(105), "earnest", at(105), options));
});

for (const intensity of ["gentle", "normal", "persistent"] as const) {
  test(`${intensity} concern eligibility, no same-band repeats, and NORMAL recovery`, () => {
    const options = { intensity };
    const concern = createConcernReminder();
    assert.equal(concern(0, "earnest", at(0), options), null);
    assert.equal(concern(34.999, "earnest", at(1), options), null);
    assert.equal(concern(35, "earnest", at(2), options)?.event ?? null,
      intensity === "gentle" ? null : "debt_concerning");
    assert.equal(concern(59.999, "earnest", at(4), options), null);
    assert.equal(concern(60, "earnest", at(5), options)?.event, "debt_degraded");
    assert.equal(concern(79.999, "earnest", at(7), options), null);
    assert.equal(concern(80, "earnest", at(8), options)?.event, "debt_critical");
    assert.equal(concern(100, "earnest", at(1000), options), null);
    assert.equal(concern(60, "earnest", at(1001), options), null, "partial recovery is silent");
    assert.equal(concern(0, "earnest", at(1002), options)?.event, "debt_normal");
    assert.equal(concern(0, "earnest", at(1004), options), null);
  });
}

test("concern TTL is exactly 90 seconds and null score clears without forgetting previous band", () => {
  const concern = createConcernReminder();
  assert.equal(concern(null, "chill", base), null);
  const live = concern(60, "chill", base);
  assert.ok(live);
  assert.deepEqual(concern(60, "chill", base + 89_999), live);
  assert.equal(concern(60, "chill", base + 90_000), null);
  assert.ok(concern(80, "chill", at(2)));
  assert.equal(concern(null, "chill", at(2) + 1), null);
  assert.equal(concern(80, "chill", at(2) + 2), null);
});

test("snoozed concerns consume escalation and recovery transitions without replay", () => {
  const concern = createConcernReminder();
  assert.ok(concern(35, "sarcastic", at(0)));
  assert.equal(concern(35, "sarcastic", at(0) + 1, { snoozed: true }), null);
  assert.equal(concern(35, "sarcastic", at(0) + 2), null);
  assert.equal(concern(60, "sarcastic", at(1), { snoozed: true }), null);
  assert.equal(concern(60, "sarcastic", at(2)), null);
  assert.ok(concern(80, "sarcastic", at(3)));
  assert.equal(concern(0, "sarcastic", at(4), { snoozed: true }), null);
  assert.equal(concern(0, "sarcastic", at(5)), null);
});

test("concern policy changes clear ineligible live and do not replay consumed bands", () => {
  const concern = createConcernReminder();
  assert.ok(concern(35, "earnest", at(0)));
  assert.equal(concern(35, "earnest", at(0) + 1, { intensity: "gentle" }), null);
  assert.equal(concern(35, "earnest", at(0) + 2), null);
  assert.ok(concern(60, "earnest", at(1), { intensity: "gentle" }));
  assert.ok(concern(60, "earnest", at(1) + 1, { intensity: "persistent" }));
  const suppressed = createConcernReminder();
  assert.equal(suppressed(35, "earnest", at(0), { intensity: "gentle" }), null);
  assert.equal(suppressed(35, "earnest", at(1), { intensity: "normal" }), null);
  assert.equal(suppressed(0, "earnest", at(2), { intensity: "gentle" })?.event, "debt_normal");
});
