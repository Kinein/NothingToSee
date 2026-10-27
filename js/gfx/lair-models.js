//@ gfx/lair-models — Models for things inside THEIR lairs
//@ Defines: LXC
//@ Uses:    gfx/world-geometry, core/util, gfx/gl, world/grid, gfx/body-parts, gfx/models
//@ (header made by tools/map.js; stripped by build.py)
// ───────────── the things in THEIR places (canonical: front = +z, centred on the footprint)
MAT.hull = 27; MAT.hullfloor = 28; MAT.sewer = 29; MAT.sewerfloor = 30; MAT.water = 31; MAT.flesh = 32; MAT.nest = 33; MAT.gold = 34; MAT.slime = 35;
Object.assign(FLOOR, { h: [0x868e8c, 0x737b79], e: [0x4b463b, 0x3d382f], q: [0x2d3222, 0x252a1b], n: [0x3d3024, 0x2f251b] });
Object.assign(FLOOR_MAT, { h: 'hullfloor', e: 'sewerfloor', q: 'water', n: 'nest' });
const LXC = {
  hull: C(0xb9c1be), hullD: C(0x56605f), hullK: C(0x2a3130), glow: C(0x8fffd8), glowB: C(0x9fd8ff), red: C(0xff4a3a),
  iron: C(0x2c2a27), rust: C(0x5a3a26), wood: C(0x4a3423), woodD: C(0x2c1f15), gold: C(0xd6a73a), goldD: C(0x8a6420), rope: C(0xa8946c),
  mud: C(0x3a2c20), twig: C(0x2a2016), leaf: C(0x5a3a18), rag: C(0x4a4038), slime: C(0x5a6a30), bone: C(0xc8bea4), blood: C(0x3a0808),
};
Object.assign(MODELS, {
  // the table: a slab on one stalk, a headrest, straps at the wrists, the waist and the ankles; a ring lamp hangs over it
  lx_table(g) {
    const H = LXC.hull, K = LXC.hullK;
    g.cyl(0, 0, 0, 0.44, 0.38, 0.07, 18, LXC.hullD, XM('metal'));
    g.cyl(0, 0.07, 0, 0.17, 0.12, 0.68, 14, mul3(H, 0.7), XM('metal'));
    g.frustum(0, 0.72, 0, 0.62, 1.7, 0.86, 1.94, 0.1, H, XM('metal'));
    g.bx(0, 0.82, 0, 0.8, 0.012, 1.86, mul3(H, 1.08));
    for (const s of [-1, 1]) g.bx(s * 0.38, 0.825, 0, 0.025, 0.012, 1.8, C(0x3a4a48), EMIT(0.35));   // the gutters, faintly lit
    g.sphere(0, 0.86, -0.78, 0.2, 0.07, 0.15, 10, 5, mul3(H, 0.95));
    for (const [z, w] of [[-0.42, 0.88], [0.05, 0.88], [0.62, 0.88]]) { g.bx(0, 0.83, z, w, 0.04, 0.09, K); g.bx(0.36, 0.84, z, 0.06, 0.05, 0.11, C(0x7a8280)); }
    g.bx(0, 0.0, -1.0, 0.14, 2.35, 0.14, LXC.hullD, XM('metal'));                       // the arm's post at the head end
    g.bx(0, 2.3, -0.5, 0.1, 0.1, 1.05, LXC.hullD, XM('metal'));
    g.bx(0, 1.9, 0.05, 0.05, 0.42, 0.05, LXC.hullD, XM('metal'));                       // the stem the lamp hangs on, low over your face
    g.cyl(0, 1.72, 0.05, 0.36, 0.3, 0.2, 20, LXC.hullD);
    g.cyl(0, 1.7, 0.05, 0.27, 0.27, 0.02, 20, C(0xeef8f4), EMIT(1));                   // the lamp's face
  },
  // a lectern of a console, tilted toward whoever stands at it; its screen crawls with a script nobody here reads
  lx_console(g) {
    g.frustum(0, 0, -0.1, 0.62, 0.42, 0.5, 0.32, 0.95, LXC.hullD, XM('metal'));
    g.xf(M4.mul(M4.trans(0, 1.02, -0.02), M4.rotX(-0.55)), () => {
      g.bx(0, -0.04, 0, 0.78, 0.08, 0.56, LXC.hull, XM('metal'));
      g.bx(0, 0.005, -0.04, 0.66, 0.012, 0.36, C(0x1f6a56), XM('screen', 1));
      for (let k = 0; k < 5; k++) g.bx(-0.26 + k * 0.13, 0.01, 0.2, 0.07, 0.015, 0.05, k % 2 ? C(0xff5a4a) : C(0x7affc8), EMIT(0.9));
    });
    g.bx(0, 1.5, -0.42, 0.7, 0.75, 0.05, LXC.hullK);
    g.bx(0, 1.52, -0.39, 0.62, 0.66, 0.012, C(0x1d5b4c), XM('screen', 1));
  },
  // shelves of jars: something pale in each, turning a little in the fluid
  lx_jars(g, o) {
    g.bx(0, 0, -0.3, 0.92, 1.9, 0.08, LXC.hullD, XM('metal'));
    for (const y of [0.02, 0.62, 1.22]) g.bx(0, y, -0.12, 0.92, 0.04, 0.4, LXC.hull, XM('metal'));
    for (let r = 0; r < 3; r++) for (let k = 0; k < 3; k++) {
      const x = -0.3 + k * 0.3, y = 0.06 + r * 0.6, hh = 0.32 + 0.1 * hash2(o.x + k, r, 7), seed = hash2(o.z + k, r, 9);
      g.cyl(x, y, -0.1, 0.11, 0.11, hh, 10, C(0x6a8a70), GLASS);
      g.cyl(x, y + hh, -0.1, 0.115, 0.115, 0.04, 10, LXC.hullK);
      g.sphere(x, y + hh * 0.45, -0.1, 0.07 + seed * 0.03, 0.08, 0.06, 8, 6, seed > 0.5 ? C(0x9a6a64) : C(0x8a8a78));
      if (seed > 0.7) g.sphere(x + 0.02, y + hh * 0.55, -0.06, 0.025, 0.025, 0.025, 6, 4, C(0x1a1a1a));   // it has an eye
    }
  },
  // a tank: a lit foot, a cap full of pipes, four thin posts. What fills it is drawn as light, live.
  lx_tank(g) {
    g.cyl(0, 0, 0, 0.5, 0.46, 0.22, 20, LXC.hullD, XM('metal'));
    g.cyl(0, 0.22, 0, 0.44, 0.44, 0.04, 20, C(0x2a6a56), EMIT(0.8));
    g.cyl(0, 2.18, 0, 0.47, 0.5, 0.24, 20, LXC.hullD, XM('metal'));
    g.cyl(0, 2.16, 0, 0.42, 0.42, 0.02, 20, C(0x2a6a56), EMIT(0.6));
    for (let k = 0; k < 4; k++) { const a = (k / 4) * TAU + 0.4; g.bx(Math.sin(a) * 0.42, 0.26, Math.cos(a) * 0.42, 0.045, 1.92, 0.045, LXC.hull, XM('metal')); }
    for (const s of [-1, 1]) { g.cyl(s * 0.18, 2.42, -0.1, 0.05, 0.05, 0.3, 8, LXC.hullK); }
  },
  // an escape pod: a capsule stood on end in its cradle, a porthole, a seam round the hatch, a ring that glows when it's armed
  lx_pod(g) {
    g.cyl(0, 0, 0, 0.5, 0.5, 0.12, 22, LXC.hullK, XM('metal'));
    g.cyl(0, 0.12, 0, 0.42, 0.46, 1.6, 22, LXC.hull, XM('metal'));
    g.sphere(0, 1.72, 0, 0.42, 0.36, 0.42, 18, 10, LXC.hull);
    g.cyl(0, 0.12, 0, 0.47, 0.47, 0.05, 22, C(0xff7a4a), EMIT(0.85));
    g.bx(0, 0.25, 0.42, 0.5, 1.3, 0.04, mul3(LXC.hull, 0.86), XM('metal'));             // the hatch
    for (const s of [-1, 1]) g.bx(s * 0.25, 0.25, 0.445, 0.02, 1.3, 0.02, LXC.hullK);
    g.bx(0, 1.55, 0.445, 0.5, 0.02, 0.02, LXC.hullK); g.bx(0, 0.25, 0.445, 0.5, 0.02, 0.02, LXC.hullK);
    g.cyl(0, 1.18, 0.43, 0.13, 0.13, 0.05, 14, C(0x15201e), GLASS);
    g.xf(M4.rotX(Math.PI / 2), () => g.cyl(0, 0.43, -1.25, 0.16, 0.16, 0.03, 16, LXC.hullD));
    for (const s of [-1, 1]) { g.bx(s * 0.4, 0.4, -0.45, 0.08, 1.6, 0.1, LXC.hullD); g.bx(s * 0.4, 1.95, -0.3, 0.08, 0.08, 0.4, LXC.hullD); }
    g.bx(0.3, 0.9, 0.46, 0.08, 0.14, 0.03, C(0xff3a2a), EMIT(1));
  },
  // the planning table: a ring of pale metal round a well of dark glass. Over it, live, a map of Wexley made of light.
  lx_holo(g) {
    g.frustum(0, 0, 0, 3.0, 1.2, 3.6, 1.7, 0.8, LXC.hullD, XM('metal'));
    g.frustum(0, 0.8, 0, 3.6, 1.7, 3.8, 1.86, 0.12, LXC.hull, XM('metal'));
    g.bx(0, 0.92, 0, 3.3, 0.012, 1.5, C(0x0c1a18));
    for (const s of [-1, 1]) { g.bx(0, 0.925, s * 0.78, 3.4, 0.02, 0.03, C(0x7affe0), EMIT(0.9)); g.bx(s * 1.72, 0.925, 0, 0.03, 0.02, 1.5, C(0x7affe0), EMIT(0.9)); }
  },
  // gold: coins and more coins, in a heap that ran out of room. A cup, a candlestick, a ring, bought with something.
  lx_gold(g, o) {
    const r = (k) => hash2(o.x * 7 + k, o.z * 3 - k, 41), hh = 0.45 + r(1) * 0.45;
    g.matId = MAT.gold;
    g.sphere(0, 0, 0, 0.62, hh, 0.62, 14, 8, LXC.gold);
    g.sphere(r(2) * 0.3 - 0.15, 0, r(3) * 0.3 - 0.15, 0.45, hh * 1.18, 0.45, 12, 7, mul3(LXC.gold, 1.08));
    g.matId = 0;
    for (let k = 0; k < 44; k++) {
      const a = r(10 + k) * TAU, d = Math.sqrt(r(60 + k)) * 0.62, x = Math.sin(a) * d, z = Math.cos(a) * d;
      const surf = hh * Math.sqrt(Math.max(0, 1 - (d / 0.66) * (d / 0.66))) * 1.05;
      g.xf(M4.mul(M4.trans(x, surf, z), M4.mul(M4.rotX((r(110 + k) - 0.5) * 2.2), M4.rotZ((r(160 + k) - 0.5) * 2.2))), () => g.cyl(0, -0.005, 0, 0.055, 0.055, 0.012, 7, mul3(LXC.gold, 0.85 + r(210 + k) * 0.4)));
    }
    if (r(4) > 0.55) { const x = r(5) * 0.5 - 0.25; g.cyl(x, hh * 0.85, 0.1, 0.06, 0.09, 0.18, 10, LXC.goldD); g.cyl(x, hh * 0.85 + 0.18, 0.1, 0.1, 0.06, 0.05, 10, LXC.gold); }
    if (r(6) > 0.6) { g.cyl(-0.2, hh * 0.7, -0.15, 0.04, 0.05, 0.36, 8, LXC.goldD); g.cyl(-0.2, hh * 0.7 + 0.36, -0.15, 0.015, 0.015, 0.06, 6, C(0xe8dcb8)); }
  },
  // a counting table: stacks, a ledger, a lamp, a strongbox
  lx_ctable(g) {
    g.matId = MAT.wood;
    for (const x of [-0.85, 0.85]) for (const z of [-0.36, 0.36]) g.bx(x, 0, z, 0.07, 0.78, 0.07, LXC.woodD);
    g.bx(0, 0.78, 0, 1.92, 0.06, 0.86, LXC.wood);
    g.matId = 0;
    for (let k = 0; k < 9; k++) { const x = -0.7 + (k % 5) * 0.16, z = -0.2 + Math.floor(k / 5) * 0.18, n = 3 + ((k * 7) % 5); g.cyl(x, 0.84, z, 0.06, 0.06, n * 0.018, 10, LXC.gold, XM('gold')); }
    g.bx(0.25, 0.84, 0.05, 0.42, 0.04, 0.3, C(0xd8ccae), XM('print')); g.bx(0.25, 0.86, 0.05, 0.012, 0.012, 0.3, C(0x5a2a1a));
    g.bx(0.7, 0.84, -0.15, 0.32, 0.22, 0.24, LXC.iron); g.bx(0.7, 0.95, -0.02, 0.06, 0.06, 0.02, LXC.gold);
    g.cyl(-0.15, 0.84, 0.25, 0.07, 0.06, 0.08, 10, LXC.iron); g.cyl(-0.15, 0.92, 0.25, 0.05, 0.05, 0.12, 10, C(0xffc870), EMIT(1));
  },
  // a kitchen chair somebody brought down here, and the rope still round it
  lx_chair(g) {
    g.matId = MAT.wood;
    for (const x of [-0.2, 0.2]) for (const z of [-0.2, 0.2]) g.bx(x, 0, z, 0.05, 0.46, 0.05, LXC.wood);
    g.bx(0, 0.46, 0, 0.48, 0.05, 0.46, LXC.wood);
    for (const x of [-0.2, 0.2]) g.bx(x, 0.5, -0.2, 0.05, 0.55, 0.05, LXC.wood);
    g.bx(0, 0.9, -0.2, 0.46, 0.12, 0.04, LXC.wood);
    g.matId = 0;
    for (const y of [0.62, 0.75]) g.bx(0, y, -0.24, 0.5, 0.035, 0.05, LXC.rope);
    for (const x of [-0.2, 0.2]) g.bx(x, 0.12, 0.2, 0.08, 0.035, 0.08, LXC.rope);
  },
  // iron steps up the wall to a round hole with the night in it
  lx_stairs(g) {
    for (let k = 0; k < 9; k++) g.bx(0, 0.3 * k, 0.32 - k * 0.075, 0.62, 0.04, 0.24, LXC.iron, XM('metal'));
    for (const s of [-1, 1]) { g.xf(M4.mul(M4.trans(s * 0.33, 0, 0.35), M4.rotX(-0.24)), () => g.bx(0, 0, 0, 0.04, 2.8, 0.06, LXC.rust)); g.xf(M4.mul(M4.trans(s * 0.33, 0.9, 0.42), M4.rotX(-0.24)), () => g.bx(0, 0, 0, 0.025, 2.0, 0.025, LXC.iron)); }
    g.cyl(0, 2.66, -0.25, 0.42, 0.42, 0.06, 18, LXC.iron);
    g.cyl(0, 2.65, -0.25, 0.32, 0.32, 0.02, 18, C(0x9ab0c8), EMIT(0.7));
  },
  // the nest: branches dragged down here, leaves, a mattress torn open, rags and hair, all of it slick
  lx_nest(g, o) {
    const r = (k) => hash2(o.x * 13 + k, o.z * 5 + k, 77);
    g.sphere(0, 0, 0, 0.6, 0.32 + r(1) * 0.2, 0.6, 12, 6, LXC.mud, XM('nest'));
    for (let k = 0; k < 16; k++) {
      const a = r(k + 3) * TAU, d = 0.15 + r(k + 30) * 0.4, y = 0.15 + r(k + 50) * 0.35, L = 0.5 + r(k + 70) * 0.7;
      g.xf(M4.mul(M4.trans(Math.sin(a) * d, y, Math.cos(a) * d), M4.mul(M4.rotY(r(k + 90) * TAU), M4.rotZ((r(k + 110) - 0.5) * 1.1))), () => g.bx(0, 0, 0, L, 0.035 + r(k + 130) * 0.03, 0.035, mul3(LXC.twig, 0.8 + r(k) * 0.5)));
    }
    for (let k = 0; k < 14; k++) { const a = r(k + 150) * TAU, d = r(k + 170) * 0.55; g.xf(M4.mul(M4.trans(Math.sin(a) * d, 0.12 + r(k + 190) * 0.4, Math.cos(a) * d), M4.rotY(a)), () => g.bx(0, 0, 0, 0.12, 0.012, 0.08, mix3(LXC.leaf, C(0x6a4a1c), r(k + 210)))); }
    if (r(2) > 0.4) g.xf(M4.mul(M4.trans(r(3) * 0.4 - 0.2, 0.32, r(4) * 0.4 - 0.2), M4.rotY(r(5) * 3)), () => g.bx(0, 0, 0, 0.5, 0.06, 0.3, LXC.rag, XM('fabric')));
    g.sphere(r(6) * 0.3 - 0.15, 0.2, r(7) * 0.3 - 0.15, 0.3, 0.06, 0.25, 8, 4, LXC.slime, XM('slime'));
  },
  // what's left: a dark stain the shape of somebody, rags. The rest of them is drawn as they lie.
  lx_body(g, o) {
    const r = (k) => hash2(o.x * 3 + k, o.z * 11 + k, 55);
    g.sphere(0, 0, 0, 0.6, 0.01, 0.42, 12, 3, LXC.blood);
    g.xf(M4.rotY(r(1) * 3), () => { g.bx(0.25, 0.012, 0.1, 0.3, 0.02, 0.2, LXC.rag, XM('fabric')); g.bx(-0.3, 0.012, -0.15, 0.2, 0.02, 0.14, mul3(LXC.rag, 0.8)); });
    for (let k = 0; k < 3; k++) g.xf(M4.mul(M4.trans(r(k + 5) * 0.7 - 0.35, 0.02, r(k + 8) * 0.6 - 0.3), M4.rotY(r(k + 11) * 3)), () => g.bx(0, 0, 0, 0.22, 0.025, 0.025, LXC.bone));
  },
  // a pile of the town: a chair with no seat, a stained mattress, a tyre, a pram, a lot of bones
  lx_junk(g, o) {
    const r = (k) => hash2(o.x * 17 + k, o.z * 7 + k, 91);
    g.xf(M4.mul(M4.trans(0, 0.12, 0), M4.mul(M4.rotY(r(1) * 2), M4.rotZ(0.25))), () => g.bx(0, 0, 0, 0.95, 0.18, 0.7, C(0x7a705a), XM('fabric')));
    g.xf(M4.mul(M4.trans(0.15, 0.38, -0.1), M4.mul(M4.rotY(r(2) * 3), M4.rotX(0.5))), () => { g.bx(0, 0, 0, 0.45, 0.05, 0.45, LXC.wood); for (const x of [-0.2, 0.2]) g.bx(x, 0, -0.2, 0.05, 0.5, 0.05, LXC.wood); });
    g.xf(M4.mul(M4.trans(-0.25, 0.5, 0.2), M4.rotX(1.2)), () => g.cyl(0, -0.08, 0, 0.26, 0.26, 0.16, 14, C(0x161616)));
    for (let k = 0; k < 6; k++) g.xf(M4.mul(M4.trans(r(k + 3) * 0.8 - 0.4, 0.06 + r(k + 9) * 0.3, r(k + 15) * 0.8 - 0.4), M4.rotY(r(k + 21) * 3)), () => { g.bx(0, 0, 0, 0.3, 0.03, 0.03, LXC.bone); g.sphere(0.15, 0, 0, 0.03, 0.03, 0.03, 5, 3, LXC.bone); });
    g.sphere(0, 0.05, 0, 0.55, 0.06, 0.5, 10, 3, LXC.slime, XM('slime'));
  },
});


