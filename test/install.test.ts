import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  mergeSettings,
  unmergeSettings,
  previewAdditions,
  readSettingsStrict,
  SettingsParseError,
} from "../src/install.ts";

const SRC = "/home/me/fitpet/src";

test("previewAdditions shows only FitPet's additions, never a pre-existing command string", () => {
  const existing = {
    statusLine: { type: "command", command: "node /other/sl.js --token=SEKRET" },
    hooks: { Stop: [{ hooks: [{ type: "command", command: "node /other/stop.js --token=SEKRET" }] }] },
  };
  const preview = previewAdditions(existing, SRC);
  const json = JSON.stringify(preview);
  assert.doesNotMatch(json, /SEKRET/, "no foreign token");
  assert.doesNotMatch(json, /other/, "no foreign path");
  assert.equal(preview.statusLine, null, "foreign statusLine present -> we won't show ours being set");
  assert.ok((preview.hooks.Stop[0] as { hooks: { command: string }[] }).hooks[0].command.includes(SRC));
});

test("previewAdditions includes our statusLine when none exists", () => {
  const preview = previewAdditions({}, SRC);
  assert.ok((preview.statusLine as { command: string }).command.includes(SRC));
});

test("readSettingsStrict: empty -> {}, valid -> parsed, missing -> {}, corrupt -> throws", () => {
  const dir = mkdtempSync(join(tmpdir(), "fitpet-strict-"));
  try {
    const f = join(dir, "s.json");
    writeFileSync(f, "", "utf8");
    assert.deepEqual(readSettingsStrict(f), {});
    writeFileSync(f, JSON.stringify({ a: 1 }), "utf8");
    assert.deepEqual(readSettingsStrict(f), { a: 1 });
    assert.deepEqual(readSettingsStrict(join(dir, "missing.json")), {});
    writeFileSync(f, "{ not json", "utf8");
    assert.throws(() => readSettingsStrict(f), SettingsParseError);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("merge adds statusLine + all four hook events to empty settings", () => {
  const { settings, added } = mergeSettings({}, SRC);
  assert.ok((settings.statusLine as { command: string }).command.includes(SRC));
  const hooks = settings.hooks as Record<string, unknown[]>;
  for (const ev of ["SessionStart", "Stop", "PostToolUse", "PostToolUseFailure"]) {
    assert.ok(Array.isArray(hooks[ev]), `${ev} present`);
  }
  assert.ok(added.includes("statusLine"));
});

test("merge preserves unrelated settings keys", () => {
  const existing = { theme: "dark", env: { SECRET: "x" }, permissions: { allow: ["Bash(ls)"] } };
  const { settings } = mergeSettings(existing, SRC);
  assert.equal(settings.theme, "dark");
  assert.deepEqual(settings.env, { SECRET: "x" });
  assert.deepEqual(settings.permissions, { allow: ["Bash(ls)"] });
});

test("merge is idempotent: running twice does not duplicate hooks", () => {
  const once = mergeSettings({}, SRC).settings;
  const twice = mergeSettings(once, SRC).settings;
  const hooks = twice.hooks as Record<string, unknown[]>;
  assert.equal(hooks.PostToolUse.length, 1);
  assert.equal(hooks.SessionStart.length, 1);
});

test("merge does NOT overwrite a foreign statusLine unless --force", () => {
  const existing = { statusLine: { type: "command", command: "node /other/thing.js" } };
  const soft = mergeSettings(existing, SRC);
  assert.equal((soft.settings.statusLine as { command: string }).command, "node /other/thing.js");
  assert.ok(soft.warnings.some((w) => /already have a statusLine/.test(w)));
  const forced = mergeSettings(existing, SRC, { force: true });
  assert.ok((forced.settings.statusLine as { command: string }).command.includes(SRC));
});

test("merge appends our hook alongside an existing foreign hook", () => {
  const existing = { hooks: { Stop: [{ hooks: [{ type: "command", command: "node /other/stop.js" }] }] } };
  const { settings } = mergeSettings(existing, SRC);
  const stop = (settings.hooks as Record<string, unknown[]>).Stop;
  assert.equal(stop.length, 2); // foreign + ours
});

test("unmerge removes exactly our entries and leaves foreign ones", () => {
  const existing = {
    theme: "dark",
    hooks: { Stop: [{ hooks: [{ type: "command", command: "node /other/stop.js" }] }] },
  };
  const installed = mergeSettings(existing, SRC).settings;
  const { settings, removed } = unmergeSettings(installed, SRC);
  assert.equal(settings.theme, "dark");
  assert.equal(settings.statusLine, undefined);
  const stop = (settings.hooks as Record<string, unknown[]>).Stop;
  assert.equal(stop.length, 1);
  assert.equal((stop[0] as { hooks: { command: string }[] }).hooks[0].command, "node /other/stop.js");
  assert.ok(removed.includes("statusLine"));
});
