// Installer: safely MERGES FitPet's hooks into ~/.claude/settings.json
// (never clobbers existing keys; backs up first) and copies the /fitpet-sync skill.
// The merge/unmerge functions are pure so they can be unit-tested.

import { homedir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { readFileSync, writeFileSync, renameSync, mkdirSync, existsSync, cpSync } from "node:fs";

export function srcDir(): string {
  return dirname(fileURLToPath(import.meta.url)); // .../fitpet/src
}
export function projectRoot(): string {
  return dirname(srcDir());
}
export function defaultSettingsPath(): string {
  return join(homedir(), ".claude", "settings.json");
}
export function defaultSkillsDir(): string {
  return join(homedir(), ".claude", "skills");
}

type Json = Record<string, unknown>;

function cmd(src: string, rel: string): string {
  return `node ${join(src, rel)}`;
}

const HOOK_MATCHER = "Bash|Edit|Write|MultiEdit|NotebookEdit";
export function fitpetHookEntries(src: string): Record<string, Json[]> {
  return {
    SessionStart: [{ hooks: [{ type: "command", command: cmd(src, "hooks/session-start.ts") }] }],
    Stop: [{ hooks: [{ type: "command", command: cmd(src, "hooks/stop.ts") }] }],
    PostToolUse: [{ matcher: HOOK_MATCHER, hooks: [{ type: "command", command: cmd(src, "hooks/post-tool-use.ts") }] }],
    PostToolUseFailure: [{ matcher: HOOK_MATCHER, hooks: [{ type: "command", command: cmd(src, "hooks/post-tool-use-failure.ts") }] }],
  };
}

function isOurs(command: unknown, src: string): boolean {
  return typeof command === "string" && command.includes(src);
}

export interface MergeResult {
  settings: Json;
  warnings: string[];
  added: string[];
}

export function mergeSettings(existing: Json, src: string): MergeResult {
  const settings = structuredClone(existing ?? {}) as Json;
  const warnings: string[] = [];
  const added: string[] = [];

  // FitPet registers ONLY the coding-event hooks (the desktop window is the face now).
  const hooks = (typeof settings.hooks === "object" && settings.hooks ? settings.hooks : {}) as Record<string, Json[]>;
  for (const [event, entries] of Object.entries(fitpetHookEntries(src))) {
    const arr = Array.isArray(hooks[event]) ? (hooks[event] as Json[]) : [];
    const present = arr.some(
      (g) => Array.isArray((g as { hooks?: unknown }).hooks) &&
        ((g as { hooks: Json[] }).hooks).some((h) => isOurs((h as { command?: unknown }).command, src)),
    );
    if (!present) {
      hooks[event] = [...arr, ...entries];
      added.push(`hooks.${event}`);
    } else {
      hooks[event] = arr;
    }
  }
  settings.hooks = hooks;

  return { settings, warnings, added };
}

export function unmergeSettings(existing: Json, src: string): { settings: Json; removed: string[] } {
  const settings = structuredClone(existing ?? {}) as Json;
  const removed: string[] = [];

  if (settings.hooks && typeof settings.hooks === "object") {
    const hooks = settings.hooks as Record<string, unknown>;
    for (const event of Object.keys(hooks)) {
      const arr = hooks[event];
      if (!Array.isArray(arr)) continue;
      const filtered = arr
        .map((g) => {
          const grp = g as { hooks?: unknown };
          if (Array.isArray(grp.hooks)) {
            return { ...grp, hooks: (grp.hooks as Json[]).filter((h) => !isOurs((h as { command?: unknown }).command, src)) };
          }
          return g;
        })
        .filter((g) => {
          const grp = g as { hooks?: unknown };
          return !Array.isArray(grp.hooks) || (grp.hooks as Json[]).length > 0;
        });
      if (filtered.length !== arr.length) removed.push(`hooks.${event}`);
      if (filtered.length) hooks[event] = filtered;
      else delete hooks[event];
    }
    if (Object.keys(hooks).length === 0) delete settings.hooks;
  }

  return { settings, removed };
}

// --- impure file helpers ---

// Lenient read for read-only callers (e.g. `doctor`): any problem -> {}.
export function readSettings(path: string): Json {
  try {
    return JSON.parse(readFileSync(path, "utf8")) as Json;
  } catch {
    return {};
  }
}

export class SettingsParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SettingsParseError";
  }
}

// Strict read for WRITE operations (install/uninstall). A missing or genuinely empty file
// returns {} so we can proceed; a file that EXISTS but does not parse to a JSON object throws
// so the caller ABORTS instead of clobbering real user data (which may hold secrets).
export function readSettingsStrict(path: string): Json {
  let text: string;
  try {
    text = readFileSync(path, "utf8");
  } catch (e) {
    if ((e as NodeJS.ErrnoException)?.code === "ENOENT") return {}; // missing -> ok
    throw e; // permissions etc. -> surface, never silently overwrite
  }
  if (text.trim() === "") return {}; // genuinely empty -> ok
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new SettingsParseError(`${path} exists but is not valid JSON.`);
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new SettingsParseError(`${path} exists but is not a JSON object.`);
  }
  return parsed as Json;
}

export interface InstallPreview {
  hooks: Record<string, Json[]>;
  added: string[];
  warnings: string[];
}

// A REDACTED dry-run view for `install --print`: shows ONLY FitPet's own proposed hook
// additions (every string derived from `src`, our install dir) plus which keys would change.
// It never echoes any pre-existing hook command strings, which can contain tokens.
export function previewAdditions(existing: Json, src: string): InstallPreview {
  const { added, warnings } = mergeSettings(existing, src);
  return {
    hooks: fitpetHookEntries(src),
    added,
    warnings,
  };
}

export function writeSettingsAtomic(path: string, settings: Json): void {
  mkdirSync(dirname(path), { recursive: true });
  const tmp = join(dirname(path), `.settings.fitpet-tmp-${process.pid}-${Date.now()}.json`);
  writeFileSync(tmp, JSON.stringify(settings, null, 2) + "\n", "utf8");
  renameSync(tmp, path);
}

export function backupSettings(path: string): string | null {
  if (!existsSync(path)) return null;
  const bak = `${path}.fitpet-backup-${Date.now()}`;
  cpSync(path, bak);
  return bak;
}

export function installSkill(skillsDir: string): string {
  const from = join(projectRoot(), "skills", "fitpet-sync");
  const to = join(skillsDir, "fitpet-sync");
  mkdirSync(skillsDir, { recursive: true });
  cpSync(from, to, { recursive: true });
  return to;
}
