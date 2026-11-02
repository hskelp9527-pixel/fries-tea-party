# Grey box

Step 1 of the order of work in `docs/design.md`: the whole chapter playable with boxes, from the opening to the frozen last frame, with the chosen music and voice lines wired in by file name. It runs with every media file missing: models fall back to boxes and audio to silence of the right length, so all timings (song beats, line lengths, cutscenes) behave the same.

## Run it

Needs Node 20.19 or later.

```bash
npm install
```

```bash
npm run dev
```

Open http://localhost:5173 and click to start. Media is read from the paths in `README.md` (`art/models/<name>.glb`, `audio/<file>.mp3`, `audio/voice/lines/<line id>_<speaker>.wav`); with access to the private repository `hskelp9527-pixel/fries-tea-party-assets`, copy its `art/` and `audio/` folders into the root of this checkout (they are gitignored, never commit them here). Files are found when the dev server starts, so restart `npm run dev` after adding or removing media.

`npm run build` writes a static site to `dist/`, with whatever media is on disk bundled in.

URL parameters, mainly for testing:

| Parameter | Effect |
|---|---|
| `?start=explore` | Skip the opening |
| `?start=song` | All three gears found; go straight to mending the watch and the song |
| `?start=ending` | Go straight to 6:01 |
| `?webgl` | Force the WebGL 2 fallback |
| `?lang=<code>` | Subtitles from `src/lang/<code>.json` (default `en`) |
| `?anims` | A bar for checking clips by hand: the first row picks Fries, the Hatter, the March Hare or the Dormouse and moves the camera close to it (pick it again to step the view a quarter turn round); the second row plays that character's clips. Fries plays a clip once, the others loop it until another is picked |

## Controls

WASD to walk, mouse to look (click the game to capture the mouse, Esc to release), Shift to run, Space to jump, E to use what is in reach, V to switch between third and first person. During the song, Space or the left mouse button taps the cup on the beat.

## What works

- **Garden:** one continuous, layered storybook garden laid out with boxes at real-world scale (Fries 1.2 m, table top 0.75 m, chair seats 0.45 m, cottage door 2 m):
  - **Levels:** the long table on the main lawn under the big tree. The March Hare's cottage on a stone terrace 1.2 m up, about 7 m west, reached by a wide flight of five steps, its porch and hat rack facing the table. The fountain in a raised stone basin with low walls about 6 m east, up two steps. Three steps up to the door in the tree's base. Dry-stone walls edge the terrace.
  - **The big tree:** a thick hollow trunk at the head of the table, five huge branches arching over the whole table, leaf clumps from about 4.2 m up, four clocks frozen at six and eight glowing lanterns hanging from the branches. Branches and leaves are solid, so the camera stays out of them.
  - **Density:** a 3 m hedge closes the walkable garden to about 30 by 25 m (too tall for a big Fries to climb out). A stone path links the table, the fountain, the terrace steps and the tree door, lined with wooden fences and spanned by three arches; layered flower beds and bushes break up every open patch. The arches' climbers are pale pink and white: the design keeps red roses for the final shot.
  - **The edge of the world:** cypress rows beyond the hedge, rolling hills in four directions and a far cottage as flat silhouette cards (one `backdrop` entry each in `src/layout.js`, ready for painted cards), and warm fog matched to the sky, so nothing ends in a hard line.
  - **Six o'clock light:** a low warm sun about 15 degrees up behind the cottage with long soft shadows across the table, a sky dome from peach at the horizon to soft lavender overhead with the sun's disc, cool and warm hemisphere fill, ACES tone mapping, gentle bloom on the lanterns, gears, page and sun (WebGPU only), and a colour grade that turns pink at 6:01 with the sky, fog and fill.
  - **Ground:** a large lawn with gentle colour variation, instanced grass and patches of small flowers swaying in one wind computed on the GPU (`src/ground.js`), off the paths and paved areas.
  - **Frozen magic:** teacups, hats, spoons, plates and pocket watches floating at real size; tea frozen in glossy arcs from four teapot spouts into cups, syrup in four arcs from the fountain's bowl, golden syrup drops hanging round the fountain, and larger petals that catch the light.
- **Models:** each object loads `art/models/<name>.glb` when present and its boxes otherwise, with no code change. Colliders come from a mesh named `<name>_collider` in the glb, or else from the boxes.
- **Controller and camera:** third-person controller on Rapier's kinematic character controller; V toggles first person. The third-person camera sweeps a ball back from Fries's eye and stops at the first solid, so it pulls in rather than entering the canopy or anything else.
- **Sizes:** pink tea shrinks, blue tea grows, cake restores (E when a pink or blue teacup on the table, or a cake, is offered). Scale, eye height, field of view, speed, jump, reach, footstep pitch, camera shake and the pitch at which Fries hears the others ease together over about a second. The first shrink and the first grow cut to first person (the Hatter leans over a tiny Fries; the Hatter and the March Hare shout up at a giant one); after that the view stays where the player leaves it.
- **Gears:** three 6 cm gears in any order, each for one size: under the tablecloth, which hangs to 0.3 m (gear 1, small); in a hollow under the fountain, reached through a 0.35 by 0.3 m crack and tunnel at the foot of the basin's west wall (gear 2, small); on the tallest hat at the front edge of the cottage porch, at a big Fries's chest height from the top of the terrace steps (gear 3, big). Fries takes a gear when he is that size, near it on the level of its stand point and can see it; the geometry keeps the other sizes away too. Each gear wakes its own layer with a placeholder effect (tea steams and the frozen petals fall; syrup flows and butterflies take off; the bushes sway), plays its GR line, and moves the explore music a third of the way from frozen to awake. With all three, E at the watch mends it and starts the song.
- **Hints and barks:** the Dormouse sleep-talks a hint for the nearest missing gear after 45 s without progress, clearer each time, then every 35 s. EX-10 plays the first time the tea is in reach. Ambient and later size lines come from one table of conditions in `src/explore.js`, each at most once, only after 8 s of quiet.
- **Animation:** one `AnimationMixer` per character model, crossfading between clips by name in 0.2 s (`src/animation.js`). Fries's clips are looked up by these names: `idle`, `walk`, `run`, `jump`, `drink`, `pick_up`, `reach`, `look_around`, `surprised`, `clap`, `cheer`, `dance_swing`, `dance_silly`, `talk`; the cast's by `sit_idle`, `sit_talk`, `sit_laugh`, `sit_yell`, `sit_point`, `sing`, `sleep`, `wake`, `idle`, `talk`, `laugh`, `walk`, `dance_swing`, `dance_silly`. At load, every clip keeps the vertical track of `mixamorig:Hips` and loses its horizontal travel; the ground speed that travel implied is kept per clip.
  - Fries idles when standing, walks or runs by speed and jumps while airborne. Walk and run play at the rate that makes their recorded ground speed match his real speed at his current size, so the feet do not slide. After 8 s standing still he looks around once, then idles.
  - Fries's one-shots, each returning to locomotion: `drink` for the teas and cakes, `pick_up` for gears 1 and 2, `reach` for gear 3, the page in the ending and (without touching it) the watch in the opening, `surprised` on the first shrink and the first grow, `clap` on every scored tap, `cheer` at 6:01. `talk` plays while one of his own lines does, when he is not moving.
  - First person hides Fries from the camera but not from the sun's shadow camera (he is on layer 1), so his animated shadow stays.
  - The Hatter and the March Hare sit in their armchairs (`src/cast.js`): `sit_idle` by default, `sit_talk` on their own lines, `sit_laugh` on laughing beats, `sit_yell` for "No room!" (OP-01, OP-02) and `sit_point` when the Hatter points at Fries (OP-04, BK-03, BK-10, BK-12); `BEATS` lists these lines. Their hips rest on the 0.45 m seat: the height of the buttocks is measured from the model in `sit_idle` at load (the lowest skinned point in a slice just behind the hip joint: 0.316 m for the Hatter, 0.25 m for the March Hare) and the armature is lifted by the difference.
  - The Dormouse lies asleep on its plate on the table (`sleep`); on each of its lines it plays `wake` once, then `sit_talk`, and goes back to sleep afterwards. Its lying and sitting bodies are centred over the plate and rest on it, by the lowest point and middle of each clip's pose, measured at load.
  - In the song the Hatter hops onto the table at SG-01 and stays there: `sing` in the first pass, `dance_swing` in the second, `dance_silly` in the third. The March Hare gets up when the second pass starts and dances beside his chair, clear of the table; the Dormouse dances on the tabletop by its plate. A character on the move plays `walk`; off its seat it uses the standing `idle`, `talk` and `laugh`.
  - A box placeholder, or a glb without a given clip, simply plays nothing for that clip.
- **Hands and props** (`src/hands.js`): props meet Fries's hand and never pass through him or come from thin air. Before a one-shot that touches a prop he walks to the prop's stand point and turns to face it, so his palm meets the prop at the contact time in `docs/fries_hand_contacts.json`; the prop then follows the hand bone, set in the palm by its grip offset. Stand points, facings, grips and the size each prop is for are in `src/layout.js`.
  - `pick_up` (gears 1 and 2): into the right hand at contact (2.33 s), kept to the end of the clip, then flown to the watch.
  - `reach` (gear 3 and the page) is at chest height, not up: gear 3 sits where a big Fries's right palm comes at contact (4.0 s), standing at the top of the terrace steps; the page flies from the watch into his palm, arriving and attaching at contact, and stays in his hand to the freeze frame.
  - `drink` (teacups and cakes): the clip holds the cup at his waist from its start, so the cup flies the short way into his left hand in the first 0.6 s, goes to his mouth (4.88 s) and flies back to the tray at the end; then he changes size. The teapots pour frozen tea into the teacups.
  - A box Fries has no hand bones: there a held prop sits where the clip's palm is at contact.
- **Floating teacups and hats:** they drift on non-repeating paths, teacups glide out of Fries's way, hats turn to look at him, and every gear adds a batch and livelier motion.
- **Effects clear of the characters:** falling petals, steam puffs and floating objects are pushed sideways out of upright cylinders round each character's seat and song position and Fries's song spot (`keepClear` in `src/layout.js`).
- **Song:** three passes driven by the measured beats in `audio/04t_little_bat_a.beats.json`. Every table cup, floating object and swaying bush pulses on each beat. Taps are scored against the nearest beat within 120 ms, timed from the key event on the audio output clock; taps in the first pass are ignored. SG-02 to SG-05 are cued on beats, the light rises each pass, the March Hare and the Dormouse join from the second pass, and the camera cranes up in the last.
  - In the final chorus, from its first beat to the last note, every prop on the table and every floating object hops on each beat: up by a fifth of its size (about 2 cm for a teacup, 5 cm for a teapot, 9 cm for the tray), with an extra nudge up, down, left or right and a little spin picked per prop and beat, eased with a half sine so it bounces rather than jumps (`hop` in `src/state.js`). Table props never dip below their places, and a prop standing on another (the teapots on the tray, the page in the watch) rides with it. Everything settles back exactly when the music stops.
- **Ending:** after SG-06 and a short silence, every clock jumps to 6:01, the sky turns pink, the Dormouse goes into the pink teapot, the page flies to Fries, the tree door opens, Fries walks through, the roses appear for the first time, and the render loop stops on that frame.
- **Audio:** music by role with crossfades (`setMusic`), voice lines by ID (`say`) with subtitles from `src/lang/<code>.json`. `npm run subtitles` regenerates `src/lang/en.json` and `src/speakers.json` from `docs/script.md`.
- **Renderer:** `WebGPURenderer`, falling back to WebGL 2, drawn through a `RenderPipeline` for bloom and the colour grade. The fallback gets half the floating objects, petals and flowers, a third of the grass, a smaller shadow map and no bloom.

## What is stubbed

- **Character staging** is still whole-body tweens on top of the clips: the Hatter's lean in the first shrink, his hop onto the table, the March Hare's move beside his chair, the Dormouse's hop into the teapot. Box placeholders have no clips, so they keep only these tweens.
- **Prop sounds** (SE-01 to SE-12) are not wired. Footsteps and the 6:01 click are a generated noise burst, a hit tap is a generated tone. `05t_little_bat_instrumental_a.mp3` (title and results) is not used.
- **Not built:** the spoon bridge, the Dormouse's breath pushing Fries, character business (pouring tea, changing seats), chairs shuffling, the watch lid, depth of field, tilt-shift, painted textures for the backdrop cards, a title or results screen, settings and latency calibration.
- **Song pass boundaries** are assumed to start on beats 0, 40 and 88; confirm by ear and edit `PASSES` in `src/song.js`.
- **Cutscene cameras** are keyframes in code (`src/story.js`, `src/song.js`), not loaded from glTF.
- **Voices** are not positional and the music is not ducked under them.
- **Story review changes** from `docs/story-review.md` are not applied.

## Where to change things

| What | Where |
|---|---|
| Positions of everything, placeholder boxes, gears, drinks, floating things, frozen tea and syrup, grass densities, backdrop cards, bark zones, the cast's seats and song places, the room kept clear round the characters | `src/layout.js` |
| Sun, sky, fog, hemisphere fill, bloom and the colour grade | `src/scene.js` |
| Everything that changes with size, walking and running speed | `SIZES` and `RUN` in `src/player.js` |
| Which clip plays when | `animate()` in `src/player.js`, `play()` and `BEATS` in `src/cast.js` |
| How props hop in the final chorus | `hop` in `src/state.js` |
| Stand points, facings, grips and sizes of props | `gears`, `drinks` and `page` in `src/layout.js` |
| Bark conditions, hint timings, the watch | `src/explore.js` |
| Opening and ending scripts | `src/story.js` |
| Song passes, line cues, light per pass, camera keyframes, tap window | top of `src/song.js` |
| Music files, lengths and loops | `MUSIC` in `src/audio.js` |
| Subtitles | `docs/script.md`, then `npm run subtitles` |
| Another subtitle language | add `src/lang/<code>.json` keyed by line ID and open with `?lang=<code>`; files other than `en.json` are ignored by git |

## Model names

A glb is placed with its origin at the layout position and faces +Z: feet for characters, the hinge for `tree_door`, the pivot for `clock_hand`, the face centre for `wall_clock`, the centre for `gear`, the bottom for everything else. Names in use:

`big_tree`, `tree_door`, `roses`, `long_table`, `armchair`, `hatter`, `hare`, `dormouse`, `fries`, `fountain`, `cottage`, `hat_rack`, `hat`, `teacup`, `plate`, `pink_teapot`, `blue_teapot`, `tea_tray`, `cake`, `cake_stand`, `pocket_watch`, `book_page`, `butter`, `gear`, `wall_clock`, `clock_hand`, `bush`, `hedge`, `stone_path`, `terrace`, `top_hat`, `hanging_clock`, `lantern`, `fence`, `rose_arch`, `flower_bed`, `cypress`, `teapot`, `spoon`. A box in a placeholder shape may carry a turn `[rx, ry, rz]` in degrees after its colour. `hatter.glb` carries his top hat, skinned to the head; `top_hat` is the separate hat on the hat rack that holds gear 3.

A `<name>_collider` mesh must be indexed (Blender's glTF export always is) and must keep the gaps the gears depend on: the 0.3 m under the tablecloth, the fountain's crack, and the canopy underside, which also keeps the camera out of the leaves.

## Code map

| File | Role |
|---|---|
| `src/main.js` | Start screen and the frame loop |
| `src/scene.js` | Renderer, render pipeline, camera, sun, sky |
| `src/physics.js` | Rapier world |
| `src/layout.js` | The garden as data |
| `src/models.js` | glb or boxes, colliders |
| `src/garden.js` | Places the layout and backdrop cards; frozen tea and syrup; wake-layer effects |
| `src/ground.js` | Lawn, grass and flowers |
| `src/player.js` | Controller, sizes, cameras, reach, Fries's animation |
| `src/animation.js` | Clip playback with crossfades |
| `src/cast.js` | The Hatter, the March Hare and the Dormouse: seats, clips, getting up |
| `src/state.js` | Shared game state; the beat hop |
| `src/anims.js` | The `?anims` clip checker |
| `src/hands.js` | Props in Fries's hands, the one-shots that touch them |
| `src/explore.js` | Drinks, first shrink and grow, gears, hints, barks, mending the watch |
| `src/floating.js` | Floating teacups and hats |
| `src/song.js` | The song and tap scoring |
| `src/story.js` | Opening, skipping ahead, ending |
| `src/audio.js` | Music mix, voice lines, subtitles, stand-in sounds, audio clock |
| `src/tweens.js` | Game-time tweens for scripts |
| `scripts/subtitles.mjs` | Generates subtitles from the script |

## Before and after

The same three cameras before and after the space, levels and atmosphere pass, rendered on WebGPU (headless Chromium through SwiftShader, so no antialiasing to speak of), with Fries placed at (-1.4, 0, 2.6).

| Camera | Before | After |
|---|---|---|
| Over the garden from the south-east: position (13, 11, 15), looking at (-2, 1, -4) | ![](images/before-1.jpg) | ![](images/after-1.jpg) |
| Eye level down the long table: position (0.6, 1.5, 5), looking at (0, 1.2, -6) | ![](images/before-2.jpg) | ![](images/after-2.jpg) |
| From the fountain side toward the cottage: position (5.5, 2.4, 2.5), looking at (-8, 2.2, -3) | ![](images/before-3.jpg) | ![](images/after-3.jpg) |

## Hands at the contact frame

The real `fries.glb`, rendered on WebGPU at the frame where each prop meets the hand: the real game sequence runs on a freshly loaded page (dev server restarted, so no module is loaded twice) and the render loop is stopped the moment the prop is taken into the hand (for the teacup, as the cup reaches his mouth at 4.88 s). The long table (gear 1) and the fountain (gear 2) are hidden in their shots so the camera can see under them.

| Prop | Front | Side |
|---|---|---|
| Gear 1, `pick_up`, small Fries under the table | ![](images/contact-gear1-front.jpg) | ![](images/contact-gear1-side.jpg) |
| Gear 2, `pick_up`, small Fries in the hollow under the fountain | ![](images/contact-gear2-front.jpg) | ![](images/contact-gear2-side.jpg) |
| Gear 3, `reach`, big Fries at the top of the terrace steps | ![](images/contact-gear3-front.jpg) | ![](images/contact-gear3-side.jpg) |
| Blue teacup, `drink`, at his mouth | ![](images/contact-teacup-front.jpg) | ![](images/contact-teacup-side.jpg) |
| Book page, `reach`, in the ending | ![](images/contact-page-front.jpg) | ![](images/contact-page-side.jpg) |

Measured at those frames (metres; the hand bone is the wrist, the prop sits in the palm): gear 1 held 1 mm from where it rested, gear 3 with the hand bone exactly where the clip data puts it and the gear 1.6 cm from its rest at giant scale, the page 6 mm from the predicted palm, the teacup at 0.94 m, his mouth.

## The cast at the table and the song

The real `hatter.glb`, `hare.glb` and `dormouse.glb` from the assets repository, rendered on WebGPU (headless Chromium through SwiftShader) on a freshly loaded page, with `?start=explore` for the table and `?start=song` for the song. The song shots stop the render loop at the top of a hop in the final chorus.

| Shot | |
|---|---|
| The cast at the table, from the south end: the Hatter (left) and the March Hare in their armchairs in `sit_idle`, the Dormouse asleep on its plate at the far end | ![](images/cast-seated.jpg) |
| The Hatter's hips on the seat | ![](images/cast-hatter-seat.jpg) |
| The March Hare's hips on the seat | ![](images/cast-hare-seat.jpg) |
| The Dormouse asleep on its plate (the plate is still a box) | ![](images/cast-dormouse-plate.jpg) |
| The song in pass 3, beat 113: the Hatter dancing on the table, the March Hare beside his chair, the Dormouse on the tabletop, Fries at his spot, the props in the air | ![](images/song-pass3.jpg) |

The same frozen frame in pass 3 (beat 115, at the top of a hop), then with only the table props put back in their places: the tray rises and turns with both teapots on it, and the teacups lift.

| Hop | Rest |
|---|---|
| ![](images/song-pass3-hop.jpg) | ![](images/song-pass3-rest.jpg) |

## Tested

In headless Chromium with no media present, under software rendering at a few to 14 frames a second. Most runs used the WebGL 2 fallback; WebGPU runs through SwiftShader with `--enable-unsafe-webgpu --enable-features=Vulkan --use-vulkan=swiftshader --use-webgpu-adapter=swiftshader --disable-vulkan-surface`, which was used to start the game, walk, and take the screenshots.

- The opening runs through and hands over control.
- Walking, jumping, V and the camera work; the camera never ends inside a collider or the canopy at any of the three sizes.
- Pink tea, blue tea and cake work, with the first-person cuts and the Hatter leaning over a tiny Fries.
- Normal and big Fries cannot take gears 1 and 2, normal Fries cannot take gear 3; small Fries takes 1 and 2, big Fries takes 3. Each gear wakes its layer and updates the music mix and floating objects.
- The song plays its cues, light and camera on the beat map, scores taps and ignores the first pass. A key press in the second pass is judged and shown. Taps fired by timers in the page arrive late under this much CPU load (synthetic events are stamped when the delayed timer runs), so timing accuracy itself was not measured here; real key events carry their input time.
- The ending reaches the roses, and the render loop stops on that frame.
- Animation, with a generated stand-in `fries.glb` (a `mixamorig:Hips` bone with all fourteen clip names, walk and run carrying 1 and 3 m/s of root motion): root motion is flattened with height kept and the ground speeds read back as 1 and 3 m/s; idle, walk, run, jump, talk, drink and surprised play in turn and return to locomotion; look_around plays once after 8 s still; walking at 1.8 m/s plays walk at 1.8 times; first person drops Fries's layer from the camera while the shadow camera keeps it. The same file as `hatter.glb` idled, talked on a Hatter line and danced in passes 2 and 3; that was before the real cast arrived (see below).
- After the space, levels and atmosphere pass, with the same tests: normal and big Fries still cannot take gears 1 and 2 nor normal Fries gear 3 (also from the porch); small Fries walks from the table under the cloth for gear 1 and on through the crack and tunnel for gear 2; big Fries walks from the tea tray past the fences, straight up the terrace steps and takes gear 3; normal Fries climbs the terrace, the fountain and the tree-door steps. The ending walks up the door steps into the tree, turns sky and grade pink and freezes, on the WebGL fallback.
- `npm run build` succeeds; the bundle is about 5 MB (1.9 MB gzipped), mostly three.js's WebGPU build and Rapier's inlined WebAssembly.

- With the real media from the assets repository: the pink tea from E to the shrink (the cup into his left hand, to his mouth at 0.97 m and back to exactly its place on the table), gear 1, the contact frames above, and the ending to the freeze frame with the page still in his hand. The opening was not rerun with the real media.
- With the real cast models: the Hatter and the March Hare sit with their hips on the seats in their sitting clips and the Dormouse sleeps on its plate; `?start=song` plays to the last note with the Hatter on the table, the March Hare beside his chair and the Dormouse dancing on the tabletop. Over the final chorus (19 beats sampled, at under a frame a second with the real models on SwiftShader), no table prop went below its place, the highest rise was 15 cm (the tray with its teapots, which stayed exactly on it), and every prop was back exactly at its place and turn when the music stopped. Through 60 s of the song, no petal, syrup drop or moving object had its centre inside the cylinders kept clear round the characters. In `?anims`, each of the four characters was picked, the view stepped round the Hatter, and `sit_point`, `sit_laugh`, `sleep`, `wake` and `cheer` were played.

Not run here: a full playthrough on WebGPU in one go, the opening with the real cast (its yell, laugh and point beats), and a playthrough by hand.
