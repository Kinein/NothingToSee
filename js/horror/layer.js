//@ horror/layer — The horror layer: shared machinery
//@ Defines: HX, HX_FACS, hxReset, hxLamp, hxLook, HX_SHADOW, hxActor, hxKill, snapOrBlend, hxAnimate, hxWalk, hxPan, hxSound, hxDecal, hxLight, hxDark, …
//@ Uses:    core/util, sim/core, gfx/renderer, gfx/gl, world/grid, world/vision, gfx/draw-helpers, gfx/post, audio/sound, gfx/world-geometry, …
//@ (header made by tools/map.js; stripped by build.py)
// ───────────────────────── the horror layer ─────────────────────────
// Everything here is for the eyes and the ears. The game never reads any of it: it does not touch the light map,
// sight, people, proofs, stress, money or THEIR plan. Its actors are phantoms kept outside CHARS (no photo, no
// witness, no proof), its lights are drawn rather than cast, and it saves nothing.
// · midday: once a day something awful happens to somebody in the street, in front of you if it can be
// · night: some nights have a bad hour or two. Then the town shows you things, near you or somewhere else.
const HX = {
  actors: [],
  decals: [],
  glints: [],
  lights: [],
  beams: [],
  crafts: [],
  props: [],
  scene: null,
  far: [],
  id: 0,
  night: 0,
  dread: 0,
  danger: 0,
  sel: 0,
  letter: 0,
  jolt: 0,
  blood: 0,
  beat: 0,
  selT: 0,
  letterT: 0,
  beatT: 0,
  camX: 0,
  camZ: 0,
  camT: null,
  shake: 0,
  lamp: new Map(),
  lampSt: new Map(),
  noon: null,
  plan: null,
  nextNear: 0,
  nextFar: 0,
  realCd: 0,
  lastTF: new Set(),
};
const HX_FACS = ['aliens', 'lizards', 'zombies'];
// until you know what THEY are, the town's horrors wear any of the three faces: they tell you nothing
const hxFac = () => (G && G.factionKnown ? G.faction : pick(HX_FACS));
function hxReset() {
  HX.actors.length = 0;
  HX.decals.length = 0;
  HX.props.length = 0;
  HX.crafts.length = 0;
  HX.far.length = 0;
  HX.scene = null;
  HX.noon = null;
  HX.plan = null;
  HX.lamp.clear();
  HX.lampSt.clear();
  HX.dread = HX.danger = HX.sel = HX.letter = HX.jolt = HX.blood = HX.beat = 0;
  HX.camX = HX.camZ = 0;
  HX.camT = null;
  HX.realCd = 0;
  HX.nextNear = HX.nextFar = 0;
  for (const c of CHARS) c.gaze = 0;
}
function hxLamp(o) {
  if (!o) return 1;
  const v = HX.lamp.get(o);
  return v == null ? 1 : v;
}

// ── phantoms
function hxLook(o) {
  const L = Object.assign(
    {
      skin: pick([0xd8b399, 0xa87a5c, 0x7a523f, 0xe8c9b0, 0xc49274, 0xe0bea3]),
      hair: pick(['short', 'long', 'bald', 'side', 'bun', 'messy']),
      hairCol: pick([0x1a1410, 0x5a3a20, 0x8a7a60, 0x3a2a1a, 0xb39d64]),
      top: pick([0x3a3e46, 0x5a4a3a, 0x2e3a2e, 0x4a2e2e, 0x6a6a62, 0x6b3a2e, 0x384a5a, 0x74485a]),
      bottom: pick([0x22252a, 0x3a342c, 0x2a2a30]),
      h: rand(0.94, 1.05),
      w: rand(0.94, 1.1),
      sleeves: 1,
      outfit: pick(['coat', 'jacket', '', 'cardigan', 'scarf']),
      acc: pick([0x2a2a2a, 0x7a2a24, 0xb08a3a, 0xd8cdb8]),
    },
    o || {},
  );
  return Object.assign({}, L, {
    skinC: hex(L.skin),
    topC: hex(L.top),
    botC: hex(L.bottom),
    shoeC: hex(L.shoes || 0x1b1b1c),
    hairC: hex(L.hairCol || 0x231b15),
    accC: hex(L.acc != null ? L.acc : L.top),
    hatC: hex(L.hatCol || 0x2a2a2a),
    eyeC: [0.06, 0.05, 0.05],
    mouthC: mul3(hex(L.skin), 0.55),
  });
}
const HX_SHADOW = () => ({
  skinC: [0.035, 0.035, 0.045],
  topC: [0.02, 0.02, 0.026],
  botC: [0.02, 0.02, 0.026],
  shoeC: [0.01, 0.01, 0.01],
  hairC: [0, 0, 0],
  accC: [0.02, 0.02, 0.026],
  hatC: [0, 0, 0],
  eyeC: [0.01, 0.01, 0.01],
  mouthC: [0, 0, 0],
  h: 1.3,
  w: 0.74,
  hair: 'bald',
  sleeves: 1,
});
function hxActor(look, x, z, o) {
  const a = Object.assign(
    {
      id: 'hx' + ++HX.id,
      hx: true,
      look,
      x,
      z,
      y: 0,
      dir: 0,
      tdir: 0,
      onMap: true,
      shown: 1,
      J: defaultJ(),
      fx: {},
      pose: 'stand',
      anim: 'idle',
      animT: rand(0, 10),
      walkPh: 0,
      moving: false,
      run: false,
      queue: [],
      tell: null,
      hover: false,
      gaze: 0,
      ghost: 0,
      hide: false,
      shadow: 0.5,
      poseFn: null,
    },
    o || {},
  );
  HX.actors.push(a);
  return a;
}
function hxKill(a) {
  const i = HX.actors.indexOf(a);
  if (i >= 0) HX.actors.splice(i, 1);
}
function snapOrBlend(a, T, dt) {
  if (!a.snap) return blendJoints(a, T, dt);
  const k = Math.min(1, dt * a.snap);
  for (const key in T) a.J[key] += (T[key] - a.J[key]) * k;
  a.jT = null; // when the scene lets go, blending picks up from wherever this left the body
}
function hxAnimate(a, dt) {
  a.animT += dt;
  motionPre(a, dt);
  const T = animTargets(a, dt);
  if (a.poseFn) a.poseFn(T, a);
  snapOrBlend(a, T, dt);
  a.dir += angDiff(a.dir, a.tdir) * Math.min(1, dt * (a.turn || 7));
}
// straight lines only: phantoms go where the scene says, through nothing that matters
function hxWalk(a, tx, tz, spd, dt) {
  const dx = tx - a.x,
    dz = tz - a.z,
    d = Math.hypot(dx, dz);
  if (d < 0.04) {
    a.moving = false;
    return true;
  }
  const st = Math.min(d, spd * dt);
  a.x += (dx / d) * st;
  a.z += (dz / d) * st;
  a.tdir = Math.atan2(dx, dz);
  a.moving = true;
  a.run = spd > 2.7;
  a.walkPh += st * (a.run ? 4.6 : 3.7);
  return false;
}
const hxFace = (a, x, z) => (a.tdir = Math.atan2(x - a.x, z - a.z));
const hxSeen = (x, z, k = 0.5) => !!(G && G.started && PLAYER.onMap) && visAt(x, z) > k;
const hxDist = (x, z) => Math.hypot(PLAYER.x - x, PLAYER.z - z);
function hxPan(x, z) {
  const r = R.canvas && cam.VP ? R.canvas.getBoundingClientRect() : null;
  if (!r || !r.width) return 0;
  const [sx] = project(x, 0.5, z);
  return clamp((sx / r.width) * 2 - 1, -1, 1);
}
function hxSound(kind, x, z, vol = 1) {
  const d = G.started ? hxDist(x, z) : 10;
  audio.hx(kind, hxPan(x, z), vol * clamp(1.15 - d / 34, 0.12, 1));
}
function hxDecal(x, z, r, col, shape, life, o) {
  HX.decals.push(Object.assign({ x, z, r, col, shape, born: G.t, until: G.t + life, y: 0.014 }, o || {}));
}
function hxLight(x, y, z, r, col) {
  HX.lights.push({ x, y, z, r, col, dark: 0 });
}
function hxDark(x, z, r, k) {
  HX.lights.push({ x, y: 0.6, z, r, col: [k, 0, 0], dark: 1 });
}
function hxGlint(x, y, z, size, col, a) {
  HX.glints.push({ x, y, z, size, col, a });
}

// open ground: outdoors, walkable, nothing standing on it
const hxOpen = (x, z) => inb(x, z) && OUTDOOR.has(tiles[I(x, z)]) && walkable(x, z);
function hxLineOpen(x0, z0, x1, z1) {
  const n = Math.ceil(Math.hypot(x1 - x0, z1 - z0) * 2) + 1;
  for (let k = 0; k <= n; k++) {
    const f = k / n,
      x = Math.floor(lerp(x0, x1, f)),
      z = Math.floor(lerp(z0, z1, f));
    if (!hxOpen(x, z) || tiles[I(x, z)] === '=') return false;
  }
  return true;
}
// a stage in front of you: open ground you can see, not on top of you, with a run-up along the street
// sideWant: which way along the street the run-up should go (0: either); both: the street must be open both ways
function hxStage(minD, maxD, needSeen = true, run = 4, toCam = 0, sideWant = 0, both = false) {
  const P = PLAYER,
    out = [],
    cx0 = Math.sin(cam.yaw),
    cz0 = Math.cos(cam.yaw);
  for (let k = 0; k < 160; k++) {
    const x = Math.floor(P.x + rand(-maxD, maxD)),
      z = Math.floor(P.z + rand(-maxD, maxD));
    if (!hxOpen(x, z) || tiles[I(x, z)] === '=') continue; // never in the road: the traffic doesn't know they're there
    const cx = x + 0.5,
      cz = z + 0.5,
      d = Math.hypot(cx - P.x, cz - P.z);
    if (d < minD || d > maxD) continue;
    if (needSeen && visCur[I(x, z)] < 0.85) continue;
    const side = sideWant || (chance(0.5) ? 1 : -1);
    for (const sd of sideWant ? [side] : [side, -side]) {
      if (!hxLineOpen(cx, cz, cx + sd * run, cz)) continue;
      if (both && !hxLineOpen(cx, cz, cx - sd * run, cz)) continue;
      const street = tiles[I(x, z)] === '-' ? 2 : tiles[I(x, z)] === 'p' ? 1 : 0;
      const fwd = ((cx - P.x) * cx0 + (cz - P.z) * cz0) / Math.max(1, d);
      out.push({
        x: cx,
        z: cz,
        side: sd,
        score:
          street +
          (needSeen ? visCur[I(x, z)] : 0) -
          Math.abs(d - (minD + maxD) / 2) * 0.08 +
          fwd * toCam +
          rand(0, 0.6),
      });
      break;
    }
  }
  out.sort((a, b) => b.score - a.score);
  return out[0] || null;
}

// ── the craft
function drawCraft(cr) {
  gl.uniform1f(U.uEmitMul, 0);
  gl.uniform1f(U.uDyn, 1);
  gl.uniform1i(U.uCut, 0);
  drawHi = 0;
  let M = M4.trans(cr.x, cr.y, cr.z);
  if (cr.tilt) M = M4.mul(M, M4.rotZ(cr.tilt));
  M = M4.mul(M, M4.rotY(cr.spin));
  const hull = [0.42, 0.44, 0.46],
    dark = [0.04, 0.045, 0.05],
    g = cr.glow || 0,
    G2 = [0.35, 1, 0.7],
    pul = 0.7 + 0.3 * Math.sin(R.time * 5);
  drawSpec = 2.4;
  part(M, 0, 0, 0, 5.2, 0.42, 5.2, 'sph', hull, mul3(G2, 0.015));
  part(M, 0, 0.06, 0, 4.6, 0.3, 4.6, 'cyl', mul3(hull, 0.7));
  part(M, 0, 0.24, 0, 2.3, 1.0, 2.3, 'sph', dark, mul3(G2, 0.06 * pul));
  part(M, 0, -0.1, 0, 3.6, 0.46, 3.6, 'sph', mul3(hull, 0.55));
  drawSpec = 0;
  part(M, 0, -0.3, 0, 1.8, 0.2, 1.8, 'cyl', [0.3, 0.9, 0.65], mul3(G2, 0.35 + 2.2 * g));
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * TAU;
    partR(M, Math.sin(a) * 1.75, 0.1, Math.cos(a) * 1.75, 0, a, 0, 0.05, 0.06, 1.5, 'box', dark);
  }
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * TAU,
      on = Math.sin(R.time * 7 - i * 0.85) > 0.35;
    part(
      M,
      Math.sin(a) * 2.55,
      -0.02,
      Math.cos(a) * 2.55,
      0.22,
      0.12,
      0.22,
      'sph',
      [0.9, 0.28, 0.22],
      on ? [2.4, 0.3, 0.16] : [0.08, 0.02, 0.02],
    );
  }
}

// ── drawing hooks (called from the renderer)
function hxMainUniforms(u) {
  if (!u.uXP) return;
  const ls = HX.lights,
    n = Math.min(8, ls.length);
  const P = new Float32Array(32),
    C = new Float32Array(32);
  for (let k = 0; k < n; k++) {
    const l = ls[k];
    P.set([l.x, l.y, l.z, l.r], k * 4);
    C.set([l.col[0], l.col[1], l.col[2], l.dark], k * 4);
  }
  gl.uniform4fv(u.uXP, P);
  gl.uniform4fv(u.uXC, C);
  gl.uniform1i(u.uXN, n);
  gl.uniform1f(u.uDread, HX.dread);
  gl.uniform1f(u.uBlood, HX.blood);
  gl.uniform1f(u.uVisMin, 0);
  gl.uniform1f(u.uSpec, 0);
  gl.uniform3fv(u.uViewDir, [-cam.fwd[0], -cam.fwd[1], -cam.fwd[2]]);
}
function hxDrawWorld() {
  if (!HX.actors.length && !HX.crafts.length && !HX.props.length) return;
  for (const a of HX.actors) {
    if (a.hide) continue;
    gl.uniform1f(U.uVisMin, a.ghost || 0);
    drawChar(a);
  }
  gl.uniform1f(U.uVisMin, 0);
  for (const cr of HX.crafts) drawCraft(cr);
  gl.uniform1f(U.uEmitMul, 0);
  gl.uniform1f(U.uDyn, 1);
  drawHi = 0;
  for (let i = HX.props.length - 1; i >= 0; i--)
    if (HX.props[i].until && G.t > HX.props[i].until) HX.props.splice(i, 1);
  for (const p of HX.props) {
    if (visAt(p.x, p.z) < 0.3) continue;
    const M = M4.mul(M4.trans(p.x, p.y || 0, p.z), M4.rotY(p.rot || 0));
    if (p.kind === 'shoe') {
      part(M, 0, 0.04, 0, 0.12, 0.075, 0.25, 'box', [0.1, 0.09, 0.08]);
      part(M, 0, 0.045, 0.1, 0.12, 0.07, 0.08, 'sph', [0.1, 0.09, 0.08]);
    } else if (p.kind === 'bag') {
      part(M, 0, 0.12, 0, 0.36, 0.24, 0.12, 'box', p.col || [0.24, 0.16, 0.1]);
      part(M, 0, 0.27, 0, 0.14, 0.06, 0.02, 'box', [0.12, 0.08, 0.05]);
    } else if (p.kind === 'cash') {
      part(M, 0, 0.02, 0, 0.16, 0.035, 0.22, 'box', [0.82, 0.78, 0.64]);
      part(M, 0.03, 0.04, 0.02, 0.1, 0.012, 0.15, 'box', [0.4, 0.5, 0.34]);
    }
  }
}
// old stains nobody cleans: a few at the start, one more most days of THEIR week. The game doesn't know they're there.
// [x, z, shape (4 splat, 5 smear), size, turn, seed]
const HX_STAINS = [
  [27.4, 7.6, 4, 0.75, 0.4, 1.3],
  [17.6, 13.45, 4, 0.42, 2.1, 2.7],
  [28.3, 10.4, 5, 1.1, 2.6, 3.1],
  [35.6, 26.5, 4, 0.6, 1.0, 4.9],
  [31.5, 16.5, 5, 1.3, 0.1, 5.5],
  [44.4, 13.5, 4, 0.5, 2.9, 6.2],
  [28.5, 3.3, 4, 0.7, 1.7, 7.7],
  [39.3, 27.9, 5, 1.2, 4.0, 8.1],
  [31.4, 21.7, 4, 0.55, 0.6, 9.4],
  [8.4, 16.9, 5, 1.0, 3.3, 10.6],
  [47.6, 18.55, 4, 0.48, 5.0, 11.2],
  [24.6, 30.2, 4, 0.8, 0.9, 12.8],
];
function hxDrawDecals() {
  for (const a of HX.actors)
    if (!a.hide && a.shadow > 0)
      drawDecal(
        a.x,
        a.z,
        0.44 / (1 + (a.y || 0) * 0.4),
        [0, 0, 0, (a.shadow * (a.ghost ? 0.4 : 1)) / (1 + (a.y || 0))],
        0,
        0.013,
      );
  if (G.started) {
    const n = Math.min(HX_STAINS.length, 2 + Math.floor((G.phase || 1) * 2));
    for (let i = 0; i < n; i++) {
      const [x, z, sh, sz, rot, seed] = HX_STAINS[i];
      if (visAt(x, z) > 0.05)
        drawDecalR(
          x,
          z,
          sz * (sh === 5 ? 1 : 1),
          sz * (sh === 5 ? 0.45 : 1),
          rot,
          [0.1, 0.009, 0.009, 0.8],
          sh,
          seed,
          0.011 + i * 0.0002,
        );
    }
  }
  for (let i = HX.decals.length - 1; i >= 0; i--) {
    const d = HX.decals[i];
    if (G.t > d.until) {
      HX.decals.splice(i, 1);
      continue;
    }
    const life = d.until - d.born,
      f = clamp((d.until - G.t) / Math.max(1, life * 0.3), 0, 1) * (d.grow ? clamp((G.t - d.born) / d.grow, 0, 1) : 1);
    const r = typeof d.r === 'function' ? d.r() : d.r,
      col = typeof d.col === 'function' ? d.col() : d.col;
    if (r > 0.01 && col[3] > 0.003) {
      if (d.rot != null)
        drawDecalR(
          d.x,
          d.z,
          r * (d.sx || 1),
          r * (d.sz || 1),
          d.rot,
          [col[0], col[1], col[2], col[3] * f],
          d.shape,
          d.seed || 0,
          d.y,
        );
      else drawDecal(d.x, d.z, r, [col[0], col[1], col[2], col[3] * f], d.shape, d.y);
    }
  }
}
function hxDrawAdditive() {
  const GL = R.glow;
  if (HX.beams.length) {
    const B = R.beam;
    gl.useProgram(B.p);
    gl.enable(gl.DEPTH_TEST);
    gl.depthMask(false);
    gl.blendFunc(gl.ONE, gl.ONE);
    gl.uniformMatrix4fv(B.U.uVP, false, cam.VP);
    gl.uniform1f(B.U.uTime, R.time);
    gl.uniform3fv(B.U.uCamDir, [-cam.fwd[0], -cam.fwd[1], -cam.fwd[2]]);
    for (const b of HX.beams) {
      if (b.a < 0.01) continue;
      let M = M4.trans(b.x, b.y, b.z);
      if (b.lean) M = M4.mul(M, M4.mul(M4.rotY(b.leanDir || 0), M4.rotX(b.lean)));
      gl.uniformMatrix4fv(B.U.uModel, false, M4.mul(M, M4.scale(b.r, b.h, b.r)));
      gl.uniform3fv(B.U.uColor, b.col);
      gl.uniform1f(B.U.uAlpha, b.a);
      gl.bindVertexArray(PRIM.cone.vao);
      gl.drawElements(gl.TRIANGLES, PRIM.cone.count, gl.UNSIGNED_INT, 0);
    }
  }
  if (HX.glints.length) {
    gl.useProgram(GL.p);
    gl.enable(gl.DEPTH_TEST);
    gl.depthMask(false);
    gl.blendFunc(gl.ONE, gl.ONE);
    gl.uniformMatrix4fv(GL.U.uVP, false, cam.VP);
    gl.uniform3fv(GL.U.uRight, cam.right);
    gl.uniform3fv(GL.U.uUp, cam.up);
    for (const g of HX.glints) {
      if (g.a < 0.01) continue;
      gl.uniform3fv(GL.U.uCenter, [g.x, g.y, g.z]);
      gl.uniform1f(GL.U.uSize, g.size);
      gl.uniform3fv(GL.U.uColor, g.col);
      gl.uniform1f(GL.U.uAlpha, g.a);
      gl.bindVertexArray(PRIM.quad.vao);
      gl.drawElements(gl.TRIANGLES, PRIM.quad.count, gl.UNSIGNED_INT, 0);
    }
  }
}

// ── the clock of the layer: once a game minute, decide what is coming
function hxTick() {
  if (!G.started || G.over || HUNT.on) return; // the real thing is in the room: no visions on top of it
  const d = dayNo(),
    h = hourF();
  // midday: one awful thing a day, somewhere between quarter past eleven and half past two. It's in the street: not before day 5.
  if (!HX.noon || HX.noon.day !== d) HX.noon = { day: d, at: Math.round(rand(11.25, 14.5) * 60), done: false };
  const N = HX.noon;
  if (!N.done && tod() >= N.at && !theyOut()) N.done = true;
  if (!N.done && tod() >= N.at) {
    if (tod() > 15.5 * 60) N.done = true;
    else if (PLAYER.onMap && !G.sleeping && !G.away && !HX.scene) {
      if (hxNoonScene()) N.done = true;
      else N.at = tod() + 12;
    }
  }
  // the night's bad hours, rolled at dusk
  const nk = dayNo(G.t - 12 * 60);
  if (!HX.plan || HX.plan.night !== nk) {
    const stage = G.stage || 1,
      base = (nk - 1) * 1440 + 12 * 60; // noon of the night's day; hours count on from there
    const win = [];
    if (chance(0.5 + stage * 0.08)) {
      const two = chance(0.3),
        n = two ? 2 : 1;
      for (let k = 0; k < n; k++) {
        const s = base + Math.round(rand(22, 27.5) * 60) - 12 * 60 + k * Math.round(rand(70, 120));
        win.push([s, s + Math.round(two ? rand(35, 60) : rand(50, 110))]);
      }
    }
    HX.plan = { night: nk, win, blood: win.length > 0 && chance(0.18 + stage * 0.06) };
  }
  // what the night does, when it does something
  const nightNow = h >= 21 || h < 5;
  if (!nightNow || G.sleeping || G.away || !PLAYER.onMap || !theyStir()) return; // the first night is quiet
  const bad = hxBadHour();
  if (G.t >= HX.nextNear && R.time >= HX.realCd && !HX.scene) {
    HX.nextNear = G.t + (bad ? rand(14, 30) : rand(50, 120));
    if (bad || chance(0.3)) hxNightScene(bad);
  }
  if (G.t >= HX.nextFar) {
    HX.nextFar = G.t + (bad ? rand(18, 40) : rand(60, 150));
    if (bad || chance(0.35)) hxFarScene();
  }
}
function hxBadHour(t = G.t) {
  const p = HX.plan;
  if (!p) return 0;
  for (const [a, b] of p.win) if (t >= a - 15 && t <= b + 15) return clamp(Math.min(t - a + 15, b + 15 - t) / 20, 0, 1);
  return 0;
}

// ── per frame
function hxUpdate(dtReal) {
  HX.lights.length = 0;
  HX.glints.length = 0;
  HX.beams.length = 0;
  if (!G) return;
  const live = G.started;
  const paused = live && (G.speed === 0 || G.over || UI.caseOpen || UI.fight || UI.scene);
  const k = paused ? 0 : !live ? 1 : G.sleeping || G.away ? 0 : [0, 1, 1.3, 1.6][G.speed] || 1;
  const dt = dtReal * k;
  const h = hourF();
  const nightT = h >= 21 || h < 5 ? 1 : h >= 18.5 ? (h - 18.5) / 2.5 : h < 7 ? 1 - (h - 5) / 2 : 0;
  HX.night += (nightT - HX.night) * Math.min(1, dtReal * 0.8);
  const bad = live ? (G.loose && !G.over ? Math.max(0.85, hxBadHour()) : hxBadHour()) : 0.35;
  HX.dread += (bad * (G.sleeping ? 0.4 : 1) - HX.dread) * Math.min(1, dtReal * 0.35);
  HX.blood +=
    ((HX.plan && HX.plan.blood) || (live && G.loose && !G.over)
      ? (HX.plan && HX.plan.blood ? bad : 0.5) - HX.blood
      : -HX.blood) * Math.min(1, dtReal * 0.3);
  // the title screen: something crosses the sky over Wexley now and then
  if (!live) {
    HX.titleT = (HX.titleT == null ? 6 : HX.titleT) - dtReal;
    if (HX.titleT <= 0 && !HX.far.length) {
      HX.titleT = rand(22, 40);
      const s = hxSearch(false);
      if (s) HX.far.push(s);
    }
  }
  // the shade a frayed mind puts in the dark gets eyes
  if (SHADE.on && SHADE.c) {
    const c = SHADE.c,
      hy = 1.6 * c.look.h;
    for (const s of [1, -1])
      hxGlint(
        c.x + Math.cos(c.dir) * s * 0.065 + Math.sin(c.dir) * 0.2,
        hy,
        c.z - Math.sin(c.dir) * s * 0.065 + Math.cos(c.dir) * 0.2,
        0.15,
        [0.9, 0.92, 1],
        0.75,
      );
  }
  // scenes
  if (HX.scene) {
    try {
      if (HX.scene.step(dt) === false) hxEndScene();
    } catch (e) {
      console.error(e);
      hxEndScene();
    }
  }
  for (let i = HX.far.length - 1; i >= 0; i--) {
    const s = HX.far[i];
    try {
      if (s.step(dt) === false) {
        s.end && s.end();
        HX.far.splice(i, 1);
      }
    } catch (e) {
      HX.far.splice(i, 1);
    }
  }
  for (const a of HX.actors) hxAnimate(a, dt);
  try {
    encFx();
  } catch (e) {
    console.error(e);
  }
  // lamps: during a bad hour they stutter; scenes may kill them outright
  for (const o of OBJ) {
    if (o.type !== 'streetlamp' && o.type !== 'parklamp' && o.type !== 'alleylamp') continue;
    let st = HX.lampSt.get(o);
    if (!st) {
      st = { v: 1, f: 0, dead: 0 };
      HX.lampSt.set(o, st);
    }
    if (st.f > 0) st.f -= dtReal;
    else if (HX.dread > 0.05 && Math.random() < HX.dread * dtReal * 0.6) {
      st.f = rand(0.05, 0.35);
      st.fv = rand(0.02, 0.45);
    }
    const want = st.dead > 0 ? (st.dead < 1 ? (Math.random() < 0.5 ? 0.05 : 0.9) : 0) : st.f > 0 ? st.fv : 1;
    st.v += (want - st.v) * Math.min(1, dtReal * 25);
    HX.lamp.set(o, st.v);
    if (st.v < 0.7 && lightGroupOn('street')) {
      const f = DIRS[o.face];
      hxDark(o.cx + f[0] * 0.8, o.cz + f[1] * 0.8, o.type === 'streetlamp' ? 4.6 : 3.4, (1 - st.v) * 0.82);
    }
  }
  // danger: something with teeth, close, in sight
  let dg = 0;
  if (live && PLAYER.onMap) {
    for (const c of CHARS) {
      if (!c.onMap || c.isPlayer || !c.tell || c.tell.type !== 'true' || c.shown < 0.5) continue;
      const d = hxDist(c.x, c.z);
      if (d < 12) dg = Math.max(dg, 1 - d / 12);
      // what it is lights it: a green glow under the grey, the amber of the slit eyes, a dead white
      const fac = c.tell.fac || G.faction,
        k = clamp(c.tell.t / TF_CHANGE, 0, 1);
      if (fac === 'aliens') hxLight(c.x, 0.3, c.z, 3.2, mul3([0.3, 1, 0.65], 0.9 * k));
      else if (fac === 'lizards')
        hxLight(c.x + Math.sin(c.dir) * 0.6, 1.7, c.z + Math.cos(c.dir) * 0.6, 2.6, mul3([1, 0.62, 0.12], 0.75 * k));
      else hxLight(c.x, 1.6, c.z, 2.4, mul3([0.62, 0.7, 0.6], 0.45 * k));
      if (!HX.lastTF.has(c.id) && c.tell.t < TF_CHANGE && visAt(c.x, c.z) > 0.5) {
        HX.lastTF.add(c.id);
        HX.jolt = Math.max(HX.jolt, 0.8);
        HX.shake = 0.5;
        audio.hx('sting', hxPan(c.x, c.z), 0.8);
      }
    }
    for (const id of HX.lastTF) {
      const c = CHARS.find((x) => x.id === id);
      if (!c || !c.tell || c.tell.type !== 'true') HX.lastTF.delete(id);
    }
    for (const a of HX.actors)
      if (a.menace && !a.hide && (hxSeen(a.x, a.z, 0.3) || a.ghost)) {
        const d = hxDist(a.x, a.z);
        dg = Math.max(dg, a.menace * clamp(1 - d / 13, 0, 1));
      }
  }
  HX.danger += (dg - HX.danger) * Math.min(1, dtReal * (dg > HX.danger ? 3 : 0.7));
  if (HX.danger > 0.28 && !paused) {
    HX.beatT -= dtReal;
    if (HX.beatT <= 0) {
      HX.beatT = lerp(1.0, 0.42, HX.danger);
      HX.beat = 1;
      audio.hx('heart', 0, 0.35 + HX.danger * 0.65);
    }
  }
  HX.beat = Math.max(0, HX.beat - dtReal * 3.2);
  // the town turns to look at you in a bad hour
  for (const c of CHARS) {
    if (c.isPlayer) continue;
    let want = 0;
    if (live && HX.dread > 0.3 && c.onMap && !c.moving && !c.tell && !c.trueForm && PLAYER.onMap && c.shown > 0.5) {
      const d = hxDist(c.x, c.z);
      if (d < 9 && d > 1.2)
        want =
          clamp(angDiff(c.dir, Math.atan2(PLAYER.x - c.x, PLAYER.z - c.z)), -1.25, 1.25) *
          clamp(HX.dread * 1.4 - 0.3, 0, 1);
    }
    c.gaze = (c.gaze || 0) + (want - (c.gaze || 0)) * Math.min(1, dtReal * 1.2);
  }
  // the camera leans toward what you should be looking at, and shakes when it hits
  const lean = HX.camT && HX.letterT > 0.5 ? HX.camT : null;
  const tx = lean ? (lean[0] - cam.tx) * 0.4 : 0,
    tz = lean ? (lean[1] - cam.tz) * 0.4 : 0;
  HX.camX += (tx - HX.camX) * Math.min(1, dtReal * 1.5);
  HX.camZ += (tz - HX.camZ) * Math.min(1, dtReal * 1.5);
  HX.shake = Math.max(0, HX.shake - dtReal * 1.6);
  HX.jolt = Math.max(0, HX.jolt - dtReal * 2.4);
  HX.letter += (HX.letterT - HX.letter) * Math.min(1, dtReal * 2.2);
  HX.sel += (HX.selT - HX.sel) * Math.min(1, dtReal * 2.5);
  HX.lights.sort((a, b) => Math.hypot(a.x - cam.tx, a.z - cam.tz) - Math.hypot(b.x - cam.tx, b.z - cam.tz));
}
function hxEndScene() {
  const s = HX.scene;
  HX.scene = null;
  if (s && s.end) s.end();
  HX.letterT = 0;
  HX.selT = 0;
  HX.camT = null;
  HX.realCd = R.time + rand(9, 16);
}
// a scene is in front of you if you can see where it happens
function hxCinema(s, x, z, sel, up = 0) {
  const seen = hxSeen(x, z, 0.4) && hxDist(x, z) < 16;
  HX.letterT = seen ? 1 : 0;
  HX.selT = seen && sel ? sel : 0;
  HX.camT = seen ? [x - Math.sin(cam.yaw) * up, z - Math.cos(cam.yaw) * up] : null;
  return seen;
}
