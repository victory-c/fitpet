// Process-level hook regression tests — spawn the real hook scripts the way Claude Code does.

import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const CLI = join(ROOT, "src", "cli.ts");
const SESSION_START = join(ROOT, "src", "hooks", "session-start.ts");
const STOP = join(ROOT, "src", "hooks", "stop.ts");

function resetPet(home: string): void {
  execFileSync("node", [CLI, "reset", "--name", "Precious"], { encoding: "utf8", env: { ...process.env, FITPET_HOME: home } });
}

function run(script: string, home: string, input = ""): string {
  return execFileSync("node", [script], { input, encoding: "utf8", env: { ...process.env, FITPET_HOME: home } });
}

test("SessionStart leaves an unreadable/corrupt state file untouched (never overwrites a real pet with a default)", () => {
  const home = mkdtempSync(join(tmpdir(), "fitpet-ss-"));
  try {
    execFileSync("node", [CLI, "reset", "--name", "Precious"], { encoding: "utf8", env: { ...process.env, FITPET_HOME: home } });
    const sp = join(home, "state.json");
    const corrupt = "{ half-written";
    writeFileSync(sp, corrupt, "utf8");

    run(SESSION_START, home); // must exit 0 (no throw) ...
    assert.equal(readFileSync(sp, "utf8"), corrupt, "...and must NOT replace the corrupt file with a default egg");
  } finally {
    rmSync(home, { recursive: true, force: true });
  }
});

test("SessionStart on a valid pet still advances and preserves identity", () => {
  const home = mkdtempSync(join(tmpdir(), "fitpet-ss2-"));
  try {
    execFileSync("node", [CLI, "reset", "--name", "Precious"], { encoding: "utf8", env: { ...process.env, FITPET_HOME: home } });
    run(SESSION_START, home);
    const s = JSON.parse(readFileSync(join(home, "state.json"), "utf8")) as { pet: { name: string } };
    assert.equal(s.pet.name, "Precious", "identity preserved across a normal SessionStart");
  } finally {
    rmSync(home, { recursive: true, force: true });
  }
});

test("the Stop hook does not persist a default over a partial state file", () => {
  const home = mkdtempSync(join(tmpdir(), "fitpet-stop-"));
  try {
    resetPet(home);
    const sp = join(home, "state.json");
    const partial = JSON.stringify({ vitality: 42 });
    writeFileSync(sp, partial, "utf8");
    run(STOP, home); // exits 0
    assert.equal(readFileSync(sp, "utf8"), partial, "Stop must leave a partial file untouched");
  } finally {
    rmSync(home, { recursive: true, force: true });
  }
});

test("`fitpet feed` refuses to overwrite a partial file (non-zero exit, file untouched)", () => {
  const home = mkdtempSync(join(tmpdir(), "fitpet-feed-"));
  try {
    resetPet(home);
    const sp = join(home, "state.json");
    const partial = JSON.stringify({ vitality: 42 });
    writeFileSync(sp, partial, "utf8");
    let failed = false;
    try {
      execFileSync("node", [CLI, "feed", "30"], { encoding: "utf8", stdio: ["pipe", "pipe", "pipe"], env: { ...process.env, FITPET_HOME: home } });
    } catch {
      failed = true;
    }
    assert.ok(failed, "feed should exit non-zero on a partial file");
    assert.equal(readFileSync(sp, "utf8"), partial, "feed must leave a partial file untouched");
  } finally {
    rmSync(home, { recursive: true, force: true });
  }
});

test("an old-schema file (valid identity, missing growth counters) migrates on first feed, never bricked", () => {
  const home = mkdtempSync(join(tmpdir(), "fitpet-migrate-"));
  try {
    const sp = join(home, "state.json");
    writeFileSync(
      sp,
      JSON.stringify({
        schemaVersion: 1,
        pet: { name: "Veteran", species: "sprout", personality: "earnest", bornAt: "2026-05-01T00:00:00.000Z" },
        vitality: 80,
        stage: "adult", // identity + growth level present; healthyDays/ageDays absent (old schema)
        lastTickAt: "2026-06-01T00:00:00.000Z",
        fitness: { rollingScore: 80, windowDays: 7, source: "manual", lastActivityAt: null, lastSyncAt: null },
        reaction: null,
      }),
      "utf8",
    );
    execFileSync("node", [CLI, "feed", "30"], { encoding: "utf8", env: { ...process.env, FITPET_HOME: home } });
    const after = JSON.parse(readFileSync(sp, "utf8")) as { pet: { name: string }; stage: string; healthyDays: number };
    assert.equal(after.pet.name, "Veteran", "identity preserved through migration");
    assert.equal(after.stage, "adult", "growth level preserved (not demoted to egg)");
    assert.equal(typeof after.healthyDays, "number", "missing counter backfilled (migrated, not refused)");
  } finally {
    rmSync(home, { recursive: true, force: true });
  }
});
