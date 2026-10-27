//@ gfx/renderer — Renderer state, camera, frame setup
//@ Defines: CAM_ZOOM, initRender, initParticles, QUALITY, qualityTick, resizeCanvas, ensureTargets, updateCamera, screenRay, rayGround, rayBox, project, ZERO3, setMeshUniforms, drawMesh, PART_M, …
//@ Uses:    gfx/gl, gfx/post, core/util, gfx/shaders-fx, world/vision, gfx/world-geometry, world/light-map, world/grid, horror/layer, world/objects, …
//@ (header made by tools/map.js; stripped by build.py)
// ───────────────────────── renderer ─────────────────────────
const R = { ready: false, objMeshes: [], doorMeshes: [], itemMeshes: new Map(), time: 0, portraits: {}, snaps: {}, hoverMesh: null, hoverChar: null, goalObj: null, goalChar: null, hdr: false, tw: 0, th: 0, flash: 0, pulse: 0, lampP: new Float32Array(48), lampC: new Float32Array(48), lampN: 0, haze: 0 };
const CAM_ZOOM = 5.75;   // the in-game framing: 15% further out than the old 5.0
const cam = { tx: 8, tz: 22, yaw: Math.PI / 4, yawT: Math.PI / 4, zoom: 8.5, zoomT: 8.5, pitch: 0.6, follow: true, wallsDown: 0, VP: null, view: null, right: [1, 0, 0], up: [0, 1, 0], fwd: [0, 0, -1], eye: [0, 0, 0], halfW: 1, halfH: 1 };

function initRender(canvas) {
  gl = canvas.getContext('webgl2', { antialias: false, alpha: false, depth: true, powerPreference: 'high-performance' });
  if (!gl) throw new Error('WebGL2 unavailable');
  R.canvas = canvas;
  R.hdr = !!gl.getExtension('EXT_color_buffer_float');
  R.main = compileProgram(VS, FS);
  R.decal = compileProgram(DVS, DFS);
  R.glow = compileProgram(GVS, GFS);
  R.cone = compileProgram(CVS, CFS);
  R.beam = compileProgram(CVS, BFS);
  R.rain = compileProgram(RVS, RFS);
  R.dust = compileProgram(PVS, PFS);
  R.bright = compileProgram(QVS, BRIGHT_FS);
  R.down = compileProgram(QVS, DOWN_FS);
  R.up = compileProgram(QVS, UP_FS);
  R.comp = compileProgram(QVS, COMP_FS);
  R.emptyVao = gl.createVertexArray();
  initPrims();
  R.tLight = makeTex(TW, TH); R.tVis = makeTex(TW, TH);
  gl.bindTexture(gl.TEXTURE_2D, R.tLight); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR); gl.generateMipmap(gl.TEXTURE_2D);
  R.floor = buildFloor();
  R.walls = buildWalls();
  R.marks = buildMarks();
  R.doorMeshes = buildDoors();
  for (const o of OBJ) { if (o.t.ghost) continue; const m = buildObject(o); if (m) R.objMeshes.push(m); }
  R.decor = buildDecor();
  R.glows = []; R.cones = [];
  for (const o of OBJ) {
    const f = DIRS[o.face];
    if (o.type === 'streetlamp') { const p = [o.cx + f[0] * 0.9, 3.9, o.cz + f[1] * 0.9]; R.glows.push({ o, p, col: [1, 0.62, 0.25], size: 1.2, grp: 'street' }); R.cones.push({ o, p, r: 1.9, h: 3.9, col: [1, 0.6, 0.26], a: 0.1, grp: 'street' }); }
    if (o.type === 'parklamp') { const p = [o.cx, 2.98, o.cz]; R.glows.push({ o, p, col: [1, 0.7, 0.35], size: 1.0, grp: 'street' }); R.cones.push({ o, p, r: 1.5, h: 2.98, col: [1, 0.7, 0.38], a: 0.09, grp: 'street' }); }
    if (o.type === 'alleylamp') { const p = [o.cx + f[0] * 0.4, 2.36, o.cz + f[1] * 0.4]; R.glows.push({ o, p, col: [1, 0.9, 0.6], size: 0.8, grp: 'street' }); R.cones.push({ o, p, r: 1.3, h: 2.36, col: [1, 0.9, 0.62], a: 0.09, grp: 'street' }); }
    if (o.type === 'vending') R.glows.push({ o, p: [o.cx, 1.2, o.cz + 0.5], col: [0.5, 0.75, 0.85], size: 0.8, grp: 'always' });
  }
  for (const gw of R.glows) if (gw.o) gw.light = LIGHTS.find((l) => l.x === gw.o.x && l.z === gw.o.z);
  for (const cn of R.cones) cn.light = LIGHTS.find((l) => l.x === cn.o.x && l.z === cn.o.z);
  R.glows.push({ p: [35.5, 2.5, 12.7], col: [1, 0.25, 0.45], size: 1.0, grp: 'shopSign' });
  R.glows.push({ p: [13.5, 2.35, 11.6], col: [1, 0.15, 0.1], size: 0.45, grp: 'officeNight' });
  for (const gw of R.glows) if (!gw.o && gw.grp !== 'always') { gw.light = LIGHTS.find((l) => l.grp === gw.grp && l.col[1] < 0.4); gw.spec = 0.9; }
  for (const m of R.objMeshes) { const o = m.obj; m.light = LIGHTS.find((l) => l.x === o.x && l.z === o.z && l.grp === 'street'); }
  lairRenderInit();
  initParticles();
  R.ready = true;
}
function initParticles() {
  const N = 1300, a = new Float32Array(N * 4);
  for (let i = 0; i < N; i++) { const lair = i >= 760; a[i * 4] = rand(0, W); a[i * 4 + 1] = rand(0.25, 2.3); a[i * 4 + 2] = lair ? rand(LAIR_Z0, H) : rand(0, TOWN_H); a[i * 4 + 3] = rand(0, 100); }
  R.dustVao = gl.createVertexArray(); gl.bindVertexArray(R.dustVao);
  let b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, a, gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 4, gl.FLOAT, false, 0, 0);
  R.dustN = N;
  const RN = 2400, seed = new Float32Array(RN * 8), end = new Float32Array(RN * 2);
  for (let i = 0; i < RN; i++) { const s = [Math.random(), Math.random(), Math.random(), rand(0.95, 1.35)]; for (let k = 0; k < 2; k++) { seed.set(s, (i * 2 + k) * 4); end[i * 2 + k] = k; } }
  R.rainVao = gl.createVertexArray(); gl.bindVertexArray(R.rainVao);
  b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, seed, gl.STATIC_DRAW); gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 4, gl.FLOAT, false, 0, 0);
  b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, end, gl.STATIC_DRAW); gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 1, gl.FLOAT, false, 0, 0);
  R.rainN = RN;
  gl.bindVertexArray(null);
}

// ── adaptive resolution. On a GPU that can't keep up, frames pile up and the game stutters; rendering fewer
// pixels fixes that far better than anything on the CPU side. If frames run slow for a few seconds together, the
// drawing buffer shrinks a step (down to 60% of normal); after half a minute of smooth frames it grows back a step.
// A single slow frame (a save, a portrait) never triggers it, and a paused tab doesn't count.
const QUALITY = { scale: 1, slow: 0, fast: 0 };
function qualityTick(ms) {
  if (document.hidden || ms > 250) return;
  if (ms > 40) { QUALITY.slow += ms; QUALITY.fast = 0; }   // under 25 fps (a 30 fps power-saving cap doesn't count)
  else { QUALITY.slow = Math.max(0, QUALITY.slow - ms * 0.5); if (ms < 18) QUALITY.fast += ms; }
  if (QUALITY.slow > 3000 && QUALITY.scale > 0.6) { QUALITY.scale = Math.max(0.6, QUALITY.scale - 0.15); QUALITY.slow = 0; QUALITY.fast = 0; }
  else if (QUALITY.fast > 30000 && QUALITY.scale < 1) { QUALITY.scale = Math.min(1, QUALITY.scale + 0.15); QUALITY.fast = 0; }
}
function resizeCanvas() {
  const dpr = (window.__LOWQ ? 1 : Math.min(window.devicePixelRatio || 1, 1.75)) * QUALITY.scale;
  const w = Math.max(1, Math.floor(R.canvas.clientWidth * dpr)), h = Math.max(1, Math.floor(R.canvas.clientHeight * dpr));
  if (R.canvas.width !== w || R.canvas.height !== h) { R.canvas.width = w; R.canvas.height = h; }
}
function ensureTargets() {
  const w = R.canvas.width, h = R.canvas.height;
  if (R.tw === w && R.th === h && R.msFb) return;
  R.tw = w; R.th = h;
  if (R.msFb) { gl.deleteFramebuffer(R.msFb); gl.deleteRenderbuffer(R.msColor); gl.deleteRenderbuffer(R.msDepth); R.msFb = null; }
  freeTarget(R.scene); freeTarget(R.mask); (R.blm || []).forEach(freeTarget);
  const build = (hdr, samples) => {
    const fmt = hdr ? gl.RGBA16F : gl.RGBA8;
    const fb = gl.createFramebuffer(), cr = gl.createRenderbuffer(), dr = gl.createRenderbuffer();
    gl.bindRenderbuffer(gl.RENDERBUFFER, cr); gl.renderbufferStorageMultisample(gl.RENDERBUFFER, samples, fmt, w, h);
    gl.bindRenderbuffer(gl.RENDERBUFFER, dr); gl.renderbufferStorageMultisample(gl.RENDERBUFFER, samples, gl.DEPTH_COMPONENT24, w, h);
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.RENDERBUFFER, cr);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, dr);
    if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) { gl.deleteFramebuffer(fb); gl.deleteRenderbuffer(cr); gl.deleteRenderbuffer(dr); return false; }
    R.msFb = fb; R.msColor = cr; R.msDepth = dr; return true;
  };
  const samples = window.__LOWQ ? 0 : Math.min((window.devicePixelRatio || 1) > 1.5 ? 2 : 4, gl.getParameter(gl.MAX_SAMPLES) || 0);
  let ok = false;
  if (R.hdr) ok = build(true, samples) || build(true, 0);
  if (!ok) { R.hdr = false; ok = build(false, samples) || build(false, 0); }
  R.scene = makeTarget(w, h, R.hdr);
  R.mask = makeTarget(Math.max(1, w >> 1), Math.max(1, h >> 1), false);
  R.blm = []; let bw = w >> 1, bh = h >> 1;
  for (let k = 0; k < 5; k++) { R.blm.push(makeTarget(Math.max(1, bw), Math.max(1, bh), R.hdr)); bw >>= 1; bh >>= 1; }
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
}

function updateCamera(dtReal) {
  cam.yaw += angDiff(cam.yaw, cam.yawT) * Math.min(1, dtReal * 8);
  if (Math.abs(angDiff(cam.yaw, cam.yawT)) < 0.002) cam.yaw = cam.yawT;   // settle exactly, so W runs dead straight down a corridor
  cam.zoom += (cam.zoomT - cam.zoom) * Math.min(1, dtReal * 10);
  const aspect = R.canvas.width / Math.max(1, R.canvas.height);
  cam.halfH = cam.zoom; cam.halfW = cam.zoom * aspect;
  const d = 60, cp = Math.cos(cam.pitch), sp = Math.sin(cam.pitch);
  const sk = HX.shake > 0 ? HX.shake * 0.09 : 0;
  const t = [cam.tx + HX.camX + (sk ? Math.sin(R.time * 53) * sk : 0), 0.8, cam.tz + HX.camZ + (sk ? Math.cos(R.time * 47) * sk : 0)];
  cam.eye = [t[0] + d * cp * Math.sin(cam.yaw), t[1] + d * sp, t[2] + d * cp * Math.cos(cam.yaw)];
  cam.view = M4.lookAt(cam.eye, t, [0, 1, 0]);
  cam.VP = M4.mul(M4.ortho(-cam.halfW, cam.halfW, -cam.halfH, cam.halfH, 1, 160), cam.view);
  const v = cam.view;
  cam.right = [v[0], v[4], v[8]]; cam.up = [v[1], v[5], v[9]]; cam.fwd = [-v[2], -v[6], -v[10]];
}
function screenRay(px, py) {
  const r = R.canvas.getBoundingClientRect();
  const nx = ((px - r.left) / r.width) * 2 - 1, ny = -(((py - r.top) / r.height) * 2 - 1);
  const o = [0, 1, 2].map((k) => cam.eye[k] + cam.right[k] * nx * cam.halfW + cam.up[k] * ny * cam.halfH);
  return { o, d: cam.fwd };
}
function rayGround(ray, y = 0) { const t = (y - ray.o[1]) / ray.d[1]; return [ray.o[0] + ray.d[0] * t, ray.o[2] + ray.d[2] * t]; }
function rayBox(ray, mn, mx) {
  let t0 = -1e9, t1 = 1e9;
  for (let k = 0; k < 3; k++) {
    if (Math.abs(ray.d[k]) < 1e-9) { if (ray.o[k] < mn[k] || ray.o[k] > mx[k]) return null; continue; }
    let a = (mn[k] - ray.o[k]) / ray.d[k], b = (mx[k] - ray.o[k]) / ray.d[k];
    if (a > b) [a, b] = [b, a];
    t0 = Math.max(t0, a); t1 = Math.min(t1, b);
    if (t0 > t1) return null;
  }
  return t0;
}
function project(x, y, z) {
  const p = M4.xform(cam.VP, x, y, z);
  const r = R.canvas.getBoundingClientRect();
  return [((p[0] / p[3]) * 0.5 + 0.5) * r.width, (1 - ((p[1] / p[3]) * 0.5 + 0.5)) * r.height];
}

// ── drawing helpers
let U = null;
const ZERO3 = [0, 0, 0];
function setMeshUniforms(m) {
  gl.uniformMatrix4fv(U.uModel, false, m.model);
  gl.uniform3fv(U.uTint, m.tint); gl.uniform3fv(U.uEmit, m.emit); gl.uniform1f(U.uEmitMul, m.emitMul);
  gl.uniform1f(U.uHi, m.hi); gl.uniform1f(U.uDyn, m.dyn); gl.uniform1i(U.uCut, m.cut); gl.uniform3fv(U.uCenter, m.center); gl.uniform1f(U.uSpec, m.spec || 0);
}
function drawMesh(m) { if (!m.show) return; setMeshUniforms(m); gl.bindVertexArray(m.vao); gl.drawElements(gl.TRIANGLES, m.count, gl.UNSIGNED_INT, 0); }
let drawHi = 0, drawSpec = 0;
// part() and partR() run hundreds of times a frame (every limb of every person), so they build their matrices in
// scratch arrays instead of allocating new ones: the matrix only lives until it's handed to the GPU.
const PART_M = new Float32Array(16), PART_J = new Float32Array(16);
function part(M, cx, cy, cz, sx, sy, sz, prim, col, emit) {
  const m = M4.partInto(PART_M, M, cx, cy, cz, sx, sy, sz);
  gl.uniformMatrix4fv(U.uModel, false, m);
  gl.uniform3fv(U.uTint, col);
  gl.uniform3fv(U.uEmit, emit || ZERO3);
  gl.uniform1f(U.uHi, drawHi);
  gl.uniform1f(U.uSpec, drawSpec);
  const p = PRIM[prim];
  gl.bindVertexArray(p.vao); gl.drawElements(gl.TRIANGLES, p.count, gl.UNSIGNED_INT, 0);
}
function partR(M, cx, cy, cz, rx, ry, rz, sx, sy, sz, prim, col, emit) { part(M4.jointInto(PART_J, M, cx, cy, cz, rx, ry, rz), 0, 0, 0, sx, sy, sz, prim, col, emit); }

