import { test } from "node:test";
import assert from "node:assert/strict";
import { classifyClineHook } from "../src/local-activity/cline.ts";
import { deriveCodingTelemetry } from "../src/local-activity/derive.ts";
import { computeScreenDebt } from "../src/screen-debt/score.ts";
import { defaultScreenDebt } from "../src/screen-debt/state.ts";
import type { ActivityEvent } from "../src/local-activity/log.ts";

test("Cline extension and CLI lifecycle names normalize without treating task end as a break", () => {
  for (const hookName of ["TaskStart", "TaskResume", "agent_start", "agent_resume"]) assert.equal(classifyClineHook({ hookName }), "session_start");
  for (const hookName of ["TaskComplete", "TaskCancel", "SessionShutdown", "agent_end", "agent_abort", "session_shutdown"]) assert.equal(classifyClineHook({ hookName }), "stop");
  for (const hookName of ["TaskError", "agent_error"]) assert.equal(classifyClineHook({ hookName }), "error");
  for (const hookName of ["UserPromptSubmit", "prompt_submit"]) assert.equal(classifyClineHook({ hookName }), "prompt");
  for (const hookName of ["PreToolUse", "tool_call"]) assert.equal(classifyClineHook({ hookName }), "tool");
  for (const value of [null, [], {}, "tool_result", { hookName: 42 }, { hookName: "Notification" }, { hookName: "PreCompact" }]) assert.equal(classifyClineHook(value), null);
});

test("tool classification requires explicit success and does not guess tests from command/output text", () => {
  assert.equal(classifyClineHook({ hookName: "PostToolUse", postToolUse: { toolName: "apply_patch", success: true } }), "edit");
  assert.equal(classifyClineHook({ hookName: "PostToolUse", postToolUse: { toolName: "apply_patch", success: false } }), "error");
  assert.equal(classifyClineHook({ hookName: "PostToolUse", postToolUse: { toolName: "apply_patch" } }), "tool");
  assert.equal(classifyClineHook({ hookName: "PostToolUse", postToolUse: { toolName: "run_commands", parameters: { commands: ["npm test"] }, result: "all tests passed", success: true } }), "tool");
  assert.equal(classifyClineHook({ hookName: "tool_result", tool_result: { name: "write_to_file", error: null } }), "edit");
  assert.equal(classifyClineHook({ hookName: "tool_result", tool_result: { name: "apply_patch", error: "private error text" } }), "error");
  assert.equal(classifyClineHook({ hookName: "tool_result", tool_result: { name: "run_commands", output: "tests passed" } }), "tool");
  assert.equal(classifyClineHook({ hookName: "tool_result", tool_result: null }), "tool");
});

test("overlapping Cline and Claude events share elapsed time rather than doubling sessions or debt", () => {
  const start = Date.parse("2026-10-18T10:00:00Z");
  const iso = (min: number) => new Date(start + min * 60_000).toISOString();
  const claude: ActivityEvent[] = Array.from({ length: 13 }, (_, i) => ({ t: iso(i * 10), kind: "edit" }));
  const cline: ActivityEvent[] = claude.map((e) => ({ t: e.t, kind: classifyClineHook({ hookName: "tool_result", tool_result: { name: "apply_patch" } })! }));
  const now = new Date(iso(120));
  const combined = [...claude, ...cline, { t: iso(120), kind: "stop" as const }];
  assert.equal(deriveCodingTelemetry(combined, now).currentCodingSessionMinutes, 120);
  assert.deepEqual(computeScreenDebt(combined, defaultScreenDebt(iso(0)), now), computeScreenDebt(claude, defaultScreenDebt(iso(0)), now));
});
