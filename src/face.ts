#!/usr/bin/env node
// The status-line command. Claude Code pipes session JSON on stdin; we read the pet's
// state and print ONE line. It must be fast and must never error to blank, so everything
// is wrapped: any failure prints a safe default. It does NOT write state (pure read).

import { readFileSync } from "node:fs";
import { loadState } from "./state.ts";
import { renderFace, safeFace } from "./render.ts";

function readStdin(): string {
  try {
    return readFileSync(0, "utf8");
  } catch {
    return "";
  }
}

try {
  let usedPercent: number | null = null;
  const raw = readStdin();
  if (raw) {
    try {
      const j = JSON.parse(raw) as { context_window?: { used_percentage?: unknown } };
      const p = j.context_window?.used_percentage;
      if (typeof p === "number") usedPercent = p;
    } catch {
      /* ignore malformed input; fall through with no context */
    }
  }
  const ascii = process.env.FITPET_ASCII === "1";
  process.stdout.write(renderFace(loadState(), { usedPercent, ascii }) + "\n");
} catch {
  process.stdout.write(safeFace() + "\n");
}
