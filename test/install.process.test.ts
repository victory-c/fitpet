// Process-level installer tests: run the REAL `fitpet install` against sandbox settings files
// in a temp dir. Covers the two safety fixes — corrupt-file abort, and --print redaction.

import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync, readFileSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const CLI = join(ROOT, "src", "cli.ts");

function run(args: string[]): string {
  return execFileSync("node", [CLI, ...args], { encoding: "utf8" });
}
function runExpectFail(args: string[]): { status: number; stderr: string } {
  try {
    execFileSync("node", [CLI, ...args], { encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] });
    return { status: 0, stderr: "" };
  } catch (e) {
    const err = e as { status?: number; stderr?: string };
    return { status: err.status ?? 1, stderr: String(err.stderr ?? "") };
  }
}
function backups(dir: string): string[] {
  return readdirSync(dir).filter((n) => n.includes("fitpet-backup"));
}

test("install aborts on a corrupt settings file and leaves it untouched", () => {
  const dir = mkdtempSync(join(tmpdir(), "fitpet-inst-"));
  try {
    const f = join(dir, "settings.json");
    const corrupt = '{ "theme": "dark", oops not json';
    writeFileSync(f, corrupt, "utf8");
    const r = runExpectFail(["install", "--settings", f]);
    assert.notEqual(r.status, 0, "should exit non-zero");
    assert.match(r.stderr, /not valid JSON/);
    assert.equal(readFileSync(f, "utf8"), corrupt, "file must be unchanged");
    assert.equal(backups(dir).length, 0, "no backup written on abort");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("install --repair backs up the corrupt file, then writes valid FitPet settings", () => {
  const dir = mkdtempSync(join(tmpdir(), "fitpet-inst-"));
  try {
    const f = join(dir, "settings.json");
    writeFileSync(f, "not json at all", "utf8");
    run(["install", "--settings", f, "--repair", "--skills-dir", join(dir, "skills")]);
    const parsed = JSON.parse(readFileSync(f, "utf8")) as { statusLine?: unknown };
    assert.ok(parsed.statusLine, "fresh settings written");
    assert.equal(backups(dir).length, 1, "the corrupt original was backed up");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("install --print never emits a pre-existing command string (no token leak)", () => {
  const dir = mkdtempSync(join(tmpdir(), "fitpet-inst-"));
  try {
    const f = join(dir, "settings.json");
    const SECRET = "SECRETTOKEN-do-not-leak-123";
    writeFileSync(
      f,
      JSON.stringify({
        statusLine: { type: "command", command: `node /my/sl.js --token=${SECRET}` },
        hooks: { Stop: [{ hooks: [{ type: "command", command: `node /my/stop.js --token=${SECRET}` }] }] },
      }),
      "utf8",
    );
    const out = run(["install", "--settings", f, "--print"]);
    assert.doesNotMatch(out, new RegExp(SECRET), "dry-run output must not contain the foreign token");
    assert.match(readFileSync(f, "utf8"), new RegExp(SECRET), "a dry run must not modify the file");
    assert.equal(backups(dir).length, 0, "dry run writes nothing");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
