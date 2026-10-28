//@ world/grid — Town tile grid, houses, THEIR lairs under the town, buildings and rooms
//@ Defines: TOWN_H, tset, fill, box, WALLISH, OUTDOOR, VOIDISH, HOUSE_DEFS, HOUSE_OF, HOUSE_DOOR, LAIR_Z0, LAIR_MAPS, LAIR_OF, LAIRS, STATION_Z0, STATION_MAP, …
//@ Uses:    —
//@ (header made by tools/map.js; stripped by build.py)
// ───────────────────────── the town grid ─────────────────────────
// One tile = one metre. x grows east, z grows south. Buildings are drawn with
// small helpers so the layout reads like a floor plan.
const W = 62,
  TOWN_H = 34,
  H = 72; // the town, then THEIR places under it, then the police cells under those
const tiles = new Array(W * H).fill(',');
const I = (x, z) => z * W + x;
const inb = (x, z) => x >= 0 && z >= 0 && x < W && z < H;
const tget = (x, z) => (inb(x, z) ? tiles[I(x, z)] : ' ');
function tset(x, z, c) {
  if (inb(x, z)) tiles[I(x, z)] = c;
}
function fill(x0, z0, x1, z1, c) {
  for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) tset(x, z, c);
}
function box(x0, z0, x1, z1, f) {
  fill(x0, z0, x1, z1, '#');
  fill(x0 + 1, z0 + 1, x1 - 1, z1 - 1, f);
}
const hl = (z, x0, x1, c = '#') => fill(x0, z, x1, z, c);
const vl = (x, z0, z1, c = '#') => fill(x, z0, x, z1, c);

const WALLISH = new Set(['#', 'W', 'D', 'L']);
const OUTDOOR = new Set([',', '-', '=', 'a', 'p']);
const VOIDISH = new Set(['X', 'q']); // nothing to stand on: the dark between places, and water
const isWallish = (x, z) => WALLISH.has(tget(x, z));
const isOutdoor = (x, z) => OUTDOOR.has(tget(x, z));

// where everyone lives: Pell's Row on the shop side of Main street, Mill Row across from it. Doors are locked to all but the owner.
const HOUSE_DEFS = [
  { id: 'vic', x0: 45, row: 'N', name: 'Vic’s flat' },
  { id: 'hale', x0: 49, row: 'N', name: 'Mr. Hale’s flat' },
  { id: 'denise', x0: 53, row: 'N', name: 'Denise’s flat' },
  { id: 'martin', x0: 57, row: 'N', name: 'Martin’s flat' },
  { id: 'priya', x0: 46, row: 'S', name: 'Priya’s house' },
  { id: 'earl', x0: 50, row: 'S', name: 'Earl’s house' },
  { id: 'joanne', x0: 54, row: 'S', name: 'Joanne’s house' },
  { id: 'ray', x0: 42, row: 'S', name: 'Ray’s house' },
];
for (const h of HOUSE_DEFS) {
  const N = h.row === 'N';
  h.z0 = N ? 4 : 19;
  h.z1 = N ? 12 : 27;
  h.door = [h.x0 + 2, N ? 12 : 19];
  h.out = [h.x0 + 2, N ? 13 : 18];
  h.spot = [h.x0 + 2, N ? 8 : 23];
  h.window = [h.x0 + 1, N ? 11 : 20];
  h.key = 'h_' + h.id;
}
const HOUSE_OF = Object.fromEntries(HOUSE_DEFS.map((h) => [h.id, h]));
const HOUSE_DOOR = Object.fromEntries(HOUSE_DEFS.map((h) => [h.door[0] + ',' + h.door[1], h.id]));
(function buildTown() {
  fill(0, 0, W - 1, H - 1, ',');
  hl(13, 0, W - 1, '-');
  fill(0, 14, W - 1, 17, '=');
  hl(18, 0, W - 1, '-');
  fill(26, 0, 29, 12, 'a'); // the alley
  vl(33, 19, 31, 'p');
  hl(26, 26, 41, 'p'); // park paths

  // Meridian Records (office)
  box(1, 1, 25, 12, '.');
  // the rooms along the back are three tiles deep, so the hall in front of their doors is two wide all the way along
  hl(5, 1, 25);
  vl(8, 1, 5);
  vl(12, 1, 5);
  vl(16, 1, 5);
  fill(2, 2, 7, 4, 'w');
  fill(9, 2, 11, 4, 't');
  fill(13, 2, 15, 4, 'c');
  fill(17, 2, 24, 4, 'o');
  tset(5, 5, 'D');
  tset(10, 5, 'D');
  tset(14, 5, 'D');
  tset(20, 5, 'O');
  tset(21, 5, 'O'); // open archway: floor, but a room boundary
  tset(13, 12, 'D');
  tset(14, 12, 'D'); // the front: a pair of glass doors
  for (const x of [3, 4, 5, 6, 9, 10, 11, 15, 16, 17, 20, 21, 22, 23]) tset(x, 12, 'W');
  for (const x of [4, 5, 10, 19, 21, 23]) tset(x, 1, 'W');
  for (const z of [8, 9, 10]) {
    tset(1, z, 'W');
    tset(25, z, 'W');
  }

  // Pell's Market (shop)
  box(30, 3, 43, 12, 'k');
  hl(7, 39, 43);
  vl(39, 7, 12);
  fill(40, 8, 42, 11, 'c');
  tset(39, 9, 'D');
  tset(35, 12, 'D');
  tset(36, 12, 'D'); // a pair of glass doors
  for (const x of [31, 32, 33, 37, 38]) tset(x, 12, 'W');
  tset(30, 5, 'W');
  tset(30, 6, 'W');

  // Larkspur Court (apartments)
  box(2, 19, 23, 32, 'r');
  vl(11, 19, 32);
  vl(14, 19, 32);
  fill(3, 20, 10, 25, 'w');
  hl(26, 2, 11);
  fill(3, 27, 6, 31, 't');
  vl(7, 26, 32);
  fill(8, 27, 10, 31, 'w');
  tset(11, 22, 'D');
  tset(5, 26, 'D');
  tset(9, 26, 'D');
  tset(12, 19, 'D');
  tset(13, 19, 'D'); // the street door is a pair
  for (const x of [4, 5, 8, 9]) tset(x, 19, 'W');
  tset(2, 22, 'W');
  tset(2, 23, 'W');
  tset(9, 32, 'W');
  fill(15, 20, 22, 25, 'w');
  hl(26, 14, 23);
  fill(15, 27, 18, 31, 'w');
  vl(19, 26, 32);
  fill(20, 27, 22, 31, 't');
  tset(14, 23, 'L');
  tset(17, 26, 'D');
  tset(21, 26, 'D');
  for (const x of [16, 17, 20, 21]) tset(x, 19, 'W');
  tset(23, 22, 'W');
  tset(23, 23, 'W');

  // Pell's Row and Mill Row: narrow homes, a door and two windows on the street each
  for (const h of HOUSE_DEFS) {
    box(h.x0, h.z0, h.x0 + 4, h.z1, 'w');
    tset(h.door[0], h.door[1], 'L');
    tset(h.x0 + 1, h.door[1], 'W');
    tset(h.x0 + 3, h.door[1], 'W');
  }
  for (const h of HOUSE_DEFS) tset(h.x0 + 2, h.row === 'N' ? h.z0 : h.z1, 'W');
})();

// ───────────────────────── under Wexley: THEIR places ─────────────────────────
// Three sealed levels south of the town, where no street goes: the craft, the drains, the nest. Each is drawn and lit by
// the same machinery as the town (one tile = one metre), but nothing up top can walk, see or path into them.
// Legend: X nothing · # wall · . floor · ~ water · D door · anything else marks a thing standing on the floor.
const LAIR_Z0 = TOWN_H + 2;
const LAIR_MAPS = {
  ship: {
    x0: 0,
    floor: 'h',
    rows: [
      'XX################XX',
      'XX#..............#XX',
      'XX#....HHHH......#XX',
      'XX#....HHHH......#XX',
      'XX#..............#XX',
      '#########DD#########',
      '#..................#',
      '#..................#',
      '#..####D#########..#',
      '#..#c.....#k.k.k#..#',
      '#..#......#.....#..#',
      '#..#..T...#.....#..#',
      '#..#..@...#.....D..#',
      '#..#......#.....#..#',
      '#..#......#.....#..#',
      '#..#j.....#k.k.k#..#',
      '#..##############..#',
      '#..................#',
      '#..................#',
      '#############DD#####',
      'XXXX#..........#XXXX',
      'XXXX#..........#XXXX',
      'XXXX#..........#XXXX',
      'XXXX#..........#XXXX',
      'XXXX#.p..p..p..#XXXX',
      'XXXX############XXXX',
    ],
  },
  sewer: {
    x0: 21,
    floor: 'e',
    rows: [
      '####################',
      '#.......#.......#.S#',
      '#.#######.~..####.##',
      '#.gg..gg#.~.......##',
      '#.g....g#.~.##.#####',
      '#...CC....~.##.#####',
      '#.......#......#####',
      '#.g....g#.~.##.#####',
      '#.gg..gg#.~.##.....#',
      '#.#######.~.######.#',
      '#....####.~.######.#',
      '####.####.~.######.#',
      '#.........~........#',
      '#~~~~~.~~~~~~~.~~~~#',
      '#..................#',
      '####.##.###.####...#',
      '#.##.##.###.####...#',
      '#.##.#....#.######.#',
      '#.....###.#.#...gg##',
      '#.....###.#.#....g##',
      '#..@..#.#......C..##',
      '#.....#.#.###..C..##',
      '#.#####.#.###g...g##',
      '#.#####.#...#gg.gg##',
      '#.#####.############',
      '#.......############',
      '####################',
    ],
  },
  den: {
    x0: 42,
    floor: 'n',
    rows: [
      '####################',
      '###############*####',
      '###############.####',
      '#######...#####.####',
      '#####........##.####',
      '####............####',
      '####..B.......######',
      '#####........#######',
      '######.####..#######',
      '####...####...######',
      '##..B..####..J.#####',
      '#J.....#####.......#',
      '#..B...#####.....J.#',
      '#......#####.......#',
      '##B....######.J...##',
      '###...#######...####',
      '####..#######..#####',
      '#####..#####..######',
      '######.N.....N.#####',
      '#####...........####',
      '####.N....@...N.####',
      '####............####',
      '#####..N....N.J#####',
      '######........######',
      '########....########',
    ],
  },
};
const LAIR_OF = { aliens: 'ship', lizards: 'sewer', zombies: 'den' };
const LAIRS = {};
(function buildLairs() {
  fill(0, TOWN_H, W - 1, H - 1, 'X');
  for (const [k, L] of Object.entries(LAIR_MAPS)) {
    const mk = {},
      rows = L.rows,
      x1 = L.x0 + rows[0].length - 1,
      z1 = LAIR_Z0 + rows.length - 1;
    rows.forEach((row, lz) => {
      for (let lx = 0; lx < row.length; lx++) {
        const ch = row[lx],
          x = L.x0 + lx,
          z = LAIR_Z0 + lz;
        tset(x, z, ch === 'X' ? 'X' : ch === '#' ? '#' : ch === '~' ? 'q' : ch === 'D' ? 'D' : L.floor);
        if (!'X#.~D'.includes(ch)) (mk[ch] || (mk[ch] = [])).push([x, z]);
      }
    });
    // solid rock is only the dark: a wall with no open floor anywhere round it isn't built at all
    const open = (x, z) => {
      const c = tget(x, z);
      return c !== '#' && c !== 'X' && c !== ' ';
    };
    const kill = [];
    for (let z = LAIR_Z0; z <= z1; z++)
      for (let x = L.x0; x <= x1; x++) {
        if (tget(x, z) !== '#') continue;
        let near = false;
        for (let dz = -1; dz <= 1 && !near; dz++)
          for (let dx = -1; dx <= 1; dx++)
            if ((dx || dz) && open(x + dx, z + dz)) {
              near = true;
              break;
            }
        if (!near) kill.push([x, z]);
      }
    for (const [x, z] of kill) tset(x, z, 'X');
    LAIRS[k] = {
      key: k,
      x0: L.x0,
      z0: LAIR_Z0,
      x1,
      z1,
      mk,
      at: (ch) => mk[ch] || [],
      L: (lx, lz) => [L.x0 + lx, LAIR_Z0 + lz],
    };
  }
})();
// ───────────────────────── the police cells ─────────────────────────
// Below THEIR places and sealed off the same way: nobody walks here. While you're held, the hours go by in here
// (town/cell.js). Three barred cells along the back wall, each with a window high up; the corridor in front of them;
// the booking corner at the end, with the height chart. The bars stand on the line between the cells and the corridor.
// Legend: # wall · W window · c a cell's concrete · o the corridor's tiles.
const STATION_Z0 = LAIR_Z0 + 28;
const STATION_MAP = [
  '###W#####W#####W##########',
  '#ccccc#ccccc#ccccc#oooooo#',
  '#ccccc#ccccc#ccccc#oooooo#',
  '#ccccc#ccccc#ccccc#oooooo#',
  '#oooooooooooooooooooooooo#',
  '#oooooooooooooooooooooooo#',
  '#oooooooooooooooooooooooo#',
  '##########################',
];
STATION_MAP.forEach((row, lz) => {
  for (let lx = 0; lx < row.length; lx++) tset(lx, STATION_Z0 + lz, row[lx]);
});
const SZ = (lx, lz) => [lx, STATION_Z0 + lz];
const STATION = { x0: 0, z0: STATION_Z0, x1: STATION_MAP[0].length - 1, z1: STATION_Z0 + STATION_MAP.length - 1 };

const lairAt = (x, z) => {
  if (z < LAIR_Z0) return null;
  for (const k in LAIRS) {
    const L = LAIRS[k];
    if (x >= L.x0 && x <= L.x1 + 0.999 && z >= L.z0 && z <= L.z1 + 0.999) return L;
  }
  return null;
};
const LZ = (k, lx, lz) => LAIRS[k].L(lx, lz);

const BUILDINGS = [
  { id: 'office', name: 'Meridian Records', x0: 1, z0: 1, x1: 25, z1: 12, ext: 0x6c6f6b, mat: 'brick' },
  { id: 'shop', name: "Pell's Market", x0: 30, z0: 3, x1: 43, z1: 12, ext: 0x6b3b31, mat: 'brick' },
  { id: 'apt', name: 'Larkspur Court', x0: 2, z0: 19, x1: 23, z1: 32, ext: 0x5b4a41, mat: 'brick' },
  { id: 'row', name: 'Pell’s Row', x0: 45, z0: 4, x1: 61, z1: 12, ext: 0x5d4636, mat: 'siding' },
  { id: 'mill', name: 'Mill Row', x0: 42, z0: 19, x1: 58, z1: 27, ext: 0x4f5249, mat: 'siding' },
];
function buildingAt(x, z) {
  for (const b of BUILDINGS) if (x >= b.x0 && x <= b.x1 && z >= b.z0 && z <= b.z1) return b;
  return null;
}

// rooms: flood-filled regions of indoor floor, named by a sample tile
const ROOM_DEFS = [
  { key: 'open', name: 'Open office', at: [12, 9], wall: 0x8a907c, bld: 'office', mat: 'wainscot' },
  { key: 'boss', name: "Mr. Hale's office", at: [4, 4], wall: 0x7c6a56, bld: 'office', mat: 'stripe' },
  { key: 'wc', name: 'Office restroom', at: [10, 3], wall: 0x84a097, bld: 'office', private: true, mat: 'walltile' },
  { key: 'closet', name: 'Supply closet', at: [14, 4], wall: 0x5d5e58, bld: 'office', private: true, mat: 'paint' },
  { key: 'break', name: 'Break room', at: [19, 4], wall: 0x958c6b, bld: 'office', mat: 'paint' },
  { key: 'shop', name: "Pell's Market", at: [35, 8], wall: 0x9ca199, bld: 'shop', mat: 'shoptile' },
  { key: 'store', name: 'Stockroom', at: [41, 9], wall: 0x6b665c, bld: 'shop', private: true, mat: 'paint' },
  { key: 'hall', name: 'Stairwell', at: [12, 25], wall: 0x6d5c49, bld: 'apt', mat: 'wainscot' },
  { key: 'living', name: 'Your flat', at: [8, 22], wall: 0x847552, bld: 'apt', home: true, mat: 'stripe' },
  {
    key: 'bath',
    name: 'Your bathroom',
    at: [4, 29],
    wall: 0x6b8985,
    bld: 'apt',
    home: true,
    private: true,
    mat: 'walltile',
  },
  { key: 'bed', name: 'Your bedroom', at: [9, 29], wall: 0x6b657f, bld: 'apt', home: true, mat: 'floral' },
  { key: 'agnes', name: "Agnes's flat", at: [18, 22], wall: 0x7a5b59, bld: 'apt', agnes: true, mat: 'damask' },
  { key: 'agnesbed', name: "Agnes's bedroom", at: [16, 29], wall: 0x6d5961, bld: 'apt', agnes: true, mat: 'floral' },
  {
    key: 'agnesbath',
    name: "Agnes's bathroom",
    at: [21, 29],
    wall: 0x69807b,
    bld: 'apt',
    agnes: true,
    private: true,
    mat: 'walltile',
  },
];
const HOUSE_WALLS = [0x7a6a52, 0x6a5f74, 0x7d5a4a, 0x5c6a5a, 0x7a6f5c, 0x6b5b4b, 0x5f6b72, 0x6e6450];
const HOUSE_MATS = ['stripe', 'floral', 'damask', 'paint', 'floral', 'stripe', 'wainscot', 'damask'];
HOUSE_DEFS.forEach((h, i) =>
  ROOM_DEFS.push({
    key: h.key,
    name: h.name,
    at: h.spot,
    wall: HOUSE_WALLS[i],
    bld: h.row === 'N' ? 'row' : 'mill',
    house: h.id,
    private: true,
    mat: HOUSE_MATS[i],
  }),
);

// THEIR places have rooms too, so their walls take a colour and a finish like anyone's
ROOM_DEFS.push(
  {
    key: 'lxPlan',
    name: 'Somewhere bright',
    at: LZ('ship', 5, 2),
    wall: 0xa3aeac,
    bld: 'lair',
    lair: 'ship',
    mat: 'hull',
  },
  {
    key: 'lxHall',
    name: 'Somewhere humming',
    at: LZ('ship', 1, 7),
    wall: 0x6f7e84,
    bld: 'lair',
    lair: 'ship',
    mat: 'hull',
  },
  {
    key: 'lxLab',
    name: 'Somewhere cold',
    at: LZ('ship', 5, 10),
    wall: 0xbfc8c4,
    bld: 'lair',
    lair: 'ship',
    mat: 'hull',
  },
  {
    key: 'lxTanks',
    name: 'Somewhere wet',
    at: LZ('ship', 12, 11),
    wall: 0x5b807b,
    bld: 'lair',
    lair: 'ship',
    mat: 'hull',
  },
  {
    key: 'lxPods',
    name: 'Somewhere red',
    at: LZ('ship', 8, 21),
    wall: 0x6e5a58,
    bld: 'lair',
    lair: 'ship',
    mat: 'hull',
  },
  {
    key: 'lxSewer',
    name: 'Under Wexley',
    at: LZ('sewer', 1, 1),
    wall: 0x6e5644,
    bld: 'lair',
    lair: 'sewer',
    mat: 'sewer',
  },
  { key: 'lxDen', name: 'The nest', at: LZ('den', 10, 19), wall: 0x56432f, bld: 'lair', lair: 'den', mat: 'flesh' },
  { key: 'station', name: 'The cells', at: SZ(9, 5), wall: 0x5d6862, bld: 'station', mat: 'brick' },
);

const roomOf = new Int16Array(W * H).fill(-1);
const ROOMS = [];
(function floodRooms() {
  for (const def of ROOM_DEFS) {
    const id = ROOMS.length;
    const r = Object.assign({ id, cells: [] }, def);
    ROOMS.push(r);
    const st = [def.at];
    while (st.length) {
      const [x, z] = st.pop();
      if (!inb(x, z) || roomOf[I(x, z)] >= 0 || isWallish(x, z) || isOutdoor(x, z) || tget(x, z) === 'O') continue;
      roomOf[I(x, z)] = id;
      r.cells.push([x, z]);
      st.push([x + 1, z], [x - 1, z], [x, z + 1], [x, z - 1]);
    }
  }
  const br = ROOMS.find((r) => r.key === 'break');
  for (let i = 0; i < W * H; i++) if (tiles[i] === 'O') roomOf[i] = br.id;
})();
const roomAt = (x, z) => {
  x = Math.floor(x);
  z = Math.floor(z);
  if (!inb(x, z)) return null;
  const r = roomOf[I(x, z)];
  return r >= 0 ? ROOMS[r] : null;
};
const roomByKey = (k) => ROOMS.find((r) => r.key === k);
