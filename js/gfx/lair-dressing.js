//@ gfx/lair-dressing — Lair lights: halos, shafts, wall pieces
//@ Defines: LAIR_GRP, lairRenderInit, buildLairDecor, lairDoorGeo, lairDoorMatrix, lairWaterFloor, buildObject
//@ Uses:    core/util, gfx/world-geometry, gfx/lair-models, world/grid, gfx/gl, gfx/renderer, world/light-map, gfx/wall-dressing, gfx/post, gfx/draw-helpers, …
//@ (header made by tools/map.js; stripped by build.py)
// ───────────── THEIR places, drawn: halos and shafts for their lights, what hangs on their walls
const LAIR_GRP = (k) => 'lair:' + k;
function lairRenderInit() {
  for (const lp of LAIR_LAMPS) {
    const grp = LAIR_GRP(lp.k), col = lp.l.col, y = lp.y || 2;
    if (lp.glow) R.glows.push({ p: [lp.x, y, lp.z], col: nrm3(col), size: lp.size || 0.6, grp, light: lp.l, spec: lp.spec || 0.8 });
    if (lp.cone) R.cones.push({ p: [lp.x, y, lp.z], r: lp.cone.r, h: lp.cone.h, col: nrm3(col), a: lp.cone.a, grp, light: lp.l });
  }
  R.lairDecor = buildLairDecor();
  for (const m of R.objMeshes) if (m.obj && m.obj.t.lair) { m.lair = lairAt(m.obj.cx, m.obj.cz); if (m.obj.type === 'lx_gold') m.spec = 1.7; else if (m.obj.type === 'lx_nest' || m.obj.type === 'lx_junk') m.spec = 0.5; else m.spec = 0.35; }
}
// strips of light along the craft's walls, lanterns and outfalls in the drains, roots and glowing growths in the nest
function buildLairDecor() {
  const out = [];
  for (const k of Object.keys(LAIRS)) {
    const L = LAIRS[k], g = new Geo(), lit = new Geo(); g.ao = 0.75; g.aoH = 1.6;
    const M = (rx, rz, side, along, fn, o) => mount(g, rx, rz, side, along, fn, o);
    const floorAt = (x, z) => { const c = tget(x, z); return c === LAIR_MAPS[k].floor; };
    const walls = [];   // every floor tile with a wall beside it, and which side
    for (let z = L.z0; z <= L.z1; z++) for (let x = L.x0; x <= L.x1; x++) {
      if (!floorAt(x, z)) continue;
      for (const [s, dx, dz] of [['N', 0, -1], ['S', 0, 1], ['W', -1, 0], ['E', 1, 0]]) if (tget(x + dx, z + dz) === '#') walls.push([x, z, s]);
    }
    if (k === 'ship') {
      for (const [x, z, s] of walls) {
        M(x, z, s, 0, (g) => {
          g.bx(0, 0.18, 0.012, 1.0, 0.05, 0.02, C(0x46e6c4), EMIT(0.75));
          g.bx(0, 2.42, 0.02, 1.0, 0.07, 0.04, LXC.hullK);
          if (hash2(x, z, 3) > 0.72) { g.bx(0, 1.15, 0.02, 0.32, 0.5, 0.04, LXC.hullD); g.bx(0, 1.2, 0.045, 0.22, 0.32, 0.01, C(0x1d5b4c), XM('screen', 0.9)); }
          else if (hash2(x, z, 5) > 0.75) { g.cyl(-0.3, 0.3, 0.1, 0.06, 0.06, 2.0, 8, LXC.hullD); g.cyl(0.3, 0.3, 0.1, 0.045, 0.045, 2.0, 8, mul3(LXC.hullD, 0.8)); }
        });
      }
      // the plan room's wall: a great screen with the town on it
      const [px, pz] = LZ('ship', 9, 1);
      M(px, pz, 'N', 0.5, (g) => { g.bx(0, 0.9, 0.03, 5.2, 1.4, 0.06, LXC.hullK); g.bx(0, 0.98, 0.065, 5.0, 1.24, 0.01, C(0x103a32), XM('screen', 0.75)); });
      // hazard bars in front of the pods
      for (const [x, z] of LAIRS.ship.at('p')) for (let i = 0; i < 4; i++) g.bx(x + 0.5 - 0.42 + i * 0.28, 0.004, z - 0.45, 0.14, 0.006, 0.12, i % 2 ? C(0x1a1a1a) : C(0xc8a030));
    } else if (k === 'sewer') {
      for (const [x, z, s] of walls) {
        const h = hash2(x, z, 11);
        if (h > 0.8) M(x, z, s, (hash2(x, z, 2) - 0.5) * 0.4, (g) => { g.cyl(0, 1.0, 0.18, 0.11, 0.11, 0.32, 10, LXC.rust); g.cyl(0, 0.98, 0.18, 0.08, 0.08, 0.02, 10, C(0x14140f)); });   // an outfall pipe
        else if (h > 0.66) M(x, z, s, 0, (g) => { for (let i = 0; i < 4; i++) g.bx(-0.3 + i * 0.2, 2.1 - i * 0.07, 0.03, 0.03, 0.5 + i * 0.12, 0.03, mul3(LXC.slime, 0.8), XM('slime')); });   // slime run down from a crack
        else if (h > 0.6) M(x, z, s, 0, (g) => { g.bx(0, 2.0, 0.025, 0.06, 0.06, 0.05, LXC.iron); for (let i = 0; i < 6; i++) g.bx(0, 1.94 - i * 0.12, 0.04, 0.04, 0.1, 0.02, LXC.iron); });   // a chain
      }
      // a lantern on the wall by every lamp
      for (const lp of LAIR_LAMPS) {
        if (lp.k !== 'sewer' || !lp.glow) continue;
        const x = Math.floor(lp.x), z = Math.floor(lp.z);
        const side = ['N', 'S', 'W', 'E'].find((s) => { const [dx, dz] = SIDE[s]; return tget(x + dx, z + dz) === '#'; });
        if (!side || lp.y < 1.5) continue;
        mount(lit, x, z, side, 0, (lg) => { lg.bx(0, 1.62, 0.12, 0.18, 0.04, 0.18, LXC.iron); lg.bx(0, 1.66, 0.12, 0.12, 0.26, 0.12, C(0xffc070), EMIT(1)); lg.bx(0, 1.92, 0.12, 0.2, 0.04, 0.2, LXC.iron); lg.bx(0, 1.7, 0.03, 0.04, 0.04, 0.12, LXC.iron); }, { any: true });
      }
    } else {
      for (const [x, z, s] of walls) {
        const h = hash2(x, z, 13);
        if (h > 0.55) M(x, z, s, (hash2(x, z, 4) - 0.5) * 0.6, (g) => { for (let i = 0; i < 3; i++) { const yy = 1.4 + hash2(x + i, z, 6) * 1.0; g.bx(-0.25 + i * 0.25, yy, 0.05 + i * 0.02, 0.03 + hash2(x, z + i, 8) * 0.03, 2.7 - yy, 0.03, LXC.twig); } });   // roots
        if (h < 0.18) M(x, z, s, 0, (g) => { g.sphere(0, 1.2 + h * 3, 0.05, 0.3, 0.22, 0.12, 8, 5, LXC.slime, XM('slime')); });   // a sac on the wall
        else if (h < 0.3) M(x, z, s, 0, (g) => { g.bx(0, 0.9 + h, 0.05, 0.28, 0.03, 0.03, LXC.bone); g.sphere(0.14, 0.9 + h, 0.05, 0.035, 0.035, 0.035, 5, 3, LXC.bone); });   // a bone in the mud
      }
      for (const lp of LAIR_LAMPS) if (lp.k === 'den' && lp.fungus) {
        const x = lp.x, z = lp.z;
        for (let i = 0; i < 7; i++) { const a = hash2(i, x, 3) * TAU, d = 0.12 + hash2(i, z, 5) * 0.32; lit.sphere(x + Math.sin(a) * d, 0.04, z + Math.cos(a) * d, 0.06 + hash2(i, 9, x) * 0.05, 0.05 + hash2(i, 2, z) * 0.12, 0.06, 6, 4, C(0x5affc8), EMIT(0.9)); }
      }
    }
    const m = makeMesh(g, { cut: 1 }); m.lairKey = k; out.push(m);
    if (lit.i.length) { const ml = makeMesh(lit, { cut: 1 }); ml.lairKey = k; ml.litGrp = LAIR_GRP(k); out.push(ml); }
  }
  return out;
}
// the craft's doors slide into the wall instead of swinging
function lairDoorGeo(d, g) {
  const e = [0, 0, d.x + 1000.5, d.z + 0.5];
  g.box(0.02, 0, -0.045, 0.94, 2.2, 0.045, LXC.hull, e);
  g.box(0.02, 1.02, -0.05, 0.94, 1.08, 0.05, C(0x46e6c4), [0.9, 0, d.x + 1000.5, d.z + 0.5]);
  g.box(0.86, 0.1, -0.05, 0.94, 2.1, 0.05, LXC.hullK, e);
}
function lairDoorMatrix(d) {
  const sl = d.open * 0.9;
  if (d.horiz && d.mirror) return M4.mul(M4.trans(d.x + 0.98 + sl, 0, d.z + 0.5), M4.rotY(Math.PI));
  if (d.horiz) return M4.trans(d.x + 0.02 - sl, 0, d.z + 0.5);
  return M4.mul(M4.trans(d.x + 0.5, 0, d.z + 0.02 - sl), M4.rotY(-Math.PI / 2));
}
// the drains' channel: the water a hand below the walkway, brick going down into it, a stone lip along the edge
function lairWaterFloor(g, x, z) {
  const y = -0.3, col = floorColor('q', x, z, 0, 0), e = XM('water'), side = C(0x3a3428), es = XM('sewer'), lip = C(0x6e6656);
  g.quad([x, y, z], [x, y, z + 1], [x + 1, y, z + 1], [x + 1, y, z], [0, 1, 0], col, e);
  const dry = (a, b) => { const c = tget(a, b); return c !== 'q' && c !== '#' && c !== 'X'; };
  if (tget(x, z - 1) !== 'q') g.quad([x, y, z], [x + 1, y, z], [x + 1, 0, z], [x, 0, z], [0, 0, 1], side, es);
  if (tget(x, z + 1) !== 'q') g.quad([x, y, z + 1], [x + 1, y, z + 1], [x + 1, 0, z + 1], [x, 0, z + 1], [0, 0, -1], side, es);
  if (tget(x - 1, z) !== 'q') g.quad([x, y, z], [x, y, z + 1], [x, 0, z + 1], [x, 0, z], [1, 0, 0], side, es);
  if (tget(x + 1, z) !== 'q') g.quad([x + 1, y, z], [x + 1, y, z + 1], [x + 1, 0, z + 1], [x + 1, 0, z], [-1, 0, 0], side, es);
  if (dry(x, z - 1)) g.box(x, -0.02, z - 0.13, x + 1, 0.03, z, lip);
  if (dry(x, z + 1)) g.box(x, -0.02, z + 1, x + 1, 0.03, z + 1.13, lip);
  if (dry(x - 1, z)) g.box(x - 0.13, -0.02, z, x, 0.03, z + 1, lip);
  if (dry(x + 1, z)) g.box(x + 1, -0.02, z, x + 1.13, 0.03, z + 1, lip);
}

function buildObject(o) {
  const g = new Geo(); g.ao = o.t.flat ? 0 : 0.6; g.aoH = 0.85;
  const fn = MODELS[o.type];
  if (!fn) return null;
  fn(g, o);
  const m = makeMesh(g);
  const tk = tuckOf(o), tf = DIRS[o.face];
  m.model = M4.mul(M4.trans(o.cx + tf[0] * tk, 0, o.cz + tf[1] * tk), M4.rotY(FACE_ANG[o.face]));
  m.center = [o.cx + tf[0] * tk, 1.0, o.cz + tf[1] * tk];
  if (o.t.thin || o.type === 'tree') m.cut = 2;
  else if (o.t.tall) m.cut = 1;
  m.obj = o;
  o.mesh = m;
  return m;
}

