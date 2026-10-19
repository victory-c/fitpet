import { LONG_SESSION_MINUTES, REACTION_TTL_SECONDS } from "../config.ts";
import { quipsFor } from "../content/quips.ts";
import { selectQuip } from "../quip.ts";
import type { Personality } from "../types.ts";
import type { CodingTelemetry } from "./derive.ts";

export interface SessionReminder { text: string; event: "long_session"; setAtMs: number }

// One reminder per observed session per app run, held above ordinary hook quips.
// Never writes state or ticks the fitness simulation.
export function createSessionReminder(threshold = LONG_SESSION_MINUTES, rng: () => number = Math.random) {
  let remindedSession: string | null = null;
  let live: SessionReminder | null = null;
  let lastText: string | undefined;
  return (coding: CodingTelemetry | null, personality: Personality, nowMs: number): SessionReminder | null => {
    if (!coding?.active || !coding.sessionStartAt) {
      live = null;
      return null;
    }
    if (live && remindedSession !== coding.sessionStartAt) live = null;
    if (coding.currentCodingSessionMinutes >= threshold && remindedSession !== coding.sessionStartAt) {
      remindedSession = coding.sessionStartAt;
      lastText = selectQuip(quipsFor("long_session", personality), lastText, rng);
      live = { text: lastText, event: "long_session", setAtMs: nowMs };
    }
    return live && nowMs >= live.setAtMs && nowMs - live.setAtMs < REACTION_TTL_SECONDS * 1000 ? live : null;
  };
}