import { test } from "node:test";
import assert from "node:assert/strict";
import { spawn, execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { defaultState } from "../src/state.ts";
import { computeScreenDebt } from "../src/screen-debt/score.ts";
import { readActivity } from "../src/local-activity/log.ts";
import { GarminSource } from "../src/sources/garmin.ts";

const cli = fileURLToPath(new URL("../src/cli.ts", import.meta.url));

test("concurrent real syncs and outdoor entries preserve credits, pet identity, and deduplication", async () => {
  const home = mkdtempSync(join(tmpdir(), "fitpet-debt-process-"));
  const env = { ...process.env, FITPET_HOME: home };
  const now = Date.now();
  const at = (minutes: number) => new Date(now + minutes * 60_000).toISOString();
  try {
    const pet = defaultState(at(-240), { name: "NeverOverwrite" });
    pet.stage = "adult"; pet.healthyDays = 30;
    writeFileSync(join(home, "state.json"), JSON.stringify(pet));
    writeFileSync(join(home, "activity.jsonl"), Array.from({ length: 19 }, (_, i) => JSON.stringify({ t: at(-180 + i * 10), kind: "edit" })).join("\n") + "\n");
    const payload = join(home, "workouts.json");
    writeFileSync(payload, JSON.stringify({ activities: [{ activity_id: "stable-1", start_time_gmt: at(-30), duration_seconds: 1200, type: "run" }] }));
    const run = (args: string[]) => new Promise<void>((resolve, reject) => {
      const child = spawn(process.execPath, [cli, ...args], { env, stdio: ["ignore", "pipe", "pipe"] });
      let error = ""; child.stderr.on("data", (chunk) => error += chunk);
      child.on("error", reject); child.on("close", (code) => code === 0 ? resolve() : reject(new Error(error)));
    });
    await Promise.all([
      run(["sync", "--source", "garmin", "--file", payload]),
      run(["sync", "--source", "garmin", "--file", payload]),
      run(["outdoor", "10"]), run(["outdoor", "10"]),
    ]);
    const saved = JSON.parse(readFileSync(join(home, "state.json"), "utf8"));
    assert.equal(saved.pet.name, "NeverOverwrite");
    assert.equal(saved.stage, "adult");
    assert.equal(saved.screenDebt.recoveries.filter((r: { kind: string }) => r.kind === "workout").length, 1);
    assert.equal(saved.screenDebt.recoveries.filter((r: { kind: string }) => r.kind === "outdoor").length, 2);
    assert.equal(existsSync(join(home, "state.lock")), false);
    const log = readActivity(join(home, "activity.jsonl")); assert.ok(log.ok);
    assert.ok(computeScreenDebt(log.events, saved.screenDebt, new Date()).score < 35);
    const bad = spawn(process.execPath, [cli, "outdoor", "-5"], { env, stdio: "ignore" });
    await new Promise<void>((resolve) => bad.on("close", (code) => { assert.equal(code, 1); resolve(); }));
    assert.equal(existsSync(join(home, "state.lock")), false, "invalid command releases lock in finally");
  } finally { rmSync(home, { recursive: true, force: true }); }
});

test("outdoor command leaves corrupted pet untouched", () => {
  const home = mkdtempSync(join(tmpdir(), "fitpet-debt-corrupt-"));
  try {
    writeFileSync(join(home, "state.json"), "{broken");
    assert.throws(() => execFileSync(process.execPath, [cli, "outdoor", "10"], { env: { ...process.env, FITPET_HOME: home }, stdio: "pipe" }));
    assert.equal(readFileSync(join(home, "state.json"), "utf8"), "{broken");
    assert.equal(existsSync(join(home, "state.lock")), false);
  } finally { rmSync(home, { recursive: true, force: true }); }
});

test("Garmin activity IDs survive normalization and GMT timestamps are accepted", () => {
  const snap = GarminSource.normalize({ activities: [{ activityId: 123, start_time_gmt: new Date().toISOString(), duration_seconds: 1200 }] });
  assert.equal(snap.activities[0]?.id, "123");
});