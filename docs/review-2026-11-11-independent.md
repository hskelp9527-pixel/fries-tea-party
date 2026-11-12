# Independent rejection review, 2026-11-11

**Decision: reject visual and interaction acceptance. Visual quality: 4.0/10.**
The current `complete` status is not supported by the player's screenshots. The
scene has useful real assets and recorded performance improvements, but basic
character interactions, facial animation, spatial construction and lighting
still fail the intended presentation. Performance passing does not establish
art or animation passing.

This review inspected eight player-supplied screenshots, the eighteen-view
capture grid, the original s01/s14/s16 concepts, the diagnosis, design and Task E,
and the relevant runtime and verification source. It did not run a browser,
build, test or typecheck. Functional/performance figures in existing reports
were not independently rerun. Static evidence cannot establish every motion
defect's exact frame or prove that a route is physically impassable.

The reviewed baseline is the version represented by the supplied failure
screenshots and the existing completion report, before repairs prompted by this
review. Later code edits require fresh continuous captures and a separate
re-review; this document must not be treated as acceptance of those edits.

## Scoring

Scale: 0 means broken; 3 means major obvious defects; 5 means functional but
rough; 7 means consistently polished; 10 is the supplied target concept quality.
The score is a weighted assessment of the current presentation, not a claim of
measurement precision and not a continuation of the previous 7.1 rating.

| Dimension | Weight | Score | Reason |
|---|---:|---:|---|
| Prop contact and body posing | 20% | 3.0 | The primary drinking action puts a cup over the glasses, fingers do not form a credible grasp, and the required two-hand action is absent. |
| Facial animation and acting | 10% | 2.0 | The Hatter has a separate black oval under the nose while the original smile remains. A moving morph alone is not a believable mouth. |
| Spatial layout, paths and architectural completion | 20% | 3.0 | A floral half-arch appears suspended against the roots; the path/door/arch relationship is unclear; the hall reads as a fireplace display box. |
| Lighting, color and dream atmosphere | 20% | 4.0 | Warm tint is present, but the pale beige sky, weak cool shadows, uniform canopy and bright local glow do not match the concepts' directional golden light. |
| Composition and attention | 10% | 4.0 | Several review frames have small actors, occluding furniture or an unreadable focal prop; the wide view loses the concept's foreground performance. |
| Asset materials and table dressing | 20% | 7.0 | Porcelain, patterned cloth, cakes, furniture and cottage silhouettes provide real detail. These strengths do not cancel defects in the main actions. |

Weighted total: **4.0/10**. Gameplay feel and puzzle usability are not scored
from stills. The recorded traversal proves selected state transitions, not that
the chapter has been independently played and judged as a finished experience.

## Findings, highest impact first

### 1. [P1] The complete drinking trajectory is not constrained

Player evidence `03-cup-at-glasses.png` shows the cup across the eyes and glasses,
not at the lips. This directly violates `docs/task-e.md` section 5 and
`docs/design.md`'s drinking contract: lift with both hands, drink, lower the cup,
and never pass through face or glasses.

In the reviewed source, `src/clip-catalog.js` gives `drink` a contact centre of
4.88 s, 0.5 s fade-in, 0.65 s hold and 0.5 s fade-out. The correction is zero
before 4.38 s and after 6.03 s. `src/hands.js:use` and the held-prop update keep
the cup attached to the animated hand until the 8.88 s clip ends. Thus the cup
can return to the original adult motion outside a short corrected interval.
The source explains a likely failure mechanism; the attachment does not encode
the exact time at which the supplied bad frame occurred.

`scripts/capture-contacts.mjs` freezes only 4.88 s. A pass at that selected instant
does not address the failure before or after it. Fix the whole world-space cup
trajectory, its tilt and the hand constraints through pickup, pour, ascent, sip,
descent and release. Do not hide the failure by choosing a different still.

Reproduce: enter exploration, use both size teas without pressing Enter, and
record the entire action from the authored camera plus a true side view. Include
the first and repeated interactions.

### 2. [P1] A wrist target is being mistaken for a hand grasp

`02-fries-hold.png` and the close crop `04-cup-grasp.png` show broad fingers
overlapping the cup/handle area without a credible opposing thumb and curled
fingers. The idle hold and the lifted cup need to work as one continuous grasp.
The design explicitly asks for both hands; the reviewed contact table selects
only the left hand for drinking, while the right hand hangs down.

`src/hands.js` applies a translated grip offset to a hand bone.
`src/contact-ik.js` solves shoulder/elbow/wrist positions; it does not constrain
wrist roll, the palm's orientation or finger phalanges against the cup. A hand
bone reaching a point therefore cannot certify the visible contact. Author a
cup-specific grasp and two-hand support, preserving the porcelain silhouette
and leaving the handle outside solid finger meshes.

### 3. [P1] The mouth is an added surface at the wrong facial landmark

`01-hatter-mouth.png` and `05-hatter-raised-arms.png` show a dark ellipse directly
under the nose, with the original painted smile still visible lower down. This
reads as an extra mouth or a black moustache, not an open mouth. Its position
must not be accepted merely because speech changes its scale.

The reviewed `scripts/prepare-characters.py` estimates mouth height as a fraction
of a head bounding box, raycasts the body at that height, adds a separate
`SpeechMouth` sphere, then expands its vertical coordinates eighteen-fold for a
morph. The original lip surface is not opened and the original smile is not
deformed. Tall hats, ears and different facial proportions make a bounding-box
fraction an unreliable landmark. Use actual per-character lip landmarks and a
coherent lip/jaw deformation with an interior cavity. Test all four actors at
silence, quiet speech and loud speech.

The raised-arm screenshot also needs a full motion review. It shows an awkward
straight-sided sleeve/shoulder silhouette from below; a still cannot determine
whether that comes from the chosen clip, shoulder compensation, skinning or
camera placement. Do not certify that pose from a bone-distance test.

### 4. [P1] Repeated seating accelerates placement while the skeleton keeps normal time

The player reports acceleration when using another chair. In the reviewed
`src/explore.js`, `hasSat` is global, so every chair after the first uses
`briefScene`. That wrapper creates `tween(2.6)` and then enters
`withSceneRate(8, action)`. `src/tweens.js:updateTweens` multiplies all active
tween progress by this rate, including the 2.6 s deadline itself. It can therefore
fire after approximately **0.325 real seconds**, set `sceneSkipping`, stop
speech and force remaining tween endpoints.

Meanwhile `src/main.js` calls the character/cast updates with ordinary `dt`.
The approach, chair and root-position tweens can race ahead of the skeletal
sit/stand clips. This is a direct timing mismatch, not merely a stylistic choice
to shorten repetition. A new chair is also incorrectly treated as an already
seen interaction. Replace acceleration with a deliberately shortened sequence;
do not use a global tween rate to compress placement and dialogue.

Reproduce: sit in an empty chair, then sit in a different empty chair, then
repeat the same one. Record approach, pull-out, turn, sit, dialogue, rise and
return of input, with real and scene timestamps.

### 5. [P1] The acceptance suite measures proxies and then labels unrelated tasks verified

The following checks remain useful, but their scope was overstated:

| Existing evidence | What it establishes | What it does not establish |
|---|---|---|
| `audit-contacts.mjs`, 30 Hz bone-envelope samples | Arm-segment clearance from simplified head/torso volumes in sampled isolated clips | Cup/glasses contact, hand surface, finger grasp, table/chair collision, clip crossfades or a full held-prop interaction. The script clears held props before sampling. |
| `audit-skin.mjs`, four phases per clip | A sampled edge did not exceed both 4x rest length and 3.5 cm added length | Normal deformation quality, subtle tearing, silhouettes, collisions or any mouth/eyelid defect; those meshes are explicitly excluded. |
| `check-motion.mjs` | Fries has a nonzero mouth morph and spring quaternion change during one recorded line | Correct lip placement, facial anatomy or Hatter/Hare/Dormouse speech quality. There is no upper quality bound. |
| Eight selected prop poses / 142 clip images | Files exist and selected poses were captured | A passing continuous performance. A frame count is not an art review. |
| `gameplay.mjs` / `route.mjs` | An input-driven route reaches states, completes puzzles and can recover/reload | Unskipped cinematic quality. `interact` defaults to pressing Enter after 250 ms; opening, repair, song and ending also use skipping. |
| `final-report.mjs` | Numerical budgets and several file/count checks pass | A2/A3/A5/G4/G6 visual acceptance. The script assigns `verified` to all task records without testing their individual visual claims. |

Reopen at least A2, A3, A5, A7/A8's acceptance scope, G4 and G6. C2/C3/C4 also
need a fresh independent art assessment. Retain valid performance evidence with
its measured scope. Do not erase genuine improvements, but do not let them
override a visible failure in a primary interaction.

### 6. [P2] The tree approach combines independent assets without a convincing joint layout

`06-tree-path-arch.png` shows a flowered half-arch against a large root. Its
uprights/base cannot be read, so it appears to hang in the air. The visually
dominant tree door is behind it, while the worn path and stepping stones appear
to skirt the root. A player cannot easily distinguish a planted path arch, a
door surround and loose vines.

The reviewed layout places `rose_arch` at `[-5.48, 0, -9.49]` independently of a
1.5x tree at `[-5.98, -0.9, -14.09]`. Path centre lines, the arch placement and
the tree-door hinge are maintained separately. This is evidence of an
integration risk, not proof from source alone that every route is blocked.

Choose one construction: a planted freestanding arch outside the root footprint,
or ivy attached continuously to the actual doorway. Connect the path surface to
the threshold with a visible, walkable approach. Check all arches, not only this
one: both supports, ground contact, facing and unobstructed clear width.

### 7. [P2] The hall remains a display recess rather than a finished warm room

`07-cottage-hall.png` has a bright blank surround, a small rectangular floor,
low side panels and a fireplace on an isolated wallpaper rectangle. The own
`views/hall-front.jpg` capture crops tightly onto the fireplace and conceals this
overall construction. Added planks and brackets improve detail but do not close
the room spatially.

The design calls for a warm hall containing the Hare's buttered tools, clocks,
jars and a note, not just a mantel against a small panel. Finish the wall/floor/
ceiling joins, threshold and room depth, then stage its objects and light as a
place. Verify from the normal arrival camera and from inside while turning,
including the silhouettes around the open doorway.

### 8. [P2] The current light is a warm wash, not the concept's golden backlight

The supplied tree screenshot and the eighteen-frame grid show a large pale
beige sky, olive/yellow canopy, brown lawn and limited cool separation in shaded
faces and plants. The sun is present in some references, but its presence alone
does not establish the target. In the original s01 and s14, the low sun creates
clear warm rims, patterned long shadows, darker foreground masses and distinct
cool distant/shaded layers. The current canopy still reads as regular filled
lobes rather than framing branches with light gaps.

`LOOK.sun=[0.35,0.32,-0.88]` corresponds to about 18.7 degrees elevation; the
concept sun sits much closer to the horizon. The source centralizes parameters,
which is useful engineering, but sampled hue medians and one parameter owner do
not verify value hierarchy, light direction or the result on faces. The
diffuse environment is baked once from the frozen sky; ending sky/fill changes
are an approximation, not proof that all three color moments remain coherent.

Match the reference shots in luminance and composition first: a low clear disc,
gold on hair/cup rims, readable cool shadows and darker foliage bases. Keep
lanterns secondary. The almost white central glare in s08 obscures the grotto
and should be reduced rather than counted as dream atmosphere. Compare frozen,
awakening and 6:01 at identical exposure in color, grayscale and no-post views.

### 9. [P2] Reference cameras were captured, but the concept compositions were not preserved

Task E requires s04/s09/s11/s14 to show the tree framing, table foreground,
fountain middle-right and elevated cottage together. In the current grid,
several are sparse landscape views; the s14 table and actors are small, and
s09 omits the tree/table relationship. s02's chair and s07's cake compete with
the story prop. The repair frame partially covers the watch with hands.

Changing old coordinates with a larger map is appropriate. Replacing the
composition's purpose with a distant performance-friendly panorama is not.
Keep an independent fixed performance camera if needed, then stage the actual
narrative/review views to direct attention. Evaluate the final in-game camera
path, not only a manually arranged frame.

## Required continuous acceptance before a new completion claim

1. **Capture real interactions at normal speed.** No Enter, scene-rate changes,
   manual pose sampling, hiding occluders or replacing camera staging for the
   primary evidence. Record the full opening, first small/big changes, both teas,
   all chairs, gear takes, repair, song and ending. Also verify the intended
   short repeat versions separately. Every case needs an uncut front
   three-quarter view and a synchronized diagnostic side view.
2. **Measure the actual contact surfaces.** Sample at 60 Hz through the full
   action, at 120 Hz around contact/crossfade transitions. At normal size the
   sipping rim should meet the lip within roughly 3 mm, while cup and fingers
   clear the glasses/face by at least a small positive margin. Verify thumb,
   fingertip, handle and support-hand contact with cup-specific anchors and
   orientation, not just wrist position. State tolerances and unresolved frames
   explicitly; a clamped target is not a successful contact.
3. **Review the complete face.** Test all four speakers, silent/quiet/loud speech,
   profile and low angle, multiple head turns and blink combinations. The open
   mouth must replace/deform the existing lip line, not appear near the nose as
   a second patch. Silence must return to a clean original facial expression.
4. **Verify timing and support.** All chairs must keep chair movement, pelvis,
   feet, skeletal phase and audio synchronized. Different-chair visits cannot
   inherit a global repeat-speed trick. Pause/resume, interruption and error
   recovery must restore unit scene rate and correct chair occupancy.
5. **Walk the visible route.** From the normal player camera, follow the stone
   paths to each landmark and the tree threshold, without debug waypoints,
   teleportation or cutting through beds. Inspect every arch from both ends and
   side-on: both feet are planted or its attachment is visibly intentional;
   roots, vegetation and fences leave the stated clear width. Record the route
   in plan view as well as from the player camera.
6. **Show the whole room and all three color moments.** The cottage evidence
   must include arrival, threshold, floor/wall/ceiling joins and a slow turn.
   Lighting comparisons must use the three required concept compositions,
   consistent exposure and all three story phases. Do not raise a visual score
   merely because the sun disc, LUT or a screenshot file exists.
7. **Use independent rejection gates.** Any obvious cup/face penetration, double
   mouth, visible ungrounded architecture, timing jump or unreadable story focal
   prop fails the relevant task even when its average score is acceptable.
   Report implementation, automated proxy checks and visual acceptance as
   separate statuses. Re-review repaired sequences before restoring `complete`.

## Evidence index

The eight supplied images are retained without edits under
`art/review/2026-11-11/independent/input/` as `01-hatter-mouth.png`,
`02-fries-hold.png`, `03-cup-at-glasses.png`, `04-cup-grasp.png`,
`05-hatter-raised-arms.png`, `06-tree-path-arch.png`, `07-cottage-hall.png` and
`08-table-chairs.png`. Additional reviewed images are the original
`art/storyboard/s01.png`, `s14.png`, `s16.png`, and the prior capture set under
`art/review/2026-11-11/complete/`. Static code observations in this report refer
to the reviewed baseline; they are not results from executing the latest edits.
