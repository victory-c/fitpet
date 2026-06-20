// Persists the companion window's position so it reopens where you left it. Stored as
// ~/.fitpet/window.json (next to state.json). Electron-free on purpose, so it can be unit
// tested with a temp FITPET_HOME; main.ts wires it to the BrowserWindow.

import { join } from "node:path";
import { readFileSync, writeFileSync, mkdirSync, renameSync } from "node:fs";
import { fitpetHome } from "../state.ts";

export interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function windowConfigPath(): string {
  return join(fitpetHome(), "window.json");
}

// Accept only a fully-numeric, sanely-sized bounds object; anything else -> null (use default).
export function validateBounds(raw: unknown): Bounds | null {
  if (!raw || typeof raw !== "object") return null;
  const b = raw as Record<string, unknown>;
  const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);
  const x = num(b.x);
  const y = num(b.y);
  const width = num(b.width);
  const height = num(b.height);
  if (x === null || y === null || width === null || height === null) return null;
  if (width < 80 || height < 80 || width > 4000 || height > 4000) return null;
  return { x, y, width, height };
}

export function loadBounds(): Bounds | null {
  try {
    return validateBounds(JSON.parse(readFileSync(windowConfigPath(), "utf8")));
  } catch {
    return null;
  }
}

export function saveBounds(b: Bounds): void {
  try {
    const dir = fitpetHome();
    mkdirSync(dir, { recursive: true });
    const tmp = join(dir, `.window.tmp-${process.pid}-${Date.now()}.json`);
    writeFileSync(tmp, JSON.stringify(b), "utf8");
    renameSync(tmp, windowConfigPath()); // atomic
  } catch {
    /* best effort — position memory is a nicety, never fatal */
  }
}
