//@ combat/hits — Taking hits, knockouts, hospital, limbo
//@ Defines: swing, hurt, knockOut, hospital, goAway, comeBack
//@ Uses:    sim/core, ui/interface, taken/taken, sim/pose, gfx/renderer, town/fleeing, town/echoes, chase/hunt-step, sim/characters, player/needs, …
//@ (header made by tools/map.js; stripped by build.py)
// ───────────── the hit, and what it costs. Health stays hidden while full.
function swing(c, dmg, byThem) {
  G.lastHitBy = byThem ? c.id : null;   // an id, never the person: G is saved whole
  c.tdir = Math.atan2(PLAYER.x - c.x, PLAYER.z - c.z);
  if (c.tell && c.tell.type === 'true') { const tl = c.tell; tl.lunge = true; setTimeout(() => { tl.lunge = false; }, 450); }
  else gesture(c, 'punch', 0.6, 0.4);   // already swinging: it lands a beat from now
  ui.bubble(c, 'exclaim', 'speech', 1.4);
  hurt(dmg, byThem);
}
function hurt(v, byThem) {
  if (G.over || !PLAYER.onMap) return;
  G.health = Math.max(0, G.health - v);
  gesture(PLAYER, 'flinch', 0.6, 0, 0.08);
  addStress(8);   // being attacked
  R.pulse = 1; ui.float(PLAYER, '−' + v, 'bad'); audio.sting('caught');
  if (byThem) { G.visionOff = Math.max(G.visionOff, G.t + 120); G.shakenUntil = G.t + 120; G.shakenFrom = G.t; }
  G.sickNext = true;   // Mr. Hale gives you the next day off
  if (G.health > 0) return;
  knockOut(byThem);
}
// you can't die. Beaten, you black out and lose a day: you wake up in your own bed and nobody says how you got there.
function knockOut(byThem) {
  closeMenu(); UI.fight = null; $('#fight').hidden = true; BOLTS.length = 0;
  G.health = 100; G.sickNext = true;
  if (isWorkday() && tod() < 17 * 60) G.sickDay = true;   // the day is lost, but not held against you
  for (const c of CHARS) if (c.trueForm && c.trueForm.mode === 'attack') { c.trueForm.mode = 'flee'; flee(c); }
  echo('hospital', { x: PLAYER.x, z: PLAYER.z });
  const foe = G.lastHitBy ? NPC[G.lastHitBy] || CHARS.find((c) => c.id === G.lastHitBy) || null : null; G.lastHitBy = null;
  if (G.loose) { if (byThem && foe && foe.isThem && !G.loose.upUsed && huntDown(foe)) { G.loose.upUsed = 1; return; } return gameOver('killed'); }
  if (byThem && foe && foe.isThem && (huntDown(foe) || capture('beaten', { foe, reason: 'beaten' }))) return;   // THEY don't leave you lying there: get up before it gets to you
  if (capture('out')) { const a = CAP.after; CAP.after = () => { if (a) a(); ui.note('sick', 'Everything goes dark', 'bad'); }; return; }
  ui.note('sick', 'Everything goes dark', 'bad');
  goAway('out', G.t + CTRL.knockout);
}
function hospital() {
  G.health = 100; G.sickNext = true;
  if (isWorkday() && tod() < 17 * 60) G.sickDay = true;   // the day is lost, but not held against you
  echo('hospital', { x: PLAYER.x, z: PLAYER.z });
  goAway('hospital', dayNo() * 1440 + 7 * 60);
  ui.note('sick', 'Hospital', 'bad');
}
// somewhere you can't act: the hospital, or a cell. Time runs fast until you're back.
function goAway(kind, until) {
  const P = PLAYER; hardReset(P);
  G.away = { kind, until }; G.sleeping = false; P.onMap = false; UI.aim = null;
  for (const c of CHARS) if (c.trueForm && c.trueForm.mode === 'attack') { c.trueForm.mode = 'flee'; flee(c); }
}
function comeBack() {
  const a = G.away, P = PLAYER; G.away = null;
  if (a.kind === 'held') return arrestRelease();
  if (a.kind === 'hospital' || a.kind === 'taken' || a.kind === 'out') { const b = OBJ_BY_ID.homeBed; placeChar(P, b.x + 1, b.z); P.needs.hunger = Math.max(P.needs.hunger, 55); P.needs.energy = Math.max(P.needs.energy, 70); P.needs.bladder = Math.max(P.needs.bladder, 70); }
  else { placeChar(P, 12, 18); P.needs.hunger = Math.max(20, P.needs.hunger - 25); P.needs.energy = Math.max(20, P.needs.energy - 30); }
  P.onMap = true; P.dir = P.tdir = Math.PI;
  ui.note(a.kind === 'held' ? 'badge' : 'sick', a.kind === 'hospital' ? 'Discharged' : a.kind === 'taken' ? 'You wake up. It’s ' + fmtTime(G.t) + '.' : a.kind === 'out' ? 'You wake up in your own bed. A whole day is gone.' : 'Released', a.kind === 'taken' || a.kind === 'out' ? 'bad' : '');
  cam.follow = true; if (!G.speed) G.speed = 1;
}

