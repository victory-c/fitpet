import {
  closeSync, constants, fchmodSync, fstatSync, lstatSync, mkdirSync,
  openSync, readFileSync, readdirSync, unlinkSync, writeFileSync,
} from "node:fs";
import type { Stats } from "node:fs";
import { basename, extname, isAbsolute, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export type ClineHost = "vscode" | "cli";
const commonEvents = [
  "TaskStart", "UserPromptSubmit", "PreToolUse", "PostToolUse", "TaskComplete", "TaskCancel",
];
const cliEvents = [...commonEvents, "TaskResume", "TaskError", "SessionShutdown"];
const adapter = fileURLToPath(new URL("./hooks/cline.ts", import.meta.url));
const marker = "# FitPet managed Cline hook v1";
// Conservative discovery aliases for both hosts, including extensionless scripts.
const extensions = new Set([
  "", ".sh", ".bash", ".zsh", ".js", ".mjs", ".cjs", ".ts", ".mts", ".cts",
  ".py", ".pyw", ".rb", ".pl", ".php", ".ps1", ".bat", ".cmd", ".exe",
]);

function shellQuote(value: string): string {
  return "'" + value.replaceAll("'", "'\\''") + "'";
}

function launcher(host: ClineHost, event: string): string {
  // Capture stdout so failed node processes cannot leave partial JSON responses.
  return `#!/bin/sh
${marker}
if output=$(${shellQuote(process.execPath)} ${shellQuote(adapter)} --host ${shellQuote(host)} --event ${shellQuote(event)} 2>/dev/null); then
  printf '%s\\n' "$output"
else
  printf '%s\\n' '{"cancel":false}'
fi
exit 0
`;
}

function stat(path: string): Stats | undefined {
  try {
    return lstatSync(path);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined;
    throw error;
  }
}

function conflict(path: string): never {
  // Never expose existing file content (which may contain credentials).
  throw new Error(`Cline hook conflict at ${path}; refusing to modify existing hooks.`);
}

function destinationAncestors(host: ClineHost, workspace: string): string[] {
  const parent = join(workspace, host === "cli" ? ".cline" : ".clinerules");
  return [workspace, parent, join(parent, "hooks")];
}

function checkAncestors(host: ClineHost, workspace: string): void {
  for (const path of destinationAncestors(host, workspace)) {
    const info = stat(path);
    if (info && (!info.isDirectory() || info.isSymbolicLink())) conflict(path);
  }
}

export function clineHookPlan(host: ClineHost, workspace: string): {
  directory: string; files: { path: string; content: string }[];
} {
  if (process.platform === "win32") throw new Error("Cline hook installation requires POSIX /bin/sh; Windows is not supported.");
  if (host !== "vscode" && host !== "cli") throw new Error("Cline host must be vscode or cli.");
  if (typeof workspace !== "string" || !isAbsolute(workspace) || workspace.includes("\0")) {
    throw new Error("An explicit absolute existing workspace directory is required.");
  }
  workspace = resolve(workspace);
  const info = stat(workspace);
  if (!info || !info.isDirectory() || info.isSymbolicLink()) {
    throw new Error("An explicit absolute existing workspace directory (not a symlink) is required.");
  }
  checkAncestors(host, workspace);
  const directory = join(workspace, host === "cli" ? ".cline" : ".clinerules", "hooks");
  return {
    directory,
    files: (host === "cli" ? cliEvents : commonEvents).map(event => ({
      path: join(directory, event + (host === "cli" ? ".sh" : "")),
      content: launcher(host, event),
    })),
  };
}

export function installClineHooks(host: ClineHost, workspace: string): string[] {
  const plan = clineHookPlan(host, workspace);
  preflight(plan);
  const created: { path: string; dev: number; ino: number }[] = [];
  try {
    for (const path of destinationAncestors(host, resolve(workspace)).slice(1)) {
      checkAncestors(host, resolve(workspace));
      if (!stat(path)) mkdirSync(path);
    }
    for (const file of plan.files) {
      checkAncestors(host, resolve(workspace));
      if (matchingFile(file.path, file.content)) continue;
      const fd = openSync(file.path, "wx", 0o755);
      try {
        const info = fstatSync(fd);
        created.push({ path: file.path, dev: info.dev, ino: info.ino });
        writeFileSync(fd, file.content, "utf8");
        fchmodSync(fd, 0o755);
      } finally {
        closeSync(fd);
      }
    }
    return created.map(file => file.path);
  } catch (error) {
    for (const file of created.reverse()) {
      // Never remove replacements or follow swapped symlink parents during rollback.
      try {
        checkAncestors(host, resolve(workspace));
        const info = stat(file.path);
        if (info?.isFile() && info.dev === file.dev && info.ino === file.ino) unlinkSync(file.path);
      } catch { /* Preserve original failure; never broaden cleanup. */ }
    }
    throw error;
  }
}

export function uninstallClineHooks(host: ClineHost, workspace: string): string[] {
  const plan = clineHookPlan(host, workspace);
  preflight(plan);
  const removed: string[] = [];
  for (const file of plan.files) {
    checkAncestors(host, resolve(workspace));
    if (matchingFile(file.path, file.content)) {
      unlinkSync(file.path);
      removed.push(file.path);
    }
  }
  return removed;
}

type Plan = ReturnType<typeof clineHookPlan>;

function matchingFile(path: string, content: string): Stats | undefined {
  const info = stat(path);
  if (!info) return undefined;
  if (!info.isFile() || info.isSymbolicLink()) conflict(path);
  // Never follow final symlinks, even if swapped after lstat.
  const fd = openSync(path, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
  try {
    const opened = fstatSync(fd);
    if (!opened.isFile() || opened.dev !== info.dev || opened.ino !== info.ino ||
        !readFileSync(fd).equals(Buffer.from(content))) conflict(path);
    return opened;
  } finally {
    closeSync(fd);
  }
}

function preflight(plan: Plan): void {
  if (stat(plan.directory)) {
    for (const name of readdirSync(plan.directory)) {
      const lower = name.toLowerCase();
      for (const file of plan.files) {
        const expected = file.path.slice(plan.directory.length + 1);
        const event = expected.replace(/\.sh$/, "").toLowerCase();
        const extension = extname(lower);
        const normalized = basename(lower, extension).trim();
        if (normalized === event && extensions.has(extension) && name !== expected) {
          conflict(join(plan.directory, name));
        }
      }
    }
  }
  // Complete preflight before any writes OR deletions.
  for (const file of plan.files) matchingFile(file.path, file.content);
}
