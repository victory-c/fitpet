# Snooze and intensity validation

Validated on macOS, October 20, 2026, with Node 26 and the repository's existing Electron.

## Automated checks

- `npm test`: **166 passed, 0 failed**; includes parser, migration, CLI processes, concurrent writers, reminder
  scheduling, concern eligibility, menu callbacks, snapshots and accounting-invariance tests.
- `npm run typecheck`: engine and desktop TypeScript configurations.
- `npm run build`: engine build.
- `npm run app:build`: production Electron main/preload/renderer build.
- `git diff --check`.

## Isolated desktop exercise

Launched the production build with a temporary `FITPET_HOME` and synthetic `activity.jsonl`
records containing only `kind` and `t`. Chromium user data was also under that temporary
home. No real pet, activity journal, or user-data directory was used.

Using the loopback-only debugging protocol enabled for this validation launch:

1. Observed a 60-minute session reminder in the real renderer.
2. Executed CLI `snooze 30`: the live bubble disappeared and the always-visible
   `Nudges snoozed · 30m` badge appeared. The stage measured 404px within a 410px window.
3. Dispatched a right-button press/release on the pet. The main process constructed the
   native menu with all four snooze actions and the three radio intensity choices.
4. Invoked the actual native-menu `Unsnooze` and `Snooze 30 min` callbacks; checked state
   persistence and renderer updates. This was not a physical pointer selection.
5. Restarted the app mid-snooze: the badge returned and no nudge was displayed.
6. Selected Gentle through the native-menu callback, replaced the journal with a synthetic
   50-minute active session, and observed no bubble. Selected Persistent: a long-session
   bubble appeared immediately for that same session, without resetting the pet/debt.
7. Rebuilt after review, forced a persisted `long_session` reaction, snoozed and immediately
   unsnoozed: neither the CLI nor renderer replayed it. Regression tests also cover a fresh
   reader after expiry or Unsnooze while the persisted reaction TTL is still live.

An independent read-only reviewer identified the persisted-reaction replay bug. It was
fixed with a durable presentation-only dismissal cutoff, regression-tested, and re-reviewed
with no remaining actionable findings. The review's proposed two-hour menu preset was
rejected because the requested desktop preset is explicitly one hour (the CLI accepts two hours).

Renderer screenshots were captured through Chromium's page-capture API. Debugging ports
were temporary validation flags, not added to application code. The isolated app was closed
after validation.

## Remaining manual check

macOS Accessibility and Screen Recording permissions were not granted to this execution
environment. A physical native-menu click and a physical drag of the dedicated drag strip
could not be verified. Native menu creation, real callback execution and rendering were
verified as above; do not treat that as a completed physical input test.
