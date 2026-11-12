# Independent review: ordinary play, complete interior and Chinese localization

**Baseline decision: not accepted in all three areas.** The player's latest
instruction takes priority: establish understandable ordinary play and a complete
house interior first, then optimize technology and fine detail on that working
foundation. Mandatory new challenges, a decorated fireplace recess and a Chinese
dialogue JSON file do not independently satisfy those goals.

This extends `review-2026-11-11-independent.md`; it does not revise that
baseline's rejection or score. Review inputs were `docs/design.md`,
`docs/script.md`, the player-supplied screenshots, and the exploration, tasks,
gear-game, state, session, audio, localization and UI source. No browser, build,
test or typecheck was run by this reviewer.

The main agent is changing these files during the review. The newer source now
contains a normal/challenge mode boundary, a unified language module, translated
UI wrappers and revised chair behavior. These are corrective work in progress,
not independently accepted results. The main agent also reports a basic Chinese
title/prompt/pause check passing; this reviewer has not yet inspected the final
runtime evidence. The complete interior is being rebuilt. Keep failures and
pending re-verification distinct from newly implemented changes.

## 1. The ordinary chapter players must be able to understand

The original core is an exploration chapter, rather than three separate tests:

| Stage | Player understands | Ordinary action | Visible consequence |
|---|---|---|---|
| Arrival | Time is stopped; the watch and page establish a reason to help | Watch the opening, then move and look | Control is clearly handed over; the goal is to recover three gears and restore the watch |
| Size discovery | Pink makes small, blue makes big, cake restores normal | Approach and use the tea/cake | A readable transformation and a persistent indication of current size |
| Exploration | Different sizes allow different places | Giant reaches the tree hollow; small enters the fountain; normal enters the house | A gear is acquired and one layer of the garden wakes |
| Return | Three gears complete the watch; normal size is needed at the table | Return and interact with the watch | A clear repair followed by the song |
| Song | Watch the solo, then tap the lit cup on the beat | Space or click when cued | Immediate rhythmic feedback and the garden joining in |
| Ending | Time reaches 6:01 and the tree door is now open | Follow the authored ending | Page, open door, roses, a comprehensible result and replay |

The three gears can be collected in any order. The main loop is size-based
exploration, return and discovery. Chairs, banter, size toys and tea service can
enrich it; players must be able to distinguish those activities from progression.
The revised instruction to finish ordinary play supersedes the older diagnosis's
suggestion to make every gear a mandatory 30–60 second mini-game.

### Current baseline failures and understanding costs

**[P1] The goal was hidden along with the answers.** In the reviewed baseline,
the opening lines say that things cannot be taken until 6:01 and show the gears
scatter, but never directly establish the player's three-gear repair task.
`startExplore` did not initialize a 0/3 status; the objective stayed blank for
the first 80 seconds. Removing location/size spoilers should not remove the
goal itself. New source adds a gear count and a general tea/glint cue; this is
a useful direction, but the handoff must still explain why the player is acting
and what completing the chapter means.

**[P1] Additional rules replaced simple gear discovery.** The baseline
`pickUp` always called `playGearGame` before awarding a gear:

| Added challenge | Understanding burden | Conflict with ordinary play |
|---|---|---|
| Tree | Move an abstract cursor, hold for 3.2 s, repeat at nine targets, manage slips | A second control scheme appears after the player has already solved the size/location problem |
| Fountain | Select one of three lanes, wait for a 0.75 s window in a 3.8 s cycle, make nine steps | The challenge asks players to wait for flowing syrup before the syrup is supposed to wake on collecting that very gear |
| Hall | Learn six numbered watch buttons, compare at least three, recognize a double tick over three rounds | The room does not contain six corresponding physical watches, so the puzzle exists primarily in a separate screen |

The newer `game.challenges` gate makes ordinary pickup possible without these
screens. Verify default, saved-game and replay behavior rather than assuming the
new branch is exercised. Challenge mode, if retained, must be explicitly optional
and separately explained/localized; its completion statistics cannot make a
normal playthrough appear unfinished.

**[P1] Guidance did not progress coherently.** The baseline idle hint selected
the nearest gear but spoke only `gear.hints[0]`. The clearer EX-02/03, EX-05/06
and EX-08/09 lines were not successively used by that function. The delayed text
instead preferred a fixed tree/house/fountain order based on size and remaining
gears. A player already approaching a valid normal-size house goal could be
sent back to blue tea and the tree. At long distance, a hint requested with the
Dormouse's distance could have no subtitle because subtitles are hidden beyond
12 m, while `voiceHinted` still becomes true. Critical help needs delivery and
recall; ambient distance behavior should not silently consume it.

**[P1] Failure to interact often had no understandable reason.** A size-rejected
door or gear simply failed its `can` predicate. New source adds several local
wrong-size messages; verify all three sizes at each entrance, not just a matching
size. Recovery is equally important: a giant's normalizing cake is far away on
the terrace, while the nearby small cakes have different size predicates. A
player needs a discoverable way back to ordinary size without debug coordinates.

**[P1] A shortened interaction must remain an actual, synchronized action.**
The previous seating acceleration is covered in the first independent review.
Source inspection during this review also found six-times pickup timing and
eight-times repeated-tea approach timing; the main agent reports removing the
pickup multiplier and is correcting the remaining tea approach. These changes
need normal-speed evidence. A quick root translation with a normally timed
skeleton does not satisfy ordinary pickup, sitting or drinking.

**[P1] Existing regression does not establish ordinary-player comprehension.**
The old route's `interact` default presses Enter 250 ms after E. Opening,
repair, song and ending are also skipped. The bot knows waypoints and observes
internal puzzle state, including the correct watch. That is useful state and
collision coverage, but it cannot show that a new player understands the task,
finds the visible path, reads the language, hears the important clue or watches
a complete action without visual/timing faults.

### Ordinary-play acceptance checklist

- [ ] On a clean start, the title, first instructions and opening can be read in
  the selected language. A player can state the immediate goal at control handoff:
  recover three gears, repair the watch and help time move again.
- [ ] Movement, looking, interaction, view change, pause, current size and 0/3
  progress are understandable. Prompts identify the actual nearby object.
- [ ] Each tea and the normalizing cake gives the promised state change, with a
  readable full first interaction and a deliberate short repeat. Controls,
  animation, sound and world movement retain consistent speed.
- [ ] At every wrong-size entrance or target, the player gets a concise reason
  and can discover a valid next action. No size traps the ordinary player.
- [ ] The visible paths lead to the table, hollow, fountain and house entrance.
  Walk them using the player view and controller, without teleportation, debug
  waypoints or cutting through beds merely because the ground permits it.
- [ ] Normal gear acquisition uses exploration and the appropriate size.
  Optional challenges do not appear or block it unless deliberately selected.
- [ ] All six gear orders preserve meaningful prompts and progress. A nearest
  useful clue does not conflict with the current valid route or completed gear.
  Hints remain available if a previous delivery was distant or interrupted.
- [ ] The acquired gear, world awakening, count and saved progress agree.
  Returning to the normal-size table clearly offers repair once, with no optional
  tea-service interaction masquerading as the required next step.
- [ ] The whole repair/song/ending plays unskipped once. The player knows when
  tapping begins, which cup is relevant and what the feedback means.
- [ ] Sitting and optional tea service have clear entry/exit controls. Different
  chairs and repeats behave normally; they do not unexpectedly advance the story.
- [ ] Pause/resume, save/continue and replay preserve a coherent normal-mode
  experience. The save summary and results describe ordinary progress rather
  than requiring old challenge records.
- [ ] An independent first-time playthrough reaches the ending with only the
  in-game information. Record where help was needed and fix those points before
  presenting a guided/debug-aware route as proof of usability.

## 2. A complete house interior, not a mantel exhibit

**[P1] The old interior fails the user's requested scope.** The user-supplied
`07-cottage-hall.png` shows the front opening into a small fireplace arrangement
with a bright blank surround. In the inspected baseline, `hall.halfWidth=0.72`
and `hall.depth=0.6` define about **1.44 × 1.2 m**. The added floor is only about
1.08 m deep, with low side panels and wallpaper behind the fireplace. This is a
doorway display, not a house interior. A tight `hall-front` screenshot hides
that fact by filling the frame with the fireplace.

The original design required a warm hall containing the Hare's buttered tools,
clock, jars and note. The latest explicit instruction requires a complete
interior. Finishing only the old hall box would no longer meet the task. The
reported 6 × 5 m rebuild is work in progress; dimensions and a renamed group do
not establish completion without a complete plan and walkthrough.

### Required spatial result

The reviewable house should have a readable entrance and main living/tea room
with the quest fireplace, connected to a kitchen or butter/tool work area and a
small resting/storage area. These are concrete proposed functional zones for a
coherent Hare's home, rather than a demand for an invented multi-storey mansion.
They may be connected single-level rooms or a coherent open plan, but the
interior must occupy the house believably and allow players to move among them.

| Area | Required evidence |
|---|---|
| Exterior/threshold | A continuous route up the existing steps, through the swinging door and onto the interior floor; no invisible ledge or unrelated height jump |
| Interior shell | Continuous floor, full-height walls, ceiling/roof underside, corners, skirting and openings; no bright void around a fireplace panel |
| Main room | Space to enter, turn, see the mantel gear and read its surroundings; furniture arranged as a room, not as a row against an isolated backdrop |
| Connected household zones | A recognizable butter/tea work surface, storage and resting use; visible, traversable connections with consistent scale and material joins |
| Quest position | One understandable mantel target among relevant clocks/tools/jars, a readable localized note, and room to approach/interact without camera or furniture collision |
| Windows/light | Window positions agree with the exterior; warm interior light and a readable threshold transition, without exposed outside terrain or flat white gaps |
| Camera/collision | Normal third person can enter, turn, approach, withdraw and leave; first person has correct eye height; wall/roof handling keeps the room intact and readable |

### Interior acceptance checklist

- [ ] A plan view identifies every room/zone, doorway, furnishing footprint,
  quest interaction point and route back outside.
- [ ] At normal size, enter from the visible garden path, walk every connected
  space, turn around and exit without jumps over ordinary steps or debug moves.
- [ ] All wall/floor/ceiling joints remain closed from the arrival camera and
  a slow 360-degree turn in each room. The complete interior fits the exterior.
- [ ] Doors and furnishings have matching collision; the camera does not enter
  the player's hair, wall, ceiling or a decorative outer shell.
- [ ] Inspect the small- and giant-size rejection at the house from outside.
  The reason is understandable, and the player can restore normal size.
- [ ] The normal gear is found by exploration and recovered once. The note and
  associated dialogue make sense in the actual room and selected language.
- [ ] Show the whole home before close details: exterior arrival, threshold,
  each room, connecting movement, mantel interaction and exit. A fireplace crop
  alone cannot pass this checklist.

## 3. Chinese must work in the product, not just exist as data

### What the baseline did and did not contain

The Chinese file does exist and covers the **137 English dialogue IDs**. Most
lines communicate the story understandably. The newer `_ui` dictionary is a
container, not an extra voiced dialogue ID. It would be inaccurate to claim
that all Chinese dialogue is missing; the failure is delivery, settings,
non-dialogue coverage and lack of an end-to-end language review.

**[P1] Two language authorities could overwrite each other.** The old audio
module selected `lang` from the URL or `tea-party-language`. The session module
separately loaded `tea-party-settings.language`, defaulting to English, then
called `setSubtitleLanguage`. Old saved settings could override `?lang=zh`; with
no session settings, a previously saved audio-language choice could be reset to
English. The newer `i18n.js` owns selection and session preferences now defer to
it. That addresses the source-level conflict; verify it against real clean and
existing profiles before marking language persistence accepted.

**[P1] The baseline Chinese choice translated only voiced lines.** Core text
outside `lang/zh.json` remained English:

| Surface | Baseline source / examples |
|---|---|
| Title/loading | `index.html`, `loading.js`: title, intro, start/continue, progress messages, key guide, picture quality |
| Exploration | `explore.js` / `layout.js`: gear count, objective, drink/eat/pickup/mend/sit labels and wrong-size guidance |
| Optional tasks | `tasks.js`: tea-service controls, caught count, note interaction and text painted onto the note texture |
| Challenge screens | `gear-games.js`: instructions, failure/retry/leave buttons, watch choices, canvas captions and scores |
| Song/results | `song.js`, `story.js`, `session-ui.js`: timing feedback, rhythm/streak text, elapsed time, discoveries and replay |
| Settings/accessibility | Pause headings, save feedback, sliders, option labels, `aria-label` values and dialog descriptions |

The new translation wrappers and static DOM localization improve coverage, but
review the rendered strings as well as dictionary keys. A text-node walker does
not automatically translate attributes, canvas drawings, textures, dynamically
created elements or already-rendered changing counters. The challenge source
still contained English instructions and buttons in the last inspection; if it
is retained as an explicit option, it needs its own language acceptance.

**[P2] Dialogue quality and context still need editing.** EX-10 usefully explains
pink/blue/cake and should use the same terms as the interactive prompts. The
current ED-03 translation makes the Dormouse describe the spout as comfortable,
while the English line is a sleepy complaint about its snug fit; the visual
gag and subtitle should agree. ST-03's literal phrasing is awkward, and the
Time/beat-time jokes need consistent character naming and Chinese wordplay.
Do not replace a full subtitle edit with a count comparison.

**[P1] Critical information could be inaudible or uncaptioned.** `audio.js`
renders a subtitle only when the source is ready and the passed distance is
below 12 m. That is a reasonable ambient convention, but a progress hint or
necessary instruction cannot be treated as delivered if it was hidden at a
distant landmark. Separate ambient dialogue from essential help, or provide a
localized recall/readable alternative. Test quiet/muted voices as well as normal
audio: a player should not lose ordinary-play instructions by lowering volume.

**[P1] The language must survive delivery.** The existing ignore policy excludes
all non-English `src/lang/*.json` files. A local working copy can therefore show
Chinese while another checkout/build does not contain it. The user's explicit
Chinese requirement now takes priority over historical English-only repository
conventions. Package the approved Chinese locale reproducibly; do not rely on a
machine-local ignored file or silently fall back to English while the selector
still claims Chinese.

### Localization acceptance matrix

| Case | Required outcome |
|---|---|
| Clean profile | Chinese is available and selected as intended before the opening; first controls, goal and subtitles are readable |
| Explicit `?lang=zh` / `?lang=en` | The requested valid language consistently controls dialogue and UI |
| Old settings: English in one key, Chinese in another | A documented single precedence resolves the conflict; UI and spoken-line captions never disagree |
| Change language during a voiced line | The displayed line changes immediately and remains correct through its end |
| Change during exploration/song/pause/results | Existing dynamic labels, counters and buttons update without waiting for another gear or restarting |
| Continue/replay/reload | The chosen language persists while ordinary progress follows the intended save/replay rules |
| Missing locale/key | A visible selector cannot claim a language that is unavailable; missing strings are reported and fixed before acceptance |
| Quiet, distant or muted voice | Essential instructions and hints still have readable selected-language delivery |

### Chinese coverage and quality checklist

- [ ] Title, loading, settings, save/continue, exploration, both teas/cakes,
  all gear interactions, chairs, optional tea service, repair, song, ending and
  results have been viewed in Chinese in the actual ordinary flow.
- [ ] No untranslated gameplay prose remains. Latin key names, proper titles
  and technical labels deliberately confined to diagnostics are treated
  separately from missing product copy.
- [ ] Static UI, dynamic UI, attributes, canvas captions and painted note text
  all update or regenerate when language changes.
- [ ] Prompt verbs distinguish interaction, pickup, entry/exit, standing up and
  optional activities. The same Chinese terms describe small/big/normal size,
  pocket watch, wall clock, gear, tea and cake throughout.
- [ ] Subtitle text agrees with the actual animation, trigger and speaker. Lines
  are readable with the chosen CJK font, line wrapping and contrast; no cropping,
  replacement glyphs or unreadably long one-line subtitles appear.
- [ ] The song's instructions and important dialogue cues are localized. Decide
  explicitly whether sung lyrics also receive timed subtitles rather than
  assuming the dialogue ID file covers the song recording.
- [ ] English remains coherent when selected. Locale changes, saved settings,
  clean profiles and the built distribution receive the same review.

## 4. Work order and independent completion gates

1. **P1: establish ordinary play and its copy.** Make the default chapter match
   the original loop, state its immediate goal, identify the available actions,
   give useful wrong-size feedback and remove mandatory extra challenge rules.
   Keep full-speed movement/animation and reliable exit/recovery paths.
2. **P1: build the complete connected home.** Produce a concrete floor plan and
   furnish/close the full interior, then verify threshold, camera, collision,
   gear approach and route out. Stop refining the old mantel display as though
   it were already a house.
3. **P1: finish Chinese delivery together with that flow.** One language owner,
   reproducibly included locale data, complete product text and a contextual
   subtitle pass. Source wrappers are implementation evidence, not acceptance.
4. **P1: independently play and watch it unskipped.** Use a clean profile and only
   in-game information. Capture normal interactions, household movement,
   progress/hints, repair, song and ending. Review every place where the player
   hesitates, cannot explain a rule or cannot identify a next action.
5. **Then optimize and polish against the accepted baseline.** Preserve ordinary
   behavior and Chinese coverage while addressing performance, contact,
   deformation, lighting and fine detail. Re-run the relevant ordinary route
   after those changes. A higher frame rate or a larger asset/image count cannot
   reopen a failed gameplay, interior or language gate by itself.

The next evidence handoff should include the mode and language settings, an
uncut ordinary playthrough, the home floor plan plus a full indoor walkthrough,
and Chinese screenshots/text inventory across the whole flow. Record any
required reviewer assistance. Each of the three domains remains **pending
independent re-review** until those materials address its checklist; no new pass
or higher score is assigned in this document.

## Appendix A: independent evidence recheck, 22:37 UTC+08:00

**Limited improvements confirmed; no overall acceptance and no revised score.**
This recheck inspected the supplied language and seating JSON, the cottage route
JSON, and all seven new language/room images. It also read the capture helpers
and changed language/exploration source. It did not launch a browser or run the
checks again. A frozen copy of this exact handoff is retained under
`art/review/2026-11-11/independent/recheck-01/`, because the main agent continues
to replace the live revision files while repairing the game and capture tools.

### A1. Chinese title, basic prompt and pause: demonstrated for the supplied case

The viewed `revision/language/title.jpg` has a readable Chinese title, start
button, movement/interaction guide and picture-quality control. Its introduction
now explains that time is stopped, gears must be recovered and the watch must
be repaired. The viewed pause image has Chinese headings, option labels, volume
labels, save text and buttons without clipping. The JSON records the blue-tea
prompt in Chinese. These directly improve the previous English-only presentation
and support **basic Chinese title/prompt/pause acceptance for this captured run**.

Source inspection confirms that the audio and session modules now use
`i18n.js` as their common language authority. `session-ui.js` explicitly keeps
`currentLanguage()` after reading old settings. The ED-03 wording now conveys
that the spout is cramped. The ignore file now permits `src/lang/zh.json` to be
included; it is visible as a new untracked file rather than silently ignored.
That proves eligibility for inclusion, not that a committed or deployed
distribution has been independently checked.

The language check covers a clean default title, one placed interaction and one
pause menu. It does not exercise saved-language conflict cases, explicit query
overrides, switching during a voiced line, changing existing hints, the note
texture, song/results, reload/continue or the built distribution. `tr` wrappers
and a changed ED-03 string are implementation evidence; those remaining cases
stay pending. In particular, a translated note texture still needs a readable
close view in the real room, not only a source-level translation function.

### A2. Ordinary goals and challenge boundary: source corrections, not a complete playthrough

The inspected state defaults `challenges` to false, and pickup calls the gear
challenge only when that option is enabled. This removes the old source-level
requirement to pass all three challenge screens in ordinary play. Initial gear
count and the general gear objective now appear in source and also in the HUD
visible in the submitted room image files. The earlier claim that the initial
objective is completely blank no longer describes this inspected revision.

The hint function now advances through all three clue IDs, and explicitly puts
the chosen clue into a ten-second text message before calling the distant voice.
That is a concrete correction for a hint being consumed beyond the subtitle
distance. It does not yet prove that a new player receives the right clue at the
right moment, that language switching refreshes an already-visible hint, or that
late objective text agrees with all valid gear orders. Those require the
ordinary-play handoff and progression evidence described above.

There is no completed new ordinary route or unskipped performance recording in
this handoff. Therefore the main loop, first and repeated size changes, pickup,
repair, song, ending and replay remain pending independent re-review. The
reviewer has not independently played the optional challenges or judged their
understandability; they are outside the default-flow acceptance established here.

### A3. Two-chair rate regression: narrow timing defect improved

`revision/seat-speed.json` records chairs 2 and 3 with `sceneRate=1`,
`sceneSkipping=false` and input withheld during entry. The inspected helper also
checks that the player remains seated, then uses E to leave. This supports the
claim that the immediate global eight-times rate defect has been removed in
these two cases and that an explicit E exit path is present.

The helper samples the rate about 80 ms after entry, then presses Enter to
complete seating. It does not watch the complete natural sit-down, dialogue,
pelvis/chair support or body movement. It tests E to leave, not the claimed
WASD exit. Preserve this as a useful regression, but keep full normal-speed
seating and the movement-key exit pending until their unskipped evidence is
reviewed. Do not mark all chair animation accepted from one early rate sample.

### A4. Cottage traversal: useful controller evidence; visual evidence rejected

The route JSON contains eleven recorded steps after one initial placement
outside. The helper uses keyboard/controller movement for entry, several room
positions, the mantel approach and exit. Interior local floor heights remain
around 1.11 m, and row 7 records a Chinese gear-pickup prompt at the new mantel
location. This is meaningful evidence that the sampled new floor connections
and a normal-size quest approach are traversable. It does not show taking the
gear, every furnishing collision, both camera modes or an uninterrupted route
from the main garden hub.

**All five supplied room photos fail as visual evidence.** This reviewer opened
`entry.jpg`, `living.jpg`, `bedroom.jpg`, `kitchen.jpg` and `hearth.jpg` individually.
Each is the same solid dark-purple render area with a Chinese HUD and no visible
room. Each file is 17,306 bytes, with the same SHA-256:

`3FE78612B36A6836D39986CEECA6D0F7A30ED73CC17C1FAA05409879F4615B19`.

The main agent subsequently identified a capture-helper module import creating
another renderer/canvas and is replacing that helper. This explanation is
reported by the main agent; it is not an independent runtime diagnosis by this
reviewer. The blank files must not be interpreted as evidence that the player's
normal game necessarily renders blank, or as evidence of a completed house.

No judgment about the new furniture, wall joins, hearth, bedroom, kitchen,
wood-grain correction or floating-prop clearance can be made from these photos.
The previous house failure therefore remains **visually unverified**, rather
than being automatically passed or being asserted unchanged after a rebuild.

Supply distinct images captured while the real player actually stands in each
space, plus a continuous entrance/living/bedroom/kitchen/hearth/exit walkthrough.
The reviewer still needs to see: the complete enclosing floor/walls/ceiling,
connections among the household zones, credible furniture use and scale,
door/window alignment, the readable localized note and quest prop, camera
clearance, lighting, and the route back outside. The room's content cannot be
declared missing or complete until usable new views are delivered.

### A5. Recheck status summary

| Area | Demonstrated by this handoff | Still required |
|---|---|---|
| Chinese product language | Readable title/intro/basic prompt/pause in the captured default run; common language owner and revised ED-03 in source | Persistence/query/switch matrix, live hints, note, song/results, continue/replay and built-package coverage |
| Ordinary-play foundation | Default challenge gate and initial goal/count in source; three-tier readable hint mechanism | A completed ordinary route and full unskipped interactions, then a first-time comprehension review |
| Seating | Rate 1 on two early entry samples; persistent seat and E-exit checks in the helper | Natural full entry/exit, body/chair support, movement-key exit and interruption cases |
| House connections | Recorded controller movement through sampled indoor points to the quest prompt and back out | Distinct valid room images, a full indoor walkthrough, actual pickup and complete architecture/furnishing/camera review |

The ordinary-play and full-house priorities remain in force. Basic Chinese UI
improvement is recognized without presenting it as completion of Chinese
localization, ordinary gameplay or architectural acceptance.
