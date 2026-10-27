//@ sim/seat-moves — Sitting down, getting up, lying down: the steps and the lowering
//@ Defines: SEAT_T, BED_SEAT, trBegin, trEval, trStep, trSit, trRise, trSwing, trPlace
//@ Uses:    core/util, sim/body-motion, sim/characters, world/paths, sim/actions
//@ (header made by tools/map.js; stripped by build.py)
// ── onto a seat or a bed, and up off it: a couple of steps round, then the hips go back and down over feet that stay
// planted, leaning out over them, arms forward for balance, and a small give as the seat takes the weight. Up again
// is the other way about: feet in under you, lean over them, push up, step off. A bed is sat on at its edge first;
// then the legs come up and swing round onto it as the body lies back. The sim walks the root along this and the pose
// reads the same progress, so the two never drift apart. All of it in real seconds at normal speed.
const SEAT_T = { down: 0.38, up: 0.4, edge: 0.32, swing: 0.46, unswing: 0.42, stand: 0.34 };
const BED_SEAT = 0.47; // the mattress, sat on
function trBegin(c, a, up) {
  const s = a.slot,
    h = c.look.h,
    lie = s.pose === 'lie';
  const tr = { a, up, lie, h, k: 0 };
  let S,
    sd,
    y,
    fr = SEAT_FOOT * h;
  if (lie) {
    const f = [Math.sin(s.dir), Math.cos(s.dir)],
      pl = [s.px - f[0] * 0.88 * h, s.pz - f[1] * 0.88 * h]; // the hips, lying
    let nx = f[1],
      nz = -f[0];
    const rx = (up ? a.app[0] + 0.5 : c.x) - pl[0],
      rz = (up ? a.app[1] + 0.5 : c.z) - pl[1];
    if (rx * nx + rz * nz < 0) {
      nx = -nx;
      nz = -nz;
    }
    const open = (g) =>
      [0.3, -0.3].some((o) =>
        walkable(Math.floor(pl[0] + g * nx + f[0] * o), Math.floor(pl[1] + g * nz + f[1] * o), c),
      );
    if (!open(1) && open(-1)) {
      nx = -nx;
      nz = -nz;
    } // the side against the wall is no good: the other edge
    tr.pl = pl;
    tr.ld = s.dir;
    S = [pl[0] + nx * 0.26, pl[1] + nz * 0.26];
    sd = Math.atan2(nx, nz);
    y = BED_SEAT;
  } else {
    S = [s.px, s.pz];
    sd = s.dir;
    y = s.seatY || 0.45;
    const f = [Math.sin(sd), Math.cos(sd)],
      ft = s.cands && s.cands[0];
    if (ft && !walkable(ft[0], ft[1], c)) {
      // a desk or a table in front: stand in close, and the feet go under it as you land
      const bx = ft[0] + 0.5 - f[0] * 0.5,
        bz = ft[1] + 0.5 - f[1] * 0.5;
      fr = clamp((bx - S[0]) * f[0] + (bz - S[1]) * f[1] - 0.17, 0.1, fr);
    }
  }
  tr.S = S;
  tr.sd = sd;
  tr.y = y;
  tr.fr = fr;
  tr.st = up ? Math.min(fr, 0.34 * h) : fr; // where the feet stand: getting up, they come in under you first
  tr.F = [S[0] + Math.sin(sd) * tr.st, S[1] + Math.cos(sd) * tr.st];
  const P0 = up ? tr.F : [c.x, c.z],
    P1 = up ? [a.app[0] + 0.5, a.app[1] + 0.5] : tr.F;
  tr.P0 = P0;
  tr.P1 = P1;
  tr.pts = [P0, P1];
  if (lie) {
    // round the end of the bed, not through it: along its side, then out to (or in from) where you came
    const f = [Math.sin(s.dir), Math.cos(s.dir)],
      o = up ? P1 : P0,
      al = (o[0] - tr.pl[0]) * f[0] + (o[1] - tr.pl[1]) * f[1];
    const sx = Math.sin(sd),
      sz = Math.cos(sd),
      lat = (tr.F[0] - tr.pl[0]) * sx + (tr.F[1] - tr.pl[1]) * sz;
    const Wp = [tr.pl[0] + sx * lat + f[0] * al, tr.pl[1] + sz * lat + f[1] * al];
    if (Math.hypot(Wp[0] - o[0], Wp[1] - o[1]) > 0.08 && Math.hypot(Wp[0] - tr.F[0], Wp[1] - tr.F[1]) > 0.08)
      tr.pts = [P0, Wp, P1];
  }
  let dist = 0;
  for (let i = 1; i < tr.pts.length; i++)
    dist += Math.hypot(tr.pts[i][0] - tr.pts[i - 1][0], tr.pts[i][1] - tr.pts[i - 1][1]);
  tr.len = dist;
  if (up) {
    const q = tr.pts[tr.pts.length - 2];
    tr.d0 = sd;
    tr.dA = dist > 0.12 ? angDiff(sd, Math.atan2(P1[0] - q[0], P1[1] - q[1])) : 0;
  } else {
    tr.d0 = c.dir;
    let dA = angDiff(c.dir, sd);
    if (Math.abs(dA) > 2.8) dA = Math.abs(dA) * bodySide(c);
    tr.dA = dA;
  }
  const turn = Math.abs(tr.dA),
    tStep = dist < 0.05 && turn < 0.25 ? 0 : clamp(0.06 + dist * 0.26 + turn * 0.04, 0.14, 0.7);
  tr.steps = Math.max(1, Math.round(tStep / 0.14));
  tr.lead = (Math.abs(tr.dA) > 0.2 ? tr.dA : bodySide(c)) > 0 ? 1 : -1; // turning left, the left foot goes first
  const seg = up
    ? lie
      ? [
          ['unswing', SEAT_T.unswing],
          ['rise', SEAT_T.stand],
          ['step', tStep],
        ]
      : [
          ['rise', SEAT_T.up],
          ['step', tStep],
        ]
    : lie
      ? [
          ['step', tStep],
          ['sit', SEAT_T.edge],
          ['swing', SEAT_T.swing],
        ]
      : [
          ['step', tStep],
          ['sit', SEAT_T.down],
        ];
  const tot = seg.reduce((n, q) => n + q[1], 0);
  tr.seg = [];
  let acc = 0;
  for (const [kind, d] of seg) {
    if (d > 0) tr.seg.push({ kind, a: acc / tot, b: (acc + d) / tot });
    acc += d;
  }
  const pace = up ? 0.5 : 1; // getting up is quicker than going down: half the time, the whole move
  tr.D = clamp(tot * pace * SIM_SPD, 0.15, tot * pace * 3); // game minutes
  // when the rest of the game calls it sitting (or lying): once the body is on its way down; standing, once it's up
  const at = (kind, end) => {
    const q = tr.seg.find((g) => g.kind === kind);
    return q ? (end ? q.b : q.a) : 0;
  };
  tr.kPose = up ? at('rise', true) : at('sit', false);
  return tr;
}
// where the body is and which way it faces at this point of the move (and, given T, the joints)
function trEval(c, tr, T) {
  const k = tr.k;
  let g = tr.seg[tr.seg.length - 1];
  for (const q of tr.seg)
    if (k <= q.b) {
      g = q;
      break;
    }
  const u = clamp((k - g.a) / Math.max(1e-6, g.b - g.a), 0, 1);
  switch (g.kind) {
    case 'step':
      return trStep(c, tr, u, T);
    case 'sit':
      return trSit(c, tr, u, T);
    case 'rise':
      return trRise(c, tr, u, T);
    case 'swing':
      return trSwing(c, tr, u, T);
    default:
      return trSwing(c, tr, 1 - u, T); // unswing: the same, backwards
  }
}
// a few short steps, turning as they go (onto the spot in front of the seat, or off it)
function trStep(c, tr, q, T) {
  let d = sstep(0, 1, q) * tr.len,
    x = tr.P1[0],
    z = tr.P1[1];
  for (let i = 1; i < tr.pts.length; i++) {
    const A = tr.pts[i - 1],
      B = tr.pts[i],
      l = Math.hypot(B[0] - A[0], B[1] - A[1]);
    if (d <= l || i === tr.pts.length - 1) {
      const u = l > 1e-6 ? clamp(d / l, 0, 1) : 1;
      x = lerp(A[0], B[0], u);
      z = lerp(A[1], B[1], u);
      break;
    }
    d -= l;
  }
  const dir = tr.d0 + tr.dA * sstep(0.05, 0.9, q);
  if (T) {
    const n = tr.steps;
    let lL = 0,
      lR = 0;
    for (let i = 0; i < n; i++) {
      const l = Math.sin(clamp(q * n - i, 0, 1) * Math.PI);
      if ((i % 2 === 0) === tr.lead > 0) lL = Math.max(lL, l);
      else lR = Math.max(lR, l);
    }
    T.thL = -0.4 * lL + 0.07 * lR;
    T.thR = -0.4 * lR + 0.07 * lL;
    T.shL = 0.05 + 0.78 * lL;
    T.shR = 0.05 + 0.78 * lR;
    T.rootY = -0.022 + 0.014 * Math.max(lL, lR);
    T.uaL = -0.05 - 0.15 * lR + 0.07 * lL;
    T.uaR = -0.05 - 0.15 * lL + 0.07 * lR;
    T.faL = T.faR = -0.32;
    T.aoL = T.aoR = 0.085;
    T.torso = 0.045;
    T.twist = 0.07 * (lR - lL);
    T.hy = Math.sign(tr.dA) * 0.38 * Math.sin(clamp(q / 0.75, 0, 1) * Math.PI); // the head leads the turn
  }
  return { x, z, dir };
}
// lowering onto the seat: u 0 standing over the feet → 1 sat
function trSit(c, tr, u, T) {
  const h = tr.h,
    eb = sstep(0, 0.88, u),
    x = lerp(tr.F[0], tr.S[0], eb),
    z = lerp(tr.F[1], tr.S[1], eb);
  if (T) {
    const ry = tr.y + 0.08 - 0.88 * h;
    T.rootY = ry * sstep(0.06, 0.93, u) - 0.018 * sstep(0.82, 0.91, u) * (1 - sstep(0.91, 1, u)); // a small give as it takes the weight
    const L = legIK(
      h,
      lerp(tr.st, SEAT_FOOT * h, sstep(0.68, 1, u)) - (1 - eb) * tr.st,
      footY0(h) - (T.rootY + 0.88 * h - 0.03),
    );
    T.thL = T.thR = L[0];
    T.shL = T.shR = L[1];
    T.torso = keyed(u, [
      [0, 0.04],
      [0.38, 0.48],
      [0.72, 0.36],
      [0.92, 0.1],
      [1, 0.03],
    ]);
    T.hp = keyed(u, [
      [0, 0],
      [0.38, -0.26],
      [0.72, -0.2],
      [1, 0],
    ]);
    T.uaL = keyed(u, [
      [0, -0.05],
      [0.42, -0.62],
      [0.76, -0.46],
      [1, -0.22],
    ]);
    T.uaR = T.uaL + 0.06 * Math.sin(u * Math.PI);
    T.faL = T.faR = keyed(u, [
      [0, -0.3],
      [0.42, -0.48],
      [0.76, -0.6],
      [1, -0.65],
    ]);
    T.aoL = T.aoR = keyed(u, [
      [0, 0.085],
      [0.42, 0.16],
      [1, 0.07],
    ]);
    const w = sstep(0.8, 1, u);
    if (w > 0) {
      const S = defaultJ();
      seatPose(c, S, tr.y);
      poseOver(T, S, w);
    }
  }
  return { x, z, dir: tr.sd };
}
// up off it: feet in, lean out over them, push up through the legs, straighten
function trRise(c, tr, u, T) {
  const h = tr.h,
    eb = sstep(0.16, 0.9, u),
    x = lerp(tr.S[0], tr.F[0], eb),
    z = lerp(tr.S[1], tr.F[1], eb);
  if (T) {
    const ry = tr.y + 0.08 - 0.88 * h;
    T.rootY = ry * (1 - sstep(0.24, 0.98, u)) - 0.012 * Math.sin(clamp(u / 0.24, 0, 1) * Math.PI); // a dip into the push
    const L = legIK(
      h,
      lerp(SEAT_FOOT * h, tr.st, sstep(0, 0.22, u)) - eb * tr.st,
      footY0(h) - (T.rootY + 0.88 * h - 0.03),
    );
    T.thL = T.thR = L[0];
    T.shL = T.shR = L[1];
    T.torso = keyed(u, [
      [0, 0.03],
      [0.27, 0.58],
      [0.55, 0.46],
      [0.85, 0.12],
      [1, 0.02],
    ]);
    T.hp = keyed(u, [
      [0, 0],
      [0.27, -0.3],
      [0.6, -0.2],
      [1, 0],
    ]);
    T.uaL = T.uaR = keyed(u, [
      [0, -0.22],
      [0.24, -0.5],
      [0.52, -0.3],
      [1, -0.03],
    ]); // hands to the knees, and push
    T.faL = T.faR = keyed(u, [
      [0, -0.65],
      [0.24, -0.88],
      [0.52, -0.42],
      [1, -0.14],
    ]);
    T.aoL = T.aoR = keyed(u, [
      [0, 0.07],
      [0.3, 0.13],
      [1, 0.075],
    ]);
    const w = 1 - sstep(0, 0.16, u);
    if (w > 0) {
      const S = defaultJ();
      seatPose(c, S, tr.y);
      poseOver(T, S, w);
    }
  }
  return { x, z, dir: tr.sd };
}
// sat on the edge of the bed (v 0) to lying in it (v 1): the legs lift and straighten, then swing round onto the
// mattress as the body tips back onto it, the hands going back to take the weight; the hips shuffle in on the way
function trSwing(c, tr, v, T) {
  const h = tr.h,
    L = 0.88 * h,
    ey = sstep(0.15, 0.9, v),
    dir = tr.sd + angDiff(tr.sd, tr.ld) * ey;
  const pitch = (-Math.PI / 2) * sstep(0.1, 1, v),
    sp = Math.sin(pitch),
    cp = Math.cos(pitch),
    eh = sstep(0.3, 1, v);
  const px = lerp(tr.S[0], tr.pl[0], eh),
    pz = lerp(tr.S[1], tr.pl[1], eh),
    py = lerp(tr.y + 0.08, 0.6, sstep(0.2, 1, v));
  const x = px - L * sp * Math.sin(dir),
    z = pz - L * sp * Math.cos(dir); // the root, from the hips
  if (T) {
    T.pitch = pitch;
    T.rootY = py - L * cp;
    const SL = seatLegs(h, tr.y);
    const elev = lerp(SL[0], -Math.PI / 2 - 0.14, sstep(0, 0.45, v)) + 0.14 * sstep(0.72, 1, v); // the thighs, against the world: up, over, down
    T.thL = elev - pitch;
    T.thR = T.thL + 0.05 * Math.sin(v * Math.PI);
    T.shL = SL[1] * (1 - sstep(0.05, 0.5, v)) + 0.16 * sstep(0.4, 0.6, v) * (1 - sstep(0.75, 1, v));
    T.shR = T.shL + 0.06 * Math.sin(v * Math.PI);
    T.torso = keyed(v, [
      [0, 0.03],
      [0.4, 0.2],
      [0.8, 0.08],
      [1, 0],
    ]);
    T.hp = keyed(v, [
      [0, 0],
      [0.4, 0.3],
      [0.8, 0.12],
      [1, -0.1],
    ]);
    T.uaL = T.uaR = keyed(v, [
      [0, -0.22],
      [0.35, 0.52],
      [0.75, 0.3],
      [1, 0.05],
    ]);
    T.faL = T.faR = keyed(v, [
      [0, -0.65],
      [0.35, -0.3],
      [1, -0.05],
    ]);
    T.aoL = T.aoR = keyed(v, [
      [0, 0.07],
      [0.35, 0.24],
      [1, 0.05],
    ]);
    const w0 = 1 - sstep(0, 0.1, v),
      w1 = sstep(0.86, 1, v);
    if (w0 > 0) {
      const S = defaultJ();
      seatPose(c, S, tr.y);
      poseOver(T, S, w0);
    }
    if (w1 > 0) {
      const S = defaultJ();
      liePose(c, S);
      poseOver(T, S, w1);
    }
  }
  return { x, z, dir };
}
// the sim's half: put the body where the move has it this instant
function trPlace(c, tr) {
  const p = trEval(c, tr, null);
  c.x = p.x;
  c.z = p.z;
  c.y = 0;
  c.tdir = p.dir;
}
const trLive = (c) => {
  const tr = c.seatTr,
    a = tr && tr.a;
  return !!(a && c.queue[0] === a && a.tr === tr && (a.stage === 'enter' || a.stage === 'exit'));
};
