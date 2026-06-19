// Process-level tests: spawn the REAL node processes (CLI, status line, hooks) the way
// Claude Code does, with a throwaway FITPET_HOME, and assert on stdout / persisted state.
// This catches argv/stdin wiring that pure-function tests can't.

import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url))); // .../fitpet
const CLI = join(ROOT, "src", "cli.ts");
const FACE = join(ROOT, "src", "face.ts");
const hook = (n: string) => join(ROOT, "src", "hooks", n);

function tempHome(): string {
  return mkdtempSync(join(tmpdir(), "fitpet-proc-"));
}
function run(script: string, args: string[], home: string, input = ""): string {
  return execFileSync("node", [script, ...args], {
    input,
    encoding: "utf8",
    env: { ...process.env, FITPET_HOME: home },
  });
}

test("CLI process: reset + status render the pet", () => {
  const home = tempHome();
  try {
    run(CLI, ["reset", "--name", "Tester", "--species", "sprout"], home);
    const out = run(CLI, ["status"], home);
    assert.match(out, /Tester the Sprout/);
    assert.match(out, /vitality \d+\/100/);
  } finally {
    rmSync(home, { recursive: true, force: true });
  }
});

test("face process: prints a line normally, and a panic tail when context is low", () => {
  const home = tempHome();
  try {
    run(CLI, ["reset", "--name", "Tester"], home);
    const normal = run(FACE, [], home, JSON.stringify({ context_window: { used_percentage: 10 } }));
    assert.ok(normal.trim().length > 0);
    const panic = run(FACE, [], home, JSON.stringify({ context_window: { used_percentage: 95 } }));
    assert.match(panic, /context low!/);
  } finally {
    rmSync(home, { recursive: true, force: true });
  }
});

test("hook process: a passing test command produces a quip on the pet", () => {
  const home = tempHome();
  try {
    run(CLI, ["reset"], home);
    run(hook("post-tool-use.ts"), [], home, JSON.stringify({ tool_name: "Bash", tool_input: { command: "npm test" } }));
    assert.match(run(CLI, ["status"], home), /says:/);
  } finally {
    rmSync(home, { recursive: true, force: true });
  }
});

test("sync process: --file path works (payload off argv) ", () => {
  const home = tempHome();
  try {
    run(CLI, ["reset"], home);
    const payload = JSON.stringify({
      activities: [{ start_time_local: new Date().toISOString(), type: "run", moving_duration_seconds: 1800, training_load: 80 }],
    });
    const f = join(home, "payload.json");
    writeFileSync(f, payload, "utf8");
    const out = run(CLI, ["sync", "--source", "garmin", "--file", f], home);
    assert.match(out, /source: garmin/);
    assert.match(out, /activities: 1/);
  } finally {
    rmSync(home, { recursive: true, force: true });
  }
});

test("sync process: stdin path works", () => {
  const home = tempHome();
  try {
    run(CLI, ["reset"], home);
    const payload = JSON.stringify({
      activities: [{ start_time_local: new Date().toISOString(), type: "run", moving_duration_seconds: 1800, training_load: 80 }],
    });
    const out = run(CLI, ["sync", "--source", "garmin"], home, payload);
    assert.match(out, /activities: 1/);
  } finally {
    rmSync(home, { recursive: true, force: true });
  }
});
