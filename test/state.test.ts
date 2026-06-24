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

test("readState classifies complete / partial / missing / corrupt", async () => {
  const dir = mkdtempSync(join(tmpdir(), "fitpet-classify-"));
  process.env.FITPET_HOME = dir;
  const { readState, defaultState, saveState, statePath, hasPetIdentity } = await import("../src/state.ts");

  assert.equal((readState() as { reason?: string }).reason, "missing", "no file = new pet");

  saveState(defaultState("2026-06-20T00:00:00.000Z", { name: "Real" }));
  assert.equal(readState().ok, true, "a full pet reads ok");

  writeFileSync(statePath(), JSON.stringify({ vitality: 42 }), "utf8");
  const partial = readState();
  assert.equal(partial.ok, false);
  assert.equal((partial as { reason: string }).reason, "partial", "parses but missing identity/growth = partial");

  writeFileSync(statePath(), "{ half-written", "utf8");
  assert.equal((readState() as { reason: string }).reason, "unreadable");

  // old-but-VALID: identity + stage present, growth COUNTERS missing -> ok (migratable, not partial)
  writeFileSync(
    statePath(),
    JSON.stringify({ pet: { name: "Old", bornAt: "2026-05-01T00:00:00.000Z" }, stage: "adult", vitality: 70 }),
    "utf8",
  );
  assert.equal(readState().ok, true, "old schema missing growth counters is migratable, not partial");

  assert.equal(hasPetIdentity({ vitality: 42 }), false);
  assert.equal(hasPetIdentity({ pet: { name: "x" }, stage: "adult" }), false, "missing bornAt -> suspect");
  assert.equal(hasPetIdentity({ pet: { name: "x", bornAt: "2026-05-01T00:00:00.000Z" }, stage: "adult" }), true);
  assert.equal(hasPetIdentity(JSON.parse(JSON.stringify(defaultState("2026-06-20T00:00:00.000Z")))), true);

  rmSync(dir, { recursive: true, force: true });
  delete process.env.FITPET_HOME;
});

test("loadState fills missing nested objects instead of returning a crashing partial state", async () => {
  const dir = mkdtempSync(join(tmpdir(), "fitpet-partial-"));
  process.env.FITPET_HOME = dir;
  const { loadState, statePath } = await import("../src/state.ts");

  writeFileSync(statePath(), JSON.stringify({ vitality: 42 }), "utf8");
  const s = loadState();
  assert.equal(s.vitality, 42);
  assert.equal(s.pet.name, "Pixel");
  assert.equal(s.fitness.rollingScore, 30);
  assert.equal(s.stage, "egg");
  assert.equal(s.reaction, null);

  rmSync(dir, { recursive: true, force: true });
  delete process.env.FITPET_HOME;
});

test("loadState sanitizes malformed nested fields while preserving valid values", async () => {
  const dir = mkdtempSync(join(tmpdir(), "fitpet-shape-"));
  process.env.FITPET_HOME = dir;
  const { loadState, statePath } = await import("../src/state.ts");

  writeFileSync(
    statePath(),
    JSON.stringify({
      pet: { name: "Patchy", species: "pixelcat", personality: "mystery", bornAt: "not a date" },
      vitality: 999,
      stage: "dragon",
      healthyDays: -10,
      fitness: { rollingScore: -5, windowDays: 0, source: 99, lastSport: "swim" },
      reaction: { event: "unknown", text: "bad", setAt: "2026-01-01T00:00:00.000Z", ttlSeconds: 90 },
    }),
    "utf8",
  );

  const s = loadState();
  assert.equal(s.pet.name, "Patchy");
  assert.equal(s.pet.species, "pixelcat");
  assert.equal(s.pet.personality, "earnest");
  assert.equal(s.vitality, 100);
  assert.equal(s.stage, "egg");
  assert.equal(s.healthyDays, 0);
  assert.equal(s.fitness.rollingScore, 0);
  assert.equal(s.fitness.windowDays, 7);
  assert.equal(s.fitness.source, null);
  assert.equal(s.fitness.lastSport, "swim");
  assert.equal(s.reaction, null);

  rmSync(dir, { recursive: true, force: true });
  delete process.env.FITPET_HOME;
});
