import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

test("desktop snapshot keeps last good state across transient unreadable state and does not write defaults", async () => {
  const dir = mkdtempSync(join(tmpdir(), "fitpet-snapshot-"));
  process.env.FITPET_HOME = dir;

  const { defaultState, saveState, statePath } = await import("../src/state.ts");
  const { createSnapshotReader } = await import("../src/desktop/snapshot.ts");

  const good = defaultState("2026-06-20T00:00:00.000Z", { name: "Steady" });
  good.vitality = 88;
  good.fitness.rollingScore = 91;
  good.fitness.lastSport = "run";
  saveState(good);

  const nextSnapshot = createSnapshotReader();
  const first = nextSnapshot();
  assert.equal(first.name, "Steady");
  assert.equal(first.vitality, 88);
  assert.equal(first.rollingScore, 91);
  assert.equal(first.lastSport, "run");

  writeFileSync(statePath(), "{ half-written", "utf8");
  const second = nextSnapshot();

  assert.deepEqual(second, first, "transient read failure should keep the in-memory last good pet");
  assert.equal(readFileSync(statePath(), "utf8"), "{ half-written", "transient read failure must not write defaults to disk");

  rmSync(dir, { recursive: true, force: true });
  delete process.env.FITPET_HOME;
});
