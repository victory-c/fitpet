import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

test("validateBounds accepts good bounds and rejects bad ones; load/save round-trips", async () => {
  const dir = mkdtempSync(join(tmpdir(), "fitpet-win-"));
  process.env.FITPET_HOME = dir;
  const { validateBounds, loadBounds, saveBounds } = await import("../src/desktop/window-store.ts");

  assert.deepEqual(validateBounds({ x: 10, y: 20, width: 260, height: 300 }), { x: 10, y: 20, width: 260, height: 300 });
  assert.equal(validateBounds({ x: 10, y: 20 }), null, "missing fields");
  assert.equal(validateBounds({ x: "a", y: 0, width: 100, height: 100 }), null, "non-number");
  assert.equal(validateBounds({ x: 0, y: 0, width: 5, height: 5 }), null, "absurd size");
  assert.equal(validateBounds(null), null);

  saveBounds({ x: 42, y: 7, width: 260, height: 300 });
  assert.deepEqual(loadBounds(), { x: 42, y: 7, width: 260, height: 300 });

  writeFileSync(join(dir, "window.json"), "{ not json", "utf8");
  assert.equal(loadBounds(), null, "corrupt file -> null (fall back to default)");

  rmSync(dir, { recursive: true, force: true });
  delete process.env.FITPET_HOME;
});
