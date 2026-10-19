// Adapted from Touch Grass Protocol's session derivation. Pure, with an injected clock.
import { BREAK_GAP_MINUTES, SESSION_TAIL_MINUTES } from "../config.ts";
import type { ActivityEvent } from "./log.ts";

export interface CodingSession { start: number; end: number; events: number }
export interface DeriveOptions { dayStartMs?: number; breakGapMinutes?: number; tailMinutes?: number }
export interface CodingTelemetry {
  codingMinutesToday: number;
  currentCodingSessionMinutes: number;
  minutesSinceLastBreak: number;
  sessionStartAt: string | null;
  lastActivityAt: string | null;
  active: boolean;
}

export function localDayStart(now: Date): number {
  const day = new Date(now);
  day.setHours(0, 0, 0, 0);
  return day.getTime();
}

export function toSessions(events: readonly ActivityEvent[], nowMs: number, gapMin = BREAK_GAP_MINUTES): CodingSession[] {
  const times = events.map((e) => Date.parse(e.t)).filter((t) => Number.isFinite(t) && t <= nowMs).sort((a, b) => a - b);
  const sessions: CodingSession[] = [];
  for (const t of times) {
    const last = sessions[sessions.length - 1];
    if (last && t - last.end < gapMin * 60_000) {
      last.end = t;
      last.events += 1;
    } else sessions.push({ start: t, end: t, events: 1 });
  }
  return sessions;
}

export function deriveCodingTelemetry(events: readonly ActivityEvent[], now: Date, opts: DeriveOptions = {}): CodingTelemetry {
  const nowMs = now.getTime();
  const gap = opts.breakGapMinutes ?? BREAK_GAP_MINUTES;
  const sessions = toSessions(events, nowMs, gap);
  const dayStart = opts.dayStartMs ?? localDayStart(now);
  const tailMs = Math.max(0, Math.min(opts.tailMinutes ?? SESSION_TAIL_MINUTES, gap)) * 60_000;
  let todayMs = 0;
  for (const session of sessions) {
    todayMs += Math.max(0, Math.min(session.end + tailMs, nowMs) - Math.max(session.start, dayStart));
  }
  const last = sessions[sessions.length - 1];
  const active = !!last && nowMs - last.end < gap * 60_000;
  const currentMin = active ? Math.floor((nowMs - last.start) / 60_000) : 0;
  return {
    codingMinutesToday: Math.floor(todayMs / 60_000),
    currentCodingSessionMinutes: currentMin,
    minutesSinceLastBreak: currentMin,
    sessionStartAt: active ? new Date(last!.start).toISOString() : null,
    lastActivityAt: last ? new Date(last.end).toISOString() : null,
    active,
  };
}