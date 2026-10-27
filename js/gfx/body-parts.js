//@ gfx/body-parts — Sculpted parts for people and what they wear
//@ Defines: prof, surf, tube, digit, sphP, superP, headP, headC, HAIRLINE, TORSO_K, torsoP, clothC, TORSO_FRONT, torsoFrontZ, alienP, alienC, …
//@ Uses:    core/util, gfx/post, world/grid, gfx/gl
//@ (header made by tools/map.js; stripped by build.py)
// ───────────── sculpted parts for people and the things that wear them
// Each is one draw. Detail (sockets, folds, strands, scales) is baked into vertex colour, which the tint multiplies.
const crs3 = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const sub3 = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const nz3 = (a) => {
  const l = Math.hypot(a[0], a[1], a[2]) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
};
const se = (s, e) => Math.sign(s) * Math.pow(Math.abs(s), e);
const gss = (d, s) => Math.exp(-(d * d) / (2 * s * s));
const hsh = (n) => {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};
const fAng = (u) => {
  const a = u * TAU;
  return Math.min(a, TAU - a);
}; // 0 straight ahead, π straight behind
// a smooth profile through evenly spaced keys
function prof(K, t) {
  const n = K.length - 1,
    f = clamp(t, 0, 1) * n,
    i = Math.min(n - 1, Math.floor(f)),
    s = f - i;
  const k0 = K[Math.max(0, i - 1)],
    k1 = K[i],
    k2 = K[i + 1],
    k3 = K[Math.min(n, i + 2)];
  return k1.map((_, m) => {
    const p0 = k0[m],
      p1 = k1[m],
      p2 = k2[m],
      p3 = k3[m];
    return (
      0.5 * (2 * p1 + (p2 - p0) * s + (2 * p0 - 5 * p1 + 4 * p2 - p3) * s * s + (3 * p1 - p0 - 3 * p2 + p3) * s * s * s)
    );
  });
}
// a grid surface: u runs round (0→1), v runs top→bottom (0→1). keep(u,v,p) drops cells; push lifts the surface off along its normal.
function surf(g, nu, nv, pos, col, o = {}) {
  const C1 = nu + 1,
    P = [];
  for (let j = 0; j <= nv; j++) for (let i = 0; i <= nu; i++) P.push(pos(i / nu, j / nv));
  const acc = new Map(),
    key = (p) => Math.round(p[0] * 4096) + ',' + Math.round(p[1] * 4096) + ',' + Math.round(p[2] * 4096);
  for (let j = 0; j < nv; j++)
    for (let i = 0; i < nu; i++) {
      const a = P[j * C1 + i],
        b = P[j * C1 + i + 1],
        c = P[(j + 1) * C1 + i + 1],
        d = P[(j + 1) * C1 + i];
      const fn = crs3(sub3(d, b), sub3(c, a));
      for (const p of [a, b, c, d]) {
        const k = key(p),
          s = acc.get(k);
        if (s) {
          s[0] += fn[0];
          s[1] += fn[1];
          s[2] += fn[2];
        } else acc.set(k, fn.slice());
      }
    }
  const NN = P.map((p) => nz3(acc.get(key(p)) || [0, 1, 0]));
  const push = o.push || 0,
    keep = o.keep;
  const emit = (p, n, u, v) => {
    const pu = typeof push === 'function' ? push(u, v, p) : push;
    let c = col ? col(u, v, p, n) : 1;
    if (typeof c === 'number') c = [c, c, c];
    g.p.push(p[0] + n[0] * pu, p[1] + n[1] * pu, p[2] + n[2] * pu);
    g.n.push(n[0], n[1], n[2]);
    g.c.push(c[0], c[1], c[2]);
    g.e.push(0, 0, -1, -1);
  };
  // a cut (a neckline, a hairline) is traced through each cell it crosses instead of dropping whole cells:
  // corners are tested, and where an edge changes sides the crossing is found by halving, so the edge runs smooth
  const K = keep ? P.map((p, id) => !!keep((id % C1) / nu, Math.floor(id / C1) / nv, p)) : null;
  const cross = (ia, ib) => {
    const ua = (ia % C1) / nu,
      va = Math.floor(ia / C1) / nv,
      ub = (ib % C1) / nu,
      vb = Math.floor(ib / C1) / nv;
    let lo = 0,
      hi = 1;
    for (let it = 0; it < 7; it++) {
      const m = (lo + hi) / 2,
        u = lerp(ua, ub, m),
        v = lerp(va, vb, m);
      if (!!keep(u, v, pos(u, v)) === K[ia]) lo = m;
      else hi = m;
    }
    const t = (lo + hi) / 2,
      u = lerp(ua, ub, t),
      v = lerp(va, vb, t),
      na = NN[ia],
      nb = NN[ib];
    return [pos(u, v), nz3([lerp(na[0], nb[0], t), lerp(na[1], nb[1], t), lerp(na[2], nb[2], t)]), u, v];
  };
  for (let j = 0; j < nv; j++)
    for (let i = 0; i < nu; i++) {
      const ids = [j * C1 + i, j * C1 + i + 1, (j + 1) * C1 + i + 1, (j + 1) * C1 + i];
      if (keep) {
        const nk = ids.reduce((a, id) => a + (K[id] ? 1 : 0), 0);
        if (nk === 0) continue;
        if (nk < 4) {
          const poly = [];
          for (let e = 0; e < 4; e++) {
            const a = ids[e],
              b = ids[(e + 1) % 4];
            if (K[a]) poly.push([P[a], NN[a], (a % C1) / nu, Math.floor(a / C1) / nv]);
            if (K[a] !== K[b]) poly.push(cross(a, b));
          }
          const k0 = g.vc;
          for (const [pp, nn, u, v] of poly) emit(pp, nn, u, v);
          for (let t = 1; t + 1 < poly.length; t++) g.i.push(k0, k0 + t, k0 + t + 1);
          continue;
        }
      }
      const k0 = g.vc;
      for (const id of ids) emit(P[id], NN[id], (id % C1) / nu, Math.floor(id / C1) / nv);
      g.i.push(k0, k0 + 1, k0 + 2, k0, k0 + 2, k0 + 3);
    }
  return g;
}
// a tube along a polyline, radius r(t) (0 at the end makes a point)
function tube(g, pts, rad, seg = 6, col = 1) {
  const n = pts.length;
  let up = [0, 1, 0];
  const rings = [];
  const cc = typeof col === 'number' ? [col, col, col] : col;
  for (let i = 0; i < n; i++) {
    const a = pts[Math.max(0, i - 1)],
      b = pts[Math.min(n - 1, i + 1)],
      t = nz3(sub3(b, a));
    let ax = crs3(t, up);
    if (Math.hypot(ax[0], ax[1], ax[2]) < 1e-4) ax = crs3(t, [1, 0, 0]);
    ax = nz3(ax);
    const ay = nz3(crs3(ax, t));
    up = ay;
    const r = typeof rad === 'function' ? rad(i / (n - 1)) : rad,
      ring = [];
    for (let k = 0; k <= seg; k++) {
      const an = (k / seg) * TAU,
        ca = Math.cos(an),
        sa = Math.sin(an);
      const dn = [ax[0] * ca + ay[0] * sa, ax[1] * ca + ay[1] * sa, ax[2] * ca + ay[2] * sa];
      ring.push([[pts[i][0] + dn[0] * r, pts[i][1] + dn[1] * r, pts[i][2] + dn[2] * r], dn]);
    }
    rings.push(ring);
  }
  for (let i = 0; i < n - 1; i++)
    for (let k = 0; k < seg; k++) {
      const q = [rings[i][k], rings[i][k + 1], rings[i + 1][k + 1], rings[i + 1][k]],
        k0 = g.vc;
      for (const [p, nn] of q) {
        g.p.push(p[0], p[1], p[2]);
        g.n.push(nn[0], nn[1], nn[2]);
        g.c.push(cc[0], cc[1], cc[2]);
        g.e.push(0, 0, -1, -1);
      }
      g.i.push(k0, k0 + 1, k0 + 2, k0, k0 + 2, k0 + 3);
    }
  return g;
}
// a jointed digit: starts at p, heads along dir, bends towards bend at each knuckle
function digit(g, p, dir, bend, segs, rad0, rad1, col) {
  const pts = [p.slice()];
  let d = nz3(dir),
    q = p.slice();
  for (const [len, ang] of segs) {
    const steps = 3;
    for (let k = 0; k < steps; k++) {
      const a = ang / steps;
      d = nz3([
        d[0] * Math.cos(a) + bend[0] * Math.sin(a),
        d[1] * Math.cos(a) + bend[1] * Math.sin(a),
        d[2] * Math.cos(a) + bend[2] * Math.sin(a),
      ]);
      q = [q[0] + (d[0] * len) / steps, q[1] + (d[1] * len) / steps, q[2] + (d[2] * len) / steps];
      pts.push(q.slice());
    }
  }
  return tube(g, pts, (t) => (t >= 0.999 ? rad1 * 0.35 : lerp(rad0, rad1, t)), 6, col);
}
function sphP(u, v) {
  const ph = u * TAU,
    th = v * Math.PI;
  return [Math.sin(th) * Math.sin(ph) * 0.5, Math.cos(th) * 0.5, Math.sin(th) * Math.cos(ph) * 0.5];
}
function superP(e1, e2) {
  return (u, v) => {
    const ph = u * TAU,
      th = v * Math.PI,
      st = Math.sin(th);
    return [
      0.5 * se(st, e1) * se(Math.sin(ph), e2),
      0.5 * se(Math.cos(th), e1),
      0.5 * se(st, e1) * se(Math.cos(ph), e2),
    ];
  };
}

// ── a human head: long skull, deep sockets, cheekbones over hollow cheeks, a narrow nose, a thin mouth
function headP(u, v) {
  let [x, y, z] = superP(0.78, 0.94)(u, v);
  const low = sstep(0.1, -0.5, y),
    hi = sstep(-0.05, 0.4, y);
  if (z < 0) z *= 1 + 0.14 * hi; // the back of the skull swells out over the nape
  y += 0.03 * hi;
  x *= 1 - 0.34 * Math.pow(low, 1.25); // the jaw narrows to a long chin
  z = z > 0 ? z * (1 - 0.12 * low) : z * (1 - 0.5 * low);
  y -= 0.05 * low * low;
  x *= 1 - 0.07 * sstep(0.0, 0.2, y) * (1 - sstep(0.28, 0.48, y)); // pinched temples
  if (z > 0) z += 0.055 * gss(y + 0.32, 0.13) * (z / 0.5) * gss(x, 0.3); // the mouth and chin carried forward under the nose
  const fr = sstep(0.0, 0.42, z),
    ax = Math.abs(x),
    sg = Math.sign(x) || 1;
  const Gs = (cx, cy, rx, ry) => gss(ax - cx, rx) * gss(y - cy, ry);
  z += 0.036 * fr * Gs(0.13, 0.095, 0.12, 0.026); // brow ridge
  z -= 0.075 * fr * Gs(0.155, 0.02, 0.058, 0.05); // the sockets, deep
  x += sg * 0.012 * fr * Gs(0.23, -0.06, 0.04, 0.035); // cheekbones
  x -= sg * 0.03 * Gs(0.2, -0.19, 0.06, 0.07) * sstep(-0.1, 0.3, z); // and the hollows under them
  z -= 0.02 * fr * Gs(0.18, -0.19, 0.07, 0.07);
  const nb = gss(x, 0.03);
  z += fr * nb * (0.025 * sstep(0.1, 0.0, y) * sstep(-0.22, -0.04, y) + 0.075 * gss(y + 0.12, 0.05)); // a narrow, hooked nose
  z += 0.012 * fr * gss(x, 0.07) * gss(y + 0.27, 0.02);
  z -= 0.008 * fr * gss(x, 0.06) * gss(y + 0.285, 0.006);
  z += 0.022 * fr * gss(x, 0.08) * gss(y + 0.43, 0.04); // chin
  return [x, y, z];
}
function headC(u, v, p) {
  const [x, y, z] = p,
    ax = Math.abs(x),
    fr = sstep(0.05, 0.4, z);
  const Gs = (cx, cy, rx, ry) => gss(ax - cx, rx) * gss(y - cy, ry);
  let k = 1;
  k *= 1 - 0.82 * fr * Gs(0.152, 0.02, 0.05, 0.042); // sockets that swallow the light
  k *= 1 - 0.18 * fr * Gs(0.16, -0.065, 0.05, 0.022); // the bags under them
  k *= 1 - 0.4 * fr * Gs(0.13, 0.09, 0.07, 0.013); // brows
  k *= 1 - 0.1 * Gs(0.2, -0.19, 0.06, 0.07); // hollow cheeks
  k *= 1 - 0.22 * sstep(-0.3, -0.5, y) * (1 - fr); // under the jaw
  let c = [k, k * 0.98, k * 0.99];
  const lip = fr * gss(x, 0.062) * gss(y + 0.275, 0.018);
  c = mix3(c, [0.6 * k, 0.48 * k, 0.55 * k], lip); // bloodless lips, a little blue
  c = mul3(c, 1 - 0.75 * fr * gss(x, 0.058) * gss(y + 0.284, 0.005));
  c = mul3(c, 1 - 0.6 * fr * Gs(0.022, -0.168, 0.012, 0.01)); // nostrils
  return c;
}
// the head's own surface, raised a little: hair, beards, hats
const HAIRLINE = (fa, y, front, side, back) => {
  const c = Math.cos(fa);
  return y > (c > 0 ? lerp(side, front, Math.pow(c, 1.4)) : lerp(side, back, Math.pow(-c, 0.8)));
};
const strandC = (dk) => (u, v, p) => {
  const s = 0.5 + 0.5 * Math.sin(u * TAU * 46 + Math.sin(v * 21) * 2.2);
  const k = 1 - dk + dk * s;
  return [k, k, k];
};

// ── a torso: hips, a pinched waist, a narrow chest, sloped shoulders rolled forward over a rounded back
const TORSO_K = [
  [-0.5, 0, 0],
  [-0.5, 0.33, 0.25],
  [-0.44, 0.41, 0.29],
  [-0.3, 0.41, 0.28],
  [-0.12, 0.36, 0.25],
  [0.06, 0.39, 0.28],
  [0.22, 0.44, 0.29],
  [0.34, 0.47, 0.27],
  [0.42, 0.42, 0.23],
  [0.47, 0.27, 0.17],
  [0.5, 0.12, 0.1],
  [0.5, 0, 0],
];
function torsoP(u, v) {
  const [y, hw, hd] = prof(TORSO_K, 1 - v),
    ph = u * TAU,
    s = Math.sin(ph),
    c = Math.cos(ph);
  let x = Math.max(0, hw) * se(s, 0.78),
    z = Math.max(0, hd) * se(c, 0.85);
  z += 0.05 * sstep(-0.15, 0.5, y);
  if (c < 0) z -= 0.05 * -c * gss(y - 0.28, 0.12) * (1 - Math.abs(s) * 0.5);
  if (c > 0) z -= 0.02 * c * c * gss(y - 0.12, 0.1) * gss(s, 0.35);
  return [x, y, z];
}
function clothC(u, v, p) {
  const [x, y] = p,
    ph = u * TAU;
  let k = 1 - 0.08 * (0.5 + 0.5 * Math.sin(ph * 7 + y * 4));
  k -= 0.1 * gss(y + 0.1, 0.07) * (0.5 + 0.5 * Math.sin(ph * 13));
  k -= 0.24 * gss(Math.abs(x) - 0.42, 0.06) * gss(y - 0.28, 0.08);
  k -= 0.2 * sstep(0.44, 0.5, y) + 0.15 * sstep(-0.35, -0.5, y);
  return k;
}
const vOpen = (y, y0, w) => w * sstep(y0, 0.5, y); // a V neckline: no opening below y0, w wide at the collar
// how far forward the torso's front is at a given height (prim units), so buttons and badges sit on the cloth
const TORSO_FRONT = (() => {
  const a = [];
  for (let k = 0; k <= 48; k++) {
    const p = torsoP(0, k / 48);
    a.push([p[1], p[2]]);
  }
  return a.sort((p, q) => p[0] - q[0]);
})();
function torsoFrontZ(yl) {
  const a = TORSO_FRONT;
  if (yl <= a[0][0]) return a[0][1];
  for (let k = 1; k < a.length; k++)
    if (a[k][0] >= yl) {
      const t = (yl - a[k - 1][0]) / (a[k][0] - a[k - 1][0] || 1);
      return lerp(a[k - 1][1], a[k][1], t);
    }
  return a[a.length - 1][1];
}

// ── creatures' heads
function alienP(u, v) {
  let [x, y, z] = sphP(u, v);
  const low = sstep(0.15, -0.5, y),
    hi = sstep(-0.1, 0.5, y);
  x *= 1 - 0.56 * Math.pow(low, 1.15);
  z *= 1 - 0.3 * low; // an inverted pear: all skull, no jaw
  if (z < 0) z *= 1 + 0.5 * hi;
  y += 0.07 * hi; // swollen back over the neck
  y -= 0.09 * low * low;
  const ax = Math.abs(x),
    fr = sstep(-0.05, 0.4, z),
    ey = -0.02 + (ax - 0.1) * 0.55;
  z -= 0.09 * fr * gss(ax - 0.17, 0.085) * gss(y - ey, 0.055); // great slanted sockets
  z += 0.012 * fr * gss(x, 0.03) * gss(y + 0.15, 0.06);
  return [x, y, z];
}
function alienC(u, v, p) {
  const [x, y, z] = p,
    ax = Math.abs(x),
    fr = sstep(0.0, 0.4, z),
    ey = -0.02 + (ax - 0.1) * 0.55;
  let k = 1 - 0.55 * fr * gss(ax - 0.17, 0.08) * gss(y - ey, 0.05);
  k *= 1 - 0.12 * (0.5 + 0.5 * Math.sin(u * TAU * 9 + v * 14)) * sstep(0.0, 0.4, y); // the plates of the skull under thin skin
  k *= 1 - 0.7 * fr * gss(x, 0.04) * gss(y + 0.3, 0.006);
  return [k * 0.98, k, k * 1.02];
}
function lizP(u, v) {
  let [x, y, z] = sphP(u, v);
  if (z > 0) {
    const f = z / 0.5;
    z = z * 2.3;
    x *= 1 - 0.42 * f;
    y *= 1 - 0.3 * f;
  } // a long snout
  y = y < -0.16 ? -0.16 - (y + 0.16) * 0.25 : y; // flat underneath, where the jaw meets it
  const ax = Math.abs(x);
  y += 0.07 * gss(ax - 0.27, 0.07) * gss(z - 0.12, 0.09) * sstep(-0.1, 0.2, y); // brow ridges over the eyes
  z += 0.02 * gss(ax - 0.06, 0.03) * gss(y - 0.05, 0.05) * sstep(0.9, 1.1, z); // nostrils
  return [x, y, z];
}
function scaleC(seed, belly) {
  return (u, v, p, n) => {
    const cx = Math.floor(u * 40),
      cy = Math.floor(v * 26 + (cx % 2) * 0.5),
      r = hsh(cx * 13.1 + cy * 7.7 + seed);
    let k = 0.78 + 0.3 * r;
    const fu = (u * 40) % 1,
      fv = (v * 26 + (cx % 2) * 0.5) % 1;
    k *= 0.72 + 0.28 * sstep(0.0, 0.25, Math.min(fu, 1 - fu, fv, 1 - fv) * 2); // the seams between scales
    k *= 0.75 + 0.35 * clamp(n[1] + 0.3, 0, 1); // darker down the flanks
    if (belly) k = lerp(k, 1.25, belly(p) * 0.7);
    return [k, k, k * 0.95];
  };
}

// a little value noise for baking: veins are where it crosses one half, brains where two do
function vn2(x, y) {
  const xi = Math.floor(x),
    yi = Math.floor(y),
    fx = x - xi,
    fy = y - yi,
    sx = fx * fx * (3 - 2 * fx),
    sy = fy * fy * (3 - 2 * fy);
  const h = (a, b) => hsh(a * 57.13 + b * 113.71);
  return lerp(lerp(h(xi, yi), h(xi + 1, yi), sx), lerp(h(xi, yi + 1), h(xi + 1, yi + 1), sx), sy);
}
const veinAt = (x, y, w) => 1 - sstep(w * 0.4, w, Math.abs(vn2(x, y) - 0.5));
// their skin: thin enough to see what runs under it. Veins in two sizes, the spine dark down the back, shapes in the belly
function alienBodyC(u, v, p) {
  const fa = fAng(u),
    y = p[1];
  let k = 1 - 0.1 * (0.5 + 0.5 * Math.sin(u * TAU * 9 + v * 14)) * sstep(0.0, 0.4, y);
  const vein = Math.max(veinAt(u * 7, v * 5, 0.045), 0.7 * veinAt(u * 17 + 3, v * 12, 0.035));
  k *= 1 - 0.32 * vein;
  k *= 1 - 0.22 * gss(fa - Math.PI, 0.22);
  const org = fa < 1.0 && y > -0.4 && y < 0.15 ? sstep(0.52, 0.72, vn2(u * 11 + 5, v * 7)) : 0;
  k *= 1 - 0.3 * org;
  return [k * (0.94 - 0.08 * vein), k * (1 - 0.04 * vein), k * (1.03 + 0.08 * vein)];
}
function alienHeadC(u, v, p) {
  const c = alienC(u, v, p),
    y = p[1],
    z = p[2];
  const dome = sstep(0.02, 0.22, y) * (1 - sstep(0.1, 0.4, z) * sstep(0.1, -0.05, y));
  const gyri = 1 - sstep(0.02, 0.075, Math.abs(vn2(u * 16, v * 11) - 0.5)); // the folds of something under the scalp
  const vein = veinAt(u * 9 + 7, v * 8, 0.04);
  const k = (1 - 0.2 * gyri * dome) * (1 - 0.25 * vein * (1 - sstep(0.15, 0.4, z)));
  return [c[0] * k * (1 - 0.05 * vein), c[1] * k, c[2] * k * (1 + 0.06 * vein)];
}
// lizard plates: big square scutes down the back, small round scales elsewhere
function lizBodyC(u, v, p, n) {
  const base = scaleC(3.3)(u, v, p, n),
    fa = fAng(u);
  const back = sstep(Math.PI - 0.9, Math.PI - 0.4, fa);
  const cx = Math.floor(u * 22),
    cy = Math.floor(v * 12 + (cx % 2) * 0.5),
    fu = (u * 22) % 1,
    fv = (v * 12 + (cx % 2) * 0.5) % 1;
  const plate =
    (0.78 + 0.22 * hsh(cx * 7.3 + cy * 3.1)) * (0.6 + 0.4 * sstep(0.0, 0.2, Math.min(fu, 1 - fu, fv, 1 - fv) * 2));
  const k = lerp(1, plate * 0.82, back);
  return [base[0] * k, base[1] * k, base[2] * k];
}
function initBodyPrims() {
  const mk = (fn) => {
    const g = new Geo();
    fn(g);
    return uploadGeo(g);
  };
  PRIM.head = mk((g) => surf(g, 64, 48, headP, headC));
  PRIM.skullTop = mk((g) => surf(g, 40, 30, headP, headC, { keep: (u, v, p) => p[1] > -0.24 || p[2] < -0.05 }));
  PRIM.jaw = mk((g) =>
    surf(g, 40, 30, headP, (u, v, p) => mul3(headC(u, v, p), 0.85), {
      keep: (u, v, p) => p[1] <= -0.24 && p[2] >= -0.05,
    }),
  );
  // hair: shells grown from the scalp
  const H = (o) => mk((g) => surf(g, 96, 64, headP, o.col || strandC(0.3), { keep: o.keep, push: o.push }));
  PRIM.hShort = H({
    keep: (u, v, p) => HAIRLINE(fAng(u), p[1], 0.2, 0.06, -0.14),
    push: (u, v, p) => 0.022 + 0.01 * sstep(0.1, 0.45, p[1]),
  });
  PRIM.hSide = H({
    keep: (u, v, p) => HAIRLINE(fAng(u), p[1], p[0] < 0 ? 0.11 : 0.2, 0.05, -0.15),
    push: (u, v, p) => 0.03 + 0.035 * sstep(0.05, -0.3, p[0]) * sstep(0.1, 0.4, p[1]),
  });
  PRIM.hMessy = H({
    keep: (u, v, p) => HAIRLINE(fAng(u), p[1], 0.11 + 0.04 * Math.sin(u * 80), 0.0, -0.2),
    push: (u, v, p) => 0.035 + 0.03 * hsh(Math.floor(u * 30) * 3.1 + Math.floor(v * 20) * 1.7),
    col: strandC(0.45),
  });
  PRIM.hBun = H({ keep: (u, v, p) => HAIRLINE(fAng(u), p[1], 0.21, 0.05, -0.1), push: 0.014 });
  PRIM.hLong = H({ keep: (u, v, p) => HAIRLINE(fAng(u), p[1], 0.17, -0.02, -0.2), push: 0.028 });
  PRIM.hRing = H({ keep: (u, v, p) => fAng(u) > 1.0 && p[1] > -0.18 && p[1] < 0.12, push: 0.018 });
  PRIM.hBeard = H({
    keep: (u, v, p) => p[1] < -0.1 && p[2] > -0.08 && !(Math.abs(p[0]) < 0.075 && p[1] > -0.32 && p[1] < -0.25),
    push: (u, v, p) => 0.02 + 0.02 * sstep(-0.2, -0.45, p[1]),
    col: strandC(0.4),
  });
  PRIM.hBeanie = H({
    keep: (u, v, p) => HAIRLINE(fAng(u), p[1], 0.16, 0.08, 0.0),
    push: (u, v, p) => 0.05 + 0.012 * sstep(0.14, 0.08, p[1]),
    col: (u, v, p) => 0.85 + 0.15 * (0.5 + 0.5 * Math.sin(u * TAU * 60)) - 0.2 * sstep(0.13, 0.09, p[1]),
  });
  // long, lank hair hanging to the shoulder blades, a few strands over the face
  PRIM.hCurtain = mk((g) =>
    surf(
      g,
      44,
      20,
      (u, v) => {
        const a = lerp(0.55, TAU - 0.55, u),
          strand = Math.floor(u * 22),
          yb = -1.55 - 0.35 * hsh(strand * 5.3);
        const y = lerp(0.12, yb, v),
          s = Math.sin(a),
          c = Math.cos(a);
        const hp = headP(a / TAU, clamp(Math.acos(clamp(y / 0.52, -1, 1)) / Math.PI, 0, 1));
        const rh = Math.hypot(hp[0], hp[2]) + 0.035,
          below = sstep(-0.25, -0.75, y);
        const r = lerp(rh, 0.4 + 0.08 * sstep(-0.7, -1.8, y), below) * (1 + 0.025 * Math.sin(a * 17));
        return [
          s * r * (1 + 0.3 * below),
          y,
          c * r * (c > 0 ? 1 - 0.25 * below : 1) - (0.06 + 0.22 * Math.abs(s)) * below,
        ];
      },
      strandC(0.4),
    ),
  );
  // ── a torso and the clothes that sit on it
  PRIM.torso = mk((g) => surf(g, 40, 26, torsoP, clothC));
  const TP = (keep, push, col) =>
    mk((g) => surf(g, 96, 60, torsoP, col || clothC, { keep: (u, v, p) => keep(fAng(u), p[1], p, u), push }));
  PRIM.tVneck = TP(
    (fa, y) => y > 0.12 && fa < vOpen(y, 0.12, 0.62),
    0.006,
    (u, v, p) => 0.92 - 0.25 * sstep(0.44, 0.5, p[1]),
  );
  PRIM.tTie = TP(
    (fa, y) => y > -0.1 && y < 0.47 && fa < 0.075 + 0.035 * sstep(0.25, -0.1, y) + 0.04 * sstep(0.4, 0.45, y),
    0.014,
    (u, v, p) => 0.9 + 0.1 * Math.sin(p[1] * 60),
  );
  PRIM.tLapel = TP(
    (fa, y) =>
      y > -0.25 && y < 0.48 && fa > vOpen(y, 0.0, 0.62) && fa < vOpen(y, 0.0, 0.62) + 0.17 + 0.05 * sstep(0.2, 0.4, y),
    0.012,
  );
  PRIM.tPlacket = TP(
    (fa, y) => y > -0.48 && y < 0.48 && fa < 0.075 + vOpen(y, 0.25, 0.3),
    0.006,
    (u, v, p) => 0.9 - 0.25 * (Math.abs(Math.sin(p[1] * 40)) > 0.97 ? 1 : 0),
  );
  PRIM.tApron = TP(
    (fa, y) => y > -0.5 && y < 0.25 && fa < (y > -0.12 ? 0.48 : 1.1),
    0.014,
    (u, v, p) => 0.85 + 0.15 * Math.sin(u * TAU * 9),
  );
  PRIM.tVest = TP(
    (fa, y, p) => y > -0.38 && y < 0.44 && !(y > 0.0 && fa < vOpen(y, 0.0, 0.7)) && !(Math.abs(p[0]) > 0.34 && y > 0.2),
    0.02,
  );
  PRIM.tCollar = TP(
    (fa, y) => y > 0.37 && fa > 0.42,
    (u, v, p) => 0.012 + 0.05 * sstep(0.38, 0.5, p[1]),
    (u, v, p) => 0.95 - 0.3 * sstep(0.48, 0.38, p[1]),
  );
  PRIM.tBelly = TP(
    (fa, y) => fa < 0.8 && y > -0.42 && y < 0.38,
    0.012,
    (u, v, p) => 0.85 - 0.16 * sstep(0.7, 0.95, ((p[1] + 1) * 11) % 1) - 0.25 * sstep(0.5, 0.8, fAng(u)),
  );
  PRIM.tCavity = TP(
    (fa, y) => fa < 0.62 && y > -0.08 && y < 0.36,
    0.004,
    (u, v, p) => 0.55 + 0.45 * hsh(Math.floor(u * 60) * 9.1 + Math.floor(v * 30)),
  );
  PRIM.tRags = TP(
    (fa, y, p, u) =>
      y < 0.42 &&
      y > -0.48 &&
      !(fa < 0.7 && y > -0.1 && y < 0.38) &&
      hsh(Math.floor(u * 16) * 31.7 + Math.floor((y + 1) * 9) * 3.3) > 0.3,
    0.014,
    (u, v, p) => 0.65 + 0.35 * hsh(Math.floor(u * 50) + Math.floor(v * 40) * 7.3),
  );
  PRIM.scaleTorso = mk((g) => surf(g, 48, 30, torsoP, scaleC(3.3)));
  PRIM.rotTorso = mk((g) =>
    surf(g, 40, 26, torsoP, (u, v, p) => {
      const b = hsh(Math.floor(u * 9) * 7.1 + Math.floor(v * 7) * 13.3),
        k = clothC(u, v, p) * (b > 0.72 ? 0.55 : 1);
      return [k * (b > 0.72 ? 0.9 : 1), k, k * (b > 0.72 ? 0.7 : 0.95)];
    }),
  );
  // ribs, curving down and round from the spine; a breastbone between
  PRIM.ribs = mk((g) => {
    for (let i = 0; i < 6; i++) {
      const y0 = 0.32 - i * 0.065,
        pts = [];
      for (let k = 0; k <= 16; k++) {
        const a = lerp(-2.0, 2.0, k / 16);
        if (Math.abs(a) < 0.16) {
          if (pts.length > 1) tube(g, pts.slice(), (t) => 0.022 * (1 - 0.3 * t), 5, 1);
          pts.length = 0;
          continue;
        }
        const y = y0 - 0.07 * Math.cos(a * 0.5) + 0.02 * i * (1 - Math.abs(a) / 2);
        const tv = clamp(0.5 - y, 0, 1),
          [, hw, hd] = prof(TORSO_K, 1 - tv);
        pts.push([
          Math.max(0, hw) * se(Math.sin(a), 0.78) * 1.03,
          y,
          Math.max(0, hd) * se(Math.cos(a), 0.85) * 1.06 + 0.05 * sstep(-0.15, 0.5, y),
        ]);
      }
      if (pts.length > 1) tube(g, pts, (t) => 0.022 * (0.7 + 0.3 * t), 5, 1);
    }
    tube(
      g,
      [
        [0, 0.42, 0.35],
        [0, 0.2, 0.36],
        [0, 0.0, 0.33],
      ],
      0.026,
      6,
      0.9,
    );
  });
  PRIM.alienHead = mk((g) => surf(g, 64, 48, alienP, alienHeadC));
  PRIM.alienTorso = mk((g) => surf(g, 80, 50, torsoP, alienBodyC));
  PRIM.alienLimb = mk((g) =>
    surf(
      g,
      16,
      18,
      (u, v) => {
        const [y, r] = prof(
            [
              [0.5, 0],
              [0.47, 0.33],
              [0.4, 0.48],
              [0.15, 0.5],
              [-0.15, 0.46],
              [-0.38, 0.41],
              [-0.47, 0.3],
              [-0.5, 0],
            ],
            v,
          ),
          a = u * TAU;
        return [Math.sin(a) * Math.max(0, r), y, Math.cos(a) * Math.max(0, r)];
      },
      (u, v) => {
        const k = 1 - 0.38 * Math.max(veinAt(u * 4 + 2, v * 6, 0.06), 0.6 * veinAt(u * 9, v * 13 + 4, 0.05));
        return [k * 0.95, k, k * 1.05];
      },
    ),
  );
  PRIM.lizTorso = mk((g) => surf(g, 60, 36, torsoP, lizBodyC));
  // a flap of something torn: a sheet that hangs, ragged at the bottom, curled at the edges
  PRIM.flap = mk((g) =>
    surf(
      g,
      8,
      14,
      (u, v) => {
        const wd = 1 - 0.55 * v,
          tear = 0.22 * (0.5 + 0.5 * Math.sin(u * 17.0 + 1.3)) * sstep(0.75, 1, v);
        const x = (u - 0.5) * wd,
          y = -v * (1 - tear);
        return [
          x + 0.06 * Math.sin(v * 5.0) * v,
          y,
          0.22 * Math.pow(Math.abs(u - 0.5) * 2, 2) * (0.3 + v) + 0.08 * Math.sin(v * 4.0),
        ];
      },
      (u, v) => 0.95 - 0.3 * v + 0.1 * Math.sin(u * 23 + v * 7) - 0.15 * sstep(0.85, 1, v),
    ),
  );
  PRIM.lizHead = mk((g) =>
    surf(
      g,
      44,
      26,
      lizP,
      scaleC(7.1, (p) => sstep(-0.1, -0.16, p[1])),
    ),
  );
  // ── limbs, hands, feet
  PRIM.limb2 = mk((g) =>
    surf(
      g,
      16,
      14,
      (u, v) => {
        const [y, r] = prof(
            [
              [0.5, 0],
              [0.47, 0.33],
              [0.4, 0.48],
              [0.15, 0.5],
              [-0.15, 0.46],
              [-0.38, 0.41],
              [-0.47, 0.3],
              [-0.5, 0],
            ],
            v,
          ),
          a = u * TAU;
        return [Math.sin(a) * Math.max(0, r), y, Math.cos(a) * Math.max(0, r)];
      },
      (u, v) => 1 - 0.06 * Math.sin(u * TAU * 5) * Math.sin(v * Math.PI),
    ),
  );
  PRIM.rbox = mk((g) => surf(g, 20, 14, superP(0.45, 0.55), null));
  PRIM.shoe = mk((g) =>
    surf(
      g,
      20,
      12,
      (u, v) => {
        let [x, y, z] = superP(0.55, 0.6)(u, v);
        x *= 1 - 0.3 * sstep(0.0, 0.5, z);
        if (y > 0) y *= 1 - 0.55 * sstep(0.0, 0.5, z);
        return [x, y, z];
      },
      (u, v, p) => (p[1] < -0.32 ? 0.45 : 1 - 0.15 * sstep(0.3, 0.0, p[1])),
    ),
  );
  // a hand hanging from the wrist: palm turned in (-x), long fingers curling towards it, the thumb in front (+z)
  const hand = (curl, len) =>
    mk((g) => {
      surf(
        g,
        14,
        10,
        (u, v) => {
          const ph = u * TAU,
            th = v * Math.PI,
            st = Math.sin(th);
          return [
            0.17 * se(st * Math.sin(ph), 0.75),
            0.25 * se(Math.cos(th), 0.8) - 0.22,
            0.43 * se(st * Math.cos(ph), 0.75),
          ];
        },
        (u, v, p) => 0.92 + 0.08 * sstep(-0.4, 0.0, p[1]),
      );
      const F = [
        [0.29, 0.4],
        [0.1, 0.47],
        [-0.1, 0.45],
        [-0.28, 0.36],
      ];
      for (const [fz, fl] of F) {
        const L = fl * len;
        digit(
          g,
          [-0.02, -0.4, fz],
          [0, -1, 0.02],
          [-1, 0, 0],
          [
            [L * 0.42, 0.15 * curl],
            [L * 0.33, 0.55 * curl],
            [L * 0.25, 0.6 * curl],
          ],
          0.09,
          0.062,
          0.95,
        );
      }
      digit(
        g,
        [-0.04, -0.14, 0.36],
        [-0.25, -0.75, 0.6],
        [-1, 0, 0],
        [
          [0.18, 0.2 * curl],
          [0.16, 0.4 * curl],
        ],
        0.08,
        0.055,
        0.95,
      );
    });
  PRIM.hand = hand(0.5, 1.0);
  PRIM.handG = hand(1.6, 1.0);
  PRIM.claw = hand(1.25, 1.35);
  // a spike: teeth, spines, claws. Base at y=0, a curved point at y=1
  PRIM.fang = mk((g) =>
    surf(
      g,
      8,
      8,
      (u, v) => {
        const a = u * TAU,
          y = 1 - v,
          r = 0.5 * Math.pow(v, 0.9);
        return [Math.sin(a) * r, y, Math.cos(a) * r + 0.22 * y * y];
      },
      (u, v) => 0.75 + 0.25 * (1 - v),
    ),
  );
  // a long coat from the waist down: open at the front, folds deepening to a ragged hem
  PRIM.coat = mk((g) =>
    surf(
      g,
      36,
      12,
      (u, v) => {
        const a = lerp(0.3, TAU - 0.3, u),
          hem = 0.04 * hsh(Math.floor(u * 18) * 4.7),
          y = -v * (1 + hem);
        const r = 0.5 * (1 + 0.16 * v) * (1 + 0.05 * Math.sin(a * 9) * v);
        return [Math.sin(a) * r, y, Math.cos(a) * r * 0.82];
      },
      (u, v) => 0.9 - 0.18 * (0.5 + 0.5 * Math.sin(lerp(0.3, TAU - 0.3, u) * 9)) * v - 0.12 * v,
    ),
  );
  // a skirt: closed, flaring a little to the knee, soft folds
  PRIM.skirt = mk((g) =>
    surf(
      g,
      32,
      8,
      (u, v) => {
        const a = u * TAU,
          r = 0.5 * (1 + 0.34 * v) * (1 + 0.035 * Math.sin(a * 11) * v);
        return [Math.sin(a) * r, -v, Math.cos(a) * r * 0.86];
      },
      (u, v) => 0.95 - 0.12 * (0.5 + 0.5 * Math.sin(u * TAU * 11)) * v - 0.08 * v,
    ),
  );
}
