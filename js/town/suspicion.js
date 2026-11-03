//@ town/suspicion — Suspicion and danger per person
//@ Defines: addSus, snapAt, addDanger, seesSpot, reactTo, ridicule, hitBack
//@ Uses:    sim/core, ui/interface, core/util, them/awareness, data/tuning, town/fleeing, world/grid, combat/melee, town/echoes, town/arrest, …
//@ (header made by tools/map.js; stripped by build.py)
// ───────────── suspicion
function addSus(n, v) {
  if (!n || n.isPlayer || !n.def || n.def.stranger) return;
  const b0 = n.sus;
  if (v > 0 && G.bought && G.bought[n.id]) v *= 1.5;
  n.sus = clamp(n.sus + v, 0, !n.isThem && temper(n) ? SUS_SNAP : 100); // past 100: ordinary people only
  if (n.isThem && b0 < 60 && n.sus >= 60 && !G.sus60[n.id]) {
    G.sus60[n.id] = 1;
    book(n).sus = 1;
  }
  snapAt(n);
}
// an ordinary person who's had enough of you (suspicion at SUS_SNAP): the moment they can see you, they snap, by temper,
// and it falls back to 100. Walking near them does nothing: only the odd things they've seen and heard you do get them here.
function snapAt(n) {
  const P = PLAYER;
  if (n.sus < SUS_SNAP || n.isThem || !canPanic(n) || n.fleeing || n.trueForm || n.engaged || asleep(n)) return;
  if (!P.onMap || G.away || G.over || ARREST.on || CELL.on || HUNT.on || CAP.on || !npcSeesPlayer(n, 9)) return;
  n.sus = 100;
  n.reactAt = G.t;
  const t = temper(n);
  if (t === 'aggressive') return hitBack(n);
  if (t === 'mocker') return ridicule(n);
  flee(n);
}
const asleep = (n) => !!(n.queue[0] && n.queue[0].anim === 'sleep' && n.queue[0].stage === 'run');

// ───────────── danger: how cornered someone feels right now. Past 70 they react; below that, everyone looks the same.
// Pinned down: one of THEM with 70+ evidence, or photographed or walked in on during a tell today.
const holding = (n) => caseCards(n).filter((p) => cardHolds(p, n)).length; // cards on them that would hold up
const pinned = (n) => !!(n.isThem && (holding(n) >= 3 || n.pinnedDay === dayNo()));
const dangerFloor = (n) => (n.isThem ? 10 * G.slain.length : 0); // the last of three sits at 20
const canPanic = (n) => !!(n && !n.isPlayer && n.def && !n.def.stranger && n.id !== 'lenny' && !n.exposed && n.onMap);
function addDanger(n, v) {
  if (!canPanic(n)) return;
  if (v > 0 && pinned(n)) v *= 1.5; // pinned members gain more from everything
  const before = n.danger;
  n.danger = clamp(n.danger + v, dangerFloor(n), 100);
  n.dangerPeak = Math.max(n.dangerPeak || 0, n.danger);
  if (n.trueForm || n.fleeing || n.hideUntil || !n.isThem) return; // ordinary people snap at suspicion instead (snapAt)
  if (n.danger >= 90 && before < 90) return reactTo(n, 'cornered');
  if (n.danger >= 70 && before < 70) reactTo(n);
}
// can w see the spot (no need to face it: something like that, you notice)
function seesSpot(w, x, z, maxD = 10) {
  if (!w.onMap || asleep(w)) return false;
  const d = Math.hypot(x - w.x, z - w.z);
  if (d > maxD) return false;
  const rw = roomAt(w.x, w.z),
    rx = roomAt(x, z);
  if (rw && rw === rx) return true;
  if (!losClear(Math.floor(w.x), Math.floor(w.z), Math.floor(x), Math.floor(z))) return false;
  return lumAt(x, z) >= 0.12 || d < 2.6;
}
// ordinary people who can see someone right now
const bystanders = (n, maxD = 10) =>
  CHARS.filter((w) => w !== n && !w.isPlayer && !w.isThem && w.onMap && !w.fleeing && seesSpot(w, n.x, n.z, maxD));
// the Fight or flight flow for THEM, by how cornered they are (normal people: snapAt)
function reactTo(n, why) {
  if (G.t - (n.reactAt || -999) < 60 && why !== 'cornered' && why !== 'pinned') return;
  n.reactAt = G.t;
  if ((n.danger >= 90 || why === 'pinned') && trueForm(n, why)) return; // too early, too light, in the street: it keeps its face and acts it out
  if (holding(n) < 3) return ridicule(n);
  flee(n);
}
function ridicule(n) {
  ui.say(
    n,
    pick([
      'Everyone — look at this one!',
      'Ha! The lunatic’s at it again.',
      'Somebody call a doctor. For them.',
      'You hear yourself? Listen to yourself.',
    ]),
    3.5,
  );
  ui.bubble(n, 'laugh', 'speech', 2.5);
  for (const b of earshot(n)) {
    addSus(b, 10);
    ui.bubble(b, 'laugh', 'speech', 2);
  }
  n.danger = Math.max(dangerFloor(n), n.danger - 25);
  echo('ridicule', { x: n.x, z: n.z, who: n.id });
}
// an aggressive person squares up and swings at you
function hitBack(n) {
  ui.say(n, pick(['That’s ENOUGH.', 'You want a fight?', 'Back off!']), 2.5);
  ui.bubble(n, 'exclaim', 'speech', 2);
  hardReset(n);
  brawl(n, HURT.punch, { label: 'Fight', giveUp: 5 });
  echo('fight', { x: n.x, z: n.z, who: n.id });
}
