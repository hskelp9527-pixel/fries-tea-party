// Official Kenney CC0 Foley pack. Only the chosen recordings are retained.
import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'

const sourcePage = 'https://kenney.nl/assets/impact-sounds'
const archiveUrl = 'https://kenney.nl/download-link/6173736574732f696d706163742d736f756e6473'
const output = path.resolve('art/optimized/audio')
fs.mkdirSync(output, { recursive: true })
const archive = path.join(output, 'kenney-impact-source.zip')
const linkResponse = await fetch(archiveUrl, { headers: { Referer: sourcePage } })
if (!linkResponse.ok) throw new Error(`Could not obtain official download link: ${linkResponse.status}`)
const { url } = await linkResponse.json()
const response = await fetch(url, { headers: { Referer: sourcePage } })
if (!response.ok) throw new Error(`Could not download official Foley pack: ${response.status}`)
fs.writeFileSync(archive, Buffer.from(await response.arrayBuffer()))
const extraction = spawnSync(process.env.PYTHON_PATH ?? 'E:/Python/python.exe', ['-c', `
import json, pathlib, sys, zipfile
archive, output = pathlib.Path(sys.argv[1]), pathlib.Path(sys.argv[2])
with zipfile.ZipFile(archive) as z:
    names = [n for n in z.namelist() if n.lower().endswith('.ogg')]
    print(json.dumps(names))
    for name in names:
        leaf = pathlib.PurePosixPath(name).name
        if leaf.startswith(('footstep_grass_', 'footstep_wood_', 'footstep_concrete_', 'impactGlass_light_', 'impactPlate_light_', 'impactWood_light_')):
            (output / leaf).write_bytes(z.read(name))
    license_name = next(n for n in z.namelist() if pathlib.PurePosixPath(n).name.lower() == 'license.txt')
    (output / 'Kenney-License.txt').write_bytes(z.read(license_name))
`, archive, output], { encoding: 'utf8', windowsHide: true })
if (extraction.status !== 0) throw new Error(extraction.stderr)
fs.unlinkSync(archive)
const licenseUrl = 'https://creativecommons.org/publicdomain/zero/1.0/'
const sources = [{ creator: 'Kenney', title: 'Impact Sounds 1.0', sourcePage, downloadUrl: archiveUrl,
  license: 'CC0-1.0', licenseUrl, processing: 'Original OGG recordings, unchanged.',
  files: fs.readdirSync(output).filter(name => /^(footstep_|impact(?:Glass|Plate|Wood)_light_).*\.ogg$/.test(name)) }]
const additional = [
  { creator: 'cemkalyoncu', title: 'Tick and Tock', sourcePage: 'https://opengameart.org/content/tick-and-tock',
    downloadUrl: 'https://opengameart.org/sites/default/files/tick.wav', file: 'clock_tick_000.ogg' },
  { creator: 'cemkalyoncu', title: 'Tick and Tock', sourcePage: 'https://opengameart.org/content/tick-and-tock',
    downloadUrl: 'https://opengameart.org/sites/default/files/tick2.wav', file: 'clock_tick_001.ogg' },
  { creator: 'bxyorna', title: 'Water drop / Splash', sourcePage: 'https://freesound.org/people/bxyorna/sounds/410335/',
    downloadUrl: 'https://cdn.freesound.org/previews/410/410335_7963426-hq.mp3', file: 'water_drop_000.ogg' },
]
const ffmpeg = process.env.FFMPEG_PATH ?? 'E:/Tools/ffmpeg/bin/ffmpeg.exe'
for (const asset of additional) {
  const response = await fetch(asset.downloadUrl)
  if (!response.ok) throw new Error(`Could not download ${asset.title}: ${response.status}`)
  const temporary = path.join(output, `source-${path.basename(new URL(asset.downloadUrl).pathname)}`)
  fs.writeFileSync(temporary, Buffer.from(await response.arrayBuffer()))
  const conversion = spawnSync(ffmpeg, ['-v', 'error', '-y', '-i', temporary, '-ac', '1', '-c:a', 'libopus', '-b:a', '64k',
    '-application', 'audio', path.join(output, asset.file)], { encoding: 'utf8', windowsHide: true })
  if (conversion.status !== 0) throw new Error(conversion.stderr || `Could not convert ${asset.title}`)
  fs.unlinkSync(temporary)
  sources.push({ ...asset, license: 'CC0-1.0', licenseUrl, files: [asset.file],
    processing: asset.creator === 'bxyorna' ? 'Public high-quality MP3 preview transcoded to mono Opus. Original AIFF requires login.' : 'Original microphone recording transcoded from WAV to mono Opus.' })
}
fs.writeFileSync(path.join(output, 'sources.json'), JSON.stringify({ retrieved: '2026-11-11', sources }, null, 2))
console.log(`Downloaded ${sources.reduce((n, source) => n + source.files.length, 0)} CC0 recordings; provenance saved to sources.json`)
