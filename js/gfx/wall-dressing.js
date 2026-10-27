//@ gfx/wall-dressing — What hangs on the walls: art, signs, neon
//@ Defines: SIDE, DECOR_LIT, wallSolid, mount, DK, windowDress, buildDecor
//@ Uses:    gfx/world-geometry, core/util, gfx/gl, world/grid, gfx/post, world/light-map
//@ (header made by tools/map.js; stripped by build.py)
// ───────────────────────── what hangs on the walls ─────────────────────────
// Everything here rides on a wall tile: when that wall is cut away for the view, it sinks with it (ext.z + 1000).
// Local frame for each mount: x along the wall, y up, z out of the wall face into the room (or the street).
const SIDE = { N: [0, -1, 0], S: [0, 1, Math.PI], W: [-1, 0, Math.PI / 2], E: [1, 0, -Math.PI / 2] };
const DECOR_LIT = []; // { grp, g } lit pieces: lamps, a neon sign, an exit sign; switched with their light group
function wallSolid(x, z, y0) {
  const c = tget(x, z);
  return c === '#' || ((c === 'D' || c === 'L') && y0 >= 2.2);
}
// rx,rz: the tile you stand on; side: which way the wall is; along: metres along the wall from the tile's middle
function mount(g, rx, rz, side, along, fn, o = {}) {
  const [dx, dz, a] = SIDE[side],
    wx = rx + dx,
    wz = rz + dz;
  if (!o.any && !wallSolid(wx, wz, o.y0 || 0)) return false;
  const depth = o.win ? 0.2 : WT;
  const prevCell = g.cell,
    prevMat = g.mat;
  g.cell = [wx + 1000.5, wz + 0.5];
  const M = M4.mul(
    M4.mul(M4.trans(rx + 0.5 + dx * (0.5 - depth), 0, rz + 0.5 + dz * (0.5 - depth)), M4.rotY(a)),
    M4.trans(along, 0, 0),
  );
  g.mat = prevMat ? M4.mul(prevMat, M) : M;
  try {
    fn(g);
  } finally {
    g.mat = prevMat;
    g.cell = prevCell;
  }
  return true;
}
// pieces, in the mount's frame (z = 0 is the wall)
const DK = {
  frame(g, w, h, y0, art, frameCol, seed = 0) {
    const fc = frameCol || COL.woodD,
      b = 0.035;
    g.bx(0, y0, 0.018, w, h, 0.036, fc);
    g.bx(0, y0 + b, 0.03, w - b * 2, h - b * 2, 0.012, C(0xd8d0bc));
    const iw = w - b * 2 - 0.04,
      ih = h - b * 2 - 0.04,
      cy = y0 + b + 0.02,
      z = 0.038;
    const r = (k) => hash2(seed, k, 31);
    if (art === 'landscape' || art === 'sea') {
      const sky = mix3(C(0x5a6a78), C(0x8a6a50), r(1)),
        gnd = art === 'sea' ? C(0x253a4a) : mix3(C(0x2a3a24), C(0x4a3c26), r(2));
      g.bx(0, cy + ih * 0.4, z, iw, ih * 0.6, 0.004, sky);
      g.bx(0, cy, z, iw, ih * 0.42, 0.005, gnd);
      if (art === 'sea')
        g.bx(iw * (r(3) - 0.5) * 0.5, cy + ih * 0.42, z + 0.003, iw * 0.12, ih * 0.12, 0.004, C(0x1a1a18));
      else
        for (let k = 0; k < 3; k++)
          g.bx(
            iw * (r(k + 4) - 0.5) * 0.7,
            cy + ih * 0.3,
            z + 0.002,
            iw * (0.2 + r(k + 7) * 0.2),
            ih * (0.15 + r(k + 9) * 0.2),
            0.005,
            mul3(gnd, 0.75),
          );
      g.cyl(iw * 0.28, cy + ih * 0.78, z + 0.002, ih * 0.07, ih * 0.07, 0.005, 10, C(0xd8cfae)); // a moon, or a sun gone pale
    } else if (art === 'portrait') {
      g.bx(0, cy, z, iw, ih, 0.004, C(0x1d1a17));
      g.sphere(0, cy + ih * 0.56, z + 0.004, iw * 0.2, ih * 0.22, 0.004, 10, 6, C(0xb8a58e));
      g.bx(0, cy, z + 0.003, iw * 0.7, ih * 0.3, 0.004, C(0x2a2622));
      for (const s of [1, -1])
        g.bx(s * iw * 0.075, cy + ih * 0.6, z + 0.009, iw * 0.07, ih * 0.035, 0.002, C(0x15100c)); // the eyes have been gone over in pen
    } else if (art === 'photo') {
      g.bx(0, cy, z, iw, ih, 0.004, C(0x6e6a62));
      for (let k = 0; k < 3; k++) {
        const px = (k - 1) * iw * 0.28;
        g.sphere(px, cy + ih * 0.62, z + 0.004, iw * 0.07, ih * 0.09, 0.003, 8, 5, C(0xb0a690));
        g.bx(px, cy, z + 0.003, iw * 0.2, ih * 0.5, 0.003, C(0x3e3b36));
      }
    } else if (art === 'certificate') {
      g.bx(0, cy, z, iw, ih, 0.004, C(0xd8cfb0), XM('print'));
      g.cyl(iw * 0.3, cy + ih * 0.15, z + 0.004, ih * 0.09, ih * 0.09, 0.003, 10, C(0x9a2a1e));
    } else if (art === 'abstract') {
      g.bx(0, cy, z, iw, ih, 0.004, C(0x2e3a40));
      g.bx(-iw * 0.18, cy + ih * 0.3, z + 0.003, iw * 0.45, ih * 0.5, 0.003, C(0x9a3a28));
      g.bx(iw * 0.2, cy + ih * 0.05, z + 0.004, iw * 0.35, ih * 0.35, 0.003, C(0xc0a050));
    } else if (art !== 'none') {
      // flowers in a vase
      g.bx(0, cy, z, iw, ih, 0.004, C(0x3a3428));
      g.bx(0, cy + ih * 0.05, z + 0.003, iw * 0.2, ih * 0.3, 0.004, C(0x5a6a7a));
      for (let k = 0; k < 5; k++)
        g.sphere(
          iw * (r(k) - 0.5) * 0.5,
          cy + ih * (0.5 + r(k + 5) * 0.3),
          z + 0.005,
          iw * 0.08,
          iw * 0.08,
          0.003,
          7,
          4,
          [C(0x9a2a3a), C(0xc8b050), C(0xd8d0c0)][k % 3],
        );
    }
  },
  clock(g, y, r, stopped = true) {
    g.xf(M4.mul(M4.trans(0, y, 0.025), M4.rotX(Math.PI / 2)), () => {
      g.cyl(0, -0.025, 0, r, r, 0.05, 18, C(0x2a2724));
      g.cyl(0, -0.03, 0, r * 0.88, r * 0.88, 0.006, 18, C(0xd8d2c0));
    });
    for (let k = 0; k < 12; k++) {
      const a = (k / 12) * TAU;
      g.bx(
        Math.sin(a) * r * 0.74,
        y + Math.cos(a) * r * 0.74 - 0.008,
        0.056,
        0.008,
        k % 3 ? 0.012 : 0.03,
        0.004,
        C(0x1a1816),
      );
    }
    const hand = (ang, len, wd) =>
      g.xf(M4.mul(M4.trans(0, y, 0.06), M4.rotZ(-ang)), () => g.bx(0, 0, 0, wd, len, 0.004, C(0x141210)));
    hand(stopped ? 3.14 * 1.0 : 0.6, r * 0.55, 0.014);
    hand(stopped ? 0.02 : 2.2, r * 0.75, 0.009); // twenty past nothing; every clock in Wexley stopped at the same minute
  },
  board(g, w, h, y0, kind, seed = 0) {
    g.bx(0, y0, 0.012, w, h, 0.024, C(0x3a2a1c));
    g.bx(0, y0 + 0.03, 0.022, w - 0.06, h - 0.06, 0.008, C(0x8a6a44), XM('cork'));
    const n = Math.round(w * h * (kind === 'string' ? 14 : 10)),
      pins = [];
    for (let k = 0; k < n; k++) {
      const px = (hash2(seed, k, 1) - 0.5) * (w - 0.18),
        py = y0 + 0.09 + hash2(seed, k, 2) * (h - 0.2),
        rot = (hash2(seed, k, 3) - 0.5) * 0.3;
      const photo = kind === 'string' ? hash2(seed, k, 4) < 0.55 : hash2(seed, k, 4) < 0.15,
        pw = photo ? 0.07 : 0.08 + hash2(seed, k, 5) * 0.05,
        ph = photo ? 0.085 : 0.1 + hash2(seed, k, 6) * 0.04;
      g.xf(M4.mul(M4.trans(px, py, 0.028 + k * 0.0004), M4.rotZ(rot)), () => {
        if (photo) {
          g.bx(0, -ph / 2, 0, pw, ph, 0.002, C(0xd8d2c0));
          g.bx(
            0,
            -ph / 2 + 0.012,
            0.0012,
            pw - 0.012,
            ph - 0.03,
            0.002,
            mix3(C(0x2a2622), C(0x5a5248), hash2(seed, k, 7)),
          );
        } else
          g.bx(
            0,
            -ph / 2,
            0,
            pw,
            ph,
            0.002,
            mix3(C(0xd8d0b8), C(0xc8c070), hash2(seed, k, 8) < 0.2 ? 1 : 0),
            XM('print'),
          );
        g.sphere(
          0,
          -0.012,
          0.004,
          0.008,
          0.008,
          0.008,
          5,
          3,
          kind === 'string' ? C(0xb02218) : [C(0xb02218), C(0x2a5aa8), C(0xd0b030)][k % 3],
        );
      });
      pins.push([px, py - 0.012]);
    }
    if (kind === 'string')
      for (let k = 0; k + 1 < pins.length; k++) {
        // red thread from pin to pin, every second one back to the middle
        const a = pins[k],
          b = k % 2 ? pins[k + 1] : pins[Math.floor(pins.length / 2)];
        const dx = b[0] - a[0],
          dy = b[1] - a[1],
          L = Math.hypot(dx, dy);
        if (L < 0.05) continue;
        g.xf(
          M4.mul(M4.trans((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, 0.034), M4.rotZ(Math.atan2(dy, dx) - Math.PI / 2)),
          () => g.bx(0, -L / 2, 0, 0.004, L, 0.003, C(0xa01810), EMIT(0.12)),
        );
      }
  },
  whiteboard(g, w, h, y0, seed = 0) {
    g.bx(0, y0, 0.012, w, h, 0.024, C(0xa8acb0), XM('metal'));
    g.bx(0, y0 + 0.025, 0.02, w - 0.05, h - 0.05, 0.006, C(0xd8dcd8));
    g.bx(0, y0 - 0.02, 0.04, w * 0.7, 0.025, 0.06, C(0x9a9ea2));
    const inks = [C(0x1a2a6a), C(0x8a1a1a), C(0x1a1a1a)];
    for (let k = 0; k < 16; k++) {
      const px = (hash2(seed, k, 1) - 0.5) * (w - 0.3),
        py = y0 + 0.12 + hash2(seed, k, 2) * (h - 0.25),
        L = 0.06 + hash2(seed, k, 3) * 0.3;
      g.xf(M4.mul(M4.trans(px, py, 0.024), M4.rotZ((hash2(seed, k, 4) - 0.5) * (k % 4 ? 0.2 : 2.4))), () =>
        g.bx(0, 0, 0, L, 0.008, 0.002, inks[k % 3]),
      );
    }
    for (let k = 0; k < 4; k++) g.bx(-w * 0.3 + k * 0.05, y0 - 0.005, 0.06, 0.02, 0.018, 0.12, inks[k % 3]);
  },
  calendar(g, y0, seed = 0) {
    g.bx(0, y0 + 0.2, 0.004, 0.3, 0.2, 0.004, mix3(C(0x5a6a78), C(0x7a5a40), hash2(seed, 1, 1)));
    g.bx(0, y0, 0.004, 0.3, 0.2, 0.004, C(0xd8d2c0), XM('print'));
    for (let k = 0; k < 4; k++)
      g.bx(-0.09 + k * 0.06, y0 + 0.07 - (k % 2) * 0.05, 0.007, 0.03, 0.025, 0.002, C(0x9a2018)); // days crossed out
    g.sphere(0, y0 + 0.41, 0.006, 0.008, 0.008, 0.008, 4, 3, COL.metalD);
  },
  shelf(g, w, y, items, seed = 0) {
    g.bx(0, y, 0.11, w, 0.025, 0.22, COL.woodD);
    for (const s of [-1, 1]) g.bx(s * (w / 2 - 0.08), y - 0.12, 0.08, 0.02, 0.12, 0.16, COL.metalD);
    let x = -w / 2 + 0.06,
      k = 0;
    while (x < w / 2 - 0.08) {
      const kind = items === 'jars' ? 1 : items === 'books' ? 0 : Math.floor(hash2(seed, k, 9) * 3);
      if (kind === 0) {
        const bw = 0.03 + hash2(seed, k, 1) * 0.03,
          bh = 0.15 + hash2(seed, k, 2) * 0.08;
        g.bx(x + bw / 2, y + 0.0125, 0.11, bw * 0.92, bh, 0.15, PRODUCTS[(seed + k) % PRODUCTS.length]);
        x += bw;
      } else if (kind === 1) {
        g.cyl(
          x + 0.04,
          y + 0.0125,
          0.11,
          0.035,
          0.035,
          0.1 + hash2(seed, k, 3) * 0.06,
          8,
          mix3(C(0x8a9a8a), C(0xb08040), hash2(seed, k, 4)),
          GLASS,
        );
        x += 0.09;
      } else {
        g.sphere(x + 0.05, y + 0.07, 0.11, 0.045, 0.06, 0.045, 8, 5, mix3(C(0x6a5a4a), C(0xa8a090), hash2(seed, k, 5)));
        x += 0.12;
      }
      k++;
      if (hash2(seed, k, 6) < 0.15) x += 0.08;
    }
  },
  cabinet(g, w, y0, h, col) {
    g.bx(0, y0, 0.17, w, h, 0.34, col);
    const n = w > 0.7 ? 2 : 1;
    for (let k = 0; k < n; k++) {
      const cx = n === 2 ? ((k ? 1 : -1) * w) / 4 : 0,
        dw = w / n - 0.03;
      g.bx(cx, y0 + 0.02, 0.343, dw, h - 0.04, 0.008, mul3(col, 1.08));
      g.bx(
        cx + (n === 2 ? (k ? -1 : 1) * (dw / 2 - 0.04) : dw / 2 - 0.05),
        y0 + 0.06,
        0.352,
        0.015,
        0.09,
        0.015,
        COL.metal,
      );
    }
    g.bx(0, y0 + h, 0.18, w + 0.02, 0.03, 0.37, mul3(col, 0.85));
  },
  mirror(g, w, h, y0) {
    g.bx(0, y0, 0.012, w, h, 0.024, COL.metalD);
    g.bx(0, y0 + 0.02, 0.025, w - 0.04, h - 0.04, 0.006, C(0x8aa0a8), GLASS);
  },
  switchPlate(g, y = 1.25) {
    g.bx(0, y, 0.006, 0.07, 0.11, 0.012, C(0xcfc8b4));
    g.bx(0, y + 0.03, 0.013, 0.02, 0.035, 0.008, C(0xb8b0a0));
  },
  outlet(g) {
    g.bx(0, 0.28, 0.006, 0.09, 0.07, 0.012, C(0xcfc8b4));
    for (const s of [-1, 1]) g.bx(s * 0.018, 0.305, 0.013, 0.008, 0.016, 0.002, C(0x2a2622));
  },
  sconce(g, y, lit) {
    g.bx(0, y - 0.1, 0.02, 0.08, 0.14, 0.04, COL.brass);
    g.bx(0, y - 0.04, 0.07, 0.03, 0.03, 0.1, COL.brass);
    lit.xf(g.mat, () => {
      const c = lit.cell;
      lit.cell = g.cell;
      lit.frustum(0, y - 0.08, 0.14, 0.12, 0.12, 0.2, 0.2, 0.16, C(0xe8c890), EMIT(0.9));
      lit.cell = c;
    });
  },
  extinguisher(g) {
    g.bx(0, 0.62, 0.02, 0.08, 0.06, 0.04, COL.metalD);
    g.cyl(0, 0.2, 0.09, 0.075, 0.075, 0.48, 10, C(0x9a1a14));
    g.cyl(0, 0.68, 0.09, 0.03, 0.02, 0.08, 6, COL.black);
    g.bx(0.05, 0.72, 0.09, 0.08, 0.02, 0.02, COL.black);
  },
  towel(g, y, col) {
    g.bx(0, y, 0.06, 0.5, 0.02, 0.02, COL.metal);
    for (const s of [-1, 1]) g.bx(s * 0.24, y - 0.01, 0.03, 0.015, 0.04, 0.06, COL.metal);
    g.bx(0, y - 0.3, 0.075, 0.38, 0.32, 0.03, col, XM('fabric'));
    g.bx(0, y - 0.04, 0.05, 0.38, 0.06, 0.04, mul3(col, 0.9), XM('fabric'));
  },
  hooks(g, y, coats) {
    g.bx(0, y, 0.012, 0.6, 0.06, 0.024, COL.woodD);
    for (let k = 0; k < 3; k++) {
      const x = -0.2 + k * 0.2;
      g.bx(x, y + 0.01, 0.05, 0.012, 0.012, 0.06, COL.brass);
      if (coats[k]) {
        g.frustum(x, y - 0.85, 0.08, 0.2, 0.12, 0.13, 0.08, 0.86, coats[k], XM('fabric'));
        g.sphere(x, y - 0.02, 0.07, 0.07, 0.04, 0.05, 6, 4, mul3(coats[k], 0.85));
      }
    }
  },
  poster(g, w, h, y0, col, seed = 0) {
    g.bx(0, y0, 0.004, w, h, 0.004, col);
    g.bx(0, y0 + h * 0.62, 0.007, w * 0.8, h * 0.3, 0.002, mix3(col, C(0x1a1a1a), 0.6));
    g.bx(0, y0 + h * 0.12, 0.007, w * 0.8, h * 0.36, 0.002, mix3(col, C(0xd8d0c0), 0.7), XM('print'));
    for (const [sx, sy] of [
      [-1, 1],
      [1, 1],
      [-1, 0],
      [1, 0],
    ])
      g.bx(sx * (w / 2 - 0.015), y0 + sy * (h - 0.03) + 0.01, 0.008, 0.02, 0.02, 0.002, C(0xb8b090)); // tape at the corners
  },
  missing(g, y0, seed = 0) {
    // the same face on every one, and the date keeps changing
    g.xf(M4.mul(M4.trans(0, y0, 0.004), M4.rotZ((hash2(seed, 1, 1) - 0.5) * 0.14)), () => {
      g.bx(0, 0, 0, 0.24, 0.32, 0.003, C(0xd8d2bc));
      g.bx(0, 0.25, 0.002, 0.2, 0.045, 0.002, C(0x1a1816));
      g.bx(0, 0.11, 0.002, 0.14, 0.12, 0.002, C(0x3a3632));
      g.sphere(0, 0.15, 0.004, 0.03, 0.04, 0.002, 6, 4, C(0x9a9080));
      g.bx(0, 0.02, 0.002, 0.2, 0.06, 0.002, C(0xd8d2bc), XM('print'));
      if (hash2(seed, 2, 2) < 0.5) g.bx(0.07, -0.0, 0.003, 0.08, 0.32, 0.002, C(0x8a8478)); // torn, half gone
    });
  },
  plates(g, y) {
    for (let k = 0; k < 3; k++)
      g.xf(M4.mul(M4.trans((k - 1) * 0.26, y + (k === 1 ? 0.12 : 0), 0.01), M4.rotX(Math.PI / 2)), () => {
        g.cyl(0, -0.01, 0, 0.1, 0.1, 0.012, 14, C(0xd8d2c4));
        g.cyl(0, -0.012, 0, 0.065, 0.065, 0.004, 12, [C(0x3a5a8a), C(0x8a3a3a), C(0x3a6a4a)][k]);
      });
  },
  sampler(g, y0) {
    DK.frame(g, 0.34, 0.28, y0, 'none', COL.wood);
    g.bx(0, y0 + 0.05, 0.04, 0.22, 0.17, 0.003, C(0xd8ceb0));
    for (let k = 0; k < 6; k++)
      g.bx(
        -0.07 + (k % 3) * 0.07,
        y0 + 0.09 + Math.floor(k / 3) * 0.07,
        0.043,
        0.04,
        0.02,
        0.002,
        [C(0x9a2a2a), C(0x2a5a3a), C(0x3a3a8a)][k % 3],
      );
  },
  fusebox(g) {
    g.bx(0, 1.3, 0.05, 0.36, 0.48, 0.1, C(0x6e726e), XM('metal'));
    g.bx(0.14, 1.52, 0.105, 0.03, 0.06, 0.02, COL.black);
    g.bx(0, 1.62, 0.04, 0.04, 0.3, 0.04, COL.metalD);
  },
  handDryer(g) {
    g.bx(0, 1.05, 0.08, 0.26, 0.3, 0.16, C(0xd0ccc0));
    g.bx(0, 1.02, 0.12, 0.08, 0.04, 0.1, COL.metalD);
  },
  rollHolder(g) {
    g.bx(0, 0.62, 0.03, 0.14, 0.03, 0.06, COL.metal);
    g.xf(M4.mul(M4.trans(0, 0.58, 0.08), M4.rotZ(Math.PI / 2)), () =>
      g.cyl(0, -0.055, 0, 0.055, 0.055, 0.11, 10, C(0xe0dcd0)),
    );
  },
  exitSign(g, y, lit) {
    g.bx(0, y, 0.02, 0.36, 0.14, 0.04, C(0x2a2a28));
    lit.xf(g.mat, () => {
      const c = lit.cell;
      lit.cell = g.cell;
      lit.bx(0, y + 0.015, 0.042, 0.32, 0.11, 0.004, C(0xff3a2a), EMIT(1));
      lit.cell = c;
    });
  },
};
// curtains, blinds, posters in a shop window: built on the window tile from the inside
function windowDress(g, wx, wz, pick, seed) {
  const nb = [
    [0, 1, 'N'],
    [0, -1, 'S'],
    [1, 0, 'W'],
    [-1, 0, 'E'],
  ]; // the inside tile and the side the window is on from there
  for (const [dx, dz, side] of nb) {
    const rx = wx + dx,
      rz = wz + dz;
    if (!inb(rx, rz) || isOutdoor(rx, rz) || isWallish(rx, rz)) continue;
    const [kind, col] = pick(roomAt(rx, rz), rz < wz || rz > wz);
    if (!kind) continue;
    mount(
      g,
      rx,
      rz,
      side,
      0,
      (g) => {
        if (kind === 'curtain') {
          g.bx(0, 2.24, 0.06, 1.0, 0.025, 0.025, COL.brass);
          for (const s of [-1, 1]) {
            const open = 0.14 + hash2(seed, s + 2, 5) * 0.12;
            for (let k = 0; k < 4; k++)
              g.bx(
                s * (0.5 - open / 2) + (k - 1.5) * open * 0.22,
                0.62,
                0.075 + (k % 2) * 0.03,
                open * 0.3,
                1.6,
                0.035,
                mul3(col, 0.86 + (k % 2) * 0.16),
                XM('fabric'),
              );
          }
        } else if (kind === 'blinds') {
          const top = 2.12,
            down = 0.25 + hash2(seed, 1, 1) * 0.9; // some half up, some down to the sill
          g.bx(0, top, 0.07, 0.98, 0.05, 0.05, C(0xc8c4b8));
          for (let y = top - 0.06; y > top - down; y -= 0.055)
            g.xf(M4.mul(M4.trans(0, y, 0.07), M4.rotX(0.6)), () => g.bx(0, 0, 0, 0.95, 0.004, 0.045, C(0xcfcbbf)));
          for (const s of [-0.3, 0.3]) g.bx(s, top - down, 0.07, 0.006, down, 0.006, C(0xd8d4c8));
        } else if (kind === 'shop') {
          for (let k = 0; k < 2; k++)
            if (hash2(seed, k, 3) < 0.7)
              DK.poster(
                g,
                0.32,
                0.42,
                1.25 + (k ? -0.15 : 0.1),
                [C(0xd8c040), C(0xc83a2a), C(0x3a8a4a)][(seed + k) % 3],
                seed + k,
              );
        }
      },
      { win: true, any: true },
    );
  }
}
function buildDecor() {
  const g = new Geo();
  g.ao = 0.75;
  g.aoH = 1.6;
  const lit = {};
  const L = (grp) => lit[grp] || (lit[grp] = new Geo());
  const M = (rx, rz, side, along, fn, o) => mount(g, rx, rz, side, along, fn, o);
  // ── Meridian Records
  M(2, 3, 'W', 0, (g) => DK.frame(g, 0.42, 0.52, 1.35, 'certificate', COL.brass, 1));
  M(2, 2, 'W', 0.1, (g) => DK.frame(g, 0.3, 0.38, 1.5, 'certificate', COL.brass, 2));
  M(3, 4, 'S', 0.5, (g) => DK.frame(g, 1.1, 0.7, 1.2, 'portrait', C(0x2a1a12), 3), { y0: 1.2 }); // the founder, over the door
  M(7, 3, 'E', 0, (g) => DK.clock(g, 1.75, 0.16));
  M(2, 4, 'S', 0, (g) => DK.switchPlate(g));
  M(9, 3, 'W', 0, (g) => DK.handDryer(g));
  M(11, 2, 'E', 0, (g) => DK.rollHolder(g));
  M(9, 4, 'S', 0.1, (g) => DK.mirror(g, 0.5, 0.6, 1.2));
  M(13, 4, 'W', 0, (g) => DK.fusebox(g));
  M(15, 4, 'S', 0, (g) => DK.calendar(g, 1.35, 9));
  M(18, 2, 'N', 0, (g) => {
    DK.cabinet(g, 0.96, 1.55, 0.6, C(0x8a8676));
    g.bx(0, 1.0, 0.012, 0.96, 0.5, 0.012, C(0xb8b8a8), XM('tiles'));
  });
  M(20, 2, 'N', 0, (g) => {
    DK.cabinet(g, 0.96, 1.55, 0.6, C(0x8a8676));
    g.bx(0, 1.0, 0.012, 0.96, 0.5, 0.012, C(0xb8b8a8), XM('tiles'));
  });
  M(17, 3, 'W', 0, (g) => DK.board(g, 0.9, 0.6, 1.2, 'notes', 11));
  M(24, 3, 'E', 0, (g) => DK.clock(g, 1.85, 0.15));
  M(17, 4, 'S', 0.3, (g) => DK.poster(g, 0.36, 0.5, 1.25, C(0xc8b880), 12));
  // the open office
  M(11, 6, 'N', 0.5, (g) => DK.whiteboard(g, 1.6, 0.9, 1.05, 21));
  M(7, 6, 'N', 0.4, (g) => DK.board(g, 1.1, 0.7, 1.15, 'notes', 22));
  M(16, 6, 'N', 0, (g) => DK.clock(g, 1.95, 0.17));
  M(18, 6, 'N', 0, (g) => DK.extinguisher(g));
  M(23, 6, 'N', 0, (g) => DK.frame(g, 0.55, 0.72, 1.2, 'abstract', COL.black, 23));
  M(3, 6, 'N', 0.2, (g) => DK.frame(g, 0.7, 0.5, 1.35, 'photo', COL.black, 24));
  M(24, 7, 'E', 0, (g) => DK.calendar(g, 1.25, 25));
  M(24, 11, 'E', 0, (g) => DK.frame(g, 0.48, 0.6, 1.3, 'portrait', COL.brass, 26));
  M(2, 7, 'W', 0, (g) => DK.frame(g, 0.9, 0.6, 1.25, 'sea', COL.black, 27));
  M(2, 11, 'W', 0, (g) => DK.hooks(g, 1.65, [C(0x3a3e46), null, C(0x5a4a3a)]));
  M(12, 11, 'S', 0, (g) => DK.switchPlate(g));
  M(13, 11, 'S', 0.5, (g) => DK.exitSign(g, 2.36, L('officeNight')), { y0: 2.3 });
  for (const [x, z, side] of [
    [4, 6, 'N'],
    [9, 6, 'N'],
    [22, 6, 'N'],
    [24, 6, 'E'],
    [2, 6, 'W'],
    [7, 11, 'S'],
    [19, 11, 'S'],
  ])
    M(x, z, side, 0.3, (g) => DK.outlet(g));
  // ── Pell's Market
  M(32, 4, 'N', 0, (g) => DK.poster(g, 0.7, 0.4, 1.95, C(0xc83a2a), 31));
  M(37, 4, 'N', 0, (g) => DK.poster(g, 0.7, 0.4, 1.95, C(0x3a7a4a), 32));
  M(41, 4, 'N', 0, (g) => DK.clock(g, 2.15, 0.18));
  M(31, 9, 'W', 0, (g) => DK.calendar(g, 1.4, 33));
  M(34, 11, 'S', 0, (g) => DK.poster(g, 0.5, 0.65, 1.2, C(0xd8c040), 34));
  M(42, 10, 'E', 0, (g) => DK.fusebox(g));
  M(40, 8, 'N', 0.2, (g) => DK.calendar(g, 1.3, 35));
  M(39, 4, 'N', -0.3, (g) => {
    g.bx(0, 2.15, 0.12, 0.28, 0.28, 0.06, COL.metalD);
    g.sphere(0, 2.15, 0.17, 0.12, 0.12, 0.05, 10, 6, C(0x9aa8b0), GLASS);
  }); // a round mirror in the corner, so the till can see the aisles
  // ── Larkspur Court: your flat
  M(6, 20, 'N', 0, (g) => {
    DK.cabinet(g, 0.96, 1.6, 0.58, C(0x6a5642));
    g.bx(0, 1.0, 0.012, 0.96, 0.55, 0.012, C(0xa8a690), XM('tiles'));
  });
  M(7, 20, 'N', 0, (g) => DK.cabinet(g, 0.96, 1.6, 0.58, C(0x6a5642)));
  M(10, 20, 'E', 0, (g) => DK.clock(g, 1.9, 0.14));
  M(10, 24, 'E', 0, (g) => DK.frame(g, 0.62, 0.48, 1.35, 'landscape', COL.woodD, 41));
  M(3, 21, 'W', 0, (g) => DK.calendar(g, 1.3, 42));
  M(7, 25, 'S', 0.5, (g) => DK.poster(g, 0.6, 0.85, 1.15, C(0x3a2a2a), 43));
  M(4, 25, 'S', 0, (g) => DK.hooks(g, 1.62, [C(0x4a4038), C(0x2a3a4a), null]));
  M(10, 21, 'E', 0.3, (g) => DK.switchPlate(g));
  M(6, 25, 'S', -0.35, (g) => DK.switchPlate(g));
  M(10, 25, 'S', -0.35, (g) => DK.switchPlate(g));
  M(10, 23, 'E', 0, (g) => DK.outlet(g));
  M(7, 20, 'N', 0.35, (g) => DK.outlet(g));
  // your bathroom and bedroom
  M(6, 30, 'E', 0, (g) => DK.towel(g, 1.25, C(0x6a8a8a)));
  M(3, 29, 'W', 0, (g) => DK.rollHolder(g));
  M(5, 27, 'N', 0, (g) => DK.shelf(g, 0.6, 1.55, 'jars', 51));
  M(8, 27, 'N', 0, (g) => DK.board(g, 0.9, 0.62, 1.12, 'string', 52)); // over the computer: yours
  M(8, 30, 'W', 0, (g) => DK.poster(g, 0.45, 0.62, 1.2, C(0x1a2a3a), 53));
  M(8, 29, 'W', 0, (g) => DK.frame(g, 0.3, 0.38, 1.4, 'photo', COL.wood, 54));
  M(10, 29, 'E', 0, (g) => DK.switchPlate(g));
  // ── the stairwell
  M(12, 24, 'W', 0, (g) => DK.board(g, 0.75, 0.6, 1.15, 'notes', 61));
  M(12, 21, 'W', 0, (g) => {
    DK.missing(g, 1.2, 62);
    g.mat = M4.mul(g.mat, M4.trans(0.28, 0, 0));
    DK.missing(g, 1.25, 63);
  });
  M(13, 22, 'E', 0, (g) => DK.sconce(g, 1.95, L('always')));
  M(12, 28, 'W', 0, (g) => DK.sconce(g, 1.95, L('always')));
  M(13, 25, 'E', 0, (g) => DK.extinguisher(g));
  // ── Agnes: every wall a face looking at you
  M(15, 24, 'W', 0, (g) => {
    DK.frame(g, 0.26, 0.32, 1.25, 'photo', COL.brass, 71);
    g.mat = M4.mul(g.mat, M4.trans(0.32, 0.15, 0));
    DK.frame(g, 0.22, 0.28, 1.25, 'portrait', COL.wood, 72);
  });
  M(15, 25, 'W', 0, (g) => {
    DK.frame(g, 0.3, 0.24, 1.45, 'photo', COL.wood, 73);
    g.mat = M4.mul(g.mat, M4.trans(-0.2, -0.3, 0));
    DK.frame(g, 0.22, 0.28, 1.4, 'portrait', COL.brass, 74);
  });
  M(15, 20, 'W', 0, (g) => DK.frame(g, 0.5, 0.4, 1.35, 'flowers', COL.brass, 75));
  M(18, 20, 'N', 0, (g) => DK.clock(g, 1.95, 0.13));
  M(19, 20, 'N', 0, (g) => DK.plates(g, 1.6));
  M(16, 25, 'S', 0, (g) => DK.sampler(g, 1.35));
  M(19, 25, 'S', 0, (g) => DK.frame(g, 0.7, 0.5, 1.3, 'landscape', COL.brass, 76));
  M(20, 25, 'S', 0.2, (g) => DK.frame(g, 0.3, 0.38, 1.45, 'portrait', COL.wood, 77));
  M(22, 21, 'E', 0, (g) => DK.calendar(g, 1.3, 78));
  M(17, 27, 'N', 0, (g) => DK.frame(g, 0.36, 0.46, 1.4, 'portrait', COL.brass, 79));
  M(18, 30, 'E', 0, (g) => DK.mirror(g, 0.4, 0.8, 1.0));
  M(22, 30, 'E', 0, (g) => DK.towel(g, 1.25, C(0xa87a8a)));
  // ── the eight homes on Pell's Row and Mill Row: a picture and a mirror each
  const ARTS = ['landscape', 'portrait', 'photo', 'sea', 'flowers', 'abstract', 'portrait', 'landscape'];
  HOUSE_DEFS.forEach((h, i) => {
    const a = h.x0,
      N = h.row === 'N',
      mz = N ? 7 : 23,
      fz = N ? 10 : 21;
    M(a + 1, mz, 'W', 0, (g) =>
      DK.frame(g, 0.5, 0.4 + 0.2 * (i % 2), 1.3, ARTS[i], i % 2 ? COL.brass : COL.woodD, 80 + i),
    );
    M(a + 3, fz, 'E', 0, (g) => DK.mirror(g, 0.38, 0.7, 1.05));
    M(a + 3, N ? 6 : 24, 'E', 0.2, (g) => DK.clock(g, 1.8, 0.12));
    M(a + 1, N ? 10 : 21, 'W', 0, (g) =>
      DK.hooks(g, 1.6, [mix3(C(0x3a3a3a), C(0x5a3a2a), hash2(i, 1, 1)), null, null]),
    );
  });
  // ── windows
  for (const [x, z] of WINDOWS) {
    const seed = x * 31 + z * 7;
    windowDress(
      g,
      x,
      z,
      (r) => {
        if (!r) return [null];
        if (r.bld === 'office') return ['blinds'];
        if (r.bld === 'shop') return [r.key === 'shop' && z === 12 ? 'shop' : null];
        if (r.private && !r.house) return ['blinds']; // bathrooms
        return [
          'curtain',
          r.agnes
            ? C(0x6a3a3a)
            : r.home
              ? C(0x4a5a4a)
              : [C(0x5a4a6a), C(0x6a5a3a), C(0x3a4a5a), C(0x6a3a3a)][Math.floor(hash2(x, z, 4) * 4)],
        ];
      },
      seed,
    );
  }
  // ── outside: pipes, signs, an awning, lamps over the doors, faces on the walls
  const stripes = [C(0x7a2420), C(0xc8bca0)];
  for (const x of [31, 32, 33, 37, 38])
    M(
      x,
      13,
      'N',
      0,
      (g) => {
        // Pell's awnings over the windows, a tile at a time so each goes down with its own wall
        for (let k = 0; k < 2; k++) {
          const sx = -0.25 + k * 0.5;
          g.xf(M4.mul(M4.trans(sx, 2.5, 0.0), M4.rotX(0.5)), () =>
            g.bx(0, 0, 0.42, 0.5, 0.02, 0.84, stripes[k % 2], XM('fabric')),
          );
          g.bx(sx, 2.0, 0.74, 0.5, 0.13, 0.012, stripes[k % 2], XM('fabric'));
        }
        if (x === 31 || x === 33 || x === 37 || x === 38)
          g.xf(M4.mul(M4.trans(x === 31 || x === 37 ? -0.47 : 0.47, 2.5, 0.0), M4.rotX(0.5)), () =>
            g.bx(0, -0.02, 0.4, 0.025, 0.025, 0.8, COL.metalD),
          );
      },
      { any: true },
    );
  M(
    35,
    13,
    'N',
    0.5,
    (g) => {
      // the sign over the door, and its neon
      g.bx(0, 2.62, 0.04, 1.6, 0.36, 0.06, C(0x1e2224));
      const sl = L('shopSign'),
        c = sl.cell;
      sl.cell = g.cell;
      // OPEN, in pink tube: each letter a few strokes in a 0.2 × 0.24 cell
      const NEON = {
        O: [
          [0, 0, 0, 1],
          [1, 0, 1, 1],
          [0, 1, 1, 1],
          [0, 0, 1, 0],
        ],
        P: [
          [0, 0, 0, 1],
          [0, 1, 1, 1],
          [1, 1, 1, 0.5],
          [0, 0.5, 1, 0.5],
        ],
        E: [
          [0, 0, 0, 1],
          [0, 1, 1, 1],
          [0, 0.5, 0.8, 0.5],
          [0, 0, 1, 0],
        ],
        N: [
          [0, 0, 0, 1],
          [1, 0, 1, 1],
          [0, 1, 1, 0],
        ],
      };
      sl.xf(g.mat, () =>
        [...'OPEN'].forEach((ch, i) => {
          const ox = -0.48 + i * 0.32,
            oy = 2.52;
          for (const [x0, y0, x1, y1] of NEON[ch]) {
            const ax = ox + x0 * 0.2,
              ay = oy + y0 * 0.24,
              bx = ox + x1 * 0.2,
              by = oy + y1 * 0.24,
              L = Math.hypot(bx - ax, by - ay);
            sl.xf(M4.mul(M4.trans((ax + bx) / 2, (ay + by) / 2, 0.085), M4.rotZ(Math.atan2(by - ay, bx - ax))), () =>
              sl.bx(0, -0.012, 0, L + 0.024, 0.024, 0.02, C(0xff4d86), EMIT(1)),
            );
          }
        }),
      );
      sl.cell = c;
    },
    { any: true },
  );
  M(
    13,
    13,
    'N',
    0.5,
    (g) => {
      // brass letters on a dark band: MERIDIAN RECORDS
      g.bx(0, 2.3, 0.02, 2.6, 0.3, 0.04, C(0x23262a));
      for (let k = 0; k < 15; k++) if (k !== 8) g.bx(-1.15 + k * 0.165, 2.37, 0.05, 0.1, 0.15, 0.015, COL.brass);
    },
    { any: true },
  );
  for (const { d, out } of EXT_DOORS) {
    // a lamp over every street door, and a number by the houses
    if (d.pairL) continue;
    const side = out[1] < d.z ? 'S' : out[1] > d.z ? 'N' : out[0] < d.x ? 'E' : 'W';
    const along = d.pairR ? 0.5 : 0;
    mount(
      g,
      out[0],
      out[1],
      side,
      along,
      (g) => {
        g.bx(0, 2.35, 0.05, 0.12, 0.16, 0.1, COL.metalD);
        const sl = L('street'),
          c = sl.cell;
        sl.cell = g.cell;
        sl.xf(g.mat, () => sl.frustum(0, 2.25, 0.12, 0.16, 0.16, 0.1, 0.1, 0.12, C(0xffd8a0), EMIT(0.9)));
        sl.cell = c;
        const hid = HOUSE_DOOR[d.x + ',' + d.z];
        if (hid) g.bx(-0.3, 2.36, 0.015, 0.12, 0.14, 0.02, COL.brass); // a house number over the door
      },
      { y0: 2.3 },
    );
  }
  const pipes = [
    [1, 13, 'N', -0.4],
    [25, 13, 'N', 0.4],
    [30, 13, 'N', -0.4],
    [43, 13, 'N', 0.4],
    [2, 18, 'S', -0.4],
    [23, 18, 'S', 0.4],
    [44, 8, 'E', 0],
    [26, 6, 'W', 0],
    [26, 2, 'W', 0],
    [29, 8, 'E', 0],
    [24, 20, 'W', 0],
    [1, 25, 'E', 0],
  ];
  for (const [x, z, side, al] of pipes)
    M(
      x,
      z,
      side,
      al,
      (g) => {
        g.cyl(0, 0, 0.08, 0.045, 0.045, 2.62, 8, C(0x3a3e3a));
        g.bx(0, 2.6, 0.1, 0.16, 0.12, 0.16, C(0x3a3e3a));
        g.bx(0, 0.02, 0.14, 0.1, 0.06, 0.2, C(0x3a3e3a));
        for (let y = 0.6; y < 2.6; y += 0.7) g.bx(0, y, 0.04, 0.12, 0.03, 0.06, COL.metalD);
      },
      { any: true },
    );
  for (const [x, z, side] of [
    [26, 7, 'W'],
    [26, 4, 'W'],
    [29, 7, 'E'],
  ])
    M(x, z, side, 0, (g) => {
      g.bx(0, 1.75, 0.2, 0.7, 0.45, 0.4, C(0x8a8c88), XM('metal'));
      for (let k = 0; k < 6; k++) g.bx(-0.25 + k * 0.1, 1.75, 0.405, 0.06, 0.4, 0.01, C(0x3a3c3a));
    }); // air conditioners dripping into the alley
  for (const [x, z, side, al, s] of [
    [26, 3, 'W', 0.2, 91],
    [29, 3, 'E', 0, 92],
    [30, 13, 'N', 0.1, 93],
    [22, 18, 'S', 0, 94],
    [10, 18, 'S', 0.3, 95],
    [42, 18, 'S', 0.2, 96],
    [34, 13, 'N', 0.1, 97],
    [26, 11, 'W', 0.1, 98],
  ])
    M(x, z, side, al, (g) => DK.missing(g, 1.25 + hash2(s, 3, 3) * 0.3, s));
  // ── assemble
  const out = [makeMesh(g, { cut: 1 })];
  for (const [grp, lg] of Object.entries(lit)) {
    const m = makeMesh(lg, { cut: 1 });
    m.litGrp = grp;
    out.push(m);
  }
  return out;
}
