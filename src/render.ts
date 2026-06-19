// Pure renderer for the status line. No file I/O, no logic that mutates the pet — it just
// turns a PetState (+ a little context from Claude Code) into one compact line of text.

import type { PetState } from "./types.ts";
import { tierOf, clamp } from "./vitality.ts";
import { faceFor, speciesOf } from "./content/species.ts";
import { reactionIsLive } from "./reactions.ts";

export interface RenderContext {
  usedPercent?: number | null; // Claude Code's context_window.used_percentage
  ascii?: boolean; // force ASCII faces
  nowIso?: string;
}

const LOW_CONTEXT_THRESHOLD = 85;

export function vitalityBar(v: number, width = 8): string {
  const filled = Math.max(0, Math.min(width, Math.round((v / 100) * width)));
  return "█".repeat(filled) + "░".repeat(width - filled);
}

export function renderFace(state: PetState, ctx: RenderContext = {}): string {
  const now = ctx.nowIso ?? new Date().toISOString();
  const ascii = ctx.ascii ?? false;
  // Belt-and-suspenders: clamp at display too, in case state reached us un-sanitized.
  const vitality = clamp(typeof state.vitality === "number" && Number.isFinite(state.vitality) ? state.vitality : 0);
  const tier = tierOf(vitality);
  const sp = speciesOf(state.pet.species);

  // Low-context "panic" comes straight from the status-line stdin — no hook needed.
  const lowCtx = typeof ctx.usedPercent === "number" && ctx.usedPercent >= LOW_CONTEXT_THRESHOLD;

  let face = faceFor(state.pet.species, tier, ascii);
  if (lowCtx) face = ascii ? "(@_@)" : "(╯°□°)╯";

  const bar = vitalityBar(vitality);
  const head = `${sp.emoji} ${face} ${bar} ${Math.round(vitality)}`;

  let tail: string;
  if (lowCtx) tail = "context low!";
  else if (state.reaction && reactionIsLive(state, now)) tail = state.reaction.text;
  else tail = `${state.pet.name} · ${tier}`;

  return `${head} · ${tail}`;
}

// Absolute fallback so the status line is NEVER blank, even if state is unreadable.
export function safeFace(): string {
  return "🥚 fitpet";
}
