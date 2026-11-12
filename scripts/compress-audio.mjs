// Refresh only chosen music and spoken lines; alternative scores are never processed or emitted.
import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'

const root = process.cwd(), ffmpeg = process.env.FFMPEG_PATH ?? 'E:/Tools/ffmpeg/bin/ffmpeg.exe'
const selected = ['01t_opening_b', '02t_explore_frozen_b', '03t_explore_awake_a', '04t_little_bat_a', '06t_ending_a']
const voiceDirectory = path.join(root, 'audio/voice/lines')
const sources = selected.map(name => ({ source: path.join(root, 'audio', name + '.mp3'),
  target: path.join(root, 'art/optimized/audio/music', name + '.ogg'), speech: false }))
if (!process.argv.includes('--music-only') && fs.existsSync(voiceDirectory)) {
  for (const name of fs.readdirSync(voiceDirectory).filter(name => name.endsWith('.wav'))) {
    sources.push({ source: path.join(voiceDirectory, name), target: path.join(root, 'art/optimized/voice', name.replace(/\.wav$/, '.ogg')), speech: true })
  }
}
const rows = []
for (const { source, target, speech } of sources) {
  if (!fs.existsSync(source)) continue
  if (process.argv.includes('--force') || !fs.existsSync(target) || fs.statSync(target).mtimeMs < fs.statSync(source).mtimeMs) {
    fs.mkdirSync(path.dirname(target), { recursive: true })
    const conversion = spawnSync(ffmpeg, ['-v', 'error', '-y', '-i', source, '-c:a', 'libopus', '-b:a', speech ? '40k' : '80k',
      '-application', speech ? 'voip' : 'audio', ...(speech ? ['-ac', '1'] : []), target], { encoding: 'utf8', windowsHide: true })
    if (conversion.status !== 0) throw new Error(conversion.stderr || 'Audio conversion failed')
  }
  rows.push({ source: path.relative(root, source).replaceAll('\\', '/'), target: path.relative(root, target).replaceAll('\\', '/'),
    before: fs.statSync(source).size, after: fs.statSync(target).size })
}
const report = { codec: 'Opus', musicBitrate: 80000, voiceBitrate: 40000, files: rows,
  before: rows.reduce((total, row) => total + row.before, 0), after: rows.reduce((total, row) => total + row.after, 0) }
fs.mkdirSync(path.join(root, 'art/optimized/audio'), { recursive: true })
fs.writeFileSync(path.join(root, 'art/optimized/audio/compression.json'), JSON.stringify(report, null, 2))
console.log(`Prepared ${rows.length} chosen tracks/lines: ${report.before} -> ${report.after} bytes`)
