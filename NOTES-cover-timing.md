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
