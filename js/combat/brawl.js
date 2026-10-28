//@ combat/brawl — Hitting people: the count, onlookers, the police call, out cold
//@ Defines: brawlOf, struck, onlook, policeFor, callPolice, victimReacts, fightsBack, themSheds, knockCold
//@ Uses:    data/tuning, sim/core, core/util, ui/interface, town/suspicion, combat/melee, them/awareness, sim/actions, data/lines, town/fleeing, …
//@ (header made by tools/map.js; stripped by build.py)
// ───────────── hitting people. Anyone can be hit, and a scuffle most of the town lets go. Keep at it and it's a
// beating: BRAWL.hard blows on the same person and somebody calls the police, BRAWL.ko and they're out cold.
// Onlookers make up their own minds, once a fight: some egg you on, some back off, a few call it in anyway.
// One of THEM in its own skin mostly keeps it on: it hits back or runs, and drops the face only when it's alone with
// you or knows you've got it pinned.

// your fight with n: a fresh one once nobody has hit them for a while. Not saved: a loaded game starts every count again.
function brawlOf(n) {
  if (!n.brawl || G.t - n.brawl.t > BRAWL.forget) n.brawl = { hits: 0, t: G.t, called: false, react: null, seen: {} };
  return n.brawl;
}
// your swing landed on someone in their own skin (never a true form: fightOutcome deals with those)
function struck(n) {
  const F = brawlOf(n),
    ear = earshot(n),
    first = !F.hits;
  F.hits++;
  F.t = G.t;
  gesture(n, 'flinch', 0.5);
  audio.hx('thud', hxPan(n.x, n.z), 0.6);
  ui.float(n, F.hits + '', '');
  addSus(n, first ? 40 : 10);
  n.rel -= first ? 25 : 8;
  if (first || F.hits === BRAWL.hard) echo('fight', { x: n.x, z: n.z, who: n.id });
  if (first && ear.length) protectAfter(n);
  for (const w of ear) onlook(w, n, F);
  if (F.hits >= BRAWL.ko) {
    if (!F.called) policeFor(n, F, ear, true);
    return knockCold(n);
  }
  if (n.isThem && (first || F.hits === BRAWL.hard) && themSheds(n, ear)) return;
  victimReacts(n, F, first);
  if (F.hits >= BRAWL.hard && !F.called) policeFor(n, F, ear);
  if (F.hits === BRAWL.ko - 1) confess(n, true); // one more and they're out: what comes out now is the truth
}
// someone who saw it: the first blow they see, they decide what they make of it; after that it only adds up
function onlook(w, n, F) {
  if (F.seen[w.id]) return addSus(w, 3);
  F.seen[w.id] = 1;
  if (w.def.officer) return policeSaw(w);
  if (w.def.fbi || w.surrendered || w.trueForm || w.fleeing) return;
  const T = w.isThem ? 'them' : w.def.stranger || !temper(w) ? 'stranger' : temper(w);
  const run = { timid: 0.6, stranger: 0.35, mocker: 0.15, aggressive: 0.05, them: 0.2 }[T],
    cheer = { timid: 0.05, stranger: 0.3, mocker: 0.5, aggressive: 0.55, them: 0.15 }[T];
  const r = Math.random();
  if (r < run) {
    addSus(w, 12);
    ui.say(w, pick(BRAWL_SCARED), 2.2);
    flee(w);
  } else if (r < run + cheer) {
    addSus(w, 5);
    ui.say(w, pick(BRAWL_CHEER), 2.2);
    ui.bubble(w, 'laugh', 'speech', 2);
  } else {
    addSus(w, 12);
    ui.bubble(w, 'exclaim', 'speech', 1.8);
  }
  // nine in ten let a scuffle go
  if (!F.called && F.hits < BRAWL.hard && chance(BRAWL.callSoft)) callPolice(w, n, F);
}
// it's gone hard: the victim calls it in, unless they're the brave sort or one of THEM; else whoever saw
function policeFor(n, F, ear, out) {
  if (!out && !n.isThem && !n.def.officer && temper(n) !== 'aggressive') return callPolice(n, n, F);
  const by = ear.filter((w) => w !== n && !w.def.officer && !w.def.fbi && !w.trueForm && !w.surrendered);
  if (by.length) callPolice(pick(by), n, F);
}
function callPolice(by, n, F) {
  F.called = true;
  ui.bubble(by, 'exclaim', 'speech', 2.5);
  ui.say(by, pick(BRAWL_CALL), 3);
  if (by !== n && !by.fleeing) {
    hardReset(by);
    enqueue(
      by,
      waitAct({
        label: 'Calling the police',
        dur: 4,
        anim: 'phone',
        interruptible: false,
        onStart: (c) => (c.tdir = Math.atan2(c.x - PLAYER.x, c.z - PLAYER.z)), // turned away, a hand over the phone
      }),
    );
  }
  setTimeout(() => {
    if (!G.over) ui.note('badge', (by.def.stranger ? 'Someone' : by.short) + ' called the police', 'bad');
  }, 600);
  if (!G.policeAt) G.policeAt = G.t + rand(BRAWL.copIn[0], BRAWL.copIn[1]);
  caution(n, 'assault');
}
// what the one you hit does: the same as anyone, by temper. They pick once a fight and stick to it.
function victimReacts(n, F, first) {
  const a = n.queue[0];
  if (F.react === 'fight' && a && (a.chase === PLAYER || a.anim === 'punch')) return knockBack(n, PLAYER, 0.4); // still at it
  if (F.react === 'cower' && a && a.label === 'Cowering') {
    knockBack(n, PLAYER, 0.3);
    a.t = 0; // curled up tighter, and longer
    return;
  }
  hardReset(n);
  n.fleeing = null;
  knockBack(n, PLAYER, 0.6);
  if (!F.react) F.react = fightsBack(n) ? 'fight' : 'flee';
  if (F.react === 'fight') return hitBack(n);
  if (F.react === 'cower') return giveUp(n);
  if (n.isThem && first) {
    // it plays the victim, loudly, and runs somewhere it can be alone
    for (const w of earshot(n)) if (!w.isThem) addSus(w, EVIDENCE.hit.sus);
    bookAware(EVIDENCE.aware.hitNoChange);
  }
  ui.say(n, pick(BRAWL_HELP), 2.2);
  flee(n);
}
function fightsBack(n) {
  const T = temper(n);
  if (T === 'aggressive') return chance(n.isThem ? 0.7 : 0.9);
  if (T === 'mocker') return chance(0.4);
  if (T === 'careful') return chance(0.2);
  if (T === 'timid') return chance(0.05);
  return chance(BRAWL.strangerFight);
}
// one of THEM, hit: the face comes off only alone with you or once it knows you've got it, and rarely even then.
// Off, it fights you (the brave ones, mostly) or runs off in its true shape.
function themSheds(n, ear) {
  if (n.trueForm || n.slain) return false;
  const alone = !ear.some((w) => w !== n && !w.isThem),
    pin = pinned(n);
  if (!n.exposed && !((alone || pin) && chance(alone && pin ? BRAWL.shedBoth : BRAWL.shed))) return false;
  const fight = n.exposed || chance(temper(n) === 'aggressive' ? 0.75 : 0.4);
  n.cfOk = G.t;
  if (!trueForm(n, 'hit', fight ? 'attack' : 'flee')) return false;
  if (fight) privateFight(n);
  return true;
}
// six blows: on the ground and not getting up for a good while. Then up, and away from you.
function knockCold(n) {
  hardReset(n);
  n.fleeing = null;
  n.ko = true;
  teleEnd(n);
  knockBack(n, PLAYER, 0.5);
  audio.hx('crack', hxPan(n.x, n.z), 0.8);
  ui.float(n, 'Out cold', 'bad');
  if (n.isThem) {
    bookAware(EVIDENCE.aware.hitNoChange);
    addDanger(n, 30);
  }
  enqueue(
    n,
    waitAct({
      label: 'Out cold',
      dur: rand(BRAWL.koMins[0], BRAWL.koMins[1]),
      anim: 'stare',
      interruptible: false,
      onStart: (c) => (c.pose = 'floorlie'),
      onEnd: (c) => {
        c.pose = 'stand';
        c.ko = false;
        c.brawl = null;
        if (!G.over && c.onMap) flee(c);
      },
    }),
  );
}
