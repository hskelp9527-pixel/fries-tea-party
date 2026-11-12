# Current chapter, 2026-11-12

**All seventeen consolidated production checks pass; final independent acceptance is pending.** The frozen candidate is `/assets/index-sTRL8ZKV.js` (SHA-256 in `art/review/2026-11-11/revision/final/checks.json`). Its unskipped 432.3-second keyboard route covers all three gears, checkpoint reload, repair, 53/53 visible-cue rhythm, clean Chinese results and replay. The full two-page frame audit records a 56.2 ms maximum and zero frames above 100 ms. The separate optional challenge route, 71-clip skeletal-envelope audit, 284 skin-pose samples, twelve drink poses, natural shrink/exit and normal-time repeated interactions also pass.

The earlier independent reviewer accepted the ordinary functional, connected-home and Chinese-text foundation. The latest source includes palm-based spoon grip, paper-corner pinch, a deeper Hatter bend, correct first-person self-hiding, sloped panorama foreground and a visible cake morsel with eating close-up. Final fresh art scoring remains pending: the configured native reviewer model is unavailable, and a supported Codex model choice is awaiting the user's answer. External Claude review was not executed after automatic approval declined exporting project materials without explicit authorization. No current total score is invented. Historical scores apply only to the snapshots named in their reports. See [the production review and handoff](review-production-2026-11-12.md).

This standalone three.js chapter is the active game on `grey-box`. Local media and revised source models remain outside the public repository. The sibling Unity prototype and existing worktrees are separate.

Read [the implementation record](optimization-2026-11-11.md), [the ordinary-play contract](ordinary-play-contract.md), [the gameplay revision](gameplay-revision.md), and [the per-file sizes](asset-sizes-2026-11-11.md). Individual evidence is indexed in `diagnosis-completion.json`. November 3 and the initial November 11 visual reviews are historical baselines.

Standard play uses three reachable size-specific gears, size toys, scored rhythm, results/replay, pause/settings, safe checkpoints, recorded Foley and live Chinese/English product text. Three short gear challenges are part of standard play (`?nochallenges` skips them). Revised proportions, contact IK, posture masks, secondary bones and surface-fitted speech mouths are implemented. The cottage is a connected furnished home with a readable E-triggered note. Art being implemented does not establish its acceptance.

## Commands

- `npm run dev -- --port 5199 --strictPort`: development game.
- `npm run build` then `npm start`: gzip production server on port 5200.
- `npm test`: unit checks and the entire chapter through real input; starts the development server if necessary.
- `npm run test:unit`: scheduler, rhythm, quality, layout and measured prop placement checks.
- `npm run assets`: optimized variants from the retained source art.
- `node scripts/asset-report.mjs`: decode all models and regenerate sizes.
- `node scripts/audit-contacts.mjs --capture`: all clips at 30 Hz plus front/side images.
- `node scripts/audit-skin.mjs`: sampled skin-surface stretch checks.
- `node scripts/capture-review.mjs` then `python scripts/compose-review.py`: eighteen views, three no-post references and six location details.

Set `TEA_URL` to `http://127.0.0.1:5200` for production performance checks. Run one GPU benchmark at a time. The asset manifest chooses a fresh optimized variant, then a revised authored model, then the original. Rebuild after changing source art.

Focused views remain available: `?start=explore`, `?start=song`, `?start=ending`, `?anims`, `?liquid`, `?perf`, `?frame=s01` through `s16`, `fp_small` and `fp_giant`. The internal diagnostics interface requires `?diagnostics`.
