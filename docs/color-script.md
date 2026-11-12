# Color script

Golden-hour garden: warm sun, cool violet shadows, green lawn, a sky that runs peach-gold at the sun to periwinkle overhead. All values are authored in `src/look-palette.json` and `src/look.js`; the concept sampling (`main`, `secondary`, `accent`, `shadow`, `roseSky`) only seeds sun colour, hemisphere sky and the 6:01 rose.

| Moment | Sun-side sky | Away (dusk) | Zenith | Glow (main) |
|---|---|---|---|---|
| frozen | #ffc078 | #a09ed0 | #6a7cc8 | #dd9457 |
| awake | #ffb86e | #9c9ccf | #6678c4 | #dc9957 |
| sixOhOne | #d57a92 | #d890a8 | #8f78b8 | #de8f50 |

Surface albedo (sRGB): dry grass #c8d85a, lush #92b640, moss #5f8236, path sand #eab870 / #f6d595. Sunlit lawn lands near #7d9a3a-#93a845 and tree shade near #3c5528-#4a6332 after lighting. Grass card tints follow the ground (less red, so tufts match the floor).

Lighting: sun 4.4 golden (white mix 0.3) at [0.86, 0.22, -0.46] (about 13 degrees up); shadow fill is violet: environment 0.36, hemisphere 0.26 (sky #9d96a8, ground #6a6a3e), bounce 0.2 (#8796c3), grade shadowCool 0.04. Exposure 1.04; grade contrast 1.07, saturation 1.06; glow x3.6; backdrop multiplied by #ffe8cc. Haze stays warm because it samples the sky low on the horizon.

src/look.js owns exposure, lighting ratios, sky, fog, surface palette and the one display-domain LUT. No other module owns a creative grade.
Review cameras: s01 over-shoulder, s14 garden overview, s12 table detail. All eighteen frames must be captured for final review.

The source painted panorama provides distant forest, villages and ridge silhouettes. The playable plateau drops into a low valley; it has no additional circular background ridges concealing that panorama. `layout.song.overview` owns the final song framing and the s14 review view, so the review camera is also used during actual play.

The panorama's lowest foreground texels lie on a broad sloping apron below the valley. This keeps the sky from showing underneath the distance and avoids stretching grass into a vertical wall, while leaving the painted skyline fixed. The authored giant camera uses the clearing beyond the table; cinematic cameras inside Fries's eye region hide his own mesh while retaining its shadow.
