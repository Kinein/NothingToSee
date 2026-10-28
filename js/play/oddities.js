//@ play/oddities — False cards: innocent oddities, rumours, THEIR frame-ups, pressing people, flipping a card grey
//@ Defines: ODD_FRAMES, makeOddities, innocentCard, oddTruth, secretSeen, readOddity, watchedHuman, rumourCard, tellRumour, markVictim, contactCard, resolvePress, framingMorning, framingTick, plantStash, learnFramed
//@ Uses:    sim/core, them/proofs, core/util, data/lines, ui/interface, play/stashes, town/cast, them/moves, world/objects, data/tuning, …
//@ (header made by tools/map.js; stripped by build.py)
// ───────────── false cards. Most ordinary people carry one secret that makes one fuzzy card in one frame: an envelope in
// the desk, a habit at a strange hour, a tic, a rumour. Once THEY know you, THEY frame people: a stash in an innocent's
// things (the only false card that looks clear) and a rumour to go with it. Every false card has a truth behind it;
// see the truth and the card turns grey.
const ODD_FRAMES = ['home', 'habit', 'body', 'contact'];
// the things in a person's own home or desk you could put your hands in
const ownThings = (n) =>
  OBJ.filter((o) => shakeable(o) && ownerOf(o) === n.id && !G.stashes.some((s) => s.obj === o.idx && !s.bagged));
function makeOddities() {
  G.odd = {};
  G.rumours = [];
  for (const n of suspects()) {
    if (n.isThem || !chance(EVIDENCE.oddRate)) continue;
    const mine = ownThings(n),
      f = pick(ODD_FRAMES.filter((x) => x !== 'home' || mine.length));
    const od = { frame: f, k: null };
    if (f === 'home') {
      od.k = pick(Object.keys(ODDITY_HOME));
      G.stashes.push({
        id: ++G.stashId,
        by: n.id,
        obj: pick(mine).idx,
        k: od.k,
        innocent: n.id,
        out: false,
        moveAt: 1e12,
      });
    } else if (f === 'body') od.k = pick(ODDITY_TIC);
    else if (f === 'contact') {
      od.k = 'just talk. Nobody saw anything';
      G.rumours.push({ about: n.id, line: pick(ODDITY_RUMOR), from: 2, innocent: true });
    }
    G.odd[n.id] = od;
  }
}
const oddityIn = (n, f) => !!(n && !n.isThem && G.odd && G.odd[n.id] && G.odd[n.id].frame === f);
const oddPeople = (f) => suspects().filter((n) => oddityIn(n, f) && !n.gone);
// the innocent card: fuzzy, in their oddity's frame, and it looks just like one of THEIRS
function innocentCard(n, o) {
  const od = G.odd && G.odd[n.id];
  if (!od) return null;
  od.given = true;
  return addProof(Object.assign({ frame: od.frame, q: 'fuzzy', true: n.id, auto: true, innocent: n.id }, o));
}
// what an innocent card really was, in a few words
function oddTruth(n) {
  const od = G.odd && G.odd[n.id];
  if (!od) return null;
  if (od.frame === 'home') return (ODDITY_HOME[od.k] || ODDITY_HOME.envelope).truth;
  if (od.frame === 'habit') {
    const hb = G.habits[n.id];
    return 'just ' + secretFor(n, hb ? hb.spot : 'alley').note;
  }
  return od.k;
}
// a normal person's private secret, caught on film: the print shows exactly what they were up to. Habit is clean.
function secretSeen(n, spot) {
  const A = secretFor(n, spot),
    pr = { kind: 'plain', who: n.id, what: n.short, icon: 'people', t: n.animT };
  addNote(n, 'Photo: just ' + A.note + '. Only human.', { by: 'you' });
  addStress(-2);
  const p = greyFrame(n, 'habit', { what: 'Just ' + A.note, where: placeName(n.x, n.z), pr });
  if (p) ui.card({ char: n, img: proofImage(p), stamp: 'HABIT', frame: 'habit', q: 'grey' });
  ui.note('clock', n.short + ': just ' + A.note, 'good');
  audio.sting('clear');
}
// you read what you found in their things: now you know what it is. You put it back.
function readOddity(st, it) {
  const n = NPC[st.by],
    S = stashDef(st),
    o = OBJ[it.obj];
  addStress(2);
  if (o) closeUp(o, true);
  if (!n) return;
  addNote(n, 'Read it: ' + S.truth + '.', { by: 'you' });
  greyFrame(n, 'home', { what: S.what + ' · ' + S.truth, pr: { kind: 'item', what: S.what, icon: S.icon } });
  ui.note('home', n.short + ' · ' + S.truth, 'good');
  audio.sting('clear');
}
// a long look at an ordinary person with a tic: that's all it is. Body is clean.
function watchedHuman(n) {
  if (!oddityIn(n, 'body')) return;
  const t = oddTruth(n);
  if (greyFrame(n, 'body', { what: 'Just ' + t, pr: { kind: 'plain', who: n.id, what: n.short, icon: 'people' } }))
    ui.note('face', n.short + ' · ' + t, 'good');
}
// ── words: rumours become fuzzy Contact cards on whoever they're about
// loud, sure talk about someone ("I saw X with glowing eyes"). About an ordinary person it's THEIR doing.
function rumourCard(s, text, teller) {
  if (!s || s.def.never || s.exposed || s.slain || s.gone || !G.started) return null;
  const liar = teller && (teller.isThem || bought(teller) || misled(teller));
  const p = addProof({
    frame: 'contact',
    q: 'fuzzy',
    true: s.isThem ? s.id : liar && teller.isThem ? teller.id : null,
    pin: s.id,
    auto: true,
    src: 'word',
    rumour: true,
    planted: !s.isThem || undefined,
    teller: teller ? teller.id : null,
    what: '“' + text + '”',
    where: teller ? teller.short : '',
    pr: { kind: 'plain', who: teller ? teller.id : s.id, what: teller ? teller.short : s.short, icon: 'chat' },
  });
  if (p.kept) proofCard(p);
  return p;
}
// a rumour going round: an innocent's (from THEIR day 2), or the one THEY started about the person THEY framed
function tellRumour(n) {
  const r = (G.rumours || []).find(
    (x) => !x.told && x.about !== n.id && dayNo() >= (x.from || 1) && NPC[x.about] && !NPC[x.about].gone,
  );
  if (!r || !chance(0.5)) return false;
  const s = NPC[r.about],
    line = r.line.replace(/\{s\}/g, s.short);
  r.told = true;
  ui.say(n, line, 5);
  hear(null, line, n.id);
  noteOnce(s, '“' + line + '”', { by: n.id });
  const p = r.innocent
    ? innocentCard(s, {
        src: 'word',
        rumour: true,
        teller: n.id,
        what: '“' + line + '”',
        where: n.short,
        pr: { kind: 'plain', who: n.id, what: n.short, icon: 'chat' },
      })
    : addProof({
        frame: 'contact',
        q: 'fuzzy',
        true: r.by,
        pin: s.id,
        auto: true,
        src: 'word',
        rumour: true,
        planted: true,
        teller: n.id,
        what: '“' + line + '”',
        where: n.short,
        pr: { kind: 'plain', who: n.id, what: n.short, icon: 'chat' },
      });
  if (p && p.kept) proofCard(p);
  return true;
}
// ── Press: lean on somebody about what they know. A witness tells you straight; a bought one covers, and tells THEM.
function markVictim(v, by) {
  if (v && by) (G.victimOf || (G.victimOf = {}))[v.id] = { by, at: G.t };
}
function contactCard(n, m, q, what, extra) {
  return addProof(
    Object.assign(
      {
        frame: 'contact',
        q,
        true: m.id,
        auto: true,
        src: 'word',
        what,
        where: n.short,
        pr: { kind: 'plain', who: n.id, what: n.short, icon: 'chat' },
      },
      extra,
    ),
  );
}
function resolvePress(n) {
  n.pressDay = dayNo();
  addSus(n, 8);
  n.rel -= 3;
  const say = (pool, m) => ui.say(n, pick(pool).replace(/\{s\}/g, m ? m.short : ''), 4.5);
  // a rumour they told you about an ordinary person: they own up it was only talk
  const told = !n.isThem && !bought(n) && G.proofs.find((p) => p.rumour && p.teller === n.id && !p.grey && p.planted);
  if (told) {
    say(ODDITY_HEARD);
    flipCard(told, { what: 'just talk' });
    ui.note('mouth', NPC[told.pin].short + ' · just talk', 'good');
    return;
  }
  // they saw one of THEM change, and they're willing: a clear Contact card, while they still remember
  const sawIt = backs(n) && them().find((m) => !m.slain && !m.exposed && sawRecently(n, m));
  if (sawIt) {
    say(PRESS_SAW, sawIt);
    proofCard(contactCard(n, sawIt, 'clear', n.short + ' saw it change', { witness: n.id }));
    return;
  }
  // bought: they cover for whoever paid. And whoever paid hears you asked.
  const payer = bought(n) && G.boughtBy && NPC[G.boughtBy[n.id]];
  if (payer && !payer.slain) {
    say(PRESS_BOUGHT, payer);
    proofCard(contactCard(n, payer, 'fuzzy', n.short + ' won’t hear a word against ' + payer.short));
    bookNight(payer);
    addDanger(payer, 15);
    return;
  }
  // something THEY did to them: a gap, a face
  const v = G.victimOf && G.victimOf[n.id],
    m = v && NPC[v.by];
  if (m && !m.slain && !m.exposed && G.t - v.at < 3 * 1440) {
    say(PRESS_VICTIM, m);
    proofCard(contactCard(n, m, 'fuzzy', n.short + ' remembers ' + m.short + '. Barely.'));
    return;
  }
  say(PRESS_NONE);
  ui.float(n, 'Nothing', '');
}
// ── THEIR frame-ups: from awareness 40 THEY pick one human and plant something of THEIRS in their things, and start a
// rumour. From 70, a second. Catch THEM putting it there and that's a clear Habit card on the one who did it.
function framingMorning() {
  if (!G.started || G.over || !theyStir()) return;
  const want = EVIDENCE.frameAt.filter((a) => G.aware >= a).length;
  if ((G.framed || []).length >= want) return;
  const m = pick(covert().filter((x) => !x.gone && !x.under));
  const pool = suspects().filter(
    (x) =>
      !x.isThem &&
      !x.gone &&
      !x.exposed &&
      x.id !== 'lenny' &&
      !G.framed.some((f) => f.id === x.id) &&
      !G.cleared[x.id],
  );
  if (!m || !pool.length) return;
  // the one you're already looking at, if there is one: it's cheaper to push you further down the wrong road
  pool.sort((a, b) => caseSize(b) - caseSize(a) || b.sus - a.sus);
  const h = pick(pool.slice(0, 2)),
    obj = pick(ownThings(h));
  const F = { id: h.id, by: m.id, at: G.t + rand(120, 540), obj: obj ? obj.idx : -1, done: !obj, going: false };
  G.framed.push(F);
  G.rumours = G.rumours || [];
  G.rumours.push({ about: h.id, by: m.id, line: pick(ODDITY_RUMOR), from: dayNo() });
}
function framingTick() {
  for (const F of G.framed || []) {
    if (F.done || G.t < F.at) continue;
    const m = NPC[F.by],
      o = OBJ[F.obj];
    if (!m || m.slain || m.exposed || !o) {
      F.done = true;
      continue;
    }
    if (G.t - F.at > 12 * 60) {
      plantStash(F); // somehow, sometime in the night, it got in there
      continue;
    }
    if (F.going || !stashFree(m)) continue;
    F.going = true;
    const h = NPC[F.id];
    for (const a of m.queue) a.cancel = true;
    enqueue(
      m,
      useAct(m, o, {
        label: '…',
        anim: 'use',
        dur: 4,
        maxWait: 12,
        prop: 'paper',
        onStart: (c, a) =>
          (c.odd = {
            k: 'plant',
            amt: 30,
            note: 'Caught putting something in ' + h.short + '’s ' + o.name.toLowerCase() + '.',
            until: G.t + a.dur + 0.3,
          }),
        onEnd: (c, a, ok) => {
          if (ok) plantStash(F);
          else F.going = false;
        },
      }),
    );
  }
}
function plantStash(F) {
  if (F.done) return;
  F.done = true;
  const kinds = STASH_KINDS[G.faction];
  G.stashes.push({
    id: ++G.stashId,
    by: F.by,
    obj: F.obj,
    k: kinds ? pick(kinds).k : 'remains',
    planted: F.id,
    out: false,
    moveAt: 1e12,
  });
}
// in the arena: you show a card on an ordinary person and they tell the truth. Now the town knows it.
function learnFramed(p) {
  flipCard(p, { what: 'planted' });
  const F = (G.framed || []).find((f) => f.id === p.pin);
  if (F) F.known = true;
}
