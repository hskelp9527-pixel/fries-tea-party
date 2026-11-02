// Progress shared by the systems that react to it.
export const game = {
  gears: 0, // gears found
  pulse: 0, // 1 on each beat of the song, decaying to 0
  pass: -1, // which pass of the song is playing, -1 when none
  hop: null, // in the final chorus: { beat, phase } with phase going 0 to 1 until the next beat
}

// A prop's hop on the current beat of the final chorus: a bounce plus a small irregular offset up, down, left
// or right and a little spin, different for every prop (`seed`) and beat and scaled to the prop's `size`,
// easing out and back within the beat. A prop `resting` on the table never goes below it. Fills `offset` and
// returns the spin in radians; both are zero outside the chorus.
export function hop(seed, size, offset, resting) {
  offset.set(0, 0, 0)
  if (!game.hop) return 0
  const { beat, phase } = game.hop
  const r = k => {
    const x = Math.sin(seed * 127.1 + beat * 311.7 + k * 74.7) * 43758.5453
    return x - Math.floor(x)
  }
  const ease = Math.sin(Math.PI * phase), nudge = size * (0.05 + 0.08 * r(1)) * ease, way = Math.floor(r(2) * 4)
  offset.y = size * 0.2 * ease
  if (way === 0) offset.y += nudge
  else if (way === 1) offset.y -= resting ? Math.min(nudge, offset.y) : nudge
  else {
    const a = r(3) * Math.PI * 2 + way
    offset.x = Math.cos(a) * nudge
    offset.z = Math.sin(a) * nudge
  }
  return (r(4) - 0.5) * 0.6 * ease
}
