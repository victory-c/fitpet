// The only impure module besides the CLI: reads/writes ~/.fitpet/state.json.
// Writes are atomic (temp file + rename) so a hook, the renderer, and the feeder can
// never see a half-written file. Reads degrade to a safe default — never throw.

import { homedir } from "node:os";
import { join } from "node:path";
import { mkdirSync, readFileSync, writeFileSync, renameSync } from "node:fs";

import type { PetState, Personality } from "./types.ts";
import { SCHEMA_VERSION, START_VITALITY, DEFAULT_WINDOW_DAYS } from "./config.ts";
import { speciesOf, DEFAULT_SPECIES } from "./content/species.ts";
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
    fitness: { rollingScore: START_VITALITY, windowDays: DEFAULT_WINDOW_DAYS, source: null, lastActivityAt: null, lastSyncAt: null },
    reaction: null,
  };
}

// Coerce a parsed-from-disk state into safe ranges. A hand-edited or corrupted file must
// never produce impossible values (vitality -50, 999999, NaN). Bounded numbers are clamped;
// non-finite numbers fall back to sane defaults.
function num(x: unknown, fallback: number): number {
  return typeof x === "number" && Number.isFinite(x) ? x : fallback;
}
export function sanitizeState(state: PetState): PetState {
  state.vitality = clamp(num(state.vitality, START_VITALITY)); // 0-100
  if (state.fitness && typeof state.fitness === "object") {
    state.fitness.rollingScore = clamp(num(state.fitness.rollingScore, START_VITALITY)); // 0-100
  }
  state.healthyDays = Math.max(0, Math.floor(num(state.healthyDays, 0)));
  state.ageDays = Math.max(0, Math.floor(num(state.ageDays, 0)));
  return state;
}

export function loadState(): PetState {
  try {
    const parsed = JSON.parse(readFileSync(statePath(), "utf8")) as unknown;
    if (parsed && typeof parsed === "object" && typeof (parsed as PetState).vitality === "number") {
      return sanitizeState(parsed as PetState);
    }
    return defaultState();
  } catch {
    return defaultState();
  }
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
