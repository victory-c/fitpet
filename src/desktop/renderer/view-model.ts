import { EGG, SPROUT, type TierName } from "./sprites/sprout.ts";

export const IDLE_CLASSES = ["idle-default", "idle-cycling", "idle-running", "idle-swimming", "idle-walking"];

const NEGATIVE = new Set(["test_fail", "error", "tier_down", "stale"]);
const POSITIVE = new Set(["test_pass", "fed", "tier_up", "evolved", "revived", "session_start"]);

export function spriteFor(s: { stage: string; tier: TierName }): string[] {
  if (s.stage === "egg") return EGG;
  return SPROUT[s.tier] ?? SPROUT.healthy;
}

export function idleClassForSport(sport: string | null): string {
  const s = (sport ?? "").toLowerCase();
  if (/(cycl|bik|ride)/.test(s)) return "idle-cycling";
  if (/swim/.test(s)) return "idle-swimming";
  if (/(run|jog)/.test(s)) return "idle-running";
  if (/(walk|hik)/.test(s)) return "idle-walking";
  return "idle-default";
}

export function idleClassForSnap(s: { tier: TierName; lastSport: string | null }): string {
  return idleClassForSport(s.tier === "dormant" ? null : s.lastSport);
}

export function reactionAnimationClass(event: string): "shake" | "bounce" | "pop" {
  if (NEGATIVE.has(event)) return "shake";
  if (POSITIVE.has(event)) return "bounce";
  return "pop";
}
