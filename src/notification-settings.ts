import { readState, saveState, statePath } from "./state.ts";
import { withStateLock } from "./state-lock.ts";
import { isNagIntensity, nudgeDismissalCutoff, parseSnooze, sanitizeNotifications } from "./notifications.ts";

export type NotificationChange = { kind: "snooze"; value: string } | { kind: "nag"; value: string };

// Owns the lock: callers must not wrap this in another state transaction.
export function updateNotificationSettings(change: NotificationChange) {
  return withStateLock(() => {
    const now = new Date();
    if (change.kind === "nag" && !isNagIntensity(change.value)) throw new Error("usage: fitpet nag gentle|normal|persistent");
    const snoozedUntil = change.kind === "snooze" ? parseSnooze(change.value, now) : null;
    const result = readState();
    if (!result.ok && result.reason !== "missing") throw new Error(`${statePath()} is incomplete or unreadable; left it untouched`);
    const state = result.state;
    const settings = sanitizeNotifications(state.notifications);
    state.notifications = change.kind === "snooze" ? { ...settings, snoozedUntil,
      dismissedThrough: new Date(Math.max(now.getTime(), nudgeDismissalCutoff(settings, now.getTime()))).toISOString() }
      : { ...settings, nagIntensity: isNagIntensity(change.value) ? change.value : "normal" };
    saveState(state);
    return state;
  });
}
