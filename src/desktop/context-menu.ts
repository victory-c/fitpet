import type { MenuItemConstructorOptions } from "electron";
import { readState } from "../state.ts";
import { notificationStatus, sanitizeNotifications } from "../notifications.ts";
import { updateNotificationSettings, type NotificationChange } from "../notification-settings.ts";
import type { NotificationSettings } from "../types.ts";

// Electron is a type-only import, so menu behavior is testable with node:test.
export function contextMenuTemplate(
  settings: NotificationSettings,
  apply: (change: NotificationChange) => void,
  nowMs = Date.now(),
): MenuItemConstructorOptions[] {
  return [
    { label: "Snooze 30 min", click: () => apply({ kind: "snooze", value: "30" }) },
    { label: "Snooze 1 hour", click: () => apply({ kind: "snooze", value: "1h" }) },
    { label: "Snooze until tomorrow", click: () => apply({ kind: "snooze", value: "tomorrow" }) },
    { label: "Unsnooze", enabled: notificationStatus(settings, nowMs).snoozed, click: () => apply({ kind: "snooze", value: "off" }) },
    { type: "separator" },
    { label: "Nag intensity", submenu: (["gentle", "normal", "persistent"] as const).map((value) => ({
      label: value[0]!.toUpperCase() + value.slice(1), type: "radio", checked: settings.nagIntensity === value,
      click: () => apply({ kind: "nag", value }),
    })) },
  ];
}

export function createContextMenuTemplate(refresh: () => void, onError: (error: unknown) => void): MenuItemConstructorOptions[] {
  const result = readState();
  if (!result.ok && result.reason !== "missing") throw new Error("Pet state is incomplete or unreadable; settings left untouched");
  return contextMenuTemplate(sanitizeNotifications(result.state.notifications), (change) => {
    try {
      updateNotificationSettings(change);
      refresh();
    } catch (error) { onError(error); }
  });
}
