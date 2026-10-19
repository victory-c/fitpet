import { eventForFailure, eventForPostToolUse, type HookInput } from "../hooks/hooklib.ts";
import { appendActivity, type ActivityKind } from "./log.ts";

export function classifyHook(input: HookInput): ActivityKind | null {
  switch (input.hook_event_name) {
    case "SessionStart": return "session_start";
    case "UserPromptSubmit": return "prompt";
    case "Stop": return "stop";
    case "PostToolUse": {
      const reaction = eventForPostToolUse(input);
      return reaction === "test_pass" || reaction === "edit" ? reaction : "tool";
    }
    case "PostToolUseFailure": return eventForFailure(input) === "test_fail" ? "test_fail" : "error";
    default: return null;
  }
}

// Recording must never prevent the existing fitness/reaction path from running.
export function recordActivity(input: HookInput, eventName: string): void {
  try {
    const kind = classifyHook({ ...input, hook_event_name: eventName });
    if (kind) appendActivity({ t: new Date().toISOString(), kind });
  } catch { /* best effort; never emit private payloads */ }
}