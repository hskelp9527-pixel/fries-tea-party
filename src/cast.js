import { Animator } from './animation.js'
import { things } from './garden.js'
import { currentSpeaker } from './audio.js'
import { game } from './state.js'

// The Hatter, the March Hare and the Dormouse: idle, talking while one of their own lines plays, and dancing
// in the second and third passes of the song.
const cast = ['hatter', 'hare', 'dormouse'].map(name => ({ name, anim: new Animator(things[name], name) }))

export function updateCast(dt) {
  for (const { name, anim } of cast) {
    if (game.pass >= 1) anim.play(game.pass === 1 ? 'dance_swing' : 'dance_silly')
    else anim.play(currentSpeaker() === name ? 'talk' : 'idle')
    anim.mixer.update(dt)
  }
}
