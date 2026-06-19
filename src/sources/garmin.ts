// Garmin adapter. The /fitpet-sync skill calls the Garmin MCP and passes the raw results
// here. We prefer a native rolling load (ATL from get_training_load_trend) when present;
// otherwise we sum each activity's native `training_load`, falling back to duration x
// sport-intensity when even that is missing. Tolerant of the MCP's {result:"<json>"} envelope
// and of fields that vary by sport.

import type { FitnessSource, FitnessSnapshot, Activity } from "./types.ts";
import { GARMIN_LOAD_GOAL, DEFAULT_WINDOW_DAYS } from "../config.ts";

// MCP tools here return { result: "<json string>" }. Unwrap to a real object.
function unwrap(x: unknown): unknown {
  if (x && typeof x === "object" && typeof (x as { result?: unknown }).result === "string") {
    try {
      return JSON.parse((x as { result: string }).result);
    } catch {
      return {};
    }
  }
  return x;
}

function num(x: unknown): number | undefined {
  const n = Number(x);
  return Number.isFinite(n) ? n : undefined;
}

function toIso(s: unknown): string {
  if (typeof s !== "string" || !s) return "";
  const t = s.includes("T") ? s : s.replace(" ", "T");
  const d = new Date(t);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString();
}

// Best-effort: pull the most recent acute load (ATL) from a training-load-trend result.
function latestAtl(trend: unknown): number | undefined {
  const t = unwrap(trend);
  const rows: unknown[] = Array.isArray(t)
    ? t
    : Array.isArray((t as { trend?: unknown[] })?.trend)
      ? (t as { trend: unknown[] }).trend
      : [];
  let val: number | undefined;
  for (const row of rows) {
    const r = row as Record<string, unknown>;
    const atl = num(r.atl) ?? num(r.acute_load) ?? num(r.acuteTrainingLoad) ?? num(r.acute);
    if (atl !== undefined) val = atl; // rows are oldest-first; keep the last
  }
  return val;
}

interface GarminActivity {
  start_time_local?: string;
  start_time?: string;
  start_time_gmt?: string;
  moving_duration_seconds?: number;
  duration_seconds?: number;
  type?: string;
  activity_type?: string;
  training_load?: number;
}

export const GarminSource: FitnessSource = {
  id: "garmin",
  loadGoal: GARMIN_LOAD_GOAL,
  normalize(raw: unknown): FitnessSnapshot {
    const r = unwrap(raw) as Record<string, unknown>;

    // Accept a bare array, {activities:[...]}, or {activities:{result:"..."}}.
    let items: GarminActivity[] = [];
    if (Array.isArray(r)) items = r as GarminActivity[];
    else if (Array.isArray(r.activities)) items = r.activities as GarminActivity[];
    else if (r.activities) {
      const inner = unwrap(r.activities) as { activities?: unknown };
      if (Array.isArray(inner?.activities)) items = inner.activities as GarminActivity[];
    }

    let windowLoad: number | undefined;
    if (r.trend !== undefined) windowLoad = latestAtl(r.trend);
    if (windowLoad === undefined && typeof r.windowLoad === "number") windowLoad = r.windowLoad;

    const cutoff = Date.now() - DEFAULT_WINDOW_DAYS * 86_400_000;
    const activities: Activity[] = items
      .map((a): Activity => {
        const seconds = num(a.moving_duration_seconds) ?? num(a.duration_seconds) ?? 0;
        return {
          date: toIso(a.start_time_local || a.start_time || a.start_time_gmt),
          durationMin: seconds / 60,
          sport: String(a.type ?? a.activity_type ?? "workout"),
          effort: num(a.training_load), // undefined -> duration x sportFactor fallback
        };
      })
      .filter((a) => a.date && new Date(a.date).getTime() >= cutoff);

    return { activities, windowDays: DEFAULT_WINDOW_DAYS, windowLoad };
  },
};
