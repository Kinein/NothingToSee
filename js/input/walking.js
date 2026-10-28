//@ input/walking — WASD walking relative to the camera
//@ Defines: moveInput, SOLID_INSET, SLIM, FIT_BOX, fittedBox, SLIM_AT, slimAt, VAULT, VAULT_AT, vaultAt, SOLID, solidCells, bodyPush, settle, tryMove, steerAssist, …
//@ Uses:    world/grid, gfx/world-geometry, sim/core, data/tuning, input/camera, world/objects, gfx/renderer, ui/interface, sim/actions, town/arrest, …
//@ (header made by tools/map.js; stripped by build.py)
// ───────────── walking: WASD relative to the camera. W is into the scene, S toward you; A and D are screen left and right.
function moveInput() {
  if (!G || !G.started || G.over || UI.menuOpen || UI.caseOpen || UI.fight || UI.scene || UI.cf || ARREST.on)
    return null;
  let f = 0,
    r = 0;
  if (held('w') || held('ArrowUp')) f += 1;
  if (held('s') || held('ArrowDown')) f -= 1;
  if (held('d') || held('ArrowRight')) r += 1;
  if (held('a') || held('ArrowLeft')) r -= 1;
  if (!f && !r) return null;
  const fx = -Math.sin(cam.yaw),
    fz = -Math.cos(cam.yaw); // the camera sits behind (sin, cos): forward is the other way, along the ground
  let rx = cam.right[0],
    rz = cam.right[2];
  const rl = Math.hypot(rx, rz) || 1;
  rx /= rl;
  rz /= rl;
  const x = fx * f + rx * r,
    z = fz * f + rz * r,
    l = Math.hypot(x, z) || 1;
  return [x / l, z / l];
}
// the body against the room. You are a round body about as wide as your shoulders, and you bump into what is drawn:
// the thin slab of a wall, the two posts of a doorframe, a chair the size of a chair. Your feet still have to stand on
// open floor, so nothing the town's paths rely on changes. Corners are round: brush one and you slide off it.
const SOLID_INSET = {
  chair: 0.2,
  chair_office: 0.18,
  plant: 0.28,
  floorlamp: 0.36,
  nightstand: 0.14,
  trashcan: 0.24,
  bucket: 0.26,
  hydrant: 0.3,
  streetlamp: 0.4,
  parklamp: 0.4,
  alleylamp: 0.4,
  payphone: 0.3,
  tree: 0.3,
  radio: 0.25,
  birdcage: 0.25,
  watercooler: 0.2,
  coffee: 0.12,
  toilet: 0.14,
  sink: 0.14,
  drain: 0.4,
  radiator: 0.1,
  phone: 0.1,
  newsrack: 0.12,
  armchair: 0.06,
};
// slim things you can step right up to and round: a lamppost, a hydrant, a potted plant, a railing. Your feet may stand in
// their tile (everyone else's paths still go round it); only the thing itself is in your way.
const SLIM = new Set([
  'streetlamp',
  'parklamp',
  'alleylamp',
  'payphone',
  'hydrant',
  'floorlamp',
  'plant',
  'fence4',
  'fence3',
  'chair',
  'chair_office',
  'radiator',
]);
// the box of what is actually drawn (below head height), in the world: a chair is as big as its legs and back, a radiator as thin as its fins
const FIT_BOX = new Set(['chair', 'chair_office', 'radiator']);
function fittedBox(o) {
  const g = new Geo();
  MODELS[o.type](g, o);
  const m = M4.rotY(FACE_ANG[o.face]),
    tk = tuckOf(o),
    f = DIRS[o.face],
    ox = o.cx + f[0] * tk,
    oz = o.cz + f[1] * tk;
  let x0 = 1e9,
    z0 = 1e9,
    x1 = -1e9,
    z1 = -1e9;
  for (let k = 0; k < g.p.length; k += 3) {
    const x = g.p[k],
      y = g.p[k + 1],
      z = g.p[k + 2];
    if (y > 1.9) continue;
    const X = m[0] * x + m[8] * z,
      Z = m[2] * x + m[10] * z;
    if (X < x0) x0 = X;
    if (X > x1) x1 = X;
    if (Z < z0) z0 = Z;
    if (Z > z1) z1 = Z;
  }
  return [ox + x0, oz + z0, ox + x1, oz + z1];
}
let SLIM_AT = null;
function slimAt(i) {
  if (!SLIM_AT) {
    SLIM_AT = new Uint8Array(W * H);
    for (const o of OBJ)
      if (SLIM.has(o.type))
        for (let z = o.z; z < o.z + o.h; z++) for (let x = o.x; x < o.x + o.w; x++) SLIM_AT[I(x, z)] = 1;
  }
  return SLIM_AT[i];
}
// low things you go over at a run (Shift): a bench, a fence, a chair, a bin
const VAULT = new Set([
  'bench',
  'fence4',
  'fence3',
  'chair',
  'chair_office',
  'lx_chair',
  'trashcan',
  'trashbags',
  'boxes',
  'hydrant',
]);
let VAULT_AT = null;
function vaultAt(i) {
  if (!VAULT_AT) {
    VAULT_AT = new Int32Array(W * H).fill(-1);
    for (const o of OBJ)
      if (VAULT.has(o.type))
        for (let z = o.z; z < o.z + o.h; z++) for (let x = o.x; x < o.x + o.w; x++) VAULT_AT[I(x, z)] = o.idx;
  }
  return VAULT_AT[i] >= 0 ? OBJ[VAULT_AT[i]] : null;
}
let SOLID = null;
function solidCells() {
  if (SOLID) return SOLID;
  const cells = Array.from({ length: W * H }, () => []);
  const add = (x0, z0, x1, z1, o) => {
    const b = [x0, z0, x1, z1];
    if (o && VAULT.has(o.type)) b.over = o; // something you can go over
    for (let z = Math.max(0, Math.floor(z0 - 0.5)); z <= Math.min(H - 1, Math.floor(z1 + 0.5)); z++)
      for (let x = Math.max(0, Math.floor(x0 - 0.5)); x <= Math.min(W - 1, Math.floor(x1 + 0.5)); x++)
        cells[I(x, z)].push(b);
  };
  for (let z = 0; z < H; z++)
    for (let x = 0; x < W; x++) {
      const c = tiles[I(x, z)];
      if (!WALLISH.has(c)) continue;
      const cx = x + 0.5,
        cz = z + 0.5,
        cE = isWallish(x + 1, z),
        cW = isWallish(x - 1, z),
        cS = isWallish(x, z + 1),
        cN = isWallish(x, z - 1);
      if (c === '#') {
        // the same slabs buildWalls draws
        add(cx - WT, cz - WT, cx + WT, cz + WT);
        if (cE) add(cx, cz - WT, x + 1, cz + WT);
        if (cW) add(x, cz - WT, cx, cz + WT);
        if (cS) add(cx - WT, cz, cx + WT, z + 1);
        if (cN) add(cx - WT, z, cx + WT, cz);
        continue;
      }
      const horiz = cE || cW;
      if (c === 'W') {
        if (horiz) add(x, cz - WT, x + 1, cz + WT);
        else add(cx - WT, z, cx + WT, z + 1);
        continue;
      }
      // a doorway: only its posts stand in the way, and a pair of doors has no post between them
      const d = DOORS[doorAt[I(x, z)]],
        t = WT + 0.01;
      for (const [along, side] of [
        [0.03, -1],
        [0.97, 1],
      ]) {
        if (d && ((side < 0 && d.pairL) || (side > 0 && d.pairR))) continue;
        if (horiz) add(x + along - 0.04, cz - t, x + along + 0.04, cz + t);
        else add(cx - t, z + along - 0.04, cx + t, z + along + 0.04);
      }
    }
  for (const o of OBJ) {
    if (o.t.ghost || o.t.flat) continue;
    if (o.type === 'fence4' || o.type === 'fence3') {
      if (o.w >= o.h) add(o.x, o.z + 0.44, o.x + o.w, o.z + 0.56, o);
      else add(o.x + 0.44, o.z, o.x + 0.56, o.z + o.h, o);
      continue;
    }
    if (FIT_BOX.has(o.type)) {
      const b = fittedBox(o);
      add(b[0], b[1], b[2], b[3], o);
      continue;
    }
    const k = SOLID_INSET[o.type] != null ? SOLID_INSET[o.type] : 0.06;
    add(o.x + k, o.z + k, o.x + o.w - k, o.z + o.h - k, o);
  }
  return (SOLID = cells);
}
// how far a round body at (x, z) has to move to stop overlapping what it touches; null when it touches nothing
function bodyPush(x, z, r) {
  const fx = Math.floor(x),
    fz = Math.floor(z);
  if (!inb(fx, fz)) return null;
  let px = 0,
    pz = 0,
    hit = false,
    deep = 0;
  for (const b of solidCells()[I(fx, fz)]) {
    const [x0, z0, x1, z1] = b;
    const qx = x < x0 ? x0 : x > x1 ? x1 : x,
      qz = z < z0 ? z0 : z > z1 ? z1 : z;
    const dx = x - qx,
      dz = z - qz,
      d = Math.hypot(dx, dz);
    if (d >= r - 1e-7) continue; // just touching counts as clear, or rounding error would pin you to everything you lean on
    hit = true;
    if (r - d > deep) {
      deep = r - d;
      bodyPush.box = b;
    }
    if (d < 1e-6) {
      // the centre is inside it: out through the nearest side
      const l = x - x0,
        rr = x1 - x,
        tp = z - z0,
        b = z1 - z,
        m = Math.min(l, rr, tp, b);
      if (m === l) px -= l + r;
      else if (m === rr) px += rr + r;
      else if (m === tp) pz -= tp + r;
      else pz += b + r;
    } else {
      px += (dx / d) * (r - d + 1e-6);
      pz += (dz / d) * (r - d + 1e-6);
    }
  }
  return hit ? [px, pz] : null;
}
const tileOK = (x, z, who = PLAYER) =>
  inb(x, z) && (slimAt(I(x, z)) ? !WALLISH.has(tiles[I(x, z)]) : walkable(x, z, who));
const footOK = (x, z) => tileOK(Math.floor(x), Math.floor(z));
const standOK = (x, z) => footOK(x, z) && !bodyPush(x, z, CTRL.body);
// nudged back out of whatever it overlaps, if that leaves it somewhere it can stand
function settle(x, z) {
  for (let k = 0; k < 4; k++) {
    const p = bodyPush(x, z, CTRL.body);
    if (!p) return footOK(x, z) ? [x, z] : null;
    x += p[0];
    z += p[1];
  }
  return standOK(x, z) ? [x, z] : null;
}
function tryMove(c, dx, dz) {
  const len = Math.hypot(dx, dz);
  if (len < 1e-9) return 0;
  const n = Math.max(1, Math.ceil(len / 0.05)),
    sx = dx / n,
    sz = dz / n,
    step = len / n,
    ux = dx / len,
    uz = dz / len;
  let moved = 0;
  for (let k = 0; k < n; k++) {
    if (!standOK(c.x, c.z)) {
      // standing somewhere odd (just up from a seat): step out toward open floor
      const same = Math.floor(c.x + sx) === Math.floor(c.x) && Math.floor(c.z + sz) === Math.floor(c.z);
      if (footOK(c.x + sx, c.z + sz) || same) {
        c.x += sx;
        c.z += sz;
        moved += step;
      }
      continue;
    }
    const nx = c.x + sx,
      nz = c.z + sz;
    if (standOK(nx, nz)) {
      c.x = nx;
      c.z = nz;
      moved += step;
      continue;
    }
    // brushed something round or at an angle: drop the part of the step that pushes into it and keep the rest
    if (footOK(nx, nz)) {
      const p = bodyPush(nx, nz, CTRL.body);
      if (p) {
        const pl = Math.hypot(p[0], p[1]) || 1,
          qx = p[0] / pl,
          qz = p[1] / pl,
          dn = ux * qx + uz * qz;
        let tx = ux - dn * qx,
          tz = uz - dn * qz,
          tl = Math.hypot(tx, tz);
        const b = bodyPush.box;
        if (tl <= 0.18 && b && Math.max(b[2] - b[0], b[3] - b[1]) < 0.6) {
          // dead on into a post: step round it, on whichever side you're already leaning, or the other if that's no good
          const lean = (c.x - (b[0] + b[2]) / 2) * -uz + (c.z - (b[1] + b[3]) / 2) * ux >= 0 ? 1 : -1;
          let q = null;
          for (const sd of [lean, -lean]) {
            q = settle(c.x - uz * sd * step, c.z + ux * sd * step);
            if (q && Math.abs((q[0] - c.x) * ux + (q[1] - c.z) * uz) < step * 0.6) break;
            q = null;
          }
          if (q) {
            moved += Math.hypot(q[0] - c.x, q[1] - c.z);
            c.x = q[0];
            c.z = q[1];
            continue;
          }
        }
        if (tl > 0.18) {
          const s = step * Math.min(1, tl * 1.5);
          tx /= tl;
          tz /= tl;
          const q = settle(c.x + tx * s, c.z + tz * s);
          if (q && (q[0] - c.x) * ux + (q[1] - c.z) * uz > -0.25 * step) {
            moved += Math.hypot(q[0] - c.x, q[1] - c.z);
            c.x = q[0];
            c.z = q[1];
            continue;
          }
        }
      }
    }
    // up against a flat edge: slide along it
    if (sx && standOK(c.x + sx, c.z)) {
      c.x += sx;
      moved += Math.abs(sx);
      continue;
    }
    if (sz && standOK(c.x, c.z + sz)) {
      c.z += sz;
      moved += Math.abs(sz);
      continue;
    }
    break;
  }
  return moved;
}
// a doorway pulls you in. Push straight at a wall right beside an opening and you slide along to it; push into a doorframe
// off-centre and you're eased into the middle; brush the corner of a desk and you slip round it. Only for a straight push
// on one key: holding two means you meant the diagonal.
function steerAssist(c, v) {
  const ax = Math.abs(v[0]),
    az = Math.abs(v[1]);
  if (Math.max(ax, az) < 0.92) return v;
  if (standOK(c.x + v[0] * 0.07, c.z + v[1] * 0.07)) return v; // nothing in the way
  const alongX = ax > az,
    sgn = Math.sign(alongX ? v[0] : v[1]);
  const fx = Math.floor(c.x),
    fz = Math.floor(c.z);
  const lat = alongX ? c.z : c.x,
    cell = alongX ? fz : fx,
    a0 = alongX ? fx : fz;
  const at = (a, l) => (alongX ? [a, l] : [l, a]); // (distance along, lane) → tile
  const side = (off) => (alongX ? [0, Math.sign(off)] : [Math.sign(off), 0]);
  const doorish = (x, z) => doorAt[I(x, z)] >= 0 || tget(x, z) === 'O';
  const [hx, hz] = at(a0 + sgn, cell);
  if (tileOK(hx, hz, c)) {
    // your own lane goes on: a doorframe eases you into its middle; anything else you slide round by touch
    if (!doorish(hx, hz) && !doorish(fx, fz)) return v;
    const off = cell + 0.5 - lat;
    return Math.abs(off) < 0.03 ? v : side(off);
  }
  // your lane is blocked: a wall pulls you along to a doorway up to two tiles off; a desk only lets you round its corner
  const reach = WALLISH.has(tget(hx, hz)) ? 2.05 : 0.85;
  let best = null;
  for (const dl of [-1, 1, -2, 2]) {
    const L = cell + dl,
      off = L + 0.5 - lat;
    if (Math.abs(off) > reach) continue;
    const [x1, z1] = at(a0, L),
      [x2, z2] = at(a0 + sgn, L),
      [x3, z3] = at(a0 + 2 * sgn, L);
    if (!tileOK(x1, z1, c) || !tileOK(x2, z2, c) || !tileOK(x3, z3, c)) continue;
    if (Math.abs(dl) === 2 && !tileOK(...at(a0, cell + dl / 2), c)) continue; // the lane between has to be open to slide along
    if (best == null || Math.abs(off) < Math.abs(best)) best = off;
  }
  return best == null ? v : side(best);
}
// over it at a run. Sprinting into a bench, a fence or a chair, you hop it and land running on the other side, as long
// as there's open floor to land on and nothing else (a wall, a desk, someone sitting there) in the way. Taken at a
// slant, a fence or a bench is something you slide along, not over.
function airOK(x, z, r) {
  const fx = Math.floor(x),
    fz = Math.floor(z);
  if (!inb(fx, fz)) return false;
  const i = I(fx, fz);
  if (!vaultAt(i) && !tileOK(fx, fz)) return false;
  for (const b of solidCells()[i]) {
    if (b.over) continue;
    const qx = x < b[0] ? b[0] : x > b[2] ? b[2] : x,
      qz = z < b[1] ? b[1] : z > b[3] ? b[3] : z;
    if (Math.hypot(x - qx, z - qz) < r) return false;
  }
  return true;
}
function vaultFind(c, ux, uz) {
  const V = CTRL.vault,
    r = CTRL.body;
  let o = null,
    d0 = 0;
  for (let d = 0.05; d <= V.look + 1e-6; d += 0.05) {
    const x = c.x + ux * d,
      z = c.z + uz * d;
    if (standOK(x, z)) continue;
    if (bodyPush(x, z, r)) o = bodyPush.box.over || null;
    else o = vaultAt(I(Math.floor(x), Math.floor(z))); // feet into its tile before the body touches it (a bin)
    if (!o) return null; // a wall, a desk: walk into it as ever
    d0 = d;
    break;
  }
  if (!o || o.users.some((u) => u)) return null;
  if ((o.w >= 2 * o.h && Math.abs(uz) < 0.5) || (o.h >= 2 * o.w && Math.abs(ux) < 0.5)) return null;
  for (let d = d0; d <= V.reach; d += 0.05) {
    const x = c.x + ux * d,
      z = c.z + uz * d;
    if (!airOK(x, z, r * 0.8)) return null;
    if (!standOK(x, z)) continue;
    const e = d + 0.12; // a touch further when there's room, so you don't come down on its edge
    return [o, standOK(c.x + ux * e, c.z + uz * e) ? e : d];
  }
  return null;
}
function vaultStart(c, ux, uz, speed) {
  const f = vaultFind(c, ux, uz);
  if (!f) return false;
  c.vault = {
    x0: c.x,
    z0: c.z,
    ux,
    uz,
    len: f[1],
    s: 0,
    v: speed * CTRL.vault.pace,
    h: Math.min(0.5, f[0].t.h * CTRL.vault.hop),
    lead: Math.sin(c.walkPh) >= 0 ? 1 : -1,
  };
  return true;
}
// in the air: carried along the line you took off on, whatever the keys say, until you land
function vaultTick(c, dt) {
  const V = c.vault;
  if (!c.onMap || G.away) {
    c.vault = null;
    return false;
  }
  const s0 = V.s;
  V.s = Math.min(V.len, V.s + V.v * dt);
  c.x = V.x0 + V.ux * V.s;
  c.z = V.z0 + V.uz * V.s;
  c.tdir = Math.atan2(V.ux, V.uz);
  c.path = null;
  c.moving = true;
  c.run = true;
  c.jog = false;
  c.walkPh += (V.s - s0) * 4.6;
  G.idleT = 0;
  cam.follow = true;
  if (V.s >= V.len) {
    c.vault = null;
    audio.hx('thud', 0, 0.16); // feet down
  }
  return true;
}
function driveTick(dt) {
  const P = PLAYER;
  if (P.vault && vaultTick(P, dt)) return;
  const v = moveInput();
  if (!v || !P.onMap || G.away) {
    if (!P.queue.length) {
      P.run = false;
      P.jog = false;
    }
    return;
  }
  if (P.queue.length) {
    const cur = P.queue[0];
    if (cur.interruptible === false || cur.swing || cur.photo) return; // passing out, a breakdown, a swing: you can't just walk off
    if (!P.queue.every((a) => a.cancel)) cancelAll(P); // anything else: walking away is how you stop
    return; // let it finish getting up
  }
  const slow = (PLAYER.needs.energy < 15 || G.t < (G.shakenUntil || 0) ? 0.8 : 1) * huntSlow(),
    run = !!keys.Shift;
  const speed = WALK * CTRL.walk * (run ? CTRL.sprint : 1) * slow,
    sp = speed * dt;
  if (run && P.pose === 'stand' && vaultStart(P, v[0], v[1], speed)) {
    vaultTick(P, dt);
    return;
  }
  const go = steerAssist(P, v),
    moved = tryMove(P, go[0] * sp, go[1] * sp);
  P.tdir = Math.atan2(v[0], v[1]);
  P.path = null;
  P.run = run;
  P.jog = !run;
  P.moving = moved > 1e-5;
  P.walkPh += moved * (run ? 4.6 : 4.1);
  if (moved > 1e-5) {
    G.idleT = 0;
    cam.follow = true;
  }
}
