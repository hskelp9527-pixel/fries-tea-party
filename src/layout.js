// The garden: every position in the chapter lives in this file.
// Metres, +Y up. The long table runs north (-Z) to south (+Z) under the big tree; the fountain is 18 m east of it
// and the March Hare's cottage 30 m away high at the back right, on terraces; the overlook meadow lies east of the
// fountain. `rot` is a turn about +Y in degrees; every model faces +Z before it is turned.

// Placeholder shapes, one per model name. Each box is [x, y, z, width, height, depth, colour] in the model's
// own frame (y is the box centre), optionally followed by a turn [rx, ry, rz] in degrees (applied Y, then X,
// then Z). They are drawn when art/models/<name>.glb is missing, and they are the model's colliders unless
// its glb contains a mesh named <name>_collider.
const BARK = 0x6b4a32, LEAF = 0x4f7d3c, LEAF2 = 0x5d8f45, HEDGE = 0x3f6b35, DOOR = 0x5a3a26, BRASS = 0xd9a441
const CLOTH = 0xf4efe6, FRINGE = 0xe6d6bd, WOOD = 0x7a5536, PLANK = 0x9b7a55, CHAIR = 0x9b3b3b
const STONE = 0xaaa59b, SYRUP = 0xc98a2b, WALL = 0xe8dcc4, ROOF = 0x8a4b3a, BRICK = 0xa0503c, GLASS = 0x9fc3d6
const CHINA = 0xf6f6f2, PINK = 0xf29bc0, BLUE = 0x7fb0f0, SILVER = 0xc8c8cc, PATH = 0xbdb4a2
const SKIN = 0xf1c9a5, NOSE = 0xe0a080, COAT = 0x6a4a8c, TROUSERS = 0x4a5a3a, HAT = 0x3c4a3a, HATBAND = 0xc23b4a
const FUR = 0xc8a27a, HARE_COAT = 0x3f6f8f, MOUSE = 0x8a6a52, SHIRT = 0xf2c230, JEANS = 0x35507a, HAIR = 0x5a3a20
const ROSE = 0xd0182c, GLOW = 0xfff2e0, BLACK = 0x222222, WALLSTONE = 0x9d9283, LANTERN = 0xffc070
const FENCE = 0xd8c8a8, ARCH = 0xf0ece0, BLOSSOM = 0xf6d6e2, BLOSSOM2 = 0xfff6ee, SOIL = 0x6e5038
const FLOWERS = [0xe88ab0, 0xf2d04a, 0xffffff, 0xb08ae0, 0xf6a86a], CYPRESS = 0x2c4630

// A box along a line from one point to another, `t` thick: one segment of a branch.
const limb = ([x0, y0, z0], [x1, y1, z1], t, colour) => {
  const dx = x1 - x0, dy = y1 - y0, dz = z1 - z0, length = Math.hypot(dx, dy, dz)
  return [(x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2, t, t, length + t / 2, colour, -Math.asin(dy / length) * 180 / Math.PI, Math.atan2(dx, dz) * 180 / Math.PI, 0]
}
// A branch through several points, thinning from `t0` to `t1`.
const branch = (points, t0, t1) => points.slice(1).map((p, i) => limb(points[i], p, t0 + (t1 - t0) * i / (points.length - 2), BARK))

const teapot = colour => [
  [0, 0.09, 0, 0.2, 0.18, 0.18, colour],
  [0, 0.2, 0, 0.08, 0.04, 0.08, colour],
  [0.14, 0.12, 0, 0.1, 0.03, 0.03, colour],
  [-0.12, 0.1, 0, 0.03, 0.1, 0.03, colour],
]

// 8.57 m long along its x, top at 0.76 m; the cloth hangs to 0.35 m, so only a small Fries gets under it
const longTable = [
  [0, 0.74, 0, 8.57, 0.04, 2.27, CLOTH],
  [0, 0.545, -1.125, 8.57, 0.39, 0.02, FRINGE],
  [0, 0.545, 1.125, 8.57, 0.39, 0.02, FRINGE],
  [-4.275, 0.545, 0, 0.02, 0.39, 2.27, FRINGE],
  [4.275, 0.545, 0, 0.02, 0.39, 2.27, FRINGE],
  [-4.1, 0.36, -1, 0.08, 0.72, 0.08, WOOD],
  [-4.1, 0.36, 1, 0.08, 0.72, 0.08, WOOD],
  [4.1, 0.36, -1, 0.08, 0.72, 0.08, WOOD],
  [4.1, 0.36, 1, 0.08, 0.72, 0.08, WOOD],
]

export const shapes = {
  big_tree: [ // a thick hollow trunk at the head of the table; the door in its base is up three steps
    [0, 3, -1.55, 3.6, 6, 0.5, BARK],
    [-1.55, 3, 0, 0.5, 6, 2.6, BARK],
    [1.55, 3, 0, 0.5, 6, 2.6, BARK],
    [-1.15, 3, 1.55, 1.3, 6, 0.5, BARK],
    [1.15, 3, 1.55, 1.3, 6, 0.5, BARK],
    [0, 4.225, 1.55, 1, 3.55, 0.5, BARK],
    [0, 0.225, 1.55, 1, 0.45, 0.5, BARK], // threshold
    [0, 0.225, 0, 2.6, 0.45, 2.6, BARK], // floor of the hollow
    [0, 5.9, 0, 2.6, 0.2, 2.6, BARK],
    [0, 0.15, 1.95, 1.6, 0.3, 0.3, STONE], // steps up to the door
    [0, 0.075, 2.25, 1.6, 0.15, 0.3, STONE],
    [-2.3, 0.3, 0.6, 1.2, 0.6, 1.6, BARK], // roots
    [2.3, 0.3, -0.4, 1.2, 0.6, 1.8, BARK],
    [-0.9, 0.25, -2.3, 1.4, 0.5, 1, BARK],
    // five huge branches arching over the whole long table (which runs from z 3.5 to 13.5 here)
    ...branch([[-0.9, 4, 1], [-2.6, 5.9, 5.5], [-3.3, 5.6, 10.5], [-3, 5, 14.5]], 0.8, 0.45),
    ...branch([[0.9, 4, 1], [2.7, 6.1, 5], [3.4, 5.8, 10], [3.1, 5.2, 14]], 0.8, 0.45),
    ...branch([[0, 4.6, 1.2], [0.3, 7, 6.5], [-0.2, 6.6, 12]], 0.7, 0.45),
    ...branch([[-1.2, 3.8, -0.2], [-4.8, 5.4, 1.2], [-7, 5.2, 3.8]], 0.7, 0.45),
    ...branch([[1.2, 3.8, -0.2], [4.8, 5.6, 0.8], [6.6, 5, 4.2]], 0.7, 0.45),
    // leaf clumps from about 4 m up, kept clear of the space over the terrace steps
    [-3, 6.4, 8, 3.6, 1.8, 4, LEAF],
    [3.2, 6.6, 7.5, 3.6, 1.8, 4, LEAF2],
    [0, 7.6, 9, 3, 1.6, 4, LEAF],
    [-2.4, 5, 12.5, 2.8, 1.6, 3.6, LEAF2],
    [3.2, 5, 12, 3.2, 1.6, 3.6, LEAF],
    [0, 7, 13.5, 3, 1.4, 3, LEAF2],
    [0.4, 7.4, 4.5, 3.6, 1.8, 3.6, LEAF],
    [0, 7.6, 0, 6, 2.6, 6, LEAF2],
    [-5.2, 6.2, 1.8, 3.4, 1.6, 3.4, LEAF],
    [5.2, 6.4, 1.4, 3.4, 1.6, 3.4, LEAF2],
    [-7, 5.9, 3.8, 2.6, 1.4, 2.6, LEAF2],
    [6.6, 5.7, 4.2, 2.6, 1.4, 2.6, LEAF],
  ],
  tree_door: [ // pivots on its hinge, at the threshold
    [0.5, 1, 0, 1, 2, 0.08, DOOR],
    [0.85, 1, 0.06, 0.08, 0.08, 0.06, BRASS],
  ],
  long_table: longTable,
  long_table_dressed: longTable,
  armchair: [ // seat at 0.48 m
    [0, 0.24, 0, 0.75, 0.48, 0.7, CHAIR],
    [0, 0.85, -0.3, 0.75, 0.9, 0.12, CHAIR],
    [-0.33, 0.6, 0.02, 0.1, 0.3, 0.66, CHAIR],
    [0.33, 0.6, 0.02, 0.1, 0.3, 0.66, CHAIR],
  ],
  hatter: [ // seated
    [0, 0.78, -0.08, 0.52, 0.66, 0.36, COAT],
    [0, 0.52, 0.18, 0.46, 0.18, 0.5, TROUSERS],
    [0, 0.26, 0.42, 0.4, 0.52, 0.16, TROUSERS],
    [0, 1.28, -0.06, 0.34, 0.36, 0.34, SKIN],
    [0, 1.26, 0.13, 0.07, 0.08, 0.06, NOSE],
    [0, 1.48, -0.06, 0.52, 0.04, 0.52, HAT],
    [0, 1.72, -0.06, 0.38, 0.46, 0.38, HAT],
    [0, 1.56, -0.06, 0.39, 0.08, 0.39, HATBAND],
  ],
  hare: [ // seated
    [0, 0.74, -0.08, 0.48, 0.6, 0.36, HARE_COAT],
    [0, 0.52, 0.18, 0.42, 0.18, 0.5, FUR],
    [0, 0.26, 0.42, 0.36, 0.52, 0.16, FUR],
    [0, 1.2, -0.04, 0.32, 0.32, 0.34, FUR],
    [0, 1.18, 0.14, 0.06, 0.06, 0.06, PINK],
    [-0.09, 1.56, -0.06, 0.08, 0.44, 0.06, FUR],
    [0.09, 1.56, -0.06, 0.08, 0.44, 0.06, FUR],
  ],
  dormouse: [ // curled up asleep
    [0, 0.05, 0, 0.14, 0.1, 0.2, MOUSE],
    [0, 0.06, 0.12, 0.09, 0.08, 0.08, MOUSE],
    [-0.03, 0.11, 0.1, 0.03, 0.04, 0.02, MOUSE],
    [0.03, 0.11, 0.1, 0.03, 0.04, 0.02, MOUSE],
    [0, 0.02, -0.16, 0.02, 0.02, 0.14, MOUSE],
  ],
  fries: [ // 1.2 m tall
    [-0.08, 0.26, 0, 0.12, 0.52, 0.14, JEANS],
    [0.08, 0.26, 0, 0.12, 0.52, 0.14, JEANS],
    [0, 0.74, 0, 0.36, 0.46, 0.22, SHIRT],
    [-0.23, 0.74, 0, 0.09, 0.42, 0.1, SHIRT],
    [0.23, 0.74, 0, 0.09, 0.42, 0.1, SHIRT],
    [0, 1.07, 0, 0.28, 0.28, 0.26, SKIN],
    [0, 1.06, 0.14, 0.05, 0.05, 0.04, NOSE],
    [0, 1.2, -0.01, 0.3, 0.06, 0.28, HAIR],
  ],
  fountain: [ // a round basin 2.8 m across with its floor 0.42 m up over a hollow, a small arch into it at the foot
    // of its +X wall, and a column of tiers
    [0, 0.25, -1.3, 2.8, 0.5, 0.2, STONE],
    [0, 0.25, 1.3, 2.8, 0.5, 0.2, STONE],
    [-1.3, 0.25, 0, 0.2, 0.5, 2.4, STONE],
    [1.3, 0.25, -0.7, 0.2, 0.5, 1, STONE],
    [1.3, 0.25, 0.7, 0.2, 0.5, 1, STONE],
    [1.3, 0.4, 0, 0.2, 0.2, 0.4, STONE],
    [0, 0.44, 0, 2.4, 0.04, 2.4, STONE],
    [0, 0.47, 0, 2.4, 0.02, 2.4, SYRUP],
    [0, 1.4, 0, 0.3, 1.9, 0.3, STONE],
    [0, 1.6, 0, 1.2, 0.12, 1.2, STONE],
    [0, 2.4, 0, 0.7, 0.12, 0.7, STONE],
  ],
  porch: [[0, 1.2, 0, 3.4, 2.4, 2.6, STONE]], // the cottage's high stone porch, 3.4 x 2.6 m and 2.4 m above the top terrace
  house: [ // the March Hare's cottage, its door at the top of three steps, 1.1 m up
    [0, 1.5, 0, 6, 3, 5, WALL],
    [0, 3.25, 0, 6.6, 0.5, 5.6, ROOF],
    [0, 3.75, 0, 5.4, 0.5, 4.2, ROOF],
    [0, 4.25, 0, 4, 0.5, 2.6, ROOF],
    [0, 4.7, 0, 2.6, 0.4, 1, ROOF],
    [1.8, 4.6, -1, 0.6, 1.8, 0.6, BRICK],
    [-1.9, 1.7, 2.52, 0.9, 0.8, 0.06, GLASS],
    [1.9, 1.7, 2.52, 0.9, 0.8, 0.06, GLASS],
    [0, 0.2, 3.5, 6, 0.4, 2, PLANK], // porch, step and railings
    [0, 0.1, 4.75, 1.4, 0.2, 0.5, PLANK],
    [-1.875, 0.85, 4.46, 2.25, 0.9, 0.08, PLANK],
    [2.275, 0.85, 4.46, 1.45, 0.9, 0.08, PLANK], // stops short of the hat rack
    [-2.96, 0.85, 3.5, 0.08, 0.9, 2, PLANK],
    [2.96, 0.85, 3.5, 0.08, 0.9, 2, PLANK],
  ],
  hat_rack: [ // three hats on its pegs; the top hat's crown is at 2 m
    [0, 0.04, 0, 0.3, 0.08, 0.3, WOOD],
    [0, 0.9, 0, 0.08, 1.8, 0.08, WOOD],
    [0, 1.9, -0.2, 0.3, 0.2, 0.3, HAT],
  ],
  hat: [
    [0, 0.015, 0, 0.42, 0.03, 0.42, HAT],
    [0, 0.17, 0, 0.28, 0.3, 0.28, HAT],
    [0, 0.07, 0.142, 0.14, 0.06, 0.01, HATBAND], // the band shows which way the hat is looking
  ],
  teacup: [
    [0, 0.005, 0, 0.13, 0.01, 0.13, CHINA],
    [0, 0.045, 0, 0.08, 0.07, 0.08, CHINA],
    [0.05, 0.05, 0, 0.02, 0.04, 0.01, CHINA],
  ],
  plate: [[0, 0.005, 0, 0.24, 0.01, 0.24, CHINA]],
  teapot: teapot(CHINA),
  spoon: [
    [0, 0.005, 0, 0.02, 0.01, 0.14, SILVER],
    [0, 0.01, 0.085, 0.045, 0.015, 0.06, SILVER],
  ],
  pink_teacup: [
    ...[[0, 0.005, 0, 0.13, 0.01, 0.13, CHINA], [0, 0.045, 0, 0.08, 0.07, 0.08, CHINA], [0.05, 0.05, 0, 0.02, 0.04, 0.01, CHINA]],
    [0, 0.077, 0, 0.066, 0.006, 0.066, PINK],
  ],
  blue_teacup: [
    ...[[0, 0.005, 0, 0.13, 0.01, 0.13, CHINA], [0, 0.045, 0, 0.08, 0.07, 0.08, CHINA], [0.05, 0.05, 0, 0.02, 0.04, 0.01, CHINA]],
    [0, 0.077, 0, 0.066, 0.006, 0.066, BLUE],
  ],
  pink_teapot: teapot(PINK),
  blue_teapot: teapot(BLUE),
  tea_tray: [[0, 0.01, 0, 0.5, 0.02, 0.9, SILVER]],
  cake: [ // a small "eat me" cake on a plate, small enough for a small Fries's hand
    [0, 0.005, 0, 0.1, 0.01, 0.1, CHINA],
    [0, 0.023, 0, 0.04, 0.025, 0.03, 0xe8c08a],
    [0, 0.038, 0, 0.04, 0.005, 0.03, 0xfff0f4],
    [0, 0.045, 0, 0.01, 0.01, 0.01, ROSE],
  ],
  cake_stand: [
    [0, 0.14, 0, 0.04, 0.28, 0.04, SILVER],
    [0, 0.04, 0, 0.36, 0.02, 0.36, CHINA],
    [0, 0.15, 0, 0.28, 0.02, 0.28, CHINA],
    [0, 0.26, 0, 0.2, 0.02, 0.2, CHINA],
    [0.08, 0.08, 0.05, 0.08, 0.06, 0.06, 0xe8c08a],
    [-0.06, 0.19, -0.03, 0.07, 0.06, 0.06, 0xf2a0b8],
  ],
  pocket_watch: [
    [0, 0.015, 0, 0.14, 0.03, 0.14, BRASS],
    [0, 0.08, -0.07, 0.14, 0.14, 0.01, BRASS],
    [0, 0.04, 0.085, 0.04, 0.04, 0.03, BRASS],
  ],
  book_page: [[0, 0.034, 0, 0.08, 0.004, 0.1, GLOW]],
  butter: [[0, 0.02, 0, 0.12, 0.04, 0.07, 0xf6dc6a]],
  gear: [ // a 6 cm watch gear lying flat
    [0, 0, 0, 0.05, 0.012, 0.05, BRASS],
    [0, 0, 0, 0.064, 0.008, 0.014, BRASS],
    [0, 0, 0, 0.014, 0.008, 0.064, BRASS],
  ],
  hanging_clock: [ // 0.7 m with its ring; the face's centre is 0.26 m up
    [0, 0.26, 0, 0.34, 0.34, 0.1, BRASS],
    [0, 0.26, 0.05, 0.28, 0.28, 0.01, CHINA],
    [0, 0.6, 0, 0.04, 0.2, 0.04, BRASS],
  ],
  lantern: [ // 0.4 m with its ring
    [0, 0.15, 0, 0.2, 0.3, 0.2, LANTERN],
    [0, 0.33, 0, 0.26, 0.06, 0.26, LANTERN],
  ],
  clock_hand: [[0, 0.075, 0, 0.02, 0.21, 0.008, BLACK]], // pivots at the clock centre, points up
  fence_picket: [ // 1.5 m of picket fence along its x
    [0, 0.3, 0, 1.5, 0.06, 0.05, FENCE],
    [0, 0.62, 0, 1.5, 0.06, 0.05, FENCE],
    ...[-0.6, -0.3, 0, 0.3, 0.6].map(x => [x, 0.4, 0.03, 0.08, 0.8, 0.03, FENCE]),
  ],
  fence_broken: [
    [-0.4, 0.3, 0, 0.7, 0.06, 0.05, FENCE],
    ...[-0.6, -0.3, 0.6].map(x => [x, 0.4, 0.03, 0.08, 0.8, 0.03, FENCE]),
  ],
  wall_stone: [[0, 0.3, 0, 2, 0.6, 0.36, WALLSTONE]], // 2 m of dry-stone wall along its x
  wall_cap_flowers: [[0, 0.1, 0, 2, 0.2, 0.36, LEAF]], // sits on a wall
  steps_stone: [ // three 0.2 m steps rising towards -Z, 1.4 m wide
    [0, 0.1, 0, 1.4, 0.2, 1.1, STONE],
    [0, 0.3, -0.18, 1.4, 0.2, 0.74, STONE],
    [0, 0.5, -0.37, 1.4, 0.2, 0.36, STONE],
  ],
  heart_arch: [
    [-0.9, 1.3, 0, 0.12, 2.6, 0.12, ARCH],
    [0.9, 1.3, 0, 0.12, 2.6, 0.12, ARCH],
    [0, 2.5, 0, 1.9, 0.14, 0.14, ROSE],
  ],
  candle: [[0, 0.1, 0, 0.05, 0.2, 0.05, CHINA], [0, 0.22, 0, 0.015, 0.04, 0.015, LANTERN]],
  candelabra: [[0, 0.2, 0, 0.26, 0.4, 0.06, BRASS]],
  milk_jug: [[0, 0.055, 0, 0.1, 0.11, 0.07, CHINA]],
  rose_arch: [ // an arch over the path; its climbers are pale, since red roses appear only in the final shot
    [-0.85, 1.3, 0, 0.12, 2.6, 0.12, ARCH],
    [0.85, 1.3, 0, 0.12, 2.6, 0.12, ARCH],
    [-0.45, 2.78, 0, 1.05, 0.12, 0.14, ARCH, 0, 0, 25],
    [0.45, 2.78, 0, 1.05, 0.12, 0.14, ARCH, 0, 0, -25],
    [-0.85, 1, 0, 0.22, 0.4, 0.22, BLOSSOM],
    [-0.85, 1.8, 0.05, 0.2, 0.35, 0.2, BLOSSOM2],
    [0.85, 1.3, -0.05, 0.22, 0.4, 0.22, BLOSSOM2],
    [0.85, 2.1, 0, 0.2, 0.3, 0.2, BLOSSOM],
    [-0.35, 2.95, 0, 0.3, 0.2, 0.25, BLOSSOM],
    [0.35, 2.95, 0, 0.3, 0.2, 0.25, BLOSSOM2],
    [0, 3.1, 0, 0.25, 0.2, 0.25, BLOSSOM],
  ],
  flagstone_a: [[0, 0.03, 0, 0.44, 0.06, 0.38, PATH]],
  flagstone_b: [[0, 0.03, 0, 0.5, 0.06, 0.44, PATH]],
  flagstone_c: [[0, 0.03, 0, 0.58, 0.06, 0.48, PATH]],
  flagstone_d: [[0, 0.03, 0, 0.64, 0.06, 0.52, PATH]],
}

// Fries's starting place, at the south end of the long table, facing north up it at the hosts.
export const start = { pos: [0, 0, 3.6], rot: 180 }

// Copies of a model laid end to end from one [x, z] point to another at height `y`; the model's length runs along
// its x.
const row = (model, [x0, z0], [x1, z1], length, y = 0, extra = {}) => {
  const n = Math.max(1, Math.round(Math.hypot(x1 - x0, z1 - z0) / length))
  const rot = Math.atan2(z0 - z1, x1 - x0) * 180 / Math.PI
  return Array.from({ length: n }, (_, i) => ({ model, pos: [x0 + (x1 - x0) * (i + 0.5) / n, y, z0 + (z1 - z0) * (i + 0.5) / n], rot, ...extra }))
}
// A flowered dry-stone wall along a line, `courses` walls high, its foot at `y`.
const wall = (from, to, y, courses = 1) => [
  ...Array.from({ length: courses }, (_, k) => row('wall_stone', from, to, 2, y + 0.6 * k)).flat(),
  ...row('wall_cap_flowers', from, to, 2, y + 0.6 * courses, { solid: false }),
]

// Flagstones along a path's centre line, about `spacing` apart, the four shapes in turn, set a little to either
// side. They are 6 cm thick and sunk 5 cm into the flat ground, so their tops stand 1 cm proud.
const stones = (line, spacing) => line.slice(1).flatMap(([x1, z1], i) => {
  const [x0, z0] = line[i], n = Math.max(1, Math.round(Math.hypot(x1 - x0, z1 - z0) / spacing))
  const across = [(z0 - z1) / Math.hypot(x1 - x0, z1 - z0), (x1 - x0) / Math.hypot(x1 - x0, z1 - z0)]
  return Array.from({ length: n }, (_, k) => {
    const j = i * 7 + k, side = ((j * 53 % 7) / 7 - 0.5) * 0.25
    return {
      model: `flagstone_${'abcd'[j % 4]}`, pos: [x0 + (x1 - x0) * k / n + across[0] * side, -0.05, z0 + (z1 - z0) * k / n + across[1] * side],
      rot: j * 37 % 90, solid: false,
    }
  })
})

// The paths, as centre lines of [x, z] points: up from the southern approach along the west side of the table
// to the door in the big tree; from the table's foot across the lawn to the fountain's plaza, and on from the
// plaza to the cottage's first flight of steps; a loop through the western garden; spurs to the south-west and
// south-east. Flowers grow in bands either side of them.
export const paths = [
  [[1, 27], [0.6, 20], [0, 14], [-0.5, 9], [-1.4, 5.6], [-2.7, 2.6], [-3.1, -1], [-3.2, -4.5], [-3.7, -7.6], [-4.9, -9.3], [-5.9, -9.8]],
  [[-2.7, 2.6], [0.4, 2.9], [4.5, 3.6], [9, 2.6], [13, 0.2], [15.4, -2.2]],
  [[0, 14], [3.5, 11.4], [7, 8.2], [9.4, 4.8], [9, 2.6]],
  [[16.2, -8.6], [14, -10.8], [11.6, -12.6], [10.05, -13.5]],
  [[-3.1, -1], [-8, 0.4], [-13, -1.6], [-17.5, -6], [-19.6, -11.5], [-16, -16], [-11, -14.6]],
  [[-0.5, 9], [-6, 12.5], [-12, 15.5], [-18, 17.5]],
  [[13, 0.2], [16, 6], [20, 11], [25, 14.5]],
]
// Paths worn into the grass without flagstones, where the ground climbs: from the plaza up the overlook.
export const trails = [[[22.6, -5.5], [26.5, -7], [30, -8.2]]]

// Every fixed object. `onTable` props dance on the table in the final chorus; `on` names the prop one stands on,
// which it rides with. `solid: false` leaves it without colliders, `boxes` makes its placeholder boxes its colliders
// (the step modules: their flower planters would block the steps), `hidden` keeps it out of the scene (only its
// colliders and its place in `things` count); `scale` is uniform.
export const placed = [
  { model: 'big_tree', pos: [-4.2, -0.6, -12.2], rot: -30 }, // sunk 0.6 m so its roots (lowest points 0.0-0.6 m above its foot) meet the soil; its long branches reach south-east over the head of the table; the tunnel through its roots runs north-north-east from the door
  { model: 'long_table_dressed', pos: [0, 0, -3.5], rot: 90, solid: false },
  { model: 'long_table', pos: [0, 0, -3.5], rot: 90, hidden: true }, // the dressed table collides as the plain one, so its crockery cannot make the top unwalkable
  { model: 'armchair', pos: [-1.55, 0, -6.8], rot: 90 },
  { model: 'hatter', pos: [-1.55, 0, -6.8], rot: 90, solid: false },
  { model: 'armchair', pos: [1.55, 0, -7.4], rot: -90 },
  { model: 'hare', pos: [1.55, 0, -7.4], rot: -90, solid: false },
  { model: 'armchair', pos: [-1.55, 0, -2.6], rot: 90 },
  { model: 'armchair', pos: [-1.55, 0, -0.4], rot: 90 },
  { model: 'armchair', pos: [1.55, 0, -4.6], rot: -90 },
  { model: 'armchair', pos: [1.55, 0, -2], rot: -90 },
  { model: 'armchair', pos: [1.55, 0, 0.4], rot: -90 },
  { model: 'plate', pos: [0.1, 0.76, -7.9], scale: 1.3, solid: false }, // the Dormouse's bed
  { model: 'dormouse', pos: [0.1, 0.785, -7.9], rot: -60, solid: false }, // on the plate's top
  { model: 'tea_tray', pos: [-0.45, 0.76, -5], solid: false, onTable: true },
  { model: 'pink_teapot', pos: [-0.45, 0.79, -5.25], rot: 180, solid: false, on: 'tea_tray' }, // spouts toward the teacups
  { model: 'blue_teapot', pos: [-0.45, 0.79, -4.75], rot: 180, solid: false, on: 'tea_tray' },
  { model: 'teapot', pos: [0.3, 0.76, -2.6], solid: false, onTable: true },
  { model: 'teapot', pos: [-0.2, 0.76, 0.2], rot: 180, solid: false, onTable: true },
  { model: 'pocket_watch', pos: [-0.5, 0.76, -6.75], rot: 90, solid: false, onTable: true },
  { model: 'book_page', pos: [-0.5, 0.76, -6.75], rot: 90, solid: false, on: 'pocket_watch' },
  { model: 'fountain', pos: [18.5, 0, -5], rot: 180 }, // on its plaza 18 m east of the table; its grotto opens west, towards the table
  // The cottage, 30 m from the table and high at the back right on its terraces (see `terraces`): flights of step
  // modules up each 0.6 m, staggered, and flowered retaining walls on the terraces' edges. Its high porch, 2.4 m
  // above the top terrace with no steps up, stands at the cottage's side and holds the hat rack with gear 3 on
  // its top hat.
  { model: 'steps_stone', pos: [10, 0, -14.45], boxes: true },
  { model: 'steps_stone', pos: [13, 0.6, -15.85], boxes: true },
  { model: 'steps_stone', pos: [14.6, 1.2, -17.25], boxes: true },
  ...wall([6, -15.1], [9.4, -15.1], 0), ...wall([10.7, -15.1], [34, -15.1], 0), ...wall([5.9, -15], [5.9, -38], 0),
  ...wall([9, -16.5], [12.3, -16.5], 0.6), ...wall([13.7, -16.5], [34, -16.5], 0.6), ...wall([8.9, -16.4], [8.9, -38], 0.6),
  ...wall([11.5, -17.9], [13.9, -17.9], 1.2), ...wall([15.3, -17.9], [32, -17.9], 1.2), ...wall([11.4, -17.8], [11.4, -38], 1.2),
  { model: 'house', pos: [21, 1.8, -27], rot: -20 }, // its door faces south-south-west, down the terraces to the table
  { model: 'porch', pos: [28.74, 1.8, -23.12], rot: -20 }, // beside the cottage, clear of its door and steps
  { model: 'hat_rack', pos: [28.47, 4.2, -22.37], rot: 180 },
  // Fences along the paths (one broken where the view from the flowers looks through to the table), arches at
  // the bends, low flowered walls, and the low walls and bushes that close the garden at the brow
  ...row('fence_picket', [-1.2, 9], [-2.3, 5], 1.5),
  ...row('fence_broken', [0.9, 9.2], [0.1, 6], 1.5),
  ...row('fence_picket', [-4.2, 2.2], [-4.5, -2.6], 1.5),
  ...row('fence_picket', [4.2, 12.2], [7.5, 9.2], 1.5),
  ...row('fence_picket', [5, 2.5], [8.6, 1.7], 1.5),
  ...row('fence_picket', [15.4, -7.8], [13.2, -10], 1.5),
  ...row('fence_picket', [-9, 1.8], [-12, 0.6], 1.5),
  ...row('fence_picket', [-14, 17.2], [-17, 18.8], 1.5),
  ...wall([8, -6.5], [11.5, -7.6], 0), ...wall([21, 14], [24, 17.5], 0),
  { model: 'rose_arch', pos: [-2.7, 0, 2.6], rot: -50 },
  { model: 'rose_arch', pos: [-3.7, 0, -7.6], rot: 15 },
  { model: 'rose_arch', pos: [7, 0, 8.2], rot: 138 },
  { model: 'rose_arch', pos: [9, 0, 2.6], rot: 112 },
  { model: 'rose_arch', pos: [14.5, 0, 3.1], rot: 27 },
  { model: 'rose_arch', pos: [12.8, 0, -11.7], rot: -127 },
  { model: 'rose_arch', pos: [24, 0.06, -5.9], rot: 111 },
  { model: 'rose_arch', pos: [-8, 0, 0.4], rot: -92 },
  { model: 'rose_arch', pos: [-18.6, 0, -9], rot: -160 },
  { model: 'rose_arch', pos: [-12, 0, 15.5], rot: -68 },
  ...wall([-34, 27], [-12, 27], 0), ...wall([12, 27], [34, 27], 0), ...wall([-35, 26], [-35, 6], 0),
  ...paths.flatMap(line => stones(line, 0.6)),
]

// Doors hang on a hinge at the bottom of their left edge: a node in the model they are set in, or a point in its
// frame, scaled to fill the opening. Positive angles swing them inwards.
export const doors = {
  cottage: { in: 'house', hinge: 'door_hinge', scale: [1.25, 0.97, 1] }, // fills the 1.62 x 1.92 m arch, so the lining behind it does not show round the edges
  // The trunk's arch, measured on the mesh (tree frame): 1.7 m wide (x -1.12 to 0.58) from the ground (y 0.6) to a rounded top at
  // y 3.4, the same width from z 0.9 back to z -1.2. The door model is 1.306 x 2.0 m, so 1.34 x 1.4 fills it, set into the mouth
  // at z 1.15. `recess` is the black backing behind it, past the open door's sweep: x range, y range, z.
  tree: { in: 'big_tree', hinge: [-1.14, 0.55, 1.15], scale: [1.34, 1.4, 1], recess: [[-1.6, 1], [0.5, 3.6], -1] },
}

// Behind the big tree, out through the tunnel in its roots: a path of red roses ending in a heart-shaped arch,
// hidden until the ending. [x, z] from the tunnel's far end to the arch.
export const rosePath = { from: [-3.4, -14.3], to: [2.6, -24.7], arch: [2.8, -25.1] }

// The terraces the cottage stands on, each [x0, z0, x1, z1, height]: lawn on top, retaining walls on the edges.
export const terraces = [
  [6, -38, 34, -15, 0.6],
  [9, -38, 34, -16.4, 1.2],
  [11.5, -38, 32, -17.8, 1.8],
]

// The fountain's round plaza, paving flush with the lawn: [x, z, radius].
export const plaza = [18.5, -5, 4.5]

// The overlook: a high meadow at the north-east edge, [x, z, radius, height], where a big Fries sees the whole
// garden.
export const overlook = [31, -8, 8, 3.5]

// Low hedges at the brow and round the western garden: [x0, z0, x1, z1] along the middle, height and thickness.
// Hedges and bushes are dense volumes of leaves, solid to walk into.
export const hedges = [
  [35, 24, 35, 1, 1.1, 0.9], [-35, -2, -35, -36, 1.1, 0.9], [-30, -37, -8, -37, 1.1, 0.9], [-23, -3, -23, -13, 1.6, 1], [-15, -19.5, -8, -19.5, 1.4, 0.9],
]

// Flower bushes, [x, z]. They sway and hum once the third layer wakes.
export const bushes = [
  [-7.5, 6], [-12, -5.5], [4.6, -9.6], [18, 4], [22.6, 8.4], [11.5, 16], [-14, 12], [-18, 20], [-26, 14], [16, 20],
  [27, 16], [-22, -14], [-14, -24], [-26, -28], [2, -30], [-30, 2], [33, 12], [-3, 22], [5, 24], [5.5, 6.2],
  [6, -0.8], [12, -6], [7, -5], [15.5, -12.6], [19, -13], [-5.5, 8], [-7, 2.5], [-11, 5.5], [-16.5, -12], [-21, -15],
  [-12, -9], [-2, 16], [2.5, 17], [10, 10], [13, 12], [19, 5], [-20, 3], [-24, -6], [-8, 21], [-16, 24], [8, 21],
  [20, 22], [30, 19], [30, 24], [-30, 10], [-29, -12], [-20, -20], [-10, -26], [-2, -28], [0, -34], [-26, -34],
  [-34, -18]
]

// The three gears, collectable in any order. Each wakes its own layer of the world.
// Props Fries takes in his hands. Each is for one size (`by`) and one clip; before the clip Fries walks to the
// `stand` point (his feet) and turns to face `rot`, so that his palm meets the prop at the contact time in
// docs/fries_hand_contacts.json: stand = prop - palm offset in the clip, turned to `rot` and scaled to his size
// (small 0.18, big 5). `grip` (metres at scale 1, in the hand bone's frame) sets the prop in the palm.

// Each gear rests at the pickup palm above the floor of its small route.
// Gear 3 meets the giant reach from the top terrace.
export const gears = [
  { // under the long table
    pos: [0.1, 0.022, -2.2], layer: 'tea', line: 'GR-01', hints: ['EX-01', 'EX-02', 'EX-03'],
    by: 'small', clip: 'pick_up', stand: [0.055, 0, -2.203], rot: 90, grip: [-0.004, -0.03, 0.072],
  },
  { // in the grotto under the fountain's basin
    pos: [18.2, 0.022, -5], layer: 'syrup', line: 'GR-02', hints: ['EX-04', 'EX-05', 'EX-06'],
    by: 'small', clip: 'pick_up', stand: [18.155, 0, -5.003], rot: 90, grip: [-0.004, -0.03, 0.072],
  },
  { // on the crown of the hat rack's top hat on the cottage's high porch, where a big Fries on the top terrace
    // reaches
    pos: [28.448, 6.206, -22.17], layer: 'flowers', line: 'GR-03', hints: ['EX-07', 'EX-08', 'EX-09'],
    by: 'big', clip: 'reach', stand: [28.113, 1.8, -20.125], rot: 180, grip: [0, 0.05, 0.007],
  },
]

// Things that change Fries's size into `becomes`. The drink clip holds them at his waist from its start, so
// each flies the short way into his left hand, goes to his mouth and flies back to its place at the end. A teacup
// is empty until the teapot `pot` pours `tea` into it. One that makes him big first walks him to `grow`, where a
// giant has room.
export const drinks = [
  {
    model: 'pink_teacup', pos: [-0.95, 0.76, -5.6], becomes: 'small', pot: 'pink_teapot', tea: 0xd8608a, label: 'Drink the pink tea', onTable: true,
    by: 'normal', clip: 'drink', stand: [-1.45, 0, -5.557], rot: 90, grip: [-0.008, 0.045, 0.003],
  },
  {
    model: 'blue_teacup', pos: [-0.95, 0.76, -4.45], becomes: 'big', grow: [-4.4, 0, -4.4], pot: 'blue_teapot', tea: 0x5a86d8, label: 'Drink the blue tea', onTable: true,
    by: 'normal', clip: 'drink', stand: [-1.45, 0, -4.407], rot: 90, grip: [-0.008, 0.045, 0.003],
  },
  {
    model: 'cake', pos: [-2.8, 0, 2.2], becomes: 'normal', label: 'Eat the cake',
    by: 'small', clip: 'drink', stand: [-2.8, 0, 2.08], rot: 0, grip: [-0.008, 0.045, 0.003],
  },
  {
    model: 'cake', pos: [3.4, 0, -1.2], becomes: 'normal', label: 'Eat the cake',
    by: 'small', clip: 'drink', stand: [3.3, 0, -1.2], rot: 90, grip: [-0.008, 0.045, 0.003],
  },
  {
    model: 'cake', pos: [24, 1.8, -19.4], becomes: 'normal', label: 'Eat the cake',
    by: 'big', clip: 'drink', stand: [24, 1.8, -18.45], rot: 0, grip: [-0.008, 0.045, 0.003],
  },
]

// The book page in the ending flies into Fries's palm as he reaches, standing where the song left him.
export const page = { stand: [-1.45, 0, -4.2], rot: 90, grip: [0, 0.05, 0.007] }

// Teacups standing on the long table. They pulse on every beat of the song.
export const tableCups = [
  [-0.55, 0.76, -7.6], [0.5, 0.76, -6.9], [-0.55, 0.76, -6.2], [0.5, 0.76, -5.9], [0.45, 0.76, -5],
  [-0.75, 0.76, -4.2], [0.5, 0.76, -3.9], [-0.5, 0.76, -2.8], [0.45, 0.76, -2.2], [-0.5, 0.76, -1.5],
  [0.5, 0.76, -0.9], [-0.45, 0.76, -0.1], [0.4, 0.76, 0.6], [-0.4, 0.76, 1.1],
]

// Clocks stuck at six, hanging from the big tree's branches on chains: [x, y, z] of each clock's foot and the
// way its face looks (degrees). They jump to 6:01 in the ending.
export const clocks = [
  { pos: [-5.2, 2.4, -10], rot: -30 }, // over the tree door
  { pos: [-1.6, 2.5, -8.8], rot: 60 },
  { pos: [1, 2.6, -8.2], rot: -40 },
  { pos: [-7.5, 2.6, -8.8], rot: 10 },
]

// Lanterns hanging from the big tree's branches on chains: [x, y, z] of each lantern's foot.
export const lanterns = [
  [-1.6, 2.2, -7.6], [1.4, 2.3, -7.2], [0, 2.5, -8.4], [-2.8, 2.4, -6.4], [2.4, 2.4, -8.8], [-3.6, 2.5, -9.6],
  [-6.6, 2.6, -8.4], [-0.6, 2.6, -10.4],
]

// Floating things drift inside these boxes, at about their real size. Each gear found adds another batch of
// `perGear` of each kind.
export const floating = {
  perGear: { teacup: 14, hat: 5, spoon: 8, plate: 6, pocket_watch: 3 },
  clouds: [
    { center: [0, 2.4, -3.5], size: [4.6, 2, 10] },
    { center: [18.5, 2.4, -5], size: [6, 2, 6] },
    { center: [26, 5, -22], size: [10, 2, 6] },
    { center: [-3, 3, -10], size: [5, 1.6, 4] },
    { center: [0, 2.2, 5.2], size: [6, 1.4, 4] },
  ],
}

// Places the voice barks listen for, as circles on the ground: [x, z] and radius.
export const zones = {
  table: { pos: [0, -3.5], r: 6.5 },
  tray: { pos: [-1.2, -5], r: 1.4 },
  hareChair: { pos: [2.4, -7.4], r: 0.9 },
  dormouse: { pos: [0, -9], r: 1.6 },
  cottage: { pos: [24.5, -23.6], r: 8 },
}

// Room kept clear of floating things, falling petals and steam: the cast at their seats and song spots and
// Fries at his song spot, as upright cylinders [x, z, radius, bottom, top].
export const keepClear = [
  [-1.55, -6.8, 0.35, 0, 1.7], // the Hatter in his armchair
  [1.55, -7.4, 0.35, 0, 1.8], // the March Hare in his armchair
  [-0.1, -6.3, 0.3, 0.76, 2.6], // the Hatter on the table in the song
  [2.5, -7.4, 0.35, 0, 1.8], // the March Hare beside his chair in the song
  [0.1, -7.9, 0.2, 0.76, 1.1], // the Dormouse on its plate
  [-1.45, -4.2, 0.3, 0, 1.35], // Fries at his song spot
]

// Where the world-waking effects sit.
export const effects = {
  // Tea frozen mid-pour from the teapots' spouts into cups: from, to and how high the arc rises
  teaArcs: [
    { from: [0.49, 0.87, -2.6], to: [0.45, 0.83, -2.2], height: 0.18 },
    { from: [-0.39, 0.87, 0.2], to: [-0.45, 0.83, -0.1], height: 0.16 },
  ],
  petals: { center: [0, 2.2, -4], size: [12, 3.4, 14], count: 240 },
  butterflies: { center: [18.5, 0.52, -5], perch: 1.3, radius: 3.5, count: 14 }, // perched round the basin rim
}

// The fountain's syrup, in its own frame as [radius, height, angle in degrees from +Z]: streams from the spouts
// of its teapots (`height` the arc's rise), sheets spilling over the cup tier's lip ([radius, top, bottom]), pools
// in the cup tier and the basin rising as the syrup flows ([radius, low, high]), and golden drops hanging round
// it (world [x, y, z]).
export const syrup = {
  streams: [
    { from: [0.74, 2.56, -148], to: [0.42, 1.6, -148], height: 0.12 },
    { from: [0.57, 1.98, -70], to: [0.4, 1.6, -70], height: 0.08 },
    { from: [1.2, 0.92, -53], to: [0.95, 0.46, -53], height: 0.06 },
    { from: [1.2, 0.92, 127], to: [0.95, 0.46, 127], height: 0.06 },
  ],
  sheets: [[0.78, 1.64, 0.47]],
  pools: [[0.7, 1.52, 1.6], [1.32, 0.43, 0.47]],
  drops: { center: [18.5, 1.6, -5], size: [4.4, 2, 4.4], count: 70 },
}

// Staging for the song: Fries faces the table with a teacup in front of him.
export const song = {
  fries: { pos: [-1.45, 0, -4.2], rot: 90 },
  tapCup: 5, // index into tableCups
}

// The cast sits where it is placed above (the Dormouse lies on its plate). `seat` is the height of the seat the
// hips rest on; how high the hips ride above a model's feet is measured from its sit_idle clip. In the song
// each stands at `song`: the Hatter on the table, the March Hare beside his chair, clear of the table; the
// Dormouse dances on its plate.
export const cast = {
  hatter: { seat: 0.48, song: { pos: [-0.1, 0.76, -6.3], rot: -90 } },
  hare: { seat: 0.48, song: { pos: [2.5, 0, -7.4], rot: -90 } },
  dormouse: {},
}

// The lawn and its flowers (see src/fields.js). Grass grows over `lawn` [x0, z0, x1, z1], on the land and on the
// terraces, except on the `bare` rectangles (under the table, round the tree's roots, the cottage, its porch) and
// the paths (`pathWidth` wide); flowers bloom in bands along the paths, in the `drifts` [x, z, radius] and in loose
// patches. The land is flat over `plateau` (but for the overlook) and falls away beyond it. The WebGL fallback
// gets half the grass and flowers.
export const meadow = {
  plateau: [-36, -38, 36, 29],
  lawn: [-35, -37, 35, 28],
  bare: [[-1.15, -7.8, 1.15, 0.8], [-7, -14.6, -1.6, -9.6], [12.3, -35, 30, -19.6], [26.6, -25, 31, -21.2]],
  pathWidth: 1.2,
  drifts: [
    [-4, 4.2, 2.2], [3.6, 5, 2], [-8, 8, 2.5], [6, 12.6, 2.4], [-3.4, 12, 2.2], [12, 8, 2.5], [-12, 4, 2.2], [16, 2, 2.4],
    [-14, -6, 2], [24, 10, 2.5], [-20, 8, 3], [-20, -8, 3], [26, -1, 2.5], [-9, -12, 2.2], [9, -8.6, 1.8], [-6, 18, 2.6],
    [10, 18, 2.6], [-16, 18, 2.8], [20, 18, 2.6], [18, -10.5, 2], [25, -18, 2.4], [13, -21, 2], [-26, -20, 3], [0, -18, 2.6],
    [6, 0.4, 2.2], [11, -3.4, 2.4], [11, 5.8, 2], [13.5, -8.4, 2.2], [20, -12.6, 2.4], [24, -12, 2.2], [-9, -4, 2.2],
    [-14, -11, 2.4], [-8, -17, 2.4], [-28, -4, 3], [-28, 10, 3], [-18, -24, 2.8], [-6, -28, 3], [8, -26, 2.6], [0, 22, 3],
    [-10, 23, 2.8], [16, 24, 2.4], [27, 21, 2.6], [-26, 22, 2.6], [30, 6, 2.6], [-17, 6, 2.2], [-22, 0, 2.4], [4, 8.6, 1.8],
    [14, 14, 2.4], [-4, -22, 2.4],
  ],
  grassPerSquareMetre: 22,
  flowersPerSquareMetre: 14,
}

// Small routes use the existing table and fountain openings; their low ceilings exclude larger bodies.
export const underTable = {
  crumbs: [-0.6, -2.8, 0.7, -1.3],
  cup: [gears[0].pos[0], gears[0].pos[2] + 0.55],
  spoon: [[0.1, 0.09, -1.65], [0.1, 0.008, -2.12]],
  hare: [1.45, 0, -1.65],
}
export const grotto = { valve: [gears[1].pos[0], gears[1].pos[2]] }

// In the house's own frame, behind its door_hinge at (0.5, 1.1, 2.877).
export const hall = {
  centre: [1.28, 1.1, 2.2], halfWidth: 0.72, depth: 0.6,
  note: [1.28, 1.65, 1.76],
  props: [
    { model: 'saucer', at: [1.55, 1.12, 2.05], scale: 1.7 },
    { model: 'spoon', at: [1.52, 1.14, 2.05], rot: 35, scale: 1.6 },
    { model: 'spoon', at: [1.65, 1.14, 2.08], rot: -25, scale: 1.4 },
    { model: 'butter', at: [1.55, 1.15, 2.05], scale: 0.6 },
    { model: 'pocket_watch', at: [0.86, 1.12, 2.05], scale: 3 },
    { model: 'butter', at: [0.86, 1.2, 2.05], scale: 0.7 },
  ],
}
