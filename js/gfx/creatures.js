//@ gfx/creatures — True forms on their own rig: tongues, cracks, sloughed skin, creature poses
//@ Defines: TONGUE, TONGUE_E, drawTongue, changeCracks, drawSlough, drawCreature, creatureTargets
//@ Uses:    gfx/renderer, core/util, ui/menus, gfx/people, gfx/gl, town/cast, sim/pose, sim/characters, sim/core
//@ (header made by tools/map.js; stripped by build.py)
// a creature on its own rig. grow 0.5→1 while it unfolds out of the person.
const TONGUE = [0.6, 0.12, 0.16],
  TONGUE_E = [0.05, 0.0, 0.008];
// a wet, segmented tongue running out along +z from M. curl > 0 droops it, < 0 lifts the tip; forked at the end.
function drawTongue(M, len, t, curl, thick) {
  if (len < 0.01) return;
  const segs = 14,
    sl = len / segs;
  drawSpec = 1.1;
  let Tm = M;
  for (let i = 0; i < segs; i++) {
    const k = i / (segs - 1),
      w = thick * (1 - k * 0.55) * (1 + 0.08 * Math.sin(t * 13 - i * 1.3)); // it swells and ripples along its length
    Tm = M4.joint(
      Tm,
      0,
      0,
      i ? sl : 0,
      i ? curl * (0.04 + 0.08 * k) + Math.sin(t * 8 - i * 0.7) * 0.04 : 0,
      Math.sin(t * 5.3 - i * 0.6) * 0.035 * k,
      0,
    );
    part(Tm, 0, 0, sl * 0.5, w, w * 0.62, sl * 2.1, 'sph', TONGUE, TONGUE_E);
  }
  if (thick > 0.1) {
    drawSpec = 2.6;
    for (let i = 0; i < 4; i++)
      part(
        Tm,
        0,
        -thick * 0.25,
        -i * sl * 2.5,
        thick * 0.06,
        thick * (0.25 + i * 0.12),
        thick * 0.06,
        'sph',
        [0.7, 0.68, 0.6],
      );
  } // strings of spit hanging off it
  drawSpec = 1.1;
  for (const s of [1, -1]) {
    const F = M4.joint(Tm, s * 0.012, 0, sl * 0.95, 0.1, s * 0.42, 0);
    part(F, 0, 0, 0.05, thick * 0.32, thick * 0.26, 0.13, 'sph', TONGUE, TONGUE_E);
  }
  drawSpec = 0;
}
// mid-change: the skin splits along glowing seams before it comes away
function changeCracks(T, Hd, h, ck, t) {
  const glow = [1.0, 0.24 + 0.1 * Math.sin(t * 9), 0.07],
    e = mul3(glow, 0.55 + 0.7 * ck),
    k = Math.min(1, ck * 1.7);
  part(Hd, 0, 0.12, 0.094, 0.007, 0.24 * k, 0.012, 'box', glow, e);
  for (const s of [1, -1]) partR(Hd, s * 0.045, 0.09, 0.086, 0, 0, s * 0.35, 0.007, 0.13 * k, 0.012, 'box', glow, e);
  partR(Hd, 0.025, 0.21, 0.05, -0.9, 0, 0.3, 0.007, 0.17 * k, 0.012, 'box', glow, e);
  part(T, 0, 0.3 * h, 0.15, 0.012, 0.44 * h * k, 0.012, 'box', glow, e);
  for (const s of [1, -1]) partR(T, s * 0.05, 0.4 * h, 0.148, 0, 0, s * 0.6, 0.009, 0.2 * k, 0.012, 'box', glow, e);
}
// what's left of the person it was wearing: skin in sheets, raw on the inside, and rags of their clothes, all hanging
// off the true form and swinging as it moves. Each: [frame, x, y, z, yaw, width, length, s(kin)|c(loth)|b(ottoms), phase]
function drawSlough(c, t, pieces) {
  const L = c.look;
  if (!L) return;
  const skin = mul3(pallor(L.skinC), 0.95),
    raw = [0.45, 0.1, 0.09];
  for (const [F, x, y, z, ry, w, len, kind, ph] of pieces) {
    const col = kind === 's' ? skin : kind === 'b' ? L.botC : L.topC;
    for (let k = 0; k < 2; k++) {
      const sw = Math.sin(t * 1.7 + ph + k) * 0.14 + Math.sin(t * 3.9 + ph * 2.3) * 0.05,
        rl = (k ? 0.28 : -0.2) + Math.sin(t * 1.3 + ph * 1.7 + k) * 0.1;
      const M = M4.joint(F, x + (k ? w * 0.3 : -w * 0.25), y - k * 0.02, z, 0.1 + sw, ry + (k ? 0.25 : -0.15), rl);
      const ww = w * (k ? 0.55 : 0.7),
        ll = len * (k ? 0.75 : 1);
      part(M, 0, 0, 0, ww, ll, 0.28, 'flap', col);
      if (kind === 's') {
        drawSpec = 1.4;
        part(M, 0, -0.012, -0.008, ww * 0.88, ll * 0.92, 0.28, 'flap', raw);
        drawSpec = 0;
      } // the underside
    }
  }
}
function drawCreature(c, fac, grow) {
  const Q = CREATURE_LOOK[fac] || CREATURE_LOOK.aliens,
    J = c.J,
    fx = c.fx || {},
    t = c.animT || 0,
    tl = c.tell || {};
  drawHi = c.hover ? 0.45 : 0;
  gl.uniform1f(U.uEmitMul, 0);
  gl.uniform1f(U.uDyn, 1);
  gl.uniform1i(U.uCut, 0);
  const g = clamp((grow - 0.5) / 0.3, 0, 1),
    sc = Q.s * (0.55 + 0.45 * g),
    jit = g < 1 ? Math.sin(t * 41) * 0.035 * (1 - g) : 0;
  let Rm = M4.trans(drawX(c) + jit, (c.y || 0) + (J.rootY + (J.float || 0)) * sc, drawZ(c));
  Rm = M4.mul(Rm, M4.rotY(c.dir));
  if (J.pitch) Rm = M4.mul(Rm, M4.rotX(J.pitch));
  if (J.roll) Rm = M4.mul(Rm, M4.rotZ(J.roll));
  Rm = M4.mul(Rm, M4.scale(sc, sc, sc));
  const sk = Q.skin,
    dk = Q.dark;
  if (fac === 'aliens') {
    // too tall and starved: a skull swollen back over a child's chin, black wet eyes that wrap round it,
    // every rib showing, arms to the knee, fingers like a spider's legs. The skin is thin enough to see what runs under it.
    const pulse = 0.55 + 0.45 * Math.sin(t * 3.1),
      slow = 0.5 + 0.5 * Math.sin(t * 1.1);
    const blink = Math.pow(Math.max(0, Math.sin(t * 0.83 + 1.3)), 40); // the pale inner lid, now and then, sideways
    const P = M4.joint(Rm, 0, 1.06, 0, 0, 0, 0);
    part(P, 0, 0, -0.01, 0.17, 0.13, 0.12, 'rbox', mul3(sk, 0.8));
    for (const s of [1, -1]) part(P, s * 0.072, 0.045, 0.035, 0.05, 0.035, 0.045, 'sph', mul3(sk, 0.95)); // hip bones, through the skin
    const T = M4.joint(P, 0, 0.03, 0, J.torso, J.twist || 0, 0);
    part(T, 0, 0.15, -0.015, 0.1, 0.32, 0.07, 'alienLimb', mul3(sk, 0.9)); // a waist you could close a hand round
    part(T, 0, 0.45, -0.01, 0.25, 0.42, 0.17, 'alienTorso', sk);
    part(T, 0, 0.45, -0.01, 0.25, 0.42, 0.17, 'ribs', mul3(sk, 1.15));
    for (let i = 0; i < 3; i++)
      part(T, 0, 0.12 + i * 0.07, 0.035, 0.05 - i * 0.008, 0.012, 0.02, 'rbox', mul3(sk, 0.78)); // the gut, folded on nothing
    part(T, 0.015, 0.2, 0.012, 0.045, 0.06, 0.03, 'sph', mix3(sk, Q.glow, 0.25), mul3(Q.glow, 0.05 + 0.1 * slow)); // something low in the belly, lit, beating slower than a heart
    for (const s of [1, -1])
      partR(T, s * 0.06, 0.645, 0.055, 0, 0, s * 1.38, 0.016, 0.13, 0.016, 'limb2', mul3(sk, 1.12)); // collarbones
    for (let i = 0; i < 9; i++)
      part(
        T,
        0,
        0.26 + i * 0.048,
        -0.066 - 0.008 * Math.sin(i * 0.4),
        0.026,
        0.022,
        0.026,
        'sph',
        mul3(sk, 0.96 - (i % 2) * 0.05),
      ); // the spine, knuckle by knuckle
    for (const s of [1, -1])
      partR(T, s * 0.068, 0.56, -0.058, 0.15, s * 0.3, s * 0.15, 0.075, 0.1, 0.03, 'sph', mul3(sk, 0.93)); // shoulder blades, like folded things
    for (const s of [1, -1]) part(T, s * 0.125, 0.61, -0.01, 0.075, 0.065, 0.075, 'sph', sk);
    part(T, 0, 0.74, 0.015, 0.042, 0.24, 0.042, 'alienLimb', sk);
    for (const s of [1, -1])
      partR(T, s * 0.02, 0.73, 0.03, 0.1, 0, s * 0.12, 0.012, 0.2, 0.012, 'limb2', mul3(sk, 0.82)); // cords in the neck
    for (let i = 0; i < 4; i++) part(T, 0, 0.67 + i * 0.033, 0.033, 0.028, 0.009, 0.02, 'sph', mul3(sk, 1.12)); // the windpipe's rings
    const tw = Math.sin(t * 1.3) > 0.88 ? Math.sin(t * 47) * 0.24 : 0; // the head twitches, like an insect's
    const Hd = M4.joint(T, 0, 0.83, 0.02, J.hp - 0.1, J.hy + tw, J.hr + tw * 0.5);
    part(Hd, 0, 0.2, -0.04, 0.4, 0.46, 0.44, 'alienHead', sk);
    for (const s of [1, -1]) {
      // light pulsing in the veins under the scalp
      partR(
        Hd,
        s * 0.07,
        0.4,
        0.02,
        -0.75,
        0,
        s * 0.25,
        0.01,
        0.22,
        0.01,
        'box',
        mul3(Q.glow, 0.5),
        mul3(Q.glow, 0.4 * pulse),
      );
      partR(
        Hd,
        s * 0.13,
        0.33,
        -0.1,
        -0.3,
        0,
        s * 0.55,
        0.009,
        0.2,
        0.009,
        'box',
        mul3(Q.glow, 0.5),
        mul3(Q.glow, 0.3 * pulse),
      );
      partR(
        Hd,
        s * 0.04,
        0.42,
        -0.14,
        -1.4,
        0,
        s * 0.2,
        0.008,
        0.18,
        0.008,
        'box',
        mul3(Q.glow, 0.5),
        mul3(Q.glow, 0.25 * pulse),
      );
    }
    drawSpec = 3.4;
    for (const s of [1, -1])
      partR(Hd, s * 0.072, 0.193, 0.142, 0, s * 0.42, s * 0.5, 0.15, 0.072, 0.075, 'sph', Q.eye, mul3(Q.glow, 0.03));
    drawSpec = 0;
    for (const s of [1, -1]) {
      partR(
        Hd,
        s * 0.078,
        0.192,
        0.176,
        0,
        s * 0.42,
        s * 0.5,
        0.05,
        0.026,
        0.012,
        'sph',
        [0.01, 0.03, 0.024],
        mul3(Q.glow, 0.07 + 0.05 * pulse),
      ); // deep in it, a ring the colour of the veins
      if (blink > 0.02)
        partR(
          Hd,
          s * (0.072 + 0.05 * (1 - blink)),
          0.193,
          0.145,
          0,
          s * 0.42,
          s * 0.5,
          0.152 * blink,
          0.074,
          0.078,
          'sph',
          [0.62, 0.68, 0.62],
        );
    }
    for (const s of [1, -1])
      part(Hd, s * 0.093, 0.205, 0.17, 0.016, 0.012, 0.01, 'sph', Q.glow, mul3(Q.glow, 0.9 * pulse));
    for (const s of [1, -1])
      partR(Hd, s * 0.011, 0.12, 0.16, 0, 0, s * 0.3, 0.005, 0.018, 0.006, 'sph', [0.04, 0.04, 0.05]); // slits for a nose
    // the mouth: a seam with no lips. Open, it's full of needles
    const mo = tl.lunge || tl.aim || fx.gape || tl.feed ? 1 : 0;
    part(Hd, 0, 0.068, 0.142, 0.042, 0.004 + mo * 0.028, 0.014, 'box', [0.008, 0.008, 0.01]);
    if (mo) {
      drawSpec = 1.6;
      part(Hd, 0, 0.068, 0.138, 0.036, 0.024, 0.01, 'sph', [0.18, 0.04, 0.06]);
      drawSpec = 0;
      for (let i = 0; i < 7; i++)
        for (const r of [1, -1])
          partR(
            Hd,
            (i - 3) * 0.01,
            0.068 + r * 0.014,
            0.146,
            r > 0 ? Math.PI : 0,
            0,
            0,
            0.004,
            0.014,
            0.004,
            'fang',
            [0.82, 0.84, 0.76],
          );
    }
    for (const s of [1, -1]) {
      const ua = s > 0 ? J.uaL : J.uaR,
        fa = s > 0 ? J.faL : J.faR,
        ao = s > 0 ? J.aoL : J.aoR;
      const Ua = M4.joint(T, s * 0.15, 0.6, -0.01, ua, 0, s * ao);
      part(Ua, 0, -0.25, 0, 0.048, 0.54, 0.05, 'alienLimb', sk);
      part(Ua, 0, -0.5, 0, 0.062, 0.07, 0.062, 'sph', mul3(sk, 0.95));
      const Fa = M4.joint(Ua, 0, -0.5, 0, fa, 0, 0);
      part(Fa, 0, -0.24, 0, 0.04, 0.52, 0.042, 'alienLimb', sk);
      part(Fa, 0, -0.5, 0.01, 0.06, 0.05, 0.05, 'sph', sk);
      for (const f of [-1, 0, 1]) {
        const curl = 0.25 + 0.18 * Math.sin(t * 2.2 + f * 1.3);
        const F1 = M4.joint(Fa, f * 0.022, -0.52, 0.01, curl * 0.6, 0, f * 0.16);
        part(F1, 0, -0.075, 0, 0.016, 0.17, 0.016, 'limb2', sk);
        part(F1, 0, -0.15, 0, 0.02, 0.022, 0.02, 'sph', mul3(sk, 0.95));
        const F2 = M4.joint(F1, 0, -0.15, 0, curl, 0, 0);
        part(F2, 0, -0.065, 0, 0.013, 0.15, 0.013, 'limb2', sk);
        part(F2, 0, -0.13, 0, 0.016, 0.018, 0.016, 'sph', mul3(sk, 0.95));
        const F3 = M4.joint(F2, 0, -0.13, 0, curl * 0.8, 0, 0);
        part(F3, 0, -0.04, 0, 0.011, 0.09, 0.011, 'limb2', sk);
        drawSpec = 1.8;
        part(F3, 0, -0.085, 0.004, 0.026, 0.024, 0.02, 'sph', mul3(sk, 1.05));
        part(F3, 0, -0.088, 0.012, 0.014, 0.012, 0.008, 'sph', mul3(Q.glow, 0.3), mul3(Q.glow, 0.1));
        drawSpec = 0; // a pad on each tip, wet
      }
      if (s < 0 && tl.aim) {
        part(Fa, 0, -0.55, 0.08, 0.05, 0.06, 0.2, 'rbox', [0.12, 0.13, 0.15], [1, 0.12, 0.08]);
        part(Fa, 0, -0.55, 0.19, 0.03, 0.03, 0.03, 'sph', [1, 0.3, 0.2], [1.6, 0.2, 0.1]);
      }
      if (s > 0 && c.look) part(Ua, 0, -0.42, 0, 0.074, 0.12, 0.076, 'limb2', mul3(c.look.topC, 0.8)); // what's left of a sleeve, round the elbow
    }
    for (const s of [1, -1]) {
      const th = s > 0 ? J.thL : J.thR,
        sh = s > 0 ? J.shL : J.shR;
      const Th = M4.joint(P, s * 0.07, -0.02, 0, th, 0, 0);
      part(Th, 0, -0.24, 0, 0.06, 0.52, 0.065, 'alienLimb', sk);
      part(Th, 0, -0.48, 0.005, 0.07, 0.075, 0.07, 'sph', mul3(sk, 0.95));
      const Sh = M4.joint(Th, 0, -0.48, 0, sh, 0, 0);
      part(Sh, 0, -0.24, 0, 0.045, 0.52, 0.048, 'alienLimb', sk);
      part(Sh, 0, -0.5, 0.06, 0.06, 0.035, 0.22, 'rbox', dk);
      for (const f of [-1, 1]) {
        partR(Sh, f * 0.018, -0.51, 0.17, 0.1, f * 0.25, 0, 0.016, 0.016, 0.12, 'limb2', dk);
        part(Sh, f * 0.034, -0.515, 0.27, 0.022, 0.018, 0.026, 'sph', dk);
      }
    }
    drawSlough(c, t, [
      [T, 0.12, 0.66, 0.02, 0.15, 0.1, 0.32, 'c', 0],
      [T, -0.13, 0.65, -0.02, -0.25, 0.09, 0.22, 's', 1.3],
      [T, 0.02, 0.72, -0.07, Math.PI + 0.2, 0.15, 0.4, 's', 2.1],
      [P, 0.1, 0.06, 0.04, 0.5, 0.09, 0.34, 'b', 0.7],
      [P, -0.06, 0.07, -0.05, Math.PI - 0.4, 0.1, 0.28, 'b', 2.7],
    ]);
    return;
  }
  if (fac === 'lizards') {
    // a hunched slab of muscle under plated scales: horns raked back off the skull, a crocodile's snout full of teeth,
    // a throat that hangs and swings, a frill that flares when it means it. The skin it wore comes off it in sheets.
    const blink = Math.pow(Math.max(0, Math.sin(t * 0.61 + 0.4)), 50);
    const P = M4.joint(Rm, 0, 0.88, 0, 0, 0, 0);
    part(P, 0, 0, -0.02, 0.4, 0.3, 0.36, 'rbox', dk);
    let Tm = M4.joint(P, 0, -0.02, -0.14, -0.3, Math.sin(t * 1.7) * 0.25, 0); // the tail drags
    for (let i = 0; i < 8; i++) {
      const k = 1 - i * 0.11;
      part(Tm, 0, 0, -0.14, 0.21 * k, 0.17 * k, 0.36, 'limb2', i % 2 ? mul3(sk, 0.78) : sk);
      partR(Tm, 0, 0.07 * k, -0.14, -0.9, 0, 0, 0.05 * k, 0.12 * k, 0.03, 'fang', Q.claw);
      if (i % 2 === 0)
        for (const s of [1, -1])
          partR(
            Tm,
            s * 0.08 * k,
            0.03 * k,
            -0.12,
            -0.9,
            0,
            s * 0.8,
            0.025 * k,
            0.06 * k,
            0.02,
            'fang',
            mul3(Q.claw, 0.85),
          );
      Tm = M4.joint(Tm, 0, 0, -0.25, i < 3 ? 0.08 : 0.02, Math.sin(t * 2.1 + i * 0.7) * 0.22, 0);
    }
    partR(Tm, 0, 0, -0.08, -Math.PI / 2, 0, 0, 0.07, 0.22, 0.05, 'fang', Q.claw); // and a spike on the end of it
    const T = M4.joint(P, 0, 0.1, 0, J.torso, J.twist || 0, 0);
    part(T, 0, 0.3, 0, 0.58, 0.68, 0.46, 'lizTorso', sk);
    part(T, 0, 0.3, 0, 0.58, 0.68, 0.46, 'tBelly', Q.belly);
    for (let i = 0; i < 7; i++)
      partR(
        T,
        0,
        0.08 + i * 0.085,
        -0.17 + (i > 3 ? -0.015 : 0),
        -1.1,
        0,
        0,
        0.07 - i * 0.004,
        0.17 - i * 0.008,
        0.04,
        'fang',
        Q.claw,
      ); // the spines, raked back
    for (let i = 0; i < 5; i++)
      for (const s of [1, -1])
        partR(
          T,
          s * 0.07,
          0.16 + i * 0.1,
          -0.16 - (i > 2 ? 0.01 : 0),
          -0.25,
          0,
          s * 0.25,
          0.05,
          0.04,
          0.03,
          'rbox',
          mul3(dk, 1.2 - (i % 2) * 0.2),
        ); // osteoderms, either side of them
    for (const s of [1, -1]) {
      part(T, s * 0.24, 0.52, 0, 0.22, 0.2, 0.24, 'sph', sk);
      for (let i = 0; i < 2; i++)
        partR(
          T,
          s * (0.27 + i * 0.03),
          0.62 - i * 0.04,
          -0.04 + i * 0.05,
          -0.4,
          0,
          -s * (0.55 + i * 0.3),
          0.032,
          0.09 - i * 0.015,
          0.028,
          'fang',
          Q.claw,
        ); // spurs on the shoulder
    }
    part(T, 0, 0.58, 0.05, 0.22, 0.2, 0.21, 'limb2', sk);
    const Hd = M4.joint(T, 0, 0.64, 0.1, J.hp, J.hy, J.hr);
    part(Hd, 0, 0.08, 0.03, 0.3, 0.26, 0.36, 'lizHead', sk);
    for (const s of [1, -1]) {
      part(Hd, s * 0.105, 0.158, 0.1, 0.085, 0.03, 0.08, 'rbox', mul3(dk, 1.3)); // a heavy ridge over each eye
      partR(Hd, s * 0.1, 0.16, -0.06, -1.2, 0, s * 0.3, 0.04, 0.2, 0.035, 'fang', mul3(Q.claw, 0.9)); // horns, swept back
      partR(Hd, s * 0.13, 0.12, -0.03, -1.45, 0, s * 0.7, 0.025, 0.11, 0.022, 'fang', mul3(Q.claw, 0.8));
      part(Hd, s * 0.125, 0.04, -0.01, 0.07, 0.07, 0.09, 'sph', mul3(sk, 0.9)); // the jaw's hinge muscle
      part(Hd, s * 0.02, 0.105, 0.4, 0.014, 0.01, 0.014, 'sph', [0.02, 0.02, 0.01]); // nostrils at the end of the snout
    }
    for (let i = 0; i < 4; i++)
      partR(Hd, 0, 0.17 - i * 0.004, 0.08 - i * 0.065, -0.7, 0, 0, 0.022, 0.07 - i * 0.008, 0.018, 'fang', Q.claw); // a crest down the skull
    drawSpec = 2.2;
    for (const s of [1, -1]) {
      part(Hd, s * 0.105, 0.12, 0.1, 0.055, 0.05, 0.04, 'sph', Q.eye, Q.eye);
      part(Hd, s * 0.12, 0.12, 0.118, 0.01, 0.045 * (1 - blink * 0.8), 0.01, 'box', [0.01, 0.01, 0.01]);
    }
    drawSpec = 0;
    if (blink > 0.02)
      for (const s of [1, -1])
        part(Hd, s * 0.108, 0.12 + 0.025 * (1 - blink), 0.103, 0.058, 0.052 * blink, 0.044, 'sph', mul3(sk, 0.75));
    for (let i = 0; i < 6; i++)
      for (const s of [1, -1])
        partR(
          Hd,
          s * (0.07 - i * 0.004),
          0.025,
          0.12 + i * 0.055,
          Math.PI,
          0,
          0,
          0.016,
          0.05 - i * 0.003,
          0.016,
          'fang',
          Q.teeth,
        ); // teeth hanging over the lip
    const jaw =
      tl.lunge || tl.feed
        ? 0.6
        : fx.tongue > 0.05
          ? 0.42 + fx.tongue * 0.15
          : 0.06 + Math.max(0, Math.sin(t * 0.8)) * 0.05;
    const Jw = M4.joint(Hd, 0, 0.0, 0.04, jaw, 0, 0);
    part(Jw, 0, -0.03, 0.16, 0.16, 0.06, 0.32, 'rbox', dk);
    drawSpec = 1.4;
    part(Jw, 0, -0.002, 0.16, 0.12, 0.014, 0.27, 'rbox', [0.34, 0.05, 0.06]);
    drawSpec = 0;
    for (let i = 0; i < 5; i++)
      for (const s of [1, -1])
        part(Jw, s * (0.058 - i * 0.003), 0.0, 0.07 + i * 0.055, 0.015, 0.042, 0.015, 'fang', Q.teeth);
    const sw = Math.sin(t * 2.3) * 0.08; // the throat: loose skin under the jaw, swinging
    partR(Jw, 0, -0.085, 0.07, sw, 0, 0, 0.11, 0.13, 0.17, 'sph', mul3(Q.belly, 0.9));
    drawSpec = 2.6; // and it drools, in strings
    for (let k = 0; k < 3; k++) {
      const dl = (t * 0.45 + k * 0.33) % 1;
      part(
        Jw,
        (k - 1) * 0.05,
        -0.05 - dl * 0.16,
        0.26 - k * 0.04,
        0.007,
        0.03 + dl * 0.06,
        0.007,
        'sph',
        [0.66, 0.68, 0.56],
      );
    }
    drawSpec = 0;
    const fl = clamp((tl.lunge || tl.feed ? 1 : 0) + fx.tongue * 1.3 + (fx.frill || 0), 0, 1);
    if (fl > 0.02)
      for (const s of [1, -1])
        for (let i = 0; i < 5; i++) {
          // a ruff of thin spines behind the jaw, skin stretched between them
          const Fm = M4.joint(Hd, s * 0.1, 0.06, -0.1, -0.7 + i * 0.35, 0, -s * (0.35 + 0.9 * fl));
          part(Fm, 0, 0.11 * fl, 0, 0.01, 0.22 * fl, 0.012, 'box', Q.claw);
          part(Fm, 0, 0.1 * fl, -0.02, 0.006, 0.2 * fl, 0.09, 'box', Q.frill, mul3(Q.frill, 0.12));
        }
    if (fx.tongue > 0.01)
      drawTongue(
        M4.joint(Jw, 0, 0.0, 0.2, -0.3 - (fx.tongueAim || 0), 0, 0),
        fx.tongue * (fx.tongueLen || 1.4),
        t,
        fx.tongueCurl != null ? fx.tongueCurl : 0.35,
        0.075,
      );
    for (const s of [1, -1]) {
      const ua = s > 0 ? J.uaL : J.uaR,
        fa = s > 0 ? J.faL : J.faR,
        ao = s > 0 ? J.aoL : J.aoR;
      const Ua = M4.joint(T, s * 0.28, 0.5, 0.02, ua, 0, s * ao);
      part(Ua, 0, -0.17, 0, 0.15, 0.4, 0.15, 'limb2', sk);
      const Fa = M4.joint(Ua, 0, -0.34, 0, fa, 0, 0);
      part(Fa, 0, -0.16, 0, 0.13, 0.38, 0.13, 'limb2', sk);
      for (let i = 0; i < 2; i++)
        partR(Fa, s * 0.06, -0.06 - i * 0.12, -0.04, -0.6, 0, -s * 0.9, 0.03, 0.09, 0.025, 'fang', Q.claw); // spurs down the forearm
      part(Fa, 0, -0.36, 0.02, 0.13, 0.09, 0.12, 'rbox', dk);
      for (const f of [-1, 0, 1]) {
        const C1 = M4.joint(Fa, f * 0.04, -0.38, 0.04, 0.35, 0, f * 0.15);
        part(C1, 0, -0.08, 0, 0.024, 0.17, 0.028, 'limb2', dk);
        const C2 = M4.joint(C1, 0, -0.16, 0, 0.4, 0, 0);
        partR(C2, 0, 0, 0, Math.PI, 0, 0, 0.03, 0.13, 0.03, 'fang', Q.claw);
      }
    }
    for (const s of [1, -1]) {
      const th = s > 0 ? J.thL : J.thR,
        sh = s > 0 ? J.shL : J.shR;
      const Th = M4.joint(P, s * 0.14, -0.04, 0, th - 0.35, 0, 0);
      part(Th, 0, -0.2, 0, 0.19, 0.46, 0.2, 'limb2', sk);
      const Sh = M4.joint(Th, 0, -0.4, 0, sh + 0.7, 0, 0);
      part(Sh, 0, -0.18, 0, 0.12, 0.42, 0.12, 'limb2', sk);
      const Ft = M4.joint(Sh, 0, -0.38, 0, -0.35 - sh * 0.5, 0, 0);
      part(Ft, 0, -0.03, 0.08, 0.14, 0.07, 0.3, 'rbox', dk);
      for (const f of [-1, 0, 1])
        partR(Ft, f * 0.045, -0.04, 0.22, Math.PI / 2, 0, 0, 0.026, 0.11, 0.026, 'fang', Q.claw);
    }
    drawSlough(c, t, [
      [T, 0.06, 0.66, -0.19, Math.PI + 0.15, 0.2, 0.5, 's', 0],
      [T, 0.3, 0.64, 0.04, 0.5, 0.13, 0.38, 's', 1.4],
      [T, -0.29, 0.64, 0.02, -0.5, 0.12, 0.3, 'c', 2.2],
      [P, 0.21, 0.06, 0.06, 0.6, 0.13, 0.36, 'b', 3.1],
      [P, -0.17, 0.07, -0.15, Math.PI - 0.6, 0.13, 0.32, 's', 1.9],
    ]);
    return;
  }
  // the dead: the chest is open to the ribs, the jaw has come unhinged, one eye is still in
  const P = M4.joint(Rm, 0, 0.9, 0, 0, 0, 0);
  part(P, 0, 0, -0.01, 0.28, 0.18, 0.2, 'rbox', Q.rag);
  const T = M4.joint(P, 0, 0.05, 0, J.torso, J.twist || 0, 0);
  const TP = (prim, col) => part(T, 0, 0.26, -0.01, 0.33, 0.6, 0.36, prim, col);
  TP('rotTorso', sk);
  TP('tCavity', Q.cavity);
  drawSpec = 0.8;
  TP('ribs', Q.rib);
  drawSpec = 0;
  TP('tRags', Q.rag);
  drawSpec = 1.2;
  part(T, 0, 0.32, 0.075, 0.12, 0.2, 0.02, 'rbox', Q.blood);
  drawSpec = 0; // what's left in there, wet
  part(T, 0, 0.56, 0.01, 0.075, 0.15, 0.08, 'limb2', mul3(sk, 0.8));
  const Hd = M4.joint(T, 0, 0.6, 0.02, J.hp, J.hy, J.hr + 0.25);
  const HP = (prim, col) =>
    part(Hd, HEAD_C[0], HEAD_C[1], HEAD_C[2], HEAD_S[0] * 1.05, HEAD_S[1] * 1.05, HEAD_S[2] * 1.05, prim, col);
  HP('skullTop', sk);
  part(Hd, 0.05, 0.19, -0.04, 0.1, 0.08, 0.12, 'sph', Q.rot);
  part(Hd, -0.03, 0.08, 0.07, 0.06, 0.035, 0.03, 'sph', mul3(Q.blood, 0.7)); // the cheek, torn through
  part(Hd, 0.031, 0.122, 0.072, 0.03, 0.026, 0.02, 'sph', [0.015, 0.01, 0.01]); // the empty socket
  drawSpec = 1.5;
  part(Hd, -0.031, 0.122, 0.079, 0.026, 0.024, 0.02, 'sph', Q.eye, mul3(Q.eye, 0.35));
  drawSpec = 0;
  for (let i = 0; i < 7; i++)
    part(Hd, (i - 3) * 0.013, 0.058, 0.082 - Math.abs(i - 3) * 0.006, 0.011, 0.02, 0.01, 'rbox', Q.teeth);
  part(Hd, 0, 0.045, 0.04, 0.07, 0.03, 0.08, 'sph', [0.03, 0.006, 0.006]);
  const Jw = M4.joint(
    Hd,
    0,
    0.06,
    0.0,
    0.55 + Math.sin(t * 1.3) * 0.12 + (tl.feed || tl.lunge ? 0.3 : 0),
    0,
    Math.sin(t * 0.7) * 0.06,
  );
  part(
    Jw,
    HEAD_C[0],
    HEAD_C[1] - 0.06,
    HEAD_C[2],
    HEAD_S[0] * 1.05,
    HEAD_S[1] * 1.05,
    HEAD_S[2] * 1.05,
    'jaw',
    mul3(sk, 0.9),
  );
  for (let i = 0; i < 6; i++)
    part(Jw, (i - 2.5) * 0.013, -0.005, 0.072 - Math.abs(i - 2.5) * 0.006, 0.01, 0.018, 0.01, 'rbox', Q.teeth);
  drawSpec = 1.2;
  part(Jw, 0, -0.03, 0.05, 0.06, 0.03, 0.05, 'sph', Q.blood);
  for (let k = 0; k < 2; k++) {
    const dl = (t * 0.3 + k * 0.5) % 1;
    part(Jw, (k - 0.5) * 0.03, -0.06 - dl * 0.07, 0.07, 0.01, 0.025 + dl * 0.03, 0.01, 'sph', Q.blood);
  }
  drawSpec = 0;
  for (const s of [1, -1]) {
    if (s > 0 && fx.armOff) continue;
    const ua = s > 0 ? J.uaL : J.uaR,
      fa = s > 0 ? J.faL : J.faR,
      ao = s > 0 ? J.aoL : J.aoR;
    const Ua = M4.joint(T, s * 0.17, 0.5, -0.01, ua, 0, s * ao);
    part(Ua, 0, -0.19, 0, 0.075, 0.44, 0.08, 'limb2', sk);
    if (s < 0) part(Ua, 0, -0.1, 0.03, 0.08, 0.12, 0.06, 'rbox', Q.rot);
    const Fa = M4.joint(Ua, 0, -0.38, 0, fa, 0, 0);
    if (s < 0) {
      part(Fa, 0, -0.06, 0, 0.068, 0.16, 0.07, 'limb2', sk);
      part(Fa, 0, -0.22, 0, 0.026, 0.34, 0.03, 'limb2', Q.rib);
      part(Fa, 0.012, -0.24, 0, 0.02, 0.3, 0.024, 'limb2', mul3(Q.rib, 0.9));
      drawSpec = 1;
      part(Fa, 0, -0.12, 0, 0.07, 0.03, 0.074, 'sph', Q.blood);
      drawSpec = 0;
    } // the meat gone off the bone
    else part(Fa, 0, -0.19, 0, 0.064, 0.42, 0.068, 'limb2', sk);
    part(Fa, 0, -0.39, 0.0, s * 0.09, 0.21, 0.095, 'claw', mul3(sk, 0.8));
  }
  if (fx.armOff) {
    drawSpec = 1.2;
    part(T, 0.17, 0.5, 0, 0.09, 0.06, 0.09, 'sph', Q.blood);
    drawSpec = 0;
    part(T, 0.17, 0.5, 0, 0.035, 0.035, 0.035, 'sph', Q.rib);
  }
  for (const s of [1, -1]) {
    const th = s > 0 ? J.thL : J.thR,
      sh = s > 0 ? J.shL : J.shR;
    const Th = M4.joint(P, s * 0.08, -0.02, 0, th, 0, 0);
    part(Th, 0, -0.22, 0, 0.1, 0.48, 0.105, 'limb2', Q.rag);
    const Sh = M4.joint(Th, 0, -0.44, 0, sh, 0, 0);
    part(Sh, 0, -0.22, 0, 0.075, 0.48, 0.08, 'limb2', sk);
    if (s > 0) part(Sh, 0, -0.15, 0.03, 0.06, 0.1, 0.04, 'rbox', Q.rot);
    part(Sh, 0, -0.44, 0.05, 0.095, 0.07, 0.24, 'shoe', dk);
  }
}
// poses for a creature: stalk, run, lunge, feed, aim, down
function creatureTargets(c) {
  const T = defaultJ(),
    t = c.animT,
    tl = c.tell,
    fx = c.fx,
    fac = tl.fac || G.faction;
  fx.eye = null;
  fx.slit = false;
  fx.tongue = 0;
  fx.skin = null;
  fx.armOff = false;
  fx.cloak = 0;
  fx.big = 0;
  fx.prop = null;
  fx.half = null;
  fx.frill = 0;
  fx.trace = null;
  if (c.moving) {
    const p = c.walkPh,
      s1 = Math.sin(p),
      run = c.run;
    if (fac === 'lizards') {
      if (run) {
        T.rootY = -0.38;
        T.torso = 1.1;
        T.hp = -1.0;
        T.thL = s1 * 0.8;
        T.thR = -s1 * 0.8;
        T.shL = 0.5 + Math.max(0, Math.sin(p + 1.3)) * 0.8;
        T.shR = 0.5 + Math.max(0, -Math.sin(p + 1.3)) * 0.8;
        T.uaL = -1.25 - s1 * 0.7;
        T.uaR = -1.25 + s1 * 0.7;
        T.faL = T.faR = -0.2;
      } else {
        T.rootY = -0.22;
        T.torso = 0.62;
        T.hp = -0.5;
        T.thL = s1 * 0.45;
        T.thR = -s1 * 0.45;
        T.shL = 0.35 + Math.max(0, Math.sin(p + 1.3)) * 0.5;
        T.shR = 0.35 + Math.max(0, -Math.sin(p + 1.3)) * 0.5;
        T.uaL = -0.7;
        T.uaR = -0.7;
        T.faL = T.faR = -0.7;
      }
      fx.tongue = Math.pow(Math.max(0, Math.sin(t * 7)), 8);
    } else if (fac === 'aliens') {
      T.float = 0.1 + Math.sin(t * 2.2) * 0.03;
      T.thL = s1 * 0.25;
      T.thR = -s1 * 0.25;
      T.shL = T.shR = 0.15;
      T.uaL = -s1 * 0.12;
      T.uaR = s1 * 0.12;
      T.torso = run ? 0.15 : 0.04;
      T.hp = 0.05;
    } else {
      T.thL = s1 * 0.5;
      T.thR = -s1 * 0.5;
      T.shL = Math.max(0, Math.sin(p + 1.3)) * 0.6;
      T.shR = Math.max(0, -Math.sin(p + 1.3)) * 0.6;
      T.torso = run ? 0.42 : 0.3;
      T.hp = -0.25;
      T.hr = Math.sin(t * 1.6) * 0.15;
      T.uaL = -1.35 + Math.sin(p) * 0.12;
      T.uaR = -1.4 - Math.sin(p) * 0.12;
      T.faL = T.faR = -0.1;
      T.roll = Math.sin(p * 0.5) * 0.06;
    }
  } else if (fac === 'aliens') {
    T.float = 0.24 + Math.sin(t * 2) * 0.05;
    T.aoL = T.aoR = 0.32;
    T.uaL = T.uaR = -0.15;
    T.hy = Math.sin(t * 0.5) * 0.35;
    T.hp = -0.1;
  } else if (fac === 'lizards') {
    T.rootY = -0.25;
    T.torso = 0.58;
    T.hp = -0.4;
    T.hy = Math.sin(t * 0.8) * 0.5;
    T.thL = T.thR = -0.3;
    T.shL = T.shR = 0.6;
    T.uaL = T.uaR = -0.8;
    T.faL = T.faR = -0.6;
    fx.tongue = Math.pow(Math.max(0, Math.sin(t * 5)), 8);
  } else {
    T.hp = 0.45;
    T.hr = 0.35;
    T.roll = Math.sin(t * 0.9) * 0.08;
    T.uaL = -0.6;
    T.uaR = -1.2;
    T.faL = T.faR = -0.2;
    T.torso = 0.2;
    fx.armOff = Math.sin(t * 0.4) > 0.7;
  }
  if (tl.aim) {
    T.uaR = -1.55;
    T.faR = 0;
    T.aoR = 0;
    T.hy = 0;
  }
  if (tl.wind) {
    // reared back, both arms up over its head: the blow is coming
    T.torso -= 0.28;
    T.uaL = T.uaR = -2.75;
    T.faL = T.faR = -0.85;
    T.aoL = T.aoR = 0.25;
    T.hp = 0.2;
  }
  if (tl.lunge) {
    T.torso += 0.45;
    T.uaL = T.uaR = -1.75;
    T.faL = T.faR = -0.15;
    T.hp = -0.3;
  }
  if (tl.feed) {
    T.torso = 1.0;
    T.hp = 0.65;
    T.rootY = -0.45;
    T.uaL = T.uaR = -1.3;
    T.faL = -1.0 + Math.sin(t * 7) * 0.3;
    T.faR = -1.0 - Math.sin(t * 6) * 0.3;
  }
  if (tl.down) {
    T.pitch = -Math.PI / 2;
    T.rootY = 0.12;
    T.float = 0;
  }
  if (tl.kneel) {
    T.float = 0;
    T.pitch = 0;
    T.roll = 0;
    T.rootY = -0.46;
    T.thL = T.thR = -0.12;
    T.shL = T.shR = 1.55;
    T.torso = 0.18;
    T.hp = 0.42;
    T.hy = 0;
    T.hr = 0;
    T.uaL = T.uaR = -2.75;
    T.aoL = T.aoR = 0.25;
    T.faL = T.faR = -0.35;
    fx.tongue = 0;
    fx.armOff = false;
  }
  return T;
}
