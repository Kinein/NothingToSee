//@ them/proofs — Proofs: photos and THEIR things in your hands
//@ Defines: PROOF_RANK, PROOF_TELL, ODD_STRONG, addProof, refreshEvidence, proofImage, proofCard, marksNear, photoMarks, takeProofItem, takeBait, sawItChange
//@ Uses:    sim/core, gfx/portraits, ui/interface, town/cast, ui/menus, them/plan, play/photos, town/cell, them/moves
//@ (header made by tools/map.js; stripped by build.py)
// ───────────── proofs: things in your hands. A print, or something of THEIRS. Confronting someone spends the best
// four you hold on them, for good. A STRONG proof says so on its face; everything else is a "?" until it's said out loud.
//   strong  · one of THEM doing THEIR business in human shape (a stash, an envelope, a device, the gathering),
//             or THEIR things hidden in their own desk or home
//   medium  · something THEY dropped that you picked up; THEM caught mid-change (whose face it was is your call)
//   weak    · THEIR things in a shared place; a true form with no face; THEM doing something merely odd
//   mislead · someone standing by THEIR marks. It might be them. It usually isn't.
// A proof pinned on the wrong person proves nothing at all.
const PROOF_RANK = { strong: 4, medium: 3, weak: 2, mislead: 1 };
const PROOF_TELL = { half: 'medium', flicker: 'medium', shed: 'medium', limb: 'medium' };   // the skin slipping is halfway to a change
const ODD_STRONG = new Set(['stash', 'envelope', 'control', 'drain', 'lure', 'rack', 'copier', 'ledger', 'implant']);
function addProof(o) {
  const p = Object.assign({ id: ++G.proofId, at: G.t, pin: null, auto: false, src: 'photo' }, o);
  if (p.auto) p.pin = p.true;
  if (!p.pr) p.pr = { kind: p.src === 'item' ? 'item' : 'plain', icon: p.icon || 'bag', what: p.what, at: p.at };
  p.pr.id = 'pf' + p.id; p.pr.at = p.at;
  G.proofs.push(p);
  refreshEvidence();
  return p;
}
const proofCat = (p, n) => (n && p.true === n.id ? p.cat : 'mislead');
const proofShownStrong = (p) => p.cat === 'strong' && p.auto;
const proofLabel = (p) => (proofShownStrong(p) ? 'STRONG' : '?');
const proofsOn = (n) => G.proofs.filter((p) => p.pin === n.id).sort((a, b) => PROOF_RANK[proofCat(b, n)] - PROOF_RANK[proofCat(a, n)] || b.at - a.at);
const topProofs = (n) => proofsOn(n).slice(0, 4);
const looseProofs = () => G.proofs.filter((p) => !p.pin);
function refreshEvidence() {
  for (const n of suspects()) {
    const ps = G.proofs.filter((p) => p.pin === n.id);
    n.evidence = n.slain || n.exposed ? 100 : ps.some(proofShownStrong) ? 100 : Math.min(80, ps.length * 20);
  }
}
function proofImage(p) {
  if (p.rec && NPC[p.recWho]) return snapImage(NPC[p.recWho], p.rec);
  return printImage(p.pr);
}
// the polaroid that slides in when a proof lands in your hands
function proofCard(p, before) {
  const n = p.pin ? NPC[p.pin] : null;
  if (n) ui.card({ char: n, img: proofImage(p), stamp: proofShownStrong(p) ? 'STRONG' : '? PROOF', before, after: n.evidence, strong: proofShownStrong(p) });
  else ui.card({ title: p.what, img: proofImage(p), stamp: 'WHOSE?' });
}
// THEIR marks in the world: what THEY drop, what THEY hide, the signs on the walls
function marksNear(x, z, r) {
  const out = [];
  for (const it of G.items) if ((it.by || it.kind === 'stash' || it.kind === 'device') && it.kind !== 'trap' && it.kind !== 'opened' && Math.hypot(it.x - x, it.z - z) <= r) out.push({ key: 'it' + it.id, name: itemName(it).toLowerCase() });
  if (G.faction === 'lizards' && G.stage >= 4) for (const [k, [ex]] of Object.entries(EMBLEM_AT)) if ((k === 'office' || k === 'shop' || (G.bought && G.bought[k])) && Math.hypot(ex - x, 13 - z) <= r) out.push({ key: 'em' + k, name: 'the gold scales on the wall' });
  return out;
}
// whoever stands in the frame next to one of THEIR marks gets it pinned on them. THEY plant marks where you'd look.
function photoMarks(chars, gotProof) {
  for (const n of chars) {
    if (gotProof.has(n) || n.def.stranger || n.exposed || n.slain || n.id === 'lenny') continue;
    const m = marksNear(n.x, n.z, 2.6)[0]; if (!m) continue;
    const key = n.id + ':' + m.key; if (G.pinShots[key]) continue;
    G.pinShots[key] = 1;
    const before = n.evidence;
    const p = addProof({ cat: n.isThem ? 'weak' : 'mislead', true: n.id, auto: true, what: n.short + ' by ' + m.name, where: placeName(n.x, n.z), pr: { kind: 'plain', who: n.id, what: n.short, icon: 'people', t: n.animT } });
    addNote(n, 'Photo: standing by ' + m.name + '.', { by: 'you' });
    proofCard(p, before);
    gotProof.add(n);
  }
}
// your hands on something of THEIRS: it's yours now, as proof, or as bait
function takeProofItem(o) {
  const n = NPC[o.true];
  const before = o.auto && n ? n.evidence : 0;
  const p = addProof(Object.assign({ cat: 'medium', src: 'item' }, o));
  proofCard(p, before);
  return p;
}
// a trap's bait comes out of the same pocket
function takeBait() {
  const i = G.proofs.map((p) => p.src === 'item').lastIndexOf(true); if (i < 0) return null;
  const p = G.proofs.splice(i, 1)[0]; refreshEvidence(); return p;
}
// people who watched one of THEM change, and would say so again with you in the room
const backs = (w) => !w.isThem && !w.def.stranger && !bought(w) && w.id !== 'lenny';
function sawItChange(n, list) { return list.filter((w) => backs(w) && w.sawChange && w.sawChange[n.id]); }
