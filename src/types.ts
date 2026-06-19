// Shared types for the pet's persisted state. Using string-union types (not TS `enum`)
// keeps the code "erasable" so Node can run the .ts files directly without a build step.

export type Tier = "thriving" | "healthy" | "wilting" | "dormant";

export type Stage = "egg" | "hatchling" | "juvenile" | "adult";

export type Personality = "earnest" | "sarcastic" | "chill";

// Every event that can produce a quip. Reaction-axis events come from coding hooks
// (Phase 3); care-axis events come from the feeder/sim (Phase 4 + ticks).
export type ReactionEvent =
  // reaction axis (coding)
  | "session_start"
  | "test_pass"
  | "test_fail"
  | "error"
  | "edit"
  | "long_session"
  | "idle"
  // care axis (fitness)
  | "fed"
  | "tier_up"
  | "tier_down"
  | "evolved"
  | "revived"
  | "stale";

// A transient quip shown in the status line until its TTL expires.
export interface Reaction {
  text: string;
  face: string;
  event: ReactionEvent;
  setAt: string; // ISO timestamp
  ttlSeconds: number;
}

// Fitness summary written by the feeder; the care axis reads only `rollingScore`.
export interface FitnessState {
  rollingScore: number; // 0-100, recomputed from a fresh window each sync
  windowDays: number;
  source: string | null; // which adapter last fed it, e.g. "garmin" | "manual"
  lastActivityAt: string | null; // ISO of the most recent workout seen
  lastSyncAt: string | null; // ISO of the last successful sync
}

export interface PetState {
  schemaVersion: number;
  pet: {
    name: string;
    species: string;
    personality: Personality;
    bornAt: string; // ISO
  };
  vitality: number; // 0-100, current shown health
  stage: Stage;
  ageDays: number;
  healthyDays: number; // accumulated days at/above Healthy; drives evolution
  lastHealthyDayCounted: string | null; // "YYYY-MM-DD" guard so we count <= 1/day
  lastTickAt: string; // ISO
  fitness: FitnessState;
  reaction: Reaction | null;
}
