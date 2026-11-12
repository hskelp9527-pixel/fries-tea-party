import fs from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'
import {NodeIO} from '@gltf-transform/core'
import {ALL_EXTENSIONS} from '@gltf-transform/extensions'
import {MeshoptDecoder} from 'meshoptimizer'
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.decoder':MeshoptDecoder})
const walk=dir=>fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(dir,e.name)):[path.join(dir,e.name)])
const rows=[];let memory=0
for(const file of walk('art/optimized/models').filter(file=>file.endsWith('.glb'))){
  const doc=await io.read(file);let bytes=0,triangles=0
  for(const texture of doc.getRoot().listTextures()){
    const {width,height}=await sharp(texture.getImage()).metadata();bytes+=width*height*4*4/3
  }
  for(const mesh of doc.getRoot().listMeshes())for(const p of mesh.listPrimitives())triangles+=(p.getIndices()?.getCount()??p.getAttribute('POSITION').getCount())/3
  memory+=bytes;rows.push({file,bytes:fs.statSync(file).size,textureMiB:bytes/1048576,triangles,clips:doc.getRoot().listAnimations().map(a=>({name:a.getName(),duration:Math.max(...a.listSamplers().map(s=>s.getInput().getMax([])[0]))}))})
}
const sources=JSON.parse(fs.readFileSync('art/optimized/audio/sources.json','utf8'))
const report={models:rows.length,modelBytes:rows.reduce((n,r)=>n+r.bytes,0),modelTextureMiB:memory/1048576,note:'RGBA8 plus full mip-chain upper bound for model maps. Render targets, procedural atlases and geometry are reported separately.',sfx:sources.sources.reduce((n,r)=>n+r.files.length,0),files:rows}
fs.writeFileSync('art/optimized/asset-report.json',JSON.stringify(report,null,2));console.log(JSON.stringify({...report,files:undefined}))
const compressed=JSON.parse(fs.readFileSync('art/optimized/compression.json','utf8'))
const audio=JSON.parse(fs.readFileSync('art/optimized/audio/compression.json','utf8'))
const table=rows=>`| File | Source bytes | Optimized bytes | Reduction |\n|---|---:|---:|---:|\n`+rows.map(row=>`| ${row.file??row.source} | ${row.before} | ${row.after} | ${(100*(1-row.after/row.before)).toFixed(1)}% |`).join('\n')
fs.writeFileSync('docs/asset-sizes-2026-11-11.md',`# Asset compression, 2026-11-11\n\nAll 63 optimized GLBs were decoded and inspected after writing. Original files are retained. Geometry uses Meshopt; textures use WebP, capped at 1024 pixels for actors and 384 for props. Model texture allocation (RGBA8 with mipmaps): ${report.modelTextureMiB.toFixed(1)} MiB. Runtime buffers and render targets are measured separately.\n\nModels: ${compressed.modelBefore.toLocaleString('en-US')} -> ${compressed.modelAfter.toLocaleString('en-US')} bytes. Speech: ${compressed.audioBefore.toLocaleString('en-US')} -> ${compressed.audioAfter.toLocaleString('en-US')} bytes.\n\nThere are 137 source WAVs. The diagnosis counted both Vite URL-module requests and their media requests as 274 WAVs. This table lists every actual source, once.\n\n## Models\n\n${table(compressed.models)}\n\n## Dialogue\n\n${table(compressed.audio)}\n\n## Selected music\n\n${table(audio.files.filter(row=>!row.source.includes('/voice/')))}\n`)
