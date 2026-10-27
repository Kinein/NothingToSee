//@ sim/body-motion — The body in motion: gaits, punches and grabs, leg IK, sitting and lying poses
//@ Defines: MOTION, SETTLE, settle0, keyed, viaPose, motionPre, GAIT, JOG_W, GP, gaitParams, gaitTargets, PUNCH, GRAB, keyPose, handsToHead, photoPose, …
//@ Uses:    core/util, gfx/reach-rig, gfx/renderer
//@ (header made by tools/map.js; stripped by build.py)
// ───────────────────────── the body in motion
// The sim moves people about and says what they're doing; this layer is only how that looks. A walk eases into the
// legs and out of them, one pose blends into the next instead of snapping, a shove slides rather than jumps, and small
// gestures (a flinch, a swing, a hand out to a door) ride on top. None of it feeds back into the game.
const MOTION = {
  gaitIn: 0.12, gaitOut: 0.17,  // real seconds for a walk to come into the legs, and to leave them
  runStride: 0.6,               // a run takes longer strides: its leg cycle per tile, against the sim's
  jogStride: 0.68,              // and a jog a little less: about three steps a second at your pace, long and easy
  maxStride: 15,                // radians a second of leg cycle at most: on fast-forward the legs glide rather than blur
  cut: 0.2,                     // a joint jumping further than this in one frame is a cut, not a motion: it gets blended
  root: 0.13,                   // seconds a shove or a hop in position takes to slide out
  turn: 0.085,                  // seconds to come round to a new heading (you); everyone else a little slower
};
// seconds one pose takes to settle into the next, by where it's going
const SETTLE = { walk: 0.1, sit: 0.18, lie: 0.22, floor: 0.22, floorlie: 0.24, kneel: 0.12, buckle: 0.1, crouch: 0.17 };
// a critically damped spring pulling o[k] to 0 (v[k] its speed): eases in and out, never overshoots, at any frame rate
function settle0(o, v, k, st, dt) {
  const w = 2 / st, x = w * dt, e = 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x), c0 = o[k], vk = v[k] || 0, tmp = (vk + w * c0) * dt;
  v[k] = (vk - w * tmp) * e; o[k] = (c0 + tmp) * e;
}
// keyframes [[p, value], …], eased between
function keyed(p, K) {
  if (p <= K[0][0]) return K[0][1];
  for (let i = 1; i < K.length; i++) if (p <= K[i][0]) { const a = K[i - 1], b = K[i], u = (p - a[0]) / (b[0] - a[0]); return lerp(a[1], b[1], u * u * (3 - 2 * u)); }
  return K[K.length - 1][1];
}
const bodySide = (c) => (c.id && c.id.charCodeAt(c.id.length - 1) % 2 ? 1 : -1);
const bodySeed = (c) => (c.id ? (c.id.charCodeAt(0) * 7 + c.id.length * 13) % 17 : 0);
// a few poses are reached through another, the way a body has to: a faint goes at the knees first; up off the floor
// goes onto a hip, then a crouch, then the feet
function viaPose(c) {
  const p = c.pose, f = c.poseFrom, e = c.poseAt == null ? 9 : R.time - c.poseAt;
  if (p === 'floorlie' && (f === 'stand' || f === 'crouch') && e < 0.24) return 'buckle';
  if (p === 'stand' && !c.moving) {
    if (f === 'floorlie' && e < 0.7) return e < 0.32 ? 'floor' : 'crouch';
    if (f === 'floor' && e < 0.3) return 'crouch';
  }
  return p;
}
// once a frame, before the pose: how much walk is in the legs, where the stride is, what the body is turning into
function motionPre(c, dt) {
  const wp = c.walkPh || 0, d = c._wp == null ? 0 : wp - c._wp; c._wp = wp;
  if (d > 0 && d < 8) c.vph = ((c.vph || 0) + Math.min(d * (c.run ? MOTION.runStride : c.jog ? MOTION.jogStride : 1), dt * MOTION.maxStride)) % (TAU * 512);
  else if (c.vph == null) c.vph = wp % TAU;
  const on = c.moving ? 1 : 0;
  c.gaitW = c.gaitW == null ? on : clamp(c.gaitW + (on ? dt / MOTION.gaitIn : -dt / MOTION.gaitOut), 0, 1);
  const rt = on ? (c.run ? 1 : c.jog ? JOG_W : 0) : 0;
  c.runW = c.runW == null ? rt : c.runW < rt ? Math.min(rt, c.runW + dt / 0.25) : Math.max(rt, c.runW - dt / 0.3);
  if (c.pose !== c._pose) { c.poseFrom = c._pose || 'stand'; c._pose = c.pose; c.poseAt = R.time; }
  c.vpose = viaPose(c);
}
// A walk, a jog, or a run. Thighs swing from the hip; the knee folds as the leg comes through and gives a little as the
// foot takes the weight; the hips dip over the double step and rise over the single (a walk), or drop onto the stance
// leg and float between steps (a jog, a run); shoulders and arms counter the legs, and the head holds steady over it.
// A jog is its own thing, not half a run: an easy lean, arms bent near square and swinging mostly back past the hip
// (the hand never reaches out in front), a heel that kicks up behind, a light bounce, a little sway foot to foot.
const GAIT = {
  //     thigh swing, its forward bias, knee fold through, give on landing, knees never locked
  walk: { A: 0.4, fwd: 0.03, swingK: 0.72, loadK: 0.14, kb: 0, yB: 0, yA: -0.058, yP: 2, lean: 0.045, leanB: 0.008, tw: 0.075, hp: 0.03, Aa: 0.3, ab: -0.03, eb: 0.2, ef: 0.3, efS: 0, ao: 0.08, ax: 0, sway: 0 },
  jog: { A: 0.47, fwd: 0.085, swingK: 1.5, loadK: 0.3, kb: 0.07, yB: -0.074, yA: 0.058, yP: 1.45, lean: 0.12, leanB: 0.016, tw: 0.1, hp: -0.045, Aa: 0.5, ab: 0.2, eb: 1.36, ef: 0.12, efS: 0.16, ao: 0.115, ax: 0.05, sway: 0.016 },
  run: { A: 0.68, fwd: 0.17, swingK: 1.6, loadK: 0.3, kb: 0.04, yB: -0.1, yA: 0.075, yP: 1.6, lean: 0.22, leanB: 0.02, tw: 0.13, hp: -0.1, Aa: 0.68, ab: 0.08, eb: 1.36, ef: 0.16, efS: 0.12, ao: 0.15, ax: 0.03, sway: 0.008 },
};
const JOG_W = 0.55;   // where a jog sits on the walk-to-run scale (runW)
const GP = {};
function gaitParams(rw) {
  const lo = rw <= JOG_W ? GAIT.walk : GAIT.jog, hi = rw <= JOG_W ? GAIT.jog : GAIT.run;
  const u = rw <= JOG_W ? rw / JOG_W : (rw - JOG_W) / (1 - JOG_W);
  for (const k in lo) GP[k] = lo[k] + (hi[k] - lo[k]) * u;
  return GP;
}
function gaitTargets(c, T, p, rw) {
  const s = Math.sin(p), s2 = s * s, q = gaitParams(rw);
  const knee = (ph) => q.kb + q.swingK * Math.pow(Math.max(0, -Math.cos(ph + 0.3)), 1.4) + q.loadK * Math.pow(Math.max(0, Math.cos(ph + 1.1)), 3);
  T.thL = q.A * s - q.fwd; T.thR = -q.A * s - q.fwd;
  T.shL = knee(p); T.shR = knee(p + Math.PI);
  // a walk is highest as the legs pass; a jog lowest there, as the stance knee gives, and floats with the legs apart
  T.rootY = q.yA < 0 ? q.yB + q.yA * s2 : q.yB + q.yA * Math.pow(Math.abs(s), q.yP);
  T.torso = q.lean + Math.cos(2 * p) * q.leanB;
  T.twist = -q.tw * s;
  T.roll = -q.sway * Math.cos(p);   // over the left foot, then the right
  T.hy = q.tw * 0.75 * s; T.hp = q.hp + Math.cos(2 * p) * 0.012;
  T.uaL = -q.Aa * s + q.ab; T.uaR = q.Aa * s + q.ab;
  T.faL = -(q.eb + q.ef * Math.max(0, s) + q.efS * s); T.faR = -(q.eb + q.ef * Math.max(0, -s) - q.efS * s);   // the elbow closes as the arm comes forward
  T.aoL = q.ao - q.ax * Math.max(0, s); T.aoR = q.ao - q.ax * Math.max(0, -s);   // a forward hand comes in a touch across the body
}
// THEIR blow, your swing: guard, draw back, strike (it lands at .56), a beat held out there, and back
const PUNCH = {
  uaR: [[0, -0.55], [0.32, 0.2], [0.56, -1.55], [0.72, -1.45], [1, -0.4]],
  faR: [[0, -1.9], [0.32, -2.35], [0.56, -0.12], [0.72, -0.3], [1, -1.6]],
  aoR: [[0, 0.1], [0.32, 0.2], [0.56, 0.02], [1, 0.08]],
  uaL: [[0, -0.85], [0.56, -0.55], [1, -0.7]],
  faL: [[0, -2.0], [0.56, -2.2], [1, -1.8]],
  twist: [[0, 0], [0.32, -0.38], [0.56, 0.42], [0.72, 0.35], [1, 0]],
  hy: [[0, 0], [0.32, 0.28], [0.56, -0.32], [0.72, -0.26], [1, 0]],
  torso: [[0, 0.1], [0.32, 0.02], [0.56, 0.28], [0.72, 0.24], [1, 0.08]],
  hp: [[0, 0.05], [0.56, -0.06], [1, 0.05]],
  thL: [[0, -0.2], [0.32, -0.15], [0.56, -0.5], [1, -0.15]], shL: [[0, 0.22], [0.56, 0.45], [1, 0.2]],
  thR: [[0, 0.15], [0.56, 0.3], [1, 0.1]], shR: [[0, 0.2], [0.56, 0.35], [1, 0.15]],
  rootY: [[0, -0.03], [0.56, -0.08], [1, -0.02]],
};
// throwing yourself at somebody running away: both arms out for them
const GRAB = {
  uaL: [[0, -0.3], [0.5, -1.45], [0.75, -1.35], [1, -0.4]], uaR: [[0, -0.3], [0.5, -1.4], [0.75, -1.3], [1, -0.4]],
  faL: [[0, -0.5], [0.5, -0.25], [1, -0.6]], faR: [[0, -0.5], [0.5, -0.2], [1, -0.6]],
  aoL: [[0, 0.08], [0.5, 0.2], [1, 0.08]], aoR: [[0, 0.08], [0.5, 0.2], [1, 0.08]],
  torso: [[0, 0.1], [0.5, 0.5], [0.75, 0.45], [1, 0.1]], hp: [[0, 0], [0.5, -0.3], [1, 0]],
  thL: [[0, -0.1], [0.5, -0.6], [1, -0.1]], shL: [[0, 0.1], [0.5, 0.45], [1, 0.1]],
  thR: [[0, 0], [0.5, 0.38], [1, 0]], shR: [[0, 0.1], [0.5, 0.3], [1, 0.1]], rootY: [[0, 0], [0.5, -0.1], [1, 0]],
};
function keyPose(T, K, p, w) { for (const k in K) T[k] = lerp(T[k], keyed(p, K[k]), w); }
// both hands up over the head (hiding, a panic): IK onto the back of the skull
function handsToHead(c, T, w) {
  if (w <= 0.01 || !c.look) return;
  const F = rigFrames(c, rigAim(c, T));
  for (const s of [1, -1]) { const q = M4.xform(F.Hd, s * 0.1, 0.19, -0.03); armIK(c, T, s, [q[0], q[1], q[2]], w); }
}
// the camera out of the pocket and up to the eye in both hands, elbows tucked in; the shutter gives a small kick
function photoPose(c, T, pr) {
  const p = pr == null ? 0.5 : pr, up = sstep(0.02, 0.2, p) * (1 - sstep(0.72, 0.97, p)), kick = sstep(0.2, 0.24, p) * (1 - sstep(0.26, 0.36, p));
  c.fx.prop = 'camera';
  T.uaR = lerp(-0.45, -1.26, up); T.aoR = lerp(0.08, -0.44, up); T.faR = lerp(-1.5, -1.9, up);
  T.uaL = lerp(-0.3, -1.2, up); T.aoL = lerp(0.07, -0.44, up); T.faL = lerp(-1.2, -2.0, up);
  T.hp = lerp(T.hp, 0.12, up) - 0.07 * kick; T.hy = lerp(T.hy, 0, up); T.torso += 0.03 * up - 0.04 * kick;
}
// ── a leg, seen from the side: the hip at the origin, the foot to land (dz ahead, dy up; dy negative). Gives the
// thigh (forward is negative) and the knee bend, the knee always out in front. Out of reach, the leg points straight at it.
const LEG_T = 0.44, LEG_S = 0.41;   // thigh and shin, × the body's height scale (the bones the drawing uses)
const footY0 = (h) => 0.03 * h - 0.03;   // the bottom of the shin, standing: on the floor
function legIK(h, dz, dy) {
  const L1 = LEG_T * h, L2 = LEG_S * h, d = clamp(Math.hypot(dz, dy), Math.abs(L1 - L2) + 1e-3, (L1 + L2) * 0.9995);
  const al = Math.atan2(dz, -dy), be = Math.acos(clamp((L1 * L1 + d * d - L2 * L2) / (2 * L1 * d), -1, 1));
  const ga = Math.acos(clamp((L1 * L1 + L2 * L2 - d * d) / (2 * L1 * L2), -1, 1));
  return [-(al + be), Math.PI - ga];
}
// sat at seat height y: the hips on it, the feet flat on the floor a little ahead, the knees just under the hips
const SEAT_FOOT = 0.42;   // how far ahead of the hips the feet rest, × height scale
const seatLegs = (h, y) => legIK(h, SEAT_FOOT * h, footY0(h) - (y + 0.05));
function seatPose(c, T, y) {
  const h = c.look.h, t = c.animT, sd = bodySide(c), seed = bodySeed(c), L = seatLegs(h, y);
  T.thL = T.thR = L[0]; T.shL = T.shR = L[1]; T.rootY = y + 0.08 - 0.88 * h; T.uaL = T.uaR = -0.22; T.faL = T.faR = -0.65;
  T.torso = 0.03 + Math.sin(t * 1.5) * 0.01;   // settled in, breathing
  const ft = sstep(-0.2, 0.6, Math.sin(t * 0.09 + seed));   // now and then one foot slides out, and later tucks back
  if (sd > 0) { T.shL -= 0.34 * ft; T.thL += 0.05 * ft; } else { T.shR -= 0.34 * ft; T.thR += 0.05 * ft; }
  if (c.anim === 'idle') T.hy = Math.sin(t * 0.27 + seed) * 0.2 * sstep(0.1, 0.6, Math.sin(t * 0.11 + seed * 2));
}
function liePose(c, T) { T.pitch = -Math.PI / 2; T.rootY = 0.6; T.uaL = T.uaR = 0.05; T.faL = T.faR = -0.05; T.hp = -0.1; T.torso = Math.sin(c.animT * 1.2) * 0.012; }
function poseOver(T, P, w) { if (w <= 0) return; for (const k in P) T[k] = T[k] == null ? P[k] : lerp(T[k], P[k], w); }

