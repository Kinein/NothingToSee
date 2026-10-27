//@ gfx/gl — WebGL2 helpers: buffers, programs, textures, framebuffers
//@ Defines: E0, EMIT, GLASS, Geo
//@ Uses:    gfx/world-geometry, core/util
//@ (header made by tools/map.js; stripped by build.py)
// ───────────────────────── WebGL2 layer ─────────────────────────
let gl = null;
const E0 = [0, 0, -1, -1]; // ext: emit, glass, cutCellX, cutCellZ
const EMIT = (k) => [k, 0, -1, -1];
const GLASS = [0, 1, -1, -1];

class Geo {
  constructor() {
    this.p = [];
    this.n = [];
    this.c = [];
    this.e = [];
    this.i = [];
    this.mat = null;
    this.ao = 0;
    this.aoH = 1;
    this.cell = null;
    this.matId = 0;
  }
  get vc() {
    return this.p.length / 3;
  }
  vert(x, y, z, nx, ny, nz, c, e) {
    if (this.mat) {
      const m = this.mat;
      const X = m[0] * x + m[4] * y + m[8] * z + m[12],
        Y = m[1] * x + m[5] * y + m[9] * z + m[13],
        Z = m[2] * x + m[6] * y + m[10] * z + m[14];
      const NX = m[0] * nx + m[4] * ny + m[8] * nz,
        NY = m[1] * nx + m[5] * ny + m[9] * nz,
        NZ = m[2] * nx + m[6] * ny + m[10] * nz;
      x = X;
      y = Y;
      z = Z;
      nx = NX;
      ny = NY;
      nz = NZ;
    }
    e = e || E0;
    if (this.cell || this.matId)
      e = [
        e[0],
        this.matId && e[1] < 0.5 ? 2 + this.matId : e[1],
        this.cell ? this.cell[0] : e[2],
        this.cell ? this.cell[1] : e[3],
      ]; // decor: rides (and sinks) with its wall; a default material
    if (this.ao) {
      const k = this.ao + (1 - this.ao) * Math.min(1, Math.max(0, y) / this.aoH);
      c = [c[0] * k, c[1] * k, c[2] * k];
    }
    this.p.push(x, y, z);
    this.n.push(nx, ny, nz);
    this.c.push(c[0], c[1], c[2]);
    this.e.push(e[0], e[1], e[2], e[3]);
  }
  quad(a, b, c, d, n, col, e, cols) {
    const k = this.vc;
    this.vert(a[0], a[1], a[2], n[0], n[1], n[2], cols ? cols[0] : col, e);
    this.vert(b[0], b[1], b[2], n[0], n[1], n[2], cols ? cols[1] : col, e);
    this.vert(c[0], c[1], c[2], n[0], n[1], n[2], cols ? cols[2] : col, e);
    this.vert(d[0], d[1], d[2], n[0], n[1], n[2], cols ? cols[3] : col, e);
    this.i.push(k, k + 1, k + 2, k, k + 2, k + 3);
  }
  tri(a, b, c, n, col, e) {
    const k = this.vc;
    this.vert(a[0], a[1], a[2], n[0], n[1], n[2], col, e);
    this.vert(b[0], b[1], b[2], n[0], n[1], n[2], col, e);
    this.vert(c[0], c[1], c[2], n[0], n[1], n[2], col, e);
    this.i.push(k, k + 1, k + 2);
  }
  // col may be a colour or fn(nx,ny,nz, faceCentreX, faceCentreZ)
  box(x0, y0, z0, x1, y1, z1, col, e) {
    const mx = (x0 + x1) / 2,
      mz = (z0 + z1) / 2;
    const C = (n, fx, fz) => (typeof col === 'function' ? col(n[0], n[1], n[2], fx, fz) : col);
    const X = (n, fx, fz) => (typeof e === 'function' ? e(n[0], n[1], n[2], fx, fz) : e); // ext may differ per face (a wall's paper on one side, brick on the other)
    let n;
    n = [1, 0, 0];
    this.quad([x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [x1, y0, z1], n, C(n, x1, mz), X(n, x1, mz));
    n = [-1, 0, 0];
    this.quad([x0, y0, z1], [x0, y1, z1], [x0, y1, z0], [x0, y0, z0], n, C(n, x0, mz), X(n, x0, mz));
    n = [0, 1, 0];
    this.quad([x0, y1, z0], [x0, y1, z1], [x1, y1, z1], [x1, y1, z0], n, C(n, mx, mz), X(n, mx, mz));
    n = [0, -1, 0];
    this.quad([x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], n, C(n, mx, mz), X(n, mx, mz));
    n = [0, 0, 1];
    this.quad([x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1], n, C(n, mx, z1), X(n, mx, z1));
    n = [0, 0, -1];
    this.quad([x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0], n, C(n, mx, z0), X(n, mx, z0));
  }
  bx(cx, y0, cz, sx, sy, sz, col, e) {
    this.box(cx - sx / 2, y0, cz - sz / 2, cx + sx / 2, y0 + sy, cz + sz / 2, col, e);
  }
  // a box whose top and bottom differ in size (chests, car cabins, lamp shades)
  frustum(cx, y0, cz, wb, db, wt, dt, h, col, e) {
    const y1 = y0 + h;
    const b = [
      [cx - wb / 2, y0, cz - db / 2],
      [cx + wb / 2, y0, cz - db / 2],
      [cx + wb / 2, y0, cz + db / 2],
      [cx - wb / 2, y0, cz + db / 2],
    ];
    const t = [
      [cx - wt / 2, y1, cz - dt / 2],
      [cx + wt / 2, y1, cz - dt / 2],
      [cx + wt / 2, y1, cz + dt / 2],
      [cx - wt / 2, y1, cz + dt / 2],
    ];
    for (let k = 0; k < 4; k++) {
      const k2 = (k + 1) % 4,
        A = b[k],
        B = b[k2],
        Cc = t[k2];
      const u = [B[0] - A[0], B[1] - A[1], B[2] - A[2]],
        v = [Cc[0] - A[0], Cc[1] - A[1], Cc[2] - A[2]];
      let n = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
      const l = Math.hypot(n[0], n[1], n[2]) || 1;
      n = [n[0] / l, n[1] / l, n[2] / l];
      const mx = (A[0] + B[0]) / 2 - cx,
        mz = (A[2] + B[2]) / 2 - cz;
      if (n[0] * mx + n[2] * mz < 0) n = [-n[0], -n[1], -n[2]];
      this.quad(b[k], b[k2], t[k2], t[k], n, col, e);
    }
    this.quad(t[0], t[3], t[2], t[1], [0, 1, 0], col, e);
    this.quad(b[0], b[1], b[2], b[3], [0, -1, 0], col, e);
  }
  cyl(cx, y0, cz, rb, rt, h, seg, col, e, caps = true) {
    for (let s = 0; s < seg; s++) {
      const a0 = (s / seg) * TAU,
        a1 = ((s + 1) / seg) * TAU,
        am = (a0 + a1) / 2;
      const sl = rb - rt,
        ln = Math.hypot(h, sl) || 1;
      const n = [(Math.sin(am) * h) / ln, sl / ln, (Math.cos(am) * h) / ln];
      this.quad(
        [cx + Math.sin(a0) * rb, y0, cz + Math.cos(a0) * rb],
        [cx + Math.sin(a1) * rb, y0, cz + Math.cos(a1) * rb],
        [cx + Math.sin(a1) * rt, y0 + h, cz + Math.cos(a1) * rt],
        [cx + Math.sin(a0) * rt, y0 + h, cz + Math.cos(a0) * rt],
        n,
        col,
        e,
      );
      if (caps && rt > 0)
        this.tri(
          [cx, y0 + h, cz],
          [cx + Math.sin(a0) * rt, y0 + h, cz + Math.cos(a0) * rt],
          [cx + Math.sin(a1) * rt, y0 + h, cz + Math.cos(a1) * rt],
          [0, 1, 0],
          col,
          e,
        );
      if (caps && rb > 0)
        this.tri(
          [cx, y0, cz],
          [cx + Math.sin(a1) * rb, y0, cz + Math.cos(a1) * rb],
          [cx + Math.sin(a0) * rb, y0, cz + Math.cos(a0) * rb],
          [0, -1, 0],
          col,
          e,
        );
    }
  }
  sphere(cx, cy, cz, rx, ry, rz, su, sv, col, e) {
    const k0 = this.vc;
    for (let v = 0; v <= sv; v++) {
      const th = (v / sv) * Math.PI;
      for (let u = 0; u <= su; u++) {
        const ph = (u / su) * TAU;
        const nx = Math.sin(th) * Math.sin(ph),
          ny = Math.cos(th),
          nz = Math.sin(th) * Math.cos(ph);
        this.vert(
          cx + nx * rx,
          cy + ny * ry,
          cz + nz * rz,
          nx,
          ny,
          nz,
          typeof col === 'function' ? col(nx, ny, nz) : col,
          e,
        );
      }
    }
    for (let v = 0; v < sv; v++)
      for (let u = 0; u < su; u++) {
        const a = k0 + v * (su + 1) + u,
          b = a + su + 1;
        this.i.push(a, b, a + 1, b, b + 1, a + 1);
      }
  }
  xf(m, fn) {
    const prev = this.mat;
    this.mat = prev ? M4.mul(prev, m) : m;
    fn();
    this.mat = prev;
  }
}
