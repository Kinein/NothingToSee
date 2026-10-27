//@ town/arrest — Being arrested, shown on the map
//@ Defines: ARREST, COP_MESH, copCarMesh, arrestCarIn, copCarV, arrestStart, arrestCuffed, arrestEscortTick, arrestLoad, arrestRide, arrestInside, arrestRelease, arrestDropOff, arrestTick, arrestFrame, arrestReset
//@ Uses:    sim/core, sim/actions, core/util, town/traffic-weather, audio/sound, horror/layer, ui/interface, gfx/gl, world/paths, gfx/renderer, …
//@ (header made by tools/map.js; stripped by build.py)
// ───────────── arrested, start to finish, out where you can see it: hands behind your back, the cuffs, a squad car
// pulling up on Main street with its lights going, the walk to it in front of the officer, the door, the car pulling
// away. The hours inside go by in the cell (see CELL). Then the car brings you back and lets you out on the kerb.
const ARREST = { on: false, phase: null, off: null, car: null, t0: 0, until: 0, door: null, loadAt: 0, rp: 0 };
let COP_MESH = null;
function copCarMesh() {
  if (COP_MESH) return COP_MESH;
  const g = new Geo(); g.ao = 0.7; g.aoH = 0.7;
  carGeo(g, hex(0x1b2233));
  const white = hex(0xd8d4c8);
  for (const sd of [-1, 1]) g.bx(sd * 0.462, 0.27, 0.06, 0.012, 0.2, 1.02, white);   // white doors
  g.bx(0, 0.992, -0.14, 0.64, 0.05, 0.17, hex(0x26282c));                           // the bar on the roof
  g.bx(-0.17, 1.03, -0.14, 0.25, 0.075, 0.14, hex(0xe8261c), EMIT(1));
  g.bx(0.17, 1.03, -0.14, 0.25, 0.075, 0.14, hex(0x2c58ff), EMIT(1));
  return (COP_MESH = makeMesh(g));
}
const arrested = () => ARREST.on;
// the squad car: down the near lane, slowing to a stop beside you
function arrestCarIn(x, south, drop) {
  const car = { x: south ? -4 : W + 4, z: south ? 16.5 : 15.5, dir: south ? 1 : -1, v: 7, vMax: 7.5, mesh: copCarMesh(), wait: 0, honked: true, model: M4.ident(), cop: true, stopX: clamp(x, 3, W - 4), parked: false, leaving: false, drop: !!drop };
  CARS.push(car); ARREST.car = car;
  ARREST.door = [Math.floor(car.stopX), south ? 17 : 14];   // the road tile against its kerb-side doors
  return car;
}
function copCarV(c, vT) {
  if (c !== ARREST.car && !c.leaving) c.leaving = true;
  if (c.leaving) return c.vMax;
  const dist = (c.stopX - c.x) * c.dir;
  if (dist <= 0.1) { c.v = 0; if (!c.parked) { c.parked = true; audio.hx('knock', hxPan(c.x, c.z), 0.35); } return 0; }
  return Math.min(c.vMax, Math.max(0.8, dist * 1.3));
}
function arrestStart(off) {
  const P = PLAYER;
  if (G.loose) return;
  if (ARREST.on || !P.onMap || G.away || CAP.on || HUNT.on) return arrest();
  closeMenu(); UI.fight = null; $('#fight').hidden = true; UI.aim = null; BOLTS.length = 0;
  if (UI.camMode) toggleCam(false);
  hardReset(P); G.sleeping = false; P.run = false; P.jog = false;
  if (G.speed > 1) G.speed = 1;
  addStress(8);
  echo('police', { x: P.x, z: P.z });
  audio.sting('caught');
  Object.assign(ARREST, { on: true, phase: 'cuff', off, t0: G.t, until: heldUntil(), car: null, loadAt: 0, rp: 0 });
  // turned round, hands behind your back: the cuffs go on
  P.tdir = Math.atan2(P.x - off.x, P.z - off.z);
  hardReset(off);
  enqueue(off, mkAct({ kind: 'wait', label: '…', dur: 2.6, anim: 'use', interruptible: false, onTick: (c) => (c.tdir = Math.atan2(P.x - c.x, P.z - c.z)), onEnd: () => arrestCuffed() }));
  setTimeout(() => { if (ARREST.on && ARREST.phase === 'cuff') audio.blip('click'); }, 500);
  setTimeout(() => { if (ARREST.on && ARREST.phase === 'cuff') audio.blip('click'); }, 760);
  arrestCarIn(P.x, P.z >= 15.5);
  if (Math.hypot(ARREST.car.x - P.x, ARREST.car.z - P.z) < 40) setTimeout(() => { if (ARREST.on) audio.sting('siren'); }, 400);
}
function arrestCuffed() {
  if (!ARREST.on || ARREST.phase !== 'cuff') return;
  const P = PLAYER, off = ARREST.off;
  ARREST.phase = 'escort';
  P.poseFn = CUFFED_POSE;
  const door = nearestWalkable(ARREST.door[0] + 0.5, ARREST.door[1] + 0.5, off, 3) || ARREST.door;
  hardReset(off);
  // he walks you out to it, a hand on your arm: you a step in front, him steering
  enqueue(off, [goAct(door, { label: '…', interruptible: false }),
    mkAct({ kind: 'wait', label: '…', dur: null, anim: 'idle', interruptible: false, until: () => !ARREST.on || ARREST.phase !== 'escort',
      onTick: (c) => { const car = ARREST.car; if (car) c.tdir = Math.atan2(car.x - c.x, car.z - c.z); if (car && car.parked && Math.hypot(P.x - c.x, P.z - c.z) < 1.7) arrestLoad(); } }),
    waitAct({ label: '…', dur: 30, anim: 'idle' })]);
}
// you, a step ahead of him: walked, not dragged. Steered straight at the spot in front of him, against the walls like
// your own walking is; only if you've somehow got separated does it route you round.
function arrestEscortTick(dt) {
  const P = PLAYER, off = ARREST.off;
  if (!off || !off.onMap) return arrestLoad();
  const bx = off.x + Math.sin(off.dir) * 0.85, bz = off.z + Math.cos(off.dir) * 0.85, dx = bx - P.x, dz = bz - P.z, d = Math.hypot(dx, dz);
  P.run = false; P.jog = false;
  off.spd = d > 1.2 ? 0.45 : 0.8;   // he slows till you're out in front again
  if (d > 2.6) {
    ARREST.rp -= dt;
    if (ARREST.rp <= 0 || !P.path || P.pi >= P.path.length) { ARREST.rp = 0.4; const t = nearestWalkable(bx, bz, P, 2); if (t) setPath(P, t[0], t[1]); }
    followPath(P, dt);
  } else if (d > 0.08) {
    P.path = null;
    const sp = Math.min(d, WALK * CTRL.walk * (d > 1 ? 1 : 0.75) * dt), moved = tryMove(P, (dx / d) * sp, (dz / d) * sp);
    P.moving = moved > 1e-4; P.walkPh += moved * 3.7;
    P.tdir = d > 0.3 ? Math.atan2(dx, dz) : off.dir;
  } else { P.moving = false; P.tdir = off.dir; }
  if (P.moving) G.idleT = 0;
  P.anim = 'idle';
}
function arrestLoad() {
  if (!ARREST.on || ARREST.phase !== 'escort') return;
  ARREST.phase = 'load'; ARREST.loadAt = G.t;
  const P = PLAYER, car = ARREST.car;
  P.path = null; P.moving = false;
  if (car) P.tdir = Math.atan2(car.x - P.x, car.z - P.z);
  audio.hx('knock', hxPan(P.x, P.z), 0.7);
}
// in the back, the door shut on you, and away
function arrestRide() {
  const P = PLAYER, off = ARREST.off, car = ARREST.car;
  ARREST.phase = 'ride';
  P.poseFn = null; P.onMap = false; P.path = null; P.moving = false;
  if (off) { hardReset(off); off.onMap = false; off.spd = 1; }
  audio.hx('knock', car ? hxPan(car.x, car.z) : 0, 0.8);
  if (car) car.leaving = true;
}
function arrestInside() {
  const car = ARREST.car;
  if (car) { const i = CARS.indexOf(car); if (i >= 0) CARS.splice(i, 1); }
  ARREST.on = false; ARREST.phase = null; ARREST.car = null; ARREST.off = null;
  goAway('held', Math.max(ARREST.until, G.t + 60));
}
// let out: the same car, the other way, and you on the kerb
function arrestRelease() {
  const P = PLAYER;
  Object.assign(ARREST, { on: true, phase: 'drop', off: null, t0: G.t, loadAt: 0 });
  P.onMap = false; P.poseFn = null; hardReset(P);
  const car = arrestCarIn(12, true, true);
  P.x = car.x; P.z = car.z; P.dir = P.tdir = Math.PI;
  cam.follow = true; if (G.speed !== 1) G.speed = 1;
}
function arrestDropOff() {
  const P = PLAYER, car = ARREST.car;
  const at = nearestWalkable(car.stopX + 0.5, 18.5, P, 2) || [12, 18];
  placeChar(P, at[0], at[1]); P.onMap = true; P.dir = P.tdir = 0; P.poseFn = null;
  P.needs.hunger = Math.max(20, P.needs.hunger - 25); P.needs.energy = Math.max(20, P.needs.energy - 30);
  audio.hx('knock', hxPan(car.x, car.z), 0.7);
  car.leaving = true;
  ARREST.on = false; ARREST.phase = null; ARREST.car = null;
  lastPlayerCell = -1; lightT = 0; cam.follow = true;
}
// every sim step while it plays
function arrestTick(dt) {
  if (!ARREST.on) return;
  const P = PLAYER, car = ARREST.car;
  if (G.over) { arrestReset(); return; }
  if (ARREST.phase === 'cuff') { P.moving = false; P.anim = 'idle'; if (ARREST.off && !ARREST.off.onMap) arrestCuffed(); }
  else if (ARREST.phase === 'escort') { arrestEscortTick(dt); if (G.t - ARREST.t0 > 120) { arrestRide(); } }
  else if (ARREST.phase === 'load') { P.moving = false; P.anim = 'idle'; if (G.t - ARREST.loadAt > 1.2) arrestRide(); }
  else if (ARREST.phase === 'ride') { if (car) { P.x = car.x; P.z = car.z; } if (!car || !CARS.includes(car) || Math.abs(car.x - car.stopX) > 13 || G.t - ARREST.t0 > 140) arrestInside(); }   // the cell fades in over it, pulling away
  else if (ARREST.phase === 'drop') { if (car) { P.x = car.x; P.z = car.z; } if (!car || !CARS.includes(car)) { const c2 = arrestCarIn(12, true, true); P.x = c2.x; P.z = c2.z; } else if (car.parked) { if (!ARREST.loadAt) ARREST.loadAt = G.t; else if (G.t - ARREST.loadAt > 1) arrestDropOff(); } }
}
// the lights going on the roof, every frame it's out there
function arrestFrame() {
  for (const c of CARS) {
    if (!c.cop) continue;
    const blue = Math.sin(R.time * 9) > 0, k = c.leaving && !ARREST.on ? 0.55 : 1;
    hxLight(c.x, 1.6, c.z, 4.2, mul3(blue ? [0.15, 0.3, 1.1] : [1.1, 0.12, 0.1], k));
  }
}
function arrestReset() {
  if (ARREST.car) { const i = CARS.indexOf(ARREST.car); if (i >= 0) CARS.splice(i, 1); }
  Object.assign(ARREST, { on: false, phase: null, off: null, car: null, loadAt: 0 });
  if (PLAYER) PLAYER.poseFn = null;
}

