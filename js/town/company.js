//@ town/company — Come with me; the witnesses THEY go after at night, and standing guard for one
//@ Defines: resolveCome, followAct, endFollow, witnessNight, witnessTick, recant, witnessSaved
//@ Uses:    sim/core, ui/interface, core/util, data/tuning, data/lines, sim/actions, world/paths, them/proofs, town/suspicion, sim/movement, …
//@ (header made by tools/map.js; stripped by build.py)
// ───────────── company. Anyone who likes you enough comes with you for an hour, and stands in the crowd when you call
// someone out (secretly THEM, or bought, they count against you). And THEY know who saw: at night THEY go after a
// witness. Lizards buy them off, aliens wipe it out of their heads, the dead make sure. Be outside their door, and it's
// you THEY meet.
function resolveCome(n) {
  const F = G.follower && NPC[G.follower.id];
  if (F && F !== n) endFollow(F, true);
  if (n.rel < EVIDENCE.come.rel || n.sus >= 60 || asleep(n) || n.fleeing) {
    ui.say(n, pick(COME_WITH.no), 3);
    return;
  }
  ui.say(n, pick(COME_WITH.yes), 3);
  G.follower = { id: n.id, until: G.t + EVIDENCE.come.mins };
  for (const a of n.queue) a.cancel = true;
  enqueue(n, followAct(n));
}
// a step behind you, wherever you go, for the hour
function followAct(n) {
  return mkAct({
    kind: 'wait',
    label: 'With you',
    icon: 'walk',
    dur: null,
    anim: 'idle',
    interruptible: false,
    onStart: (c, a) => (a.rp = 99),
    onTick: (c, a, dt) => {
      const F = G.follower,
        P = PLAYER;
      if (!F || F.id !== c.id || G.t > F.until || !P.onMap || G.away || G.sleeping || c.fleeing) {
        a.cancel = true;
        c.path = null;
        c.moving = false;
        endFollow(c);
        return;
      }
      const d = Math.hypot(P.x - c.x, P.z - c.z);
      if (d < 1.8) {
        c.path = null;
        c.moving = false;
        c.tdir = Math.atan2(P.x - c.x, P.z - c.z);
        return;
      }
      a.rp += dt;
      if (a.rp > 0.6 || !c.path || c.pi >= c.path.length) {
        a.rp = 0;
        const t = nearestWalkable(P.x, P.z, c, 2);
        if (t) setPath(c, t[0], t[1]);
      }
      c.run = d > 5;
      followPath(c, dt);
    },
  });
}
function endFollow(c, quiet) {
  if (!G.follower || G.follower.id !== c.id) return;
  G.follower = null;
  if (!quiet && c.onMap && !asleep(c)) ui.say(c, pick(COME_WITH.bye), 2.6);
}
// ── at 20:00: tonight one of THEM goes after somebody who saw it change
function witnessNight() {
  G.witVisit = null;
  const list = [];
  for (const m of alive())
    if (!m.under && !m.gone)
      for (const w of suspects())
        if (w !== m && !w.gone && !w.isThem && backs(w) && sawRecently(w, m)) list.push([w, m]);
  if (!list.length) return;
  const [w, m] = pick(list);
  G.witVisit = { w: w.id, m: m.id, at: G.t + rand(4.5, 6.5) * 60 };
}
const witnessDoor = (w) =>
  HOUSE_OF[w.id] ? HOUSE_OF[w.id].spot : w.id === 'agnes' ? [18, 22] : w.onMap ? [w.x, w.z] : null;
function witnessTick() {
  const V = G.witVisit;
  if (!V || G.t < V.at || CAP.on || HUNT.on) return;
  G.witVisit = null;
  const w = NPC[V.w],
    m = NPC[V.m],
    P = PLAYER;
  if (!w || !m || m.slain || m.surrendered || w.gone || !sawRecently(w, m)) return;
  const at = witnessDoor(w);
  const guard = at && P.onMap && !G.sleeping && !G.away && Math.hypot(P.x - at[0], P.z - at[1]) < 7;
  if (guard && !m.trueForm) {
    // you're standing at their door: it comes up the street, and it's you it meets
    const spot = nearestWalkable(P.x + (P.x < at[0] ? -4 : 4), P.z + 2, m, 4) || nearestWalkable(P.x, P.z + 3, m, 4);
    if (spot) {
      hardReset(m);
      placeChar(m, spot[0], spot[1]);
      m.onMap = true;
      m.shown = 1;
      m.cfOk = G.t;
      if (trueForm(m, 'hit', 'attack') && m.trueForm) {
        m.trueForm.guard = w.id;
        m.trueForm.cornered = true;
        privateFight(m);
        ui.note('eye', 'Something’s coming up the street', 'bad');
        return;
      }
    }
  }
  recant(w, m);
}
// nobody there to stop it
function recant(w, m) {
  const why = G.faction === 'lizards' ? 'bribed' : G.faction === 'aliens' ? 'wiped' : 'dead';
  G.recant[w.id] = why;
  if (why === 'bribed') buy(w, m.id, true);
  else if (why === 'wiped') {
    if (w.sawChange) delete w.sawChange[m.id];
    G.chipped[w.id] = 1;
    w.lostDay = dayNo(G.t + 6 * 60);
    markVictim(w, m.id);
  } else removeVictim(w, 'killed', witnessDoor(w) || [w.x || 20, w.z || 15]);
  setTimeout(() => {
    if (!G.over)
      ui.note('people', w.short + (why === 'dead' ? ' · gone in the night' : ' won’t talk about it any more'), 'bad');
  }, 1500);
}
// you stood guard, and it didn't get them
function witnessSaved(id) {
  const w = NPC[id];
  if (!w || w.gone) return;
  relFx(w, EVIDENCE.saved);
  delete G.recant[id];
  ui.note('people', w.short + ' · safe', 'good');
}
