import { NAG_POLICIES, REACTION_TTL_SECONDS } from "../config.ts";
import type { NagIntensity, Personality } from "../types.ts";
import { severityOf, severityRank, type Severity } from "./severity.ts";

const LINES: Record<Severity, Record<Personality, string>> = {
  NORMAL: { earnest: "Looking more balanced. Nice break!", sarcastic: "You escaped the terminal. Character development.", chill: "balance restored. nice 🌿" },
  CONCERNING: { earnest: "Screen debt is building. Step outside for a little while?", sarcastic: "Your screen debt called. It wants grass.", chill: "maybe a little outside time? 🌿" },
  DEGRADED: { earnest: "I'm getting worried. A real break would help.", sarcastic: "The refactor can wait. Your legs remember walking.", chill: "big screen day. let's take a proper break." },
  CRITICAL: { earnest: "Let's pause and get outside. I'll be here when you're back.", sarcastic: "You are not a background process. Go outside.", chill: "time to log off for a bit, fren 🌿" },
};

export function createConcernReminder() {
  let previous: Severity | null = null;
  let live: { text: string; event: string; setAtMs: number } | null = null;
  return (score: number | null, personality: Personality, now: number,
    options: { intensity?: NagIntensity; snoozed?: boolean } = {}) => {
    if (score === null) { live = null; return null; }
    const next = severityOf(score);
    const eligible = next === "NORMAL" || NAG_POLICIES[options.intensity ?? "normal"].concernBands.includes(next);
    if (previous !== null && previous !== next) live = null;
    if (options.snoozed || !eligible) live = null;
    if (!options.snoozed && eligible && ((previous === null && next !== "NORMAL") ||
      (previous !== null && (severityRank(next) > severityRank(previous) || (next === "NORMAL" && previous !== next))))) {
      live = { text: LINES[next][personality], event: `debt_${next.toLowerCase()}`, setAtMs: now };
    }
    previous = next;
    return live && now >= live.setAtMs && now - live.setAtMs < REACTION_TTL_SECONDS * 1000 ? live : null;
  };
}
