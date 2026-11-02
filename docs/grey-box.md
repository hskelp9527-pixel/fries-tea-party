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

WASD to move, mouse to look (click the game to capture the mouse, Esc to release), Shift to run, Space to jump, E to use what is in reach, V to switch between third and first person. During the song, Space or the left mouse button taps the cup on the beat.

## What works

- **Garden:** one continuous garden laid out with boxes at real-world scale: Fries 1.2 m, table top 0.75 m, chair seats 0.45 m, cottage door 2 m, the big tree's canopy from 4 m over the whole long table. The fountain and the cottage are a few steps from the table, the hat rack is on the porch, hedges close the edges.
- **Models:** each object loads `art/models/<name>.glb` when present and its boxes otherwise, with no code change. Colliders come from a mesh named `<name>_collider` in the glb, or else from the boxes.
- **Controller and camera:** third-person controller on Rapier's kinematic character controller; V toggles first person. The third-person camera sweeps a ball back from Fries's eye and stops at the first solid, so it pulls in rather than entering the canopy or anything else.
- **Sizes:** pink tea shrinks, blue tea grows, cake restores. Scale, eye height, field of view, speed, jump, reach, footstep pitch, camera shake and the pitch at which Fries hears the others ease together over about a second. The first shrink and the first grow cut to first person (the Hatter leans over a tiny Fries; the Hatter and the March Hare shout up at a giant one); after that the view stays where the player leaves it.
- **Gears:** three gears in any order. They are taken by reach plus a line-of-sight ray, so the geometry decides the size: the tablecloth hangs to 0.3 m (gear 1, small), the fountain's plinth has a 0.35 by 0.3 m crack (gear 2, small), the tallest hat is out of reach unless Fries is big (gear 3). Each gear wakes its own layer with a placeholder effect (tea steams and the frozen petals fall; syrup flows and butterflies take off; the bushes sway), plays its GR line, and moves the explore music a third of the way from frozen to awake. With all three, E at the watch mends it and starts the song.
- **Hints and barks:** the Dormouse sleep-talks a hint for the nearest missing gear after 45 s without progress, clearer each time, then every 35 s. EX-10 plays the first time the tea is in reach. Ambient and later size lines come from one table of conditions in `src/explore.js`, each at most once, only after 8 s of quiet.
- **Floating teacups and hats:** they drift on non-repeating paths, teacups glide out of Fries's way, hats turn to look at him, and every gear adds a batch and livelier motion.
- **Song:** three passes driven by the measured beats in `audio/04t_little_bat_a.beats.json`. Every table cup, floating object and swaying bush pulses on each beat. Taps are scored against the nearest beat within 120 ms, timed from the key event on the audio output clock; taps in the first pass are ignored. SG-02 to SG-05 are cued on beats, the light rises each pass, the March Hare and the Dormouse join from the second pass, and the camera cranes up in the last.
- **Ending:** after SG-06 and a short silence, every clock jumps to 6:01, the sky turns pink, the Dormouse goes into the pink teapot, the page flies to Fries, the tree door opens, Fries walks through, the roses appear for the first time, and the render loop stops on that frame.
- **Audio:** music by role with crossfades (`setMusic`), voice lines by ID (`say`) with subtitles from `src/lang/<code>.json`. `npm run subtitles` regenerates `src/lang/en.json` and `src/speakers.json` from `docs/script.md`.
- **Renderer:** `WebGPURenderer`, falling back to WebGL 2; the fallback gets half the floating objects and petals and a smaller shadow map.

## What is stubbed

- **Characters** are boxes in fixed poses; glb animation clips are not played yet. The Hatter's lean, his hop onto the table and all dancing are whole-body tweens.
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
| Everything that changes with size | `SIZES` in `src/player.js` |
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
| `src/player.js` | Controller, sizes, cameras, reach |
| `src/explore.js` | Drinks, first shrink and grow, gears, hints, barks, mending the watch |
| `src/floating.js` | Floating teacups and hats |
| `src/song.js` | The song and tap scoring |
| `src/story.js` | Opening, skipping ahead, ending |
| `src/audio.js` | Music mix, voice lines, subtitles, stand-in sounds, audio clock |
| `src/tweens.js` | Game-time tweens for scripts |
| `scripts/subtitles.mjs` | Generates subtitles from the script |

## Tested

In headless Chromium with no media present. It has no WebGPU, so everything ran on the WebGL 2 fallback, at about 14 frames a second under software rendering.

- The opening runs through and hands over control.
- Walking, jumping, V and the camera work; the camera never ends inside a collider or the canopy at any of the three sizes.
- Pink tea, blue tea and cake work, with the first-person cuts and the Hatter leaning over a tiny Fries.
- Normal and big Fries cannot take gears 1 and 2, normal Fries cannot take gear 3; small Fries takes 1 and 2, big Fries takes 3. Each gear wakes its layer and updates the music mix and floating objects.
- The song plays its cues, light and camera on the beat map, scores taps and ignores the first pass. A key press in the second pass is judged and shown. Taps fired by timers in the page arrive late under this much CPU load (synthetic events are stamped when the delayed timer runs), so timing accuracy itself was not measured here; real key events carry their input time.
- The ending reaches the roses, and the render loop stops on that frame.
- `npm run build` succeeds; the bundle is about 5 MB (1.9 MB gzipped), mostly three.js's WebGPU build and Rapier's inlined WebAssembly.

Not run here: the WebGPU path, real media, real models, and a playthrough by hand.
