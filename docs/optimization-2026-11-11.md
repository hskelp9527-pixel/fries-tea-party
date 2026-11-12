# Diagnosis implementation and acceptance, 2026-11-11

The frozen November 12 production candidate passes all seventeen consolidated automated checks. Final independent art scoring and acceptance remain pending because the configured reviewer model cannot start; a supported model choice is awaiting the user. External Claude review was not executed without data-transfer authorization. The ordinary functional, full-home and Chinese-text foundation was independently accepted earlier. The former 4.0/10 applies to a rejected older snapshot, not this candidate. Current measured results below are scoped to the delivered production build; `diagnosis-completion.json` separates tested implementation from creative tasks still awaiting independent review.

## Performance and assets

Fountain sheets and pour streams deform on the GPU with analytic normals. CPU updates cover scalar uniforms and a small number of drops/rings. Frozen, off-screen and distant liquids skip simulation work. Floating objects and loose table props share instanced geometry; cups retain their painted/PBR atlas. The dressed table is one draw. Seven flower species use rendered front/side atlas cards beyond ten metres, with a noise transition between nine and eleven metres. Grass and foliage fade with distance.

Small props and flowers do not cast shadows. A 2048 static sun map updates at half-metre camera-grid changes; a separate 1024 map follows moving actors each frame. Both feed one light contribution. Prewarming covers the actual MRT and cinematic pipelines, hidden props and floating types. Automatic quality calibrates before Start, then can lower further after sustained slow frames. All three manual presets remain selectable.

All 63 GLBs were Meshopt encoded, decoded again and inspected. WebP maps are capped at 1024 pixels for characters and 384 for props. Model files total 114,393,428 source bytes and 14,714,252 optimized bytes. All 137 actual WAV lines become 2,792,532 bytes of Opus from 26,652,810 bytes. The diagnosis's 274 counted URL modules and their media requests separately. Five selected music tracks use 80 kbps Opus; speech uses 40 kbps and a bounded 24-line decoded cache. The gzip production server invalidates cached responses when a build changes.

## Progression and play

The tree pickup uses a continuous lawn region without requiring visibility through its own trunk. The hall prioritizes the facing gear; its note is read once. A cut arch in the fountain fits the real small controller. Scripted walks use collision movement. A scene owner restores input, camera and registered cleanup actions through `finally`, including injected failure recovery.

Ordinary play collects three reachable size-specific gears. Optional `?challenges` encounters trace warm teeth, cross syrup openings or compare ticking watches; three mistakes offer a retry. Clues advance at 45/80/115 seconds and are both written and spoken. Giant footsteps bounce cups, giants can catch drifting cups, and small Fries feels the Dormouse's breath. Chairs stay seated until E or movement. Repeat tea/cake uses short authored contact at normal time; safety walking can add movement time. Enter finishes scripted scenes through authored end states.

Only lit rhythm windows score. Extra taps break the streak; accuracy controls final-chorus garden participation. Esc pauses movement, physics, tweens and audio. Checkpoints retain gears, puzzle records and discoveries. Results show time, rhythm and discoveries, clear the completed save and offer replay. See [the gameplay contract](gameplay-revision.md).

## Characters

Blender source-preserving rebinds put Fries at 4.23 heads and the Hatter at 4.15, with arms lengthened 23%. Hare and Dormouse proportions are unchanged. Both before/after studio renders are retained. The original GLBs already contain local with-skin Mixamo clips. These were rebound to the revised skeleton and re-exported with runtime names preserved, satisfying A9's rig/file contract without downloading identical clips again. No fresh Mixamo download is claimed.

One clip catalog owns posture, looping, support height and contact windows. Canonical pelvis/leg masks keep upper-body clips seated or standing correctly. Two-bone IK takes targets from real cups, gears, watch, page, spoon and clap contact. Short arms can rotate their shoulder sockets away from the head before solving the chain. Unreachable gaps use magical prop travel rather than stretched bones. The old face-pushing prop correction is removed. Repair happens in a clear aisle with a face-up watch and four hand targets around its rim. `found` uses a distinct search performance; `mend` and `stuff` align to 18.54 and 4.5 seconds.

Secondary hair, ears, tails, bows and coats use bounded springs. Coat vertices retain original joint attachments; isolated Dormouse neck weights are repaired before export. All four actors have a regular surface-fitted lip annulus, recessed oral cavity, speech morph and skinned lip landmark. The Hatter's unsuitable overhead crouch was replaced by a nine-second idle-based authored bend. Bone-envelope sampling, skin-edge checks, front/side renders, live speech and full drink trajectories are complementary diagnostics; envelope clearance does not certify fingers, glasses, every contact or aesthetic quality.

## Look and polish

[The color script](color-script.md) samples the supplied concepts at frozen six, awakening and pink 6:01. `src/look.js` owns light, sky, fog, exposure, surface colors and one LUT. Low warm sunlight, cool shadows, canopy depth, regional flower masses and gentle distant focus replace the flat pastel grade. Three references also have no-post captures.

The cottage is a connected home with sitting, kitchen, sleeping and storage areas, a recessed hearth/mantel, curtains, panelled cupboards, sink, light fixture, books, real collision walls/ceiling and a readable E-triggered note. Under the table are books, sugar steps and woven fringe. The ending has rose banks, a clear corridor and procedural tunnel bark. The gray particle quad and pale tea are fixed. Camera obstruction hides Fries before the orbit enters his head; first shrinking returns a ground-facing view.

Title/loading, subtitles, prompts, pause/settings and results share one visual style. Chinese covers all 137 dialogue IDs and switches live. Thirty-three recorded Foley variants cover grass/wood/stone steps, cup/glass contact, watch ticks and syrup drops; [sources and licenses](audio-sources.md) are recorded.

## Reproduction and measurement limits

Run `npm test`, `npm run build`, `node scripts/check-liquids.mjs`, `node scripts/check-motion.mjs`, `node scripts/audit-contacts.mjs --capture` and `node scripts/audit-skin.mjs`. Complete records are under `art/review/2026-11-11/complete/`.

For production measurements, run `npm start`, set `TEA_URL=http://127.0.0.1:5200`, and run `node scripts/check-browser.mjs` separately with `frame=s14&perf&quality=high&profile`, `start=explore&perf&quality=auto&cpu=4`, and `frame=s14&perf&quality=high&webgl`. Records are under `art/review/2026-11-11/optimized/`.

The complete walking regression steers only the camera, never calling `placePlayer` or `setSize`. It uses actual keyboard input through the character controller over the terraces, table short edge, spoon bridge and fountain arch, then reaches all three ordinary gears, checkpoint reload, results and replay. The extra puzzle route is verified separately.

CPU 4x is a simulation on the test GPU, not a physical integrated-GPU measurement. GPU memory is the renderer's tracked allocation including maps, geometry, programs and render targets. The existing build notice about a large Three.js/runtime bundle remains informational.

## Measured acceptance

Isolated production samples at 1920 x 1080 on the local NVIDIA test machine:

| Metric | Before | Final | Target |
|---|---:|---:|---:|
| s14 high FPS | 31–32 | 147.87 | >=60 |
| Script per frame | 31.2 ms | 6.462 ms | <8 ms |
| Awake liquids per frame | 15.6 ms | 0.069 ms | <0.5 ms |
| Draw calls | 1558 | 340 | <400 |
| Submitted triangles | 7.03M | 1,939,672 | <2M |
| Visible shadow casters | 837 | 60 | <150 |
| Initial transfer | 173.6 MB | 13.89 MB | <25 MB |
| Tracked GPU allocation | ~1.5 GB textures | 389.77 MB total | <400 MB |
| CPU 4x, automatic | — | 38.67 FPS | >=30 |
| Maximum chapter frame | seconds at start | 56.2 ms | <100 ms |

All sixteen unit checks, the production build, natural real-input playthrough, recorded-speech mouth/secondary-motion check, WebGL rendering and 71-clip contact audit passed. Skeletal-envelope intersections: zero in 16,899 samples. Abnormal skin-edge stretch: zero in 284 pose samples. All recorded browser checks have zero runtime errors. The 18 views identify the same production script recorded in revision/final/checks.json. Whole-chapter frame and missing-key audits merge both pages across checkpoint reload. The rhythm robot follows visible cue state; it does not measure first-time human comprehension. Silent recordings do not establish audible lip synchronization. Detailed independent finish limitations remain recorded in review-production-2026-11-12.md.

The WebGL fallback measured 129.54 FPS and 6.318 ms of script per frame, with no >100 ms frames. The 56.2 ms chapter maximum above is the native-speed run. Under CPU 4x, the cold-start audit recorded 2 isolated long frames (176.4, 101.0 ms); the settled five-second sample reached 38.67 FPS with a 33.2 ms maximum. The throttled result establishes P7's steady-rate target, not a universal no-stall guarantee on slower hardware.
