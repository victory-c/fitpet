// The only impure module besides the CLI: reads/writes ~/.fitpet/state.json.
// Writes are atomic (temp file + rename) so a hook, the renderer, and the feeder can
// never see a half-written file. Reads degrade to a safe default — never throw.

import { homedir } from "node:os";
import { join } from "node:path";
import { mkdirSync, readFileSync, writeFileSync, renameSync } from "node:fs";

import type { PetState, Personality, ReactionEvent } from "./types.ts";
import { SCHEMA_VERSION, START_VITALITY, DEFAULT_WINDOW_DAYS } from "./config.ts";
import { speciesOf, DEFAULT_SPECIES } from "./content/species.ts";
import { isPersonality } from "./content/personalities.ts";
import { clamp } from "./vitality.ts";

// FITPET_HOME lets tests point at a temp dir. Read at call-time, not import-time.
export function fitpetHome(): string {
  return process.env.FITPET_HOME ?? join(homedir(), ".fitpet");
}

export function statePath(): string {
  return join(fitpetHome(), "state.json");
}

export interface NewPetOptions {
  name?: string;
  species?: string;
  personality?: string;
}

export function defaultState(nowIso = new Date().toISOString(), opts: NewPetOptions = {}): PetState {
  const species = opts.species && speciesOf(opts.species).id === opts.species ? opts.species : DEFAULT_SPECIES;
  const personality = (opts.personality ?? speciesOf(species).defaultPersonality) as Personality;
  return {
    schemaVersion: SCHEMA_VERSION,
    pet: { name: opts.name ?? "Pixel", species, personality, bornAt: nowIso },
    vitality: START_VITALITY,
    stage: "egg",
    ageDays: 0,
    healthyDays: 0,
    lastHealthyDayCounted: null,
    lastTickAt: nowIso,
    // rollingScore starts AT the starting vitality (not 0) so a never-synced pet holds
    // steady — it must not wilt from absence of data, only from a real low-activity sync.
    fitness: { rollingScore: START_VITALITY, windowDays: DEFAULT_WINDOW_DAYS, source: null, lastActivityAt: null, lastSport: null, lastSyncAt: null },
    reaction: null,
  };
}

// Coerce a parsed-from-disk state into a complete, safe object. A hand-edited or corrupted
// file must never produce impossible values (vitality -50, 999999, NaN) or missing nested
// objects that crash later code.
function num(x: unknown, fallback: number): number {
  return typeof x === "number" && Number.isFinite(x) ? x : fallback;
}
function obj(x: unknown): Record<string, unknown> {
  return x && typeof x === "object" && !Array.isArray(x) ? (x as Record<string, unknown>) : {};
}
function str(x: unknown, fallback: string): string {
  return typeof x === "string" && x.length > 0 ? x : fallback;
}
function nullableStr(x: unknown, fallback: string | null): string | null {
  return typeof x === "string" ? x : x === null ? null : fallback;
}
function isoStr(x: unknown, fallback: string): string {
  if (typeof x !== "string") return fallback;
  const t = new Date(x).getTime();
  return Number.isFinite(t) ? x : fallback;
}
function positiveInt(x: unknown, fallback: number): number {
  const n = num(x, fallback);
  return n > 0 ? Math.floor(n) : fallback;
}

const STAGES = new Set(["egg", "hatchling", "juvenile", "adult"]);
const REACTION_EVENTS = new Set([
  "session_start",
  "test_pass",
  "test_fail",
  "error",
  "edit",
  "long_session",
  "idle",
  "fed",
  "tier_up",
  "tier_down",
  "evolved",
  "revived",
  "stale",
]);

export function sanitizeState(raw: unknown): PetState {
  const base = defaultState();
  const state = obj(raw);
  const rawPet = obj(state.pet);
  const rawFitness = obj(state.fitness);
  const rawReaction = obj(state.reaction);

  const species = str(rawPet.species, base.pet.species);
  const safeSpecies = speciesOf(species).id === species ? species : base.pet.species;
  const personality = str(rawPet.personality, base.pet.personality);
  const stage = str(state.stage, base.stage);
  const setAt = isoStr(rawReaction.setAt, "");
  const ttlSeconds = num(rawReaction.ttlSeconds, 0);
  const event = str(rawReaction.event, "");

  return {
    schemaVersion: Math.max(1, Math.floor(num(state.schemaVersion, SCHEMA_VERSION))),
    pet: {
      name: str(rawPet.name, base.pet.name),
      species: safeSpecies,
      personality: isPersonality(personality) ? personality : base.pet.personality,
      bornAt: isoStr(rawPet.bornAt, base.pet.bornAt),
    },
    vitality: clamp(num(state.vitality, START_VITALITY)),
    stage: STAGES.has(stage) ? (stage as PetState["stage"]) : base.stage,
    ageDays: Math.max(0, Math.floor(num(state.ageDays, base.ageDays))),
    healthyDays: Math.max(0, Math.floor(num(state.healthyDays, base.healthyDays))),
    lastHealthyDayCounted: nullableStr(state.lastHealthyDayCounted, base.lastHealthyDayCounted),
    lastTickAt: isoStr(state.lastTickAt, base.lastTickAt),
    fitness: {
      rollingScore: clamp(num(rawFitness.rollingScore, START_VITALITY)),
      windowDays: positiveInt(rawFitness.windowDays, DEFAULT_WINDOW_DAYS),
      source: nullableStr(rawFitness.source, base.fitness.source),
      lastActivityAt: nullableStr(rawFitness.lastActivityAt, base.fitness.lastActivityAt),
      lastSport: nullableStr(rawFitness.lastSport, base.fitness.lastSport ?? null),
      lastSyncAt: nullableStr(rawFitness.lastSyncAt, base.fitness.lastSyncAt),
    },
    reaction:
      state.reaction && typeof state.reaction === "object" && setAt && ttlSeconds > 0 && REACTION_EVENTS.has(event)
        ? {
            text: str(rawReaction.text, ""),
            face: str(rawReaction.face, ""),
            event: event as ReactionEvent,
            setAt,
            ttlSeconds,
          }
        : null,
  };
}

export type StateReadResult =
  | { ok: true; state: PetState }
  | { ok: false; reason: "missing" | "unreadable"; state: PetState };

export function readState(): StateReadResult {
  try {
    const text = readFileSync(statePath(), "utf8");
    if (text.trim() === "") return { ok: false, reason: "unreadable", state: defaultState() };
    return { ok: true, state: sanitizeState(JSON.parse(text) as unknown) };
  } catch (e) {
    const code = (e as NodeJS.ErrnoException)?.code;
    return { ok: false, reason: code === "ENOENT" ? "missing" : "unreadable", state: defaultState() };
  }
}

export function loadState(): PetState {
  return readState().state;
}

// Concurrency note (single-user V1): writes are atomic (temp file + rename), so no reader
// ever sees a half-written file. We deliberately do NOT lock. Two hook processes firing in
// the same instant could "lose" one update (last writer wins) — harmless and self-healing
// here, since the next tick re-derives state. Locking (and its stale-lock failure modes) is
// not worth it for one local user; revisit if FitPet ever goes multi-process/multi-user.
export function saveState(state: PetState): void {
  const dir = fitpetHome();
  mkdirSync(dir, { recursive: true });
  const tmp = join(dir, `.state.tmp-${process.pid}-${Date.now()}.json`);
  writeFileSync(tmp, JSON.stringify(state, null, 2), "utf8");
  renameSync(tmp, statePath()); // atomic on the same filesystem
}
