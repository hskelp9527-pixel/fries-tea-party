# Rendering and lighting pass, 2026-11-03

The lighting reference requested was `e2448df`, committed at 15:00:51 +08:00.
Its renderer was also previewed on the current layout (with compatibility stubs
for the later lens API). That preview compares lighting, not the complete old
scene or the exact assets that existed at 15:00.

The later `47664ba` added a 20% saturation boost and 14% contrast increase, a
more orange sun and stronger orange character rims. This pass removes that
grade boost, reduces bloom and rims, restores the reference's sun colour and
sky gradient colours, and uses a light neutral fill. The corrected display-space
LUT encoding is retained; this is an adaptation of the reference, not a full revert.
The 6:01 pink transition is retained.

## Performance changes

- Instance repeated geometry/material pairs in the baked table dressing. The
  playable cups, pours and dancing props stay independently addressable. Table
  mesh count in the loaded scene fell from 375 to 99; hidden dressing stays hidden.
- Reduce distant flower geometry clustering from 14 to 9 divisions, retaining
  the full close-up models and the existing density and distance curves.
- Use depth of field only when an authored subject is within 3.5 m of the camera.
  Wide shots avoid both blur targets; close shots retain the effect.
- Cap drawing resolution at 1920 x 1080 pixels in total, and pixel ratio at 1.5.
  Resize recomputes the budget. A 3840 x 2160 viewport produced a 1920 x 1080
  drawing buffer, rather than rendering the full scene at display density.

## Measurements

Chrome headless, NVIDIA Blackwell WebGPU, 1280 x 720, device pixel ratio 1,
fixed `?frame=s14&perf` staging. Samples were taken after shader compilation.
The before sample covers 60 animation callbacks and the final sample covers 120.
Times below are wall-clock animation frame intervals, not GPU timestamp timings.

| Signal | Before | After |
|---|---:|---:|
| Mean frame interval | 38.02 ms | 29.91 ms |
| Approximate frame rate | 26.3 fps | 33.4 fps |
| Panel draw calls per frame | 1,967 | 1,543 |
| Panel triangles per frame | 7.76 million | 6.99 million |

This is about a 21% reduction in frame time on this view. Floating props use
random positions and continue moving, so draw counts are approximate rather than
an identical deterministic replay. The result does not establish performance on
other computers or throughout a full playthrough.

## Verification and limits

- `npm test`: five dialogue scheduler checks passed.
- `npm run build`: passed; the existing large JavaScript chunk warning remains.
- WebGPU: reviewed s14, s01 and the pink s15 staging without page exceptions.
- WebGL fallback: reviewed s14 without page exceptions.
- Lens checks: 2 m enables blur; 10 m and free gameplay disable it.
- Full chapter playback was not repeated. Some fixed review cameras, including
  the tree-door staging, still need composition updates for the moved tree.

The initial uncommitted scene changes were preserved. In particular, shorter
flower LOD distances, the GROW setting and scenery instancing already existed
before this pass and are not claimed as changes made here.
