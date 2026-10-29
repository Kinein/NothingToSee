//@ player/work — The work bar, shifts, getting fired
//@ Defines: playerAtDesk, inOffice, workTick, workHit, workLost, goodDay, onTimeCross, newDay
//@ Uses:    sim/core, ui/interface, data/tuning, core/util, them/plan, them/night-attacks, game/state, them/awareness, world/grid, town/arrest, …
//@ (header made by tools/map.js; stripped by build.py)
// ───────────────────────── work
function playerAtDesk() {
  const a = PLAYER.queue[0];
  return !!(a && a.work && a.stage === 'run');
}
function inOffice() {
  const r = roomAt(PLAYER.x, PLAYER.z);
  return !!(PLAYER.onMap && r && r.bld === 'office');
}
const workBand = (v = G.workBar) => (v < WORK.low ? 'bad' : v < 60 ? 'warn' : 'ok');
// The work bar is your job, and nothing else. It only moves during the shift: seated at your own desk it fills,
// anywhere else it drains, and fast: half a shift away from it empties a full bar. Empty, and Hale lets you go: that's the end of it.
// In handcuffs or a cell it holds where it was: Hale can't sack you for being where the police put you.
function workTick(dt) {
  if (!inShift() || G.loose || ARREST.on || (G.away && G.away.kind === 'held')) return;
  const cur = PLAYER.queue[0];
  if (playerAtDesk()) {
    if (!cur.bonused) {
      cur.bonused = true;
      if (G.t - G.workBonusAt >= 60) {
        G.workBonusAt = G.t;
        G.workBar = Math.min(100, G.workBar + WORK.sit);
        ui.float(PLAYER, '+' + WORK.sit, 'good');
      }
    }
    const sb = stressBand();
    G.workBar = Math.min(100, G.workBar + ((WORK.fill * dt) / 60) * (sb >= 2 ? 0.5 : sb === 1 ? 0.75 : 1));
    G.awayT = 0;
    G.workWarned = false;
  } else {
    G.workBar -= ((WORK.drain * dt) / 60) * (G.overtimeToday ? 1.6 : 1);
    G.awayT += dt;
    if (G.workBar < WORK.low && !G.workWarned) {
      G.workWarned = true;
      ui.note('work', 'Hale will notice', 'warn');
    }
    if (G.workBar <= 0) return workLost();
  }
}
// something knocks the bar (THEIR sabotage, a scene at your desk): it can bring you to the edge, never over it
function workHit(v) {
  G.workBar = Math.max(Math.min(G.workBar, 4), G.workBar - v);
}
function workLost() {
  G.workBar = 0;
  audio.sting('awkward');
  gameOver('fired');
}
// a good day's work, at five: the people you work with find you a little less weird
function goodDay() {
  if (!isWorkday() || G.sickDay || G.workBar < 75 || G.over) return;
  for (const n of suspects()) if (!n.gone && (n.plan || []).some((b) => b.a === 'work')) addSus(n, -6);
  ui.note('work', 'A good day’s work', 'good');
}
function onTimeCross(t0, t1) {
  const cross = (m) => Math.floor((t1 - m) / 1440) > Math.floor((t0 - m) / 1440);
  if (cross(0)) newDay();
  if (cross(5 * 60 + 30)) dawnTick();
  if (cross(20 * 60)) planNight();
  if (cross(6 * 60)) {
    if (G.huntNights > 0) G.huntNights--; // one night of being hunted gone by
    applyAwareness();
    framingMorning();
    morningResist();
    morningPaper();
    planDay();
    morningFound();
    clinicCheck();
    if (G.over) return;
    saveGame();
    if (!G.sleeping) ui.dayCard();
  }
  if (cross(9 * 60) && isWorkday() && !G.sickDay && !playerAtDesk())
    ui.note('work', G.overtimeToday ? 'Overtime · it drains twice as fast' : 'Shift started', 'warn');
  if (cross(180) && dayNo() === G.gatherDay) gatheringOver();
  if (cross(17 * 60)) goodDay();
  if (cross(17 * 60) && G.sickDay) G.sickDay = false;
  if (cross(22 * 60 + 50) && NPC.vic.onMap && NPC.vic.shown > 0.5) ui.say(NPC.vic, 'Closing up.', 3);
  for (const n of CHARS) if (n.plan) for (const b of n.plan) if (cross(b.s)) n.thinkCd = 0;
}
function newDay() {
  const d = dayNo();
  if (!G.gatherDay || G.gatherDay < d) G.gatherDay = d + gatherGap();
  advanceWeek();
  if (G.over) return;
  wreckReset(); // whatever got thrown at you yesterday is back where it stood
  marks();
  if (G.tearTonight > 0) {
    // after a failed confrontation THEY come into your flat and take a card
    G.tearTonight = 0;
    if (tearCard(pick(covert()))) setTimeout(() => !G.over && ui.note('print', 'A card is gone. Torn.', 'bad'), 2600);
  }
  G.sickDay = !!G.sickNext && isWorkday(d);
  G.sickNext = false;
  G.workWarned = false;
  G.workBar = Math.min(100, G.workBar + 15); // a night's sleep on it: Hale forgets a little
  if (G.sickDay) setTimeout(() => ui.note('sick', 'Hale: take the day off', ''), 1200);
  G.momToday = false;
  G.mailToday = false;
  G.overtimeToday = false;
  if (PLAYER.needs.stress < 30) G.stressFloor = Math.max(0, G.stressFloor - 3); // a calm day eases the floor
  for (const n of CHARS) if (!n.isPlayer && !n.def.stranger) n.sus = Math.max(0, n.sus - 3);
  G.rainDay = chance(0.34);
  G.rainAmt = rand(0.5, 1);
  G.rainFrom = rand(14, 21);
  G.rainTo = rand(1, 6);
  if (dow(d) === 0) G.momWeek = false;
  for (const n of CHARS) if (n.def.plan) makePlan(n);
}
