// The garden: every position in the chapter lives in this file.
// Metres, +Y up. The long table runs north (-Z) to south (+Z) under the big tree; the fountain is east of it,
// the March Hare's cottage west. `rot` is a turn about +Y in degrees; every model faces +Z before it is turned.

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
const ROSE = 0xd0182c, GLOW = 0xfff2e0, BLACK = 0x222222, TERRACE = 0xb7ab96, WALLSTONE = 0x9d9283, LANTERN = 0xffc070
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
  long_table: [ // 8.57 m long along its x, top at 0.76 m; the cloth hangs to 0.35 m, so only a small Fries gets under it
    [0, 0.74, 0, 8.57, 0.04, 2.27, CLOTH],
    [0, 0.545, -1.125, 8.57, 0.39, 0.02, FRINGE],
    [0, 0.545, 1.125, 8.57, 0.39, 0.02, FRINGE],
    [-4.275, 0.545, 0, 0.02, 0.39, 2.27, FRINGE],
    [4.275, 0.545, 0, 0.02, 0.39, 2.27, FRINGE],
    [-4.1, 0.36, -1, 0.08, 0.72, 0.08, WOOD],
    [-4.1, 0.36, 1, 0.08, 0.72, 0.08, WOOD],
    [4.1, 0.36, -1, 0.08, 0.72, 0.08, WOOD],
    [4.1, 0.36, 1, 0.08, 0.72, 0.08, WOOD],
  ],
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
  fountain: [ // a raised stone basin up two steps; a crack at the foot of its west wall leads a small Fries
    // through a tunnel to a hollow under the fountain
    [0, 0.225, -1.8, 6, 0.45, 2.4, STONE],
    [0, 0.225, 1.8, 6, 0.45, 2.4, STONE],
    [1.8, 0.225, 0, 2.4, 0.45, 1.2, STONE],
    [-1.8, 0.225, -0.3875, 2.4, 0.45, 0.425, STONE],
    [-1.8, 0.225, 0.3875, 2.4, 0.45, 0.425, STONE],
    [-1.8, 0.375, 0, 2.4, 0.15, 0.35, STONE], // over the tunnel, 0.35 wide and 0.3 high
    [0, 0.425, 0, 1.2, 0.05, 1.2, STONE], // over the hollow
    [-3.6, 0.075, -1.9, 0.4, 0.15, 1.8, STONE], // steps
    [-3.2, 0.15, -1.9, 0.4, 0.3, 1.8, STONE],
    [-3.3, 0.06, 0.35, 0.12, 0.12, 0.1, STONE], // rubble by the crack
    [-3.35, 0.05, -0.4, 0.1, 0.1, 0.12, STONE],
    [0, 0.625, -2.875, 6, 0.35, 0.25, WALLSTONE], // low walls round the edge
    [0, 0.625, 2.875, 6, 0.35, 0.25, WALLSTONE],
    [2.875, 0.625, 0, 0.25, 0.35, 6, WALLSTONE],
    [-2.875, 0.625, 1, 0.25, 0.35, 4, WALLSTONE],
    [-2.875, 0.625, -2.9, 0.25, 0.35, 0.2, WALLSTONE],
    [0, 0.7, -1.4, 3, 0.5, 0.2, STONE], // the fountain
    [0, 0.7, 1.4, 3, 0.5, 0.2, STONE],
    [-1.4, 0.7, 0, 0.2, 0.5, 2.6, STONE],
    [1.4, 0.7, 0, 0.2, 0.5, 2.6, STONE],
    [0, 0.85, 0, 2.6, 0.04, 2.6, SYRUP],
    [0, 1.65, 0, 0.36, 1.6, 0.36, STONE],
    [0, 2.5, 0, 1.2, 0.14, 1.2, STONE],
  ],
  terrace: [[0, 0.6, 0, 10, 1.2, 12, TERRACE]], // raised 1.2 m
  landing: [[0, 0.3, 0, 1.4, 0.6, 1.1, STONE]], // under the upper flight of steps
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
  ivy_strand: [[0, 0.65, 0, 0.3, 1.3, 0.03, LEAF]],
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

// Fries's starting place, at the south end of the long table, facing north.
export const start = { pos: [0, 0, 3.6], rot: 180 }

// Copies of a model laid end to end from one [x, z] point to another; the model's length runs along its x.
const row = (model, [x0, z0], [x1, z1], length) => {
  const n = Math.max(1, Math.round(Math.hypot(x1 - x0, z1 - z0) / length))
  const rot = Math.atan2(z0 - z1, x1 - x0) * 180 / Math.PI
  return Array.from({ length: n }, (_, i) => ({ model, pos: [x0 + (x1 - x0) * (i + 0.5) / n, 0, z0 + (z1 - z0) * (i + 0.5) / n], rot }))
}
// Flagstones along a path's centre line, about `spacing` apart, the four shapes in turn, set a little to either
// side.
const stones = (line, spacing) => line.slice(1).flatMap(([x1, z1], i) => {
  const [x0, z0] = line[i], n = Math.max(1, Math.round(Math.hypot(x1 - x0, z1 - z0) / spacing))
  const across = [(z0 - z1) / Math.hypot(x1 - x0, z1 - z0), (x1 - x0) / Math.hypot(x1 - x0, z1 - z0)]
  return Array.from({ length: n }, (_, k) => {
    const j = i * 7 + k, side = ((j * 53 % 7) / 7 - 0.5) * 0.25
    return {
      model: `flagstone_${'abcd'[j % 4]}`, pos: [x0 + (x1 - x0) * k / n + across[0] * side, 0, z0 + (z1 - z0) * k / n + across[1] * side],
      rot: j * 37 % 90, solid: false,
    }
  })
})

// The paths, as centre lines of [x, z] points. Flowers grow in bands either side of them.
export const paths = [
  [[0, 8.4], [0, 2.6]],
  [[-0.8, 2.4], [-3, 0.6], [-3.2, -1.8], [-3.2, -2.6], [-2.5, -8.6], [-2, -9.2], [-0.6, -9.5]],
  [[0.8, 2.4], [2.6, 1], [2.8, 0.4], [2.9, -4.6]],
]

// Every fixed object. `onTable` props dance on the table in the final chorus; `on` names the prop one stands on,
// which it rides with. `solid: false` leaves it without colliders; `scale` is uniform.
export const placed = [
  { model: 'big_tree', pos: [0, 0, -12] }, // the tunnel through its roots runs north from the door
  { model: 'long_table', pos: [0, 0, -3.5], rot: 90 },
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
  { model: 'dormouse', pos: [0.1, 0.77, -7.9], rot: -60, solid: false },
  { model: 'tea_tray', pos: [-0.45, 0.76, -5], solid: false, onTable: true },
  { model: 'pink_teapot', pos: [-0.45, 0.79, -5.25], rot: 180, solid: false, on: 'tea_tray' }, // spouts toward the teacups
  { model: 'blue_teapot', pos: [-0.45, 0.79, -4.75], rot: 180, solid: false, on: 'tea_tray' },
  { model: 'cake_stand', pos: [0.2, 0.76, -3.4], solid: false, onTable: true },
  { model: 'teapot', pos: [0.3, 0.76, -2.6], solid: false, onTable: true },
  { model: 'teapot', pos: [-0.2, 0.76, 0.2], rot: 180, solid: false, onTable: true },
  { model: 'pocket_watch', pos: [-0.5, 0.76, -6.75], rot: 90, solid: false, onTable: true },
  { model: 'book_page', pos: [-0.5, 0.76, -6.75], rot: 90, solid: false, on: 'pocket_watch' },
  { model: 'milk_jug', pos: [0.45, 0.76, -4.4], rot: -90, solid: false, onTable: true },
  { model: 'candelabra', pos: [0, 0.76, -5.9], rot: 90, solid: false, onTable: true },
  { model: 'candle', pos: [0.15, 0.76, -1.6], solid: false, onTable: true },
  { model: 'candle', pos: [-0.2, 0.76, -0.6], solid: false, onTable: true },
  { model: 'fountain', pos: [7, 0, -3], rot: 180 }, // about 6 m east of the table; its grotto opens west, towards the table
  // The terrace west of the table: a flight of two step modules (the upper one on a landing) up its east face,
  // dry-stone walls with flowers along its other edges
  { model: 'terrace', pos: [-11, 0, -2] },
  { model: 'landing', pos: [-5.45, 0, -2] },
  { model: 'steps_stone', pos: [-5.45, 0.6, -2], rot: 90 },
  { model: 'steps_stone', pos: [-4.35, 0, -2], rot: 90 },
  ...row('wall_stone', [-16, -7.8], [-6, -7.8], 2).map(w => ({ ...w, pos: [w.pos[0], 1.2, w.pos[2]] })),
  ...row('wall_cap_flowers', [-16, -7.8], [-6, -7.8], 2).map(w => ({ ...w, pos: [w.pos[0], 1.8, w.pos[2]], solid: false })),
  ...row('wall_stone', [-16, 3.8], [-12, 3.8], 2).map(w => ({ ...w, pos: [w.pos[0], 1.2, w.pos[2]] })),
  ...row('wall_cap_flowers', [-16, 3.8], [-12, 3.8], 2).map(w => ({ ...w, pos: [w.pos[0], 1.8, w.pos[2]], solid: false })),
  { model: 'house', pos: [-11.5, 1.2, -2], rot: 90 }, // on the terrace, its door facing the table
  { model: 'hat_rack', pos: [-6.7, 1.2, -5.8], rot: -90 }, // on the terrace by the cottage's front; gear 3 on its top hat
  // Fences along the paths (one broken where the view from the south-east looks through), and arches at bends
  ...row('fence_picket', [-1, 4.6], [-1, 8.6], 1.5),
  ...row('fence_picket', [1, 4.6], [1, 8.6], 1.5),
  ...row('fence_picket', [-1.3, 3.4], [-3.5, 2.3], 1.5),
  ...row('fence_picket', [-4.2, 2.8], [-4.2, 0.8], 1.5),
  ...row('fence_broken', [1.3, 3.4], [3.5, 2.3], 1.5),
  ...row('fence_picket', [3.7, 1.4], [3.75, -0.6], 1.5),
  ...row('fence_picket', [-3.5, -3.6], [-3.5, -7.6], 1.5),
  { model: 'rose_arch', pos: [0, 0, 6.2] },
  { model: 'rose_arch', pos: [2.85, 0, -0.2], rot: 90 },
  { model: 'rose_arch', pos: [-3.2, 0, -2.4], rot: 90 },
  { model: 'ivy_strand', pos: [-1.05, 0, -10.6], rot: 20, solid: false },
  { model: 'ivy_strand', pos: [1.0, 0, -10.7], rot: -15, solid: false },
  { model: 'ivy_strand', pos: [-15, 1.2, -7.6], solid: false },
  ...paths.flatMap(line => stones(line, 0.6)),
]

// Doors hang on a hinge at the bottom of their left edge: a node in the model they are set in, or a point in its
// frame, scaled to fill the opening. Positive angles swing them inwards.
export const doors = {
  cottage: { in: 'house', hinge: 'door_hinge', scale: [1.2, 0.95, 1] },
  tree: { in: 'big_tree', hinge: [-1.2, 0, 1.6], scale: [1.45, 1.45, 1] },
}

// Behind the big tree, out through the tunnel in its roots: a path of red roses ending in a heart-shaped arch,
// hidden until the ending. [x, z] from the tunnel's far end to the arch.
export const rosePath = { from: [-0.3, -13.8], to: [-0.3, -24], arch: [-0.3, -24.4] }

// The walkable garden, about 30 by 25 m, closed by a tall hedge: [x0, z0, x1, z1] along its middle, height and
// thickness. Hedges and bushes are dense volumes of leaves, solid to walk into.
export const hedges = [
  [-17, -16, -2, -16, 3, 1.2], [1.4, -16, 12.5, -16, 3, 1.2], [-17, 9, 12.5, 9, 3, 1.2], [-17, -16, -17, 9, 3, 1.2], [12.5, -16, 12.5, 9, 3, 1.2],
]

// Flower bushes, [x, z]. They sway and hum once the third layer wakes.
export const bushes = [
  [-2.2, 7.6], [-5.2, 7.4], [-7.2, 7.4], [-15.8, 7.4], [2.4, 7.8], [6.8, 7.6], [11.2, 7.4], [5.2, 0.9], [8.8, 1],
  [11.2, -7.6], [3, -9.4], [6.8, -14.6], [11.2, -14.4], [-3.6, -11.6], [-1.6, -14.8], [-15.4, -14.6],
]

// The three gears, collectable in any order. Each wakes its own layer of the world.
// Props Fries takes in his hands. Each is for one size (`by`) and one clip; before the clip Fries walks to the
// `stand` point (his feet) and turns to face `rot`, so that his palm meets the prop at the contact time in
// docs/fries_hand_contacts.json: stand = prop - palm offset in the clip, turned to `rot` and scaled to his size
// (small 0.18, big 2.6). `grip` (metres at scale 1, in the hand bone's frame) sets the prop in the palm.

// The three gears, collectable in any order. Each wakes its own layer of the world, and once picked up flies
// to the watch. Each rests where the palm comes at contact: the pick_up palm stops 2.2 cm above the ground for
// a small Fries, so gears 1 and 2 hang just off it in the frozen air.
export const gears = [
  { // under the long table
    pos: [0.1, 0.022, -2.2], layer: 'tea', line: 'GR-01', hints: ['EX-01', 'EX-02', 'EX-03'],
    by: 'small', clip: 'pick_up', stand: [0.055, 0, -2.203], rot: 90, grip: [-0.004, -0.03, 0.072],
  },
  { // in the grotto under the fountain's basin
    pos: [6.7, 0.022, -3], layer: 'syrup', line: 'GR-02', hints: ['EX-04', 'EX-05', 'EX-06'],
    by: 'small', clip: 'pick_up', stand: [6.655, 0, -3.003], rot: 90, grip: [-0.004, -0.03, 0.072],
  },
  { // on the crown of the hat rack's top hat, where a big Fries on the terrace reaches
    pos: [-6.5, 3.206, -5.778], layer: 'flowers', line: 'GR-03', hints: ['EX-07', 'EX-08', 'EX-09'],
    by: 'big', clip: 'reach', stand: [-6.674, 1.2, -4.715], rot: 180, grip: [0, 0.05, 0.007],
  },
]

// Things that change Fries's size into `becomes`. The drink clip holds them at his waist from its start, so
// each flies the short way into his left hand, goes to his mouth and flies back to its place at the end.
export const drinks = [
  {
    model: 'pink_teacup', pos: [-0.95, 0.76, -5.6], becomes: 'small', label: 'Drink the pink tea', onTable: true,
    by: 'normal', clip: 'drink', stand: [-1.45, 0, -5.557], rot: 90, grip: [-0.008, 0.045, 0.003],
  },
  {
    model: 'blue_teacup', pos: [-0.95, 0.76, -4.45], becomes: 'big', label: 'Drink the blue tea', onTable: true,
    by: 'normal', clip: 'drink', stand: [-1.45, 0, -4.407], rot: 90, grip: [-0.008, 0.045, 0.003],
  },
  {
    model: 'cake', pos: [1.6, 0, 2.6], becomes: 'normal', label: 'Eat the cake',
    by: 'small', clip: 'drink', stand: [1.6, 0, 2.5], rot: 0, grip: [-0.008, 0.045, 0.003],
  },
  {
    model: 'cake', pos: [3.4, 0, -1.6], becomes: 'normal', label: 'Eat the cake',
    by: 'small', clip: 'drink', stand: [3.3, 0, -1.6], rot: 90, grip: [-0.008, 0.045, 0.003],
  },
  {
    model: 'cake', pos: [-7.6, 1.2, 2.9], becomes: 'normal', label: 'Eat the cake',
    by: 'big', clip: 'drink', stand: [-7.6, 1.2, 1.95], rot: 0, grip: [-0.008, 0.045, 0.003],
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
  { pos: [-0.3, 2.35, -10.2], rot: 0 }, // over the tree door
  { pos: [-3.2, 2.4, -11], rot: 30 },
  { pos: [3.1, 2.5, -11.4], rot: -25 },
  { pos: [-5, 2.6, -12.5], rot: 60 },
]

// Lanterns hanging from the big tree's branches on chains: [x, y, z] of each lantern's foot.
export const lanterns = [
  [-2, 2.2, -10.3], [1.8, 2.3, -10.6], [-4.2, 2.5, -12], [4.4, 2.4, -12.2], [-6, 2.7, -12.4], [5.6, 2.6, -11.6],
  [0.8, 2.6, -14.2], [-2.6, 2.5, -14.6],
]

// Floating things drift inside these boxes, at about their real size. Each gear found adds another batch of
// `perGear` of each kind.
export const floating = {
  perGear: { teacup: 14, hat: 5, spoon: 8, plate: 6, pocket_watch: 3 },
  clouds: [
    { center: [0, 2.4, -3.5], size: [4.6, 2, 10] },
    { center: [7, 2.4, -3], size: [5, 2, 5] },
    { center: [-8.4, 3.4, -1.6], size: [3, 1.6, 6] },
    { center: [3.4, 2.6, -10.5], size: [3, 1.6, 4] },
    { center: [0, 2.2, 5.2], size: [6, 1.4, 4] },
  ],
}

// Places the voice barks listen for, as circles on the ground: [x, z] and radius.
export const zones = {
  table: { pos: [0, -3.5], r: 6.5 },
  tray: { pos: [-1.2, -5], r: 1.4 },
  hareChair: { pos: [2.4, -7.4], r: 0.9 },
  dormouse: { pos: [0, -9], r: 1.6 },
  cottage: { pos: [-8, -2], r: 4.5 },
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
    { from: [-0.45, 0.99, -5.42], to: [-0.95, 0.84, -5.6], height: 0.08 },
    { from: [-0.45, 0.99, -4.92], to: [-0.95, 0.84, -4.45], height: 0.07 },
    { from: [0.49, 0.87, -2.6], to: [0.45, 0.83, -2.2], height: 0.18 },
    { from: [-0.39, 0.87, 0.2], to: [-0.45, 0.83, -0.1], height: 0.16 },
  ],
  // Syrup frozen in arcs from the fountain's bowl into its basin, and golden drops hanging round it
  syrupArcs: [
    { from: [7.6, 2.5, -3], to: [8.15, 0.87, -3], height: 0.25 },
    { from: [6.4, 2.5, -3], to: [5.85, 0.87, -3], height: 0.25 },
    { from: [7, 2.5, -2.4], to: [7, 0.87, -1.85], height: 0.25 },
    { from: [7, 2.5, -3.6], to: [7, 0.87, -4.15], height: 0.25 },
  ],
  syrupDrops: { center: [7, 1.7, -3], size: [4.4, 2, 4.4], count: 70 },
  petals: { center: [0, 2.2, -4], size: [12, 3.4, 14], count: 240 },
  butterflies: { center: [7, 0.97, -3], perch: 1.4, radius: 3.5, count: 14 }, // perched round the basin rim
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

// The lawn and its flowers (see src/fields.js). Grass grows over `lawn` [x0, z0, x1, z1] except on the `bare`
// rectangles (terrace, fountain basin, tree, under the table) and the paths (`pathWidth` wide); flowers bloom in
// bands along the paths, in the `drifts` [x, z, radius] and in loose patches. The land is flat over `plateau` and
// falls away beyond it. The WebGL fallback gets a third of the grass and half the flowers.
export const meadow = {
  plateau: [-36, -31, 36, 29],
  lawn: [-16.4, -15.4, 11.9, 8.4],
  bare: [[-16, -8, -6, 4], [4, -6, 10, 0], [-1.8, -13.8, 1.8, -10.2], [-0.85, -8.6, 0.85, 1.6]],
  pathWidth: 0.8,
  drifts: [
    [-3.4, 5.6, 1.6], [-5.3, 2.6, 1.4], [-9.6, 6.4, 1.8], [-13.4, 6.6, 1.8], [3.6, 5.4, 1.6], [6.6, 3, 1.6], [9.8, 5.8, 1.8],
    [11.1, 2, 1.4], [11.1, -3, 1.4], [4.6, -8.4, 1.6], [8.6, -8.6, 1.6], [5.6, -12.4, 1.8], [9.8, -12.2, 1.8], [-4.4, -9.6, 1.4],
    [-8.6, -10.2, 1.6], [-12.8, -10.4, 1.6], [-6.4, -13.6, 1.8], [-10.8, -14, 1.8], [-14.8, -12.4, 1.6], [-4.8, -6.4, 1.2],
  ],
  grassPerSquareMetre: 30,
  flowersPerSquareMetre: 22,
}
