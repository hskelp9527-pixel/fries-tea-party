import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'
import { createContext, SourceTextModule } from 'node:vm'
const source = await readFile(new URL('../src/quality.js', import.meta.url), 'utf8')
async function settings() {
  const module = new SourceTextModule(source, { context: createContext({ URLSearchParams,
    location: { search: '' }, document: { hidden: false }, localStorage: { getItem: () => null, setItem() {} } }) })
  await module.link(() => {})
  await module.evaluate()
  return module.namespace
}
test('automatic quality reaches low in bounded time even at ten frames per second', async () => {
  const s = await settings()
  for (let frame = 0; frame < 160; frame++) s.updateQuality(100)
  assert.equal(s.quality.level, 'low')
})
test('manual quality and brief stalls do not change the chosen preset', async () => {
  const s = await settings()
  for (let frame = 0; frame < 30; frame++) s.updateQuality(100)
  s.updateQuality(250)
  for (let frame = 0; frame < 100; frame++) s.updateQuality(16)
  assert.equal(s.quality.level, 'high')
  s.setQuality('high')
  for (let frame = 0; frame < 100; frame++) s.updateQuality(100)
  assert.equal(s.quality.level, 'high')
})
