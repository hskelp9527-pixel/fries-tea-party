import json
from pathlib import Path
from PIL import Image

directory = Path('art/optimized/flowers')
metadata = json.loads((directory / 'dimensions.json').read_text())
atlas = Image.new('RGBA', (512, 256 * len(metadata)))
for row, (name, spec) in enumerate(metadata.items()):
    spec['row'] = row
    for col in range(2):
        source = directory / f'{name}-{col}.png'
        with Image.open(source) as image:
            atlas.paste(image, (col * 256, row * 256))
        source.unlink()
atlas.save(directory / 'flowers.webp', lossless=True)
(directory / 'dimensions.json').write_text(json.dumps(metadata, indent=2))
print('Packed seven species and two views into', directory / 'flowers.webp')
