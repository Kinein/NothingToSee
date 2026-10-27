//@ gfx/draw-helpers — Glow switches, long shadows, floor decals, main-shader setup, lamp gathering and tints
//@ Defines: emitFor, lumBi, longShadow, DECAL_ID, DECAL_M, DECAL_J, DECAL_S, drawDecal, drawDecalR, useMain, gatherLamps, moodColor, glowCol, glowK, lampTint, FRUSTUM, …
//@ Uses:    gfx/renderer, gfx/gl, sim/core, core/util, world/light-map, world/grid, sim/pose, gfx/post, horror/layer, town/traffic-weather, …
//@ (header made by tools/map.js; stripped by build.py)
// which glowing parts are switched on right now
function emitFor(m) {
  const o = m.obj, t = o.type;
  if (o.house) return G && G.houseLit && G.houseLit[o.house] ? 1 : 0.05;
  switch (t) {
    case 'tv': return G.tvOn ? 0.75 + 0.25 * Math.sin(R.time * 11) * Math.sin(R.time * 3.7) : 0.04;
    case 'floorlamp': return G.homeLights ? 1 : 0.05;
    case 'nightstand': return o.x === 9 ? (G.homeLights ? 1 : 0.05) : G.agnesLights ? 1 : 0.05;
    case 'oldtv': return G.agnesLights ? 0.6 + 0.3 * Math.sin(R.time * 7) : 0.04;
    case 'streetlamp': case 'parklamp': case 'alleylamp': return lightGroupOn('street') ? (m.light ? m.light.cur : 1) * Math.max(0.03, hxLamp(o)) : 0.03;
    case 'desk': case 'bossdesk': return officeLit() ? 0.7 : 0.1;
    case 'pcdesk': { const a = PLAYER.queue[0]; return a && a.obj === OBJ_BY_ID.pcChair && a.stage === 'run' ? 1 : 0.08; }
    case 'cooler': case 'shopcounter': return shopOpen() ? 0.8 : 0.12;
    case 'parkedcar': return 0.02;
  }
  return 0.8;
}
// a figure's shadow stretched away from whatever is lighting it: long under a lamp, gone in the dark
function lumBi(x, z) {
  const fx = x - 0.5, fz = z - 0.5, x0 = Math.floor(fx), z0 = Math.floor(fz), tx = fx - x0, tz = fz - z0;
  const L = (a, b) => (inb(a, b) && !WALLISH.has(tiles[I(a, b)]) ? cellLum(I(a, b)) : null);
  let s = 0, wsum = 0;
  for (const [a, b, w] of [[x0, z0, (1 - tx) * (1 - tz)], [x0 + 1, z0, tx * (1 - tz)], [x0, z0 + 1, (1 - tx) * tz], [x0 + 1, z0 + 1, tx * tz]]) { const v = L(a, b); if (v != null) { s += v * w; wsum += w; } }
  return wsum > 0 ? s / wsum : 0;
}
function longShadow(c) {
  const x = drawX(c), z = drawZ(c), gx = lumBi(x + 0.8, z) - lumBi(x - 0.8, z), gz = lumBi(x, z + 0.8) - lumBi(x, z - 0.8), gm = Math.hypot(gx, gz);
  if (gm < 0.03) return;
  const k = clamp((gm - 0.03) * 2.4, 0, 1), dx = -gx / gm, dz = -gz / gm, len = 0.55 + 1.5 * k;
  drawDecalR(x + dx * len * 0.55, z + dz * len * 0.55, 0.26, len * 0.62, Math.atan2(dx, dz), [0, 0, 0, 0.4 * k * c.shown], 0, 0, (c.y || 0) + 0.0115);
}
const DECAL_ID = M4.ident(), DECAL_M = new Float32Array(16), DECAL_J = new Float32Array(16), DECAL_S = M4.ident();
function drawDecal(x, z, r, col, shape, y = 0.012) {
  gl.uniformMatrix4fv(R.decal.U.uModel, false, M4.partInto(DECAL_M, DECAL_ID, x, y, z, r, 1, r));   // = T * S, without new arrays
  gl.uniform4fv(R.decal.U.uColor, col); gl.uniform1i(R.decal.U.uShape, shape);
  gl.bindVertexArray(PRIM.quad.vao); gl.drawElements(gl.TRIANGLES, PRIM.quad.count, gl.UNSIGNED_INT, 0);
}
function drawDecalR(x, z, sx, sz, rot, col, shape, seed, y = 0.013) {
  DECAL_S[0] = sx; DECAL_S[10] = sz;   // = T * Ry * S, without new arrays
  gl.uniformMatrix4fv(R.decal.U.uModel, false, M4.mulInto(DECAL_M, M4.jointInto(DECAL_J, DECAL_ID, x, y, z, 0, rot, 0), DECAL_S));
  gl.uniform4fv(R.decal.U.uColor, col); gl.uniform1i(R.decal.U.uShape, shape); gl.uniform1f(R.decal.U.uSeed, seed);
  gl.bindVertexArray(PRIM.quad.vao); gl.drawElements(gl.TRIANGLES, PRIM.quad.count, gl.UNSIGNED_INT, 0);
}
function useMain(mode) {
  const M = R.main; U = M.U; gl.useProgram(M.p);
  gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, R.tLight); gl.uniform1i(U.uLight, 0);
  gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, R.tVis); gl.uniform1i(U.uVis, 1);
  gl.uniformMatrix4fv(U.uVP, false, cam.VP); gl.uniformMatrix4fv(U.uView, false, cam.view);
  gl.uniform2f(U.uMap, W, H); gl.uniform1f(U.uTime, R.time);
  const pl = G && G.started && PLAYER && PLAYER.onMap ? [PLAYER.x, 1.0, PLAYER.z] : [cam.tx, 1.0, cam.tz];
  gl.uniform3fv(U.uFocus, cam.follow ? pl : [cam.tx, 1.0, cam.tz]); gl.uniform3fv(U.uFocus2, pl); gl.uniform1f(U.uCutR, 7.5 * Math.max(0.8, cam.zoom / 8.5)); gl.uniform1f(U.uWallsDown, cam.wallsDown);
  gl.uniform3fv(U.uFog, FOG_COL); gl.uniform1i(U.uMode, mode);
  const fl = Math.hypot(cam.fwd[0], cam.fwd[2]) || 1;
  gl.uniform1f(U.uWet, G ? G.wet || 0 : 0); gl.uniform2f(U.uFwd, cam.fwd[0] / fl, cam.fwd[2] / fl); gl.uniform3fv(U.uSky, STY.sky);
  gl.uniform1f(U.uEmitK, R.hdr ? 2.3 : 1.45);
  if (U.uLP) { gl.uniform4fv(U.uLP, R.lampP); gl.uniform4fv(U.uLC, R.lampC); gl.uniform1i(U.uLN, R.lampN); }
  gl.uniform1f(U.uRain, G ? G.rainK || 0 : 0); gl.uniform1f(U.uHaze, R.haze || 0); gl.uniform1f(U.uStK, STY.k);
  { const nk = clamp(1 - (SKY[0] * 0.3 + SKY[1] * 0.59 + SKY[2] * 0.11) / 0.35, 0, 1), rc = mix3([0.05, 0.05, 0.052], [0.065, 0.09, 0.15], nk);
    gl.uniform3fv(U.uRimC, mix3(rc, [0.03, 0.09, 0.1], STY.k * 0.6)); gl.uniform1f(U.uChar, 0); }
  hxMainUniforms(U);
}
// the lamps the shader lights by hand this frame: the nearest twelve that are burning, in their render colour
function gatherLamps() {
  const L = [], cx = cam.tx, cz = cam.tz;
  for (const gw of R.glows) {
    const l = gw.light; if (!l || !lightGroupOn(gw.grp)) continue;
    const k = (l.cur == null ? 1 : l.cur) * hxLamp(gw.o) * (gw.pool == null ? 1 : gw.pool);
    if (k < 0.04) continue;
    const d = Math.hypot(gw.p[0] - cx, gw.p[2] - cz); if (d > 30) continue;
    const c = l.rcol || l.col, s = l.int * k * (gw.spec || 0.7);
    L.push({ d, x: gw.p[0], y: gw.p[1], z: gw.p[2], r: l.r * 0.62, c: [c[0] * s, c[1] * s, c[2] * s], pool: gw.o ? 1 : 0 });
  }
  if (carNight()) for (const c of CARS) {
    const d = Math.hypot(c.x - cx, c.z - cz); if (d > 26) continue;
    for (const s of [-1, 1]) {
      L.push({ d, x: c.x + c.dir * 1.0, y: 0.42, z: c.z + s * 0.3, r: 3.2, c: [0.55, 0.5, 0.42], pool: 0 });
      L.push({ d: d + 0.1, x: c.x - c.dir * 1.0, y: 0.42, z: c.z + s * 0.32, r: 2.6, c: [0.75, 0.05, 0.03], pool: 0 });
    }
  }
  L.sort((a, b) => a.d - b.d);
  const n = Math.min(12, L.length);
  for (let k = 0; k < n; k++) { const l = L[k]; R.lampP.set([l.x, l.y, l.z, l.r], k * 4); R.lampC.set([l.c[0], l.c[1], l.c[2], l.pool], k * 4); }
  R.lampN = n;
}
function moodColor() {
  const m = mood();
  return m > 62 ? [0.62, 0.86, 0.56] : m > 40 ? [0.95, 0.74, 0.36] : [0.95, 0.38, 0.3];
}

// a lamp's halo, shaft and bulb follow its render colour, so a lamp that has gone red is red all the way down
const nrm3 = (c) => { const m = Math.max(c[0], c[1], c[2]) || 1; return [c[0] / m, c[1] / m, c[2] / m]; };
function glowCol(gw, base) {
  const l = gw.light; if (!l || !l.rcol || STY.k < 0.004) return base;
  return mix3(base, nrm3(l.rcol), sstep(0, 0.25, STY.k));
}
function glowK(gw) { const l = gw.light; if (!l || !l.rcol) return 1; return clamp(Math.max(l.rcol[0], l.rcol[1], l.rcol[2]) / (Math.max(l.col[0], l.col[1], l.col[2]) || 1), 0, 1.6); }
function lampTint(l) {
  if (!l || !l.rcol || STY.k < 0.004) return [1, 1, 1];
  const a = nrm3(l.rcol), b = nrm3(l.col);
  return [clamp(a[0] / Math.max(b[0], 0.05), 0, 1.6), clamp(a[1] / Math.max(b[1], 0.05), 0, 1.6), clamp(a[2] / Math.max(b[2], 0.05), 0, 1.6)];
}

// ── view culling: the frustum's six planes, taken from the camera's view-projection once a frame, and a test
// for a mesh's bounding sphere against them. Off-screen meshes are skipped (each draw costs the CPU even when
// nothing of it lands on screen).
const FRUSTUM = new Float32Array(24);
function updateFrustum(VP) {
  const m = VP, F = FRUSTUM;
  // rows of the matrix (column-major storage): plane = row3 ± rowN
  const row = (r, c) => m[c * 4 + r];
  const set = (k, a, b, c, d) => { const l = Math.hypot(a, b, c) || 1; F[k * 4] = a / l; F[k * 4 + 1] = b / l; F[k * 4 + 2] = c / l; F[k * 4 + 3] = d / l; };
  for (let k = 0; k < 3; k++) {
    set(k * 2, row(3, 0) + row(k, 0), row(3, 1) + row(k, 1), row(3, 2) + row(k, 2), row(3, 3) + row(k, 3));
    set(k * 2 + 1, row(3, 0) - row(k, 0), row(3, 1) - row(k, 1), row(3, 2) - row(k, 2), row(3, 3) - row(k, 3));
  }
}
function meshInView(m) {
  const b = m.bound; if (!b) return true;
  const M = m.model;
  const x = M[0] * b[0] + M[4] * b[1] + M[8] * b[2] + M[12], y = M[1] * b[0] + M[5] * b[1] + M[9] * b[2] + M[13], z = M[2] * b[0] + M[6] * b[1] + M[10] * b[2] + M[14];
  const s = Math.max(Math.hypot(M[0], M[1], M[2]), Math.hypot(M[4], M[5], M[6]), Math.hypot(M[8], M[9], M[10]));
  const r = b[3] * s + 0.5;   // a little slack: a sliver at the edge never pops
  for (let k = 0; k < 6; k++) if (FRUSTUM[k * 4] * x + FRUSTUM[k * 4 + 1] * y + FRUSTUM[k * 4 + 2] * z + FRUSTUM[k * 4 + 3] < -r) return false;
  return true;
}
// a person (or what they really are) fits in a 3-tile sphere around their middle, whatever they're doing
function charInView(c) {
  const x = drawX(c), y = (c.y || 0) + 1, z = drawZ(c), r = 3;
  for (let k = 0; k < 6; k++) if (FRUSTUM[k * 4] * x + FRUSTUM[k * 4 + 1] * y + FRUSTUM[k * 4 + 2] * z + FRUSTUM[k * 4 + 3] < -r) return false;
  return true;
}
