# Independent follow-up: ordinary play, Chinese and the cottage

Review date: 2026-11-11, UTC+08:00. Reviewer: independent review agent.

**The previous 4.0/10 describes the rejected historical snapshot. It is not the
new production candidate's score.** Current production evidence is being
independently reassessed in `docs/review-production-2026-11-12.md`. This document
preserves the repair history and the explicitly scoped rechecks; it does not
establish acceptance of the complete optimization request.

**Latest disposition:** The newer production-candidate review supersedes this
document's pending handoff status; consult `review-production-2026-11-12.md` for
closed dynamic issues and remaining specific failures. Appendix G independently
inspects its earlier scene batch:
eighteen authored views, three without post-processing and six location views.
Connected paths, supported garden arches, the furnished home and recognizable
distant scenery are credited. Local light/material/composition faults and
capture limitations remain. Two revised lean views and the new dynamic actor /
prop records are pending; no replacement overall score is assigned. Appendix F
recognizes removal of the severe old static mouth tears/nose oval and accepts
the supplied repeated-interaction mechanism regression. Appendix E closes real
note lettering and paused dynamic-text switching; Appendix D closes the
first-shrink camera P1. The ordinary functional foundation can proceed to
refinement. The 4.0 visual rejection is retained pending the complete handoff.
Earlier findings are superseded only by explicit later rechecks.

The latest user instruction and `ordinary-play-contract.md` govern this review:
make ordinary play understandable and complete, provide an actual home and
Chinese throughout, then complete technical and visual refinement. The older
diagnosis's suggestion to add compulsory gear puzzles does not override that
instruction.

This review opened all five corrected cottage images individually, inspected
the route and updated seating records and their capture helpers, reread the
ordinary-play contract and Appendix A of the previous gameplay review, and read
all 137 English/Chinese dialogue pairs against their script and source contexts.
It also inspected ordinary UI, hint, language, seating, quest and cottage source.
It did not launch a browser, run a build or test, change runtime code, or itself
complete an interactive playthrough. Findings based on source are identified
below; they are not reported as personally reproduced browser failures.

The exact reviewed evidence and source are frozen in
`art/review/2026-11-11/independent/recheck-02/`. The cottage photo batch is dated
22:43; the updated seating report is dated 22:58. Current revision paths may be
replaced during ongoing work. Earlier blank cottage captures remain archived in
`independent/recheck-01/`; their invalidity must not be projected onto this new,
usable batch.

The main agent repaired several findings while this review was in progress.
A final source read at 23:06 is preserved separately in `recheck-02/source-final/`.
The distinctions below acknowledge those corrections. They remain source
corrections pending relevant runtime evidence, not unchanged defects and not
automatic acceptance.

## What this evidence establishes

| Area | Independently supported progress | Acceptance boundary |
|---|---|---|
| Ordinary mode | The title source explicitly introduces three gears, the watch and tea/cake size changes. The corrected room images show the Chinese objective and 0/3 count. `main.js` enables gear challenges only with `?challenges`; ordinary pickup bypasses them. | No new complete, unskipped ordinary route has yet been independently reviewed. The former lack of an initial objective is repaired; first-time comprehension is not established by reading its source. |
| Chinese baseline | The earlier viewed title/pause images and current room/seat images show readable Chinese UI. All 137 dialogue IDs have Chinese entries. Audio and session preferences share `i18n.js`; old session settings no longer overwrite its current language at initialization. ED-03 now correctly describes the cramped spout. | Existing-hint switching, persistence/query cases, note reading, the song, results, replay and the delivered build remain outside the supplied visual language evidence. |
| House presence | Five distinct images show an enclosed interior, sitting area, sleeping room, kitchen/work area, shelves and a quest hearth. Recorded controller movement connects sampled rooms and the exit. | This is a real improvement beyond the old fireplace recess. Actual note reading/pickup, unrestricted camera clearance, furniture collisions and the uninterrupted garden-to-house-to-garden route still need review. |
| Seating behavior | The new helper waits for natural entry without Enter, confirms the player remains seated, then exits chair 2 with E and chair 3 with W. Recorded entry times are 13.327 s and 5.109 s; both early rate samples are 1 with skipping false. Seated screenshots show the Chinese exit prompt. | This supports the normal-time and explicit-exit behavioral repair in these two cases. Rate is still sampled early rather than logged continuously, and stills do not prove pelvis/hand support throughout motion. |
| Song cue implementation | The inspected source derives the visible golden cue and hit window from the same rhythm state and supplies Chinese instructions. | This is source evidence. Readability, first-time timing comprehension and the complete performance have not been visually re-reviewed. |

## Findings and repair state

### P1 acceptance: objective and Dormouse clues must agree throughout movement

Source: `explore.js`, `hint()`, `nextGear()` and `objectiveText()`.

The initial read found two competing systems: the Dormouse selected the nearest
remaining gear, whereas the delayed objective used fixed tree/house/fountain
priority. **The main agent has now removed that fixed-order mismatch:** both
systems call `nextGear()`, which favors the current size and then distance. This
is a meaningful source correction; do not keep claiming that the objective
always forces the tree first in this latest revision.

One coherence concern remains in the inspected revision: the visible clue keeps
its old ID for ten seconds, while the objective independently recomputes
`nextGear()` every frame. Moving between candidate destinations can change the
objective before the old clue disappears. The hint tier also remains a global
counter while its target is recalculated; a new target can start at level 2 or
3. Preserve an active clue target, or explicitly reset/replace the visible clue
and target's tier together when changing directions.

Recheck path: leave at least two gears uncollected and wait past the delayed
objective threshold. Move between destinations during a visible ten-second
clue. Record objective, visible clue ID/text, size and found gears together.
Repeat near the cottage and fountain, and after collecting each possible first
gear. Inspect successive hint levels when the nearest/size-compatible target
changes. No observed runtime contradiction after the source repair is claimed
here; the acceptance record is still missing.

Use a shared active target for clue progression and the immediate objective,
while keeping other destinations available. Example Chinese for a house target:
`先去三月兔的小屋，找找壁炉台上的齿轮。需要正常大小才能推开门。`
If there is deliberately no selected target, retain the neutral three-gear
objective rather than replacing it with a conflicting mandatory-looking route.

Already-found gears are filtered correctly in the inspected source; this review
does not claim a found gear is still selectable as a hint.

### P1 acceptance: verify the revised small-size tutorial/exploration boundary

Source: the small-size objective branch in `explore.js`; original under-table
teaching sequence in `docs/design.md`.

The original design deliberately introduces shrinking and growing back through
the spoon bridge and cake. That tutorial is legitimate. The initial source read
found a cake-recovery objective near `underTable.cup` even with the small-size
fountain task outstanding. **The latest source changes this to crossing the
spoon bridge and finding the fountain crack**, with the matching Chinese
`走过勺子桥，再去找喷泉底座的裂缝`. It no longer requires that recovery as the only
next step in this case. This resolves the identified wording issue at source.

Recheck path: take pink tea before collecting the fountain gear, finish the
first-shrink performance naturally, cross the spoon and follow the revised
direction toward the fountain before eating. Repeat pink tea after the tutorial
and with different first gears collected. Verify the route actually supports
that instruction, and that eating cake remains understandable as a recovery
option. This review has not verified the full small-player traversal and does
not assert a physical deadlock.

If first recovery is a required teaching step, say so: `先沿勺子桥走下去，吃蛋糕恢复
原样。之后再喝粉茶，就能用小小的身体探索喷泉。` During that step, suspend competing
gear directions. If small exploration is already available, separate the
destination from the optional recovery: `沿勺子桥回到地面，再去喷泉底部的小洞。想恢复
原样时，可以吃蛋糕。` Do not silently force a tutorial interpretation on every
subsequent shrink.

### P1 clue check: Chinese wording was corrected; the English voice still differs

The reviewed photo and initial dictionary had a mismatch: EX-09 read
`壁炉台上……果酱和钟表中间……`, but `hearth.jpg` and `hall.props` have a pocket watch,
central gear and saucer/spoons/butter, with no jam jar. The latest Chinese now
reads `壁炉台上……黄油和钟表旁边……`, which matches the supplied arrangement more
closely. Recognize this correction. The existing English line/voice still names
jam, so the bilingual world-space clue is not fully reconciled by that edit.

Recheck path: naturally reach the house at normal size with its gear missing,
receive/read EX-09 and locate the named objects on the mantel. The screenshot
establishes the original mismatch in this layout. One option is adding a recognizable
jam jar in the actual clue arrangement, which preserves the existing English
voice. If the scene is kept, a Chinese candidate is
`壁炉台上……找找钟表旁边……`; revise the corresponding English copy/voice decision
explicitly rather than claiming that different subtitles repair the voiced
world-space clue.

The note is visible from the entry but unreadable at the submitted framing; it
is mostly cropped in the hearth close-up. Its localized texture and interaction
exist in source. Provide an actual player reading interaction, legible Chinese
close view, return of control and the subsequent useful clue before accepting
the note as ordinary guidance.

### P2 conversation repair: seating now permits banter at source; demonstrate it

The initial source regression was that `sitScene()` leaves `player.control=false`
while seated, but `updateBanter()` and the exchange runner required control.
Conversations requiring `c.seated`, including BT-54–66, were therefore blocked.
**The final source recheck confirms a repair:** scheduling and exchange playback
now use `canBanter()`, permitting settled seating while excluding pause and
active cutscenes. This removes the identified source-level gate. The earlier
seating JSON proves entry/exit behavior, not a played seated conversation.

Recheck path: sit naturally, remain seated past the normal banter gap without
pressing Enter/E or movement, and observe whether the seated tea/riddle/time
exchanges can occur. Retain the new separation between walking and banter
permission. This review has not executed that case or heard the conversations
after the repair.

### P2: current language switching still needs dynamic-message coverage

`i18n.js` correctly owns language selection, and audio subscribes to changes.
The initial read found once-formatted clue/onboarding strings that did not
refresh. The latest source regenerates them each exploration frame; this
addresses the eventual active-play update at source. While paused, exploration
returns before that regeneration, so immediate switching inside the open pause
menu still needs verification. `localizeDOM()` recognizes English dictionary
keys rather than arbitrary already-translated formatted text.

Two remaining source paths deserve a focused correction/check: `controls` is
assigned translated text once on exploration entry, and the save-status message
is assigned dynamically, replacing its registered initial text node. Neither
has a corresponding rerender in the inspected language listener. After changing
Chinese to English, they can retain their previously rendered Chinese while
the objective uses English. The latest results-discovery listener is recognized
as a source improvement; complete song/results language evidence is still absent.

Recheck separately: switch language while a ten-second dream clue is visible;
save then switch without closing the pause menu; switch during a voiced line;
switch while a note is displayed. The active clue and saved-status text should
change immediately, keeping the same semantic state and clue tier. Preserve an
ID/template plus values and rerender it on language changes. Basic default
Chinese remains demonstrated; this defect concerns the promised live-switch
coverage.

### P2: optional challenges still contain English-only interface paths

The three added challenges are no longer compulsory, which is the correct
ordinary-mode boundary. In `gear-games.js`, their headings, rule paragraphs,
status/failure strings, Listen buttons, result counter and canvas accessibility
label are still raw English. Examples include `A small piece, a giant hand`,
`Between the drops`, `Listen 1`, `Try again`, `Open this watch`, `Leave for now`
and the `slips` counter. The overlay is created dynamically and does not share
the ordinary translated message path.

These strings should not block acceptance of a separately proven ordinary mode,
but they prevent a claim that every available interface is localized. Exercise
`?challenges&lang=zh` separately if that option remains part of delivery. The
optional tea-service prompt should also identify its status, for example
`茶会小活动：举杯接茶（可选）`, so returning to the table does not make it look like a
new prerequisite for repairing the watch.

## Chinese dialogue quality and context

All 137 dialogue pairs were read, grouped as OP 10, EX 10, BK 13, SZ 8, GR 4,
SG 6, ED 8, BT 66 and ST 12. There are no missing Chinese dialogue IDs in this
comparison. This is a textual/context audit, not an audit of 137 fully watched
subtitle timings. Most lines are usable, preserve the playful voices and avoid
literal translation. EX-10 clearly explains pink/blue/cake roles; BT-51's
`井井有条` is a sensible localized joke; ED-03's revised `挤` is now appropriate.

The concrete editing proposals below are intentionally Chinese inside this
English review. They compare the initially reviewed wording with recommended
edits; the source-update paragraph after the table identifies changes the main
agent has already made during this review.

| ID | Initially reviewed Chinese / issue | Proposed Chinese | Required context decision |
|---|---|---|---|
| EX-09 | `壁炉台上……果酱和钟表中间……` names missing jam. | `壁炉台上……找找钟表旁边……` | Prefer matching jam/clock props to the existing voice instead. This is a useful clue, so its scene match has higher priority than prose polish. |
| GR-02 | `真是黏糊糊的麻烦！花园都动起来了！` suggests all layers are awake even if the fountain is first. | `黏糊糊的麻烦！花园好像有动静了！` | Keep this line specific to the syrup awakening, independent of gear order. |
| BT-42 | `他又找到一个！` is scheduled by the same gear event after the first pickup too. | `他找到一枚齿轮了！` | Alternatively use first/subsequent variants; the shared voice currently also says “another.” |
| ST-03 | `下一位不是你的人！快起来！` is syntactically awkward. | `留给下一位客人——反正不是你！快起来！` | The rude command is a character joke; the player still chooses whether to stand. |
| ST-08 | `明明有二十把空椅子！` does not match the visible inventory. | `这儿明明还有这么多空椅子！` | Current layout lists seven armchairs, two occupied by hosts and five initially empty. Existing English voice also says twenty: make a deliberate adaptation/voice choice. Do not add twenty chairs merely to satisfy this line. |
| BT-06 | `去年三月起就是这样了。` adds a previous-year assertion not established by the scene. | `自从三月那回起就是这样了。` | A minor narrative precision improvement, not a progression blocker. |
| SG-02 | `走调得像块放蔫了的司康饼` is understandable but unnatural to say aloud. | `哎哟，这调子都瘪了，跟隔夜的司康饼一样。` | Retain the flat/stale food joke; verify it fits the actual voiced duration. |
| BT-25 | `她们什么都往外画` leaves the well/drawing action unclear. | `她们在井里画出各式各样的东西……凡是英文里 M 开头的，都画……` | Preserve the link to BT-22–24 and the following M examples. The original “draw” pun cannot be preserved by a word-for-word subtitle alone. |
| BT-61 / BT-62 | The current `花时间` exchange is coherent but the long first line blunts the interruption. | `你们别把时间浪费在没有答案的谜语上了。` / `你要像我这么熟悉时间先生，就不会说“浪费”他了。他可是位先生！` | Optional paired revision only: keep both lines together, retain Time's personification, and keep the existing 打拍子/打他 joke in BT-65/66. |

The 23:06 source recheck already contains these meaningful edits: EX-09 now
names butter beside the watch; GR-02 says something in the garden is starting
to move; BT-42 no longer says another on the first pickup; ST-08 says there are
many empty chairs rather than twenty. BT-06 now says `从上个三月起` instead of
asserting last year. ST-03 now says `留给下一个不是你的人。快起来！`; this is clearer
than the original but the proposed `下一位客人——反正不是你` remains more natural.
Those source edits should not be reported as unapplied. The English recorded
lines for EX-09, BT-42 and ST-08 still retain the original prop/count assumptions;
decide whether subtitles are intentional adaptations or whether the voice and
scene should be brought into agreement. Subtitle timing remains unreviewed.

For free-order progression, the source correctly ties GR-01/02/03 to
tea/syrup/flowers respectively and filters found gears out of hint candidates.
GR-01 can still be true when the tree is collected last, and GR-03 does not
assert that all other tasks are finished. The significant order-sensitive
language issues identified here were the competing goal systems, GR-02's `都`,
BT-42's first-pickup `又`, and a tutorial/recovery instruction presented as a
universal next step. Their source-level repairs are acknowledged above. No claim
is made that every gear permutation has already been played successfully.

## House review: structure is present, finish and complete use remain separate

| Actual image | What can now be seen | Remaining actionable limitation |
|---|---|---|
| `entry.jpg` — 93,088 bytes | Actual open front door, continuous boards, enclosing walls/ceiling/beams, bedroom opening, hearth and edge of the kitchen. | Prove exterior/door alignment and both camera modes continuously, not only this deliberately aimed first-person view. |
| `living.jpg` — 71,294 bytes | Sitting furniture, tea table with cup/teapot, rug, book shelves and connection to the bedroom. | Furniture is still visibly made of plain rectangular forms; seating comfort/scale, material variation and dressed detail require later refinement. Shelves already provide real storage presence; do not call storage wholly absent. |
| `bedroom.jpg` — 63,694 bytes | A distinct sleeping area with bed base, bedding, pillow, framed window and room boundaries. | The close view does not show the full bedside circulation. Bedding/pillow edges are rigid blocks; refine after functional circulation and camera clearance are proven. |
| `kitchen.jpg` — 59,109 bytes | Counter, cabinet fronts/handles, a jug, shelf, framed window and an attempted sink/tap. | The sink reads as a flat dark slab and the tap as a straight stick. Make the kitchen fixtures recognizable, with a visible basin/recess and a credible spout. This is a local readability/finish task, not evidence that the whole kitchen is missing. |
| `hearth.jpg` — 62,584 bytes | Enclosed hearth, watch, central glinting gear, saucer/tools, a clear Chinese pickup prompt and floor below. | The fireplace is a flat orange patch and the note is cropped. The original jam clue now has a Chinese source edit; the English voice still differs. Complete the actual pickup/read interaction first, then refine the fire and materials. |

The route JSON contains eleven controller samples, including stable interior
floor heights around local 1.11 m, a mantel prompt and exit back outside. The
helper now uses the real game canvas and V for first-person captures; it no
longer imports a second scene module to create an obstructing renderer. It
initially places the player outside once and uses controller movement thereafter,
with deliberately aimed photo directions. That is useful spatial evidence, not
a natural first-time route or unrestricted camera investigation.

This evidence supports the presence of every household zone named by the current
contract. It does not justify inventing a new bathroom/second storey requirement
or asserting the interior still consists of a 1.2 m recess. Conversely, five
good room photos cannot certify all furniture collisions, normal third-person
camera behavior, room use and quest completion.

The interior currently uses an almost uniform warm beige treatment, simple
opaque window panes, stark furniture edges and limited local detail. Those
observations keep art refinement open. They should not erase the structural
improvement or be treated as a reason to prioritize cosmetic rebuilds above an
unproven ordinary main line. Exterior golden-light/cool-shadow compliance, the
tree-door/arch/path and the previously rejected hand/face work remain separate
unclosed review findings.

## Ordinary-play acceptance still required

1. **Clean Chinese start.** From the normal URL and a clean profile, watch the
   opening without Enter. At control handoff, the player can state “find three
   gears, change size where needed, bring them back to the watch.” Goal and 0/3
   remain visible, and no compulsory challenge overlay appears.
2. **A coherent chosen route.** Reach each gear by player movement and interaction
   at its actual size requirement. Show first and repeated tea/cake behavior,
   the spoon tutorial and wrong-size feedback. Objective, clue and visible props
   agree. First house, first tree and first fountain routes must not produce
   order-dependent claims or a lost required recovery option. Cover all six
   gear orders with state/route evidence; at least one ordinary performance is
   continuous and unskipped throughout.
3. **A complete home visit.** Walk from the garden through the actual doorway,
   sitting/storage area, bedroom and kitchen to the hearth. Read the selected-
   language note, take the gear and leave through the same doorway. Show normal
   third-person camera near door frames/walls and first-person reading. Do not
   substitute author camera placement for collision clearance evidence.
4. **Optional activity clarity.** Sitting and tea service are recognizable as
   optional. The player can remain seated, hear available conversation and stand
   with E or movement. Returning to the table after all gears makes the repair
   action discoverable without requiring a hidden challenge or tea-service score.
5. **Watch, song, ending and replay.** Repair through the visible E action, hear
   the invitation to play, understand the golden cue and its initial listening
   period, tap by the on-screen/audio cue, reach 6:01, see the actual tree-door
   route/rose reveal and return to a correct replay state. Provide enough
   continuous evidence to assess the entire prop and character motion, including
   raising and lowering cups, rather than a single favorable contact frame.
6. **Language at the moments it is used.** Capture active dialogue, progressive
   clues, note reading, live switching, song instructions/results and replay in
   Chinese. Verify query/persisted-language precedence and an existing conflicting
   old-settings profile. Inspect the built delivery separately. English key names
   such as WASD/E are controls, not untranslated prose; hidden diagnostic renderer
   strings are not ordinary player-facing localization blockers.

The reviewer understands the intended core loop from the contract, design and
source. The supplied handoff does not yet prove whether a first-time player
understands the first-shrink recovery boundary, finds the correct tea/cake and
repair approach, distinguishes tea service from the required song, or learns
the golden timing without privileged state. Those are explicitly unresolved
usability questions, not assumed passes.

Next priority is coherent ordinary guidance, the real note/gear interaction and
an unskipped full ordinary run, with Chinese captured at the relevant moments.
The separate source defects and local language edits above should be addressed
without reinstating mandatory puzzles. Independent approval remains pending.

## Appendix B: house route and language matrix, 23:23 UTC+08:00

**The connected-home quest visit is now demonstrated for the recorded route.
The seven supplied language cases are accepted within their tested scope.
The overall rejection and unfinished art remain open.** This appendix supersedes
earlier pending findings only where the following evidence addresses them.
The full unskipped ordinary performance has not yet been handed off for review.

The batch is frozen in `art/review/2026-11-11/independent/recheck-03/`, including
the six house/note photos, house MP4/route, language report/images, quick
ordinary reports, spoon report and relevant source. All eight new house/language
images were opened individually. The MP4 was decoded into a three-second sampled
timeline and full-resolution frames at 30, 44 and 51.2 seconds. This is sampled
video inspection, not a claim of watching every frame or hearing the performance.
The file has 517 frames at 10 FPS, 1152×720, duration 51.7 seconds and no audio,
consistent with the supplied metadata.

### B1. The house visit now includes real movement and actual interactions

The helper starts at the tea-table exploration hub and walks the garden route
and ordinary stairs. It has no initial placement or size override, sets
`skipScenes:false`, and uses a driver whose automatic jumping is disabled.
It enters the house, traverses the sampled rooms, uses the gear pickup and
asserts the count becomes one, then reads the note naturally, waits for restored
control and leaves through the same door. The twelve recorded local samples
and stable interior floor heights agree with that route.

The video samples show the hub approach, upper path, real door, room movement,
hearth visit and 0/3→1/3 HUD change. At 44 seconds, both the readable note hint
and Chinese EX-06 caption instructing the player to crawl into the cracked
fountain base are visible. At 51.2 seconds the player is departing down the
front steps. The floor-plan SVG corresponds to the sitting/storage, sleeping,
kitchen and hearth zones actually visible in the six stills and sampled route.
These observations support **the spatial and quest-route foundation**, rather
than merely the presence of separately staged room photographs.

The hearth now includes a red-lidded jam jar beside the former central gear
location, with the watch on its other side. `hall.props` includes that jar and
EX-09 returns to its original jam/watch wording. The missing-prop clue defect is
**repaired in source and actual scene evidence**, including its English basis.
The post-pickup hearth screenshot's 1/3 HUD and absent gear are consistent with
the real pickup occurring before capture.

At full resolution, the third-person frames at 30 and 44 seconds show enclosing
walls. A preliminary thumbnail-based concern that the camera was outside an
open-sided house was withdrawn after these checks; it is not a demonstrated
wall-clipping failure. The door leaf/frame occupies the foreground during entry.
Unrestricted rotation near every wall and furnishing remains untested by this
guided record.

**The paper itself still needs better legibility.** In `note.jpg`, the Chinese
letters are small, pale and soft-looking at the submitted player framing. This
does not negate the successful interaction: the 44-second caption clearly
delivers the essential instruction. Improve the paper-text contrast, focus and
on-screen size, or provide a readable inspection transcript. Do not treat a
translated texture as proof that its physical lettering is easy to read.

The block-shaped bedding/seating, slab-like sink, stick-like tap, flat orange
fire and uniform warm surfaces remain coarse. These are open finish/readability
tasks; they do not justify describing the current house as a missing interior
or fireplace display box. Basic functional progress and art finish are separate.

### B2. Seven language regressions can be closed within their explicit scope

The reviewer inspected the report/helper and actual Chinese title/pause images.
The title now explains the three gears, watch and tea/cake roles. The pause menu
is readable Chinese and correctly labels the setting as interface and subtitles.

| Supplied case | Accepted evidence |
|---|---|
| Clean default | Language `zh`, Chinese title and selector `zh` before entry. |
| Change during a voiced line | Helper plays OP-03, asserts its English caption after changing selection, then its Chinese caption. |
| Muted voice | With voice volume zero, the essential EX-10 pink/blue/cake caption remains visible. |
| Persist English and reload | The same profile reloads with `en`, English title and selector. |
| Old settings conflict | A v2 `zh` preference wins against old session `en`, including the selector. |
| Explicit English query | `?lang=en` initializes language and selector to English. |
| Explicit Chinese query | `?lang=zh` initializes Chinese. |

The helper uses the actual selector's change event. Diagnostic playback isolates
the voice-language behavior; it does not independently prove a whole opening or
ending's subtitle timing. The report records no errors. These seven specific
cases now have credible implementation and runtime-report evidence.

The matrix does **not** exercise changing the already-formatted exploration
`controls`, saving and then changing the save-status text, or changing a timed
clue while paused. The frozen source still assigns controls on exploration
entry and saved status on save, with no matching refresh in its language
listener. Those earlier dynamic-message concerns remain outside this pass.

The quick ordinary language trace adds Chinese prompts, objectives, progression
lines, repair/song controls and a Chinese results screen. `missing:[]` means no
catalog miss was encountered on that route, not that every optional screen and
all 137 lines were displayed and reviewed. Natural timing, remaining dynamic
switch cases, paper legibility and built-delivery verification stay open.

### B3. Hint, seating and optional challenge source repairs

`nextGear()` now preserves a missing `hintedGear` while it is compatible with
the current size context. Objective and dream-clue generation share that target,
and an incompatible visible clue is cleared with a tier reset. This addresses
the earlier simple movement-driven mismatch; the old fixed tree-first routing
and mandatory-looking cake instruction are not current defects.

A narrower hint-tier edge remains to check: interaction clears the clue's
dataset, as does its ten-second expiry. If a later size change selects a new
gear after that removal, the visible-clue reset branch is bypassed and the
global `hintTier` can carry into the new target. Recheck: receive a first-tier
clue, let it expire or start a drink interaction, change to a different gear's
required size and wait for the next hint. The new gear should start a coherent
clue sequence. Reset by selected gear identity independently of whether its
caption is currently visible. This is a source edge, not an observed deadlock.

The settled-seat `canBanter()` condition remains present, repairing the gate
that blocked BT-54–66. This batch contains no seated conversation recording;
that runtime context is still pending despite the correct source direction.

`gear-games.js` now translates challenge headings, rules, status templates,
Listen buttons, slip counters and the fountain canvas instruction. It refreshes
language and localizes static overlay/accessibility text; corresponding Chinese
entries exist. The earlier claim that all these paths remain raw English is
superseded. Mark **source localization repaired; optional-mode display and
switching acceptance pending** until actual Chinese challenge screens are
supplied. They remain separate from ordinary-mode acceptance.

### B4. Quick route and spoon reports are useful mechanism evidence

The quick report explicitly says `skippedScenes:true`. Its helper uses actual
controller movement and blue tea/tree→house→pink tea/spoon/fountain interactions,
then verifies checkpoint reload, repair, results and replay without position or
size overrides. No errors are recorded. This demonstrates that particular
ordinary mechanism route, not natural performance, timing or first-time
comprehension. Its 0/53 rhythm result is consistent with intentionally skipping
the song and cannot be presented as successful rhythm performance.

The isolated spoon helper starts with diagnostic small-size placement at the
under-table landing, then walks out with automatic jumping disabled. Its PASS
supports that local navigation case. The quick complete route also traverses
the spoon path without automatic jumps, providing broader mechanism evidence.
The unskipped handoff must still show the first shrink, landing, spoon support
and actual walking clearly enough to assess the visual/physical alignment and
the route's understandable directions.

### B5. Current acceptance boundary

| Gate | Disposition |
|---|---|
| Connected home and actual quest visit | Demonstrated for the supplied hub/stairs/rooms/pickup/note/exit route. |
| Seven supplied language cases | Accepted within their stated scope. |
| Jam/world-clue mismatch | Closed for the supplied actual mantel and restored EX-09. |
| Ordinary mechanisms | One tree→house→fountain route, persistence, repair, ending and replay demonstrated with scenes skipped. |
| Full natural ordinary performance / visible cue comprehension | Pending the promised no-skip handoff. |
| All gear orders / hint transitions | Not demonstrated by one route; the narrowed tier-switch edge remains. |
| Dynamic language / optional challenge display | Source fixes acknowledged where present; remaining cases need focused evidence. |
| Paper legibility / interior finish | Open; essential note interaction and caption are functional. |
| Mouth, hand/cup contact, lighting, arch/path/composition | Earlier rejection remains open; no overall score change. |

Next, review the completed no-skip performance and resolve any ordinary-play
failure it exposes. A local functional pass can coexist with unfinished art;
it cannot support an “all optimizations complete” conclusion.

## Appendix C: complete no-skip ordinary route, 23:32 UTC+08:00

**The recorded ordinary state chain now completes with natural scene timing.
Normal-play experience acceptance remains withheld because the first-shrink
scene leaves exploration looking into the sky.** This is a newly demonstrated
navigation defect, not a failure to reach the game's final state. The overall
4.0/10 rejection remains unchanged; contact, faces, furniture, lighting and
other art findings are still open.

This review read `standard-full/playthrough.json`, its language trace and the
driver source, opened `results.jpg`, and decoded the MP4 into a fifteen-second
timeline and selected full-resolution frames. It did not operate the game,
rerun tests, watch every frame, or hear the silent recording. The exact handoff
is frozen in `independent/recheck-04/`, including the video, JSON, result image,
source and extracted evidence. Video metadata is 452.7 seconds, 4,527 frames at
10 FPS, 1280×720, 78,825,292 bytes, no audio. Its SHA-256 is
`DE6599D0225AE19856C0630482EC01F9A2DD3E53C151F51FAB347BC0143EAFFF`.

### C1. What can now be recognized as complete

The report explicitly says standard mode and `skippedScenes:false`. Inspection
of `gameplay.mjs` and the driver supports the claimed boundary: the no-skip path
does not press Enter to advance scenes, does not use diagnostic position/size
overrides and does not enable automatic jumping. The scripted story's own
placements are part of the game's authored scenes, not a test shortcut.
The driver still knows the route and steers yaw toward exact destinations;
that distinction matters for the camera finding below.

The recorded checks and actual language evidence establish:

- The opening plays naturally with OP-01–10 captured in Chinese; the player
  receives control with the three-gear objective, 0/3 and the pink/blue/cake
  explanation. The title explains the same basic goal.
- Actual tea/cake interactions, the tree→house→fountain pickups, ordinary
  controller movement and spoon route advance the count to 3/3 without added
  compulsory gear puzzles. The relevant first grow/shrink scenes are present.
- The saved checkpoint restores the gears and recorded puzzle/discovery state;
  the normal-size objective tells the player to return to the watch, and the
  real repair action starts the finale.
- The song completes at natural duration with SG-01–06 in the Chinese trace.
  It displays the initial listening instruction, golden-cue instruction,
  feedback and score. The result and sampled in-song frames agree on 53/53 hits
  and a best streak of 53.
- ED-01–08 are captured in Chinese, including the 6:01 announcement, open-door
  line and final warning. The sampled ending shows the actual open tree passage
  and rose-path reveal. The separate result image is readable Chinese and
  records 3/3 gears, 53/53 and 7:07 play time. The helper asserts checkpoint
  clearing and return to the replay title.

The song's automated success uses the publicly visible cue element's
`data-open` state and sends one Space press per note. That proves a consistent
cue/input/scoring chain without the old challenge-state shortcut. It is not
a human first-time reaction or music-listening evaluation. The silent samples
do show the instructional cue and score at player-visible locations; audio
mixing and musical timing by ear remain outside this review.

`missing:[]` and the Chinese actual-display trace are meaningful route coverage.
They do not prove every line in the 137-entry catalog, every optional interface
or every language-switch state. The documented mid-run reload resets the
trace's browser timestamps; its exploration stage and post-reload lines must be
read as two timing origins, not one continuous performance.now clock.

The last extracted video frame at 452.3 seconds still shows the ending view.
Results/replay are supported by the separate results image and inspected
assertions; this appendix does not claim the MP4 itself clearly displays both
final transitions. The recorder's final-frame delivery should not be confused
with a demonstrated runtime failure to finish.

### C2. P1: first-shrink staging leaks a sky-facing pitch into free navigation

Evidence: `recheck-04/frames/at-210.jpg`, `at-225.jpg` and `at-240.jpg`.
The first two are free exploration with 2/3 gears and show predominantly sky,
canopy and tall flowers. The spoon, walkable ground and destination are out of
view. At 240 seconds, the fountain pickup occurs while the picture is still
aimed upward at a bright surface. This is not merely an unfavorable screenshot
chosen from the Hatter's intentional looming close-up: it persists after
control has returned and the driver is walking between tasks.

The inspected source explains the observed behavior:

1. `firstShrink()` repeatedly calls `facePoint()` toward the large Hatter's head.
   That function changes the player's own pitch, not only an isolated cinematic
   camera.
2. The final `placePlayer(underTable.landing, 180)` resets feet and yaw but leaves
   that pitch unchanged.
3. `runScene()` restores control and clears cinematic ownership, but does not
   restore a navigable view angle. Free-camera rotation then uses the inherited
   pitch directly.

The driver changes yaw and walks to known coordinates, so it can pass the spoon
and fountain while effectively blind to their rendered locations. A new player
cannot follow the intended visual route from that picture. Mouse look offers a
manual recovery; it does not make this an acceptable default handoff from the
game's own scene.

**Fix before accepting ordinary usability:** separate cinematic targeting from
the player's exploration pitch, or deliberately restore a useful angle toward
the cup/spoon/ground when returning control. Check the first-grow camera and
other scripted `facePoint()` users for the same ownership leak. Do not hide it
by steering the test camera downward after the scene.

Required focused evidence: finish the first pink-tea/shrink sequence naturally,
send no mouse input, and capture the initial return-of-control view. The cup or
spoon route and a useful area of walkable ground must be visible. Walk onto the
spoon and off the table with ordinary keys and a stable, usable view; include a
direction assertion as support, not as a substitute for the screenshot. Repeat
after first grow and a later size change. The main agent has acknowledged this
P1 and is repairing it; no corrected runtime evidence is included in this batch.

### C3. Other normal-play findings and their priority

No additional reproducible ordinary-mechanism P1 is established from this run.
Do not invent a deadlock because an optional mode or another order has not yet
been exercised. Preserve these concrete lower-priority items and coverage gaps:

- **P2: a misleading tree-door remark during valid gear collection.** In the
  exploration trace, OP-05 (`等六点零一分再来吧！`) appears at 85.81 seconds just before
  the tree gear count changes at 87.42 seconds. The giant is within the tree
  door's size-scaled proximity while able to pick up the high gear. Suppress or
  qualify the unrelated locked-door bark during a valid tree-gear interaction
  so a player does not interpret the gear itself as waiting for 6:01.
- **P2: remaining language/readability issues.** The paper lettering remains
  difficult to read even though its interaction caption is functional. The
  controls/saved-status language-switch paths and hint-tier transition edge
  identified in Appendix B are not tested or repaired by this no-skip success.
  The tea-service activity should state that it is optional.
- **P3: interface finish.** The result heading wraps awkwardly before its final
  character, and a blank objective background remains at the top of several
  performance/result views. These do not block the recorded flow. The result
  screenshot can also catch old scene-skip controls before their next update;
  verify stable post-completion UI separately before calling that a lasting bug.
- **Coverage: other gear orders, optional screens and seated exchanges.** This
  natural run proves one tree→house→fountain route. Other valid orders, the
  progressive-clue edge, Chinese challenge screens and post-seat conversations
  remain outside its coverage. The house and seven-case language acceptances
  from Appendix B remain valid rather than being retested by implication.

### C4. Updated functional disposition

| Area | Independent conclusion |
|---|---|
| Natural ordinary state chain | Demonstrated for this scripted controller route through opening, three pickups, checkpoint, repair, full song and ending. |
| Cue/input/scoring integration | Demonstrated at 53/53 by the cue-driven automation and matching visible score; human first-time comprehension/listening not measured. |
| Chinese ordinary displayed content | OP-01–10, SG-01–06, ED-01–08 and route UI/results captured; no encountered catalog misses. |
| Connected house / note interaction / language matrix | Previously demonstrated narrow passes retained. |
| Normal navigation after the first shrink | **Rejected: observed P1 sky-facing handoff; corrected evidence required.** |
| All ordinary experience / all optimization work | Not accepted. Other coverage and open art/contact findings remain; overall 4.0 rejection unchanged. |

Priority is the demonstrated camera handoff defect before further cosmetic
polish. A passing end-state assertion must not conceal an unusable default view.

## Appendix D: navigation P1 closure and face preview, 23:36 UTC+08:00

**The first-shrink navigation P1 is closed for the demonstrated natural handoff.
The ordinary main-line functional foundation can proceed to refinement.** This
conclusion combines the complete no-skip state-chain evidence in Appendix C,
the house/language cases in Appendix B and the focused camera regression below.
It does not claim a new full run after the camera patch, all possible gear
orders or completed art. The overall 4.0/10 visual rejection remains in force.

The exact shrink report/images and helper, current exploration source, new face
previews and their metadata are retained in `independent/recheck-05/`. This
review read those artifacts and opened the two actual shrink images and all
eight face images. It did not run the helper, generate assets or operate a
browser.

### D1. The previously observed sky-facing handoff is repaired

The inspected `check-shrink-view.mjs` starts at the real exploration hub and
walks to pink tea. It uses the normal drink action, lets the complete drink and
first-shrink sequence finish with `skipScenes:false`, then captures the view
without mouse-pitch input. It contains no placement/size override. The report
records first-person view, pitch −0.15 and camera direction approximately
`[0, −0.1494, −0.9888]`, with no errors. The direction assertion accepts a
shallow downward view rather than merely any nonpositive pitch.

`returned-control.jpg` independently confirms why that number matters: the
under-table floor, cake, surrounding route and overhead beam are now visible.
The picture is no longer mostly sky. After this capture, the helper walks the
spoon/under-table exit path with ordinary keys and no automatic jumping;
`outside-table.jpg` shows the small-player ground view beyond the table.
These are appropriate focused evidence for the exact P1 found in Appendix C.

`firstShrink()` now explicitly sets the exploration pitch after the authored
landing placement. `firstGrow()` also restores a downward exploration pitch
of −0.35, and the full route helper has gained a shrink-view assertion and an
after-shrink capture. The new first-grow behavior is confirmed in source only;
this focused report does not include a corresponding first-grow screenshot.
Do not describe that variant as independently rerun.

The single demonstrated normal-play P1 therefore no longer blocks starting
refinement. Keep the remaining P2 items—dynamic language refresh, readable paper,
hint-tier switching, unrelated tree-door bark and optional-activity wording—on
the ordinary-experience checklist. Other gear orders and live seated/optional
contexts retain their previously stated coverage limits. Those limits do not
erase the ordinary route and narrow regressions already proved.

### D2. New facial morphs: correct direction, static preview still needs work

These are Blender stills of finished assets in rest pose, at `mouth_open=0`
and `mouth_open=1`. They are not captures of the game's compressed models,
animated speech or the scene's final lighting. No game-runtime mouth acceptance
is granted from them.

The Hatter's and Fries's mouth changes are aligned with their original lip
lines. None of the eight preview images shows the old black ellipse under the
nose or an obvious second independent mouth over the unchanged smile. That
is useful progress toward the identified defect.

The preview helper explicitly removes `SpeechMouth*` objects before rendering,
so images alone would be insufficient to prove that legacy objects were gone.
The reviewer additionally read the four actual
`art/characters/finished/{fries,hatter,hare,dormouse}.glb` JSON chunks: each
contains a `mouth_open` morph and none contains a `SpeechMouth*` node. This
independently supports removal at the **finished-asset layer**. The runtime
compressed assets have not yet been replaced in this handoff, as the main agent
explicitly states; their removal and behavior remain to be verified in game.

| Character pair | Observed improvement | Remaining static concern |
|---|---|---|
| Hatter | The existing smile/lower-lip region moves; the nose is free of the old black oval. | The speaking mouth remains largely a skin-colored stretched surface. It does not yet read as a convincing recessed mouth opening. |
| Fries | One original mouth deforms rather than a second oval appearing above it. | The full speaking pose produces a pointed V/triangular fold in the central mouth region. Smooth the lip contour and avoid pulling a few skin triangles into a flap. |
| Hare | The muzzle seam changes without an added nose patch. | The closed/speaking difference is weak and the visible opening is still skin-colored; speech readability needs an actual animated view. |
| Dormouse | The deformation stays at the muzzle/lip seam. | A sharp triangular point appears on the left inner edge of the speaking mouth, with an angular central opening. Preserve a smooth lip boundary and credible mouth depth. |

The inspected authoring script displaces existing face vertices but does not
create an actual inner-mouth cavity. The stills are consistent with that
limitation. Continue toward a controlled lip shape and recessed interior rather
than accepting stretched skin as completed speech. The exact modeling method
is an implementation choice; it must preserve one mouth, clean corners and a
stable silhouette throughout the morph range.

Required next facial evidence is the actual optimized asset in the game:
closed, intermediate and open poses; front and three-quarter views; natural
speaking with head/eyelid movement; and a short silent/speaking transition.
Check the whole amplitude range for sharp folds, visible duplicate smiles,
nose patches, teeth/cavity intersections and popping. The cup contact tests
must use the final mouth anchor after that geometry is settled. The present
preview is a useful direction check, not completion of facial animation.

### D3. Current work boundary

Ordinary core play now has sufficient functional evidence to move on to the
remaining refinements, with the listed P2 and coverage work retained. Housing
and Chinese improvements remain credited. Faces, mouth/hand/cup contact,
furniture, lighting, path/arch and composition still need their own concrete
runtime evidence and independent judgment. No new overall score is assigned.

## Appendix E: readable note, dynamic language and short interactions

Review time: 2026-11-12, 00:25 UTC+08:00.

**Close the demonstrated paper-legibility and controls/saved-status switching
findings. Ordinary core refinement remains authorized by the functional evidence
already reviewed; this batch establishes no new ordinary-mechanism P1.** The
overall art rejection and 4.0/10 score remain unchanged. Source-only corrections
and runtime evidence are distinguished below.

The supplied cottage evidence is dated 23:58 on November 11; the expanded
language matrix is dated 23:46. This reviewer read those reports and helpers,
opened all six new room/note images and the new pause image, sampled the updated
42.3-second silent house recording at four-second intervals, and read the short
interaction, liquid, hint and language source. A frozen copy is under
`independent/recheck-06/`. No game, build or test was run by the reviewer.

### E1. Physical note lettering: accepted for the real reading interaction

The new `note.jpg` has large, dark Chinese lettering on a clear light page.
The butter warning and fountain-base instruction are readable at the submitted
framing. This resolves the previously demonstrated faint, soft paper text.
The source sets the correct texture color space, uses a stronger type treatment
and unlit readable-paper material, and adds a real reading-camera transition.

The new helper's note step presses E, waits 650 ms and captures the image.
It does not turn the inspection camera toward the note through diagnostic
placement. The player action itself now supplies the close view, as implemented
in `hallNote.use()`. The sampled video shows this reading view persist, then
return to the ordinary exit route. Both the physical words and the subtitle
delivery are now demonstrated rather than only a translated canvas in source.

The note's reading state/lens override is registered for scene cleanup. After
natural playback the helper waits for control and leaves the house, supporting
successful cleanup in that case. Its top hint partly overlaps the page's upper
margin; moving that redundant hint away from the paper would be a small layout
improvement, not grounds to keep the original legibility failure open.

### E2. Controls and saved-status language switching: accepted in the supplied case

The expanded matrix now has eight cases. Its added case pauses after exploration
entry, saves, changes to English and asserts that saved status begins with
`Saved` and controls contain `move`; it then changes to Chinese and asserts
Chinese save and movement wording. The recorded case passes, and the actual
pause image shows the Chinese saved-state message.

The source corrections agree: exploration subscribes to language changes and
rerenders controls, gear count, objective, interaction prompt and active clue
from their semantic state. Session UI preserves whether the menu saved and
rerenders the appropriate status on a language change. Song controls also have
a language listener, and reading-note text regenerates while active.

The exact earlier controls/saved-message defects are therefore **closed for
this captured bidirectional, paused case**, extending the seven accepted cases
in Appendix B. This does not certify unvisited optional challenge screens, every
possible subtitle timing or the built distribution. Keep those scope limits;
do not continue listing the repaired controls/saved-status paths as current
untranslated defects.

### E3. Hint-tier target changes and the giant's locked-door bark

`updateExplore()` now compares the selected gear with `activeGoal` and resets
the hint tier on identity change independently of `task-hint.dataset.hint`.
That directly corrects the source condition behind the expired-caption/size-
change edge identified earlier. The old dataset-dependent defect is closed at
source; a complete six-order/tier transition runtime matrix is not supplied.

The locked tree-door proximity now requires normal size and uses ordinary
distance rather than scaling it for a giant. This removes the specific source
condition that produced OP-05 during valid giant tree-gear collection. Recognize
that correction without claiming a new full-run subtitle trace has been reviewed.

### E4. Liquid cleanup: the duplicate-removal condition is corrected

The reviewer read `surface.remove()` and `check-liquid-cleanup.mjs`. Removal now
returns when already removed, records its removed state, releases its own
scene/resources and only splices a registry entry when its index is present.
The earlier second removal could splice index −1 and unregister another cup;
the inspected code no longer has that behavior.

The main agent reports its centralized runtime result as four original surfaces,
five after adding two and removing the first twice, and four after removing the
second, with the second cup still alive. The inspected helper asserts exactly
that registry-count relationship and remaining cup attachment. This is a
main-agent-run result supported by source inspection, not a reviewer rerun or
a fabricated new JSON artifact. It addresses the specific cleanup defect.

The fix matters to the actual interaction code: both normal and repeated drinks
remove their temporary tea on success and again through scene cleanup. That
legitimate double cleanup can now safely coexist with other active cup surfaces.
It is not a claim that every liquid effect or every interruption is fully
verified by the two-surface diagnostic.

### E5. Short repeated drink/cake source review

The repeated-cup branch now walks to the stand point, frames the character,
plays drink, moves the real cup into the held-prop system, creates temporary
tea, traverses the held-cup raise/sip/lower curve, releases the cup, returns it
home and applies the intended size change. It registers liquid, hold and prop
cleanup. The old empty-hand shortcut is no longer present in that branch.
Its authored short timing does not alter the global scene rate.

The repeated-cake branch uses the bent pickup/bite pose and a short nod rather
than drink. It clears the held pose and nod on completion and through scene
cleanup before the normal-size change. No new blocking state or missing cleanup
is established by this source read. Neither branch has a dedicated runtime
recording in this handoff, so successful actual repeat playback, pause/skip
behavior and exact hand/body finish remain pending integrated observation.

One concrete motion concern should be checked in that observation: the cake
branch sets the clip to contact time 2.33, nods for 0.65 seconds and then sets
it directly to the 9.58-second end. This can produce an abrupt return from the
bent pose unless the actual evaluated transition supplies a smooth recovery.
Classify this as a source-based animation concern, not a newly reproduced
mechanism P1. A brief natural repeat bite showing entry, bite and standing
recovery is sufficient to resolve it; another broad performance run is not
needed merely for this question.

For the repeat branch's integration check, use an already-used cup, restore
size through an already-used cake and then use the cup again. Verify visible
held objects, supported body poses, useful view/control on return, rate 1,
cup home position and temporary surface count returning to baseline. Include
one interrupted short action where the cleanup change is actually relevant.
The previous whole main-line pass remains credited; it predates these new
repeat branches and cannot stand in for their specific observation.

### E6. Cup diagnostics and art remain separate

The twelve-row drink timeline now includes the whole raise/lower interval.
It records zero finger vertices inside the measured cup cavity and no sampled
cup above the eye band, with lip-marker/rim gap zero at 4.2, 4.88 and 5.3 seconds.
The larger gaps before raising and after lowering are expected; those rows are
not supposed to show lip contact.

This reviewer additionally opened the 0.6/front, 4.88/front, 4.88/side and
8.8/front images. They show the cup at the low hold, raised to the mouth and
returned to the low hold, rather than only one favorable contact pose. The
side sample improves on the original cup-at-forehead problem. The front sample
still hides much of the rim and mouth behind hands, so it cannot establish all
hand/lip/eye clearances by itself. Shape, fingers, continuous movement and the
final face asset still need the actual scene's close views and sequence.

The diagnostic is sampled static long-drink evidence, not a recording of the
new shortened repeat branch. Zero measured intrusion and zero marker gap do
not by themselves prove pleasing grips or natural drinking. In particular, the
face assets are being rebuilt and have not been fully substituted in the game;
this appendix does not reclassify the older `faces-revised` preview as a final
runtime result or grant facial animation approval.

The new room images visibly improve rounded seating/bedding edges, cushions,
storage, curtains, recognizable sink/tap, lighting fixture and hearth contents.
The updated through-route still records actual pickup, reading and exit with
no placement or automatic jumping. Credit those concrete advances. Final
material/light/composition judgment and the broader art rejection remain open.

### E7. Current ordinary-work disposition

| Item | Status |
|---|---|
| Real note reading and physical Chinese lettering | Closed for the supplied E-triggered readable close view and successful return/exit. |
| Paused save-status and controls language switching | Closed for the new two-direction runtime matrix case and matching source. |
| Old hint-tier dependency on a still-visible clue | Source defect corrected by active-goal identity; broad order coverage remains unclaimed. |
| Giant triggering the normal locked tree-door remark | Specific source condition corrected; no new complete subtitle run claimed. |
| Repeated liquid removal unregistering another cup | Source corrected; main agent's focused runtime pass acknowledged with attribution. |
| New short repeat interactions | Source paths and cleanup improved, no new mechanism P1 established; specific playback/recovery evidence pending. |
| Ordinary functional foundation | Retained; refinement can continue. Remaining optional/order coverage is explicit. |
| Faces, hand/cup quality, lighting, arch/path/composition | Still require their final concrete evidence. Overall 4.0 rejection unchanged. |

## Appendix F: regular lips, repeated interaction playback and interim overview

Review date: 2026-11-12. The ordinary functional foundation remains accepted
within the preceding scope. **The old severe static mouth tears and separate
nose-mouth appearance are no longer present in this batch. Facial finish and
the overall art are not automatically accepted.** Overall scoring waits for
the complete new eighteen-view handoff, as explicitly requested by the main
agent; the prior 4.0 rejection is retained until that review.

Evidence is frozen in `independent/recheck-07/`: the eight face previews dated
00:39, their source/log, the repeated-interaction report/video and interim s14.
A separate `hatter-followup/` preserves the two 00:42 Hatter images and their
newer source so they are not confused with the first pair. The reviewer opened
all ten facial images and s14, inspected the repeat report/helper/source,
sampled its video and read `look.js`, `fields.js` and `song.js`. No tests, builds
or browser interactions were executed by the reviewer.

### F1. Mouth repair: distinguish resolved old failures from current defects

The new implementation builds a regular 96-segment lip annulus fitted to the
face, removes original faces intersecting the excision, adds a recessed cavity
and drives the lip morph. It no longer bridges the arbitrary scanned boundary
angles that produced the previously rejected torn faces. The old 3–8-loop
diagnostic is not a current description of this algorithm. The preparation log
records the new regular-annulus method; the main agent reports that these
assets have also been compressed into the game.

All four new closed/open pairs have a stable, recognizable opening at the
actual mouth. The previous large cheek tears, jagged pseudo-teeth and separate
black ellipse under the nose are absent in these static views. Those specific
preview failures can be closed. Genuine lip motion and the recessed opening
have been retained; resolving those failures did not require returning to the
old overlaid nose oval.

| Character / revision | Current independent observation | Severity / disposition |
|---|---|---|
| Hatter, 00:42 replacement pair | The small pale triangular defects below the lip in the 00:39 pair disappear. A local dark join below the nose and a broad surface/shading transition around the mouth remain visible in close-up. | P2 local geometry/material finish; the severe old tear is closed, but the close face is not yet fully accepted. |
| Fries, 00:39 | The central V-shaped flap and tiny white lower-edge spikes are gone. The mouth opens along a clean continuous contour. A flat-looking lip/skin band and a small upper-mouth mark remain at this magnification. | Local finish concern, substantially improved. Natural speech and three-quarter views are still required before a full facial-animation pass. |
| Hare, 00:39 | The large shards are gone and there is a real opening. The smooth patch differs from the furry muzzle, with an upper residual contour and a lower opening giving a layered-mouth impression. | P2 material/outline blending; do not call it the old black nose or assert two separate mouth objects. |
| Dormouse, 00:39 | The pointed interior edge is gone. The pink muzzle seam sits above the new opening, with a smooth pale band separating them. | P2 placement/transition refinement: check the intended single anatomical mouth line and blend it into the muzzle. |

The remaining source mechanism is different from the old tear: the new annulus
deliberately overlaps the scanned skin and its outer edge is not welded into
the old face topology. Outer-ring samples are interpolated toward a common lip
color through the patch, which can create a smooth, hairless band across a
textured muzzle. These facts explain the type of local seam/material risk;
they are not proof that every visible mark has the same cause. Preserve the
working regular cavity while refining contact with the source surface and the
local albedo/normal transition. Three-quarter views and intermediate morph
amounts will determine whether overlap seams flicker or separate in motion.

These images are still Blender face comparisons. A compressed asset reaching
the game's asset path is delivery evidence, not a substitute for close natural
speech with the actual lighting, eyelids, head movement and final mouth anchor.
Do not reclassify the older `faces-revised` rounds as this new generation.

### F2. Repeated tea/cake: mechanism and resource restoration accepted narrowly

The new report contains 511 approximately 50 ms state samples over a 25.9-second
silent recording. Every sampled scene rate is 1. The final sample is normal
size, control true and idle; cinematic ownership is false. Before and after
liquid counts are identical: streams 4, surfaces 4, sheets 3. The cup's final
distance from its home is zero, and no errors are recorded.

The inspected helper seeds only each drink's prior-use flag, then performs the
real blue-tea and cake interactions through the controller with scene skipping
disabled. It does not place the actor or override size for these interactions.
This is a focused repeat-history fixture, not a record of naturally completing
every first-use interaction and then repeating every cup. Within that scope,
the repeat branch's size transitions, rate, return of control, cup return and
temporary-liquid cleanup are now demonstrated and can be accepted.

The video samples show an actual held cup moving to the mouth. The old empty-
hand repeat shortcut is not the current behavior. The cake source also no
longer jumps directly from the contact pose to clip time 9.58: it blends into
the bend over 0.3 seconds, nods/bites for 0.65 seconds, and crossfades to idle
with a 0.25-second settling interval. The previous exact end-frame-jump concern
is therefore closed at source.

**P2 presentation remains: the cake action is not visibly reviewable in this
recording.** Around 23.8–24.8 seconds, when the report transitions through the
pickup/bite and idle phases, the giant-height camera is occupied by the cottage
roof/wall and nearby scenery. Fries and the cake are out of view. The report
can prove mechanism completion without proving that the bend, bite and recovery
look natural. Supply a short framing that shows the food/action, or otherwise
make the intended first-person feedback readable. This is not a new navigation
P1 and does not revoke the ordinary mechanism pass.

The new full-drink contact samples with the final face asset were still being
rerun at this handoff. Their final outputs and continuous hand/face motion have
not been accepted by this appendix.

### F3. Interim s14 and background: progress credited, whole-scene judgment deferred

The inspected s14 has a visible low sun, a warm foreground, cool lavender
distance and recognizable trees/hills/buildings beyond the playable garden.
This improves the former broad featureless distant bands. Tree, table, fountain
and elevated cottage are all present, and the players are more prominent than
in the former extreme aerial finale.

Source inspection confirms that the song's final camera uses the shared
`staging.overview` and glides toward it from earlier keyframes. `LOOK` owns the
lighting/color settings and song intensity progression. `fields.ground()` now
lets the painted distance supply the distant ridge silhouette rather than
stacking concentric terrain ridges in front of it. A shared camera definition
does not by itself prove every moving frame has good performer visibility.

Do not treat the interim still as full lighting/composition acceptance. Local
concerns to check in the complete new views are: dark performer faces against
bright tableware; strong yellow-green foreground vegetation; large floating
props competing with the cottage/performer silhouette; and the persistent
empty objective strip visible over the picture. The eighteen new views were
still being produced, and the main agent explicitly said s14 would be replaced.

The repeat video additionally exposes an angle hidden by the low overview:
at giant eye height, roughly 8–22 seconds, a wide pale strip with little detail
separates the three-dimensional garden from the painted distance. This seam
needs giant-view blending/coverage review. It is a visible local backdrop
transition issue, not evidence that the new far scenery is absent. Inspect
both ordinary and giant viewpoints before closing the distant-ground finding.

### F4. Disposition of this handoff

- Close the old severe static facial tears/pseudo-teeth and separate nose oval
  for this new preview generation; retain the listed P2 close-up finish issues
  and unreviewed natural speech.
- Accept the supplied repeated blue-tea/cake mechanism and resource-restoration
  regression; retain cake-action framing and specific untested variants.
- Credit the new distant scenery and shared song camera, with the giant-height
  transition and complete eighteen-view assessment pending.
- Retain all final contact/light/path/composition gates not directly addressed
  by these artifacts. No new overall score or all-optimization acceptance is
  issued from this partial handoff.

## Appendix G — New scene batch, before final dynamic evidence

Independent recheck: 2026-11-12, approximately 01:05, UTC+08:00.

### G1. Evidence and limits

All eighteen authored views, three no-post views and six location views were
opened individually. The reviewed batch is frozen in
`art/review/2026-11-11/independent/recheck-08/views/`, with SHA-256 hashes in its
parent `manifest.json`. Its `frames.json` is the 00:55 handoff; later changes
to the live `complete/views/` directory do not silently replace this record.
The original concept images `art/storyboard/s01.png`, `s14.png` and `s16.png`
were reopened for the lighting, hierarchy and exit comparison.

Source reads covered `look.js`, `fields.js`, `ground.js`, `layout.js`, `song.js`,
`frames.js`, the grotto in `tasks.js`, liquid materials and `capture-review.mjs`.
The original capture helper is frozen in `recheck-08/source/`; the later
in-progress corrections are separately preserved in `source-followup/`.
This review performed no game operation, browser launch, build or test.

The main agent has explicitly superseded the old Hatter lean clip and is
replacing **s05 and fp_small** after natural playback verification. Those two
old poses are excluded from new actor acceptance and from scoring here.
Natural speech, whole prop motion and the revised giant repeat are also still
pending. The other authored images are useful scene diagnostics, but they are
staged views, not proof that an ordinary player sees every pictured angle.

### G2. Progress that the images actually support

| Area | Current visual finding | Scope of acceptance |
|---|---|---|
| Main garden paths | s04 and s11 show curved pale paths, connected steps/landings, white fence openings and a route toward the elevated cottage. This is a coherent garden layout rather than isolated display spots. | Credit the visible topology alongside the previously reviewed real cottage walk. These stills do not establish every shortcut or free-camera clearance. |
| Root exit and flower arches | s11, s15, s16 and the rose-path side view show supported garden arches and an opening that leads into an actual hedge corridor. The former detached wreath against the roots is not present in this arrangement. | Close the old unsupported-root-wreath finding for this layout. Keep foliage scale, exit staging and corridor finish as separate art issues. |
| Cottage | The location side view contains an enclosed furnished sitting space, bed, curtains, storage and hearth/work area. The earlier actual-room walkthrough and note close-up remain the stronger evidence for use and reading. | The old 1.2 m fireplace display is superseded. Do not call this home a placeholder door recess. Furniture and material refinement remain open. |
| Far scenery | s01, s04, s10 and s14 show recognizable trees, hills, buildings and a cool lavender distant ridge. The new distance is substantially richer than the former featureless bands. | Accept presence and composition progress. The high giant-eye transition still needs the new actual repeat recording. |
| Shared lighting direction | A visible low sun and warm illuminated surfaces now appear in the principal table/overview views, with cooler distance. s14 is substantially closer to the intended sunset family. | Close the absolute claim that the main views contain no sun or directional warm light. Full concept fidelity is still unaccepted. |

### G3. Remaining scene issues, ordered by practical impact

**P2 — The grotto light washes out the quest object in the reviewed s08.**
The ceiling and back of the little alcove become a white/yellow radial flare;
the vertical pipe dominates while the small valve wheel and gear lose readable
shape. This is a direct mismatch with the intended readable, warm-lit ticking
mechanism. Reproduce the pictured view with `?frame=s08`; the ordinary route is
to shrink, enter the cracked fountain base and face its valve.

The originally inspected lamp was far too strong for centimetre-scale spacing.
The latest live source now uses intensity 0.018 and explicitly documents the
inverse-square scale issue. This is a credible source correction, **pending a
new s08 and an ordinary-height small-player view**. Pass when brass rim,
individual spokes, gear and surrounding stone are distinct without relying on
an overlaid quest glint. Do not close this from a changed constant alone.

**P2 — Fountain syrup and the plaza still read as unfinished materials.**
In s09 the falling syrup appears as an opaque cream/ochre glaze or wax curtain,
with a broad heavy outline; it does not clearly read as amber liquid. The
surrounding broad uniform gray disk has little visible paving detail or edge
variation and competes with the detailed porcelain, flowers and cottage.
Inspect the fountain after two gears with both small and ordinary viewpoints.
Acceptance needs a readable moving liquid surface and thinner falling edges,
plus a plaza material whose scale and finish belong to this garden. Transparent
water is not required for syrup; convincing color, highlights, thickness and
motion are. A resource-cleanup pass does not answer this material issue.

**P2 — Close actors have hard pale edge light rather than a consistent warm rim.**
Fries's hair and some clothing edges are conspicuously white in s01, s12 and
their no-post counterparts. Nearby shaded skin/cloth and ground remain very
dark brown. The concept's orange backlight, readable faces and cool violet
shadows are more unified. The cool painted distance helps, but it does not by
itself make the actors' shadows cool or their local contrast readable.
Because the pale edging persists without post-processing, bloom alone is not
an adequate explanation or remedy. Review the rim contribution, surface
responses and fill together; preserve shaped shadows and warm sun direction.

**P2 — Tree/hedge foliage remains a dense repeated mass.**
The broad overhead crown in s04 and several wide views reads as a thick
yellow-green clustered ceiling, with limited sky gaps and repeated rounded
clumps. The rose-path views likewise use very large stacked leaf shapes that
dominate the narrow corridor; red blooms and the exit route struggle for
separation. The supported arch topology has improved, but the leaf scale,
branch/leaf silhouettes and top-lit versus shaded variation still fall short
of the original s01/s16 reference. Keep a readable exit opening and a visible
walking ribbon through the roses while refining those masses.

**P2 — Performer hierarchy needs another composition pass.**
In the new shared s14, the cottage, floating hats/cakes, lanterns and bright
vegetation take substantial attention from the relatively small performers.
Large props overlap important building/actor silhouettes. In several table
angles, a teapot, dessert stand or foreground chair also hides faces or hands.
Food-focused inserts can legitimately emphasize props; the acting beats need
their own clear faces and action. Check the moving song camera and the actual
interaction cameras before closing this issue. A shared camera definition and
a successful rhythm score do not establish clear staging.

### G4. Capture defects must not be mistaken for game regressions

The reviewed hall-front and rose-path-front location photos are conspicuously
out of focus. Their frozen helper moves the camera away from frame s16 but
does not update `lens.target`; `stageFrame()` itself does set that target.
Consequently these authored location photos retain the old focal target.
They cannot demonstrate that the real cottage, real note close-up or normal
exploration camera has become blurry again. The current helper now updates
the lens target with each location; new captures are needed to replace the
faulty evidence. Structural location photos may also use disabled depth of
field if their purpose is to show layout rather than cinematic focus.

The reviewed `fp_giant` metadata records camera Y = 2.86 m. This authored
picture does not establish how the repaired ground/background transition looks
from the actual giant-eye height. `frames.js` has since been corrected to
Y = 5.5 m; that change and the new below-playable-ground alpha fade are source
progress, not visual closure of the pale band seen in the earlier repeat.

The three frozen no-post shots also retain an empty objective strip and
controls, while the eighteen main shots hide them. The latest helper now
hides the same UI in both branches. This inconsistency affects presentation
and comparison of the diagnostic images; it is not evidence that ordinary
play has a new objective or localization regression.

### G5. Disposition

The furnished home, connected visible route, supported garden arches and
recognizable distant scene are real improvements. They supersede the relevant
old absolute defects. The small grotto, syrup/plaza materials, pale rim edges,
foliage massing and performer hierarchy still require specific refinement or
replacement evidence. Revised capture scripts must supply the corrected images.

No new scene issue in this static handoff overturns the already accepted
ordinary mechanism foundation. **No replacement overall score is assigned.**
The historical 4.0 rejection remains pending the corrected lean views, natural
lean/shrink segment, readable giant cake, interrupt cleanup, actual speech and
complete prop-contact handoff. Their numeric assertions and resource checks
must be considered alongside the images, not substituted for visual review.
