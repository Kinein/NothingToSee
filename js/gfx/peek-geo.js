//@ gfx/peek-geo — The rummage close-up's shapes: rounded boxes, lathes, tubes, sheets, lumps; its materials
//@ Defines: PKM, pkHash, pkNoise, pkRng, PG_A, PG_B, PG_C, PG_D, PG_E, pkGrid, PK_FACES, pkSteps, pkRBox, pkLathe, pkTube, pkBlob, …
//@ Uses:    world/grid, gfx/body-parts, gfx/world-geometry, core/util, gfx/renderer, gfx/post
//@ (header made by tools/map.js; stripped by build.py)
// ───────────── the rummage close-up's shapes (gfx/peek). It is all a few centimetres from the lens, so nothing in it
// is a plain box: edges are rounded, round things are turned on a lathe, wires and fingers are tubes, paper is a sheet
// that crumples. Every vertex carries [emit, material, u, v] where the world's meshes keep their ext, and
// gfx/peek-shader paints each surface from its material and its u, v (the print on a page, the label round a tin, the
// pages of a book). Sizes are real: metres, a hand is 18 cm long. Every helper winds its triangles the way its normals
// face, so the shader can tell the back of a sheet of paper from its front.
const PKM = {
  plain: 0,
  card: 1,
  wood: 2,
  paper: 3,
  news: 4,
  note: 5,
  receipt: 6,
  chart: 7,
  obit: 8,
  photo: 9,
  knit: 10,
  cloth: 11,
  steel: 12,
  brass: 13,
  glass: 14,
  skin: 15,
  nail: 16,
  plastic: 17,
  bag: 18,
  flesh: 19,
  scales: 20,
  label: 21,
  book: 22,
  bone: 23,
  fuzz: 24,
  rubber: 25,
  pcb: 26,
  ice: 27,
  bread: 28,
  felt: 29,
  money: 30,
  dice: 31,
  dial: 32,
  led: 33,
  token: 34,
  fish: 35,
  tape: 36,
  enamel: 37,
  foil: 38,
  leather: 39,
};
// shaping noise: a hash of the lattice point, never the simulation's random
function pkHash(x, y, z, s) {
  let h =
    Math.imul(x | 0, 374761393) ^
    Math.imul(y | 0, 668265263) ^
    Math.imul(z | 0, 1274126177) ^
    Math.imul(s | 0, 982451653);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
function pkNoise(x, y, z, s) {
  const ix = Math.floor(x),
    iy = Math.floor(y),
    iz = Math.floor(z),
    fx = x - ix,
    fy = y - iy,
    fz = z - iz,
    ux = fx * fx * (3 - 2 * fx),
    uy = fy * fy * (3 - 2 * fy),
    uz = fz * fz * (3 - 2 * fz);
  let v = 0;
  for (let k = 0; k < 8; k++) {
    const dx = k & 1,
      dy = (k >> 1) & 1,
      dz = k >> 2;
    v += pkHash(ix + dx, iy + dy, iz + dz, s) * (dx ? ux : 1 - ux) * (dy ? uy : 1 - uy) * (dz ? uz : 1 - uz);
  }
  return v;
}
const pkFbm = (x, y, z, s) =>
  pkNoise(x, y, z, s) * 0.55 +
  pkNoise(x * 2.1, y * 2.1, z * 2.1, s + 1) * 0.3 +
  pkNoise(x * 4.3, y * 4.3, z * 4.3, s + 2) * 0.15;
// a seeded stream for laying things out (where the pens lie, which way a tooth faces)
function pkRng(seed) {
  let s = (seed | 0) * 2654435761 + 1;
  return () => {
    s = Math.imul(s ^ (s >>> 15), 2246822519);
    s = Math.imul(s ^ (s >>> 13), 3266489917);
    return ((s ^= s >>> 16) >>> 0) / 4294967296;
  };
}
const PG_A = [0, 0, 0],
  PG_B = [0, 0, 0],
  PG_C = [0, 0, 0],
  PG_D = [0, 0, 0],
  PG_E = [0, 0, 0];
// a surface from fn(u, v, out) over u, v in 0..1, normals from the surface itself. col: a colour or fn(u, v, P).
// o: emit · flat (faceted: crumpled paper) · uv(u, v) → [u, v] for the paint · out: a point inside it (a closed
// thing's normals point away from it; without one the surface is a sheet and either side may face the lens)
function pkGrid(g, nu, nv, fn, col, mat, o) {
  o = o || {};
  const em = o.emit || 0,
    e = 1e-3,
    P = [],
    N = [],
    T = [];
  for (let j = 0; j <= nv; j++)
    for (let i = 0; i <= nu; i++) {
      const u = i / nu,
        v = j / nv,
        vv = clamp(v, 4e-3, 1 - 4e-3);
      fn(u, v, PG_A);
      fn(u + e, vv, PG_B);
      fn(u - e, vv, PG_C);
      fn(u, vv + e, PG_D);
      fn(u, vv - e, PG_E);
      const ax = PG_B[0] - PG_C[0],
        ay = PG_B[1] - PG_C[1],
        az = PG_B[2] - PG_C[2],
        bx = PG_D[0] - PG_E[0],
        by = PG_D[1] - PG_E[1],
        bz = PG_D[2] - PG_E[2];
      let nx = ay * bz - az * by,
        ny = az * bx - ax * bz,
        nz = ax * by - ay * bx;
      const l = Math.hypot(nx, ny, nz);
      if (l < 1e-12) {
        nx = 0;
        ny = 1;
        nz = 0;
      } else {
        nx /= l;
        ny /= l;
        nz /= l;
      }
      P.push(PG_A[0], PG_A[1], PG_A[2]);
      N.push(nx, ny, nz);
      const t = o.uv ? o.uv(u, v) : null;
      T.push(t ? t[0] : u, t ? t[1] : v);
    }
  let flip = false;
  if (o.out) {
    let s = 0;
    for (let k = 0; k < P.length; k += 3)
      s += N[k] * (P[k] - o.out[0]) + N[k + 1] * (P[k + 1] - o.out[1]) + N[k + 2] * (P[k + 2] - o.out[2]);
    flip = s < 0;
  }
  const W = nu + 1,
    cOf = (k) =>
      typeof col === 'function' ? col(T[k * 2], T[k * 2 + 1], [P[k * 3], P[k * 3 + 1], P[k * 3 + 2]]) : col,
    put = (k, nx, ny, nz) =>
      g.vert(P[k * 3], P[k * 3 + 1], P[k * 3 + 2], nx, ny, nz, cOf(k), [em, mat, T[k * 2], T[k * 2 + 1]]);
  const tris = [];
  for (let j = 0; j < nv; j++)
    for (let i = 0; i < nu; i++) {
      const a = j * W + i,
        b = a + 1,
        c = a + W + 1,
        d = a + W;
      if (flip) tris.push(a, c, b, a, d, c);
      else tris.push(a, b, c, a, c, d);
    }
  if (o.flat) {
    for (let k = 0; k < tris.length; k += 3) {
      const A = tris[k],
        B = tris[k + 1],
        Cc = tris[k + 2],
        ux = P[B * 3] - P[A * 3],
        uy = P[B * 3 + 1] - P[A * 3 + 1],
        uz = P[B * 3 + 2] - P[A * 3 + 2],
        vx = P[Cc * 3] - P[A * 3],
        vy = P[Cc * 3 + 1] - P[A * 3 + 1],
        vz = P[Cc * 3 + 2] - P[A * 3 + 2];
      let nx = uy * vz - uz * vy,
        ny = uz * vx - ux * vz,
        nz = ux * vy - uy * vx;
      const l = Math.hypot(nx, ny, nz) || 1;
      nx /= l;
      ny /= l;
      nz /= l;
      const k0 = g.vc;
      put(A, nx, ny, nz);
      put(B, nx, ny, nz);
      put(Cc, nx, ny, nz);
      g.i.push(k0, k0 + 1, k0 + 2);
    }
    return;
  }
  const k0 = g.vc,
    sg = flip ? -1 : 1;
  for (let k = 0; k < P.length / 3; k++) put(k, N[k * 3] * sg, N[k * 3 + 1] * sg, N[k * 3 + 2] * sg);
  for (const t of tris) g.i.push(k0 + t);
}
// a box with rounded edges, centred on cx, cy, cz. Each face is its own grid and paints with u = face + 0..1
// (0 +x, 1 −x, 2 +y, 3 −y, 4 +z, 5 −z), v = 0..1 across it: a book knows its spine from its pages.
const PK_FACES = [
  [1, 0, 0, 0, 1, 0, 0, 0, 1],
  [-1, 0, 0, 0, 0, 1, 0, 1, 0],
  [0, 1, 0, 0, 0, 1, 1, 0, 0],
  [0, -1, 0, 1, 0, 0, 0, 0, 1],
  [0, 0, 1, 1, 0, 0, 0, 1, 0],
  [0, 0, -1, 0, 1, 0, 1, 0, 0],
];
function pkSteps(h, r, inner) {
  const b = Math.min(1, r / h),
    out = [-1, -1 + b / 3, -1 + (2 * b) / 3, -1 + b];
  for (let k = 1; k < inner; k++) out.push(-1 + b + ((2 - 2 * b) * k) / inner);
  out.push(1 - b, 1 - (2 * b) / 3, 1 - b / 3, 1);
  return out.filter((x, i) => i === 0 || x - out[i - 1] > 1e-6);
}
function pkRBox(g, cx, cy, cz, sx, sy, sz, r, col, mat, o) {
  o = o || {};
  const h = [sx / 2, sy / 2, sz / 2],
    rr = Math.min(r, h[0] * 0.999, h[1] * 0.999, h[2] * 0.999),
    em = o.emit || 0,
    inner = o.inner || 3;
  for (let f = 0; f < 6; f++) {
    if (o.skip && o.skip.includes(f)) continue;
    const F = PK_FACES[f],
      ai = F[3] ? 0 : F[4] ? 1 : 2,
      bi = F[6] ? 0 : F[7] ? 1 : 2,
      ss = pkSteps(h[ai], rr, inner),
      ts = pkSteps(h[bi], rr, inner),
      k0 = g.vc,
      W = ss.length;
    for (let j = 0; j < ts.length; j++)
      for (let i = 0; i < ss.length; i++) {
        const s = ss[i],
          t = ts[j],
          p = [0, 0, 0];
        for (let a = 0; a < 3; a++) p[a] = F[a] * h[a] + F[3 + a] * s * h[a] + F[6 + a] * t * h[a];
        const n = [0, 0, 0],
          q = [0, 0, 0];
        for (let a = 0; a < 3; a++) {
          const lim = h[a] - rr;
          q[a] = clamp(p[a], -lim, lim);
          n[a] = p[a] - q[a];
        }
        const l = Math.hypot(n[0], n[1], n[2]) || 1;
        for (let a = 0; a < 3; a++) n[a] = l > 1e-9 ? n[a] / l : F[a];
        const c = typeof col === 'function' ? col(f, s, t) : col;
        g.vert(cx + q[0] + n[0] * rr, cy + q[1] + n[1] * rr, cz + q[2] + n[2] * rr, n[0], n[1], n[2], c, [
          em,
          mat,
          f + (s * 0.5 + 0.5) * 0.998,
          t * 0.5 + 0.5,
        ]);
      }
    for (let j = 0; j < ts.length - 1; j++)
      for (let i = 0; i < W - 1; i++) {
        const a = k0 + j * W + i;
        g.i.push(a, a + 1, a + W + 1, a, a + W + 1, a + W);
      }
  }
}
// turned on a lathe round the y axis: prof = [r0, y0, r1, y1, …] from the bottom middle out, up and back in. A point
// given twice is a hard edge (a tin's rim). u goes round, v along the outline.
function pkLathe(g, x, y, z, prof, seg, col, mat, o) {
  o = o || {};
  const n = prof.length / 2,
    em = o.emit || 0,
    L = [0];
  for (let i = 1; i < n; i++)
    L.push(L[i - 1] + Math.hypot(prof[i * 2] - prof[i * 2 - 2], prof[i * 2 + 1] - prof[i * 2 - 1]));
  const len = L[n - 1] || 1,
    k0 = g.vc,
    W = seg + 1;
  for (let i = 0; i < n; i++) {
    const a = Math.max(0, i - 1),
      b = Math.min(n - 1, i + 1);
    let a2 = a,
      b2 = b;
    if (i > 0 && prof[i * 2] === prof[i * 2 - 2] && prof[i * 2 + 1] === prof[i * 2 - 1]) a2 = i; // second of a pair: forward only
    if (i < n - 1 && prof[i * 2] === prof[i * 2 + 2] && prof[i * 2 + 1] === prof[i * 2 + 3]) b2 = i; // first of a pair: back only
    let tr = prof[b2 * 2] - prof[a2 * 2],
      ty = prof[b2 * 2 + 1] - prof[a2 * 2 + 1];
    const tl = Math.hypot(tr, ty) || 1;
    tr /= tl;
    ty /= tl;
    const nr = ty,
      ny = -tr,
      r = prof[i * 2],
      py = prof[i * 2 + 1];
    for (let s = 0; s <= seg; s++) {
      const an = (s / seg) * TAU,
        sn = Math.sin(an),
        cs = Math.cos(an),
        c = typeof col === 'function' ? col(s / seg, L[i] / len) : col;
      g.vert(x + r * sn, y + py, z + r * cs, nr * sn, ny, nr * cs, c, [em, mat, s / seg, L[i] / len]);
    }
  }
  for (let i = 0; i < n - 1; i++)
    for (let s = 0; s < seg; s++) {
      const a = k0 + i * W + s;
      g.i.push(a, a + 1, a + W + 1, a, a + W + 1, a + W);
    }
}
// a tube along pts = [x, y, z, …] (smoothed through them), radius rad or rad(t) for t 0..1 along it. o: caps (round
// ends) · closed (a loop: a rubber band) · flat (squashed to an oval: a strap, a hairgrip)
function pkTube(g, pts, rad, seg, col, mat, o) {
  o = o || {};
  const raw = [];
  for (let k = 0; k < pts.length; k += 3) raw.push([pts[k], pts[k + 1], pts[k + 2]]);
  const closed = !!o.closed,
    m = raw.length,
    C = [];
  const at = (i) => raw[closed ? ((i % m) + m) % m : clamp(i, 0, m - 1)];
  const sub = o.sub || 4;
  for (let i = 0; i < (closed ? m : m - 1); i++) {
    const p0 = at(i - 1),
      p1 = at(i),
      p2 = at(i + 1),
      p3 = at(i + 2);
    for (let k = 0; k < sub; k++) {
      const t = k / sub,
        t2 = t * t,
        t3 = t2 * t,
        q = [0, 0, 0];
      for (let a = 0; a < 3; a++)
        q[a] =
          0.5 *
          (2 * p1[a] +
            (-p0[a] + p2[a]) * t +
            (2 * p0[a] - 5 * p1[a] + 4 * p2[a] - p3[a]) * t2 +
            (-p0[a] + 3 * p1[a] - 3 * p2[a] + p3[a]) * t3);
      C.push(q);
    }
  }
  if (!closed) C.push(raw[m - 1].slice());
  else C.push(C[0].slice());
  const R = (t) => (typeof rad === 'function' ? rad(t) : rad);
  // rings: centre, radius, along-ness t
  let rings = C.map((p, i) => ({ p, r: R(i / (C.length - 1)), t: i / (C.length - 1) }));
  const tan = (i) => {
    const a = rings[Math.max(0, i - 1)].p,
      b = rings[Math.min(rings.length - 1, i + 1)].p,
      v = [b[0] - a[0], b[1] - a[1], b[2] - a[2]],
      l = Math.hypot(v[0], v[1], v[2]) || 1;
    return [v[0] / l, v[1] / l, v[2] / l];
  };
  if (o.caps && !closed) {
    const T0 = tan(0),
      T1 = tan(rings.length - 1),
      r0 = rings[0],
      r1 = rings[rings.length - 1],
      pre = [],
      post = [];
    for (let k = 4; k >= 1; k--) {
      const th = (k / 4) * (Math.PI / 2);
      pre.push({
        p: [
          r0.p[0] - T0[0] * r0.r * Math.sin(th),
          r0.p[1] - T0[1] * r0.r * Math.sin(th),
          r0.p[2] - T0[2] * r0.r * Math.sin(th),
        ],
        r: r0.r * Math.cos(th) + 1e-5,
        t: 0,
      });
      post.unshift({
        p: [
          r1.p[0] + T1[0] * r1.r * Math.sin(th),
          r1.p[1] + T1[1] * r1.r * Math.sin(th),
          r1.p[2] + T1[2] * r1.r * Math.sin(th),
        ],
        r: r1.r * Math.cos(th) + 1e-5,
        t: 1,
      });
    }
    rings = pre.concat(rings, post);
  }
  // frames by parallel transport, so the tube doesn't twist
  const n = rings.length;
  let T = tan(0),
    N1 = Math.abs(T[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2],
    crs = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]],
    nrm = (a) => {
      const l = Math.hypot(a[0], a[1], a[2]) || 1;
      return [a[0] / l, a[1] / l, a[2] / l];
    };
  N1 = nrm([N1[0] - T[0] * dot(N1, T), N1[1] - T[1] * dot(N1, T), N1[2] - T[2] * dot(N1, T)]);
  const em = o.emit || 0,
    k0 = g.vc,
    W = seg + 1,
    fl = o.flat || 1;
  let len = 0;
  for (let i = 0; i < n; i++) {
    const Ti = tan(i);
    N1 = nrm([N1[0] - Ti[0] * dot(N1, Ti), N1[1] - Ti[1] * dot(N1, Ti), N1[2] - Ti[2] * dot(N1, Ti)]);
    const N2 = crs(Ti, N1),
      rg = rings[i],
      ra = rings[Math.max(0, i - 1)],
      rb = rings[Math.min(n - 1, i + 1)],
      ds = Math.hypot(rb.p[0] - ra.p[0], rb.p[1] - ra.p[1], rb.p[2] - ra.p[2]) || 1e-6,
      dr = (rb.r - ra.r) / ds;
    if (i > 0) len += Math.hypot(rg.p[0] - rings[i - 1].p[0], rg.p[1] - rings[i - 1].p[1], rg.p[2] - rings[i - 1].p[2]);
    for (let s = 0; s <= seg; s++) {
      const an = (s / seg) * TAU,
        ca = Math.cos(an),
        sa = Math.sin(an) * fl,
        d = [N1[0] * ca + N2[0] * sa, N1[1] * ca + N2[1] * sa, N1[2] * ca + N2[2] * sa],
        nn = nrm([
          N1[0] * ca + (N2[0] * Math.sin(an)) / fl - Ti[0] * dr,
          N1[1] * ca + (N2[1] * Math.sin(an)) / fl - Ti[1] * dr,
          N1[2] * ca + (N2[2] * Math.sin(an)) / fl - Ti[2] * dr,
        ]),
        c = typeof col === 'function' ? col(s / seg, rg.t) : col;
      g.vert(rg.p[0] + d[0] * rg.r, rg.p[1] + d[1] * rg.r, rg.p[2] + d[2] * rg.r, nn[0], nn[1], nn[2], c, [
        em,
        mat,
        s / seg,
        o.vLen ? len / o.vLen : rg.t,
      ]);
    }
  }
  for (let i = 0; i < n - 1; i++)
    for (let s = 0; s < seg; s++) {
      const a = k0 + i * W + s;
      g.i.push(a, a + 1, a + W + 1, a, a + W + 1, a + W);
    }
}
// a lump: an ellipsoid pushed in and out by noise. o.ridge: sharp folds (a ball of paper), o.flat: faceted
function pkBlob(g, cx, cy, cz, rx, ry, rz, amp, freq, seed, col, mat, o) {
  o = o || {};
  const nu = o.nu || 22,
    nv = o.nv || 14;
  pkGrid(
    g,
    nu,
    nv,
    (u, v, P) => {
      const th = v * Math.PI,
        ph = u * TAU,
        dx = Math.sin(th) * Math.sin(ph),
        dy = -Math.cos(th),
        dz = Math.sin(th) * Math.cos(ph);
      let k = pkFbm(dx * freq + 11, dy * freq + 5, dz * freq + 3, seed);
      if (o.ridge) k = 1 - Math.abs(k * 2 - 1);
      const s = 1 + amp * (k - 0.5) * 2;
      P[0] = cx + dx * rx * s;
      P[1] = cy + dy * ry * s * (o.squash && dy < 0 ? o.squash : 1);
      P[2] = cz + dz * rz * s;
    },
    col,
    mat,
    { emit: o.emit, flat: o.flat, out: [cx, cy, cz] },
  );
}
// a sheet in x z (w by d, centred), lifted by disp(u, v) → y. o.flat for paper that's been screwed up
function pkSheet(g, w, d, nu, nv, disp, col, mat, o) {
  o = o || {};
  pkGrid(
    g,
    nu,
    nv,
    (u, v, P) => {
      P[0] = (u - 0.5) * w;
      P[1] = disp ? disp(u, v) : 0;
      P[2] = (v - 0.5) * d;
      if (o.bend) o.bend(u, v, P);
    },
    col,
    mat,
    o,
  );
}
// the mesh for the close-up: a vertex array, a model matrix of its own, and whether it's glass (drawn last, blended)
function pkMesh(g, glass) {
  const m = uploadGeo(g);
  m.M = new Float32Array(M4.ident());
  m.glass = !!glass;
  m.show = true;
  return m;
}
