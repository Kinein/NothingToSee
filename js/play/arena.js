//@ play/arena — The confrontation: an arena battle in front of the town, and what it leaves on the map
//@ Defines: witnessOf, arenaRoom, openConfront, after, arenaTick, makeTestimony, testimony, nextStatement, letPass, spend, showCard, wrongPerson, backUp, makeClaims, knowBeat, callClaim, …
//@ Uses:    sim/core, data/tuning, ui/arena-view, core/util, data/lines, ui/interface, them/proofs, audio/sound, gfx/world-geometry, them/awareness, …
//@ (header made by tools/map.js; stripped by build.py)
// ───────────── the confrontation. A short battle, 45 to 75 seconds: THEY lie, you show the card that breaks the lie, and
// the crowd decides. You bring every card you hold on them; a card is never spent, it stays on the board. The town is
// paused throughout.
//   1 Opening · 2 Testimony: five statements, show a card or let it pass · 3 "How well do you know me?" · 4 Counterattack
//   · 5 Escape attempt (THEM only, the first time the lean reaches +3)
// The room sets where the crowd's lean starts (−3…+3); where it ends decides it (EVIDENCE.bands). The wrong person always fails.
// ── the room: who's in earshot, and which way each of them leans before a word is said
const theirsPerson = (w) => bought(w) || (G.control && G.control.who === w.id) || G.chipped[w.id] || w.marked;
const closeTo = (w, n) => (G.pairs[[w.id, n.id].sort().join('|')] || 0) >= EVIDENCE.start.closePairs;
// someone who saw THEIR act or a change in the last two days, and would say so with you in the room
function witnessOf(w, n) {
  if (!backs(w)) return false;
  if (sawRecently(w, n)) return true;
  return G.events.some(
    (e) =>
      e.who === n.id &&
      (e.k === 'bribe' || e.k === 'unmask' || e.k === 'trueform') &&
      e.seen.includes(w.id) &&
      G.t - e.t <= EVIDENCE.witnessDays * 1440,
  );
}
function arenaRoom(n) {
  const E = EVIDENCE.start,
    ear = earshot(n).filter((w) => w !== n && !w.trueForm && !w.fleeing && !w.hunter),
    mods = [],
    crowd = [];
  let lean = 0;
  const add = (v, why, w) => {
    lean += v;
    mods.push({ v, why, w: w ? w.id : null });
  };
  const theirs = [],
    wits = [],
    hidden = [];
  for (const w of ear) {
    crowd.push(w);
    if (w.isThem) {
      hidden.push(w); // shows nothing, unless you brought it along yourself
      if (G.follower && G.follower.id === w.id) add(E.bought, 'theirs', w);
      continue;
    }
    if (G.recant[w.id] && (sawRecently(w, n) || witnessOf(w, n) || G.recant[w.id] === 'bribed')) {
      add(E.bought, 'recant', w); // got to: they stay silent
      continue;
    }
    if (theirsPerson(w)) {
      add(E.bought, 'theirs', w);
      theirs.push(w);
      continue;
    }
    if (witnessOf(w, n)) {
      add(E.witness, 'witness', w);
      wits.push(w);
    }
    if (closeTo(w, n)) add(E.close, 'close', w);
  }
  const st = PLAYER.needs.stress;
  if (st > 80) add(E.psy20, 'unwell');
  else if (st > 60) add(E.psy40, 'unwell');
  if (G.madUntil > G.t) add(E.mad, 'mad');
  const trapped = !!(n.trueForm && n.trueForm.mode === 'trapped');
  if (trapped) add(E.trapped, 'trapped');
  return {
    ear,
    crowd: crowd.slice(0, 8),
    lean: clamp(lean, EVIDENCE.lean.startMin, EVIDENCE.lean.startMax),
    mods,
    theirs,
    wits,
    hidden,
    trapped,
  };
}
// ── starting it
function openConfront(n) {
  if (!n || !n.onMap || UI.cf || G.over) return;
  closeMenu();
  const room = arenaRoom(n);
  if (!room.ear.length) return ui.note('confront', 'Nobody here to hear it', '');
  cancelAll(PLAYER);
  const A = Object.assign(room, {
    n,
    isThem: !!n.isThem,
    hand: caseCards(n),
    spent: [],
    start: room.lean,
    beat: 'open',
    wait: 0,
    then: null,
    t: 0,
    tMax: 0,
    sel: 0,
    si: -1,
    stmts: [],
    claims: [],
    ki: -1,
    escTried: false,
    escaped: false,
    res: null,
    prev: G.speed,
    face: null,
  });
  UI.cf = A;
  G.speed = 0;
  n.tdir = Math.atan2(PLAYER.x - n.x, PLAYER.z - n.z);
  PLAYER.tdir = Math.atan2(n.x - PLAYER.x, n.z - PLAYER.z);
  addStress(3);
  arenaOpen(A);
  // Psychic 20 or less: you might never get as far as the cards
  if (PLAYER.needs.stress >= EVIDENCE.rant.stress && chance(EVIDENCE.rant.p)) {
    arenaSay(A, 'you', pick(ARENA_RANT));
    audio.sting('awkward');
    return after(A, 2.6, () => arenaEnd(A, 'fail'));
  }
  arenaSay(A, 'them', pick(ARENA_OPEN));
  audio.sting('murmur');
  after(A, 2.4, () => testimony(A, 0));
}
function after(A, secs, fn) {
  A.wait = secs;
  A.then = fn;
}
function arenaTick(dt) {
  const A = UI.cf;
  if (!A) return;
  if (A.bar) return arenaBarTick(A, dt);
  if (A.wait > 0) {
    A.wait -= dt;
    if (A.wait <= 0) {
      const f = A.then;
      A.then = null;
      if (f) f();
    }
    arenaTimer(A);
    return;
  }
  if (A.tMax > 0) {
    A.t -= dt;
    arenaTimer(A);
    if (A.t <= 0) {
      A.tMax = 0;
      if (A.beat === 'stmt') letPass(A);
      else if (A.beat === 'rebut') backUp(A, null);
      else if (A.beat === 'know') callClaim(A, null);
    }
  }
}
// ── 2. testimony: one line per frame, gaps first (a good liar attacks what you haven't got), one true line among them
function makeTestimony(A) {
  const held = new Set(A.hand.map((p) => p.frame)),
    frames = shuffle(FRAMES.slice()).sort((a, b) => held.has(a) - held.has(b));
  const st = frames.map((f) => ({ f, text: pick(ARENA_SAY[f]), lie: A.isThem }));
  if (A.isThem)
    for (const w of A.theirs.slice(0, 2))
      st.splice(st.findIndex((s) => s.f === 'contact') + 1, 0, {
        f: 'contact',
        text: pick(ARENA_LIE_BOUGHT).replace(/\{w\}/g, w.short),
        lie: true,
      });
  st.splice(irand(1, st.length), 0, { f: null, text: pick(ARENA_FILLER), lie: false });
  return st;
}
function testimony(A, i) {
  if (!A.stmts.length) A.stmts = makeTestimony(A);
  if (i >= A.stmts.length) return knowBeat(A, 0);
  A.beat = 'stmt';
  A.si = i;
  const s = A.stmts[i];
  arenaSay(A, 'them', s.text, s.f);
  A.t = A.tMax = A.hand.length ? EVIDENCE.statementSecs : EVIDENCE.idleSecs; // empty-handed: it goes by quickly
  arenaDraw(A);
}
function nextStatement(A) {
  A.beat = 'wait'; // an answer given: nothing more to press until the next line (a second card would land on this one)
  after(A, 1.7, () => checkEscape(A, () => testimony(A, A.si + 1)));
}
function letPass(A) {
  const s = A.stmts[A.si];
  if (s.lie) {
    move(A, EVIDENCE.move.pass, null, 'pass');
    arenaSay(A, 'them', pick(ARENA_PASS));
  }
  nextStatement(A);
}
// a card shown is out of your hand for this confrontation, and still on the board after it: cards are never spent
function spend(A, p) {
  A.hand.splice(A.hand.indexOf(p), 1);
  A.spent.push(p);
  A.sel = clamp(A.sel, 0, Math.max(0, A.hand.length - 1));
}
const realOn = (p, n) => p.true === n.id && !p.planted && !p.innocent;
function showCard(A, p) {
  if (!p) return;
  if (A.beat === 'rebut') return backUp(A, 'card', p);
  if (A.beat !== 'stmt') return;
  const s = A.stmts[A.si],
    n = A.n;
  A.tMax = 0;
  spend(A, p);
  arenaShow(A, p);
  if (!A.isThem) return wrongPerson(A, p);
  if (!s.lie) {
    move(A, EVIDENCE.move.onTruth, 'laugh', 'truth');
    arenaSay(A, 'them', pick(ARENA_TRUTH));
  } else if (p.frame !== s.f) {
    move(A, EVIDENCE.move.wrongLie, null, 'wrongLie');
    arenaSay(A, 'them', pick(ARENA_WRONG));
  } else if (!realOn(p, n)) {
    move(A, EVIDENCE.wrong.other, null, 'notMine');
    arenaSay(A, 'them', pick(ARENA_NOTMINE));
  } else if (p.q === 'clear') {
    move(A, EVIDENCE.move.clear, 'gasp', 'clear');
    arenaSay(A, 'them', pick(ARENA_CLEAR));
  } else {
    // fuzzy: THEY explain it away, unless you can back it up
    A.beat = 'rebut';
    A.rebut = p;
    arenaSay(A, 'them', pick(ARENA_REBUT));
    A.t = A.tMax = A.hand.length || habitFits(A) || A.wits.length ? EVIDENCE.rebuttalSecs : EVIDENCE.idleSecs;
    arenaDraw(A);
    return;
  }
  nextStatement(A);
}
// a human tells the truth: there's nothing to break, and now everyone knows their business
function wrongPerson(A, p) {
  const n = A.n;
  if (p.innocent && p.innocent === n.id) {
    move(A, EVIDENCE.wrong.innocent, null, 'innocent');
    arenaSay(A, 'them', pick(ARENA_INNOCENT).replace('{t}', oddTruth(n) || 'nothing'));
    if (G.odd[n.id]) G.odd[n.id].public = true;
  } else if (p.planted) {
    move(A, EVIDENCE.wrong.planted, null, 'planted');
    arenaSay(A, 'them', pick(ARENA_PLANTED));
    A.framed = true;
    const F = (G.framed || []).find((f) => f.id === n.id);
    if (F) F.known = true;
    for (const c of G.proofs.filter((x) => x.pin === n.id && x.planted)) flipCard(c, { what: 'planted' });
  } else {
    move(A, EVIDENCE.wrong.other, null, 'notMine');
    arenaSay(A, 'them', pick(ARENA_NOTMINE));
  }
  nextStatement(A);
}
// ── the rebuttal: back a fuzzy card with a second card (both spent), a habit you've watched, or a witness in the room
const habitFits = (A) => (A.rebut.frame === 'habit' || A.rebut.frame === 'body') && knownQ(A.n).length > 0;
function backUp(A, how, p) {
  if (A.beat !== 'rebut') return;
  A.tMax = 0;
  let ok = false;
  if (how === 'card' && p && p !== A.rebut) {
    spend(A, p);
    arenaShow(A, p);
    arenaSay(A, 'you', pick(ARENA_BACKED.card));
    ok = true;
  } else if (how === 'habit' && habitFits(A)) {
    arenaSay(A, 'you', pick(ARENA_BACKED.habit));
    ok = true;
  } else if (how === 'witness' && A.wits.length) {
    arenaSay(A, A.wits[0], pick(ARENA_BACKED.witness));
    ok = true;
  }
  A.rebut = null;
  A.beat = 'stmt';
  move(A, ok ? EVIDENCE.move.fuzzyBacked : EVIDENCE.move.fuzzyAlone, ok ? 'gasp' : null, ok ? 'backed' : 'alone');
  nextStatement(A);
}
// ── 3. "How well do you know me?": a claim about their routine, true or a lie. Watched it, and you know.
function makeClaims(A) {
  const n = A.n,
    mine = G.quirks[n.id] || [],
    known = knownQ(n),
    fit = Object.keys(QUIRKS).filter((q) => QUIRKS[q].who(n) && !mine.includes(q)),
    k = irand(EVIDENCE.know.claims[0], EVIDENCE.know.claims[1]),
    out = [];
  for (let i = 0; i < k; i++) {
    const lie = A.isThem && mine.length > 0 && (i === 0 ? chance(0.65) : !out[0] || !out[0].lie);
    const q = pick((lie ? mine : fit).filter((x) => !out.some((o) => o.q === x)));
    if (!q) continue;
    out.push({ q, lie, text: pick(ARENA_KNOW.lie).replace('{q}', QUIRKS[q].short), chip: known.includes(q) });
  }
  return out;
}
function knowBeat(A, i) {
  if (!i) A.claims = makeClaims(A);
  if (i >= A.claims.length) return counterBeat(A);
  A.beat = 'know';
  A.ki = i;
  arenaSay(A, 'them', A.claims[i].text);
  A.t = A.tMax = EVIDENCE.know.secs;
  arenaDraw(A);
}
function callClaim(A, saysLie) {
  if (A.beat !== 'know') return;
  A.tMax = 0;
  const c = A.claims[A.ki],
    right = saysLie != null && saysLie === c.lie;
  move(A, right ? EVIDENCE.know.right : EVIDENCE.know.wrong, right ? null : 'laugh', right ? 'knowRight' : 'knowWrong');
  arenaSay(A, 'you', saysLie == null ? '…' : saysLie ? 'That’s a lie.' : 'That’s true.');
  A.beat = 'wait';
  after(A, 1.6, () => checkEscape(A, () => knowBeat(A, A.ki + 1)));
}
// ── 4. counterattack: THEY turn it on you. A witness answers for you; or your nerve holds; or it doesn't.
function counterBeat(A) {
  A.beat = 'counter';
  arenaSay(A, 'them', pick(ARENA_COUNTER));
  arenaDraw(A);
  after(A, 2.4, () => {
    const C = EVIDENCE.counter;
    if (A.wits.length) arenaSay(A, A.wits[0], pick(ARENA_BACKED.witness));
    else if (100 - PLAYER.needs.stress >= C.psy) arenaSay(A, 'you', pick(ARENA_HOLD));
    else {
      move(A, C.lose, 'laugh', 'counter');
      addStress(C.stress);
      arenaSay(A, 'you', '…');
    }
    if (A.n.faceShot && G.t - A.n.faceShot < C.facedMins) move(A, C.faced, null, 'faced'); // you had a lens in their face only yesterday
    after(A, 2, () => checkEscape(A, () => arenaEnd(A)));
  });
}
// ── 5. the escape attempt: the first time the crowd turns hard against it, it tries to walk out. Block the way.
function checkEscape(A, cont) {
  if (!A.isThem || A.trapped || A.escTried || A.lean < EVIDENCE.escapeAt) return cont();
  A.escTried = true;
  A.beat = 'escape';
  A.cont = cont;
  arenaSay(A, 'them', pick(ARENA_ESCAPE));
  let [g, sp] = FIGHT_DIFF.them;
  if (PLAYER.needs.stress >= 80) g *= 2 / 3;
  if (PLAYER.needs.energy < 30) sp *= 1.2;
  const a = rand(0.08, 0.92 - g);
  A.bar = { a, b: a + g, sp, pos: 0, dir: 1, t: 0, res: null, rt: 0 };
  arenaDraw(A);
}
function arenaBarTick(A, dt) {
  const f = A.bar;
  if (f.res) {
    f.rt -= dt;
    if (f.rt > 0) return;
    A.bar = null;
    if (f.res === 'hit') {
      move(A, EVIDENCE.escapeBlock, 'gasp', 'block');
      arenaSay(A, 'you', 'You’re not going anywhere.');
      return after(A, 1.4, A.cont);
    }
    A.escaped = true; // out of the ring: it runs
    return after(A, 1.2, () => arenaEnd(A));
  }
  f.t += dt;
  if (f.t < FIGHT.grace) return; // the tracker holds still while the bar comes up, as in a fight
  f.pos += f.dir * f.sp * dt;
  if (f.pos > 1) {
    f.pos = 2 - f.pos;
    f.dir = -1;
  } else if (f.pos < 0) {
    f.pos = -f.pos;
    f.dir = 1;
  }
  arenaBarDraw(A);
  if (f.t > FIGHT.grace + FIGHT.timeout) arenaStrike(true); // freezing counts as a miss
}
function arenaStrike(froze) {
  const A = UI.cf,
    f = A && A.bar;
  if (!f || f.res || (f.t < FIGHT.grace && !froze)) return; // too soon: the bar is still coming up
  f.res = !froze && f.pos >= f.a && f.pos <= f.b ? 'hit' : 'miss';
  f.rt = 0.7;
  audio.sting(f.res === 'hit' ? 'caught' : 'awkward');
  arenaBarDraw(A);
}
// ── the crowd's lean
function move(A, v, fx, why) {
  if (!v) return;
  A.lean = clamp(A.lean + v, EVIDENCE.lean.min, EVIDENCE.lean.max);
  arenaCrowd(A, v, why);
  audio.sting(fx === 'gasp' ? 'gasp' : fx === 'laugh' || v < 0 ? 'crowdlaugh' : 'murmur');
  if (A.isThem && A.lean >= 3 && fx === 'gasp') audio.sting('slip'); // the mask, slipping
}
// ── the end: the lean decides; a fade back to the same spot, and the town already moving
function arenaEnd(A, forced) {
  if (A.res) return;
  A.beat = 'end';
  A.tMax = 0;
  const B = EVIDENCE.bands;
  A.res =
    forced ||
    (!A.isThem
      ? 'wrong'
      : A.escaped
        ? 'partial'
        : A.lean >= B.total
          ? 'total'
          : A.lean >= B.partial
            ? 'partial'
            : A.lean >= B.pfail
              ? 'pfail'
              : 'fail');
  // giving in, THEY say what they'd say with your fist in their face; so does one of THEIR people found out
  const own = A.res === 'total' || (A.res === 'wrong' && servantKind(A.n));
  arenaSay(A, 'them', own ? confess(A.n) : pick(ARENA_END[A.res]));
  arenaDraw(A);
  if (A.res === 'total' || A.res === 'partial') audio.sting('slip');
  after(A, 2.6, () => closeArena(A));
}
function closeArena(A) {
  UI.cf = null;
  arenaClose();
  G.speed = A.prev || 1;
  if (!G.over) arenaOutcome(A);
}
// what it leaves on the map
function arenaOutcome(A) {
  const n = A.n,
    res = A.res,
    ear = A.ear.filter((w) => w.onMap),
    heed = ear.filter((w) => !w.isThem && !w.def.stranger),
    W = EVIDENCE.aware;
  n.confronted = true;
  // another of THEM in the crowd took note of you
  if (res !== 'total') for (const m of A.hidden) if (m !== n) bookNight(m);
  arenaTalkLater(res, n);
  (G.arenaLog = G.arenaLog || []).push({ t: G.t, who: n.id, res, lean: A.lean });
  if (res === 'total') {
    // it drops the act: on its knees, the crowd holding it, the grey cars on the way
    n.cfOk = G.t;
    surrender(n, 'confront'); // proven right in public: nobody thinks you're mad now (surrender)
    return;
  }
  if (res === 'partial') {
    // it changes in public: an aggressive one, or one that knows you well, goes for you with the crowd behind you
    n.cfOk = G.t;
    const fight = !A.escaped && (temper(n) === 'aggressive' || G.aware >= 50);
    trueForm(n, 'confront', fight ? 'attack' : 'flee');
    if (n.trueForm) {
      const tf = n.trueForm;
      tf.public = true;
      tf.cornered = fight;
      tf.long = 30;
      tf.crowd = heed.length;
    }
    for (const w of heed) {
      ui.bubble(w, 'exclaim', 'speech', 3);
      (w.sawChange || (w.sawChange = {}))[n.id] = G.t;
    }
    exposeMember(n, 'unmask');
    echo('unmask', { x: n.x, z: n.z, who: n.id, seen: heed.map((w) => w.id) });
    G.fearUntil = G.t + EVIDENCE.success.fearMins;
    for (const w of suspects()) if (!w.isThem && !w.gone && !w.trueForm) makePlan(w);
    return;
  }
  if (res === 'pfail') {
    // doubt: the town watches it for a day. It knows you now, and it comes for you tonight.
    G.watchedUntil[n.id] = G.t + EVIDENCE.pfail.watchMins;
    for (const w of heed) addSus(w, EVIDENCE.pfail.sus);
    bookAware(W.pfail);
    G.huntNight = tonightId();
    addDanger(n, 25);
    return;
  }
  // a fail: you look mad. The wrong person: a scandal too.
  for (const w of heed) {
    addSus(w, EVIDENCE.fail.sus);
    ui.bubble(w, 'laugh', 'speech', 2.5);
  }
  G.madUntil = G.t + EVIDENCE.fail.madDays * 1440;
  G.tearTonight = (G.tearTonight || 0) + 1;
  if (res === 'wrong') {
    bookAware(W.wrong);
    addSus(n, EVIDENCE.wrong.sus);
    addStress(5);
  } else {
    bookAware(W.fail);
    addDanger(n, 20);
  }
}
// the town talks about it for hours afterwards
function arenaTalkLater(res, n) {
  const pool = ARENA_TALK[res] || ARENA_TALK.fail,
    by = pick(suspects().filter((s) => s !== n && !s.isThem && !s.gone && s.id !== 'lenny'));
  for (let k = 0; k < 2; k++)
    G.arenaTalk.push({
      at: G.t + rand(30, 240) + k * 90,
      text: pick(pool).replace(/\{s\}/g, n.short).replace(/\{p\}/g, PLAYER.name),
      by: by ? by.id : null,
    });
}
function arenaTalkTick() {
  const L = G.arenaTalk; // runs every step: look before building anything
  let due = false;
  for (let i = 0; i < L.length; i++) if (G.t >= L[i].at) due = true;
  if (!due) return;
  for (const x of L.filter((y) => G.t >= y.at)) hear(null, x.text, x.by || 'stranger');
  G.arenaTalk = L.filter((y) => G.t < y.at);
}
// keys during the battle: A/D pick a card, E shows it; in the rebuttal W cites a habit, S calls a witness;
// in "How well do you know me?" A says true, D says lie
function arenaKey(k) {
  const A = UI.cf;
  if (!A) return;
  if (A.bar) {
    if (k === 'e' || k === ' ' || k === 'enter') arenaStrike();
    return;
  }
  if (A.beat === 'know') {
    if (k === 'a' || k === 'arrowleft') callClaim(A, false);
    else if (k === 'd' || k === 'arrowright') callClaim(A, true);
    return;
  }
  if (A.beat === 'stmt' || A.beat === 'rebut') {
    if (k === 'a' || k === 'arrowleft') A.sel = (A.sel + A.hand.length - 1) % Math.max(1, A.hand.length);
    else if (k === 'd' || k === 'arrowright') A.sel = (A.sel + 1) % Math.max(1, A.hand.length);
    else if (k === 'e' || k === 'enter' || k === ' ') showCard(A, A.hand[A.sel]);
    else if (k === 'w' && A.beat === 'rebut') backUp(A, 'habit');
    else if (k === 's' && A.beat === 'rebut') backUp(A, 'witness');
    else if (k === 'q' && A.beat === 'stmt') {
      A.tMax = 0;
      letPass(A);
    }
    arenaDraw(A);
  }
}
