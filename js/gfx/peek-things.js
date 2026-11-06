//@ gfx/peek-things — What a rummage turns up, close: THEIR things, THEIR plants, the lookalikes
//@ Defines: PK_LOOK, pkCoin, pkFish, pkBones, pkTooth, pkSkin, pkTokens, pkCoolerFish, pkLaser, pkGadget, pkChart, pkObit, pkTeeth, pkFinger, pkFishes, pkMeat, …
//@ Uses:    gfx/peek-geo, gfx/world-geometry, core/util, world/grid
//@ (header made by tools/map.js; stripped by build.py)
// ───────────── what turns up in a rummage, built for the close-up (gfx/peek): THEIR things, THEIR plants and the
// lookalikes, at their real size, lying where they lie. Every builder gets (g, gg, look, rnd): g for what's solid, gg
// for glass (drawn last, see-through), look for whose colours a thing wears (play/stashes thingLook), rnd a seeded
// stream. The table that names them all, PK_THINGS, is in gfx/peek-junk with the everyday things.
const pkAt = (g, x, y, z, ry, rx, rz, fn) => g.xf(M4.joint(M4.ident(), x, y, z, rx || 0, ry || 0, rz || 0), fn);
// THEIR colours, close up: scales and old gold; chrome and green light; rot and old newspaper
const PK_LOOK = {
  lizards: { base: 0x6f8c55, trim: 0xc9a043, glow: 0xc9a043 },
  aliens: { base: 0xa9afb6, trim: 0x50ffa0, glow: 0x50ffa0 },
  zombies: { base: 0xcfc4a2, trim: 0x5a4a2a, glow: 0x9a7a4a },
};
function pkCoin(g, x, y, z, r, t, col, mat, top) {
  pkLathe(g, x, y, z, [0, 0, r * 0.94, 0, r, t * 0.3, r, t * 0.7, r * 0.94, t, 0, t], 22, col, mat);
  if (top) pkLathe(g, x, y + t + 0.0001, z, [0, 0, r * 0.93, 0], 22, col, top); // the stamped face, painted from its middle out
}
// a fish lying on its side: nose to +x, back to +z, the side you see up
function pkFish(g, len, col) {
  const H = len * 0.13,
    T = len * 0.055,
    hgt = (s) => {
      const e = (s - 0.55) / 0.45;
      return Math.max(Math.sqrt(Math.max(0, 1 - e * e)), 0.14 * (1 - s));
    };
  const back = C(col || 0x3e4c52),
    belly = C(0xd4d8dc);
  pkGrid(
    g,
    30,
    18,
    (u, v, P) => {
      const s = clamp(u, 0, 1),
        a = v * TAU,
        k = hgt(s);
      P[0] = (s - 0.5) * len;
      P[1] = T + Math.cos(a) * T * k;
      P[2] = Math.sin(a) * H * k;
    },
    (u, v, P) => {
      const k = clamp((P[2] / H) * 0.8 + 0.45, 0, 1),
        c = mix3(belly, back, k * k);
      return Math.abs(u - 0.8) < 0.012 ? mul3(c, 0.55) : c; // the gill
    },
    PKM.fish,
    { out: [0, T, 0] },
  );
  const fin = (x0, x1, z0, z1, w) =>
    pkGrid(
      g,
      8,
      4,
      (u, v, P) => {
        P[0] = lerp(x0, x1, u);
        P[1] = T * (1.02 + 0.2 * v);
        P[2] = lerp(z0, z1, u) + (v - 0.5) * w * (0.4 + u);
      },
      mul3(back, 0.8),
      PKM.fish,
    );
  // the tail: a fan, notched
  pkGrid(
    g,
    10,
    8,
    (u, v, P) => {
      const z = (v - 0.5) * 2;
      P[0] = -len * 0.5 - u * len * 0.2 + Math.abs(z) * u * len * 0.06 - (1 - Math.abs(z)) * u * len * 0.05;
      P[1] = T * (1 + 0.15 * u);
      P[2] = z * H * (0.15 + u * 0.75);
    },
    mul3(back, 0.75),
    PKM.fish,
  );
  fin(0.0, len * 0.18, H * 0.95, H * 0.7, H * 0.5); // the back fin
  fin(len * 0.12, len * 0.22, -H * 0.2, -H * 0.55, H * 0.25); // the side fin
  pkLathe(
    g,
    len * 0.36,
    T * 1.55,
    H * 0.25,
    [0, 0, H * 0.22, 0.0004, H * 0.24, 0.0012, H * 0.2, 0.002, 0, 0.0024],
    14,
    C(0xb8b2a0),
    PKM.steel,
  );
  pkLathe(
    g,
    len * 0.36,
    T * 1.55 + 0.0018,
    H * 0.25,
    [0, 0, H * 0.12, 0.0004, 0, 0.0012],
    12,
    C(0x060606),
    PKM.plastic,
  );
}
// what's left when something has eaten it: the spine, the ribs, the head
function pkBones(g, len, col) {
  const bone = C(col || 0xe6dcc4),
    H = len * 0.12;
  pkTube(
    g,
    [-len * 0.5, 0.006, 0, -len * 0.1, 0.0065, 0.002, len * 0.2, 0.0065, -0.001, len * 0.35, 0.006, 0],
    0.0022,
    8,
    bone,
    PKM.bone,
    { caps: true },
  );
  for (let k = 0; k < 14; k++) {
    const x = -len * 0.38 + k * len * 0.05,
      h = H * Math.sin(Math.PI * (0.15 + (k / 14) * 0.8));
    for (const sz of [1, -1])
      pkTube(
        g,
        [x, 0.006, 0, x - h * 0.15, 0.0058, sz * h * 0.55, x - h * 0.4, 0.0045, sz * h],
        (t) => 0.0011 * (1 - t * 0.7),
        5,
        bone,
        PKM.bone,
        { caps: true },
      );
  }
  pkBlob(g, len * 0.43, 0.011, 0, len * 0.09, 0.011, H * 0.55, 0.18, 3, 7, mul3(bone, 0.95), PKM.bone);
  pkLathe(g, len * 0.44, 0.019, H * 0.18, [0, 0, H * 0.16, 0.0005, 0, 0.001], 10, C(0x2a2018), PKM.plain); // where the eye was
  for (let k = 0; k < 7; k++) {
    const z = (k / 6 - 0.5) * 2;
    pkTube(
      g,
      [-len * 0.5, 0.006, 0, -len * 0.62, 0.0055, z * H * 0.5, -len * 0.7, 0.005, z * H * 0.9],
      0.0008,
      4,
      bone,
      PKM.bone,
      { caps: true },
    );
  }
}
function pkTooth(g, x, y, z, ry, rx, rz, rnd, big) {
  const c = mix3(C(0xece4cc), C(0xc8b27a), rnd() * 0.5);
  pkAt(g, x, y, z, ry, rx, rz, () => {
    if (big) {
      pkRBox(g, 0, 0.004, 0, 0.0088, 0.007, 0.0092, 0.0028, c, PKM.bone);
      for (const s of [-1, 1])
        pkTube(
          g,
          [s * 0.0022, 0.002, 0, s * 0.0028, -0.005, 0.0005, s * 0.0022, -0.011, 0],
          (t) => 0.0021 * (1 - t * 0.8),
          6,
          mul3(c, 0.92),
          PKM.bone,
          { caps: true },
        );
    } else {
      pkTube(
        g,
        [0, 0.008, 0, 0, 0.002, 0, 0.0003, -0.008, 0],
        (t) => (t < 0.4 ? 0.0032 : 0.0032 * (1 - (t - 0.4) * 1.4)),
        8,
        c,
        PKM.bone,
        { caps: true, flat: 0.55 },
      );
    }
  });
}
// ── THEIR own things
function pkSkin(g, gg, look, rnd) {
  const col = (u, t) => mix3(C(0xd8d4b8), C(0xa8a888), pkNoise(t * 30, u * 6, 1, 4) * 0.6);
  const path = [];
  for (let k = 0; k <= 9; k++) {
    const t = k / 9;
    path.push(0.13 - t * 0.3, 0.008 + 0.004 * Math.sin(t * 9), Math.sin(t * 5.5) * 0.035 * t + (rnd() - 0.5) * 0.008);
  }
  pkTube(
    g,
    path,
    (t) =>
      (t < 0.08
        ? 0.014 + t * 0.12
        : t < 0.45
          ? 0.024 + Math.sin(t * 7) * 0.004
          : 0.024 * Math.pow(1 - (t - 0.45) / 0.55, 1.3) + 0.0015) *
      (0.92 + pkNoise(t * 40, 1, 2, 9) * 0.16),
    18,
    col,
    PKM.scales,
    { caps: true, flat: 0.32, sub: 6 },
  );
  for (const [x, s] of [
    [0.07, 1],
    [0.07, -1],
    [-0.02, 1],
    [-0.02, -1],
  ])
    pkTube(
      g,
      [x, 0.008, s * 0.012, x + 0.012, 0.007, s * 0.035, x + 0.022, 0.006, s * 0.045],
      (t) => 0.007 * (1 - t * 0.6),
      8,
      col,
      PKM.scales,
      { caps: true, flat: 0.35 },
    );
  pkLathe(g, 0.15, 0.012, 0.007, [0, 0, 0.0035, 0.0006, 0, 0.0012], 10, C(0x1a1610), PKM.plain);
  pkLathe(g, 0.15, 0.012, -0.007, [0, 0, 0.0035, 0.0006, 0, 0.0012], 10, C(0x1a1610), PKM.plain);
}
function pkTokens(g, gg, look, rnd) {
  const brass = C(0xc9a043);
  for (let k = 0; k < 4; k++)
    pkCoin(g, (rnd() - 0.5) * 0.002, k * 0.0026, (rnd() - 0.5) * 0.002, 0.0145, 0.0025, brass, PKM.brass, PKM.token);
  for (let k = 0; k < 4; k++) {
    const a = rnd() * TAU,
      d = 0.03 + rnd() * 0.02;
    pkAt(g, Math.cos(a) * d, 0, Math.sin(a) * d, rnd() * TAU, (rnd() - 0.5) * 0.3, 0, () =>
      pkCoin(g, 0, 0, 0, 0.0145, 0.0025, brass, PKM.brass, PKM.token),
    );
  }
}
function pkCoolerFish(g, gg, look, rnd) {
  const wall = C(0xe8ecee),
    trim = C(0x2f6fa0);
  pkRBox(g, 0, 0.004, 0, 0.24, 0.008, 0.15, 0.003, wall, PKM.plastic);
  for (const s of [-1, 1]) {
    pkRBox(g, s * 0.116, 0.05, 0, 0.008, 0.1, 0.15, 0.003, wall, PKM.plastic);
    pkRBox(g, 0, 0.05, s * 0.071, 0.24, 0.1, 0.008, 0.003, wall, PKM.plastic);
  }
  for (const sz of [-1, 1]) {
    pkRBox(g, 0, 0.1, sz * 0.073, 0.248, 0.012, 0.014, 0.004, trim, PKM.plastic);
    pkRBox(g, sz * 0.118, 0.1, 0, 0.014, 0.012, 0.15, 0.004, trim, PKM.plastic);
  }
  pkAt(g, 0, 0.1, -0.08, 0, -1.9, 0, () => pkRBox(g, 0, 0.006, 0.078, 0.25, 0.014, 0.16, 0.005, trim, PKM.plastic)); // the lid, thrown back
  pkAt(g, -0.01, 0.008, 0.02, 0.15, 0, 0, () => pkBones(g, 0.17));
  pkAt(g, 0.02, 0.016, -0.03, -0.2, 0, 0, () => pkBones(g, 0.15));
  pkSheet(g, 0.22, 0.13, 10, 8, (u, v) => 0.009 + pkNoise(u * 4, v * 4, 1, 5) * 0.004, C(0x5a5a40), PKM.flesh);
}
function pkLaser(g, gg, look, rnd) {
  const steel = C(0xb4bac2),
    dark = C(0x2a2c30),
    green = C(0x50ffa0);
  g.xf(M4.rotX(Math.PI / 2), () => {
    pkAt(g, -0.03, 0, 0, 0, 0, -Math.PI / 2, () => {
      pkLathe(
        g,
        0,
        0,
        0,
        [
          0, 0, 0.012, 0, 0.012, 0.004, 0.0095, 0.01, 0.0095, 0.09, 0.0125, 0.095, 0.0125, 0.112, 0.008, 0.118, 0,
          0.118,
        ],
        22,
        steel,
        PKM.steel,
      );
      for (let k = 0; k < 3; k++)
        pkLathe(
          g,
          0,
          0.03 + k * 0.012,
          0,
          [0.0094, 0, 0.0135, 0.001, 0.0135, 0.0035, 0.0094, 0.0045],
          22,
          steel,
          PKM.steel,
        );
      pkLathe(g, 0, 0.1, 0, [0.0127, 0, 0.0127, 0.004], 22, green, PKM.led, { emit: 1 });
    });
    pkRBox(g, -0.055, 0, 0, 0.065, 0.034, 0.028, 0.011, steel, PKM.steel);
    pkRBox(g, -0.02, 0.0095, 0, 0.07, 0.003, 0.006, 0.0014, green, PKM.led, { emit: 1 }); // the light inside, through a slit
    pkAt(g, -0.068, -0.035, 0, 0, 0, -0.32, () => pkRBox(g, 0, 0, 0, 0.026, 0.065, 0.026, 0.009, dark, PKM.leather));
  });
}
function pkGadget(g, gg, look, rnd) {
  const steel = C(0x9aa0a6),
    green = C(0x50ffa0);
  pkAt(g, -0.07, 0.022, 0, 0, 0, -Math.PI / 2, () => {
    pkLathe(
      g,
      0,
      0,
      0,
      [
        0, 0, 0.017, 0, 0.022, 0.006, 0.022, 0.03, 0.019, 0.031, 0.019, 0.037, 0.022, 0.038, 0.022, 0.1, 0.019, 0.101,
        0.019, 0.107, 0.022, 0.108, 0.022, 0.134, 0.017, 0.14, 0, 0.14,
      ],
      28,
      steel,
      PKM.steel,
    );
    for (const y of [0.031, 0.101]) pkLathe(g, 0, y, 0, [0.0196, 0, 0.0196, 0.006], 28, green, PKM.led, { emit: 1 });
    pkLathe(g, 0, 0.14, 0, [0, 0, 0.006, 0, 0.006, 0.003, 0, 0.004], 16, green, PKM.led, { emit: 1 });
  });
}
function pkChart(g, gg, look, rnd) {
  pkSheet(g, 0.3, 0.22, 34, 30, (u, v) => 0.0005 + pkNoise(u * 5, v * 5, 2, 3) * 0.002, C(0x1c2a4c), PKM.chart, {
    bend: (u, v, P) => {
      if (v > 0.8) {
        const a = ((v - 0.8) * 0.22) / 0.011;
        P[2] = (0.8 - 0.5) * 0.22 + Math.sin(a) * 0.011;
        P[1] += 0.011 * (1 - Math.cos(a));
      }
    },
  });
}
function pkObit(g, gg, look, rnd) {
  pkSheet(
    g,
    0.11,
    0.15,
    16,
    20,
    (u, v) => 0.0006 + pkFbm(u * 4, v * 5, 1, 8) * 0.004 + Math.max(0, 0.4 - Math.abs(u - 0.45)) * 0.004,
    C(0xcbb68a),
    PKM.obit,
    { flat: true },
  );
}
function pkTeeth(g, gg, look, rnd) {
  pkLathe(
    gg,
    0,
    0,
    0,
    [0, 0, 0.036, 0, 0.04, 0.006, 0.04, 0.084, 0.034, 0.094, 0.034, 0.101],
    30,
    C(0xd8e4e0),
    PKM.glass,
  );
  pkLathe(g, 0, 0.098, 0, [0.035, 0, 0.037, 0.001, 0.037, 0.013, 0.033, 0.016, 0, 0.016], 30, C(0xc09a48), PKM.brass);
  for (let k = 0; k < 24; k++) {
    const a = rnd() * TAU,
      d = Math.sqrt(rnd()) * 0.027,
      y = 0.006 + Math.min(k, 18) * 0.0024 + rnd() * 0.004;
    pkTooth(
      g,
      Math.cos(a) * d,
      y,
      Math.sin(a) * d,
      rnd() * TAU,
      (rnd() - 0.5) * 2.5,
      (rnd() - 0.5) * 2.5,
      rnd,
      rnd() < 0.55,
    );
  }
  pkSheet(g, 0.035, 0.03, 4, 4, null, C(0xe8dcc0), PKM.note, {
    bend: (u, v, P) => {
      const a = (u - 0.5) * 0.9;
      P[0] = Math.sin(a) * 0.0404;
      P[2] = Math.cos(a) * 0.0404;
      P[1] = 0.03 + v * 0.03;
    },
  });
}
function pkFinger(g, gg, look, rnd) {
  pkSheet(
    g,
    0.22,
    0.19,
    26,
    22,
    (u, v) => {
      const e = Math.max(Math.abs(u - 0.5), Math.abs(v - 0.5)) * 2;
      return 0.001 + e * e * 0.03 + pkFbm(u * 5, v * 5, 3, 21) * 0.012;
    },
    (u, v) => mix3(C(0xd2c8aa), C(0x6a3a26), clamp(0.6 - Math.hypot(u - 0.52, v - 0.48) * 4.5, 0, 0.6)),
    PKM.news,
    { flat: true },
  );
  const skin = (u, t) => mix3(C(0x8e9680), C(0x5a3434), clamp(0.12 - t, 0, 0.12) / 0.12);
  pkTube(
    g,
    [-0.045, 0.012, 0.004, -0.015, 0.0128, 0.006, 0.014, 0.012, 0.004, 0.04, 0.0104, 0.001],
    (t) =>
      0.0094 -
      t * 0.0016 +
      0.0007 * Math.exp(-Math.pow((t - 0.36) / 0.05, 2)) +
      0.0006 * Math.exp(-Math.pow((t - 0.68) / 0.05, 2)),
    18,
    skin,
    PKM.skin,
    { caps: true, flat: 0.88 },
  );
  pkLathe(g, -0.0505, 0.012, 0.004, [0, 0, 0.0072, 0.0001, 0, 0.0002], 14, C(0x5a1410), PKM.flesh); // the end that was cut
  pkAt(g, 0.037, 0.0186, 0.0012, 0.1, 0.08, 0, () =>
    pkRBox(g, 0, 0, 0, 0.012, 0.0022, 0.0105, 0.001, C(0xa6a088), PKM.nail),
  );
}
function pkFishes(g, gg, look, rnd) {
  for (let k = 0; k < 3; k++)
    pkAt(g, (rnd() - 0.5) * 0.04, k * 0.018, (k - 1) * 0.045, (rnd() - 0.5) * 0.5 + (k % 2) * Math.PI, 0, 0, () =>
      pkFish(g, 0.2 + rnd() * 0.04),
    );
}
function pkMeat(g, gg, look, rnd, bare) {
  if (!bare)
    pkSheet(
      g,
      0.26,
      0.2,
      18,
      14,
      (u, v) => pkFbm(u * 4, v * 4, 4, 5) * 0.006,
      (u, v) => mix3(C(0xd8cbb6), C(0xa0605a), clamp(0.5 - Math.hypot(u - 0.5, v - 0.5) * 2.2, 0, 0.5)),
      PKM.paper,
      { flat: true },
    );
  const meat = (P) =>
    mix3(C(0x8e2a24), C(0x5e6a48), clamp((pkNoise(P[0] * 50, P[1] * 50, P[2] * 50, 3) - 0.55) * 3, 0, 0.7));
  for (let k = 0; k < 3; k++) {
    const x = (k - 1) * 0.07 + (rnd() - 0.5) * 0.02;
    pkBlob(g, x, 0.022, (rnd() - 0.5) * 0.05, 0.045, 0.022, 0.035, 0.22, 2.4, 30 + k, (u, v, P) => meat(P), PKM.flesh, {
      squash: 0.4,
    });
  }
}
// ── THEIR plants
function pkDevice(g, gg, look, rnd) {
  pkLathe(g, 0, 0, 0, [0, 0, 0.012, 0, 0.012, 0.003, 0.0105, 0.0045, 0, 0.0045], 26, C(0x26282c), PKM.plastic);
  pkLathe(g, 0, 0.0045, 0, [0, 0, 0.008, 0, 0.008, 0.0004, 0, 0.0004], 26, C(0x55585e), PKM.pcb);
  pkLathe(g, 0.0075, 0.0047, 0.004, [0, 0, 0.0012, 0.0004, 0.0008, 0.0011, 0, 0.0013], 10, C(0x60ff90), PKM.led, {
    emit: 1,
  });
  pkTube(
    g,
    [0.011, 0.002, 0, 0.03, 0.002, 0.006, 0.045, 0.0016, -0.004, 0.058, 0.0015, 0.004],
    0.0005,
    5,
    C(0x121212),
    PKM.plastic,
    { caps: true },
  );
  pkSheet(g, 0.022, 0.03, 4, 4, (u, v) => 0.0049 + Math.sin(u * Math.PI) * 0.0002, C(0xd8cc9a), PKM.tape, {
    bend: (u, v, P) => {
      P[0] -= 0.008;
      if (Math.abs(v - 0.5) > 0.28) P[1] = 0.0005;
    },
  });
}
function pkTill(g, gg, look, rnd) {
  for (let k = 0; k < 16; k++)
    pkAt(g, (rnd() - 0.5) * 0.003, k * 0.0011, (rnd() - 0.5) * 0.003, (rnd() - 0.5) * 0.04, 0, 0, () =>
      pkRBox(g, 0, 0.0005, 0, 0.156, 0.0009, 0.066, 0.0004, mix3(C(0x9aa88a), C(0xb0b49a), rnd()), PKM.money),
    );
  const L = PK_LOOK.lizards;
  pkRBox(g, 0, 0.009, 0, 0.032, 0.0198, 0.0702, 0.0008, C(L.trim), PKM.scales, { skip: [0, 1] });
}
function pkMark(g, gg, look, rnd) {
  pkRBox(g, 0, 0.0175, 0, 0.26, 0.035, 0.09, 0.004, C(0xd9d1c0), PKM.plain);
  const cut = C(0x241a12);
  for (let k = 0; k < 3; k++)
    pkAt(g, -0.03 + k * 0.03, 0.035, 0, 0.12 - k * 0.1, 0, 0, () =>
      pkRBox(g, 0, 0, 0, 0.0045, 0.003, 0.07, 0.0015, cut, PKM.wood),
    );
  pkRBox(g, 0, 0.035, 0.012, 0.1, 0.003, 0.004, 0.0015, cut, PKM.wood);
  for (let k = 0; k < 9; k++)
    pkAt(g, (rnd() - 0.5) * 0.1, 0.0355, (rnd() - 0.5) * 0.07, rnd() * TAU, 0, 0, () =>
      pkRBox(g, 0, 0, 0, 0.006, 0.0012, 0.002, 0.0005, C(0xc4a070), PKM.wood),
    );
}
// ── the lookalikes: the same in your hand as something of THEIRS would be
function pkEnvelope(g, gg, look, rnd) {
  pkRBox(g, 0, 0.011, 0, 0.22, 0.022, 0.11, 0.008, C(0xe9dfc6), PKM.paper);
  for (let k = 0; k < 4; k++)
    pkRBox(g, -0.04 + k * 0.012, 0.009 + k * 0.002, 0.07, 0.156, 0.0009, 0.04, 0.0004, C(0x9ca88a), PKM.money);
  pkGrid(
    g,
    8,
    4,
    (u, v, P) => {
      const a = -2.2 * v;
      P[0] = (u - 0.5) * 0.22 * (1 - v * 0.9);
      P[1] = 0.022 - Math.sin(a) * 0.06 * v;
      P[2] = 0.055 + Math.cos(a) * 0.06 * v - 0.0;
    },
    C(0xe3d8bf),
    PKM.paper,
  );
}
function pkPills(g, gg, look, rnd, label) {
  pkLathe(
    gg,
    0,
    0,
    0,
    [0, 0, 0.017, 0, 0.018, 0.002, 0.018, 0.058, 0.016, 0.061, 0.016, 0.064],
    26,
    C(0xb86a1c),
    PKM.glass,
  );
  pkLathe(
    g,
    0,
    0.058,
    0,
    [0, 0, 0.0188, 0, 0.0192, 0.002, 0.0192, 0.014, 0.017, 0.016, 0, 0.016],
    26,
    C(0xf2f0ea),
    PKM.plastic,
  );
  for (let k = 0; k < 20; k++)
    pkLathe(g, 0, 0.0602 + k * 0.0007, 0, [0.0193, 0, 0.0196, 0.00035, 0.0193, 0.0007], 26, C(0xe2e0da), PKM.plastic);
  const lab = label
    ? C(0xf4f0e6)
    : (u, v) => (pkHash(Math.floor(u * 90), Math.floor(v * 12), 0, 3) < 0.35 ? C(0x9a9284) : C(0xece6d6));
  pkLathe(g, 0, 0.012, 0, [0.0183, 0, 0.0183, 0.036], 26, lab, label ? PKM.label : PKM.paper);
  for (let k = 0; k < 16; k++) {
    const inJar = k < 12,
      a = rnd() * TAU,
      d = inJar ? rnd() * 0.012 : 0.03 + rnd() * 0.025,
      x = Math.cos(a) * d + (inJar ? 0 : 0.01),
      z = Math.sin(a) * d,
      y = inJar ? 0.004 + (k % 6) * 0.004 : 0.004;
    pkAt(g, x, y, z, rnd() * TAU, inJar ? rnd() : 0, 0, () =>
      pkTube(
        g,
        [-0.006, 0, 0, 0.006, 0, 0],
        0.0033,
        10,
        (u, t) => (t < 0.5 ? C(0xf2efe8) : C(label ? 0xc84a28 : 0x4a7ab8)),
        PKM.plastic,
        { caps: true },
      ),
    );
  }
}
function pkLetters(g, gg, look, rnd) {
  for (let k = 0; k < 5; k++)
    pkAt(g, (rnd() - 0.5) * 0.008, k * 0.0042, (rnd() - 0.5) * 0.008, (rnd() - 0.5) * 0.08, 0, 0, () =>
      pkRBox(g, 0, 0.002, 0, 0.16, 0.0036, 0.1, 0.0014, mix3(C(0xeee4cc), C(0xd8c8a6), rnd()), PKM.paper),
    );
  const str = C(0xc4ae84),
    H = 0.023;
  pkTube(g, [-0.084, -0.0005, 0, 0.084, -0.0005, 0, 0.084, H, 0, -0.084, H, 0], 0.0011, 5, str, PKM.cloth, {
    closed: true,
    sub: 2,
  });
  pkTube(
    g,
    [0, -0.0004, -0.054, 0, -0.0004, 0.054, 0, H + 0.0006, 0.054, 0, H + 0.0006, -0.054],
    0.0011,
    5,
    str,
    PKM.cloth,
    { closed: true, sub: 2 },
  );
  pkBlob(g, 0, H + 0.002, 0, 0.004, 0.0025, 0.004, 0.2, 3, 6, str, PKM.cloth);
  pkLathe(
    g,
    0.045,
    0.0205,
    0.02,
    [
      0, 0, 0.0135, 0, 0.0142, 0.0012, 0.0115, 0.0024, 0.009, 0.0024, 0.0085, 0.0034, 0.004, 0.0034, 0.003, 0.0026, 0,
      0.0026,
    ],
    24,
    C(0x7a1a14),
    PKM.plastic,
  );
}
function pkMask(g, gg, look, rnd) {
  pkSheet(
    g,
    0.15,
    0.2,
    16,
    22,
    (u, v) => {
      const nose = Math.exp(-(Math.pow((u - 0.5) / 0.06, 2) + Math.pow((v - 0.47) / 0.08, 2))) * 0.012;
      return 0.002 + nose + pkNoise(u * 6, v * 6, 2, 3) * 0.003;
    },
    C(0xd8b49c),
    PKM.rubber,
    {
      bend: (u, v, P) => {
        P[0] *= 0.6 + 0.4 * Math.sqrt(Math.max(0, 1 - Math.pow(v * 2 - 1, 2)));
        if (v > 0.78) {
          const a = ((v - 0.78) * 0.2) / 0.01;
          P[2] = 0.056 + Math.sin(Math.min(a, Math.PI)) * 0.01;
          P[1] += 0.01 * (1 - Math.cos(Math.min(a, Math.PI))) + 0.003;
        }
      },
    },
  );
  pkSheet(
    gg,
    0.2,
    0.25,
    14,
    16,
    (u, v) => 0.016 * Math.sin(u * Math.PI) * Math.sin(v * Math.PI) + pkFbm(u * 6, v * 6, 5, 2) * 0.006,
    C(0xdfe6ea),
    PKM.glass,
    { flat: true },
  );
}
function pkScanner(g, gg, look, rnd) {
  pkRBox(g, 0, 0.012, 0, 0.066, 0.024, 0.11, 0.005, C(0x1d1e21), PKM.plastic);
  pkRBox(
    g,
    0,
    0.0245,
    0.018,
    0.046,
    0.0015,
    0.05,
    0.0006,
    (f, s, t) => (Math.abs((((t + 1) * 9) % 1) - 0.5) < 0.2 ? C(0x0c0c0d) : C(0x3a3c40)),
    PKM.steel,
  );
  pkLathe(g, 0.018, 0.0245, -0.03, [0, 0, 0.0028, 0.0006, 0.0016, 0.0016, 0, 0.0018], 10, C(0xff2a20), PKM.led, {
    emit: 1,
  });
  pkLathe(
    g,
    -0.014,
    0.024,
    -0.034,
    [0, 0, 0.0075, 0, 0.0075, 0.007, 0.0065, 0.008, 0, 0.008],
    18,
    C(0x2a2a2c),
    PKM.plastic,
  );
  pkTube(g, [0.024, 0.02, -0.052, 0.028, 0.012, -0.11, 0.03, 0.004, -0.16], 0.0024, 8, C(0x141414), PKM.rubber, {
    caps: true,
  });
}
function pkTrout(g, gg, look, rnd) {
  pkLathe(
    g,
    0,
    0,
    0,
    [0, 0, 0.085, 0, 0.1, 0.13, 0.104, 0.132, 0.104, 0.136, 0.098, 0.136, 0.082, 0.006, 0, 0.006],
    34,
    C(0x4a7a9a),
    PKM.plastic,
  );
  pkTube(
    g,
    [-0.103, 0.12, 0, -0.07, 0.2, 0, 0, 0.23, 0, 0.07, 0.2, 0, 0.103, 0.12, 0],
    0.0025,
    6,
    C(0x8a8e92),
    PKM.steel,
    { caps: true },
  );
  pkAt(g, 0, 0.012, 0.012, 0.3, 0, 0.1, () => pkFish(g, 0.17, 0x4a5a3a));
  pkAt(g, 0.01, 0.03, -0.02, -0.5, 0, -0.1, () => pkFish(g, 0.16, 0x50603e));
  pkAt(g, -0.01, 0.048, 0.01, 2.6, 0, 0, () => pkBones(g, 0.15));
}
function pkSunlamp(g, gg, look, rnd) {
  pkAt(g, 0, 0.065, 0, 0, Math.PI / 2 - 0.25, 0, () => {
    pkLathe(
      g,
      0,
      -0.03,
      0,
      [0.014, 0, 0.03, 0.012, 0.055, 0.045, 0.064, 0.07, 0.066, 0.075],
      34,
      C(0xc8ccd0),
      PKM.steel,
    );
    pkLathe(g, 0, -0.045, 0, [0, 0, 0.012, 0, 0.014, 0.018, 0, 0.02], 16, C(0x5a5c60), PKM.steel);
    pkLathe(
      g,
      0,
      -0.02,
      0,
      [0, 0, 0.01, 0, 0.012, 0.01, 0.034, 0.035, 0.03, 0.058, 0, 0.066],
      26,
      C(0xff5a24),
      PKM.led,
      { emit: 1 },
    );
  });
  pkTube(
    g,
    [0, 0.03, -0.06, 0.03, 0.004, -0.1, 0.09, 0.004, -0.12, 0.15, 0.004, -0.09],
    0.003,
    8,
    C(0x161616),
    PKM.rubber,
    { caps: true },
  );
}
function pkHamRadio(g, gg, look, rnd) {
  pkRBox(g, 0, 0.04, 0, 0.2, 0.08, 0.13, 0.004, C(0x5a6252), PKM.steel);
  pkRBox(g, 0, 0.04, 0.066, 0.19, 0.07, 0.004, 0.0015, C(0x26282a), PKM.plastic);
  pkRBox(g, -0.05, 0.05, 0.069, 0.06, 0.03, 0.002, 0.001, C(0xffb040), PKM.led, { emit: 1 });
  pkTube(g, [-0.06, 0.038, 0.071, -0.045, 0.06, 0.071], 0.0006, 4, C(0x1a1a1a), PKM.plastic);
  for (let k = 0; k < 3; k++)
    pkAt(g, 0.01 + k * 0.035, 0.035, 0.068, 0, Math.PI / 2, 0, () => {
      pkLathe(g, 0, 0, 0, [0, 0, 0.011, 0, 0.011, 0.012, 0.009, 0.014, 0, 0.014], 24, C(0x141414), PKM.plastic);
      for (let s = 0; s < 12; s++)
        pkAt(g, Math.sin((s / 12) * TAU) * 0.011, 0.006, Math.cos((s / 12) * TAU) * 0.011, (s / 12) * TAU, 0, 0, () =>
          pkRBox(g, 0, 0, 0, 0.002, 0.011, 0.0015, 0.0006, C(0x1c1c1c), PKM.plastic),
        );
    });
  pkTube(g, [0.09, 0.08, -0.05, 0.1, 0.16, -0.07, 0.11, 0.25, -0.09], 0.0015, 6, C(0xb0b4b8), PKM.steel, {
    caps: true,
  });
}
function pkCash(g, gg, look, rnd) {
  pkGrid(
    g,
    4,
    60,
    (u, v, P) => {
      const a = v * TAU * 3.2,
        r = 0.009 + v * 0.0035;
      P[0] = (u - 0.5) * 0.066;
      P[1] = 0.013 + Math.cos(a) * r;
      P[2] = Math.sin(a) * r;
    },
    C(0x9ca88a),
    PKM.money,
  );
  pkTube(g, [0, 0.0265, 0, 0, 0.013, 0.0136, 0, -0.0004, 0, 0, 0.013, -0.0136], 0.0016, 6, C(0xc9a043), PKM.brass, {
    closed: true,
  });
}
function pkLedger(g, gg, look, rnd) {
  g.xf(M4.rotZ(Math.PI / 2), () => pkRBox(g, 0, 0, 0, 0.03, 0.26, 0.2, 0.003, C(0x2c3e2c), PKM.book));
  pkRBox(g, 0, 0.0152, 0.02, 0.07, 0.0006, 0.05, 0.0003, C(0xe4dac0), PKM.receipt);
}
function pkChips(g, gg, look, rnd) {
  pkRBox(g, 0, 0.0015, 0, 0.12, 0.003, 0.08, 0.0008, C(0x1e5a2a), PKM.pcb);
  for (let k = 0; k < 6; k++) {
    const x = -0.038 + (k % 3) * 0.038,
      z = -0.018 + Math.floor(k / 3) * 0.036;
    pkRBox(g, x, 0.0045, z, 0.022, 0.003, 0.016, 0.0006, C(0x18181a), PKM.plastic);
    for (let p = 0; p < 6; p++)
      for (const s of [-1, 1])
        pkRBox(
          g,
          x - 0.008 + p * 0.0032,
          0.0034,
          z + s * 0.0088,
          0.0012,
          0.0008,
          0.0025,
          0.0003,
          C(0xc0c0c4),
          PKM.steel,
        );
    pkLathe(g, x + 0.007, 0.006, z + 0.004, [0, 0, 0.0016, 0, 0.0012, 0.0012, 0, 0.0014], 8, C(0x60ff90), PKM.led, {
      emit: 1,
    });
  }
}
function pkButcher(g, gg, look, rnd) {
  pkSheet(
    g,
    0.28,
    0.24,
    22,
    20,
    (u, v) => {
      const e = Math.max(Math.abs(u - 0.5), Math.abs(v - 0.5)) * 2;
      return e * e * 0.035 + pkFbm(u * 5, v * 5, 6, 7) * 0.012;
    },
    (u, v) => mix3(C(0xcfc6aa), C(0x7a3a30), clamp(0.45 - Math.hypot(u - 0.5, v - 0.5) * 2.4, 0, 0.45)),
    PKM.news,
    { flat: true },
  );
  pkMeat(g, gg, look, pkRng(9), true);
}
