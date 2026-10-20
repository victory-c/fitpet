# PRD: FitPet landing page on GitHub Pages

**Status:** v2 (reviewed), for Cline Plan mode · **Owner:** Victor Chun (@victory-c) · **Written:** 2026-10-20 · **Target launch:** Fri 2026-10-30 (hard stop Sat 10-31; next ambassador posts due Sun 11-01)

## 0. Verified state (read before planning)

Checked read-only on 2026-10-20 with git and `gh api` GET calls. If anything here has changed by the time you read it, say so in your plan.

| Fact | Value | Impact |
|---|---|---|
| `origin/main` | `88e8b82` "Add snooze and configurable nudge intensity (#3)", merged 2026-10-20, CI green | Snooze, nag intensity, the right-click menu, the drag strip and the snooze badge are shipped. Branch from current `origin/main`. |
| Local clone `/Users/victorchun/fitpet` | On `feat/snooze-and-intensity`, clean tree. Victor's live Claude Code hooks run from this tree. | **Never switch branches or touch the working tree here.** Use a separate worktree (§13). |
| GitHub Pages | Off (`GET /pages` → 404). No `victory-c.github.io` repo. Homepage empty. | Site URL will be `https://victory-c.github.io/fitpet/` (project site, base path `/fitpet/`). |
| Repo metadata | Description says "A Claude Code status-line companion…"; topics include `status-line`. Both stale. | Victor fixes after launch (§11). |
| Distribution | 0 releases, 0 tags, not on npm, version 0.1.0 | No download button. Install from source only. |
| Hard-coded paths | `skills/fitpet-sync/SKILL.md:36,40` and README Cline commands (`README.md:177-184`) use `/Users/victorchun/fitpet`. `README.md:57` is `git clone <this repo>`. | Garmin sync and the README Cline commands break for anyone else. Launch gate L1. |
| Hand-testing gaps | `docs/snooze-validation.md`: nobody physically clicked the right-click menu or dragged the drag strip. FitPet's Cline hooks have never run against a live Cline install. | Launch gates L2 and L4. |
| Default personality | `reset --name Shelldon` gives the default species (sprout), whose personality is **earnest** (`src/content/species.ts:22`) | Every quoted quip and every fixture uses the earnest pool. |
| Traffic baseline 10-06 → 10-19 | 11 views, 7 unique visitors, 1 reddit.com referral, 0 stars | §4 |

## 1. Summary

A one-page static site at `https://victory-c.github.io/fitpet/` that explains FitPet in under a minute: Shelldon, a pixel hermit crab whose shell is a computer monitor, grows from Garmin training load, nudges you to take a break during long Claude Code or Cline sessions, and keeps a 0–100 screen debt score. Plain HTML/CSS/JS in a new `site/` folder, deployed by a separate SHA-pinned GitHub Actions workflow. No build step, no third-party requests, no change to app code. Every visual is real renderer output captured from fixture data, never from Victor's real pet. Every claim traces to `origin/main` or the README.

## 2. Goals and non-goals

**Goals**
- **G1.** Live by Fri 2026-10-30 so the Nov 1 posts can link to it.
- **G2.** In 5 seconds a visitor knows what it is, that it installs from source, and whether it works with their agent.
- **G3.** Every number, quip and capability traces to a `file:line` on `origin/main`.
- **G4.** Visuals are real renderer output only. `docs/window.svg` is not used (it shows a quip that doesn't exist and a stale label).
- **G5.** Copy reads like Victor wrote it: short, specific, first person (§5 voice rules).
- **G6.** Link previews work on X, Reddit and LinkedIn (PNG `og:image`).
- **G7.** Isolation: CI, `npm test`, `npm run typecheck`, `npm run build` and `npm run app:build` behave exactly as on `main`.

**Non-goals**
- No changes under `src/`, `test/`, `docs/`, `skills/`, or to `README.md`, `package.json`, `package-lock.json`, `.github/workflows/ci.yml`. Portability fixes are a separate PR (Q4).
- No analytics, trackers, pixels, shields.io badges, embeds, CDNs or hosted web fonts.
- No backend, forms, email capture, accounts, cookies or browser storage.
- No medical, health-outcome or "real screen time" claims.
- Nothing implying a packaged app: no download button, installer, `npx`/`npm i -g` one-liner, auto-update, or Windows/Linux/"cross-platform" claims.
- No Anthropic, Cline or Garmin logos or trade dress; nothing implying endorsement.
- No testimonials, user counts or star counts.
- No live in-browser demo in v1 (future P1, separate PRD).
- No custom domain, blog, multi-page docs or i18n.
- Cline makes no repo-settings changes and no GitHub write API calls (§11).

## 3. Audience and value prop

| Rank | Audience | What they need to see |
|---|---|---|
| 1 | Developers who run long Claude Code (or Cline) sessions | It notices long sessions, you choose how pushy it is, data stays local |
| 2 | Developer-athletes with a Garmin | Training makes him grow; needs a Garmin MCP server in Claude Code |
| 3 | Cline users (ambassador audience) | The honest version: timer, nudge and debt only, no reactions, experimental |
| 4 | Open-source tinkerers | Repo link, MIT, pixel art stored as text grids, "open an issue" |
| — | Garmin athletes who don't code with agents | Not targeted until there's a packaged app |

**Value prop:** A desktop pet that grows when you work out and tells you to touch grass when you code too long.

## 4. Success metrics

Pages has no analytics and repo traffic doesn't count Pages hits, so the page is measured by what it sends to the repo.

| Metric | Baseline | Target | How |
|---|---|---|---|
| `victory-c.github.io` in repo referrers | none | listed within 7 days of launch | `gh api repos/victory-c/fitpet/traffic/popular/referrers` |
| Repo unique visitors / 14 days | 7 | ≥50 by 11-15 | `gh api repos/victory-c/fitpet/traffic/views` |
| Stars | 0 | ≥10 by 11-15 | stargazers API |
| Issues from other accounts | 0 | ≥2 by 11-29 | issues API |
| Link card on the 11-01 post | — | image + title render on X and Reddit | manual |

- Keep the browser's default referrer policy. Never add `no-referrer` meta or `rel="noreferrer"` on repo links, or the main metric disappears.
- GitHub keeps 14 days of traffic. Victor snapshots it weekly outside the repo (optional).

## 5. Information architecture and copy

One page, sections in this order, about 800–900 visible words. Link to README anchors for mechanics instead of copying them. `[L1]`, `[L2]`, `[L4]` mark text that depends on a launch gate (§12).

| # | Section | Purpose |
|---|---|---|
| 1 | Hero | What it is, who it's for, primary "View on GitHub" button, "Quick start" anchor, status line |
| 2 | What he does | Three short prose blocks with one real capture each |
| 3 | Why I made it | 3–4 first-person sentences |
| 4 | The nagging part | Reddit feedback → snooze and intensity; the three levels |
| 5 | How the score works | `<details>`, collapsed by default |
| 6 | What it stores | Local data, event kinds + timestamps, the Garmin caveat, "this page has no analytics" |
| 7 | Before you clone it | Limits plus a Claude Code vs Cline compatibility table |
| 8 | Try it (`id="quick-start"`) | The README quick start with the real URL |
| 9 | How I built it | Natural "built with Cline" mention + disclosure |
| 10 | Follow along | X, Medium, "open an issue" |
| 11 | Footer | MIT, author, endorsement line, disclosure |

### Copy deck (near-final)

Cline may change this copy only to fix facts, and must list every change with its reason. Voice edits go back to Victor.

**1 · Hero**
> # I built a desktop pet that grows when I work out and tells me to touch grass when I code too long.
> Shelldon is a pixel hermit crab with a computer monitor for a shell. It starts as a chunky CRT and upgrades as he grows. He sits in a small window on top of my editor. My Garmin workouts make him grow, and if I've been coding with Claude Code or Cline for an hour straight, he tells me to go outside.
>
> **[View on GitHub]** [Quick start]
> `v0.1 · install from source · window only tried on macOS · Node 23.6+ · MIT`

**2 · What he does**
> ### He runs on your training
> FitPet reads your Garmin training load for the last 7 days. When you've been training he's bright orange and the heartbeat on his screen runs fast. If a sync shows a quiet week he goes grey and slumps, and if it stays quiet his screen goes to standby. Keep it up and his shell upgrades: egg, chunky mono CRT, colour monitor, flat panel.
>
> ### He notices long sessions
> Hooks from Claude Code and Cline tell him when you're working. Gaps under 15 minutes count as one session. At 60 minutes (by default) he says something like "You've been at this a while — go touch grass?" In Claude Code he also reacts when tests pass or fail, with a speech bubble and a green or red flash on his screen, and now and then to an edit. From Cline he only gets the session timer, so you get the nudge and the score but no reactions.
>
> ### He keeps score
> Screen debt runs from 0 to 100. Long sessions push it up. Breaks, workouts and outdoor time you log yourself pay it down. He brings it up at 35, 60 and 80.

**3 · Why I made it**
> I'm a student at Berkeley and I do triathlon. Most of my coding happens with an agent running next to me now, and it's easy to look up and realize it's been three hours. Claude Code used to have a little /buddy pet. I missed it, so I made my own and gave it a reason to care whether I'd been outside.

**4 · The nagging part**
> When I posted this on r/SideProject, someone said that by the third touch grass reminder they'd be looking for a mute button. Fair. `[L2]` Now you can right-click Shelldon and snooze him for 30 minutes, an hour, or until tomorrow. You can also do it from the terminal with `node src/cli.ts snooze 30`, and pick how pushy he is with `node src/cli.ts nag gentle`.
>
> | Setting | First nudge | Repeats | Debt bubbles at |
> |---|---|---|---|
> | Gentle | 90 min | never | 60, 80 |
> | Normal (default) | 60 min | never | 35, 60, 80 |
> | Persistent | 45 min | every 30 min | 35, 60, 80 |
>
> Snoozing hides the reminders. The debt keeps counting.

L2 fallback (right-click not hand-checked): drop the right-click sentence and open with "You can snooze him from the terminal…".

**5 · How the score works** (`<details><summary>How the score works</summary>`)
> The first 30 minutes of a session are free. After that it's a quarter point a minute, then half a point a minute once you pass an hour, so about two straight hours gets you to 35. Once you've been away 15 minutes you earn back half a point a minute, up to 15 per break. A Garmin workout, or outdoor time you log with `node src/cli.ts outdoor 20`, pays back a point a minute, up to 40. I picked these numbers. They aren't medical advice, and they're all in `src/config.ts` if you want different ones. The score comes from hook events, not real screen time. [More in the README →](https://github.com/victory-c/fitpet#screen-debt-and-recovery)

**6 · What it stores**
> FitPet's data lives in `~/.fitpet` on your computer, and there's no network code in its source. When a hook fires, FitPet writes down what kind of event it was and the time. Not your prompts, file paths, commands or output. The Cline hook only listens and always tells Cline to keep going. The speech bubbles are canned lines, with no model calls.
>
> The one catch is Garmin. Sync runs as a Claude Code skill that calls a Garmin MCP server, so your recent activities pass through that Claude session on the way in. After that the math is local.
>
> This page has no analytics and no cookies. GitHub, which hosts it, keeps its own server logs.

**7 · Before you clone it**
> It's v0.1 and still rough. There's nothing to download yet: you clone the repo and run it with npm, and you need Node 23.6 or newer. I've only run the window on my Mac. The tests run on Linux in CI, but I haven't tried the app there or on Windows, and the Cline hook installer needs a POSIX shell. Growth needs a Garmin and a Garmin MCP server registered as `garmin` in Claude Code `[Q16: name/link the server]`. Screen debt comes from hook events, so it misses coding you do without an agent and counts an agent that keeps going after you walk away.
>
> `[L1 fallback only]` Heads up: `/fitpet-sync` and the Cline commands in the README still have my own path baked in. Until I fix it, swap `/Users/victorchun/fitpet` for wherever you cloned it, in `~/.claude/skills/fitpet-sync/SKILL.md` (again after you re-run `install`) and in the commands.
>
> | | Claude Code | Cline (VS Code or CLI) |
> |---|---|---|
> | Session timer, touch-grass nudge, screen debt | Yes | Yes `[L4: "experimental, not tested on a live install yet" until L4 passes]` |
> | Speech bubbles for tests, errors, some edits | Yes | No |
> | Garmin sync (`/fitpet-sync`) | Yes | No, it's a Claude Code skill |
> | Ages and grows between syncs | Yes, through hooks | No |
> | Setup | `node src/cli.ts install` | `cline-install` once per project folder (and turn on Hooks in Cline's settings in VS Code), see the README |

**8 · Try it**

The code block must equal the fenced block under `## Quick start` in `README.md` on `origin/main` (lines 57–64), except the clone URL. `check-site.sh` enforces this (§8).
```bash
git clone https://github.com/victory-c/fitpet.git ~/fitpet && cd ~/fitpet
npm install                              # deps + the Electron binary

node src/cli.ts reset --name Shelldon    # start a fresh egg
npm run app:dev                          # open the companion window

node src/cli.ts install                  # add the coding-event hooks to ~/.claude/settings.json
# → restart Claude Code so the hooks load
```
> `npm run app:dev` keeps running, so do the `install` step in a second terminal.
> `install` backs up your `settings.json` first and copies the `/fitpet-sync` skill into `~/.claude/skills`. Preview it with `node src/cli.ts install --print`. `node src/cli.ts uninstall` removes the hooks; delete `~/.claude/skills/fitpet-sync` yourself if you want that gone too.
> No Garmin? `node src/cli.ts feed 60` hand-feeds a fake 60-minute workout, which is enough to hatch the egg. `[verify, AC8]`
> Using Cline? [The README has the `cline-install` steps.](https://github.com/victory-c/fitpet#cline-activity-opt-in-project-local)

**9 · How I built it**
> I built most of the recent version with Cline, this page included. The first versions were built with Claude Code. Now I write a short spec, Cline plans it in Plan mode, I read the plan and push back, then it writes the code. Along the way I found a crash in Cline's CLI model picker and sent a fix ([cline/cline#14903](https://github.com/cline/cline/pull/14903), still in review), and [wrote about switching](https://medium.com/@victorchun_61700/one-week-in-what-it-was-like-switching-to-cline-from-claude-code-and-codex-9594b7c01d9a). I'm a Cline Campus Ambassador.

Re-check #14903 with `gh api` at M3. Only if it has merged, change to "fixed a crash … (cline/cline#14903)".

**10 · Follow along**
> I post about it as it changes, on [X (@VCbutVictor)](https://x.com/VCbutVictor) and [Medium](same URL as above). If he nags too much, or not enough, [open an issue](https://github.com/victory-c/fitpet/issues/new) and tell me which.

**11 · Footer**
> MIT · Made by Victor Chun · [Source](https://github.com/victory-c/fitpet) · FitPet isn't an official Anthropic, Cline or Garmin project, and none of them endorse it. I'm a Cline Campus Ambassador.

**404 page**
> Shelldon wandered off. This page doesn't exist. [Back to FitPet](/fitpet/) · [GitHub](https://github.com/victory-c/fitpet)

**Voice rules** (checked by `tools/check-site.sh` plus review)
- Banned words (case-insensitive): revolutionary, seamless, unleash, supercharge, elevate, effortless, game-changer, empower, journey, delve, cutting-edge, boost, harness, unlock, next-level, "level up", "say goodbye to", "whether you're", "dive in", "in short".
- No sentence over 30 words. No closing summary lines, no emoji, no bold-label bullets, no runs of three adjectives. No paragraph opens with a question except the "No Garmin?" and "Using Cline?" lines.
- Every quoted line appears verbatim in `src/content/quips.ts` or `src/screen-debt/concern.ts`, **from the earnest pool**.

## 6. Visual design

Tokens on `:root`; theme follows `prefers-color-scheme` (no toggle, since a toggle needs storage). Values come from the real renderer (`src/desktop/renderer/sprites/shelldon/palette.ts`, `screen.ts`, `index.html`). Cline verifies each hex and contrast ratio in its plan.

| Token | Dark | Light | Notes |
|---|---|---|---|
| `--bg` | `#0a160d` | `#f4f1e8` | |
| `--text` | `#ece3d0` | `#241a14` | |
| `--muted` | `#c9d1d9` | `#32323c` | |
| `--accent` | `#ef7d3a` | `#cc5f27` | Light mode is 3.55:1: large text and non-text only; light-mode links use `--text` + underline |
| `--button-bg` / `--button-text` | `#ef7d3a` / `#0a160d` | `#cc5f27` / `#06140b` | Check ≥4.5:1 both themes, or use an outlined button in `--text` |
| `--panel` (media frames, both themes) | `#06140b` | `#06140b` | Frame: 2px `#32323c` border, 12px radius |
| `--focus` | `#54f07a` | `#241a14` | ≥3:1 against neighbours |

- Media frames stay dark in both themes (the app's labels were designed for dark backdrops).
- Never use `#c9bda0` for text (1.65:1 on light).

**Typography.** No web fonts. Headings, status line and code: `ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`. Body: `system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`, 17px, 1.6 line height, max 65ch. H1 `clamp(1.75rem, 5vw, 2.75rem)`.

**Pixel art.** The renderer's 256px canvas is the true source: sprite blocks are 4px, but legs, shadow and the heartbeat trace are drawn at canvas resolution. Display canvas captures at 128, 256 or 512 CSS px with `image-rendering: pixelated` (avoid 192/384). Shots that include DOM text (bubble, labels) are captured with Playwright `deviceScaleFactor: 2`, not upscaled. No CSS filters, smoothing or drop shadows on sprites.

**Motion.** The hero loop is a whole number of seconds (target 6.0 s) so the 1 Hz status blink lines up; check the seam by eye. At most one screen flash per loop, never more than 3 flashes per second (WCAG 2.3.1). `<video muted loop playsinline poster=…>` has **no `autoplay` attribute**: `main.js` calls `play()` only when `prefers-reduced-motion: no-preference` matches, and there's a visible, keyboard-operable Pause/Play button (WCAG 2.2.2). Without JS, the poster shows with native controls. CSS transitions ≤200ms, off under `prefers-reduced-motion: reduce`. No parallax or scroll effects.

## 7. Hero media and capture

| Option | Decision |
|---|---|
| **A. Captured assets.** Playwright drives the built renderer (`out/renderer` from `origin/main`) with a small same-origin shim that feeds fixture snapshots, then exports PNGs and an MP4. | **v1** |
| B. Live in-browser demo | Future P1, separate PRD |
| C. Real Electron window over an editor, taken by Victor | Optional extra (V9) |
| `docs/window.svg` | Not used |

### Asset tiers (cut line)

- **P0 (must ship):** hero poster, 3 stills (touch-grass, debt, snoozed), OG image, favicons.
- **P0.5:** hero loop, MP4 (H.264) only.
- **P1 (only if time):** growth strip, tier strip, ride still, 404 "lost" still, README GIF. No WebM.
- **Cut rule:** if M2 isn't done by end of Tue 10-27, ship the text page plus whatever P0 stills exist, with the poster as the hero.

### Capture procedure

1. In the worktree, `npm ci && npm run app:build` (writes gitignored `out/renderer/`). Confirm it's current with `grep -c 'id="snooze-label"' out/renderer/index.html` ≥ 1.
2. `tools/capture/` has its own `package.json`/lockfile pinning `playwright` only. Report which Chromium is already cached in `~/Library/Caches/ms-playwright`; any browser download needs Victor's OK (Q11).
3. `capture.mjs` copies `out/renderer` to a temp dir, injects `<script src="./shim.js"></script>` in `<head>` before the module script (same-origin, because the renderer CSP is `script-src 'self'`), serves it on `127.0.0.1` with `node:http`, and launches headless Chromium with a fixed fake clock.
4. **Frame stepping.** `shim.js` replaces `requestAnimationFrame` with a manual queue. `capture.mjs` advances the fake clock and calls the queued callback so each step lands ≥ 33.34ms after the last draw (the renderer draws only when `tMs - lastDraw >= 33.33`). Warm up ≥300ms before frame 0. Confirm consecutive frames differ before encoding. Stills use `animations: 'disabled'`.
5. **Shim rules.** `window.fitpet = { getState, onState }`; snapshots mirror the `Snap` interface in `src/desktop/renderer/renderer.ts` on `origin/main`. `tier` must match `vitality` (75/45/15). Times are relative to the fake clock. `name` is always "Shelldon". All quips come from the earnest pool.
6. **Encode** with ffmpeg: H.264 MP4 (`-pix_fmt yuv420p -an -map_metadata -1`) and a PNG poster. If upscaling a canvas-only capture, use `flags=neighbor` at an even scale.
7. **OG image:** Playwright renders `tools/capture/og.html` at 1280×640 → `site/assets/og-v1.png`, under 1 MB, key content inside the central ~1150×600.
8. **Favicons:** from the shell region of a 256px capture: `favicon-32.png` and a 180×180 `apple-touch-icon.png` on `#06140b`.
9. Copy outputs to `site/assets/` (lowercase names), then `bash tools/check-site.sh site`.

### Fixtures (`tools/capture/fixtures/*.json`)

| Fixture | Stage | Tier / vitality | Extras | Tier |
|---|---|---|---|---|
| `hero` | adult | thriving / 88 | reaction `test_pass` "All tests passing. Lovely work."; coding 42 min; debt 3 | P0 |
| `touch-grass` | adult | healthy / 60 | reaction `long_session` "You've been at this a while — go touch grass?"; coding 61 min; debt 8 | P0 |
| `debt` | adult | healthy / 60 | coding 189 min; debt 72 (degraded) | P0 |
| `snoozed` | adult | healthy / 60 | `notifications {snoozed: true, remainingMinutes: 30}`; coding 75 min | P0 |
| `ride` | adult | thriving / 88 | `lastSport: "cycling"`, activity 20 min ago | P1 |
| `growth-{egg,hatchling,juvenile,adult}` | each | healthy / 60 | — | P1 |
| `tier-{88,60,30,10}` | adult | each tier | — | P1 |
| `lost` | adult | dormant / 10 | standby screen | P1 |

Cline re-derives each debt value from `src/config.ts` in its plan.

### Never touch Victor's real state

- The capture never runs the CLI and never reads or writes `~/.fitpet` or `~/.claude`. Victor's real pet must not appear anywhere.
- The only allowed CLI use is AC8, in one shell with an exported temp home:
  `export FITPET_HOME="$(mktemp -d)"; node src/cli.ts reset --name Shelldon; node src/cli.ts feed 60; node src/cli.ts status; rm -rf "$FITPET_HOME"; unset FITPET_HOME`
- Never run `install`, `uninstall`, `cline-install`, `cline-uninstall` or `doctor`.

## 8. Technical approach

### Folder layout

```
site/                          # Pages artifact root: everything here is public
  index.html  404.html  style.css  main.js (≤3 KB)
  assets/                      # lowercase names only
tools/
  check-site.sh                # zero-dependency checks, run locally and in pages.yml
  capture/                     # README.md, package.json + lock (playwright only),
                               # capture.mjs, shim.js, og.html, browser-check.mjs, fixtures/*.json
.github/workflows/pages.yml
```

| Concern | Rule |
|---|---|
| `tsc` | `tsconfig.json` covers `src/` (minus `src/desktop`), `tsconfig.app.json` covers `src/desktop`. Nothing goes under `src/`. |
| `npm test` | `node --test` default pattern matches `test*`, `*-test.*`, `*.test.*`, `*_test.*` and `test/` dirs (JS/TS). No such names under `site/` or `tools/`. |
| `app:build` | electron-vite builds from `src/desktop` entry points and the `src/` modules they import; nothing outside `src/` is read. |
| `.gitignore` | `node_modules/`, `dist/`, `out/` match at any depth, so `tools/capture/node_modules` is ignored. |
| `ci.yml` | Don't edit it. |

### Build

None. HTML, CSS, JS and the generated assets are committed. Assets are regenerated by hand with `tools/capture` when the renderer changes (documented in `tools/capture/README.md`).

### Deploy workflow (`.github/workflows/pages.yml`)

```yaml
name: Landing page
on:
  push:
    branches: [main]
    paths: ["site/**", "tools/check-site.sh", ".github/workflows/pages.yml",
            "README.md", "src/config.ts", "src/content/quips.ts", "src/screen-debt/concern.ts"]
  pull_request:
    paths: ["site/**", "tools/check-site.sh", ".github/workflows/pages.yml"]
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
      - name: Check site
        run: bash tools/check-site.sh site
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

- `configure-pages` is deliberately omitted: a no-build static site doesn't need it.
- The `pull_request` run only executes the checks (read-only token, no secrets, no deploy). `pull_request_target` is banned.
- Pins carry `# vX.Y.Z` comments like `ci.yml`. SHAs were verified with `git ls-remote` on 2026-10-20. **Re-verify each in the plan** with `git ls-remote https://github.com/actions/<name> refs/tags/<tag>`; don't copy versions from GitHub docs or starter workflows. (`ci.yml` still uses checkout v4.4.0; bumping it is a separate PR.)
- No `.nojekyll` needed: Actions deploys don't run Jekyll, and upload-pages-artifact v5 drops dotfiles.
- Don't publish from `/docs` or `/` (that would expose `docs/*.md` and the roadmap file).

### Base path `/fitpet/`

- All URLs in `index.html`, `style.css`, `main.js` are relative (`./style.css`, `./assets/x.png`). Nothing starts with `/`.
- `404.html` is served at any missing nested path, so it uses `/fitpet/`-absolute URLs only.
- Only `canonical`, `og:url`, `og:image`, `twitter:image` use absolute `https://victory-c.github.io/fitpet/…`.
- Live paths are case-sensitive (macOS isn't): lowercase filenames only.
- Preview under the real base path:
  ```
  mkdir -p <scratch>/preview && ln -s /Users/victorchun/fitpet-site/site <scratch>/preview/fitpet
  python3 -m http.server -d <scratch>/preview 8000   # http://localhost:8000/fitpet/
  ```

### Head tags

`lang="en"`, charset, viewport, CSP meta (§10), `<title>FitPet: a desktop pet that grows when you work out</title>`, meta description ≤160 chars, canonical, `color-scheme: dark light`, `theme-color` per scheme, `og:type/site_name/title/description/url/image` (+ width 1280, height 640, alt), `twitter:card=summary_large_image`, `twitter:creator=@VCbutVictor`, explicit `<link rel="icon" … ./assets/favicon-32.png>` and `apple-touch-icon`. Pages sends `max-age=600`: version CSS/JS with `?v=N` and rename the OG image when it changes. Skip robots.txt and sitemap (a project site can't serve a root robots.txt).

### `tools/check-site.sh` (bash, portable: `grep -E`, `wc -c <`, no `sed -i`, no bash-4 features)

1. `index.html` and `404.html` exist; filenames are lowercase.
2. No `href="/`, `src="/` or `url(/` in `index.html`, `style.css`, `main.js`.
3. Every local `href`/`src`/`srcset`/`poster` resolves case-exactly to a file under `site/` (strip `?query`/`#fragment`; split `srcset` on commas and drop descriptors).
4. No resource URL (script, stylesheet, icon, preload, img, video, source, iframe, CSS `url()`) points to another origin. Plain `<a>` links are fine.
5. OG/canonical/twitter URLs start with `https://victory-c.github.io/fitpet/`; `404.html` uses only `/fitpet/`-absolute local URLs.
6. Banned-word grep on `index.html` finds nothing.
7. Size budgets (§9) hold.
8. The page's quick-start block equals the README's `## Quick start` fenced block except the clone line.
9. Every quoted quip on the page appears verbatim in `src/content/quips.ts` or `src/screen-debt/concern.ts`.
10. No test-named JS/TS file under `site/` or `tools/`.

Include a small self-test in the plan showing each rule fails when it should.

## 9. Quality bars

**Gates (must pass):**
- Contrast WCAG 2.2 AA in both themes (text ≥4.5:1; large text, UI, focus ≥3:1).
- Meaningful alt text on every image (hero alt describes the actual adult shell, a flat-panel monitor); decorative images `alt=""`.
- Video rules from §6 (no autoplay attribute, reduced-motion respected, keyboard Pause/Play).
- Keyboard: skip link to `<main>`, logical order, no traps, visible 3px focus outline.
- One `h1`, ordered headings, `header`/`main`/`footer` landmarks.
- No horizontal page scroll at 360 and 320 CSS px; code blocks scroll inside `<pre>`. 200% zoom loses nothing.
- Every media element has `width`/`height`; below-the-fold images `loading="lazy"`.
- Weight: first load (HTML, CSS, JS, poster, icons) ≤150 KB; whole page ≤800 KB; each image ≤80 KB; video ≤250 KB.
- Zero requests to other origins; no cookies or storage; page reads fully with JS disabled.

**Targets (Victor checks, not blocking):** Lighthouse mobile ≥95 in all four categories, LCP ≤2.5s, CLS ≤0.05.

Cline verifies the gates it can automate with `tools/capture/browser-check.mjs` (not test-named): fail on any 4xx or non-localhost request, assert `context.cookies()` is empty and local/sessionStorage length is 0, check `reducedMotion: 'reduce'` shows only the poster, assert `scrollWidth ≤ innerWidth` at 320 and 360px, and save screenshots at desktop and 360px in both themes to a scratch dir outside the repo.

## 10. Privacy and security

- No cookies, storage, analytics, trackers, embeds, third-party fonts or CDNs.
- CSP meta in `index.html` and `404.html`:
  `default-src 'none'; style-src 'self'; script-src 'self'; img-src 'self'; media-src 'self'; font-src 'self'; base-uri 'none'; form-action 'none'`
  (no inline `<script>`, no `style=""`, no `on*=` handlers; `frame-ancestors` can't be set via meta and Pages can't set headers, accepted).
- Default referrer policy; external links open in the same tab.
- Workflow: no secrets, `permissions: {}` at top, least privilege per job, `persist-credentials: false`, only official `actions/*` pinned by SHA, no untrusted input interpolated into `run:`.
- Content: no real pet name or state, no real editor content, no email address; asset metadata stripped.
- Capture server binds only to `127.0.0.1`, runs from a temp dir, and is stopped afterwards.

## 11. Manual steps only Victor does

Cline must **not** change repo settings, enable Pages, upload the social preview, run `gh repo edit`, `gh pr merge`, or any `gh api` with `-X POST/PUT/PATCH/DELETE`.

| # | When | Step |
|---|---|---|
| V1 | Now | Review Cline's plan, bring it to Claude for a second review, then approve |
| V1b | After approval | Keep Cline's command auto-approve off. Open `/Users/victorchun/fitpet-site` in a new VS Code window and start a fresh Cline task with the approved plan pasted in |
| V2 | Before M3 | Gate L2: hand-check right-click (Snooze 30 min, Unsnooze, Nag intensity) and the drag strip: `export FITPET_HOME="$(mktemp -d)"; node src/cli.ts reset --name Shelldon; npm run app:dev` in the worktree |
| V2b | Before M3 | Gate L4: live-test FitPet's Cline hooks on a throwaway demo folder with the same exported temp `FITPET_HOME`: `node /Users/victorchun/fitpet-site/src/cli.ts cline-install --host vscode --workspace <demo>`, enable Hooks in Cline, run a short task, confirm the session timer moves |
| V3 | By 10-27 | Gate L1: approve a separate portability PR (SKILL.md path, README clone URL and Cline commands) or ship with the caveat line (Q4) |
| V4 | **Before merging** | Gate L3: Settings → Pages → Source: **GitHub Actions**. Check: `gh api repos/victory-c/fitpet/pages --jq '{build_type,html_url}'` and `gh api repos/victory-c/fitpet/environments/github-pages --jq .deployment_branch_policy` |
| V5 | Launch | Merge the PR, watch the Pages run (re-run with `workflow_dispatch` on main if it ran before V4) |
| V6 | After first deploy | Fix About: `gh repo edit victory-c/fitpet --homepage https://victory-c.github.io/fitpet/ --description "A pixel hermit crab desktop pet that grows from your Garmin training and nags you to touch grass during long Claude Code or Cline sessions." --add-topic electron --add-topic desktop-pet --add-topic cline --remove-topic status-line` |
| V7 | After first deploy | Upload `site/assets/og-v1.png` as the repo social preview (Settings → General). Cards for github.com links use this image |
| V8 | Before launch | Read the copy aloud; confirm the disclosure, footer, /buddy and "first versions with Claude Code" lines |
| V9 | Optional | Real-window screenshot over a clean demo project, with a temp `FITPET_HOME` |
| V10 | Optional | Ruleset on `main` requiring a PR, since every push to main now deploys |
| V11 | Follow-up | In the portability PR: add "Website: https://victory-c.github.io/fitpet/" under the README title, fix README:57, swap `docs/window.svg` for the new poster or GIF |

## 12. Milestones and acceptance criteria

| Milestone | Scope | Due |
|---|---|---|
| M0 Plan | Cline's plan; Victor approves | Thu 10-22 |
| M1 Skeleton | Worktree; `index.html` with all copy, `style.css`, `main.js`, `404.html`, `check-site.sh`, `pages.yml` | Sat 10-24 |
| M2 Assets | `tools/capture`, P0 fixtures and assets, OG, favicons, then P0.5 loop | Tue 10-27 (cut rule §7) |
| M3 Polish | a11y and mobile pass; gate wording applied; Victor's copy edits; PR opened | Wed 10-28 |
| M4 Launch | V4–V7; live checks | Fri 10-30 |

**Launch gates**
- **L1.** Portability PR merged, or section 7 shows the caveat line.
- **L2.** Right-click hand-checked, or CLI-only wording.
- **L3.** Pages source = GitHub Actions before the merge.
- **L4.** Cline hooks live-tested, or the Cline column says "experimental, not tested on a live install yet".

### Acceptance criteria

**Isolation**
- [ ] AC1. `git diff --name-only origin/main...feat/landing-page` lists only `site/**`, `tools/**`, `.github/workflows/pages.yml`.
- [ ] AC2. `npm run typecheck`, `npm test`, `npm run build` pass in the worktree; test count equals `origin/main`'s (record it first).
- [ ] AC3. No test-named JS/TS file under `site/` or `tools/`.
- [ ] AC4. The PR body includes the full command log. Every `src/cli.ts` call ran under an exported temp `FITPET_HOME`; no command references `~/.fitpet` or `~/.claude`; `/Users/victorchun/fitpet` is still on its original branch with a clean tree.

**Content**
- [ ] AC5. Sections in §5 order; the plan includes a claim → `file:line` trace table (including external claims: PR #14903 state, Medium link).
- [ ] AC6. Every quoted line is verbatim from the earnest pool in `quips.ts` or `concern.ts` (check-site rule 9).
- [ ] AC7. Quick-start block matches README lines 57–64 except the clone URL (check-site rule 8).
- [ ] AC8. The `feed 60` claim is verified with the exact command in §7 (status shows a hatchling), or the line is reworded to what actually happens.
- [ ] AC9. Banned-word check passes.
- [ ] AC10. Page contains: "install from source", "window only tried on macOS", Node 23.6+, the Garmin-through-Claude caveat, "aren't medical advice", "not real screen time", the Cline column, the footer endorsement line, and "I'm a Cline Campus Ambassador" in §9 and the footer.
- [ ] AC11. No download button, Windows/Linux support claim, star count or logos.
- [ ] AC12. L1, L2, L4 wording matches Victor's decisions.

**Media**
- [ ] AC13. Every image/video comes from `tools/capture` fixtures, pet named "Shelldon", earnest quips only; `docs/window.svg` unused.
- [ ] AC14. Canvas captures displayed at 128/256/512 CSS px with `image-rendering: pixelated`; text shots captured at DSF 2.
- [ ] AC15. `og-v1.png` is 1280×640, <1 MB; all OG/Twitter tags present with absolute URLs.
- [ ] AC16. Video has no `autoplay` attribute; reduced motion shows only the poster; Pause/Play works from the keyboard.

**Technical**
- [ ] AC17. `bash tools/check-site.sh site` passes, and its self-test shows each rule can fail.
- [ ] AC18. `pages.yml` matches §8 (re-verified SHAs, permissions, triggers, no secrets); `actionlint` passes if available. Any deviation is listed in the plan.
- [ ] AC19. `browser-check.mjs` passes at `http://localhost:8000/fitpet/`; `/fitpet/404.html` renders with styles.
- [ ] AC20. All §9 gates pass.

**Live (after merge)**
- [ ] AC21. `curl -sI https://victory-c.github.io/fitpet/` → 200; `/fitpet` → 301; `/fitpet/does/not/exist` → 404 with the styled page.
- [ ] AC22. OG card renders in an X or Reddit preview (or LinkedIn Post Inspector).

**Process**
- [ ] AC23. No file written before plan approval. Cline did not merge, change settings, or make write API calls beyond pushing this branch and `gh pr create`.

## 13. Risks and open questions

| Risk | Mitigation |
|---|---|
| `/fitpet-sync` hard-coded path breaks Garmin sync for new users | Gate L1 |
| Overstating the Cline integration on an ambassador page | Gate L4, compatibility table, "still in review" wording for #14903 |
| Right-click and drag never hand-tested | Gate L2 |
| Base-path / filename-case bugs only show live | Relative URLs, check-site, preview under `/fitpet/` |
| Merge before Pages is enabled | Gate L3; `workflow_dispatch` re-run |
| Copy drifts from README/config/quips | check-site rules 8–9 + paths filter re-runs on those files |
| Cline's default polished voice | Near-final copy deck, banned words, Victor reads it aloud |
| Real data leaks | Fixtures only; temp `FITPET_HOME` |
| Switching branches in the live clone changes Victor's running hooks | Separate worktree; AC4 |
| Scope too big for one week | Asset tiers + cut rule; Lighthouse is a target, not a gate |

**Open questions** (each has a default)
- **Q1.** Checkout pin for `pages.yml`. *Default: v7.0.1; bump `ci.yml` separately.*
- **Q3.** Custom 404 on nested paths for Actions-deployed sites. *Default: verify in AC21.*
- **Q4.** Portability fix before launch? Fixing SKILL.md may need `src/install.ts` to rewrite the path when copying the skill (out of scope here). *Default: separate PR if Victor approves by 10-27, else the caveat line.*
- **Q6.** Disclosure wording on the page. *Default: §9 and footer; Victor confirms.*
- **Q7.** The /buddy line. *Default: one sentence in "Why I made it".*
- **Q8.** "The first versions were built with Claude Code." *Default: keep; Victor confirms.*
- **Q10.** Quote the r/SideProject commenter? *Default: paraphrase.*
- **Q11.** Playwright/Chromium: use what's cached; any download needs Victor's OK.
- **Q13.** Light theme? *Default: both; dark-only is an allowed cut.*
- **Q16.** Which Garmin MCP server to name and link (Victor uses `github.com/victory-c/garmin_mcp`, registered as `garmin`)? *Default: Victor confirms the link; until then section 7 says "a Garmin MCP server registered as `garmin`".*

## 14. Instructions for Cline

### Phase 1: Plan mode (now)

Read only. Allowed: reading files; `git fetch origin` in `/Users/victorchun/fitpet` (refs only); `git log`, `git show origin/main:<path>`, `git diff`; `git ls-remote`; `gh api` GET requests.

Forbidden in Phase 1: creating files, branches or worktrees; `npm install`/`npm ci`; running the app, the capture tool or `node src/cli.ts`; pushing or opening a PR; any `gh` write call or settings change; `git checkout`, `switch`, `stash`, `reset` or `clean` in `/Users/victorchun/fitpet`.

Produce a plan with exactly these headings:
1. **Scope and deviations.** Anything in this PRD you disagree with, with `file:line` evidence, and any §0 fact that changed.
2. **Setup commands** to run after approval.
3. **Files to create.** Path, purpose, estimated size; explicit statement that nothing outside `site/**`, `tools/**` and `.github/workflows/pages.yml` changes.
4. **Workflow.** Full `pages.yml` plus `ls-remote` output for each pinned SHA.
5. **Copy deck.** Final text per section with L1/L2/L4 variants; claim → `file:line` trace table; banned-word result; every line you changed from §5 and why.
6. **Asset capture.** Each P0 fixture's JSON; outline of `capture.mjs`, `shim.js`, `browser-check.mjs`; exact ffmpeg commands; outputs with dimensions and byte budgets; how real state is avoided.
7. **Verification.** Exact commands and expected results, mapped to AC IDs.
8. **Victor's manual steps.** §11, amended only if needed.
9. **Open questions** with your recommended defaults.
10. **Risky commands.** Every command that writes outside the worktree, downloads anything, or uses the network.

Then **stop** and wait for Victor's explicit approval.

### Phase 2: after approval only

1. Set up the worktree (outside the repo, untracked so nothing auto-pushes to main):
   ```
   git -C /Users/victorchun/fitpet fetch origin
   git -C /Users/victorchun/fitpet worktree add --no-track /Users/victorchun/fitpet-site -b feat/landing-page origin/main
   git -C /Users/victorchun/fitpet-site log -1 --format=%h   # expect 88e8b82 or newer
   ```
2. Work only inside `/Users/victorchun/fitpet-site`, only on the allowlisted paths. Never touch the branch or tree of `/Users/victorchun/fitpet`.
3. `node src/cli.ts` only under an exported temp `FITPET_HOME` (§7). Never run `install`, `uninstall`, `cline-install`, `cline-uninstall` or `doctor`. Never read `~/.fitpet` or `~/.claude`.
4. Commit once per milestone (M1, M2, M3).
5. When AC1–AC20 pass locally: `git push -u origin feat/landing-page`, then `gh pr create` titled "Add GitHub Pages landing page", with a summary, the AC checklist with results, screenshot paths (desktop and 360px, both themes), the command log, and Victor's steps V4–V7.
6. **Do not merge.** Don't enable Pages, edit repo settings, or make any GitHub write call other than that push and `gh pr create`.
7. If any part of this PRD turns out to be wrong, stop and ask. Don't improvise, especially on anything touching `src/`, `README.md`, `skills/` or repo settings.
