import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, renameSync, rmSync, statSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { activityLogPath, appendActivity, createActivityReader, parseActivityLines, readActivity } from "../src/local-activity/log.ts";
import type { ActivityEvent, ActivityKind } from "../src/local-activity/log.ts";

const t = "2026-06-20T12:00:00.000Z";
const event: ActivityEvent = { t, kind: "prompt" };
const line = JSON.stringify(event) + "\n";
test("FIFO journals fail promptly without blocking readers or writers", { skip: process.platform === "win32" }, (ctx) => {
  const path = fixture(ctx);
  assert.equal(spawnSync("mkfifo", [path], { encoding: "utf8" }).status, 0);
  const moduleUrl = new URL("../src/local-activity/log.ts", import.meta.url).href;
  const script = `
    import assert from "node:assert/strict";
    import { appendActivity, readActivity, createActivityReader } from ${JSON.stringify(moduleUrl)};
    const path = ${JSON.stringify(path)};
    assert.deepEqual(readActivity(path), { ok: false, reason: "unreadable" });
    assert.deepEqual(createActivityReader(path)(), { ok: false, reason: "unreadable" });
    assert.throws(() => appendActivity(${JSON.stringify(event)}, path));
  `;
  const result = spawnSync(process.execPath, ["--input-type=module", "-e", script], { encoding: "utf8", timeout: 5000 });
  assert.ifError(result.error);
  assert.equal(result.status, 0, result.stderr);
});

function fixture(ctx: { after(fn: () => void): void }): string {
  const dir = mkdtempSync(join(tmpdir(), "fitpet-activity-"));
  ctx.after(() => rmSync(dir, { recursive: true, force: true }));
  return join(dir, "activity.jsonl");
}

test("defaults use FITPET_HOME at call time", (ctx) => {
  const path = fixture(ctx);
  const old = process.env.FITPET_HOME;
  ctx.after(() => {
    if (old === undefined) delete process.env.FITPET_HOME;
    else process.env.FITPET_HOME = old;
  });
  process.env.FITPET_HOME = join(path, "home");
  assert.equal(activityLogPath(), join(path, "home", "activity.jsonl"));
  appendActivity(event);
  assert.deepEqual(readActivity(), { ok: true, events: [event] });
  assert.deepEqual(createActivityReader()(), readActivity());
  process.env.FITPET_HOME = join(path, "other");
  assert.deepEqual(readActivity(), { ok: false, reason: "missing" });
});

test("append projects only t/kind, ignores toJSON and supports all allowed kinds", (ctx) => {
  const path = fixture(ctx);
  const kinds: ActivityKind[] = ["session_start", "prompt", "edit", "tool", "test_pass", "test_fail", "error", "stop"];
  for (const kind of kinds) {
    appendActivity({ t, kind, secret: "PRIVATE", toJSON() { throw new Error("must not run"); } } as ActivityEvent, path);
  }
  assert.equal(readFileSync(path, "utf8"), kinds.map(kind => JSON.stringify({ t, kind }) + "\n").join(""));
  assert.deepEqual(readActivity(path), { ok: true, events: kinds.map(kind => ({ t, kind })) });
});

test("append rejects invalid events and propagates filesystem errors", (ctx) => {
  const path = fixture(ctx);
  for (const raw of [null, [], {}, { t: "bad", kind: "prompt" }, { t, kind: "unknown" }]) {
    assert.throws(() => appendActivity(raw as ActivityEvent, path), TypeError);
  }
  writeFileSync(path, "block parent");
  assert.throws(() => appendActivity(event, join(path, "child")));
});

test("parser tolerates malformed records, rejects bad timestamps/kinds and strips extras", () => {
  const invalid = [null, [], [event], true, 3, "text", {}, { t, kind: null }, { t, kind: "future_kind" },
    { t: null, kind: "prompt" }, { t: 123, kind: "prompt" }, { t: "", kind: "prompt" },
    { t: "not a date", kind: "prompt" }, { t: "999999-01-01", kind: "prompt" }];
  const text = invalid.map(value => JSON.stringify(value)).join("\n") + "\n{broken\n\n" +
    JSON.stringify({ ...event, secret: "private" }) + "\r\n" + line + '{"t":';
  assert.deepEqual(parseActivityLines(text), [event, event]);
  assert.deepEqual(parseActivityLines(""), []);
  assert.deepEqual(parseActivityLines(JSON.stringify(event)), [event]);
});

test("parser preserves order, duplicates, old and future dates", () => {
  const events: ActivityEvent[] = [
    { t: "2999-01-01T00:00:00Z", kind: "stop" },
    { t: "1990-01-01T00:00:00Z", kind: "session_start" }, event, event,
  ];
  assert.deepEqual(parseActivityLines(events.map(e => JSON.stringify(e)).join("\n")), events);
});

test("read distinguishes missing/unreadable; empty or corrupt journals read successfully", (ctx) => {
  const path = fixture(ctx);
  assert.deepEqual(readActivity(path), { ok: false, reason: "missing" });
  mkdirSync(path);
  assert.deepEqual(readActivity(path), { ok: false, reason: "unreadable" });
  rmSync(path, { recursive: true });
  writeFileSync(path, "");
  assert.deepEqual(readActivity(path), { ok: true, events: [] });
  writeFileSync(path, "null\n[]\n{bad");
  assert.deepEqual(readActivity(path), { ok: true, events: [] });
  assert.deepEqual(readActivity(join(path, "child")), { ok: false, reason: "unreadable" });
});


test("cache invalidates on size, mtime, inode, deletion and recreation", (ctx) => {
  const path = fixture(ctx);
  const reader = createActivityReader(path);
  const missing = reader();
  assert.strictEqual(reader(), missing);
  appendActivity(event, path);
  const first = reader();
  assert.strictEqual(reader(), first);
  appendActivity(event, path);
  const larger = reader();
  assert.notStrictEqual(larger, first);
  assert.deepEqual(larger, { ok: true, events: [event, event] });
  writeFileSync(path, JSON.stringify({ t, kind: "tool" }) + "\n");
  const before = reader();
  writeFileSync(path, JSON.stringify({ t, kind: "edit" }) + "\n");
  const previous = statSync(path);
  utimesSync(path, previous.atime, new Date(previous.mtimeMs + 5000));
  const edited = reader();
  assert.notStrictEqual(edited, before);
  assert.deepEqual(edited, { ok: true, events: [{ t, kind: "edit" }] });
  const stat = statSync(path);
  const replacement = path + ".replacement";
  writeFileSync(replacement, JSON.stringify({ t, kind: "tool" }) + "\n");
  utimesSync(replacement, stat.atime, stat.mtime);
  renameSync(replacement, path);
  const replaced = reader();
  assert.notStrictEqual(replaced, edited);
  assert.deepEqual(replaced, { ok: true, events: [{ t, kind: "tool" }] });
  assert.strictEqual(reader(), replaced);
  rmSync(path);
  assert.deepEqual(reader(), missing);
  writeFileSync(path, line);
  assert.deepEqual(reader(), first);
});

test("reader retries unreadable paths and recovers", (ctx) => {
  const path = fixture(ctx);
  mkdirSync(path);
  const reader = createActivityReader(path);
  assert.deepEqual(reader(), { ok: false, reason: "unreadable" });
  rmSync(path, { recursive: true });
  writeFileSync(path, line);
  assert.deepEqual(reader(), { ok: true, events: [event] });
});

test("oversized reads discard partial UTF-8 records and never rotate", (ctx) => {
  const path = fixture(ctx);
  const limit = 2 * 1024 * 1024;
  const huge = JSON.stringify({ ...event, extra: "🐾".repeat(limit / 4) }) + "\n";
  writeFileSync(path, line + huge + line);
  const size = statSync(path).size;
  assert.deepEqual(readActivity(path), { ok: true, events: [event] });
  assert.equal(statSync(path).size, size);
  appendActivity(event, path);
  assert.equal(statSync(path).size, size + Buffer.byteLength(line));
  assert.deepEqual(readActivity(path), { ok: true, events: [event, event] });
  writeFileSync(path, "x".repeat(limit + 10));
  assert.deepEqual(readActivity(path), { ok: true, events: [] });
});

test("tail boundary preserves a complete record at the start of the window", (ctx) => {
  const path = fixture(ctx);
  const limit = 2 * 1024 * 1024;
  writeFileSync(path, "discarded\n" + line + " ".repeat(limit - Buffer.byteLength(line)));
  assert.deepEqual(readActivity(path), { ok: true, events: [event] });
  writeFileSync(path, " ".repeat(limit - Buffer.byteLength(line)) + line);
  assert.deepEqual(readActivity(path), { ok: true, events: [event] });
});
