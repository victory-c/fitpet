import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

test("state save/load round-trips; missing or corrupt yields a safe default", async () => {
  const dir = mkdtempSync(join(tmpdir(), "fitpet-test-"));
  process.env.FITPET_HOME = dir;
  // fitpetHome() reads the env at call-time, so importing after setting it is fine.
  const { loadState, saveState, defaultState, statePath } = await import("../src/state.ts");

  // missing file -> default egg
  const fresh = loadState();
  assert.equal(fresh.stage, "egg");
  assert.equal(fresh.schemaVersion, 1);

  // round trip
  const pet = defaultState();
  pet.vitality = 77;
  saveState(pet);
  assert.ok(existsSync(statePath()));
  assert.equal(loadState().vitality, 77);

  // corrupt file -> default, never throws
  writeFileSync(statePath(), "{ this is not json", "utf8");
  assert.equal(loadState().stage, "egg");

  rmSync(dir, { recursive: true, force: true });
  delete process.env.FITPET_HOME;
});

test("loadState clamps impossible persisted values into range", async () => {
  const dir = mkdtempSync(join(tmpdir(), "fitpet-clamp-"));
  process.env.FITPET_HOME = dir;
  const { loadState, saveState, defaultState } = await import("../src/state.ts");

  const tooHigh = defaultState();
  tooHigh.vitality = 999999;
  tooHigh.fitness.rollingScore = -50;
  tooHigh.healthyDays = -3;
  saveState(tooHigh); // saved as-is; sanitation happens on load
  const a = loadState();
  assert.equal(a.vitality, 100, "vitality clamps to 100");
  assert.equal(a.fitness.rollingScore, 0, "rollingScore clamps to 0");
  assert.equal(a.healthyDays, 0, "negative healthyDays floors to 0");

  const negative = defaultState();
  negative.vitality = -50;
  saveState(negative);
  assert.equal(loadState().vitality, 0, "negative vitality clamps to 0");

  rmSync(dir, { recursive: true, force: true });
  delete process.env.FITPET_HOME;
});
