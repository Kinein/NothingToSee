//@ game/last-day — Friday: hell let loose
//@ Defines: FRI, LOOSE_SPD, LOOSE_POSTS, LOOSE_GATE, LOOSE_FIRES, LOOSE_EXIT_X, LOOSE_LINES, LOOSE_BOUGHT, THRALL_PALLOR, looseCanBegin, looseBegin, looseTick, looseThem, looseShed, looseArm, looseKill, …
//@ Uses:    sim/core, world/grid, ui/interface, horror/layer, core/util, sim/actions, gfx/renderer, audio/sound, chase/hunt, them/awareness, …
//@ (header made by tools/map.js; stripped by build.py)
// ───────────────────────── THEIR last day: hell let loose ─────────────────────────
// Friday. THEY don't hide any more, nothing waits for the dark, and no door keeps THEM out. Whoever of THEM is left comes
// for you in person and drops the face right in front of you; what THEY bought, chipped or raised comes along. Two ways
// out: put the last of THEM down (one, maybe; more than that, almost never), or get to the far end of town, past the ones
// waiting there, and keep going. Being beaten, grabbed off the street or taken today is the end: there's no tomorrow.
ICON_PATHS.out = 'M3 12h12M10 6l6 6-6 6M20 3v18';
const FRI = { hold: null, scorched: false, grace: 0 };
const LOOSE_SPD = { lizards: 1.12, aliens: 1.12, zombies: 1.25 }; // on top of a true form's own pace
const LOOSE_POSTS = [
  [57, 14],
  [58, 17],
  [60, 30],
  [59, 2],
]; // the road out, the gap behind Mill Row, the strip above Pell's Row
const LOOSE_GATE = [55, 15]; // one of THEM waits for you on Main street's far end
const LOOSE_FIRES = [
  [19.5, 15.4],
  [37.5, 16.6],
  [49.5, 30.5],
  [28.5, 4.5],
  [8.5, 13.6],
];
const LOOSE_EXIT_X = W - 1.15;
const LOOSE_LINES = ['You.', 'Hold still.', 'Nowhere to go.', 'It’s Friday.', 'There you are.'];
const LOOSE_BOUGHT = ['Sorry. They pay better.', 'Nothing personal.', 'Don’t make this hard.', 'Stay where you are!'];
const THRALL_PALLOR = { kind: 'pallor', k: 1, side: 1 };
const looseOn = () => !!(G && G.loose && !G.over);
const looseChar = (id) => NPC[id] || CHARS.find((c) => c.id === id) || null;
function looseCanBegin() {
  const P = PLAYER;
  return (
    P.onMap &&
    !G.sleeping &&
    !G.away &&
    !CAP.on &&
    !HUNT.on &&
    !UI.scene &&
    !ARREST.on &&
    !G.landing &&
    !G.endAt &&
    alive().length > 0
  );
}
function looseBegin() {
  const fac = G.faction,
    left = alive();
  const L = (G.loose = {
    t0: G.t,
    kills: 0,
    helpers: [],
    roles: {},
    posts: {},
    come: {},
    gate: null,
    guns: {},
    upUsed: 0,
  });
  left.forEach((n, i) => (L.come[n.id] = G.t + 4 + i * 6));
  // the one living furthest east keeps the road out
  if (left.length >= 2)
    L.gate = left
      .slice()
      .sort((a, b) => (HOUSE_OF[b.id] ? HOUSE_OF[b.id].x0 : 0) - (HOUSE_OF[a.id] ? HOUSE_OF[a.id].x0 : 0))[0].id;
  // who THEY bring: the ones THEY paid, the ones THEY chipped, or simply the ones THEY killed
  const folk = suspects().filter((n) => !n.isThem && !n.slain && !n.gone && n.id !== 'lenny');
  const pref =
    fac === 'lizards'
      ? folk.filter((n) => bought(n))
      : fac === 'aliens'
        ? folk.filter((n) => G.chipped && G.chipped[n.id])
        : [];
  const hunters = shuffle(pref.slice())
    .concat(shuffle(folk.filter((n) => !pref.includes(n))))
    .slice(0, fac === 'zombies' ? 4 : 3);
  for (const n of hunters) {
    L.helpers.push(n.id);
    L.roles[n.id] = 'hunt';
  }
  if (fac === 'lizards' && NPC.officer) {
    L.helpers.push('officer');
    L.roles.officer = 'hunt';
  } // the police were on the payroll all along
  if (fac === 'aliens') {
    hunters.slice(0, 2).forEach((n) => (L.guns[n.id] = 1));
    L.guns.stranger0 = 1;
    L.guns.stranger2 = 1;
  }
  LOOSE_POSTS.forEach((p, i) => {
    const id = 'stranger' + i;
    if (looseChar(id)) {
      L.helpers.push(id);
      L.roles[id] = 'guard';
      L.posts[id] = p;
    }
  });
  // everybody else runs for a door
  for (const w of folk) if (!L.roles[w.id] && w.onMap && !w.engaged && !asleep(w)) flee(w, { spd: 1 });
  closeMenu();
  ui.almost();
  audio.sting('caught');
  setTimeout(() => {
    if (looseOn()) audio.sting('siren');
  }, 1600);
  R.pulse = 1;
  R.flash = Math.max(R.flash, 0.35);
  UI.planBump = 5;
  HX.jolt = Math.max(HX.jolt, 0.8);
  if (G.speed > 1) G.speed = 1;
}
// every sim step of Friday
function looseTick(dt) {
  if (!G.started || G.over) return;
  if (!G.loose) {
    if (phaseNow() === WEEK && looseCanBegin()) looseBegin();
    return;
  }
  const L = G.loose,
    P = PLAYER;
  if (G.sleeping) {
    const a = P.queue[0];
    if (a) a.cancel = true;
    G.sleeping = false;
  } // nobody sleeps through this
  for (const n of alive()) looseThem(n, L);
  for (const id of L.helpers) {
    const c = looseChar(id);
    if (c) looseHelper(c, L);
  }
  if (P.onMap && !G.away && !FRI.hold && !HUNT.on && P.x > LOOSE_EXIT_X && P.z < TOWN_H) looseEscape();
}
function looseThem(n, L) {
  if (n.slain || n.surrendered) return;
  n.hideUntil = 0;
  n.under = false;
  n.raiding = null;
  n.breakIn = true;
  if (!n.onMap) {
    const h = HOUSE_OF[n.id],
      at = n.id === L.gate ? LOOSE_GATE : h ? h.spot : n.id === 'agnes' ? HIDEOUTS.agnes : [0, 15];
    placeChar(n, at[0], at[1]);
    n.onMap = true;
    n.shown = 0;
    n.queue = [];
    n.prevRoom = roomAt(n.x, n.z);
  }
  const tf = n.trueForm;
  if (tf) {
    if (['hold', 'trapped', 'surrender', 'escort'].includes(tf.mode)) return;
    if (tf.mode !== 'attack' && !HUNT.on && n.tell && n.tell.t >= TF_CHANGE) {
      // nothing runs today: back at you
      hardReset(n);
      n.fleeing = null;
      n.poseFn = null;
      n.inRite = false;
      tf.mode = 'attack';
      tf.t0 = G.t;
      tf.aim = 0;
    }
    return looseArm(n);
  }
  if (n.wantShed) {
    n.wantShed = false;
    return looseShed(n);
  }
  if (G.t < (L.come[n.id] || 0)) return;
  const a = n.queue[0];
  if (a && a.loose) return;
  hardReset(n);
  n.fleeing = null;
  n.engaged = null;
  enqueue(n, looseAct(n.id === L.gate ? 'gate' : 'them'));
}
// right in front of you, the face comes off
function looseShed(n) {
  hardReset(n);
  n.tdir = Math.atan2(PLAYER.x - n.x, PLAYER.z - n.z);
  if (!trueForm(n, 'loose', 'attack')) return;
  ui.say(n, pick(LOOSE_LINES), 2.2);
  looseArm(n);
}
// a true form today: it doesn't tire, it doesn't lose you, it doesn't give up, and it takes more putting down
function looseArm(n) {
  const tf = n.trueForm;
  if (!tf) return;
  if (!tf.loose) {
    tf.loose = true;
    tf.hp = (FOE_HP[G.faction] || 3) + 1 + (G.loose.kills || 0);
    tf.maxHp = tf.hp;
  }
  tf.cornered = true;
  tf.long = 1e9;
  tf.lastSeen = G.t;
  n.breakIn = true;
}
function looseKill(n) {
  killMember(n, 'killed');
  const L = G.loose;
  if (!L) return;
  L.kills = (L.kills || 0) + 1;
  for (const o of alive())
    if (o.trueForm && o.trueForm.loose) {
      o.trueForm.hp = Math.min(8, o.trueForm.hp + 1);
      o.trueForm.maxHp = Math.max(o.trueForm.maxHp || 0, o.trueForm.hp);
    } // the rest of THEM saw that
  if (alive().length) audio.hx(G.faction === 'lizards' ? 'hiss' : G.faction === 'aliens' ? 'alarm' : 'groan', 0, 0.9);
}
// the ones THEY brought
function looseHelper(c, L) {
  const role = L.roles[c.id] || 'hunt';
  c.thrall = G.faction;
  c.gun = !!L.guns[c.id];
  if (c.slain || c.gone) return;
  if (!c.onMap) {
    const at =
      role === 'guard'
        ? L.posts[c.id]
        : HOUSE_OF[c.id]
          ? HOUSE_OF[c.id].spot
          : c.id === 'agnes'
            ? [18, 22]
            : [0, chance(0.5) ? 13 : 18];
    placeChar(c, at[0], at[1]);
    c.onMap = true;
    c.shown = 0;
    c.queue = [];
    c.prevRoom = roomAt(c.x, c.z);
  }
  c.fleeing = null;
  c.hideUntil = 0;
  c.engaged = null;
  c.under = false;
  c.breakIn = true;
  if (G.faction === 'aliens') c.trance = true;
  if (!FRI.hold || FRI.hold.c !== c) c.poseFn = thrallPose;
  const a = c.queue[0];
  if (a && (a.loose || a.looseDown)) return;
  hardReset(c);
  enqueue(c, looseAct(role));
}
function looseAct(role) {
  return mkAct({
    kind: 'wait',
    label: '…',
    icon: 'walk',
    dur: null,
    anim: 'idle',
    interruptible: false,
    loose: role,
    onStart: (c, a) => {
      a.rp = 99;
    },
    onTick: (c, a, dt) => looseStep(c, a, dt),
  });
}
function looseSpd(c, role) {
  if (role === 'them') return 1.22;
  if (role === 'gate') return 1.1;
  return G.faction === 'zombies' ? 0.94 : role === 'guard' ? 1.12 : 1.07;
}
function looseStep(c, a, dt) {
  const P = PLAYER,
    L = G.loose;
  if (!L || G.over) return;
  const role = a.loose,
    live = P.onMap && !G.away && !CAP.on,
    d = Math.hypot(P.x - c.x, P.z - c.z);
  let tgt = live ? [P.x, P.z] : null,
    run = true;
  if (role === 'guard' || role === 'gate') {
    // a post at the far end: it waits there until you come
    const post = role === 'gate' ? LOOSE_GATE : L.posts[c.id],
      dp = Math.hypot(P.x - post[0] - 0.5, P.z - post[1] - 0.5);
    const near = live && dp < 16 && d < 10 && (d < 4 || seesSpot(c, P.x, P.z, 10));
    if (near || (a.on && live && dp < 19)) a.on = true;
    else {
      a.on = false;
      tgt = [post[0] + 0.5, post[1] + 0.5];
      run = Math.hypot(c.x - tgt[0], c.z - tgt[1]) > 3;
    }
    if (role === 'gate' && a.on && d < 7.5) {
      c.wantShed = true;
      c.path = null;
      c.moving = false;
      c.tdir = Math.atan2(P.x - c.x, P.z - c.z);
      return;
    }
  }
  if (
    role === 'them' &&
    live &&
    d < 2.7 &&
    losClear(Math.floor(c.x), Math.floor(c.z), Math.floor(P.x), Math.floor(P.z))
  ) {
    c.wantShed = true;
    c.path = null;
    c.moving = false;
    c.tdir = Math.atan2(P.x - c.x, P.z - c.z);
    return;
  }
  if (role === 'hunt' || role === 'guard') {
    if (!c.saidLoose && live && d < 7 && seesSpot(c, P.x, P.z, 7)) {
      c.saidLoose = true;
      if (G.faction === 'lizards' && chance(0.7)) ui.say(c, pick(LOOSE_BOUGHT), 2.4);
      else hxSound(G.faction === 'zombies' ? 'groan' : 'thrum', c.x, c.z, 0.6);
    }
    if (c.gun && live && looseGun(c, d)) return;
    if (live && d < 0.95 && !FRI.hold && !HUNT.on && G.t >= (c.looseCd || 0) && G.t >= FRI.grace) {
      looseGrab(c);
      return;
    }
    if (FRI.hold && d < 1.6) {
      c.path = null;
      c.moving = false;
      c.tdir = Math.atan2(P.x - c.x, P.z - c.z);
      return;
    } // one grip at a time: the rest close round
  }
  if (!tgt) {
    c.path = null;
    c.moving = false;
    return;
  }
  if (!a.on && role !== 'hunt' && role !== 'them' && Math.hypot(tgt[0] - c.x, tgt[1] - c.z) < 0.7) {
    c.path = null;
    c.moving = false;
    c.tdir = -Math.PI / 2;
    return; // at its post, facing up the street
  }
  a.rp += dt;
  if (a.rp > 0.5 || !c.path || c.pi >= c.path.length) {
    a.rp = 0;
    const t = nearestWalkable(tgt[0], tgt[1], c, 2);
    if (t) setPath(c, t[0], t[1]);
  }
  c.spd = looseSpd(c, role);
  c.run = run;
  followPath(c, dt);
}
// weapons for THEIR sleepwalkers: a red dot first, then the shot. Step off its line.
function looseGun(c, d) {
  const P = PLAYER;
  if (c.aimAt) {
    c.path = null;
    c.moving = false;
    c.tdir = Math.atan2(P.x - c.x, P.z - c.z);
    if (!seesSpot(c, P.x, P.z, 13) || FRI.hold || !(UI.aim && UI.aim.c === c)) {
      c.aimAt = 0;
      if (UI.aim && UI.aim.c === c) UI.aim = null;
      c.gunCd = G.t + 3;
      return false;
    }
    if (G.t - c.aimAt >= 2.6) {
      c.aimAt = 0;
      UI.aim = null;
      c.gunCd = G.t + rand(9, 14);
      fireBolt(c, 16);
    }
    return true;
  }
  if (c.gunCd == null) c.gunCd = G.t + rand(3, 7);
  if (G.t < c.gunCd || d < 3.2 || d > 10 || UI.aim || FRI.hold || !seesSpot(c, P.x, P.z, 10)) return false;
  c.aimAt = G.t;
  UI.aim = { c };
  hxSound('thrum', c.x, c.z, 0.5);
  return true;
}
// a hand on you: hammer E to tear free before the rest of THEM get here
function looseGrab(c) {
  const P = PLAYER;
  if (UI.aim && UI.aim.c === c) UI.aim = null;
  c.aimAt = 0;
  FRI.hold = { c, k: 0, t: 0, lim: 2.1, shake: 0 };
  closeMenu();
  cancelAll(P);
  P.path = null;
  enqueue(
    P,
    mkAct({
      kind: 'wait',
      label: '…',
      icon: 'fist',
      dur: null,
      anim: 'idle',
      interruptible: false,
      swing: true,
      until: () => !FRI.hold,
    }),
  );
  P.tdir = Math.atan2(c.x - P.x, c.z - P.z);
  c.tdir = Math.atan2(P.x - c.x, P.z - c.z);
  c.path = null;
  c.moving = false;
  P.poseFn = (T, cc) => {
    const s = FRI.hold ? FRI.hold.shake || 0 : 0;
    T.torso = -0.15;
    T.uaL = -1.1 - s * 0.6;
    T.uaR = -1.0 + s * 0.5;
    T.faL = T.faR = -1.2;
    T.roll = Math.sin(cc.animT * 30) * 0.05 * (0.4 + s);
  };
  c.poseFn = (T) => {
    T.uaL = T.uaR = -1.35;
    T.faL = T.faR = -0.55;
    T.torso = 0.14;
  };
  audio.hx('grab', 0, 1);
  HX.jolt = 1;
  HX.shake = 0.6;
  R.pulse = 1;
  if (G.speed > 1) G.speed = 1;
  hurt(4, false);
}
function looseRelease(free, shoved) {
  const H = FRI.hold;
  FRI.hold = null;
  if (!H) return;
  const P = PLAYER,
    c = H.c;
  FRI.grace = G.t + (free ? 3.6 : 3); // a breath to run in
  P.poseFn = null;
  if (c) c.poseFn = thrallPose;
  if (!c || G.over) return;
  if (free) {
    // you shove it off and it goes down
    knockBack(c, P, 1.7);
    c.looseCd = G.t + 7;
    looseDown(c, 5);
    audio.hx('thud', 0, 0.9);
    audio.hx('breath', 0, 0.6);
    HX.shake = 0.5;
    R.pulse = 0.6;
  } else if (shoved) {
    // too slow: it throws you down and lets go
    c.looseCd = G.t + 5;
    knockBack(P, c, 1.1);
    G.shakenUntil = Math.max(G.shakenUntil || 0, G.t + 8);
    audio.hx('thud', 0, 1);
    HX.shake = 0.8;
    hurt(8, false);
  } else c.looseCd = G.t + 4;
}
function looseDown(c, dur) {
  hardReset(c);
  enqueue(
    c,
    waitAct({
      label: 'Down',
      dur,
      anim: 'stare',
      interruptible: false,
      looseDown: true,
      onStart: (cc) => {
        cc.pose = 'floorlie';
      },
      onEnd: (cc) => {
        cc.pose = 'stand';
      },
    }),
  );
}
// your blow on one of the helpers: no fight, no court case today. It goes down for a moment, and gets back up.
function looseHitHelper(n, hit) {
  if (!hit) return;
  ui.float(n, '−1', 'good');
  audio.hx('thud', hxPan(n.x, n.z), 0.8);
  knockBack(n, PLAYER, 1.2);
  n.looseCd = G.t + 6;
  if (UI.aim && UI.aim.c === n) UI.aim = null;
  n.aimAt = 0;
  looseDown(n, 7);
}
// the far end of town: you're out
function looseEscape() {
  if (UI.aim) UI.aim = null;
  R.flash = Math.max(R.flash, 0.5);
  gameOver('escaped');
}
// what's on the screen while it lasts: the grip ring, the red town, the fires
function looseFrame(dtR) {
  if (!G || !G.started) return;
  const H = FRI.hold;
  if (H) {
    const c = H.c,
      P = PLAYER;
    if (G.over || !G.loose || !c || !c.onMap || !P.onMap || G.away || CAP.on || HUNT.on) looseRelease(false);
    else if (G.speed > 0 && !UI.caseOpen && !UI.scene && !UI.cf) {
      H.t += dtR;
      H.shake = Math.max(0, H.shake - dtR * 4);
      if (H.k < 1) H.k = Math.max(0, H.k - dtR * 0.34);
      c.tdir = Math.atan2(P.x - c.x, P.z - c.z);
      c.path = null;
      c.moving = false;
      if (H.k >= 1) looseRelease(true);
      else if (H.t > H.lim) looseRelease(false, true);
    }
  }
  if (!looseOn() || CAP.on) return;
  if (!FRI.scorched) {
    FRI.scorched = true;
    for (const [fx, fz] of LOOSE_FIRES)
      for (let i = 0; i < 7; i++)
        hxDecal(fx + rand(-0.9, 0.9), fz + rand(-0.6, 0.6), rand(0.25, 0.55), [0.04, 0.025, 0.02, 0.85], 0, 1e7);
  }
  LOOSE_FIRES.forEach(([fx, fz], k) => {
    const fl = 0.75 + 0.25 * Math.sin(R.time * 9.3 + k * 2.1) * Math.sin(R.time * 5.7 + k);
    hxLight(fx, 0.8, fz, 4.2 + fl, [1.6 * fl, 0.62 * fl, 0.16 * fl]);
    for (let i = 0; i < 7; i++) {
      // embers going up
      const ph = (R.time * (0.32 + (i % 3) * 0.07) + i / 7 + k * 0.13) % 1,
        a = i * 2.4 + k + R.time * 0.6;
      hxGlint(
        fx + Math.sin(a) * 0.45 * (1 - ph * 0.3),
        0.2 + ph * 2.8,
        fz + Math.cos(a) * 0.35,
        0.05 + 0.03 * (1 - ph),
        [1, 0.5 + 0.3 * (1 - ph), 0.12],
        (1 - ph) * 0.85,
      );
    }
  });
  if (G.faction === 'aliens') hxLight(37, 9, 26, 14, [0.35, 0.9, 0.6]); // something sits over the park all day
}
const looseGoal = () => ({ at: [W - 1, 15], icon: 'out' });
// how THEIR helpers look: the bribed carry something heavy, the chipped walk asleep with a gun, the dead are dead
function thrallPose(T, c) {
  if (c.thrall === 'zombies' && c.moving) {
    T.uaL = -1.35 + Math.sin(c.animT * 3) * 0.08;
    T.uaR = -1.45 + Math.cos(c.animT * 2.6) * 0.08;
    T.faL = T.faR = -0.15;
    T.aoL = T.aoR = 0.05;
    T.hp = 0.25;
  }
  if (c.aimAt) {
    T.uaR = -1.5;
    T.faR = -0.05;
    T.aoR = 0.05;
    T.hy = 0;
  }
}
function thrallFx(c, fx) {
  const f = c.thrall;
  if (f === 'zombies') {
    fx.trace = THRALL_PALLOR;
    fx.eye = [0.6, 0.64, 0.56];
  } else if (f === 'aliens') {
    fx.eye = mul3(FACTIONS.aliens.eye, 0.55);
    if (c.gun) fx.prop = 'raygun';
  } else if (f === 'lizards' && !c.def.officer) fx.prop = 'bat';
}
