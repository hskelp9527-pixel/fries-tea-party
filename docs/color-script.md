# Locked color script

Reference colors are median RGB samples selected by hue/value masks from the supplied concepts.
Dominant warm light: 60%; muted foliage/wood: 30%; rose and blue accents: 10%. Dark/middle/high value regions remain legible without post-processing.

| Moment | Main | Secondary | Accent | Shadow | Sky | Reference |
|---|---|---|---|---|---|---|
| frozen | #dd9457 | #423d24 | #851f1c | #9d96a8 | #f6c181 | art/storyboard/s01.png |
| awake | #dc9957 | #444221 | #a23937 | #7c7693 | #eead76 | art/storyboard/s14.png |
| sixOhOne | #de8f50 | #3d3b1e | #9c403b | #625366 | #f9a375 | art/storyboard/s15.png |

The low sun is framed above and to the right of the cottage in the shared song overview. Its direction is [0.86, 0.22, -0.46], approximately 13 degrees above the horizon. The canopy shades the hosts; environment 0.24, hemisphere 0.14 and a 0.12 cool violet fill preserve face detail without filling the shadows flat. Exposure is 0.98.
The awakening raises motion and warm light without adding more saturated hues. At 6:01 the sky moves toward the sampled rose light.
src/look.js owns exposure, lighting ratios, sky, fog, surface palette and the one display-domain LUT. No other module owns a creative grade.
Review cameras: s01 over-shoulder, s14 garden overview, s12 table detail. All eighteen frames must be captured for final review.

The source painted panorama provides distant forest, villages and ridge silhouettes. The playable plateau drops into a low valley; it has no additional circular background ridges concealing that panorama. `layout.song.overview` owns the final song framing and the s14 review view, so the review camera is also used during actual play.

The panorama's lowest foreground texels lie on a broad sloping apron below the valley. This keeps the sky from showing underneath the distance and avoids stretching grass into a vertical wall, while leaving the painted skyline fixed. The authored giant camera uses the clearing beyond the table; cinematic cameras inside Fries's eye region hide his own mesh while retaining its shadow.
