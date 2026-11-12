import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'
import { createContext, SourceTextModule, SyntheticModule } from 'node:vm'

const source = await readFile(new URL('../src/banter.js', import.meta.url), 'utf8')
const speakers = JSON.parse(await readFile(new URL('../src/speakers.json', import.meta.url), 'utf8'))

// Load the real scheduler without the renderer, models or audio device. Voice endings and
// the pause between lines stay under the test's control to reproduce cutscene races.
async function scheduler() {
  const pending = [], pauses = [], calls = []
  const context = createContext({ setTimeout: resolve => pauses.push(resolve) })
  class Vector3 { distanceTo() { return 0 } }
  const player = { control: true, feet: new Vector3(), size: 'normal', p: { scale: 1 } }
  const cast = Object.fromEntries(['hatter', 'hare', 'dormouse'].map(name => [name, {
    object: { position: new Vector3() }, seated: true, anim: { actions: {} },
  }]))
  let active = false
  const imports = {
    'three/webgpu': { Vector3 },
    './cast.js': { cast, changeSeats() {} },
    './player.js': { player },
    './audio.js': {
      say(id) {
        calls.push(id)
        active = true
        return new Promise(resolve => pending.push(finished => { active = false; resolve(finished) }))
      },
      currentLine: () => null,
      speaking: () => active,
    },
    './gaze.js': { lookAt() {}, headOf() {} },
    './layout.js': { zones: { table: { pos: [0, 0], r: 5 } } },
    './state.js': { game: { gears: 0 } },
    './speakers.json': { default: speakers },
  }
  const module = new SourceTextModule(source, { context })
  await module.link(specifier => {
    const values = imports[specifier]
    return new SyntheticModule(Object.keys(values), function () {
      for (const [name, value] of Object.entries(values)) this.setExport(name, value)
    }, { context })
  })
  await module.evaluate()
  const flush = async () => { for (let i = 0; i < 8; i++) await Promise.resolve() }
  return {
    ...module.namespace, player, calls,
    async finish(value = true) { pending.shift()(value); await flush() },
    async pause() { pauses.shift()?.(); await flush() },
  }
}

test('events wait until the player leaves a scripted interaction', async () => {
  const s = await scheduler()
  s.player.control = false
  s.event('shrink')
  s.updateBanter(60)
  assert.deepEqual(s.calls, [])
  s.player.control = true
  s.updateBanter(0)
  assert.deepEqual(s.calls, ['BK-10'])
})

test('ordinary exploration still plays every line of an exchange', async () => {
  const s = await scheduler()
  s.event('shrink')
  await s.finish()
  await s.pause()
  assert.deepEqual(s.calls, ['BK-10', 'BK-11'])
})

test('a settled seated player can hear an entire exchange without movement control', async () => {
  const s=await scheduler()
  s.player.control=false
  s.banter.seated=true
  s.event('shrink')
  assert.deepEqual(s.calls,['BK-10'])
  await s.finish();await s.pause()
  assert.deepEqual(s.calls,['BK-10','BK-11'])
})

test('an interrupted voice does not resume its exchange over scripted dialogue', async () => {
  const s = await scheduler()
  s.event('shrink')
  await s.finish(false)
  await s.pause()
  assert.deepEqual(s.calls, ['BK-10'])
})

test('a cutscene starting between lines stops the rest of the exchange', async () => {
  const s = await scheduler()
  s.event('shrink')
  await s.finish()
  s.player.control = false
  await s.pause()
  assert.deepEqual(s.calls, ['BK-10'])
})

test('a queued reaction waits through a cutscene and resumes in exploration', async () => {
  const s = await scheduler()
  s.event('shrink')
  s.event('grow')
  s.player.control = false
  await s.finish()
  await s.pause()
  assert.deepEqual(s.calls, ['BK-10'])
  s.player.control = true
  s.updateBanter(0)
  assert.deepEqual(s.calls, ['BK-10', 'BK-12'])
})
