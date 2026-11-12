import colorsys
import json
from pathlib import Path
from statistics import median
from PIL import Image

sources = {'frozen': 's01', 'awake': 's14', 'sixOhOne': 's15'}
palettes = {}
for phase, frame in sources.items():
    image = Image.open(f'art/storyboard/{frame}.png').convert('RGB').resize((320, 180))
    samples = [(rgb, colorsys.rgb_to_hsv(*(v / 255 for v in rgb)), index // 320) for index, rgb in enumerate(image.getdata())]
    def pick(predicate):
        selected = [rgb for rgb, hsv, row in samples if predicate(hsv[0] * 360, hsv[1], hsv[2], row)]
        if len(selected) < 10:
            raise RuntimeError(f'Insufficient reference samples for {phase}')
        return '#' + ''.join(f'{round(median(rgb[c] for rgb in selected)):02x}' for c in range(3))
    palettes[phase] = {
        'source': f'art/storyboard/{frame}.png',
        'main': pick(lambda h,s,v,y: 18 < h < 62 and .35 < s < .9 and v > .7),
        'secondary': pick(lambda h,s,v,y: 48 < h < 105 and .2 < s < .8 and .15 < v < .55),
        'accent': pick(lambda h,s,v,y: (h > 325 or h < 10) and s > .4 and .4 < v < .9),
        'shadow': pick(lambda h,s,v,y: 200 < h < 315 and .05 < s < .5 and .2 < v < .75),
        'sky': pick(lambda h,s,v,y: y < 70 and 12 < h < 65 and .2 < s < .7 and v > .7),
        'roseSky': pick(lambda h,s,v,y: y < 90 and 300 < h < 355 and .15 < s < .65 and v > .55),
    }
Path('src/look-palette.json').write_text(json.dumps(palettes, indent=2))
lines = ['# Locked color script', '', 'Reference colors are median RGB samples selected by hue/value masks from the supplied concepts.',
    'Dominant warm light: 60%; muted foliage/wood: 30%; rose and blue accents: 10%. Dark/middle/high value regions remain legible without post-processing.', '',
    '| Moment | Main | Secondary | Accent | Shadow | Sky | Reference |', '|---|---|---|---|---|---|---|']
for phase,p in palettes.items():
    lines.append('| ' + ' | '.join([phase,p['main'],p['secondary'],p['accent'],p['shadow'],p['sky'],p['source']]) + ' |')
lines += ['', 'The low sun is framed north of the table, the canopy shades the hosts, and a cool violet fill preserves face detail.',
    'The awakening raises motion and warm light without adding more saturated hues. At 6:01 the sky moves toward the sampled rose light.',
    'src/look.js owns exposure, lighting ratios, sky, fog, surface palette and the one display-domain LUT. No other module owns a creative grade.',
    'Review cameras: s01 over-shoulder, s14 garden overview, s12 table detail. All eighteen frames must be captured for final review.']
Path('docs/color-script.md').write_text('\n'.join(lines)+'\n')
print(json.dumps(palettes, indent=2))
