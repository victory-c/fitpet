// Tunable constants for the whole simulation. Kept in one place so balancing later
// (Phase 5) is a single-file edit. Values are deliberately "roughly right", not gold-plated.

export const SCHEMA_VERSION = 1;

// Vitality is a 0-100 number. These are the lower bounds of each tier.
export const TIERS = {
  thriving: 75,
  healthy: 45,
  wilting: 15,
  // dormant is anything below `wilting`
} as const;

// Evolution gate. To reach a stage the pet must (while currently Healthy+) meet BOTH a
// minimum real AGE and a minimum number of accumulated HEALTHY days. The egg->hatchling
// step is intentionally instant (age 0) so the very first workout visibly hatches the egg;
// the later stages need real calendar time, so a pet can't sprint to "adult" by inflating
// healthyDays. This is THE place to tune evolution pacing.
export const STAGE_REQUIREMENTS = {
  hatchling: { minAgeDays: 0, minHealthyDays: 1 },
  juvenile: { minAgeDays: 5, minHealthyDays: 7 },
  adult: { minAgeDays: 14, minHealthyDays: 21 },
} as const;

// Each tick moves vitality this fraction of the way toward the target rollingScore.
// 0.34 ≈ "close ~1/3 of the gap per tick" — smooth, never a snap, never a free-fall.
export const EASE_RATE = 0.34;

// A new pet starts a bit low (wilting) so the first workout visibly nurtures it.
export const START_VITALITY = 30;

export const DEFAULT_WINDOW_DAYS = 7;

// How long a quip lingers in the desktop speech bubble before the renderer clears it.
export const REACTION_TTL_SECONDS = 90;

// SessionStart sync nudge only fires when the last sync is older than this (Phase 3).
export const STALE_HOURS = 8;

// Per-sport intensity multipliers for the duration-based fallback when no native
// training-load number is available. Tunable. Keys are lowercased sport names.
export const DEFAULT_SPORT_FACTOR = 0.6;
export const SPORT_FACTORS: Record<string, number> = {
  run: 1.0,
  running: 1.0,
  trail_running: 1.05,
  ride: 0.7,
  cycling: 0.7,
  road_biking: 0.7,
  virtual_ride: 0.7,
  swim: 1.1,
  lap_swimming: 1.1,
  open_water_swimming: 1.15,
  walk: 0.4,
  walking: 0.4,
  hiking: 0.6,
  strength_training: 0.8,
  yoga: 0.4,
};

// Synthetic "manual feed" source (the hand-testing driver). `feed <minutes>` of a
// standard run maps 1 min -> 1 load point, and 60 points maxes the score.
export const MANUAL_LOAD_GOAL = 60;

// Garmin weekly training-load that maps to a full 100 score. Garmin's per-activity
// `training_load` is summed over the window. Calibrated against real data in Phase 4;
// tune here if the pet feels too easy/hard to keep thriving.
export const GARMIN_LOAD_GOAL = 500;
