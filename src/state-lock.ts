// Cooperative synchronous locking for state read-modify-write transactions.
import { closeSync, fstatSync, lstatSync, mkdirSync, openSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import type { Stats } from "node:fs";
import { join } from "node:path";
import { performance } from "node:perf_hooks";
import { fitpetHome } from "./state.ts";

const WAIT_MS = 10;
const TIMEOUT_MS = 2_000;
const sleeper = new Int32Array(new SharedArrayBuffer(4));

function code(error: unknown): string | undefined {
  return (error as NodeJS.ErrnoException)?.code;
}

function removeOwn(path: string, identity: Stats): void {
  try {
    const current = lstatSync(path);
    if (current.dev === identity.dev && current.ino === identity.ino) unlinkSync(path);
  } catch (error) {
    if (code(error) !== "ENOENT") throw error;
  }
}

function deadOwner(path: string): boolean {
  try {
    // Empty, malformed, inaccessible and symlink locks are deliberately not reclaimed.
    if (!lstatSync(path).isFile()) return false;
    const owner: unknown = JSON.parse(readFileSync(path, "utf8"));
    const pid = (owner as { pid?: unknown } | null)?.pid;
    if (typeof pid !== "number" || !Number.isSafeInteger(pid) || pid <= 0) return false;
    try {
      process.kill(pid, 0);
      return false;
    } catch (error) {
      return code(error) === "ESRCH"; // EPERM (or any uncertainty) means do not steal.
    }
  } catch {
    return false;
  }
}

function recoverDeadOwner(path: string): void {
  // Serialize reapers: without this guard, two stale observations could unlink a
  // successor's live lock. An orphaned recovery guard is intentionally fail-closed.
  const guard = `${path}.recover`;
  let fd: number;
  try {
    fd = openSync(guard, "wx", 0o600);
  } catch (error) {
    if (code(error) === "EEXIST") return;
    throw error;
  }
  const identity = fstatSync(fd);
  try {
    if (deadOwner(path)) unlinkSync(path);
  } finally {
    try { removeOwn(guard, identity); } finally { closeSync(fd); }
  }
}

/** Run a synchronous transaction, or throw without calling fn after ~2s contention.
 * Not reentrant; async callbacks are unsupported (the lock covers only their return).
 * All writers must cooperate. No age-based stealing, including for live/reused PIDs.
 */
export function withStateLock<T>(fn: () => T): T {
  const home = fitpetHome();
  mkdirSync(home, { recursive: true });
  const path = join(home, "state.lock");
  const deadline = performance.now() + TIMEOUT_MS;
  let fd: number;
  for (;;) {
    try {
      fd = openSync(path, "wx", 0o600);
      break;
    } catch (error) {
      if (code(error) !== "EEXIST") throw error;
    }
    if (performance.now() >= deadline) throw new Error("Timed out acquiring FitPet state lock");
    recoverDeadOwner(path);
    const remaining = deadline - performance.now();
    if (remaining <= 0) throw new Error("Timed out acquiring FitPet state lock");
    Atomics.wait(sleeper, 0, 0, Math.min(WAIT_MS, remaining));
  }
  const identity = fstatSync(fd);
  try {
    writeFileSync(fd, JSON.stringify({ pid: process.pid }), "utf8");
    return fn();
  } finally {
    try { removeOwn(path, identity); } finally { closeSync(fd); }
  }
}
