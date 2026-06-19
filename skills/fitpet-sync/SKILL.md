---
name: fitpet-sync
description: Refresh the FitPet status-line companion from the user's recent Garmin fitness data (training load over the last 7 days). Use when the user asks to sync FitPet, or when a SessionStart nudge says FitPet's data is stale.
---

# Sync FitPet from Garmin

FitPet grows from real workouts. This skill reads the user's recent Garmin activity via the
Garmin MCP and feeds a training-load score into the pet. An MCP tool can only be called by you
(the model) during a session, so this is the way fitness data reaches FitPet.

## Steps

1. **Get recent activities.** Call `mcp__garmin__get_activities` with `limit: 15`. This returns
   the newest activities (each has `id`, `type`, `start_time`, `moving_duration_seconds`, etc.).

2. **Get training load per activity.** The list view does not include training load. For each
   activity whose `start_time` is within the **last 7 days**, call
   `mcp__garmin__get_activity` with its `id` to get the detail, which includes `training_load`
   (Garmin's native per-activity cardiovascular load) and `training_effect`. Skip activities
   older than 7 days. Cap at ~10 detail calls to stay light.

3. **Build one JSON payload** of the detailed activities and **write it to a temp file**
   using your file-writing tool (e.g. `/tmp/fitpet-sync.json`). Do NOT pass it on the command
   line and do NOT `echo` it in a shell command — that would leak the data into process args
   and shell history. The shape:

   ```json
   { "activities": [ { "start_time_local": "...", "type": "...", "moving_duration_seconds": 0, "training_load": 0 }, ... ] }
   ```

4. **Feed the pet** from that file (the CLI does the mapping + scoring in tested code), then
   **delete the temp file**:

   ```bash
   node /Users/victorchun/fitpet/src/cli.ts sync --source garmin --file /tmp/fitpet-sync.json
   rm -f /tmp/fitpet-sync.json
   ```

5. **Show the result.** Run `node /Users/victorchun/fitpet/src/cli.ts status` and tell the user
   in one friendly line how their pet is doing (tier, vitality, and any tier_up/evolved event).

## Notes

- If `get_training_load_trend` happens to return data for this user, write
  `{ "trend": <that result>, "activities": [...] }` to the temp file instead; the adapter will
  use the native ATL as the window load. For most users, summing per-activity `training_load`
  (steps 2–4) is the path.
- **Privacy:** to call the Garmin MCP, you (the model) necessarily retrieve the user's activity
  data into this session. FitPet's scoring and storage are then fully local — nothing is sent to
  any third party or used for training, and the payload is passed via a temp file (not argv) so
  it stays off process args and shell history.
