# ANIMATION-COMPARISON-01 — Page-turn animation, old print flipbook vs shipping vs Sol prototypes

Author: Ravyn (GrokBot), independent read-only source pass. Date: 2026-11-11 (America/Los_Angeles).
Method: local git clones, `rg`/`sed` with line numbers, `git diff`, and arithmetic on the formulas in the code. Nothing was run in a browser or on a device. No existing file or branch was modified.

## 0. Sources (exact commits)

| Tag | Repo / ref | Commit | File |
|---|---|---|---|
| OLD | MyDigitalStudioz/Harlows-Accidental-Journey `main` | `c7c445a73c9042db452e050d6fcbeb5c8a03b1ae` | `flipbook-master-print.html` (1,587 lines) |
| SHIP | MyDigitalStudioz/3D-Flip-BookVizon `main` (v13.57) | `1a29eec6531ad2fd4e3b237ce2bdb19a914981a6` | `index.html` (15,645 lines, 13.6 MB) |
| PG main | agentzlab/3D-Flip-BookVizon-Playground `main` | `99d1ed28bb3e9a3a8ce695c28624edd14e4aedb2` | `index.html` |
| Cover A | `sol/cover-timing`~1 | `7f0896dd1ca67b6597567b81a8b61474141a7bd1` (parent = PG main) | |
| Cover B | `sol/cover-timing` HEAD | `a031d729743c09b0fe46f4e8b151a4e87d82b03e` (parent = A) | |
| drag-raf | `sol/drag-raf` HEAD | `873031aed7d28381d8aa0e0431a74b78042e0343` (parent = PG main) | |
| Audit | `sol/audit-update-03` HEAD | `30ca4fa…` | `AUDIT-UPDATE-03.md` |

**PG main is the same as SHIP.** `cmp` shows `index.html` is byte-identical. A full-tree diff finds only `README.md` (preview link, commit 99d1ed2) and the added `PLAYGROUND.md`. So the playground's line numbers match SHIP exactly. Anchors below use `S:` for SHIP/PG-main `index.html` and `O:` for OLD `flipbook-master-print.html`.

**The main correction:** the old flipbook and the shipping viewer are mostly the same code. The tap and drag turn engine, the sine timing, the 24° paper bend formula, the shadow formulas, the 10° landing crossfade, the glide math, and the drag handling all match nearly line for line (compare O:783-818 with S:4981-5030, and O:961-1087 with S:5535-5721). Interior paper turns use identical geometry and timing in both. The real differences are:
- cover ("board") material
- the renderer (WebGL mesh became 2D canvas strips)
- drag-start decode gating
- the landing workload

---

## 1. Parameter matrix

Cover A, Cover B and drag-raf equal SHIP except where a cell says otherwise.

| Parameter | OLD (print flipbook) | SHIP (v13.57) / PG main | Cover A `7f0896dd` | Cover B `a031d729` | drag-raf `873031ae` |
|---|---|---|---|---|---|
| **Turn triggers** | Arrow buttons O:922-923. Keys ←/→/Home/End, repeat ignored, O:924-931. Tap by side O:1033-1040. Drag starts at \|dx\|≥8 and activates **synchronously** O:985-1003 | Same buttons S:5467-5468. Same keys plus overlay/form guards S:5469-5503. Same tap rule plus a slideshow-pause tap S:5634-5646. Drag starts at \|dx\|≥8 but is **gated on decode**: `gateDragFlip` S:4546-4565 / S:5576,5586 (up to 4 `ensureIndices` rounds, each capped at 1.2 s, S:4482-4505). Releasing while gated becomes flipNext/Prev if \|dx\|>60 or a flick (S:5613-5626). Adds a `lostpointercapture` end S:5727 | = SHIP | = SHIP | = SHIP. Activation after decode now **queues** the paint instead of painting directly (diff at S:4558) |
| **Easing, paper** | `easeInOutSine` = 0.5−0.5·cos(πt), O:363, O:793. Used for all leaves (no materials) | Same function S:3918, used for paper S:5012 | = SHIP | = SHIP | = SHIP |
| **Easing, board (cover)** | n/a. Covers use paper sine O:793 | `easeHeavy` = 0.5−0.5·cos(π·t^1.15), S:3817, S:5012. Peak speed moves to t≈0.571 (sine peaks at 0.5) | `easeInOutSine` for **every** Hardcover leaf (S:5012 replaced) | = A | = SHIP |
| **Easing, magazine** | Linear corner path `F = F0+(F1−F0)·raw` O:831. Camera linear O:867 | Paper linear. **Board `easeHeavy`** S:5064. Camera stays `linearEase` S:5112/5148/5702 | Unchanged (animateTurnF untouched) | Unchanged | = SHIP |
| **Duration, tap turn** | `FLIP_MS` = 950 (reduced 320) O:360. Magazine 700 (reduced 320) | Paper 950. **Board 950×1.18 = 1,121 ms** (reduced 320×1.1 = 352) S:3911, S:4932, S:5116/5152. Magazine paper 700, board 700×1.18 = 826 (reduced 352) S:5112 | Hardcover board ×1.0 = **950** (reduced **320**, previously 352). Magazine board keeps 1.18/1.1 | = A | = SHIP |
| **Duration, drag settle** | max(140, 950·\|Δθ\|/180) O:1080. Magazine max(120, 700·\|ΔF\|/2W) O:1068 | Same × `leafDurMul` S:5712, S:5700 | Board ×1.0 in Hardcover | = A | = SHIP |
| **Bend model / renderer** | **WebGL** triangle strip, **M = 24 columns** with shared vertices (O:220, O:254-258, O:346). Vertex-shader perspective PERSP 2300 (O:222, O:230-233). Texture pre-scaled to 1024² with mipmaps, uploaded at every turn start (O:290-302, O:507-512). Fallback: CSS-3D `rotateY` with no bend (O:720) | **Canvas 2D**, **64 slices** (S:3851), each an axis-aligned `drawImage` rectangle from full-resolution source (S:3852-3866). Same projection function `projLeaf` S:3822-3832. No per-turn texture upload | = SHIP | = SHIP | = SHIP |
| **Flex / tip lag** | lag = ±24°·sin(π\|θ\|/180), **all leaves including covers** O:221, O:312 | lag = ±24°·**leafFlex**·sin(…) S:3797, S:3849. Paper flex 1 (24° at mid-turn); **board flex 0** (rigid) S:4932-4933 | Board 0 | **Board 0.2 → 4.8° max** in Hardcover; magazine board 0 | = SHIP |
| **Leaf face shading** | Dim s·0.13 plus tip highlight s·0.05, smoothstep 0.93→1.0 in texture u, for **all leaves** O:237, O:718 | Paper: dim s·0.13 plus highlight, linear gradient 0.9→1.0 in **screen x** spine→tip (S:3868-3878, S:4902). **Board face: 0 dim, 0 highlight** S:4901-4902 | = SHIP (board face still flat) | = SHIP (board face still flat) | = SHIP |
| **Shadows during turn** | shadeL/R opacity s·0.20 / s·0.34 O:724-725. Cast band width P(0.55+0.55s), opacity 0.32s, tracks bent tip O:727-736. Magazine bands MAX 0.22 O:654-680 | Same formulas × `leafShadeMul` (board 1.35) S:4903-4917, S:4836. Board skips the magazine face roll band S:4860. Board cast shadow follows the rigid tip | = SHIP | = SHIP; cast tip follows the 0.2 bend | = SHIP |
| **Drag painting path** | Paints on every pointermove (poseLeaf/poseTurn) O:1015-1025 | **Paints on every pointermove** S:5596-5606. Decode-ready activation also paints directly S:4558 | = SHIP | = SHIP | **One rAF paint per frame** with the newest drag (`queueDragPaint`); pointermove only queues. Release cancels the queue and computes theta/F and glide from the newest sample. Mode switch cancels |
| **Swap / end-of-turn timing** | Swap at ≤10° from touchdown O:782, O:801-806 → `done` = commit + `render()` while `animating` (O:863). Leaf fades as (remain/10)^0.65. Finish: hide, `animating=false`, chained turn O:807-816 | Same 10° swap S:4970, S:5020-5025. **Sine: swap at t=0.8485, about 144 ms before the end. Board easeHeavy: t=0.867, about 149 ms before.** `finish` adds a watchdog of dur+600 ms (S:5004), try/catch, `maybeRespeak`, `flushWarm` (S:5001) and the slideshow S:4987-5003. Magazine swaps at p≥0.93 S:5033, S:5067-5071 | = SHIP (board swap now same as paper) | = A | = SHIP |
| **render() at swap** | Images, glide (skipped while animating), counter, `warmAround` (decodes **immediately**, window c−3…c+4) O:435-456 | Images, counter, 4 chrome refreshers, `warmAround` (**deferred** while animating S:4587), `placeSave` (2× localStorage), `updateShelfAmbient`, `syncScrollView` S:4615-4638 | = SHIP | = SHIP | = SHIP |
| **Cover open/close** | Treated as a paper leaf: 24° bend, shading, 950 ms sine. Glide −P/2→0 recentres the book across the turn O:364, O:795 | Board: rigid, flat face, 1,121 ms easeHeavy, shadows ×1.35. Same glide. In focus (portrait) mode the camera tweens with **sine** (S:5116) while the board leaf runs **easeHeavy**, so the camera leads by up to **7.8 %** of its travel at t≈0.47 | Sine + sine: camera and leaf back in sync, still rigid | Plus 4.8° bend | = SHIP |
| **Reduced motion** | `prefers-reduced-motion` gives FLIP_MS 320 and magMs 320 O:359-360, O:691 | Same 320. Board 352 (×1.1). Slide 180 ms S:3949 | Hardcover board 320 | = A | = SHIP |
| **Partial-drag release / settle** | Complete if θ≤−65° (next) / ≥−115° (prev) or a flick \|v\|>0.45 px/ms over 90 ms (O:1043-1078). Leaf eases from **zero speed** to the target. Glide uses the angle-fraction formula (see 2e). Same off-centre landing | Identical thresholds and formula S:5671-5718 (× leafDurMul) | Board settles use sine at ×1.0 | = A | Start angle and glide come from the newest pointer sample, not the last painted pose. **Glide formula unchanged; off-centre landing still present** |

---

## 2. Verdicts on the prior agents' claims (checked against SHIP `1a29eec`)

**(a) Board 950 ms × 1.18 = 1,121 ms with cosine `easeHeavy`; paper 950 ms sine. CONFIRMED, with refinements.**
- `FLIP_MS = REDUCED ? 320 : 950` (S:3911). Board `leafDurMul = REDUCED ? 1.1 : 1.18` (S:4932), applied at S:5116/5117, S:5152/5153 and the drag settle S:5712.
- `easeHeavy(t) = 0.5 − 0.5·cos(π·t^1.15)` (S:3817), selected at S:5012. It is a time-warped cosine, not a plain one. Speed peaks at t≈0.571 (paper peaks at 0.5) and the peak is 0.266°/ms against 0.298°/ms for paper. So the board starts slower, peaks later and lower, and decelerates more steeply.
- Paper uses `easeInOutSine` = 0.5−0.5·cos(πt) (S:3918). Despite the name, that formula is also a cosine.
- Missing from the claim:
  - Reduced-motion board is 352 ms.
  - Magazine board turns are 826 ms with `easeHeavy` (S:5064, S:5112), while magazine paper is linear.

**(b) Board leafFlex = 0, paper = 1. CONFIRMED** (S:4932-4933).
- Missing from the claim: a board also gets `leafShadeMul` 1.35 (S:4932).
- Its face dim and tip highlight are forced to 0 (S:4901-4902).
- In magazine mode its face roll band is skipped (S:4860).
- So the cover is rigid **and** unshaded, while the old flipbook shaded and bent covers like paper (O:718, O:312).

**(c) Old bend came from a WebGL mesh; shipping kept the same bend integral on 2D canvas strips. Bend math CONFIRMED; strip count CORRECTED.**
- OLD is WebGL with **M = 24** columns, 25 vertex pairs and 48 triangles (O:220, O:249-258, O:309-346), with perspective done in the vertex shader (O:230-233).
- SHIP draws **64** slices (S:3851) on Canvas 2D.
- The math matches term for term:
  - x = W + (W/lag)(sin(θ+lag·s/W) − sinθ)
  - z = (W/lag)(cos(θ+lag·s/W) − cosθ)
  - projection (x−W)·2300/(2300−z) about the window centre
  - Compare O:312-320 + O:230-233 with S:3822-3832 and S:3849.
- **Rasterisation differs:**
  - OLD draws a continuous mesh. Neighbouring columns share vertices, so the silhouette is a 24-segment polyline.
  - SHIP draws each slice as an **axis-aligned rectangle** sized from that slice's spine-side edge only (`dy = t0.y`, `dh = b0.y − t0.y`, with +1 px overlap; S:3856-3865). The top and bottom edges are therefore 64-step staircases rather than trapezoids. The steps are sub-pixel to about 0.7 px per edge step, depending on page size.
  - OLD samples a 1024² mip-mapped texture (O:290-302). SHIP samples the full-resolution source image (about 1750² per the audit) on every slice of every frame.
- Small differences in the face shader:
  - OLD highlight is smoothstep(0.93, 1.0) in texture u (O:237).
  - SHIP uses a linear 0.9→1.0 gradient in screen x (S:3870-3876).
  - OLD's y is built from W (square pages, O:325-326); SHIP uses H (any aspect ratio).

**(d) Swap at 10° before touchdown; render() does two synchronous localStorage writes via placeSave; decode-warming restarts at settle. CONFIRMED.**
- `SWAP_DEG = 10` (S:4970). The swap test at S:5020-5024 calls `onSwap` while `animating` is still true.
- `onSwap` is `done` = commit + `render()`, at S:5104, S:5143 and the drag path S:5715-5718.
- `render()` calls `placeSave()` at S:4632, and `placeSave` does `localStorage.setItem` twice: place, then `:focus` (S:4061-4069). It is skipped only when `placeHold || !rememberPlace`.
- `warmAround` returns early while a turn is in flight (S:4587). `finish()` calls `flushWarm()` (S:5001, S:5053, swipe S:5254), which calls `warmAround()` (S:4609-4613).
- Timing: the swap fires at about 84.9 % of a paper turn (about 144 ms before the leaf settles) and about 86.7 % of a board turn (about 149 ms before).
- Context the prior audit left out: the **old flipbook used the same 10° swap with render-at-swap** (O:782, O:801-806, O:863). The new landing load comes from what SHIP's `render()` now does: chrome refreshers, placeSave, ambient, scroll sync (S:4624-4637 vs O:444-456). OLD's render actually started decodes *immediately* at the swap (O:455 → O:435-441), so SHIP's turn-quiet deferral is a v13.57 improvement, not a regression.
- The audit's line anchors for finding 13 (4981, 4970, 5020-5024, 5104, 5143, 5715-5718, 5033, 4990-4992, 4615-4638, 4586, 4609, 4061, 5676-5690) all check out against this snapshot.

**(e) Partial-drag release can land a spread off-centre (~70.75 px). CONFIRMED real; formula derived here.**
- The settle passes `gFrom = gNow` (the glide at release, S:5692) to `animateLeaf`. That function interpolates glide by the fraction of a **full** 180° covered since the release angle: `frac = |ang − fromDeg|/180` (S:5014-5015).
- A partial drag only has |target − θ| < 180 left to travel, so on the last frame the glide stops short of `gEnd`.
- Let x = |θ_release − θ_start|/180 and g0, g1 be the start and end glide. Then:
  - Complete: final glide = g1 − (g1−g0)·x(1−x)
  - Cancel: final glide = g0 + (g1−g0)·x(1−x)
- The error is |g1−g0|·x(1−x). It only exists when the glide changes, meaning **cover or back-cover turns in two-page layout**: |g1−g0| = P/2 by `glideFor` (S:3919), and in focus mode the glide is always 0.
- Worst case is **P/8**, when release happens at θ = 90°. **70.75 px = 566/8**, which is exactly a 566 px page released at 90°.
- Cancels only happen below 65° (x < 0.361), so a cancel can be off by up to 0.115·P.
- The offset **persists**:
  - `render()` skips the glide while `animating` (S:4623), and `finish()` never re-renders the glide.
  - The book stays off-centre until the next turn's first `poseLeaf(…, g0)` (S:5115) snaps it to `glideFor`, which is a visible jump, or until `fit()` on resize.
  - Magazine is unaffected: it interpolates with `er`, which reaches 1 (S:5064-5065).
- **Not a regression:** the identical formula is in OLD (O:795, O:1060, O:1083). drag-raf keeps it, as its own notes admit.

**(f) Baseline drag paints on every pointermove. CONFIRMED.**
- Hardcover: `poseLeaf` at S:5603-5606. Magazine: `poseTurn` at S:5596-5600. Both run directly inside the pointermove handler (S:5535).
- The decode-ready activation also paints directly (S:4558).
- The same is true of OLD (O:1015-1025), so this is not a difference from the reference.

---

## 3. Prototype branch scope audit

**PG main vs SHIP:** `index.html` is byte-identical (`cmp`). The tree differs only in `README.md` and the added `PLAYGROUND.md`. **Clean snapshot.**

**Cover A `7f0896dd` vs parent (PG main): in scope, no hidden changes.**
- Files: `index.html` (2 lines) and a new `NOTES-cover-timing.md`. `git diff --check` is clean, and no whitespace, version string or data blob changed.
- S:4932: board `leafDurMul` becomes `isMag() ? (REDUCED ? 1.1 : 1.18) : 1.0`.
- S:5012: `var e = easeInOutSine(raw);` now applies to every Hardcover leaf.
- Behaviour changes to know about, all within "board duration/easing" and all disclosed in its notes:
  1. **Reduced-motion** Hardcover cover turns drop from 352 ms to 320 ms.
  2. The easing change also covers **drag-release settles** of covers, because `endDrag` uses `animateLeaf` (S:5715).
  3. The **focus-mode camera/leaf desync** goes away (both sine).
- Magazine is untouched, since `animateTurnF` S:5064 still uses `easeHeavy`.
- Comments elsewhere ("a touch slower and heavier, duration +18%", S:3798-3812) are now stale in this variant; this is documentation only.

**Cover B `a031d729` vs A, and vs PG main: in scope, no hidden changes.**
- vs A: one source line (S:4932, `leafFlex = isMag() ? 0 : 0.2`) plus 17 added lines in NOTES.
- vs PG main: exactly the A lines plus that one. `diff --check` is clean.
- Max tip lag = 24°·0.2 = 4.8°, as claimed.
- Also note:
  - The bend applies to drag-held covers as well.
  - The face highlight stays suppressed because `poseLeaf` still passes `bend = 0` for board (S:4902). So B adds bend geometry without the shading that sold the bend in OLD.
  - The cast-shadow tip now uses the 0.2 lag (S:4910-4915), as disclosed.

**drag-raf `873031ae` vs PG main: runtime changes are in scope, with three notes.**
- Files:
  - `index.html` (+35/−13)
  - new `NOTES-drag-raf.md`
  - **new `scripts/check-drag-raf.cjs`**: a 73-line Node harness that is not loaded by the viewer. It is not runtime, but it is an extra file beyond "drag painting only".
- Hunks:
  1. S:4558: decode-ready path `poseDragAt(d)` becomes `queueDragPaint(d)`.
  2. S:5441 `setReadingMode`: adds `cancelDragPaint()`.
  3. New `dragPaintRaf` / `cancelDragPaint` / `queueDragPaint` after S:5508. The callback checks `drag === d && d.active && turnGen === gen`.
  4. pointermove: the magazine and hardcover paint blocks (S:5592-5606) are replaced by `queueDragPaint(drag)`.
  5. `endDrag`: cancels the queue. For an active flip it recomputes `drag.theta` (hardcover) or `drag.F` plus `calcFold` progress (magazine) from the newest sample, and computes `releaseGlide`. Later, `gNow = releaseGlide` overrides the DOM-parsed glide (new line after S:5692).
- No changes to easing, durations, flex, strips, shadows, camera targets, swap or render. `diff --check` is clean.
- Notes:
  - (i) **Release semantics changed slightly.** The settle now starts from an angle that may never have been painted, at most one frame ahead of the last painted pose. That can be a one-frame jump at release, which is the intended trade-off.
  - (ii) For magazine, release now recomputes `drag.F`, while `drag.p` stays at the last painted value. `drag.p` is not read in `endDrag`, so there is no functional effect.
  - (iii) On activation, the first leaf paint now waits for rAF, after `setupTurn` has already swapped the under-page (S:4945) and `showLeaf()` has shown a cleared canvas. Per the HTML event loop, rAF runs before the next paint, so this should not produce a bare frame. Still, it reverses the "cover the swapped base in this same task" rule the turn code relies on (S:5115), so it deserves a device check.

**Verdict:** all three branches are clean of out-of-scope runtime edits. The only extras are additive NOTES files and the drag test harness. One disclosed side effect goes slightly beyond the nominal scope: Cover A's reduced-motion cover timing (352 → 320 ms).

---

## 4. Uncatalogued differences, OLD vs SHIP (all anchored)

1. **Renderer cost per frame.**
   - OLD: one `drawElements` of 48 triangles from a 1024² mip-mapped texture (O:346). The textures were rebuilt synchronously at turn start: two 1024² `drawImage` calls plus `texImage2D` plus `generateMipmap` (O:290-302 via O:507-512), so OLD paid at the start of a turn.
   - SHIP: every frame does a full `clearRect` of a canvas of about (1.76·bookW)×(1.9·H)×dpr (S:3834-3837, S:4666-4680), then **64 `drawImage` calls** from the full-resolution source with `imageSmoothingQuality = "high"` (S:3853-3866), plus 0–2 `fillRect`s.
   - Sol's software-Chromium proxy measured 12.4–19.8 ms per pose readback-inclusive (audit §10). That is not device evidence, but it is the only measurement available.
2. **Leaf freeze when the face isn't decoded.** `drawLeaf2D` returns before clearing if the face image isn't ready (S:3843-3846), so the leaf **holds its previous pose** for that frame. OLD always drew from an already uploaded texture. This is a SHIP-only source of visible stalls mid-turn, including in the drag path.
3. **Drag start latency and jump.**
   - OLD calls `setupTurn` and shows the leaf in the same pointermove (O:994-1003), and the leaf follows from the 8 px threshold on.
   - SHIP waits for `dragTurnReady` (S:4509-4518, S:4546-4565). While it waits, nothing is painted (S:5589). On activation the first pose jumps straight to the finger's current position (S:4558 → S:4533-4545).
   - Each wait round can take up to 1.2 s (S:4503), up to 4 rounds.
4. **Camera vs leaf desync on covers in focus/portrait mode.**
   - Camera: `tweenCam(…, FLIP_MS·1.18, easeInOutSine)` (S:5116/5152/5714).
   - Board leaf: `easeHeavy` (S:5012). Max divergence is 7.8 % of the camera's travel (travel = P, from −P/2 to +P/2 per S:3924-3929) at t≈0.47.
   - In magazine the gap is worse: linear camera (S:5112) against an `easeHeavy` board.
   - OLD used sine for both (O:871/793), so it was in sync.
5. **Landing workload.** Both render at the 10° swap. SHIP's `render()` adds `refreshTextChrome`, `refreshCompareChrome`, `refreshListenChrome`, `refreshMarkChrome`, `placeSave` (2 synchronous localStorage writes), `updateShelfAmbient` and `syncScrollView` (S:4627-4637). All of this runs during the final ~145 ms crossfade, while the leaf is at its slowest and most watched.
6. **Turn-start extras.** SHIP calls `playTurnFx()` at the start of every animated turn (S:5006, S:5058; sound path S:4330+); OLD has no turn sound. SHIP also arms a watchdog timer for each turn (S:5004).
7. **Warm window.** OLD decodes c−3…c+4 immediately at every render, including mid-landing (O:435-441). SHIP uses ±3 on screens ≤600 px wide, otherwise ±6 (S:4584), deferred until settle (S:4587, S:4609). Not a regression, but a different contention pattern: SHIP decodes start at settle, right when a queued next turn begins (S:4994-5001: the chained `flipNext` runs before `flushWarm`).
8. **Second turn triggered mid-turn: same in both.** A one-deep `pendingDir` queue (O:854/860; S:5085/5090/5101) where the latest tap wins. The chained turn starts only after the full `finish()`, including the fade. A press during a flip is tap-only (O:957; S:5530). Neither interrupts or overlaps a turn.
9. **Settle/bounce at landing: same in both.** Neither overshoots or bounces. The leaf eases to zero speed and fades out over the last 10° with (remain/10)^0.65 (O:806; S:5025). Release velocity is thrown away in both: the settle restarts the ease from zero speed (O:1083; S:5715).
10. **Under-page reveal: same in both.** `setupTurn` swaps the revealed base page in at turn start under the covering leaf (O:757/770; S:4945/4958), and the first pose is painted in the same task (O:870/894; S:5115/5151).
11. **Shadow sweep.** The formulas are identical (O:724-736 vs S:4903-4917). Board turns multiply them by 1.35 and use the rigid tip for the cast band. So on covers SHIP shows a **darker** shadow under a **flat, unshaded** leaf, a contrast OLD never had.
12. **Page-edge treatment.** SHIP has stair-stepped top and bottom leaf edges plus the +1 px slice overlap (S:3859-3862), against OLD's continuous anti-aliased mesh edge (`antialias:true`, O:229). Minor at phone sizes.
13. **Non-square books.** SHIP uses `pageH` throughout (S:3840, magazine `turnStartF` S:4876). OLD assumed square pages (O:325-326, O:689). This affects geometry only, not feel.

---

## 5. BOTTOM LINE

Ranked by how plausibly each one explains "clunky, rigid next to the old flipbook". Each item cites its code evidence.

First, the context. Interior paper turns are mathematically the same in both viewers: same 950 ms sine, same 24° bend, same shading and shadows, same 10° crossfade (O:783-818 vs S:4981-5030). So the felt difference has to come from the five items below.

1. **The covers are deliberately rigid, flat and heavy. The old flipbook turned them like paper.**
   - SHIP sets board `leafFlex = 0`, `leafDurMul = 1.18` (1,121 ms) and `easeHeavy` = 0.5−0.5·cos(π·t^1.15) (S:4932, S:3817, S:5012).
   - It also forces the face dim and highlight to zero (S:4901-4902) while darkening the shadows ×1.35 (S:4917, S:4836).
   - OLD bent every leaf, covers included, with a 24° tip lag and shaded it, at 950 ms sine (O:312, O:718, O:793).
   - The cover is the first and last turn every reader makes. In SHIP it is a slower, later-peaking, unshaded flat board swinging over a darker shadow.
   - Cover A restores only the timing. Cover B adds 4.8° of bend, a fifth of OLD's 24°. **Neither restores the face shading** (S:4902 is untouched).
2. **The renderer changed from one WebGL draw to 64 Canvas-2D `drawImage` calls per frame from full-resolution art.**
   - The bend formula is the same (verified), but OLD drew a 24-column mesh from a 1024² mip-mapped texture in one call (O:220, O:290-302, O:346).
   - SHIP clears and redraws a large canvas with 64 slices sampled from the ~1750² source on every frame (S:3851-3866).
   - This is the only rendering change that touches interior pages, so it is the leading suspect for uneven frame pacing during paper turns on phones. That is a source-level inference; the only measurement is Sol's software proxy (audit §10).
3. **Stalls built into the turn path that OLD doesn't have.**
   - (a) If a face image isn't decoded, `drawLeaf2D` keeps the previous frame, so the leaf freezes (S:3843-3846).
   - (b) A drag doesn't pick up the page until its images are decoded. It then jumps to the finger (S:4546-4565, S:5589, S:4558). OLD grabs the page at the 8 px threshold (O:994-1003).
   - Both read as hitches or a rigid feel under the finger.
4. **Heavier work lands in the last ~145 ms of every turn.**
   - Both viewers render at 10° before touchdown. That is about 144 ms before the end for paper and about 149 ms for board, by the easing math.
   - SHIP's `render()` adds four chrome refreshers, two synchronous localStorage writes (`placeSave`, S:4061-4069, S:4632), ambient-background and scroll-view sync (S:4624-4637).
   - All of that runs while the leaf is crossfading at its slowest, most visible point. OLD did only images, counter and a decode kick (O:444-456).
   - Decode warming now restarts at settle (S:5001), exactly when a queued next turn starts (S:4994-5001).
5. **On covers in portrait/focus mode, the camera and the leaf run on different curves.** The camera uses sine (S:5116) and the board uses `easeHeavy` (S:5012), so the view leads the page by up to 7.8 % of its travel. In magazine mode the camera is linear against an `easeHeavy` board (S:5112, S:5064). OLD kept both on sine.

These are not causes of the gap, though prior notes implied otherwise:
- The ~70.75 px off-centre landing is real. It equals P/8 for a 566 px page released at 90°, from `frac = |ang−from|/180` (S:5014), and the book stays off-centre until the next turn snaps it (S:4623, S:5115). But OLD has the identical bug (O:795, O:1060, O:1083).
- Painting on every pointermove is likewise identical in OLD (O:1015-1025 vs S:5596-5606).
- Both are worth fixing, but neither explains why OLD feels better.
- None of the three Sol branches touches items 2–4.
