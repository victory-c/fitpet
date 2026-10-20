import { NAG_POLICIES, REACTION_TTL_SECONDS } from "../config.ts";
import { quipsFor } from "../content/quips.ts";
import { selectQuip } from "../quip.ts";
import type { NagIntensity, Personality } from "../types.ts";
import type { CodingTelemetry } from "./derive.ts";

export interface SessionReminder { text: string; event: "long_session"; setAtMs: number }

// Opportunities are consumed even when snoozed; missed intervals never queue up.
// Never writes state or ticks the fitness simulation.
export function createSessionReminder(threshold?: number, rng: () => number = Math.random) {
  let session: string | null = null;
  let lastOpportunity: number | null = null;
  let latestTime = -Infinity;
  let live: SessionReminder | null = null;
  let liveIsRepeat = false;
  let lastText: string | undefined;
  return (coding: CodingTelemetry | null, personality: Personality, nowMs: number,
    options: { intensity?: NagIntensity; snoozed?: boolean } = {}): SessionReminder | null => {
    const policy = NAG_POLICIES[options.intensity ?? "normal"];
    const firstMinutes = threshold ?? policy.firstMinutes;
    if (!coding?.active || !coding.sessionStartAt) {
      live = null;
      return null;
    }
    if (session !== coding.sessionStartAt) {
      session = coding.sessionStartAt;
      lastOpportunity = null;
      latestTime = -Infinity;
      live = null;
    }
    const backwards = nowMs < latestTime;
    latestTime = Math.max(latestTime, nowMs);
    if (options.snoozed || coding.currentCodingSessionMinutes < firstMinutes ||
      (liveIsRepeat && policy.repeatMinutes === null)) live = null;
    const due = lastOpportunity === null
      ? coding.currentCodingSessionMinutes >= firstMinutes
      : policy.repeatMinutes !== null && nowMs - lastOpportunity >= policy.repeatMinutes * 60_000;
    if (!backwards && due) {
      liveIsRepeat = lastOpportunity !== null;
      lastOpportunity = nowMs;
      if (!options.snoozed) {
        lastText = selectQuip(quipsFor("long_session", personality), lastText, rng);
        live = { text: lastText, event: "long_session", setAtMs: nowMs };
      }
    }
    return live && nowMs >= live.setAtMs && nowMs - live.setAtMs < REACTION_TTL_SECONDS * 1000 ? live : null;
  };
}
