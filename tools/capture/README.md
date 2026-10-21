# FitPet fixture capture

This directory pins Playwright 1.63.0 in its own manifest and lockfile. Capture
never imports the CLI, reads pet/settings state, or changes app sources.

## Reproduce

Run these commands from the repository root with fresh `out/renderer/` from the
current approved baseline build. Prerequisites are Node, ffmpeg on PATH, the
existing capture dependencies, installed Menlo, and **already cached
Chromium/headless-shell revision 1243** (Chromium 153.0.8010.12). Do not run a
browser installer or download a browser. Missing cache or launch failure means stop.

```sh
PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 npm ci --prefix tools/capture
node tools/capture/capture.mjs
# Optional equivalent explicit destination:
node tools/capture/capture.mjs --output site/assets
```

All seven images and the complete report are staged in disposable storage.
Dimensions, sizes, decoded pixel equality, fixture assertions, frame assertions,
fonts/environment, and browser/resource errors are validated **before** any
published file is copied into `site/assets/`. A validation failure therefore
leaves published assets and `capture-report.json` unchanged. After validation,
publication copies the approved inventory, removes obsolete `og-v1.png` and `og-v2.png`, and
copies the report. This is a validation gate, not a filesystem transaction:
an operating-system failure during copying can still interrupt publication.

The tool prints its allocated `CAPTURE_TMP`. Browser, loopback server, copied
renderer, frames, and intermediate images are closed or removed in `finally`,
including on assertion failure. The report contains no timestamps, absolute
paths, ephemeral ports, or temporary-directory names. Asset SHA-256 hashes and
selected frame hashes are stable. OS/architecture, ffmpeg version, renderer font
stack, and Menlo text metrics are recorded; changes fail against the previous
report and require explicit review, not an automatic baseline reset.

## Renderer, fixture and clock provenance

The four JSON files contain complete snapshots, including nulls, notifications,
coding, activity status, and reaction text. Every fixture must have a `reaction`
property: explicit null means no quotation; otherwise its text must exactly
match the approved earnest quotation. The reference clock is
2026-10-20T12:00:00.000Z / 1792497600000. The debt bubble is an explicit fixture
selection, not a claim that browser capture computed a concern event.

For continuous observed coding and zero prior debt/recovery:

```text
D(m) = .25 * max(0, min(m,60)-30) + .50 * max(0,m-60)
42 min -> 3; 61 min -> 8 (rounded); 189 min -> 72; 75 min -> 15.
```

Duration alone is not enough without that observation assumption. Vitality and
debt are separate: hero vitality 88/thriving; other fixtures vitality 60/healthy.
All are sprout/adult named Shelldon.

The script copies `out/renderer` into disposable storage. Same-origin external
`shim.js` runs before the renderer module; external `shim.css` composites onto
`#06140b` and hides `#drag-handle` without changing app sources or weakening CSP.
Name display is the real renderer hover behavior, not a CSS label override.
The viewport is **300 × 410 CSS pixels at device scale factor 2**, yielding
600 × 820 PNGs. No DOM screenshot is resized afterward.

The shim installs a manual rAF queue before initialization. `Date`, `Date.now()`,
`performance.now()`, `performance.timeOrigin`, and callback timestamps share one
elapsed clock. Each step is 33.34 ms, above the renderer's 33.333… ms throttle.
Ten warmup steps total 333.4 ms. Playwright `animations: 'disabled'` settles CSS
transitions; the shim advances canvas explicitly.

Assertions cover fixture arrival, exact labels and quotation visibility, hidden
drag handle, a 256 × 256 canvas with >1,000 opaque pixels, and changed canvas
output after twenty steps. All **180 hero frames** are captured and selected
hashes must differ. Adjacent frames can hold a pose due to pixel quantization.
Browser errors, resource failures, and off-origin requests fail validation;
only the ephemeral 127.0.0.1 server is permitted.

## Encoding, icons and social preview

ffmpeg uses PNG compression level 9 with metadata removed. All six lossless
prediction modes (none, sub, up, avg, paeth, mixed) are tried in that fixed order;
the smallest result wins, with ties resolved by that order. The report records
the selected prediction and pixel format.
Fully opaque inputs use RGB24; inputs with transparency retain RGBA. Every
encoded result is decoded to RGBA and checked byte-for-byte against its source
(after the explicit icon crop/scale filters). No quantization or additional
encoding dependency is used. Ancillary PNG chunks, including pHYs, are removed
without changing image data. Still target: ≤55,000 bytes; hard maximum for each
image: 80,000 bytes. IHDR dimensions and final file hashes are asserted.

`og.html`/`og.css` render at 1280 × 640, device scale factor 1, with central
1150 × 600 content, local hero output, and system fonts including Menlo. The H1
is exactly “FitPet: a desktop pet that grows when you work out.” The tagline
“Grows from Garmin workouts. Nudges you after an hour of Claude Code or Cline.”
uses 32px text; “victory-c.github.io/fitpet” uses 26px text. Text bounds are asserted.
An object-fit container shows the real poster's top 600 × 620 region, excluding
renderer labels while retaining the bubble “All tests passing. Lovely work.”
and crab. No extra copy is added. These source templates
are capture-only, not published.

Icons derive from the **actual hero canvas**, not a substitute drawing. The
adult flat shell source anchor is [15,4], grid 34 × 24 logical pixels, SCALE 4.
At poster time quantized breathing translation is zero. Crop `136:96:60:16`
from the 256 px source **after ffmpeg alpha compositing over `#06140b`**, pad to
144 × 144 with `#06140b`, then nearest-neighbor
scale to 32 × 32 / 180 × 180. Decoding each icon to RGBA must show alpha255
everywhere and a corner pixel `[6,20,11,255]`. Simply discarding alpha is not
compositing and would leave incorrect holes. This preserves screen, bezel, and monitor neck.
Manually review icons and OG after capture; geometry changes require reviewing
the crop, never inventing shell art.

Published inventory: `hero-poster.png`, `touch-grass.png`, `debt.png`,
`snoozed.png`, `og-v3.png`, `favicon-32.png`, `apple-touch-icon.png`.

## Deterministic rerun

From the repository root, compare every published PNG and the report:

```sh
scratch=$(mktemp -d)
shasum -a 256 site/assets/*.png tools/capture/capture-report.json > "$scratch/before.sha256"
node tools/capture/capture.mjs
shasum -a 256 site/assets/*.png tools/capture/capture-report.json > "$scratch/after.sha256"
diff -u "$scratch/before.sha256" "$scratch/after.sha256"
rm -r "$scratch"
```

An empty diff is required. After the reviewed outputs have been committed,
repeat capture and check `git status --short`: capture must introduce no changes.
Do not include working-tree status, timestamps, or rerun counters in the report.

## Browser verification

From the repository root, with the local server already serving the site at
`http://127.0.0.1:8000/fitpet/`, run:

```sh
review_output=$(mktemp -d)
node tools/capture/browser-check.mjs --base-url http://127.0.0.1:8000/fitpet/ --output-dir "$review_output"
printf 'Browser evidence: %s\n' "$review_output"
```

The allocated output must be outside both the working repository and its linked
repository. The checker verifies the physical destination, including symlinks.

## Manual configuration-drift checklist

The Pages workflow does not watch `src/config.ts`, and no checker rule reads it.
For changes to config, renderer, sprites, fonts, fixtures, or capture tools:

- Compare `src/config.ts` against fixture vitality/tier boundaries, debt scoring,
  coding thresholds, notification/snooze behavior, and earnest quotation pools.
- Recheck reaction duration against the fixed clock and 333.4 ms warmup; preserve
  explicit null for the snoozed fixture and exact approved text for others.
- Rebuild the renderer from the approved baseline before capture; verify the
  shell crop against current sprite geometry, scale, and breathing offset.
- Run capture, inspect all four stills, both icons, and OG, then run the site
  checker and browser verification against the updated assets. Check first-load
  bytes as well as each image's individual size limit.
- Run the deterministic hash comparison above. Review any environment/font
  change explicitly, and repeat the clean-tree check after committing elsewhere.

## Optional loop decision

No MP4 is emitted. The hero's test-pass flash ends at 1,500 ms, before frame
179. Initial visual seam review found a green checkmark becoming a live ECG,
changed eyes, and body movement. First/last states differ, so a six-second loop
has a conspicuous join. Preserve the poster rather than claim a seamless loop
or change the fixture to conceal the mismatch. All 180 frames are validated,
then deleted. A future reviewed seamless fixture may use 30 fps / 180 frames,
libx264 slow preset, 250k target / 300k maximum / 500k buffer, yuv420p, no audio,
`-map_metadata -1`, and `-movflags +faststart`, with a ≤250,000-byte limit.
