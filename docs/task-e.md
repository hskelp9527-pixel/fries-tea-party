# Task E: replace the grey box with the real garden (round two)

Goal: after this task the scene is about half finished; then we tune the game. Read `docs/design.md` (section "Round two") and `docs/review-2026-11-03.md` first. Work in the order below; commit after each numbered step.

Rules: no Chinese anywhere in the repository, including file names, file contents and commit messages. Develop with surgical precision; no over-defensive design or code: no checks, fallbacks or abstractions the task does not need.

## 0. Setup

- Pull `origin/grey-box`. Refresh `art/` and `audio/` from the private repo `hskelp9527-pixel/fries-tea-party-assets` (commit `d2313bf` or later). Its README describes every file: sizes, front directions, hinge and spout positions, clip names.
- Install the three.js graphics skill pack for the session (do not commit it):
  `npx threejs-awesome-graphics-agent-skills@0.13.0 install --agent claude-code`
  Start every visual step from its `threejs-skill-router`.

## 1. three.js: how the picture gets made

People building three.js worlds with no downloaded assets now get their look from three things. Use all three:

- **WebGPU + TSL.** We are on three r187 with `WebGPURenderer`. Write materials, vegetation and post-processing as TSL node materials and node post-processing (`three/tsl`, `three/webgpu`), not `ShaderMaterial` / `EffectComposer`. Keep the WebGL fallback working through the same node code.
- **GPU instancing and compute.** Grass, flowers and leaves are thousands of instances: `InstancedMesh`/`BatchedMesh` driven by TSL, wind and placement from shared fields, culling by distance.
- **One light model, one tone map, one grade.** A single exposure and tone-mapping owner, then the grade; no second tone map hidden in a pass.

Which skill answers which gap in the review:

| Gap | Skill(s) | What to build |
|---|---|---|
| No sun, no haze, no rim light (+1.2) | `threejs-atmosphere-aerial-perspective`, `threejs-shadow-systems`, `threejs-exposure-color-grading`, `threejs-bloom` | Low golden sun with a visible disc behind the tree; depth-based warm haze (clear near, warm far); stable soft shadows; warm rim on hair and shoulders; lanterns bloom gently; keep the 6:01 pink grade as a final LUT |
| The tree is a green ceiling (+1.0) | `threejs-procedural-vegetation` | Foliage on `big_tree.glb`'s branches as clustered leaf cards with gaps for light, translucent at the edges, foliage normals, rooted wind; ivy following the trunk's surface |
| Flat lawn, boxed flower beds (+0.7) | `threejs-procedural-vegetation`, `threejs-procedural-fields` | GPU grass; flower fields at three heights (low heads, knee-high clumps, climbing walls) placed by fields, not boxes; hedges and bushes as dense leaf volumes with no visible core; far trees and hills in layers |
| Magic reads as debris (+0.4) | `threejs-procedural-vfx`, `threejs-water-optics` | The liquid system (step 5); curved translucent petals; butterflies with wings; soft steam |
| Cameras don't direct attention (+0.2) | `threejs-camera-direction` | Authored shots that never go behind leaves; over-the-shoulder opening; the fixed drinking shot |
| Depth and contact | `threejs-screen-space-ambient-occlusion` | GTAO so feet, chairs, cups and steps sit on things |
| Proof | `threejs-visual-validation` | Fixed-view checks from the review's 18 frames, a no-post baseline that still reads |

Use `art/textures/kit/leaves.png` and `flowers.png` (alpha atlases, cells listed in the assets README) for the leaf, grass and flower cards.

## 2. Real models replace their boxes

- `house.glb`: doorway cut through the front wall, empty node `door_hinge` at the bottom of its left edge; hang `tree_door.glb` there scaled about 1.2 x 0.95, swinging inwards into the warm hall.
- `big_tree.glb` (bare; foliage from step 1): its roots form a tunnel through the trunk; a second `tree_door.glb`, scaled about 1.45x, hangs at the front mouth; the rose path begins behind the far end.
- `fountain.glb` (dry; liquid from step 5): the grotto opening is on its +X side; turn it towards small Fries's route.
- `armchair.glb` at every seat; `hat_rack.glb` on the cottage porch with gear 3 on its top hat; `lantern.glb` and `hanging_clock.glb` hanging from the branches (clocks get `clock_hand.glb` at 6:00, 6:01 in the ending); `pink_teapot.glb`, `blue_teapot.glb`; `cake_stand.glb`; `pocket_watch.glb` with hands.
- From `art/models/kit/`: `long_table` (replaces the table box), `steps_stone`, `wall_stone` + `wall_cap_flowers`, `fence_picket` / `fence_broken` (broken where a main view looks through), `rose_arch` at bends, `heart_arch` at the end of the rose path, `ivy_strand`, `candle` / `candelabra` on the table (flicker the meshes named `flame*`), `milk_jug`, `flagstone_a..d` for the curving paths. `long_table`, `milk_jug` and `wall_stone` will be replaced under the same names later.
- Remove every placeholder these replace.

## 3. A bigger garden made of places

Follow the "Round two" tables in `docs/design.md`:

- About 70 x 60 m. No hedge wall at the edge: the ground falls away into a valley with layered hills and trees 40-150 m out. Movement stops at the brow of the slope and at low walls and bushes.
- The table (8.5 x 2.2 m) under the tree; the fountain about 15 m away on a low round plaza; the cottage about 25 m away, high at the back right, on terraces of 0.6, 1.2 and 1.8 m joined by flights of steps with staggered retaining walls; the overlook meadow at the north-east; the rose path behind the tree, hidden until the ending; curving stone paths between them.
- Every place is walkable, with room for characters to stand and act.
- From the review: s04, s09, s11 and s14 must show the tree framing the view, the table in front, the fountain middle-right and the cottage high at the back right, all at once.

## 4. Movement, size and doors

- Steps up to 0.25 m are climbed by walking, never by jumping (Rapier character controller autostep, plus snap to ground).
- Big is about 5x (6 m tall): his eye line clears the cottage's eaves; he steps up terraces without stairs. Two or three floating cups and spoons drift near the giant's camera for scale.
- The cottage door swings open into its hall. The tree door rattles, stays locked and gets a line from the Hatter, until the ending.
- The Dormouse lies on his plate in every clip; he now floats above it.

## 5. The liquid system, and drinking

- One system for the fountain, the teapots and the cups: glossy translucent amber streams on a falling arc, thinning and breaking into drops; splash rings and droplets where they land; liquid surfaces inside cups, bowls and the basin that rise as they fill; steam over hot tea.
- The fountain: before gear 2 the syrup hangs frozen like glass; after it, syrup pours from each teapot spout and spills over each tier's lip in thin sheets.
- Drinking: the Hatter conducts the floating teapots (`sit_beckon` from his chair, `conduct` standing; the conduct clip turns him about 70 degrees, so aim him by his chest). At the table Fries holds out a cup; the pink or blue teapot flies over, tilts and pours (spout tip in the assets README); a fixed camera from the front three-quarters shows Fries lift the cup to his mouth with both hands, drink and lower it, then the size change. The cup never passes through his face or glasses.

## 6. Characters who are alive

- **Gaze:** whoever speaks looks at the one addressed; listeners look at the speaker; when Fries is near, heads turn to him. Head and neck up to about ±70° sideways and ±30° up or down, eased over 0.3 s; beyond that the body turns, or the chest a little when seated.
- **Banter scheduler:** the hosts keep talking while the player explores. Pick an exchange whose conditions hold (who is seated, where the player is, which gears are back, what just happened); play its lines in turn with `talk`/`sit_talk` and the gaze; wait 15-40 s. Player events (gear found, size change, falling into the fountain, entering the cottage, sitting down) get their own exchanges, started at the end of the current line. The Hatter leads, the March Hare heckles, the Dormouse answers in his sleep. Lines fade with distance; subtitles within about 12 m. Run it now on the lines in `docs/script.md`; new lines come later as data.
- **Chairs:** walk to the chair's front, turn, `sit_down` (the chair slides back a little and settles), seated clips, `stand_up` in reverse; align the hips to each chair's seat (small Fries and the Dormouse need an offset). The March Hare changes seats now and then. Fries can sit in any empty armchair at the table (E); the first time the hosts shout "No room!"; seated, the camera frames the table and the banter turns to him.

## 7. Tasks at each place

Every place shows something out of reach before the player can do it: a glint between the table legs, a light and ticking behind the grotto's tiny arch, a gear on the hat rack's top hat high on the porch, the tree door rattling locked. Build the tasks in the design's table: the crumbs, fringe and spoon bridge under the table; the grotto interior with the jammed valve; the porch reached by giant steps up the terraces; the cottage hall at normal size; the overlook for big Fries. Small places block big Fries by size alone. Fries plays `found` when he spots a glint and `examine` when he holds up a gear.

The tea service game opens at the table once the first gear is back: the Hatter conducts several teapots to the explore music, Fries moves his cup under the right stream, a miss splashes.

## 8. Story moments

Give each a named hook and play the nearest clip until its own clip arrives: hold up the watch and snatch it back; butter the watch; the gear burst (`sit_scared` on the three hosts now); Fries holds up a gear (`examine` now); mend the watch together; the Hatter leans over small Fries; lay the spoon bridge; conduct the teapots (`conduct` now); stuff the Dormouse into the teapot.

## 9. Re-shoot and score

When steps 1-3 are in, capture the review's 18 frames again from `docs/review/2026-11-03/stage_*.json` (keep each frame's composition, not its old coordinates, once landmarks have moved), save them to `docs/review/<date>/`, and add a before/after table to `docs/grey-box.md`.

## Coming later in the asset repo (do not wait)

Blinking eyelids (a morph target named `blink` on each character), clips for the story moments, the redone `long_table`, `milk_jug` and `wall_stone`, new banter lines with voices.
