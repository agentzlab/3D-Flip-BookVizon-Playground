# Cover timing reference A — rigid, sine

Base: main @ 99d1ed28bb3e9a3a8ce695c28624edd14e4aedb2, v13.57.
Tried: Hardcover board multiplier 1.0 with sine easing, leafFlex 0.
Normal-motion full turn is 950 ms (formerly 950 * 1.18 = 1121 ms).
The reduced-motion base duration is preserved and now also uses multiplier 1.0.
Magazine retains its original duration/easing; paper remains unchanged.

Found: this isolates the heavy board timing from board geometry. No measured
feel improvement is claimed. The camera targets and camera easing code,
artwork, 64 strips, bend integral and all shadow formulas/multipliers
are unchanged. Camera duration follows the same existing leafDurMul input.
This is a reference diff for comparison, not a ship candidate.

Validation: replacement counts, inline-script parse, exact allowlisted
diff against main. Device visual comparison remains required.
Recommend: compare A against main on iPhone, including forward/back cover
turns and partial drags. The known partial-drag glide bug is preserved.
No WebGL/CSS-3D retrial; keep the Canvas 2D opacity protection.


## Cover timing reference B — partial flex

Same as A, with Hardcover board leafFlex 0.2 (one fifth of paper).
Maximum tip angular lag is 24 degrees * 0.2 = 4.8 degrees at mid-turn.
Magazine stays at flex 0. Board face shading/highlight remain suppressed.
No shadow formula or strength is changed; the existing cast-shadow formula
follows the newly bent tip, so its position changes with geometry.
Baseline comments describing all boards as rigid apply to main/reference A;
this deliberately isolated experiment is the documented exception.

Found: this separates a small bend from timing; it is not a paper-like
full-flex cover. This is a reference diff, not a ship candidate.
Validation: exact single source replacement from A, parse and diff checks.
Recommend: compare A/B on real iPhone for perceived stiffness, edge shape,
end-turn fade and under-page bleed; no device result is claimed.
