//@ dev/object-sheets — __dev.objectSheets: every object of a building in the four camera views, one PNG each
//@ Defines: SHEET, SHEET_VIEWS, SHEET_ONE, sheetSig, sheetTake, sheetDecorKey, sheetItems, SHEET_VS, SHEET_FS, sheetFloor, sheetBounds, sheetUpload, objectSheets
//@ Uses:    gfx/gl, gfx/wall-dressing, core/util, gfx/renderer, gfx/post, them/plan, gfx/models, gfx/world-geometry, world/grid, world/objects
//@ (header made by tools/map.js; stripped by build.py)
// ───────────────────────── object sheets (dev only): every thing in a building drawn on its own, for modelling
// One picture per distinct object: the four views the camera gives with keys (yaw 0 as a game starts, then each Q
// quarter turn), the game's ortho camera and pitch, a plain studio light that turns with the camera, a 0.5 m floor
// grid (1 m lines darker). Each model in its own frame (front = +z), so view 1 is always its front. Furniture
// (MODELS), what hangs on the walls (DK, through mount) and the doors (buildDoors), each with its baked AO left out.
// tools/object_sheets.py runs it and saves the PNGs; by hand: await __dev.objectSheets('office') → [{ file, blob }].
const SHEET = { px: 720, ss: 2, head: 70 };
const SHEET_VIEWS = [
  ['start', 'front (+z)'],
  ['Q', 'its left side (+x)'],
  ['Q Q', 'back (−z)'],
  ['R', 'its right side (−x)'],
];
// the same thing only grown or hung a little differently: one sheet for all of them, the fullest
const SHEET_ONE = new Set(['plant', 'palm', 'window']);
// the same model built twice is one sheet: a hash of every vertex
function sheetSig(g) {
  let h = g.p.length | 0;
  for (const a of [g.p, g.c, g.e, g.i])
    for (let k = 0; k < a.length; k++) h = (Math.imul(h, 31) + Math.round(a[k] * 1000)) | 0;
  return h;
}
// copy the triangles i0…i1 of a Geo (those keep(k, points) lets through) into g, each vertex taken back through the inverse
// of the rigid matrix M it was built with: world → the piece's own frame
function sheetTake(g, src, i0, i1, M, keep) {
  const back = (a, v, t) => {
    const x = a[v * 3] - t[0],
      y = a[v * 3 + 1] - t[1],
      z = a[v * 3 + 2] - t[2];
    return M
      ? [M[0] * x + M[1] * y + M[2] * z, M[4] * x + M[5] * y + M[6] * z, M[8] * x + M[9] * y + M[10] * z]
      : [x, y, z];
  };
  const T = M ? [M[12], M[13], M[14]] : ZERO3;
  for (let k = i0; k < i1; k += 3) {
    const q = [0, 1, 2].map((j) => back(src.p, src.i[k + j], T));
    if (keep && !keep(k, q)) continue;
    for (let j = 0; j < 3; j++) {
      const v = src.i[k + j],
        p = q[j],
        n = back(src.n, v, ZERO3);
      g.i.push(g.vc);
      g.p.push(p[0], p[1], p[2]);
      g.n.push(n[0], n[1], n[2]);
      g.c.push(src.c[v * 3], src.c[v * 3 + 1], src.c[v * 3 + 2]);
      g.e.push(src.e[v * 4], src.e[v * 4 + 1], -1, -1);
    }
  }
  return g;
}
// what a wall piece is called, from the call that draws it: DK.frame(g, …, 'certificate', …) → frame-certificate
function sheetDecorKey(fn) {
  const s = fn.toString(),
    dk = (s.match(/DK\.(\w+)/) || [])[1] || 'piece',
    art = (s.match(/'([a-z]+)'/) || [])[1];
  return dk + (art && art !== 'notes' ? '-' + art : '');
}
function sheetItems(bld) {
  const inB = (x, z) => {
    const r = roomAt(x, z);
    return !!r && r.bld === bld;
  };
  const out = [],
    seen = new Map();
  const add = (key, name, where, g) => {
    if (!g.i.length) return;
    const sig = SHEET_ONE.has(key) ? key : sheetSig(g),
      same = seen.get(sig);
    if (same && g.i.length > same.g.i.length) same.g = g;
    if (same) return void same.where.push(where);
    const n = out.filter((it) => it.key === key).length;
    const it = { key, file: n ? key + '-' + (n + 1) : key, name, where: [where], g, wall: /^(wall-|window)/.test(key) };
    seen.set(sig, it);
    out.push(it);
  };
  // furniture: a fresh Geo has no AO, and the model is already in its own frame
  for (const o of OBJ) {
    if (o.t.ghost || !MODELS[o.type] || !inB(o.cx, o.cz)) continue;
    const g = new Geo();
    MODELS[o.type](g, o);
    add(o.type, o.name, o.id || o.x + ',' + o.z, g);
  }
  // walls and doors are built by the game's own code, caught on the way: no AO, no upload, each mount marked
  const realMount = mount,
    realMesh = makeMesh,
    realVert = Geo.prototype.vert,
    marks = [];
  let doors, decor;
  try {
    Geo.prototype.vert = function (...a) {
      this.ao = 0;
      return realVert.apply(this, a);
    };
    makeMesh = (g, o) => Object.assign({ geo: g }, o);
    mount = function (g, rx, rz, side, along, fn, o) {
      const rec = { rx, rz, side, fn, win: !!(o && o.win), i0: g.i.length, M: null };
      const ok = realMount(g, rx, rz, side, along, (gg) => ((rec.M = gg.mat), fn(gg)), o);
      rec.i1 = g.i.length;
      if (ok && inB(rx, rz)) marks.push(rec);
      return ok;
    };
    doors = buildDoors();
    decor = buildDecor();
  } finally {
    mount = realMount;
    makeMesh = realMesh;
    Geo.prototype.vert = realVert;
  }
  const g0 = decor[0].geo;
  for (const rec of marks) {
    const g = sheetTake(new Geo(), g0, rec.i0, rec.i1, rec.M);
    // a lit piece (the exit sign's face) went into its light group's Geo: found by the wall cell it rides on, on
    // this side of the wall
    const cx = rec.rx + SIDE[rec.side][0] + 1000.5,
      cz = rec.rz + SIDE[rec.side][1] + 0.5;
    if (rec.fn.toString().includes('L('))
      for (const m of decor.slice(1)) {
        const lg = m.geo,
          on = (k, q) => lg.e[lg.i[k] * 4 + 2] === cx && lg.e[lg.i[k] * 4 + 3] === cz && q.every((p) => p[2] > -0.05);
        sheetTake(g, lg, 0, lg.i.length, rec.M, on);
      }
    const at = rec.rx + ',' + rec.rz + ' ' + rec.side;
    if (rec.win) add('window', 'At a window (blinds, curtains)', at, g);
    else {
      const key = sheetDecorKey(rec.fn);
      add('wall-' + key, 'On the wall: ' + key.replace('-', ', '), at, g);
    }
  }
  for (const m of doors) {
    const d = m.door;
    if (d.lair || !(inB(d.x, d.z - 1) || inB(d.x, d.z + 1) || inB(d.x - 1, d.z) || inB(d.x + 1, d.z))) continue;
    const glass = m.geo.e.some((v, k) => k % 4 === 1 && v === 1);
    add('door', glass ? 'Glass door' : 'Door', d.x + ',' + d.z, sheetTake(new Geo(), m.geo, 0, m.geo.i.length, null));
  }
  return out;
}

const SHEET_VS = `#version 300 es
layout(location=0) in vec3 aP; layout(location=1) in vec3 aN; layout(location=2) in vec3 aC; layout(location=3) in vec4 aE;
uniform mat4 uVP;
out vec3 vN; out vec3 vC; out vec4 vE;
void main(){ vN = aN; vC = aC; vE = aE; gl_Position = uVP * vec4(aP, 1.0); }`;
const SHEET_FS = `#version 300 es
precision highp float;
in vec3 vN; in vec3 vC; in vec4 vE;
uniform vec3 uKey; uniform vec3 uFill; uniform vec3 uEye; uniform float uAlpha;
out vec4 o;
void main(){
  vec3 n = normalize(vN);
  if (dot(n, uEye) < 0.0) n = -n;                                   // the back of a leaf, a face drawn inside out
  vec3 amb = mix(vec3(0.30, 0.29, 0.28), vec3(0.47, 0.48, 0.51), 0.5 + 0.5 * n.y);
  vec3 col = vC * (amb + vec3(1.0, 0.97, 0.92) * 0.72 * max(dot(n, uKey), 0.0)
                       + vec3(0.85, 0.9, 1.0) * 0.24 * max(dot(n, uFill), 0.0));
  float m = vE.y, shiny = (m > 0.5 && m < 1.5) || abs(m - ${2 + MAT.metal}.0) < 0.5 ? 1.0 : 0.0;
  col += shiny * 0.35 * pow(max(dot(n, normalize(uKey + uEye)), 0.0), 40.0);
  col = mix(col, vC * 1.15, clamp(vE.x, 0.0, 1.0));                   // screens, bulbs: lit from inside
  o = vec4(col, uAlpha);
}`;
// a floor of 0.5 m squares under the footprint, 1 m lines darker
function sheetFloor(b) {
  const g = new Geo(),
    x0 = Math.floor(b[0] * 2) / 2 - 1,
    x1 = Math.ceil(b[3] * 2) / 2 + 1,
    z0 = Math.floor(b[2] * 2) / 2 - 1,
    z1 = Math.ceil(b[5] * 2) / 2 + 1;
  g.box(x0, -0.006, z0, x1, -0.004, z1, [0.8, 0.79, 0.76]);
  const line = (k) => (Math.abs(k - Math.round(k)) < 1e-6 ? [0.52, 0.52, 0.5] : [0.66, 0.66, 0.63]);
  for (let x = x0; x <= x1 + 1e-6; x += 0.5) g.box(x - 0.006, -0.004, z0, x + 0.006, -0.002, z1, line(x));
  for (let z = z0; z <= z1 + 1e-6; z += 0.5) g.box(x0, -0.004, z - 0.006, x1, -0.002, z + 0.006, line(z));
  return g;
}
function sheetBounds(g) {
  const b = [1e9, 1e9, 1e9, -1e9, -1e9, -1e9];
  for (let v = 0; v < g.vc; v++)
    for (let k = 0; k < 3; k++) {
      b[k] = Math.min(b[k], g.p[v * 3 + k]);
      b[k + 3] = Math.max(b[k + 3], g.p[v * 3 + k]);
    }
  return b;
}
function sheetUpload(c, g, glass) {
  const vao = c.createVertexArray();
  c.bindVertexArray(vao);
  [
    [g.p, 3],
    [g.n, 3],
    [g.c, 3],
    [g.e, 4],
  ].forEach(([a, n], k) => {
    c.bindBuffer(c.ARRAY_BUFFER, c.createBuffer());
    c.bufferData(c.ARRAY_BUFFER, new Float32Array(a), c.STATIC_DRAW);
    c.enableVertexAttribArray(k);
    c.vertexAttribPointer(k, n, c.FLOAT, false, 0, 0);
  });
  // glass last, see-through, so what's behind it shows
  const solid = [],
    clear = [];
  for (let k = 0; k < g.i.length; k += 3) {
    const e = g.e[g.i[k] * 4 + 1];
    (glass && e > 0.5 && e < 1.5 ? clear : solid).push(g.i[k], g.i[k + 1], g.i[k + 2]);
  }
  c.bindBuffer(c.ELEMENT_ARRAY_BUFFER, c.createBuffer());
  c.bufferData(c.ELEMENT_ARRAY_BUFFER, new Uint32Array(solid.concat(clear)), c.STATIC_DRAW);
  c.bindVertexArray(null);
  return { vao, solid: solid.length, clear: clear.length };
}
async function objectSheets(bld = 'office') {
  const S = SHEET.px * SHEET.ss,
    cv = document.createElement('canvas');
  cv.width = cv.height = S;
  const c = cv.getContext('webgl2', { antialias: true, preserveDrawingBuffer: true, alpha: false });
  const sh = (type, src) => {
    const s = c.createShader(type);
    c.shaderSource(s, src);
    c.compileShader(s);
    if (!c.getShaderParameter(s, c.COMPILE_STATUS)) throw new Error(c.getShaderInfoLog(s));
    return s;
  };
  const prog = c.createProgram();
  c.attachShader(prog, sh(c.VERTEX_SHADER, SHEET_VS));
  c.attachShader(prog, sh(c.FRAGMENT_SHADER, SHEET_FS));
  c.linkProgram(prog);
  const u = (n) => c.getUniformLocation(prog, n);
  const pitch = cam.pitch,
    cp = Math.cos(pitch),
    sp = Math.sin(pitch),
    out = [];
  for (const it of sheetItems(bld)) {
    const b = sheetBounds(it.g),
      mid = [(b[0] + b[3]) / 2, (b[1] + b[4]) / 2, (b[2] + b[5]) / 2];
    // one scale for all four views: the widest the box gets on screen from any of them
    const views = SHEET_VIEWS.map((_, k) => {
      const yaw = (k === 3 ? -1 : k) * (Math.PI / 2),
        eye = [Math.sin(yaw) * cp, sp, Math.cos(yaw) * cp];
      const view = M4.lookAt([mid[0] + eye[0] * 60, mid[1] + eye[1] * 60, mid[2] + eye[2] * 60], mid, [0, 1, 0]);
      let r = 0;
      for (let k2 = 0; k2 < 8; k2++) {
        const q = M4.xform(view, b[k2 & 1 ? 3 : 0], b[k2 & 2 ? 4 : 1], b[k2 & 4 ? 5 : 2]);
        r = Math.max(r, Math.abs(q[0]), Math.abs(q[1]));
      }
      return { yaw, eye, view, r };
    });
    const half = Math.max(0.15, ...views.map((v) => v.r)) * 1.12;
    const meshes = [sheetUpload(c, it.g, true)];
    if (!it.wall) meshes.unshift(sheetUpload(c, sheetFloor(b), false));
    const atlas = document.createElement('canvas');
    atlas.width = SHEET.px * 2;
    atlas.height = SHEET.head + SHEET.px * 2;
    const a2 = atlas.getContext('2d');
    a2.fillStyle = '#26282b';
    a2.fillRect(0, 0, atlas.width, atlas.height);
    views.forEach((v, k) => {
      const right = [Math.cos(v.yaw), 0, -Math.sin(v.yaw)],
        nrm = (p) => {
          const l = Math.hypot(p[0], p[1], p[2]);
          return [p[0] / l, p[1] / l, p[2] / l];
        };
      c.viewport(0, 0, S, S);
      c.clearColor(0.9, 0.9, 0.88, 1);
      c.clear(c.COLOR_BUFFER_BIT | c.DEPTH_BUFFER_BIT);
      c.enable(c.DEPTH_TEST);
      c.useProgram(prog);
      c.uniformMatrix4fv(u('uVP'), false, M4.mul(M4.ortho(-half, half, -half, half, 1, 160), v.view));
      c.uniform3fv(u('uEye'), v.eye);
      c.uniform3fv(u('uKey'), nrm([v.eye[0] * 0.7 - right[0] * 0.55, 0.85, v.eye[2] * 0.7 - right[2] * 0.55]));
      c.uniform3fv(u('uFill'), nrm([v.eye[0] * 0.5 + right[0] * 0.8, 0.15, v.eye[2] * 0.5 + right[2] * 0.8]));
      for (const m of meshes) {
        c.bindVertexArray(m.vao);
        c.uniform1f(u('uAlpha'), 1);
        c.disable(c.BLEND);
        c.depthMask(true);
        c.drawElements(c.TRIANGLES, m.solid, c.UNSIGNED_INT, 0);
        if (!m.clear) continue;
        c.enable(c.BLEND);
        c.blendFunc(c.SRC_ALPHA, c.ONE_MINUS_SRC_ALPHA);
        c.depthMask(false);
        c.uniform1f(u('uAlpha'), 0.42);
        c.drawElements(c.TRIANGLES, m.clear, c.UNSIGNED_INT, m.solid * 4);
      }
      c.depthMask(true);
      const x = (k % 2) * SHEET.px,
        y = SHEET.head + Math.floor(k / 2) * SHEET.px;
      a2.drawImage(cv, 0, 0, S, S, x, y, SHEET.px, SHEET.px);
      a2.fillStyle = 'rgba(20,22,24,0.72)';
      a2.fillRect(x, y, SHEET.px, 34);
      a2.fillStyle = '#f0ede6';
      a2.font = '600 17px system-ui, sans-serif';
      a2.fillText(
        k +
          1 +
          ' · ' +
          SHEET_VIEWS[k][0] +
          '  (camera yaw ' +
          ((k === 3 ? 270 : k * 90) + '°)  —  ') +
          SHEET_VIEWS[k][1],
        x + 12,
        y + 23,
      );
    });
    a2.strokeStyle = '#26282b';
    a2.lineWidth = 3;
    a2.beginPath();
    a2.moveTo(SHEET.px, SHEET.head);
    a2.lineTo(SHEET.px, atlas.height);
    a2.moveTo(0, SHEET.head + SHEET.px);
    a2.lineTo(atlas.width, SHEET.head + SHEET.px);
    a2.stroke();
    const dim = (k) => (b[k + 3] - b[k]).toFixed(2);
    a2.fillStyle = '#f0ede6';
    a2.font = '700 26px system-ui, sans-serif';
    a2.fillText(it.name + '   ·   ' + it.file, 16, 32);
    a2.font = '15px system-ui, sans-serif';
    a2.fillStyle = '#b8b4aa';
    a2.fillText(
      'W ' +
        dim(0) +
        ' × H ' +
        dim(1) +
        ' × D ' +
        dim(2) +
        ' m' +
        (it.wall ? '   ·   z = 0 is the wall' : '   ·   grid 0.5 m') +
        '   ·   ortho, pitch ' +
        Math.round((pitch * 180) / Math.PI) +
        '°   ·   at ' +
        (it.where.length > 8
          ? it.where.slice(0, 8).join(', ') + ' … ' + it.where.length + ' in all'
          : it.where.join(', ')),
      16,
      58,
    );
    for (const m of meshes) c.deleteVertexArray(m.vao);
    const blob = await new Promise((res) => atlas.toBlob(res, 'image/png'));
    out.push({ file: it.file + '.png', name: it.name, size: [dim(0), dim(1), dim(2)], where: it.where, blob });
  }
  return out;
}
window.__dev.objectSheets = objectSheets;
// opened as …dev.html#sheets=office by tools/object_sheets.py: draw them all and post them back to it
if (/^#sheets=/.test(location.hash))
  window.addEventListener('load', () =>
    setTimeout(async () => {
      const bld = location.hash.slice(8),
        list = await objectSheets(bld);
      for (const s of list)
        await fetch('/sheets/save?f=' + encodeURIComponent(s.file), { method: 'POST', body: s.blob });
      await fetch('/sheets/done', {
        method: 'POST',
        body: JSON.stringify(list.map(({ file, name, size, where }) => ({ file, name, size, where }))),
      });
      document.title = 'sheets done: ' + list.length;
    }, 300),
  );
