#!/usr/bin/env node
// SessionStart: advance the sim since we last saw the user, set a welcome (or "stale")
// quip, and — only when the pet hasn't synced in a while — nudge the model to refresh it
// from Garmin. The nudge is best-effort context; the manual /fitpet-sync skill is the
// guaranteed path. A hook can't call an MCP tool itself, so we ask the model to.

import { readHookInput, nowIso } from "./hooklib.ts";
import { loadState, saveState } from "../state.ts";
import { tick } from "../vitality.ts";
import { applyReaction } from "../reactions.ts";
import { STALE_HOURS } from "../config.ts";

try {
  readHookInput(); // we don't need fields today, but drain stdin cleanly
  const now = nowIso();
  const { state } = tick(loadState(), now);

  const last = state.fitness.lastSyncAt ? new Date(state.fitness.lastSyncAt).getTime() : 0;
  const hoursSinceSync = (Date.now() - last) / 3_600_000;
  const stale = !state.fitness.lastSyncAt || hoursSinceSync >= STALE_HOURS;

  applyReaction(state, stale ? "stale" : "session_start", now);
  saveState(state);

  if (stale) {
    const additionalContext =
      "Your FitPet companion's fitness data is stale. When convenient, run the `/fitpet-sync` " +
      "skill (it reads your recent Garmin activity and training load, then updates the pet). " +
      "No need to mention this unless the user asks.";
    process.stdout.write(
      JSON.stringify({ hookSpecificOutput: { hookEventName: "SessionStart", additionalContext } }) + "\n",
    );
  }
} catch {
  /* never break a session */
}
process.exit(0);
