import { player } from './player.js'
import { setMusic } from './audio.js'

// Starts the chapter. `from` (the ?start= parameter) skips ahead for testing.
export function begin(from) {
  explore()
}

function explore() {
  player.control = true
  player.cinematic = false
  setMusic({ frozen: 1, awake: 0 })
}

export function updateStory(dt) {
}
