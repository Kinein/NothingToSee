//@ gfx/world-geometry — Walls, floors, materials and windows built from the grid
//@ Defines: COL, MAT, XM, FLOOR_MAT, PRODUCTS, FLOOR, sideCell, floorColor, solidAt, aoAt, buildFloor, WALL_H, WT, wallFaceColor, wallFaceMat, buildWalls, …
//@ Uses:    world/grid, core/util, world/objects, game/loop, gfx/gl, gfx/post, gfx/lair-dressing
//@ (header made by tools/map.js; stripped by build.py)
// ───────────────────────── world geometry ─────────────────────────
const C = hex;
const COL = {
  wood: C(0x5a4030),
  woodD: C(0x382820),
  woodL: C(0x7b5b40),
  metal: C(0x868a8c),
  metalD: C(0x43464a),
  black: C(0x18191b),
  white: C(0xc4c1b6),
  porcelain: C(0xd2d0c6),
  plastic: C(0xb2ab97),
  beige: C(0xa59a80),
  fabric: C(0x4b5460),
  cream: C(0xc8bfa4),
  screen: C(0x5fbfa0),
  glass: C(0x26353f),
  green: C(0x2e4a2c),
  red: C(0x7a2a24),
  brass: C(0x9a7a3c),
  linen: C(0xb6b0a2),
  card: C(0x87683f),
};
// surface materials, drawn by the shader (see matApply); ext.y = 2 + id
const MAT = {
  stripe: 1,
  damask: 2,
  wainscot: 3,
  walltile: 4,
  brick: 5,
  siding: 6,
  paint: 7,
  shoptile: 8,
  floral: 9,
  plank: 10,
  carpet: 11,
  tile: 12,
  concrete: 13,
  asphalt: 14,
  grass: 15,
  gravel: 16,
  pave: 17,
  runner: 18,
  smalltile: 19,
  wood: 20,
  fabric: 21,
  metal: 22,
  tiles: 23,
  print: 24,
  cork: 25,
  screen: 26,
};
const XM = (m, emit = 0) => [emit, 2 + MAT[m], -1, -1];
const FLOOR_MAT = {
  ',': 'grass',
  '-': 'pave',
  '=': 'asphalt',
  a: 'concrete',
  p: 'gravel',
  '.': 'carpet',
  o: 'tile',
  O: 'tile',
  k: 'tile',
  t: 'smalltile',
  w: 'plank',
  c: 'concrete',
  r: 'runner',
};
const PRODUCTS = [
  0x8a3a2a, 0x2f5a7a, 0xa88a3a, 0x3a6a3a, 0x7a2a5a, 0xb0a080, 0x4a4a8a, 0xa05a2a, 0xc0b8a0, 0x2a2a2a,
].map(C);

// floors
const FLOOR = {
  ',': [0x232b20, 0x2b3226],
  '-': [0x5a5955, 0x4d4c48],
  '=': [0x222428, 0x1e2024],
  a: [0x202120, 0x191a19],
  p: [0x4d4a3e, 0x433f35],
  '.': [0x3c4745, 0x37413f],
  o: [0x86826f, 0x5c594b],
  O: [0x86826f, 0x5c594b],
  k: [0x9ca19a, 0x7c827d],
  t: [0xa0a49a, 0x8b9087],
  w: [0x5a4230, 0x47331f],
  c: [0x494844, 0x42413d],
  r: [0x4b2323, 0x3a1b1b],
};
function sideCell(qx, qz) {
  // the walkable tile that a point inside (or next to) a wall belongs to
  const x = Math.floor(qx),
    z = Math.floor(qz);
  if (inb(x, z) && !WALLISH.has(tiles[I(x, z)])) return [x, z];
  const dx = qx - x > 0.5 ? 1 : -1,
    dz = qz - z > 0.5 ? 1 : -1;
  for (const [cx, cz] of [
    [x + dx, z],
    [x, z + dz],
    [x + dx, z + dz],
    [x - dx, z],
    [x, z - dz],
  ])
    if (inb(cx, cz) && !WALLISH.has(tiles[I(cx, cz)])) return [cx, cz];
  return [x, z];
}
function floorColor(ch, x, z, qx, qz) {
  const f = FLOOR[ch] || FLOOR.c;
  let col;
  if (ch === 'o' || ch === 'O' || ch === 'k') col = (x + z) & 1 ? C(f[1]) : C(f[0]);
  else if (ch === 't') col = (x * 2 + qx + z * 2 + qz) & 1 ? C(f[1]) : C(f[0]);
  else if (ch === 'w')
    col = mix3(C(f[0]), C(f[1]), 0.35 + 0.2 * hash2(x, z, 7)); // the boards themselves are drawn by the shader
  else if (ch === 'r') {
    const edge = isWallish(x - 1, z) || isWallish(x + 1, z);
    col = edge ? mul3(C(f[0]), 0.82) : C(f[0]);
  } else col = mix3(C(f[0]), C(f[1]), hash2(x, z, 3));
  return mul3(col, 1 + (hash2(x * 2 + qx, z * 2 + qz, 11) - 0.5) * 0.09);
}
function solidAt(px, pz) {
  const x = Math.floor(px),
    z = Math.floor(pz);
  if (!inb(x, z)) return 0;
  const i = I(x, z),
    c = tiles[i];
  if (c === '#' || c === 'W') return 1;
  if (c === 'D' || c === 'L') return 0.4;
  if (blockAt[i]) {
    const o = OBJ[objAt[i]];
    return o && o.t.thin ? 0.15 : 0.5;
  }
  return 0;
}
function aoAt(px, pz) {
  let s = 0;
  for (const [ox, oz] of [
    [-0.28, -0.28],
    [0.28, -0.28],
    [-0.28, 0.28],
    [0.28, 0.28],
  ])
    s += solidAt(px + ox, pz + oz);
  return 1 - 0.46 * (s / 4);
}

function buildFloor() {
  const g = new Geo();
  for (let z = 0; z < H; z++)
    for (let x = 0; x < W; x++) {
      const tc = tiles[I(x, z)];
      if (tc === 'X') continue;
      if (tc === 'q') {
        lairWaterFloor(g, x, z);
        continue;
      }
      for (let qz = 0; qz < 2; qz++)
        for (let qx = 0; qx < 2; qx++) {
          const x0 = x + qx * 0.5,
            z0 = z + qz * 0.5,
            x1 = x0 + 0.5,
            z1 = z0 + 0.5;
          const [sx, sz] = sideCell(x0 + 0.25, z0 + 0.25);
          const ch = tiles[I(sx, sz)],
            col = floorColor(ch, sx, sz, qx, qz);
          const cols = [
            [x0, z0],
            [x0, z1],
            [x1, z1],
            [x1, z0],
          ].map(([px, pz]) => mul3(col, aoAt(px, pz)));
          g.quad(
            [x0, 0, z0],
            [x0, 0, z1],
            [x1, 0, z1],
            [x1, 0, z0],
            [0, 1, 0],
            null,
            FLOOR_MAT[ch] ? XM(FLOOR_MAT[ch]) : E0,
            cols,
          );
        }
    }
  // outer ground, lane paint, crossing, kerbs
  const dark = C(0x121417);
  g.quad([-40, -0.02, -40], [-40, -0.02, H + 40], [W + 40, -0.02, H + 40], [W + 40, -0.02, -40], [0, 1, 0], dark);
  const paint = C(0x857640),
    zebra = C(0x8a8880),
    kerb = C(0x6e6d68);
  for (let x = 0; x < W; x += 2)
    g.quad(
      [x + 0.2, 0.006, 15.93],
      [x + 0.2, 0.006, 16.07],
      [x + 1.1, 0.006, 16.07],
      [x + 1.1, 0.006, 15.93],
      [0, 1, 0],
      paint,
    );
  for (let k = 0; k < 6; k++) {
    const x0 = 11.3 + k * 0.62;
    g.quad(
      [x0, 0.007, 14.15],
      [x0, 0.007, 17.85],
      [x0 + 0.34, 0.007, 17.85],
      [x0 + 0.34, 0.007, 14.15],
      [0, 1, 0],
      zebra,
    );
  }
  g.box(0, 0, 13.9, W, 0.07, 14.0, kerb);
  g.box(0, 0, 18.0, W, 0.07, 18.1, kerb);
  // paving seams on the pavements
  const seam = C(0x302f2c);
  for (let z = 0; z < H; z++)
    for (let x = 0; x < W; x++) {
      if (tiles[I(x, z)] !== '-') continue;
      g.quad(
        [x - 0.012, 0.004, z],
        [x - 0.012, 0.004, z + 1],
        [x + 0.012, 0.004, z + 1],
        [x + 0.012, 0.004, z],
        [0, 1, 0],
        seam,
      );
      g.quad(
        [x, 0.004, z + 0.488],
        [x, 0.004, z + 0.512],
        [x + 1, 0.004, z + 0.512],
        [x + 1, 0.004, z + 0.488],
        [0, 1, 0],
        seam,
      );
    }
  // what the town drops: paper, flyers, leaves, a wrapper. Thicker in the alley and along the kerbs.
  const LITTER = [
    C(0xa29c8c),
    C(0x8c8676),
    C(0xb7b09e),
    C(0x6f6a5c),
    C(0x3b2a1b),
    C(0x4c3520),
    C(0x2f2418),
    C(0x6a2a24),
    C(0x2e3b47),
  ];
  for (let i = 0; i < 900; i++) {
    const px = hash2(i, 1, 41) * W,
      pz = hash2(i, 2, 43) * TOWN_H,
      tx = Math.floor(px),
      tz = Math.floor(pz),
      ti = I(tx, tz),
      ch = tiles[ti];
    if (!OUTDOOR.has(ch) || blockAt[ti]) continue;
    const kerbNear = Math.min(Math.abs(pz - 14.05), Math.abs(pz - 17.95)) < 0.55;
    const w = ch === 'a' ? 0.75 : ch === '-' ? 0.42 : ch === '=' ? (kerbNear ? 0.6 : 0.06) : ch === 'p' ? 0.3 : 0.12;
    if (hash2(i, 3, 47) > w) continue;
    const kind = hash2(i, 4, 53),
      rot = hash2(i, 5, 59) * Math.PI;
    const col = mul3(
      kind < 0.55
        ? LITTER[Math.floor(hash2(i, 6, 61) * 4)]
        : kind < 0.9
          ? LITTER[4 + Math.floor(hash2(i, 6, 61) * 3)]
          : LITTER[7 + Math.floor(hash2(i, 6, 61) * 2)],
      0.8 + hash2(i, 7, 67) * 0.3,
    );
    const sx = kind < 0.55 ? 0.09 + hash2(i, 8, 71) * 0.13 : 0.05 + hash2(i, 8, 71) * 0.05,
      sz = sx * (0.6 + hash2(i, 9, 73) * 0.5);
    const cs = Math.cos(rot),
      sn = Math.sin(rot),
      y = 0.008 + (i % 7) * 0.0006;
    const P = (a, b) => [px + a * cs - b * sn, y, pz + a * sn + b * cs];
    if (kind < 0.55 && hash2(i, 10, 79) < 0.25) {
      // a crumpled one
      g.xf(M4.mul(M4.trans(px, 0, pz), M4.rotY(rot)), () =>
        g.sphere(0, 0.035, 0, sx * 0.45, 0.04, sx * 0.4, 5, 3, col),
      );
    } else g.quad(P(-sx, -sz), P(-sx, sz), P(sx, sz), P(sx, -sz), [0, 1, 0], col);
  }
  return makeMesh(g);
}

// walls: thin slabs on a tile grid; every vertex carries its tile so the
// vertex shader can drop the walls standing between the camera and the view.
const WALL_H = 2.7,
  WT = 0.17;
function wallFaceColor(nx, ny, nz, fx, fz) {
  if (ny > 0.5 || ny < -0.5) return C(0x1b1c1f);
  const [cx, cz] = sideCell(fx + nx * 0.2, fz + nz * 0.2);
  let col;
  if (!inb(cx, cz)) col = C(0x333333);
  else if (OUTDOOR.has(tiles[I(cx, cz)])) {
    const b = buildingAt(Math.floor(fx - nx * 0.3), Math.floor(fz - nz * 0.3));
    col = C(b ? b.ext : 0x555555);
  } else {
    const r = roomAt(cx, cz);
    col = C(r ? r.wall : 0x6a6a6a);
  }
  return mul3(col, 1 + (hash2(Math.floor(fx * 2), Math.floor(fz * 2), 5) - 0.5) * 0.07);
}
// what each face is finished in: the room's paper or paint inside, the building's brick or boards outside
function wallFaceMat(nx, nz, fx, fz) {
  const [cx, cz] = sideCell(fx + nx * 0.2, fz + nz * 0.2);
  if (!inb(cx, cz)) return MAT.paint;
  if (OUTDOOR.has(tiles[I(cx, cz)])) {
    const b = buildingAt(Math.floor(fx - nx * 0.3), Math.floor(fz - nz * 0.3));
    return b && b.mat ? MAT[b.mat] : MAT.brick;
  }
  const r = roomAt(cx, cz);
  return r && r.mat ? MAT[r.mat] : MAT.paint;
}
// a wall's ext per face: its material on the sides, nothing on the cut top, always the tile it stands on (so the cut finds it)
const wallExt = (cx, cz) => (nx, ny, nz, fx, fz) => [
  0,
  ny > 0.5 || ny < -0.5 ? 0 : 2 + wallFaceMat(nx, nz, fx, fz),
  cx,
  cz,
];
function buildWalls() {
  const g = new Geo();
  g.ao = 0.58;
  g.aoH = 1.5;
  const frame = C(0x34363a),
    glassC = C(0x25343d);
  for (let z = 0; z < H; z++)
    for (let x = 0; x < W; x++) {
      const c = tiles[I(x, z)];
      if (!WALLISH.has(c)) continue;
      const e = wallExt(x + 0.5, z + 0.5),
        eg = [0, 1, x + 0.5, z + 0.5];
      const cx = x + 0.5,
        cz = z + 0.5;
      const cE = isWallish(x + 1, z),
        cW = isWallish(x - 1, z),
        cS = isWallish(x, z + 1),
        cN = isWallish(x, z - 1);
      const f = wallFaceColor;
      if (c === '#') {
        g.box(cx - WT, 0, cz - WT, cx + WT, WALL_H, cz + WT, f, e);
        if (cE) g.box(cx + WT, 0, cz - WT, x + 1, WALL_H, cz + WT, f, e);
        if (cW) g.box(x, 0, cz - WT, cx - WT, WALL_H, cz + WT, f, e);
        if (cS) g.box(cx - WT, 0, cz + WT, cx + WT, WALL_H, z + 1, f, e);
        if (cN) g.box(cx - WT, 0, z, cx + WT, WALL_H, cz - WT, f, e);
        continue;
      }
      const horiz = cE || cW;
      // span along the wall line
      const seg = (y0, y1, col, ee, thick) => {
        const t = thick || WT;
        if (horiz) g.box(x, y0, cz - t, x + 1, y1, cz + t, col, ee || e);
        else g.box(cx - t, y0, z, cx + t, y1, z + 1, col, ee || e);
      };
      const ep = [0, 0, x + 0.5, z + 0.5]; // frames and posts: plain paint, no paper
      const post = (along, y0, y1, col) => {
        // a narrow upright at position 'along' (0..1)
        if (horiz) g.box(x + along - 0.04, y0, cz - WT - 0.01, x + along + 0.04, y1, cz + WT + 0.01, col, ep);
        else g.box(cx - WT - 0.01, y0, z + along - 0.04, cx + WT + 0.01, y1, z + along + 0.04, col, ep);
      };
      if (c === 'W') {
        seg(0, 0.88, f);
        seg(2.15, WALL_H, f);
        seg(0.88, 0.93, frame, ep, WT + 0.03);
        seg(0.93, 2.15, glassC, eg, 0.025);
        post(0.04, 0.88, 2.15, frame);
        post(0.96, 0.88, 2.15, frame);
        post(0.5, 0.88, 2.15, frame);
      } else {
        seg(2.22, WALL_H, f, wallExt(x + 1000.5, z + 0.5)); // the lintel sinks away with the door when the wall is cut
        const dd = DOORS[doorAt[I(x, z)]];
        if (!dd || !dd.pairL) post(0.03, 0, 2.22, frame);
        if (!dd || !dd.pairR) post(0.97, 0, 2.22, frame);
      }
    }
  return makeMesh(g, { cut: 1 });
}
// the floor plan the cut walls leave behind: a threshold in every doorway (lit from inside, dark red where it's locked),
// a mat outside every door you can come in by from the street, and along each window a strip of glass that sits just
// below the sill line, hidden inside the wall until the wall is cut down past it
const EXT_DOORS = [];
for (const d of DOORS) {
  const [ax, az] = d.horiz ? [d.x, d.z - 1] : [d.x - 1, d.z],
    [bx, bz] = d.horiz ? [d.x, d.z + 1] : [d.x + 1, d.z];
  const oa = isOutdoor(ax, az),
    ob = isOutdoor(bx, bz);
  if (oa !== ob) EXT_DOORS.push({ d, out: oa ? [ax, az] : [bx, bz], dir: oa ? -1 : 1 });
}
function buildMarks() {
  const g = new Geo();
  const sill = C(0x8f8574),
    lockC = C(0x5e2420),
    glassC = C(0x7fa6b3),
    matC = C(0x221d19),
    matRim = C(0x5b4c3a);
  for (let z = 0; z < H; z++)
    for (let x = 0; x < W; x++) {
      const c = tiles[I(x, z)],
        cx = x + 0.5,
        cz = z + 0.5;
      if (c === 'D' || c === 'L' || c === 'O') {
        const horiz =
          c === 'O'
            ? isWallish(x - 1, z) || isWallish(x + 1, z) || tget(x - 1, z) === 'O' || tget(x + 1, z) === 'O'
            : DOORS[doorAt[I(x, z)]].horiz;
        const col = c === 'L' ? lockC : sill,
          e = [c === 'L' ? 0.05 : 0.18, 0, -1, -1];
        if (horiz) g.box(x, 0.004, cz - 0.21, x + 1, 0.018, cz + 0.21, col, e);
        else g.box(cx - 0.21, 0.004, z, cx + 0.21, 0.018, z + 1, col, e);
      } else if (c === 'W') {
        const horiz = isWallish(x - 1, z) || isWallish(x + 1, z);
        if (horiz) g.box(x + 0.06, 0.43, cz - 0.1, x + 0.94, 0.47, cz + 0.1, glassC, [0.22, 0, -1, -1]);
        else g.box(cx - 0.1, 0.43, z + 0.06, cx + 0.1, 0.47, z + 0.94, glassC, [0.22, 0, -1, -1]);
      }
    }
  for (const { d, out } of EXT_DOORS) {
    // the mat: in the doorway's own column, on the street side
    const [ox, oz] = out,
      x0 = d.pairL ? ox : ox + 0.14,
      x1 = d.pairR ? ox + 1 : ox + 0.86;
    if (d.horiz) {
      const z0 = oz < d.z ? oz + 0.38 : oz + 0.02,
        z1 = oz < d.z ? oz + 0.98 : oz + 0.62;
      g.box(x0, 0.003, z0, x1, 0.012, z1, matRim);
      g.box(x0 + (d.pairL ? 0 : 0.06), 0.004, z0 + 0.06, x1 - (d.pairR ? 0 : 0.06), 0.014, z1 - 0.06, matC);
    }
  }
  return makeMesh(g);
}
function buildDoors() {
  const out = [];
  for (const d of DOORS) {
    const g = new Geo();
    g.ao = 0.7;
    g.aoH = 1.2;
    if (d.lair) {
      lairDoorGeo(d, g);
      const m = makeMesh(g, { cut: 1 });
      m.door = d;
      out.push(m);
      continue;
    }
    const e = [0, 0, d.x + 1000.5, d.z + 0.5]; // +1000: a door sinks out of sight where the walls are cut
    const room =
      roomAt(d.x + (d.horiz ? 0 : 1), d.z + (d.horiz ? 1 : 0)) ||
      roomAt(d.x - (d.horiz ? 0 : 1), d.z - (d.horiz ? 1 : 0));
    let col = COL.woodL;
    if (d.locked) col = C(0x5a2a2a);
    else if (room && room.key === 'wc') col = C(0x7c8c86);
    else if (room && room.bld === 'shop') col = C(0x3d4b52);
    else if (room && room.bld === 'apt') col = C(0x4a3326);
    const glassDoor = d.shop || (d.z === 12 && (d.x === 13 || d.x === 14));
    if (glassDoor) {
      g.box(0.03, 0, -0.035, 0.9, 0.12, 0.035, col, e);
      g.box(0.03, 2.05, -0.035, 0.9, 2.17, 0.035, col, e);
      g.box(0.03, 0, -0.035, 0.1, 2.17, 0.035, col, e);
      g.box(0.83, 0, -0.035, 0.9, 2.17, 0.035, col, e);
      g.box(0.1, 0.12, -0.012, 0.83, 2.05, 0.012, COL.glass, [0, 1, d.x + 1000.5, d.z + 0.5]);
    } else {
      g.box(0.03, 0, -0.04, 0.9, 2.17, 0.04, col, e);
      g.box(0.1, 1.2, -0.045, 0.82, 1.21, 0.045, mul3(col, 0.8), e);
      g.box(0.1, 0.5, -0.045, 0.82, 0.51, 0.045, mul3(col, 0.8), e);
    }
    g.box(0.74, 0.98, -0.08, 0.8, 1.03, 0.08, COL.brass, e);
    const m = makeMesh(g, { cut: 1 });
    m.door = d;
    out.push(m);
  }
  return out;
}
function doorMatrix(d) {
  if (d.lair) return lairDoorMatrix(d);
  const sw = d.open * 1.45;
  if (d.horiz && d.mirror) return M4.mul(M4.trans(d.x + 0.94, 0, d.z + 0.5), M4.rotY(Math.PI - sw)); // the right-hand one of a pair
  if (d.horiz) return M4.mul(M4.trans(d.x + 0.06, 0, d.z + 0.5), M4.rotY(sw));
  return M4.mul(M4.trans(d.x + 0.5, 0, d.z + 0.06), M4.rotY(-Math.PI / 2 - sw));
}
