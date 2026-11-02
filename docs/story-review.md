# Story review: The Six O'Clock Tea Party

A review of `docs/design.md` and `docs/script.md` with concrete fixes, and notes on how each part of the flow should be built in three.js. The music, the four characters and 54 of the 59 recorded lines stay as they are; five lines change (see [Voice line changes](#voice-line-changes)).

Line lengths below are estimates from text length (about 16 characters a second plus a breath); check them against the recorded WAVs.

## The short version

1. **Make the watch the reason for everything.** The player is never told why the gears matter. Make the mended watch the metronome Time listens to: the player mends it, it ticks at the song's tempo, the Hatter sings to it, Fries taps along. One line changes (GR-04).
2. **Stage the first shrink on the tabletop, not on the grass.** Every small-size moment in the design (the Hatter's face, the Dormouse's breath, the spoon bridge) happens at table height, but nothing gets a small Fries up there. Put the tea tray in the middle of the table, reached from a chair seat.
3. **Fix four Dormouse hints** that point at things that do not exist (a dog, a bench, the tree's leaves) or contradict the mechanic ("climb up and peek inside").
4. **Fit the opening and the ending to their music.** The opening runs about 50 s against 40 s of music; the ending about 40 s against 30 s.
5. **Give the song a clean hand-off from the solo to the tapping**: the recording has no gap between passes 1 and 2, so SG-02 and SG-03 must sit inside the music, and the first scored beat should come one bar after SG-03.

## Target structure (17 minutes)

| Part | Time | What happens | Music |
|---|---|---|---|
| Title | 0:00-0:20 | Click to start; title card over the garden | `05t` instrumental |
| Opening | 0:20-1:10 | Three shots, OP-01 to OP-10; gears scatter | `01t`, crossfading to `02t` at the burst |
| Learn sizes | 1:10-3:00 | Tea tray on the table, first shrink, the Hatter's face, the spoon ramp down | `02t` |
| Three gears | 3:00-13:30 | Any order, about 3.5 min each; each wakes one layer | `02t` to `03t`, a third per gear |
| Mend the watch | 13:30-14:00 | Back to the table; GR-04; the watch starts ticking at song tempo | `03t` fades to the ticking |
| Song | 14:00-15:40 | SG-01, three passes (80 s), SG-06 | `04t` |
| Ending | 15:40-16:20 | 6:01, the page, the door, the roses, freeze | `06t` |
| Results | 16:20-17:00 | Rhythm score over the frozen frame | `05t` |

A player who already knows where the gears are finishes in about 8 minutes; a lost player is caught by the hints (in the grey box, the first after 45 s without progress, then every 35 s, each clearer than the last). The 15-20 minute target rests almost entirely on exploration, so playtest the hint timings before anything else.

## Weak beats and fixes

### Opening

- **Fries has no reason to want the page.** In a standalone chapter the glowing page is just a glowing thing. Fix it in the picture, not with a new line: the page shows a drawing of the tree door with a red rose behind it, and when Fries reaches for it the tree door's keyhole glints. The ending then pays this off without explanation.
- **The opening is longer than its music.** About 26 s of speech plus a 7 s glide plus business is 45-55 s; `01t_opening_b` is about 40 s. Crossfade to `02t_explore_frozen_b` on OP-09, the moment the watch bursts: the music breaking with the watch is a better beat than the music running out.
- **Show where the gears land.** The three gears should fly out of the watch in long arcs toward the table, the fountain and the porch. The design rules out a map and quest arrows; this is the one free look at the destinations, and it costs one second.

### The goal

The chain the player must understand is: the page can only be taken at 6:01; time is stuck because the Hatter murdered the tune and offended Time; the watch is broken; the song must be sung again, in time. The script says each piece, but nothing says why mending the watch helps the song.

Fix: the watch keeps the beat. When the last gear goes in, Fries says GR-04 (changed to "There. Now it can keep time again."), the watch starts ticking at 108 BPM, and the Hatter climbs onto the table on SG-01. In pass 1 he ignores the watch and goes off-key; in pass 2 Fries taps the cups along with the ticking and rescues the rhythm. This turns three unrelated tasks (gears, song, tapping) into one idea and costs one re-recorded line.

Mend the watch once, after all three gears (as the grey box does), not after each one: carrying each gear back would force a small Fries to eat cake twice just to reach the table.

### Learning to change size

- **Nothing puts a small Fries at table height.** The first-shrink close-up (the Hatter's face "presses down from the sky"), the Dormouse's breath (SZ-06) and the spoon bridge (SZ-05) all need small Fries on the tabletop, but if he shrinks on the grass the Hatter has to fold himself to the ground, and the Dormouse and the spoon are out of reach.
- **Fix:** put the tea tray in the middle of the long table. Fries steps onto an empty chair seat (0.45 m) and from there onto the table (0.75 m); both steps are within his normal stride and jump. He drinks the pink tea on the tabletop, among cups the size of houses. The Hatter leans across the table: his face comes in at a controlled height and distance, which is also the safest way to stage the riskiest close-up in the design.
- **The spoon becomes the way down.** A large serving spoon lies from the table edge to a chair seat and on to the grass, laid by the March Hare at the end of the first-shrink scene (his hand can stay off-screen). SZ-05 ("Walk the silver plank, little boy! Watch the drop!") plays when small Fries reaches it. This also leads him straight to gear 1 under the table.
- **The Dormouse's breath** pushes a small Fries back as he passes the saucer (a sideways nudge on the character controller every breath), with SZ-06.
- Keep the pink tea, blue tea and cake rule exactly as written; EX-10 ("Pink shrinks, blue climbs... cake puts you back...") plays the first time the tray is in reach.

### Exploration

- **Free order means no escalation by story; escalate by count instead.** The second gear, whichever it is, should feel bigger than the first: music already moves a third of the way per gear; also add a floating-object batch per gear (the grey box does both), and let the third gear's wake briefly pull every floating cup toward the table, which tells the player where to go next.
- **Size juggling must not become chores.** Gear 2 (small, in the fountain) is about 9 m from the tea tray; at small speed that is 8-10 s, which is fine. Gear 3 needs big, and big Fries walks fast. Keep one cake beside each destination (the grey box has cakes by the table, the fountain and the porch) so the player is never more than a few steps from returning to normal.
- **The barks need a quiet rule.** BK and SZ lines are 68 s of speech between them; played whenever their trigger fires they would talk over each other and over the hints. Play a bark only after 8 s without any line, each at most once, gear reactions and hints first.

### Hints that mislead

| Line | Problem | Fix |
|---|---|---|
| EX-02 | "where the dog sits": there is no dog | Point under the tablecloth |
| EX-03 | "Brass under the bench": there are armchairs, no bench | Say table |
| EX-07 | "leaves tickling my whiskers": points at the big tree, not the porch | Point at a tall hat |
| EX-09 | "climb up and peek inside": nothing can be climbed, the gear sits on top of the hat, and the real answer is to grow | Say grow tall and look on top |

### The song

- **The solo runs straight into pass 2.** The measured beats show no gap between pass 1 and pass 2 (beat 39 at 20.17 s, beat 40 at 20.77 s), so SG-02 (about 2.5 s) and SG-03 (about 1.5 s) are spoken over the music: SG-02 over the last bar of the solo, SG-03 on the bar before pass 2. Duck the music about 4 dB under each line.
- **Give one bar of grace.** Score taps from the first beat of pass 2 but do not show misses until its second bar; SG-03 is still ringing on the downbeat.
- **The player is idle for 20 seconds in pass 1.** That is fine as long as the cups already pulse on every beat (they should, and in the grey box they do): the player learns the beat by watching before being asked to play it.
- **Build-up comes from the picture.** The passes are equally loud, so: pass 1 dim and close on the Hatter; pass 2 brighter, the March Hare and the Dormouse join, over-the-shoulder on the cups; pass 3 full light, the whole garden on the beat, and a crane that backs out from under the canopy before it rises (the canopy starts at 4 m and the camera must never enter it).
- **SG-04 mentions a sugar bowl** ("Dormouse pops head out of sugar bowl"). Add a sugar bowl to the simple props, or stage the line from his saucer; the text works either way.
- **Pass boundaries need confirming by ear.** The grey box assumes passes start on beats 0, 40 and 88; the beat map has a few half-beats (intervals of 0.37-0.45 s) where the detector doubled, so scoring should be checked against the recording.

### Ending

- **It is longer than its music.** About 24 s of speech plus the page, the door and the walk is 35-45 s against about 30 s of `06t_ending_a`. Fit it by overlapping, not cutting: ED-05 and ED-06 play while Fries walks (the three bustle and ignore him, which is the joke), the door should be no more than five steps from where the song leaves Fries, and the freeze lands on the track's last chord.
- **The silence before the click** must stay: SG-06 right after the last note, 1.5 s of nothing, then SE-03 and 6:01.
- **The roses** must not exist before the final shot: keep them hidden (the grey box does), and compile their materials during loading so the reveal does not stutter.
- **ED-04 ("The door is open. Thank you!")** works because nobody answers. Keep it.

## Voice line changes

| ID | Speaker | Was | New English text |
|---|---|---|---|
| EX-02 | Dormouse | Crumbs on the floorcloth... where the dog sits... | Crumbs under the long white cloth... where the cups can't see... |
| EX-03 | Dormouse | Brass under the bench... squeeze beneath the fringe... | Brass under the table... squeeze beneath the fringe... |
| EX-07 | Dormouse | High in the wind... leaves tickling my whiskers... | High in the wind... a hat taller than the Hatter's... |
| EX-09 | Dormouse | Top hat on the peg... climb up and peek inside... | Top hat on the rack... grow tall and look on top... |
| GR-04 | Fries | Fits right into the notch. | There. Now it can keep time again. |

Triggers that change without new text: GR-04 plays once, when the last gear goes into the watch; SZ-05 plays when small Fries reaches the spoon ramp after his first shrink; SZ-06 plays when the Dormouse's breath pushes him on the tabletop.

## Building it in three.js

The renderer is `WebGPURenderer`, which falls back to WebGL 2 by itself; check `renderer.backend.isWebGPUBackend` once and lower densities on the fallback. Budget for a mid-range laptop at 60 fps: under about 300 draw calls, under 1.5 M triangles on screen, one shadow-casting light, post-processing at half resolution or not at all on the fallback.

### Across the whole chapter

- **Lighting:** bake light and ambient occlusion for everything that never moves (tree, table, cottage, fountain, hedges, paths) into lightmaps in Blender, and keep one real-time shadow from the sun with a tight frustum around the table for characters and moving props. This looks better than all-real-time shadows and costs less.
- **Assets:** glTF with meshopt or Draco compression and KTX2 textures. Tripo models typically arrive at hundreds of thousands of triangles with 4K textures; decimate props to 10-30 k triangles and characters to 30-60 k, and atlas small props into shared materials. Every repeated prop (cups, chairs, hats, flowers, stones) is one `InstancedMesh` or `BatchedMesh`, not one mesh per copy.
- **Audio:** convert the 59 WAV lines to Opus (with AAC for older Safari): tens of megabytes become a few. Decode music after the first click, opening track first.
- **Shader stalls:** call `renderer.compileAsync(scene, camera)` during loading, with hidden things (roses, steam, butterflies) briefly made visible, or they compile on first appearance and hitch at exactly the wrong moment.
- **Looks for free:** consistent pastel palette with few materials, fog matched to the sky, image cards for distant hills, ACES tone mapping with a mild colour grade, and vertex-colour ambient occlusion on small props.

### Opening

- **Build:** cutscene cameras animated in Blender and exported as glTF (a camera with an animation clip, played through `AnimationMixer`), or a `CatmullRomCurve3` in code for the glide. Lines and actions run as an async script on game time (the grey box's `tween` and `say`).
- **Cost and risk:** low. The frozen tea and floating petals are static instances, almost free.
- **Better for the same cost:** a slow depth-of-field focus pull onto Fries at the end of the glide, rendered once at half resolution; the only post effect the opening needs.

### Learning sizes and the first-person close-ups

- **Build:** size is a single number eased over about a second; eye height, field of view, speed, jump, reach, footstep pitch, camera shake and the pitch of the others' voices all follow it (one table in the grey box's `player.js`). The capsule collider is resized in place.
- **Cost and risk:** the Hatter's face at 20 cm from the camera is the single biggest risk in the chapter. It needs a 2K-4K face texture (KTX2), eyes with their own meshes, blinks and a little saccade, and a hard limit on how close the head may come. Depth of field when small and tilt-shift when big are full-screen blurs: affordable at half resolution on WebGPU, skip them on the WebGL fallback.
- **Better for the same cost:** a lower near plane and a wider field of view when small sell the scale more than any effect; a slightly warm rim light on the Hatter's face makes a moderate texture read as detailed.

### Exploration, gears and the waking world

- **Build:** Rapier's kinematic character controller against static colliders (`<name>_collider` meshes or boxes). Gears are taken by reach plus a line-of-sight ray, so geometry decides which size can reach them. Each wake layer is a flag that switches an effect from frozen to moving.
- **Cost and risk:** grass and flowers are the expensive part. Use instanced blades and flower heads with wind computed in the vertex shader (TSL), one draw call per kind; on WebGPU the instance data can be updated in a compute pass. Halve the density on the WebGL fallback. Petals, steam, syrup drops and butterflies are instanced quads or tiny meshes; keep them in the low thousands.
- **Better for the same cost:** drive every swaying and bobbing thing from one shared time and one beat uniform, so the third gear's "flowers sway and hum" and the final chorus are the same shader with a different strength. Emissive gear glints with a small bloom pass read as "important" without any UI.

### Floating cups and hats

- **Build:** one `InstancedMesh` per prop type, positions computed on the CPU (paths, dodging, hats turning) for a few hundred instances, which is cheap.
- **Cost and risk:** low. Avoid per-object materials; vary colour per instance.
- **Better for the same cost:** let them scale their motion with the player's size, so a small Fries sees slow airships and a big one sees a buzzing swarm, as the design asks.

### Song

- **Build:** the song clock is the audio clock (`AudioContext.getOutputTimestamp`), and every beat effect reads the measured beat times, never a fixed BPM. Taps are timed from the key event's timestamp, so frame rate does not affect scoring.
- **Cost and risk:** keyboard and Bluetooth audio latency differ between machines; offer a calibration offset in the settings later. Do not add point lights per cup: use emissive plus bloom.
- **Better for the same cost:** light per pass (hemisphere and sun intensity, a warmer sky colour) carries the build-up the recording cannot, at no cost; the crane in pass 3 is the money shot and costs one camera path.

### Ending

- **Build:** the clocks' minute hands snap 6 degrees; the sky is a gradient dome (or background colour) and fog colour tweened to pink; the page flies on an arc; the door swings on its hinge; the roses become visible for the last shot; the render loop stops on the last frame (`renderer.setAnimationLoop(null)`), which keeps it on screen.
- **Cost and risk:** low, apart from compiling the roses' materials ahead of time.
- **Better for the same cost:** a warm light spilling out of the door onto Fries in the final shot, faked with an emissive card and the bloom pass rather than a real light.
