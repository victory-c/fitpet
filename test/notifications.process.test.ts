import { test } from "node:test";
import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync, rmSync, existsSync, unlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { defaultState } from "../src/state.ts";

const CLI = fileURLToPath(new URL("../src/cli.ts", import.meta.url));
const HOOK = fileURLToPath(new URL("../src/hooks/post-tool-use.ts", import.meta.url));
const tempHome = () => mkdtempSync(join(tmpdir(), "fitpet-notifications-"));
const run = (home: string, args: string[]) => spawnSync(process.execPath, [CLI, ...args], { env: { ...process.env, FITPET_HOME: home, TZ: "UTC" }, encoding: "utf8", timeout: 10_000 });
const load = (home: string) => JSON.parse(readFileSync(join(home, "state.json"), "utf8"));
function seed(home: string) {
  const state = defaultState("2025-01-01T00:00:00.000Z", { name: "Never reset me", species: "sprout", personality: "chill" });
  Object.assign(state, { stage: "adult", ageDays: 123, healthyDays: 50, lastHealthyDayCounted: "2025-01-01", vitality: 83 });
  state.reaction = { event: "test_pass", text: "still here", face: ":)", setAt: "2025-01-01T00:00:00.000Z", ttlSeconds: 10 };
  state.screenDebt!.recoveries.push({ id: "b".repeat(64), at: "2025-01-01T00:00:00.000Z", minutes: 10, kind: "outdoor" });
  writeFileSync(join(home, "state.json"), JSON.stringify(state));
  return state;
}
function start(home: string, script: string, args: string[], input = "") {
  const child = spawn(process.execPath, [script, ...args], { env: { ...process.env, FITPET_HOME: home }, stdio: ["pipe", "pipe", "pipe"] });
  let stderr = "";
  child.stderr.on("data", chunk => stderr += chunk);
  child.stdin.end(input);
  const done = new Promise<void>((resolve, reject) => {
    child.on("error", reject);
    child.on("close", code => code === 0 ? resolve() : reject(new Error(`${args.join(" ")}: ${code}: ${stderr}`)));
  });
  return { child, done };
}

test("CLI every snooze form and nag intensity updates only settings, not tick/reaction/growth/debt", () => {
  const home = tempHome();
  try {
    const original = seed(home);
    for (const [args, minutes] of [[ ["snooze", "30"], 30 ], [["snooze", "15m"], 15], [["snooze", "2h"], 120]] as const) {
      const before = Date.now();
      const result = run(home, [...args]);
      assert.equal(result.status, 0, result.stderr);
      const saved = load(home);
      assert.ok(Date.parse(saved.notifications.snoozedUntil) >= before + minutes * 60_000);
      assert.ok(Date.parse(saved.notifications.snoozedUntil) <= Date.now() + minutes * 60_000);
      assert.match(result.stdout, /snoozed · \d+ min remaining · until/);
      assert.deepEqual({ ...saved, notifications: original.notifications }, original);
    }
    const tomorrow = run(home, ["snooze", "tomorrow"]);
    assert.equal(tomorrow.status, 0, tomorrow.stderr);
    const expiry = new Date(load(home).notifications.snoozedUntil);
    assert.equal(expiry.getUTCHours() + expiry.getUTCMinutes() + expiry.getUTCSeconds() + expiry.getUTCMilliseconds(), 0);
    assert.ok(+expiry > Date.now() && +expiry <= Date.now() + 86_400_000);
    const snoozedUntil = expiry.toISOString();
    const dismissedThrough = load(home).notifications.dismissedThrough;
    for (const intensity of ["gentle", "normal", "persistent"]) {
      const result = run(home, ["nag", intensity]);
      assert.equal(result.status, 0, result.stderr);
      assert.match(result.stdout, new RegExp(`nag ${intensity} · snoozed`));
      assert.deepEqual(load(home).notifications, { nagIntensity: intensity, snoozedUntil, dismissedThrough });
      assert.deepEqual({ ...load(home), notifications: original.notifications }, original);
    }
    assert.match(run(home, ["snooze", "off"]).stdout, /nag persistent · snooze off/);
    assert.equal(load(home).notifications.nagIntensity, "persistent");
    assert.equal(load(home).notifications.snoozedUntil, null);
    assert.ok(Date.parse(load(home).notifications.dismissedThrough) >= Date.parse(dismissedThrough));
    assert.equal(existsSync(join(home, "state.lock")), false);
  } finally { rmSync(home, { recursive: true, force: true }); }
});

test("CLI invalid values/arity/overflow never write existing or missing state", () => {
  const home = tempHome();
  const empty = tempHome();
  try {
    seed(home);
    const before = readFileSync(join(home, "state.json"), "utf8");
    for (const args of [["snooze"], ["nag"], ["snooze", "30", "extra"], ["nag", "normal", "extra"], ...["0", "-1", "1.5", "01", "2H", "garbage", "9".repeat(400)].map(v => ["snooze", v]), ...["loud", "NORMAL", "off"].map(v => ["nag", v])]) {
      for (const dir of [home, empty]) {
        const result = run(dir, args);
        assert.equal(result.status, 1, args.join(" "));
        assert.match(result.stderr, /usage:|out of range/);
        assert.equal(existsSync(join(dir, "state.lock")), false);
      }
      assert.equal(readFileSync(join(home, "state.json"), "utf8"), before);
      assert.equal(existsSync(join(empty, "state.json")), false);
    }
  } finally { for (const dir of [home, empty]) rmSync(dir, { recursive: true, force: true }); }
});

test("CLI protects corrupt, non-object and identity/growth-incomplete state byte for byte", () => {
  const home = tempHome();
  try {
    const complete = seed(home);
    for (const raw of ["{broken", "null", "[]", "{}", JSON.stringify({ vitality: 42 }), JSON.stringify({ ...complete, pet: { name: "Only name" } }), JSON.stringify({ ...complete, stage: undefined })]) {
      writeFileSync(join(home, "state.json"), raw);
      for (const args of [["snooze", "30"], ["snooze", "off"], ["nag", "gentle"]]) {
        const result = run(home, args);
        assert.equal(result.status, 1, raw);
        assert.match(result.stderr, /untouched/);
        assert.equal(readFileSync(join(home, "state.json"), "utf8"), raw);
        assert.equal(existsSync(join(home, "state.lock")), false);
      }
    }
  } finally { rmSync(home, { recursive: true, force: true }); }
});

test("CLI settings create missing pets, migrate schema 2, and status describes active/expired settings", () => {
  const home = tempHome();
  try {
    assert.equal(run(home, ["nag", "gentle"]).status, 0);
    assert.equal(load(home).schemaVersion, 3);
    assert.equal(load(home).notifications.nagIntensity, "gentle");
    const original = seed(home);
    const { notifications: _, ...old } = original;
    writeFileSync(join(home, "state.json"), JSON.stringify({ ...old, schemaVersion: 2 }));
    assert.equal(run(home, ["snooze", "30"]).status, 0);
    assert.deepEqual({ ...load(home), notifications: original.notifications }, original);
    assert.match(run(home, ["status"]).stdout, /nag normal · snoozed · \d+ min remaining · until/);
    const state = load(home);
    state.notifications = { nagIntensity: "persistent", snoozedUntil: "2000-01-01T00:00:00.000Z" };
    writeFileSync(join(home, "state.json"), JSON.stringify(state));
    assert.match(run(home, ["status"]).stdout, /nag persistent · snooze off/);
    assert.equal(load(home).notifications.snoozedUntil, "2000-01-01T00:00:00.000Z");
  } finally { rmSync(home, { recursive: true, force: true }); }
});

test("settings wait on a live lock, re-read latest state, and fail closed on lock timeout", async () => {
  const home = tempHome();
  try {
    const original = seed(home);
    const lock = join(home, "state.lock");
    writeFileSync(lock, JSON.stringify({ pid: process.pid }));
    const before = readFileSync(join(home, "state.json"), "utf8");
    const result = run(home, ["nag", "gentle"]);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /Timed out acquiring/);
    assert.equal(readFileSync(join(home, "state.json"), "utf8"), before);
    assert.equal(existsSync(lock), true, "must not steal the live owner's lock");
    const pending = start(home, CLI, ["nag", "persistent"]);
    await new Promise(resolve => setTimeout(resolve, 200));
    assert.equal(pending.child.exitCode, null);
    assert.equal(readFileSync(join(home, "state.json"), "utf8"), before);
    const latest = { ...original, healthyDays: 77, pet: { ...original.pet, name: "Latest locked writer" }, notifications: { nagIntensity: "normal", snoozedUntil: "2099-01-01T00:00:00.000Z" } };
    writeFileSync(join(home, "state.json"), JSON.stringify(latest));
    unlinkSync(lock);
    await pending.done;
    assert.deepEqual(load(home), { ...latest, notifications: { ...latest.notifications, nagIntensity: "persistent" } });
    assert.equal(existsSync(lock), false);
  } finally { rmSync(home, { recursive: true, force: true }); }
});

test("CLI settings render suppresses snoozed nudges but never test/error/fitness reactions", () => {
  const home = tempHome();
  try {
    const state = seed(home);
    for (const event of ["long_session", "test_pass", "test_fail", "error", "fed", "evolved"] as const) {
      state.reaction = { ...state.reaction!, event, text: `reaction-${event}` };
      writeFileSync(join(home, "state.json"), JSON.stringify(state));
      const result = run(home, ["snooze", "30"]);
      assert.equal(result.status, 0, result.stderr);
      if (event === "long_session") assert.doesNotMatch(result.stdout, /says:/);
      else assert.match(result.stdout, new RegExp(`says: "reaction-${event}"`));
      assert.deepEqual(load(home).reaction, state.reaction, "suppression is presentation only");
      const off = run(home, ["snooze", "off"]);
      assert.equal(off.status, 0, off.stderr);
      if (event === "long_session") assert.doesNotMatch(off.stdout, /says:/);
      else assert.match(off.stdout, new RegExp(`says: "reaction-${event}"`));
    }
  } finally { rmSync(home, { recursive: true, force: true }); }
});

test("concurrent CLI settings, hook reactions and outdoor recoveries preserve all updates", async () => {
  const home = tempHome();
  try {
    const now = new Date().toISOString();
    const pet = defaultState(now, { name: "Concurrent keeper" });
    pet.stage = "adult"; pet.healthyDays = 50;
    writeFileSync(join(home, "state.json"), JSON.stringify(pet));
    await Promise.all([
      start(home, CLI, ["snooze", "2h"]).done,
      start(home, CLI, ["nag", "persistent"]).done,
      start(home, CLI, ["outdoor", "10"]).done,
      start(home, CLI, ["outdoor", "15"]).done,
      start(home, HOOK, [], JSON.stringify({ tool_name: "Bash", tool_input: { command: "npm test" } })).done,
    ]);
    const saved = load(home);
    assert.deepEqual(saved.pet, pet.pet);
    assert.equal(saved.stage, "adult");
    assert.ok(saved.healthyDays >= 50);
    assert.equal(saved.notifications.nagIntensity, "persistent");
    assert.ok(Date.parse(saved.notifications.snoozedUntil) > Date.now() + 110 * 60_000);
    assert.equal(saved.reaction.event, "test_pass");
    assert.deepEqual(saved.screenDebt.recoveries.map((r: { minutes: number }) => r.minutes).sort((a: number, b: number) => a - b), [10, 15]);
    assert.equal(new Set(saved.screenDebt.recoveries.map((r: { id: string }) => r.id)).size, 2);
    assert.equal(existsSync(join(home, "state.lock")), false);
  } finally { rmSync(home, { recursive: true, force: true }); }
});
