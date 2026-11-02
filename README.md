# Fries in Wonderland: The Six O'Clock Tea Party

A standalone chapter of a web game, built with three.js. Fries drops into the Mad Hatter's tea party, where time is stuck at six o'clock, finds three watch gears, and saves the song that lets time move on to one minute past six.

The design is in `docs/design.md`; dialogue is in `docs/script.md`.

## Media is not in this repository

Art, music, voice and models are kept out of this public repository. In the local working copy they live at the paths below, and the game loads them from these paths. In a cloud session they are absent: build and test with placeholder boxes and silent audio.

| Path (local only) | Content |
|---|---|
| `art/characters/`, `art/props/`, `art/storyboard/` | Reference images |
| `art/models/<name>.glb` | Game-ready models; a collider mesh in the same file is named `<name>_collider`. Metres, +Y up |
| `audio/<file>.mp3` | Music, file names as listed in `docs/design.md` |
| `audio/voice/lines/<line id>_<speaker>.wav` | One voiced line per file, for example `OP-01_hatter.wav`; speaker is `fries`, `hatter`, `hare` or `dormouse` |

`audio/04t_little_bat_a.beats.json` is in the repository: the measured beat times of the theme song, `{"file", "bpm", "beats": [seconds...]}`.

## Rules

- No Chinese anywhere in this repository: file names, file contents and commit messages are English only.
- Develop with surgical precision. No over-defensive code: no checks, fallbacks or abstractions the task does not need.
