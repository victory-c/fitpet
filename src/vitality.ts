// Pure simulation logic. No file I/O, no clock-reading: every function takes its inputs
// (including "now") explicitly and returns a value. That is what makes it unit-testable.

import type { PetState, Tier, Stage } from "./types.ts";
import type { FitnessSnapshot } from "./sources/types.ts";
import {
  TIERS,
  STAGE_REQUIREMENTS,
  EASE_RATE,
  SPORT_FACTORS,
  DEFAULT_SPORT_FACTOR,
} from "./config.ts";

export function clamp(n: number, lo = 0, hi = 100): number {
  return Math.max(lo, Math.min(hi, n));
}

export function tierOf(vitality: number): Tier {
  if (vitality >= TIERS.thriving) return "thriving";
  if (vitality >= TIERS.healthy) return "healthy";
  if (vitality >= TIERS.wilting) return "wilting";
  return "dormant";
}

const TIER_RANK: Record<Tier, number> = {
  dormant: 0,
  wilting: 1,
  healthy: 2,
  thriving: 3,
};
export function tierRank(t: Tier): number {
  return TIER_RANK[t];
}

export function sportFactor(sport: string): number {
  const key = (sport ?? "").toLowerCase();
  return SPORT_FACTORS[key] ?? DEFAULT_SPORT_FACTOR;
}

// Total training load for the window. Prefer a native windowLoad; otherwise sum each
// activity's effort, falling back to duration x sport-intensity when effort is absent.
export function computeWindowLoad(snap: FitnessSnapshot): number {
  if (typeof snap.windowLoad === "number" && Number.isFinite(snap.windowLoad)) {
    return Math.max(0, snap.windowLoad);
  }
  let sum = 0;
  for (const a of snap.activities ?? []) {
    const per =
      typeof a.effort === "number" && Number.isFinite(a.effort)
        ? a.effort
        : (a.durationMin || 0) * sportFactor(a.sport);
    if (Number.isFinite(per)) sum += Math.max(0, per);
  }
  return sum;
}

export function rollingScoreFromLoad(load: number, loadGoal: number): number {
  if (!(loadGoal > 0)) return 0;
  return clamp((100 * load) / loadGoal);
}

// Move vitality a fraction of the way toward the target score. Symmetric (up or down),
// and crucially there is NO separate time-based penalty: decay only happens because a
// fresh sync lowered rollingScore, never because un-synced time passed.
export function easeTowardScore(vitality: number, score: number, rate = EASE_RATE): number {
  return clamp(vitality + rate * (score - vitality));
}

const STAGE_ORDER: Stage[] = ["egg", "hatchling", "juvenile", "adult"];
export function stageIndex(s: Stage): number {
  return STAGE_ORDER.indexOf(s);
}

// Advance to the highest stage whose requirements are met — needing BOTH enough real age
// AND enough healthy days — but only while currently Healthy+, and never regress.
export function advanceStage(current: Stage, healthyDays: number, ageDays: number, tier: Tier): Stage {
  if (tierRank(tier) < TIER_RANK.healthy) return current;
  const meets = (req: { minAgeDays: number; minHealthyDays: number }) =>
    ageDays >= req.minAgeDays && healthyDays >= req.minHealthyDays;
  let earned: Stage = "egg";
  if (meets(STAGE_REQUIREMENTS.adult)) earned = "adult";
  else if (meets(STAGE_REQUIREMENTS.juvenile)) earned = "juvenile";
  else if (meets(STAGE_REQUIREMENTS.hatchling)) earned = "hatchling";
  return stageIndex(earned) > stageIndex(current) ? earned : current;
}

// UTC calendar day key. Good enough for V1; timezone polish is a later concern.
export function dayKey(iso: string): string {
  return iso.slice(0, 10);
}

export function daysBetween(aIso: string, bIso: string): number {
  const a = new Date(aIso).getTime();
  const b = new Date(bIso).getTime();
  if (!Number.isFinite(a) || !Number.isFinite(b)) return 0;
  return Math.max(0, Math.floor((b - a) / 86_400_000));
}

export interface TickResult {
  state: PetState;
  evolved: boolean;
}

// Advance the simulation to `nowIso`: ease vitality toward rollingScore, count at most one
// healthy day, advance stage, refresh age. Never applies a time-based vitality penalty.
export function tick(state: PetState, nowIso: string): TickResult {
  const prevStage = state.stage;
  const vitality = easeTowardScore(state.vitality, state.fitness.rollingScore);

  let healthyDays = state.healthyDays;
  let lastHealthyDayCounted = state.lastHealthyDayCounted;
  const today = dayKey(nowIso);
  if (tierRank(tierOf(vitality)) >= TIER_RANK.healthy && lastHealthyDayCounted !== today) {
    healthyDays += 1;
    lastHealthyDayCounted = today;
  }

  const ageDays = daysBetween(state.pet.bornAt, nowIso);
  const stage = advanceStage(prevStage, healthyDays, ageDays, tierOf(vitality));

  const next: PetState = {
    ...state,
    vitality,
    healthyDays,
    lastHealthyDayCounted,
    stage,
    ageDays,
    lastTickAt: nowIso,
  };
  return { state: next, evolved: stageIndex(stage) > stageIndex(prevStage) };
}
