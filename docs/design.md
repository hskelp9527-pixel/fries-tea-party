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

The scene is one continuous garden with no separate areas (its size and places are set in "Round two" below). Objects are reused many times, each copy offset in timing and randomly varied in size and colour; flower bushes, teacups, chairs and lanterns all move as groups this way. The only optional "musicians" are humming flowers and a snoring chimney.

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

## Round two (2026-11-03): a real garden with places to be

The review (`docs/review-2026-11-03.md`) scored the grey box 1.9 out of 10 against the concept art. This round replaces the boxes with the real models and rebuilds the garden; when it is done the scene should be about half finished, and only then do we tune the game.

### A bigger garden made of places

The garden was 30 by 25 m inside a hedge wall: too small, nothing to do in it, and big Fries could cross it in a few steps. It becomes about **70 by 60 m**, still one continuous space with no loading. Each landmark is a **place**: somewhere characters can stand and act, where a short scene and a small task happen.

| Place | What it is | What happens there |
|---|---|---|
| The tea table | Under the big tree, 8.5 m long and 2.2 m wide, the hub | The hosts sit, banter and pour; drinking the size teas; under it the small world (gear 1) |
| The big tree and its door | A gnarled oak whose roots form a tunnel through the trunk; an arched door at its mouth | The door rattles locked until the ending; then it opens onto the rose path |
| The rose path | Behind the tree, 8-15 m of red roses ending in a heart-shaped arch | Only in the ending; hidden before |
| The teaware fountain | On a low round plaza, a 2.8 m tower of teacups and teapots; a small arched opening at the bottom of the basin | Gear 2 inside the grotto (small); the syrup wakes up and flows |
| The March Hare's cottage | High at the back right on three terraces (0.6, 1.2, 1.8 m) with steps and flowered walls; porch with the hat rack; the door opens into a warm hall | Gear 3 on the hat rack (big); the March Hare's things inside |
| The overlook | A high meadow at the north-east edge | Big Fries sees the whole garden (fp_giant) |

Walking distances matter: the fountain is about 15 m from the table and the cottage about 25 m, so the garden has room between places for flowers, paths and floating things. There is no hedge wall at the edge: the ground carries on and falls away into a valley, with layered hills and trees 40-150 m out. Movement stops at the brow of the slope and at low walls and bushes, not at a green wall.

### Tasks at each place: see it first, come back able

Every place shows the player something they cannot do yet, so they remember it and come back once they can (ability-gated backtracking): a glint behind the grotto's tiny arch, a gear on a hat far above the porch, a locked door that rattles. The abilities are the two sizes and, later, the watch's repair.

| Place | Seen early | Needs | The task, and what it wakes |
|---|---|---|---|
| Under the table | A glint between the table legs, too low to reach | Small (pink tea) | Cross the crumbs and the cloth's fringe; the March Hare's huge hand lays a spoon as a bridge; gear 1. Tea steams, petals fall |
| The fountain's grotto | A light and a ticking sound behind the tiny arch | Small | Inside: a wet stone floor, syrup dripping, a little valve the gear is jammed in; gear 2. The syrup flows, butterflies rise |
| The cottage porch | A gear glinting on the top hat of the hat rack, out of reach | Big (blue tea) | Climb the terraces in giant steps, lift the gear off the hat; gear 3. Flowers sway and hum |
| The cottage hall | The door opens at normal size | Normal | The March Hare's hall: buttered tools, a clock with butter in it, a note; the Dormouse's sleep-talk clue; the March Hare shouts from the table about trespassers |
| The tea table | The Hatter conducting the teapots | Normal | Drinking (the size teas); the tea-service game once the first gear is back |
| The tree door | Locked; the Hatter: "Not till one minute past six" | The repaired watch | Opens in the ending onto the rose path |
| The overlook | Too far to see anything from | Big | See the whole garden and the glints of the gears still missing |

What big is for: crossing the garden in a few strides, stepping up terraces and over low walls without stairs, reaching high places (the porch hat rack, the tree's lower branches to straighten a crooked clock), looking over everything for glints. What small is for: going under and into things. Being big inside small places is blocked by size alone, so the player learns to switch.

### Size changes need a purpose

Small (0.18x) opens the places under things: beneath the table, the fountain's grotto, gaps under hedges and roots. Big must be giant enough to matter: about **5x** (6 m tall), so the eye line clears the cottage's eaves and sees the whole table. When big Fries steps up terraces without stairs, reaches the hat rack on the high porch, looks over everything for glints, and the hosts squeak up at him while the cups look like thimbles. Two or three floating cups and spoons drift near the giant's camera for scale.

### Characters who are alive

- **Gaze:** whoever speaks looks at the one addressed; the listeners look at the speaker; when Fries is near, heads turn to him. Head and neck turn (about ±70° side to side, ±30° up and down, eased over 0.3 s); beyond that the body turns, or for seated characters the chest a little.
- **Banter while the player explores:** the three hosts keep talking among themselves at the table, a short exchange every 15-40 s: bickering, riddles without answers, nonsense about time, and comments set off by what the player does (a gear found, a size change, falling into the fountain, entering the cottage). Lines fade with distance; subtitles only within about 12 m. The new lines will be added to `docs/script.md` with voice files.
- **Blinking:** everyone blinks, at random every 2-6 s, sometimes twice; eyes closed while asleep.
- **Who talks to whom:** the banter is a small scheduler, not a script: it picks an exchange whose conditions hold (who is seated, where the player is, which gears are back, what just happened), plays its lines in turn with the speakers' `talk`/`sit_talk` clips and gaze, and waits 15-40 s before the next. An event the player causes interrupts at the end of the current line. The Hatter leads most exchanges; the March Hare heckles; the Dormouse answers in his sleep.
- **Sitting down and standing up:** characters walk to the front of a chair, turn, sit (the chair slides back a little and settles), play their seated clips, and stand up the same way in reverse. The March Hare changes seats now and then. Fries can sit in any empty armchair at the table (E); the first time, the hosts shout "No room!"; seated, the camera frames the table and the banter turns to him.
- **Story moments get their own animation:** the Hatter holds up the watch and snatches it back, the March Hare butters the watch, the gears burst out and everyone reacts, Fries holds up a found gear, hands mend the watch together, the Hatter leans over small Fries, the March Hare lays the spoon bridge, the Hatter conducts the teapots, the two stuff the Dormouse into the teapot. Props are bound to hand bones and touch the fingers.
- **The Dormouse lies on his plate**, never floating above it.

### Tea, pouring and water

One liquid system serves the fountain, the teapots and the cups: a stream from a spout follows a falling arc, glossy, translucent and amber, thinning as it falls and breaking into drops at the end; a splash ring and droplets where it lands; a liquid surface inside each cup, bowl and basin that rises as it fills; steam over hot tea. Before gear 2 the fountain's syrup hangs frozen in the air like glass; after it, syrup pours from each teapot spout and spills over each tier's scalloped lip in thin sheets.

**The Hatter conducts the floating teapots.** He waves like a conductor and the teapots float over, tilt and pour. This is how Fries drinks: at the table Fries holds out a cup, the Hatter calls a teapot ("Pink for the little one!"), the pink or blue teapot flies over and pours into his cup, and a fixed camera from the front three-quarters shows Fries lift the cup to his mouth with both hands, drink and lower it, then the size change. The cup stays in his hands and never passes through his face or glasses. Later, as a small task at the table, the Hatter conducts several teapots at once to the music and Fries moves his cup under the right stream; a miss splashes.

### Doors and steps

Doors open. The tree door rattles and stays locked, with a line from the Hatter, until the ending. The cottage door swings open into a warm hall. Steps up to 0.25 m are climbed by walking, never by jumping.

### Code, not models, for everything that grows or flows

Not everything should be a model. Grass, flower fields, ivy, the tree's leaves, petals, water and syrup, sky, clouds, haze, terrain and distant hills are made in code; people building three.js worlds with no downloaded assets do this with TSL node materials on the WebGPU renderer, GPU-instanced vegetation and analytic fields. The models are for what must be recognisable at a glance (characters, the cottage, the fountain, the tree's trunk, teapots, chairs, clocks).

## Order of work

At every stage there should be something worth showing.

1. **Grey box:** a three.js project where boxes stand in for everything; first-person size changes, gear hunting and cup tapping work, with the chosen music and voice lines in place.
2. **Sample:** the first real models (Fries, the Hatter, the long table, the tea set) replace boxes; the standard shots and the first-person close-up are validated.
3. **Song-and-dance short:** four characters and a corner of the tea party perform "Little Bat", recorded as the first finished piece.
4. **Garden:** the remaining props and scenery, exploration and the world waking up.
5. **Release:** polish and deploy the web build.
