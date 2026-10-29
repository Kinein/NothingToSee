//@ them/proofs — Proofs: photos and THEIR things in your hands
//@ Defines: FRAME, FRAMES, TELL_FRAME, addProof, dropCard, dropCardsOn, tearCard, proofImage, proofCard, takeBait, returnBait, sawItChange
//@ Uses:    sim/core, data/tuning, gfx/portraits, ui/interface, them/moves
//@ (header made by tools/map.js; stripped by build.py)
// ───────────── evidence: four frames on every suspect, a card in each.
//   Home    · a thing found at their place (their desk, their home; the shop's back room for the trader)  you take it
//   Habit   · something a person could do, done wrong                                                    you photograph it
//   Body    · the body doing something a body can't                                                      you photograph it
//   Biography · an odd fact about their life                                                       you mark it in the book
// A card says plainly what it shows, where and when, and THEIRS looks just like an innocent's. There's no clear or fuzzy:
// whether a card holds up is decided only in a confrontation, ✓ or ✗ (play/confrontation). A thing with no owner (the
// street, a shared place) is a clue and trap bait, never a card. Cards are never used up: only THEY take one, from your
// flat.
const FRAME = {
  home: { icon: 'home', name: 'Home' },
  habit: { icon: 'clock', name: 'Habit' },
  body: { icon: 'face', name: 'Body' },
  biography: { icon: 'paper', name: 'Biography' },
};
const FRAMES = EVIDENCE.frames;
// a tell on film: the body slipping is Body; THEIR business, done wrong, is Habit (swaying in a corner included)
const TELL_FRAME = {
  hum: 'body',
  flicker: 'body',
  shed: 'body',
  limb: 'body',
  half: 'body',
  true: 'body',
  tongue: 'body',
  stare: 'habit',
  bask: 'habit',
  feed: 'habit',
  speak: 'habit',
};
// a new card, on the person it's about (pin). A frame holds one card, the newest: a thing pushed out stays in your pocket
// as bait, a print is just paper. No one to pin it on, and it isn't a card at all.
function addProof(o) {
  const n = o.pin && NPC[o.pin];
  if (!n || n.isPlayer || n.def.never) return null;
  const p = Object.assign({ id: ++G.proofId, at: G.t, src: 'photo', frame: 'home' }, o);
  if (!p.pr) p.pr = { kind: p.src === 'item' ? 'item' : 'plain', icon: p.icon || 'bag', what: p.what };
  p.pr.id = 'pf' + p.id;
  p.pr.at = p.at;
  const old = cardIn(n, p.frame);
  if (old) dropCard(old);
  G.proofs.push(p);
  return p;
}
// out of its frame for good. THEIR things stay in your pocket (bait); a print is just paper.
function dropCard(p) {
  if (p.src === 'item') {
    p.pin = null;
    p.spare = true;
  } else G.proofs.splice(G.proofs.indexOf(p), 1);
}
const cardIn = (n, f) => n && G.proofs.find((p) => p.pin === n.id && p.frame === f && !p.spare);
const frameState = (n, f) => (cardIn(n, f) ? 'card' : 'empty');
const caseCards = (n) => FRAMES.map((f) => cardIn(n, f)).filter(Boolean); // everything you'd bring to a confrontation
const caseSize = (n) => caseCards(n).length;
// the cards on one of THEM you no longer need: caught, dead. THEIR things stay in your pocket, as bait.
function dropCardsOn(n) {
  for (const p of G.proofs.slice()) if (p.true === n.id || p.pin === n.id) dropCard(p);
}
// THEY take one from your flat: THEY know which one hurts. A card on one of THEM first, the one on the thief first of all.
function tearCard(by) {
  const real = (p) => p.pin && NPC[p.pin] && NPC[p.pin].isThem && p.src !== 'item';
  const pf = G.proofs
    .filter((p) => p.src !== 'item' && !p.spare)
    .sort((a, b) => (b.pin === (by && by.id)) - (a.pin === (by && by.id)) || real(b) - real(a) || b.at - a.at)[0];
  if (!pf) return null;
  G.proofs.splice(G.proofs.indexOf(pf), 1);
  return pf;
}
function proofImage(p) {
  if (p.rec && NPC[p.recWho]) return snapImage(NPC[p.recWho], p.rec);
  return printImage(p.pr);
}
// the polaroid that slides in when a card lands on someone's board: its frame, and whose it is
function proofCard(p) {
  if (!p) return;
  ui.card({ char: NPC[p.pin], img: proofImage(p), stamp: FRAME[p.frame].name.toUpperCase(), frame: p.frame });
}
// a trap's bait comes out of the same pocket: a spare first, then the newest
function takeBait() {
  const items = G.proofs.filter((p) => p.src === 'item');
  const p = items.find((x) => x.spare) || items[items.length - 1];
  if (!p) return null;
  G.proofs.splice(G.proofs.indexOf(p), 1);
  return p;
}
// back out of the trap, into your pocket: into its frame if the frame's still free
function returnBait(p) {
  if (!p) return;
  p.spare = !(p.pin && NPC[p.pin] && !cardIn(NPC[p.pin], p.frame));
  if (p.spare) p.pin = null;
  G.proofs.push(p);
}
// people who watched one of THEM change in the last two days, and would say so again with you in the room
const backs = (w) => !w.isThem && !w.def.stranger && !bought(w) && w.id !== 'lenny' && !(G.recant && G.recant[w.id]);
const sawRecently = (w, n) =>
  !!(w.sawChange && w.sawChange[n.id] != null && G.t - w.sawChange[n.id] <= EVIDENCE.witnessDays * 1440);
function sawItChange(n, list) {
  return list.filter((w) => backs(w) && sawRecently(w, n));
}
