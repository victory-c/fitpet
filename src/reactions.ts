// Shared reaction helper used by the CLI and the hook scripts: pick a quip for an event
// and stash it (with a TTL) on the state. Also: is the current reaction still "live"?

import type { PetState, ReactionEvent } from "./types.ts";
import { tierOf } from "./vitality.ts";
import { faceFor } from "./content/species.ts";
import { quipsFor } from "./content/quips.ts";
import { selectQuip } from "./quip.ts";
import { REACTION_TTL_SECONDS } from "./config.ts";

export function applyReaction(
  state: PetState,
  event: ReactionEvent,
  nowIso: string,
  rng: () => number = Math.random,
): void {
  const pool = quipsFor(event, state.pet.personality);
  const text = selectQuip(pool, state.reaction?.text, rng);
  state.reaction = {
    text,
    face: faceFor(state.pet.species, tierOf(state.vitality)),
    event,
    setAt: nowIso,
    ttlSeconds: REACTION_TTL_SECONDS,
  };
}

export function reactionIsLive(state: PetState, nowIso: string): boolean {
  if (!state.reaction) return false;
  const ageSec = (new Date(nowIso).getTime() - new Date(state.reaction.setAt).getTime()) / 1000;
  return ageSec >= 0 && ageSec < state.reaction.ttlSeconds;
}
