//@ horror/half-forms — Half-changed for a second
//@ Defines: HALF_PARTS, halfParts, halfK, headZ, segPart, halfHead, halfBody, halfHand, halfArm
//@ Uses:    gfx/renderer, ui/menus, core/util, world/grid, gfx/people, town/cast, gfx/body-parts
//@ (header made by tools/map.js; stripped by build.py)
// ───────────── half-changed: for a second or two the person isn't all person. A piece of IT shows through, and goes back.
// One small place at a time, sitting on the body where it belongs: an eye, the mouth, a hand, the back of the neck.
// Small enough to doubt afterwards, but each carries something the eye catches across a room: a glint, a hard edge of colour, a wrong outline.
const HALF_PARTS = {
  aliens: ['eye', 'skull', 'hand', 'veins'],
  lizards: ['eye', 'snout', 'hand', 'tail', 'frill'],
  zombies: ['jaw', 'face', 'ribs', 'arm'],
};
function halfParts(fac) {
  const P = HALF_PARTS[fac] || HALF_PARTS.aliens,
    out = [pick(P)];
  if (chance(0.3)) {
    const q = pick(P.filter((p) => !out.includes(p)));
    if (q) out.push(q);
  }
  return out;
}
// how far out it is right now: in fast, held with a stutter, gone again. A photograph holds it still.
function halfK(tl) {
  if (tl.t0r == null) return 1;
  const p = (R.time - tl.t0r) / (tl.dur || 1);
  if (p < 0 || p > 1) return 0;
  const env = Math.min(1, p / 0.12, (1 - p) / 0.2);
  return clamp(env, 0, 1) * (Math.sin(R.time * 47 + (tl.seed || 0)) > -0.75 ? 1 : 0.55);
}
// the face's surface, near enough: where something on the cheek should sit
function headZ(x, y) {
  const a = x / 0.097,
    b = (y - 0.115) / 0.12;
  return 0.104 * Math.sqrt(Math.max(0.05, 1 - a * a - b * b));
}
const onFace = (x, y, lift = 0.002) => [x, y, faceZ(x, y) + lift];
// a thin bar from a to b in M's frame, lying flat against whatever it's drawn on: veins, seams, the split of a mouth
function segPart(M, a, b, w, prim, col, emit, d = w) {
  const dx = b[0] - a[0],
    dy = b[1] - a[1],
    dz = b[2] - a[2],
    L = Math.hypot(dx, dy, dz) || 1e-4;
  const Y = [dx / L, dy / L, dz / L];
  let X = Math.abs(Y[2]) < 0.95 ? [Y[1], -Y[0], 0] : [0, Y[2], -Y[1]];
  const xl = Math.hypot(X[0], X[1], X[2]) || 1;
  X = [X[0] / xl, X[1] / xl, X[2] / xl];
  const Z = [X[1] * Y[2] - X[2] * Y[1], X[2] * Y[0] - X[0] * Y[2], X[0] * Y[1] - X[1] * Y[0]];
  const B = new Float32Array([
    X[0] * w,
    X[1] * w,
    X[2] * w,
    0,
    Y[0] * L,
    Y[1] * L,
    Y[2] * L,
    0,
    Z[0] * d,
    Z[1] * d,
    Z[2] * d,
    0,
    (a[0] + b[0]) / 2,
    (a[1] + b[1]) / 2,
    (a[2] + b[2]) / 2,
    1,
  ]);
  part(M4.mul(M, B), 0, 0, 0, 1, 1, 1, prim, col, emit);
}
function halfHead(Hd, T, H, skin, h, t) {
  const k = H.k,
    s = H.side,
    pr = H.parts;
  if (k < 0.03) return;
  if (H.fac === 'aliens') {
    const Q = CREATURE_LOOK.aliens,
      grey = mix3(skin, Q.skin, 0.8),
      pulse = 0.75 + 0.25 * Math.sin(t * 9);
    if (pr.includes('skull')) {
      // the back of the skull swells up and out, bald and grey, a seam of light along the crown
      const q = 0.86 + 0.14 * k,
        gs = mix3(skin, mul3(Q.skin, 0.82), 0.6 + 0.35 * k),
        dl = 0.235 + 0.08 * k;
      const Dm = M4.joint(Hd, 0, 0.168 + 0.014 * k, -0.03 - 0.026 * k, 0.6, 0, 0);
      drawSpec = 1.1;
      part(Dm, 0, 0, 0, 0.192 * q, 0.198 * q, dl, 'sph', gs);
      drawSpec = 0;
      const top = (z) => [0, 0.099 * q * Math.sqrt(Math.max(0, 1 - ((2 * z) / dl) ** 2)) + 0.0012, z],
        sc = mix3(gs, Q.glow, 0.45),
        se = mul3(Q.glow, 0.4 * k * pulse);
      segPart(Dm, top(0.03), top(-dl * 0.15), 0.005, 'box', sc, se, 0.003);
      segPart(Dm, top(-dl * 0.15), top(-dl * 0.33), 0.005, 'box', sc, se, 0.003);
    }
    if (pr.includes('eye')) {
      // one eye goes black and too wide, slanting up toward the temple; the grey spreads a little round it
      const ez = faceZ(s * 0.031, 0.122);
      part(
        Hd,
        s * 0.037,
        0.124,
        faceZ(s * 0.037, 0.124) - 0.005,
        0.034 + 0.028 * k,
        0.026 + 0.022 * k,
        0.018,
        'sph',
        grey,
      );
      drawSpec = 3.4;
      partR(
        Hd,
        s * 0.034,
        0.123,
        ez + 0.006,
        0,
        s * 0.25,
        s * 0.42,
        0.029 + 0.026 * k,
        0.017 + 0.01 * k,
        0.014,
        'sph',
        Q.eye,
        mul3(Q.glow, 0.03 * k),
      );
      drawSpec = 0;
      part(Hd, s * 0.045, 0.13, ez + 0.0115, 0.0065, 0.005, 0.003, 'sph', Q.glow, mul3(Q.glow, 0.9 * k * pulse)); // a point of light in it
    }
    if (pr.includes('veins')) {
      // light runs under the skin: up from the jaw, out from the eye to the temple, down the neck
      const e = mul3(Q.glow, (0.5 + 0.3 * pulse) * k),
        gv = mix3(skin, Q.glow, 0.4),
        g = Math.min(1, k * 1.3);
      const path = (pts) => {
        const n = 1 + Math.ceil((pts.length - 1) * g);
        for (let i = 0; i + 1 < n; i++)
          segPart(
            Hd,
            onFace(s * pts[i][0], pts[i][1], 0.0015),
            onFace(s * pts[i + 1][0], pts[i + 1][1], 0.0015),
            0.0042,
            'box',
            gv,
            e,
            0.003,
          );
      };
      path([
        [0.06, 0.03],
        [0.07, 0.058],
        [0.069, 0.086],
        [0.064, 0.11],
      ]);
      path([
        [0.047, 0.127],
        [0.064, 0.136],
        [0.075, 0.158],
        [0.07, 0.186],
      ]);
      path([
        [0.069, 0.086],
        [0.052, 0.08],
        [0.039, 0.068],
      ]);
      segPart(T, [s * 0.016, 0.54 * h, 0.054], [s * 0.024, 0.54 * h + 0.12 * g, 0.05], 0.0048, 'box', gv, e, 0.003);
      part(
        Hd,
        s * 0.0285,
        0.1195,
        faceZ(s * 0.0285, 0.12) + 0.0105,
        0.012,
        0.012,
        0.005,
        'sph',
        Q.glow,
        mul3(Q.glow, 0.5 * k),
      ); // and the eye on that side lights, faintly
    }
    return;
  }
  if (H.fac === 'lizards') {
    const Q = CREATURE_LOOK.lizards,
      g = mix3(skin, Q.skin, 0.72),
      gd = mix3(skin, Q.dark, 0.72);
    if (pr.includes('eye')) {
      // one eye goes gold and slit, and fine scales come up from its outer corner toward the temple
      const ex = s * 0.0295,
        ey = 0.1195,
        ez = faceZ(ex, ey);
      drawSpec = 2.6;
      part(Hd, ex, ey, ez + 0.0055, 0.027, 0.019, 0.012, 'sph', Q.eye, mul3(Q.eye, 0.25 * k));
      part(Hd, ex, ey, ez + 0.0112, 0.0045 + 0.006 * (1 - k), 0.018, 0.004, 'sph', [0.02, 0.015, 0.01]);
      drawSpec = 0;
      const S = [
        [0.052, 0.128],
        [0.06, 0.111],
        [0.064, 0.143],
        [0.071, 0.125],
        [0.057, 0.097],
        [0.075, 0.155],
        [0.079, 0.108],
        [0.069, 0.092],
        [0.083, 0.139],
        [0.081, 0.168],
      ];
      const n = Math.round(S.length * Math.min(1, k * 1.2));
      for (let i = 0; i < n; i++) {
        const x = s * S[i][0],
          y = S[i][1];
        part(Hd, x, y, faceZ(x, y) - 0.0008, 0.0125, 0.0105, 0.006, 'sph', i % 2 ? gd : g);
      }
    }
    if (pr.includes('snout')) {
      // the mouth splits too wide: lipless, back toward the ears, a row of small teeth hanging in it, the jaw dropped a little
      const g0 = 0.02 + 0.012 * k,
        ex = 0.044 + 0.03 * k,
        dk = [0.05, 0.014, 0.014];
      part(Hd, 0, 0.0475 - 0.004 * k, faceZ(0, 0.047) - 0.004, 0.05 + 0.014 * k, 0.007 + 0.011 * k, 0.012, 'sph', dk); // open, just
      const pts = [
        [g0, 0.0495],
        [0.034, 0.0515],
        [ex, 0.058 + 0.007 * k],
      ];
      for (const u of [1, -1]) {
        for (let i = 0; i + 1 < pts.length; i++)
          segPart(
            Hd,
            onFace(u * pts[i][0], pts[i][1], 0.0025),
            onFace(u * pts[i + 1][0], pts[i + 1][1], 0.0025),
            0.007 - i * 0.0012,
            'box',
            dk,
            null,
            0.004,
          );
        for (let i = 0; i < 4; i++) {
          const x = u * (0.005 + i * 0.0105),
            y = 0.05 + (i > 2 ? 0.0015 : 0);
          partR(Hd, x, y, faceZ(x, y) + 0.0022, Math.PI, 0, 0, 0.0062, 0.01 + 0.005 * k, 0.0055, 'fang', Q.teeth);
        }
        partR(
          Hd,
          u * 0.012,
          0.042 - 0.004 * k,
          faceZ(u * 0.012, 0.042) + 0.0015,
          0,
          0,
          0,
          0.005,
          0.007 + 0.003 * k,
          0.005,
          'fang',
          mul3(Q.teeth, 0.92),
        ); // and two below
      }
      for (const u of [1, -1]) {
        const x = u * 0.05,
          y = 0.075;
        part(
          Hd,
          x,
          y,
          faceZ(x, y) - 0.0015,
          0.03 * k + 0.006,
          0.034 * k + 0.006,
          0.008,
          'sph',
          mix3(skin, Q.skin, 0.45),
        );
      } // the cheeks gone a little green above it
    }
    if (pr.includes('frill')) {
      // a ruff flicks half open from behind the jaw on both sides, fanned out past the cheeks, and shivers
      const L = 0.026 + 0.058 * k,
        n = 6,
        mc = mix3(Q.frill, [0.86, 0.4, 0.12], 0.36),
        sp = mix3(Q.claw, Q.frill, 0.35),
        me = mul3(mc, 0.3 * k);
      for (const u of [1, -1]) {
        const O = [u * 0.072, 0.066, -0.016],
          D = [];
        for (let i = 0; i < n; i++) {
          const f =
            lerp(-0.25, lerp(-1.15, 0.85, i / (n - 1)), 0.45 + 0.55 * k) + Math.sin(t * 19 + i * 1.7 + u) * 0.05 * k;
          const d = [u * Math.cos(f), Math.sin(f), 0.28],
            dl = Math.hypot(d[0], d[1], d[2]);
          D.push([d[0] / dl, d[1] / dl, d[2] / dl]);
        }
        const at = (d, r) => [O[0] + d[0] * r, O[1] + d[1] * r, O[2] + d[2] * r];
        for (let i = 0; i + 1 < n; i++) {
          // the skin between the spines, facing forward
          const p = at(D[i], L * 0.56),
            q = at(D[i + 1], L * 0.56),
            e = [(q[0] - p[0]) * 0.28, (q[1] - p[1]) * 0.28, (q[2] - p[2]) * 0.28];
          segPart(
            Hd,
            [p[0] - e[0], p[1] - e[1], p[2] - e[2]],
            [q[0] + e[0], q[1] + e[1], q[2] + e[2]],
            L * 0.82,
            'box',
            mul3(mc, i % 2 ? 0.8 : 1),
            me,
            0.003,
          );
        }
        for (let i = 0; i < n; i++) segPart(Hd, at(D[i], 0.012), at(D[i], L + 0.008), 0.0045, 'box', sp, null, 0.0045);
      }
    }
    return;
  }
  const Q = CREATURE_LOOK.zombies;
  if (pr.includes('jaw')) {
    // the jaw slips its hinge and hangs a little crooked: the dark of the mouth, the lower teeth, a thread of something
    const dn = 0.008 + 0.028 * k,
      zs = mix3(skin, Q.skin, 0.45),
      fz = faceZ(0, 0.05);
    part(Hd, 0, 0.047 - dn * 0.45, fz - 0.009, 0.05, 0.01 + dn, 0.016, 'sph', [0.07, 0.012, 0.014]);
    for (let i = 0; i < 5; i++) {
      const x = (i - 2) * 0.0098;
      part(Hd, x, 0.053, faceZ(x, 0.053) - 0.002, 0.0075, 0.01, 0.005, 'rbox', Q.teeth);
    }
    const Jw = M4.joint(Hd, 0, 0.03, 0.04, 0.05 * k, 0, s * 0.12 * k);
    part(Jw, 0, -dn - 0.004, 0.028, 0.074, 0.028, 0.05, 'sph', zs);
    for (let i = 0; i < 4; i++)
      part(
        Jw,
        (i - 1.5) * 0.0095,
        -dn + 0.009,
        0.046 - Math.abs(i - 1.5) * 0.003,
        0.0075,
        0.01,
        0.005,
        'rbox',
        Q.teeth,
      );
    drawSpec = 1.2;
    {
      const dl = (t * 0.35) % 1;
      part(Jw, 0.012 * s, -dn - 0.022 - dl * 0.03, 0.044, 0.006, 0.012 + dl * 0.02, 0.006, 'sph', Q.blood);
    }
    drawSpec = 0;
  }
  if (pr.includes('face')) {
    // a patch of cheek comes away: a ragged wet rim, bone under it, the back teeth through it; the eye above goes milky
    const cx = s * 0.047,
      cy = 0.082,
      R = 0.015 + 0.021 * k,
      fz = faceZ(cx, cy);
    drawSpec = 1.1;
    part(Hd, cx, cy, fz - 0.006, R * 2.3, R * 2.7, 0.016, 'sph', Q.blood);
    drawSpec = 0;
    part(Hd, cx + s * 0.002, cy + 0.002, fz - 0.004, R * 1.75, R * 2.1, 0.014, 'sph', mul3(Q.rib, 0.9));
    for (let i = 0; i < 3; i++) {
      const x = cx + s * (i - 1) * 0.009,
        y = cy - R * 0.55;
      part(Hd, x, y, faceZ(x, y) + 0.0015, 0.0075, 0.011, 0.005, 'rbox', Q.teeth);
    }
    part(
      Hd,
      s * 0.0295,
      0.1195,
      faceZ(s * 0.0295, 0.12) + 0.0098,
      0.0165,
      0.0165,
      0.006,
      'sph',
      Q.eye,
      mul3(Q.eye, 0.25 * k),
    );
  }
}
function halfBody(T, P, H, h, w, t, TP, top) {
  const k = H.k,
    pr = H.parts;
  if (k < 0.03) return;
  if (H.fac === 'lizards' && pr.includes('tail')) {
    // the end of a tail slides out under the hem, curls, and flicks
    const Q = CREATURE_LOOK.lizards,
      q = 0.35 + 0.65 * k,
      sg = 0.085 * q;
    let Tm = M4.joint(P, 0, -0.17, -0.1, -0.9, Math.sin(t * 2.6) * 0.3, 0);
    for (let i = 0; i < 6; i++) {
      const kk = 1 - i * 0.13;
      part(Tm, 0, 0, -sg * 0.5, 0.075 * kk, 0.065 * kk, sg * 1.45, 'sph', i % 2 ? mul3(Q.skin, 0.85) : Q.skin);
      if (i % 2 === 0 && i < 5)
        partR(Tm, 0, 0.03 * kk, -sg * 0.5, -0.9, 0, 0, 0.018 * kk, 0.03 * kk, 0.012, 'fang', mul3(Q.claw, 0.8));
      Tm = M4.joint(Tm, 0, 0, -sg, 0.24 + 0.06 * Math.sin(t * 5 + i), Math.sin(t * 3.4 + i * 0.8) * 0.2, 0);
    }
  }
  if (H.fac === 'zombies' && pr.includes('ribs') && k > 0.15) {
    // the shirt splits down one side and the ribs show, dark and wet between them
    const Q = CREATURE_LOOK.zombies,
      TY = 0.25 * h,
      TSY = 0.64 * h,
      TSZ = 0.42,
      sx = H.side * 0.07 * w,
      q = Math.min(1, k * 1.2);
    const Yl = (yl) => TY + yl * TSY,
      Zf = (yl, dz = 0) => torsoFrontZ(yl) * TSZ + dz;
    drawSpec = 1.2;
    part(T, sx, Yl(0.1), Zf(0.1, -0.013), 0.08 * q + 0.02, 0.19 * q + 0.03, 0.03, 'sph', Q.blood);
    drawSpec = 0;
    part(T, sx, Yl(0.1), Zf(0.1, -0.011), 0.062 * q + 0.012, 0.16 * q + 0.02, 0.026, 'sph', Q.cavity);
    for (let i = 0; i < 4; i++) {
      const yl = -0.02 + i * 0.075;
      if (Math.abs(yl - 0.1) > 0.12 * q) continue;
      segPart(
        T,
        [sx - 0.036 * q, Yl(yl) + 0.012, Zf(yl, 0.003)],
        [sx + 0.036 * q, Yl(yl) - 0.006, Zf(yl, 0.003)],
        0.013,
        'rbox',
        Q.rib,
        null,
        0.012,
      );
    }
  }
}
function halfHand(Fa, H, h, t, skin, s) {
  const k = H.k;
  if (H.fac === 'aliens') {
    // three long grey fingers, one joint too many
    const Q = CREATURE_LOOK.aliens,
      g = mix3(skin, Q.skin, 0.85),
      L = 0.45 + 0.35 * k;
    part(Fa, 0, -0.3 * h, 0.005, 0.05, 0.06, 0.05, 'sph', g);
    for (const f of [-1, 0, 1]) {
      const curl = 0.25 + 0.2 * Math.sin(t * 2.6 + f * 1.3);
      const F1 = M4.joint(Fa, 0, -0.32 * h, f * 0.02, curl * 0.5, 0, f * 0.12);
      part(F1, 0, -0.05 * L, 0, 0.014, 0.11 * L, 0.014, 'limb2', g);
      const F2 = M4.joint(F1, 0, -0.1 * L, 0, curl, 0, 0);
      part(F2, 0, -0.045 * L, 0, 0.012, 0.1 * L, 0.012, 'limb2', g);
      const F3 = M4.joint(F2, 0, -0.09 * L, 0, curl * 0.8, 0, 0);
      part(F3, 0, -0.03 * L, 0, 0.01, 0.07 * L, 0.01, 'limb2', g);
      part(F3, 0, -0.065 * L, 0, 0.017, 0.017, 0.017, 'sph', g);
    }
    return;
  }
  // lizards: the hand thickens, goes green-black, and the nails are claws
  const Q = CREATURE_LOOK.lizards,
    g = mix3(skin, Q.skin, 0.8);
  part(Fa, 0, -0.3 * h, 0.01, 0.07, 0.08, 0.085, 'rbox', mul3(g, 0.85));
  for (const f of [-1, 0, 1]) {
    const C1 = M4.joint(Fa, 0, -0.335 * h, 0.02 + f * 0.023, 0.3, 0, 0);
    part(C1, 0, -0.032, 0, 0.016, 0.068, 0.018, 'limb2', mul3(Q.dark, 1.4));
    const C2 = M4.joint(C1, 0, -0.064, 0, 0.45, 0, 0);
    partR(C2, 0, 0, 0, Math.PI, 0, 0, 0.02, 0.055 + 0.025 * k, 0.02, 'fang', Q.claw);
  }
}
// the dead: the meat gone off the forearm, a claw on the end of it
function halfArm(Fa, H, h, t, sleeve, s) {
  const Q = CREATURE_LOOK.zombies;
  part(Fa, 0, -0.06 * h, 0, 0.082, 0.14 * h, 0.088, 'limb2', sleeve);
  drawSpec = 1.1;
  part(Fa, 0, -0.13 * h, 0, 0.062, 0.03, 0.066, 'sph', Q.blood);
  drawSpec = 0;
  part(Fa, 0, -0.22 * h, 0, 0.022, 0.3 * h, 0.026, 'limb2', Q.rib);
  part(Fa, 0.013, -0.23 * h, 0, 0.018, 0.27 * h, 0.02, 'limb2', mul3(Q.rib, 0.9));
  part(Fa, 0, -0.33 * h, 0, s * 0.08, 0.19, 0.085, 'claw', mul3(Q.skin, 0.8));
}
