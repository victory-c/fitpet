#!/usr/bin/env node
// The fitpet command. Every command loads state, does one thing, saves atomically, and
// prints a human-readable status. The CLI, hooks, desktop window, and feeder all reuse this engine.

import process from "node:process";
import { readFileSync } from "node:fs";

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
  if (!read.ok && read.reason === "unreadable") {
    console.error(`fitpet: ${statePath()} is temporarily unreadable; left it untouched.`);
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
  return lines.join("\n");
}

function usage(): string {
  return [
    "fitpet — a desktop pixel companion that grows from your fitness",
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
    "  path                            print the state file path",
    "",
    `state: ${statePath()}`,
  ].join("\n");
}

function main(): void {
  const [, , cmd = "status", ...rest] = process.argv;

  switch (cmd) {
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
        console.error(`fitpet: ${statePath()} is temporarily unreadable; left it untouched.`);
      }
      console.log(renderStatus(state));
      break;
    }

    case "feed": {
      const minutes = Number(rest[0]);
      if (!Number.isFinite(minutes) || minutes <= 0) {
        console.error("usage: fitpet feed <minutes>");
        process.exit(1);
      }
      const current = readStateForWrite();
      if (!current) {
        process.exit(1);
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
        process.exit(1);
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
        process.exit(1);
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
        process.exit(1);
        return;
      }
      const state = readStateForWrite();
      if (!state) {
        process.exit(1);
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
        process.exit(1);
      }
      if (personality && !isPersonality(personality)) {
        console.error(`unknown personality '${personality}'. options: ${PERSONALITIES.join(", ")}`);
        process.exit(1);
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
          process.exit(1);
          return;
        }
        console.log(JSON.stringify(previewAdditions(existing, src), null, 2));
        break;
      }

      const existing = loadSettingsForWrite(settingsPath, rest.includes("--repair"));
      if (existing === null) {
        process.exit(1);
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
        process.exit(1);
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

main();
