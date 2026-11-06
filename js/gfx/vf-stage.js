//@ gfx/vf-stage — The staged shot: the camera goes where evidence shows best, the subject poses for it
//@ Defines: VF_ST, VF_T, VF_SCREAM, VF_SLOW, VF_SHOT, HALF_SHOT, vfSolid, VF_CLEAR, vfSpotOk, vfLocal, vfFocus, vfEyeAt, vfPathAt, vfPathOk, vfPlan, vfStageBegin, …
//@ Uses:    core/util, gfx/reach-rig, gfx/viewfinder, gfx/renderer, world/grid, sim/pose, sim/core, horror/layer, audio/sound, world/light-map, …
//@ (header made by tools/map.js; stripped by build.py)
// ───────────── the staged shot. A photo worth having isn't left to where you happen to stand.
// Something odd (play/photos photoStakes: 'odd'): the lens whips onto it, overshoots a hair, and pushes in slow while
// the focus brackets hunt for it. Evidence ('card'): the camera leaves your hands and goes where the thing shows best
// (round to the front of them, beside the face, down at the hand), and the one in the frame gives it to the lens: a
// hand lifted and one long finger held out, the tongue all the way out, the changed face turned in to the flash. It
// only goes where nothing solid stands between it and the thing (vfSpotOk); when the way round is blocked it cuts
// there instead of flying through a wall, and when there's nowhere to stand it stays at your eye and only the pose is
// there. While the shot lines up the world holds its breath (vfSlow, game/loop), and the shutter waits for it
// (vfStaging, play/photos). Evidence is never calm about it: the picture turns to the horror (vfDread, gfx/look), a
// drone climbs under a heart going faster, the lens creeps in on a dolly-zoom and the lights stutter before the
// flash. And now and then, with a lens there to do it to, the thing turns on the camera: the head snaps round, the
// mouth opens, it comes at you, the square shakes and screams, and that is the picture you get (the screamer). Render only: what the shot files is still takePhoto's, and the pose is drawn and forgotten.
const VF_ST = {
  on: false,
  tier: '', // 'card' | 'odd'
  kind: '', // which shot (VF_SHOT)
  who: null, // the person the lens is on, if it's a person
  c: null, // the one posing (evidence only): vfPoseFx
  spec: null,
  t0: 0, // R.time it began
  side: 1, // the side of them the thing is on: the camera goes round that way
  off: false, // the camera has somewhere better to be than your eye
  show: false, // it hasn't, and they have their back to you: the pose is turned so your eye can see it
  cut: false, // and gets there by a cut, the way round being blocked
  dip: false,
  ready: false,
  w: 0, // how far into the pose
  slow: 1,
  eye: [0, 0, 0],
  f: [0, 0, 0], // the focus, smoothed
  fill0: 2, // how wide the frame was when it began, in metres at the subject
  yaw0: 0,
  pitch0: 0,
  a0: 0, // the move round the subject: from (angle, radius, height) at your eye
  r0: 0,
  y0: 0,
  a1: 0, // to the spot
  r1: 0,
  y1: 0,
  point: { s: 1, k: 0 }, // the finger held out (gfx/people)
  dread: 0, // how far the picture has turned for it (gfx/look lookTarget)
  scream: false, // this one turns on the lens
  screamed: false,
  lastScream: -1e9, // R.time of the last one: never two close together
  forceScream: null, // true/false: every shot does / none does (dev tools); null: chance
  gaped: false, // the mouth was opened for it
  flick: false,
  af: null,
};
// real seconds into the shot: the move, the cut (when the way round is blocked), the shutter
const VF_T = { move0: 0.28, move1: 1.45, cut: 0.62, card: 1.72, eye: 1.5, odd: 1.18, scream: 1.4, screamShot: 0.24 };
// the screamer: how likely, by day and by night; and not again within this many real seconds
const VF_SCREAM = { day: 0.2, night: 0.45, gap: 40 };
const VF_SLOW = { card: 0.07, odd: 0.28 }; // the world meanwhile, × its speed
// where each kind of evidence shows best. focus: what the lens looks at; ang: where the camera stands, round the
// subject from straight in front (0) toward the side the thing is on (radians; past 1.6 is behind them); d: how far
// off; up: camera height over the focus; fill: metres across the frame when it's there
const VF_SHOT = {
  hum: { focus: 'body', ang: 0.4, d: 2.5, up: -0.75, fill: 2.4 }, // from below: the feet off the floor
  speak: { focus: 'face', ang: 1.25, d: 1.5, up: 0.05, fill: 0.8 }, // side on, the wall and the face
  flicker: { focus: 'face', ang: 0.35, d: 1.25, up: 0.03, fill: 0.55 },
  tongue: { focus: 'tongue', ang: 1.15, d: 1.35, up: 0.04, fill: 0.95 }, // nearly in profile: how far it comes out
  shed: { focus: 'hands', ang: 0.5, d: 1.6, up: 0.3, fill: 1 },
  bask: { focus: 'chest', ang: 1.35, d: 1.8, up: 0.35, fill: 1.3 },
  feed: { focus: 'mouth', ang: 0.65, d: 1.35, up: 0.05, fill: 0.75 },
  limb: { focus: 'chest', ang: 0.7, d: 2.3, up: 0.45, fill: 1.9 },
  stare: { focus: 'head', ang: 2.1, d: 1.7, up: 0.2, fill: 1.1 }, // over the shoulder: the corner, and the face in it
  true: { focus: 'body', ang: 0.3, d: 3.1, up: -0.6, fill: 3 },
  odd: { focus: 'chest', ang: 0.6, d: 2, up: 0.15, fill: 1.5 },
  'half:face': { focus: 'face', ang: 0.45, d: 1.2, up: 0.03, fill: 0.55 },
  'half:head': { focus: 'head', ang: 0.9, d: 1.3, up: 0.1, fill: 0.7 },
  'half:hand': { focus: 'handface', ang: 0.5, d: 1.25, up: 0.02, fill: 0.7 },
  'half:ribs': { focus: 'chest', ang: 0.7, d: 1.5, up: 0.1, fill: 0.9 },
  'half:tail': { focus: 'tail', ang: 2.4, d: 1.7, up: 0.1, fill: 1.2 }, // the one thing you see from behind
  'trace:fingers': { focus: 'handface', ang: 0.45, d: 1.2, up: 0.02, fill: 0.62 }, // the finger, and the face looking at it
  'trace:blue': { focus: 'hands', ang: 0.3, d: 1.2, up: 0.12, fill: 0.72 },
  'trace:long': { focus: 'head', ang: 1.35, d: 1.2, up: 0.08, fill: 0.62 },
  'trace:neck': { focus: 'neck', ang: 1.45, d: 1.35, up: 0, fill: 0.8 },
  'trace:shine': { focus: 'face', ang: 0.12, d: 1.05, up: 0.02, fill: 0.42 },
  'trace:grey': { focus: 'face', ang: 0.35, d: 1.2, up: 0.03, fill: 0.55 },
  'trace:cold': { focus: 'face', ang: 0.35, d: 1.2, up: 0.03, fill: 0.55 },
  'trace:pallor': { focus: 'face', ang: 0.35, d: 1.2, up: 0.03, fill: 0.55 },
};
// a half-change's part (horror/half-forms HALF_PARTS) → its shot
const HALF_SHOT = {
  eye: 'face',
  snout: 'face',
  jaw: 'face',
  face: 'face',
  veins: 'face',
  skull: 'head',
  frill: 'head',
  hand: 'hand',
  arm: 'hand',
  ribs: 'ribs',
  tail: 'tail',
};
// the lens never stands in one of these, or looks through one: walls, windows, closed doors, the void
function vfSolid(x, z) {
  const ix = Math.floor(x),
    iz = Math.floor(z);
  if (!inb(ix, iz)) return true;
  const ch = tiles[I(ix, iz)];
  return ch === '#' || ch === 'W' || VOIDISH.has(ch) || ((ch === 'D' || ch === 'L') && doorClosed(ix, iz));
}
const VF_CLEAR = [0.3, 0, -0.3, 0, 0, 0.3, 0, -0.3, 0.22, 0.22, -0.22, 0.22, 0.22, -0.22, -0.22, -0.22];
// somewhere the camera can be, seeing (tx, tz): out of the walls with a little room round it, and a clear line to the
// thing, past nothing tall (a wardrobe, a shelf). strict: on the floor of the subject's own room, not in the furniture
function vfSpotOk(x, z, tx, tz, room, strict) {
  const ix = Math.floor(x),
    iz = Math.floor(z);
  if (vfSolid(x, z)) return false;
  if (strict && (blockAt[I(ix, iz)] || roomAt(x, z) !== room)) return false;
  for (let i = 0; i < VF_CLEAR.length; i += 2) if (vfSolid(x + VF_CLEAR[i], z + VF_CLEAR[i + 1])) return false;
  const dx = tx - x,
    dz = tz - z,
    n = Math.ceil(Math.hypot(dx, dz) / 0.1),
    sx = Math.floor(tx),
    sz = Math.floor(tz);
  for (let i = 1; i < n; i++) {
    const px = x + (dx * i) / n,
      pz = z + (dz * i) / n,
      qx = Math.floor(px),
      qz = Math.floor(pz);
    if (vfSolid(px, pz)) return false;
    if ((qx !== ix || qz !== iz) && (qx !== sx || qz !== sz) && blocksSight(qx, qz)) return false;
  }
  return true;
}
// a point on somebody, from their own frame (x to their left, z ahead of them) into the world
function vfLocal(c, lx, ly, lz) {
  const s = Math.sin(c.dir),
    co = Math.cos(c.dir);
  return [drawX(c) + co * lx + s * lz, (c.y || 0) + ly, drawZ(c) - s * lx + co * lz];
}
// what the lens looks at, on them, as drawn right now
function vfFocus(c, f, s) {
  if (f === 'hand') return handPt(c, s);
  if (f === 'handface') {
    const a = handPt(c, s),
      b = bodyPt(c, 'face');
    return [a[0] * 0.65 + b[0] * 0.35, a[1] * 0.65 + b[1] * 0.35, a[2] * 0.65 + b[2] * 0.35];
  }
  if (f === 'hands') {
    const a = handPt(c, 1),
      b = handPt(c, -1);
    return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2];
  }
  if (f === 'body') {
    const J = c.J || {},
      big = c.trueForm || (c.tell && c.tell.type === 'true');
    return [drawX(c), (c.y || 0) + (J.rootY || 0) + (J.float || 0) + (big ? 1.15 : 0.92) * c.look.h, drawZ(c)];
  }
  if (f === 'tongue') {
    const q = bodyPt(c, 'mouth');
    q[0] += Math.sin(c.dir) * 0.22;
    q[2] += Math.cos(c.dir) * 0.22;
    return q;
  }
  if (f === 'tail') {
    const q = bodyPt(c, 'waist');
    q[1] -= 0.25;
    return q;
  }
  return bodyPt(c, f === 'ribs' ? 'chest' : f);
}
function vfEyeAt(out) {
  const P = PLAYER;
  out[0] = P.x + Math.sin(P.dir) * 0.14;
  out[1] = (P.y || 0) + 1.52 * (P.look.h || 1);
  out[2] = P.z + Math.cos(P.dir) * 0.14;
  return out;
}
// the move round the subject: in close along the line you already see them on, then round to the spot
function vfPathAt(S, cx, cz, m, out) {
  const a = S.a0 + angDiff(S.a0, S.a1) * sstep(0.18, 1, m),
    r = lerp(S.r0, S.r1, sstep(0, 0.72, m));
  out[0] = cx + Math.sin(a) * r;
  out[1] = lerp(S.y0, S.y1, sstep(0.1, 0.9, m));
  out[2] = cz + Math.cos(a) * r;
  return out;
}
function vfPathOk(S, cx, cz, f) {
  const q = [0, 0, 0];
  for (let i = 1; i < 14; i++) {
    vfPathAt(S, cx, cz, i / 14, q);
    if (!vfSpotOk(q[0], q[2], f[0], f[2], null, false)) return false;
  }
  return true;
}
// where the camera goes: the shot's own spot first, then a little nearer, a little more to the front, the other side
function vfPlan(S) {
  const c = S.who,
    sp = S.spec,
    cx = drawX(c),
    cz = drawZ(c),
    room = roomAt(c.x, c.z),
    f = vfFocus(c, sp.focus, S.side),
    e = vfEyeAt([0, 0, 0]);
  S.a0 = Math.atan2(e[0] - cx, e[2] - cz);
  S.r0 = Math.hypot(e[0] - cx, e[2] - cz);
  S.y0 = e[1];
  // nearer the front before further round: the point is to see it from where they can't hide it
  const A = sp.ang * S.side,
    F = Math.max(0, sp.ang - 0.5) * S.side,
    tries = [A, 1, A, 0.8, F, 0.9, A * 0.5, 1, -A, 1, -A, 0.8, -F, 0.9, 0, 0.8, A, 0.62, -A, 0.62];
  for (let i = 0; i < tries.length; i += 2) {
    const a = c.dir + tries[i],
      r = sp.d * tries[i + 1],
      x = cx + Math.sin(a) * r,
      z = cz + Math.cos(a) * r;
    if (!vfSpotOk(x, z, f[0], f[2], room, true)) continue;
    S.a1 = a;
    S.r1 = r;
    S.y1 = clamp(f[1] + sp.up, 0.3, 2.35);
    S.off = true;
    S.cut = !vfPathOk(S, cx, cz, f);
    return;
  }
}
// vfOpen: what kind of shot this is (play/photos photoStakes)
function vfStageBegin(stake) {
  const S = VF_ST;
  vfStageEnd();
  S.c = null;
  S.w = 0;
  if (!stake || !VF.el || fightOn()) return;
  const tg = VF.aim,
    who = tg && tg.look ? tg : null;
  S.on = true;
  S.tier = stake.tier;
  S.kind = stake.kind;
  S.who = who;
  S.spec = (who && (VF_SHOT[stake.kind] || VF_SHOT.odd)) || null;
  S.t0 = R.time;
  S.ready = S.off = S.cut = S.dip = false;
  S.slow = 1;
  const P = PLAYER;
  S.yaw0 = P.dir; // from the way you face: the lens finds it (vfOpen has already snapped onto it)
  S.pitch0 = -0.13;
  VF.yaw = S.yaw0;
  VF.pitch = S.pitch0;
  S.side =
    stake.side || (who ? Math.sign(angDiff(who.dir, Math.atan2(P.x - who.x, P.z - who.z))) || 1 : 1);
  if (S.kind === 'trace:fingers' && who && who.fx && who.fx.prop) S.side = 1; // the other hand's holding something
  if (stake.tier === 'card' && who && rigKind(who) === 'human') {
    S.c = who;
    vfPlan(S);
  }
  S.show =
    !S.off && !!S.c && Math.abs(angDiff(who.dir, Math.atan2(P.x - who.x, P.z - who.z))) > 1.75;
  S.dread = 0;
  S.screamed = S.flick = false;
  // only with a lens there to turn on: from your own eye it would be turning on you, and it hasn't seen you
  S.scream =
    !!S.c &&
    S.off &&
    (S.forceScream != null
      ? S.forceScream
      : R.time - S.lastScream > VF_SCREAM.gap && filmRand() < lerp(VF_SCREAM.day, VF_SCREAM.night, HX.night || 0));
  if (S.tier === 'card') audio.sting('riser');
  const f = who ? vfFocus(who, S.spec.focus, S.side) : [tg.x, tg.item ? 0.15 : 0.7, tg.z];
  S.f[0] = f[0];
  S.f[1] = f[1];
  S.f[2] = f[2];
  vfEyeAt(S.eye);
  S.fill0 = 2 * Math.hypot(f[0] - S.eye[0], f[1] - S.eye[1], f[2] - S.eye[2]) * Math.tan(VF_WIDE / 2);
  VF.el.classList.toggle('big', S.tier === 'card');
  if (!S.af) S.af = VF.el.querySelector('.vf-af');
  if (S.af) S.af.className = 'vf-af hunt';
}
function vfStageEnd() {
  const S = VF_ST;
  S.on = false;
  S.ready = false;
  if (VF.el) VF.el.classList.remove('dip', 'flick', 'scream');
  if (S.af) S.af.className = 'vf-af';
}
// gfx/look: how far the picture turns while evidence is lined up
const vfDread = () => (VF_ST.on && VF_ST.tier === 'card' ? VF_ST.dread : 0);
// the camera for this frame, instead of vfLens's: true when it's done
function vfStageLens() {
  const S = VF_ST;
  if (!S.on || (S.who && S.who.onMap === false)) return false;
  const t = R.time - S.t0,
    c = S.who,
    tg = VF.aim,
    sp = S.spec;
  const sc = S.scream && t >= VF_T.scream, // it has turned on the lens: it's all face now
    f = c ? vfFocus(c, sc ? 'face' : sp.focus, S.side) : [tg.x, tg.item ? 0.15 : 0.7, tg.z];
  for (let i = 0; i < 3; i++) S.f[i] += (f[i] - S.f[i]) * (sc ? 0.6 : 0.35);
  if (S.tier === 'card') S.dread = sc ? 1 : sstep(0.05, 1.3, t) * 0.82;
  if (S.off) S.y1 += (clamp(S.f[1] + sp.up, 0.3, 2.35) - S.y1) * 0.2; // the camera rises with what it's on
  const e = S.eye;
  if (S.off && c) {
    const cx = drawX(c),
      cz = drawZ(c);
    if (!S.cut) vfPathAt(S, cx, cz, sstep(VF_T.move0, VF_T.move1, t), e);
    else if (t >= VF_T.cut) {
      // the way round is blocked: a cut to the spot, a touch further off, settling in
      const k = sstep(VF_T.cut, VF_T.move1 + 0.1, t),
        r = S.r1 * lerp(1.3, 1, k);
      e[0] = cx + Math.sin(S.a1) * r;
      e[1] = S.y1 + (1 - k) * 0.1;
      e[2] = cz + Math.cos(S.a1) * r;
    } else vfEyeAt(e);
    if (S.cut && !S.dip && t >= VF_T.cut - 0.12) {
      S.dip = true;
      VF.el.classList.add('dip');
    }
    if (sc) {
      // it comes at the lens: the camera jerks in on the face, close enough to feel the breath
      const k = sstep(VF_T.scream, VF_T.scream + 0.12, t);
      for (let i = 0; i < 3; i++) e[i] += (S.f[i] - e[i]) * 0.45 * k;
      if (!S.screamed) {
        S.screamed = true;
        S.lastScream = R.time;
        audio.sting('scream');
        HX.shake = Math.max(HX.shake || 0, 0.6);
        R.pulse = 1;
        VF.el.classList.add('scream');
      }
    } else if (S.tier === 'card') {
      // the last of it: the lens creeps in while the frame holds, and the room stretches behind (a dolly-zoom)
      const k = sstep(VF_T.move1 - 0.1, VF_T.card, t) * 0.24;
      for (let i = 0; i < 3; i++) e[i] += (S.f[i] - e[i]) * k;
    }
  } else vfEyeAt(e);
  // the lights stutter, just before the flash
  if (S.tier === 'card' && !S.scream && !S.flick && t >= (S.off ? VF_T.card : VF_T.eye) - 0.34) {
    S.flick = true;
    VF.el.classList.add('flick');
  }
  const dx = S.f[0] - e[0],
    dy = S.f[1] - e[1],
    dz = S.f[2] - e[2],
    d = Math.max(0.2, Math.hypot(dx, dz)),
    dist = Math.hypot(d, dy),
    yaw = Math.atan2(dx, dz),
    pitch = clamp(Math.atan2(dy, d), -0.8, 0.5);
  let fill, look;
  if (S.off) {
    // the lens stays on the thing all the way round; the frame closes in on it as it goes
    look = sstep(0.04, 0.42, t);
    fill = lerp(S.fill0, sp.fill, sstep(VF_T.move0, VF_T.move1 + 0.05, t));
    if (sc) fill = lerp(fill, 0.42, sstep(VF_T.scream, VF_T.scream + 0.1, t));
  } else {
    // from your eye: a whip onto it, a hair past and back, then a slow push in
    const k = sstep(0.16, 0.58, t),
      c1 = 1.9;
    look = k >= 1 ? 1 : 1 + (c1 + 1) * Math.pow(k - 1, 3) + c1 * Math.pow(k - 1, 2);
    const tight = sp ? sp.fill * (S.show ? 1.75 : S.tier === 'card' ? 1.15 : 1.5) : tg.item ? 0.9 : 1.6, // turned for your eye: wider, the head and the hand both in
      mid = Math.min(S.fill0, tight * 2.4);
    fill = lerp(lerp(S.fill0, mid, sstep(0.16, 0.6, t)), tight, sstep(0.62, S.tier === 'card' ? VF_T.eye : VF_T.odd, t));
  }
  const sh = sc ? bell(t, VF_T.scream, VF_T.scream + 0.7, 0.05) * (1 - sstep(VF_T.scream, VF_T.scream + 0.7, t) * 0.6) : 0;
  VF.yaw = S.yaw0 + angDiff(S.yaw0, yaw) * look + Math.sin(R.time * 0.9) * 0.003 * look + Math.sin(R.time * 71) * 0.045 * sh;
  VF.pitch = S.pitch0 + (pitch - S.pitch0) * Math.min(1, look) + Math.cos(R.time * 59) * 0.035 * sh;
  VF.fov = clamp(2 * Math.atan((fill * 0.5) / dist), 0.1, sc ? 1.35 : VF_WIDE);
  const at = S.tier !== 'card' ? VF_T.odd : S.scream ? VF_T.scream + VF_T.screamShot : S.off ? VF_T.card : VF_T.eye;
  if (!S.ready && t >= at) {
    S.ready = true;
    if (S.af) S.af.className = 'vf-af lock';
    if (S.tier === 'odd' && S.who) audio.sting('whisper'); // something odd, and the brackets have it
  }
  return true;
}
// every frame from vfFrame: how far into the pose, how slow the world, a half-change held out for the lens
function vfStageTick() {
  const S = VF_ST;
  if (!S.on) return;
  if (S.who && S.who.onMap === false) return vfStageEnd();
  if (VF.mode === 'live') {
    S.w = sstep(0.3, 1.2, R.time - S.t0);
    S.slow += ((VF_SLOW[S.tier] || 1) - S.slow) * 0.22;
  } else if (VF.mode === 'shot') {
    S.w = 1;
    S.slow = 1;
  } else {
    S.slow = 1;
    S.w = 1 - clamp((R.time - VF.t0 - 0.35) / 0.6, 0, 1);
    if (S.w <= 0) return vfStageEnd();
  }
  const tl = S.c && S.c.tell;
  if (tl && tl.type === 'half' && tl.t0r != null && VF.mode !== 'print') {
    tl.t0r = Math.max(tl.t0r, R.time - 0.4 * (tl.dur || 1)); // it stays out until the flash has it
  }
}
// the world's speed meanwhile (game/loop)
const vfSlow = () => (VF_ST.on && VF.mode === 'live' ? VF_ST.slow : 1);
// the shutter (play/photos): 'wait' while the shot lines up, 'go' once it has, null for any other shot
function vfStaging(a) {
  const S = VF_ST;
  if (!S.on || VF.act !== a || VF.mode !== 'live') return null;
  return S.ready || R.time - S.t0 > 4 ? 'go' : 'wait';
}
// the camera's own frame: the eye it shoots from, the line it leaves things out on, how much of the dark it sees
function vfStageEye(eye) {
  const S = VF_ST;
  if (!S.on || !S.off) return false;
  eye[0] = S.eye[0];
  eye[1] = S.eye[1];
  eye[2] = S.eye[2];
  return true;
}
// the focus brackets in the square, on the thing
function vfAf(VP) {
  const S = VF_ST,
    el = S.af;
  if (!S.on || !el) return;
  const f = S.f,
    x = VP[0] * f[0] + VP[4] * f[1] + VP[8] * f[2] + VP[12],
    y = VP[1] * f[0] + VP[5] * f[1] + VP[9] * f[2] + VP[13],
    w = VP[3] * f[0] + VP[7] * f[1] + VP[11] * f[2] + VP[15];
  if (w <= 0.05) return;
  const t = R.time - S.t0,
    sz = S.ready ? 30 : lerp(62, 36, sstep(0.2, 1.1, t));
  el.style.left = clamp((x / w) * 50 + 50, 8, 92).toFixed(1) + '%';
  el.style.top = clamp(50 - (y / w) * 50, 8, 92).toFixed(1) + '%';
  el.style.width = el.style.height = sz.toFixed(1) + '%';
}
// ── the pose: the one in the frame gives it to the lens. Weighted in and out (VF_ST.w); on top of whatever they're doing
const VF_POSE = {
  'trace:fingers': (c, T, w, S) => {
    // the hand comes up in front of the face, and one finger, far too long, held out straight; they look at it
    const s = S.side,
      h = c.look.h;
    armIK(c, T, s, vfHandUp(c, S), w); // up beside the face, not over it
    lookAt(c, T, handPt(c, s), 0.75 * w);
    S.point.s = s;
    S.point.k = sstep(0.45, 0.95, w);
    c.fx.point = S.point;
  },
  'trace:blue': (c, T, w, S) => {
    const h = c.look.h,
      o = S.show ? 0.45 : 0.15, // with their back to you, held out to the sides where you can see them
      y = (S.show ? 1.3 : 1.12) * h,
      z = S.show ? 0.08 : 0.3;
    armIK(c, T, 1, vfLocal(c, o, y, z), w);
    armIK(c, T, -1, vfLocal(c, -o, y, z), w);
    lookAt(c, T, handPt(c, S.side), 0.7 * w);
  },
  'trace:shine': (c, T, w, S) => S.off && lookAt(c, T, S.eye, w), // straight into the lens, and the flash in the eyes
  'trace:long': (c, T, w) => (T.hp -= 0.12 * w),
  'trace:neck': (c, T, w) => (T.hp -= 0.42 * w),
  'trace:grey': (c, T, w, S) => vfGlance(c, T, w, S, 0.45),
  'trace:cold': (c, T, w, S) => vfGlance(c, T, w, S, 0.45),
  'trace:pallor': (c, T, w, S) => vfGlance(c, T, w, S, 0.45),
  hum: (c, T, w) => {
    T.aoL = lerp(T.aoL, 0.85, w);
    T.aoR = lerp(T.aoR, 0.85, w);
    T.uaL = lerp(T.uaL, -0.35, w);
    T.uaR = lerp(T.uaR, -0.35, w);
    T.hp -= 0.25 * w;
    T.float = (T.float || 0) + 0.12 * w;
  },
  speak: (c, T, w, S) => {
    const s = -S.side; // the hand on the wall, on the far side from the lens
    armIK(c, T, s, vfLocal(c, s * 0.2, 1.48 * c.look.h, 0.45), 0.9 * w);
    T.hr += 0.2 * w;
  },
  flicker: (c, T, w, S) => {
    const F = FACTIONS[(c.tell && c.tell.fac) || G.faction];
    c.fx.skin = mix3(c.look.skinC, F.skin, w);
    c.fx.eye = F.eye;
    T.hr = lerp(T.hr, 0.28 * S.side, w);
    vfGlance(c, T, w, S, 0.5);
  },
  tongue: (c, T, w) => {
    c.fx.tongue = Math.max(c.fx.tongue || 0, w);
    T.hp -= 0.18 * w;
  },
  shed: (c, T, w) => {
    const s = 1;
    armIK(c, T, s, bodyPtFwd(c, 0.3), 0.6 * w);
    lookAt(c, T, handPt(c, s), 0.6 * w);
  },
  bask: (c, T, w) => (T.hr += 0.25 * w),
  feed: (c, T, w, S) => {
    const m = bodyPt(c, 'mouth'),
      s = Math.sin(c.dir),
      co = Math.cos(c.dir);
    armIK(c, T, -1, [m[0] + s * 0.08, m[1] - 0.03, m[2] + co * 0.08], w); // the meat at the mouth
    vfGlance(c, T, w, S, 0.4); // caught mid-bite, eyes on the lens
  },
  limb: (c, T, w) => {
    if (w > 0.4) c.fx.armOff = true;
    T.torso = lerp(T.torso, 0.5, w);
    lookAt(c, T, vfLocal(c, 0.2, 0.1, 0.55), 0.6 * w);
  },
  stare: (c, T, w, S) => vfGlance(c, T, sstep(0.5, 1, w), S, 0.55), // the head comes round from the corner
  true: (c, T, w) => {
    T.aoL = lerp(T.aoL, 0.6, w);
    T.aoR = lerp(T.aoR, 0.6, w);
    T.hp -= 0.2 * w;
  },
  'half:face': (c, T, w, S) => vfGlance(c, T, w, S, 0.6), // the changed face, turned in to the flash
  'half:head': (c, T, w, S) => vfGlance(c, T, w, S, 0.35),
  'half:hand': (c, T, w, S) => {
    const s = S.side;
    armIK(c, T, s, vfHandUp(c, S), w);
    lookAt(c, T, handPt(c, s), 0.7 * w);
  },
  'half:ribs': (c, T, w) => (T.torso += 0.08 * w),
};
// where a hand held up for the camera goes: beside the face, in front; with their back to your eye, out to the side and
// up past the shoulder, where you can see it round them
function vfHandUp(c, S) {
  const s = S.side,
    h = c.look.h;
  return S.show ? vfLocal(c, s * 0.44, 1.62 * h, -0.02) : vfLocal(c, s * 0.24, 1.36 * h, 0.3);
}
// what's on the face: with their back to your eye the head turns side on, so it shows in profile (not round to you)
const VF_FACE = new Set([
  'trace:shine',
  'trace:grey',
  'trace:cold',
  'trace:pallor',
  'trace:long',
  'trace:neck',
  'flicker',
  'tongue',
  'feed',
  'stare',
  'half:face',
  'half:head',
]);
// a look into the lens, only when there's a lens there to look into (from your own eye they'd be looking at you)
function vfGlance(c, T, w, S, k) {
  if (S.off) lookAt(c, T, S.eye, k * w);
}
function bodyPtFwd(c, d) {
  const q = bodyPt(c, 'chest');
  q[0] += Math.sin(c.dir) * d;
  q[2] += Math.cos(c.dir) * d;
  return q;
}
// sim/pose animate: after everything else, before the blend
function vfPoseFx(c, T, dt) {
  if (c.fx && c.fx.point) c.fx.point = null;
  const S = VF_ST;
  if (S.c !== c || !c.fx) return;
  if (!S.on) {
    S.w -= dt * 1.8;
    if (S.w <= 0) {
      S.w = 0;
      S.c = null;
      if (S.gaped) c.fx.gape = c.fx.scream = 0;
      S.gaped = false;
      return;
    }
  }
  const w = sstep(0, 1, S.w),
    fn = VF_POSE[S.kind];
  if (w <= 0.001) return;
  if (fn) fn(c, T, w, S);
  if (S.show && VF_FACE.has(S.kind)) T.hy = lerp(T.hy, S.side * 1.05, w);
  const t = R.time - S.t0;
  if (S.scream && t >= VF_T.scream) {
    // the screamer: the head snaps round to the lens, the mouth wide, the hands up and coming at it
    const k = sstep(VF_T.scream, VF_T.scream + 0.09, t) * w;
    c.fx.sharp = true;
    lookAt(c, T, S.eye, k);
    T.torso = lerp(T.torso, 0.42, k);
    T.hp = lerp(T.hp, -0.12, k);
    T.uaL = lerp(T.uaL, -1.45, k);
    T.uaR = lerp(T.uaR, -1.45, k);
    T.aoL = lerp(T.aoL, 0.55, k);
    T.aoR = lerp(T.aoR, 0.55, k);
    T.faL = lerp(T.faL, -0.7, k);
    T.faR = lerp(T.faR, -0.7, k);
    c.fx.gape = Math.max(c.fx.gape || 0, k);
    c.fx.scream = k;
    S.gaped = true;
  } else if (S.gaped) {
    c.fx.gape = c.fx.scream = 0;
    S.gaped = false;
  }
  if (c.fx.half) c.fx.half.k = Math.max(c.fx.half.k, w); // held out, no stutter, while the lens is on it
}
