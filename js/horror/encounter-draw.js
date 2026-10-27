//@ horror/encounter-draw — How an encounter looks: lights, poses, the bodies doing it
//@ Defines: ENC_FX, encFx, blessK, POSE, encPose, encPoseVictim, encPoseThing, encAfterPose, encThreatPose
//@ Uses:    gfx/reach-rig, core/util, horror/layer, horror/encounters, sim/core, gfx/renderer
//@ (header made by tools/map.js; stripped by build.py)
// the look of it, frame by frame (drawn only; the game reads none of this)
const ENC_FX = []; // a few moments that outlive the scene: a column of light taking someone up
function encFx() {
  for (let k = ENC_FX.length - 1; k >= 0; k--) {
    const f = ENC_FX[k],
      q = (G.t - f.t0) / f.dur;
    if (q > 1.15 || q < -0.1) {
      ENC_FX.splice(k, 1);
      continue;
    }
    const a = sstep(0, 0.15, q) * (1 - sstep(0.95, 1.15, q));
    HX.beams.push({ x: f.x, y: 7, z: f.z, r: 0.75, h: 7, col: [0.42, 1, 0.74], a: 0.8 * a });
    hxLight(f.x, 1.2, f.z, 5, mul3([0.3, 1, 0.65], 1.4 * a));
    for (let i = 0; i < 10; i++) {
      const ph = (R.time * 0.35 + i / 10) % 1,
        an = i * 2.4;
      hxGlint(
        f.x + Math.sin(an) * 0.6 * (1 - ph * 0.5),
        ph * 5,
        f.z + Math.cos(an) * 0.6 * (1 - ph * 0.5),
        0.13,
        [0.5, 1, 0.8],
        a * (1 - ph) * 0.6,
      );
    }
  }
  const E = G.enc;
  if (!E || (E.phase !== 'act' && E.phase !== 'change')) return;
  const m = encChar(E.by);
  if (!m) return;
  const [sx, sz] = E.S,
    [fx, fz] = E.F,
    px = fz,
    pz = -fx,
    t = R.time,
    p = encProg(E),
    on = E.phase === 'act' ? 1 : 0.4;
  if (E.fac === 'aliens') {
    hxLight(sx, 1.4, sz, 4.2, mul3([0.3, 1, 0.65], 1.1 * on));
    if (E.type === 'probe' && E.phase === 'act') {
      // a point of light working along the body, head to foot and back
      const u = Math.sin(t * 0.9) * 0.8;
      hxGlint(sx + fx * u, 1.2, sz + fz * u, 0.22, [0.6, 1, 0.8], 0.9);
      if (p > 0.72 && p < 0.84)
        hxGlint(sx - fx * 0.78, 1.22, sz - fz * 0.78, 0.55 + 0.25 * Math.sin(t * 20), [0.7, 1, 0.85], 1.2); // the implant, behind the ear
      if (rigKind(m) !== 'human') {
        // a cone of light off its fingertips, down onto the skin
        const hp = handPt(m, -1, 0.12);
        HX.beams.push({
          x: hp[0],
          y: hp[1],
          z: hp[2],
          r: 0.13,
          h: Math.max(0.12, hp[1] - 1.12),
          col: [0.45, 1, 0.75],
          a: 0.5,
        });
        hxGlint(hp[0], hp[1], hp[2], 0.16, [0.7, 1, 0.85], 0.9);
      }
    }
    if (E.type === 'specimen' && E.phase === 'act') {
      const v = encChar(E.vic[0]);
      if (v && rigKind(m) !== 'human') {
        // light where its fingers touch
        for (const s of [1, -1]) {
          const hp = handPt(m, s, 0.1);
          hxGlint(hp[0], hp[1], hp[2], 0.12 + 0.04 * Math.sin(t * 9 + s), [0.6, 1, 0.8], 0.8);
        }
        if (p > 0.56 && p < 0.7) {
          const nk = bodyPt(v, 'neck', -1);
          hxGlint(nk[0], nk[1], nk[2], 0.35 + 0.15 * Math.sin(t * 25), [0.75, 1, 0.85], 1.1);
        }
      }
    }
  } else if (E.fac === 'lizards') {
    hxLight(sx, 1.0, sz, 3.6, mul3([1, 0.6, 0.25], 0.9 * on));
    if (E.type === 'worship' || E.type === 'court')
      for (let i = 0; i < 5; i++) {
        // little flames set round it on the ground
        const a = (i / 5) * TAU + 0.3,
          fl = 0.75 + 0.25 * Math.sin(t * 13 + i * 2.1);
        hxGlint(sx + Math.sin(a) * 1.7, 0.12, sz + Math.cos(a) * 1.7, 0.2, [1, 0.6, 0.22], 0.75 * fl * on);
      }
    if (E.type === 'worship' && E.phase === 'act' && rigKind(m) !== 'human') {
      // the head under its claw lights from inside
      const tc = m.animT,
        vs = E.vic.map(encChar).filter(Boolean),
        k = Math.floor(tc / 7.5) % Math.max(1, vs.length),
        b = bell((tc % 7.5) / 7.5, 0.22, 0.78, 0.12),
        vk = vs[k];
      if (vk && b > 0.05) {
        const cr = bodyPt(vk, 'crown', 1, [0, 0.08, 0]);
        hxGlint(cr[0], cr[1], cr[2], 0.3 * b, [1, 0.72, 0.25], 0.9 * b);
        hxLight(cr[0], cr[1], cr[2], 1.6, mul3([1, 0.6, 0.2], 0.8 * b));
      }
    }
    if (E.type === 'court' && E.phase === 'act') {
      // her face warms as it gets her
      const v = encChar(E.vic[0]);
      if (v) {
        const fc = bodyPt(v, 'face');
        hxLight(fc[0], fc[1], fc[2], 1.4, mul3([1, 0.62, 0.2], 0.7 * sstep(0.25, 0.9, p)));
      }
    }
  } else {
    hxLight(sx, 1.4, sz, 3.6, mul3([0.55, 0.68, 0.58], 1.05 * on));
  }
}
const encProg = (E) => (E.tAct != null && E.dur ? clamp((G.t - E.tAct) / E.dur, 0, 1) : 0);
// the scene's own clock: everybody in it moves to the thing's time, so the bowing and the stepping keep together
const encClock = (E) => {
  const m = encChar(E.by);
  return m ? m.animT : R.time;
};
// how far along the body the probe is: head (0) to the shins (1) and back, unhurried
const probeU = (tc) => 0.5 - 0.5 * Math.cos(tc * 0.42);
// whose turn it is under the claw: one kneeler at a time, a few seconds each
function blessK(E, tc, i) {
  const n = Math.max(1, E.vic.length),
    cyc = 7.5,
    k = Math.floor(tc / cyc) % n,
    f = (tc % cyc) / cyc;
  return k === i ? bell(f, 0.22, 0.78, 0.12) : 0;
}
// set poses
const POSE = {
  kneel: (h) => ({ rootY: -0.4 * h, thL: -0.06, thR: -0.06, shL: 1.62, shR: 1.62, pitch: 0 }),
  lie: {
    pitch: -Math.PI / 2,
    rootY: 0.14,
    uaL: 0.25,
    uaR: -0.1,
    aoL: 0.55,
    aoR: 0.3,
    faL: -0.35,
    faR: -0.1,
    hp: -0.25,
    hy: 0.5,
    hr: 0,
    thL: 0.12,
    thR: -0.05,
    shL: 0.2,
    shR: 0.05,
    torso: 0,
    roll: 0.1,
  },
  sitUp: (h) => ({
    pitch: 0,
    roll: 0,
    rootY: 0.17 - 0.88 * h,
    thL: -1.4,
    thR: -1.3,
    shL: 0.35,
    shR: 0.6,
    torso: -0.2,
    uaL: 0.55,
    uaR: 0.55,
    aoL: 0.25,
    aoR: 0.25,
    faL: -0.1,
    faR: -0.1,
    hp: 0.45,
    hy: 0,
    hr: 0.15,
  }),
  allFours: (h) => ({
    pitch: 0,
    rootY: -0.4 * h,
    thL: -0.35,
    thR: -0.3,
    shL: 1.9,
    shR: 1.9,
    torso: 1.1,
    uaL: -1.2,
    uaR: -1.25,
    aoL: 0.08,
    aoR: 0.08,
    faL: -0.1,
    faR: -0.1,
    hp: 0.15,
    hy: 0,
    hr: 0,
  }),
  dazed: {
    pitch: 0,
    rootY: 0,
    thL: 0.04,
    thR: -0.03,
    shL: 0.05,
    shR: 0.1,
    torso: 0.14,
    hp: 0.38,
    hr: 0.2,
    uaR: -1.05,
    faR: -2.15,
    aoR: -0.15,
    uaL: 0.06,
    faL: -0.15,
    aoL: 0.08,
  },
  wipe: {
    pitch: 0,
    rootY: 0,
    torso: 0.1,
    hp: 0.25,
    hr: -0.1,
    uaR: -1.35,
    faR: -1.95,
    aoR: -0.35,
    uaL: 0.05,
    faL: -0.1,
  },
  hug: {
    pitch: 0,
    rootY: 0,
    torso: 0.18,
    hp: 0.4,
    uaL: -0.75,
    uaR: -0.75,
    faL: -1.95,
    faR: -1.95,
    aoL: -0.4,
    aoR: -0.4,
  },
  touchFace: { pitch: 0, rootY: 0, torso: 0.05, hp: 0.2, hr: -0.25, uaR: -1.0, faR: -2.0, aoR: -0.2, uaL: 0.05 },
  lookHand: { pitch: 0, rootY: 0, torso: 0.12, hp: 0.55, hr: 0.1, uaR: -0.85, faR: -1.55, aoR: -0.1, uaL: 0.05 },
  startle: {
    pitch: 0,
    rootY: 0,
    torso: -0.2,
    hp: -0.15,
    uaL: -1.55,
    uaR: -1.6,
    faL: -2.05,
    faR: -2.0,
    aoL: -0.25,
    aoR: -0.3,
    thL: -0.25,
    thR: 0.15,
    shL: 0.3,
    shR: 0.1,
  },
};
// the bodies, doing it
function encPose(E, c) {
  const isM = c.id === E.by;
  return (T, ch) => {
    if (ch.moving || G.enc !== E) return;
    if (isM) {
      if (rigKind(ch) !== 'human') encPoseThing(E, T, ch);
      return;
    }
    encPoseVictim(E, T, ch);
  };
}
function encPoseVictim(E, T, c) {
  const t = c.animT,
    fx = c.fx,
    act = E.phase === 'act',
    p = encProg(E),
    h = c.look.h,
    i = Math.max(0, E.vic.indexOf(c.id)),
    sd = i * 1.7 + 0.4;
  const m = encChar(E.by),
    tc = encClock(E);
  fx.eye = [0.4, 0.44, 0.42];
  fx.gape = 0;
  // standing in its thrall: weight on one leg, the head gone soft to one side, breathing slow
  T.hr = 0.16 + wob(t * 0.33, sd) * 0.08;
  T.hp = 0.18;
  T.uaL = 0.04 + Math.sin(t * 1.05 + sd) * 0.015;
  T.uaR = 0.05;
  T.aoL = T.aoR = 0.06;
  T.faL = -0.08 + wob(t * 0.4, sd) * 0.05;
  T.faR = -0.1;
  T.roll = wob(t * 0.28, sd) * 0.025;
  T.torso = 0.04 + Math.sin(t * 1.05 + sd) * 0.012;
  T.thL = 0.04;
  T.thR = -0.03;
  T.shL = 0.06;
  T.shR = 0;
  if (m) lookAt(c, T, bodyPt(m, 'face'), act ? 0.85 : 0.55 + 0.3 * sstep(0, 1, wob(t * 0.2, sd) * 0.5 + 0.5));
  if (!act) {
    if (E.type === 'worship' && E.phase === 'change') {
      poseMix(T, POSE.kneel(h));
      T.torso = 0.2;
      T.hp = 0.15;
    }
    return;
  }
  switch (E.type) {
    case 'probe': {
      // up off the ground on nothing, tipping back, turning slowly like something under water
      const up = sstep(0, 0.16, p),
        down = sstep(0.9, 0.99, p),
        lift = up * (1 - down);
      T.pitch = (-Math.PI / 2) * up;
      T.rootY = 0.14 * up + (0.92 + Math.sin(tc * 0.9) * 0.05) * lift;
      T.roll = wob(tc * 0.22, 3) * 0.18 * lift;
      T.hp = -0.3 - 0.3 * lift + wob(t * 0.3, 2) * 0.08;
      T.hy = wob(t * 0.25, 1) * 0.35;
      T.hr = 0;
      T.uaL = 0.18 + wob(t * 0.5, 1) * 0.22;
      T.uaR = 0.15 + wob(t * 0.47, 2) * 0.22;
      T.aoL = 0.3 + wob(t * 0.4, 3) * 0.18;
      T.aoR = 0.28 + wob(t * 0.43, 4) * 0.18;
      T.faL = -0.25 + wob(t * 0.6, 5) * 0.18;
      T.faR = -0.22 + wob(t * 0.55, 6) * 0.18;
      T.thL = 0.08 + wob(t * 0.35, 7) * 0.1;
      T.thR = -0.04 + wob(t * 0.33, 8) * 0.1;
      T.shL = 0.15 + wob(t * 0.4, 9) * 0.12;
      T.shR = 0.1 + wob(t * 0.42, 10) * 0.12;
      // where the light passes, the body answers: a twitch running down it
      const u = probeU(tc),
        jerk = Math.pow(Math.max(0, Math.sin(tc * 3.3 + u * 5)), 14) * lift;
      T.torso = -0.18 * jerk + 0.02;
      T.roll += Math.sin(t * 27) * 0.05 * jerk;
      fx.eye = [0.88, 0.93, 0.84];
      fx.gape = 0.25 + 0.5 * jerk;
      const imp = bell(p, 0.72, 0.86);
      if (imp > 0) {
        poseMix(
          T,
          {
            torso: -0.5,
            hp: -0.95,
            aoL: 1.25,
            aoR: 1.2,
            uaL: -0.45,
            uaR: -0.4,
            faL: -0.05,
            faR: -0.05,
            thL: 0.2,
            thR: 0.2,
          },
          imp,
        );
        T.roll += Math.sin(t * 31) * 0.08 * imp;
        fx.gape = Math.max(fx.gape, imp);
      }
      break;
    }
    case 'specimen': {
      // strung up by the arms on nothing, toes off the ground, turning
      const hang = sstep(0, 0.12, p) * (1 - sstep(0.93, 1, p));
      T.uaL = -2.9 * hang + wob(t * 0.5, 1) * 0.06;
      T.uaR = -2.82 * hang + wob(t * 0.5, 2) * 0.06;
      T.aoL = 0.12 * hang;
      T.aoR = 0.15 * hang;
      T.faL = T.faR = -0.14 * hang;
      T.float = (0.22 + Math.sin(tc * 0.8) * 0.025) * hang;
      T.thL = 0.06 * hang;
      T.thR = 0.14 * hang;
      T.shL = 0.28 * hang;
      T.shR = 0.4 * hang;
      T.hp = 0.3 - 0.45 * hang + wob(t * 0.3, 3) * 0.12;
      T.hy = 0;
      T.hr = wob(t * 0.27, 4) * 0.4 * hang;
      T.roll = wob(tc * 0.2, 4) * 0.05;
      const pry = bell(p, 0.28, 0.5),
        nd = bell(p, 0.56, 0.7, 0.03);
      fx.eye = [0.88, 0.93, 0.84];
      fx.gape = 0.15 + 0.75 * pry;
      if (pry > 0) {
        T.hp = lerp(T.hp, -0.4, pry);
        T.hr *= 1 - pry;
      }
      if (nd > 0) {
        T.roll = Math.sin(t * 33) * 0.08 * nd;
        T.torso = -0.3 * nd;
        T.hp = -0.6;
        T.thL = -0.35 * nd * Math.max(0, Math.sin(t * 13));
        T.thR = -0.35 * nd * Math.max(0, -Math.sin(t * 13));
        fx.gape = 1;
      }
      break;
    }
    case 'worship': {
      // down to the ground and up again, all together, hands reaching for it each time the head comes up
      poseMix(T, POSE.kneel(h));
      const bless = blessK(E, tc, i),
        ph = tc * 0.85 - i * 0.42;
      const bow = sstep(-0.35, 0.7, Math.sin(ph)) * (1 - bless);
      T.torso = lerp(-0.12, 1.22, bow);
      T.hp = lerp(-0.3, 0.7, bow);
      T.hr = wob(t * 0.4, sd) * 0.06;
      T.roll = 0;
      if (m) lookAt(c, T, bodyPt(m, 'face'), 1 - sstep(0.2, 0.6, bow));
      const d = c.dir,
        fw = [Math.sin(d), 0, Math.cos(d)],
        lt = [Math.cos(d), 0, -Math.sin(d)];
      for (const s of [1, -1]) {
        const ground = [c.x + fw[0] * 0.62 + lt[0] * s * 0.16, 0.04, c.z + fw[2] * 0.62 + lt[2] * s * 0.16];
        const reach = m
          ? v3add(bodyPt(m, 'face'), [lt[0] * s * 0.32, 0.25 + Math.sin(t * 1.3 + s) * 0.04, lt[2] * s * 0.32])
          : ground;
        armIK(c, T, s, v3lerp(reach, ground, sstep(0.25, 0.85, bow)), 1 - bless * 0.7);
      }
      if (bless > 0) {
        poseMix(
          T,
          { torso: -0.08, hp: -0.55, hy: 0, uaL: 0.15, uaR: 0.15, aoL: 0.18, aoR: 0.18, faL: -0.05, faR: -0.05 },
          bless,
        );
        T.roll = Math.sin(t * 25) * 0.035 * bless;
        fx.eye = mix3([0.4, 0.44, 0.42], [1, 0.72, 0.18], bless);
        fx.slit = bless > 0.5;
      }
      break;
    }
    case 'massage':
      if (i === 0 && m) {
        // braced behind it, rocking into it, thumbs working its shoulders
        T.torso = 0.3 + Math.sin(tc * 1.55) * 0.05;
        T.roll = Math.sin(tc * 1.55) * 0.035;
        T.thL = 0.1;
        T.thR = -0.14;
        T.shL = 0.12;
        T.shR = 0.2;
        const ld = m.dir,
          lt = [Math.cos(ld), 0, -Math.sin(ld)];
        for (const s of [1, -1]) {
          const kn = tc * 3 + (s > 0 ? 0 : Math.PI);
          armIK(
            c,
            T,
            s,
            v3add(bodyPt(m, 'shoulder', s), [
              lt[0] * s * -0.04 + lt[0] * 0.025 * Math.cos(kn),
              0.05 + 0.03 * Math.sin(kn),
              lt[2] * s * -0.04 + lt[2] * 0.025 * Math.cos(kn),
            ]),
          );
        }
        lookAt(c, T, bodyPt(m, 'neck'), 0.85);
      } else if (m) {
        // on his knees in front of it, rubbing its feet
        poseMix(T, POSE.kneel(h));
        T.torso = 0.75;
        T.roll = 0;
        const ld = m.dir,
          fw = [Math.sin(ld), 0, Math.cos(ld)],
          lt = [Math.cos(ld), 0, -Math.sin(ld)];
        for (const s of [1, -1]) {
          const kn = tc * 2.6 + (s > 0 ? 0 : 2);
          armIK(c, T, s, [
            m.x + fw[0] * 0.32 + lt[0] * s * 0.17 + fw[0] * 0.04 * Math.cos(kn),
            0.12 + 0.03 * Math.sin(kn),
            m.z + fw[2] * 0.32 + lt[2] * s * 0.17 + fw[2] * 0.04 * Math.cos(kn),
          ]);
        }
        lookAt(c, T, [m.x + fw[0] * 0.3, 0.1, m.z + fw[2] * 0.3], 0.8);
      }
      break;
    case 'court': {
      // she sways with it, then gives it her hand, and leans into its claw
      const ch2 = sstep(0.25, 0.9, p),
        give = sstep(0.38, 0.56, p),
        stroke = bell(p, 0.6, 0.92, 0.07);
      T.roll = Math.sin(tc * 1.2) * 0.045 * (0.3 + ch2);
      T.torso = 0.04 + 0.12 * sstep(0.8, 0.95, p);
      if (m) {
        lookAt(c, T, bodyPt(m, 'face'), 0.95);
        armIK(c, T, -1, v3add(v3lerp(bodyPt(c, 'chest'), bodyPt(m, 'chest'), 0.5), [0, 0.08, 0]), give);
      }
      T.hr = lerp(T.hr, -0.3, stroke);
      fx.eye = mix3([0.4, 0.44, 0.42], [1, 0.75, 0.2], ch2);
      fx.slit = ch2 > 0.6;
      break;
    }
    case 'dance': {
      // held close, swaying on the beat, her head on its shoulder; once, it dips her back
      const bt = tc * 1.6,
        dip = bell(p, 0.44, 0.56, 0.05);
      T.rootY = -0.025 * (0.5 + 0.5 * Math.cos(bt * 2));
      T.thL = Math.sin(bt) * 0.13;
      T.thR = -T.thL;
      T.shL = Math.max(0, Math.sin(bt)) * 0.22;
      T.shR = Math.max(0, -Math.sin(bt)) * 0.22;
      T.roll = Math.sin(bt * 0.5) * 0.04;
      T.torso = -0.45 * dip;
      if (m) {
        armIK(c, T, 1, bodyPt(m, 'back', -1, [0, 0.06, 0]));
        armIK(c, T, -1, bodyPt(m, 'waist', 1));
        lookAt(c, T, bodyPt(m, 'shoulder', -1, [0, 0.1, 0]), 0.8 * (1 - dip));
      }
      T.hr = 0.32 * (1 - dip);
      T.hp = lerp(T.hp, -0.6, dip);
      break;
    }
    case 'tend': {
      // knelt by it, washing its face with a rag, a hand on its shoulder
      poseMix(T, POSE.kneel(h));
      T.roll = 0;
      const lean = bell(p, 0.8, 0.96, 0.05);
      T.torso = 0.24 + 0.32 * lean;
      fx.prop = 'rag';
      if (m) {
        const fc = bodyPt(m, 'face'),
          ld = m.dir,
          lt = [Math.cos(ld), 0, -Math.sin(ld)],
          wp = t * 2.2;
        armIK(
          c,
          T,
          -1,
          [fc[0] + lt[0] * 0.04 * Math.cos(wp), fc[1] + 0.035 * Math.sin(wp), fc[2] + lt[2] * 0.04 * Math.cos(wp)],
          1 - lean,
        );
        armIK(c, T, 1, bodyPt(m, 'shoulder', 1, [0, 0.04, 0]), 1);
        lookAt(c, T, fc, 1);
        if (lean > 0) T.hp = lerp(T.hp, 0.5, lean);
      }
      T.hr = 0.18;
      break;
    }
  }
}
function encPoseThing(E, T, c) {
  const t = c.animT,
    fx = c.fx,
    p = encProg(E),
    act = E.phase === 'act',
    vs = E.vic.map(encChar).filter(Boolean),
    v = vs[0];
  if (!act) {
    if (v) lookAt(c, T, bodyPt(v, 'face'), 0.6);
    return;
  }
  switch (E.type) {
    case 'probe': {
      // bent over the body from the far side, one hand working along it, the head ticking like an insect's
      T.float = 0.3 + Math.sin(t * 1.6) * 0.04;
      T.torso = 0.5;
      T.thL = T.thR = -0.08;
      T.shL = T.shR = 0.12;
      if (!v) break;
      const F = rigFrames(v),
        u = probeU(t),
        imp = bell(p, 0.72, 0.86);
      const tgt =
        imp > 0.5
          ? bodyPt(v, 'temple', 1)
          : (() => {
              const q = M4.xform(
                F.T,
                wob(t * 0.8, 1) * 0.04,
                lerp(0.72 * v.look.h, -0.75 * v.look.h, u),
                0.24 + Math.sin(t * 2.2) * 0.03,
              );
              return [q[0], q[1], q[2]];
            })();
      armIK(c, T, -1, tgt, 1);
      const hov = M4.xform(
        F.T,
        0.06 + wob(t * 0.6, 3) * 0.08,
        0.48 * v.look.h + wob(t * 0.5, 4) * 0.12,
        0.34 + wob(t * 0.9, 5) * 0.05,
      );
      armIK(c, T, 1, imp > 0.3 ? bodyPt(v, 'chest', 1, [0, 0.06, 0]) : [hov[0], hov[1], hov[2]], 0.9);
      lookAt(c, T, tgt, 0.9);
      T.hr = wob(t * 0.6, 2) * 0.25 + (Math.sin(t * 1.3) > 0.85 ? Math.sin(t * 40) * 0.15 : 0);
      break;
    }
    case 'specimen': {
      // circling it, fingertips on its temples, prying the mouth, and once the long finger goes in
      T.float = 0.16 + Math.sin(t * 1.4) * 0.03;
      T.torso = 0.2;
      if (!v) break;
      const pry = bell(p, 0.28, 0.5),
        nd = bell(p, 0.56, 0.7, 0.03),
        tw = wob(t * 1.3, 2) * 0.012;
      if (nd > 0) {
        armIK(c, T, -1, bodyPt(v, 'neck', -1, [0, 0.02, 0]));
        armIK(c, T, 1, bodyPt(v, 'temple', 1));
        lookAt(c, T, bodyPt(v, 'neck', -1));
      } else if (pry > 0) {
        armIK(c, T, -1, bodyPt(v, 'mouth', 1, [0, -0.02 - 0.03 * pry, 0]));
        armIK(c, T, 1, bodyPt(v, 'crown'));
        lookAt(c, T, bodyPt(v, 'mouth'));
      } else {
        armIK(c, T, -1, bodyPt(v, 'temple', -1, [tw, tw, 0]));
        armIK(c, T, 1, bodyPt(v, 'temple', 1, [-tw, tw, 0]));
        lookAt(c, T, bodyPt(v, 'face'));
      }
      T.hr = wob(t * 0.5, 1) * 0.42;
      break;
    }
    case 'worship': {
      // tall, chest out, arms open to them; it looks along the row and lays a claw on one head at a time
      const k = Math.floor(t / 7.5) % Math.max(1, vs.length),
        f = (t % 7.5) / 7.5,
        b = bell(f, 0.22, 0.78, 0.12),
        vk = vs[k];
      const bw = sstep(-0.35, 0.7, Math.sin(t * 0.85));
      T.rootY = -0.04;
      T.torso = -0.15 + bw * 0.06 + b * 0.55;
      T.thL = T.thR = -0.12;
      T.shL = T.shR = 0.22;
      T.uaL = T.uaR = -0.5;
      T.aoL = T.aoR = 0.95 + bw * 0.12;
      T.faL = T.faR = -0.55;
      fx.frill = 0.5 + 0.5 * bw;
      fx.tongue = Math.pow(Math.max(0, Math.sin(t * 2.9)), 10);
      if (vk) {
        lookAt(c, T, bodyPt(vk, 'head'), 0.9);
        armIK(c, T, -1, bodyPt(vk, 'crown', 1, [0, 0.05, 0]), b);
      }
      T.hr = wob(t * 0.4) * 0.12;
      break;
    }
    case 'massage': {
      // down on its haunches, head rolled back, the tongue loose; now and then it pats the one at its feet
      T.rootY = -0.42;
      T.thL = T.thR = -1.1;
      T.shL = T.shR = 1.7;
      T.torso = 0.12;
      T.hp = -0.35 + wob(t * 0.3) * 0.06;
      T.hy = wob(t * 0.2, 1) * 0.3;
      T.hr = wob(t * 0.25, 2) * 0.15;
      T.uaL = T.uaR = -0.35;
      T.faL = T.faR = -0.6;
      fx.tongue = 0.22 + 0.08 * Math.sin(t * 1.3);
      fx.tongueCurl = 0.9;
      fx.frill = 0.15 + 0.15 * Math.sin(t * 1.1);
      const ft = vs[1],
        pat = bell((t % 9) / 9, 0.3, 0.75, 0.12);
      if (ft) armIK(c, T, 1, bodyPt(ft, 'crown', 1, [0, 0.04 + 0.03 * Math.max(0, Math.sin(t * 6)), 0]), pat);
      break;
    }
    case 'court': {
      // a display: swaying, the frill thrumming, the head bobbing; then the claw held out, and a stroke down her cheek
      const give = sstep(0.38, 0.56, p),
        stroke = bell(p, 0.6, 0.92, 0.07),
        late = sstep(0.82, 0.95, p);
      T.torso = 0.25 + 0.15 * late;
      T.hy = Math.sin(t * 1.2) * 0.3 * (1 - give);
      T.roll = Math.sin(t * 1.2) * 0.07 * (1 - give * 0.6);
      T.hp = -0.2 + Math.pow(Math.max(0, Math.sin(t * 2.4)), 6) * 0.35 * (1 - give);
      T.uaL = T.uaR = -0.5;
      T.aoL = T.aoR = 0.5;
      T.faL = T.faR = -0.6;
      fx.frill = 0.6 + 0.4 * Math.abs(Math.sin(t * 4.5)) * (1 - give * 0.5);
      fx.tongue = Math.pow(Math.max(0, Math.sin(t * 2.2)), 10) * 0.8;
      fx.tongueAim = -0.25;
      if (v) {
        lookAt(c, T, bodyPt(v, 'face'), 0.7 + 0.3 * give);
        armIK(c, T, -1, v3add(v3lerp(bodyPt(v, 'chest'), bodyPt(c, 'chest'), 0.5), [0, 0.08, 0]), give);
        armIK(c, T, 1, bodyPt(v, 'cheek', -1, [0, 0.03 * Math.sin(t * 1.6), 0]), stroke);
      }
      break;
    }
    case 'dance': {
      // it holds them close and turns them, the jaw slack on their shoulder
      const bt = t * 1.6,
        dip = bell(p, 0.44, 0.56, 0.05);
      T.rootY = -0.025 * (0.5 + 0.5 * Math.cos(bt * 2));
      T.thL = Math.sin(bt) * 0.13;
      T.thR = -T.thL;
      T.shL = Math.max(0, Math.sin(bt)) * 0.22;
      T.shR = Math.max(0, -Math.sin(bt)) * 0.22;
      T.torso = 0.14 + 0.5 * dip;
      T.roll = Math.sin(bt * 0.5 + 1) * 0.05;
      fx.armOff = false;
      if (v) {
        armIK(c, T, 1, bodyPt(v, 'waist', -1));
        armIK(c, T, -1, bodyPt(v, 'back', 1, [0, 0.08, 0]));
        lookAt(c, T, bodyPt(v, 'shoulder', 1, [0, 0.06, 0]), 0.8);
      }
      T.hr = -0.38;
      break;
    }
    case 'tend': {
      // sat on the ground like a broken doll, stroking the hair of the one who washes it; at the end it pulls them close
      T.rootY = -0.74;
      T.thL = T.thR = -1.45;
      T.shL = 0.22;
      T.shR = 0.3;
      T.torso = 0.1;
      T.hr = 0.25;
      T.uaR = 0.1;
      T.faR = -0.3;
      fx.armOff = false;
      if (v) {
        const pull = bell(p, 0.8, 0.96, 0.05);
        armIK(
          c,
          T,
          1,
          pull > 0.3 ? bodyPt(v, 'nape') : bodyPt(v, 'head', 1, [0, 0.07 + 0.03 * Math.sin(t * 1.1), 0]),
          1,
        );
        lookAt(c, T, bodyPt(v, 'face'), 0.9);
        T.torso += 0.25 * pull;
      }
      break;
    }
  }
}
// after: they come back to themselves slowly, wherever it left them
function encAfterPose(type, t0, dur, scared, kneeler) {
  return (T, c) => {
    if (c.moving) return;
    const q = clamp((G.t - t0) / Math.max(0.1, dur), 0, 1),
      h = c.look.h,
      t = c.animT,
      fx = c.fx;
    fx.eye = q < 0.55 ? [0.4, 0.44, 0.42] : null;
    fx.gape = 0;
    const seq = (A, B, a, b) => {
      poseMix(T, A);
      poseMix(T, B, sstep(a, b, q));
    };
    const end = scared ? POSE.startle : POSE.dazed;
    switch (type) {
      case 'probe':
        if (q < 0.55) seq(POSE.lie, POSE.sitUp(h), 0.3, 0.55);
        else seq(POSE.sitUp(h), end, 0.6, 0.85);
        break;
      case 'specimen':
        if (q < 0.55) seq(POSE.allFours(h), POSE.kneel(h), 0.3, 0.55);
        else seq(Object.assign(POSE.kneel(h), { torso: 0.3, hp: 0.4 }), end, 0.6, 0.85);
        break;
      case 'worship':
      case 'tend':
        seq(
          Object.assign(POSE.kneel(h), { torso: 0.2, hp: 0.3 }),
          type === 'tend' && !scared ? POSE.wipe : end,
          0.45,
          0.8,
        );
        T.hy = (T.hy || 0) + wob(t * 0.4) * 0.5 * (1 - q);
        break;
      case 'massage':
        if (kneeler) seq(Object.assign(POSE.kneel(h), { torso: 0.3 }), end, 0.45, 0.8);
        else seq(POSE.hug, end, 0.4, 0.8);
        break;
      case 'court':
        seq(POSE.touchFace, scared ? end : POSE.lookHand, 0.4, 0.75);
        break;
      case 'dance':
        seq(POSE.hug, scared ? end : POSE.wipe, 0.45, 0.8);
        break;
      default:
        seq(POSE.touchFace, end, 0.25, 0.6);
    }
    if (scared)
      T.roll = (T.roll || 0) + Math.sin(t * 23) * 0.025; // shaking
    else T.hr = (T.hr || 0) + wob(t * 0.3) * 0.08;
  };
}
// caught at it: it rounds on you for a moment before it goes, or comes
function encThreatPose(fac, t0, dur) {
  return (T, c) => {
    const q = clamp((G.t - t0) / dur, 0, 1),
      t = c.animT,
      fx = c.fx;
    if (fac === 'lizards') {
      T.rootY = -0.12;
      T.torso = lerp(-0.4, 0.55, sstep(0.35, 0.6, q));
      T.hp = -0.45;
      T.uaL = T.uaR = -1.25;
      T.aoL = T.aoR = 0.75;
      T.faL = T.faR = -0.9;
      fx.frill = 1;
      fx.tongue = 0.6 * bell(q, 0.3, 0.95);
    } else if (fac === 'aliens') {
      T.float = 0.3 + 0.4 * sstep(0, 0.4, q);
      T.hp = -0.15;
      T.uaR = -1.5;
      T.faR = -0.08;
      T.aoR = 0.1;
      T.uaL = -0.3;
      T.aoL = 0.65;
      T.hr = Math.sin(t * 40) * 0.14 * (1 - q);
      T.torso = -0.1;
    } else {
      T.torso = 0.55;
      T.uaL = T.uaR = -1.6;
      T.faL = T.faR = -0.25;
      T.hp = -0.25 + Math.sin(t * 20) * 0.08;
      T.roll = Math.sin(t * 9) * 0.06;
    }
    if (c.tell) c.tell.lunge = fac !== 'aliens' && q > 0.35 && q < 0.95;
  };
}
