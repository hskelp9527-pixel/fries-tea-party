import { paths, meadow } from './layout.js'

// The shared fields of the garden. The ground's colour, where grass grows and how lush it is, where flowers bloom
// and which, and the height of the land beyond the garden all come from these, so they agree with one another.
// Every field is deterministic: the same garden on every load.

// Smooth value noise in [0, 1], one cell per unit.
function hash(x, z) {
  const h = Math.sin(x * 127.1 + z * 311.7) * 43758.5453
  return h - Math.floor(h)
}
export function noise(x, z) {
  const ix = Math.floor(x), iz = Math.floor(z), fx = x - ix, fz = z - iz
  const u = fx * fx * (3 - 2 * fx), v = fz * fz * (3 - 2 * fz)
  const a = hash(ix, iz), b = hash(ix + 1, iz), c = hash(ix, iz + 1), d = hash(ix + 1, iz + 1)
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v
}

// A seeded random sequence, for placement.
export function random(seed) {
  let s = seed >>> 0
  return () => {
    s = (s + 0x6d2b79f5) >>> 0
    let t = Math.imul(s ^ (s >>> 15), s | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// Distance on the ground to the nearest path's centre line.
const segments = paths.flatMap(line => line.slice(1).map((p, i) => [line[i], p]))
export function pathDistance(x, z) {
  let best = Infinity
  for (const [[ax, az], [bx, bz]] of segments) {
    const dx = bx - ax, dz = bz - az, t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz)))
    best = Math.min(best, Math.hypot(x - ax - dx * t, z - az - dz * t))
  }
  return best
}

// Inside one of the areas where nothing grows: paving, the basin, the trunk, under the table.
export const bare = (x, z) => meadow.bare.some(([a, b, c, d]) => x > a && x < c && z > b && z < d)

// How lush the lawn is: broad warped patches of deeper, longer grass and drier, shorter grass, in [0, 1].
export function lush(x, z) {
  const wx = x + 6 * noise(x * 0.05 + 3, z * 0.05), wz = z + 6 * noise(x * 0.05, z * 0.05 + 7)
  return Math.min(1, Math.max(0, 0.15 + 0.75 * noise(wx * 0.09, wz * 0.09) + 0.25 * noise(wx * 0.4, wz * 0.4) - 0.12))
}

// How thickly flowers bloom, in [0, 1]: bands either side of the paths, the drifts in `meadow.drifts`, and loose
// warped patches across the lawn; nothing on the paths or the bare areas.
export function bloom(x, z) {
  if (bare(x, z)) return 0
  const d = pathDistance(x, z)
  if (d < meadow.pathWidth / 2) return 0
  const edge = Math.exp(-(((d - meadow.pathWidth / 2 - 0.9) / 0.7) ** 2))
  let drift = 0
  for (const [dx, dz, r] of meadow.drifts) drift = Math.max(drift, Math.exp(-((Math.hypot(x - dx, z - dz) / r) ** 2)))
  const patches = Math.max(0, noise(x * 0.16 + 11, z * 0.16) * 1.6 - 0.9)
  return Math.min(1, Math.max(edge * 0.8, drift, patches) * (0.7 + 0.3 * noise(x * 0.7, z * 0.7)))
}

// Which flowers grow here: a slowly changing value in [0, 1] that picks from a palette, so each drift has its own.
export const species = (x, z) => noise(x * 0.11 + 40, z * 0.11 - 13)

// The land: flat over the garden, falling away past the brow into a valley, with layered hills rising beyond.
export function ground(x, z) {
  const [x0, z0, x1, z1] = meadow.plateau
  const out = Math.hypot(Math.max(x0 - x, 0, x - x1), Math.max(z0 - z, 0, z - z1))
  const fall = -9 * Math.min(1, out / 22) ** 1.6
  const far = Math.hypot(x, z)
  const hills = (6 + 30 * noise(x * 0.012 + 5, z * 0.012) + 9 * noise(x * 0.04, z * 0.04 + 9)) * Math.min(1, Math.max(0, (far - 55) / 70)) ** 1.3
  return fall + hills
}
