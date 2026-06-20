// Glue between a fitness snapshot and the pet: recompute the score from a fresh window
// (idempotent), ease vitality toward it, and report which care events fired.

import type { PetState, ReactionEvent } from "./types.ts";
import type { Activity, FitnessSnapshot, FitnessSource } from "./sources/types.ts";
import { computeWindowLoad, rollingScoreFromLoad, tick, tierOf, tierRank } from "./vitality.ts";

export interface SyncResult {
  state: PetState;
  events: ReactionEvent[];
}

function latestActivity(snap: FitnessSnapshot): Activity | null {
  let latest: Activity | null = null;
  for (const a of snap.activities ?? []) {
    if (a?.date && (!latest || a.date > latest.date)) latest = a;
  }
  return latest;
}

export function applySnapshot(
  state: PetState,
  snap: FitnessSnapshot,
  source: FitnessSource,
  nowIso: string,
): SyncResult {
  const prevScore = state.fitness.rollingScore;
  const prevTier = tierOf(state.vitality);
  const wasDormant = prevTier === "dormant";

  const load = computeWindowLoad(snap);
  const newScore = rollingScoreFromLoad(load, source.loadGoal);

  const latest = latestActivity(snap);
  const fedState: PetState = {
    ...state,
    fitness: {
      rollingScore: newScore,
      windowDays: snap.windowDays,
      source: source.id,
      lastActivityAt: latest?.date ?? state.fitness.lastActivityAt,
      lastSport: latest?.sport ?? state.fitness.lastSport ?? null,
      lastSyncAt: nowIso,
    },
  };

  const { state: ticked, evolved } = tick(fedState, nowIso);
  const newTier = tierOf(ticked.vitality);

  const events: ReactionEvent[] = [];
  if (newScore > prevScore + 0.5) events.push("fed");
  if (tierRank(newTier) > tierRank(prevTier)) events.push("tier_up");
  if (tierRank(newTier) < tierRank(prevTier)) events.push("tier_down");
  if (wasDormant && newTier !== "dormant") events.push("revived");
  if (evolved) events.push("evolved");

  return { state: ticked, events };
}

// When several care events fire at once, show the single most salient one.
const EVENT_PRIORITY: ReactionEvent[] = ["evolved", "revived", "tier_up", "tier_down", "fed"];
export function pickTopEvent(events: ReactionEvent[]): ReactionEvent | null {
  for (const e of EVENT_PRIORITY) if (events.includes(e)) return e;
  return events[0] ?? null;
}
