//@ gfx/props — Evidence props, dynamic bits and cars
//@ Defines: STASH_SHAPE, LOOK_COL, stashShape, buildItemMesh, carGeo, buildCarMesh
//@ Uses:    gfx/world-geometry, core/util, gfx/gl, gfx/post, sim/core
//@ (header made by tools/map.js; stripped by build.py)
// ───────────────────────── evidence props & dynamic bits
// a thing hidden in somebody's things, by rough shape. What colours it is the look (whose faction it resembles), never
// what it means: a plant and a lookalike look just as alien as THEIR own things.
const STASH_SHAPE = {
  till: 'bundle',
  skin: 'bundle',
  envelope: 'bundle',
  letters: 'paper',
  obit: 'paper',
  fish: 'cooler',
  fishes: 'cooler',
  trout: 'cooler',
  fishy: 'cooler',
  laser: 'tube',
  sunlamp: 'tube',
  radio: 'box',
  scanner: 'box',
  device: 'device',
  teeth: 'jar',
  pills: 'jar',
  finger: 'parcel',
  meat: 'parcel',
  butcher: 'parcel',
  mask: 'parcel',
};
const LOOK_COL = {
  lizards: { base: 0x7fa066, trim: 0xc9a043, glow: 0.35 },
  aliens: { base: 0x9aa0a6, trim: 0x50ffa0, glow: 1 },
  zombies: { base: 0xd8cfb0, trim: 0x5a4a2a, glow: 0 },
};
function stashShape(g, shape, look) {
  const L = LOOK_COL[look] || LOOK_COL.aliens,
    base = C(L.base),
    trim = C(L.trim),
    em = L.glow ? EMIT(L.glow) : E0;
  if (shape === 'bundle') {
    g.bx(0, 0.03, 0, 0.22, 0.06, 0.12, base);
    g.bx(0, 0.035, 0, 0.05, 0.07, 0.13, trim, em);
  } else if (shape === 'paper') {
    g.bx(0, 0, 0, 0.3, 0.008, 0.38, base);
    for (let i = 0; i < 5; i++) g.bx(0, 0.009, -0.13 + i * 0.065, 0.22, 0.002, 0.012, trim, em);
  } else if (shape === 'cooler') {
    g.bx(0, 0.09, 0, 0.36, 0.18, 0.24, base);
    g.bx(0, 0.19, 0, 0.38, 0.03, 0.26, trim, em);
  } else if (shape === 'tube') {
    g.xf(M4.mul(M4.trans(0, 0.05, 0), M4.rotZ(Math.PI / 2)), () => g.cyl(0, -0.12, 0, 0.05, 0.05, 0.24, 12, base));
    g.xf(M4.mul(M4.trans(0, 0.05, 0), M4.rotZ(Math.PI / 2)), () =>
      g.cyl(0, -0.02, 0, 0.056, 0.056, 0.03, 12, trim, em),
    );
  } else if (shape === 'box') {
    g.bx(0, 0.06, 0, 0.26, 0.12, 0.16, base);
    g.bx(0.08, 0.125, 0.05, 0.03, 0.01, 0.03, trim, em);
  } else if (shape === 'jar') {
    g.cyl(0, 0, 0, 0.07, 0.07, 0.16, 10, base, GLASS);
    g.cyl(0, 0.16, 0, 0.075, 0.075, 0.025, 10, trim, em);
  } else if (shape === 'parcel') {
    g.sphere(0, 0.05, 0, 0.16, 0.06, 0.11, 8, 4, base);
    g.bx(0, 0.05, 0, 0.02, 0.07, 0.12, trim, em);
  } else {
    g.bx(0, 0.0, 0, 0.16, 0.06, 0.1, C(0x2a2c30));
    g.bx(0.05, 0.065, 0.03, 0.025, 0.01, 0.025, trim, em);
  }
}
function buildItemMesh(it) {
  const g = new Geo();
  if (it.kind === 'skin') {
    const c = C(0xc8c4a0);
    g.bx(0, 0.0, 0, 0.5, 0.02, 0.22, c);
    g.bx(0.05, 0.0, -0.32, 0.18, 0.02, 0.45, c);
    g.bx(-0.28, 0, 0.1, 0.28, 0.015, 0.09, c);
    g.bx(0.3, 0, -0.1, 0.24, 0.015, 0.08, c);
    g.sphere(0, 0.02, 0.24, 0.12, 0.03, 0.12, 8, 4, c);
  } else if (it.kind === 'finger') {
    g.bx(0, 0, 0, 0.05, 0.04, 0.16, C(0x9aa08a));
    g.bx(0, 0, 0.09, 0.045, 0.035, 0.03, C(0xb0a090));
    g.sphere(0.02, 0.0, -0.05, 0.12, 0.004, 0.09, 8, 3, C(0x3a1414));
  } else if (it.kind === 'scorch') {
    g.cyl(0, 0.003, 0, 0.42, 0.42, 0.004, 14, C(0x0e0e0c));
    g.cyl(0, 0.006, 0, 0.24, 0.24, 0.004, 12, C(0x1d2a20), EMIT(0.2));
  } else if (it.kind === 'puddle') {
    g.sphere(0, 0.0, 0, 0.45, 0.005, 0.32, 10, 3, C(0x8a8a3a), GLASS);
  } else if (it.kind === 'stain') {
    g.sphere(0, 0.0, 0, 0.62, 0.006, 0.44, 12, 3, C(0x3a0807), GLASS);
    g.sphere(0.3, 0.002, 0.25, 0.22, 0.005, 0.16, 8, 3, C(0x2a0605), GLASS);
  } else if (it.kind === 'tape') {
    for (const y of [0.55, 1.0]) g.bx(0, y, 0, 1.15, 0.07, 0.015, C(0xd8b21c), EMIT(0.15));
  } else if (it.kind === 'device') {
    g.bx(0, 0.0, 0, 0.16, 0.06, 0.1, C(0x2a2c30));
    g.bx(0.05, 0.065, 0.03, 0.025, 0.01, 0.025, C(0x60ff90), EMIT(1));
  } else if (it.kind === 'opened') {
    // a panel off, screws and wires on the floor
    g.xf(M4.rotZ(0.12), () => {
      g.bx(0, 0.0, 0, 0.5, 0.03, 0.4, C(0xb9b6a8));
      g.bx(0, 0.03, 0, 0.42, 0.006, 0.32, C(0x5a5850));
    });
    for (const [x, z] of [
      [0.34, 0.16],
      [0.37, -0.1],
      [-0.33, 0.22],
      [-0.3, -0.2],
    ])
      g.cyl(x, 0, z, 0.025, 0.025, 0.016, 6, C(0xd0d2d4));
    g.bx(-0.05, 0, 0.3, 0.32, 0.02, 0.025, C(0xa03020));
    g.bx(0.1, 0, 0.27, 0.025, 0.02, 0.18, C(0x2050a0));
  } else if (it.kind === 'stash') {
    g.mat = M4.scale(1.7, 1.7, 1.7);
    const k = it.what,
      paper = C(0xd8cfb0),
      brass = C(0xc9a043);
    if (k === 'cash') {
      g.xf(M4.mul(M4.trans(0, 0.05, 0), M4.rotZ(Math.PI / 2)), () =>
        g.cyl(0, -0.09, 0, 0.05, 0.05, 0.18, 10, C(0x7fa066)),
      );
      g.xf(M4.mul(M4.trans(0, 0.05, 0), M4.rotZ(Math.PI / 2)), () =>
        g.cyl(0, -0.025, 0, 0.054, 0.054, 0.05, 10, brass, EMIT(0.35)),
      );
    } else if (k === 'token')
      for (const [x, z] of [
        [0, 0],
        [0.07, 0.04],
        [-0.05, 0.06],
        [0.03, -0.07],
        [-0.08, -0.03],
      ])
        g.cyl(x, 0, z, 0.04, 0.04, 0.012, 10, brass, EMIT(0.35));
    else if (k === 'ledger' || k === 'chart') {
      g.bx(0, 0, 0, 0.3, 0.008, 0.38, k === 'chart' ? C(0x9aa4b0) : paper);
      for (let i = 0; i < 5; i++)
        g.bx(
          0,
          0.009,
          -0.13 + i * 0.065,
          0.22,
          0.002,
          0.012,
          k === 'chart' ? C(0x40ffb0) : C(0x2a2620),
          k === 'chart' ? EMIT(0.6) : E0,
        );
    } else if (k === 'gadget') {
      g.xf(M4.mul(M4.trans(0, 0.05, 0), M4.rotZ(Math.PI / 2)), () =>
        g.cyl(0, -0.12, 0, 0.05, 0.05, 0.24, 12, C(0x9aa0a6)),
      );
      g.xf(M4.mul(M4.trans(0, 0.05, 0), M4.rotZ(Math.PI / 2)), () =>
        g.cyl(0, -0.02, 0, 0.056, 0.056, 0.03, 12, C(0x50ffa0), EMIT(1)),
      );
    } else if (k === 'chips') {
      g.bx(0, 0, 0, 0.3, 0.03, 0.2, C(0x2a2c30));
      for (let i = 0; i < 6; i++)
        g.bx(
          -0.1 + (i % 3) * 0.1,
          0.03,
          -0.05 + Math.floor(i / 3) * 0.1,
          0.05,
          0.01,
          0.05,
          C(0x60ff90),
          EMIT(0.4 + (i % 2) * 0.6),
        );
    } else stashShape(g, STASH_SHAPE[k] || 'device', it.look || G.faction);
    g.mat = null;
  } else if (it.kind === 'mark') {
    // scratched into the door frame at chest height: three gouges and a crossbar, old newspaper-brown at the edges
    g.xf(M4.rotY(it.rot || 0), () => {
      for (let i = 0; i < 3; i++) g.bx(-0.08 + i * 0.08, 1.25, 0.06, 0.018, 0.34, 0.01, C(0x2a2018));
      g.bx(0, 1.3, 0.06, 0.3, 0.018, 0.01, C(0x2a2018));
      g.bx(0, 1.25, 0.055, 0.42, 0.46, 0.004, C(0x6a5a3a));
    });
  } else if (it.kind === 'goldart') {
    // brand new, leaning on the wall: a gold frame round something nobody here would buy
    g.xf(M4.mul(M4.rotY(it.rot || 0), M4.rotX(-0.18)), () => {
      g.bx(0, 0.45, 0, 0.7, 0.86, 0.05, C(0xc9a043), EMIT(0.25));
      g.bx(0, 0.45, 0.03, 0.56, 0.7, 0.01, C(0x2a3a2c));
    });
  } else if (it.kind === 'trap') {
    // steel jaws, open, and whatever you baited it with
    const steel = C(0x6d6f72),
      dark = C(0x2a2b2d);
    g.cyl(0, 0, 0, 0.36, 0.36, 0.02, 16, dark);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * TAU;
      g.bx(Math.sin(a) * 0.33, 0.02, Math.cos(a) * 0.33, 0.04, 0.07, 0.04, steel);
    }
    g.bx(0, 0.02, 0, 0.5, 0.02, 0.05, steel);
    g.cyl(0, 0.02, 0, 0.08, 0.08, 0.02, 10, steel);
    if (it.bait && !it.shut) g.bx(0, 0.045, 0, 0.12, 0.04, 0.08, C(0xc9a043), EMIT(0.2));
    if (it.shut) for (const s of [-1, 1]) g.bx(s * 0.06, 0.05, 0, 0.04, 0.16, 0.6, steel);
  }
  const m = makeMesh(g);
  m.model = M4.mul(M4.trans(it.x, 0.004, it.z), M4.rotY(it.rot || 0));
  return m;
}

// ───────────────────────── cars ─────────────────────────
// canonical: length along z (front = +z), width along x
function carGeo(g, col) {
  const dark = mul3(col, 0.62),
    glass = C(0x161e24),
    chrome = C(0x8a8d90),
    tyre = C(0x101010);
  g.bx(0, 0.2, 0, 0.92, 0.4, 1.96, col);
  g.bx(0, 0.16, 0.99, 0.88, 0.16, 0.04, chrome);
  g.bx(0, 0.16, -0.99, 0.88, 0.16, 0.04, chrome);
  g.frustum(0, 0.6, -0.12, 0.86, 1.08, 0.7, 0.66, 0.36, glass, GLASS);
  g.bx(0, 0.96, -0.14, 0.72, 0.035, 0.68, dark);
  g.bx(0, 0.6, 0.62, 0.86, 0.02, 0.6, mul3(col, 1.05));
  for (const x of [-0.45, 0.45])
    for (const z of [-0.62, 0.64])
      g.xf(M4.mul(M4.trans(x, 0.2, z), M4.rotZ(Math.PI / 2)), () => g.cyl(0, -0.07, 0, 0.2, 0.2, 0.14, 10, tyre));
  for (const s of [-1, 1]) {
    g.bx(s * 0.3, 0.4, 0.99, 0.2, 0.1, 0.03, C(0xfff0c8), EMIT(1));
    g.bx(s * 0.32, 0.42, -0.995, 0.16, 0.08, 0.03, C(0xd01e16), EMIT(1));
  }
}
function buildCarMesh(colHex) {
  const g = new Geo();
  g.ao = 0.7;
  g.aoH = 0.7;
  carGeo(g, hex(colHex));
  return makeMesh(g);
}
