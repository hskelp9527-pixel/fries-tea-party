# Fries in Wonderland: The Six O'Clock Tea Party

A standalone chapter of a web game, built with three.js. Fries drops into the Mad Hatter's tea party, where time is stuck at six o'clock, finds three watch gears, and saves the song that lets time move on to one minute past six.

The design is in `docs/design.md`; dialogue is in `docs/script.md`.

Current implementation, verification limits and next tasks: [continuation notes](docs/current-status.md).
Run `npm run dev` to play locally. `npm run build` and `npm start` serve the optimized production game with gzip on port 5200.
With local media installed, `npm test` runs the unit checks and complete input-driven chapter regression; it starts a local server if needed. `npm run test:unit` runs the scheduler, rhythm, quality, layout and measured prop-placement checks by themselves. `npm run test:browser` runs the walking regression against port 5199. Changes and evidence are in [the November 11 report](docs/optimization-2026-11-11.md).

Ordinary play is the default: explore, use tea/cake to change size, collect three gears, repair the watch, follow the glowing rhythm cue, reach 6:01 and replay. Each gear comes with a short challenge (tree, grotto, mantel); `?nochallenges` skips them. The connected cottage contains a sitting room, kitchen, sleeping area and storage. The interface defaults to Simplified Chinese with English recorded voices; language switches throughout the interface and subtitles in Settings.

WASD moves, Shift runs, Space jumps, E interacts, V changes view and Esc pauses. A chair stays seated until E or movement requests standing. Repeated interactions shorten their performance at normal simulation speed. Enter finishes scripted scenes. The ordinary regression uses Enter to shorten scenes; `node scripts/gameplay.mjs --no-skip` records a natural main-line run and follows the actual visible rhythm cue, without position/size overrides or automatic jumps. Automated cue following does not measure a first-time human player's rhythm skill or comprehension.

## Media is not in this repository

Art, music, voice and models are kept out of this public repository. In the local working copy they live at the paths below, and the game loads them from these paths. In a cloud session they are absent: build and test with placeholder boxes and silent audio.

| Path (local only) | Content |
|---|---|
| `art/characters/`, `art/props/`, `art/storyboard/` | Reference images |
| `art/models/<name>.glb` | Game-ready models; a collider mesh in the same file is named `<name>_collider`. Metres, +Y up |
| `audio/<file>.mp3` | Music, file names as listed in `docs/design.md` |
| `audio/voice/lines/<line id>_<speaker>.wav` | One voiced line per file, for example `OP-01_hatter.wav`; speaker is `fries`, `hatter`, `hare` or `dormouse` |
| `art/optimized/` | Generated Meshopt/WebP models, flower atlas and Opus audio; refresh with `npm run assets` |
| `art/characters/finished/`, `art/props/finished/` | Source-preserving character rebinds, the connected cottage shell and playable fountain grotto |

`audio/04t_little_bat_a.beats.json` is in the repository: the measured beat times of the theme song, `{"file", "bpm", "beats": [seconds...]}`.

## Rules

- Source identifiers and file names use English. Product translations are delivered in `src/lang/zh.json`; Chinese interface/subtitles are part of the current game contract.
- Develop with surgical precision. No over-defensive code: no checks, fallbacks or abstractions the task does not need.
