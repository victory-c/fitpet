import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { installClineHooks, uninstallClineHooks } from "../src/install-cline.ts";

const cli = fileURLToPath(new URL("../src/cli.ts", import.meta.url));
const adapter = fileURLToPath(new URL("../src/hooks/cline.ts", import.meta.url));

test("real Cline adapter redacts private fields, timestamps locally, and always returns allow", () => {
  const home = mkdtempSync(join(tmpdir(), "fitpet-cline-process-"));
  try {
    const payloads = [
      { hookName: "TaskStart", taskStart: { taskMetadata: { initialTask: "SECRET" } } },
      { hookName: "prompt_submit", userMessage: "SECRET" },
      { hookName: "PostToolUse", postToolUse: { toolName: "apply_patch", success: true, parameters: { path: "SECRET" }, result: "SECRET" } },
      { hookName: "tool_result", tool_result: { name: "run_commands", input: { command: "SECRET" }, error: "SECRET", output: "SECRET" } },
      { hookName: "TaskCancel" },
    ];
    const start = Date.now();
    for (const payload of payloads) {
      const result = spawnSync(process.execPath, [adapter], { input: JSON.stringify({ ...payload, taskId: "SECRET", userId: "SECRET", workspaceRoots: ["SECRET"], timestamp: "1990-01-01T00:00:00Z" }), env: { ...process.env, FITPET_HOME: home }, encoding: "utf8" });
      assert.equal(result.status, 0); assert.equal(result.stderr, "");
      assert.deepEqual(JSON.parse(result.stdout), { cancel: false });
    }
    const text = readFileSync(join(home, "activity.jsonl"), "utf8");
    assert.doesNotMatch(text, /SECRET|taskId|workspace|parameters|output/);
    const records = text.trim().split("\n").map((line) => JSON.parse(line));
    assert.deepEqual(records.map((e) => e.kind), ["session_start", "prompt", "edit", "error", "stop"]);
    for (const record of records) { assert.deepEqual(Object.keys(record).sort(), ["kind", "t"]); assert.ok(Date.parse(record.t) >= start); }
    for (const input of ["{broken", "null", "[]", '{"hookName":"Notification"}']) {
      assert.equal(execFileSync(process.execPath, [adapter], { input, env: { ...process.env, FITPET_HOME: home }, encoding: "utf8" }), '{"cancel":false}\n');
    }
    assert.equal(readFileSync(join(home, "activity.jsonl"), "utf8"), text);
    assert.equal(existsSync(join(home, "state.json")), false);
    rmSync(join(home, "activity.jsonl")); mkdirSync(join(home, "activity.jsonl"));
    assert.equal(execFileSync(process.execPath, [adapter], { input: '{"hookName":"TaskStart"}', env: { ...process.env, FITPET_HOME: home }, encoding: "utf8" }), '{"cancel":false}\n');
  } finally { rmSync(home, { recursive: true, force: true }); }
});

for (const host of ["vscode", "cli"] as const) test(`${host}: opt-in CLI dry run and installed launchers work without touching pet state`, () => {
  const workspace = mkdtempSync(join(tmpdir(), "fitpet cline 'workspace' "));
  const home = join(workspace, "pet");
  const args = ["--host", host, "--workspace", workspace];
  const env = { ...process.env, FITPET_HOME: home };
  try {
    const preview = JSON.parse(execFileSync(process.execPath, [cli, "cline-install", ...args, "--print"], { env, encoding: "utf8" }));
    assert.ok(preview.directory.startsWith(workspace)); assert.deepEqual(readdirSync(workspace), []);
    execFileSync(process.execPath, [cli, "cline-install", ...args], { env });
    const file = join(preview.directory, host === "cli" ? "PreToolUse.sh" : "PreToolUse");
    const payload = host === "cli" ? { hookName: "tool_call", tool_call: { name: "run_commands", input: { command: "SECRET" } } } : { hookName: "PreToolUse", preToolUse: { toolName: "run_commands", parameters: { command: "SECRET" } } };
    assert.equal(execFileSync(file, { input: JSON.stringify(payload), env, encoding: "utf8" }), '{"cancel":false}\n');
    assert.equal(JSON.parse(readFileSync(join(home, "activity.jsonl"), "utf8")).kind, "tool");
    assert.equal(existsSync(join(home, "state.json")), false);
    assert.deepEqual(installClineHooks(host, workspace), []);
    execFileSync(process.execPath, [cli, "cline-uninstall", ...args], { env });
    assert.deepEqual(uninstallClineHooks(host, workspace), []);
    assert.deepEqual(readdirSync(preview.directory), []);
  } finally { rmSync(workspace, { recursive: true, force: true }); }
});

test("Cline CLI rejects missing host/workspace and never echoes foreign hook contents", () => {
  const workspace = mkdtempSync(join(tmpdir(), "fitpet-cline-conflict-"));
  try {
    for (const args of [[], ["--host", "auto", "--workspace", workspace], ["--host", "cli", "--workspace", "."]]) {
      const result = spawnSync(process.execPath, [cli, "cline-install", ...args], { encoding: "utf8" });
      assert.equal(result.status, 1);
    }
    mkdirSync(join(workspace, ".cline", "hooks"), { recursive: true });
    writeFileSync(join(workspace, ".cline", "hooks", "TaskStart.sh"), "SECRET");
    const result = spawnSync(process.execPath, [cli, "cline-install", "--host", "cli", "--workspace", workspace], { encoding: "utf8" });
    assert.equal(result.status, 1); assert.doesNotMatch(result.stdout + result.stderr, /SECRET/);
    assert.equal(readFileSync(join(workspace, ".cline", "hooks", "TaskStart.sh"), "utf8"), "SECRET");
  } finally { rmSync(workspace, { recursive: true, force: true }); }
});
