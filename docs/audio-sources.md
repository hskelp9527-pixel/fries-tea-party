# Recorded garden sounds

The game uses recorded Foley rather than synthesized noise. Only the chosen variants are loaded, on first use or through the small background Foley cache.

| Use | Creator / source | License |
|---|---|---|
| Grass, wood and stone footsteps; plate, glass and wood interactions | [Kenney — Impact Sounds](https://kenney.nl/assets/impact-sounds) | CC0 1.0 |
| Mantel watches and gear clues | [cemkalyoncu — Tick and Tock](https://opengameart.org/content/tick-and-tock) | CC0 1.0 |
| Syrup drops and pouring | [bxyorna — Water drop / Splash](https://freesound.org/people/bxyorna/sounds/410335/) | CC0 1.0 |

`scripts/fetch-sfx.mjs` records the original links, license, filenames and conversions in `art/optimized/audio/sources.json`; the Kenney license is retained alongside the files. WAV/MP3 additions are converted to mono Opus at 64 kbps. Kenney recordings remain unchanged.

The five selected music versions use Opus at 80 kbps. All 137 recorded dialogue source files use mono Opus at 40 kbps. Earlier request counts included Vite URL modules as well as media requests; there are 137 source WAV files, not 274 distinct recordings. A 24-line cache bounds decoded speech memory. Simplified Chinese covers every English subtitle ID and can be selected live in the pause menu.
