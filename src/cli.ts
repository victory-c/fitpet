#!/usr/bin/env node
// The fitpet command. Every command loads state, does one thing, saves atomically, and
// prints a human-readable status. The CLI, hooks, desktop window, and feeder all reuse this engine.

import process from "node:process";
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";

import { readState, saveState, defaultState, statePath } from "./state.ts";
import { tick, tierOf } from "./vitality.ts";
import { applySnapshot, pickTopEvent } from "./engine.ts";
import { ManualSource } from "./sources/manual.ts";
import { GarminSource } from "./sources/garmin.ts";
import { faceFor, speciesOf, SPECIES } from "./content/species.ts";
import { isPersonality, PERSONALITIES } from "./content/personalities.ts";
import { applyReaction } from "./reactions.ts";
import {
  srcDir,
  defaultSettingsPath,
  defaultSkillsDir,
  readSettings,
  readSettingsStrict,
  SettingsParseError,
  previewAdditions,
  writeSettingsAtomic,
  backupSettings,
  installSkill,
  mergeSettings,
  unmergeSettings,
} from "./install.ts";
import type { PetState, ReactionEvent } from "./types.ts";
import type { FitnessSource, FitnessSnapshot } from "./sources/types.ts";
import { withStateLock } from "./state-lock.ts";
import { addRecovery, defaultScreenDebt, recoveryId } from "./screen-debt/state.ts";
import { computeScreenDebt } from "./screen-debt/score.ts";
import { readActivity } from "./local-activity/log.ts";
import { clineHookPlan, installClineHooks, uninstallClineHooks } from "./install-cline.ts";

function nowIso(): string {
  return new Date().toISOString();
}

function getFlag(args: string[], name: string): string | undefined {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
}

function readStdin(): string {
  if (process.stdin.isTTY) return "";
  try {
    return readFileSync(0, "utf8");
  } catch {
    return "";
  }
}

// Where a sync payload comes from, safest first: a file (--file), then piped stdin, then an
// inline --json string. The skill uses --file/stdin so fitness data never lands in process
// args or shell history.
function readPayload(rest: string[]): string {
  const file = getFlag(rest, "file");
  if (file) return readFileSync(file, "utf8");
  const inline = getFlag(rest, "json");
  if (inline !== undefined) return inline;
  return readStdin();
}

// Read settings for a WRITE op; abort (return null) on an unparseable existing file unless
// --repair is passed (in which case we proceed from empty — the file is still backed up).
function loadSettingsForWrite(path: string, allowRepair: boolean): Record<string, unknown> | null {
  try {
    return readSettingsStrict(path);
  } catch (e) {
    if (e instanceof SettingsParseError) {
      if (allowRepair) return {};
      console.error(`fitpet: ${e.message}`);
      console.error("   Left your file untouched. Fix the JSON, or re-run with --repair to back it up and start fresh.");
      return null;
    }
    throw e;
  }
}

function setReaction(state: PetState, event: ReactionEvent): void {
  applyReaction(state, event, nowIso());
}

function readStateForWrite(): PetState | null {
  const read = readState();
  if (!read.ok && (read.reason === "unreadable" || read.reason === "partial")) {
    const how = read.reason === "partial" ? "looks incomplete (missing identity/growth)" : "is unreadable";
    console.error(`fitpet: ${statePath()} ${how}; left it untouched (run \`fitpet reset\` to start fresh).`);
    return null;
  }
  return read.state;
}

function renderStatus(s: PetState): string {
  const tier = tierOf(s.vitality);
  const sp = speciesOf(s.pet.species);
  const lines = [
    `${sp.emoji} ${s.pet.name} the ${sp.name}  ${faceFor(s.pet.species, tier)}`,
    `   stage ${s.stage} · tier ${tier} · vitality ${Math.round(s.vitality)}/100`,
    `   rollingScore ${Math.round(s.fitness.rollingScore)} · healthyDays ${s.healthyDays} · age ${s.ageDays}d`,
    `   ${s.pet.personality} · last sync ${s.fitness.lastSyncAt ?? "never"}`,
  ];
  if (s.reaction) lines.push(`   says: "${s.reaction.text}"`);
  const activity = readActivity();
  if (activity.ok) {
    const debt = computeScreenDebt(activity.events, s.screenDebt ?? defaultScreenDebt(nowIso()), new Date());
    lines.push(`   screen debt ${Math.round(debt.score)}/100 · ${debt.severity.toLowerCase()}`);
  } else lines.push(`   screen debt: activity ${activity.reason}`);
  return lines.join("\n");
}

function usage(): string {
  return [
    "fitpet — a desktop pixel companion that grows from your fitness",
    "  outdoor <minutes>               log outdoor time ending now (screen-debt recovery only)",
    "",
    "  status                          print the pet as text (advances the sim; the GUI is the real face)",
    "  tick                            advance the sim (ease + age); never penalizes time",
    "  feed <minutes>                  hand-feed a synthetic workout",
    "  sync [--file <path>]            apply a FitnessSnapshot (--file > stdin > --json); --source --goal",
    "  react <event>                   force a quip for an event",
    "  reset [--name --species --personality]   start a fresh pet",
    "  install [--print --repair]      add FitPet's coding-event hooks to ~/.claude/settings.json",
    "  uninstall                       remove FitPet's hooks from settings.json (keeps your pet)",
    "  doctor                          show install + state status",
    "  cline-install --host vscode|cli --workspace /absolute/path [--print]   install local Cline hooks",
    "  cline-uninstall --host vscode|cli --workspace /absolute/path          remove unchanged FitPet Cline hooks",
    "  path                            print the state file path",
    "",
    `state: ${statePath()}`,
  ].join("\n");
}

function main(): void {
  const [, , cmd = "status", ...rest] = process.argv;

  switch (cmd) {
    case "cline-install":
    case "cline-uninstall": {
      const host = getFlag(rest, "host");
      const workspace = getFlag(rest, "workspace");
      if ((host !== "vscode" && host !== "cli") || !workspace) {
        console.error(`usage: fitpet ${cmd} --host vscode|cli --workspace /absolute/path [--print]`);
        process.exitCode = 1;
        return;
      }
      if (rest.includes("--print")) {
        console.log(JSON.stringify(clineHookPlan(host, workspace), null, 2));
        return;
      }
      const paths = cmd === "cline-install" ? installClineHooks(host, workspace) : uninstallClineHooks(host, workspace);
      console.log(`FitPet Cline hooks ${cmd === "cline-install" ? "installed" : "removed"}: ${paths.length} files.`);
      for (const path of paths) console.log(`   ${path}`);
      if (cmd === "cline-install") {
        console.log("Restart/reload Cline; VS Code users must enable Hooks in Cline's feature settings.");
        console.log("No global settings were changed. Run the companion with the same FITPET_HOME if overridden.");
      }
      break;
    }
    case "outdoor": {
      const minutes = Number(rest[0]);
      if (!Number.isFinite(minutes) || minutes <= 0 || minutes > 180) {
        console.error("usage: fitpet outdoor <minutes> (1–180)");
        process.exitCode = 1;
        return;
      }
      const current = readStateForWrite();
      if (!current) { process.exitCode = 1; return; }
      const now = nowIso();
      current.screenDebt = addRecovery(current.screenDebt ?? defaultScreenDebt(now), {
        id: recoveryId(`outdoor:${randomUUID()}`), at: now, minutes, kind: "outdoor",
      }, now);
      saveState(current);
      console.log(`Recorded ${minutes} outdoor minutes. No fitness or growth change.`);
      console.log(renderStatus(current));
      break;
    }
    case "status":
    case "tick": {
      // NOTE: these ADVANCE the sim before rendering. loadState() first sanitizes any bad
      // persisted values into range, then tick() eases vitality toward rollingScore — so a
      // corrupted file shows its clamped value already easing toward the target, not frozen.
      // The desktop window reads state without advancing the sim; the CLI status command ticks.
      const read = readState();
      const { state } = tick(read.state, nowIso());
      if (read.ok || read.reason === "missing") {
        saveState(state);
      } else {
        console.error(`fitpet: ${statePath()} is incomplete or unreadable; showing it read-only, left it untouched.`);
      }
      console.log(renderStatus(state));
      break;
    }

    case "feed": {
      const minutes = Number(rest[0]);
      if (!Number.isFinite(minutes) || minutes <= 0) {
        console.error("usage: fitpet feed <minutes>");
        process.exitCode = 1; return;
      }
      const current = readStateForWrite();
      if (!current) {
        process.exitCode = 1;
        return;
      }
      const { state, events } = applySnapshot(current, ManualSource.normalize(minutes), ManualSource, nowIso());
      setReaction(state, pickTopEvent(events) ?? "fed");
      saveState(state);
      console.log(renderStatus(state));
      console.log(`   events: ${events.join(", ") || "none"}`);
      break;
    }

    case "sync": {
      const sourceId = getFlag(rest, "source") ?? "external";
      const json = readPayload(rest); // --file > stdin > --json (keeps data out of argv)
      let raw: Record<string, unknown>;
      try {
        raw = JSON.parse(json);
      } catch {
        console.error("fitpet sync: expected JSON via --file <path>, stdin, or --json");
        process.exitCode = 1;
        return;
      }

      let snap: FitnessSnapshot;
      let source: FitnessSource;
      if (sourceId === "garmin") {
        // Garmin MCP raw -> normalized snapshot (training_load summed, ATL when present).
        source = GarminSource;
        snap = GarminSource.normalize(raw);
      } else {
        // Generic seam: caller passes an already-normalized FitnessSnapshot.
        source = {
          id: sourceId,
          loadGoal: Number(getFlag(rest, "goal") ?? 60),
          normalize: (r) => r as FitnessSnapshot,
        };
        snap = {
          windowDays: Number(raw.windowDays ?? 7),
          activities: Array.isArray(raw.activities) ? (raw.activities as FitnessSnapshot["activities"]) : [],
          windowLoad: typeof raw.windowLoad === "number" ? raw.windowLoad : undefined,
        };
      }

      const current = readStateForWrite();
      if (!current) {
        process.exitCode = 1;
        return;
      }
      const { state, events } = applySnapshot(current, snap, source, nowIso());
      const top = pickTopEvent(events);
      if (top) setReaction(state, top);
      saveState(state);
      console.log(renderStatus(state));
      console.log(`   source: ${source.id} · activities: ${snap.activities.length} · windowLoad: ${snap.windowLoad ?? "n/a"}`);
      console.log(`   events: ${events.join(", ") || "none"}`);
      break;
    }

    case "react": {
      const ev = rest[0] as ReactionEvent | undefined;
      if (!ev) {
        console.error("usage: fitpet react <event>");
        process.exitCode = 1;
        return;
      }
      const state = readStateForWrite();
      if (!state) {
        process.exitCode = 1;
        return;
      }
      setReaction(state, ev);
      saveState(state);
      console.log(renderStatus(state));
      break;
    }

    case "reset": {
      const species = getFlag(rest, "species");
      const personality = getFlag(rest, "personality");
      if (species && !SPECIES[species]) {
        console.error(`unknown species '${species}'. options: ${Object.keys(SPECIES).join(", ")}`);
        process.exitCode = 1; return;
      }
      if (personality && !isPersonality(personality)) {
        console.error(`unknown personality '${personality}'. options: ${PERSONALITIES.join(", ")}`);
        process.exitCode = 1; return;
      }
      const state = defaultState(nowIso(), { name: getFlag(rest, "name"), species, personality });
      saveState(state);
      console.log("✨ A new pet is born!");
      console.log(renderStatus(state));
      break;
    }

    case "path": {
      console.log(statePath());
      break;
    }

    case "install": {
      const settingsPath = getFlag(rest, "settings") ?? defaultSettingsPath();
      const src = srcDir();

      if (rest.includes("--print")) {
        // Dry run: show ONLY FitPet's proposed hook additions; never echo existing commands.
        const existing = loadSettingsForWrite(settingsPath, rest.includes("--repair"));
        if (existing === null) {
          process.exitCode = 1;
          return;
        }
        console.log(JSON.stringify(previewAdditions(existing, src), null, 2));
        break;
      }

      const existing = loadSettingsForWrite(settingsPath, rest.includes("--repair"));
      if (existing === null) {
        process.exitCode = 1;
        return;
      }
      const { settings, warnings, added } = mergeSettings(existing, src);
      const backup = backupSettings(settingsPath);
      writeSettingsAtomic(settingsPath, settings);
      const skill = installSkill(getFlag(rest, "skills-dir") ?? defaultSkillsDir());
      console.log("✅ FitPet hooks installed.");
      console.log(`   settings: ${settingsPath}${backup ? `\n   backup:   ${backup}` : ""}`);
      console.log(`   added:    ${added.join(", ") || "nothing new (already installed)"}`);
      console.log(`   skill:    ${skill}`);
      for (const w of warnings) console.log(`   ⚠️  ${w}`);
      console.log("   → Restart Claude Code to load the hooks. Run the FitPet window with `npm run app:dev`.");
      break;
    }

    case "uninstall": {
      const settingsPath = getFlag(rest, "settings") ?? defaultSettingsPath();
      const existing = loadSettingsForWrite(settingsPath, false); // never repair on uninstall
      if (existing === null) {
        process.exitCode = 1;
        return;
      }
      const { settings, removed } = unmergeSettings(existing, srcDir());
      const backup = backupSettings(settingsPath);
      writeSettingsAtomic(settingsPath, settings);
      console.log(`✅ Removed from settings: ${removed.join(", ") || "nothing"}`);
      if (backup) console.log(`   backup: ${backup}`);
      console.log(`   Your pet state at ${statePath()} is left intact.`);
      break;
    }

    case "doctor": {
      const settingsPath = getFlag(rest, "settings") ?? defaultSettingsPath();
      const s = readSettings(settingsPath) as { hooks?: Record<string, unknown> };
      const hookEvents = s.hooks ? Object.keys(s.hooks) : [];
      const fitpetHooks = hookEvents.length > 0; // best-effort: any hooks registered
      console.log("fitpet doctor");
      console.log(`   state file:    ${statePath()}`);
      console.log(`   settings file: ${settingsPath}`);
      console.log(`   hooks:         ${fitpetHooks ? hookEvents.join(", ") : "none"}`);
      break;
    }

    default:
      console.log(usage());
  }
}

// All state-changing commands cooperate with hooks. Acquire before the first read.
try {
  if (["status", "tick", "feed", "sync", "react", "reset", "outdoor"].includes(process.argv[2] ?? "status")) withStateLock(main);
  else main();
} catch (error) {
  console.error(`fitpet: ${error instanceof Error ? error.message : "command failed"}`);
  process.exitCode = 1;
}
