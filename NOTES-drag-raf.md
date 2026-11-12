# Experiment: rAF drag leaf painting

Base: main @ 99d1ed28bb3e9a3a8ce695c28624edd14e4aedb2 (v13.57).
Not a shipping candidate; Trinity must evaluate through the Lab.

Tried: keep input samples, direction/activation and velocity history immediate; coalesce Hardcover and Magazine leaf poses into one requestAnimationFrame callback using the latest drag object. Decode-ready callbacks use the same scheduler. Swipe/Simple and focus-slide behavior stay on their existing paths.

Release cancels the pending paint and derives the settle start from the latest finger position without painting off-frame. A mode switch cancels the frame; identity and turn-generation checks reject stale callbacks. No change to 64 strips, bend integral, rendering technology, timing profiles, artwork, shadow formulas or camera targets.

Found: baseline pointermove directly calls poseLeaf/poseTurn for each active move; an async decode-ready callback can also call poseDragAt outside rAF. A controlled 20-move burst now has zero leaf paints in the event task and exactly one on the next frame. Six deterministic scenarios pass: Hardcover/Magazine bursts with release before the next paint, release before any frame, superseded turn, replaced drag object, and reverse/cancel settlement. The test uses actual source handlers with mocked browser primitives; it does not measure real event delivery cadence or device feel.

Validation: node scripts/check-drag-raf.cjs; all inline scripts parsed with Node vm.Script. Real-browser validation is recorded in the audit when complete.

Interaction with existing landing bug: animateLeaf's frac = abs(ang - fromDeg) / 180 still interpolates only the remainder of a partial drag, leaving the known off-center landing. This patch preserves that formula and does not fix the reported 70.75 px case. Release start now uses the newest input rather than the last painted pose, so that repro's exact pixel offset may change with event cadence. Save/cancel issues are not repaired; active-leaf pointercancel can still commit because baseline endDrag ignores cancelled in that path. render() does call placeSave for committed leaf drags; focus-slide's direct path is separately missing that save (audit 13).

Recommend: take the small scheduling change through device tests for capture loss, mode changes, reverse drags and decode-delayed activation before harvesting. No iPhone smoothness claim.
