// The garden: every position in the chapter lives in this file.
// Metres, +Y up. The long table runs north (-Z) to south (+Z) under the big tree; the fountain is east of it,
// the March Hare's cottage west. `rot` is a turn about +Y in degrees; every model faces +Z before it is turned.

// Placeholder shapes, one per model name. Each box is [x, y, z, width, height, depth, colour] in the model's
// own frame (y is the box centre). They are drawn when art/models/<name>.glb is missing, and they are the
// model's colliders unless its glb contains a mesh named <name>_collider.
const BARK = 0x6b4a32, LEAF = 0x4f7d3c, LEAF2 = 0x5d8f45, HEDGE = 0x3f6b35, DOOR = 0x5a3a26, BRASS = 0xd9a441
const CLOTH = 0xf4efe6, FRINGE = 0xe6d6bd, WOOD = 0x7a5536, PLANK = 0x9b7a55, CHAIR = 0x9b3b3b
const STONE = 0xaaa59b, SYRUP = 0xc98a2b, WALL = 0xe8dcc4, ROOF = 0x8a4b3a, BRICK = 0xa0503c, GLASS = 0x9fc3d6
const CHINA = 0xf6f6f2, PINK = 0xf29bc0, BLUE = 0x7fb0f0, SILVER = 0xc8c8cc, PATH = 0xbdb4a2
const SKIN = 0xf1c9a5, NOSE = 0xe0a080, COAT = 0x6a4a8c, TROUSERS = 0x4a5a3a, HAT = 0x3c4a3a, HATBAND = 0xc23b4a
const FUR = 0xc8a27a, HARE_COAT = 0x3f6f8f, MOUSE = 0x8a6a52, SHIRT = 0xf2c230, JEANS = 0x35507a, HAIR = 0x5a3a20
const ROSE = 0xd0182c, GLOW = 0xfff2e0, BLACK = 0x222222

const teapot = colour => [
  [0, 0.09, 0, 0.2, 0.18, 0.18, colour],
  [0, 0.2, 0, 0.08, 0.04, 0.08, colour],
  [0.14, 0.12, 0, 0.1, 0.03, 0.03, colour],
  [-0.12, 0.1, 0, 0.03, 0.1, 0.03, colour],
]

export const shapes = {
  big_tree: [
    [0, 3.5, -1.25, 3, 7, 0.5, BARK], // a hollow trunk: back, sides, and the front around the door
    [-1.25, 3.5, 0, 0.5, 7, 2, BARK],
    [1.25, 3.5, 0, 0.5, 7, 2, BARK],
    [-1, 3.5, 1.25, 1, 7, 0.5, BARK],
    [1, 3.5, 1.25, 1, 7, 0.5, BARK],
    [0, 4.6, 1.25, 1, 4.8, 0.5, BARK],
    [0, 6.75, 0, 2, 0.5, 2, BARK],
    [-1.9, 0.25, 0.4, 1, 0.5, 1.4, BARK],
    [1.9, 0.25, -0.3, 1, 0.5, 1.6, BARK],
    [0, 5.75, -1, 16, 3.5, 12, LEAF], // canopy from 4 m up, reaching over the whole long table
    [0, 5.25, 8.5, 11, 2.5, 12, LEAF],
    [-5, 6.5, -3, 7, 3, 7, LEAF],
  ],
  tree_door: [ // pivots on its hinge
    [0.5, 1.1, 0, 1, 2.2, 0.08, DOOR],
    [0.85, 1.1, 0.06, 0.08, 0.08, 0.06, BRASS],
  ],
  roses: [ // inside the hollow trunk; hidden until the final shot
    [0, 1.4, -0.95, 1.9, 2.8, 0.05, GLOW],
    [-0.5, 0.35, -0.6, 0.7, 0.7, 0.5, LEAF],
    [0.5, 0.35, -0.6, 0.7, 0.7, 0.5, LEAF],
    [-0.65, 0.75, -0.5, 0.16, 0.14, 0.16, ROSE],
    [-0.3, 0.8, -0.65, 0.16, 0.14, 0.16, ROSE],
    [0.35, 0.75, -0.5, 0.16, 0.14, 0.16, ROSE],
    [0.7, 0.74, -0.7, 0.16, 0.14, 0.16, ROSE],
    [0.05, 0.72, -0.4, 0.14, 0.12, 0.14, ROSE],
  ],
  long_table: [ // top at 0.75 m; the tablecloth hangs to 0.3 m, so only a small Fries gets under it
    [0, 0.73, 0, 1.6, 0.04, 10, CLOTH],
    [-0.79, 0.505, 0, 0.02, 0.41, 10, FRINGE],
    [0.79, 0.505, 0, 0.02, 0.41, 10, FRINGE],
    [0, 0.505, -4.99, 1.6, 0.41, 0.02, FRINGE],
    [0, 0.505, 4.99, 1.6, 0.41, 0.02, FRINGE],
    [-0.7, 0.355, -4.9, 0.08, 0.71, 0.08, WOOD],
    [0.7, 0.355, -4.9, 0.08, 0.71, 0.08, WOOD],
    [-0.7, 0.355, 4.9, 0.08, 0.71, 0.08, WOOD],
    [0.7, 0.355, 4.9, 0.08, 0.71, 0.08, WOOD],
  ],
  armchair: [ // seat at 0.45 m
    [0, 0.225, 0, 0.75, 0.45, 0.7, CHAIR],
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
  fountain: [ // a hollow plinth with a crack at the foot of its west side that only a small Fries fits through
    [-1.25, 0.55, 0.8375, 0.5, 1.1, 1.325, STONE],
    [-1.25, 0.55, -0.8375, 0.5, 1.1, 1.325, STONE],
    [-1.25, 0.7, 0, 0.5, 0.8, 0.35, STONE],
    [1.25, 0.55, 0, 0.5, 1.1, 3, STONE],
    [0, 0.55, -1.25, 2, 1.1, 0.5, STONE],
    [0, 0.55, 1.25, 2, 1.1, 0.5, STONE],
    [-1.65, 0.06, 0.32, 0.12, 0.12, 0.1, STONE],
    [-1.7, 0.05, -0.38, 0.1, 0.1, 0.12, STONE],
    [0, 1.25, 0, 3.2, 0.3, 3.2, STONE], // basin
    [0, 1.55, -1.525, 3.2, 0.3, 0.15, STONE],
    [0, 1.55, 1.525, 3.2, 0.3, 0.15, STONE],
    [-1.525, 1.55, 0, 0.15, 0.3, 2.9, STONE],
    [1.525, 1.55, 0, 0.15, 0.3, 2.9, STONE],
    [0, 1.42, 0, 2.9, 0.04, 2.9, SYRUP],
    [0, 2.2, 0, 0.36, 1.6, 0.36, STONE],
    [0, 3.06, 0, 1.2, 0.14, 1.2, STONE],
  ],
  cottage: [
    [0, 1.5, 0, 6, 3, 5, WALL],
    [0, 3.25, 0, 6.6, 0.5, 5.6, ROOF],
    [0, 3.75, 0, 5.4, 0.5, 4.2, ROOF],
    [0, 4.25, 0, 4, 0.5, 2.6, ROOF],
    [0, 4.7, 0, 2.6, 0.4, 1, ROOF],
    [1.8, 4.6, -1, 0.6, 1.8, 0.6, BRICK],
    [0, 1, 2.52, 1, 2, 0.06, DOOR], // 2 m
    [-1.9, 1.7, 2.52, 0.9, 0.8, 0.06, GLASS],
    [1.9, 1.7, 2.52, 0.9, 0.8, 0.06, GLASS],
    [0, 0.2, 3.5, 6, 0.4, 2, PLANK], // porch, step and railings
    [0, 0.1, 4.75, 1.4, 0.2, 0.5, PLANK],
    [-1.875, 0.85, 4.46, 2.25, 0.9, 0.08, PLANK],
    [1.875, 0.85, 4.46, 2.25, 0.9, 0.08, PLANK],
    [-2.96, 0.85, 3.5, 0.08, 0.9, 2, PLANK],
    [2.96, 0.85, 3.5, 0.08, 0.9, 2, PLANK],
  ],
  hat_rack: [ // the tallest hat sits on top of the pole, out of reach unless Fries is big
    [0, 0.04, 0, 0.5, 0.08, 0.5, WOOD],
    [0, 1.3, 0, 0.08, 2.6, 0.08, WOOD],
    [0, 1.7, 0, 0.6, 0.04, 0.04, WOOD],
    [0, 2.1, 0, 0.04, 0.04, 0.6, WOOD],
    [-0.3, 1.82, 0, 0.22, 0.2, 0.22, HATBAND],
    [0.3, 1.82, 0, 0.22, 0.2, 0.22, COAT],
    [0, 2.22, 0.3, 0.22, 0.2, 0.22, HARE_COAT],
    [0, 2.85, 0, 0.42, 0.04, 0.42, HAT],
    [0, 3.08, 0, 0.3, 0.46, 0.3, HAT],
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
  pink_teapot: teapot(PINK),
  blue_teapot: teapot(BLUE),
  tea_tray: [[0, 0.01, 0, 0.5, 0.02, 0.9, SILVER]],
  cake: [
    [0, 0.005, 0, 0.22, 0.01, 0.22, CHINA],
    [0, 0.05, 0, 0.14, 0.08, 0.1, 0xe8c08a],
    [0, 0.095, 0, 0.14, 0.01, 0.1, 0xfff0f4],
    [0, 0.115, 0, 0.03, 0.03, 0.03, ROSE],
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
  gear: [
    [0, 0, 0, 0.22, 0.22, 0.05, BRASS],
    [0, 0, 0, 0.3, 0.06, 0.04, BRASS],
    [0, 0, 0, 0.06, 0.3, 0.04, BRASS],
  ],
  wall_clock: [
    [0, 0, 0, 0.62, 0.62, 0.05, WOOD],
    [0, 0, 0.03, 0.54, 0.54, 0.01, CHINA],
  ],
  clock_hand: [[0, 0.11, 0, 0.03, 0.22, 0.012, BLACK]], // pivots at the clock centre, points up
  bush: [
    [0, 0.45, 0, 1.2, 0.9, 1.2, LEAF2],
    [-0.3, 0.95, 0.2, 0.18, 0.12, 0.18, 0xe85a8a],
    [0.25, 0.97, -0.2, 0.18, 0.12, 0.18, 0xf2d04a],
    [0.1, 0.93, 0.35, 0.16, 0.1, 0.16, 0xffffff],
    [-0.2, 0.96, -0.3, 0.16, 0.1, 0.16, 0xb07ae0],
  ],
  hedge: [[0, 1.25, 0, 4, 2.5, 1.2, HEDGE]],
  stone_path: [[0, 0.01, 0, 0.7, 0.02, 0.5, PATH]],
}

// Fries's starting place, at the south end of the long table, facing north.
export const start = { pos: [0, 0, 3.6], rot: 180 }

const hedges = []
for (let i = -22; i <= 22; i += 4) {
  hedges.push({ model: 'hedge', pos: [i, 0, -24] }, { model: 'hedge', pos: [i, 0, 24] })
  hedges.push({ model: 'hedge', pos: [-24, 0, i], rot: 90 }, { model: 'hedge', pos: [24, 0, i], rot: 90 })
}
const path = ([x0, z0], [x1, z1], n) => Array.from({ length: n }, (_, i) => ({
  model: 'stone_path', pos: [x0 + (x1 - x0) * i / (n - 1), 0, z0 + (z1 - z0) * i / (n - 1)], rot: i * 37 % 40 - 20, solid: false,
}))

// Every fixed object. `solid: false` leaves it without colliders; `scale` is uniform.
export const placed = [
  { model: 'big_tree', pos: [0, 0, -12] },
  { model: 'tree_door', pos: [-0.5, 0, -10.54] },
  { model: 'roses', pos: [0, 0, -12], solid: false },
  { model: 'long_table', pos: [0, 0, -3.5] },
  { model: 'armchair', pos: [-1.35, 0, -6.8], rot: 90 },
  { model: 'hatter', pos: [-1.35, 0, -6.8], rot: 90 },
  { model: 'armchair', pos: [1.35, 0, -7.4], rot: -90 },
  { model: 'hare', pos: [1.35, 0, -7.4], rot: -90 },
  { model: 'armchair', pos: [-1.35, 0, -2.6], rot: 90 },
  { model: 'armchair', pos: [-1.35, 0, -0.4], rot: 90 },
  { model: 'armchair', pos: [1.35, 0, -4.6], rot: -90 },
  { model: 'armchair', pos: [1.35, 0, -2], rot: -90 },
  { model: 'armchair', pos: [1.35, 0, 0.4], rot: -90 },
  { model: 'plate', pos: [0.1, 0.75, -7.9], solid: false },
  { model: 'dormouse', pos: [0.1, 0.76, -7.9], rot: -60, solid: false },
  { model: 'tea_tray', pos: [-0.45, 0.75, -5], solid: false },
  { model: 'cake_stand', pos: [0.2, 0.75, -3.4], solid: false },
  { model: 'pocket_watch', pos: [-0.5, 0.75, -6.75], rot: 90, solid: false },
  { model: 'book_page', pos: [-0.5, 0.75, -6.75], rot: 90, solid: false },
  { model: 'fountain', pos: [9, 0, -3] },
  { model: 'cottage', pos: [-11, 0, -2], rot: 90 },
  { model: 'hat_rack', pos: [-7.4, 0.4, -4.2] },
  ...hedges,
  ...path([0, 3], [7, -2], 9),
  ...path([-1.5, 2.6], [-6, -2], 7),
  ...path([0, 4], [0, 10], 7),
]

// Flower bushes, [x, z]. They sway and hum once the third layer wakes.
export const bushes = [
  [-4, 4], [4.5, 5], [6, 2], [12.5, 1.5], [13, -7], [6.5, -9], [-5, -9.5], [-15, 4],
  [-15, -8], [-4.5, 9.5], [5.5, 10.5], [14.5, -2.5], [-9.5, 6.5], [10, 7], [-3.5, -14], [4, -15],
]

// The three gears, collectable in any order. Each wakes its own layer of the world.
export const gears = [
  { pos: [0.1, 0.12, -2.2], layer: 'tea', line: 'GR-01', hints: ['EX-01', 'EX-02', 'EX-03'] }, // under the long table
  { pos: [9, 0.12, -3], layer: 'syrup', line: 'GR-02', hints: ['EX-04', 'EX-05', 'EX-06'] }, // inside the fountain's plinth
  { pos: [-7.4, 3.83, -4.2], layer: 'flowers', line: 'GR-03', hints: ['EX-07', 'EX-08', 'EX-09'] }, // on the tallest hat
]

// Things that change Fries's size.
export const drinks = [
  { model: 'pink_teapot', pos: [-0.45, 0.77, -5.25], size: 'small', label: 'Drink the pink tea' },
  { model: 'blue_teapot', pos: [-0.45, 0.77, -4.75], size: 'big', label: 'Drink the blue tea' },
  { model: 'cake', pos: [1.6, 0, 2.6], size: 'normal', label: 'Eat the cake' },
  { model: 'cake', pos: [6.8, 0, -0.4], size: 'normal', label: 'Eat the cake' },
  { model: 'cake', pos: [-5.6, 0, 1.2], size: 'normal', label: 'Eat the cake' },
]

// Teacups standing on the long table. They pulse on every beat of the song.
export const tableCups = [
  [-0.55, 0.75, -7.6], [0.5, 0.75, -6.9], [-0.55, 0.75, -6.2], [0.5, 0.75, -5.9], [0.45, 0.75, -5],
  [-0.55, 0.75, -4.2], [0.5, 0.75, -3.9], [-0.5, 0.75, -2.8], [0.45, 0.75, -2.2], [-0.5, 0.75, -1.5],
  [0.5, 0.75, -0.9], [-0.45, 0.75, -0.1], [0.4, 0.75, 0.6], [-0.4, 0.75, 1.1],
]

// Clocks stuck at six. They jump to 6:01 in the ending.
export const clocks = [
  { pos: [0, 3, -10.47] }, // over the door in the big tree
  { pos: [-8.45, 2.45, -0.6], rot: 90 }, // on the front of the cottage
]

// Floating teacups and hats drift inside these boxes. Each gear found adds another `cups` and `hats`.
export const floating = {
  cups: 12,
  hats: 5,
  clouds: [
    { center: [0, 2.6, -3.5], size: [5, 2.4, 11] },
    { center: [9, 3.4, -3], size: [5, 2.4, 5] },
    { center: [-9, 3.6, -2], size: [5, 2.4, 7] },
    { center: [4, 2.8, -10], size: [5, 1.6, 5] },
  ],
}

// Places the voice barks listen for, as circles on the ground: [x, z] and radius.
export const zones = {
  table: { pos: [0, -3.5], r: 6.5 },
  tray: { pos: [-1.2, -5], r: 1.4 },
  hareChair: { pos: [2.2, -7.4], r: 0.9 },
  dormouse: { pos: [0, -9], r: 1.6 },
  cottage: { pos: [-8, -2], r: 5 },
}

// Where the world-waking effects sit.
export const effects = {
  teaStream: { from: [-0.55, 1.3, -6.2], to: [-0.55, 0.82, -6.2] }, // tea frozen mid-pour over a cup
  syrupStream: { from: [9.55, 3, -3], to: [9.55, 1.44, -3] }, // syrup frozen over the fountain's lip
  petals: { center: [0, 2.2, -4], size: [12, 3.4, 14], count: 240 },
  butterflies: { center: [9, 1.72, -3], perch: 1.4, radius: 4, count: 14 }, // perched round the basin rim
}

// Staging for the song: Fries faces the table with a teacup in front of him; the Hatter sings on the table.
export const song = {
  fries: { pos: [-1.15, 0, -4.2], rot: 90 },
  tapCup: 5, // index into tableCups
  hatter: [-0.1, 0.75, -6.3],
}
