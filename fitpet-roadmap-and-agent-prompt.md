# FitPet — V1 Roadmap: a `/buddy`-style clone with a fitness engine

## The concept in one line

Bring back Claude Code's `/buddy` — a personality-driven companion that lives in your status line and reacts to your coding in real time — but make what **keeps it alive and growing** be your real-world fitness activity from Strava.

## The two axes (this is the whole design)

`/buddy`'s soul + FitPet's engine reconcile because they drive two *separate* things:

- **Care axis ← fitness (Strava).** Vitality, growth, evolution, thriving vs. wilting. This is your differentiator — the clones don't have it.
- **Reaction axis ← coding (hooks).** Real-time personality: quips, momentary faces, celebrating a passing test, panicking on low context. This is the beloved `/buddy` feel.

Your pet **grows from your workouts** but **reacts to your code.**

## Locked decisions

- **Surface:** Claude Code status line (the "face") + hooks (the "heartbeat" + reactions). Status-line richness — compact ASCII/emoji, no separate window.
- **Identity:** `/buddy`-style species + personality that flavors the reactions. Start with a *few* species/personalities for V1, not the original 19.
- **Reactions:** templated/canned quips keyed to `event + personality` for V1 — fast, free, fully local, no model call. (Model-generated commentary is a V2 upgrade.)
- **Engine:** Strava activity drives vitality/growth.
- **State:** fully local, single-player. No backend, no auth server, no leaderboard.
- **Death:** wilts and is revivable. No permadeath. ~4 vitality tiers.

## Architecture

```
Strava API ──(feeder, on a timer)──┐
                                   ▼
Claude Code hooks ─tick + react─▶  state.json  ─read─▶  status-line script ──▶  🐣 + quip  (terminal)
 (SessionStart/Stop/PostToolUse)   (THE PET)            (THE "FACE")
                                       ▲
                          personality + species + quip library
                          (content the renderer & reactions read)
```

Four pieces sharing one local state file, never talking directly:
1. **The face** — status-line command: read state → pick face for this species + vitality → print one line. Pure renderer.
2. **The heartbeat + reactions** — hook scripts: advance the sim (decay/growth) *and* fire personality-flavored quips on coding events.
3. **The feeder** — pulls Strava activity, converts to vitality, writes state.
4. **The personality content** — species, personality profiles, and the quip library the other pieces read.

---

## Phased roadmap

Each phase leaves a working, testable thing. Don't start a phase until the previous one is verified.

### Phase 0 — Foundations (decide, don't build)
- **Stack:** recommended TypeScript/Node (matches the existing clones, easy `npx` install; Python fine too — ecosystem convention, not a requirement).
- **`state.json` schema:** vitality, species, personality profile, age/evolution stage, last-tick time, activity balance, last-reaction.
- **Vitality model:** one 0–100 number from a *rolling* activity window → ~4 face tiers.
- **Quip taxonomy:** event types (test passed, error, long session, low context, session start) × personality traits → which quip pool.
- **Verify:** schema, model, and taxonomy written down and agreed. No code.

### Phase 1 — The pet + its personality, fully offline
- Engine: read/write state, `tick` (apply decay/growth from elapsed time), vitality → face.
- **Identity layer:** species + personality profile; faces and quip selection vary by species/personality.
- **Reaction library:** templated quips keyed to `event + personality`, chosen locally (no model).
- CLI to drive it by hand: `fitpet status`, `fitpet tick`, `fitpet feed <amount>`, `fitpet react <event>`.
- **Verify:** unit-test tick/decay/face/quip-selection; run the CLI and watch faces and quips change.
- **Out of scope:** Claude Code, Strava.

### Phase 2 — The face (status line)
- Status-line command that reads state and prints the current face line. Fast; **always prints something** (blank = pet vanishes).
- Register in `.claude/settings.json`.
- **Verify:** open Claude Code, see the pet; feed via CLI, watch the face update next turn.

### Phase 3 — The heartbeat + reactions (hooks) — the `/buddy` feel
- `SessionStart`: apply decay since last seen + a "welcome back" line.
- `Stop`: small life signal each turn.
- `PostToolUse`: fire a personality-flavored quip matching the event (e.g., celebrate a passing test, sympathize on an error).
- **Verify:** code for a while; confirm decay across sessions and live, in-character reactions.
- **Out of scope:** Strava.

### Phase 4 — The feeder (Strava) — the growth engine
- **Before any code:** read Strava's current developer terms — display/AI-use restrictions and rate limits. Main legal risk; resolve first.
- OAuth (store tokens locally/securely), pull recent activities, map activity → vitality, write state.
- Run on a schedule or lazily on `SessionStart`.
- **Verify:** a real/recent workout reaches the pet and moves vitality.

### Phase 5 — Polish & distribute
- Tune thresholds so the pet feels fair, not punishing (rolling window, gentle decay).
- Expand species/quip content. One-line `npx` install, README, packaging.
- **Verify:** fresh-machine install test.

### Cross-cutting
- Status line must **never** error to blank — degrade to a safe default face.
- Predictable local state path (e.g. `~/.fitpet/state.json`).
- Unit-test the pure logic (tick, decay, mapping, quip selection).

---

## The planning prompt for your coding agent

> Paste into Claude Code (or your agent) to start **planning only** — it's written to stop before writing code.

```
You're helping me build a side project. Read these instructions in full before anything else.

## How I work (important)
I'm a beginner coder. Work in four phases, in order — DO NOT skip ahead:
1. UNDERSTAND — restate my ask in your own words, list anything ambiguous, ask 1–3 clarifying questions, state what's in scope vs out. Then STOP and wait for me to confirm.
2. PLAN — walk me through goal, approach, files/pieces, data flow, trade-offs, and what could go wrong. Then STOP and wait for me to say "go" before writing ANY code.
3. IMPLEMENT — only after I say go.
4. REVIEW — walk me through changes before any commit.
Rules: explain concepts before naming them; name any library/pattern you use; show full file paths; never run git commit/push or anything irreversible without my explicit "yes, commit"; never say code "should work" — tell me how to verify it; never invent library APIs — look them up or say you're not sure.

## What we're building
"FitPet" — a literal-feeling clone of Claude Code's removed `/buddy` companion, but powered by my real-world fitness. It lives in the Claude Code STATUS LINE and reacts to my coding in real time, like `/buddy` did. The twist: what keeps it alive and growing is my STRAVA activity, not my coding.

The design has TWO separate axes:
- CARE AXIS (driven by FITNESS / Strava): vitality, growth, evolution, thriving vs. wilting.
- REACTION AXIS (driven by CODING events via hooks): real-time personality — quips, momentary faces, celebrating tests, reacting to errors. This is the `/buddy` feel.
So: the pet GROWS from my workouts but REACTS to my code.

Locked decisions:
- Surface: Claude Code status line (the "face") + hooks (heartbeat + reactions). Status-line richness only — compact ASCII/emoji, NO separate window.
- Identity: a few species + personality profiles (not the original 19) that flavor the reactions.
- Reactions for V1: TEMPLATED/canned quips keyed to (event + personality), chosen locally — NO model calls. (Model-generated commentary is a later upgrade.)
- State: fully LOCAL, single-player. No backend, no auth server, no leaderboard.
- No permadeath — the pet wilts and is revivable. ~4 vitality tiers.

Architecture — four pieces sharing one local state file, never talking directly:
1. THE FACE — status-line command: read state, print one line. Pure renderer.
2. THE HEARTBEAT + REACTIONS — hook scripts (SessionStart, Stop, PostToolUse) that advance the sim AND fire personality quips on coding events.
3. THE FEEDER — pulls Strava activity, converts to vitality, writes state.
4. PERSONALITY CONTENT — species, personality profiles, and the quip library the others read.

## Your task RIGHT NOW (UNDERSTAND, then PLAN — no code)
Do NOT write code. Instead:
1. Confirm your understanding and ask me any clarifying questions.
2. Recommend a language/stack and why (I lean TypeScript/Node).
3. Propose the `state.json` schema — every field, type, purpose — including species, personality, vitality, evolution.
4. Propose the vitality model: rolling Strava activity → 0–100 → ~4 faces.
5. Propose the quip taxonomy: event types × personality traits → quip pools.
6. Lay out a phase-by-phase plan where the pet works end-to-end at each phase and each phase is testable before the next.
7. Flag the riskiest unknowns — especially Strava's current API terms (display/AI-use restrictions) and rate limits — and how we'd resolve them before building the feeder.
Then STOP and wait for my approval before any code.

Verify Claude Code status line and hooks details against current official docs (code.claude.com/docs), not memory — these APIs change.
```
