import { createHash } from "node:crypto";
import { DEBT_HISTORY_DAYS } from "../config.ts";
import type { Activity } from "../sources/types.ts";

export interface Recovery {
  id: string; // hash only, never a path, command, or external activity payload
  at: string; // completion time; credits apply in occurrence order
  minutes: number;
  kind: "workout" | "outdoor";
}
export interface ScreenDebtState { since: string; recoveries: Recovery[] }
export function defaultScreenDebt(nowIso: string): ScreenDebtState { return { since: nowIso, recoveries: [] }; }
export function sanitizeScreenDebt(raw: unknown, fallbackIso: string): ScreenDebtState {
  const value = raw && typeof raw === "object" ? raw as Record<string, unknown> : {};
  const since = typeof value.since === "string" && Number.isFinite(Date.parse(value.since)) ? value.since : fallbackIso;
  const recoveries: Recovery[] = [];
  const ids = new Set<string>();
  if (Array.isArray(value.recoveries)) for (const r of value.recoveries) {
    if (!r || typeof r !== "object" || typeof r.id !== "string" || !/^[a-f0-9]{64}$/.test(r.id) || ids.has(r.id)) continue;
    if (typeof r.at !== "string" || !Number.isFinite(Date.parse(r.at)) || typeof r.minutes !== "number" || !Number.isFinite(r.minutes) || r.minutes <= 0) continue;
    if (r.kind !== "workout" && r.kind !== "outdoor") continue;
    ids.add(r.id);
    recoveries.push({ id: r.id, at: r.at, minutes: Math.min(r.minutes, 180), kind: r.kind });
  }
  return { since, recoveries: recoveries.sort((a, b) => Date.parse(a.at) - Date.parse(b.at)).slice(-2048) };
}
export function addRecovery(state: ScreenDebtState, recovery: Recovery, nowIso: string): ScreenDebtState {
  const cutoff = Math.max(Date.parse(state.since), Date.parse(nowIso) - DEBT_HISTORY_DAYS * 86_400_000);
  const current = state.recoveries.filter((r) => Date.parse(r.at) >= cutoff);
  if (Date.parse(recovery.at) < cutoff || Date.parse(recovery.at) > Date.parse(nowIso)) return { ...state, recoveries: current };
  if (!current.some((r) => r.id === recovery.id)) current.push(recovery);
  return { ...state, recoveries: current.sort((a, b) => Date.parse(a.at) - Date.parse(b.at)).slice(-2048) };
}
export function recoveryId(value: string): string { return createHash("sha256").update(value).digest("hex"); }
export function creditWorkouts(state: ScreenDebtState, activities: readonly Activity[], source: string, nowIso: string): ScreenDebtState {
  let next = state;
  for (const activity of activities) {
    if (!activity || typeof activity.durationMin !== "number" || !Number.isFinite(activity.durationMin) || activity.durationMin <= 0) continue;
    const start = Date.parse(activity.date);
    const finish = start + activity.durationMin * 60_000;
    if (!Number.isFinite(start) || !Number.isFinite(finish) || activity.durationMin > 1440 || finish > Date.parse(nowIso)) continue;
    // Without a source ID, start time + sport remain stable if duration/load is amended.
    const id = recoveryId(`${source}:${activity.id ?? `${new Date(start).toISOString()}:${activity.sport}`}`);
    next = addRecovery(next, { id, at: new Date(finish).toISOString(), minutes: activity.durationMin, kind: "workout" }, nowIso);
  }
  return next;
}