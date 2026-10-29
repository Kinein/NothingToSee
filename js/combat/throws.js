//@ combat/throws — What THEY throw from further off: furniture, swarms; the red patches on the floor
//@ Defines: THROWN, SWARMS, THROWABLE, THROW_ID, CB_COL, foeRanged, throwPick, throwStart, throwTick, throwFly, throwLand, throwMatrix, swarmStart, flyOK, swarmTick, swarmSting, …
//@ Uses:    sim/core, data/tuning, core/util, gfx/renderer, horror/layer, audio/sound, world/objects, ui/interface, world/grid, gfx/gl, …
//@ (header made by tools/map.js; stripped by build.py)
// ───────────── what THEY do from a few strides off. A lizard tears up the nearest chair or bin, holds it overhead and
// throws it at where you stood when it let go: a red ring shows where it comes down, so get out of the ring. The dead
// let out a swarm that follows you, stinging, until it tires: faster than your jog, slower than your sprint, and it
// can't get through a wall or a locked door. (The aliens' laser is in combat/bolts.)
const THROWN = [];
const SWARMS = [];
const THROWABLE = new Set(['chair', 'chair_office', 'trashcan', 'boxes', 'trashbags', 'crates', 'bucket']);
const THROW_ID = M4.ident();
const CB_COL = new Float32Array(4); // decal colours, filled in place: nothing new every frame
// from a few strides off, a lizard throws and the dead loose a swarm. True while it's busy at it: it stands and faces you.
function foeRanged(n, d, sees) {
  const tf = n.trueForm,
    P = PLAYER;
  if (G.t < (tf.busy || 0)) {
    n.path = null;
    n.moving = false;
    if (P.onMap) n.tdir = Math.atan2(P.x - n.x, P.z - n.z);
    return true;
  }
  if (G.t < (tf.rcd || 0) || !sees || d < RANGED.from || d > RANGED.to || tf.atk || !P.onMap || G.away) return false;
  if (G.faction === 'lizards') {
    const o = throwPick(n);
    if (!o) {
      tf.rcd = G.t + 1; // nothing to hand: look again in a minute
      return false;
    }
    throwStart(n, o);
    tf.busy = G.t + RANGED.lift;
    tf.rcd = G.t + RANGED.throwCd;
    return true;
  }
  if (G.faction === 'zombies' && !swarmOf(n)) {
    swarmStart(n);
    tf.busy = G.t + RANGED.wake;
    tf.rcd = G.t + RANGED.swarmCd;
    return true;
  }
  return false;
}
// the nearest thing it can pick up: free, not sat on, close to hand
function throwPick(n) {
  let best = null,
    bd = RANGED.grab;
  for (const o of OBJ) {
    if (!THROWABLE.has(o.type) || o.wrecked || !o.mesh || o.t.lair) continue;
    const d = Math.hypot(o.cx - n.x, o.cz - n.z);
    if (d >= bd || o.users.some((u) => u)) continue;
    bd = d;
    best = o;
  }
  return best;
}
function throwStart(n, o) {
  const m = o.mesh;
  if (!m.home) {
    m.home = m.model; // where it stood, to put it back in the morning
    m.homeC = m.center.slice();
  }
  m.model = new Float32Array(16);
  m.center = m.homeC.slice();
  o.wrecked = true;
  solidReset();
  const tk = tuckOf(o),
    f = DIRS[o.face];
  THROWN.push({
    o,
    by: n,
    ph: 'lift',
    t: 0,
    dur: RANGED.lift,
    fx: o.cx + f[0] * tk,
    fy: 0,
    fz: o.cz + f[1] * tk,
    x: o.cx + f[0] * tk,
    y: 0,
    z: o.cz + f[1] * tk,
    tx: 0,
    tz: 0,
    arc: 0,
    ang: FACE_ANG[o.face],
    spin: 0,
    J: new Float32Array(16),
  });
  n.tell.wind = true;
  ui.bubble(n, 'exclaim', 'speech', 1.2);
  audio.hx('crack', hxPan(o.cx, o.cz), 0.6);
  if (G.speed > 1) G.speed = 1;
}
// in its hands, then in the air: every sim step
function throwTick(th, dt) {
  const n = th.by,
    P = PLAYER;
  th.t += dt;
  const u = Math.min(1, th.t / th.dur);
  if (th.ph === 'lift') {
    const ok = n.onMap && !n.slain && n.trueForm && n.trueForm.mode === 'attack' && !n.trueForm.stunUntil;
    if (!ok) return throwFly(th, n.x, n.z, 0.5); // knocked out of it: it drops at its feet
    const e = u * u * (3 - 2 * u),
      hx = n.x + Math.sin(n.dir) * 0.15,
      hz = n.z + Math.cos(n.dir) * 0.15;
    th.x = lerp(th.fx, hx, e);
    th.z = lerp(th.fz, hz, e);
    th.y = lerp(th.fy, 1.75, e);
    th.spin = e * 0.5;
    if (u >= 1) {
      // it lets go at where you are now
      n.tell.wind = false;
      n.tell.lunge = true;
      n.lungeOff = G.t + 0.4;
      audio.hx('whoosh', hxPan(n.x, n.z), 0.8);
      if (P.onMap && !G.away) throwFly(th, P.x, P.z, 0);
      else throwFly(th, n.x, n.z, 0.5);
    }
    return;
  }
  th.x = lerp(th.fx, th.tx, u);
  th.z = lerp(th.fz, th.tz, u);
  th.y = lerp(th.fy, 0, u) + 4 * th.arc * u * (1 - u);
  th.spin += dt * 9;
  if (u >= 1) throwLand(th);
}
function throwFly(th, tx, tz, dur) {
  if (th.by.tell) th.by.tell.wind = false;
  th.ph = 'fly';
  th.t = 0;
  th.fx = th.x;
  th.fy = th.y;
  th.fz = th.z;
  th.tx = tx;
  th.tz = tz;
  const d = Math.hypot(tx - th.x, tz - th.z);
  th.dur = dur || RANGED.fly + RANGED.flyPer * d;
  th.arc = dur ? 0 : 0.6 + d * 0.06;
}
// down it comes, in pieces. On you, if you're still under it.
function throwLand(th) {
  const P = PLAYER,
    o = th.o;
  o.mesh.show = false;
  audio.hx('crack', hxPan(th.tx, th.tz), 0.9);
  audio.hx('thud', hxPan(th.tx, th.tz), 0.6);
  const d = Math.hypot(P.x - th.tx, P.z - th.tz);
  if (d < 6) HX.shake = Math.max(HX.shake || 0, 0.25);
  if (P.onMap && !G.away && d < RANGED.hit) {
    G.lastHitBy = th.by.id;
    psyMark('fight');
    hurt(HURT.thrown, true);
    if (!G.over && P.onMap) knockBack(P, th, 0.8);
  } else if (P.onMap && d < 3 && th.arc) ui.float(P, 'Dodged', 'good');
  th.done = true;
}
// where its mesh is drawn: carried, then tumbling. Turned about its middle, not its feet.
function throwMatrix(th) {
  const m = th.o.mesh;
  M4.jointInto(th.J, THROW_ID, th.x, th.y + 0.45, th.z, th.spin, th.ang + th.spin * 0.6, 0);
  M4.partInto(m.model, th.J, 0, -0.45, 0, 1, 1, 1);
  m.center[0] = th.x;
  m.center[1] = th.y + 0.5;
  m.center[2] = th.z;
}
const swarmOf = (n) => {
  for (const s of SWARMS) if (s.by === n) return s;
  return null;
};
function swarmStart(n) {
  SWARMS.push({ by: n, x: n.x, z: n.z, vx: 0, vz: 0, wake: RANGED.wake, life: RANGED.swarmLife, sting: 0, fade: 1 });
  n.tell.feed = true;
  ui.bubble(n, 'exclaim', 'speech', 1.2);
  audio.hx('buzz', hxPan(n.x, n.z), 0.6);
  if (G.speed > 1) G.speed = 1;
}
// where a swarm can fly: anywhere but through a wall or a locked door
function flyOK(x, z) {
  const fx = Math.floor(x),
    fz = Math.floor(z);
  if (!inb(fx, fz)) return false;
  const c = tiles[I(fx, fz)];
  return c !== '#' && c !== 'W' && c !== 'L' && !VOIDISH.has(c);
}
function swarmTick(s, dt) {
  const n = s.by,
    P = PLAYER;
  if (s.wake > 0) {
    // still coming out of its mouth
    s.wake -= dt;
    s.x = n.x + Math.sin(n.dir) * 0.4;
    s.z = n.z + Math.cos(n.dir) * 0.4;
    if (s.wake <= 0 && n.tell) n.tell.feed = false;
    return;
  }
  s.life -= dt;
  if (!P.onMap || G.away || !n.trueForm || n.slain) s.life = Math.min(s.life, 0);
  if (s.life <= 0) {
    s.fade -= dt * 0.6; // it thins out and drifts off
    if (s.fade <= 0) s.done = true;
    return;
  }
  const dx = P.x - s.x,
    dz = P.z - s.z,
    d = Math.hypot(dx, dz) || 1,
    sp = WALK * RANGED.swarmSpd,
    k = Math.min(1, dt * 2.5);
  s.vx += ((dx / d) * sp - s.vx) * k;
  s.vz += ((dz / d) * sp - s.vz) * k;
  const nx = s.x + s.vx * dt,
    nz = s.z + s.vz * dt;
  if (flyOK(nx, nz)) {
    s.x = nx;
    s.z = nz;
  } else if (flyOK(nx, s.z)) s.x = nx;
  else if (flyOK(s.x, nz)) s.z = nz;
  else {
    s.vx *= -0.3;
    s.vz *= -0.3;
  }
  s.sting -= dt;
  if (d < RANGED.swarmHit && s.sting <= 0) {
    s.sting = RANGED.swarmEvery;
    swarmSting(s);
  }
}
// a sting: a little off your health and your nerve. Not the flinch and the shakes of a blow: you can still run.
function swarmSting(s) {
  if (G.over || !PLAYER.onMap) return;
  G.health = Math.max(0, G.health - HURT.sting);
  G.sickNext = true;
  G.lastHitBy = s.by.id;
  psyMark('fight');
  R.pulse = Math.max(R.pulse || 0, 0.35);
  ui.float(PLAYER, '−' + HURT.sting, 'bad');
  audio.hx('sting', 0, 0.45);
  if (G.health <= 0) knockOut(true);
}
// every sim step: throws in the air, swarms on the wing, a creature's lunge coming back down
function combatTick(dt) {
  for (let i = THROWN.length - 1; i >= 0; i--) {
    const th = THROWN[i];
    throwTick(th, dt);
    if (th.done) THROWN.splice(i, 1);
    else throwMatrix(th);
  }
  for (let i = SWARMS.length - 1; i >= 0; i--) {
    swarmTick(SWARMS[i], dt);
    if (SWARMS[i].done) SWARMS.splice(i, 1);
  }
  for (const c of CHARS)
    if (c.lungeOff && G.t >= c.lungeOff) {
      c.lungeOff = 0;
      if (c.tell) c.tell.lunge = false;
    }
}
// beaten, taken, a new game: nothing left in the air. Whatever was mid-throw is in pieces.
function combatClear() {
  for (const th of THROWN) th.o.mesh.show = false;
  THROWN.length = 0;
  SWARMS.length = 0;
  for (const c of CHARS) {
    teleEnd(c);
    if (c.tell) c.tell.wind = false;
    if (c.trueForm) c.trueForm.atk = null;
  }
}
// in the morning it's all back where it stood, as if nothing had been thrown at anyone
function wreckReset() {
  THROWN.length = 0;
  let any = false;
  for (const o of OBJ) {
    if (!o.wrecked) continue;
    o.wrecked = false;
    any = true;
    const m = o.mesh;
    if (m && m.home) {
      m.model = m.home;
      m.center = m.homeC;
      m.home = null;
    }
    if (m) m.show = true;
  }
  if (any) solidReset();
}
// the swarm itself, in the world pass: specks wheeling round its middle, a glint on each so you see it at night
function combatDraw() {
  if (!SWARMS.length) return;
  gl.uniform1f(U.uEmitMul, 1);
  gl.uniform1f(U.uDyn, 1);
  gl.uniform1i(U.uCut, 0);
  drawHi = 0;
  const t = R.time;
  for (const s of SWARMS) {
    if (visAt(s.x, s.z) < 0.2) continue;
    const n = s.wake > 0 ? Math.round(16 * (1 - s.wake / RANGED.wake)) : Math.round(16 * s.fade);
    for (let k = 0; k < n; k++) {
      const a = t * (2.1 + (k % 5) * 0.37) + k * 2.4,
        r = 0.18 + ((k * 37) % 11) * 0.025,
        x = s.x + Math.cos(a) * r + Math.sin(t * 7 + k) * 0.04,
        z = s.z + Math.sin(a * 1.13) * r,
        y = 1.05 + Math.sin(a * 0.7 + k) * 0.28;
      part(THROW_ID, x, y, z, 0.035, 0.026, 0.035, 'box', k % 3 ? SWARM_DARK : SWARM_GOLD, SWARM_GLINT);
    }
  }
}
const SWARM_DARK = [0.08, 0.07, 0.04],
  SWARM_GOLD = [0.7, 0.55, 0.1],
  SWARM_GLINT = [0.18, 0.15, 0.03];
function cbDecal(x, z, r, cr, cg, cb, a, shape) {
  CB_COL[0] = cr;
  CB_COL[1] = cg;
  CB_COL[2] = cb;
  CB_COL[3] = a;
  drawDecal(x, z, r, CB_COL, shape, 0.017);
}
// on the floor: the red patch of every blow on its way, the ring where a throw comes down, a swarm's shadow
function combatDecals() {
  if (!G || !G.started) return;
  for (const c of CHARS) {
    const T = c.tele;
    if (!T || !c.onMap || G.t >= T.end) continue;
    const k = clamp((G.t - T.at) / Math.max(0.01, T.end - T.at), 0, 1),
      hot = k > 0.8 ? 0.5 + 0.5 * Math.sin(R.time * 40) : 0;
    cbDecal(T.x, T.z, T.r, 0.95, 0.12, 0.06, 0.16 + 0.42 * k + 0.2 * hot, 0);
    cbDecal(T.x, T.z, T.r * 1.08, 1, 0.3, 0.15, 0.55 + 0.4 * k, 1);
  }
  for (const th of THROWN) {
    cbDecal(th.x, th.z, 0.42, 0, 0, 0, 0.3, 0);
    if (th.ph !== 'fly' || !th.arc) continue;
    const k = clamp(th.t / th.dur, 0, 1);
    cbDecal(th.tx, th.tz, RANGED.hit, 0.95, 0.12, 0.06, 0.15 + 0.4 * k, 0);
    cbDecal(th.tx, th.tz, RANGED.hit * 1.08, 1, 0.3, 0.15, 0.6 + 0.4 * k, 1);
  }
  for (const s of SWARMS) if (s.wake <= 0) cbDecal(s.x, s.z, 0.55, 0, 0, 0, 0.22 * s.fade, 0);
}
