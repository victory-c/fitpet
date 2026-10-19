import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawn } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, unlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { withStateLock } from "../src/state-lock.ts";

const moduleUrl = new URL("../src/state-lock.ts", import.meta.url).href;

function sandbox(fn: (home: string) => void): void {
  const home = mkdtempSync(join(tmpdir(), "fitpet-lock-"));
  const previous = process.env.FITPET_HOME;
  process.env.FITPET_HOME = home;
  try { fn(home); } finally {
    if (previous === undefined) delete process.env.FITPET_HOME;
    else process.env.FITPET_HOME = previous;
    rmSync(home, { recursive: true, force: true });
  }
}

function child(home: string, source: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const process = spawn(globalThis.process.execPath, ["--input-type=module", "-e", source], {
      env: { ...globalThis.process.env, FITPET_HOME: home },
      stdio: ["ignore", "ignore", "pipe"],
    });
    let stderr = "";
    process.stderr.setEncoding("utf8").on("data", (text) => { stderr += text; });
    process.on("error", reject);
    process.on("exit", (code) => code === 0 ? resolve() : reject(new Error(`Child exit ${code}: ${stderr}`)));
  });
}

test("real parallel processes preserve every read-modify-write increment", async () => {
  const home = mkdtempSync(join(tmpdir(), "fitpet-lock-parallel-"));
  try {
    writeFileSync(join(home, "counter.json"), "0");
    const source = `
      import { withStateLock } from ${JSON.stringify(moduleUrl)};
      import { readFileSync, writeFileSync } from 'node:fs';
      import { join } from 'node:path';
      const path = join(process.env.FITPET_HOME, 'counter.json');
      for (let i = 0; i < 30; i++) withStateLock(() => {
        const value = JSON.parse(readFileSync(path, 'utf8'));
        Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 1);
        writeFileSync(path, JSON.stringify(value + 1));
      });
    `;
    await Promise.all(Array.from({ length: 6 }, () => child(home, source)));
    assert.equal(JSON.parse(readFileSync(join(home, "counter.json"), "utf8")), 180);
    assert.equal(existsSync(join(home, "state.lock")), false);
  } finally { rmSync(home, { recursive: true, force: true }); }
});

test("a confirmed dead child PID is reclaimed even by parallel contenders", async () => {
  const home = mkdtempSync(join(tmpdir(), "fitpet-lock-dead-"));
  try {
    const pid = Number(execFileSync(process.execPath, ["-e", "process.stdout.write(String(process.pid))"], { encoding: "utf8" }));
    assert.throws(() => process.kill(pid, 0), { code: "ESRCH" });
    writeFileSync(join(home, "state.lock"), JSON.stringify({ pid }));
    writeFileSync(join(home, "counter.json"), "0");
    await Promise.all(Array.from({ length: 6 }, () => child(home, `
      import { withStateLock } from ${JSON.stringify(moduleUrl)};
      import { readFileSync, writeFileSync } from 'node:fs';
      const path = ${JSON.stringify(join(home, "counter.json"))};
      withStateLock(() => {
        const value = JSON.parse(readFileSync(path, 'utf8'));
        Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 15);
        writeFileSync(path, JSON.stringify(value + 1));
      });
    `)));
    assert.equal(readFileSync(join(home, "counter.json"), "utf8"), "6");
  } finally { rmSync(home, { recursive: true, force: true }); }
});

test("returns callback value and releases after a throw", () => sandbox((home) => {
  const error = new Error("callback failed");
  assert.throws(() => withStateLock(() => { throw error; }), (caught) => caught === error);
  assert.equal(existsSync(join(home, "state.lock")), false);
  assert.equal(withStateLock(() => 42), 42);
}));

test("finally does not remove a replacement lock", () => sandbox((home) => {
  const path = join(home, "state.lock");
  const replacement = JSON.stringify({ pid: process.pid, replacement: true });
  withStateLock(() => {
    unlinkSync(path);
    writeFileSync(path, replacement);
  });
  assert.equal(readFileSync(path, "utf8"), replacement);
}));

function expectTimeout(home: string, contents: string): void {
  const path = join(home, "state.lock");
  writeFileSync(path, contents);
  let called = false;
  const start = performance.now();
  assert.throws(() => withStateLock(() => { called = true; }), /Timed out acquiring FitPet state lock/);
  const elapsed = performance.now() - start;
  assert.equal(called, false);
  assert.ok(elapsed >= 1_900 && elapsed < 4_000, `bounded wait: ${elapsed}ms`);
  assert.equal(readFileSync(path, "utf8"), contents);
}

test("live owner is never stolen, regardless of recorded age", () => sandbox((home) => {
  expectTimeout(home, JSON.stringify({ pid: process.pid, createdAt: "1970-01-01T00:00:00Z" }));
}));

test("malformed and empty orphan locks time out without unlinking", () => sandbox((home) => {
  expectTimeout(home, "{broken");
  expectTimeout(home, "");
}));

test("an orphan recovery guard fails closed for a dead-owner lock", () => sandbox((home) => {
  const pid = Number(execFileSync(process.execPath, ["-e", "process.stdout.write(String(process.pid))"], { encoding: "utf8" }));
  assert.throws(() => process.kill(pid, 0), { code: "ESRCH" });
  writeFileSync(join(home, "state.lock.recover"), "");
  expectTimeout(home, JSON.stringify({ pid }));
  assert.equal(existsSync(join(home, "state.lock.recover")), true);
}));
