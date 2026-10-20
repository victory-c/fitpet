// Pure presentation settings: no accounting, I/O, timers, or network calls.
import type { NagIntensity, NotificationSettings } from "./types.ts";

export function isNagIntensity(value: unknown): value is NagIntensity {
  return value === "gentle" || value === "normal" || value === "persistent";
}

export function sanitizeNotifications(raw: unknown): NotificationSettings {
  const value = raw && typeof raw === "object" ? raw as Record<string, unknown> : {};
  return {
    ...(typeof value.dismissedThrough === "string" && Number.isFinite(Date.parse(value.dismissedThrough))
      ? { dismissedThrough: new Date(value.dismissedThrough).toISOString() } : {}),
    nagIntensity: isNagIntensity(value.nagIntensity) ? value.nagIntensity : "normal",
    snoozedUntil: typeof value.snoozedUntil === "string" && Number.isFinite(Date.parse(value.snoozedUntil))
      ? new Date(value.snoozedUntil).toISOString() : null,
  };
}

export function parseSnooze(input: string, now: Date): string | null {
  if (input === "off") return null;
  let expiry: Date;
  if (input === "tomorrow") {
    expiry = new Date(now);
    expiry.setDate(expiry.getDate() + 1);
    expiry.setHours(0, 0, 0, 0);
  } else {
    const match = /^([1-9]\d*)(m|h)?$/.exec(input);
    if (!match) throw new Error("usage: fitpet snooze <minutes|2h|tomorrow|off> (positive whole minutes)");
    const minutes = Number(match[1]) * (match[2] === "h" ? 60 : 1);
    expiry = new Date(now.getTime() + minutes * 60_000);
  }
  if (!Number.isFinite(expiry.getTime()) || expiry.getTime() <= now.getTime()) throw new Error("Snooze expiry is out of range");
  return expiry.toISOString();
}

export function notificationStatus(settings: NotificationSettings, nowMs: number) {
  const remainingMs = settings.snoozedUntil === null ? 0 : Math.max(0, Date.parse(settings.snoozedUntil) - nowMs);
  return { ...settings, snoozed: remainingMs > 0, remainingMinutes: Math.ceil(remainingMs / 60_000) };
}

export function isNudge(event: string): boolean {
  return event === "long_session" || event.startsWith("debt_");
}

// Retain consumption across Unsnooze/restarts, even when no desktop observed the snooze.
export function nudgeDismissalCutoff(settings: NotificationSettings, nowMs: number): number {
  return Math.max(settings.dismissedThrough ? Date.parse(settings.dismissedThrough) : -Infinity,
    settings.snoozedUntil ? Math.min(nowMs, Date.parse(settings.snoozedUntil)) : -Infinity);
}

export function persistedNudgeHidden(settings: NotificationSettings, event: string, setAtMs: number, nowMs: number): boolean {
  return isNudge(event) && setAtMs <= nudgeDismissalCutoff(settings, nowMs);
}

export function localExpiry(iso: string): string {
  return new Date(iso).toLocaleString(undefined, { timeZoneName: "short" });
}
