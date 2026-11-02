# Design: The Six O'Clock Tea Party

A standalone chapter of *Fries in Wonderland*, based on Chapter 7 of Lewis Carroll's *Alice's Adventures in Wonderland*. It must work as a finished piece on its own. The book page, the gears and the frozen world are new to this chapter.

## Core experience

The player drops into a magical tea party already in progress. There is no explanation of how Fries got there. In a garden where time has stopped at six o'clock, the player recovers the gears of a broken pocket watch; the world wakes up layer by layer, and in the end everyone sings "Twinkle, Twinkle, Little Bat" so that time can move on by one minute.

The focus is on showing off the models, the scene and the characters. Gameplay is limited to growing and shrinking, finding gears, and tapping teacups to the beat.

- Length: 15 to 20 minutes (to be confirmed by playtesting).
- Platform: web, keyboard and mouse. English voice and songs; subtitles are added separately.
- Engine: three.js with the WebGPU renderer, falling back to WebGL with less grass, fewer flowers and fewer effects. Physics with Rapier. Animation retargeting, cutscenes and collision are our own code. Cutscene cameras can be animated in Blender and exported as glTF.
- Camera: third person by default; first person at any time.

## Flow

Storyboard frames are in `art/storyboard/` (s01 to s16, plus `fp_small.png` and `fp_giant.png`).

1. **Opening:** the camera glides along the long table to Fries. The Hatter and the March Hare shout "No room!". Tea hangs in mid-air and petals float, frozen.
2. **Goal:** a glowing book page is tucked inside the Hatter's pocket watch. Fries reaches for it and the watch is snatched away: "Six o'clock things can't be taken; come back at one minute past six." The Hatter murdered the tune of "Twinkle, Twinkle, Little Bat" and offended Time; then the March Hare "fixed" the watch with butter and its gears scattered everywhere.
3. **Free exploration:** control passes to the player. The three gears can be collected in any order. There is no map and no quest arrow; the player finds the way by glints, sounds and the Dormouse's sleep-talk.
   - Gear 1 is under the long table and needs the player to be small. Collecting it makes the tea steam and the petals fall.
   - Gear 2 is in a gap in the fountain's base and needs the player to be small. Collecting it makes the syrup flow and butterflies take off.
   - Gear 3 sits on the tallest hat on the hat rack on the porch of the March Hare's cottage and needs the player to be big. Collecting it makes the flower bushes sway and hum.
4. **Song and dance:** the watch is repaired. The Hatter climbs onto the table and sings, the March Hare and the Dormouse dance along, and Fries taps teacups. The cups light up and jump on the beat, so a player watching the cues still sees the dance. On the final chorus the camera rises and the whole garden moves together.
5. **Ending:** every clock jumps to 6:01, the sky turns pink, the book page flies into Fries's hand and the door at the foot of the big tree opens. The three ignore Fries completely; they stuff the Dormouse into the pink teapot, shouting about one-minute-past-six tea. Fries walks through the door, sees red roses, and the picture freezes. The roses must not appear before this final shot.

## Growing, shrinking and the camera

Pink tea makes Fries small, blue tea makes Fries big, and eating cake restores normal size. The first time the player shrinks and the first time the player grows, the camera cuts straight to first person; after that `V` toggles the view and the game remembers the player's choice.

| Size | First encounter | Later encounters |
|---|---|---|
| Small | The Hatter's huge face presses down from the sky, eyes rolling as he looks Fries over; his voice is deep and his breath pushes Fries back | The Dormouse's breathing blows Fries around; the March Hare's huge hand lays down a spoon as a bridge |
| Big | The Hatter and the March Hare are tiny figures on the table, shouting up in squeaky voices | The March Hare scurries past Fries's feet; Fries can pinch a teacup between two fingers |

The sense of scale comes from techniques that cost no models: eye height, field of view, movement speed, footstep sounds and ground shake, a shallower depth of field when small, tilt-shift blur when big, and voices pitch-shifted to match. First person shows no hands and no body; there is no hand model.

The biggest risk is first person putting a model right in front of the camera. The Hatter's face needs a high-resolution texture and believable eyes and blinking, and how close it gets must be limited. Validate this one shot first, then decide how many other such interactions to build.

## Characters and actions

| Character | Role | Actions |
|---|---|---|
| Fries | The player; explores and taps cups | Idle, walk, run, jump, drink tea, tap a cup, reach for something |
| The Hatter | Host and lead singer; sets the goal | Sit, laugh, sing, dance, take out the watch, point, lean down to look at Fries |
| The March Hare | Troublemaker and heckler | Sit, laugh, dance, pour tea, lay down a spoon |
| The Dormouse | Gives clues through sleep-talk; carries the final joke | Doze, wake with a start, sleep-talk, sway, get stuffed into the teapot |

Animation budget is tight: at most six purchased presets (`idle`, `walk`, `run`, `sit`, `sing_01`, `dance_01`), bought once on Fries and shared by the other characters. If two rigs share bone names the clips play directly; otherwise they are retargeted with three.js `SkeletonUtils.retargetClip` (not yet verified). Everything else is hand-animated in Blender. Mouth movement, blinking, and the sway of hair, ears and coat tails are procedural.

## Assets

Models are produced separately and arrive over time; code must run with placeholder boxes until then.

| Kind | Items | Source |
|---|---|---|
| Characters | Fries, the Hatter, the March Hare, the Dormouse | Tripo, rigged; turnarounds in `art/characters/` |
| Key props | Big tree, tree door, the March Hare's cottage, wall clock, long table, armchair, hat rack, pink teapot, blue teapot, pocket watch, fountain | Tripo; reference images in `art/props/` |
| Minor props | Lantern, three-tier cake stand | Hyper3D or Blender |
| Simple props | Teacup, gear, milk jug, plate, spoon, candle, clock hands, book page, grass, flowers, stone path, steps, hedges, tree canopy | Blender; one model, many instances; anything the player can touch has a collider |
| Effects | Petals, steam, tea, syrup, water drops, fireflies, butterflies, music notes, golden light | Particles and materials |
| Backdrop | Distant woods, hills and sky | Image cards with fog, hiding the edge of the world |

Model conventions: metres, +Y up, GLB. A collider mesh in the same file is named `<name>_collider`.

The scene is one continuous garden with no separate areas: the long table stands under the big tree, and the fountain and the cottage are a few steps away. Objects are reused many times, each copy offset in timing and randomly varied in size and colour; flower bushes, teacups, chairs and lanterns all move as groups this way. The only optional "musicians" are humming flowers and a snoring chimney.

## Keeping the space alive

Stopped time affects only the tea, the petals, the syrup and the clocks. All other magic keeps working, so even the opening is not static. These ambient touches are independent of the main line, reuse existing models and are driven by code:

- **Floating objects:** teacups, spoons, plates, pocket watches and hats drift and turn slowly in the air, with offset timing and paths so they never look repeated.
- **Reactions to the player:** floating cups move out of the way, hats turn to "look" at the player, chairs shuffle a little.
- **Character business:** the Hatter pours tea into an empty cup, the March Hare changes seats, the Dormouse blows bubbles while snoring.
- **Scale contrast:** when small, a passing spoon looks like an airship and a plate overhead casts a shadow; when big, the same objects circle the player like insects.
- **Growing with each wake-up:** every recovered gear adds more floating objects and livelier motion; during the song everything moves on the beat.

## Music and voice

All music is in `audio/`; files with `t` after the number are the chosen takes. One style throughout: old music-hall swing in 4/4 with accordion, clarinet and an out-of-tune upright piano.

| File | Kind | Length | Use |
|---|---|---|---|
| `01t_opening_b.mp3` | Instrumental | ~40 s | Opening until control passes to the player |
| `02t_explore_frozen_b.mp3` | Instrumental loop | ~2 min | Sparse and eerie, music-box led |
| `03t_explore_awake_a.mp3` | Instrumental loop | ~2 min | Same style, fuller; fades in as gears return |
| `04t_little_bat_a.mp3` | Song | ~80 s | The song-and-dance climax |
| `05t_little_bat_instrumental_a.mp3` | Instrumental of the song | ~80 s | Title and results screens |
| `06t_ending_a.mp3` | Instrumental | ~30 s | From 6:01 to the freeze frame |

The song is sung three times: the Hatter alone and off-key while time stays frozen; Fries taps the cups to rescue the rhythm and the March Hare and the Dormouse join in; then everyone sings. After the last note there are one or two seconds of silence, then a "click" as time moves to 6:01.

The song's measured tempo is about 108 BPM and not steady: the first 20 seconds (the off-key solo) are loose at 110 to 119 BPM, then it settles at 105 to 107. So cups and crowd motion follow the measured beat times in `audio/04t_little_bat_a.beats.json` (146 beats), not a fixed BPM, and the tap window is about ±120 ms. The player does not tap during the first solo, which avoids the unsteady part. The three passes differ little in loudness, so the build-up must come from visuals and lighting.

Dialogue is in `docs/script.md`: 59 voiced lines and 12 prop sound cues. Each voice line is a WAV in `audio/voice/lines/`, named `<line id>_<speaker>.wav`. All voices use British accents. Props never speak; they only make sounds (cups clink, clocks tick, hats creak as they turn, teapots whistle, flowers hum).

## Open questions

| Question | If it fails |
|---|---|
| Can purchased animations be shared across characters in three.js? | Buy only the essential clips per character |
| Can a mid-range laptop hold 60 fps? | Less grass and flowers, fewer shadows, low-poly models in the distance |
| Can the Hatter's face hold up in a first-person close-up? | Keep a larger distance with depth of field, or repaint the face texture |
| How dense can grass and flowers be on the web? | Lower density, rely on ground textures and close-up detail |

## Order of work

At every stage there should be something worth showing.

1. **Grey box:** a three.js project where boxes stand in for everything; first-person size changes, gear hunting and cup tapping work, with the chosen music and voice lines in place.
2. **Sample:** the first real models (Fries, the Hatter, the long table, the tea set) replace boxes; the standard shots and the first-person close-up are validated.
3. **Song-and-dance short:** four characters and a corner of the tea party perform "Little Bat", recorded as the first finished piece.
4. **Garden:** the remaining props and scenery, exploration and the world waking up.
5. **Release:** polish and deploy the web build.
