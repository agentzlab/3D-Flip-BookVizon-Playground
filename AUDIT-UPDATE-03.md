# Audit Update 03

Date: 2026-11-11 (America/Los_Angeles)
Status: in progress

Baseline: `main @ 99d1ed28bb3e9a3a8ce695c28624edd14e4aedb2`, v13.57. Read PLAYGROUND.md. Main and all book content remain untouched. Findings continue from 10. Experiments are reference work for Jon → Trinity → Penguin Lab gates; nothing here ships directly. Timings describe this software-rendered sandbox, not iPhone feel.

## 10 — Per-pose draw cost (assignment 1)

Branch: `sol/audit-update-03`. Instrumentation commit: `8ec271d2128bad64be6df54df9361d896f54619d`. Result commit: `ee4c60aae699ada622af5f6492136fd8ef9f5ff6`.

Reproduction: `CHROME_PATH=/tmp/chromium node scripts/measure-leaf.cjs leaf-measurements.json` (Playwright required; set CHROME_PATH to an installed Chromium). Harness serves the real index.html with a temporary closure hook; it does not change the production viewer. Raw trials: `measurements/leaf-cost.json`.

Chromium 153.0.8010.0, headless, `--disable-gpu --disable-accelerated-2d-canvas`; viewport **844 × 390 CSS px**, density **2**. Double layout / Hardcover, normal motion. The actual fit gives **262 × 262 CSS px** pages, a **1844 × 996 physical px** leaf canvas, and **1750 × 1750** decoded effective source images. Bake faces are **524 × 524 physical px** (display size at density 2), not full source resolution. Cover: flipped=0, pages 0/1 (front cover + flyleaf). Interior: flipped=3, S01 spread, moving faces pages 6/7 (S01-R + S02-L). Assets are the built-in effective images, including embedded pages-data.js.

Three repeated trials per cell, 120 measured poses each (360 poses/cell), 12 warmup poses/trial. Angles sweep -0.75° to -179.25°, both faces, unchanged 64 strips and bend integral. Trial order alternates source/bake. All images decoded before timing. The benchmark wraps drawImage/fillRect/clearRect on the actual leaf context.

| Moving leaf | Source | drawImage / pose | Submission mean ms / pose | Readback-inclusive mean ms / pose |
| --- | --- | ---: | ---: | ---: |
| Cover, board | Original image | 64 | 0.0831 | 12.4231 |
| Cover, board | Display-size bake | 64 | 0.1175 | 12.4447 |
| S01 interior, paper | Original image | 64 | 0.1447 | 19.7783 |
| S01 interior, paper | Display-size bake | 64 | 0.1094 | 22.3417 |

Each pose also clears once. Board has zero face fillRect calls; paper has two (dim + tip highlight). These counts exclude DOM shadows, camera/compositing, on-art text, and other viewer work.

**Separate timing meanings:** submission measures synchronous drawLeaf2D API calls without a readback between poses. Raster work can remain queued; a final full readback drain is separately recorded in raw data, outside the submission timer. Readback-inclusive trials perform a full getImageData of the leaf canvas after EVERY pose (~7.35 MB readback/pose), forcing raster completion plus allocation/copy. This is an upper proxy for drawing + synchronization, not a displayed frame cost and not a GPU measurement. Readbacks may also influence Chromium's canvas backing strategy. Do not subtract the two columns to claim exact raster time.

The temporary bake is two offscreen 2D canvases, drawn once per trial as a stand-in for once per turn, then supplied to the unchanged drawLeaf2D using image-compatible readiness/dimension fields. The bake is forced complete before per-pose timing. Mean one-time two-face costs, measured separately: board **1.317 ms submission + 6.050 ms drain/readback**; interior **4.883 + 11.467 ms**. Drain includes copy/allocation; it is not the application's bake creation latency in isolation.

Baked minus original: cover **+0.0344 ms submission / +0.0217 ms readback-inclusive**; interior **-0.0353 / +2.5633 ms**. Readback-inclusive interior is about **13.0% slower**. Cover trials drifted substantially (original 9.55–15.31 ms, baked 9.56–14.01 ms), so tiny cover differences are noise. No robust performance gain established. The interior submission saving does not survive the forced-raster proxy. Retain this as sandbox evidence only; a device run would need compositor/frame traces and visual-quality checks.

Remaining results: bake decision (11), drag painting (12), landing handoff (13), cover reference variants (14).

## 11 — Bake branch decision (assignment 2)

Branch: `sol/audit-update-03`; decision commit: the introducing commit for this section, indexed by the next update. **Skip `sol/leaf-bake`**, as authorized when item 1 does not leave it promising. No production bake implementation or branch is created.

Tried: a display-size two-face bake inside the measurement harness, keeping 64 strips and the exact bend math. Found: unchanged call count, no stable cover gain, worse interior readback-inclusive cost, and extra per-turn work/memory (~2.20 MB for both 524² RGBA faces before overhead). Recommend: do not pursue this variant on this evidence. A software result cannot rule out a device-specific benefit, but it does not justify adding the cache/lifecycle/resize complexity here.

## 12 — Drag paint queue (assignment 3)

Branch: `sol/drag-raf`; verified remote commit: `873031aed7d28381d8aa0e0431a74b78042e0343`. This is the plugin-published equivalent of the earlier local-only work; use the remote SHA for harvesting.

Baseline pointermove calls poseLeaf/poseTurn directly on every qualifying move, not through a shared animation-frame queue. Decode-ready activation can also pose directly. The experiment routes both through queueDragPaint; input sampling remains immediate, one pending callback paints the latest drag, and identity/turn-generation checks reject stale work. Release cancels pending painting and computes the settle start from the latest sampled position. Mode change cancels the queue.

The committed deterministic harness covers six scenarios and asserts 20 moves coalesce to zero immediate poses and one frame pose, plus latest-position release and stale-callback rejection. These are the prior session's recorded passing checks; this plugin-only continuation inspected the committed source/diff but did not rerun Node or a browser. They do not establish iPhone frame rate or smoothness. The known finding 02 partial-drag landing interpolation remains unchanged: the reported 70.75 px case is not fixed, and its precise offset depends on the release sample. Pointercancel commit behavior also remains a separate baseline issue. See NOTES-drag-raf.md and scripts/check-drag-raf.cjs on that branch.

Recommendation: device-test gesture release, reverse/cancel, decode-delayed activation and mode switches before any harvest. No renderer change or WebGL/CSS-3D retrial.

## 13 — Landing handoff (assignment 4)

Source anchor: pristine main, index.html. Source inspected through GitHub Actions run 43155469345 (success), using the GitHub plugin because the contents API returns an empty body for this large file. No landing optimization is introduced.

**When it runs:** animateLeaf (4981) poses the sheet, then at remaining angle <= SWAP_DEG=10 (4970, 5020–5024) invokes onSwap while animating is still true. startFlipNext's done (5104) and startFlipPrev's done (5143) commit state and call render. Drag settlement does the same at 5715–5718. Magazine uses SWAP_P=0.93 (5033, 5067–5070). A watchdog/exception finish invokes an uncalled onSwap before hiding the leaf (4990–4992). This work can therefore overlap the final visible fade; it is not exclusively after touchdown.

**Render work:** render (4615–4638) rewrites base display/src properties, counter and four chrome helpers; calls warmAround, placeSave, updateShelfAmbient and syncScrollView. It does not call fit or resize the leaf canvas, and contains no direct layout measurement. Browser style/layout/paint can still follow these writes. refreshTextChrome (7711) can rebuild an open text panel via updateTextPanel (7735), sync on-art plates and search, and refresh crowding. refreshCompareChrome (9197) and refreshListenChrome (9624) also refresh crowding; refreshMarkChrome (9286) updates attributes. updateShelfAmbient (13618) resolves the current art, updates changed backgrounds and calls paintExtendedBackdrop. These downstream paths should be included in a device trace; source inspection alone cannot assign their frame cost or exclude indirect layout reads.

**Decode and save:** warmAround (4586) immediately defers while animating or actively dragging (4585–4588), so render at the swap does not expand the decode window. finish clears animating, processes possible queued navigation, then flushWarm (5001 / 5053); flushWarm (4609) checks no turn is in flight and calls warmAround. That launches asynchronous decode calls for unready base/effective images (4593–4602), not a synchronous decode wait. It does not prove those images cannot contend with the next frame. placeSave (4061) performs two synchronous localStorage writes unless placeHold or rememberPlace gates it. Thus committed leaf drags DO save via render; the direct focus-slide drag path (5676–5690) separately skips placeSave.

**Hitch assessment:** the overlap of image/UI writes, optional text/overlay rebuilds and synchronous persistence is a credible landing workload, and warming resumes immediately after settlement. This is a source-backed candidate, not a measured or reproduced landing hitch; no iPhone/WKWebView performance claim. Keep this separate from finding 02's geometric glide error (5014), which can visibly jump regardless of render cost. Recommend a device performance trace around onSwap/render, placeSave and flushWarm, with text/on-art/search enabled and disabled, before splitting critical image handoff from deferred chrome/save/warm work. Moving persistence blindly could lose the last place on app backgrounding.

Fresh validation: Actions job 130974271910 reran the actual committed drag harness on sol/drag-raf @873031ae: all six checks passed, 20 moves → one frame pose, latest release retained. All six inline scripts parsed successfully. This updates result 12's prior-session-only test provenance. Browser/device interaction checks remain pending for harvest.
