//@ them/servants — THEIR people: who THEY own, THEIR mark from day 4, the truth beaten out
//@ Defines: servantKind, markOf, markWalk, confess
//@ Uses:    sim/core, ui/interface, data/lines, them/moves, data/tuning, them/plan, core/util
//@ (header made by tools/map.js; stripped by build.py)
// ───────────── THEIR people. Whoever THEY own: the bribed (lizards), the chipped and the controlled (aliens), the bitten
// (the dead). From day MARK.from on, THEY and all of them wear THEIR mark, which narrows the search but never says which
// ones are THEM. Beaten to the edge of passing out, or giving in, anyone tells the truth.
// what someone is to THEM: 'them', 'chipped', 'bitten', 'bribed', or '' for nobody's
function servantKind(n) {
  if (!n || n.isPlayer) return '';
  if (n.isThem) return 'them';
  if (G.chipped[n.id] || (G.control && G.control.who === n.id) || n.thrall === 'aliens') return 'chipped';
  if (G.bitten[n.id] || n.thrall === 'zombies') return 'bitten';
  if (bought(n) || n.thrall === 'lizards') return 'bribed';
  return '';
}
// the mark someone wears today: THEIR faction, or '' (a moment's control leaves none)
function markOf(c) {
  if (!G || G.stage < MARK.from || c.isPlayer || c.slain || !c.def || c.def.stranger) return '';
  return c.isThem || c.thrall || G.chipped[c.id] || G.bitten[c.id] || bought(c) ? G.faction : '';
}
// the morning it first shows
STAGE_HOOKS.push((s) => {
  if (s === MARK.from) setTimeout(() => ui.note('eye', MARK_NEWS[G.faction], 'onto'), 6000);
});
// the dead walk, more of it: the lurch, the arms hanging forward, the head down
function markWalk(c, T) {
  if (!c.moving) return;
  const p = c.vph != null ? c.vph : c.walkPh;
  T.roll = (T.roll || 0) + Math.sin(p) * 0.05;
  T.uaL = -0.75 + Math.sin(c.animT * 3) * 0.08;
  T.uaR = -0.85 + Math.cos(c.animT * 2.6) * 0.08;
  T.faL = T.faR = -0.2;
  T.hp += 0.18;
}
// the truth, in their own words. Beaten: said out loud, and you'll remember it.
function confess(n, beaten) {
  const k = servantKind(n) || 'innocent',
    said = pick(k === 'them' ? CONFESS.them[G.faction] : CONFESS[k]);
  if (!G.confessed[n.id]) {
    G.confessed[n.id] = k;
    G.leads.push(n.short + ': “' + said + '”');
    if (G.leads.length > 6) G.leads.shift();
  }
  if (beaten) {
    ui.say(n, said, 4);
    ui.bubble(n, k === 'innocent' ? 'exclaim' : 'flag', 'speech', 3);
  }
  return said;
}
