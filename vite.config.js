import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// Emit only the chosen model variant. Source art remains available for editing.
function modelManifest() {
  const project = fileURLToPath(new URL('.', import.meta.url))
  return {
    name: 'tea-model-manifest',
    resolveId(id) { if (id === 'virtual:tea-models') return '\0tea-models' },
    load(id) {
      if (id !== '\0tea-models') return
      const imports = [], entries = []
      function scan(directory) {
        if (!fs.existsSync(directory)) return
        for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
          if (entry.name === 'blender') continue
          const file = path.join(directory, entry.name)
          if (entry.isDirectory()) scan(file)
          else if (entry.name.endsWith('.glb')) {
            const relative = path.relative(path.join(project, 'art/models'), file).replaceAll('\\', '/')
            const optimized = path.join(project, 'art/optimized/models', relative)
            const authored=[path.join(project,'art/characters/finished',entry.name),path.join(project,'art/props/finished',entry.name)].find(file=>fs.existsSync(file))??file
            const current = fs.existsSync(optimized) && fs.statSync(optimized).mtimeMs >= fs.statSync(authored).mtimeMs
            const url = current ? `/art/optimized/models/${relative}` : '/'+path.relative(project,authored).replaceAll('\\','/')
            const name = `asset${imports.length}`
            imports.push(`import ${name} from ${JSON.stringify(url + '?url')}`)
            entries.push(`${JSON.stringify('/art/models/' + relative)}:${name}`)
          }
        }
      }
      scan(path.join(project, 'art/models'))
      return `${imports.join('\n')}\nexport default {${entries.join(',')}}`
    },
  }
}
function audioManifest() {
  const project = fileURLToPath(new URL('.', import.meta.url))
  return {
    name: 'tea-audio-manifest',
    resolveId(id) { if (id === 'virtual:tea-audio') return '\0tea-audio' },
    load(id) {
      if (id !== '\0tea-audio') return
      const imports = [], entries = []
      const files = ['01t_opening_b', '02t_explore_frozen_b', '03t_explore_awake_a', '04t_little_bat_a', '06t_ending_a']
        .map(name => [`audio/${name}.mp3`, `art/optimized/audio/music/${name}.ogg`])
      const voices = path.join(project, 'audio/voice/lines')
      if (fs.existsSync(voices)) for (const name of fs.readdirSync(voices).filter(name => name.endsWith('.wav')))
        files.push([`audio/voice/lines/${name}`, `art/optimized/voice/${name.replace(/\.wav$/, '.ogg')}`])
      for (const [source, optimized] of files) {
        if (!fs.existsSync(path.join(project, source))) continue
        const current = fs.existsSync(path.join(project, optimized)) && fs.statSync(path.join(project, optimized)).mtimeMs >= fs.statSync(path.join(project, source)).mtimeMs
        const name = `audio${imports.length}`
        imports.push(`import ${name} from ${JSON.stringify('/' + (current ? optimized : source) + '?url')}`)
        entries.push(`${JSON.stringify('/' + source)}:${name}`)
      }
      return `${imports.join('\n')}\nexport default {${entries.join(',')}}`
    },
  }
}
export default { plugins: [modelManifest(), audioManifest()], server: { watch: { ignored: ['**/art/**', '**/audio/**'] } } }
