// Helpers shared by the hook scripts. The two event-detection functions are PURE so they
// can be unit-tested; the rest read/advance/save state. Hooks must be fast and must never
// throw out of the script (callers wrap in try/catch and exit 0).

import { readFileSync } from "node:fs";
import type { PetState, ReactionEvent } from "../types.ts";
import { readState, saveState } from "../state.ts";
import { tick } from "../vitality.ts";
import { applyReaction } from "../reactions.ts";

export interface HookInput {
  hook_event_name?: string;
  source?: string;
  tool_name?: string;
  tool_input?: { command?: string; file_path?: string };
  tool_response?: unknown;
}

export function readHookInput(): HookInput {
  try {
    const raw = readFileSync(0, "utf8");
    return raw ? (JSON.parse(raw) as HookInput) : {};
  } catch {
    return {};
  }
}

export function nowIso(): string {
  return new Date().toISOString();
}

// Conservative allowlist of test-runner invocations. We only celebrate when we're fairly
// sure a test command ran, to avoid false "tests passed!" on unrelated Bash calls.
const TEST_PATTERNS: RegExp[] = [
  /\b(npm|pnpm|yarn|bun) (run )?test\b/,
  /\bnode --test\b/,
  /\bvitest\b/,
  /\bjest\b/,
  /\bmocha\b/,
  /\bplaywright test\b/,
  /\bpytest\b/,
  /\bpython3? -m (pytest|unittest)\b/,
  /\bgo test\b/,
  /\bcargo test\b/,
  /\bctest\b/,
  /\brspec\b/,
  /\bphpunit\b/,
  /\bdotnet test\b/,
];

export function isTestCommand(cmd: string): boolean {
  if (!cmd) return false;
  return TEST_PATTERNS.some((re) => re.test(cmd));
}

const EDIT_TOOLS = new Set(["Edit", "Write", "MultiEdit", "NotebookEdit"]);

// PostToolUse fires only after a tool SUCCEEDS, so a test command here means it passed.
export function eventForPostToolUse(input: HookInput): ReactionEvent | null {
  const tool = input.tool_name ?? "";
  if (tool === "Bash" && isTestCommand(input.tool_input?.command ?? "")) return "test_pass";
  if (EDIT_TOOLS.has(tool)) return "edit";
  return null;
}

// PostToolUseFailure fires after a tool FAILS.
export function eventForFailure(input: HookInput): ReactionEvent | null {
  const tool = input.tool_name ?? "";
  if (tool === "Bash" && isTestCommand(input.tool_input?.command ?? "")) return "test_fail";
  return "error";
}

// Returns the state ONLY when it is safe to write back over: a complete read, or a genuinely
// absent file (new pet). Returns null when the file is unreadable/partial, so callers leave
// the real pet's file untouched rather than persisting defaults over it.
export function readWritableState(): PetState | null {
  const read = readState();
  if (read.ok) return read.state;
  // A genuinely absent file is a new pet (safe to write); partial/unreadable is suspect —
  // return null so callers leave the real pet's file untouched.
  return read.reason === "missing" ? read.state : null;
}

export function tickAndSave(): PetState | null {
  const current = readWritableState();
  if (!current) return null;
  const { state } = tick(current, nowIso());
  saveState(state);
  return state;
}

export function reactAndSave(event: ReactionEvent): PetState | null {
  const current = readWritableState();
  if (!current) return null;
  const { state } = tick(current, nowIso());
  applyReaction(state, event, nowIso());
  saveState(state);
  return state;
}
