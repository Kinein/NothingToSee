//@ them/proofs — Proofs: photos and THEIR things in your hands
//@ Defines: FRAME, FRAMES, TELL_FRAME, SLIP_CLEAR, ODD_STRONG, addProof, slotCard, dropCard, frameState, dashFrame, clearDash, greyFrame, flipCard, checkCleared, assignCard, unassignCard, …
//@ Uses:    sim/core, ui/interface, data/tuning, them/plan, gfx/portraits, town/cast, play/oddities, player/needs, audio/sound, ui/menus, …
//@ (header made by tools/map.js; stripped by build.py)
// ───────────── evidence: four frames on every suspect, each holding one card.
//   Home    · THEIR thing hidden in their own home or desk          "That's not mine"
//   Habit   · THEIR business at a place and an hour                 "I was never there"
//   Body    · the human shape slipping, caught on film              "That's not me"
//   Contact · a human tied to them: bought, a victim, a witness     "Who says?"
// A card is clear (undeniable) or fuzzy (could be explained), and looks the same whether it's THEIRS or innocent.
// A clear card pushes a fuzzy one out of its frame. Grey: a frame you saw explained, clean. Dashed: searched, nothing.
// Cards are physical: they live in your flat, THEY can tear them, and confronting someone spends the ones you show.
const FRAME = {
  home: { icon: 'home', name: 'Home' },
  habit: { icon: 'clock', name: 'Habit' },
  body: { icon: 'face', name: 'Body' },
  contact: { icon: 'mouth', name: 'Contact' },
};
const FRAMES = EVIDENCE.frames;
// a tell on film: the body slipping is a Body card, THEIR business at THEIR spot a Habit card. The face going is clear
// at night, or by daylight from late in THEIR week; the small strangenesses never more than fuzzy.
const TELL_FRAME = {
  hum: 'body',
  flicker: 'body',
  shed: 'body',
  limb: 'body',
  half: 'body',
  true: 'body',
  tongue: 'body',
  stare: 'body',
  bask: 'habit',
  feed: 'habit',
  speak: 'habit',
};
const SLIP_CLEAR = new Set(['hum', 'flicker', 'shed', 'limb', 'half', 'true']);
// odd acts that are THEIR business, plainly: a clear Habit card. Anything else odd is fuzzy.
const ODD_STRONG = new Set([
  'stash',
  'envelope',
  'control',
  'drain',
  'lure',
  'rack',
  'copier',
  'ledger',
  'implant',
  'plant',
]);
const slipClear = (type) => SLIP_CLEAR.has(type) && (darkNow() || theirDay() >= EVIDENCE.halfFrom);
// a new card: in its frame on someone, or loose in the Whose? tray. kept === false: the frame already had as good a card.
function addProof(o) {
  const p = Object.assign(
    { id: ++G.proofId, at: G.t, pin: null, auto: false, src: 'photo', frame: 'home', q: 'fuzzy' },
    o,
  );
  if (p.auto) p.pin = p.pin || p.true;
  if (!p.pr) p.pr = { kind: p.src === 'item' ? 'item' : 'plain', icon: p.icon || 'bag', what: p.what, at: p.at };
  p.pr.id = 'pf' + p.id;
  p.pr.at = p.at;
  if (p.pin && NPC[p.pin]) p.kept = slotCard(p);
  else {
    p.pin = null;
    if (p.frame === 'home') p.half = true; // one half of something: the other half, in somebody's home, says whose
    G.proofs.push(p);
    p.kept = true;
  }
  return p;
}
// into its frame. Grey stays grey unless a new card comes in over it; clear stays clear; a card you pinned yourself
// goes back to the tray when the game finds one of its own.
function slotCard(p) {
  const n = NPC[p.pin];
  let old = cardIn(n, p.frame);
  if (old && !old.auto && !old.grey) {
    old.pin = null;
    old = null;
  }
  if (old) {
    if (p.grey) {
      if (old.grey) return false;
    } else if (old.grey) {
      if (p.innocent && p.innocent === old.innocent) return false; // you already know what that is
    } else if (!(p.q === 'clear' && old.q === 'fuzzy')) return false;
    dropCard(old);
  }
  clearDash(n, p.frame);
  G.proofs.push(p);
  mergeHalves(p);
  return true;
}
// out of its frame for good. THEIR things stay in your pocket (bait); a print is just paper.
function dropCard(p) {
  if (p.src === 'item' && !p.grey) {
    p.pin = null;
    p.spare = true;
  } else G.proofs.splice(G.proofs.indexOf(p), 1);
}
const cardIn = (n, f) => n && G.proofs.find((p) => p.pin === n.id && p.frame === f && !p.spare);
function frameState(n, f) {
  const p = cardIn(n, f);
  if (p) return p.grey ? 'grey' : p.q;
  return G.dashed[n.id] && G.dashed[n.id][f] ? 'dashed' : 'empty';
}
const caseCards = (n) => FRAMES.map((f) => cardIn(n, f)).filter((p) => p && !p.grey); // what you'd bring to a confrontation
const caseSize = (n) => caseCards(n).length;
const greyCount = (n) => FRAMES.filter((f) => frameState(n, f) === 'grey').length;
const looseProofs = () => G.proofs.filter((p) => !p.pin && !p.spare);
// searched, and nothing there. It tells you nothing: a human may hide nothing, and THEY tidy up.
function dashFrame(n, f) {
  if (!n || n.def.never || frameState(n, f) !== 'empty') return false;
  (G.dashed[n.id] || (G.dashed[n.id] = {}))[f] = G.t;
  return true;
}
function clearDash(n, f) {
  if (G.dashed[n.id]) delete G.dashed[n.id][f];
}
// a frame you saw explained: clean
function greyFrame(n, f, o) {
  if (!n || n.isThem || n.def.never) return null;
  const old = cardIn(n, f);
  if (old && !old.grey && (old.innocent || old.planted)) return flipCard(old, o);
  const p = addProof(Object.assign({ frame: f, q: null, grey: true, true: n.id, auto: true, src: 'seen' }, o));
  if (p.kept) checkCleared(n);
  return p.kept ? p : null;
}
// a false card turns grey when you see the innocent truth behind it (or learn it was planted)
function flipCard(p, o) {
  if (!p || p.grey) return null;
  p.grey = true;
  p.greyAt = G.t;
  if (o && o.what) p.truth = o.what;
  checkCleared(NPC[p.pin]);
  return p;
}
// enough frames seen clean and the board stamps them CLEARED on its own
function checkCleared(n) {
  if (!n || G.cleared[n.id] || n.isThem || greyCount(n) < EVIDENCE.clearedGrey) return;
  G.cleared[n.id] = 1;
  addStress(-4);
  ui.card({ char: n, img: getPortrait(n), stamp: 'CLEARED', cleared: true });
  audio.sting('clear');
  const left = suspects().filter((x) => !x.exposed && !G.cleared[x.id]);
  if (left.length && left.every((x) => x.isThem))
    setTimeout(
      () =>
        ui.note(
          G.factionKnown ? FACTIONS[G.faction].icon : 'question',
          'It’s ' + left.map((x) => x.short).join(', '),
          'onto',
        ),
      2600,
    );
}
// the Whose? tray: you say whose it is. Only cards you placed yourself can be moved again.
function assignCard(p, nid) {
  const n = NPC[nid];
  if (!p || p.auto || p.grey || p.spare || !n || n.def.never || n.slain) return false;
  const old = cardIn(n, p.frame);
  if (old && old !== p) {
    if (old.auto || old.grey) return false;
    old.pin = null;
  }
  p.pin = nid;
  clearDash(n, p.frame);
  mergeHalves(p);
  return true;
}
function unassignCard(p) {
  if (!p || p.auto) return false;
  p.pin = null;
  return true;
}
// two halves of one of THEIR things: the half in somebody's home says whose the loose half was. One clear Home card.
function mergeHalves(p) {
  if (p.frame !== 'home' || !p.pin || p.grey || !p.true) return;
  const half = G.proofs.find((x) => x !== p && x.half && !x.pin && !x.spare && x.frame === 'home' && x.true === p.true);
  if (!half) return;
  G.proofs.splice(G.proofs.indexOf(half), 1);
  p.q = 'clear';
  p.pair = true;
  p.auto = true;
  setTimeout(() => ui.note('home', 'The two halves match', 'onto'), 1500);
}
// the cards on one of THEM you no longer need: caught, dead. THEIR things stay in your pocket, as bait.
function dropCardsOn(n) {
  for (const p of G.proofs.slice()) if (p.true === n.id || p.pin === n.id) dropCard(p);
}
// THEY take one from your flat: THEY know which one hurts. A clear card on one of THEM first, the one on the thief first of all.
function tearCard(by) {
  const real = (p) => p.pin && NPC[p.pin] && NPC[p.pin].isThem && !p.grey && p.src !== 'item';
  const pf = G.proofs
    .filter((p) => p.src !== 'item' && !p.grey && !p.spare)
    .sort(
      (a, b) =>
        (b.pin === (by && by.id)) - (a.pin === (by && by.id)) ||
        real(b) - real(a) ||
        (b.q === 'clear') - (a.q === 'clear') ||
        b.at - a.at,
    )[0];
  if (!pf) return null;
  G.proofs.splice(G.proofs.indexOf(pf), 1);
  return pf;
}
function proofImage(p) {
  if (p.rec && NPC[p.recWho]) return snapImage(NPC[p.recWho], p.rec);
  return printImage(p.pr);
}
// the polaroid that slides in when a card lands in your hands: its frame and its edge, nothing else
function proofCard(p) {
  if (!p) return;
  if (p.kept === false) return ui.note(FRAME[p.frame].icon, 'Nothing new · ' + FRAME[p.frame].name, '');
  const n = p.pin ? NPC[p.pin] : null;
  ui.card({
    char: n,
    title: n ? null : 'Whose?',
    img: proofImage(p),
    stamp: FRAME[p.frame].name.toUpperCase(),
    frame: p.frame,
    q: p.grey ? 'grey' : p.q,
  });
}
// THEIR marks in the world: what THEY drop, what THEY hide, the signs on the walls
function marksNear(x, z, r) {
  const out = [];
  for (const it of G.items)
    if (
      (it.by || it.kind === 'stash' || it.kind === 'device') &&
      it.kind !== 'trap' &&
      it.kind !== 'opened' &&
      !it.innocent &&
      Math.hypot(it.x - x, it.z - z) <= r
    )
      out.push({ key: 'it' + it.id, name: itemName(it).toLowerCase() });
  if (G.faction === 'lizards' && G.stage >= 4)
    for (const [k, [ex]] of Object.entries(EMBLEM_AT))
      if ((k === 'office' || k === 'shop' || (G.bought && G.bought[k])) && Math.hypot(ex - x, 13 - z) <= r)
        out.push({ key: 'em' + k, name: 'the gold scales on the wall' });
  return out;
}
// one of THEM at THEIR place, doing nothing you can see: a fuzzy Habit card. Somebody with a habit of their own
// standing in the same spot gets one too, and it looks just the same.
function photoMarks(chars, gotProof) {
  for (const n of chars) {
    if (gotProof.has(n) || n.def.stranger || n.exposed || n.slain || n.id === 'lenny') continue;
    const m = marksNear(n.x, n.z, 2.6)[0];
    if (!m) continue;
    const key = n.id + ':' + m.key;
    if (G.pinShots[key]) continue;
    G.pinShots[key] = 1;
    const where = placeName(n.x, n.z),
      pr = { kind: 'plain', who: n.id, what: n.short, icon: 'people', t: n.animT };
    let p = null;
    if (n.isThem)
      p = addProof({ frame: 'habit', q: 'fuzzy', true: n.id, auto: true, what: n.short + ' by ' + m.name, where, pr });
    else if (oddityIn(n, 'habit')) p = innocentCard(n, { what: n.short + ' by ' + m.name, where, pr });
    if (!p) continue;
    addNote(n, 'Photo: standing by ' + m.name + '.', { by: 'you' });
    proofCard(p);
    gotProof.add(n);
  }
}
// your hands on something of THEIRS: it's yours now, as a card, or as bait
function takeProofItem(o) {
  const p = addProof(Object.assign({ frame: 'home', src: 'item' }, o));
  proofCard(p);
  return p;
}
// a trap's bait comes out of the same pocket: a spare first, then the newest
function takeBait() {
  const items = G.proofs.filter((p) => p.src === 'item' && !p.grey);
  const p = items.find((x) => x.spare) || items[items.length - 1];
  if (!p) return null;
  G.proofs.splice(G.proofs.indexOf(p), 1);
  return p;
}
// back out of the trap, into your pocket: into its frame if the frame's still free
function returnBait(p) {
  if (!p) return;
  p.spare = false;
  if (p.pin && NPC[p.pin] && slotCard(p)) return;
  p.pin = null;
  p.spare = true;
  G.proofs.push(p);
}
// people who watched one of THEM change in the last two days, and would say so again with you in the room
const backs = (w) => !w.isThem && !w.def.stranger && !bought(w) && w.id !== 'lenny' && !(G.recant && G.recant[w.id]);
const sawRecently = (w, n) =>
  !!(w.sawChange && w.sawChange[n.id] != null && G.t - w.sawChange[n.id] <= EVIDENCE.witnessDays * 1440);
function sawItChange(n, list) {
  return list.filter((w) => backs(w) && sawRecently(w, n));
}
