import { test } from "node:test";
import assert from "node:assert/strict";
import {
  copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync,
  rmSync, statSync, symlinkSync, writeFileSync,
} from "node:fs";
import fs from "node:fs";
import { syncBuiltinESMExports } from "node:module";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import { pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";
import { clineHookPlan, installClineHooks, uninstallClineHooks } from "../src/install-cline.ts";
import type { TestContext } from "node:test";

function fixture(t: TestContext): string {
  const root = mkdtempSync(join(tmpdir(), "fitpet cline 'quoted' "));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  return root;
}
const common = ["TaskStart", "UserPromptSubmit", "PreToolUse", "PostToolUse", "TaskComplete", "TaskCancel"];

for (const host of ["vscode", "cli"] as const) {
  test(`${host}: pure plan, exact filenames, install and uninstall idempotency`, t => {
    const root = fixture(t);
    const plan = clineHookPlan(host, root);
    assert.deepEqual(readdirSync(root), []);
    const events = host === "cli" ? [...common, "TaskResume", "TaskError", "SessionShutdown"] : common;
    assert.deepEqual(plan.files.map(f => basename(f.path)), events.map(e => e + (host === "cli" ? ".sh" : "")));
    assert.deepEqual(installClineHooks(host, root), plan.files.map(f => f.path));
    const times = plan.files.map(f => statSync(f.path).mtimeMs);
    assert.deepEqual(installClineHooks(host, root), []);
    assert.deepEqual(plan.files.map(f => statSync(f.path).mtimeMs), times);
    for (const file of plan.files) {
      assert.equal(readFileSync(file.path, "utf8"), file.content);
      assert.equal(statSync(file.path).mode & 0o777, 0o755);
    }
    const foreign = join(plan.directory, "Notification.sh");
    writeFileSync(foreign, "foreign secret");
    assert.deepEqual(uninstallClineHooks(host, root), plan.files.map(f => f.path));
    assert.deepEqual(uninstallClineHooks(host, root), []);
    assert.equal(readFileSync(foreign, "utf8"), "foreign secret");
    assert.ok(statSync(plan.directory).isDirectory());
  });

  test(`${host}: all conflicts preflight before writes/deletes; content never exposed`, t => {
    const root = fixture(t);
    const plan = clineHookPlan(host, root);
    mkdirSync(plan.directory, { recursive: true });
    const last = plan.files.at(-1)!;
    writeFileSync(last.path, "PRIVATE_TOKEN_DO_NOT_PRINT");
    for (const action of [installClineHooks, uninstallClineHooks]) {
      assert.throws(() => action(host, root), error => {
        assert.doesNotMatch(String(error), /PRIVATE_TOKEN/);
        return true;
      });
      assert.deepEqual(readdirSync(plan.directory), [basename(last.path)]);
    }
    rmSync(last.path);
    installClineHooks(host, root);
    writeFileSync(last.path, last.content + "# edited\n");
    assert.throws(() => uninstallClineHooks(host, root), /conflict/);
    for (const file of plan.files) assert.ok(existsSync(file.path));
  });

  test(`${host}: duplicate recognized extensions and case variants are conflicts`, t => {
    const root = fixture(t);
    const plan = clineHookPlan(host, root);
    mkdirSync(plan.directory, { recursive: true });
    for (const name of ["TaskStart.py", "TASKSTART.JS", "TaskStart.ts", " TaskStart .sh", host === "cli" ? "TaskStart" : "TaskStart.sh"]) {
      const path = join(plan.directory, name);
      writeFileSync(path, "foreign");
      assert.throws(() => installClineHooks(host, root), /conflict/);
      assert.deepEqual(readdirSync(plan.directory), [name]);
      rmSync(path);
    }
  });

  test(`${host}: reject symlinks and non-directory ancestors`, t => {
    const root = fixture(t);
    const outside = join(root, "outside");
    mkdirSync(outside);
    const parent = join(root, host === "cli" ? ".cline" : ".clinerules");
    symlinkSync(outside, parent);
    assert.throws(() => installClineHooks(host, root), /conflict/);
    rmSync(parent);
    writeFileSync(parent, "foreign");
    assert.throws(() => installClineHooks(host, root), /conflict/);
    rmSync(parent);
    mkdirSync(parent);
    symlinkSync(outside, join(parent, "hooks"));
    assert.throws(() => uninstallClineHooks(host, root), /conflict/);
    rmSync(join(parent, "hooks"));
    mkdirSync(join(parent, "hooks"));
    const plan = clineHookPlan(host, root);
    symlinkSync(join(outside, "missing"), plan.files[0]!.path);
    assert.throws(() => installClineHooks(host, root), /conflict/);
    assert.throws(() => uninstallClineHooks(host, root), /conflict/);
    assert.deepEqual(readdirSync(outside), []);
    rmSync(plan.files[0]!.path);
    mkdirSync(plan.files[0]!.path);
    assert.throws(() => installClineHooks(host, root), /conflict/);
  });
}


test("requires explicit absolute existing non-symlink workspace", t => {
  const root = fixture(t);
  for (const path of ["", ".", "relative", join(root, "missing")]) {
    assert.throws(() => clineHookPlan("cli", path), /absolute existing workspace/);
  }
  const file = join(root, "file");
  writeFileSync(file, "x");
  assert.throws(() => installClineHooks("cli", file), /workspace/);
  const link = join(root, "link");
  symlinkSync(root, link);
  assert.throws(() => clineHookPlan("cli", link), /workspace/);
});

test("write failure rolls back only files created by this invocation", t => {
  const root = fixture(t);
  const plan = clineHookPlan("cli", root);
  mkdirSync(plan.directory, { recursive: true });
  const first = plan.files[0]!;
  writeFileSync(first.path, first.content);
  const foreign = join(plan.directory, "unrelated.txt");
  writeFileSync(foreign, "preserve");
  const original = fs.writeFileSync;
  let writes = 0;
  fs.writeFileSync = ((...args: Parameters<typeof fs.writeFileSync>) => {
    if (++writes === 2) throw new Error("simulated disk failure");
    return original(...args);
  }) as typeof fs.writeFileSync;
  syncBuiltinESMExports();
  try {
    assert.throws(() => installClineHooks("cli", root), /simulated disk failure/);
  } finally {
    fs.writeFileSync = original;
    syncBuiltinESMExports();
  }
  assert.deepEqual(readdirSync(plan.directory).sort(), [basename(first.path), "unrelated.txt"].sort());
  assert.equal(readFileSync(first.path, "utf8"), first.content);
  assert.equal(readFileSync(foreign, "utf8"), "preserve");
});

test("launchers quote absolute paths, forward input, redact errors and fail open", async t => {
  const root = fixture(t);
  // Relocate only the installer into a disposable path to exercise actual shell quoting
  // without changing the real adapter or invoking any live hooks.
  const src = join(root, "source 'quoted'");
  mkdirSync(join(src, "hooks"), { recursive: true });
  const modulePath = join(src, "install-cline.ts");
  copyFileSync(new URL("../src/install-cline.ts", import.meta.url), modulePath);
  const isolated = await import(pathToFileURL(modulePath).href) as typeof import("../src/install-cline.ts");
  const adapterPath = join(src, "hooks", "cline.ts");
  const script = isolated.clineHookPlan("cli", root).files[0]!.content;
  assert.ok(script.startsWith("#!/bin/sh\n"));
  assert.ok(script.includes(process.execPath.replaceAll("'", "'\\''")));
  writeFileSync(adapterPath, `process.stdin.resume(); process.stdin.on('data', () => {}); process.stdin.on('end', () => { console.error('SECRET'); console.log(JSON.stringify({cancel:false, args:process.argv.slice(2)})); });`);
  const success = spawnSync("/bin/sh", ["-c", script], { input: "{}", encoding: "utf8" });
  assert.equal(success.status, 0);
  assert.equal(success.stderr, "");
  assert.deepEqual(JSON.parse(success.stdout), { cancel: false, args: ["--host", "cli", "--event", "TaskStart"] });
  writeFileSync(adapterPath, `console.log('partial'); console.error('SECRET'); process.exit(1);`);
  const failure = spawnSync("/bin/sh", ["-c", script], { input: "{}", encoding: "utf8" });
  assert.equal(failure.status, 0);
  assert.equal(failure.stderr, "");
  assert.equal(failure.stdout, '{"cancel":false}\n');
  rmSync(adapterPath);
  const missing = spawnSync("/bin/sh", ["-c", script], { encoding: "utf8" });
  assert.equal(missing.status, 0);
  assert.equal(missing.stderr, "");
  assert.equal(missing.stdout, '{"cancel":false}\n');
});
