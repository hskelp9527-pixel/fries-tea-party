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

Open http://localhost:5173 and click to start. Media is read from the paths in `README.md` (`art/models/<name>.glb`, `audio/<file>.mp3`, `audio/voice/lines/<line id>_<speaker>.wav`). Files are found when the dev server starts, so restart `npm run dev` after adding or removing media.

`npm run build` writes a static site to `dist/`, with whatever media is on disk bundled in.

URL parameters, mainly for testing:

| Parameter | Effect |
|---|---|
| `?start=explore` | Skip the opening |
| `?start=song` | All three gears found; go straight to mending the watch and the song |
| `?start=ending` | Go straight to 6:01 |
| `?webgl` | Force the WebGL 2 fallback |
| `?lang=<code>` | Subtitles from `src/lang/<code>.json` (default `en`) |

## Controls

WASD to walk, mouse to look (click the game to capture the mouse, Esc to release), Shift to run, Space to jump, E to use what is in reach, V to switch between third and first person. During the song, Space or the left mouse button taps the cup on the beat.

## What works

- **Garden:** one continuous garden laid out with boxes at real-world scale: Fries 1.2 m, table top 0.75 m, chair seats 0.45 m, cottage door 2 m, the big tree's canopy from 4 m over the whole long table. The fountain and the cottage are a few steps from the table, the hat rack is on the porch, hedges close the edges.
- **Models:** each object loads `art/models/<name>.glb` when present and its boxes otherwise, with no code change. Colliders come from a mesh named `<name>_collider` in the glb, or else from the boxes.
- **Controller and camera:** third-person controller on Rapier's kinematic character controller; V toggles first person. The third-person camera sweeps a ball back from Fries's eye and stops at the first solid, so it pulls in rather than entering the canopy or anything else.
- **Sizes:** pink tea shrinks, blue tea grows, cake restores. Scale, eye height, field of view, speed, jump, reach, footstep pitch, camera shake and the pitch at which Fries hears the others ease together over about a second. The first shrink and the first grow cut to first person (the Hatter leans over a tiny Fries; the Hatter and the March Hare shout up at a giant one); after that the view stays where the player leaves it.
- **Gears:** three gears in any order. They are taken by reach plus a line-of-sight ray, so the geometry decides the size: the tablecloth hangs to 0.3 m (gear 1, small), the fountain's plinth has a 0.35 by 0.3 m crack (gear 2, small), the tallest hat is out of reach unless Fries is big (gear 3). Each gear wakes its own layer with a placeholder effect (tea steams and the frozen petals fall; syrup flows and butterflies take off; the bushes sway), plays its GR line, and moves the explore music a third of the way from frozen to awake. With all three, E at the watch mends it and starts the song.
- **Hints and barks:** the Dormouse sleep-talks a hint for the nearest missing gear after 45 s without progress, clearer each time, then every 35 s. EX-10 plays the first time the tea is in reach. Ambient and later size lines come from one table of conditions in `src/explore.js`, each at most once, only after 8 s of quiet.
- **Animation:** one `AnimationMixer` per character model, crossfading between clips by name in 0.2 s (`src/animation.js`). Clips are looked up by these names: `idle`, `walk`, `run`, `jump`, `drink`, `pick_up`, `reach`, `look_around`, `surprised`, `clap`, `cheer`, `dance_swing`, `dance_silly`, `talk`. At load, every clip keeps the vertical track of `mixamorig:Hips` and loses its horizontal travel; the ground speed that travel implied is kept per clip.
  - Fries idles when standing, walks or runs by speed and jumps while airborne. Walk and run play at the rate that makes their recorded ground speed match his real speed at his current size, so the feet do not slide. After 8 s standing still he looks around once, then idles.
  - Fries's one-shots, each returning to locomotion: `drink` when he drinks, `pick_up` for something at or below his knee (the two ground gears, which now lie flat) and `reach` for anything higher (gear 3, the page in the opening and the ending), `surprised` on the first shrink and the first grow, `clap` on every scored tap, `cheer` at 6:01. `talk` plays while one of his own lines does, when he is not moving.
  - First person hides Fries from the camera but not from the sun's shadow camera (he is on layer 1), so his animated shadow stays.
  - The Hatter, the March Hare and the Dormouse idle, talk while their own line plays, and dance in the second (`dance_swing`) and third (`dance_silly`) passes of the song (`src/cast.js`).
  - A box placeholder, or a glb without a given clip, simply plays nothing for that clip.
- **Floating teacups and hats:** they drift on non-repeating paths, teacups glide out of Fries's way, hats turn to look at him, and every gear adds a batch and livelier motion.
- **Song:** three passes driven by the measured beats in `audio/04t_little_bat_a.beats.json`. Every table cup, floating object and swaying bush pulses on each beat. Taps are scored against the nearest beat within 120 ms, timed from the key event on the audio output clock; taps in the first pass are ignored. SG-02 to SG-05 are cued on beats, the light rises each pass, the March Hare and the Dormouse join from the second pass, and the camera cranes up in the last.
- **Ending:** after SG-06 and a short silence, every clock jumps to 6:01, the sky turns pink, the Dormouse goes into the pink teapot, the page flies to Fries, the tree door opens, Fries walks through, the roses appear for the first time, and the render loop stops on that frame.
- **Audio:** music by role with crossfades (`setMusic`), voice lines by ID (`say`) with subtitles from `src/lang/<code>.json`. `npm run subtitles` regenerates `src/lang/en.json` and `src/speakers.json` from `docs/script.md`.
- **Renderer:** `WebGPURenderer`, falling back to WebGL 2; the fallback gets half the floating objects and petals and a smaller shadow map.

## What is stubbed

- **Character staging** is still whole-body tweens on top of any clips: the Hatter's lean in the first shrink, his hop onto the table, the box bobbing on the beat, the Dormouse going into the teapot. Box placeholders have no clips, so they keep only these tweens.
- **Prop sounds** (SE-01 to SE-12) are not wired. Footsteps and the 6:01 click are a generated noise burst, a hit tap is a generated tone. `05t_little_bat_instrumental_a.mp3` (title and results) is not used.
- **Not built:** the spoon bridge, the Dormouse's breath pushing Fries, character business (pouring tea, changing seats), chairs shuffling, the watch lid, grass and flower instancing, depth of field, tilt-shift, bloom, backdrop cards, a title or results screen, settings and latency calibration.
- **Song pass boundaries** are assumed to start on beats 0, 40 and 88; confirm by ear and edit `PASSES` in `src/song.js`.
- **Cutscene cameras** are keyframes in code (`src/story.js`, `src/song.js`), not loaded from glTF.
- **Voices** are not positional and the music is not ducked under them.
- **Story review changes** from `docs/story-review.md` are not applied.

## Where to change things

| What | Where |
|---|---|
| Positions of everything, placeholder boxes, gears, drinks, floating clouds, bark zones, song staging | `src/layout.js` |
| Everything that changes with size, walking and running speed | `SIZES` and `RUN` in `src/player.js` |
| Which clip plays when | `animate()` in `src/player.js`, `src/cast.js` |
| Bark conditions, hint timings, the watch | `src/explore.js` |
| Opening and ending scripts | `src/story.js` |
| Song passes, line cues, light per pass, camera keyframes, tap window | top of `src/song.js` |
| Music files, lengths and loops | `MUSIC` in `src/audio.js` |
| Subtitles | `docs/script.md`, then `npm run subtitles` |
| Another subtitle language | add `src/lang/<code>.json` keyed by line ID and open with `?lang=<code>`; files other than `en.json` are ignored by git |

## Model names

A glb is placed with its origin at the layout position and faces +Z: feet for characters, the hinge for `tree_door`, the pivot for `clock_hand`, the face centre for `wall_clock`, the centre for `gear`, the bottom for everything else. Names in use:

`big_tree`, `tree_door`, `roses`, `long_table`, `armchair`, `hatter`, `hare`, `dormouse`, `fries`, `fountain`, `cottage`, `hat_rack`, `hat`, `teacup`, `plate`, `pink_teapot`, `blue_teapot`, `tea_tray`, `cake`, `cake_stand`, `pocket_watch`, `book_page`, `butter`, `gear`, `wall_clock`, `clock_hand`, `bush`, `hedge`, `stone_path`.

A `<name>_collider` mesh must be indexed (Blender's glTF export always is) and must keep the gaps the gears depend on: the 0.3 m under the tablecloth, the fountain's crack, and the canopy underside, which also keeps the camera out of the leaves.

## Code map

| File | Role |
|---|---|
| `src/main.js` | Start screen and the frame loop |
| `src/scene.js` | Renderer, scene, camera, lights |
| `src/physics.js` | Rapier world |
| `src/layout.js` | The garden as data |
| `src/models.js` | glb or boxes, colliders |
| `src/garden.js` | Places the layout; wake-layer effects |
| `src/player.js` | Controller, sizes, cameras, reach, Fries's animation |
| `src/animation.js` | Clip playback with crossfades |
| `src/cast.js` | The other characters' animation |
| `src/explore.js` | Drinks, first shrink and grow, gears, hints, barks, mending the watch |
| `src/floating.js` | Floating teacups and hats |
| `src/song.js` | The song and tap scoring |
| `src/story.js` | Opening, skipping ahead, ending |
| `src/audio.js` | Music mix, voice lines, subtitles, stand-in sounds, audio clock |
| `src/tweens.js` | Game-time tweens for scripts |
| `scripts/subtitles.mjs` | Generates subtitles from the script |

## Tested

In headless Chromium with no media present, under software rendering at a few to 14 frames a second. Most runs used the WebGL 2 fallback; WebGPU runs through SwiftShader with `--enable-unsafe-webgpu --enable-features=Vulkan --use-vulkan=swiftshader --use-webgpu-adapter=swiftshader --disable-vulkan-surface`, which was used to start the game, walk, and take the screenshots.

- The opening runs through and hands over control.
- Walking, jumping, V and the camera work; the camera never ends inside a collider or the canopy at any of the three sizes.
- Pink tea, blue tea and cake work, with the first-person cuts and the Hatter leaning over a tiny Fries.
- Normal and big Fries cannot take gears 1 and 2, normal Fries cannot take gear 3; small Fries takes 1 and 2, big Fries takes 3. Each gear wakes its layer and updates the music mix and floating objects.
- The song plays its cues, light and camera on the beat map, scores taps and ignores the first pass. A key press in the second pass is judged and shown. Taps fired by timers in the page arrive late under this much CPU load (synthetic events are stamped when the delayed timer runs), so timing accuracy itself was not measured here; real key events carry their input time.
- The ending reaches the roses, and the render loop stops on that frame.
- Animation, with a generated stand-in `fries.glb` (a `mixamorig:Hips` bone with all fourteen clip names, walk and run carrying 1 and 3 m/s of root motion): root motion is flattened with height kept and the ground speeds read back as 1 and 3 m/s; idle, walk, run, jump, talk, drink and surprised play in turn and return to locomotion; look_around plays once after 8 s still; walking at 1.8 m/s plays walk at 1.8 times; first person drops Fries's layer from the camera while the shadow camera keeps it. The same file as `hatter.glb` idles, talks on a Hatter line and dances in passes 2 and 3. Your real models have not been run here.
- `npm run build` succeeds; the bundle is about 5 MB (1.9 MB gzipped), mostly three.js's WebGPU build and Rapier's inlined WebAssembly.

Not run here: real media, real models, a full playthrough on WebGPU, and a playthrough by hand.
