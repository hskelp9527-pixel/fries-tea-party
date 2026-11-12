# Current chapter, 2026-11-12

The chapter is playable from the title to the results card on `grey-box`. `npm test` (16 unit checks and the input-driven route through all three gear challenges, checkpoint reload, repair, song, ending and replay) passes on the last commit. Deployment is handled outside this repository.

## What changed on November 12

- **Look:** authored golden-hour palette in `src/look.js` (green lawn, sunset sky gradient, cool violet shade); sunlit terraces and canopy; plants shrink away from a close camera. See `color-script.md`.
- **Places:** the fountain grotto is a modelled syrup cave (`scripts/fountain-grotto.py`); the cottage interior has a hearth, wainscot, beams and shaped furniture (`src/cottage.js`).
- **Play:** the three gear challenges are short, illustrated and on by default (`?nochallenges` opts out); cakes stand beside the grotto and the tree; small Fries is faster; the rhythm window is ±0.12 s with an early cue; the tea service is a rhythm warm-up the Hare offers after the first gear; results show a grade, conversations, challenge times and the warm-up score. See `gameplay-revision.md`.
- **Fixes:** Enter no longer cancels the song; heads no longer jitter or whip while talking or drinking; a bitten cake regrows; held cups and the watch return to their authored pose; every floating prop avoids Fries at any size and the hosts.

## Checks

- `npm test`: unit checks, then the whole chapter through real input (starts the dev server on 5199 if needed).
- `node scripts/check-fixes.mjs`: head angular speed while talking and drinking, cake and cup restore, floating clearance round giant Fries. Needs the dev server.
- `node scripts/capture-review.mjs` (`TEA_OUT=<folder>`, `--quick --only=s01,s14`): the eighteen review frames with the perf panel recorded per frame.
- `node scripts/capture-challenges.mjs`, `node scripts/capture-cottage.mjs`: pictures of the challenges, results card and every room.

Budget to hold: under 400 draw calls and 2.2 M triangles in `s14` at high quality.

## Known weak spots

- The rhythm warm-up's cue timing against the music and its glint position have not been checked in play.
- Grotto syrup and cobbles are flat and dark; cottage stools and table legs have no collision.
- The Hatter's face is dim under his hat brim in `s01`.
- Stepping stones and grass tufts are low-poly up close.
- `acceptance-status.json`, `diagnosis-completion.json` and the `review-*` documents describe the November 11-12 candidate before these changes.

Focused views: `?start=explore`, `?start=song`, `?start=ending`, `?anims`, `?liquid`, `?perf`, `?frame=s01` to `s16`, `fp_small`, `fp_giant`; `?diagnostics` exposes `__tea`.
