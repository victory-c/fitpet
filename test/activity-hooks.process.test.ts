import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const hook = (name: string) => fileURLToPath(new URL(`../src/hooks/${name}.ts`, import.meta.url));
test("all five real hooks record only kinds/timestamps even with malformed payloads", () => {
  const home = mkdtempSync(join(tmpdir(), "fitpet-activity-hooks-"));
  try {
    const run = (name: string, input: string) => execFileSync(process.execPath, [hook(name)], {
      input, env: { ...process.env, FITPET_HOME: home }, encoding: "utf8",
    });
    const payload = JSON.stringify({ session_id: "SECRET", prompt: "SECRET", tool_name: "Bash", tool_input: { command: "npm test -- SECRET", file_path: "/SECRET" }, tool_response: "SECRET" });
    for (const name of ["session-start", "stop", "post-tool-use", "post-tool-use-failure", "user-prompt-submit"]) run(name, payload);
    for (const input of ["null", "[]", "{broken", '{"tool_input":{"command":42}}']) run("post-tool-use", input);
    const text = readFileSync(join(home, "activity.jsonl"), "utf8");
    assert.doesNotMatch(text, /SECRET|session_id|command|file_path|tool_response|prompt":/);
    const events = text.trim().split("\n").map((line) => JSON.parse(line));
    assert.deepEqual(events.slice(0, 5).map((e) => e.kind), ["session_start", "stop", "test_pass", "test_fail", "prompt"]);
    for (const e of events) {
      assert.deepEqual(Object.keys(e).sort(), ["kind", "t"]);
      assert.ok(Number.isFinite(Date.parse(e.t)));
    }
  } finally { rmSync(home, { recursive: true, force: true }); }
});

test("journal write failure does not stop existing passing-test reaction", () => {
  const home = mkdtempSync(join(tmpdir(), "fitpet-activity-failure-"));
  try {
    mkdirSync(join(home, "activity.jsonl"));
    execFileSync(process.execPath, [hook("post-tool-use")], {
      input: JSON.stringify({ tool_name: "Bash", tool_input: { command: "npm test" } }),
      env: { ...process.env, FITPET_HOME: home },
    });
    assert.equal(JSON.parse(readFileSync(join(home, "state.json"), "utf8")).reaction.event, "test_pass");
  } finally { rmSync(home, { recursive: true, force: true }); }
});