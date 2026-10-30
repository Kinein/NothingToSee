//@ combat/blood — Blood: sprayed by blows, onto floors and walls, kept all game; THEIR colours
//@ Defines: BLOOD_KINDS, BLOOD_COL, BLOOD_FACE, bloodOf, bleed, bleedAt, bloodPool, bloodStain, bloodDrop, bloodTick, BLOOD_FX, BLOOD_PEND, BL_M, BL_COL, bloodFx, bloodCol, …
//@ Uses:    core/util, gfx/renderer, sim/core, gfx/gl, data/tuning, world/grid, gfx/post, horror/layer, world/vision, input/walking, …
//@ (header made by tools/map.js; stripped by build.py)
// ───────────── blood. Only violence spills it, and what's spilled stays for the rest of the game (G.blood). A blow throws
// drops away from whoever struck it: they fly, land on the floor as splats, and hit walls and run down them. THEIR blood
// isn't red: the aliens' is blue, the lizards' green, and the dead's a red gone dark. No card ever comes of it; it's there
// for your gut. The game decides at the moment of the blow where every drop will land (sim randomness, so a saved game
// keeps it); the flight you see is drawing only.
// G.blood entries: [x, z, y, kind, size, rot, seed, shape, face]. kind: index into BLOOD_KINDS · shape: 4 splat, 5 smear,
// 6 runs down a wall · face: 0 the floor, else the wall's outward side, 1 +x, 2 −x, 3 +z, 4 −z.
const BLOOD_KINDS = ['human', 'dead', 'lizards', 'aliens'];
const BLOOD_COL = [
  [0.15, 0.009, 0.009],
  [0.065, 0.012, 0.008],
  [0.045, 0.11, 0.016],
  [0.02, 0.048, 0.17],
];
const BLOOD_FACE = [null, [1, 0], [-1, 0], [0, 1], [0, -1]];
// what runs in someone's veins
function bloodOf(c) {
  if (!c || c.isPlayer || !c.isThem) return 0;
  return G.faction === 'zombies' ? 1 : G.faction === 'lizards' ? 2 : 3;
}
// a blow lands on v (from whoever, or whatever, struck it): k is how hard, 1 an ordinary blow
function bleed(v, from, k = 1) {
  if (!v || !v.onMap) return;
  const dx = from ? v.x - from.x : rand(-1, 1),
    dz = from ? v.z - from.z : rand(-1, 1);
  bleedAt(v.x, v.z, dx, dz, bloodOf(v), k);
  if (v.isPlayer || from === PLAYER) {
    R.hitStop = Math.max(R.hitStop || 0, BLOOD.hitStop * Math.min(1.5, k)); // the blow lands: a beat where it all stops
    HX.shake = Math.max(HX.shake, BLOOD.shake * k * (v.isPlayer ? 1.6 : 1));
  }
}
// the spray itself, at (x, z), thrown along (dx, dz)
function bleedAt(x, z, dx, dz, kind, k = 1) {
  if (!G.blood) G.blood = [];
  const l = Math.hypot(dx, dz) || 1,
    a0 = Math.atan2(dx / l, dz / l),
    n = Math.round(BLOOD.drops * k * rand(0.7, 1.3));
  for (let i = 0; i < n; i++) {
    const a = a0 + rand(-BLOOD.spread, BLOOD.spread),
      sp = rand(BLOOD.speed[0], BLOOD.speed[1]) * Math.sqrt(k),
      y = rand(0.95, 1.35);
    bloodDrop(
      x + Math.sin(a) * 0.15,
      y,
      z + Math.cos(a) * 0.15,
      Math.sin(a) * sp,
      rand(0.3, 2.4),
      Math.cos(a) * sp,
      kind,
    );
  }
  // and some straight down, where it happened
  bloodStain(x + rand(-0.2, 0.2), z + rand(-0.2, 0.2), 0, kind, rand(0.14, 0.24) * Math.min(1.6, k), 4, 0);
}
// a pool where someone went down and stayed down, and the smear where they were dragged
function bloodPool(x, z, kind, k = 1) {
  bloodStain(x, z, 0, kind, rand(0.45, 0.65) * k, 4, 0);
  if (chance(0.6)) bloodStain(x + rand(-0.4, 0.4), z + rand(-0.4, 0.4), 0, kind, rand(0.7, 1.1) * k, 5, 0);
  for (let i = 0; i < 3; i++) bleedAt(x, z, rand(-1, 1), rand(-1, 1), kind, 0.8);
}
function bloodStain(x, z, y, kind, size, shape, face) {
  const r2 = (v) => Math.round(v * 100) / 100;
  const s = [r2(x), r2(z), r2(y), kind, r2(size), r2(rand(0, TAU)), irand(1, 99), shape, face];
  G.blood.push(s);
  if (G.blood.length > BLOOD.max) G.blood.splice(0, G.blood.length - BLOOD.max); // the oldest wears off first
  return s;
}
// one drop: where it ends up is worked out now, along its arc; it's drawn flying there (bloodFx)
function bloodDrop(x0, y0, z0, vx, vy, vz, kind) {
  const size = rand(0.07, 0.17);
  let px = x0,
    pz = z0,
    s = null,
    t = 0;
  for (; t < 2; t += 0.02) {
    const x = x0 + vx * t,
      y = y0 + vy * t - 4.9 * t * t,
      z = z0 + vz * t;
    if (y <= 0) {
      s = bloodStain(x, z, 0, kind, size, 4, 0);
      break;
    }
    const tx = Math.floor(x),
      tz = Math.floor(z);
    if (!inb(tx, tz)) break;
    const c = tiles[I(tx, tz)];
    let hit = null;
    for (const b of solidCells()[I(tx, tz)])
      if (x >= b[0] && x <= b[2] && z >= b[1] && z <= b[3]) {
        hit = b;
        break;
      }
    if (hit) {
      // a wall: it hits flat and runs; anything else (a door, furniture) just takes it
      if (WALLISH.has(c) && c !== 'D' && c !== 'L' && !hit.over && y > 0.05 && y < 2.2) {
        const onX = px < hit[0] || px > hit[2],
          face = onX ? (px < hit[0] ? 2 : 1) : pz < hit[1] ? 4 : 3,
          wx = onX ? (px < hit[0] ? hit[0] : hit[2]) : x,
          wz = onX ? z : pz < hit[1] ? hit[1] : hit[3];
        s = bloodStain(wx, wz, y, kind, size * 2.2, y > 0.35 && chance(0.6) ? 6 : 4, face);
      } else s = bloodStain(px, pz, 0, kind, size * 1.3, 4, 0); // it runs down the front of it, onto the floor
      break;
    }
    px = x;
    pz = z;
  }
  if (BLOOD_FX.length < 140) {
    BLOOD_FX.push({ x0, y0, z0, vx, vy, vz, t: 0, T: t, kind, s });
    if (s) BLOOD_PEND.add(s);
  }
}
// hurt and moving: a drop now and then where you walk (G.health under BLOOD.trailAt). Once a game minute (them/moves).
function bloodTick() {
  const P = PLAYER;
  if (!G.blood || !P.onMap || G.away || G.health >= BLOOD.trailAt || !P.moving) return;
  if (chance(1 - G.health / BLOOD.trailAt))
    bloodStain(P.x + rand(-0.1, 0.1), P.z + rand(-0.1, 0.1), 0, 0, rand(0.05, 0.1), 4, 0);
}

// ── drawing: drops in the air, then everything that has landed. Nothing here touches the game.
const BLOOD_FX = [];
const BLOOD_PEND = new Set(); // landed in the game, still in the air on screen
const BL_M = new Float32Array(16),
  BL_COL = new Float32Array(4);
function bloodFx(dt) {
  for (let i = BLOOD_FX.length - 1; i >= 0; i--) {
    const d = BLOOD_FX[i];
    d.t += dt;
    if (d.t >= d.T) {
      if (d.s) BLOOD_PEND.delete(d.s);
      BLOOD_FX.splice(i, 1);
    }
  }
}
function bloodCol(kind, a) {
  const c = BLOOD_COL[kind] || BLOOD_COL[0];
  BL_COL[0] = c[0];
  BL_COL[1] = c[1];
  BL_COL[2] = c[2];
  BL_COL[3] = a;
  return BL_COL;
}
// where the cut-away walls stand right now, as the main shader works it out (gfx/shaders cutAt): a stain higher up a
// wall than the wall now reaches isn't drawn
function bloodCutAt(x, y, z, fx, fy, fz, rad) {
  const V = cam.view;
  const az = V[2] * x + V[6] * y + V[10] * z + V[14],
    fz2 = V[2] * fx + V[6] * fy + V[10] * fz + V[14];
  const d = Math.hypot(
    V[0] * (x - fx) + V[4] * (y - fy) + V[8] * (z - fz),
    V[1] * (x - fx) + V[5] * (y - fy) + V[9] * (z - fz),
  );
  return sstep(-0.15, 0.55, az - fz2) * (1 - sstep(rad * 0.6, rad, d));
}
function bloodWallTop(x, z) {
  const P = PLAYER,
    on = G.started && P && P.onMap,
    px = on ? P.x : cam.tx,
    pz = on ? P.z : cam.tz,
    f1x = cam.follow ? px : cam.tx,
    f1z = cam.follow ? pz : cam.tz;
  const k = Math.max(
    bloodCutAt(x, 1, z, f1x, 1, f1z, 7.5 * Math.max(0.8, cam.zoom / 8.5)),
    bloodCutAt(x, 1, z, px, 1, pz, 3.2),
    cam.wallsDown,
  );
  return lerp(2.8, 0.42, sstep(0.3, 0.75, k));
}
function bloodDraw() {
  if (!G || !G.blood || !cam.view) return;
  const U = R.decal.U;
  for (let i = 0; i < G.blood.length; i++) {
    const s = G.blood[i];
    if (BLOOD_PEND.has(s)) continue;
    const [x, z, y, kind, size, rot, seed, shape, face] = s;
    if (!face) {
      if (visAt(x, z) < 0.03) continue;
      drawDecalR(
        x,
        z,
        size,
        size * (shape === 5 ? 0.45 : 1),
        rot,
        bloodCol(kind, 0.86),
        shape,
        seed,
        0.0104 + (i % 40) * 0.00002,
      );
      continue;
    }
    const n = BLOOD_FACE[face];
    if (visAt(x + n[0] * 0.6, z + n[1] * 0.6) < 0.03 || y + size * 0.3 > bloodWallTop(x, z)) continue;
    // flat on the wall: the quad's x along the wall, its z straight down
    BL_M.fill(0);
    BL_M[0] = -n[1] * size;
    BL_M[2] = n[0] * size;
    BL_M[4] = n[0];
    BL_M[6] = n[1];
    BL_M[9] = -size * (shape === 6 ? 1.6 : 1);
    BL_M[12] = x + n[0] * 0.012;
    BL_M[13] = y;
    BL_M[14] = z + n[1] * 0.012;
    BL_M[15] = 1;
    gl.uniform2f(U.uVisOff, n[0] * 0.6, n[1] * 0.6);
    gl.uniformMatrix4fv(U.uModel, false, BL_M);
    gl.uniform4fv(U.uColor, bloodCol(kind, 0.9));
    gl.uniform1i(U.uShape, shape);
    gl.uniform1f(U.uSeed, seed);
    gl.bindVertexArray(PRIM.quad.vao);
    gl.drawElements(gl.TRIANGLES, PRIM.quad.count, gl.UNSIGNED_INT, 0);
  }
  gl.uniform2f(U.uVisOff, 0, 0);
  // in the air: small round drops, facing you
  const rt = cam.right,
    up = cam.up;
  for (const d of BLOOD_FX) {
    const t = d.t,
      x = d.x0 + d.vx * t,
      y = d.y0 + d.vy * t - 4.9 * t * t,
      z = d.z0 + d.vz * t,
      sz = 0.035;
    BL_M.fill(0);
    BL_M[0] = rt[0] * sz;
    BL_M[1] = rt[1] * sz;
    BL_M[2] = rt[2] * sz;
    BL_M[8] = up[0] * sz;
    BL_M[9] = up[1] * sz;
    BL_M[10] = up[2] * sz;
    BL_M[12] = x;
    BL_M[13] = Math.max(0.02, y);
    BL_M[14] = z;
    BL_M[15] = 1;
    gl.uniformMatrix4fv(U.uModel, false, BL_M);
    gl.uniform4fv(U.uColor, bloodCol(d.kind, 0.95));
    gl.uniform1i(U.uShape, 7);
    gl.bindVertexArray(PRIM.quad.vao);
    gl.drawElements(gl.TRIANGLES, PRIM.quad.count, gl.UNSIGNED_INT, 0);
  }
}
