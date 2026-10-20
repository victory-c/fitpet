import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync, rmSync, existsSync, unlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parseSnooze, sanitizeNotifications, notificationStatus, isNagIntensity, isNudge } from "../src/notifications.ts";
import { defaultState, sanitizeState } from "../src/state.ts";
import { contextMenuTemplate, createContextMenuTemplate } from "../src/desktop/context-menu.ts";

const now = new Date("2026-01-31T23:59:00.123Z");

test("snooze parser accepts whole minutes, m/h, off and exact Date boundaries", () => {
  for (const [input, minutes] of [["1", 1], ["30", 30], ["60m", 60], ["2h", 120]] as const) {
    assert.equal(parseSnooze(input, now), new Date(+now + minutes * 60_000).toISOString());
  }
  assert.equal(parseSnooze("off", now), null);
  const limit = 8_640_000_000_000_000;
  assert.equal(parseSnooze("1", new Date(limit - 60_000)), new Date(limit).toISOString());
  assert.throws(() => parseSnooze("1", new Date(limit - 59_999)), /out of range/);
  assert.equal(parseSnooze("144000000000", new Date(0)), new Date(limit).toISOString());
  assert.throws(() => parseSnooze("144000000001", new Date(0)), /out of range/);
});

test("snooze parser rejects malformed, fractional, nonpositive and overflowing durations", () => {
  for (const input of ["", "0", "0m", "-1", "+1", "01", "1.5", "1e3", " 1", "1 ", "1M", "2H", "1d", "1min", "1 h", "Tomorrow", "OFF", "Infinity", "NaN", "9".repeat(400)]) {
    assert.throws(() => parseSnooze(input, now), undefined, input);
  }
  assert.throws(() => parseSnooze("1", new Date(NaN)), /out of range/);
});

test("tomorrow is local midnight across DST, leap day, month and year boundaries", () => {
  const module = new URL("../src/notifications.ts", import.meta.url).href;
  const cases = [
    ["America/New_York", "2026-03-08T00:30:00-05:00", "2026-03-09T04:00:00.000Z"],
    ["America/New_York", "2026-11-01T00:30:00-04:00", "2026-11-02T05:00:00.000Z"],
    ["UTC", "2024-02-28T23:59:59Z", "2024-02-29T00:00:00.000Z"],
    ["UTC", "2024-02-29T23:59:59Z", "2024-03-01T00:00:00.000Z"],
    ["Asia/Tokyo", "2026-12-31T23:59:59+09:00", "2026-12-31T15:00:00.000Z"],
  ];
  for (const [TZ, date, expected] of cases) {
    const out = execFileSync(process.execPath, ["--input-type=module", "-e", `import {parseSnooze} from ${JSON.stringify(module)}; console.log(parseSnooze('tomorrow',new Date(${JSON.stringify(date)})))`], { env: { ...process.env, TZ }, encoding: "utf8" });
    assert.equal(out.trim(), expected, `${TZ}: ${date}`);
  }
});

test("notification sanitation defaults invalid values and normalizes valid dates", () => {
  for (const raw of [undefined, null, [], 1, "bad", {}, { nagIntensity: "loud", snoozedUntil: "bad" }, { nagIntensity: 1, snoozedUntil: 42 }]) {
    assert.deepEqual(sanitizeNotifications(raw), { nagIntensity: "normal", snoozedUntil: null });
  }
  for (const nagIntensity of ["gentle", "normal", "persistent"]) {
    assert.equal(isNagIntensity(nagIntensity), true);
    assert.deepEqual(sanitizeNotifications({ nagIntensity, snoozedUntil: "2026-01-01T01:00:00+01:00", extra: true }), { nagIntensity, snoozedUntil: "2026-01-01T00:00:00.000Z" });
  }
  for (const value of [null, undefined, "NORMAL", "", 1]) assert.equal(isNagIntensity(value), false);
});

test("schema 1/2 migration adds settings without losing identity, growth, fitness, reaction or debt", () => {
  const pet = defaultState(now.toISOString(), { name: "Keeper", species: "sprout", personality: "chill" });
  Object.assign(pet, { stage: "adult", ageDays: 99, healthyDays: 45, lastHealthyDayCounted: "2026-01-30", vitality: 87 });
  pet.reaction = { event: "test_pass", text: "keep", face: ":)", setAt: now.toISOString(), ttlSeconds: 60 };
  pet.screenDebt!.recoveries.push({ id: "a".repeat(64), kind: "outdoor", at: now.toISOString(), minutes: 30 });
  const { notifications: _, schemaVersion: __, ...rest } = pet;
  for (const schemaVersion of [1, 2]) {
    const raw = { ...rest, schemaVersion };
    const migrated = sanitizeState(raw);
    assert.deepEqual(migrated, { ...rest, schemaVersion: 3, notifications: { nagIntensity: "normal", snoozedUntil: null } });
    assert.equal("notifications" in raw, false, "migration must not mutate its input");
  }
  assert.equal(sanitizeState({ ...pet, schemaVersion: 9 }).schemaVersion, 9);
  assert.equal(defaultState().schemaVersion, 3);
});

test("status expiry is exclusive, rounds remaining minutes up, and classifies only nudges", () => {
  const settings = { nagIntensity: "normal" as const, snoozedUntil: now.toISOString() };
  for (const [delta, snoozed, remainingMinutes] of [[-60_001, true, 2], [-60_000, true, 1], [-1, true, 1], [0, false, 0], [1, false, 0]] as const) {
    assert.deepEqual(notificationStatus(settings, +now + delta), { ...settings, snoozed, remainingMinutes });
  }
  assert.equal(notificationStatus({ ...settings, snoozedUntil: null }, +now).snoozed, false);
  for (const event of ["long_session", "debt_concern", "debt_high"]) assert.equal(isNudge(event), true);
  for (const event of ["test_pass", "test_fail", "error", "fed", "evolved", "edit", "long_session_extra"]) assert.equal(isNudge(event), false);
});

test("context menu labels, radio choices, enabled boundary and every callback", () => {
  const changes: unknown[] = [];
  for (const intensity of ["gentle", "normal", "persistent"] as const) {
    const menu = contextMenuTemplate({ nagIntensity: intensity, snoozedUntil: now.toISOString() }, c => changes.push(c), +now - 1);
    assert.deepEqual(menu.map(i => i.label ?? i.type), ["Snooze 30 min", "Snooze 1 hour", "Snooze until tomorrow", "Unsnooze", "separator", "Nag intensity"]);
    assert.equal(menu[3]!.enabled, true);
    const radios = menu[5]!.submenu as typeof menu;
    assert.deepEqual(radios.map(i => [i.label, i.type, i.checked]), ["gentle", "normal", "persistent"].map(v => [v[0]!.toUpperCase() + v.slice(1), "radio", v === intensity]));
    if (intensity === "normal") for (const item of [...menu.slice(0, 4), ...radios]) (item.click as () => void)();
  }
  assert.deepEqual(changes, ["30", "1h", "tomorrow", "off"].map(value => ({ kind: "snooze", value })).concat(["gentle", "normal", "persistent"].map(value => ({ kind: "nag", value }))));
  for (const snoozedUntil of [null, now.toISOString(), new Date(+now - 1).toISOString()]) assert.equal(contextMenuTemplate({ nagIntensity: "normal", snoozedUntil }, () => {}, +now)[3]!.enabled, false);
});

test("createContextMenuTemplate uses locked latest-state writer, refreshes on success and reports errors", () => {
  const home = mkdtempSync(join(tmpdir(), "fitpet-menu-"));
  const previous = process.env.FITPET_HOME;
  process.env.FITPET_HOME = home;
  try {
    const path = join(home, "state.json");
    const pet = defaultState(now.toISOString(), { name: "Original" });
    writeFileSync(path, JSON.stringify(pet));
    let refreshes = 0;
    const errors: unknown[] = [];
    const menu = createContextMenuTemplate(() => { refreshes++; }, e => errors.push(e));
    const latest = { ...pet, pet: { ...pet.pet, name: "Updated elsewhere" }, healthyDays: 17 };
    writeFileSync(path, JSON.stringify(latest));
    (menu[0]!.click as () => void)();
    const saved = JSON.parse(readFileSync(path, "utf8"));
    assert.deepEqual({ ...saved, notifications: latest.notifications }, latest);
    assert.ok(Date.parse(saved.notifications.snoozedUntil) > Date.now());
    assert.equal(refreshes, 1);
    assert.deepEqual(errors, []);
    assert.equal(existsSync(join(home, "state.lock")), false);
    const before = readFileSync(path, "utf8");
    const lock = join(home, "state.lock");
    writeFileSync(lock, JSON.stringify({ pid: process.pid }));
    (menu[1]!.click as () => void)();
    assert.equal(refreshes, 1);
    assert.match(String(errors.shift()), /Timed out acquiring/);
    assert.equal(readFileSync(path, "utf8"), before);
    assert.equal(existsSync(lock), true);
    unlinkSync(lock);
    writeFileSync(path, "{broken");
    (menu[0]!.click as () => void)();
    assert.equal(refreshes, 1);
    assert.match(String(errors[0]), /untouched/);
    assert.equal(readFileSync(path, "utf8"), "{broken");
    assert.throws(() => createContextMenuTemplate(() => {}, () => {}), /untouched/);
    assert.equal(existsSync(join(home, "state.lock")), false);
    unlinkSync(path);
    const fresh = createContextMenuTemplate(() => { refreshes++; }, e => errors.push(e));
    assert.equal(fresh[3]!.enabled, false);
    assert.equal(existsSync(path), false, "opening menu must not create a pet");
    const radios = fresh[5]!.submenu as typeof fresh;
    (radios[0]!.click as () => void)();
    assert.equal(JSON.parse(readFileSync(path, "utf8")).notifications.nagIntensity, "gentle");
    assert.equal(refreshes, 2);
  } finally {
    if (previous === undefined) delete process.env.FITPET_HOME; else process.env.FITPET_HOME = previous;
    rmSync(home, { recursive: true, force: true });
  }
});
