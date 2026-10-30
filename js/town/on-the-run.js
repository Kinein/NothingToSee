//@ town/on-the-run — Running from an arrest: the break, his gun, caught or lost; wanted after that
//@ Defines: ONRUN, COP_GUN_POSE, runKey, runForIt, pursuitBegin, pursuitAct, pursuitStep, copGun, fireBullet, bulletHits, diveAct, runCaught, runStruck, runLost, runEnd, runReset, …
//@ Uses:    sim/core, ui/interface, data/tuning, core/util, town/arrest, horror/layer, data/lines, sim/actions, combat/melee, audio/sound, …
//@ (header made by tools/map.js; stripped by build.py)
// ───────────── running from an arrest. While his hands are on you (the cuffs going on, the walk to the car) a fresh
// Shift and you're off: hands free if the cuffs weren't on yet, behind your back if they were. That's resisting, and now
// he's allowed to shoot. He runs you down; with you in sight a few strides off he stops and aims (a ring closes on you:
// get off the line), and close up he dives for you (the patch on the ground, as ever). Caught, it's a cell for good;
// shot down, that's the end of you. Break his sight long enough and he loses you, and from then on you're wanted: he
// comes looking once a day, and the moment he spots you it starts again. Your own flat is the one place he won't come in.
const ONRUN = {
  on: false,
  off: null,
  car: null, // the squad car, left at the kerb with its lights going while he's after you
  cuffed: false,
  seenAt: 0,
  lastX: 0,
  lastZ: 0,
  gunAt: 0,
  aimAt: 0,
  warned: false,
  look: 0,
  lookDir: 0,
  stunUntil: 0,
  diveCd: 0,
  flash: 0,
  fx: 0,
  fz: 0,
  el: null,
};
const cuffedNow = () => ONRUN.on && ONRUN.cuffed;
// his gun hand up, the other under it
const COP_GUN_POSE = (T, c) => {
  if (!ONRUN.aimAt || c !== ONRUN.off) return;
  T.uaR = -1.5;
  T.faR = -0.05;
  T.aoR = 0.05;
  T.uaL = -1.25;
  T.faL = -0.35;
  T.hy = 0;
};
// the key: Shift, pressed fresh while he has you (holding it from before doesn't count)
function runKey() {
  if (!keys.Shift) {
    ARREST.shiftUp = true;
    return false;
  }
  return ARREST.shiftUp && runForIt();
}
function runForIt() {
  const P = PLAYER,
    off = ARREST.off;
  if (!ARREST.on || !off || G.over || !(ARREST.phase === 'cuff' || ARREST.phase === 'escort')) return false;
  const cuffed = ARREST.phase === 'escort',
    car = ARREST.car;
  Object.assign(ARREST, { on: false, phase: null, off: null, car: null, loadAt: 0, shiftUp: false }); // first: the cuffing's own end checks this
  P.path = null;
  P.poseFn = cuffed ? CUFFED_POSE : null;
  hardReset(off);
  knockBack(off, P, 0.9);
  pursuitBegin(off, car, cuffed);
  enqueue(off, waitAct({ label: 'Officer', dur: RESIST.stumble, anim: 'stare', interruptible: false }), true);
  ui.say(off, pick(COP_BOLT), 2.2);
  audio.hx('grab', 0, 0.8);
  HX.shake = Math.max(HX.shake, 0.4);
  echo('police', { x: P.x, z: P.z });
  ui.note(
    'badge',
    cuffed ? 'Running in cuffs. He’s allowed to shoot now.' : 'You twist free. He’s allowed to shoot now.',
    'bad',
  );
  return true;
}
// the chase itself, however it starts: you broke away from him, or he came looking for you, or he spotted you
function pursuitBegin(off, car, cuffed) {
  const P = PLAYER;
  if (!off.onMap) {
    const edge = EDGES[P.x < W / 2 ? 'W' : 'E'][P.z < 15.5 ? 0 : 1];
    placeChar(off, edge[0], edge[1]);
    off.onMap = true;
    off.shown = 0;
    off.prevRoom = roomAt(off.x, off.z);
  }
  hardReset(off);
  Object.assign(ONRUN, {
    on: true,
    off,
    car: car || null,
    cuffed: !!cuffed,
    seenAt: G.t,
    lastX: P.x,
    lastZ: P.z,
    gunAt: G.t + RESIST.first,
    aimAt: 0,
    warned: false,
    look: 0,
    stunUntil: 0,
    diveCd: 0,
  });
  G.wanted = G.wanted || dayNo();
  G.wantedAt = 0;
  G.policeAt = 0;
  off.spd = RESIST.run;
  off.poseFn = COP_GUN_POSE;
  enqueue(off, pursuitAct());
  audio.sting('whistle');
  if (G.speed > 1) G.speed = 1;
}
function pursuitAct() {
  return mkAct({
    kind: 'wait',
    label: 'Officer',
    icon: 'walk',
    dur: null,
    anim: 'idle',
    interruptible: false,
    chase: PLAYER,
    prop: 'pistol',
    onStart: (c, a) => {
      a.rp = 99;
    },
    onTick: (c, a, dt) => pursuitStep(c, a, dt),
  });
}
function pursuitStep(c, a, dt) {
  const P = PLAYER,
    S = ONRUN;
  if (!S.on || S.off !== c || G.over) {
    a.cancel = true;
    return;
  }
  if (!P.onMap || G.away || CAP.on || HUNT.on || G.loose) return runEnd(); // somebody else has you now
  const d = Math.hypot(P.x - c.x, P.z - c.z),
    sees = seesSpot(c, P.x, P.z, RESIST.sight);
  if (sees) {
    S.seenAt = G.t;
    S.lastX = P.x;
    S.lastZ = P.z;
    S.look = 0;
  }
  if (G.t < S.stunUntil) {
    c.path = null;
    c.moving = false;
    return;
  }
  if (copGun(c, d, sees)) return;
  if (sees && d < RESIST.reach && G.t >= S.diveCd) {
    c.path = null;
    c.moving = false;
    enqueue(c, diveAct(), true);
    return;
  }
  if (!sees) {
    if (G.t - S.seenAt > RESIST.lose) return runLost(c);
    if (Math.hypot(S.lastX - c.x, S.lastZ - c.z) < 0.9) {
      // where he saw you last: a look round
      if (!S.look) {
        S.look = G.t;
        S.lookDir = c.dir;
        ui.say(c, pick(COP_LOST), 2.4);
      }
      c.path = null;
      c.moving = false;
      c.tdir = S.lookDir + Math.sin((G.t - S.look) * 0.9) * 1.6;
      if (G.t - S.look > RESIST.look) runLost(c);
      return;
    }
  }
  a.rp += dt;
  if (a.rp > 0.4 || !c.path || c.pi >= c.path.length) {
    a.rp = 0;
    const t = nearestWalkable(S.lastX, S.lastZ, c, 2);
    if (!t || !setPath(c, t[0], t[1])) {
      // he can't get to where you are (behind your own door): he stands and waits for you to show
      c.path = null;
      S.lastX = c.x;
      S.lastZ = c.z;
    }
  }
  c.spd = RESIST.run;
  c.run = true;
  followPath(c, dt);
}
// the gun: a ring closing on you while he aims, then the shot. Out of his sight, he lowers it.
function copGun(c, d, sees) {
  const S = ONRUN,
    P = PLAYER;
  if (S.aimAt) {
    c.path = null;
    c.moving = false;
    c.tdir = Math.atan2(P.x - c.x, P.z - c.z);
    if (!sees) {
      S.aimAt = 0;
      if (UI.aim && UI.aim.c === c) UI.aim = null;
      S.gunAt = G.t + 1.2;
      return false;
    }
    if (G.t - S.aimAt >= RESIST.aim) {
      S.aimAt = 0;
      if (UI.aim && UI.aim.c === c) UI.aim = null;
      S.gunAt = G.t + RESIST.cd;
      fireBullet(c);
    }
    return true;
  }
  if (!sees || G.t < S.gunAt || d < RESIST.near || d > RESIST.far || UI.aim) return false;
  S.aimAt = G.t;
  UI.aim = { c, gun: true, t0: G.t, dur: RESIST.aim };
  if (!S.warned) {
    S.warned = true;
    ui.say(c, pick(COP_GUN), 2.2);
  } else if (chance(0.4)) ui.say(c, pick(COP_AIM), 1.8);
  hxSound('lock', c.x, c.z, 0.7);
  return true;
}
function fireBullet(c) {
  const P = PLAYER,
    dx = P.x - c.x,
    dz = P.z - c.z,
    l = Math.hypot(dx, dz) || 1;
  c.tdir = Math.atan2(dx, dz);
  BOLTS.push({
    by: c,
    x: c.x + (dx / l) * 0.5,
    z: c.z + (dz / l) * 0.5,
    dx: dx / l,
    dz: dz / l,
    d: 0,
    dmg: RESIST.hit,
    age: 0,
    bullet: true,
  });
  ONRUN.flash = 1;
  ONRUN.fx = c.x + (dx / l) * 0.55;
  ONRUN.fz = c.z + (dz / l) * 0.55;
  R.flash = Math.max(R.flash, 0.3);
  HX.shake = Math.max(HX.shake, 0.35);
  hxSound('shot', c.x, c.z, 1);
  // everyone who hears it runs for a door
  for (const w of CHARS)
    if (
      !w.isPlayer &&
      w !== c &&
      w.onMap &&
      !w.isThem &&
      !w.def.stranger &&
      !w.fleeing &&
      !w.engaged &&
      !asleep(w) &&
      Math.hypot(w.x - c.x, w.z - c.z) < 12
    )
      flee(w, { spd: 1 });
}
// a bullet that finds you. The last one is the end.
function bulletHits(b) {
  const P = PLAYER;
  R.flash = 0.8;
  HX.jolt = 1;
  HX.shake = 0.7;
  audio.hx('thud', 0, 0.8);
  if (G.health - b.dmg <= 0) {
    G.health = 0;
    UI.aim = null;
    BOLTS.length = 0;
    return gameOver('shot');
  }
  hurt(b.dmg, false, b.by);
}
// close enough to lay hands on you: the patch on the ground is where they close
function diveAct() {
  const P = PLAYER,
    wind = POLICE.grab;
  return mkAct({
    kind: 'wait',
    label: 'Catch', // the reaching arms (GRAB)
    dur: wind / 0.5,
    anim: 'punch',
    interruptible: false,
    prop: 'pistol',
    onStart: (n, a) => {
      a.dir = Math.atan2(P.x - n.x, P.z - n.z);
      teleSet(n, n.x, n.z, POLICE.hold, wind);
      ui.say(n, pick(COP_DIVE), 1.6);
    },
    onTick: (n, a) => {
      if (a.landed) return;
      if (a.t < wind * 0.7) a.dir = Math.atan2(P.x - n.x, P.z - n.z);
      n.tdir = a.dir;
      const sx = Math.sin(a.dir),
        sz = Math.cos(a.dir);
      teleSet(n, n.x + sx * (POLICE.lunge + 0.3), n.z + sz * (POLICE.lunge + 0.3), POLICE.hold);
      if (a.t < wind) return;
      a.landed = true;
      const T = n.tele;
      teleEnd(n);
      lungeChar(n, sx, sz, POLICE.lunge);
      if (P.onMap && !G.away && !G.over && Math.hypot(P.x - T.x, P.z - T.z) < T.r) return runCaught(n);
      // you slipped him
      ONRUN.stunUntil = G.t + POLICE.stumble;
      ONRUN.diveCd = ONRUN.stunUntil + 1;
      audio.hx('whoosh', hxPan(n.x, n.z), 0.6);
      if (P.onMap) ui.float(P, 'Slipped', 'good');
      ui.say(n, pick(COP_SLIP), 2);
    },
  });
}
function runCaught(n) {
  const P = PLAYER;
  UI.aim = null;
  BOLTS.length = 0;
  P.poseFn = CUFFED_POSE;
  P.path = null;
  P.moving = false;
  n.tdir = Math.atan2(P.x - n.x, P.z - n.z);
  ui.say(n, pick(COP_CATCH), 3);
  audio.hx('grab', 0, 1);
  HX.shake = 0.8;
  gameOver('jailed');
}
// your blow, while he's after you: he staggers back a step, and comes on
function runStruck(n) {
  ONRUN.stunUntil = G.t + 1.6;
  knockBack(n, PLAYER, 0.8);
  gesture(n, 'flinch', 0.5);
  ui.float(n, '−1', 'good');
  audio.hx('thud', hxPan(n.x, n.z), 0.8);
  ui.say(n, pick(COP_HIT), 2);
}
// out of his sight long enough: he's lost you. The cuffs come off behind the first bins you find.
function runLost(c) {
  const cuffed = ONRUN.cuffed;
  runEnd();
  hardReset(c);
  c.spd = 1;
  ui.say(c, pick(COP_QUIT), 2.6);
  enqueue(c, goAct(EDGES[c.x < W / 2 ? 'W' : 'E'][c.z < 15.5 ? 0 : 1], { label: 'Leaving' }));
  G.wantedAt = dayNo() * 1440 + rand(RESIST.daily[0], RESIST.daily[1]) * 60; // tomorrow, some time in the day
  addStress(-4);
  setTimeout(() => {
    if (!G.over)
      ui.note(
        'badge',
        cuffed
          ? 'You lost him. You work your hands out of the cuffs. You’re wanted now.'
          : 'You lost him. You’re wanted now.',
        'onto',
      );
  }, 1200);
}
function runEnd() {
  const S = ONRUN,
    c = S.off;
  if (UI.aim && c && UI.aim.c === c) UI.aim = null;
  if (c) {
    c.poseFn = null;
    c.spd = 1;
    teleEnd(c);
  }
  if (S.car) S.car.leaving = true;
  if (S.cuffed && PLAYER && PLAYER.poseFn === CUFFED_POSE) PLAYER.poseFn = null;
  Object.assign(S, { on: false, off: null, car: null, cuffed: false, aimAt: 0, look: 0 });
}
function runReset() {
  runEnd();
  ONRUN.flash = 0;
  if (ONRUN.el) ONRUN.el.hidden = true;
}
// wanted: once a day he comes looking (a while after you're out of your door), and wherever he is, he knows your face
function wantedTick() {
  const P = PLAYER,
    off = NPC.officer;
  if (!G.wanted || !off || off.slain || off.gone || ONRUN.on || ARREST.on || G.loose || G.over) return false;
  if (!P.onMap || G.away || G.sleeping || CAP.on || HUNT.on) return false;
  if (off.onMap && !asleep(off) && seesSpot(off, P.x, P.z, RESIST.spot)) {
    pursuitBegin(off, null, false);
    ui.say(off, pick(COP_SPOT), 2.4);
    ui.bubble(off, 'exclaim', 'speech', 2.5);
    ui.note('badge', 'The officer has seen you. Run.', 'bad');
    return true;
  }
  if (!G.wantedAt) G.wantedAt = G.t + rand(60, 180);
  if (G.t < G.wantedAt || off.onMap) return false;
  if (inRoomSet(P, (r) => r.home)) {
    G.wantedAt = G.t + rand(30, 90); // a siren goes past the window, and on
    return false;
  }
  pursuitBegin(off, null, false);
  ui.note('badge', 'A siren. The police are out looking for you. Run.', 'bad');
  return true;
}
// every frame: the shout for the key while he has you, the muzzle flash
function runFrame(dtR) {
  ONRUN.flash = Math.max(0, ONRUN.flash - dtR * 9);
  if (ONRUN.flash > 0.02)
    hxLight(ONRUN.fx, 1.3, ONRUN.fz, 3.4, [2.4 * ONRUN.flash, 1.7 * ONRUN.flash, 0.7 * ONRUN.flash]);
  const show = !!(G && G.started && !G.over && ARREST.on && (ARREST.phase === 'cuff' || ARREST.phase === 'escort'));
  if (!show) {
    if (ONRUN.el) ONRUN.el.hidden = true;
    return;
  }
  if (!ONRUN.el) {
    const el = (ONRUN.el = document.createElement('button'));
    el.className = 'runfor';
    el.innerHTML = '<kbd>Shift</kbd>Run for it';
    el.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      runForIt();
    });
    $('#fx').appendChild(el);
  }
  const P = PLAYER,
    [x, y] = project(P.x, 2.3, P.z);
  ONRUN.el.hidden = false;
  ONRUN.el.style.transform = 'translate(' + x + 'px,' + y + 'px)';
}
