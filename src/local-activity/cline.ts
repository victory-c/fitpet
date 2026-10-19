// Cline extension and CLI file-hook envelopes are deliberately handled separately.
// Payloads are inspected in memory only; the journal receives no source/user/task IDs.
import type { ActivityKind } from "./log.ts";

function object(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

const START = new Set(["TaskStart", "TaskResume", "agent_start", "agent_resume"]);
const STOP = new Set(["TaskComplete", "TaskCancel", "SessionShutdown", "agent_end", "agent_abort", "session_shutdown"]);
const EDIT = new Set(["write_to_file", "replace_in_file", "apply_patch", "edit_file", "write_file"]);

export function classifyClineHook(raw: unknown): ActivityKind | null {
  const payload = object(raw);
  const event = payload.hookName;
  if (typeof event !== "string") return null;
  if (START.has(event)) return "session_start";
  if (STOP.has(event)) return "stop";
  if (event === "TaskError" || event === "agent_error") return "error";
  if (event === "UserPromptSubmit" || event === "prompt_submit") return "prompt";
  if (event === "PreToolUse" || event === "tool_call") return "tool";
  if (event === "PostToolUse") {
    const tool = object(payload.postToolUse);
    if (tool.success === false) return "error";
    if (tool.success === true && typeof tool.toolName === "string" && EDIT.has(tool.toolName)) return "edit";
    return "tool";
  }
  if (event === "tool_result") {
    const tool = object(payload.tool_result);
    if (typeof tool.error === "string" && tool.error.length > 0) return "error";
    if ((tool.error === null || tool.error === undefined) && typeof tool.name === "string" && EDIT.has(tool.name)) return "edit";
    return "tool";
  }
  return null;
}
