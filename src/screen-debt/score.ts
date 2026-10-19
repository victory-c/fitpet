import {
  BREAK_GAP_MINUTES, DEBT_GRACE_MINUTES, DEBT_RATE, DEBT_LONG_RATE, LONG_SESSION_MINUTES,
  DEBT_HISTORY_DAYS, DEBT_BREAK_CREDIT_MAX, DEBT_BREAK_RATE, DEBT_RECOVERY_MAX, SESSION_TAIL_MINUTES,
} from "../config.ts";
import { toSessions } from "../local-activity/derive.ts";
import type { ActivityEvent } from "../local-activity/log.ts";
import { clamp } from "../vitality.ts";
import { severityOf } from "./severity.ts";
import type { ScreenDebtState } from "./state.ts";

// Replay in occurrence order: late-arriving workouts cannot spend credit against later code.
// No I/O, clock, per-poll easing, event-count multipliers, or negative credit bank.
export function computeScreenDebt(events: readonly ActivityEvent[], state: ScreenDebtState, now: Date) {
  const end = now.getTime();
  const from = Math.max(Date.parse(state.since), end - DEBT_HISTORY_DAYS * 86_400_000);
  const sessions = toSessions(events.filter((e) => Date.parse(e.t) >= from), end);
  const changes = new Map<number, { rate: number; credit: number }>();
  function point(time: number, rate: number, credit = 0) {
    const existing = changes.get(time) ?? { rate: 0, credit: 0 };
    changes.set(time, { rate: existing.rate + rate, credit: existing.credit + credit });
  }
  function interval(start: number, finish: number, rate: number) {
    const a = Math.max(from, start), b = Math.min(end, finish);
    if (b <= a) return;
    point(a, rate); point(b, -rate);
  }
  for (let i = 0; i < sessions.length; i++) {
    const session = sessions[i]!;
    const finish = Math.min(end, session.end + SESSION_TAIL_MINUTES * 60_000);
    interval(session.start + DEBT_GRACE_MINUTES * 60_000,
      Math.min(finish, session.start + LONG_SESSION_MINUTES * 60_000), DEBT_RATE);
    interval(session.start + LONG_SESSION_MINUTES * 60_000, finish, DEBT_LONG_RATE);
    const breakStart = session.end + BREAK_GAP_MINUTES * 60_000;
    interval(breakStart, Math.min(sessions[i + 1]?.start ?? end,
      breakStart + DEBT_BREAK_CREDIT_MAX / DEBT_BREAK_RATE * 60_000), -DEBT_BREAK_RATE);
  }
  // Defend against duplicate entries even if called with unsanitized in-memory state.
  const seen = new Set<string>();
  for (const recovery of state.recoveries) {
    const time = Date.parse(recovery.at);
    if (!seen.has(recovery.id) && Number.isFinite(time) && time >= from && time <= end && Number.isFinite(recovery.minutes)) {
      point(time, 0, Math.max(0, Math.min(DEBT_RECOVERY_MAX, recovery.minutes)));
      seen.add(recovery.id);
    }
  }
  let score = 0, rate = 0, last = from, codingCost = 0, recoveryCredit = 0;
  for (const [time, change] of [...changes].sort(([a], [b]) => a - b)) {
    const delta = rate * (time - last) / 60_000;
    if (delta > 0) codingCost += delta;
    else recoveryCredit += Math.min(score, -delta);
    score = clamp(score + delta);
    const credit = Math.min(score, change.credit);
    recoveryCredit += credit;
    score = clamp(score - change.credit);
    rate += change.rate;
    last = time;
  }
  return { score: Math.round(score * 100) / 100, severity: severityOf(score), codingCost, recoveryCredit };
}