//@ core/util — Math helpers, colours, random, mat4 (column-major)
//@ Defines: TAU, shuffle, hash2, hex, angDiff, fmtTime, fmtDur, M4
//@ Uses:    gfx/renderer
//@ (header made by tools/map.js; stripped by build.py)
// ───────────────────────── utilities ─────────────────────────
const TAU = Math.PI * 2;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const sstep = (a, b, x) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};
const rand = (a, b) => a + Math.random() * (b - a);
const irand = (a, b) => Math.floor(rand(a, b + 1));
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const chance = (p) => Math.random() < p;
function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function hash2(x, z, s) {
  let h = (x * 374761393 + z * 668265263 + (s || 0) * 982451653) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
function hex(c) {
  return [((c >> 16) & 255) / 255, ((c >> 8) & 255) / 255, (c & 255) / 255];
}
const mix3 = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
const mul3 = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
const add3 = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
function angDiff(a, b) {
  let d = (b - a) % TAU;
  if (d > Math.PI) d -= TAU;
  if (d < -Math.PI) d += TAU;
  return d;
}
function fmtTime(m) {
  m = ((Math.floor(m) % 1440) + 1440) % 1440;
  const h = Math.floor(m / 60),
    mm = m % 60;
  return String(h).padStart(2, '0') + ':' + String(mm).padStart(2, '0');
}
function fmtDur(m) {
  m = Math.round(m);
  if (m < 60) return m + 'm';
  const h = Math.floor(m / 60),
    r = m % 60;
  return r ? h + 'h ' + r + 'm' : h + 'h';
}

// ───────────────────────── mat4 (column-major) ─────────────────────────
const M4 = {
  ident() {
    const m = new Float32Array(16);
    m[0] = m[5] = m[10] = m[15] = 1;
    return m;
  },
  mul(a, b) {
    const o = new Float32Array(16);
    for (let c = 0; c < 4; c++) {
      const b0 = b[c * 4],
        b1 = b[c * 4 + 1],
        b2 = b[c * 4 + 2],
        b3 = b[c * 4 + 3];
      o[c * 4] = a[0] * b0 + a[4] * b1 + a[8] * b2 + a[12] * b3;
      o[c * 4 + 1] = a[1] * b0 + a[5] * b1 + a[9] * b2 + a[13] * b3;
      o[c * 4 + 2] = a[2] * b0 + a[6] * b1 + a[10] * b2 + a[14] * b3;
      o[c * 4 + 3] = a[3] * b0 + a[7] * b1 + a[11] * b2 + a[15] * b3;
    }
    return o;
  },
  trans(x, y, z) {
    const m = M4.ident();
    m[12] = x;
    m[13] = y;
    m[14] = z;
    return m;
  },
  scale(x, y, z) {
    const m = M4.ident();
    m[0] = x;
    m[5] = y;
    m[10] = z;
    return m;
  },
  rotY(a) {
    const m = M4.ident(),
      c = Math.cos(a),
      s = Math.sin(a);
    m[0] = c;
    m[2] = -s;
    m[8] = s;
    m[10] = c;
    return m;
  },
  rotX(a) {
    const m = M4.ident(),
      c = Math.cos(a),
      s = Math.sin(a);
    m[5] = c;
    m[6] = s;
    m[9] = -s;
    m[10] = c;
    return m;
  },
  rotZ(a) {
    const m = M4.ident(),
      c = Math.cos(a),
      s = Math.sin(a);
    m[0] = c;
    m[1] = s;
    m[4] = -s;
    m[5] = c;
    return m;
  },
  ortho(l, r, b, t, n, f) {
    const m = new Float32Array(16);
    m[0] = 2 / (r - l);
    m[5] = 2 / (t - b);
    m[10] = -2 / (f - n);
    m[12] = -(r + l) / (r - l);
    m[13] = -(t + b) / (t - b);
    m[14] = -(f + n) / (f - n);
    m[15] = 1;
    return m;
  },
  lookAt(e, t, up) {
    let zx = e[0] - t[0],
      zy = e[1] - t[1],
      zz = e[2] - t[2];
    let l = Math.hypot(zx, zy, zz);
    zx /= l;
    zy /= l;
    zz /= l;
    let xx = up[1] * zz - up[2] * zy,
      xy = up[2] * zx - up[0] * zz,
      xz = up[0] * zy - up[1] * zx;
    l = Math.hypot(xx, xy, xz);
    xx /= l;
    xy /= l;
    xz /= l;
    const yx = zy * xz - zz * xy,
      yy = zz * xx - zx * xz,
      yz = zx * xy - zy * xx;
    const m = new Float32Array(16);
    m[0] = xx;
    m[1] = yx;
    m[2] = zx;
    m[4] = xy;
    m[5] = yy;
    m[6] = zy;
    m[8] = xz;
    m[9] = yz;
    m[10] = zz;
    m[12] = -(xx * e[0] + xy * e[1] + xz * e[2]);
    m[13] = -(yx * e[0] + yy * e[1] + yz * e[2]);
    m[14] = -(zx * e[0] + zy * e[1] + zz * e[2]);
    m[15] = 1;
    return m;
  },
  // parent * T(tx,ty,tz) * Ry * Rx * Rz — the joint helper used by characters
  joint(p, tx, ty, tz, rx, ry, rz) {
    let m = M4.mul(p, M4.trans(tx, ty, tz));
    if (ry) m = M4.mul(m, M4.rotY(ry));
    if (rx) m = M4.mul(m, M4.rotX(rx));
    if (rz) m = M4.mul(m, M4.rotZ(rz));
    return m;
  },
  // ── allocation-free versions for per-frame drawing. Same arithmetic, same float32 rounding at every step as
  // mul/trans/rot*/joint above, so the results are bit-for-bit the same; they just write into arrays you pass.
  // `o` must not be the same array as `a`.
  mulInto(o, a, b) {
    for (let c = 0; c < 4; c++) {
      const b0 = b[c * 4],
        b1 = b[c * 4 + 1],
        b2 = b[c * 4 + 2],
        b3 = b[c * 4 + 3];
      o[c * 4] = a[0] * b0 + a[4] * b1 + a[8] * b2 + a[12] * b3;
      o[c * 4 + 1] = a[1] * b0 + a[5] * b1 + a[9] * b2 + a[13] * b3;
      o[c * 4 + 2] = a[2] * b0 + a[6] * b1 + a[10] * b2 + a[14] * b3;
      o[c * 4 + 3] = a[3] * b0 + a[7] * b1 + a[11] * b2 + a[15] * b3;
    }
    return o;
  },
  // M * T(cx,cy,cz) * S(sx,sy,sz) into o: what part() draws with
  partInto(o, M, cx, cy, cz, sx, sy, sz) {
    const T = M4._t; // T*S, exactly as M4.mul(M4.trans(…), M4.scale(…)) would build it
    T.fill(0);
    T[0] = sx;
    T[5] = sy;
    T[10] = sz;
    T[12] = cx;
    T[13] = cy;
    T[14] = cz;
    T[15] = 1;
    return M4.mulInto(o, M, T);
  },
  // joint() into o
  jointInto(o, p, tx, ty, tz, rx, ry, rz) {
    const S = M4._s,
      R = M4._r;
    R.fill(0);
    R[0] = R[5] = R[10] = R[15] = 1;
    R[12] = tx;
    R[13] = ty;
    R[14] = tz;
    let cur = M4.mulInto(S[0], p, R),
      k = 1;
    for (let axis = 0; axis < 3; axis++) {
      // the same order as joint(): Ry, then Rx, then Rz
      const a = axis === 0 ? ry : axis === 1 ? rx : rz;
      if (!a) continue;
      const c = Math.cos(a),
        s = Math.sin(a);
      R.fill(0);
      R[0] = R[5] = R[10] = R[15] = 1;
      if (axis === 0) {
        R[0] = c;
        R[2] = -s;
        R[8] = s;
        R[10] = c;
      } else if (axis === 1) {
        R[5] = c;
        R[6] = s;
        R[9] = -s;
        R[10] = c;
      } else {
        R[0] = c;
        R[1] = s;
        R[4] = -s;
        R[5] = c;
      }
      cur = M4.mulInto(S[k], cur, R);
      k ^= 1;
    }
    o.set(cur);
    return o;
  },
  _t: new Float32Array(16),
  _r: new Float32Array(16),
  _s: [new Float32Array(16), new Float32Array(16)],
  xform(m, x, y, z) {
    return [
      m[0] * x + m[4] * y + m[8] * z + m[12],
      m[1] * x + m[5] * y + m[9] * z + m[13],
      m[2] * x + m[6] * y + m[10] * z + m[14],
      m[3] * x + m[7] * y + m[11] * z + m[15],
    ];
  },
};
