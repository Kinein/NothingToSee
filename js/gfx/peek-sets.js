//@ gfx/peek-sets — Where you rummage, close: drawer, box, bins, wardrobe, books, papers, shelves, fridge, insides; your hand
//@ Defines: PK_FAMILY, PK_WARM, PK_DAY, PK_COOL, pkPen, pkPencil, pkClip, pkBand, pkPad, pkStapler, pkSheetAt, pkCoverSheet, pkDrawer, pkBox, pkBin, pkDumpster, …
//@ Uses:    gfx/peek-geo, world/grid, gfx/world-geometry, core/util, gfx/peek-things, gfx/renderer, gfx/peek-junk, gfx/gl
//@ (header made by tools/map.js; stripped by build.py)
// ───────────── where you rummage, for the close-up (gfx/peek): the inside of what your hand is in. Not the world's
// furniture: a little stage of its own, built to be seen from a few centimetres. Every set is the floor of the thing at
// y = 0, its opening toward the lens (+z, up), and says what it needs: box (its insides, darker in the corners), spot
// (where a hidden thing lies), pts (where the hand goes looking), cam, the lamp and the room's light, and cover (what
// lies over the hidden thing: pulled away when it's found). Every type of thing with insides has one (PK_FAMILY).
const PK_FAMILY = {
  desk: 'drawer',
  bossdesk: 'drawer',
  pcdesk: 'drawer',
  nightstand: 'drawer',
  counter: 'drawer',
  crates: 'box',
  boxes: 'box',
  metalshelf: 'box',
  trashcan: 'bin',
  dumpster: 'dumpster',
  wardrobe: 'wardrobe',
  bookshelf: 'books',
  newsrack: 'news',
  mailbox: 'mail',
  birdcage: 'cage',
  shelf_groc: 'shelf',
  shelf_house: 'shelf',
  shelf_snack: 'shelf',
  cooler: 'cooler',
  fridge: 'fridge',
  fridge_office: 'fridge',
};
const pkFamily = (type) => PK_FAMILY[type] || 'works';
const PK_WARM = [1.0, 0.86, 0.68],
  PK_DAY = [1.0, 0.97, 0.9],
  PK_COOL = [0.82, 0.92, 1.0];
// ── the little things at the bottom of every drawer
function pkPen(g, x, y, z, ry, col) {
  pkAt(g, x, y, z, ry, 0, 0, () => {
    pkTube(g, [-0.065, 0.0048, 0, 0.055, 0.0048, 0], 0.0046, 14, C(col), PKM.plastic, { caps: true });
    pkTube(g, [-0.072, 0.0048, 0, -0.03, 0.0048, 0], 0.0052, 14, mul3(C(col), 0.6), PKM.plastic, { caps: true });
    pkRBox(g, -0.05, 0.0105, 0, 0.034, 0.0016, 0.003, 0.0006, C(0xc8ccd0), PKM.steel);
    pkAt(g, 0.055, 0.0048, 0, 0, 0, -Math.PI / 2, () =>
      pkLathe(g, 0, 0, 0, [0.0044, 0, 0.0016, 0.009, 0.0006, 0.0105, 0, 0.011], 12, C(0xc0c4c8), PKM.steel),
    );
  });
}
function pkPencil(g, x, y, z, ry) {
  pkAt(g, x, y + 0.0038, z, ry, 0, 0, () =>
    g.xf(M4.rotZ(-Math.PI / 2), () => {
      pkLathe(g, 0, -0.07, 0, [0, 0, 0.0038, 0, 0.0038, 0.13], 6, C(0xe0b030), PKM.plain);
      pkLathe(g, 0, 0.06, 0, [0.0036, 0, 0.0012, 0.017, 0.0011, 0.0175], 12, C(0xd8b888), PKM.wood);
      pkLathe(g, 0, 0.077, 0, [0.0012, 0, 0, 0.003], 8, C(0x2a2a2c), PKM.steel);
      pkLathe(g, 0, -0.082, 0, [0, 0, 0.0039, 0, 0.0039, 0.012], 14, C(0xc8ccd0), PKM.steel);
      pkLathe(g, 0, -0.09, 0, [0, 0, 0.0036, 0.001, 0.0036, 0.008], 14, C(0xd88a8a), PKM.rubber);
    }),
  );
}
function pkClip(g, x, y, z, ry) {
  pkAt(g, x, y + 0.0006, z, ry, 0, 0, () =>
    pkTube(
      g,
      [
        0.012, 0, 0.003, -0.016, 0, 0.003, -0.016, 0, -0.004, 0.017, 0, -0.004, 0.017, 0, 0.0055, -0.01, 0, 0.0055,
        -0.01, 0, 0.0,
      ],
      0.0005,
      5,
      C(0xc8ccd0),
      PKM.steel,
      { caps: true, sub: 3 },
    ),
  );
}
function pkBand(g, x, y, z, r, col, seed) {
  const pts = [];
  for (let k = 0; k < 9; k++) {
    const a = (k / 9) * TAU,
      rr = r * (0.75 + pkHash(k, seed, 1, 2) * 0.5);
    pts.push(x + Math.cos(a) * rr, y + 0.0008, z + Math.sin(a) * rr * 0.8);
  }
  pkTube(g, pts, 0.0009, 4, C(col), PKM.rubber, { closed: true, flat: 0.5 });
}
function pkPad(g, x, y, z, ry, col) {
  pkAt(g, x, y, z, ry, 0, 0, () =>
    pkRBox(
      g,
      0,
      0.007,
      0,
      0.076,
      0.014,
      0.076,
      0.001,
      (f, s, t) => (f === 2 ? C(col) : f === 3 ? C(col) : ((f < 2 ? s : t) * 60) % 2 > 1 ? C(col) : mul3(C(col), 0.88)),
      PKM.paper,
    ),
  );
}
function pkStapler(g, x, y, z, ry) {
  pkAt(g, x, y, z, ry, 0, 0, () => {
    pkRBox(g, 0, 0.004, 0, 0.13, 0.008, 0.032, 0.003, C(0x1c1c1e), PKM.plastic);
    pkRBox(g, 0.008, 0.02, 0, 0.118, 0.018, 0.028, 0.008, C(0x8a1c1c), PKM.plastic);
    pkRBox(g, 0.062, 0.012, 0, 0.012, 0.01, 0.024, 0.002, C(0xc0c4c8), PKM.steel);
  });
}
function pkSheetAt(g, x, y, z, ry, w, d, col, mat, seed, amp) {
  pkAt(g, x, y, z, ry, 0, 0, () =>
    pkSheet(g, w, d, 10, 12, (u, v) => 0.0006 + pkNoise(u * 3, v * 3, 1, seed) * (amp || 0.004), C(col), mat),
  );
}
// what lies over a hidden thing: a sheet with a lump in it, or flat when nothing's under it
// rad: how far out from its middle the thing under it reaches, as a part of the sheet's half
function pkCoverSheet(w, d, col, mat, seed, crum) {
  return (g, lump, rad) =>
    pkSheet(
      g,
      w,
      d,
      26,
      26,
      (u, v) => {
        const r = Math.hypot(u - 0.5, v - 0.5) * 2,
          rr = rad || 0.3;
        return (
          0.001 +
          lump * (1 - sstep(rr, Math.min(1, rr + 0.5), r)) +
          (1 - Math.abs(pkFbm(u * 3, v * 3, 2, seed) * 2 - 1)) * crum
        );
      },
      C(col),
      mat,
      { flat: crum > 0.004 },
    );
}
// ── the sets
function pkDrawer(g, gg, rnd, o) {
  const night = o.type === 'nightstand',
    wood = C(night ? 0xb88a5a : o.type === 'bossdesk' ? 0x6a4428 : 0x9a7048),
    W = 0.42,
    D = 0.34,
    H = 0.1,
    t = 0.012;
  pkRBox(g, 0, -0.005, 0, W + 0.02, 0.01, D + 0.02, 0.002, mul3(wood, 1.1), PKM.wood);
  for (const s of [-1, 1]) pkRBox(g, s * (W / 2 + t / 2), H / 2, 0, t, H, D + 0.02, 0.003, wood, PKM.wood);
  pkRBox(g, 0, H / 2, -D / 2 - t / 2, W + 2 * t, H, t, 0.003, wood, PKM.wood);
  pkRBox(g, 0, H / 2 + 0.01, D / 2 + 0.012, W + 0.05, H + 0.04, 0.022, 0.004, mul3(wood, 0.95), PKM.wood);
  pkTube(
    g,
    [
      -0.05,
      H * 0.62,
      D / 2 + 0.024,
      -0.05,
      H * 0.62,
      D / 2 + 0.05,
      0.05,
      H * 0.62,
      D / 2 + 0.05,
      0.05,
      H * 0.62,
      D / 2 + 0.024,
    ],
    0.0045,
    10,
    C(0xb8a070),
    PKM.brass,
    { sub: 3 },
  );
  pkRBox(g, 0, 0.19, -0.42, 1.2, 0.03, 0.62, 0.004, mul3(wood, 0.7), PKM.wood); // the desk over it, where the drawer came out
  const cols = [0x1a3a8a, 0x1c1c1e, 0xb8202a, 0x1a6a3a];
  for (let k = 0; k < 3; k++)
    pkPen(g, -0.14 + rnd() * 0.08, 0, -0.1 + k * 0.05 + rnd() * 0.02, (rnd() - 0.5) * 0.5, cols[k % 4]);
  pkPencil(g, 0.08, 0, 0.11, 0.2 + rnd() * 0.3);
  for (let k = 0; k < 4; k++) pkClip(g, -0.05 + rnd() * 0.18, 0.0012, -0.12 + rnd() * 0.12, rnd() * TAU);
  pkBand(g, 0.12, 0.0012, 0.06, 0.022, 0xa86a3a, 1);
  pkBand(g, -0.16, 0.0012, 0.1, 0.018, 0x2a5aa0, 2);
  pkPad(g, -0.13, 0, 0.08, 0.3, 0xf0e060);
  pkStapler(g, 0.13, 0, -0.1, -0.4);
  pkAt(g, -0.1, 0.0, -0.1, 0.25, 0, 0, () => pkRBox(g, 0, 0.002, 0, 0.16, 0.004, 0.1, 0.0015, C(0xe4d8bc), PKM.paper)); // an envelope
  for (let k = 0; k < 3; k++)
    pkCoin(
      g,
      0.17 + rnd() * 0.02,
      0.0005,
      0.1 + k * 0.015,
      0.0105,
      0.0018,
      C(k ? 0xc0c4c8 : 0xb87333),
      k ? PKM.steel : PKM.brass,
    );
  return {
    box: [-W / 2, 0, -D / 2, W / 2, H, D / 2],
    spot: [0.04, 0.0, 0.01],
    pts: [
      [-0.08, 0.02, -0.04],
      [0.1, 0.02, 0.03],
      [0.0, 0.02, -0.08],
      [-0.12, 0.02, 0.07],
    ],
    cam: { eye: [0.0, 0.42, 0.29], at: [0.0, 0.01, -0.03], fov: 0.62 },
    key: { p: [-0.22, 0.72, 0.18], col: mul3(PK_WARM, 2.5), cone: [0.9, 0.55] },
    sky: [0.2, 0.18, 0.16],
    gnd: [0.07, 0.05, 0.04],
    rim: { p: [0.4, 0.3, -0.5], col: [0.3, 0.26, 0.2] },
    cover: pkCoverSheet(0.2, 0.24, 0xcdb98e, PKM.paper, 3, 0.007),
  };
}
function pkBox(g, gg, rnd, o) {
  const card = C(0xb48a5a),
    W = 0.38,
    D = 0.28,
    H = 0.2,
    t = 0.004;
  pkRBox(g, 0, -0.002, 0, W, t, D, 0.001, mul3(card, 0.92), PKM.card);
  for (const s of [-1, 1]) {
    pkRBox(g, (s * W) / 2, H / 2, 0, t, H, D, 0.001, card, PKM.card);
    pkRBox(g, 0, H / 2, (s * D) / 2, W, H, t, 0.001, card, PKM.card);
    pkAt(g, (s * W) / 2, H, 0, 0, 0, s * -2.1, () =>
      pkRBox(g, 0, D / 4 - 0.002, 0, t, D / 2 - 0.004, D - 0.01, 0.001, mul3(card, 1.05), PKM.card),
    ); // the flaps, folded back
    pkAt(g, 0, H, (s * D) / 2, 0, s * 2.0, 0, () =>
      pkRBox(g, 0, D / 4 - 0.002, 0, W - 0.01, D / 2 - 0.004, t, 0.001, mul3(card, 1.05), PKM.card),
    );
  }
  pkRBox(g, 0, H - 0.01, D / 2 + 0.0025, W * 0.98, 0.05, 0.0005, 0.0002, C(0xc8b07a), PKM.tape);
  pkRBox(g, 0, -0.012, 0, 1.0, 0.016, 0.7, 0.003, C(0x8a8e92), PKM.steel); // the shelf it's on
  const kraft = C(0xa8875a);
  for (let k = 0; k < 4; k++)
    pkAt(g, (rnd() - 0.5) * 0.24, 0.0, (rnd() - 0.5) * 0.16, rnd() * TAU, 0, 0, () =>
      pkCrumple(g, 0.18, 0.16, 20 + k, kraft, PKM.paper, 0.018),
    );
  for (let k = 0; k < 4; k++)
    pkPaperBall(
      g,
      (rnd() - 0.5) * 0.28,
      0.01,
      (rnd() - 0.5) * 0.18,
      0.025 + rnd() * 0.015,
      40 + k,
      C(0xd2c8aa),
      PKM.news,
    );
  pkCan(g, -0.13, 0, -0.08, 0.037, 0.11, 0x7a5a2a);
  pkCan(g, -0.13, 0.11, -0.08, 0.037, 0.11, 0x2a5a7a);
  return {
    box: [-W / 2, 0, -D / 2, W / 2, H, D / 2],
    spot: [0.05, 0.02, 0.0],
    pts: [
      [-0.06, 0.05, 0.02],
      [0.1, 0.05, -0.05],
      [0.02, 0.04, 0.06],
      [-0.1, 0.05, -0.03],
    ],
    cam: { eye: [0.0, 0.54, 0.28], at: [0.0, 0.03, -0.02], fov: 0.64 },
    key: { p: [0.1, 0.9, 0.12], col: mul3(o.out ? PK_DAY : PK_WARM, 2.3), cone: [0.92, 0.6] },
    sky: [0.16, 0.15, 0.14],
    gnd: [0.05, 0.04, 0.03],
    rim: { p: [-0.5, 0.4, -0.4], col: [0.2, 0.2, 0.22] },
    cover: pkCoverSheet(0.2, 0.2, 0xd2c8aa, PKM.news, 5, 0.012),
  };
}
function pkBin(g, gg, rnd, o) {
  const R = 0.165,
    H = 0.3;
  pkLathe(
    g,
    0,
    0,
    0,
    [R + 0.008, -0.02, R + 0.012, H, R + 0.02, H + 0.006, R + 0.02, H + 0.014, R + 0.012, H + 0.016],
    40,
    C(0x9a9ea2),
    PKM.steel,
  );
  pkGrid(
    g,
    40,
    10,
    (u, v, P) => {
      const a = u * TAU,
        y = v < 0.85 ? (v / 0.85) * H : H + ((v - 0.85) / 0.15) * 0.012,
        r =
          (v < 0.85 ? R : R + 0.012 + ((v - 0.85) / 0.15) * 0.004) +
          pkNoise(Math.cos(a) * 4, y * 18, Math.sin(a) * 4, 3) * 0.008;
      P[0] = Math.sin(a) * r;
      P[1] = v >= 0.85 ? H + 0.012 - Math.pow((v - 0.85) / 0.15, 2) * 0.03 : y;
      P[2] = Math.cos(a) * r;
    },
    C(0x141416),
    PKM.bag,
  );
  pkLathe(g, 0, 0, 0, [0, 0, R, 0], 30, C(0x141416), PKM.bag);
  for (let k = 0; k < 7; k++) {
    const a = (k / 7) * TAU + rnd() * 0.5,
      d = 0.08 + rnd() * 0.05; // round the edge: the middle is where a hand goes
    pkPaperBall(
      g,
      Math.cos(a) * d,
      0.015 + rnd() * 0.04,
      Math.sin(a) * d,
      0.03 + rnd() * 0.012,
      60 + k,
      k % 3 ? C(0xf0eee8) : C(0xd2c8aa),
      k % 3 ? PKM.receipt : PKM.news,
    );
  }
  for (let k = 0; k < 3; k++)
    pkAt(g, (rnd() - 0.5) * 0.08, 0.05 + k * 0.012, (rnd() - 0.5) * 0.08, rnd() * TAU, 0, 0, () =>
      pkCrumple(g, 0.16, 0.14, 90 + k, k % 2 ? C(0xe8e4dc) : C(0xb89a6a), PKM.paper, 0.01),
    );
  pkGrid(
    g,
    20,
    8,
    (u, v, P) => {
      const a = u * TAU,
        r =
          0.033 *
          (1 + (pkNoise(Math.cos(a) * 3, v * 4, Math.sin(a) * 3, 7) - 0.5) * 0.5) *
          (v < 0.1 || v > 0.9 ? 0.85 : 1);
      P[0] = -0.06 + v * 0.06;
      P[1] = 0.08 + Math.sin(a) * r * 0.7;
      P[2] = 0.05 + Math.cos(a) * r;
    },
    (u, v) => (v > 0.15 && v < 0.85 ? (u < 0.5 ? C(0xc8202a) : C(0xe8e8e8)) : C(0xb8bcc0)),
    PKM.foil,
    { out: [-0.03, 0.08, 0.05] },
  );
  for (let k = 0; k < 3; k++)
    pkTube(
      g,
      [0.05, 0.09, -0.04 + k * 0.012, 0.08, 0.092, -0.03 + k * 0.02, 0.1, 0.085, -0.015 + k * 0.03],
      (t) => 0.007 * (1 - t * 0.5),
      8,
      (u, t) => (pkHash(Math.floor(u * 10), Math.floor(t * 12), k, 1) < 0.2 ? C(0x4a3018) : C(0xd8b040)),
      PKM.plain,
      { caps: true, flat: 0.25 },
    );
  for (let k = 0; k < 2; k++)
    pkAt(g, -0.05 + k * 0.03, 0.095, -0.06, k, 0, 0, () => {
      pkRBox(g, 0, 0.002, 0, 0.05, 0.005, 0.058, 0.002, (f) => (f === 2 ? C(0x8a5a30) : C(0xc8a878)), PKM.paper);
      pkTube(g, [0, 0.005, 0.03, 0.01, 0.006, 0.06, 0.03, 0.004, 0.08], 0.0004, 3, C(0xe8e0d0), PKM.cloth);
    });
  return {
    box: [-R, 0, -R, R, H, R],
    spot: [0.02, 0.1, 0.0],
    pts: [
      [-0.05, 0.13, 0.03],
      [0.06, 0.13, -0.04],
      [0.0, 0.12, 0.06],
      [-0.06, 0.12, -0.05],
    ],
    cam: { eye: [0.0, 0.66, 0.24], at: [0.0, 0.1, -0.02], fov: 0.6 },
    key: {
      p: [0.15, 1.1, 0.25],
      col: mul3(o.out ? (o.night ? [1.0, 0.62, 0.3] : PK_DAY) : PK_WARM, o.night && o.out ? 1.8 : 2.4),
      cone: [0.94, 0.65],
    },
    sky: o.out && o.night ? [0.04, 0.05, 0.08] : [0.16, 0.17, 0.19],
    gnd: [0.04, 0.035, 0.03],
    rim: { p: [-0.5, 0.5, -0.5], col: [0.15, 0.16, 0.2] },
    cover: pkCoverSheet(0.18, 0.18, 0xd2c8aa, PKM.news, 9, 0.014),
  };
}
function pkDumpster(g, gg, rnd, o) {
  const W = 0.6,
    D = 0.42,
    H = 0.4,
    paint = (f, s, t) => (pkHash(Math.floor(s * 9), Math.floor(t * 9), f, 4) < 0.18 ? C(0x5a3a22) : C(0x2e5236));
  pkRBox(g, 0, -0.01, 0, W + 0.04, 0.02, D + 0.04, 0.004, paint, PKM.plain);
  for (const s of [-1, 1]) {
    pkRBox(g, s * (W / 2 + 0.01), H / 2, 0, 0.02, H, D + 0.04, 0.004, paint, PKM.plain);
    pkRBox(g, 0, H / 2, s * (D / 2 + 0.01), W + 0.04, H, 0.02, 0.004, paint, PKM.plain);
  }
  for (let k = 0; k < 4; k++)
    pkBlob(
      g,
      (k - 1.5) * 0.15 + (rnd() - 0.5) * 0.04,
      0.07,
      ((k % 2) - 0.5) * 0.16,
      0.12,
      0.08,
      0.11,
      0.18,
      2.2,
      70 + k,
      C(0x141416),
      PKM.bag,
      { squash: 0.5 },
    );
  pkAt(g, 0.12, 0.13, 0.06, 0.4, 0.25, 0.1, () => pkRBox(g, 0, 0, 0, 0.3, 0.008, 0.26, 0.002, C(0xa8845a), PKM.card));
  for (let k = 0; k < 3; k++)
    pkPaperBall(g, (rnd() - 0.5) * 0.4, 0.12, (rnd() - 0.5) * 0.25, 0.035, 80 + k, C(0xd2c8aa), PKM.news);
  pkBottle(gg, g, -0.15, 0.13, 0.08, 0x2a5a2a, 0.22);
  return {
    box: [-W / 2, 0, -D / 2, W / 2, H, D / 2],
    spot: [-0.02, 0.14, 0.02],
    pts: [
      [-0.1, 0.18, 0.04],
      [0.08, 0.18, -0.04],
      [0.0, 0.17, 0.08],
      [-0.12, 0.17, -0.06],
    ],
    cam: { eye: [0.0, 0.74, 0.3], at: [0.0, 0.14, -0.02], fov: 0.62 },
    key: { p: [0.2, 1.4, 0.3], col: o.night ? [1.8, 1.1, 0.55] : mul3(PK_DAY, 2.6), cone: [0.95, 0.7] },
    sky: o.night ? [0.035, 0.045, 0.08] : [0.2, 0.22, 0.26],
    gnd: [0.04, 0.04, 0.035],
    rim: { p: [-0.6, 0.6, -0.6], col: [0.15, 0.17, 0.22] },
    cover: pkCoverSheet(0.22, 0.2, 0xa8845a, PKM.card, 11, 0.008),
  };
}
function pkWardrobe(g, gg, rnd, o) {
  const wood = C(0xc8a87a),
    W = 0.6,
    D = 0.4,
    H = 0.32,
    knits = [0x3a4a6a, 0x8a3a2a, 0xc8b89a, 0x4a6a4a, 0x6a5a7a, 0xd8d0c0];
  pkRBox(g, 0, -0.01, 0, W + 0.04, 0.02, D, 0.003, wood, PKM.wood);
  pkRBox(g, 0, H / 2, -D / 2, W + 0.04, H + 0.04, 0.012, 0.003, mul3(wood, 0.85), PKM.wood);
  for (const s of [-1, 1]) pkRBox(g, s * (W / 2 + 0.01), H / 2, 0, 0.02, H + 0.04, D, 0.003, wood, PKM.wood);
  for (const [px, n] of [
    [-0.16, 3],
    [0.17, 2],
  ])
    for (let k = 0; k < n; k++)
      pkRBox(
        g,
        px + (rnd() - 0.5) * 0.015,
        0.024 + k * 0.047,
        -0.06 + (rnd() - 0.5) * 0.015,
        0.24,
        0.046,
        0.2,
        0.016,
        C(knits[(k + (px > 0 ? 3 : 0)) % 6]),
        PKM.knit,
      );
  pkRBox(g, 0.2, 0.06, 0.12, 0.2, 0.12, 0.14, 0.003, C(0x8a6a4a), PKM.card);
  pkRBox(g, 0.2, 0.125, 0.12, 0.205, 0.016, 0.145, 0.003, C(0x9a7a58), PKM.card);
  for (let k = 0; k < 4; k++)
    pkAt(g, -0.2 + k * 0.13, H + 0.02, -0.05, 0, 0, 0, () =>
      pkSheet(g, 0.12, 0.2, 6, 10, null, C(knits[(k + 2) % 6]), PKM.cloth, {
        bend: (u, v, P) => {
          P[1] = -v * 0.14;
          P[2] = (v - 0.5) * 0.02 + Math.sin(u * 7 + k) * 0.01;
        },
      }),
    );
  return {
    box: [-W / 2, 0, -D / 2, W / 2, H, D / 2],
    spot: [0.0, 0.0, 0.08],
    pts: [
      [-0.12, 0.16, -0.0],
      [0.15, 0.11, 0.0],
      [0.0, 0.03, 0.1],
      [-0.08, 0.06, 0.12],
    ],
    cam: { eye: [0.0, 0.3, 0.48], at: [0.0, 0.06, 0.0], fov: 0.66 },
    key: { p: [-0.25, 0.8, 0.5], col: mul3(PK_WARM, 2.2), cone: [0.9, 0.5] },
    sky: [0.18, 0.16, 0.15],
    gnd: [0.06, 0.05, 0.04],
    rim: { p: [0.5, 0.4, -0.3], col: [0.22, 0.2, 0.18] },
    cover: (gc, lump, rad) =>
      pkSheet(
        gc,
        0.2,
        0.18,
        18,
        16,
        (u, v) =>
          0.004 +
          lump * (1 - sstep(rad || 0.3, Math.min(1, (rad || 0.3) + 0.5), Math.hypot(u - 0.5, v - 0.5) * 2)) +
          pkFbm(u * 3, v * 3, 4, 2) * 0.012,
        C(0xb8b0a0),
        PKM.knit,
      ),
  };
}
function pkBooks(g, gg, rnd, o) {
  const wood = C(0x8a6440),
    W = 0.56,
    D = 0.24,
    H = 0.28,
    pal = [0x5a2a24, 0x2a3a5a, 0x3a5a3a, 0x8a7a5a, 0x6a2a4a, 0x1e1e22, 0xa8884a, 0x4a6a7a, 0x7a3a1a];
  pkRBox(g, 0, -0.01, 0, W + 0.04, 0.02, D, 0.003, wood, PKM.wood);
  pkRBox(g, 0, H + 0.01, 0, W + 0.04, 0.02, D, 0.003, wood, PKM.wood);
  pkRBox(g, 0, H / 2, -D / 2, W + 0.04, H, 0.008, 0.002, mul3(wood, 0.8), PKM.wood);
  for (const s of [-1, 1]) pkRBox(g, s * (W / 2 + 0.01), H / 2, 0, 0.02, H + 0.04, D, 0.003, wood, PKM.wood);
  let x = -W / 2 + 0.01;
  while (x < W / 2 - 0.04) {
    const w = 0.018 + rnd() * 0.026,
      h = 0.17 + rnd() * 0.07,
      d = 0.15 + rnd() * 0.03;
    if (x > -0.05 && x < 0.02) {
      x += 0.05; // a gap where one's missing
      continue;
    }
    const lean = x > 0.18 && x < 0.24 ? -0.18 : 0;
    pkAt(g, x + w / 2, 0, -D / 2 + d / 2 + 0.01, 0, 0, lean, () =>
      pkRBox(g, 0, h / 2, 0, w, h, d, 0.0022, C(pal[Math.floor(rnd() * pal.length)]), PKM.book),
    );
    x += w + 0.001;
  }
  for (let k = 0; k < 3; k++)
    pkBlob(g, -0.2 + k * 0.17, 0.003, 0.09, 0.008, 0.003, 0.006, 0.4, 5, 90 + k, C(0x8a8478), PKM.fuzz);
  return {
    box: [-W / 2, 0, -D / 2, W / 2, H, D / 2],
    spot: [-0.02, 0.0, 0.06],
    pts: [
      [-0.12, 0.12, -0.02],
      [0.1, 0.1, -0.01],
      [-0.02, 0.05, 0.02],
      [0.0, 0.14, -0.04],
    ],
    cam: { eye: [0.0, 0.26, 0.45], at: [0.0, 0.08, -0.02], fov: 0.66 },
    key: { p: [0.2, 0.7, 0.5], col: mul3(PK_WARM, 2.2), cone: [0.9, 0.5] },
    sky: [0.17, 0.15, 0.14],
    gnd: [0.06, 0.05, 0.04],
    rim: { p: [-0.5, 0.4, -0.2], col: [0.22, 0.2, 0.18] },
    cover: (gc, lump) =>
      pkAt(gc, 0, 0.016 + lump * 1.6, 0, 0.25, 0, lump ? 0.08 : 0, () =>
        gc.xf(M4.rotZ(Math.PI / 2), () => pkRBox(gc, 0, 0, 0, 0.032, 0.22, 0.16, 0.0025, C(0x5a2a24), PKM.book)),
      ),
  };
}
// newspapers in a rack, letters in a mailbox, the paper at the bottom of a birdcage
function pkPapers(g, gg, rnd, o, kind) {
  const W = 0.4,
    D = 0.3,
    H = 0.16;
  if (kind === 'mail') {
    const grey = C(0x4a5058);
    pkRBox(g, 0, -0.005, 0, W, 0.01, D, 0.003, grey, PKM.steel);
    for (const s of [-1, 1]) {
      pkRBox(g, (s * W) / 2, H / 2, 0, 0.008, H, D, 0.002, grey, PKM.steel);
      pkRBox(g, 0, H / 2, (s * D) / 2, W, H, 0.008, 0.002, grey, PKM.steel);
    }
    for (let k = 0; k < 6; k++)
      pkAt(g, (rnd() - 0.5) * 0.14, k * 0.005, (rnd() - 0.5) * 0.1, (rnd() - 0.5) * 0.6, 0, 0, () =>
        pkRBox(
          g,
          0,
          0.002,
          0,
          0.16 + rnd() * 0.06,
          0.003,
          0.1,
          0.0012,
          C(k % 2 ? 0xeee4cc : 0xd8e0e8),
          k === 3 ? PKM.note : PKM.paper,
        ),
      );
    pkSheetAt(g, -0.11, 0.032, -0.06, 0.5, 0.16, 0.2, 0xd8784a, PKM.news, 3, 0.006);
  } else if (kind === 'cage') {
    pkRBox(g, 0, -0.01, 0, W + 0.04, 0.02, D + 0.04, 0.004, C(0xc8c4b8), PKM.plastic);
    for (let k = 0; k < 18; k++) {
      const a = (k / 18) * TAU;
      pkTube(
        g,
        [Math.sin(a) * 0.21, 0, Math.cos(a) * 0.17, Math.sin(a) * 0.2, 0.3, Math.cos(a) * 0.16],
        0.0015,
        5,
        C(0xd8c898),
        PKM.brass,
      );
    }
    pkSheetAt(g, 0, 0.001, 0, 0.1, 0.36, 0.28, 0xd2c8aa, PKM.news, 2, 0.003);
    for (let k = 0; k < 40; k++)
      pkBlob(
        g,
        (rnd() - 0.5) * 0.3,
        0.003,
        (rnd() - 0.5) * 0.22,
        0.003,
        0.0015,
        0.002,
        0.2,
        4,
        k,
        C(rnd() < 0.5 ? 0xb89a60 : 0x6a5a3a),
        PKM.plain,
        { nu: 6, nv: 4 },
      );
    pkLathe(
      g,
      0.12,
      0,
      -0.08,
      [0, 0, 0.035, 0, 0.04, 0.022, 0.036, 0.024, 0.031, 0.004, 0, 0.004],
      26,
      C(0x5a8ab8),
      PKM.plastic,
    );
    pkLathe(gg, 0.12, 0.004, -0.08, [0, 0.014, 0.033, 0.014], 26, C(0xd8e8f0), PKM.ice);
    pkTube(
      g,
      [-0.1, 0.004, 0.08, -0.06, 0.008, 0.06, -0.02, 0.005, 0.05],
      (t) => 0.004 * Math.sin(Math.PI * Math.min(1, t * 1.1 + 0.05)),
      8,
      C(0xe8e4d8),
      PKM.fuzz,
      { flat: 0.2 },
    );
  } else {
    for (let k = 0; k < 7; k++)
      pkTube(
        g,
        [-W / 2, 0.002, -D / 2 + (k / 6) * D, W / 2, 0.002, -D / 2 + (k / 6) * D],
        0.002,
        6,
        C(0x9a9ea2),
        PKM.steel,
      );
    for (const s of [-1, 1])
      pkTube(
        g,
        [(s * W) / 2, 0.002, -D / 2, (s * W) / 2, H, -D / 2, (s * W) / 2, H, D / 2, (s * W) / 2, 0.002, D / 2],
        0.003,
        6,
        C(0x9a9ea2),
        PKM.steel,
        { sub: 2 },
      );
    for (let k = 0; k < 6; k++)
      pkAt(g, (rnd() - 0.5) * 0.02, 0.004 + k * 0.008, (rnd() - 0.5) * 0.02, (rnd() - 0.5) * 0.06, 0, 0, () =>
        pkRBox(g, 0, 0.004, 0, 0.3, 0.008, 0.24, 0.002, (f) => (f === 2 ? C(0xd8d0bc) : C(0xc8c0aa)), PKM.news),
      );
  }
  return {
    box: [-W / 2, 0, -D / 2, W / 2, H, D / 2],
    spot: [0.03, kind === 'news' ? 0.052 : 0.006, 0.02],
    pts: [
      [-0.08, 0.07, 0.02],
      [0.08, 0.07, -0.03],
      [0.0, 0.06, 0.06],
      [-0.05, 0.07, -0.06],
    ],
    cam: { eye: [0.0, 0.48, 0.28], at: [0.0, 0.03, -0.02], fov: 0.62 },
    key: {
      p: [-0.2, 0.9, 0.3],
      col: mul3(o.out ? (o.night ? [1.0, 0.65, 0.35] : PK_DAY) : PK_WARM, 2.3),
      cone: [0.92, 0.55],
    },
    sky: o.out && o.night ? [0.04, 0.05, 0.08] : [0.17, 0.16, 0.16],
    gnd: [0.05, 0.045, 0.04],
    rim: { p: [0.5, 0.4, -0.4], col: [0.2, 0.2, 0.22] },
    cover: pkCoverSheet(0.28, 0.22, 0xd8d0bc, PKM.news, 13, 0.004),
  };
}
function pkShop(g, gg, rnd, o) {
  const W = 0.6,
    D = 0.34,
    H = 0.3,
    kind = o.type;
  pkRBox(g, 0, -0.008, 0, W + 0.06, 0.016, D + 0.02, 0.003, C(0xd0d2d4), PKM.steel);
  pkRBox(
    g,
    0,
    H / 2,
    -D / 2 - 0.01,
    W + 0.06,
    H + 0.04,
    0.01,
    0.002,
    (f, s, t) =>
      (Math.floor((s + 1) * 24) + Math.floor((t + 1) * 18)) % 2 &&
      Math.abs((((s + 1) * 24) % 1) - 0.5) < 0.2 &&
      Math.abs((((t + 1) * 18) % 1) - 0.5) < 0.25
        ? C(0x2a2c2e)
        : C(0xc8cacc),
    PKM.plain,
  );
  pkRBox(g, 0, 0.012, D / 2 + 0.008, W + 0.06, 0.03, 0.006, 0.002, C(0xf4f0e0), PKM.label);
  const cols = [0xb8282a, 0x2a5a9a, 0xd8a020, 0x3a7a3a, 0x7a3a8a, 0xe86a20];
  for (let k = 0; k < 5; k++) {
    const x = -0.24 + k * 0.12,
      c = cols[k % 6];
    if (kind === 'shelf_groc') {
      if (k % 2) pkRBox(g, x, 0.13, -0.08, 0.1, 0.26, 0.06, 0.004, C(c), PKM.label);
      else {
        pkCan(g, x, 0, -0.1, 0.037, 0.11, c);
        pkCan(g, x, 0.11, -0.1, 0.037, 0.11, c);
        pkCan(g, x, 0, -0.02, 0.037, 0.11, c);
      }
    } else if (kind === 'shelf_snack') {
      for (let j = 0; j < 2; j++)
        pkBlob(g, x, 0.03 + j * 0.05, -0.08 + j * 0.02, 0.05, 0.028, 0.07, 0.12, 3, k * 3 + j, C(c), PKM.foil, {
          squash: 0.7,
        });
      pkRBox(g, x, 0.008, 0.02, 0.09, 0.015, 0.03, 0.003, C(cols[(k + 2) % 6]), PKM.foil);
    } else {
      pkLathe(
        g,
        x,
        0,
        -0.09,
        [0, 0, 0.035, 0, 0.04, 0.01, 0.04, 0.16, 0.03, 0.19, 0.012, 0.2, 0.012, 0.22, 0, 0.22],
        24,
        C(c),
        PKM.plastic,
      );
      pkLathe(g, x, 0.05, -0.09, [0.0405, 0, 0.0405, 0.08], 24, C(0xf2f0ea), PKM.label);
      pkRBox(g, x, 0.015, 0.03, 0.08, 0.03, 0.05, 0.008, (f) => (f === 2 ? C(0x2a7a3a) : C(0xe8d040)), PKM.fuzz);
    }
  }
  return {
    box: [-W / 2, 0, -D / 2, W / 2, H, D / 2],
    spot: [0.02, 0.0, 0.08],
    pts: [
      [-0.1, 0.08, 0.04],
      [0.12, 0.08, 0.03],
      [0.0, 0.05, 0.1],
      [0.06, 0.1, -0.02],
    ],
    cam: { eye: [0.0, 0.3, 0.44], at: [0.0, 0.07, 0.0], fov: 0.66 },
    key: { p: [0.0, 0.9, 0.3], col: mul3(PK_COOL, 2.4), cone: [0.92, 0.5] },
    sky: [0.2, 0.21, 0.22],
    gnd: [0.06, 0.06, 0.06],
    rim: { p: [0.5, 0.5, -0.4], col: [0.2, 0.22, 0.24] },
    cover: (gc, lump) => pkRBox(gc, 0, 0.07, 0.035, 0.11, 0.14, 0.05, 0.004, C(0x8a5a2a), PKM.label),
  };
}
function pkCooler(g, gg, rnd, o) {
  const W = 0.46,
    D = 0.3,
    H = 0.22,
    wall = C(0xe8ecee);
  pkRBox(g, 0, -0.01, 0, W + 0.04, 0.02, D + 0.04, 0.006, wall, PKM.plastic);
  for (const s of [-1, 1]) {
    pkRBox(g, s * (W / 2 + 0.01), H / 2, 0, 0.02, H, D + 0.04, 0.006, wall, PKM.plastic);
    pkRBox(g, 0, H / 2, s * (D / 2 + 0.01), W + 0.04, H, 0.02, 0.006, wall, PKM.plastic);
  }
  const cols = [0xb8282a, 0x2a5a9a, 0xd8a020, 0x3a7a3a];
  for (let k = 0; k < 6; k++)
    pkAt(
      g,
      -0.16 + (k % 3) * 0.14 + (rnd() - 0.5) * 0.03,
      0.02,
      -0.06 + Math.floor(k / 3) * 0.1,
      0,
      (rnd() - 0.5) * 0.4,
      (rnd() - 0.5) * 0.4,
      () => pkCan(g, 0, 0, 0, 0.033, 0.115, cols[k % 4]),
    );
  for (let k = 0; k < 40; k++)
    pkAt(gg, (rnd() - 0.5) * 0.42, 0.04 + rnd() * 0.06, (rnd() - 0.5) * 0.26, rnd() * TAU, rnd(), rnd(), () =>
      pkRBox(gg, 0, 0, 0, 0.026, 0.024, 0.026, 0.006, C(0xe4eef4), PKM.ice),
    );
  pkRBox(gg, 0, 0.05, 0, W, 0.002, D, 0.001, C(0xc8dce4), PKM.ice);
  return {
    box: [-W / 2, 0, -D / 2, W / 2, H, D / 2],
    spot: [0.03, 0.07, 0.03],
    pts: [
      [-0.1, 0.1, 0.03],
      [0.1, 0.1, -0.04],
      [0.0, 0.09, 0.07],
      [-0.06, 0.1, -0.07],
    ],
    cam: { eye: [0.0, 0.54, 0.28], at: [0.0, 0.06, -0.02], fov: 0.62 },
    key: { p: [0.1, 0.9, 0.2], col: mul3(PK_COOL, 2.3), cone: [0.92, 0.6] },
    sky: [0.2, 0.22, 0.24],
    gnd: [0.06, 0.07, 0.08],
    rim: { p: [-0.5, 0.4, -0.4], col: [0.2, 0.24, 0.28] },
    cover: (gc, lump) => {
      for (let k = 0; k < 5; k++)
        pkAt(gc, (k - 2) * 0.022, 0.012 + lump + (k % 2) * 0.01, ((k % 3) - 1) * 0.02, k, 0.4 * k, 0, () =>
          pkRBox(gc, 0, 0, 0, 0.026, 0.024, 0.026, 0.006, C(0xe4eef4), PKM.plastic),
        );
    },
  };
}
function pkFridge(g, gg, rnd, o) {
  const W = 0.52,
    D = 0.36,
    H = 0.44,
    white = C(0xf0f2f0);
  pkRBox(g, 0, -0.01, 0, W + 0.04, 0.02, D, 0.012, white, PKM.enamel);
  pkRBox(g, 0, H + 0.01, 0, W + 0.04, 0.02, D, 0.012, white, PKM.enamel);
  pkRBox(g, 0, H / 2, -D / 2, W + 0.04, H + 0.04, 0.02, 0.012, mul3(white, 0.96), PKM.enamel);
  for (const s of [-1, 1]) {
    pkRBox(g, s * (W / 2 + 0.01), H / 2, 0, 0.02, H + 0.04, D, 0.012, white, PKM.enamel);
    pkRBox(g, s * (W / 2 + 0.035), H / 2, 0.05, 0.03, H + 0.12, D + 0.12, 0.012, C(0xe0e2e0), PKM.enamel);
  }
  for (const y of [0.13, 0.26]) pkRBox(gg, 0, y - 0.003, 0, W - 0.01, 0.006, D - 0.02, 0.002, C(0xd8e8ec), PKM.glass);
  for (const y of [0.13, 0.26])
    pkRBox(g, 0, y - 0.003, D / 2 - 0.012, W - 0.01, 0.008, 0.014, 0.003, C(0xc8ccd0), PKM.plastic);
  pkRBox(g, 0, H - 0.008, -0.06, 0.08, 0.012, 0.04, 0.004, C(0xfff8e8), PKM.led, { emit: 0.6 });
  return {
    box: [-W / 2, 0, -D / 2, W / 2, H, D / 2],
    spot: [0.04, 0.0, 0.04],
    pts: [
      [-0.08, 0.06, 0.04],
      [0.1, 0.18, 0.02],
    ],
    cam: { eye: [0.05, 0.3, 0.62], at: [0.05, 0.17, -0.02], fov: 0.8 },
    key: { p: [0.0, H - 0.03, 0.1], col: mul3(PK_COOL, 1.5), cone: [0.6, -0.3] },
    sky: [0.3, 0.32, 0.34],
    gnd: [0.18, 0.19, 0.2],
    rim: { p: [-0.3, 0.6, 0.9], col: [0.5, 0.42, 0.32] },
    door: true,
    cover: () => {},
  };
}
// a machine with its back off: the board, the wires, a fur of dust
function pkWorks(g, gg, rnd, o) {
  const W = 0.36,
    D = 0.26,
    H = 0.14,
    steel = C(0x7a7e82);
  pkRBox(g, 0, -0.005, 0, W, 0.01, D, 0.002, steel, PKM.steel);
  for (const s of [-1, 1]) pkRBox(g, (s * W) / 2, H / 2, 0, 0.006, H, D, 0.002, steel, PKM.steel);
  pkRBox(g, 0, H / 2, -D / 2, W, H, 0.006, 0.002, steel, PKM.steel);
  pkRBox(g, 0, 0.012, D / 2, W, 0.024, 0.006, 0.002, steel, PKM.steel); // the side that came off, down to its lip
  pkRBox(g, -0.04, 0.006, -0.03, 0.22, 0.003, 0.15, 0.001, C(0x1e5a2a), PKM.pcb);
  for (let k = 0; k < 4; k++)
    pkRBox(g, -0.11 + k * 0.05, 0.01, -0.06, 0.02, 0.004, 0.014, 0.0006, C(0x18181a), PKM.plastic);
  for (let k = 0; k < 4; k++) {
    const x = -0.1 + k * 0.035;
    pkLathe(
      g,
      x,
      0.0075,
      0.01,
      [0, 0, 0.006, 0, 0.006, 0.018, 0.0055, 0.019, 0, 0.019],
      16,
      C(k % 2 ? 0x1a2a6a : 0x1a1a1a),
      PKM.plastic,
    );
    pkLathe(g, x, 0.0265, 0.01, [0, 0, 0.0052, 0, 0, 0.0004], 16, C(0xc0c4c8), PKM.steel);
  }
  pkRBox(g, 0.12, 0.03, -0.06, 0.06, 0.05, 0.05, 0.003, C(0x2a2c2e), PKM.steel);
  pkLathe(g, 0.12, 0.012, -0.06, [0.027, 0, 0.027, 0.036], 20, C(0xb06a30), PKM.brass);
  const wire = (pts, c) => pkTube(g, pts, 0.0018, 6, C(c), PKM.plastic, { caps: true });
  wire([-0.17, 0.05, -0.1, -0.08, 0.02, -0.02, 0.05, 0.03, 0.02, 0.17, 0.06, 0.08], 0xb8202a);
  wire([-0.17, 0.055, -0.095, -0.07, 0.025, -0.015, 0.06, 0.035, 0.025, 0.17, 0.065, 0.085], 0x1a1a1a);
  wire([0.12, 0.055, -0.06, 0.05, 0.04, 0.05, -0.05, 0.02, 0.09, -0.17, 0.04, 0.1], 0xd8b020);
  wire([0.13, 0.055, -0.055, 0.07, 0.045, 0.05, -0.04, 0.025, 0.1, -0.17, 0.045, 0.11], 0x2a5ab8);
  for (let k = 0; k < 5; k++)
    pkBlob(
      g,
      (rnd() - 0.5) * 0.3,
      0.004,
      (rnd() - 0.5) * 0.2,
      0.016 + rnd() * 0.01,
      0.006,
      0.012,
      0.45,
      4,
      100 + k,
      C(0x8a8478),
      PKM.fuzz,
    );
  for (let k = 0; k < 4; k++)
    pkLathe(
      g,
      ((k % 2) - 0.5) * 0.3,
      0,
      (k < 2 ? -1 : 1) * 0.1,
      [0, 0.004, 0.004, 0.004, 0.004, 0.0028, 0.0018, 0.0028, 0.0018, 0, 0, 0],
      12,
      C(0xc0c4c8),
      PKM.steel,
    );
  return {
    box: [-W / 2, 0, -D / 2, W / 2, H, D / 2],
    spot: [0.04, 0.0, 0.06],
    pts: [
      [-0.08, 0.04, 0.02],
      [0.08, 0.05, -0.02],
      [0.0, 0.03, 0.07],
      [-0.1, 0.04, -0.06],
    ],
    cam: { eye: [0.0, 0.42, 0.27], at: [0.0, 0.02, -0.02], fov: 0.62 },
    key: { p: [0.2, 0.7, 0.3], col: mul3(PK_WARM, 2.3), cone: [0.9, 0.55] },
    sky: [0.16, 0.16, 0.17],
    gnd: [0.05, 0.05, 0.05],
    rim: { p: [-0.5, 0.4, -0.4], col: [0.2, 0.2, 0.22] },
    cover: (gc, lump) =>
      pkAt(gc, 0, 0.004 + lump * 1.5, 0, 0.3, lump ? 0.1 : 0, 0, () =>
        pkRBox(gc, 0, 0, 0, 0.16, 0.003, 0.11, 0.001, C(0x9a9ea2), PKM.steel),
      ),
  };
}
const PK_SETS = {
  drawer: pkDrawer,
  box: pkBox,
  bin: pkBin,
  dumpster: pkDumpster,
  wardrobe: pkWardrobe,
  books: pkBooks,
  news: (g, gg, r, o) => pkPapers(g, gg, r, o, 'news'),
  mail: (g, gg, r, o) => pkPapers(g, gg, r, o, 'mail'),
  cage: (g, gg, r, o) => pkPapers(g, gg, r, o, 'cage'),
  shelf: pkShop,
  cooler: pkCooler,
  fridge: pkFridge,
  works: pkWorks,
};
// the fridge's door, hinged on the left: swung open when there's something to see
function pkFridgeDoor(g) {
  const white = C(0xf0f2f0);
  pkRBox(g, 0.28, 0.22, 0, 0.56, 0.52, 0.05, 0.014, white, PKM.enamel);
  pkRBox(g, 0.44, 0.25, 0.04, 0.02, 0.16, 0.025, 0.008, C(0xc8ccd0), PKM.steel);
  for (const y of [0.18, 0.32]) pkRBox(g, 0.44, y, 0.031, 0.03, 0.012, 0.012, 0.004, C(0xb0b4b8), PKM.steel);
  pkRBox(g, 0.2, 0.34, 0.027, 0.1, 0.13, 0.002, 0.0006, C(0xf6f2e8), PKM.note);
  pkLathe(g, 0.2, 0.39, 0.027, [0, 0, 0.008, 0, 0.008, 0.004, 0, 0.005], 14, C(0xb8202a), PKM.plastic, {});
}
// ── your hand: the right one, palm down, fingers along +z from the wrist, thumb toward −x. Each finger joint its own
// mesh, so gfx/peek bends them. Lengths and where each finger sits are kept for it.
const PK_FINGERS = [
  { x: -0.029, z: 0.094, len: [0.043, 0.026, 0.021], r: 0.0088 },
  { x: -0.0095, z: 0.099, len: [0.047, 0.029, 0.022], r: 0.009 },
  { x: 0.0098, z: 0.096, len: [0.044, 0.027, 0.021], r: 0.0085 },
  { x: 0.0275, z: 0.088, len: [0.034, 0.021, 0.019], r: 0.0075 },
  { x: -0.031, z: 0.03, len: [0.042, 0.032, 0.028], r: 0.0108, thumb: 1 },
];
function pkHandMeshes(skinHex, sleeveHex) {
  const skin = mul3(C(skinHex), 0.86),
    knuck = mix3(skin, C(0xb06a5a), 0.25),
    segCol = (u, t) => mix3(skin, knuck, Math.max(0, 1 - Math.min(t, 1 - t) * 8) * 0.6),
    H = { palm: null, sleeve: null, fingers: [] };
  let g = new Geo();
  pkRBox(g, 0, 0, 0.055, 0.084, 0.026, 0.09, 0.012, skin, PKM.skin);
  for (const f of PK_FINGERS)
    if (!f.thumb)
      pkBlob(g, f.x, 0.008, f.z - 0.006, f.r * 1.05, f.r * 0.75, f.r * 0.9, 0.05, 2, 1, knuck, PKM.skin, {
        nu: 12,
        nv: 8,
      });
  pkBlob(g, -0.024, -0.004, 0.03, 0.02, 0.013, 0.03, 0.05, 2, 2, skin, PKM.skin);
  pkTube(g, [0, 0, 0.03, 0, 0, -0.01, 0, 0.002, -0.07], (t) => 0.028 + t * 0.004, 18, skin, PKM.skin, { flat: 0.62 });
  H.palm = pkMesh(g);
  g = new Geo();
  pkTube(g, [0, 0.003, -0.05, 0, 0.01, -0.25, 0, 0.026, -0.5], (t) => 0.036 + t * 0.016, 22, C(sleeveHex), PKM.cloth, {
    flat: 0.82,
  });
  pkTube(g, [0, 0.003, -0.068, 0, 0.003, -0.044], 0.039, 22, mul3(C(sleeveHex), 0.85), PKM.cloth, { flat: 0.82 });
  H.sleeve = pkMesh(g);
  for (const f of PK_FINGERS) {
    const segs = [];
    for (let s = 0; s < 3; s++) {
      g = new Geo();
      const len = f.len[s],
        r0 = f.r * (1 - s * 0.1),
        r1 = f.r * (0.92 - s * 0.1);
      pkTube(g, [0, 0, 0, 0, 0, len], (t) => lerp(r0, r1, t), 14, segCol, PKM.skin, { caps: true, flat: 0.86 });
      if (s === 2)
        pkRBox(
          g,
          0,
          r1 * 0.72,
          len * 0.66,
          r1 * 1.45,
          0.0016,
          len * 0.62,
          0.0007,
          mix3(skin, C(0xf0d8d0), 0.5),
          PKM.nail,
        );
      segs.push(pkMesh(g));
    }
    H.fingers.push(segs);
  }
  return H;
}
