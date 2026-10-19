import { appendFileSync, closeSync, constants, fstatSync, mkdirSync, openSync, readSync, statSync } from "node:fs";
import type { Stats } from "node:fs";
import { dirname, join } from "node:path";
import { fitpetHome } from "../state.ts";

export type ActivityKind = "session_start" | "prompt" | "edit" | "tool" | "test_pass" | "test_fail" | "error" | "stop";
export interface ActivityEvent { t: string; kind: ActivityKind }
export type ActivityReadResult =
  | { ok: true; events: ActivityEvent[] }
  | { ok: false; reason: "missing" | "unreadable" };

const KINDS = new Set<string>([
  "session_start", "prompt", "edit", "tool", "test_pass", "test_fail", "error", "stop",
]);
const MAX_READ_BYTES = 2 * 1024 * 1024;

export function activityLogPath(): string {
  return join(fitpetHome(), "activity.jsonl");
}

// Project untrusted input onto the privacy allowlist; never serialize the input
// object itself (including its toJSON method). Future dates belong to derivation.
function activityEvent(raw: unknown): ActivityEvent | undefined {
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) return;
  const { t, kind } = raw as Record<string, unknown>;
  if (typeof t !== "string" || !Number.isFinite(Date.parse(t))) return;
  if (typeof kind !== "string" || !KINDS.has(kind)) return;
  return { t, kind: kind as ActivityKind };
}

export function appendActivity(event: ActivityEvent, path = activityLogPath()): void {
  const safe = activityEvent(event);
  if (!safe) throw new TypeError("Invalid activity event");
  mkdirSync(dirname(path), { recursive: true });
  // One append per record. Do not rotate/truncate without writer synchronization:
  // read memory is bounded, but the on-disk journal can continue to grow.
  const fd = openSync(path, constants.O_WRONLY | constants.O_APPEND | constants.O_CREAT | constants.O_NONBLOCK, 0o600);
  try {
    if (!fstatSync(fd).isFile()) throw new Error("Activity journal must be a regular file");
    appendFileSync(fd, JSON.stringify(safe) + "\n", "utf8");
  } finally {
    closeSync(fd);
  }
}

export function parseActivityLines(text: string): ActivityEvent[] {
  const events: ActivityEvent[] = [];
  for (const line of text.split("\n")) {
    try {
      const event = activityEvent(JSON.parse(line));
      if (event) events.push(event);
    } catch {
      // A malformed or interrupted record must not hide other valid records.
    }
  }
  // No wall-clock retention here: consumers derive their own seven-day window.
  return events;
}

function failure(error: unknown): ActivityReadResult {
  return { ok: false, reason: (error as NodeJS.ErrnoException)?.code === "ENOENT" ? "missing" : "unreadable" };
}

type Snapshot = { result: ActivityReadResult; stat?: Stats };
function readSnapshot(path: string): Snapshot {
  let fd: number | undefined;
  try {
    fd = openSync(path, constants.O_RDONLY | constants.O_NONBLOCK);
    const stat = fstatSync(fd);
    if (!stat.isFile()) return { stat, result: { ok: false, reason: "unreadable" } };
    const start = Math.max(0, stat.size - MAX_READ_BYTES);
    // Include one preceding byte so an exact line boundary need not lose a record.
    const offset = start > 0 ? start - 1 : 0;
    const buffer = Buffer.alloc(stat.size - offset);
    let length = 0;
    while (length < buffer.length) {
      const n = readSync(fd, buffer, length, buffer.length - length, offset + length);
      if (n === 0) break;
      length += n;
    }
    let tail = buffer.subarray(0, length);
    if (start > 0) {
      const newline = tail.indexOf(10);
      tail = newline === -1 ? tail.subarray(tail.length) : tail.subarray(newline + 1);
    }
    return { stat, result: { ok: true, events: parseActivityLines(tail.toString("utf8")) } };
  } catch (error) {
    return { result: failure(error) };
  } finally {
    if (fd !== undefined) closeSync(fd);
  }
}

export function readActivity(path = activityLogPath()): ActivityReadResult {
  return readSnapshot(path).result;
}

export function createActivityReader(path = activityLogPath()): () => ActivityReadResult {
  let cached: Snapshot | undefined;
  return () => {
    let stat: Stats;
    try {
      stat = statSync(path);
    } catch (error) {
      const result = failure(error);
      if (!result.ok && result.reason === "missing") {
        if (cached && !cached.result.ok && cached.result.reason === "missing") return cached.result;
        cached = { result };
      } else {
        cached = undefined; // Retry transient errors rather than caching them forever.
      }
      return result;
    }
    const previous = cached?.stat;
    if (previous && stat.mtimeMs === previous.mtimeMs && stat.size === previous.size && stat.ino === previous.ino) {
      return cached!.result;
    }
    cached = readSnapshot(path);
    return cached.result;
  };
}
