import { createSnapshotReader, type DesktopSnapshot } from "./snapshot.ts";
import { readState, type StateReadResult } from "../state.ts";
import { createActivityReader, type ActivityReadResult } from "../local-activity/log.ts";
import { deriveCodingTelemetry, type CodingTelemetry } from "../local-activity/derive.ts";
import { createSessionReminder } from "../local-activity/reminder.ts";
import type { Personality } from "../types.ts";
import { defaultScreenDebt } from "../screen-debt/state.ts";
import { computeScreenDebt } from "../screen-debt/score.ts";
import { createConcernReminder } from "../screen-debt/concern.ts";
import { notificationStatus, persistedNudgeHidden, sanitizeNotifications } from "../notifications.ts";

export interface CompanionSnapshot extends DesktopSnapshot {
  coding: CodingTelemetry | null;
  activityStatus: "ready" | "missing" | "unreadable";
  screenDebt: ReturnType<typeof computeScreenDebt> | null;
}

export function createCompanionReader(
  read: () => StateReadResult = readState,
  now: () => string = () => new Date().toISOString(),
  activity: () => ActivityReadResult = createActivityReader(),
): () => CompanionSnapshot {
  let personality: Personality = "earnest";
  let debtState = defaultScreenDebt(now());
  let settings = sanitizeNotifications(undefined);
  const base = createSnapshotReader(() => {
    const result = read();
    if (result.ok) {
      personality = result.state.pet.personality;
      debtState = result.state.screenDebt ?? debtState;
      settings = sanitizeNotifications(result.state.notifications);
    }
    return result;
  }, now);
  const reminder = createSessionReminder();
  const concern = createConcernReminder();
  let previousEvents: ActivityReadResult | undefined;
  let lastSecond = -1;
  let coding: CodingTelemetry | null = null;
  let screenDebt: ReturnType<typeof computeScreenDebt> | null = null;
  let previousDebtState = debtState;
  return () => {
    const snap = base();
    const time = Date.parse(now());
    const result = activity();
    // Recalculate on new events or each second (idle boundaries can fall within a minute).
    const second = Math.floor(time / 1000);
    if (result !== previousEvents || second !== lastSecond || debtState !== previousDebtState) {
      coding = result.ok ? deriveCodingTelemetry(result.events, new Date(time)) : null;
      screenDebt = result.ok ? computeScreenDebt(result.events, debtState, new Date(time)) : null;
      previousEvents = result;
      previousDebtState = debtState;
      lastSecond = second;
    }
    const notifications = notificationStatus(settings, time);
    const options = { intensity: notifications.nagIntensity, snoozed: notifications.snoozed };
    const nudge = reminder(coding, personality, time, options);
    const worry = concern(screenDebt?.score ?? null, personality, time, options);
    const reaction = snap.reaction && persistedNudgeHidden(settings, snap.reaction.event, snap.reaction.setAtMs, time) ? null : snap.reaction;
    return { ...snap, notifications, coding, screenDebt, activityStatus: result.ok ? "ready" : result.reason, reaction: worry ?? nudge ?? reaction };
  };
}
