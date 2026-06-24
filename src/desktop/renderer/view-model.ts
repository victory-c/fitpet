import type { Tier as TierName } from "../../types.ts";

// --- Shelldon composition selection (pure; returns descriptor KEYS, not pixels) ------------
// The renderer maps these keys to art via sprites/shelldon/index.ts. Keeping it key-based is
// what makes every combinatorial decision unit-testable without touching a canvas.

export type ShellTier = "boot" | "mono" | "color" | "flat";
export type EyeState = "happy" | "neutral" | "tired" | "closed";
export type SportKind = "run" | "cycle" | "swim" | "none";
export type ClawState = "rest" | "raised" | "sport";
export type ScreenMode = "flash-pos" | "flash-neg" | "flash-neutral" | "boot" | "standby" | "sport" | "vitals";

// How recent an activity must be for the BODY to perform the full sport animation (~3h) vs
// for the SCREEN to keep showing the sport readout (~24h). The split prevents a single swim
// from making Shelldon "perform swimming" for days. Both are tunable.
export const BODY_SPORT_MS = 3 * 60 * 60 * 1000;
export const SCREEN_SPORT_MS = 24 * 60 * 60 * 1000;
export const REACTION_FLASH_MS = 1500; // screen flash is brief; the speech bubble lasts the full TTL

export interface VmSnap {
  stage: string;
  tier: TierName;
  vitality: number;
  lastSport: string | null;
  lastActivityAt: string | null;
  reaction: { event: string; setAtMs: number } | null;
}

// Shell hardware is DERIVED from growth stage (no separate field, no schema bump).
export function shellTierForStage(stage: string): ShellTier {
  switch (stage) {
    case "egg":
      return "boot";
    case "hatchling":
      return "mono";
    case "juvenile":
      return "color";
    default:
      return "flat"; // adult (and any unknown stage)
  }
}

// Overall size multiplier — growth shows as Shelldon physically getting bigger.
export function stageScale(stage: string): number {
  switch (stage) {
    case "hatchling":
      return 0.62;
    case "juvenile":
      return 0.82;
    default:
      return 1; // adult / egg
  }
}

export function eyeStateForTier(tier: TierName): EyeState {
  switch (tier) {
    case "thriving":
      return "happy";
    case "wilting":
      return "tired";
    case "dormant":
      return "closed";
    default:
      return "neutral"; // healthy
  }
}

// 0 = full colour (vitality 100) … 1 = full grey (vitality 0).
export function tintFactorForVitality(vitality: number): number {
  return Math.max(0, Math.min(1, 1 - vitality / 100));
}

export interface Posture {
  bodyDy: number;
  clawDy: number;
  eyeDy: number;
}
// Claws high / eyes tall when thriving; sag + droop as vitality falls.
export function postureForTier(tier: TierName): Posture {
  switch (tier) {
    case "thriving":
      return { bodyDy: 0, clawDy: -1, eyeDy: -1 };
    case "wilting":
      return { bodyDy: 1, clawDy: 2, eyeDy: 2 };
    case "dormant":
      return { bodyDy: 2, clawDy: 3, eyeDy: 3 };
    default:
      return { bodyDy: 0, clawDy: 0, eyeDy: 0 }; // healthy
  }
}

export interface VitalsParams {
  rate: number; // heartbeat speed multiplier
  amp: number; // waveform amplitude as a fraction of screen height
  color: string; // phosphor colour
}
export function vitalsParams(vitality: number): VitalsParams {
  const v = Math.max(0, Math.min(100, vitality));
  return {
    rate: 0.45 + (v / 100) * 0.95, // weak/slow when low, fast when thriving
    amp: 0.12 + (v / 100) * 0.26,
    color: v >= 45 ? "#54f07a" : v >= 15 ? "#e0b341" : "#9a6b2f", // green -> amber -> dim
  };
}

export function sportKindFor(lastSport: string | null): SportKind {
  const s = (lastSport ?? "").toLowerCase();
  if (/(cycl|bik|ride)/.test(s)) return "cycle";
  if (/swim/.test(s)) return "swim";
  if (/(run|jog)/.test(s)) return "run";
  return "none";
}

function msSince(iso: string | null, now: number): number {
  if (!iso) return Infinity;
  const t = Date.parse(iso);
  return Number.isFinite(t) ? now - t : Infinity;
}

// Body performs the sport only briefly after a recent activity; otherwise it just idles.
export function bodySportActive(s: VmSnap, now: number): boolean {
  if (s.tier === "dormant") return false;
  return sportKindFor(s.lastSport) !== "none" && msSince(s.lastActivityAt, now) < BODY_SPORT_MS;
}
// The screen shows the sport readout for longer than the body performs it.
export function screenSportRecent(s: VmSnap, now: number): boolean {
  return sportKindFor(s.lastSport) !== "none" && msSince(s.lastActivityAt, now) < SCREEN_SPORT_MS;
}

const POS_EVENTS = new Set(["test_pass", "fed", "tier_up", "evolved", "revived", "session_start"]);
const NEG_EVENTS = new Set(["test_fail", "error", "tier_down", "stale"]);
export function reactionFlashKind(event: string): "pos" | "neg" | "neutral" {
  if (POS_EVENTS.has(event)) return "pos";
  if (NEG_EVENTS.has(event)) return "neg";
  return "neutral";
}

// Screen precedence: a fresh reaction flash briefly overrides; else egg boot; else dormant
// standby; else a recent sport readout; else the vitals monitor. Never blank.
export function screenMode(s: VmSnap, now: number): ScreenMode {
  if (s.reaction && now - s.reaction.setAtMs >= 0 && now - s.reaction.setAtMs < REACTION_FLASH_MS) {
    return `flash-${reactionFlashKind(s.reaction.event)}` as ScreenMode;
  }
  if (s.stage === "egg") return "boot";
  if (s.tier === "dormant") return "standby";
  if (screenSportRecent(s, now)) return "sport";
  return "vitals";
}

export interface Parts {
  stage: string;
  shellTier: ShellTier;
  eyes: EyeState;
  claws: ClawState;
  sport: SportKind;
  tintFactor: number;
  posture: Posture;
}

export function partsFor(s: VmSnap, now: number): Parts {
  const sportActive = bodySportActive(s, now);
  const sport = sportActive ? sportKindFor(s.lastSport) : "none";
  const claws: ClawState = sportActive ? "sport" : s.tier === "thriving" ? "raised" : "rest";
  return {
    stage: s.stage,
    shellTier: shellTierForStage(s.stage),
    eyes: eyeStateForTier(s.tier),
    claws,
    sport,
    tintFactor: tintFactorForVitality(s.vitality),
    posture: postureForTier(s.tier),
  };
}

// Never-blank fallback: a healthy adult idle.
export function safeComposition(): Parts {
  return {
    stage: "adult",
    shellTier: "flat",
    eyes: "neutral",
    claws: "rest",
    sport: "none",
    tintFactor: 0,
    posture: { bodyDy: 0, clawDy: 0, eyeDy: 0 },
  };
}
