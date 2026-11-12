import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createRhythm } from '../src/rhythm.js'
import { tween, updateTweens } from '../src/tweens.js'

test('one note cannot score twice and an extra tap breaks the streak', () => {
  const game = createRhythm([1, 2, 3])
  assert.equal(game.tap(1), true)
  assert.equal(game.tap(1.01), false)
  assert.equal(game.stats.hits, 1)
  assert.equal(game.stats.combo, 0)
  assert.equal(game.tap(2), true)
  game.update(3.2)
  assert.equal(game.stats.combo, 0)
  assert.equal(game.stats.misses, 2)
})

test('blind rapid taps earn less garden movement than following the notes', () => {
  const notes = Array.from({ length: 40 }, (_, i) => 1 + i * 1.11)
  const accurate = createRhythm(notes), spam = createRhythm(notes)
  for (const note of notes) { accurate.update(note); accurate.tap(note) }
  for (let time = 0; time < 45; time += 0.277) { spam.update(time); spam.tap(time) }
  assert.equal(accurate.strength(), 1)
  assert.ok(spam.strength() < 0.3)
})

test('the cup lights 0.15 s early, a tap scores only within 0.12 s, and the cue closes once hit', () => {
  const rhythm = createRhythm([1, 2])
  assert.equal(rhythm.cue(0.7).open, false)
  assert.equal(rhythm.cue(0.8).open, true)
  assert.equal(rhythm.cue(0.8).scoring, false)
  assert.equal(rhythm.tap(0.8), null)
  assert.equal(rhythm.cue(0.9).scoring, true)
  assert.equal(rhythm.tap(0.9), true)
  assert.equal(rhythm.cue(0.93).open, false)
  assert.equal(rhythm.cue(2.1).scoring, true)
  assert.equal(rhythm.tap(2.1), true)
  assert.equal(rhythm.cue(2.2).open, false)
})

test('a failed animation rejects once while other animations continue', async () => {
  const failed = tween(1, () => { throw new Error('broken contact') })
  let completed = false
  const good = tween(1, () => { completed = true })
  updateTweens(1)
  await assert.rejects(failed, /broken contact/)
  await good
  assert.equal(completed, true)
  updateTweens(1)
})
