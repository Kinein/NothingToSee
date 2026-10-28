//@ combat/timing-bar — THEIR attack: the timing bar
//@ Defines: privateFight, openFight, fightTick, strike, closeFight, knockBack, fightOutcome, earshot, viewLine, perceptionTick, clinicCheck, privateKill
//@ Uses:    sim/core, ui/interface, data/tuning, core/util, town/suspicion, world/grid, audio/sound, town/fleeing, them/awareness, gfx/renderer, …
//@ (header made by tools/map.js; stripped by build.py)
// ───────────── the one hit: a tracker sweeps a red bar; land it in the green. Dead center of the green is a clean
// hit: it goes down for a moment, long enough to get another blow in. A fuse under the bar burns down to the miss.
// the picture on the fight panel: one of THEM in its true form. The picture is the same every time (a witness
// snapshot carries no date), so it's drawn once per person per game, ahead of time (warmLater in trueForm), and
// cached under this same key: `at: 0` instead of the change's start time, so the second fight with the same
// one doesn't redraw it either.
const fightSnapRec = () => ({ type: 'true', how: 'witness', at: 0, t: 2, pose: 'stand' });
// alone with it (you attacked it, a night ambush, guarding a witness), it's far tougher than in front of a crowd
function privateFight(n) {
  const tf = n.trueForm;
  if (!tf || tf.private || tf.public || G.loose) return;
  tf.private = true;
  tf.hp = tf.maxHp = EVIDENCE.fight.privateHp[G.faction] || tf.hp;
}
// three or more who saw it change, standing round: they land a blow when it starts, and pull it off you after
const crowdHelp = (n) =>
  earshot(n).filter((w) => w !== n && !w.isThem && !w.def.stranger && sawRecently(w, n)).length >=
  EVIDENCE.fight.crowdSaw;
function openFight(n, lunge) {
  if (UI.fight || G.over || !n.onMap || !PLAYER.onMap || ARREST.on || UI.cf) return;
  const tf = n.trueForm,
    F = EVIDENCE.fight;
  let [g, sp] = FIGHT_DIFF[tf ? G.faction : n.isThem ? 'them' : 'normal'];
  if (PLAYER.needs.stress >= 80) g *= 2 / 3; // breaking: fight power −30%
  if (PLAYER.needs.energy < 30) sp *= 1.2;
  if (G.inv.crowbar) g *= 1.3; // something heavy in your hand
  if (tf && tf.mode === 'trapped') {
    g *= F.trapWindow;
    sp *= F.trapSpeed;
    if (!tf.trapHit) {
      tf.trapHit = true;
      tf.hp = Math.max(1, tf.hp + F.trapHp); // caught fast: it's already hurt
    }
  } else if (tf && tf.wounded) g *= 1.12;
  if (tf && tf.private && !G.loose) g *= F.privateWindow;
  if (tf && !tf.private && !G.loose && !tf.crowdHit && tf.mode !== 'trapped' && crowdHelp(n)) {
    tf.crowdHit = true; // the crowd gets one in first
    tf.hp = Math.max(1, tf.hp - 1);
    const w = pick(earshot(n).filter((x) => x !== n && !x.isThem && !x.def.stranger));
    if (w) ui.say(w, pick(['Get it!', 'NOW!', 'Hold it down!']), 2);
  }
  if (tf && G.loose) {
    // Friday: the rest of THEM close in, and every one you put down makes the rest worse
    const pack = CHARS.filter(
        (o) => o !== n && o.trueForm && o.onMap && !o.slain && Math.hypot(o.x - PLAYER.x, o.z - PLAYER.z) < 5,
      ).length,
      k = G.loose.kills || 0;
    g *= 0.86 * Math.pow(0.8, k) * Math.pow(0.85, pack);
    sp *= 1 + 0.14 * k + 0.1 * pack;
  }
  g = clamp(g, 0.06, 0.6);
  const a = rand(0.06, 0.94 - g),
    c = tf ? (g * FIGHT.clean) / 2 : 0, // half the clean core: only a true form can be knocked flat
    el = $('#fight');
  UI.fight = {
    n,
    a,
    b: a + g,
    c0: a + g / 2 - c,
    c1: a + g / 2 + c,
    sp,
    pos: 0,
    dir: 1,
    t: 0,
    go: false,
    late: false,
    res: null,
    clean: false,
    rt: 0,
    ft: el.querySelector('.ft'),
    fuse: el.querySelector('.ffuse i'),
  };
  closeMenu();
  el.className = 'overlay ready' + (lunge ? ' lunge' : '');
  el.hidden = false;
  el.querySelector('img').src = tf ? snapImage(n, fightSnapRec(n)) : getPortrait(n);
  el.querySelector('.fres').textContent = lunge ? 'It lunges' : tf && tf.mode === 'trapped' ? 'It’s held' : 'Strike';
  el.querySelector('.fsub').textContent = c ? 'Dead center knocks it down' : '';
  const hp = el.querySelector('.fhp');
  hp.innerHTML = tf
    ? Array.from(
        { length: Math.max(tf.maxHp || 0, FOE_HP[G.faction] || 3) },
        (_, i) => '<i class="' + (i < tf.hp ? '' : 'off') + '"></i>',
      ).join('')
    : '';
  hp.dataset.tip = tf ? 'How much fight it has left' : '';
  const fg = el.querySelector('.fg'),
    fc = el.querySelector('.fc');
  fg.style.left = (a * 100).toFixed(1) + '%';
  fg.style.width = (g * 100).toFixed(1) + '%';
  fc.hidden = !c;
  fc.style.left = ((1 - FIGHT.clean) * 50).toFixed(1) + '%';
  fc.style.width = (FIGHT.clean * 100).toFixed(1) + '%';
  UI.fight.ft.style.left = '0%';
  UI.fight.ft.classList.remove('back');
  UI.fight.fuse.style.transform = '';
  if (G.speed > 1) G.speed = 1;
  audio.blip('click');
}
function fightTick(dtReal) {
  const f = UI.fight;
  if (!f) return;
  if (f.res) {
    f.rt -= dtReal;
    if (f.rt <= 0) closeFight();
    return;
  }
  f.t += dtReal;
  if (!f.go) {
    if (f.t < FIGHT.grace) return; // the tracker holds still while the panel comes up
    f.go = true;
    $('#fight').classList.remove('ready');
  }
  f.pos += f.dir * f.sp * dtReal;
  if (f.pos > 1) {
    f.pos = 2 - f.pos;
    f.dir = -1;
    f.ft.classList.add('back');
  } else if (f.pos < 0) {
    f.pos = -f.pos;
    f.dir = 1;
    f.ft.classList.remove('back');
  }
  f.ft.style.left = (f.pos * 100).toFixed(2) + '%';
  const left = 1 - (f.t - FIGHT.grace) / FIGHT.timeout; // the fuse under the bar
  f.fuse.style.transform = 'scaleX(' + Math.max(0, left).toFixed(3) + ')';
  if (left < 0.3 && !f.late) {
    f.late = true;
    $('#fight').classList.add('late');
  }
  if (left <= 0) strike(true); // freezing up counts as a miss
}
function strike(froze) {
  const f = UI.fight;
  if (!f || f.res || (!f.go && !froze)) return; // too soon: the panel is still coming up
  const on = !froze && f.pos >= f.a && f.pos <= f.b;
  f.res = on ? 'hit' : 'miss';
  f.clean = on && f.pos >= f.c0 && f.pos <= f.c1 && f.c1 > f.c0;
  f.rt = f.clean ? 0.95 : 0.8;
  const el = $('#fight'),
    tf = f.n.trueForm;
  el.classList.remove('ready', 'late', 'lunge');
  el.classList.add(f.res);
  if (f.clean) el.classList.add('clean');
  const fm = el.querySelector('.fm');
  fm.style.left = (f.pos * 100).toFixed(2) + '%';
  el.querySelector('.fres').textContent = f.clean ? 'Clean hit' : on ? 'Hit' : 'Miss';
  // why it went wide, so the next one can be better: still coming up to the green, or already past it
  const early = f.dir > 0 ? f.pos < f.a : f.pos > f.b;
  el.querySelector('.fsub').textContent = on
    ? f.clean && tf && tf.hp > 1
      ? 'It’s down · hit it again'
      : ''
    : froze
      ? 'You froze'
      : early
        ? 'Too early'
        : 'Too late';
  const hp = el.querySelector('.fhp');
  if (on && tf && hp) {
    const pips = hp.querySelectorAll('i:not(.off)');
    if (pips.length) pips[pips.length - 1].classList.add('off', 'gone');
  }
  if (on) {
    R.pulse = f.clean ? 0.9 : 0.6;
    audio.hx('thud', 0, f.clean ? 1 : 0.8);
    if (f.clean) audio.hx('crack', 0, 0.9);
  } else audio.sting('awkward');
}
function closeFight() {
  const f = UI.fight;
  UI.fight = null;
  $('#fight').hidden = true;
  if (f) fightOutcome(f.n, f.res === 'hit', f.clean);
}
// push someone a step away from someone else
function knockBack(c, from, dist) {
  const dx = c.x - from.x,
    dz = c.z - from.z,
    l = Math.hypot(dx, dz) || 1;
  for (let k = dist; k > 0.2; k -= 0.3) {
    const x = c.x + (dx / l) * k,
      z = c.z + (dz / l) * k;
    if (walkable(Math.floor(x), Math.floor(z), c)) {
      c.x = x;
      c.z = z;
      break;
    }
  }
  c.path = null;
  c.moving = false;
}
function fightOutcome(n, hit, clean) {
  if (G.over || n.surrendered || n.slain) return;
  if (G.loose && n.thrall) return looseHitHelper(n, hit);
  addStress(hit ? 2 : 5);
  G.fights = (G.fights || 0) + 1;
  const ear = earshot(n).filter((w) => w !== n && !w.isThem);
  const tf = n.trueForm;
  if (tf) {
    UI.fightCd = R.time + (hit ? 1.8 : 1.3);
    if (hit) {
      tf.hp--;
      gesture(n, 'flinch', 0.5);
      if (tf.hp <= 0) {
        if (G.loose) return looseKill(n); // nobody gives up on Friday
        if (tf.guard) witnessSaved(tf.guard);
        if (tf.private && !tf.witChange && !tf.public) return privateKill(n);
        return surrender(n, 'beaten');
      }
      if (tf.mode === 'flee' && n.fleeing) {
        hardReset(n);
        n.fleeing = null;
        tf.wounded = true;
        tf.stunUntil = G.t + 2.6;
        knockBack(n, PLAYER, 0.7);
        ui.float(n, '−1', 'good');
        n.tell.lunge = false;
        audio.hx('thud', 0, 0.8);
        return;
      } // brought down from behind: it's on the ground a moment
      tf.wounded = true;
      n.tell.lunge = false;
      if (tf.mode !== 'trapped') knockBack(n, PLAYER, 1.4);
      ui.float(n, '−1', 'good');
      if (clean && tf.mode !== 'trapped') {
        // dead center: it goes down where it lands, and it isn't running anywhere. Get to it before it gets up.
        tf.mode = 'attack';
        tf.lastSeen = G.t;
        tf.t0 = Math.max(tf.t0, G.t - 6);
        tf.stunUntil = G.t + FIGHT.down;
        return;
      }
      // hurt and not cornered: it may break and run. Chase it down.
      if (tf.mode !== 'trapped' && !tf.cornered && tf.hp === 1 && chance(G.faction === 'lizards' ? 0.7 : 0.55)) {
        tf.mode = 'flee';
        flee(n);
        ui.note('fist', 'It’s hurt. It’s running.', 'onto');
      } else if (tf.mode !== 'trapped') {
        tf.mode = 'attack';
        tf.lastSeen = G.t;
        tf.t0 = Math.max(tf.t0, G.t - 6);
      }
    } else {
      if (!tf.private && !G.loose && crowdHelp(n) && chance(EVIDENCE.fight.crowdSave)) {
        // somebody pulls it off you
        const w = pick(earshot(n).filter((x) => x !== n && !x.isThem && !x.def.stranger));
        if (w) ui.say(w, pick(['Get OFF them!', 'Not on my street!', 'Leave them ALONE!']), 2.2);
        knockBack(n, PLAYER, 1.2);
        return;
      }
      const blow = (HURT[G.faction] || 18) * (G.loose ? 1.2 : tf.private ? EVIDENCE.fight.privateBlow : 1);
      swing(n, Math.round(blow), true); // it gets you
      if (!G.over) knockBack(PLAYER, n, 0.9);
    }
    return;
  }
  UI.fightCd = R.time + 3;
  if (ear.length) protectAfter(n);
  echo('fight', { x: n.x, z: n.z, who: n.id });
  if (n.isThem) {
    // a hit is a test. At night, alone with you, or late in THEIR week, it drops the mask and fights you for real.
    const H = EVIDENCE.hit;
    if (hit && (darkNow() || !ear.length || theirDay() >= H.day)) {
      n.cfOk = G.t;
      if (trueForm(n, 'hit', 'attack')) {
        privateFight(n);
        return;
      }
    }
    if (hit) {
      // by day, with people about, early on: it plays the victim
      for (const w of ear) addSus(w, H.sus);
      ui.say(n, pick(['Somebody help!', 'Get OFF me!', 'Are you insane?']), 2.2);
      if (ear.some((w) => !w.def.stranger || w.def.officer)) caution(n, 'assault');
      bookAware(EVIDENCE.aware.hitNoChange);
      flee(n);
      return;
    }
    for (const w of ear) addSus(w, 10);
    if (n.exposed || caseSize(n) >= 3 || chance(0.5)) {
      ui.say(n, pick(['Get OFF me.', 'Out of my way.']), 2);
      flee(n);
    } else ridicule(n);
    return;
  }
  // a normal person: hit or miss, it was still an assault
  for (const w of ear) addSus(w, 25);
  addSus(n, 40);
  n.rel -= 25;
  caution(n, 'assault');
  if (G.assaulted.length >= 3) return;
  if (hit) {
    hardReset(n);
    n.fleeing = null;
    enqueue(
      n,
      waitAct({
        label: 'Down',
        dur: 2,
        anim: 'stare',
        interruptible: false,
        onStart: (c) => (c.pose = 'floorlie'),
        onEnd: (c) => {
          c.pose = 'stand';
          if (!G.over) flee(c);
        },
      }),
    );
  } else if ((G.traits[n.id] || {}).temper === 'aggressive') swing(n, HURT.punch, false);
  else flee(n);
}
// people in earshot of you: the same room, or within 6 tiles
function earshot(except) {
  const P = PLAYER,
    rp = roomAt(P.x, P.z);
  return CHARS.filter(
    (n) =>
      n !== except &&
      !n.isPlayer &&
      n.onMap &&
      !n.exposed &&
      !asleep(n) &&
      ((rp && roomAt(n.x, n.z) === rp) ||
        (Math.hypot(n.x - P.x, n.z - P.z) <= 6 &&
          losClear(Math.floor(n.x), Math.floor(n.z), Math.floor(P.x), Math.floor(P.z)))),
  );
}
// how they see you, said out loud
function viewLine(n) {
  const v = n.sus;
  if (v < 25) return pick(['Good to see you.', 'Oh, hi.', 'Morning.']);
  if (v < 60) return pick(['You look a bit off today.', 'You okay? You look tired.']);
  if (v < 85) return pick(['People are talking about you.', 'Everyone’s saying things. About you.']);
  return pick(['Stay away from me.', 'Don’t come any closer.']);
}
// once a game minute or so: who is looking at you, and what they make of it
function perceptionTick(dt) {
  G.percT = (G.percT || 0) + dt;
  if (G.percT < 2) return;
  const step = G.percT;
  G.percT = 0;
  const P = PLAYER;
  for (const n of suspects()) {
    if (n.exposed || n.trueForm) continue;
    if (
      canPanic(n) &&
      P.onMap &&
      n.moving &&
      P.moving &&
      Math.hypot(n.x - P.x, n.z - P.z) < 3.5 &&
      seesSpot(n, P.x, P.z, 4)
    ) {
      n.followT = (n.followT || 0) + step;
      if (n.followT > 1.5) addDanger(n, 5 * step);
    } else n.followT = 0;
    if (!n.onMap || !npcSeesPlayer(n, 12)) n.danger = Math.max(dangerFloor(n), n.danger - (3 * step) / 60);
  }
  const prm = roomAt(P.x, P.z);
  for (const n of suspects()) {
    const r = n.onMap && roomAt(n.x, n.z);
    if (
      !P.onMap ||
      !r ||
      !(r.house || r.agnes) ||
      prm === r ||
      n.exposed ||
      asleep(n) ||
      visAt(n.x, n.z) < 0.5 ||
      n.shown < 0.5 ||
      Math.hypot(n.x - P.x, n.z - P.z) > 10
    ) {
      n.peepT = Math.max(0, (n.peepT || 0) - step);
      continue;
    }
    n.peepT = (n.peepT || 0) + step;
    if (n.peepT > 20 && chance(0.35)) {
      n.peepT = 0;
      ui.bubble(n, 'exclaim', 'speech', 2.5);
      addSus(n, 8);
      if (n.isThem) {
        book(n).peep = (book(n).peep || 0) + 1;
        addDanger(n, 15);
      }
      ui.note('eye', n.short + ' saw you at the window', 'bad');
    }
  }
  for (const n of CHARS) {
    if (n.isPlayer || !n.onMap || n.def.stranger || n.exposed || n.engaged === P || !npcSeesPlayer(n, 9)) continue;
    if (G.inv.foilOn) addSus(n, (6 * step) / 60); // the hat: everyone who sees it grows suspicious
    const d = Math.hypot(n.x - P.x, n.z - P.z);
    if (d < 3.2 && n.sus >= 25 && n.remarkDay !== dayNo() && !n.tell && n.id !== 'lenny' && !asleep(n)) {
      n.remarkDay = dayNo();
      ui.say(n, viewLine(n), 3);
      if (n.sus >= 85) addStress(2);
    }
  }
}
// at 06:00: three or more ordinary people at 60+ means Mom calls and a clinic letter comes; a second morning, the medics
function clinicCheck() {
  const worried = suspects().filter((n) => !n.isThem && !n.exposed && !n.gone && n.sus >= 60);
  if (worried.length + worried.filter((n) => bought(n) > 1).length < 3) {
    G.clinicDay = 0;
    return;
  }
  if (G.clinicDay && G.clinicDay === dayNo() - 1) return gameOver('committed');
  G.clinicDay = dayNo();
  addStress(8);
  setTimeout(() => {
    ui.note('phone', 'Mom called. People phoned her.', 'bad');
    audio.blip('ring');
  }, 900);
  setTimeout(() => ui.note('mail', 'A letter from Wexley Clinic', 'bad'), 3200);
}
// a kill nobody saw: nothing is proven, nobody thanks you, and THEY come for you for the next two nights
function privateKill(n) {
  killMember(n, 'killed');
  bookAware(EVIDENCE.aware.privateKill);
  G.huntNights = Math.max(G.huntNights || 0, EVIDENCE.huntedNights);
  setTimeout(() => {
    if (!G.over) ui.note('eye', 'Nobody saw. THEY will want to know who did it.', 'bad');
  }, 2400);
}
