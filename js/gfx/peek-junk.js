//@ gfx/peek-junk — What a rummage turns up, close: junk, finds, food, papers; every thing by name
//@ Defines: pkCan, pkBottle, pkCrumple, pkPaperBall, pkReceipt, pkSock, pkWatch, pkSpoon, pkChange, pkBattery, pkLoveNote, pkCrust, pkDoorKey, pkFuse, pkDice, pkFlashlight, …
//@ Uses:    gfx/peek-geo, gfx/world-geometry, gfx/peek-things, core/util
//@ (header made by tools/map.js; stripped by build.py)
// ───────────── the everyday things a rummage turns up, for the close-up (gfx/peek): the junk down the back of things
// (data/lines JUNK), what you keep (play/verbs FINDS), what's in a back-room box, the bins, a fridge's shelves, and a
// paper with somebody's past on it. PK_THINGS names every thing the close-up can show, THEIRS included
// (gfx/peek-things); pkKey turns what the game said you found into one of them.
function pkCan(g, x, y, z, r, h, col) {
  const steel = C(0xc4c6c8);
  pkLathe(
    g,
    x,
    y,
    z,
    [
      0,
      0,
      r * 0.9,
      0,
      r,
      0.003,
      r,
      0.006,
      r * 0.985,
      0.008,
      r * 0.985,
      h - 0.008,
      r,
      h - 0.006,
      r,
      h - 0.003,
      r * 0.92,
      h,
      r * 0.85,
      h - 0.002,
      0,
      h - 0.002,
    ],
    30,
    steel,
    PKM.steel,
  );
  pkLathe(g, x, y + 0.012, z, [r * 0.99, 0, r * 0.99, h - 0.024], 30, C(col), PKM.label);
}
function pkBottle(gg, g, x, y, z, col, h) {
  pkLathe(
    gg,
    x,
    y,
    z,
    [0, 0, 0.03, 0, 0.032, 0.006, 0.032, h * 0.6, 0.024, h * 0.72, 0.012, h * 0.82, 0.012, h * 0.97],
    26,
    C(col),
    PKM.glass,
  );
  pkLathe(g, x, y + h * 0.15, z, [0.0322, 0, 0.0322, h * 0.32], 26, C(0xd8c890), PKM.label);
  pkLathe(g, x, y + h * 0.96, z, [0, 0, 0.0135, 0, 0.0135, 0.008, 0, 0.009], 18, C(0xb8a048), PKM.steel);
}
function pkCrumple(g, w, d, seed, col, mat, amp) {
  pkSheet(
    g,
    w,
    d,
    14,
    14,
    (u, v) => {
      const e = Math.max(Math.abs(u - 0.5), Math.abs(v - 0.5)) * 2;
      return (1 - e * e) * amp * 0.6 + (1 - Math.abs(pkFbm(u * 4, v * 4, 1, seed) * 2 - 1)) * amp;
    },
    col,
    mat,
    { flat: true },
  );
}
function pkPaperBall(g, x, y, z, r, seed, col, mat) {
  pkBlob(g, x, y + r * 0.8, z, r, r * 0.85, r * 0.95, 0.28, 2.2, seed, col, mat || PKM.paper, {
    ridge: true,
    flat: true,
    nu: 14,
    nv: 9,
  });
}
// ── down the back of things
function pkReceipt(g) {
  pkSheet(g, 0.058, 0.15, 6, 30, null, C(0xf1efe8), PKM.receipt, {
    bend: (u, v, P) => {
      const a = v * 2.6;
      P[2] = Math.sin(a) * 0.035 - 0.02;
      P[1] = (1 - Math.cos(a)) * 0.035 + u * 0.004;
    },
  });
}
function pkSock(g) {
  const col = (u, t) => (Math.floor(t * 14) % 3 === 0 ? C(0x8a2a2a) : t > 0.9 ? C(0x2a2a30) : C(0x3a4a6a));
  pkTube(
    g,
    [-0.11, 0.012, 0.01, -0.04, 0.013, 0.004, 0.02, 0.012, -0.004, 0.05, 0.012, 0.012, 0.07, 0.011, 0.045],
    0.024,
    18,
    col,
    PKM.knit,
    { caps: true, flat: 0.42 },
  );
}
function pkWatch(g, gg) {
  pkLathe(
    g,
    0,
    0.004,
    0,
    [0, 0, 0.017, 0, 0.019, 0.003, 0.019, 0.007, 0.0165, 0.009, 0, 0.009],
    30,
    C(0xc0c4c8),
    PKM.steel,
  );
  pkLathe(g, 0, 0.0132, 0, [0, 0, 0.0158, 0], 30, C(0xf0ead8), PKM.dial);
  pkLathe(gg, 0, 0.0132, 0, [0, 0, 0.0162, 0, 0.016, 0.0012, 0, 0.0018], 30, C(0xe8f0f4), PKM.glass);
  pkAt(g, 0.0195, 0.0085, 0, 0, 0, -Math.PI / 2, () =>
    pkLathe(g, 0, 0, 0, [0, 0, 0.0022, 0, 0.0022, 0.003, 0, 0.003], 10, C(0xc0c4c8), PKM.steel),
  );
  const strap = C(0x4a2c1a);
  pkRBox(g, 0, 0.003, 0.05, 0.016, 0.003, 0.064, 0.0012, strap, PKM.leather);
  pkAt(g, 0.006, 0.002, -0.034, 0.5, 0, 0, () =>
    pkRBox(g, 0, 0.001, -0.014, 0.016, 0.003, 0.03, 0.0012, strap, PKM.leather),
  ); // snapped off short
  pkTube(
    g,
    [-0.009, 0.004, 0.082, 0.009, 0.004, 0.082, 0.009, 0.004, 0.09, -0.009, 0.004, 0.09],
    0.0012,
    5,
    C(0xb8b0a0),
    PKM.steel,
    { closed: true, sub: 2 },
  );
}
function pkSpoon(g, gg, look, rnd) {
  const steel = C(0xc8ccd0);
  pkGrid(
    g,
    16,
    12,
    (u, v, P) => {
      const a = (u - 0.5) * Math.PI * 0.9,
        b = (v - 0.5) * Math.PI * 0.9;
      P[0] = 0.035 + Math.sin(b) * 0.024;
      P[2] = Math.sin(a) * 0.017;
      P[1] = 0.012 - Math.cos(a) * Math.cos(b) * 0.008;
    },
    steel,
    PKM.steel,
  );
  pkTube(
    g,
    [0.011, 0.0045, 0, -0.03, 0.0035, 0.001, -0.09, 0.004, 0.002],
    (t) => 0.0035 + t * 0.003,
    10,
    steel,
    PKM.steel,
    { caps: true, flat: 0.28 },
  );
  for (const [x, z, c] of [
    [-0.03, 0.035, 0x2a3a5a],
    [0.0, 0.045, 0xe8e0d0],
  ]) {
    pkLathe(
      g,
      x,
      0,
      z,
      [0, 0.0012, 0.0055, 0.0008, 0.0068, 0, 0.0074, 0.0012, 0.007, 0.0024, 0.0058, 0.0018, 0, 0.0014],
      20,
      C(c),
      PKM.plastic,
    );
    for (const [dx, dz] of [
      [-1, -1],
      [1, -1],
      [1, 1],
      [-1, 1],
    ])
      pkLathe(g, x + dx * 0.0017, 0.0015, z + dz * 0.0017, [0, 0, 0.0008, 0, 0, 0.0001], 8, C(0x0a0a0a), PKM.plain);
  }
}
function pkChange(g, gg, look, rnd) {
  const cols = [
    [0xb87333, PKM.brass, 0.0095],
    [0xc6c8cc, PKM.steel, 0.012],
    [0xc6c8cc, PKM.steel, 0.0105],
    [0xb87333, PKM.brass, 0.0095],
    [0xc9a043, PKM.brass, 0.0115],
  ];
  cols.forEach(([c, m, r], k) => {
    const a = k * 2.1 + rnd(),
      d = 0.012 + k * 0.007;
    pkAt(g, Math.cos(a) * d, k === 1 ? 0.0019 : 0, Math.sin(a) * d, rnd() * TAU, 0, 0, () =>
      pkCoin(g, 0, 0, 0, r, 0.0018, C(c), m, m === PKM.brass ? PKM.token : null),
    );
  });
  pkTube(
    g,
    [
      -0.05, 0.0012, -0.02, -0.005, 0.0012, -0.022, -0.002, 0.0012, -0.018, -0.006, 0.0012, -0.014, -0.05, 0.0012,
      -0.012,
    ],
    0.0009,
    5,
    C(0x2a2626),
    PKM.steel,
    { caps: true, flat: 0.5 },
  );
}
function pkBattery(g) {
  g.xf(M4.mul(M4.trans(-0.025, 0.007, 0), M4.rotZ(-Math.PI / 2)), () => {
    pkLathe(
      g,
      0,
      0,
      0,
      [0, 0, 0.0065, 0, 0.007, 0.0006, 0.007, 0.0494, 0.0065, 0.05, 0.0025, 0.05, 0.0025, 0.0515, 0, 0.0515],
      26,
      C(0xb8bcc0),
      PKM.steel,
    );
    pkLathe(
      g,
      0,
      0.003,
      0,
      [0.0071, 0, 0.0071, 0.044],
      26,
      (u, v) => (v > 0.72 ? C(0xc08a2a) : C(0x1a1a1c)),
      PKM.plastic,
    );
  });
  pkBlob(g, 0.027, 0.007, 0, 0.004, 0.0035, 0.0035, 0.4, 5, 3, C(0xd8dcc8), PKM.fuzz);
}
function pkLoveNote(g) {
  pkSheet(g, 0.1, 0.14, 10, 16, (u, v) => (v < 0.5 ? 0.0006 : 0.0006 + (v - 0.5) * 0.1), C(0xf6e8e2), PKM.note, {
    bend: (u, v, P) => {
      if (v >= 0.5) {
        const a = 2.4;
        P[2] = Math.cos(a) * (v - 0.5) * 0.14;
        P[1] = 0.0012 + Math.sin(a) * (v - 0.5) * 0.14;
      }
    },
  });
}
function pkCrust(g) {
  pkTube(
    g,
    [-0.05, 0.006, 0.02, -0.02, 0.0065, -0.005, 0.02, 0.006, -0.01, 0.05, 0.0055, 0.01],
    (t) => 0.007 - Math.abs(t - 0.5) * 0.004,
    12,
    C(0xb47a44),
    PKM.bread,
    { caps: true, flat: 0.6 },
  );
}
function pkDoorKey(g) {
  const brass = C(0xc9a043);
  pkTube(
    g,
    [-0.03, 0.0015, -0.012, -0.018, 0.0015, 0, -0.03, 0.0015, 0.012, -0.042, 0.0015, 0],
    0.0028,
    8,
    brass,
    PKM.brass,
    { closed: true, flat: 0.5 },
  );
  pkRBox(g, 0.004, 0.0015, 0, 0.044, 0.0024, 0.006, 0.0008, brass, PKM.brass);
  for (const [x, w] of [
    [0.012, 0.004],
    [0.019, 0.003],
    [0.024, 0.005],
  ])
    pkRBox(g, x, 0.0015, 0.0045, w, 0.0024, 0.004, 0.0006, brass, PKM.brass);
}
function pkFuse(g, gg) {
  g.xf(M4.mul(M4.trans(-0.016, 0.003, 0), M4.rotZ(-Math.PI / 2)), () => {
    for (const y of [0, 0.026])
      pkLathe(g, 0, y, 0, [0, 0, 0.0032, 0, 0.0032, 0.006, 0, 0.006], 16, C(0xc8ccd0), PKM.steel);
    pkLathe(gg, 0, 0.005, 0, [0.0028, 0, 0.0028, 0.022], 16, C(0xe8f0f2), PKM.glass);
    pkTube(g, [0, 0.006, 0, 0.0006, 0.016, 0, 0, 0.026, 0], 0.0002, 4, C(0x8a8a8a), PKM.steel);
  });
}
function pkDice(g, gg, look, rnd) {
  const rot = [
    [0, 0, 0],
    [Math.PI / 2, 0, 0],
    [0, 0, Math.PI / 2],
  ];
  for (let k = 0; k < 3; k++)
    pkAt(g, -0.03 + k * 0.024, 0.008, (rnd() - 0.5) * 0.02, rnd() * TAU, rot[k][0], rot[k][2], () =>
      pkRBox(g, 0, 0, 0, 0.016, 0.016, 0.016, 0.0028, C(0xf0ece0), PKM.dice),
    );
  pkGrid(
    g,
    40,
    6,
    (u, v, P) => {
      const a = u * TAU,
        r = (v < 0.6 ? v / 0.6 : 1) * (0.0145 + (v >= 0.6 ? Math.abs(Math.sin(a * 10.5)) * 0.0012 : 0));
      P[0] = 0.03 + Math.sin(a) * r;
      P[2] = 0.03 + Math.cos(a) * r;
      P[1] = v < 0.6 ? 0.0062 : 0.0062 - (v - 0.6) * 0.015;
    },
    C(0xb0202a),
    PKM.enamel,
    { out: [0.03, -0.01, 0.03] },
  );
}
// ── what you keep (play/verbs FINDS)
function pkFlashlight(g, gg) {
  g.xf(M4.mul(M4.trans(-0.07, 0.016, 0), M4.rotZ(-Math.PI / 2)), () => {
    pkLathe(
      g,
      0,
      0,
      0,
      [0, 0, 0.013, 0, 0.014, 0.002, 0.014, 0.1, 0.019, 0.115, 0.019, 0.14, 0.017, 0.142],
      26,
      C(0x2a2c30),
      PKM.steel,
    );
    pkLathe(g, 0, 0.142, 0, [0.017, 0, 0.0185, 0.001, 0.0185, 0.004], 26, C(0xb8bcc0), PKM.steel);
    pkLathe(gg, 0, 0.139, 0, [0, 0.004, 0.017, 0.004], 26, C(0xe8f0f4), PKM.glass);
    pkLathe(g, 0, 0.134, 0, [0, 0, 0.012, 0.004, 0.016, 0.007], 26, C(0xd8dce0), PKM.steel);
  });
  pkRBox(g, -0.02, 0.031, 0, 0.012, 0.004, 0.008, 0.0015, C(0x141414), PKM.rubber);
}
function pkTrap(g) {
  const steel = C(0x6d6f72);
  pkRBox(g, 0, 0.003, 0, 0.17, 0.006, 0.04, 0.002, steel, PKM.steel);
  pkLathe(g, 0, 0.006, 0, [0, 0, 0.028, 0, 0.028, 0.003, 0, 0.003], 24, steel, PKM.steel);
  for (const s of [-1, 1]) {
    const pts = [];
    for (let k = 0; k <= 10; k++) {
      const a = (k / 10) * Math.PI;
      pts.push(s * (0.02 + Math.sin(a) * 0.065), 0.006 + Math.sin(a) * 0.004, Math.cos(a) * 0.07);
    }
    pkTube(g, pts, 0.0028, 6, steel, PKM.steel);
    for (let k = 1; k < 10; k++) {
      const a = (k / 10) * Math.PI;
      pkAt(g, s * (0.02 + Math.sin(a) * 0.065), 0.01, Math.cos(a) * 0.07, 0, 0, 0, () =>
        pkRBox(g, 0, 0, 0, 0.003, 0.007, 0.003, 0.0008, steel, PKM.steel),
      );
    }
    const sp = [];
    for (let k = 0; k <= 60; k++)
      sp.push(s * (0.06 + k * 0.0006), 0.012 + Math.sin(k * 0.7) * 0.007, Math.cos(k * 0.7) * 0.007);
    pkTube(g, sp, 0.0012, 5, C(0x8a8c90), PKM.steel, { sub: 1 });
  }
}
// ── a back room's shelves (play/verbs rummageResult)
function pkToiletRoll(g) {
  pkLathe(
    g,
    0,
    0,
    0,
    [0.022, 0, 0.055, 0, 0.056, 0.002, 0.056, 0.098, 0.055, 0.1, 0.022, 0.1],
    36,
    C(0xf4f2ee),
    PKM.paper,
  );
  pkLathe(g, 0, 0, 0, [0.021, 0.1, 0.021, 0], 30, C(0xb08a5a), PKM.card);
}
function pkTins(g) {
  pkCan(g, -0.04, 0, 0, 0.037, 0.11, 0x2a5a8a);
  pkCan(g, 0.04, 0, 0.01, 0.037, 0.11, 0x7a2a2a);
  pkCan(g, 0.0, 0, -0.06, 0.037, 0.11, 0x3a6a3a);
}
function pkBadges(g) {
  for (let k = 0; k < 3; k++)
    pkAt(g, k * 0.012, k * 0.004, k * 0.01, k * 0.12, 0, 0, () => {
      pkRBox(g, 0, 0.0015, 0, 0.09, 0.003, 0.055, 0.003, C(0xf4f4f0), PKM.plastic);
      pkRBox(g, 0, 0.0031, -0.019, 0.086, 0.0004, 0.014, 0.0002, C(0xb8282a), PKM.plastic);
      pkTube(g, [-0.012, 0.0035, -0.03, 0.012, 0.0035, -0.03], 0.0012, 6, C(0xc0c4c8), PKM.steel, { caps: true });
    });
}
function pkBulbs(g, gg) {
  for (const [x, z, a] of [
    [-0.04, 0, 0.3],
    [0.04, 0.02, -2.4],
  ])
    pkAt(g, x, 0.03, z, a, 0, Math.PI / 2, () => {
      pkLathe(
        gg,
        0,
        0.012,
        0,
        [0.013, 0, 0.012, 0.012, 0.022, 0.035, 0.03, 0.06, 0.024, 0.08, 0.01, 0.088, 0, 0.089],
        28,
        C(0xeef2f0),
        PKM.glass,
      );
      const ridges = [0, 0];
      for (let k = 0; k <= 8; k++) ridges.push(k % 2 ? 0.0135 : 0.0125, (k / 8) * 0.024);
      ridges.push(0, 0.024);
      pkLathe(g, 0, -0.012, 0, ridges, 20, C(0xb8bcc0), PKM.steel);
      pkTube(
        g,
        [-0.006, 0.02, 0, -0.004, 0.045, 0, 0, 0.05, 0, 0.004, 0.045, 0, 0.006, 0.02, 0],
        0.0005,
        4,
        C(0x3a3a3a),
        PKM.steel,
      );
    });
}
// ── the bins (play/verbs digResult, binDig)
function pkSandwich(g, gg, look, rnd, whole) {
  const halves = whole
    ? [
        [-0.028, 0.6],
        [0.028, -0.5],
      ]
    : [[0, 0.3]];
  for (const [x, a] of halves)
    pkAt(g, x, 0, 0, a, 0, 0, () => {
      for (const y of [0, 0.022])
        pkRBox(
          g,
          0,
          y + 0.006,
          0,
          0.1,
          0.012,
          0.05,
          0.004,
          (f, s, t) => (f === 2 || f === 3 ? C(0xe8d8b0) : C(0xa86a34)),
          PKM.bread,
        );
      pkRBox(g, 0, 0.0135, 0.001, 0.098, 0.003, 0.05, 0.001, C(0xe8c050), PKM.plain);
      pkSheet(g, 0.104, 0.056, 14, 6, (u, v) => 0.0165 + Math.sin(u * 30) * 0.0012, C(0x6aa040), PKM.paper);
      pkRBox(g, 0, 0.0185, 0, 0.096, 0.002, 0.048, 0.001, C(0xd08a88), PKM.flesh);
    });
  if (!whole) pkBlob(g, 0.07, 0, 0.03, 0.012, 0.008, 0.01, 0.3, 3, 4, C(0xb07a44), PKM.bread, { squash: 0.3 });
}
function pkFishBones(g, gg, look, rnd) {
  pkCrumple(g, 0.24, 0.2, 7, C(0xc8c2b4), PKM.receipt, 0.012);
  pkAt(g, 0, 0.012, 0, 0.2, 0, 0, () => pkBones(g, 0.2, 0xd8c89a));
}
function pkScorched(g, gg, look, rnd) {
  pkSheet(
    g,
    0.22,
    0.18,
    16,
    14,
    (u, v) => pkNoise(u * 3, v * 3, 2, 4) * 0.008,
    (u, v) => {
      const d = Math.hypot(u - 0.55, v - 0.5) + pkNoise(u * 8, v * 8, 1, 2) * 0.12;
      return d < 0.22 ? C(0x0e0e0c) : d < 0.3 ? C(0x3a2a1a) : C(0xa8845a);
    },
    PKM.card,
    { flat: true },
  );
  pkLathe(g, 0.012, 0.004, 0, [0, 0, 0.03, 0.0005, 0, 0.001], 20, C(0x1d3a28), PKM.led, { emit: 0.25 });
}
function pkSkinNails(g, gg, look, rnd) {
  pkSkin(g, gg, look, rnd);
  for (let k = 0; k < 6; k++)
    pkAt(g, 0.04 + rnd() * 0.08, 0.002, (rnd() - 0.5) * 0.08, rnd() * TAU, 0, 0, () =>
      pkTube(
        g,
        [0, 0.001, 0, 0.006, 0.003, 0, 0.012, 0.002, 0],
        (t) => 0.0018 * (1 - t * 0.85),
        6,
        C(0x3a3020),
        PKM.bone,
        { caps: true },
      ),
    );
}
function pkButcherPaper(g) {
  pkCrumple(g, 0.26, 0.22, 11, C(0xe6dcc8), PKM.plastic, 0.016);
}
// ── a page from somebody's past (play/biography homeFact): a typed letter, or a photo in its frame
function pkDoc(g) {
  pkSheet(g, 0.21, 0.28, 10, 14, (u, v) => 0.0006 + pkNoise(u * 3, v * 3, 1, 9) * 0.003, C(0xf2efe6), PKM.receipt);
  pkTube(
    g,
    [-0.09, 0.0015, -0.13, -0.09, 0.0015, -0.1, -0.083, 0.0015, -0.1, -0.083, 0.0015, -0.125],
    0.0005,
    4,
    C(0xc8ccd0),
    PKM.steel,
    { closed: true, sub: 3 },
  );
}
function pkPhoto(g, gg) {
  pkRBox(g, 0, 0.006, 0, 0.15, 0.012, 0.19, 0.003, C(0x6a4428), PKM.wood);
  pkRBox(g, 0, 0.0122, 0, 0.12, 0.0006, 0.16, 0.0002, C(0xffffff), PKM.photo);
  pkRBox(gg, 0, 0.0132, 0, 0.122, 0.0006, 0.162, 0.0002, C(0xe8f0f4), PKM.glass);
}
// ── a fridge's shelves, whatever's on them (play/stashes fridgeLook). Laid out on three shelves 0.13 apart.
function pkFridgeLoad(g, gg, k, rnd) {
  const shelf = (s) => s * 0.13;
  if (k === 'milk') {
    pkRBox(
      g,
      -0.09,
      shelf(1) + 0.09,
      0,
      0.07,
      0.18,
      0.07,
      0.004,
      (f) => (f === 4 ? C(0x3a6ab0) : C(0xf2f2ee)),
      PKM.plastic,
    );
    for (let i = 0; i < 6; i++)
      pkAt(g, 0.02 + (i % 3) * 0.045, shelf(0) + 0.025, (Math.floor(i / 3) - 0.5) * 0.05, 0, Math.PI / 2, 0, () =>
        pkLathe(
          g,
          0,
          -0.025,
          0,
          [0, 0, 0.017, 0.006, 0.021, 0.022, 0.017, 0.042, 0.009, 0.051, 0, 0.053],
          18,
          C(0xe4d2b8),
          PKM.paper,
        ),
      );
    pkGrid(
      g,
      20,
      6,
      (u, v, P) => {
        const a = u * Math.PI,
          r = v < 0.5 ? 0.075 * (v * 2) : 0.075;
        P[0] = 0.08 + Math.cos(a) * r;
        P[2] = Math.sin(a) * r - 0.02;
        P[1] = shelf(2) + (v < 0.5 ? 0 : (v - 0.5) * 2 * 0.06);
      },
      (u, v) => (v > 0.9 ? C(0xf4ece0) : C(0xd8a868)),
      PKM.bread,
      { out: [0.08, shelf(2) + 0.03, 0.02] },
    );
    pkBlob(g, 0.08, shelf(2) + 0.066, 0.02, 0.012, 0.01, 0.012, 0.2, 3, 2, C(0xc8202a), PKM.flesh);
  } else if (k === 'tubs') {
    for (let i = 0; i < 4; i++) {
      const x = -0.1 + (i % 2) * 0.12,
        y = shelf(i < 2 ? 0 : 1),
        c = [0x3a7a4a, 0xb84a3a, 0x3a5a9a, 0xd8a830][i];
      pkRBox(gg, x, y + 0.03, 0, 0.1, 0.06, 0.08, 0.008, C(0xf0f0ec), PKM.glass);
      pkBlob(
        g,
        x,
        y + 0.018,
        0,
        0.042,
        0.017,
        0.033,
        0.15,
        3,
        i,
        C([0xc87a3a, 0xd8c8a0, 0x8a5a3a, 0xe0d0b0][i]),
        PKM.flesh,
        { squash: 0.3 },
      );
      pkRBox(g, x, y + 0.063, 0, 0.104, 0.008, 0.084, 0.003, C(c), PKM.plastic);
    }
    pkCan(g, 0.12, shelf(2), 0, 0.033, 0.115, 0x3a3a3a);
  } else if (k === 'beer') {
    for (let i = 0; i < 4; i++) pkBottle(gg, g, -0.12 + i * 0.07, shelf(1), (i % 2) * 0.02, 0x4a2a10, 0.22);
    pkBlob(g, 0.08, shelf(0) + 0.05, 0, 0.065, 0.055, 0.06, 0.35, 2.5, 4, C(0x6a9a3a), PKM.paper, {
      ridge: true,
      nu: 26,
      nv: 16,
    });
    pkBlob(g, 0.08, shelf(0) + 0.06, 0, 0.05, 0.05, 0.048, 0.3, 3, 9, C(0x8aba58), PKM.paper, { ridge: true });
  } else if (k === 'cheese') {
    pkGrid(
      g,
      12,
      6,
      (u, v, P) => {
        const a = (u - 0.5) * 0.9,
          r = v < 0.25 ? (v / 0.25) * 0.09 : v < 0.75 ? 0.09 : ((1 - v) / 0.25) * 0.09;
        P[0] = -0.06 + Math.sin(a) * r;
        P[2] = Math.cos(a) * r - 0.05;
        P[1] = shelf(1) + (v < 0.25 ? 0 : v < 0.75 ? ((v - 0.25) / 0.5) * 0.05 : 0.05);
      },
      C(0xe8c860),
      PKM.plain,
      { out: [-0.06, shelf(1) + 0.025, 0.0] },
    );
    pkLathe(
      gg,
      0.08,
      shelf(1),
      0,
      [0, 0, 0.03, 0, 0.034, 0.005, 0.034, 0.07, 0.029, 0.078, 0.029, 0.082],
      26,
      C(0xe0e8e4),
      PKM.glass,
    );
    pkLathe(g, 0.08, shelf(1) + 0.003, 0, [0, 0, 0.032, 0, 0.033, 0.055, 0, 0.056], 26, C(0x8a1018), PKM.flesh);
    pkLathe(
      g,
      0.08,
      shelf(1) + 0.08,
      0,
      [0, 0, 0.032, 0, 0.042, -0.012, 0.044, -0.016],
      26,
      (u, v) => ((Math.floor(u * 16) + Math.floor(v * 6)) % 2 ? C(0xc8202a) : C(0xf2efe8)),
      PKM.cloth,
    );
    pkBlob(g, 0.0, shelf(0) + 0.03, 0.02, 0.038, 0.03, 0.03, 0.06, 6, 3, C(0xf0d020), PKM.plain);
  } else if (k === 'office') {
    pkFridgeLoad(g, gg, 'tubs', rnd);
    pkLathe(g, 0.1, shelf(0), 0.02, [0, 0, 0.028, 0, 0.034, 0.07, 0.034, 0.072, 0, 0.072], 24, C(0xf4f0e8), PKM.label);
  } else if (k === 'fishes' || k === 'fishy') {
    for (let s = 0; s < 3; s++)
      for (let i = 0; i < 3; i++)
        pkAt(
          g,
          (rnd() - 0.5) * 0.04,
          shelf(s) + i * 0.016,
          (i - 1) * 0.05,
          (i % 2) * Math.PI + (rnd() - 0.5) * 0.4,
          0,
          0,
          () => pkFish(g, 0.22 + rnd() * 0.04),
        );
  } else if (k === 'meat' || k === 'butcher') {
    for (let s = 0; s < 3; s++)
      pkAt(g, (rnd() - 0.5) * 0.04, shelf(s), 0, rnd() * 0.6, 0, 0, () => pkMeat(g, gg, null, rnd, s > 0));
  }
}
// every thing the close-up can show. b: the builder · g: THEIRS, it glows faintly with THEIR light (look) · lid: it
// lies in a fridge, so it is the shelves
const PK_THINGS = {
  skin: { b: pkSkin, g: 1 },
  token: { b: pkTokens, g: 1 },
  fish: { b: pkCoolerFish, g: 1 },
  laser: { b: pkLaser, g: 1 },
  gadget: { b: pkGadget, g: 1 },
  chart: { b: pkChart, g: 1 },
  obit: { b: pkObit, g: 1 },
  teeth: { b: pkTeeth, g: 1 },
  finger: { b: pkFinger, g: 1 },
  fishes: { b: (g, gg, l, r) => pkFridgeLoad(g, gg, 'fishes', r), fr: 1 },
  meat: { b: (g, gg, l, r) => pkFridgeLoad(g, gg, 'meat', r), fr: 1 },
  device: { b: pkDevice, g: 1 },
  till: { b: pkTill, g: 1 },
  mark: { b: pkMark, g: 1 },
  envelope: { b: pkEnvelope },
  pills: { b: (g, gg, l, r) => pkPills(g, gg, l, r, false) },
  letters: { b: pkLetters },
  mask: { b: pkMask },
  scanner: { b: pkScanner },
  trout: { b: pkTrout },
  sunlamp: { b: pkSunlamp },
  fishy: { b: (g, gg, l, r) => pkFridgeLoad(g, gg, 'fishy', r), fr: 1 },
  radio: { b: pkHamRadio },
  bare: { b: () => {}, fr: 1 },
  butcher: { b: pkButcher },
  cash: { b: pkCash, g: 1 },
  ledger: { b: pkLedger },
  chips: { b: pkChips, g: 1 },
  receipt: { b: pkReceipt },
  sock: { b: pkSock },
  watch: { b: pkWatch },
  spoon: { b: pkSpoon },
  change: { b: pkChange },
  battery: { b: pkBattery },
  lovenote: { b: pkLoveNote },
  crust: { b: pkCrust },
  key: { b: pkDoorKey },
  fuse: { b: pkFuse },
  dice: { b: pkDice },
  flashlight: { b: pkFlashlight },
  trap: { b: pkTrap },
  pillsFound: { b: (g, gg, l, r) => pkPills(g, gg, l, r, true) },
  toilet: { b: pkToiletRoll },
  tins: { b: pkTins },
  badges: { b: pkBadges },
  bulbs: { b: pkBulbs },
  sandwich: { b: (g, gg, l, r) => pkSandwich(g, gg, l, r, false) },
  wholeSandwich: { b: (g, gg, l, r) => pkSandwich(g, gg, l, r, true) },
  fishBones: { b: pkFishBones },
  scorched: { b: pkScorched },
  skinNails: { b: pkSkinNails },
  butcherPaper: { b: pkButcherPaper },
  doc: { b: pkDoc },
  photo: { b: pkPhoto },
  milk: { b: (g, gg, l, r) => pkFridgeLoad(g, gg, 'milk', r), fr: 1 },
  tubs: { b: (g, gg, l, r) => pkFridgeLoad(g, gg, 'tubs', r), fr: 1 },
  beer: { b: (g, gg, l, r) => pkFridgeLoad(g, gg, 'beer', r), fr: 1 },
  cheese: { b: (g, gg, l, r) => pkFridgeLoad(g, gg, 'cheese', r), fr: 1 },
  office: { b: (g, gg, l, r) => pkFridgeLoad(g, gg, 'office', r), fr: 1 },
};
// what the game said you found, as one of PK_THINGS: a stash's own key, a FINDS key, or the words of the note
const PK_WORDS = [
  [/receipt/i, 'receipt'],
  [/sock/i, 'sock'],
  [/watch/i, 'watch'],
  [/spoon/i, 'spoon'],
  [/change|hairgrip/i, 'change'],
  [/battery/i, 'battery'],
  [/note/i, 'lovenote'],
  [/whole sandwich/i, 'wholeSandwich'],
  [/sandwich/i, 'sandwich'],
  [/crust/i, 'crust'],
  [/key/i, 'key'],
  [/fuse/i, 'fuse'],
  [/dice|bottle cap/i, 'dice'],
  [/toilet/i, 'toilet'],
  [/tins/i, 'tins'],
  [/badge/i, 'badges'],
  [/bulb/i, 'bulbs'],
  [/fish bones/i, 'fishBones'],
  [/scorched/i, 'scorched'],
  [/shed skin/i, 'skinNails'],
  [/butcher paper/i, 'butcherPaper'],
  [/milk|eggs|cake/i, 'milk'],
  [/tubs|leftovers/i, 'tubs'],
  [/beer|lettuce/i, 'beer'],
  [/cheese|jam|lemon/i, 'cheese'],
];
function pkKey(k) {
  if (!k) return null;
  if (PK_THINGS[k]) return k;
  for (const [re, key] of PK_WORDS) if (re.test(k)) return key;
  return null;
}
