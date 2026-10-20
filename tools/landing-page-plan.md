# FitPet landing page — approved plan and amendments

## Handoff status and precedence

The plan below was approved by Victor with the amendments reproduced verbatim first. **The latest approval/amendments override any conflicting wording in the original plan.** Earlier decisions are also preserved verbatim.

Setup is already complete:
- Implementation workspace: `/Users/victorchun/fitpet-site`.
- Branch: `feat/landing-page`, no upstream configured.
- Starting commit: `88e8b82142c84b46caaaaedc60154cb7952ceca9`.
- Protected live clone: `/Users/victorchun/fitpet`, branch `main`, HEAD `b5fac03302bd03682fb8df173779b93bcfbb69a0`, clean porcelain status.
- Do not repeat worktree creation. No dependencies, implementation, tests, builds, or captures have been run by this task.
- This document is the only handoff file added after setup. Continue implementation in a **new task with the workspace set to `/Users/victorchun/fitpet-site`**.
- Use absolute paths under that workspace for every project write. Re-check the protected clone's branch, HEAD, and porcelain status before each milestone commit and at completion.
- Use `http://127.0.0.1:8000/fitpet/` consistently, including where the preserved plan below says localhost.
- L1/L2/L4 default to fallback wording until Victor reports results. No merge or repository settings changes.
- Historical Phase 1 statements in the preserved plan describe the time it was written; they are not instructions to undo completed setup.

## Latest approval and amendments — authoritative

APPROVED, with these amendments:

1. Copy:
   - Hero: replace the last sentences with: "He hatches from an egg, and his monitor upgrades as he grows. He sits in a small window on top of my editor. My Garmin workouts make him grow. If I've been coding with Claude Code or Cline for an hour straight, he tells me to go outside." (Defaults/hook caveats already live in sections 4, 5 and 7.)
   - Section 6: delete the GitHub server-logs sentence. End with "This page has no analytics and no cookies."
   - Section 8 uninstall: "`node src/cli.ts uninstall` (run it from the same clone) removes the hooks. It doesn't touch your pet or the copied skill; delete `~/.claude/skills/fitpet-sync` yourself if you want that gone too."
   - Both proposed sentence splits: approved. Word count above 900 is fine; don't cut substance.
   - Medium link: confirmed by me, it's my article. Q16: keep the Garmin server generic.
   - All other factual corrections in your table: approved.

2. Tooling: Playwright 1.63.0 with cached revision 1243 approved; no browser download without asking. Root `npm ci` (Electron download) approved. Use http://127.0.0.1:8000/fitpet/ consistently for preview and browser-check, since the server binds IPv4.

3. Workspace safety: this task's workspace is the live clone. In THIS task, run only the Phase 2 setup step: record the live clone's branch/HEAD/porcelain, `git fetch`, and `git worktree add --no-track ...`. Then stop. I'll start a new task with the workspace set to /Users/victorchun/fitpet-site and paste the approved plan. In the new task, use absolute paths under /Users/victorchun/fitpet-site for every write, and re-check the live clone's branch/HEAD/porcelain before each milestone commit.

4. Everything else as planned: milestones, cut rule, gates L1/L2/L4 default to the fallback wording until I report results. Never merge, never touch repo settings.

## Earlier approved decisions — verbatim

Thanks — the findings, workflow and verification mapping are good. Decisions:

1. Installer tests: APPROVED to run the existing, unchanged test suite, sandboxed for the whole run:
   T="$(mktemp -d)"; HOME="$T" FITPET_HOME="$T/.fitpet" npm test; rm -rf "$T"
   (I checked: install tests pass temp --settings/--skills-dir, Cline tests use temp workspaces + FITPET_HOME, rejection cases exit before writing, and CI runs the same suite.) The ban on YOU directly running install/uninstall/cline-install/cline-uninstall/doctor stays.

2. AC4 = commands you EXECUTE, not commands quoted as page content. Also: at the start of Phase 2, record branch, HEAD and `git status --porcelain` of /Users/victorchun/fitpet (currently main @ b5fac03, clean); AC4 = all three unchanged at the end. Never fast-forward, fetch-merge or switch that tree.

3. Deviations 3–6 APPROVED: symmetric push/PR path filters (intentional: an app PR that changes README/quips/config must keep the page in sync), self-check step + filter, symlink/hard-link ban in site/, 404 rule applies to local URLs only.

4. AMENDMENT — write the checker in Node, not bash:
   - tools/check-site.mjs and tools/check-site-selfcheck.mjs, node: builtins only, no deps (names must not match node --test patterns).
   - Get earnest pools exactly via `import { quipsFor } from "../src/content/quips.ts"` (exported; Node 24 strips types). Parse the 4 earnest strings in src/screen-debt/concern.ts with a regex and fail closed unless exactly 4 are found.
   - pages.yml build job: add actions/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020 # v4.4.0 with node-version: 24 (same pin as ci.yml), then run the self-check and the checker with node. Update the path filters to the new filenames.
   - Keep the controlled-markup conventions, diagnostic codes R01–R10, rule-specific self-check assertions, decimal KB, boundary-aware banned words, and no outbound navigation in browser-check.

5. Your plan is missing sections 2, 3, 5, 6, 8, 9 and 10 from §14. Please output the COMPLETE plan with all 10 headings, with these decisions folded in. Section 5 must include the full copy deck and the claim → file:line trace table (including PR #14903 state and the Medium link). Section 10 must list every network/download command (npm ci Electron download, any Playwright browser). Then stop again.

---

# Complete ten-section plan — preserved verbatim

## 1. Scope and deviations

**This is the complete Phase 1 plan, not authorization to begin Phase 2.** The research team has finished and stopped. No project files, branches, or worktrees were created; no dependencies, tests, app, CLI, or capture tools were run. The only repository-writing operation was the permitted `git fetch origin`.

**Evidence baseline:** `origin/main` is `88e8b82142c84b46caaaaedc60154cb7952ceca9`. All repository line references below refer to that commit, not the checked-out version.

**Path notation:** `R` means `/Users/victorchun/fitpet`; `W` means the proposed `/Users/victorchun/fitpet-site`. Thus `R/src/config.ts:22–28` is an absolute-path reference to `/Users/victorchun/fitpet/src/config.ts`, with lines read from `origin/main`.

**Re-verification of every §0 row**

| §0 fact | Research result |
|---|---|
| Main commit, merge, CI | Confirmed full SHA above and commit title. PR #3 merged October 20, 2026, at `11:22:46Z`. Its `test` check succeeded. Existing CI job logs report **166 tests, 166 passed, 0 failed**. |
| Local clone | **Changed:** clean on `main`, HEAD `b5fac03302bd03682fb8df173779b93bcfbb69a0`, one commit behind `origin/main`. Not on `feat/snooze-and-intensity`. Final Phase 1 inspection confirms the same branch, HEAD, and empty porcelain status. |
| Live hooks use this clone | Treated as Victor-provided operational context. I did not inspect private Claude settings to independently verify their installed paths. The clone remains protected regardless. |
| Pages/user-site/homepage | Pages GET returns 404; `victory-c/victory-c.github.io` GET returns 404; repository homepage is null. The `github-pages` environment also returns 404. |
| Description/topics | Confirmed stale status-line description and `status-line` topic. |
| Distribution | Releases `[]`; tags `[]`; npm registry lookup for package `fitpet` returns 404; `R/package.json:2–3` says `fitpet`, version `0.1.0`. |
| Hard-coded paths | Confirmed in `R/skills/fitpet-sync/SKILL.md:36,40` and `R/README.md:177,180,184`; clone placeholder confirmed at `R/README.md:57`. |
| Hand-testing gaps | Physical menu click/drag still unverified in `R/docs/snooze-validation.md:46–51`; live Cline host validation absent in `R/README.md:210–212`. L2/L4 remain unresolved until Victor reports results. |
| Default personality | Confirmed sprout/earnest: `R/src/content/species.ts:15–22`, reset/default construction in `R/src/cli.ts:297–309` and `R/src/state.ts:32–42`. |
| Traffic baseline | Confirmed October 6–19: 11 views, 7 unique visitors; reddit.com referral count 1; stars 0. |

**Your decisions are incorporated:**

- Existing unchanged tests may run with both disposable `HOME` and `FITPET_HOME` for the whole invocation. Direct installer/uninstaller/doctor execution by me remains forbidden.
- At Phase 2 start, record live-clone branch, HEAD, and porcelain status. All three must match at completion.
- Symmetric push/PR filters, self-check execution/filtering, site symlink/hard-link rejection, and local-only interpretation of the 404 URL rule are approved.
- Replace the bash checker with dependency-free Node tools:
  - `W/tools/check-site.mjs`
  - `W/tools/check-site-selfcheck.mjs`
- Add the existing CI `setup-node` pin and Node 24 to Pages checks.
- Keep diagnostic codes R01–R10, controlled markup, rule-specific negative assertions, decimal KB, boundary-aware banned words, and no outbound browser navigation.

**Additional discrepancies and proposed resolutions**

| Issue | Evidence and resolution |
|---|---|
| Hero says the pet starts as a CRT | Reset starts as an egg; hatchling gets the mono CRT. Correct the text. `R/src/state.ts:38–42`; `R/src/desktop/renderer/view-model.ts:29–40`. |
| “Growth needs a Garmin” | Synthetic feeding can grow the pet. Say **“Garmin sync needs…”** instead. `R/src/sources/manual.ts:7–20`; `R/test/engine.test.ts:24–36`. |
| “No network code in its source” | Too broad: development renderer loading supports loopback HTTP(S). Say scoring and storage are local; preserve the Garmin-through-Claude caveat. `R/src/desktop/main.ts:52–55,114–119`. |
| Unqualified storage/backup/uninstall statements | Qualify default storage, backup of an existing settings file, and uninstall from the original clone. Evidence appears in section 5. |
| Cline “only gets the session timer” | It receives activity events supporting timer, debt, and nudges, but not coding-event reactions. Correct that distinction. `R/src/hooks/cline.ts:1–13`. |
| Every claim cannot trace to app source | Personal history, ambassador disclosure, external articles, PR state, and hosting practices need external evidence or Victor’s confirmation. The trace table labels those separately. |
| Voice-rule conflict | The original Claude reaction sentence is **31 words**. The long PR/article sentence also needs splitting. Proposed sentence splits are listed in section 5 and require Victor’s voice approval. |
| Word-count target | The complete supplied deck is longer than the approximate 800–900-word target. Preserve the approved substance rather than silently cutting copy. Any substantive shortening goes back to Victor. |
| OG budget | Apply the stricter **80,000-byte image gate**, which also satisfies the OG-specific “under 1 MB” requirement. No exception assumed. |
| Six-second seamless loop | Six seconds aligns the 1 Hz indicator, not all breathing/ECG phases. Seam review is required; omit the optional loop if it cannot pass. `R/src/desktop/renderer/renderer.ts:250,296–316`. |
| Build-isolation wording | “Nothing outside `src/` is read” is literally too broad because configuration/dependencies are read. The verified isolation claim is that no site/tools entry points are configured. `R/electron.vite.config.ts:10–29`. |

Milestones remain October 22, 24, 27, 28, and 30, 2026. If M2 misses the end of Tuesday, October 27, apply the PRD’s still-image cut rule.

## 2. Setup commands

**All commands in this section are proposed for after explicit plan approval.**

Start by recording the protected clone’s state in the task command log:

```bash
git -C /Users/victorchun/fitpet branch --show-current
git -C /Users/victorchun/fitpet rev-parse HEAD
git -C /Users/victorchun/fitpet status --porcelain=v1
```

Expected from current research:

```text
main
b5fac03302bd03682fb8df173779b93bcfbb69a0
<empty porcelain status>
```

Then create the separate worktree without switching or fast-forwarding the live clone:

```bash
git -C /Users/victorchun/fitpet fetch origin

git -C /Users/victorchun/fitpet worktree add --no-track \
  /Users/victorchun/fitpet-site \
  -b feat/landing-page origin/main

git -C /Users/victorchun/fitpet-site log -1 --format='%H %s'
git -C /Users/victorchun/fitpet-site status --porcelain=v1
```

If the target directory or branch already exists, stop and inspect; do not reset, delete, or reuse it blindly. If main advanced, re-audit affected claims before implementation.

Install root dependencies and establish the unchanged baseline **before adding landing-page code**:

```bash
cd /Users/victorchun/fitpet-site
npm ci
npm run typecheck
npm run build
npm run app:build
```

Run the existing suite using your approved sandbox, with cleanup and failure propagation:

```bash
(
  cd /Users/victorchun/fitpet-site
  T="$(mktemp -d)"
  trap 'rm -rf "$T"' EXIT
  HOME="$T" FITPET_HOME="$T/.fitpet" npm test
)
```

Expected baseline: **166 passing tests**, unless a newly fetched main legitimately changes that count. Record the actual baseline before implementation and require the final count to match it.

After creating the capture package:

```bash
cd /Users/victorchun/fitpet-site/tools/capture
PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 npm install --save-exact playwright@1.63.0
```

This creates the capture-only lockfile. Subsequent installs use:

```bash
PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 \
  npm --prefix /Users/victorchun/fitpet-site/tools/capture ci
```

Why `1.63.0`: a locally installed copy’s browser manifest identifies Chromium/headless-shell revision `1243`, matching existing cached executables. Reconfirm that relationship during setup. Do not run a browser installer automatically.

Victor then follows V1b: open `W` in a new VS Code window, leave command auto-approve off, and start the implementation task with the approved plan.

## 3. Files to create

All paths below are under **`/Users/victorchun/fitpet-site`**.

| Absolute path or path family | Purpose | Estimated committed size |
|---|---|---:|
| `W/site/index.html` | Complete one-page deck, metadata, landmarks, media, compatibility table, quick start | 18–25 KB |
| `W/site/404.html` | Styled missing-page response with `/fitpet/`-absolute local resources | 2–4 KB |
| `W/site/style.css` | Both themes, responsive layout, pixel-art treatment, focus/reduced-motion styles | 7–10 KB |
| `W/site/main.js` | Progressive video Pause/Play and media-query handling only | ≤3 KB |
| `W/site/assets/hero-poster.png` | Fixture-derived hero poster | Target ≤55 KB |
| `W/site/assets/touch-grass.png` | Real renderer nudge still | Target ≤55 KB |
| `W/site/assets/debt.png` | Real renderer debt still | Target ≤55 KB |
| `W/site/assets/snoozed.png` | Real renderer snooze still | Target ≤55 KB |
| `W/site/assets/og-v1.png` | 1280×640 social preview | ≤80 KB |
| `W/site/assets/favicon-32.png` | Shell crop | Target ≤3 KB |
| `W/site/assets/apple-touch-icon.png` | Shell crop on dark background | Target ≤10 KB |
| `W/site/assets/hero-loop.mp4` | Optional P0.5 six-second loop | ≤250 KB |
| `W/tools/check-site.mjs` | Node-builtins-only static checks, R01–R10 | 15–25 KB |
| `W/tools/check-site-selfcheck.mjs` | Positive fixture and rule-specific negative checks | 10–18 KB |
| `W/tools/capture/package.json` | Exact Playwright dependency and capture commands | <1 KB |
| `W/tools/capture/package-lock.json` | Capture-only dependency lock | Approximately 2–5 KB |
| `W/tools/capture/README.md` | Reproduction, clocks, fixtures, browser cache, budgets, limitations | 5–8 KB |
| `W/tools/capture/capture.mjs` | Temporary renderer serving, capture, output validation | 15–25 KB |
| `W/tools/capture/shim.js` | Fixture bridge and manual frame queue | 3–6 KB |
| `W/tools/capture/browser-check.mjs` | Local browser gates and scratch screenshots | 12–20 KB |
| `W/tools/capture/og.html` | OG layout using local assets only | 2–4 KB |
| `W/tools/capture/fixtures/hero.json` | Hero snapshot | About 1 KB |
| `W/tools/capture/fixtures/touch-grass.json` | Nudge snapshot | About 1 KB |
| `W/tools/capture/fixtures/debt.json` | Debt snapshot | About 1 KB |
| `W/tools/capture/fixtures/snoozed.json` | Snooze snapshot | About 1 KB |
| `W/.github/workflows/pages.yml` | SHA-pinned checks and Pages deployment | About 2 KB |

For CSP compliance, `og.html` can use an external local stylesheet, adding `W/tools/capture/og.css` if needed. Its resources are capture-only and are not published.

Optional P1 fixtures/assets are added only if the P0/P0.5 schedule permits; their exact inventory is recorded before capture.

**No tracked changes outside `site/**`, `tools/**`, and `.github/workflows/pages.yml`.** In particular, no edits to source, existing tests, docs, skills, README, root package files, existing CI, or ignore rules. Installed dependencies and build outputs remain gitignored.

## 4. Workflow

Proposed full **`/Users/victorchun/fitpet-site/.github/workflows/pages.yml`**:

```yaml
name: Landing page

on:
  push:
    branches: [main]
    paths:
      - "site/**"
      - "tools/check-site.mjs"
      - "tools/check-site-selfcheck.mjs"
      - ".github/workflows/pages.yml"
      - "README.md"
      - "src/config.ts"
      - "src/content/quips.ts"
      - "src/screen-debt/concern.ts"
  pull_request:
    paths:
      - "site/**"
      - "tools/check-site.mjs"
      - "tools/check-site-selfcheck.mjs"
      - ".github/workflows/pages.yml"
      - "README.md"
      - "src/config.ts"
      - "src/content/quips.ts"
      - "src/screen-debt/concern.ts"
  workflow_dispatch:

permissions: {}

concurrency:
  group: pages-${{ github.ref }}
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest
    timeout-minutes: 5
    permissions:
      contents: read
    steps:
      - uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1
        with:
          persist-credentials: false

      - uses: actions/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020 # v4.4.0
        with:
          node-version: "24"

      - name: Self-check site checker
        run: node tools/check-site-selfcheck.mjs

      - name: Check site
        run: node tools/check-site.mjs site

      - if: github.event_name != 'pull_request'
        uses: actions/upload-pages-artifact@fc324d3547104276b827a68afc52ff2a11cc49c9 # v5.0.0
        with:
          path: site/

  deploy:
    needs: build
    if: github.event_name != 'pull_request' && github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    timeout-minutes: 15
    permissions:
      pages: write
      id-token: write
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@368f82528645a54fb793d4d04e342629a3f51346 # v5.0.1
```

No npm install in this workflow: the checker uses builtins and imports the repository’s TypeScript quip module using Node 24 type stripping.

**Re-verified commands and literal stdout:**

```text
$ git ls-remote https://github.com/actions/checkout refs/tags/v7.0.1
3d3c42e5aac5ba805825da76410c181273ba90b1	refs/tags/v7.0.1

$ git ls-remote https://github.com/actions/setup-node refs/tags/v4.4.0
49933ea5288caeca8642d1e84afbd3f7d6820020	refs/tags/v4.4.0

$ git ls-remote https://github.com/actions/upload-pages-artifact refs/tags/v5.0.0
fc324d3547104276b827a68afc52ff2a11cc49c9	refs/tags/v5.0.0

$ git ls-remote https://github.com/actions/deploy-pages refs/tags/v5.0.1
368f82528645a54fb793d4d04e342629a3f51346	refs/tags/v5.0.1
```

The existing CI checkout pin was also checked:

```text
11d5960a326750d5838078e36cf38b85af677262	refs/tags/v4.4.0
```

Existing CI remains untouched. No `configure-pages`, Jekyll step, secrets, `pull_request_target`, or settings writes. PR runs cannot upload or deploy.

## 5. Copy deck

**Link destinations**

- Repository: `https://github.com/victory-c/fitpet`
- README score explanation: `https://github.com/victory-c/fitpet#screen-debt-and-recovery`
- README Cline setup: `https://github.com/victory-c/fitpet#cline-activity-opt-in-project-local`
- Cline PR: `https://github.com/cline/cline/pull/14903`
- Medium: `https://medium.com/@victorchun_61700/one-week-in-what-it-was-like-switching-to-cline-from-claude-code-and-codex-9594b7c01d9a`
- X: `https://x.com/VCbutVictor`
- New issue: `https://github.com/victory-c/fitpet/issues/new`

External links stay in the same tab, with no `noreferrer` and no referrer-policy override.

**1 · Hero**

> # I built a desktop pet that grows when I work out and tells me to touch grass when I code too long.
>
> Shelldon is a pixel hermit crab with a computer monitor for a shell. He starts as an egg. After he hatches, his CRT shell upgrades as he grows. He sits in a small window on top of my editor. My Garmin workouts make him grow. By default, he nudges me after an hour of hook-observed coding with Claude Code or Cline, unless snoozed.
>
> **View on GitHub** · Quick start
>
> `v0.1 · install from source · window only tried on macOS · Node 23.6+ · MIT`

**2 · What he does**

> ### He runs on your training
>
> FitPet reads your Garmin training load for the last 7 days. When you've been training he's bright orange and the heartbeat on his screen runs fast. If a sync shows a quiet week he goes grey and slumps, and if it stays quiet his screen goes to standby. Keep it up and his shell upgrades: egg, chunky mono CRT, colour monitor, flat panel.
>
> ### He notices long sessions
>
> Hooks from Claude Code and Cline tell him when you're working. Gaps under 15 minutes count as one session. At 60 minutes (by default) he says something like “You've been at this a while — go touch grass?”
>
> In Claude Code he also reacts when tests pass or fail, with a speech bubble and a green or red flash on his screen. Now and then he reacts to an edit. From Cline he gets activity events for the timer, nudge and score, but no coding-event reactions.
>
> ### He keeps score
>
> Screen debt runs from 0 to 100. Long sessions push it up. Breaks, workouts and outdoor time you log yourself pay it down. On the default setting, he brings it up at 35, 60 and 80.

The reaction-sentence split is a proposed voice correction requiring approval.

**3 · Why I made it**

> I'm a student at Berkeley and I do triathlon. Most of my coding happens with an agent running next to me now, and it's easy to look up and realize it's been three hours. Claude Code used to have a little /buddy pet. I missed it, so I made my own and gave it a reason to care whether I'd been outside.

Personal history and `/buddy` wording remain subject to V8.

**4 · The nagging part**

Common introduction:

> When I posted this on r/SideProject, someone said that by the third touch grass reminder they'd be looking for a mute button. Fair.

**L2 passed:**

> Now you can right-click Shelldon and snooze him for 30 minutes, an hour, or until tomorrow. You can also do it from the terminal with `node src/cli.ts snooze 30`, and pick how pushy he is with `node src/cli.ts nag gentle`.

**L2 not passed — default until Victor confirms:**

> You can snooze him from the terminal with `node src/cli.ts snooze 30`, and pick how pushy he is with `node src/cli.ts nag gentle`.

| Setting | First nudge | Repeats | Debt bubbles at |
|---|---|---|---|
| Gentle | 90 min | never | 60, 80 |
| Normal (default) | 60 min | never | 35, 60, 80 |
| Persistent | 45 min | every 30 min | 35, 60, 80 |

> Snoozing hides the touch-grass and debt reminders, not ordinary test, edit or fitness reactions. The debt keeps counting.

**5 · How the score works**

Collapsed `<details>`, summary **How the score works**:

> The first 30 minutes of a session are free. After that it's a quarter point a minute, then half a point a minute once you pass an hour, so about two straight hours gets you to 35.
>
> Once you've been away 15 minutes you earn back half a point a minute, up to 15 per break. A Garmin workout, or outdoor time you log with `node src/cli.ts outdoor 20`, pays back a point a minute, up to 40.
>
> I picked these numbers. They aren't medical advice, and they're all in `src/config.ts` if you want different ones. The score comes from hook events, not real screen time.
>
> More in the README →

“About two hours” remains approximate: debt reaches 35 at 115 continuously observed minutes and 37.5 at 120.

**6 · What it stores**

> By default, FitPet stores its data in `~/.fitpet` on your computer. FitPet's scoring and storage are local. When a hook fires, FitPet writes down what kind of event it was and the time. Not your prompts, file paths, commands or output. The Cline hook only listens and always tells Cline to keep going. The speech bubbles are canned lines, with no model calls.
>
> The one catch is Garmin. Sync runs as a Claude Code skill that calls a Garmin MCP server, so your recent activities pass through that Claude session on the way in. After that the math is local.
>
> This page has no analytics and no cookies. GitHub, which hosts it, keeps its own server logs.

The journal claim is about **persistence**, not a claim that Claude hooks never inspect command text transiently. GitHub’s server-log sentence is a hosting-policy statement, not an app-source fact; verify the applicable policy before publication.

**7 · Before you clone it**

> It's v0.1 and still rough. There's nothing to download yet: you clone the repo and run it with npm, and you need Node 23.6 or newer. I've only run the window on my Mac. The tests run on Linux in CI, but I haven't tried the app there or on Windows, and the Cline hook installer needs a POSIX shell.
>
> Garmin sync needs a Garmin and a Garmin MCP server registered as `garmin` in Claude Code. Screen debt comes from hook events, so it misses coding you do without an agent and counts an agent that keeps going after you walk away.

**L1 not passed — include this paragraph:**

> Heads up: `/fitpet-sync` and the Cline commands in the README still have my own path baked in. Until I fix it, swap `/Users/victorchun/fitpet` for wherever you cloned it, in `~/.claude/skills/fitpet-sync/SKILL.md` (again after you re-run `install`) and in the commands.

**L1 passed:** omit that paragraph only after inspecting the merged portability changes and re-checking the instructions.

| | Claude Code | Cline (VS Code or CLI) |
|---|---|---|
| Session timer, touch-grass nudge, screen debt | Yes | Yes — experimental, not tested on a live install yet |
| Speech bubbles for tests, errors, some edits | Yes | No |
| Garmin sync (`/fitpet-sync`) | Yes | No, it's a Claude Code skill |
| Ages and grows between syncs | Yes, through hooks | No |
| Setup | `node src/cli.ts install` | `cline-install` once per project folder; enable Hooks in Cline's VS Code settings; see the README |

**L4 passed:** replace the first-row Cline cell with **Yes**. Do not infer this result from browser fixtures or process tests.

The Garmin server stays unnamed/unlinked until Q16 is confirmed.

**8 · Try it**

The HTML-decoded code block must equal `R/README.md:57–64`, except the clone line:

```bash
git clone https://github.com/victory-c/fitpet.git ~/fitpet && cd ~/fitpet
npm install                              # deps + the Electron binary

node src/cli.ts reset --name Shelldon    # start a fresh egg
npm run app:dev                          # open the companion window

node src/cli.ts install                  # add the coding-event hooks to ~/.claude/settings.json
# → restart Claude Code so the hooks load
```

> `npm run app:dev` keeps running, so do the `install` step in a second terminal.
>
> `install` backs up an existing `settings.json`, merges the hooks, and copies the `/fitpet-sync` skill into `~/.claude/skills`. Preview it with `node src/cli.ts install --print`.
>
> Run `node src/cli.ts uninstall` from the original clone to remove hook entries whose commands contain that clone's source path. It leaves pet state and the copied skill intact. Delete `~/.claude/skills/fitpet-sync` yourself if you want that gone too.
>
> No Garmin? `node src/cli.ts feed 60` hand-feeds a fake 60-minute workout, which is enough to hatch the egg.
>
> Using Cline? The README has the `cline-install` steps.

The feed sentence remains contingent on AC8. Source derivation supports it, but does not replace the required isolated execution.

**9 · How I built it**

> I built most of the recent version with Cline, this page included. The first versions were built with Claude Code. Now I write a short spec, Cline plans it in Plan mode, I read the plan and push back, then it writes the code.
>
> Along the way I found a crash in Cline's CLI model picker and sent a fix (cline/cline#14903, still in review). I also wrote about switching. I'm a Cline Campus Ambassador.

PR text links to #14903; “wrote about switching” links to the Medium URL above. Splitting the original combined sentence requires Victor’s voice approval.

**At M3:** GET #14903 again. It currently remains **open, unmerged**. Only if merged, use:

> Along the way I fixed a crash in Cline's CLI model picker (cline/cline#14903).

**10 · Follow along**

> I post about it as it changes, on X (@VCbutVictor) and Medium. If he nags too much, or not enough, open an issue and tell me which.

**11 · Footer**

> MIT · Made by Victor Chun · Source · FitPet isn't an official Anthropic, Cline or Garmin project, and none of them endorse it. I'm a Cline Campus Ambassador.

**404 page**

> Shelldon wandered off. This page doesn't exist. Back to FitPet · GitHub

“Back to FitPet” uses `/fitpet/`; all local 404 resources use `/fitpet/`-absolute URLs.

**Claim → evidence trace**

| Claim | Evidence |
|---|---|
| Hermit crab, monitor shell, independent editor overlay | `R/README.md:5–17`; `R/src/desktop/main.ts:61–88` |
| Starts as egg; shell-stage sequence | `R/src/state.ts:38–42`; `R/src/desktop/renderer/view-model.ts:29–40` |
| Seven-day Garmin input | `R/skills/fitpet-sync/SKILL.md:14–21,45–48`; `R/src/config.ts:56` |
| Orange/grey, slump, heartbeat, standby | `R/src/desktop/renderer/view-model.ts:68–102,140–147` |
| No decline just for forgetting sync | `R/src/vitality.ts:62–66,104–130`; `R/README.md:226–227` |
| Growth needs age and healthy days | `R/src/config.ts:38–47`; `R/src/vitality.ts:74–84,110–119` |
| Hooks and under-15-minute session gaps | `R/src/install.ts:29–37`; `R/src/local-activity/derive.ts:22–32,45–54` |
| Normal 60-minute nudge and intensity table | `R/src/config.ts:9–18`; `R/README.md:99–109` |
| Earnest touch-grass quotation | `R/src/content/quips.ts:35–38` |
| Earnest hero quotation | `R/src/content/quips.ts:15–18` |
| Claude test/error/edit reactions | `R/src/hooks/hooklib.ts:42–73`; `R/src/hooks/post-tool-use.ts:8–18`; `R/src/hooks/post-tool-use-failure.ts:9–13` |
| Cline events, no coding reactions/state ticking | `R/src/hooks/cline.ts:1–13`; `R/README.md:200–211` |
| Debt 0–100, rates, recovery caps, thresholds | `R/src/config.ts:20–28`; `R/src/screen-debt/score.ts:27–58` |
| Snooze presets and scope | `R/src/desktop/context-menu.ts:14–21`; `R/README.md:111–120` |
| Default data location | `R/src/state.ts:17–24` |
| Journal persists only time/kind | `R/src/local-activity/log.ts:21–40`; `R/README.md:76–77,200–205` |
| Cline always allows continuation | `R/src/hooks/cline.ts:7–13` |
| Canned speech, no model call for speech | `R/src/content/quips.ts:1–8`; `R/src/screen-debt/concern.ts:5–10` |
| Garmin passes through Claude session | `R/skills/fitpet-sync/SKILL.md:8–10,14–25,49–52` |
| Node requirement, version, MIT | `R/README.md:48–52`; `R/package.json:3,19–20,29`; `R/LICENSE` |
| Linux tests, not desktop support | `R/.github/workflows/ci.yml:10–20` |
| POSIX Cline installer | `R/src/install-cline.ts:65–79`; `R/README.md:193–198` |
| Cline live-validation gap | `R/README.md:210–212` |
| Physical click/drag gap | `R/docs/snooze-validation.md:46–51` |
| Hard-coded paths and reinstall overwrites copied skill | `R/skills/fitpet-sync/SKILL.md:36,40`; `R/README.md:177–184`; `R/src/install.ts:180–185` |
| Exact quick-start text | `R/README.md:57–64` |
| Backup, merge, preview, skill copy | `R/src/cli.ts:324–343`; `R/src/install.ts:154–185` |
| Uninstall ownership and retained state/skill | `R/src/install.ts:40–41,75–103`; `R/src/cli.ts:353–366` |
| `feed 60` hatches | `R/src/sources/manual.ts:10–19`; `R/src/config.ts:30–54,85–87`; `R/src/vitality.ts:47–66,106–130`; `R/test/engine.test.ts:24–36`; runtime AC8 pending |
| #14903 state | GET `repos/cline/cline/pulls/14903`: `state=open`, `merged=false`, `merged_at=null`, checked October 20, 2026; re-check M3 |
| Medium article | Exact supplied URL retained. Fresh fetch returned **403**, so independent content/title verification is **not complete**. Victor must verify the destination before publication. |
| Berkeley, triathlon, `/buddy`, Reddit feedback, tooling history, accounts, ambassador disclosure | Victor-provided copy; V8 author confirmation, not represented as source-code proof |
| No page requests/cookies/storage | Prospective implementation property; AC19–20 browser verification |
| GitHub server logs | Hosting-policy claim; verify official policy before publication |

**Every copy change from §5 and its reason**

1. CRT starting state → egg, then CRT: factual correction.
2. Hero workout/nudge sentence → qualified default hook-observed session and snooze: factual correction.
3. Claude reaction sentence split: proposed voice-rule correction, pending approval.
4. Cline timer-only sentence → activity events, no coding-event reactions: factual correction.
5. Threshold sentence adds “On the default setting”: gentle does not use the 35 band.
6. Snooze sentence names touch-grass/debt scope and ordinary reactions: factual correction.
7. Storage sentence adds “By default”: `FITPET_HOME` override.
8. No-network-source sentence → local scoring/storage: avoids overclaim.
9. “Growth needs…” → “Garmin sync needs…”: manual growth exists.
10. Backup sentence adds “existing” and merge behavior: factual qualification.
11. Uninstall sentence qualifies original-clone path matching and retained skill/state: factual qualification.
12. PR/article sentence split: proposed voice-rule correction, pending approval.
13. L1/L2/L4 variants: prescribed launch-gate substitutions, not discretionary voice edits.

**Banned words:** the supplied copy paragraphs produced zero matches in the research check. The amended deck must receive the authoritative boundary-aware Node check after creation. The source’s unused quip pools are not treated as published copy.

## 6. Asset capture

**Four complete P0 snapshots**

Each object below becomes its corresponding file under `W/tools/capture/fixtures/`. The fixed reference clock is `2026-10-20T12:00:00.000Z`, epoch `1792497600000`.

```json
{
  "hero": {
    "species": "sprout",
    "name": "Shelldon",
    "tier": "thriving",
    "stage": "adult",
    "vitality": 88,
    "rollingScore": 88,
    "lastSport": null,
    "lastActivityAt": null,
    "healthyDays": 21,
    "reaction": {
      "text": "All tests passing. Lovely work.",
      "event": "test_pass",
      "setAtMs": 1792497600000
    },
    "notifications": {
      "snoozed": false,
      "remainingMinutes": 0,
      "snoozedUntil": null
    },
    "screenDebt": {
      "score": 3,
      "severity": "NORMAL"
    },
    "coding": {
      "active": true,
      "currentCodingSessionMinutes": 42,
      "lastActivityAt": "2026-10-20T12:00:00.000Z"
    },
    "activityStatus": "ready"
  },
  "touch-grass": {
    "species": "sprout",
    "name": "Shelldon",
    "tier": "healthy",
    "stage": "adult",
    "vitality": 60,
    "rollingScore": 60,
    "lastSport": null,
    "lastActivityAt": null,
    "healthyDays": 21,
    "reaction": {
      "text": "You've been at this a while — go touch grass?",
      "event": "long_session",
      "setAtMs": 1792497600000
    },
    "notifications": {
      "snoozed": false,
      "remainingMinutes": 0,
      "snoozedUntil": null
    },
    "screenDebt": {
      "score": 8,
      "severity": "NORMAL"
    },
    "coding": {
      "active": true,
      "currentCodingSessionMinutes": 61,
      "lastActivityAt": "2026-10-20T12:00:00.000Z"
    },
    "activityStatus": "ready"
  },
  "debt": {
    "species": "sprout",
    "name": "Shelldon",
    "tier": "healthy",
    "stage": "adult",
    "vitality": 60,
    "rollingScore": 60,
    "lastSport": null,
    "lastActivityAt": null,
    "healthyDays": 21,
    "reaction": {
      "text": "I'm getting worried. A real break would help.",
      "event": "debt_degraded",
      "setAtMs": 1792497600000
    },
    "notifications": {
      "snoozed": false,
      "remainingMinutes": 0,
      "snoozedUntil": null
    },
    "screenDebt": {
      "score": 72,
      "severity": "DEGRADED"
    },
    "coding": {
      "active": true,
      "currentCodingSessionMinutes": 189,
      "lastActivityAt": "2026-10-20T12:00:00.000Z"
    },
    "activityStatus": "ready"
  },
  "snoozed": {
    "species": "sprout",
    "name": "Shelldon",
    "tier": "healthy",
    "stage": "adult",
    "vitality": 60,
    "rollingScore": 60,
    "lastSport": null,
    "lastActivityAt": null,
    "healthyDays": 21,
    "reaction": null,
    "notifications": {
      "snoozed": true,
      "remainingMinutes": 30,
      "snoozedUntil": "2026-10-20T12:30:00.000Z"
    },
    "screenDebt": {
      "score": 15,
      "severity": "NORMAL"
    },
    "coding": {
      "active": true,
      "currentCodingSessionMinutes": 75,
      "lastActivityAt": "2026-10-20T12:00:00.000Z"
    },
    "activityStatus": "ready"
  }
}
```

These mirror `R/src/desktop/renderer/renderer.ts:21–45`. `personality` is not a `Snap` field; earnest text is selected and validated before injection. The debt concern bubble is an explicit fixture choice using `R/src/screen-debt/concern.ts:8`.

**Debt derivation**

Assume continuous observations, an event at the reference time, zero earlier debt, and no recovery:

```text
D(m) = 0.25 × max(0, min(m, 60) − 30)
     + 0.50 × max(0, m − 60)
```

| Fixture | Calculation | Debt |
|---|---|---:|
| Hero, 42 min | `12 × 0.25` | 3 |
| Touch-grass, 61 min | `30 × 0.25 + 1 × 0.5` | 8 |
| Debt, 189 min | `30 × 0.25 + 129 × 0.5` | 72 |
| Snoozed, 75 min | `30 × 0.25 + 15 × 0.5` | 15 |

Rates and integration: `R/src/config.ts:16–28`; `R/src/screen-debt/score.ts:27–58`. Timer duration alone is insufficient without the observation assumption because charging includes at most one minute after the latest event.

P1 growth/tier/lost fixtures will explicitly use zero debt; vitality does not imply debt.

**Capture tooling**

- `capture.mjs` copies built renderer files into a temporary directory, injects the same-origin shim before the module, and serves only on `127.0.0.1`.
- The shim implements `getState` and `onState`; no CLI, pet state, or Claude settings access.
- Install the manual rAF queue before renderer initialization. Keep epoch time, `performance.now()`, and callback timestamps coherent.
- Warm up at least 300 ms; advance callbacks by at least 33.34 ms; capture 180 frames and encode at 30 fps.
- Assert snapshots loaded, labels/bubbles match, canvas is nonempty, and selected frames differ.
- Stills use `animations: "disabled"`; that settles CSS animation but does not drive canvas frames.
- Capture the actual 300×410 CSS viewport at DSF 2: 600×820 PNG/video frames. Canvas-only images retain the actual 256×256 source and display at 128/256/512 CSS px.
- Composite transparent renderer output onto `#06140b` in the temporary capture environment without changing app source.
- Close browser/server and delete temporary renderer/frame data in `finally`.

**Cached browser**

Existing Chromium and headless-shell revisions: `1208`, `1223`, `1234`, `1243`. Revision `1243` has executable files present; a local Playwright `1.63.0` manifest identifies Chromium `153.0.8010.12`, revision `1243`.

Use the matching cache. If launch fails or a browser is missing, stop and request explicit download approval—no automatic `playwright install`.

**Exact encoding commands**

The capture tool will allocate and print `CAPTURE_TMP`; the commands below run in that same shell after approval:

```bash
ffmpeg -framerate 30 -start_number 0 \
  -i "$CAPTURE_TMP/frames/hero-%04d.png" \
  -frames:v 180 \
  -c:v libx264 -preset slow \
  -b:v 250k -maxrate 300k -bufsize 500k \
  -pix_fmt yuv420p -an -map_metadata -1 \
  -movflags +faststart \
  /Users/victorchun/fitpet-site/site/assets/hero-loop.mp4
```

```bash
ffmpeg -i "$CAPTURE_TMP/hero-poster.png" \
  -frames:v 1 -map_metadata -1 \
  -c:v png -compression_level 9 \
  /Users/victorchun/fitpet-site/site/assets/hero-poster.png
```

Apply the same lossless PNG command to each still. For canvas-only integer scaling, use:

```bash
ffmpeg -i "$CAPTURE_TMP/canvas.png" \
  -vf scale=512:512:flags=neighbor \
  -frames:v 1 -map_metadata -1 \
  /Users/victorchun/fitpet-site/site/assets/canvas-512.png
```

No post-upscaling of DOM-text captures. Measure actual encoded sizes; bitrate is not a size guarantee.

**Outputs and budgets**

- Poster and three stills: 600×820, target ≤55,000 bytes each.
- OG: 1280×640, ≤80,000 bytes, central content approximately 1150×600.
- Favicon: 32×32; Apple icon: 180×180 on `#06140b`.
- Optional MP4: 600×820, six seconds, ≤250,000 bytes.
- Main JS ≤3,000 bytes.
- First load ≤150,000 bytes; whole published page ≤800,000 bytes; every image ≤80,000 bytes.
- Strip metadata and inspect favicon crop rather than inventing a shell rectangle.

The hero test flash lasts 1,500 ms. A fresh flash can make the loop join visible; inspect by eye and omit P0.5 if needed.

**Theme provenance and contrast**

All requested hexes exist in renderer sources. Palette entries come from `R/src/desktop/renderer/sprites/shelldon/palette.ts:6–14`; muted labels from `R/src/desktop/renderer/index.html:88,100`; panel from `R/src/desktop/renderer/screen.ts:17`; phosphor/focus from `R/src/desktop/renderer/view-model.ts:102`.

| Pair | Ratio |
|---|---:|
| Dark text/background | 14.53:1 |
| Dark muted/background | 12.00:1 |
| Dark accent/background; dark button text/background | 6.76:1 |
| Dark focus/page background | 12.46:1 |
| Light text/background | 15.08:1 |
| Light muted/background | 11.22:1 |
| Light accent/background | 3.55:1 — not normal text |
| Light button `#06140b` text / `#cc5f27` | 4.70:1 |
| Forbidden `#c9bda0` / light background | 1.65:1 |
| Dark focus directly against orange button | 1.84:1 — insufficient |
| Light focus directly against dark panel | 1.11:1 — insufficient |

Use a 3px outline with an offset so it borders the page background; do not place focusable controls inside dark media frames without a contrasting local focus treatment. The frame border is decorative, not an essential control boundary.

`browser-check.mjs` will verify local resources, storage/cookies, themes, widths, JS-disabled behavior, motion, keyboard controls, and screenshots. It must never follow external anchors.

## 7. Verification

**Checker implementation**

Use Node builtins only. Controlled conventions include quoted attributes, explicit local paths, identifiable quick-start/quip markup, and no unrecognized resource-bearing syntax silently accepted.

- Import exactly:

```js
import { quipsFor } from "../src/content/quips.ts";
```

- Gather earnest quips through that export for the supported event list; validate event-list coverage against source structure so additions do not silently escape checks.
- Parse earnest concern strings from `W/src/screen-debt/concern.ts` with a bounded regex and fail closed unless exactly four are found.
- Quoted pet lines use identifiable `<q>` markup; decode HTML entities before exact membership comparison.
- Sizes use bytes with decimal KB.
- Reject symlinks and regular files with `nlink > 1` anywhere under published `site/`.
- Resolve URL paths case-exactly by enumerating directory entries; reject traversal and escapes.
- Treat absolute canonical/OG/Twitter metadata separately from fetched resources.

**Rule-specific self-checks**

The self-check builds disposable fixtures outside the repo, never edits source, and asserts the expected diagnostic code—not merely a nonzero exit.

| Code | Rule | Negative fixture |
|---|---|---|
| R01 | Required files, lowercase names, no symlinks/hard links | Remove index; add uppercase asset; separately add symlink and hard link |
| R02 | No root-relative local paths in index/CSS/JS | Insert `/assets/x.png` |
| R03 | Every local reference resolves case-exactly within site | Wrong-case filename, missing poster/srcset member, traversal |
| R04 | No cross-origin resource requests | External image/script/CSS URL; an external plain anchor remains a positive case |
| R05 | Metadata prefix and 404 local URLs | Wrong OG prefix; relative 404 stylesheet; external 404 GitHub anchor remains valid |
| R06 | Boundary-aware banned words | Mixed-case banned phrase; allowed substring/control case |
| R07 | Decimal budgets | Exceed each relevant size limit by one byte |
| R08 | Exact README quick-start comparison | Change a comment, spacing, or non-clone command |
| R09 | Earnest quip membership, concern parser fails closed | Invented quote; real sarcastic quote; concern input with three/five matches |
| R10 | No test-discoverable JS/TS names | Add representative `*.test.mjs`, `test-*.js`, or file beneath a `test/` directory |

Parser tests use synthetic strings for concern-count failures; they do not alter `src/`.

**Exact verification commands and expected results**

Run from `W` unless an absolute path is shown.

| AC | Commands/check | Expected |
|---|---|---|
| AC1 | `git -C /Users/victorchun/fitpet-site diff --name-only origin/main...feat/landing-page` | Only allowlisted paths; also inspect uncommitted changes before final commit |
| AC2 | `npm run typecheck`, sandboxed `npm test`, `npm run build`, `npm run app:build` | Pass; test count matches recorded unchanged baseline |
| AC3, 6, 7, 9, 17 | Commands below | Self-check detects each intended failure; real checker passes |
| AC4 | Repeat protected clone branch/HEAD/porcelain commands | All three unchanged from Phase 2 start |
| AC5, 10–12 | Review full deck against section 5 and gate decisions | Required copy/claims present; prohibited claims absent |
| AC8 | Isolated command below | Hatchling; otherwise stop and correct claim |
| AC13–15 | Capture assertions, image inspection, metadata/byte checks | Fixtures only, correct quips/dimensions/budgets |
| AC16, 19–20 | Browser command below plus manual review | Motion, privacy, responsiveness and accessibility gates pass |
| AC18 | `actionlint /Users/victorchun/fitpet-site/.github/workflows/pages.yml` | No diagnostics; tool is already installed |
| AC21–22 | Live commands/manual previews after Victor merges | Correct live responses and rendered card |
| AC23 | Full command log and final diff review | No preapproval project writes; only permitted GitHub writes in Phase 2 |

Static commands:

```bash
node /Users/victorchun/fitpet-site/tools/check-site-selfcheck.mjs
node /Users/victorchun/fitpet-site/tools/check-site.mjs \
  /Users/victorchun/fitpet-site/site
```

Final unchanged suite, using your approved sandbox:

```bash
(
  cd /Users/victorchun/fitpet-site
  T="$(mktemp -d)"
  trap 'rm -rf "$T"' EXIT
  HOME="$T" FITPET_HOME="$T/.fitpet" npm test
)
```

AC8 uses the PRD’s operations in one disposable-home shell, with failure cleanup:

```bash
(
  cd /Users/victorchun/fitpet-site
  export FITPET_HOME="$(mktemp -d)"
  trap 'rm -rf "$FITPET_HOME"; unset FITPET_HOME' EXIT

  node /Users/victorchun/fitpet-site/src/cli.ts reset --name Shelldon &&
  node /Users/victorchun/fitpet-site/src/cli.ts feed 60 &&
  node /Users/victorchun/fitpet-site/src/cli.ts status
)
```

Source expectation: `30 + 0.34 × (100 − 30) = 53.8`, healthy, one healthy day, hatchling. A subsequent status tick can increase vitality further; the stage is the acceptance result.

Renderer freshness:

```bash
grep -c 'id="snooze-label"' \
  /Users/victorchun/fitpet-site/out/renderer/index.html
```

Expected ≥1.

Capture interface to implement:

```bash
node /Users/victorchun/fitpet-site/tools/capture/capture.mjs \
  --output /Users/victorchun/fitpet-site/site/assets
```

Preview and browser checks, after approval, in separate terminals:

```bash
SCRATCH="$(mktemp -d)"
mkdir -p "$SCRATCH/preview"
ln -s /Users/victorchun/fitpet-site/site "$SCRATCH/preview/fitpet"

python3 -m http.server \
  --bind 127.0.0.1 \
  --directory "$SCRATCH/preview" 8000
```

```bash
node /Users/victorchun/fitpet-site/tools/capture/browser-check.mjs \
  --base-url http://localhost:8000/fitpet/ \
  --output-dir "$SCRATCH/screenshots"
```

Pass the same printed absolute scratch path to the second terminal. Stop the server afterward; retain review screenshots until the PR is reviewed.

Browser checks:

- Fail non-localhost resource requests, unexpected 4xx, CSP failures, and page errors.
- Empty cookies/localStorage/sessionStorage.
- Poster-only reduced-motion behavior; no autoplay attribute.
- Keyboard Pause/Play and media-query changes.
- JS-disabled copy and native video controls.
- Overflow checks at 320/360 CSS px.
- Desktop and 360px screenshots in light/dark.
- Correct landmarks/headings, image descriptions/dimensions, lazy loading.
- Styled `/fitpet/404.html`.
- Manual keyboard, focus, 200% zoom, loop seam, and flashing review.
- Count actual first-load requests; optional video uses `preload="none"`.

Post-merge:

```bash
curl -sI https://victory-c.github.io/fitpet/
curl -sI https://victory-c.github.io/fitpet
curl -sI https://victory-c.github.io/fitpet/does/not/exist
```

Expected 200, 301, 404; inspect nested 404 styling separately.

Commit M1, M2, M3 separately. Only after AC1–AC20 and the protected-clone check pass:

```bash
git -C /Users/victorchun/fitpet-site push -u origin feat/landing-page

cd /Users/victorchun/fitpet-site
gh pr create \
  --title "Add GitHub Pages landing page" \
  --body-file "$SCRATCH/pr-body.md"
```

The PR body includes results, full command log, screenshots, pending live checks, and V4–V7. **Do not merge.**

## 8. Victor’s manual steps

| Step | Action |
|---|---|
| V1 | Review this complete plan, obtain second review, explicitly approve implementation. |
| V1b | Keep auto-approve off; open `W` in a new VS Code window and start a fresh task with the approved plan. |
| V2 / L2 | In the worktree, personally test physical right-click menu choices, Unsnooze, intensity, and drag strip with an exported disposable `FITPET_HOME`. Otherwise retain CLI-only copy. |
| V2b / L4 | Personally install/test Cline hooks in a throwaway workspace using a disposable shared pet home; enable Hooks, run a short task, verify timer movement. Otherwise retain experimental wording. |
| V3 / L1 | By October 27, approve the separate portability PR or retain the caveat. Reinspect merged fixes before removing it. |
| V4 / L3 | **Before merge**, set Pages source to GitHub Actions and inspect Pages/environment policies. |
| V5 | Merge personally; watch deployment; dispatch on main if necessary after enabling Pages. |
| V6 | After deployment, update About homepage/description/topics. |
| V7 | Upload `site/assets/og-v1.png` as repository social preview. |
| V8 | Read copy aloud; confirm personal history, `/buddy`, first-version attribution, disclosures, proposed sentence splits, and Medium destination. |
| V9 | Optional real-window image over a clean demo with disposable state. Not needed for fixture-only P0. |
| V10 | Optional main ruleset requiring PRs. |
| V11 | Separate portability follow-up: website link, clone URL, Cline/skill paths, README visual replacement. |

**Isolation clarification for V2/V2b:** `FITPET_HOME` does not redirect Claude settings or Cline workspace destinations. Victor’s explicit workspace installation is manual and confined to the throwaway folder. Ensure each participating process/terminal inherits the intended disposable pet home.

I will not perform settings changes, manual hook installation, merge, About editing, or social-preview upload.

## 9. Open questions

| Question | Recommended default |
|---|---|
| Q1 checkout pin | Verified v7.0.1 as shown; existing CI unchanged. |
| Q3 nested 404 | Verify live in AC21; do not assume the local Python server proves Pages behavior. |
| Q4 portability | Separate PR; caveat until verified merged. |
| Q6 disclosure | Keep in “How I built it” and footer. |
| Q7 `/buddy` | Keep supplied sentence, subject to V8. |
| Q8 first versions built with Claude Code | Keep, subject to V8. |
| Q10 Reddit commenter | Paraphrase, no direct quotation or new attribution. |
| Q11 browser | Playwright 1.63.0 with cached revision 1243; any browser download needs separate explicit approval. |
| Q13 theme | Both themes. Dark-only only after an explicit cut decision. |
| Q16 Garmin server | Generic “registered as `garmin`” until Victor confirms linking `victory-c/garmin_mcp`. |
| Voice corrections | Approve the two sentence splits shown in section 5; no broader rewriting. |
| Word-count target | Preserve complete supplied substance. Victor directs any reduction to 800–900 words. |
| Medium evidence | Fresh read returned 403. Victor confirms the exact link/content before launch; do not claim independent verification. |
| Hosting-log sentence | Verify official GitHub policy before publication; if not supportable, return wording to Victor. |
| Optional hero loop | Ship only after seam/flash/size review; poster is the safe fallback. |

The previously open installer-test, AC4, workflow-filter, self-check, link-safety, and Node-checker decisions are resolved by your message and are not being reopened.

## 10. Risky commands

**Already performed in Phase 1**

- `git -C /Users/victorchun/fitpet fetch origin`: network; updates Git refs/object metadata, not working-tree files.
- `git ls-remote` against official action repositories: network reads only.
- `gh api --method GET` for repository metadata, Pages, user-site repository, releases, tags, traffic, PRs, checks, environment, and CI logs: network reads only.
- Read-only npm registry and Medium URL fetches: no installation; registry returned 404, fresh Medium fetch returned 403.
- No app, CLI, test, build, installer, browser launch, push, or PR creation.

**After approval: every planned network/download operation**

| Command or operation | Risk / boundary |
|---|---|
| `git fetch origin` | GitHub network access; shared repository refs/object metadata changes. Never merge or move the live branch. |
| All repeated `git ls-remote` pin checks | GitHub network reads. |
| All `gh api --method GET ...` rechecks | GitHub network reads, including M3 #14903, main checks, Pages, environment and traffic if requested. |
| Root `npm ci` | Registry downloads, root `node_modules` replacement, npm cache/log writes outside the worktree; lifecycle scripts may download the **Electron binary** and update its cache. |
| Capture `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 npm install --save-exact playwright@1.63.0` | Registry download and npm cache/log writes; creates only capture package metadata/lock/dependencies inside allowlisted tooling. Browser download deliberately disabled. |
| Capture `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 npm ci` | Registry/cache access and capture dependency installation; browser download disabled. |
| Any Playwright browser installer | **Not authorized by this plan automatically.** If needed, ask first. Candidate command only after separate approval: `node /Users/victorchun/fitpet-site/tools/capture/node_modules/playwright/cli.js install chromium`. Downloads into the browser cache outside the worktree. |
| Capture HTTP server and Playwright | Loopback requests only; browser process/profile/temp writes. Reject external resources. |
| Python preview server and browser checks | Loopback requests only; bind server to `127.0.0.1`; screenshots/profile/temp writes outside repo. |
| Post-merge `curl -sI` checks | Public-site network reads. |
| Victor’s social preview inspectors | External services fetch the public page; manual step. |
| `git push -u origin feat/landing-page` | Authorized Phase 2 GitHub write only after gates; publishes the feature branch. |
| `gh pr create` | Authorized Phase 2 GitHub write; creates PR, never merges. |
| Pages workflow after push/merge | Runner downloads pinned actions and Node 24; non-PR run uploads artifact; main deployment writes Pages using least-privilege token. |

**Other writes outside the worktree**

- `git worktree add`: creates `W` and shared Git worktree/branch metadata under the original repository’s Git directory. Does not change its checked-out branch, HEAD, or working tree.
- `git add`/`git commit`: shared Git object/ref metadata; restricted to the landing-page branch and allowlisted files.
- Sandboxed `npm test`: creates disposable `HOME`, pet state, and test workspaces. Existing installer tests are allowed only through this unchanged suite.
- AC8: creates and deletes disposable pet state; directly runs only reset/feed/status.
- Capture/self-check/browser tools: temporary fixture trees, frames, browser profiles, and screenshots outside the repo.
- Preview setup: temporary directory and symlink **outside** published `site/`.
- `ffmpeg`: reads temporary captures and writes approved assets; no network input.
- Cleanup commands: delete only paths allocated by the current task. Never use broad cleanup against the live clone or private home directories.
- Command log and PR body: scratch files outside the repo, created only in Phase 2.

**Always forbidden to me:** direct `install`, `uninstall`, `cline-install`, `cline-uninstall`, or `doctor`; real pet/Claude-state access; live-clone checkout/fast-forward/reset/stash/clean; repo-settings writes; merge; browser downloads without separate approval.

**Stopped at Phase 1. No implementation has begun. Awaiting your explicit approval of this complete plan.**
