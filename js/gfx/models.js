//@ gfx/models — Furniture and object models (front = +z)
//@ Defines: MODELS
//@ Uses:    gfx/world-geometry, core/util, gfx/gl, gfx/props
//@ (header made by tools/map.js; stripped by build.py)
// ───────────────────────── object models (canonical: front = +z)
const MODELS = {
  bed(g, o) {
    const fr = COL.woodD, duv = [C(0x3c3a52), C(0x5a3a32), C(0x3a4a3a), C(0x4a4a5a), C(0x6a5a42)][Math.floor(hash2(o.x, o.z, 21) * 5)];
    g.matId = MAT.wood;
    for (const x of [-0.42, 0.42]) for (const z of [-0.9, 0.9]) g.bx(x, 0, z, 0.06, 0.18, 0.06, fr);
    g.bx(0, 0.13, 0, 0.92, 0.17, 1.86, fr);
    g.bx(0, 0, -0.95, 0.96, 0.96, 0.07, fr); g.bx(0, 0.93, -0.95, 1.02, 0.05, 0.1, mul3(fr, 1.2));   // the headboard and its cap
    for (const x of [-0.23, 0.23]) g.bx(x, 0.5, -0.912, 0.36, 0.34, 0.012, mul3(fr, 0.82));
    g.bx(0, 0, 0.95, 0.96, 0.53, 0.06, fr); g.bx(0, 0.52, 0.95, 1.0, 0.04, 0.09, mul3(fr, 1.2));
    g.matId = 0;
    g.bx(0, 0.3, 0.03, 0.86, 0.17, 1.84, COL.linen, XM('fabric'));
    g.sphere(-0.17, 0.53, -0.72, 0.2, 0.07, 0.14, 10, 6, C(0xd2ccbd)); g.sphere(0.17, 0.53, -0.69, 0.2, 0.06, 0.14, 10, 6, C(0xc6c0b0));   // two pillows, one slept on
    g.bx(0, 0.465, 0.3, 0.9, 0.09, 1.3, duv, XM('fabric'));
    g.bx(0, 0.47, -0.37, 0.9, 0.085, 0.17, C(0xd8d2c4), XM('fabric'));   // the sheet turned down over it
    for (const s of [-1, 1]) g.bx(s * 0.455, 0.21, 0.3, 0.02, 0.33, 1.3, mul3(duv, 0.82), XM('fabric'));
  },
  toilet(g) {
    const P = COL.porcelain;
    g.xf(M4.mul(M4.trans(0, 0, 0.07), M4.scale(1, 1, 1.32)), () => {
      g.cyl(0, 0, 0, 0.12, 0.17, 0.34, 12, P);
      g.cyl(0, 0.34, 0, 0.19, 0.19, 0.035, 16, C(0xbab7ac));       // the seat
      g.cyl(0, 0.36, 0, 0.12, 0.12, 0.02, 12, C(0x5e7472), GLASS); // water
    });
    g.bx(0, 0.38, -0.32, 0.46, 0.42, 0.2, P); g.bx(0, 0.8, -0.32, 0.5, 0.05, 0.24, P);
    g.xf(M4.mul(M4.trans(0, 0.4, -0.19), M4.rotX(-0.18)), () => g.xf(M4.scale(1, 1, 1), () => g.bx(0, 0, 0.02, 0.38, 0.42, 0.03, C(0xc4c1b6))));   // the lid, up
    g.bx(0.17, 0.72, -0.215, 0.07, 0.02, 0.025, COL.metal);
  },
  shower(g) {
    g.bx(0, 0, 0, 1.94, 0.1, 1.94, COL.porcelain);
    g.bx(-0.95, 0.1, 0, 0.04, 1.95, 1.9, COL.glass, GLASS);
    g.bx(0, 2.0, 0.93, 1.94, 0.04, 0.04, COL.metal);
    g.bx(-0.3, 0.1, 0.9, 0.6, 1.88, 0.03, C(0x6b7d7a));
    g.bx(0.6, 1.9, -0.8, 0.05, 0.05, 0.25, COL.metal); g.cyl(0.6, 1.82, -0.66, 0.09, 0.05, 0.08, 8, COL.metal);
    g.bx(0.6, 1.0, -0.94, 0.04, 0.95, 0.04, COL.metal);
  },
  sink(g) {
    const P = COL.porcelain;
    g.cyl(0, 0, -0.22, 0.08, 0.11, 0.76, 10, P);
    g.frustum(0, 0.72, -0.13, 0.4, 0.32, 0.58, 0.46, 0.16, P);
    g.bx(0, 0.84, -0.1, 0.44, 0.045, 0.3, C(0x9c9a92));
    g.cyl(0, 0.86, -0.1, 0.025, 0.025, 0.01, 8, C(0x2a2826));                // the plughole
    g.bx(0, 0.88, -0.33, 0.04, 0.12, 0.04, COL.metal); g.bx(0, 0.99, -0.29, 0.03, 0.03, 0.1, COL.metal);
    for (const s of [-1, 1]) g.cyl(s * 0.12, 0.88, -0.32, 0.025, 0.025, 0.05, 6, s > 0 ? C(0x5a7aa8) : C(0xa85a5a));
    g.bx(0, 1.08, -0.4, 0.66, 0.66, 0.12, COL.metalD); g.bx(0, 1.11, -0.338, 0.58, 0.6, 0.01, C(0x7d8c94), GLASS);   // the mirror cabinet
    g.bx(0, 1.05, -0.35, 0.5, 0.03, 0.1, C(0xd0ccc0));
    g.cyl(-0.16, 1.08, -0.35, 0.03, 0.025, 0.09, 8, C(0x8aa0a8), GLASS); g.bx(-0.165, 1.14, -0.35, 0.008, 0.08, 0.008, C(0x3a7ab0)); g.bx(-0.15, 1.14, -0.355, 0.008, 0.07, 0.008, C(0xd04a3a));   // a glass, two toothbrushes
    g.cyl(0.18, 1.08, -0.35, 0.035, 0.035, 0.12, 8, C(0xc8d8d0));
  },
  fridge(g, o) {
    const off = o.type === 'fridge_office', body = off ? C(0xa8aca6) : C(0xc8c2ae);
    g.bx(0, 0.06, -0.06, 0.78, 1.76, 0.72, body); g.frustum(0, 1.82, -0.06, 0.78, 0.72, 0.72, 0.66, 0.06, body);
    g.bx(0, 0, -0.08, 0.7, 0.07, 0.6, C(0x2a2a28));
    g.bx(0, 1.31, 0.305, 0.78, 0.02, 0.02, COL.metalD);
    g.bx(0.3, 0.72, 0.33, 0.035, 0.48, 0.04, COL.metalD); g.bx(0.3, 1.4, 0.33, 0.035, 0.3, 0.04, COL.metalD);
    for (const y of [0.78, 1.18]) g.bx(0.3, y, 0.31, 0.04, 0.03, 0.025, COL.metalD);
    if (off) { g.bx(-0.15, 1.1, 0.31, 0.12, 0.12, 0.01, C(0xd8d070)); g.bx(0.05, 0.95, 0.31, 0.12, 0.12, 0.01, C(0xd890a0)); g.bx(-0.2, 1.5, 0.31, 0.14, 0.18, 0.01, C(0xe0e0d0), XM('print')); g.bx(-0.05, 0.6, 0.31, 0.2, 0.26, 0.01, C(0xe8e4d4), XM('print')); }
    else {   // magnets holding up a shopping list, a postcard, a photograph nobody's in any more
      g.bx(-0.12, 1.5, 0.31, 0.17, 0.24, 0.006, C(0xe4e0d0), XM('print')); g.bx(0.1, 1.55, 0.31, 0.18, 0.12, 0.006, C(0x6a8aa0));
      g.bx(-0.05, 1.0, 0.31, 0.14, 0.18, 0.006, C(0xd8d2c0)); g.bx(-0.05, 1.02, 0.314, 0.11, 0.12, 0.004, C(0x5a5248));
      for (const [x, y, c] of [[-0.12, 1.6, 0xc83a2a], [0.1, 1.6, 0x3a7a4a], [-0.05, 1.08, 0xd0b030], [0.18, 0.8, 0x3a5ab0]]) g.cyl(x, y, 0.315, 0.018, 0.018, 0.012, 8, C(c));
    }
  },
  counter(g, o) {
    const off = o.x > 15 && o.z < 13, body = o.z > 18 ? C(0x5d4632) : C(0x6f6e66), top = off ? C(0x7b7563) : C(0x6a5a46);
    g.bx(0, 0.1, -0.06, 0.98, 0.76, 0.8, body);
    g.bx(0, 0, -0.1, 0.94, 0.1, 0.68, mul3(body, 0.45));
    for (const s of [-1, 1]) { g.bx(s * 0.24, 0.13, 0.345, 0.46, 0.54, 0.02, mul3(body, 1.1), o.z > 18 ? XM('wood') : E0); g.bx(s * 0.06, 0.52, 0.36, 0.015, 0.1, 0.015, COL.metal); }
    g.bx(0, 0.7, 0.345, 0.94, 0.14, 0.02, mul3(body, 1.05)); g.bx(0, 0.765, 0.36, 0.16, 0.015, 0.015, COL.metal);
    g.bx(0, 0.86, -0.04, 1.0, 0.05, 0.9, top); g.bx(0, 0.86, 0.405, 1.0, 0.05, 0.01, mul3(top, 0.75));
    if (o.type !== 'counter') return;
    const y = 0.91;
    if (o.z > 18) {   // a kettle, a bread board, jars of something
      g.cyl(-0.26, y, -0.16, 0.09, 0.075, 0.2, 10, C(0xb8b4a8), XM('metal')); g.bx(-0.26, y + 0.2, -0.16, 0.05, 0.03, 0.05, COL.black);
      g.xf(M4.mul(M4.trans(-0.15, y + 0.08, -0.16), M4.rotZ(-0.7)), () => g.bx(0, 0, 0, 0.025, 0.1, 0.025, C(0xb8b4a8)));
      g.bx(0.18, y, -0.1, 0.34, 0.02, 0.24, COL.woodL, XM('wood'));
      for (let k = 0; k < 3; k++) g.cyl(0.08 + k * 0.1, y, -0.3, 0.04, 0.04, 0.12 + k * 0.02, 8, [C(0x9a7a4a), C(0x6a7a5a), C(0xa86a3a)][k], GLASS);
    } else {
      for (let k = 0; k < 3; k++) { g.cyl(-0.2 + k * 0.12, y, -0.15, 0.04, 0.035, 0.09, 8, [C(0xd8d2c4), C(0x9a2a2a), C(0x3a5a8a)][k]); }
      g.bx(0.25, y, -0.2, 0.16, 0.18, 0.12, C(0xd0c8b0));
    }
  },
  microwave(g, o) { MODELS.counter(g, o); g.bx(0.05, 0.92, -0.12, 0.58, 0.33, 0.42, C(0xd2cdbf)); g.bx(-0.04, 0.97, 0.095, 0.32, 0.22, 0.01, C(0x3b4a44)); g.bx(0.25, 1.0, 0.095, 0.08, 0.14, 0.01, C(0x6fe0a0), EMIT(0.8)); },
  stove(g, o) {
    const b = C(0xbfb8a4);
    g.bx(0, 0.02, -0.05, 0.9, 0.88, 0.82, b); g.bx(0, 0.9, -0.05, 0.9, 0.03, 0.82, C(0x2a2a2a));
    g.bx(0, 0.9, -0.42, 0.9, 0.18, 0.06, b);
    for (const [x, z, r] of [[-0.2, -0.2, 0.11], [0.2, -0.2, 0.09], [-0.2, 0.14, 0.09], [0.2, 0.14, 0.11]]) { g.cyl(x, 0.93, z, r, r, 0.012, 14, C(0x121212)); g.cyl(x, 0.935, z, r * 0.55, r * 0.55, 0.012, 10, C(0x2c2a28)); }
    for (let k = 0; k < 4; k++) g.xf(M4.mul(M4.trans(-0.27 + k * 0.18, 1.0, -0.39), M4.rotX(Math.PI / 2)), () => g.cyl(0, 0, 0, 0.025, 0.025, 0.03, 8, COL.black));
    g.bx(0, 0.2, 0.365, 0.62, 0.42, 0.012, C(0x1d2124), GLASS); g.bx(0, 0.68, 0.39, 0.62, 0.03, 0.03, COL.metal);
    for (const s of [-1, 1]) g.bx(s * 0.3, 0.68, 0.37, 0.025, 0.03, 0.03, COL.metal);
    g.bx(0, 0.04, 0.365, 0.8, 0.1, 0.01, mul3(b, 0.82));
    if (o.z > 18) { g.cyl(0.2, 0.94, -0.2, 0.12, 0.11, 0.13, 12, C(0x6a6a68), XM('metal')); g.bx(0.36, 1.03, -0.2, 0.14, 0.02, 0.03, COL.black); }   // a pot left on the ring
  },
  sinkcounter(g, o) {
    MODELS.counter(g, o);
    g.bx(0, 0.89, -0.05, 0.64, 0.012, 0.54, C(0xa8aaa8), XM('metal'));
    g.bx(0, 0.75, -0.05, 0.56, 0.15, 0.46, C(0x5c5e5c));
    g.bx(0, 0.756, -0.05, 0.54, 0.01, 0.44, C(0x4a5a5a), GLASS);
    g.cyl(0, 0.9, -0.36, 0.025, 0.025, 0.3, 8, COL.metal); g.xf(M4.mul(M4.trans(0, 1.18, -0.36), M4.rotX(1.4)), () => g.cyl(0, 0, 0, 0.02, 0.02, 0.18, 8, COL.metal));
    g.bx(0.42, 0.9, -0.1, 0.12, 0.08, 0.34, C(0x8a8a88));   // a draining rack…
    for (let k = 0; k < 3; k++) g.xf(M4.mul(M4.trans(0.42, 0.97, -0.2 + k * 0.08), M4.rotX(Math.PI / 2 - 0.15)), () => g.cyl(0, -0.006, 0, 0.09, 0.09, 0.012, 12, C(0xd8d4c8)));   // …and the plates in it
  },
  phone(g) {
    g.matId = MAT.wood;
    g.bx(0, 0, -0.2, 0.5, 0.72, 0.44, COL.wood); g.bx(0, 0.72, -0.2, 0.54, 0.03, 0.48, COL.woodL);
    g.matId = 0;
    g.frustum(0, 0.75, -0.15, 0.24, 0.2, 0.18, 0.14, 0.08, C(0x2a2622));
    g.cyl(0, 0.83, -0.13, 0.07, 0.07, 0.008, 12, C(0xd8d2c0));
    g.xf(M4.mul(M4.trans(0, 0.87, -0.2), M4.rotZ(Math.PI / 2)), () => { g.cyl(0, -0.11, 0, 0.022, 0.022, 0.22, 8, C(0x2a2622)); for (const s of [-1, 1]) g.cyl(0, s * 0.1 - 0.02, 0, 0.035, 0.035, 0.04, 8, C(0x2a2622)); });
    g.bx(0.15, 0.75, -0.3, 0.14, 0.02, 0.18, C(0xd8d0b8), XM('print')); g.bx(-0.17, 0.75, -0.32, 0.12, 0.03, 0.16, C(0x6a2a22));   // a pad, the phone book
    g.bx(0, 1.15, -0.44, 0.3, 0.4, 0.02, C(0x52463a)); g.bx(0, 1.17, -0.43, 0.26, 0.34, 0.006, C(0xd8d0b8), XM('print'));   // numbers by the phone
  },
  tv(g) {
    g.matId = MAT.wood;
    g.bx(0, 0, -0.08, 1.8, 0.45, 0.6, COL.woodD);
    g.matId = 0;
    for (const s of [-1, 1]) { g.bx(s * 0.45, 0.04, 0.225, 0.84, 0.36, 0.012, mul3(COL.woodD, 1.15), XM('wood')); g.bx(s * 0.08, 0.22, 0.235, 0.015, 0.06, 0.015, COL.brass); }
    g.bx(0.55, 0.45, -0.05, 0.42, 0.09, 0.32, C(0x1e1e20)); g.bx(0.66, 0.48, 0.115, 0.08, 0.025, 0.004, C(0x40ff90), EMIT(0.6));   // the video, blinking twelve
    g.bx(-0.12, 0.45, -0.14, 0.8, 0.6, 0.56, C(0x3a342c), XM('wood'));
    g.frustum(-0.12, 0.47, -0.43, 0.6, 0.12, 0.4, 0.08, 0.5, C(0x2a2622));
    g.bx(-0.12, 0.47, 0.145, 0.74, 0.56, 0.02, C(0x1a1816));
    g.sphere(-0.12, 0.75, 0.15, 0.31, 0.24, 0.035, 12, 8, C(0x7aa8d8), [1, 2 + MAT.screen, -1, -1]);
    g.bx(0.2, 0.52, 0.15, 0.08, 0.4, 0.02, C(0x2a2622)); for (let k = 0; k < 2; k++) g.cyl(0.2, 0.9 - k * 0.12, 0.16, 0.025, 0.025, 0.02, 8, COL.metalD);
    g.xf(M4.mul(M4.trans(-0.24, 1.05, -0.15), M4.rotZ(0.5)), () => g.bx(0, 0, 0, 0.015, 0.5, 0.015, COL.metal));
    g.xf(M4.mul(M4.trans(0.0, 1.05, -0.15), M4.rotZ(-0.5)), () => g.bx(0, 0, 0, 0.015, 0.5, 0.015, COL.metal));
    g.sphere(-0.12, 1.06, -0.15, 0.05, 0.03, 0.05, 6, 3, COL.metalD);
  },
  oldtv(g) {
    for (const s of [-1, 1]) for (const z of [-0.3, 0.1]) g.cyl(s * 0.3, 0, z, 0.02, 0.015, 0.25, 6, COL.woodD);
    g.matId = MAT.wood;
    g.bx(0, 0.25, -0.1, 0.72, 0.7, 0.52, C(0x5a3e28));
    g.matId = 0;
    g.bx(-0.06, 0.32, 0.165, 0.5, 0.42, 0.01, C(0x1a1612));
    g.sphere(-0.06, 0.53, 0.17, 0.21, 0.17, 0.03, 12, 8, C(0x8aa0b0), [0.6, 2 + MAT.screen, -1, -1]);
    for (let k = 0; k < 3; k++) g.xf(M4.mul(M4.trans(0.27, 0.78 - k * 0.15, 0.16), M4.rotX(Math.PI / 2)), () => g.cyl(0, 0, 0, 0.03, 0.03, 0.03, 8, C(0xc8b890)));
    g.bx(0, 0.95, -0.1, 0.3, 0.02, 0.2, C(0xe8e2d4)); g.cyl(0.1, 0.97, -0.1, 0.05, 0.04, 0.14, 8, C(0x6a8a9a), GLASS);   // a doily, a vase
  },
  table(g, o) {
    g.matId = MAT.wood;
    g.bx(0, 0.72, 0, 1.84, 0.05, 0.88, COL.woodL); g.bx(0, 0.63, 0, 1.68, 0.09, 0.74, COL.wood);
    for (const [x, z] of [[-0.82, -0.36], [0.82, -0.36], [-0.82, 0.36], [0.82, 0.36]]) g.frustum(x, 0, z, 0.04, 0.04, 0.065, 0.065, 0.72, COL.woodD);
    g.matId = 0;
    const y = 0.77, home = o.z > 18;
    g.xf(M4.mul(M4.trans(-0.32, y, 0.08), M4.rotY(0.35)), () => { g.bx(0, 0, 0, 0.44, 0.012, 0.32, C(0xcfc8b4), XM('print')); g.bx(0.08, 0.012, -0.04, 0.12, 0.004, 0.1, C(0x3a3632)); });   // the paper, open at the same page
    g.cyl(0.32, y, -0.16, 0.042, 0.04, 0.095, 10, home ? C(0xa83a2a) : C(0xd8d4c8)); g.bx(0.37, y + 0.04, -0.16, 0.02, 0.05, 0.012, home ? C(0xa83a2a) : C(0xd8d4c8));
    g.cyl(0.32, y + 0.085, -0.16, 0.034, 0.034, 0.005, 8, C(0x2a1a10));
    if (home) {
      g.cyl(0.55, y, 0.16, 0.13, 0.13, 0.012, 16, C(0xd8d4c8)); g.sphere(0.55, y + 0.02, 0.16, 0.06, 0.02, 0.05, 6, 3, C(0x7a4a2a));
      g.cyl(-0.68, y, -0.22, 0.07, 0.06, 0.025, 10, C(0x6a7a7a), GLASS); for (let k = 0; k < 3; k++) g.bx(-0.69 + k * 0.015, y + 0.026, -0.22 + (k - 1) * 0.02, 0.008, 0.008, 0.04, C(0xd8d0c0));   // an ashtray, full
    }
  },
  chair(g, o) {
    const off = o.z < 13, c = off ? C(0x6a6458) : COL.wood, d = off ? C(0x3a3a3a) : COL.woodD;
    g.matId = off ? 0 : MAT.wood;
    g.bx(0, 0.42, 0.03, 0.46, 0.045, 0.46, c);
    for (const [x, z] of [[-0.2, -0.18], [0.2, -0.18], [-0.2, 0.22], [0.2, 0.22]]) g.bx(x, 0, z, 0.035, 0.42, 0.035, d);
    g.bx(0, 0.14, 0.02, 0.4, 0.02, 0.02, d); for (const s of [-1, 1]) g.bx(s * 0.2, 0.14, 0.02, 0.02, 0.02, 0.4, d);
    for (const s of [-1, 1]) g.bx(s * 0.2, 0.42, -0.2, 0.035, 0.53, 0.035, d);
    g.bx(0, 0.86, -0.2, 0.46, 0.09, 0.035, c);
    if (off) g.bx(0, 0.5, -0.2, 0.42, 0.3, 0.025, c); else for (const x of [-0.1, 0, 0.1]) g.bx(x, 0.47, -0.2, 0.035, 0.39, 0.022, c);
    g.matId = 0;
  },
  armchair(g, o) {
    const agnes = o.id === 'agnesChair', c = agnes ? C(0x6a4a52) : [C(0x6a4a52), C(0x4a5a4a), C(0x5a4a3a), C(0x4a4a62)][Math.floor(hash2(o.x, o.z, 5) * 4)];
    for (const [x, z] of [[-0.36, -0.34], [0.36, -0.34], [-0.36, 0.34], [0.36, 0.34]]) g.cyl(x, 0, z, 0.03, 0.025, 0.08, 6, COL.woodD);
    g.matId = MAT.fabric;
    g.bx(0, 0.08, 0, 0.84, 0.3, 0.8, c);
    g.frustum(0, 0.38, 0.07, 0.62, 0.64, 0.6, 0.62, 0.1, mul3(c, 1.12));
    g.xf(M4.mul(M4.trans(0, 0.38, -0.31), M4.rotX(-0.12)), () => { g.bx(0, 0, 0, 0.8, 0.58, 0.2, c); g.xf(M4.mul(M4.trans(-0.4, 0.58, 0), M4.rotZ(-Math.PI / 2)), () => g.cyl(0, 0, 0, 0.1, 0.1, 0.8, 8, mul3(c, 1.04))); g.bx(0, 0.06, 0.11, 0.64, 0.46, 0.06, mul3(c, 1.08)); });
    for (const s of [-1, 1]) { g.bx(s * 0.37, 0.38, 0.02, 0.11, 0.18, 0.76, c); g.xf(M4.mul(M4.trans(s * 0.37, 0.58, -0.36), M4.rotX(Math.PI / 2)), () => g.cyl(0, 0, 0, 0.075, 0.075, 0.76, 8, mul3(c, 1.06))); }
    g.matId = 0;
    if (agnes) { g.xf(M4.mul(M4.trans(0, 0.83, -0.18), M4.rotX(-0.12)), () => g.bx(0, 0, 0, 0.34, 0.24, 0.01, C(0xe8e2d4))); for (const s of [-1, 1]) g.cyl(s * 0.37, 0.65, 0.1, 0.06, 0.06, 0.005, 10, C(0xe8e2d4)); }   // doilies
  },
  sofa(g, o) {
    const c = C(0x55463a);
    for (const x of [-1.38, 1.38]) for (const z of [-0.34, 0.38]) g.cyl(x, 0, z, 0.035, 0.03, 0.07, 6, COL.woodD);
    g.matId = MAT.fabric;
    g.bx(0, 0.07, 0.04, 2.92, 0.27, 0.84, c);
    for (const x of [-0.92, 0, 0.92]) { g.frustum(x, 0.34, 0.1, 0.9, 0.7, 0.86, 0.66, 0.12, mul3(c, 1.12)); g.sphere(x, 0.47, 0.42, 0.45, 0.03, 0.04, 8, 3, mul3(c, 1.1)); }
    g.bx(0, 0.34, -0.33, 2.92, 0.56, 0.2, c);
    for (const x of [-0.92, 0, 0.92]) g.xf(M4.mul(M4.trans(x, 0.46, -0.2), M4.rotX(-0.15)), () => g.bx(0, 0, 0, 0.88, 0.4, 0.12, mul3(c, 1.06)));
    for (const s of [-1, 1]) { g.bx(s * 1.39, 0.34, 0.04, 0.14, 0.22, 0.84, c); g.xf(M4.mul(M4.trans(s * 1.39, 0.56, -0.38), M4.rotX(Math.PI / 2)), () => g.cyl(0, 0, 0, 0.08, 0.08, 0.84, 8, mul3(c, 1.05))); }
    g.matId = 0;
    g.xf(M4.mul(M4.trans(-1.05, 0.62, -0.08), M4.mul(M4.rotY(0.3), M4.rotZ(0.25))), () => g.bx(0, 0, 0, 0.32, 0.3, 0.12, C(0x8a6a3a), XM('fabric')));   // a cushion
    g.xf(M4.mul(M4.trans(1.2, 0.5, 0.05), M4.rotZ(-0.2)), () => g.bx(0, 0, 0, 0.5, 0.05, 0.8, C(0x3a4a5a), XM('fabric')));   // a blanket thrown over the arm
    g.bx(0, 0, 0.04, 2.8, 0.06, 0.7, COL.black);
  },
  floorlamp(g) { g.cyl(0, 0, 0, 0.16, 0.16, 0.04, 10, COL.metalD); g.cyl(0, 0.04, 0, 0.02, 0.02, 1.3, 6, COL.metalD); g.cyl(0, 1.3, 0, 0.26, 0.16, 0.36, 10, C(0xd8c39a), EMIT(0.9)); },
  radiator(g) {
    for (let k = -4; k <= 4; k++) g.bx(k * 0.1, 0.1, -0.36, 0.055, 0.58, 0.14, COL.cream);
    g.bx(0, 0.06, -0.36, 0.9, 0.05, 0.06, COL.cream); g.bx(0, 0.62, -0.36, 0.9, 0.05, 0.06, COL.cream);
    g.bx(-0.48, 0, -0.38, 0.04, 0.12, 0.04, COL.metalD);
  },
  desk(g, o) {
    const lam = C(0x9a9384), fab = C(0x4a5664), y = 0.77, h = (k) => hash2(o.x, o.z, k);
    g.bx(0, 0.72, 0, 1.92, 0.05, 0.86, lam); g.bx(-0.93, 0, 0, 0.04, 0.72, 0.84, mul3(lam, 0.8)); g.bx(0.93, 0, 0, 0.04, 0.72, 0.84, mul3(lam, 0.8));
    g.bx(0, 0.2, -0.38, 1.82, 0.5, 0.03, mul3(lam, 0.7));
    g.bx(0.62, 0, -0.05, 0.5, 0.7, 0.6, C(0x7a7c78), XM('metal')); for (const yy of [0.08, 0.31, 0.54]) { g.bx(0.62, yy, 0.255, 0.46, 0.2, 0.01, C(0x8a8c88)); g.bx(0.62, yy + 0.14, 0.265, 0.12, 0.02, 0.015, COL.metalD); }   // a pedestal of drawers
    g.bx(0, 0, -0.47, 2.0, 1.28, 0.06, fab, XM('fabric')); g.bx(0, 1.28, -0.47, 2.0, 0.04, 0.08, C(0x8a8a86));
    g.bx(-0.97, 0, -0.1, 0.06, 1.28, 0.8, fab, XM('fabric')); g.bx(-0.97, 1.28, -0.1, 0.08, 0.04, 0.8, C(0x8a8a86));
    // the terminal: a beige box with a green screen, sticky notes all round it
    g.frustum(-0.25, y, -0.24, 0.3, 0.26, 0.24, 0.2, 0.3, C(0xa8a08c));
    g.bx(-0.25, y, -0.12, 0.46, 0.4, 0.26, C(0xb5ad98));
    g.bx(-0.25, y + 0.05, 0.012, 0.38, 0.3, 0.02, C(0x1a1e1c));
    g.bx(-0.25, y + 0.07, 0.024, 0.32, 0.25, 0.004, COL.screen, [0.8, 2 + MAT.screen, -1, -1]);
    for (let k = 0; k < 3; k++) if (h(k) < 0.7) g.xf(M4.mul(M4.trans(-0.48 + (k % 2) * 0.02, y + 0.3 - k * 0.09, 0.015 + k * 0.002), M4.rotZ((h(k + 5) - 0.5) * 0.4)), () => g.bx(0, 0, 0, 0.06, 0.06, 0.002, [C(0xe0d070), C(0xe0a0b0), C(0xa0d0e0)][k]));
    g.bx(-0.25, y, 0.19, 0.44, 0.025, 0.15, C(0xc2baa5)); g.bx(-0.25, y + 0.025, 0.19, 0.4, 0.006, 0.12, C(0x6a665c), XM('tiles'));
    g.bx(0.02, y, 0.2, 0.05, 0.025, 0.08, C(0xc2baa5));
    // paper: a tray, a heap, a pen in a cup, coffee gone cold
    g.bx(0.45, y, 0.0, 0.3, 0.06, 0.24, C(0x3a3a3a)); g.bx(0.45, y + 0.02, 0.0, 0.27, 0.035, 0.21, C(0xd8d4c8), XM('print'));
    g.xf(M4.mul(M4.trans(0.5, y, 0.24), M4.rotY(0.2)), () => { for (let k = 0; k < 4; k++) g.bx((k % 2) * 0.02, k * 0.008, 0, 0.21, 0.008, 0.28, mul3(C(0xe2ded2), 1 - k * 0.03), XM('print')); });
    if (!o.mine) {
      g.cyl(0.8, y, -0.25, 0.04, 0.04, 0.1, 8, pick(PRODUCTS)); g.cyl(0.8, y + 0.095, -0.25, 0.033, 0.033, 0.005, 8, C(0x2a1a10));
      if (h(9) < 0.5) { g.bx(0.15, y, -0.28, 0.2, 0.06, 0.14, C(0x2a2a2a)); g.bx(0.15, y + 0.06, -0.28, 0.18, 0.03, 0.05, C(0x1a1a1a)); }   // a desk phone
      else { g.bx(0.18, y, -0.3, 0.12, 0.16, 0.02, C(0x3a2a1a)); g.bx(0.18, y + 0.02, -0.29, 0.09, 0.11, 0.004, C(0x7a7266)); }   // a photo of someone's family
    } else { g.bx(-0.68, y, -0.25, 0.12, 0.18, 0.02, C(0xd8c870)); g.cyl(0.8, y, -0.25, 0.035, 0.035, 0.12, 8, C(0x3a5a8a)); for (let k = 0; k < 3; k++) g.bx(0.79 + k * 0.01, y + 0.12, -0.25, 0.008, 0.1, 0.008, [C(0x1a1a1a), C(0xa02018), C(0x1a3a8a)][k]); }
  },
  bossdesk(g) {
    g.matId = MAT.wood;
    g.bx(0, 0, 0, 1.9, 0.76, 0.86, C(0x4a3122)); g.bx(0, 0.76, 0, 1.96, 0.04, 0.92, C(0x3a2618));
    for (const s of [-1, 1]) for (let k = 0; k < 3; k++) g.bx(s * 0.6, 0.08 + k * 0.22, -0.435, 0.5, 0.18, 0.01, C(0x553a28));
    g.matId = 0;
    g.bx(0, 0.8, 0.05, 0.9, 0.006, 0.5, C(0x2a3a2a));   // a leather blotter
    g.bx(0.25, 0.8, -0.2, 0.46, 0.36, 0.34, C(0xb5ad98)); g.bx(0.25, 0.85, -0.025, 0.36, 0.26, 0.02, COL.screen, [0.7, 2 + MAT.screen, -1, -1]);
    g.cyl(-0.65, 0.8, -0.2, 0.06, 0.06, 0.25, 8, COL.brass); g.bx(-0.65, 1.05, -0.2, 0.3, 0.1, 0.14, C(0x2e6a3e), EMIT(0.5));
    g.bx(-0.2, 0.806, 0.15, 0.4, 0.02, 0.24, C(0xd8d4c8), XM('print'));
    g.xf(M4.mul(M4.trans(0, 0.8, 0.36), M4.rotX(-0.5)), () => { g.bx(0, 0, 0, 0.34, 0.07, 0.05, C(0x2a1a10)); g.bx(0, 0.015, 0.026, 0.28, 0.04, 0.002, COL.brass); });   // a nameplate, turned to face you
    g.cyl(-0.3, 0.8, -0.28, 0.08, 0.07, 0.02, 10, C(0x2a3a3a), GLASS); g.bx(-0.3, 0.825, -0.28, 0.09, 0.02, 0.02, C(0x5a3a22));   // ashtray, a cigar
    for (let k = 0; k < 3; k++) g.bx(-0.6 + k * 0.01, 0.8 + k * 0.03, 0.2, 0.32, 0.03, 0.24, [C(0x3a5a8a), C(0x8a3a2a), C(0xd8d0b0)][k]);   // files, stacked
  },
  chair_office(g) {
    const c = C(0x2f3338);
    g.bx(0, 0.02, 0, 0.6, 0.04, 0.08, COL.metalD); g.bx(0, 0.02, 0, 0.08, 0.04, 0.6, COL.metalD);
    g.cyl(0, 0.06, 0, 0.035, 0.035, 0.38, 6, COL.metalD); g.bx(0, 0.44, 0.02, 0.5, 0.08, 0.48, c); g.bx(0, 0.52, -0.22, 0.46, 0.55, 0.06, c);
  },
  bookshelf(g) {
    const w = COL.woodD; g.bx(0, 0, -0.3, 1.9, 1.98, 0.04, w); g.bx(-0.93, 0, -0.08, 0.04, 1.98, 0.48, w); g.bx(0.93, 0, -0.08, 0.04, 1.98, 0.48, w);
    for (let s = 0; s < 5; s++) {
      const y = 0.05 + s * 0.46; g.bx(0, y - 0.03, -0.08, 1.84, 0.03, 0.46, w);
      if (s === 4) break;
      let x = -0.88; let k = 0;
      while (x < 0.85) { const bw = 0.05 + hash2(s, k, 1) * 0.06, bh = 0.26 + hash2(s, k, 2) * 0.12; g.bx(x + bw / 2, y, -0.1, bw * 0.92, bh, 0.3, PRODUCTS[(s * 7 + k) % PRODUCTS.length]); x += bw; k++; if (hash2(s, k, 4) < 0.07) x += 0.15; }
    }
  },
  plant(g, o) {
    const pot = C(0x6a4a36);
    g.cyl(0, 0, 0, 0.17, 0.22, 0.38, 12, pot); g.cyl(0, 0.36, 0, 0.225, 0.225, 0.045, 12, mul3(pot, 0.85)); g.cyl(0, 0.37, 0, 0.2, 0.2, 0.022, 12, C(0x2a1e14));
    g.cyl(0, 0.38, 0, 0.022, 0.014, 0.75, 5, C(0x3a4a2a));
    const lf = C(0x2c4a2a);
    for (let k = 0; k < 13; k++) {
      const a = k * 2.4 + hash2(o.x, o.z, k) * 0.5, el = 0.25 + (k % 4) * 0.2, y = 0.48 + k * 0.055, L = 0.16 + (k % 3) * 0.04;
      g.xf(M4.mul(M4.trans(0, y, 0), M4.mul(M4.rotY(a), M4.rotX(el))), () => { g.sphere(0, 0, L, 0.075, 0.012, L, 7, 3, mul3(lf, 0.75 + 0.1 * (k % 4))); g.bx(0, 0.011, L, 0.006, 0.004, L * 1.6, mul3(lf, 1.4)); });
    }
  },
  watercooler(g) { g.bx(0, 0, -0.05, 0.36, 0.92, 0.36, C(0xcfcbc0)); g.cyl(0, 0.92, -0.05, 0.15, 0.15, 0.42, 10, C(0x5c8fb8), GLASS); g.bx(0.08, 0.7, 0.14, 0.04, 0.05, 0.04, C(0x3a6aa8)); g.bx(-0.08, 0.7, 0.14, 0.04, 0.05, 0.04, C(0xa83a3a)); },
  printer(g) { g.bx(0, 0, 0, 0.7, 0.7, 0.6, C(0x4a4a48)); g.bx(0, 0.7, -0.03, 0.62, 0.3, 0.5, C(0xbab5a6)); g.bx(0, 0.86, 0.22, 0.4, 0.02, 0.2, C(0xe2ded2)); g.bx(0.2, 0.98, 0.1, 0.06, 0.02, 0.05, C(0x60ff90), EMIT(1)); },
  coffee(g) {
    g.bx(0, 0, -0.05, 0.98, 0.86, 0.82, C(0x6f6e66)); g.bx(0, 0.86, -0.05, 1.0, 0.06, 0.88, C(0x7b7563));
    g.bx(0, 0.92, -0.18, 0.4, 0.46, 0.34, COL.black); g.cyl(0, 0.95, 0.05, 0.08, 0.09, 0.16, 8, COL.glass, GLASS);
    g.bx(0.12, 1.25, -0.005, 0.03, 0.03, 0.01, C(0xff3020), EMIT(1));
  },
  vending(g) {
    g.bx(0, 0, -0.06, 0.92, 1.92, 0.78, C(0x5a1e1e)); g.bx(-0.1, 0.5, 0.335, 0.62, 1.25, 0.02, C(0xa0c8d0), EMIT(0.55));
    for (let r = 0; r < 5; r++) for (let k = 0; k < 4; k++) g.bx(-0.33 + k * 0.155, 0.58 + r * 0.24, 0.32, 0.09, 0.12, 0.02, PRODUCTS[(r * 4 + k) % 10], EMIT(0.45));
    g.bx(0.33, 1.1, 0.335, 0.14, 0.3, 0.02, COL.metalD); g.bx(-0.1, 0.18, 0.335, 0.5, 0.18, 0.02, COL.black);
  },
  serverrack(g) {
    g.bx(0, 0, 0, 0.76, 1.98, 0.86, C(0x111214));
    for (let r = 0; r < 12; r++) for (let k = 0; k < 3; k++) if (hash2(r, k, 9) > 0.35) g.bx(-0.25 + k * 0.05, 0.2 + r * 0.14, 0.432, 0.025, 0.025, 0.01, hash2(r, k, 8) > 0.8 ? C(0xff4030) : C(0x40ff80), EMIT(1));
  },
  metalshelf(g, o) {
    for (const x of [-1.42, 1.42]) for (const z of [-0.36, 0.3]) g.bx(x, 0, z, 0.04, 1.88, 0.04, COL.metal);
    for (let s = 0; s < 4; s++) {
      const y = 0.1 + s * 0.55; g.bx(0, y, -0.03, 2.9, 0.03, 0.7, COL.metal);
      for (let k = 0; k < 5; k++) if (hash2(o.x + s, k, 3) > 0.25) { const h = 0.2 + hash2(s, k + o.z, 5) * 0.25; g.bx(-1.15 + k * 0.58, y + 0.03, -0.05, 0.46, h, 0.5, mix3(COL.card, C(0x6a5034), hash2(k, s, 2))); }
    }
  },
  shelf_groc(g, o) { MODELS._gondola(g, o, [0xb8a070, 0x8a3a2a, 0xd0c8b0, 0x6a7a3a, 0xa86a3a]); },
  shelf_house(g, o) { MODELS._gondola(g, o, [0x8aa0b0, 0xc0c0c0, 0x3a5a8a, 0xb0b0a0, 0x7a3a3a]); },
  shelf_snack(g, o) { MODELS._gondola(g, o, [0xc04a2a, 0xd0a030, 0x3a7a4a, 0x8a2a6a, 0x2a6aa0]); },
  _gondola(g, o, pal) {
    g.bx(0, 0, -0.35, 2.94, 1.76, 0.06, C(0x8c9088)); g.bx(0, 0, -0.05, 2.94, 0.14, 0.7, C(0x6a6e68));
    g.bx(-1.45, 0, -0.05, 0.04, 1.78, 0.7, C(0x9a9e96)); g.bx(1.45, 0, -0.05, 0.04, 1.78, 0.7, C(0x9a9e96));
    for (let s = 0; s < 4; s++) {
      const y = 0.14 + s * 0.42; g.bx(0, y, -0.05, 2.86, 0.025, 0.62, C(0xa8aca4));
      let x = -1.38, k = 0;
      while (x < 1.32) { const bw = 0.11 + hash2(o.x * 3 + s, k, 1) * 0.12, bh = 0.14 + hash2(s, k + o.x, 2) * 0.16; const col = C(pal[Math.floor(hash2(s + o.z, k, 3) * pal.length)]); g.bx(x + bw / 2, y + 0.025, 0.04, bw * 0.9, bh, 0.36, col); x += bw; k++; }
    }
  },
  cooler(g) {
    g.bx(0, 0, -0.1, 2.94, 1.98, 0.72, C(0x5a6064)); g.bx(0, 0.15, 0.265, 2.8, 1.7, 0.02, C(0xbfe2f0), EMIT(0.35));
    for (let s = 0; s < 4; s++) for (let k = 0; k < 14; k++) g.cyl(-1.3 + k * 0.2, 0.22 + s * 0.42, 0.18, 0.05, 0.05, 0.24, 6, PRODUCTS[(s * 3 + k) % 10], EMIT(0.25));
    for (const x of [-0.48, 0.48]) g.bx(x, 0.1, 0.28, 0.04, 1.8, 0.04, COL.metalD);
  },
  newsrack(g) { g.bx(0, 0, -0.1, 0.7, 1.0, 0.5, COL.metalD); for (let k = 0; k < 3; k++) g.bx(0, 0.25 + k * 0.3, 0.12, 0.6, 0.22, 0.04, C(0xd8d2c0)); g.bx(0, 1.0, -0.1, 0.7, 0.14, 0.5, C(0x7a1a1a)); },
  shopcounter(g) {
    g.bx(0, 0, 0, 2.94, 0.95, 0.8, C(0x5d6a66)); g.bx(0, 0.95, 0, 3.0, 0.05, 0.86, C(0x2f3533));
    g.bx(0.6, 1.0, -0.12, 0.42, 0.24, 0.36, C(0xb2ab97)); g.bx(0.6, 1.24, -0.2, 0.3, 0.16, 0.04, C(0x2a2a2a)); g.bx(0.6, 1.26, -0.17, 0.24, 0.1, 0.01, C(0x70ff90), EMIT(0.9));
    for (let k = 0; k < 6; k++) g.bx(-1.2 + k * 0.14, 1.0, 0.28, 0.1, 0.18, 0.1, PRODUCTS[k + 2]);
    g.bx(-0.4, 1.0, 0.0, 0.5, 0.35, 0.3, C(0x7a4a2a));
  },
  crates(g, o) { g.bx(0, 0, 0, 0.8, 0.5, 0.7, COL.card); g.bx(0.05, 0.5, 0.02, 0.6, 0.42, 0.55, mul3(COL.card, 0.9)); if (hash2(o.x, o.z, 1) > 0.5) g.bx(-0.05, 0.92, 0, 0.4, 0.3, 0.4, mul3(COL.card, 1.1)); },
  mailbox(g) { g.bx(0, 0.6, -0.4, 0.9, 0.95, 0.16, C(0x5a4a2e)); for (let r = 0; r < 3; r++) for (let k = 0; k < 4; k++) g.bx(-0.32 + k * 0.215, 0.7 + r * 0.29, -0.315, 0.18, 0.22, 0.01, COL.brass); },
  stairs(g) {
    const c = C(0x4a3a30);
    for (let s = 0; s < 9; s++) g.box(-0.95, 0, 0.95 - (s + 1) * 0.21, 0.95, 0.24 + s * 0.24, 0.95 - s * 0.21, c);
    g.bx(-0.97, 0, -0.05, 0.05, 2.4, 1.9, C(0x2a221c)); g.xf(M4.mul(M4.trans(0.95, 1.2, 0), M4.rotX(-0.85)), () => g.bx(0, 0, 0, 0.05, 0.05, 2.6, COL.woodD));
  },
  pcdesk(g) {
    g.matId = MAT.wood;
    g.bx(0, 0.72, 0, 0.94, 0.04, 0.8, COL.woodL); g.bx(-0.43, 0, 0, 0.05, 0.72, 0.78, COL.woodD); g.bx(0.43, 0, 0, 0.05, 0.72, 0.78, COL.woodD);
    g.bx(0, 0.4, -0.37, 0.82, 0.32, 0.02, COL.woodD);
    g.matId = 0;
    g.frustum(0, 0.76, -0.24, 0.3, 0.26, 0.24, 0.2, 0.32, C(0xa8a08c));
    g.bx(0, 0.76, -0.12, 0.46, 0.4, 0.26, C(0xb5ad98));
    g.bx(0, 0.81, 0.012, 0.38, 0.3, 0.02, C(0x1a1e1c));
    g.bx(0, 0.83, 0.024, 0.32, 0.25, 0.004, C(0x58a0d0), [0.9, 2 + MAT.screen, -1, -1]);
    g.bx(0, 0.76, 0.22, 0.42, 0.025, 0.15, C(0xc2baa5)); g.bx(0, 0.785, 0.22, 0.38, 0.006, 0.12, C(0x6a665c), XM('tiles'));
    g.bx(0.28, 0.76, 0.2, 0.05, 0.025, 0.08, C(0xc2baa5));
    g.bx(-0.33, 0.0, 0.05, 0.18, 0.42, 0.44, C(0xb5ad98)); g.bx(-0.33, 0.3, 0.272, 0.12, 0.03, 0.004, C(0x40ff90), EMIT(0.5));   // the tower under the desk
    for (let k = 0; k < 4; k++) g.xf(M4.mul(M4.trans(0.3 - k * 0.02, 0.76 + k * 0.006, -0.05), M4.rotY(0.2 + k * 0.15)), () => g.bx(0, 0, 0, 0.21, 0.006, 0.28, C(0xe2ded2), XM('print')));   // printouts
    g.cyl(-0.36, 0.76, 0.2, 0.04, 0.04, 0.1, 8, C(0xd8d4c8));
  },
  nightstand(g, o) {
    g.matId = MAT.wood;
    g.bx(0, 0.06, -0.1, 0.46, 0.49, 0.42, COL.wood);
    for (const s of [-1, 1]) for (const z of [-0.28, 0.08]) g.bx(s * 0.2, 0, z, 0.04, 0.07, 0.04, COL.woodD);
    g.matId = 0;
    for (const y of [0.13, 0.33]) { g.bx(0, y, 0.115, 0.4, 0.16, 0.012, mul3(COL.wood, 1.12), XM('wood')); g.bx(0, y + 0.07, 0.125, 0.06, 0.015, 0.015, COL.brass); }
    g.cyl(-0.08, 0.55, -0.16, 0.07, 0.04, 0.22, 8, COL.brass); g.cyl(-0.08, 0.77, -0.16, 0.17, 0.11, 0.2, 10, C(0xd8b88a), EMIT(0.85));
    g.bx(0.12, 0.55, -0.02, 0.12, 0.07, 0.06, C(0x1e1e20)); g.bx(0.12, 0.575, 0.011, 0.08, 0.025, 0.003, C(0xff3a20), EMIT(0.7));   // the alarm clock
    g.xf(M4.mul(M4.trans(0.08, 0.55, -0.24), M4.rotY(0.4)), () => g.bx(0, 0, 0, 0.14, 0.03, 0.2, C(0x5a2a22)));
  },
  wardrobe(g) {
    g.matId = MAT.wood;
    g.bx(0, 0.08, -0.08, 0.95, 1.86, 0.62, COL.woodD);
    g.bx(0, 1.94, -0.08, 1.0, 0.06, 0.66, mul3(COL.woodD, 1.2));
    for (const s of [-1, 1]) { g.bx(s * 0.4, 0, 0.15, 0.06, 0.08, 0.06, COL.woodD); g.bx(s * 0.4, 0, -0.32, 0.06, 0.08, 0.06, COL.woodD); }
    for (const s of [-1, 1]) for (const [y, h] of [[0.18, 0.8], [1.06, 0.78]]) g.bx(s * 0.235, y, 0.235, 0.38, h, 0.012, mul3(COL.woodD, 0.85));
    g.matId = 0;
    g.bx(0, 0.1, 0.235, 0.012, 1.82, 0.012, C(0x1a120c));
    g.bx(-0.06, 0.95, 0.245, 0.03, 0.12, 0.03, COL.brass); g.bx(0.06, 0.95, 0.245, 0.03, 0.12, 0.03, COL.brass);
    g.bx(0.04, 1.1, 0.235, 0.012, 0.6, 0.012, C(0x2a1a10));   // one door won't quite close
  },
  birdcage(g) {
    g.cyl(0, 0, 0, 0.2, 0.2, 0.04, 8, COL.brass); g.cyl(0, 0.04, 0, 0.02, 0.02, 1.0, 6, COL.brass);
    for (let k = 0; k < 10; k++) { const a = (k / 10) * TAU; g.bx(Math.sin(a) * 0.22, 1.04, Math.cos(a) * 0.22, 0.012, 0.5, 0.012, COL.brass); }
    g.cyl(0, 1.0, 0, 0.24, 0.24, 0.04, 10, COL.brass); g.cyl(0, 1.54, 0, 0.24, 0.02, 0.18, 10, COL.brass); g.bx(0, 1.2, 0, 0.36, 0.01, 0.01, COL.brass);
  },
  streetlamp(g) {
    g.cyl(0, 0, 0, 0.12, 0.09, 0.3, 8, COL.metalD); g.cyl(0, 0.3, 0, 0.06, 0.05, 3.9, 8, C(0x3d4246));
    g.bx(0, 4.15, 0.4, 0.07, 0.07, 0.9, C(0x3d4246)); g.bx(0, 3.95, 0.9, 0.34, 0.16, 0.5, C(0x2c2f33)); g.bx(0, 3.93, 0.9, 0.28, 0.02, 0.42, C(0xffc070), EMIT(1));
  },
  parklamp(g) { g.cyl(0, 0, 0, 0.14, 0.1, 0.4, 8, COL.black); g.cyl(0, 0.4, 0, 0.05, 0.05, 2.5, 8, COL.black); g.cyl(0, 2.9, 0, 0.18, 0.13, 0.36, 6, C(0xffd090), EMIT(1)); g.cyl(0, 3.26, 0, 0.24, 0.03, 0.18, 6, COL.black); },
  alleylamp(g) { g.cyl(0, 0, 0, 0.07, 0.06, 2.6, 6, C(0x4a3a2c)); g.bx(0, 2.55, 0.2, 0.05, 0.05, 0.45, C(0x4a3a2c)); g.sphere(0, 2.4, 0.4, 0.07, 0.09, 0.07, 8, 6, C(0xfff0b0), EMIT(1)); },
  tree(g, o) {
    const bark = C(0x3a2e24), h = (k) => hash2(o.x, o.z, k);
    g.cyl(0, 0, 0, 0.2, 0.13, 0.35, 8, mul3(bark, 0.9)); g.cyl(0, 0.35, 0, 0.13, 0.09, 2.0, 8, bark);
    for (let k = 0; k < 3; k++) g.xf(M4.mul(M4.trans(0, 1.6 + k * 0.3, 0), M4.mul(M4.rotY(k * 2.1 + h(1) * 3), M4.rotX(0.75))), () => g.cyl(0, 0, 0, 0.06, 0.03, 0.9, 6, bark));
    const lf = mix3(C(0x22341f), C(0x2c3d22), h(2));
    const blobs = [[0.05, 2.65, 0, 1.0, 0.85], [-0.55, 2.9, 0.3, 0.7, 0.62], [0.55, 3.0, -0.3, 0.72, 0.6], [-0.2, 3.45, 0.15, 0.75, 0.66], [0.35, 3.6, 0.35, 0.55, 0.5], [0.1, 4.0, -0.15, 0.5, 0.48], [-0.4, 2.55, -0.45, 0.6, 0.5], [0.5, 2.5, 0.5, 0.55, 0.45]];
    blobs.forEach(([x, y, z, r, ry], k) => g.sphere(x * (0.8 + h(k + 3) * 0.4), y, z * (0.8 + h(k + 9) * 0.4), r, ry, r, 8, 6, mul3(lf, 0.82 + 0.1 * (k % 3) + 0.12 * (y > 3.3 ? 1 : 0))));
  },
  bench(g) {
    const w = C(0x5a4836);
    for (let k = 0; k < 4; k++) g.bx(0, 0.42, -0.18 + k * 0.13, 1.86, 0.04, 0.1, w);
    for (let k = 0; k < 3; k++) g.bx(0, 0.58 + k * 0.13, -0.3, 1.86, 0.08, 0.04, w);
    for (const x of [-0.8, 0.8]) { g.bx(x, 0, 0.0, 0.06, 0.42, 0.5, COL.black); g.bx(x, 0.42, -0.3, 0.06, 0.48, 0.05, COL.black); }
  },
  payphone(g) { g.bx(0, 0, -0.3, 0.12, 1.2, 0.12, COL.metalD); g.bx(0, 1.0, -0.25, 0.46, 0.7, 0.22, C(0x3a4a5a)); g.bx(0, 1.25, -0.13, 0.3, 0.3, 0.02, C(0xa0b4c0), EMIT(0.4)); g.bx(-0.16, 1.2, -0.12, 0.07, 0.3, 0.07, COL.black); g.bx(0, 1.72, -0.25, 0.5, 0.06, 0.3, C(0x2a3a4a)); },
  trashcan(g) { g.cyl(0, 0, 0, 0.25, 0.28, 0.85, 10, C(0x3a4038)); g.cyl(0, 0.85, 0, 0.3, 0.26, 0.08, 10, C(0x2a2e28)); },
  dumpster(g) { g.bx(0, 0, 0, 1.86, 1.15, 0.86, C(0x2a3a2a)); g.xf(M4.mul(M4.trans(0, 1.15, 0.43), M4.rotX(0.12)), () => g.bx(0, 0, -0.45, 1.9, 0.06, 0.92, C(0x1f2c1f))); for (const x of [-0.7, 0.7]) g.cyl(x, 0, 0.3, 0.08, 0.08, 0.1, 6, COL.black); },
  cart(g) {
    for (const x of [-0.25, 0.25]) for (const z of [-0.3, 0.3]) g.cyl(x, 0, z, 0.05, 0.05, 0.06, 6, COL.black);
    g.bx(0, 0.06, 0, 0.5, 0.05, 0.7, COL.metal); g.bx(0, 0.42, 0, 0.56, 0.5, 0.74, C(0x6a6e70));
    g.bx(0, 0.92, 0.0, 0.5, 0.3, 0.6, C(0x3a3a50)); g.bx(0.05, 1.1, 0.1, 0.35, 0.25, 0.3, C(0x2a2a2a)); g.bx(0, 0.9, -0.42, 0.56, 0.04, 0.04, COL.metal);
  },
  bucket(g) { g.cyl(0, 0, 0, 0.22, 0.2, 0.32, 8, C(0xb8a028)); g.xf(M4.mul(M4.trans(0, 0.2, 0), M4.rotZ(0.25)), () => g.bx(0, 0, 0, 0.03, 1.0, 0.03, C(0x8a6a4a))); },
  fence4(g, o, n = 4) {
    const c = C(0x23262a), h = n / 2;
    for (let k = 0; k <= n; k++) { g.bx(-h + k, 0, 0, 0.07, 1.05, 0.07, c); g.sphere(-h + k, 1.1, 0, 0.06, 0.06, 0.06, 6, 4, c); }
    g.bx(0, 0.22, 0, n, 0.05, 0.04, c); g.bx(0, 0.88, 0, n, 0.05, 0.04, c);
    for (let k = 0; k < n * 4; k++) g.bx(-h + 0.125 + k * 0.25, 0.22, 0, 0.022, 0.7, 0.022, c);
  },
  fence3(g, o) { MODELS.fence4(g, o, 3); },
  rug_home(g) {
    g.matId = MAT.fabric;
    g.bx(0, 0, 0, 2.8, 0.01, 1.8, C(0x5a2a26)); g.bx(0, 0, 0, 2.5, 0.014, 1.5, C(0x6e3a2e)); g.bx(0, 0, 0, 1.7, 0.018, 0.7, C(0x4a2420));
    for (let k = -1; k <= 1; k++) g.bx(k * 0.55, 0, 0, 0.18, 0.02, 0.18, C(0x8a6a3a));
    for (const s of [-1, 1]) for (let k = 0; k < 14; k++) g.bx(-1.3 + k * 0.2, 0, s * 0.94, 0.03, 0.006, 0.08, C(0xb0a080));   // fringe
    g.matId = 0;
  },
  rug_agnes(g) {
    g.matId = MAT.fabric;
    g.bx(0, 0, 0, 2.8, 0.01, 1.8, C(0x2c3a2e)); g.bx(0, 0, 0, 2.5, 0.014, 1.5, C(0x3c4e3e)); g.bx(0, 0, 0, 1.6, 0.018, 0.8, C(0x5a4a34));
    for (const [x, z] of [[-0.9, -0.5], [0.9, -0.5], [-0.9, 0.5], [0.9, 0.5]]) g.bx(x, 0, z, 0.22, 0.02, 0.22, C(0x7a5a3a));
    g.matId = 0;
  },
  rug_house(g, o) {
    const pal = [[0x4a2a2a, 0x6a4a3a], [0x2a3a4a, 0x4a5a6a], [0x3a3a2a, 0x5a5a3a], [0x4a3a4a, 0x6a5a6a]][Math.floor(hash2(o.x, o.z, 3) * 4)];
    g.matId = MAT.fabric;
    g.bx(0, 0, 0, 2.2, 0.01, 1.5, C(pal[0])); g.bx(0, 0, 0, 1.9, 0.014, 1.2, C(pal[1])); g.bx(0, 0, 0, 1.1, 0.018, 0.5, C(pal[0]));
    g.matId = 0;
  },
  runner(g) { g.matId = MAT.fabric; g.bx(0, 0, 0, 2.9, 0.01, 0.72, C(0x3a2c2a)); g.bx(0, 0, 0, 2.7, 0.014, 0.52, C(0x4c3630)); g.matId = 0; },
  trashbags(g) {
    const c = C(0x1b1f1c);
    g.sphere(-0.15, 0.24, 0.06, 0.3, 0.26, 0.28, 9, 6, c); g.sphere(0.2, 0.21, -0.12, 0.26, 0.23, 0.26, 9, 6, mul3(c, 1.25));
    g.sphere(0.04, 0.48, 0, 0.19, 0.19, 0.19, 8, 6, mul3(c, 0.9)); g.bx(0.04, 0.64, 0, 0.06, 0.08, 0.06, mul3(c, 0.8));
  },
  parkedcar(g, o) { carGeo(g, C([0x5a2420, 0x2c3a4a, 0x7a776c, 0x3a4632][Math.floor(hash2(o.x, o.z, 9) * 4)])); },
  boxes(g, o) { MODELS.crates(g, o); },
  radio(g, o) {   // a little side table with a valve radio on it
    g.bx(0, 0, -0.05, 0.62, 0.7, 0.55, C(0x4a3626)); g.bx(0, 0.7, -0.05, 0.66, 0.04, 0.6, C(0x5e4530));
    g.bx(0, 0.74, -0.08, 0.5, 0.28, 0.24, C(0x6b3f22)); g.bx(-0.09, 0.78, 0.045, 0.24, 0.2, 0.01, C(0xc9b88a));
    g.cyl(0.16, 0.82, 0.045, 0.045, 0.045, 0.02, 10, C(0x2a2018)); g.bx(0.1, 1.02, -0.12, 0.012, 0.22, 0.012, COL.metal);
    g.bx(-0.09, 0.8, 0.05, 0.2, 0.012, 0.004, C(0xffb860), EMIT(0.5));
  },
  drain(g) { g.bx(0, 0, 0, 0.9, 0.06, 0.9, C(0x1c1d1e)); for (let k = -3; k <= 3; k++) g.bx(k * 0.12, 0.065, 0, 0.04, 0.02, 0.8, C(0x3a3b3c)); },
  hydrant(g) { g.cyl(0, 0, 0, 0.13, 0.11, 0.55, 8, C(0x7a2420)); g.sphere(0, 0.58, 0, 0.11, 0.1, 0.11, 8, 5, C(0x7a2420)); g.bx(0, 0.35, 0, 0.36, 0.08, 0.08, C(0x7a2420)); },
};

