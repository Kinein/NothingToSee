//@ gfx/people — Drawing a person: body, face, hair, clothes and the small details
//@ Defines: WHITE_SHIRT, MARK_GOLD, MARK_GOLD_E, MARK_GOLD_D, MARK_STALK, MARK_BEAD, MARK_FLY, pallor, HEAD_C, HEAD_S, FACE_T, faceZ, dressDetail, drawChar, drawPerson
//@ Uses:    gfx/renderer, core/util, gfx/gl, horror/tenth-forms, town/cast, horror/half-forms, gfx/creatures, sim/core, gfx/body-parts, sim/pose, …
//@ (header made by tools/map.js; stripped by build.py)
// ───────────── people
// Long and thin, a little stooped, the head carried forward. Faces are mostly socket. Nobody in Wexley has slept well in years.
const WHITE_SHIRT = [0.76, 0.75, 0.7];
// THEIR mark (them/servants): the gold badge, the feeler and its bead
const MARK_GOLD = [0.92, 0.72, 0.22],
  MARK_GOLD_E = [0.45, 0.33, 0.06],
  MARK_GOLD_D = [0.55, 0.4, 0.1],
  MARK_STALK = [0.36, 0.4, 0.34],
  MARK_BEAD = [0.45, 1, 0.55],
  MARK_FLY = [0.04, 0.045, 0.03];
// the town wears its skin a little grey: whatever tone it is, the blood is a long way under it
function pallor(c) {
  const l = c[0] * 0.3 + c[1] * 0.59 + c[2] * 0.11;
  return [lerp(c[0], l * 0.96, 0.3), lerp(c[1], l * 1.0, 0.3), lerp(c[2], l * 1.03, 0.3)];
}
// head shells all share the head's frame, so hair, beards and hats sit on the skull exactly
const HEAD_C = [0, 0.115, 0],
  HEAD_S = [0.19, 0.235, 0.215];
// where the face actually is: a height field of the head's front, so eyes sit in the sockets and brows on the ridge
let FACE_T = null;
function faceZ(x, y) {
  const N = 56;
  if (!FACE_T) {
    FACE_T = new Float32Array(N * N).fill(-1);
    for (let j = 0; j <= 220; j++)
      for (let i = 0; i <= 440; i++) {
        const p = headP(i / 440, j / 220);
        if (p[2] <= 0) continue;
        const bx = Math.round((p[0] + 0.5) * (N - 1)),
          by = Math.round((p[1] + 0.5) * (N - 1));
        if (bx < 0 || by < 0 || bx >= N || by >= N) continue;
        const k = by * N + bx;
        if (p[2] > FACE_T[k]) FACE_T[k] = p[2];
      }
  }
  const fx = clamp(((x - HEAD_C[0]) / HEAD_S[0] + 0.5) * (N - 1), 0, N - 1.001),
    fy = clamp(((y - HEAD_C[1]) / HEAD_S[1] + 0.5) * (N - 1), 0, N - 1.001);
  const x0 = Math.floor(fx),
    y0 = Math.floor(fy),
    tx = fx - x0,
    ty = fy - y0,
    T = FACE_T;
  const at = (a, b) => Math.max(0, T[b * N + a]);
  const z = lerp(lerp(at(x0, y0), at(x0 + 1, y0), tx), lerp(at(x0, y0 + 1), at(x0 + 1, y0 + 1), tx), ty);
  return z * HEAD_S[2] + HEAD_C[2];
}
// buttons, belts, badges, straps: the small things that make a sweater a cardigan and a man a courier.
// Everything sits on the torso's real front (torsoFrontZ), in the torso frame T or the pelvis frame P.
function dressDetail(c, L, T, P, h, w, TY, TSX, TSY, TSZ, top, acc, skin) {
  const Y = (yl) => TY + yl * TSY,
    Z = (yl, dz = 0) => torsoFrontZ(yl) * TSZ + dz;
  const BTN = (col, ys, x = 0, r = 0.017) => {
    for (const yl of ys) part(T, x, Y(yl), Z(yl, 0.008), r, r, r * 0.6, 'sph', col);
  };
  switch (L.outfit) {
    case 'tie':
      part(T, 0, Y(0.43), Z(0.43, 0.012), 0.034, 0.03, 0.02, 'rbox', mul3(acc, 0.9)); // the knot
      for (const s of [1, -1])
        partR(T, s * 0.03, Y(0.455), Z(0.455, 0.008), 0, 0, s * 0.9, 0.05, 0.022, 0.01, 'box', WHITE_SHIRT); // collar points
      BTN(mul3(top, 0.6), [-0.08, -0.26], 0, 0.019);
      break;
    case 'jacket':
      BTN(mul3(top, 0.55), [-0.06, -0.22, -0.38], 0, 0.02);
      for (const s of [1, -1])
        partR(T, s * 0.1 * w, Y(-0.3), Z(-0.3, -0.008), 0, 0, s * 0.06, 0.1 * w, 0.014, 0.012, 'box', mul3(top, 0.7)); // pocket flaps
      part(T, -0.1 * w, Y(0.22), Z(0.22, -0.006), 0.07, 0.01, 0.01, 'box', mul3(top, 0.7));
      break;
    case 'cardigan':
      BTN(L.btnC || [0.82, 0.78, 0.66], [-0.38, -0.24, -0.1, 0.04, 0.17], 0, 0.016);
      break;
    case 'vest':
      BTN(mul3(acc, 0.55), [-0.3, -0.18, -0.06], 0, 0.016);
      part(T, 0.11 * w, Y(0.02), Z(0.02, -0.004), 0.008, 0.06, 0.01, 'box', [0.75, 0.62, 0.3]);
      break; // a watch chain
    case 'apron':
      for (const s of [1, -1])
        partR(
          T,
          s * 0.075 * w,
          Y(0.36),
          Z(0.36, 0.004),
          -0.1,
          0,
          s * 0.35,
          0.026,
          0.3 * TSY,
          0.01,
          'box',
          mul3(acc, 0.85),
        ); // the strap over the neck
      part(T, 0, Y(-0.26), Z(-0.26, 0.014), 0.17 * w, 0.09, 0.01, 'box', mul3(acc, 0.82)); // a pocket, pens in it
      for (let k = 0; k < 2; k++)
        part(
          T,
          0.02 + k * 0.02,
          Y(-0.18),
          Z(-0.26, 0.016),
          0.008,
          0.06,
          0.008,
          'box',
          k ? [0.7, 0.1, 0.08] : [0.1, 0.1, 0.12],
        );
      part(T, 0.11 * w, Y(0.14), Z(0.14, 0.02), 0.06, 0.03, 0.006, 'box', [0.82, 0.8, 0.72]); // a name badge
      break;
    case 'coat':
      BTN([0.15, 0.12, 0.1], [-0.12, 0.08, 0.26], 0.05 * w, 0.02);
      part(T, -0.09 * w, Y(0.05), Z(0.05, -0.002), 0.07, 0.08, 0.008, 'box', mul3(top, 1.2)); // a patch
      break;
  }
  if (L.belt) {
    part(T, 0, Y(-0.44), -0.006, 0.36 * w, 0.045, 0.27, 'rbox', [0.1, 0.085, 0.07]);
    part(T, 0, Y(-0.44), Z(-0.44, 0.012), 0.05, 0.04, 0.012, 'box', [0.62, 0.55, 0.38]);
  }
  if (L.lanyard) {
    for (const s of [1, -1])
      partR(T, s * 0.04, Y(0.3), Z(0.3, 0.004), 0, 0, -s * 0.22, 0.01, 0.3 * TSY, 0.006, 'box', [0.16, 0.24, 0.5]);
    part(T, 0, Y(0.1), Z(0.1, 0.012), 0.055, 0.075, 0.006, 'box', [0.85, 0.84, 0.8]);
    part(T, 0, Y(0.12), Z(0.1, 0.016), 0.03, 0.03, 0.003, 'box', [0.4, 0.38, 0.36]);
  }
  if (L.necklace) {
    const pearl = L.necklace === 'pearl';
    for (let k = 0; k <= 8; k++) {
      const a = -1.2 + k * 0.3,
        x = Math.sin(a) * 0.07,
        z = Math.cos(a) * 0.066 + 0.03,
        y = 0.58 * h - 0.035 * Math.cos(a);
      part(
        T,
        x,
        y,
        z,
        pearl ? 0.016 : 0.008,
        pearl ? 0.016 : 0.008,
        pearl ? 0.016 : 0.008,
        'sph',
        pearl ? [0.86, 0.84, 0.78] : [0.78, 0.62, 0.28],
      );
    }
    if (!pearl) part(T, 0, 0.58 * h - 0.06, 0.1, 0.018, 0.024, 0.008, 'sph', [0.6, 0.12, 0.14]);
  }
  if (L.brooch) part(T, -0.1 * w, Y(0.3), Z(0.3, 0.004), 0.03, 0.03, 0.012, 'sph', [0.7, 0.55, 0.3]);
  if (L.badge) {
    part(T, 0.09 * w, Y(0.27), Z(0.27, 0.004), 0.034, 0.04, 0.008, 'box', [0.75, 0.76, 0.8]);
    part(T, -0.09 * w, Y(0.27), Z(0.27, 0.004), 0.06, 0.014, 0.006, 'box', [0.75, 0.76, 0.8]);
  }
  if (L.bag) {
    // a courier's bag: a strap across the chest, the bag riding on the hip
    partR(T, 0, Y(0.02), Z(0.02, 0.014), 0, 0, 0.68, 0.035, 0.98 * TSY, 0.012, 'box', [0.12, 0.13, 0.12]);
    partR(P, -0.2 * w, -0.06, 0.02, 0, 0, 0.12, 0.08, 0.22, 0.3, 'rbox', [0.2, 0.22, 0.18]);
    part(P, -0.235 * w, 0.01, 0.02, 0.03, 0.08, 0.26, 'rbox', [0.16, 0.17, 0.14]);
  }
}
function drawChar(c) {
  gl.uniform1f(U.uChar, 1);
  try {
    drawPerson(c);
  } finally {
    gl.uniform1f(U.uChar, 0);
  }
}
function drawPerson(c) {
  const tlc = c.tell;
  if (tlc && tlc.type === 'true') {
    const kk = clamp(tlc.t / TF_CHANGE, 0, 1);
    if (kk >= 0.5) {
      drawCreature(c, tlc.fac || G.faction, kk);
      if (kk >= 0.72) return;
    }
  }
  const J = c.J,
    L = c.look,
    h = L.h,
    w = L.w,
    fx = c.fx || {},
    t = c.animT || 0;
  drawHi = c.hover ? 0.45 : 0;
  gl.uniform1f(U.uEmitMul, 0);
  gl.uniform1f(U.uDyn, 1);
  gl.uniform1i(U.uCut, 0);
  const ck = fx.cloak || 0,
    CF = ck > 0 ? CREATURE[fx.cfac] || CREATURE.aliens : null,
    cl = (col) => (ck > 0 ? mix3(col, CF.body, ck) : col);
  const skin = pallor(fx.skin || L.skinC),
    skinD = mul3(skin, 0.78),
    top = cl(L.topC),
    bot = cl(L.botC),
    shoe = cl(L.shoeC),
    hair = ck > 0.5 ? mul3(CF.body, 0.7) : L.hairC,
    acc = cl(L.accC || L.topC);
  // the tenth part: nothing new on them, only what's there a shade off. A half-change with the skull out greys the whole head.
  const tr = fx.trace,
    tk = tr ? tr.k : 0,
    tkd = tk > 0.005 ? tr.kind : '',
    TC = TRACE_TINT[tkd];
  const hgk = fx.half && fx.half.fac === 'aliens' && fx.half.parts.includes('skull') ? 0.55 * fx.half.k : 0;
  let hskin = TC && TC.head ? mix3(skin, TC.col, TC.head * tk) : skin;
  if (hgk) hskin = mix3(hskin, CREATURE_LOOK.aliens.skin, hgk);
  const hskinD = mul3(hskin, 0.78),
    bskin = TC && TC.body ? mix3(skin, TC.col, TC.body * tk) : skin,
    bskinD = mul3(bskin, 0.78);
  const nk = tkd === 'neck' ? tk : 0,
    wan = tkd === 'pallor' ? tk : 0;
  const dress = ck < 0.5; // halfway through the change, the clothes stop mattering
  const shud = ck > 0 && ck < 1 ? Math.sin(t * 61) * 0.028 * ck : 0; // the body shudders as the skin gives
  let Rm = M4.trans(drawX(c) + shud, (c.y || 0) + J.rootY + (J.float || 0), drawZ(c) - shud * 0.6);
  Rm = M4.mul(Rm, M4.rotY(c.dir));
  if (fx.big) Rm = M4.mul(Rm, M4.scale(fx.big, fx.big, fx.big));
  if (J.pitch) Rm = M4.mul(Rm, M4.rotX(J.pitch));
  if (J.roll) Rm = M4.mul(Rm, M4.rotZ(J.roll));
  const br = 1 + Math.sin(t * 1.6) * 0.012;
  const P = M4.joint(Rm, 0, 0.88 * h, 0, 0, 0, 0);
  part(P, 0, 0.0, -0.01, 0.31 * w, 0.21, 0.22, 'rbox', bot);
  if (dress && L.outfit === 'apron') part(P, 0, -0.2, 0.1, 0.3 * w, 0.44, 0.012, 'box', mul3(acc, 0.92));
  if (dress && L.skirt) part(P, 0, 0.07, -0.01, 0.36 * w, 0.5 * h, 0.32, 'skirt', bot);
  const mk = markOf(c);
  const T = M4.joint(P, 0, 0.06, 0, J.torso, J.twist || 0, 0);
  const TY = 0.25 * h,
    TSX = 0.4 * w,
    TSY = 0.64 * h * br,
    TSZ = 0.42;
  const TP = (prim, col, e) => part(T, 0, TY, 0, TSX, TSY, TSZ, prim, col, e);
  TP('torso', top);
  switch (dress ? L.outfit : '') {
    case 'tie':
      TP('tVneck', WHITE_SHIRT);
      TP('tTie', acc);
      break;
    case 'jacket':
      TP('tVneck', mix3(WHITE_SHIRT, acc, 0.55));
      TP('tLapel', mul3(top, 0.72));
      break;
    case 'cardigan':
      TP('tPlacket', acc);
      break;
    case 'apron':
      TP('tApron', acc);
      break;
    case 'vest':
      TP('tVest', acc);
      break;
    case 'scarf':
      part(T, 0, 0.555 * h, 0.012, 0.21, 0.085, 0.2, 'rbox', acc);
      partR(T, 0.05, 0.43 * h, 0.13, 0.12, 0, 0.08, 0.055, 0.22 * h, 0.02, 'rbox', acc);
      break;
    case 'coat':
      part(P, 0, 0.08, -0.005, 0.44 * w, 0.68, 0.36, 'coat', top);
      TP('tCollar', mul3(top, 0.88));
      break;
  }
  partR(
    T,
    0,
    0.6 * h + 0.015 * nk,
    0.012 + 0.018 * nk,
    0.17 * nk,
    0,
    0,
    0.085,
    0.17 + 0.045 * nk,
    0.09,
    'limb2',
    hskinD,
  );
  if (dress) dressDetail(c, L, T, P, h, w, TY, TSX, TSY, TSZ, top, acc, skin);
  if (fx.half) halfBody(T, P, fx.half, h, w, t, TP, top);
  if (mk === 'lizards' && dress) {
    // THEIR badge: a gold disc on the chest, the scales pressed into it
    partR(T, 0.1 * w, 0.43 * h, 0.165, Math.PI / 2, 0, 0, 0.065, 0.012, 0.065, 'cyl', MARK_GOLD, MARK_GOLD_E);
    part(T, 0.1 * w, 0.43 * h, 0.172, 0.036, 0.006, 0.004, 'box', MARK_GOLD_D);
  }
  // the head, carried a little forward and down
  let Hd = M4.joint(
    T,
    0,
    0.645 * h + 0.03 * nk,
    0.02 + 0.036 * nk,
    J.hp + 0.07 + (ck > 0 && ck < 1 ? Math.sin(t * 37) * 0.12 * ck : 0),
    J.hy + (c.gaze || 0),
    J.hr,
  );
  const THM = tkd && traceHeadM(tkd, tk);
  if (THM) Hd = M4.mul(Hd, THM);
  const HP = (prim, col, e) => part(Hd, HEAD_C[0], HEAD_C[1], HEAD_C[2], HEAD_S[0], HEAD_S[1], HEAD_S[2], prim, col, e);
  if (fx.slime > 0.01) drawSpec = 2.6 * fx.slime;
  HP('head', hskin);
  drawSpec = 0;
  for (const s of [1, -1]) {
    partR(Hd, s * 0.094, 0.108, -0.008, 0, s * 0.25, 0, 0.022, 0.056, 0.042, 'sph', hskinD);
    partR(Hd, s * 0.1, 0.11, -0.002, 0, s * 0.25, 0, 0.012, 0.034, 0.024, 'sph', mul3(hskinD, 0.62)); // the hollow of it
    if (dress && L.earrings)
      part(
        Hd,
        s * 0.099,
        0.074,
        0.002,
        0.014,
        0.016,
        0.014,
        'sph',
        L.earrings === 'pearl' ? [0.86, 0.84, 0.78] : [0.78, 0.6, 0.22],
      );
  }
  if (mk === 'aliens' && ck < 0.5) {
    // THEIR feeler: out of the left ear, a thin stalk bending up, a green bead that never quite stops moving
    const sw = Math.sin(t * 2.3 + c.x) * 0.06;
    partR(Hd, 0.13, 0.15, -0.01, 0, 0, -0.55 + sw, 0.008, 0.11, 0.008, 'cyl', MARK_STALK);
    partR(Hd, 0.166, 0.231, -0.01, 0, 0, -0.2 + sw * 1.5, 0.006, 0.07, 0.006, 'cyl', MARK_STALK);
    part(Hd, 0.174, 0.268, -0.01, 0.022, 0.022, 0.022, 'sph', MARK_BEAD, MARK_BEAD);
  }
  if (mk === 'zombies')
    // THEIR flies: a few, round the head, never settling
    for (let i = 0; i < MARK.flies; i++) {
      const a = R.time * (2.1 + i * 0.43) + i * 2.3 + c.x,
        r = 0.2 + (i % 3) * 0.09;
      part(
        Rm,
        Math.sin(a) * r,
        1.68 * h + Math.sin(a * 1.7 + i) * 0.2,
        Math.cos(a * 1.3) * r,
        0.034,
        0.024,
        0.034,
        'sph',
        MARK_FLY,
      );
    }
  if (ck > 0.04) changeCracks(T, Hd, h, ck, t);
  const eg = fx.eye || (fx.glaze ? [0.5, 0.62, 0.6] : null),
    TE = tkd ? traceEye(tkd, tk, L.eyeC) : null;
  for (const s of [1, -1]) {
    if (eg) {
      drawSpec = 1.2;
      part(
        Hd,
        s * 0.03,
        0.121,
        0.086,
        (fx.slit ? 0.011 : 0.028) * (1 + ck * 0.5),
        (fx.slit ? 0.034 : 0.022) * (1 + ck * 0.6),
        0.016,
        'sph',
        eg,
        eg,
      );
      drawSpec = 0;
    } else {
      const ez = faceZ(s * 0.0295, 0.12);
      let wc = ck > 0 ? mix3(EYE_WHITE, [0.6, 0.18, 0.12], ck) : EYE_WHITE;
      if (TE && TE.white) wc = mix3(wc, TE.white, TE.wk);
      part(Hd, s * 0.0295, 0.1195, ez + 0.003, 0.029, 0.017, 0.018, 'sph', wc); // whites, not very
      drawSpec = 2.4;
      part(
        Hd,
        s * 0.0282,
        0.1195,
        ez + 0.0095,
        0.0155 * (TE ? TE.sx : 1),
        0.0155 * (TE ? TE.sy : 1),
        0.008,
        'sph',
        TE ? TE.col : L.eyeC,
        TE && TE.emit,
      );
      drawSpec = 0;
      partR(
        Hd,
        s * 0.0295,
        0.1275,
        faceZ(s * 0.0295, 0.128) + 0.003,
        -0.3,
        0,
        0,
        0.037,
        0.011,
        0.016,
        'sph',
        mul3(hskin, 0.88),
      ); // the lid, half down
      part(
        Hd,
        s * 0.0295,
        0.1085,
        faceZ(s * 0.0295, 0.108) + 0.0015,
        0.032,
        0.007,
        0.01,
        'sph',
        mul3(hskinD, 0.78 - 0.24 * wan),
      ); // and the bag under it
    }
    if (!(fx.half && fx.half.k > 0.4 && fx.half.parts.includes('skull')))
      partR(
        Hd,
        s * 0.034,
        0.1415,
        faceZ(s * 0.034, 0.141) + 0.002,
        0.15,
        0,
        -s * 0.16,
        0.042,
        0.0075,
        0.009,
        'box',
        L.browC || mul3(L.hairC, 0.72),
      );
  }
  if (!fx.gape && !fx.grin && !(fx.tongue > 0.01))
    part(
      Hd,
      0,
      0.0495,
      faceZ(0, 0.05) + 0.001,
      0.036,
      0.0042 * (1 + 0.5 * wan),
      0.006,
      'sph',
      mix3([0.2, 0.09, 0.09], [0.12, 0.075, 0.11], wan),
    );
  if (fx.gape)
    part(
      Hd,
      0,
      0.048 - fx.gape * 0.022,
      0.078,
      0.05 + fx.gape * 0.016,
      0.012 + fx.gape * 0.055,
      0.024,
      'sph',
      [0.03, 0.008, 0.008],
    );
  else if (fx.grin) {
    part(Hd, 0, 0.05, 0.08, 0.11, 0.013, 0.018, 'box', [0.05, 0.02, 0.02]);
    for (const s of [1, -1])
      partR(Hd, s * 0.056, 0.058, 0.074, 0, s * 0.4, s * 0.55, 0.035, 0.011, 0.016, 'box', [0.05, 0.02, 0.02]);
  }
  if (fx.slime > 0.01) {
    // it licked them: the face shines, and it drips
    drawSpec = 2.6 * fx.slime;
    for (let k = 0; k < 3; k++) {
      const dl = (t * 0.35 + k * 0.37) % 1;
      part(Hd, (k - 1) * 0.035, 0.0 - dl * 0.08, 0.075, 0.013, 0.026 + dl * 0.045, 0.013, 'sph', [0.55, 0.62, 0.42]);
    }
    drawSpec = 0;
  }
  if (c.lostDay && G && c.lostDay === dayNo())
    part(Hd, 0.006, 0.07, 0.093, 0.012, 0.04, 0.008, 'box', [0.45, 0.04, 0.04]);
  if (dress && L.glasses) {
    const gc = [0.09, 0.085, 0.08];
    for (const s of [1, -1]) {
      part(Hd, s * 0.031, 0.134, 0.1, 0.048, 0.007, 0.006, 'box', gc);
      part(Hd, s * 0.031, 0.107, 0.1, 0.048, 0.007, 0.006, 'box', gc);
      part(Hd, s * 0.056, 0.12, 0.1, 0.006, 0.033, 0.006, 'box', gc);
      part(Hd, s * 0.007, 0.12, 0.1, 0.006, 0.033, 0.006, 'box', gc);
      partR(Hd, s * 0.075, 0.13, 0.05, 0, 0, 0, 0.005, 0.005, 0.1, 'box', gc);
    }
    part(Hd, 0, 0.128, 0.101, 0.012, 0.006, 0.006, 'box', gc);
  }
  if (fx.tongue > 0.01)
    drawTongue(
      M4.joint(Hd, 0, 0.05, 0.075, 0.2 + (fx.tongueAim || 0), 0, 0),
      fx.tongue * (fx.tongueLen || 0.62),
      t,
      fx.tongueCurl != null ? fx.tongueCurl : 0.3,
      fx.tongueThick || 0.06,
    );
  // hair
  const hs = dress && !(fx.half && fx.half.k > 0.4 && fx.half.parts.includes('skull')) ? L.hair : 'bald';
  switch (hs) {
    case 'short':
      HP('hShort', hair);
      break;
    case 'side':
      HP('hSide', hair);
      break;
    case 'messy':
      if (dress && L.hat)
        part(
          Hd,
          HEAD_C[0],
          HEAD_C[1] - 0.004,
          HEAD_C[2],
          HEAD_S[0] * 0.955,
          HEAD_S[1] * 0.96,
          HEAD_S[2] * 0.955,
          'hMessy',
          hair,
        );
      else HP('hMessy', hair);
      break; // squashed under a hat, so it doesn't come through it
    case 'bun':
      HP('hBun', hair);
      part(Hd, 0, 0.2, -0.1, 0.095, 0.095, 0.095, 'sph', mul3(hair, 0.9));
      break;
    case 'long':
      HP('hLong', hair);
      HP('hCurtain', mul3(hair, 0.92));
      break;
    default:
      HP('hRing', hair);
  }
  if (dress && L.beard) HP('hBeard', hair);
  if (dress && L.hat === 'beanie') HP('hBeanie', L.hatC);
  if (fx.foil) {
    part(Hd, 0, 0.245, 0, 0.23, 0.05, 0.24, 'cyl', [0.75, 0.76, 0.78]);
    part(Hd, 0, 0.33, 0, 0.15, 0.15, 0.15, 'sph', [0.72, 0.73, 0.75]);
  }
  if (fx.half) halfHead(Hd, T, fx.half, hskin, h, t);
  // legs (dark stockings under a skirt)
  const legC = dress && L.skirt ? mix3(bot, [0.05, 0.045, 0.045], 0.55) : bot;
  for (const s of [1, -1]) {
    const th = s > 0 ? J.thL : J.thR,
      sh = s > 0 ? J.shL : J.shR;
    const Th = M4.joint(P, s * 0.083 * w, -0.03, 0, th, 0, 0);
    part(Th, 0, -0.21 * h, 0, 0.125, 0.5 * h, 0.135, 'limb2', legC);
    const Sh = M4.joint(Th, 0, -0.44 * h, 0, sh, 0, 0);
    part(Sh, 0, -0.2 * h, -0.006, 0.095, 0.47 * h, 0.105, 'limb2', legC);
    part(Sh, 0, -0.41 * h + 0.035, 0.05, 0.098, 0.085, 0.26, 'shoe', shoe);
  }
  // arms
  for (const s of [1, -1]) {
    const ua = s > 0 ? J.uaL : J.uaR,
      fa = s > 0 ? J.faL : J.faR,
      ao = s > 0 ? J.aoL : J.aoR;
    let Ua;
    if (s > 0 && fx.armOff) {
      const fw = [Math.sin(c.dir), Math.cos(c.dir)];
      Ua = M4.mul(
        M4.trans(c.x + fw[0] * 0.55 + fw[1] * 0.2, 0.07, c.z + fw[1] * 0.55 - fw[0] * 0.2),
        M4.mul(M4.rotY(c.dir + 1.1), M4.rotX(Math.PI / 2)),
      );
    } else Ua = M4.joint(T, s * (0.16 * w + 0.045), 0.475 * h, 0.012, ua, 0, s * ao);
    part(Ua, 0, -0.15 * h, 0, 0.1, 0.37 * h, 0.105, 'limb2', top);
    const Fa = M4.joint(Ua, 0, -0.32 * h, 0, fa, 0, 0);
    const hf = fx.half,
      hArm =
        hf && hf.k > 0.2 && s === hf.side
          ? hf.parts.includes('hand') && hf.fac !== 'zombies'
            ? 'hand'
            : hf.parts.includes('arm')
              ? 'arm'
              : null
          : null;
    if (hArm === 'arm') {
      halfArm(Fa, hf, h, t, L.sleeves ? top : bskin, s);
      continue;
    }
    part(Fa, 0, -0.14 * h, 0, 0.08, 0.34 * h, 0.086, 'limb2', L.sleeves ? top : bskin);
    if (L.sleeves) {
      part(Fa, 0, -0.29 * h, 0, 0.05, 0.06, 0.055, 'limb2', bskinD);
      if (dress) part(Fa, 0, -0.272 * h, 0, 0.088, 0.035, 0.094, 'limb2', mul3(top, 0.82));
    }
    if (dress && L.watch && s > 0) {
      part(Fa, 0, -0.262 * h, 0, 0.066, 0.022, 0.07, 'cyl', [0.12, 0.1, 0.09]);
      part(Fa, s * 0.035, -0.262 * h, 0, 0.012, 0.026, 0.026, 'sph', [0.8, 0.66, 0.32]);
    }
    if (hArm === 'hand') {
      halfHand(Fa, hf, h, t, bskin, s);
      continue;
    }
    const grip = (s < 0 && fx.prop) || (fx.prop === 'camera' && c.anim === 'photo'),
      fl = tkd === 'fingers' ? tk : 0; // the camera takes both hands
    part(
      Fa,
      0,
      -0.29 * h - 0.005 - 0.013 * fl,
      0,
      s * 0.085 * (1 - 0.08 * fl),
      0.2 * (1 + 0.14 * fl),
      0.09 * (1 - 0.06 * fl),
      grip ? 'handG' : 'hand',
      bskin,
    );
    if (grip && s < 0) {
      const pp = fx.prop;
      if (pp === 'plate') part(Fa, 0, -0.33 * h, 0.08, 0.24, 0.025, 0.24, 'cyl', [0.85, 0.83, 0.78]);
      else if (pp === 'cup') part(Fa, 0, -0.33 * h, 0.05, 0.07, 0.1, 0.07, 'cyl', [0.8, 0.78, 0.7]);
      else if (pp === 'meat') part(Fa, 0, -0.33 * h, 0.06, 0.16, 0.06, 0.12, 'rbox', [0.55, 0.12, 0.12]);
      else if (pp === 'phone') part(Fa, 0, -0.33 * h, 0.02, 0.05, 0.16, 0.04, 'box', [0.6, 0.48, 0.3]);
      else if (pp === 'camera') {
        // up at the eye the forearm has turned over, so the camera sits on the far side of the hand, lens out
        const ph = c.anim === 'photo',
          ex = ph ? 0.085 : 0,
          ez = ph ? -0.075 : 0.06,
          el = ph ? -0.12 : 0.1;
        part(Fa, ex, -0.33 * h, ez, 0.13, 0.08, 0.06, 'box', [0.12, 0.12, 0.13]);
        part(Fa, ex, -0.33 * h, el, 0.045, 0.045, 0.03, 'box', [0.05, 0.05, 0.06], [0.06, 0.07, 0.09]);
      } else if (pp === 'paper') part(Fa, 0, -0.33 * h, 0.08, 0.26, 0.01, 0.34, 'box', [0.8, 0.78, 0.7]);
      else if (pp === 'can') part(Fa, 0, -0.33 * h, 0.05, 0.06, 0.12, 0.06, 'cyl', [0.3, 0.6, 0.35]);
      else if (pp === 'torch') part(Fa, 0, -0.33 * h, 0.08, 0.05, 0.05, 0.2, 'box', [0.2, 0.2, 0.22], [0.9, 0.95, 1]);
      else if (pp === 'raygun') {
        part(Fa, 0, -0.33 * h, 0.07, 0.055, 0.075, 0.2, 'rbox', [0.3, 0.33, 0.35]);
        part(Fa, 0, -0.32 * h, 0.19, 0.035, 0.035, 0.035, 'sph', [0.5, 1, 0.7], [0.45, 1, 0.65]);
      } else if (pp === 'bat') {
        part(Fa, 0, -0.33 * h - 0.2, 0.03, 0.04, 0.42, 0.04, 'cyl', [0.42, 0.3, 0.18]);
        part(Fa, 0, -0.33 * h - 0.38, 0.03, 0.055, 0.12, 0.055, 'cyl', [0.38, 0.27, 0.16]);
      } else if (pp === 'cig')
        part(Fa, 0, -0.33 * h, 0.07, 0.016, 0.016, 0.1, 'box', [0.9, 0.88, 0.8], [0.9, 0.3, 0.08]);
      else if (pp === 'envelope') part(Fa, 0, -0.33 * h, 0.07, 0.05, 0.14, 0.21, 'box', [0.84, 0.78, 0.64]);
      else if (pp === 'rag') part(Fa, 0, -0.33 * h, 0.06, 0.11, 0.035, 0.13, 'rbox', [0.66, 0.63, 0.56]);
      else if (pp === 'cash') {
        part(Fa, 0, -0.33 * h, 0.06, 0.07, 0.07, 0.15, 'cyl', [0.42, 0.5, 0.34]);
        part(Fa, 0, -0.33 * h, 0.06, 0.075, 0.02, 0.155, 'cyl', [0.8, 0.62, 0.22]);
      }
    }
  }
}
