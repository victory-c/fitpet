// The hand-testing source. `fitpet feed <minutes>` becomes a single run in the window,
// so the whole care pipeline (load -> score -> ease -> events) runs against real code.

import type { FitnessSource, FitnessSnapshot } from "./types.ts";
import { MANUAL_LOAD_GOAL, DEFAULT_WINDOW_DAYS } from "../config.ts";

export const ManualSource: FitnessSource = {
  id: "manual",
  loadGoal: MANUAL_LOAD_GOAL,
  normalize(raw: unknown): FitnessSnapshot {
    const minutes =
      typeof raw === "number"
        ? raw
        : Number((raw as { minutes?: unknown } | null)?.minutes ?? 0);
    const m = Number.isFinite(minutes) ? Math.max(0, minutes) : 0;
    return {
      windowDays: DEFAULT_WINDOW_DAYS,
      activities: m > 0 ? [{ date: new Date().toISOString(), durationMin: m, sport: "run" }] : [],
    };
  },
};
