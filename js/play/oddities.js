//@ play/oddities — False cards: innocent oddities, rumours, THEIR frame-ups, pressing people, flipping a card grey
//@ Defines: ODD_FRAMES, lookalikeFor, makeOddities, innocentCard, oddTruth, secretSeen, watchedHuman, tellRumour, markVictim
//@ Uses:    sim/core, core/util, play/stashes, data/lines, town/cast, them/proofs, town/routines, world/objects, town/quirks, data/tuning, …
//@ (header made by tools/map.js; stripped by build.py)
// ───────────── innocent oddities. Most ordinary people carry one odd true thing, and it looks just like THEIRS: a
// lookalike at their place (a cash envelope, a bucket of trout, a fridge full of fish), a habit at a strange hour, a tic.
// It makes one card, in one frame, and in a confrontation it holds up (✓): "Yes, I like fish. So?" A human never has
// more than two odd true things: this one, and at most THEIR plant (play/stashes). Talk is never a card: a rumour going
// round is only a note under the face it's about.
const ODD_FRAMES = ['home', 'habit', 'body'];
// the things in a person's own place you could put your hands in (their fridge is its own case)
const ownThings = (n) =>
  OBJ.filter(
    (o) =>
      shakeable(o) &&
      o.type !== 'fridge' &&
      ownerOf(o) === n.id &&
      !G.stashes.some((s) => s.obj === o.idx && !s.bagged),
  );
// which lookalike a person keeps: the everyday ones, and twice as likely, the ones that look like this week's THEM
function lookalikeFor(n) {
  const fr = fridgeOf(n) && !G.stashes.some((s) => s.obj === fridgeOf(n).idx),
    mine = ownThings(n).length;
  const opts = Object.values(ODDITY_HOME)
    .filter((L) => (L.fridge ? fr : mine) && (!L.look || L.look === G.faction))
    .map((L) => [L.look ? 2 : 1, L]);
  return opts.length ? wpick(opts) : null;
}
function makeOddities() {
  G.odd = {};
  G.rumours = [];
  for (const n of suspects()) {
    if (n.isThem || !chance(EVIDENCE.oddRate)) continue;
    const L = lookalikeFor(n),
      f = pick(ODD_FRAMES.filter((x) => x !== 'home' || L));
    const od = { frame: f, k: null };
    if (f === 'home') {
      od.k = L.k;
      G.stashes.push({
        id: ++G.stashId,
        by: n.id,
        obj: (L.fridge ? fridgeOf(n) : pick(ownThings(n))).idx,
        k: od.k,
        innocent: n.id,
        out: false,
        moveAt: 1e12,
      });
    } else if (f === 'body') od.k = pick(ODDITY_TIC);
    // people talk about whoever looks odd: half of them have a rumour going round from THEIR day 2
    if (chance(0.5)) G.rumours.push({ about: n.id, line: pick(ODDITY_RUMOR), from: 2, innocent: true });
    G.odd[n.id] = od;
  }
}
const oddityIn = (n, f) => !!(n && !n.isThem && G.odd && G.odd[n.id] && G.odd[n.id].frame === f);
const oddPeople = (f) => suspects().filter((n) => oddityIn(n, f) && !n.gone);
// the innocent card, in their oddity's frame: it looks just like one of THEIRS
function innocentCard(n, o) {
  const od = G.odd && G.odd[n.id];
  if (!od) return null;
  od.given = true;
  return addProof(Object.assign({ frame: od.frame, true: n.id, pin: n.id, innocent: n.id }, o));
}
// what an innocent card really is, in a few words: what they'll tell everyone if you call them out over it
function oddTruth(n) {
  const od = G.odd && G.odd[n.id];
  if (!od) return null;
  if (od.frame === 'home') return (ODDITY_HOME[od.k] || ODDITY_HOME.envelope).truth;
  if (od.frame === 'habit') {
    const hb = G.habits[n.id];
    return 'just ' + secretFor(n, hb ? hb.spot : 'alley').note;
  }
  return od.k; // body: the tic
}
// a normal person's private secret, caught on film: the print shows exactly what they were up to. If that habit is
// their one oddity, it's a Habit card on them (and it holds up); otherwise it's only a note.
function secretSeen(n, spot) {
  const A = secretFor(n, spot),
    pr = { kind: 'plain', who: n.id, what: n.short, icon: 'people', t: n.animT };
  addNote(n, 'Photo: ' + A.note + '.', { by: 'you' });
  if (oddityIn(n, 'habit'))
    return proofCard(innocentCard(n, { what: n.short + ' · ' + A.note, where: placeName(n.x, n.z), pr }));
  ui.note('clock', n.short + ': ' + A.note, '');
}
// a long look at an ordinary person with a tic: you see it, and you note it
function watchedHuman(n) {
  if (oddityIn(n, 'body')) noteOnce(n, 'Watched them a while: ' + oddTruth(n) + '.', { by: 'you' });
}
// a rumour going round: about someone who looks odd (from THEIR day 2), or the one THEY started about the person THEY
// framed. Only words: a note under the face it's about, never a card. Each rumour is passed on once.
function tellRumour(n) {
  const r = (G.rumours || []).find(
    (x) => !x.told && x.about !== n.id && dayNo() >= (x.from || 1) && NPC[x.about] && !NPC[x.about].gone,
  );
  if (!r || !chance(0.5)) return null;
  const s = NPC[r.about];
  r.told = true;
  return { text: r.line.replace(/\{s\}/g, s.short), subj: s, place: true };
}
// someone THEY got to: who did it, and when. They don't remember it, but they can tell you they don't.
function markVictim(v, by) {
  if (v && by) (G.victimOf || (G.victimOf = {}))[v.id] = { by, at: G.t };
}
