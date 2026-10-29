//@ combat/melee — Blows out in the street: THEIR telegraphed strikes, yours, people punching
//@ Defines: privateFight, teleSet, teleEnd, lungeChar, foeWind, foeCalm, foeMelee, foeStrike, punchAct, brawl, knockBack, fightOutcome, earshot, viewLine, perceptionTick, clinicCheck, …
//@ Uses:    sim/core, data/tuning, ui/interface, core/util, town/suspicion, input/camera, audio/sound, world/grid, town/arrest, horror/layer, …
//@ (header made by tools/map.js; stripped by build.py)
// ───────────── blows, out in the street. Nothing stops for a fight: Space swings, and your feet do the dodging.
// THEIR blow is shown before it comes: a red patch on the ground where it will land, darkening as it winds up. Be out of
// the patch when it lands. A blow that hits air leaves it standing there open, and a hit then knocks it flat.
// the picture of one of THEM in its true form (the confrontation shows it, held in your trap). The same every time,
// so it's drawn once per person per game, ahead of time (warmLater in trueForm), and cached under this same key.
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
// the red patch: where a blow will land, and (with `dur`) how long until it does
function teleSet(c, x, z, r, dur) {
  const T = c.tele || (c.tele = { at: 0, end: 0, x: 0, z: 0, r: 0 });
  if (dur != null) {
    T.at = G.t;
    T.end = G.t + dur;
  }
  T.x = x;
  T.z = z;
  T.r = r;
}
function teleEnd(c) {
  if (c.tele) c.tele.end = 0;
}
// thrown forward (a lunge, a creep): as far as the floor lets it, and never through you
function lungeChar(c, sx, sz, len) {
  for (let s = 0; s < len - 1e-6; s += 0.1) {
    const k = Math.min(0.1, len - s),
      x = c.x + sx * k,
      z = c.z + sz * k;
    if (!walkable(Math.floor(x), Math.floor(z), c) || Math.hypot(PLAYER.x - x, PLAYER.z - z) < 0.45) break;
    c.x = x;
    c.z = z;
  }
}
// its warning: quicker alone with you, slower held in a trap, quicker on Friday the more of THEM are near
function foeWind(n) {
  const tf = n.trueForm,
    F = EVIDENCE.fight;
  let w = MELEE.wind[G.faction] || 1;
  if (tf.mode === 'trapped') w *= F.trapWind;
  if (tf.private && !G.loose) w *= F.privateWind;
  if (G.loose) {
    const pack = CHARS.filter(
      (o) => o !== n && o.trueForm && o.onMap && !o.slain && Math.hypot(o.x - PLAYER.x, o.z - PLAYER.z) < 5,
    ).length;
    w *= Math.pow(0.9, G.loose.kills || 0) * Math.pow(0.92, pack);
  }
  return Math.max(0.45, w);
}
// out of the fight (it ran, it was knocked out of it): arms down, no patch
function foeCalm(n) {
  const tf = n.trueForm;
  if (tf) tf.atk = null;
  if (n.tell) n.tell.wind = n.tell.lunge = false;
  teleEnd(n);
}
// up close, every sim step: wind up, lunge, stand. True while it's busy with a blow: nothing else moves it then.
// `held`: in your trap, it can't lunge, only lash out where it is.
function foeMelee(n, d, dt, held) {
  const tf = n.trueForm,
    P = PLAYER;
  let A = tf.atk;
  if (A && G.t - A.seen > 1) {
    foeCalm(n); // not seen to for a while: whatever it was doing, it's over
    A = null;
  }
  if (A) {
    A.seen = G.t;
    A.t += dt;
    n.path = null;
    n.moving = false;
    if (A.ph === 'wind') {
      if (A.t < A.dur * 0.7) A.dir = Math.atan2(P.x - n.x, P.z - n.z); // it follows you round, then commits
      n.tdir = A.dir;
      const sx = Math.sin(A.dir),
        sz = Math.cos(A.dir);
      if (!held && d > 0.9) lungeChar(n, sx, sz, WALK * MELEE.creep * dt);
      const L = held ? 0.45 : MELEE.lunge;
      teleSet(n, n.x + sx * L, n.z + sz * L, MELEE.reach);
      if (A.t >= A.dur) foeStrike(n, A, held);
      return true;
    }
    if (A.t > 0.4) n.tell.lunge = false;
    if (A.t < A.dur) return true;
    tf.atk = null;
    return false;
  }
  if (d > MELEE.engage || !P.onMap || G.away || ARREST.on) return false;
  if (tf.mode === 'trapped' && !tf.trapHit) {
    tf.trapHit = true;
    tf.hp = Math.max(1, tf.hp + EVIDENCE.fight.trapHp); // caught fast: it's already hurt
  }
  if (!tf.private && !G.loose && !tf.crowdHit && tf.mode !== 'trapped' && crowdHelp(n)) {
    tf.crowdHit = true; // the crowd gets one in first
    tf.hp = Math.max(1, tf.hp - 1);
    const w = pick(earshot(n).filter((x) => x !== n && !x.isThem && !x.def.stranger));
    if (w) ui.say(w, pick(['Get it!', 'NOW!', 'Hold it down!']), 2);
    gesture(n, 'flinch', 0.5);
  }
  const dur = foeWind(n);
  tf.atk = { ph: 'wind', t: 0, dur, dir: Math.atan2(P.x - n.x, P.z - n.z), seen: G.t, open: false };
  teleSet(n, n.x, n.z, MELEE.reach, dur);
  n.tell.wind = true;
  n.tell.lunge = false;
  ui.bubble(n, 'exclaim', 'speech', 1.2);
  audio.hx('hiss', hxPan(n.x, n.z), 0.55);
  if (G.speed > 1) G.speed = 1;
  return true;
}
// the blow itself: it throws itself at the patch, and whoever is still in it gets hit
function foeStrike(n, A, held) {
  const tf = n.trueForm,
    P = PLAYER,
    T = n.tele;
  n.tell.wind = false;
  n.tell.lunge = true;
  if (!held) lungeChar(n, Math.sin(A.dir), Math.cos(A.dir), MELEE.lunge);
  teleEnd(n);
  audio.hx('whoosh', hxPan(n.x, n.z), 0.7);
  A.ph = 'rec';
  A.t = 0;
  if (!P.onMap || G.away || Math.hypot(P.x - T.x, P.z - T.z) >= T.r) {
    // it hit air, and it's standing there open
    A.dur = MELEE.open;
    A.open = true;
    if (P.onMap && Math.hypot(P.x - n.x, P.z - n.z) < 4) ui.float(P, 'Dodged', 'good');
    return;
  }
  A.dur = MELEE.rec;
  if (!tf.private && !G.loose && crowdHelp(n) && chance(EVIDENCE.fight.crowdSave)) {
    // somebody pulls it off you
    const w = pick(earshot(n).filter((x) => x !== n && !x.isThem && !x.def.stranger));
    if (w) ui.say(w, pick(['Get OFF them!', 'Not on my street!', 'Leave them ALONE!']), 2.2);
    knockBack(n, P, 1.2);
    return;
  }
  const blow = (HURT[G.faction] || 18) * (G.loose ? 1.2 : tf.private ? EVIDENCE.fight.privateBlow : 1);
  psyMark('fight');
  G.lastHitBy = n.id; // an id, never the person: G is saved whole
  ui.bubble(n, 'exclaim', 'speech', 1.4);
  hurt(Math.round(blow), true);
  if (!G.over && P.onMap) knockBack(P, n, 0.9);
}
// a person's punch: the fist drawn back where you can see it, then thrown. Step back out of it. `again` runs on a miss.
function punchAct(dmg, byThem, again) {
  const wind = MELEE.punch,
    P = PLAYER;
  return mkAct({
    kind: 'wait',
    label: 'Fight',
    icon: 'fist',
    dur: wind / 0.56, // the punch keyframes land at .56
    anim: 'punch',
    interruptible: false,
    onStart: (c, a) => {
      a.dir = Math.atan2(P.x - c.x, P.z - c.z);
      ui.bubble(c, 'exclaim', 'speech', 1.2);
      teleSet(c, c.x, c.z, MELEE.punchReach, wind);
    },
    onTick: (c, a) => {
      if (a.landed) return;
      if (a.t < wind * 0.7) a.dir = Math.atan2(P.x - c.x, P.z - c.z);
      c.tdir = a.dir;
      const sx = Math.sin(a.dir),
        sz = Math.cos(a.dir);
      teleSet(c, c.x + sx * 0.75, c.z + sz * 0.75, MELEE.punchReach);
      if (a.t < wind) return;
      a.landed = true;
      const T = c.tele;
      teleEnd(c);
      lungeChar(c, sx, sz, 0.3);
      audio.hx('whoosh', hxPan(c.x, c.z), 0.45);
      if (P.onMap && !G.away && !ARREST.on && Math.hypot(P.x - T.x, P.z - T.z) < T.r) {
        G.lastHitBy = byThem ? c.id : null;
        hurt(dmg, byThem);
        if (!G.over && P.onMap) knockBack(P, c, 0.6);
        return;
      }
      if (P.onMap && Math.hypot(P.x - c.x, P.z - c.z) < 4) ui.float(P, 'Dodged', 'good');
      if (again) again(c);
    },
  });
}
// squaring up to you: run you down, swing, and if it missed, come again (a few times, then they've had enough)
function brawl(n, dmg, o) {
  let tries = MELEE.punchTries;
  const go = () =>
    enqueue(
      n,
      chaseAct(PLAYER, {
        label: o.label,
        giveUp: o.giveUp,
        onCatch: (c) => swing(c, dmg, !!o.byThem, () => --tries > 0 && go()),
      }),
    );
  go();
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
// your swing landed on n
function fightOutcome(n) {
  if (G.over || n.surrendered || n.slain) return;
  if (G.loose && n.thrall) return looseHitHelper(n, true);
  if (n.def.officer && !n.trueForm && !G.loose) {
    ui.say(n, pick(COP_HIT), 2.6);
    return arrestStart(n); // no warning for that
  }
  if (n.trueForm) psyMark('fight');
  G.fights = (G.fights || 0) + 1;
  const tf = n.trueForm;
  if (tf) {
    const open = !!(tf.atk && tf.atk.open); // caught standing there after it hit air
    tf.hp--;
    gesture(n, 'flinch', 0.5);
    foeCalm(n);
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
      audio.hx('thud', 0, 0.8);
      return;
    } // brought down from behind: it's on the ground a moment
    tf.wounded = true;
    tf.atk = { ph: 'rec', t: 0, dur: MELEE.stagger, seen: G.t, open: false };
    if (tf.mode !== 'trapped') knockBack(n, PLAYER, open ? 0.6 : 1.4);
    ui.float(n, '−1', 'good');
    if (open && tf.mode !== 'trapped') {
      // caught it open: it goes down where it stands, and it isn't running anywhere. Get to it before it gets up.
      tf.atk = null;
      tf.mode = 'attack';
      tf.lastSeen = G.t;
      tf.t0 = Math.max(tf.t0, G.t - 6);
      tf.stunUntil = G.t + MELEE.down;
      audio.hx('crack', 0, 0.8);
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
    return;
  }
  struck(n); // anyone else (combat/brawl)
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
    }
  }
}
// the ordinary people who think you're mad: 60+ suspicion of you. The evidence book counts them.
const thinkMad = () => suspects().filter((n) => !n.isThem && !n.exposed && !n.gone && n.sus >= 60);
// at 06:00: three of them means Mom calls and a clinic letter comes; still three the next morning, the medics
function clinicCheck() {
  if (thinkMad().length < 3) {
    G.clinicDay = 0;
    return;
  }
  if (G.clinicDay && G.clinicDay === dayNo() - 1) return gameOver('committed');
  G.clinicDay = dayNo();
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
