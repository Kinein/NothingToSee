//@ combat/timing-bar — THEIR attack: the timing bar
//@ Defines: openFight, fightTick, strike, closeFight, knockBack, fightOutcome, earshot, viewLine, perceptionTick, clinicCheck
//@ Uses:    sim/core, ui/interface, town/suspicion, core/util, audio/sound, town/fleeing, data/tuning, world/grid, gfx/renderer, player/needs, …
//@ (header made by tools/map.js; stripped by build.py)
// ───────────── the one hit: a tracker sweeps a red bar; land it in the green
// the picture on the fight panel: one of THEM in its true form. The picture is the same every time (a witness
// snapshot carries no date), so it's drawn once per person per game, ahead of time (warmLater in trueForm), and
// cached under this same key: `at: 0` instead of the change's start time, so the second fight with the same
// one doesn't redraw it either.
const fightSnapRec = () => ({ type: 'true', how: 'witness', at: 0, t: 2, pose: 'stand' });
function openFight(n, lunge) {
  if (UI.fight || G.over || !n.onMap || !PLAYER.onMap || ARREST.on) return;
  const tf = n.trueForm;
  let [g, sp] = FIGHT_DIFF[tf ? G.faction : n.isThem ? 'them' : 'normal'];
  if (PLAYER.needs.stress >= 80) g *= 2 / 3; // breaking: fight power −30%
  if (PLAYER.needs.energy < 30) sp *= 1.2;
  if (G.inv.crowbar) g *= 1.3; // something heavy in your hand
  if (tf && tf.mode === 'trapped') {
    g *= 1.5;
    sp *= 0.8;
  } else if (tf && tf.wounded) g *= 1.12;
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
  const a = rand(0.06, 0.94 - g);
  UI.fight = { n, a, b: a + g, sp, pos: 0, dir: 1, t: 0, res: null, rt: 0 };
  closeMenu();
  const el = $('#fight');
  el.className = 'overlay';
  el.hidden = false;
  el.querySelector('img').src = tf ? snapImage(n, fightSnapRec(n)) : getPortrait(n);
  el.querySelector('.fres').textContent = lunge ? 'It lunges' : '';
  let hp = el.querySelector('.fhp');
  if (!hp) {
    hp = document.createElement('span');
    hp.className = 'fhp';
    el.querySelector('.fhead').appendChild(hp);
  }
  hp.innerHTML = tf
    ? Array.from(
        { length: Math.max(tf.maxHp || 0, FOE_HP[G.faction] || 3) },
        (_, i) => '<i class="' + (i < tf.hp ? '' : 'off') + '"></i>',
      ).join('')
    : '';
  hp.dataset.tip = tf ? 'How much fight it has left' : '';
  const fg = el.querySelector('.fg');
  fg.style.left = (a * 100).toFixed(1) + '%';
  fg.style.width = (g * 100).toFixed(1) + '%';
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
  f.pos += f.dir * f.sp * dtReal;
  if (f.pos > 1) {
    f.pos = 2 - f.pos;
    f.dir = -1;
  } else if (f.pos < 0) {
    f.pos = -f.pos;
    f.dir = 1;
  }
  $('#fight .ft').style.left = (f.pos * 100).toFixed(2) + '%';
  if (f.t > 6) strike(); // freezing up counts as a miss
}
function strike() {
  const f = UI.fight;
  if (!f || f.res) return;
  f.res = f.pos >= f.a && f.pos <= f.b ? 'hit' : 'miss';
  f.rt = 0.75;
  const el = $('#fight');
  el.classList.add(f.res);
  el.querySelector('.fres').textContent = f.res === 'hit' ? 'Hit' : 'Miss';
  const tf = f.n.trueForm,
    hp = el.querySelector('.fhp');
  if (f.res === 'hit' && tf && hp) {
    const pips = hp.querySelectorAll('i:not(.off)');
    if (pips.length) pips[pips.length - 1].classList.add('off');
  }
  if (f.res === 'hit') {
    R.pulse = 0.6;
    audio.sting('caught');
  } else audio.sting('awkward');
}
function closeFight() {
  const f = UI.fight;
  UI.fight = null;
  $('#fight').hidden = true;
  if (f) fightOutcome(f.n, f.res === 'hit');
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
function fightOutcome(n, hit) {
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
      if (tf.hp <= 0) return G.loose ? looseKill(n) : surrender(n, 'beaten'); // nobody gives up on Friday
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
      swing(n, Math.round((HURT[G.faction] || 18) * (G.loose ? 1.2 : 1)), true); // it gets you
      if (!G.over) knockBack(PLAYER, n, 0.9);
    }
    return;
  }
  UI.fightCd = R.time + 3;
  if (ear.length) protectAfter(n);
  echo('fight', { x: n.x, z: n.z, who: n.id });
  if (n.isThem) {
    if (hit && trueForm(n, 'hit', 'attack')) return; // the disguise drops, and it fights back (only when it may: see mayShed)
    if (hit) {
      for (const w of ear) addSus(w, 15);
      ui.say(n, pick(['Get OFF me!', 'Are you insane?', 'Somebody help!']), 2.2);
      flee(n);
      return;
    } // too early, too light: it takes it like a person would
    for (const w of ear) addSus(w, 10);
    if (n.exposed || n.evidence >= 60 || chance(0.5)) {
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
