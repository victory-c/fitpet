import { defaultState, readState, type StateReadResult } from "../state.ts";
import { reactionIsLive } from "../reactions.ts";
import { tierOf } from "../vitality.ts";
import type { PetState } from "../types.ts";

export interface DesktopSnapshot {
  species: string;
  name: string;
  tier: ReturnType<typeof tierOf>;
  stage: PetState["stage"];
  vitality: number;
  rollingScore: number;
  lastSport: string | null;
  lastActivityAt: string | null;
  healthyDays: number;
  reaction: { text: string; event: string; setAtMs: number } | null;
}

export function snapshotFromState(s: PetState, now = new Date().toISOString()): DesktopSnapshot {
  const live = reactionIsLive(s, now);
  return {
    species: s.pet.species,
    name: s.pet.name,
    tier: tierOf(s.vitality),
    stage: s.stage,
    vitality: Math.round(s.vitality),
    rollingScore: Math.round(s.fitness.rollingScore),
    lastSport: s.fitness.lastSport ?? null,
    lastActivityAt: s.fitness.lastActivityAt ?? null,
    healthyDays: s.healthyDays,
    reaction:
      live && s.reaction ? { text: s.reaction.text, event: s.reaction.event, setAtMs: Date.parse(s.reaction.setAt) } : null,
  };
}

export function createSnapshotReader(
  read: () => StateReadResult = readState,
  now: () => string = () => new Date().toISOString(),
): () => DesktopSnapshot {
  let lastGood: DesktopSnapshot | null = null;

  return () => {
    const result = read();
    if (result.ok) {
      lastGood = snapshotFromState(result.state, now());
      return lastGood;
    }
    if (result.reason === "missing" && !lastGood) {
      return snapshotFromState(defaultState(now()), now());
    }
    return lastGood ?? snapshotFromState(result.state, now());
  };
}
