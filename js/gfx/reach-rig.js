//@ gfx/reach-rig — Bones, arm solver, eyes that follow
//@ Defines: RIG, BODY_PTS, rigFrames, bodyPt, toLocal, armFK, det3, solve3, solveArm, armIK, handPt, lookAt, poseMix
//@ Uses:    core/util, world/grid, sim/pose, gfx/renderer, town/cast, sim/core
//@ (header made by tools/map.js; stripped by build.py)
// ───────────── bodies that reach for things: both rigs' bones, a small arm solver, and eyes that follow
// The game never reads any of this. It only moves arms and heads toward places on other bodies.
const RIG = {
  aliens: { pY: 1.06, tY: 0.03, sh: (s) => [s * 0.15, 0.6, -0.01], L1: 0.5, L2: 0.76, eye: [0, 1.03, 0.1], hd: [0, 0.83, 0.02] },
  lizards: { pY: 0.88, tY: 0.1, sh: (s) => [s * 0.28, 0.5, 0.02], L1: 0.34, L2: 0.56, eye: [0, 0.76, 0.2], hd: [0, 0.64, 0.1] },
  zombies: { pY: 0.9, tY: 0.05, sh: (s) => [s * 0.17, 0.5, -0.01], L1: 0.38, L2: 0.55, eye: [0, 0.72, 0.09], hd: [0, 0.6, 0.02] },
};
// where on a body, by rig: [frame ('T' torso or 'H' head), x, y, z]; s mirrors x. Human y in the torso frame scales with height.
const BODY_PTS = {
  human: { neck: ['T', 0.04, 0.6, 0.04], chest: ['T', 0, 0.42, 0.13], back: ['T', 0.09, 0.42, -0.15], waist: ['T', 0.1, 0.17, -0.12], shoulder: ['T', 0.17, 0.5, 0], belly: ['T', 0, 0.15, 0.13],
    head: ['H', 0, 0.12, 0.02], face: ['H', 0, 0.1, 0.11], mouth: ['H', 0, 0.05, 0.1], crown: ['H', 0, 0.245, 0], cheek: ['H', 0.07, 0.08, 0.07], temple: ['H', 0.09, 0.15, 0.02], nape: ['H', 0, 0.06, -0.07] },
  aliens: { neck: ['T', 0.02, 0.76, 0.03], chest: ['T', 0, 0.5, 0.1], back: ['T', 0.08, 0.5, -0.12], waist: ['T', 0.06, 0.18, -0.06], shoulder: ['T', 0.15, 0.64, 0], belly: ['T', 0, 0.22, 0.06],
    head: ['H', 0, 0.2, -0.04], face: ['H', 0, 0.16, 0.17], mouth: ['H', 0, 0.07, 0.15], crown: ['H', 0, 0.43, -0.05], cheek: ['H', 0.1, 0.12, 0.12], temple: ['H', 0.16, 0.24, 0.02], nape: ['H', 0, 0.05, -0.12] },
  lizards: { neck: ['T', 0.05, 0.6, 0.14], chest: ['T', 0, 0.4, 0.24], back: ['T', 0.12, 0.45, -0.2], waist: ['T', 0.14, 0.15, -0.18], shoulder: ['T', 0.27, 0.57, 0.02], belly: ['T', 0, 0.18, 0.22],
    head: ['H', 0, 0.1, 0.06], face: ['H', 0, 0.07, 0.3], mouth: ['H', 0, 0.02, 0.3], crown: ['H', 0, 0.21, 0], cheek: ['H', 0.12, 0.08, 0.15], temple: ['H', 0.13, 0.15, 0.05], nape: ['H', 0, 0.05, -0.1] },
  zombies: { neck: ['T', 0.04, 0.56, 0.03], chest: ['T', 0, 0.38, 0.16], back: ['T', 0.09, 0.38, -0.17], waist: ['T', 0.1, 0.12, -0.12], shoulder: ['T', 0.17, 0.52, 0], belly: ['T', 0, 0.12, 0.15],
    head: ['H', 0, 0.115, 0], face: ['H', 0, 0.1, 0.1], mouth: ['H', 0, 0.05, 0.09], crown: ['H', 0, 0.25, 0], cheek: ['H', 0.07, 0.08, 0.07], temple: ['H', 0.09, 0.15, 0.02], nape: ['H', 0, 0.06, -0.07] },
};
const rigKind = (c) => (c.tell && c.tell.type === 'true' && c.tell.t >= TF_CHANGE * 0.72 ? c.tell.fac || G.faction : 'human');
// the same bones the drawing uses, from a set of joint values (the ones being aimed for, so the solve and the pose agree)
function rigFrames(c, J) {
  J = J || c.J;
  const k = rigKind(c);
  if (k === 'human') {
    const h = c.look.h;
    let Rm = M4.trans(drawX(c), (c.y || 0) + J.rootY + (J.float || 0), drawZ(c));
    Rm = M4.mul(Rm, M4.rotY(c.dir));
    if (J.pitch) Rm = M4.mul(Rm, M4.rotX(J.pitch));
    if (J.roll) Rm = M4.mul(Rm, M4.rotZ(J.roll));
    const P = M4.joint(Rm, 0, 0.88 * h, 0, 0, 0, 0), T = M4.joint(P, 0, 0.06, 0, J.torso, J.twist || 0, 0);
    const Hd = M4.joint(T, 0, 0.645 * h, 0.02, J.hp + 0.07, J.hy + (c.gaze || 0), J.hr);
    return { k, T, Hd, h };
  }
  const R0 = RIG[k] || RIG.aliens, sc = (CREATURE_LOOK[k] || CREATURE_LOOK.aliens).s;
  let Rm = M4.trans(drawX(c), (c.y || 0) + (J.rootY + (J.float || 0)) * sc, drawZ(c));
  Rm = M4.mul(Rm, M4.rotY(c.dir));
  if (J.pitch) Rm = M4.mul(Rm, M4.rotX(J.pitch));
  if (J.roll) Rm = M4.mul(Rm, M4.rotZ(J.roll));
  Rm = M4.mul(Rm, M4.scale(sc, sc, sc));
  const P = M4.joint(Rm, 0, R0.pY, 0, 0, 0, 0), T = M4.joint(P, 0, R0.tY, 0, J.torso, J.twist || 0, 0);
  const Hd = k === 'aliens' ? M4.joint(T, 0, 0.83, 0.02, J.hp - 0.1, J.hy, J.hr) : k === 'lizards' ? M4.joint(T, 0, 0.64, 0.1, J.hp, J.hy, J.hr) : M4.joint(T, 0, 0.6, 0.02, J.hp, J.hy, J.hr + 0.25);
  return { k, T, Hd, h: 1 };
}
// a point on somebody, in the world
function bodyPt(c, part, s = 1, off) {
  const F = rigFrames(c), B = BODY_PTS[F.k] || BODY_PTS.human, d = B[part] || B.chest;
  const y = F.k === 'human' && d[0] === 'T' ? d[2] * F.h : d[2];
  const q = M4.xform(d[0] === 'H' ? F.Hd : F.T, d[1] * s, y, d[3]);
  return off ? [q[0] + off[0], q[1] + off[1], q[2] + off[2]] : [q[0], q[1], q[2]];
}
// a world point into a frame (rotations and one uniform scale only, which is all these bones are)
function toLocal(M, p) {
  const dx = p[0] - M[12], dy = p[1] - M[13], dz = p[2] - M[14], s2 = M[0] * M[0] + M[1] * M[1] + M[2] * M[2];
  return [(M[0] * dx + M[1] * dy + M[2] * dz) / s2, (M[4] * dx + M[5] * dy + M[6] * dz) / s2, (M[8] * dx + M[9] * dy + M[10] * dz) / s2];
}
// shoulder Rx(ua)·Rz(s·ao), elbow Rx(fa): where the hand ends up, in the torso's frame
function armFK(S, L1, L2, s, ua, ao, fa) {
  const ph = s * ao, sp = Math.sin(ph), cp = Math.cos(ph), su = Math.sin(ua), cu = Math.cos(ua), sf = Math.sin(fa), cf = Math.cos(fa);
  return [S[0] + L1 * sp + L2 * cf * sp, S[1] - L1 * cp * cu + L2 * (-cf * cp * cu + sf * su), S[2] - L1 * cp * su + L2 * (-cf * cp * su - sf * cu)];
}
function det3(m) { return m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) - m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) + m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]); }
function solve3(A, b) {
  const D = det3(A); if (Math.abs(D) < 1e-10) return [0, 0, 0];
  return [0, 1, 2].map((k) => det3(A.map((row, r) => row.map((v, j) => (j === k ? b[r] : v)))) / D);
}
// damped least squares on three angles, from wherever the arm already is: no flipping elbows
function solveArm(S, L1, L2, s, tgt, g) {
  let q = g.slice();
  const lo = [-3.2, -0.75, -2.6], hi = [1.1, 2.2, -0.02];
  for (let it = 0; it < 10; it++) {
    const H = armFK(S, L1, L2, s, q[0], q[1], q[2]), e = [tgt[0] - H[0], tgt[1] - H[1], tgt[2] - H[2]];
    if (e[0] * e[0] + e[1] * e[1] + e[2] * e[2] < 2e-5) break;
    const Jc = [0, 1, 2].map((k) => { const r = q.slice(); r[k] += 1e-3; const H2 = armFK(S, L1, L2, s, r[0], r[1], r[2]); return [(H2[0] - H[0]) / 1e-3, (H2[1] - H[1]) / 1e-3, (H2[2] - H[2]) / 1e-3]; });
    const A = [0, 1, 2].map((i) => [0, 1, 2].map((j) => Jc[i][0] * Jc[j][0] + Jc[i][1] * Jc[j][1] + Jc[i][2] * Jc[j][2] + (i === j ? 0.015 : 0)));
    const b = [0, 1, 2].map((i) => Jc[i][0] * e[0] + Jc[i][1] * e[1] + Jc[i][2] * e[2]);
    const dq = solve3(A, b);
    for (let k = 0; k < 3; k++) q[k] = clamp(q[k] + clamp(dq[k], -0.45, 0.45), lo[k], hi[k]);
  }
  return q;
}
const rigAim = (c, T) => Object.assign({}, c.J, { rootY: T.rootY, float: T.float, pitch: T.pitch, roll: T.roll, torso: T.torso, twist: T.twist });
// reach a hand (s: +1 left, −1 right) toward a world point. w blends it over whatever the pose already had.
function armIK(c, T, s, tgt, w = 1) {
  if (!tgt || w <= 0.001) return;
  const F = rigFrames(c, rigAim(c, T)), k = F.k, h = c.look.h, cw = c.look.w || 1;
  const S = k === 'human' ? [s * (0.16 * cw + 0.045), 0.475 * h, 0.012] : RIG[k].sh(s);
  const L1 = k === 'human' ? 0.32 * h : RIG[k].L1, L2 = k === 'human' ? 0.29 * h + 0.06 : RIG[k].L2;
  const key = s > 0 ? '_ikL' : '_ikR', m = c[key];
  const cur = s > 0 ? [T.uaL, T.aoL, T.faL] : [T.uaR, T.aoR, T.faR];
  const g = m && R.time - m.t < 0.4 ? m.q : cur;
  const q = solveArm(S, L1, L2, s, toLocal(F.T, tgt), g);
  c[key] = { q, t: R.time };
  if (s > 0) { T.uaL = lerp(T.uaL, q[0], w); T.aoL = lerp(T.aoL, q[1], w); T.faL = lerp(T.faL, q[2], w); }
  else { T.uaR = lerp(T.uaR, q[0], w); T.aoR = lerp(T.aoR, q[1], w); T.faR = lerp(T.faR, q[2], w); }
}
// where a hand is right now (as drawn), for the lights that go with it
function handPt(c, s, ext = 0) {
  const F = rigFrames(c), k = F.k, J = c.J, h = c.look.h, cw = c.look.w || 1;
  const S = k === 'human' ? [s * (0.16 * cw + 0.045), 0.475 * h, 0.012] : RIG[k].sh(s);
  const L1 = k === 'human' ? 0.32 * h : RIG[k].L1, L2 = (k === 'human' ? 0.29 * h + 0.06 : RIG[k].L2) + ext;
  const l = s > 0 ? armFK(S, L1, L2, s, J.uaL, J.aoL, J.faL) : armFK(S, L1, L2, s, J.uaR, J.aoR, J.faR);
  const q = M4.xform(F.T, l[0], l[1], l[2]);
  return [q[0], q[1], q[2]];
}
// turn the head (and eyes) to a point; w blends
function lookAt(c, T, tgt, w = 1) {
  if (!tgt || w <= 0.001) return;
  const F = rigFrames(c, rigAim(c, T)), k = F.k;
  const N = k === 'human' ? [0, 0.645 * c.look.h + 0.12, 0.04] : RIG[k].eye;
  const l = toLocal(F.T, tgt), dx = l[0] - N[0], dy = l[1] - N[1], dz = l[2] - N[2];
  const hy = clamp(Math.atan2(dx, dz), -1.25, 1.25), hp = clamp(Math.atan2(-dy, Math.hypot(dx, dz)) - (k === 'human' ? 0.07 : k === 'aliens' ? -0.1 : 0), -1.0, 1.15);
  T.hy = lerp(T.hy, hy, w); T.hp = lerp(T.hp, hp, w);
}
// organic wobble in [-1, 1]: three sines that never quite repeat
const wob = (t, s = 0) => Math.sin(t * 1.13 + s) * 0.5 + Math.sin(t * 2.71 + s * 1.7) * 0.3 + Math.sin(t * 4.37 + s * 2.3) * 0.2;
// 0 → 1 → 0 over [a, b], with soft edges
const bell = (p, a, b, e = 0.06) => sstep(a, a + e, p) * (1 - sstep(b - e, b, p));
const v3add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const v3lerp = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
// blend a pose (a plain object of joint targets) into T
function poseMix(T, P, w = 1) { for (const k in P) T[k] = lerp(T[k] != null ? T[k] : 0, P[k], w); }

