# FitPet fixture capture

This directory has its own exact `playwright: 1.63.0` dependency and lockfile.
It never imports the CLI, reads pet/settings state, or changes app sources.
`browser-check.mjs` is separately maintained by the site lead.

## Reproduce

Prerequisites: fresh `out/renderer/` from the approved baseline build, Node,
ffmpeg on PATH, and **already cached Chromium/headless-shell revision 1243**.
The package manifest identifies Chromium 153.0.8010.12. Never run a browser
installer: if the cache is missing or launch fails, stop and ask Victor.

```sh
cd /Users/victorchun/fitpet-site/tools/capture
PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 npm ci
node /Users/victorchun/fitpet-site/tools/capture/capture.mjs
```

The original dependency install used
`PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 npm install` with the exact package pin.
No root dependencies change. The script only writes final assets under
`site/assets/`, and its machine-readable `capture-report.json` here. Re-running
overwrites those outputs. It prints its allocated `CAPTURE_TMP`; browser,
loopback server, copied renderer, PNG frames and intermediate images are closed
or removed in `finally`, including on assertion failure.

## Renderer, fixture and clock provenance

The four JSON files are the complete, exact snapshots in approved plan section
6, including nulls, notifications, coding, activity status and reaction text.
The reference clock is 2026-10-20T12:00:00.000Z / 1792497600000. The three
quips are earnest; the debt bubble is an explicit fixture selection, not a
claim that browser capture independently computed a concern event.

For continuous observed coding and zero prior debt/recovery:

```
D(m) = .25 * max(0, min(m,60)-30) + .50 * max(0,m-60)
42min -> 3; 61min -> 8 (rounded); 189min -> 72; 75min -> 15.
```

Timer duration alone is not enough without that observation assumption.
Vitality and debt are separate: hero vitality88/thriving; the other fixtures
vitality60/healthy. All are sprout/adult named Shelldon.

The script copies `out/renderer` into disposable storage and injects a
same-origin external shim *before* its module script, preserving its CSP.
The only capture styling composites transparency onto `#06140b`. Name display
is the real renderer hover behavior, triggered with the mouse, not a CSS label
override. The viewport is **300×410 CSS pixels at device scale factor2**, yielding
600×820 PNGs. No DOM screenshot is resized afterward.

The shim installs a manual rAF queue before renderer initialization. `Date`,
`Date.now()`, `performance.now()`, `performance.timeOrigin` and callback timestamps
share one elapsed clock. Each step is 33.34ms, never below the renderer's
33.333…ms throttle. Ten steps warm up for 333.4ms. Still capture uses Playwright
`animations: 'disabled'` to settle CSS transitions; that option does not drive
canvas rendering. The shim advances canvas explicitly.

The tool asserts fixture arrival, exact name/vitality, coding/debt/snooze labels,
exact bubble text and visibility, a 256×256 canvas with >1000 opaque pixels,
and changed canvas output after twenty steps. It captures **180 hero frames**,
checking selected frame hashes differ. Adjacent screenshots need not differ
on every step: pixel quantization and breathing can hold a pose. Browser errors
and any off-origin renderer requests fail validation. Only an ephemeral
127.0.0.1 server is permitted. The report preserves selected frame hashes,
dimensions and measured encoded sizes, not fixture/user state.

## Encoding, icons and social preview

Every published image is encoded with:

```sh
ffmpeg -hide_banner -loglevel error -y -i INPUT \
  -frames:v 1 -map_metadata -1 -c:v png -compression_level 9 OUTPUT
```

No PNG quantization or text upscaling. Still target≤55,000 bytes, all images
hard maximum80,000. Dimensions are asserted from PNG IHDR after encoding.
After ffmpeg, ancillary chunks (including ffmpeg's automatic pHYs density
chunk) are removed without changing image data, leaving no PNG metadata.
`og.html`/`og.css` render at 1280×640 DSF1, using local hero output and system
fonts only, with central 1150×600 content. It is capture-only, not published.

Icons derive from the **actual hero canvas**, not a drawn substitute. The adult
flat shell's source anchor is [15,4], grid34×24 logical pixels, SCALE4. At
poster time the quantized breathing translation is zero. Crop `136:96:60:16`
from the 256px source, pad to144×144 with `#06140b`, then nearest-neighbor scale
to32×32 /180×180. This preserves the captured screen, bezel and monitor neck.
Manually review the final icons and OG after a capture; source geometry changes
require updating/reviewing the crop, never inventing shell art.

Published P0 inventory: `hero-poster.png`, `touch-grass.png`, `debt.png`,
`snoozed.png`, `og-v1.png`, `favicon-32.png`, `apple-touch-icon.png`.

## Optional loop decision

No MP4 is emitted. The hero begins with the 1500ms test-pass flash, which has
expired by frame179. First/last screen states differ, so a six-second loop has
a conspicuous join. Preserve the approved P0 poster rather than publish a
seamless-loop claim or change the fixture to hide the mismatch. All180 frames
are still captured for validation, then deleted. If a future reviewed fixture
passes visual seam review, encode 30fps/180frames with libx264, slow preset,
250k target /300k max /500k buffer, yuv420p, no audio, `-map_metadata -1`,
`-movflags +faststart`, then assert ≤250,000 bytes. Notify the site author before
adding the optional source; do not add an unreviewed loop opportunistically.

The initial visual seam review compared frame0 and179 side by side: green
checkmark becomes a live ECG display, eyes change, and breathing moves the
body. This is visibly discontinuous, not merely a hash mismatch. The reviewer
also inspected all P0 stills, OG composition, and both shell icons. Review
intermediates are removed; no extra media beyond the seven P0 assets ships.