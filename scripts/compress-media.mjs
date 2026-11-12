import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { NodeIO } from '@gltf-transform/core'
import { ALL_EXTENSIONS } from '@gltf-transform/extensions'
import { dedup, resample, meshopt, textureCompress, palette, flatten, join, simplify } from '@gltf-transform/functions'
import { MeshoptEncoder, MeshoptDecoder, MeshoptSimplifier } from 'meshoptimizer'
import sharp from 'sharp'
import { bakeCupAtlas } from './cup-atlas.mjs'

await Promise.all([MeshoptEncoder.ready, MeshoptDecoder.ready])
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder, 'meshopt.decoder': MeshoptDecoder })
const root = process.cwd(), output = path.join(root, 'art/optimized')
const characterOnly=process.argv.includes('--characters')
const characters = new Set(['fries', 'hatter', 'hare', 'dormouse'])
const selected=characterOnly?characters:new Set(process.argv.find(a=>a.startsWith('--models='))?.slice(9).split(',')??[])
const selectedOnly=selected.size>0
const previous=selectedOnly&&fs.existsSync(path.join(output,'compression.json'))?JSON.parse(fs.readFileSync(path.join(output,'compression.json'),'utf8')):null
const atlased = new Set(['teacup', 'blue_teacup', 'saucer', 'cupcake', 'fruit_tart', 'macarons', 'cake', 'whole_cake'])
const walk = dir => fs.existsSync(dir) ? fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => entry.name === 'blender' ? [] : entry.isDirectory() ? walk(path.join(dir, entry.name)) : [path.join(dir, entry.name)]) : []
const rows = []
for (const file of walk(path.join(root, 'art/models')).filter(file => file.endsWith('.glb'))) {
  const relative = path.relative(path.join(root, 'art/models'), file)
  const authored = path.join(root, 'art/characters/finished', path.basename(file))
  const authoredProp=path.join(root,'art/props/finished',path.basename(file))
  const source = fs.existsSync(authored) ? authored : fs.existsSync(authoredProp)?authoredProp:file
  if(selectedOnly&&!selected.has(path.basename(file,'.glb')))continue
  const doc = await io.read(source), size = characters.has(path.basename(file, '.glb')) ? 1024 : 384
  const name=path.basename(file,'.glb')
  if(['teacup','blue_teacup'].includes(name))await bakeCupAtlas(doc)
  if (/^(flagstone|wall_stone|steps_stone)/.test(name)) await doc.transform(simplify({simplifier:MeshoptSimplifier,ratio:.22,error:.02}))
  else if (/^flower_/.test(name)) await doc.transform(simplify({simplifier:MeshoptSimplifier,ratio:.35,error:.02}))
  else if (atlased.has(name)||['spoon','plate','pocket_watch','hat'].includes(name)) await doc.transform(simplify({simplifier:MeshoptSimplifier,ratio:.24,error:.008}))
  if (atlased.has(path.basename(file, '.glb'))) await doc.transform(palette({ min: 2 }), flatten(), join())
  await doc.transform(dedup(), resample(), textureCompress({ encoder: sharp, targetFormat: 'webp', resize: [size, size], quality: 88 }),
    meshopt({ encoder: MeshoptEncoder, level: 'high', quantizePosition: 16, quantizeNormal: 12, quantizeTexcoord: 14, quantizeWeight: 16 }))
  const target = path.join(output, 'models', relative)
  fs.mkdirSync(path.dirname(target), { recursive: true })
  await io.write(target, doc)
  const check = await io.read(target)
  if (check.getRoot().listAnimations().length !== doc.getRoot().listAnimations().length) throw new Error(`Lost animation: ${relative}`)
  rows.push({ file: relative.replaceAll('\\', '/'), before: fs.statSync(file).size, after: fs.statSync(target).size,
    animations: check.getRoot().listAnimations().map(clip => clip.getName()) })
  console.log(`${relative}: ${rows.at(-1).before} -> ${rows.at(-1).after}`)
}
for(const name of selectedOnly?[]:['backdrop','leaves','flowers']){
  const source=path.join(root,'art/textures',name==='backdrop'?'backdrop.png':`kit/${name}.png`)
  if(fs.existsSync(source))await sharp(source).resize({width:2048,withoutEnlargement:true}).webp({quality:88}).toFile(path.join(output,`${name}.webp`))
}
const ffmpeg = process.env.FFMPEG_PATH ?? 'E:/Tools/ffmpeg/bin/ffmpeg.exe'
const audio = selectedOnly?(previous?.audio??[]):[]
for (const file of selectedOnly?[]:walk(path.join(root, 'audio/voice/lines')).filter(file => file.endsWith('.wav'))) {
  const target = path.join(output, 'voice', path.basename(file, '.wav') + '.ogg')
  fs.mkdirSync(path.dirname(target), { recursive: true })
  const result = spawnSync(ffmpeg, ['-v', 'error', '-y', '-i', file, '-c:a', 'libopus', '-b:a', '40k', '-application', 'voip', target], { windowsHide: true, encoding: 'utf8' })
  if (result.status !== 0) throw new Error(result.stderr)
  audio.push({ file: path.basename(file), before: fs.statSync(file).size, after: fs.statSync(target).size })
}
const allRows=[...new Map([...(previous?.models??[]),...rows].map(row=>[row.file,row])).values()]
const report = { models: allRows, audio, modelBefore: allRows.reduce((n, r) => n + r.before, 0), modelAfter: allRows.reduce((n, r) => n + r.after, 0),
  audioBefore: audio.reduce((n, r) => n + r.before, 0), audioAfter: audio.reduce((n, r) => n + r.after, 0) }
fs.writeFileSync(path.join(output, 'compression.json'), JSON.stringify(report, null, 2))
console.log(JSON.stringify({ modelBefore: report.modelBefore, modelAfter: report.modelAfter, audioBefore: report.audioBefore, audioAfter: report.audioAfter }))
