//@ gfx/peek — The rummage close-up: a few seconds somewhere else, your hand in it, what it finds
//@ Defines: PK, PK_MIN, PK_YAW, PK_EYE, PK_AT, PK_UP, PK_ZN, PK_HS, PK_I, PK_W, PK_FM, PK_V, PK_P, PK_VP, PK_LV, PK_LP, …
//@ Uses:    gfx/gl, core/util, gfx/renderer, gfx/post, gfx/peek-geo, sim/core, world/light-map, gfx/peek-shader, gfx/peek-junk, gfx/peek-sets, …
//@ (header made by tools/map.js; stripped by build.py)
// ───────────── the rummage close-up. Your hands go into something and a square comes up beside you, the way the photo's
// does: a few seconds somewhere else, very close. Not the town drawn again: a little stage of its own (gfx/peek-sets)
// with what's really in there (gfx/peek-things, gfx/peek-junk) and your own hand going through it, under one lamp, with
// a lens so close that only a sliver is sharp (gfx/peek-shader). Your fingers go looking; then, as the game decides
// it (play/stashes, play/verbs), they find nothing, or something wedged in under the rest, or they pull the cover off
// THEIR thing, or they bring out something to keep. Render only: what you find is still the rummage's business, and
// nothing here touches the simulation or its random numbers.
const PK = {
  S: 512, // the square's pixels
  on: false,
  o: null,
  how: 'rummage', // or 'pry': taking it apart
  set: null, // the stage, with its meshes (gfx/peek-sets)
  thing: null, // { mesh, glass, key, def, M } what's in there, hidden or found
  cover: null, // what lies over it
  door: null, // a fridge's
  t0: 0, // R.time it came up
  res: null, // what came of it: { kind: nothing | feel | reveal | take, key, what }
  resAt: 0, // R.time the outcome starts to play
  played: false,
  endAt: 0,
  track: null, // the hand's keys (pkTrackAt)
  hold: null, // what the hand carries: 'cover' | 'thing'
  holdM: new Float32Array(16), // where it is in the hand now
  holdA: new Float32Array(16), // where it was in the hand when the fingers closed
  holdB: new Float32Array(16), // where it settles: in the palm, the right way up once the palm turns up
  lamp: 1,
  expo: 0.6, // the stage's lamps are a set's numbers; this is the film they're shot on
  focus: 0.4,
  el: null,
  cache: {},
  hand: null,
  handKey: '',
};
const PK_MIN = { rummage: 1.1, pry: 1.5 }; // real seconds of rooting about before anything turns up
const PK_YAW = Math.PI + 0.52; // your right arm comes in from the bottom right, the fingers toward the far left corner
const PK_EYE = [0, 0, 0],
  PK_AT = [0, 0, 0],
  PK_UP = [0, 1, 0],
  PK_ZN = [0, 0, -1],
  PK_HS = new Float32Array(10), // the hand now: t, x, y, z, yaw, pitch, roll, curl, spread, wiggle
  PK_I = M4.ident(),
  PK_W = new Float32Array(16),
  PK_FM = [],
  PK_V = new Float32Array(16),
  PK_P = new Float32Array(16),
  PK_VP = new Float32Array(16),
  PK_LV = new Float32Array(16),
  PK_LP = new Float32Array(16),
  PK_LVP = new Float32Array(16),
  PK_TM = new Float32Array(16),
  PK_OCC = new Float32Array(24),
  PK_KD = [0, 0, 0],
  PK_KC = [0, 0, 0],
  PK_ONE = [1, 1, 1],
  PK_DIM = [0.5, 0.5, 0.5];
for (let k = 0; k < 15; k++) PK_FM.push(new Float32Array(16));
// ── matrices into arrays made once (gfx: no allocation per frame)
function pkLookAtInto(m, e, t, up) {
  let zx = e[0] - t[0],
    zy = e[1] - t[1],
    zz = e[2] - t[2],
    l = Math.hypot(zx, zy, zz) || 1;
  zx /= l;
  zy /= l;
  zz /= l;
  let xx = up[1] * zz - up[2] * zy,
    xy = up[2] * zx - up[0] * zz,
    xz = up[0] * zy - up[1] * zx;
  l = Math.hypot(xx, xy, xz) || 1;
  xx /= l;
  xy /= l;
  xz /= l;
  const yx = zy * xz - zz * xy,
    yy = zz * xx - zx * xz,
    yz = zx * xy - zy * xx;
  m.fill(0);
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
}
function pkPerspInto(m, fov, n, f) {
  const k = 1 / Math.tan(fov / 2);
  m.fill(0);
  m[0] = k;
  m[5] = k;
  m[10] = (f + n) / (n - f);
  m[11] = -1;
  m[14] = (2 * f * n) / (n - f);
  return m;
}
function pkOrthoInto(m, h, n, f) {
  m.fill(0);
  m[0] = 1 / h;
  m[5] = 1 / h;
  m[10] = -2 / (f - n);
  m[14] = -(f + n) / (f - n);
  m[15] = 1;
  return m;
}
// the turning part of a matrix made square again (after blending two of them)
function pkOrtho(m) {
  let l = Math.hypot(m[0], m[1], m[2]) || 1;
  m[0] /= l;
  m[1] /= l;
  m[2] /= l;
  const d = m[4] * m[0] + m[5] * m[1] + m[6] * m[2];
  m[4] -= d * m[0];
  m[5] -= d * m[1];
  m[6] -= d * m[2];
  l = Math.hypot(m[4], m[5], m[6]) || 1;
  m[4] /= l;
  m[5] /= l;
  m[6] /= l;
  m[8] = m[1] * m[6] - m[2] * m[5];
  m[9] = m[2] * m[4] - m[0] * m[6];
  m[10] = m[0] * m[5] - m[1] * m[4];
}
// a thing in your palm: its middle just off the palm, its top toward the palm's side (up, once the palm turns up)
function pkHeld(o, th) {
  const b = th.T.bb,
    hh = (b[4] - b[1]) / 2;
  o.set(M4.mul(M4.mul(M4.trans(0, -0.022 - hh, 0.075), M4.rotZ(Math.PI)), M4.trans(-th.lc[0], -th.lc[1], -th.lc[2])));
}
// a rigid transform's inverse (rotation and translation only)
function pkRigidInv(o, m) {
  o.fill(0);
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) o[i * 4 + j] = m[j * 4 + i];
  for (let i = 0; i < 3; i++) o[12 + i] = -(o[i] * m[12] + o[4 + i] * m[13] + o[8 + i] * m[14]);
  o[15] = 1;
  return o;
}
// ── the stage's GPU side, made on the first rummage
function pkInit() {
  if (PK.prog) return true;
  try {
    PK.prog = compileProgram(PK_VS, PK_FS);
    PK.shProg = compileProgram(PK_SHADOW_VS, PK_SHADOW_FS);
    PK.dofProg = compileProgram(QVS, PK_DOF_FS);
  } catch (e) {
    console.error(e);
    PK.prog = null;
    return false;
  }
  const S = PK.S,
    samples = Math.min(4, gl.getParameter(gl.MAX_SAMPLES) || 0),
    fb = gl.createFramebuffer(),
    cr = gl.createRenderbuffer(),
    dr = gl.createRenderbuffer();
  gl.bindRenderbuffer(gl.RENDERBUFFER, cr);
  gl.renderbufferStorageMultisample(gl.RENDERBUFFER, samples, R.hdr ? gl.RGBA16F : gl.RGBA8, S, S);
  gl.bindRenderbuffer(gl.RENDERBUFFER, dr);
  gl.renderbufferStorageMultisample(gl.RENDERBUFFER, samples, gl.DEPTH_COMPONENT24, S, S);
  gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
  gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.RENDERBUFFER, cr);
  gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, dr);
  PK.ms = fb;
  PK.scene = makeTarget(S, S, R.hdr);
  PK.dof = makeTarget(S, S, R.hdr);
  PK.blm = [];
  for (let k = 1; k <= 4; k++) PK.blm.push(makeTarget(S >> k, S >> k, R.hdr));
  PK.out = makeTarget(S, S, false);
  const SM = 1024,
    st = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, st);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.DEPTH_COMPONENT24, SM, SM, 0, gl.DEPTH_COMPONENT, gl.UNSIGNED_INT, null);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_COMPARE_MODE, gl.COMPARE_REF_TO_TEXTURE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_COMPARE_FUNC, gl.LEQUAL);
  const sf = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, sf);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, st, 0);
  gl.drawBuffers([gl.NONE]);
  gl.readBuffer(gl.NONE);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.bindTexture(gl.TEXTURE_2D, null);
  PK.shTex = st;
  PK.shFb = sf;
  PK.SM = SM;
  return true;
}
// ── building what's on the stage (at the open and when the outcome comes: events, never per frame)
function pkBuild(key, fn) {
  if (PK.cache[key]) return PK.cache[key];
  const g = new Geo(),
    gg = new Geo(),
    info = fn(g, gg) || {};
  info.mesh = g.i.length ? pkMesh(g) : null;
  info.glass = gg.i.length ? pkMesh(gg, true) : null;
  const bb = [Infinity, Infinity, Infinity, -Infinity, -Infinity, -Infinity];
  for (const P of [g.p, gg.p])
    for (let k = 0; k < P.length; k++) {
      bb[k % 3] = Math.min(bb[k % 3], P[k]);
      bb[3 + (k % 3)] = Math.max(bb[3 + (k % 3)], P[k]);
    }
  info.bb = isFinite(bb[0]) ? bb : [-0.02, 0, -0.02, 0.02, 0.04, 0.02];
  PK.cache[key] = info;
  return info;
}
function pkThingFor(key, look) {
  const def = PK_THINGS[key];
  if (!def) return null;
  const T = pkBuild('thing:' + key + ':' + (look || ''), (g, gg) => {
    def.b(g, gg, look || G.faction, pkRng(key.length * 31 + 7));
  });
  const b = T.bb,
    w = Math.max(b[3] - b[0], b[5] - b[2]),
    lie = !def.fr && b[4] - b[1] > 0.07 && w < 0.11; // a jar, a bottle: on its side, wedged in
  return {
    key,
    def,
    T,
    lie,
    lc: [(b[0] + b[3]) / 2, (b[1] + b[4]) / 2, (b[2] + b[5]) / 2], // the middle of it, in its own space
    h: lie ? b[3] - b[0] : b[4] - b[1], // how tall it lies
    r: (lie ? Math.max(b[4] - b[1], b[5] - b[2]) : w) / 2, // how far it reaches from its middle, across
    M: new Float32Array(16),
    on: true,
  };
}
// where the thing lies: on the set's spot, settled on the floor (a fridge's shelves are the whole fridge)
function pkPlaceThing(th) {
  const S = PK.set,
    b = th.T.bb;
  if (th.def.fr) return th.M.set(PK_I);
  const R0 = th.lie ? M4.rotZ(Math.PI / 2) : M4.ident(),
    c = th.lie ? [-(b[1] + b[4]) / 2, b[0], (b[2] + b[5]) / 2] : [(b[0] + b[3]) / 2, b[1], (b[2] + b[5]) / 2];
  th.M.set(
    M4.mul(M4.mul(M4.mul(M4.trans(S.spot[0], S.spot[1], S.spot[2]), M4.rotY(0.35)), M4.trans(-c[0], -c[1], -c[2])), R0),
  );
}
// the middle of the thing, wherever it is now
const PK_TC = [0, 0, 0];
function pkThingAt(th) {
  const M = th.M,
    x = th.lc[0],
    y = th.lc[1],
    z = th.lc[2];
  PK_TC[0] = M[0] * x + M[4] * y + M[8] * z + M[12];
  PK_TC[1] = M[1] * x + M[5] * y + M[9] * z + M[13];
  PK_TC[2] = M[2] * x + M[6] * y + M[10] * z + M[14];
  return PK_TC;
}
// the hand, dressed as you are
function pkHand() {
  const L = PLAYER && PLAYER.look,
    key = L ? L.skin + ':' + L.top : '';
  if (PK.hand && PK.handKey === key) return PK.hand;
  PK.hand = pkHandMeshes(L ? L.skin : 0xd8b399, L ? L.top : 0x8a6e36);
  PK.handKey = key;
  return PK.hand;
}
// ── where the hand goes. A key: [t, x, y, z, yaw, pitch, roll, curl, spread, wiggle]; the wrist goes through them on a
// smooth path and eases into each one, the way a hand slows over what it's feeling for.
const PK_REACH = [0, 0, 0];
// the wrist for the fingers to be at p: the reach v (in the hand's frame) turned by yaw and pitch, taken off p
function pkReach(p, yaw, pitch, vy, vz) {
  const cp = Math.cos(pitch),
    sp = Math.sin(pitch),
    y = vy * cp - vz * sp,
    z = vy * sp + vz * cp,
    cy = Math.cos(yaw),
    sy = Math.sin(yaw);
  PK_REACH[0] = p[0] - sy * z;
  PK_REACH[1] = p[1] - y;
  PK_REACH[2] = p[2] - cy * z;
  return PK_REACH;
}
function pkKeyAt(t, p, yaw, pitch, roll, curl, spread, wig, vy, vz) {
  const w = pkReach(p, yaw, pitch, vy == null ? -0.02 : vy, vz == null ? 0.15 : vz);
  return [t, w[0], w[1], w[2], yaw, pitch, roll, curl, spread, wig];
}
function pkTrackAt(tr, t, S) {
  const n = tr.length;
  let k = 0;
  while (k < n - 2 && tr[k + 1][0] <= t) k++;
  const A = tr[k],
    B = tr[Math.min(n - 1, k + 1)],
    P0 = tr[Math.max(0, k - 1)],
    P3 = tr[Math.min(n - 1, k + 2)],
    s = B[0] > A[0] ? sstep(A[0], B[0], t) : 1;
  for (let i = 1; i < 4; i++) {
    const p0 = P0[i],
      p1 = A[i],
      p2 = B[i],
      p3 = P3[i],
      s2 = s * s,
      s3 = s2 * s;
    S[i] = 0.5 * (2 * p1 + (-p0 + p2) * s + (2 * p0 - 5 * p1 + 4 * p2 - p3) * s2 + (-p0 + 3 * p1 - 3 * p2 + p3) * s3);
  }
  S[4] = A[4] + angDiff(A[4], B[4]) * s;
  for (let i = 5; i < 10; i++) S[i] = lerp(A[i], B[i], s);
  S[0] = t;
  return S;
}
// the way in: from down by the lens, bottom right, where your arm is
function pkEntry() {
  const c = PK.set.cam;
  return [lerp(c.at[0], c.eye[0], 0.6) + 0.2, lerp(c.at[1], c.eye[1], 0.6) - 0.12, lerp(c.at[2], c.eye[2], 0.6)];
}
function pkSearchTrack() {
  const S = PK.set,
    pry = PK.how === 'pry',
    rnd = pkRng((PK.o ? PK.o.idx : 1) * 13 + (pry ? 5 : 0)),
    tr = [],
    e = pkEntry();
  tr.push([0, e[0], e[1], e[2], PK_YAW, 0.1, 0.1, 0.1, 0.4, 0]);
  if (S.door) {
    // a fridge: the hand goes to the handle and waits on what you'll see
    const h = [0.16, 0.25, 0.27];
    tr.push(pkKeyAt(0.45, h, Math.PI, 0.05, -1.45, 0.78, 0.2, 0, -0.01, 0.1));
    tr.push(pkKeyAt(9, h, Math.PI, 0.05, -1.45, 0.82, 0.2, 0.05, -0.01, 0.1));
    return tr;
  }
  const P = S.pts,
    dt = pry ? 0.26 : 0.34;
  let t = 0.45;
  const a0 = P[0];
  tr.push(pkKeyAt(0.32, [a0[0], a0[1] + 0.07, a0[2]], PK_YAW, 0.25, 0, 0.2, 0.5, 0.2));
  for (let k = 0; k < 30; k++) {
    const p = P[k % P.length],
      j = [p[0] + (rnd() - 0.5) * 0.05, p[1] + (k % 2 ? 0.012 : -0.006), p[2] + (rnd() - 0.5) * 0.04];
    tr.push(
      pkKeyAt(
        t,
        j,
        PK_YAW + (rnd() - 0.5) * (pry ? 0.7 : 0.45),
        0.3 + rnd() * 0.2,
        (rnd() - 0.5) * 0.4,
        0.14 + rnd() * 0.22,
        0.5 + rnd() * 0.5,
        pry ? 1.4 : 1,
      ),
    );
    t += dt * (0.8 + rnd() * 0.5);
  }
  return tr;
}
// the outcome, from wherever the hand is now
function pkOutcomeTrack() {
  const S = PK.set,
    T = R.time - PK.t0,
    h = PK_HS,
    cur = [T, h[1], h[2], h[3], h[4], h[5], h[6], h[7], h[8], h[9]],
    tr = [cur],
    e = pkEntry(),
    kind = PK.res.kind,
    th = PK.thing,
    tc = th && pkThingAt(th),
    top = th ? [tc[0], S.spot[1] + th.h + 0.004, tc[2]] : [S.spot[0], S.spot[1] + 0.02, S.spot[2]];
  if (S.door) {
    tr.push([T + 0.32, h[1] - 0.18, h[2], h[3] + 0.12, Math.PI, 0.05, -1.4, 0.8, 0.2, 0]);
    tr.push([T + 0.75, e[0] - 0.4, e[1], e[2] + 0.1, Math.PI, 0.2, -1.0, 0.3, 0.3, 0]);
    PK.endAt = T + (kind === 'nothing' ? 2.4 : 3.3);
    return tr;
  }
  if (kind === 'nothing' || !th) {
    tr.push([T + 0.35, h[1], h[2] + 0.08, h[3] + 0.02, PK_YAW, 0.2, 0.2, 0.2, 0.5, 0.3]);
    tr.push([T + 0.85, e[0], e[1], e[2], PK_YAW, 0.1, 0.3, 0.1, 0.6, 0]);
    PK.endAt = T + 1.7;
  } else if (kind === 'feel') {
    const lump = [top[0], top[1] + 0.006, top[2]];
    tr.push(pkKeyAt(T + 0.3, [lump[0], lump[1] + 0.04, lump[2]], PK_YAW, 0.4, 0, 0.25, 0.5, 0.2));
    tr.push(pkKeyAt(T + 0.55, lump, PK_YAW, 0.45, 0, 0.42, 0.6, 0.6));
    tr.push(pkKeyAt(T + 0.8, [lump[0], lump[1] + 0.012, lump[2]], PK_YAW, 0.42, 0.1, 0.3, 0.5, 0.3));
    tr.push(pkKeyAt(T + 1.05, [lump[0], lump[1] - 0.003, lump[2]], PK_YAW, 0.48, -0.05, 0.55, 0.7, 0.7));
    tr.push(pkKeyAt(T + 2.0, [lump[0], lump[1] - 0.001, lump[2]], PK_YAW, 0.48, -0.05, 0.5, 0.7, 0.4));
    PK.endAt = T + 2.2;
  } else if (kind === 'reveal') {
    const c = [top[0], top[1] + 0.004, top[2]];
    tr.push(pkKeyAt(T + 0.25, [c[0], c[1] + 0.05, c[2]], PK_YAW, 0.4, 0, 0.3, 0.6, 0));
    tr.push(pkKeyAt(T + 0.45, c, PK_YAW, 0.45, 0, 0.8, 0.3, 0, -0.035, 0.115));
    tr.push(
      pkKeyAt(T + 0.8, [c[0] + 0.14, c[1] + 0.12, c[2] + 0.03], PK_YAW + 0.25, 0.2, 0.5, 0.8, 0.3, 0, -0.035, 0.115),
    );
    tr.push(
      pkKeyAt(T + 1.25, [c[0] + 0.5, c[1] + 0.22, c[2] - 0.02], PK_YAW + 0.5, 0.1, 0.6, 0.8, 0.3, 0, -0.035, 0.115),
    ); // out of the picture, to the right
    PK.grabAt = T + 0.45;
    PK.endAt = T + 3.6;
  } else {
    const c = PK.set.cam,
      show = [
        lerp(c.at[0], c.eye[0], 0.22) - 0.02,
        lerp(c.at[1], c.eye[1], 0.22) + 0.03,
        lerp(c.at[2], c.eye[2], 0.22),
      ];
    // it comes up out of there and the hand turns it over to you, palm up
    tr.push(pkKeyAt(T + 0.25, [top[0], top[1] + 0.05, top[2]], PK_YAW, 0.4, 0, 0.3, 0.6, 0));
    tr.push(pkKeyAt(T + 0.5, top, PK_YAW, 0.45, 0, 0.72, 0.3, 0, -0.035, 0.115));
    tr.push(
      pkKeyAt(T + 0.85, [top[0] + 0.01, top[1] + 0.08, top[2] + 0.03], PK_YAW, 0.3, -0.6, 0.68, 0.3, 0, -0.035, 0.115),
    );
    const flat = th && th.T.bb[4] - th.T.bb[1] < 0.03, // a paper, a photo: its face to you
      roll = flat ? -2.7 : -2.0,
      pitch = flat ? 0.35 : -0.15;
    tr.push(pkKeyAt(T + 1.25, show, PK_YAW + 0.15, pitch, roll, flat ? 0.45 : 0.6, 0.3, 0, -0.035, 0.115));
    tr.push(
      pkKeyAt(
        T + 2.7,
        [show[0] + 0.008, show[1] + 0.005, show[2]],
        PK_YAW + 0.05,
        pitch - 0.05,
        roll - 0.1,
        flat ? 0.45 : 0.6,
        0.3,
        0,
        -0.035,
        0.115,
      ),
    );
    PK.grabAt = T + 0.5;
    PK.endAt = T + 2.9;
  }
  return tr;
}
// ── the API the rummage calls (play/stashes, play/verbs)
// your hands go in. hide: what's really in there, if anything ({ k, look }), so it can lie under the rest
function peekOpen(o, how, hide) {
  if (!R.ready || !o || !pkEl() || !pkInit()) return;
  if (VF.mode) vfClose(true);
  const fam = pkFamily(o.type),
    r = roomAt(o.cx, o.cz),
    night = clamp(1 - (SKY[0] * 0.3 + SKY[1] * 0.59 + SKY[2] * 0.11) / 0.35, 0, 1) > 0.5,
    ctx = { type: o.type, out: !r, night },
    v = o.idx % 3;
  PK.o = o;
  PK.how = how || 'rummage';
  const sk = o.type + ':' + v + ':' + (ctx.out ? 1 : 0) + (night ? 1 : 0);
  PK.set = pkBuild('set:' + sk, (g, gg) => {
    const s = PK_SETS[fam](g, gg, pkRng(o.idx * 7 + v), ctx);
    if (o.type === 'fridge_office') pkFridgeLoad(g, gg, 'office', pkRng(3));
    s.id = sk;
    return s;
  });
  PK.door = PK.set.door ? pkBuild('door', (g) => pkFridgeDoor(g)) : null;
  if (PK.door) PK.door.M = PK.door.M || new Float32Array(16);
  PK.thing = hide && pkKey(hide.k) ? pkThingFor(pkKey(hide.k), hide.look) : null;
  if (PK.thing) pkPlaceThing(PK.thing);
  pkCover();
  PK.on = true;
  PK.t0 = R.time;
  PK.res = null;
  PK.played = false;
  PK.hold = null;
  PK.grabAt = 0;
  PK.endAt = 0;
  PK.lamp = PK.set.door ? 0.05 : 1;
  PK.doorK = 0;
  PK.closing = 0;
  PK.track = pkSearchTrack();
  pkTrackAt(PK.track, 0, PK_HS);
  PK.focus = Math.hypot(
    PK.set.cam.eye[0] - PK.set.cam.at[0],
    PK.set.cam.eye[1] - PK.set.cam.at[1],
    PK.set.cam.eye[2] - PK.set.cam.at[2],
  );
  pkHand();
  const el = PK.el;
  el.className = '';
  pkCap(o.name || '');
  el.hidden = false;
}
// the cover over the spot: a lump in it if something's under there
// a big thing gets a bigger cover, and a tall one a tent of it: never a jar's lid poking through the paper
function pkCover() {
  const S = PK.set,
    th = PK.thing && !PK.thing.def.fr ? PK.thing : null,
    sc = th ? clamp((2.3 * th.r) / 0.2, 1, 1.4) : 1,
    rad = th ? clamp(th.r / (0.1 * sc), 0.15, 0.8) : 0.3,
    lump = th ? clamp(th.h * 1.05 + 0.003, 0.004, 0.065) : 0;
  PK.cover = pkBuild('cover:' + S.id + ':' + Math.round(lump * 400) + ':' + Math.round(rad * 20), (g) =>
    S.cover(g, lump, rad),
  );
  const M = (PK.cover.M = PK.cover.M || new Float32Array(16));
  M4.jointInto(M, PK_I, S.spot[0], S.spot[1], S.spot[2], 0, 0.35, 0);
  for (const i of [0, 1, 2, 8, 9, 10]) M[i] *= sc;
}
// what came of it. kind: 'nothing' · 'feel' (something in there, not out yet) · 'reveal' (the cover comes off it) ·
// 'take' (your hand brings it out). key: a stash's k, a FINDS key or the note's words (gfx/peek-junk pkKey)
function peekShow(kind, key, what, look) {
  if (!PK.on || PK.res) return;
  const k = pkKey(key);
  if ((kind === 'reveal' || kind === 'take') && k && (!PK.thing || PK.thing.key !== k)) {
    PK.thing = pkThingFor(k, look);
    if (PK.thing) pkPlaceThing(PK.thing);
    pkCover();
  }
  if ((kind === 'reveal' || kind === 'take') && !PK.thing) kind = 'nothing';
  PK.res = { kind, key: k, what: what || '' };
  PK.resAt = Math.max(R.time, PK.t0 + (PK_MIN[PK.how] || 1.1));
}
// the rummage stopped before anything came of it
function peekStop() {
  if (PK.on && !PK.res) PK.closing = R.time;
}
function peekClose() {
  PK.on = false;
  PK.res = null;
  PK.hold = null;
  if (PK.el) PK.el.hidden = true;
  vfUnclip();
}
function pkEl() {
  if (PK.el) return PK.el;
  const el = $('#peek');
  if (!el) return null;
  PK.el = el;
  PK.win = el.querySelector('.pk-win');
  PK.capEl = el.querySelector('.pk-cap');
  return el;
}
function pkCap(s) {
  if (PK.capEl) PK.capEl.textContent = s ? s.charAt(0).toUpperCase() + s.slice(1) : '';
}
// ── every frame, after the photo's square (gfx/frame renderFrame)
function peekFrame() {
  if (!PK.on) return;
  const P = PLAYER;
  if (!G.started || G.over || UI.caseOpen || UI.scene || CAP.on || !P || !P.onMap || VF.mode) return peekClose();
  const now = R.time,
    t = now - PK.t0;
  if (PK.closing) {
    if (now - PK.closing > 0.3) return peekClose();
    if (!PK.el.classList.contains('out')) PK.el.classList.add('out');
  } else if (!PK.res && t > 9) PK.closing = now; // nothing ever came of it
  if (PK.res && !PK.played && now >= PK.resAt) pkPlay();
  if (PK.played && t > PK.endAt) {
    if (!PK.el.classList.contains('out')) PK.el.classList.add('out');
    if (t > PK.endAt + 0.45) return peekClose();
  }
  pkTrackAt(PK.track, t, PK_HS);
  pkAnimate(t);
  pkRender(t);
  squareBlit(PK.win, PK.out, PK.S);
}
// the outcome starts playing: the hand's new path, and the words under the square
function pkPlay() {
  PK.played = true;
  const r = PK.res;
  PK.track = pkOutcomeTrack();
  if (r.kind === 'feel') pkCap('Something in there');
  else if (r.kind === 'nothing') pkCap(r.what || 'Nothing');
  else pkCap(r.what || '');
  if (r.kind === 'reveal' || r.kind === 'take') PK.el.classList.add('found');
  if (PK.thing && PK.thing.def.g && (r.kind === 'reveal' || r.kind === 'take')) PK.el.classList.add('theirs');
}
// the hand's bones, what it holds, a fridge's door, the lamp
function pkAnimate(t) {
  const S = PK_HS,
    played = PK.played,
    rk = played && PK.res.kind;
  M4.jointInto(PK_W, PK_I, S[1], S[2], S[3], S[5], S[4], S[6]);
  for (let f = 0; f < 5; f++) {
    const F = PK_FINGERS[f],
      m0 = PK_FM[f * 3],
      m1 = PK_FM[f * 3 + 1],
      m2 = PK_FM[f * 3 + 2],
      c = clamp(S[7] + S[9] * 0.2 * Math.sin(t * 8.5 + f * 1.9) * (F.thumb ? 0.5 : 1), -0.15, 1.1);
    if (F.thumb) {
      M4.jointInto(m0, PK_W, F.x, -0.006, F.z, 0.3 + c * 0.45, -0.85 + S[8] * 0.25, 0.85 - c * 0.35);
      M4.jointInto(m1, m0, 0, 0, F.len[0], 0.12 + c * 0.45, 0, 0);
      M4.jointInto(m2, m1, 0, 0, F.len[1], 0.1 + c * 0.6, 0, 0);
    } else {
      M4.jointInto(m0, PK_W, F.x, 0, F.z, 0.05 + c * 1.0, (f - 1.5) * 0.07 * (0.3 + S[8]), 0);
      M4.jointInto(m1, m0, 0, 0, F.len[0], 0.06 + c * 1.25, 0, 0);
      M4.jointInto(m2, m1, 0, 0, F.len[1], 0.04 + c * 0.85, 0, 0);
    }
  }
  // the grip: from then on it goes where the hand goes
  if (played && PK.grabAt && !PK.hold && t >= PK.grabAt) {
    const held = rk === 'reveal' ? PK.cover : PK.thing;
    if (held && held.M) {
      PK.hold = rk === 'reveal' ? 'cover' : 'thing';
      pkRigidInv(PK_TM, PK_W);
      M4.mulInto(PK.holdA, PK_TM, held.M);
      if (PK.hold === 'thing') pkHeld(PK.holdB, PK.thing);
      else PK.holdB.set(PK.holdA);
    }
  }
  if (PK.hold) {
    const k = PK.hold === 'thing' ? sstep(PK.grabAt + 0.1, PK.grabAt + 0.75, t) : 0,
      A = PK.holdA,
      B = PK.holdB,
      H = PK.holdM;
    for (let i = 0; i < 16; i++) H[i] = A[i] + (B[i] - A[i]) * k;
    pkOrtho(H);
    M4.mulInto((PK.hold === 'cover' ? PK.cover : PK.thing).M, PK_W, H);
  }
  if (PK.door) {
    const T = played ? t - (PK.resAt - PK.t0) : -1,
      k = T < 0 ? 0 : sstep(0, 0.75, T);
    PK.doorK = k;
    M4.jointInto(PK.door.M, PK_I, -0.28, 0, 0.215, 0, -k * 1.95, 0);
    // the light inside comes on with a stutter as the door swings
    PK.lamp = T < 0.12 ? 0.05 : T < 0.2 ? 0.6 : T < 0.26 ? 0.2 : 1;
  }
}
// ── drawing it
function pkDrawAt(m, M, U, tint) {
  if (!m) return;
  gl.uniformMatrix4fv(U.uModel, false, M);
  if (U.uTint) gl.uniform3fv(U.uTint, tint || PK_ONE);
  gl.bindVertexArray(m.vao);
  gl.drawElements(gl.TRIANGLES, m.count, gl.UNSIGNED_INT, 0);
}
// everything solid: the set, the cover, the thing, a door, your hand. glass: the see-through parts after
function pkDrawAll(U, glass) {
  const S = PK.set,
    th = PK.thing,
    hand = PK.hand,
    showHand = !glass;
  if (glass) {
    if (S.glass) pkDrawAt(S.glass, PK_I, U);
    if (th && th.T.glass) pkDrawAt(th.T.glass, th.M, U);
    return;
  }
  if (S.mesh) pkDrawAt(S.mesh, PK_I, U);
  if (PK.cover && PK.cover.mesh) pkDrawAt(PK.cover.mesh, PK.cover.M, U);
  if (th && th.T.mesh) pkDrawAt(th.T.mesh, th.M, U, !PK.played && th.def.g ? PK_DIM : null);
  if (PK.door && PK.door.mesh) pkDrawAt(PK.door.mesh, PK.door.M, U);
  if (showHand && hand) {
    pkDrawAt(hand.palm, PK_W, U);
    pkDrawAt(hand.sleeve, PK_W, U);
    for (let f = 0; f < 5; f++) for (let s = 0; s < 3; s++) pkDrawAt(hand.fingers[f][s], PK_FM[f * 3 + s], U);
  }
}
function pkCamera(t) {
  const c = PK.set.cam,
    th = PK.thing,
    played = PK.played,
    kind = played ? PK.res.kind : null,
    T = played ? t - (PK.resAt - PK.t0) : 0,
    show = kind === 'reveal' || kind === 'take',
    room =
      th && !th.def.fr
        ? clamp(1 - (th.r * 3.4) / Math.hypot(c.eye[0] - c.at[0], c.eye[1] - c.at[1], c.eye[2] - c.at[2]), 0, 1)
        : 1, // a big thing keeps the lens back
    push =
      Math.min(0.12, t * 0.03) +
      (show
        ? sstep(0.4, 2.4, T) * Math.min(PK.set.door ? 0.22 : 0.32, room)
        : kind === 'feel'
          ? sstep(0.2, 1.6, T) * 0.15
          : 0);
  let fx = c.at[0],
    fy = c.at[1],
    fz = c.at[2];
  if (show && th && !th.def.fr) {
    const k = sstep(0.3, 1.6, T),
      tc = pkThingAt(th),
      tx = tc[0],
      ty = tc[1],
      tz = tc[2];
    fx = lerp(fx, tx, k);
    fy = lerp(fy, ty, k);
    fz = lerp(fz, tz, k);
  }
  for (let i = 0; i < 3; i++) {
    const at = i === 0 ? fx : i === 1 ? fy : fz;
    PK_AT[i] = at;
    PK_EYE[i] = at + (c.eye[i] - c.at[i]) * (1 - push);
  }
  PK_EYE[0] += Math.sin(t * 0.9) * 0.004 + Math.sin(t * 2.3) * 0.0015;
  PK_EYE[1] += Math.sin(t * 1.3 + 1) * 0.003;
  // the focus: on the hand while it looks, then on what it found
  const palmX = PK_W[12] + PK_W[8] * 0.09,
    palmY = PK_W[13] + PK_W[9] * 0.09,
    palmZ = PK_W[14] + PK_W[10] * 0.09;
  let tx = palmX,
    ty = palmY,
    tz = palmZ;
  if (PK.set.door && (!played || T < 0.5)) {
    tx = 0.16;
    ty = 0.25;
    tz = 0.26;
  } else if (PK.set.door) {
    tx = fx;
    ty = fy;
    tz = fz;
  } else if (played && (show || kind === 'feel') && th && T > 0.5) {
    const tc = pkThingAt(th);
    tx = tc[0];
    ty = tc[1];
    tz = tc[2];
  }
  const d = Math.hypot(tx - PK_EYE[0], ty - PK_EYE[1], tz - PK_EYE[2]);
  PK.focus += (d - PK.focus) * 0.12;
  pkLookAtInto(PK_V, PK_EYE, PK_AT, PK_UP);
  pkPerspInto(PK_P, c.fov * (1 - push * 0.25), 0.01, 4);
  M4.mulInto(PK_VP, PK_P, PK_V);
}
function pkDofSet(u) {
  bindTex(0, PK.scene.tex, u.uSrc);
  gl.uniform2f(u.uTexel, 1 / PK.S, 1 / PK.S);
  gl.uniform1f(u.uFocus, PK.focus);
  gl.uniform1f(u.uAper, 2.4);
  gl.uniform1f(u.uFar, 3);
}
function pkOcc(n, x, y, z, r) {
  if (n >= 6) return n;
  PK_OCC[n * 4] = x;
  PK_OCC[n * 4 + 1] = y;
  PK_OCC[n * 4 + 2] = z;
  PK_OCC[n * 4 + 3] = r;
  return n + 1;
}
function pkRender(t) {
  const S = PK.set,
    played = PK.played,
    kind = played ? PK.res.kind : null,
    T = played ? t - (PK.resAt - PK.t0) : 0,
    th = PK.thing,
    theirs = th && th.def.g && (kind === 'reveal' || kind === 'take');
  pkCamera(t);
  // the lamp: parallel light from where it hangs onto the middle of the set
  const kp = S.key.p,
    at = S.cam.at;
  let dx = at[0] - kp[0],
    dy = at[1] - kp[1],
    dz = at[2] - kp[2];
  const dl = Math.hypot(dx, dy, dz) || 1;
  PK_KD[0] = dx / dl;
  PK_KD[1] = dy / dl;
  PK_KD[2] = dz / dl;
  const flick = theirs ? 1 + 0.06 * Math.sin(t * 23) * Math.sin(t * 7.1) : 1;
  for (let i = 0; i < 3; i++) PK_KC[i] = S.key.col[i] * PK.lamp * flick * PK.expo;
  pkLookAtInto(PK_LV, kp, at, Math.abs(PK_KD[1]) > 0.95 ? PK_ZN : PK_UP);
  pkOrthoInto(PK_LP, 0.5, 0.01, dl + 1.2);
  M4.mulInto(PK_LVP, PK_LP, PK_LV);
  // the soft dark under the things in there: your palm, your fingers, what's hidden
  let n = pkOcc(0, PK_W[12] + PK_W[8] * 0.06, PK_W[13] + PK_W[9] * 0.06 - 0.01, PK_W[14] + PK_W[10] * 0.06, 0.045);
  n = pkOcc(n, PK_W[12] + PK_W[8] * 0.13, PK_W[13] + PK_W[9] * 0.13 - 0.01, PK_W[14] + PK_W[10] * 0.13, 0.03);
  if (th && !th.def.fr) {
    const tc = pkThingAt(th);
    n = pkOcc(n, tc[0], tc[1], tc[2], Math.min(th.r * 0.8, 0.08));
  }
  gl.disable(gl.BLEND);
  gl.disable(gl.CULL_FACE);
  gl.enable(gl.DEPTH_TEST);
  gl.depthMask(true);
  // the shadow
  gl.bindFramebuffer(gl.FRAMEBUFFER, PK.shFb);
  gl.viewport(0, 0, PK.SM, PK.SM);
  gl.clear(gl.DEPTH_BUFFER_BIT);
  gl.enable(gl.POLYGON_OFFSET_FILL);
  gl.polygonOffset(1.5, 3);
  const SH = PK.shProg;
  gl.useProgram(SH.p);
  gl.uniformMatrix4fv(SH.U.uLVP, false, PK_LVP);
  pkDrawAll(SH.U, false);
  gl.disable(gl.POLYGON_OFFSET_FILL);
  // the picture
  gl.bindFramebuffer(gl.FRAMEBUFFER, PK.ms);
  gl.viewport(0, 0, PK.S, PK.S);
  gl.clearColor(0.012, 0.01, 0.009, 1);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  const M = PK.prog,
    U = M.U;
  gl.useProgram(M.p);
  gl.activeTexture(gl.TEXTURE4);
  gl.bindTexture(gl.TEXTURE_2D, PK.shTex);
  gl.uniform1i(U.uShadow, 4);
  gl.uniform2f(U.uShTexel, 1 / PK.SM, 1 / PK.SM);
  gl.uniformMatrix4fv(U.uVP, false, PK_VP);
  gl.uniformMatrix4fv(U.uLVP, false, PK_LVP);
  gl.uniform3fv(U.uEye, PK_EYE);
  gl.uniform1f(U.uTime, R.time);
  gl.uniform1f(U.uFar, 3);
  gl.uniform3fv(U.uKeyP, kp);
  gl.uniform3fv(U.uKeyD, PK_KD);
  gl.uniform3fv(U.uKeyC, PK_KC);
  gl.uniform2f(U.uKeyCone, S.key.cone[0], S.key.cone[1]);
  const amb = (PK.set.door ? 0.7 + 0.3 * PK.lamp : 1) * PK.expo;
  gl.uniform3f(U.uSky, S.sky[0] * amb, S.sky[1] * amb, S.sky[2] * amb);
  gl.uniform3f(U.uGnd, S.gnd[0] * PK.expo, S.gnd[1] * PK.expo, S.gnd[2] * PK.expo);
  gl.uniform3fv(U.uRimP, S.rim.p);
  gl.uniform3f(U.uRimC, S.rim.col[0] * PK.expo, S.rim.col[1] * PK.expo, S.rim.col[2] * PK.expo);
  gl.uniform3f(U.uBoxA, S.box[0], S.box[1], S.box[2]);
  gl.uniform3f(U.uBoxB, S.box[3], S.box[4], S.box[5]);
  gl.uniform1f(U.uBoxK, S.door ? 0.5 * PK.doorK : 1);
  gl.uniform4fv(U.uOcc, PK_OCC);
  gl.uniform1i(U.uOccN, n);
  gl.uniform1f(U.uEmitK, theirs ? 0.85 + 0.35 * Math.sin(t * 3.1) * sstep(0, 1, T) : th && th.def.g ? 0.35 : 1);
  gl.uniform1f(U.uGlass, 0);
  pkDrawAll(U, false);
  gl.enable(gl.BLEND);
  gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ZERO, gl.ONE);
  gl.depthMask(false);
  gl.uniform1f(U.uGlass, 1);
  pkDrawAll(U, true);
  gl.depthMask(true);
  gl.disable(gl.BLEND);
  gl.activeTexture(gl.TEXTURE4);
  gl.bindTexture(gl.TEXTURE_2D, null);
  gl.activeTexture(gl.TEXTURE0);
  gl.bindFramebuffer(gl.READ_FRAMEBUFFER, PK.ms);
  gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, PK.scene.fb);
  gl.blitFramebuffer(0, 0, PK.S, PK.S, 0, 0, PK.S, PK.S, gl.COLOR_BUFFER_BIT, gl.NEAREST);
  gl.bindFramebuffer(gl.READ_FRAMEBUFFER, null);
  gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, null);
  // the lens: only a sliver is sharp
  gl.disable(gl.DEPTH_TEST);
  pass(PK.dofProg, PK.dof, pkDofSet);
  bloomPasses(PK.dof, PK.blm);
  composite(PK.dof.tex, PK.blm[0].tex, PK.out, true);
  gl.bindVertexArray(null);
}
