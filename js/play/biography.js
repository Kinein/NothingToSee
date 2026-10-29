//@ play/biography — Biography: six facts a suspect, found by chat, rummaging, the paper and Mom; you mark one odd
//@ Defines: BIO_N, makeBios, findFact, chatFact, homeFact, paperFact, momFact, markFact, BIO_SRC
//@ Uses:    sim/core, core/util, data/lines, town/cast, them/proofs, ui/interface, play/stashes
//@ (header made by tools/map.js; stripped by build.py)
// ───────────── biography: a page of about six facts on every suspect in the evidence book, blank lines for the ones you
// haven't found. Facts come from chatting with the person themselves, rummaging at their place, the newspaper and Mom's
// calls (never from gossip, which stays clues). Facts are always true; what they mean is up to you. Mark one fact per
// person as odd and that fact is their Biography card. You can move the mark until you confront them. In a
// confrontation a fact that really is odd holds up (✓); an ordinary one doesn't (✗).
// What's odd about THEIR facts: the lizards don't live long, so nothing about them is old, but there's a royal bloodline,
// or the country club and the governor's ball for someone who doesn't look the type; the aliens' data is faked, so two
// facts don't agree (most of the rest look normal); the dead's data is very old, and they'll say so themselves.
// A human can have one odd-looking fact. It's true, it's odd, and it counts toward their two odd true things.
const BIO_N = 6;
// each fact: t, the line in the book · say, how they'd tell you themselves (if it's the kind of thing a person says)
function makeBios() {
  G.bio = {};
  for (const n of suspects()) {
    if (n.id === 'lenny') continue;
    const facts = [],
      pool = shuffle(BIO_PLAIN.slice()),
      add = (f, odd, src) =>
        facts.push({ t: f.t, say: f.say || null, odd: !!odd, src: src || f.src || null, found: false });
    if (n.isThem) {
      if (G.faction === 'aliens') {
        // faked papers: two facts that can't both be true
        const [a, b] = pick(BIO_ALIEN_PAIRS);
        add(a, true, 'chat');
        add(b, true, pick(['home', 'paper']));
      } else for (const f of shuffle(BIO_THEM[G.faction].slice()).slice(0, 2)) add(f, true);
    } else if (G.odd[n.id] && G.odd[n.id].frame === 'biography') add(BIO_HUMAN_ODD[G.odd[n.id].i], true);
    // plain facts that don't say the same as one already on the page (an alien born in Ohio, twice)
    const same = (f) => facts.some((x) => x.t.slice(0, 12) === f.t.slice(0, 12));
    while (facts.length < BIO_N && pool.length) {
      const f = pool.pop();
      if (!same(f)) add(f);
    }
    // where each one turns up: what a person would say, mostly in a chat; papers in their things; the rest, the paper
    // or Mom, dealt out so every source has something
    const docs = shuffle(['home', 'paper', 'mom', 'home', 'paper', 'mom']);
    let k = 0;
    for (const f of facts) if (!f.src) f.src = f.say && chance(0.75) ? 'chat' : docs[k++ % docs.length];
    G.bio[n.id] = shuffle(facts);
  }
}
const bioOf = (n) => (G.bio && n && G.bio[n.id]) || [];
// found a fact: it's on their page now
function findFact(n, f, how) {
  if (!f || f.found) return false;
  f.found = true;
  f.at = G.t;
  setTimeout(() => !G.over && ui.note('paper', n.short + ' · ' + f.t, 'onto'), how === 'chat' ? 4800 : 600);
  return true;
}
const unfound = (n, src) => bioOf(n).filter((f) => !f.found && f.src === src);
// chat: they tell you a fact about themselves, if they don't find you too weird (at 60+, nothing). One of THEM lets an
// odd one slip without noticing, the same way.
function chatFact(n) {
  if (n.sus >= 60) return null;
  const f = pick(unfound(n, 'chat'));
  if (!f) return null;
  findFact(n, f, 'chat');
  return f.say || f.t;
}
// rummaging at their place: a document in a drawer, a photo in a frame
function homeFact(o) {
  const id = ownerOf(o),
    n = id && NPC[id];
  if (!n || n.isPlayer) return false;
  const f = pick(unfound(n, 'home'));
  if (!f || !chance(0.6)) return false;
  return findFact(n, f, 'home');
}
// the morning paper: a line about somebody, in among the small print
function paperFact() {
  const opts = suspects().filter((n) => unfound(n, 'paper').length);
  const n = pick(opts);
  return n ? findFact(n, pick(unfound(n, 'paper')), 'paper') && n : null;
}
// Mom: she knows everybody's mother
function momFact() {
  const opts = suspects().filter((n) => unfound(n, 'mom').length);
  const n = pick(opts);
  if (!n) return null;
  const f = pick(unfound(n, 'mom'));
  findFact(n, f, 'mom');
  return 'Mom: “' + n.short + '? ' + f.t + '”';
}
// your mark: one fact per person, odd. It's their Biography card. It moves freely until you've called them out.
function markFact(n, i) {
  const f = bioOf(n)[i];
  if (!f || !f.found || n.confronted) return false;
  const old = cardIn(n, 'biography');
  if (old && old.bio === i) {
    G.proofs.splice(G.proofs.indexOf(old), 1); // unmarked
    return true;
  }
  addProof({
    frame: 'biography',
    pin: n.id,
    true: f.odd ? n.id : null,
    odd: f.odd,
    bio: i,
    src: 'fact',
    what: f.t,
    where: BIO_SRC[f.src],
    at: f.at || G.t,
    pr: { kind: 'item', what: f.t, icon: 'paper' },
  });
  return true;
}
const BIO_SRC = { chat: 'they told you', home: 'in their things', paper: 'the paper', mom: 'Mom' };
