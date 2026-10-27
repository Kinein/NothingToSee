//@ player/needs — The player body: needs, Psychic, accidents, passing out, panic
//@ Defines: setNeed, applyNeedFx, bump, shakenNote, stressBand, mood, moodWord, needsTick, accident, passOut, breakdown
//@ Uses:    sim/core, ui/interface, sim/actions, data/tuning, core/util, gfx/renderer, world/grid, them/tells, town/suspicion, audio/sound, …
//@ (header made by tools/map.js; stripped by build.py)
// ───────────────────────── the player's body
// how well a need is doing, 0 bad … 100 fine (stress is the one that counts the other way)
const lvl = (k) => (k === 'stress' ? 100 - PLAYER.needs.stress : PLAYER.needs[k]);
function setNeed(k, v) { PLAYER.needs[k] = clamp(v, k === 'stress' ? G.stressFloor : 0, 100); }
function applyNeedFx(fx, dt) {
  const N = PLAYER.needs;
  for (const k in fx) { if (k in N) { const v = k === 'stress' && fx[k] > 0 ? fx[k] * STRESS_K.rate : fx[k]; setNeed(k, N[k] + (v * dt) / 60); } }
}
function bump(k, v) { if (k in PLAYER.needs) setNeed(k, PLAYER.needs[k] + v); }
const addStress = (v) => bump('stress', v > 0 ? v * STRESS_K.event : v);
const tooShaken = () => !!(PLAYER && PLAYER.needs && PLAYER.needs.stress >= SHAKEN_LOCK);
function shakenNote() {
  if (R.time < (UI.shakenNoteCd || 0)) return;
  UI.shakenNoteCd = R.time + 2.5;
  ui.bubble(PLAYER, 'nerve', 'thought', 2);
  ui.note('nerve', 'Too shaken to face anyone', 'warn');
}
// 0 calm · 1 tense · 2 shaken · 3 breaking · 4 panic
function stressBand(s = PLAYER.needs.stress) { return s >= 100 ? 4 : s >= 80 ? 3 : s >= 60 ? 2 : s >= 40 ? 1 : 0; }
function mood() { const N = PLAYER.needs; return (N.hunger + N.energy + N.bladder * 0.7 + (100 - N.stress) * 1.3) / 4.0; }
function moodWord() {
  const N = PLAYER.needs, m = mood();
  if (N.stress >= 85) return 'Coming apart';
  if (N.energy < 12) return 'Exhausted';
  if (N.hunger < 12) return 'Starving';
  if (N.bladder < 12) return 'Desperate';
  if (N.stress >= 60) return 'Shaken';
  if (N.stress >= 40) return 'Tense';
  if (m > 72) return 'Steady';
  if (m > 55) return 'Fine';
  if (m > 38) return 'Frayed';
  return 'Miserable';
}
function needsTick(dt) {
  if (G.away) return;
  const P = PLAYER, N = P.needs, a = P.queue[0];
  const sleeping = a && a.sleep && a.stage === 'run';
  const base = {};
  for (const d of NEEDS) base[d.k] = d.rate;
  if (sleeping) { base.hunger = -2.6; base.energy = 0; base.bladder = -4.2; base.stress = 0; }
  const h = hourF(), i = I(Math.floor(P.x), Math.floor(P.z));
  const room = roomAt(P.x, P.z);
  const dark = cellLum(i) < 0.12;
  if (!sleeping) {
    if (dark && (h >= 21 || h < 6)) base.stress += 3;          // darkness at night
    else if (dark) base.stress += 1;
    if (room && room.home && !dark) base.stress -= 2;          // a lit home
    if (!room && (h >= 21 || h < 5.5)) base.stress += 2;       // outdoors late
    for (const k of ['hunger', 'energy', 'bladder']) if (N[k] < 15) base.stress += 2;
    if (N.hunger < 12) base.energy -= 3;                       // starving
    if (inShift() && G.workBar < 30) base.stress += 3;         // a red work bar
    if (G.inv.foilOn) base.stress -= 2.5;
    if (G.hotRooms && room && G.hotRooms.includes(room.key)) base.stress += 4;
  }
  applyNeedFx(base, dt);
  // an hour above 70 raises the long-term floor
  if (N.stress > 70) { G.hiStress += dt; while (G.hiStress >= 60) { G.hiStress -= 60; G.stressFloor = Math.min(50, G.stressFloor + 2); } }
  autonomy(dt);
  if (N.bladder <= 0 && !G.accidentLock) accident();
  if (N.energy <= 0 && !sleeping && !(a && a.passout)) passOut();
  if (N.stress >= 99.9 && !(a && a.breakdown) && !hunted()) breakdown();
  G.thoughtCd -= dt;
  if (G.thoughtCd <= 0 && !sleeping) {
    G.thoughtCd = rand(35, 60);
    let low = null; for (const d of NEEDS) if (lvl(d.k) < 28 && (!low || lvl(d.k) < lvl(low.k))) low = d;
    if (low) ui.bubble(P, low.icon, 'thought', 3.5);
  }
}
const hunted = () => HUNT.on || CHARS.some((c) => c.trueForm && c.trueForm.mode === 'attack' && c.onMap);
function accident() {
  const P = PLAYER, N = P.needs;
  G.accidentLock = true; setTimeout(() => (G.accidentLock = false), 3000);
  N.bladder = 100; addStress(10);
  addItem({ kind: 'puddle', x: P.x, z: P.z, rot: Math.random() * 3 });
  let seen = 0;
  for (const n of CHARS) if (!n.isPlayer && n.onMap && npcSeesPlayer(n, 7)) { n.rel -= 8; addSus(n, 8); seen++; ui.bubble(n, 'exclaim', 'speech', 3); }
  ui.note('toilet', seen ? 'Accident · ' + seen + ' saw' : 'Accident', 'bad');
  audio.sting('awkward');
}
function passOut() {
  const P = PLAYER;
  hardReset(P);
  const starving = P.needs.hunger <= 1;
  enqueue(P, mkAct({ kind: 'wait', label: 'Passed out', icon: 'bed', passout: true, interruptible: false, dur: starving ? 300 : 180,
    onStart: (c) => { c.pose = 'floorlie'; },
    onTick: (c, a, dt) => { c.anim = 'sleep'; applyNeedFx({ energy: 22, stress: 2 }, dt); },
    onEnd: (c) => {
      c.pose = 'stand';
      if (starving) { const b = OBJ_BY_ID.homeBed; placeChar(c, b.x + 1, b.z); c.needs.hunger = 45; G.health = Math.max(20, G.health - 25); ui.note('sick', 'Hospital', 'bad'); }
    } }), true);
  ui.note('bed', 'Passed out', 'bad');
}
function breakdown() {
  const P = PLAYER;
  hardReset(P);
  enqueue(P, mkAct({ kind: 'wait', label: 'Panic', icon: 'nerve', breakdown: true, interruptible: false, dur: 12,
    onStart: (c) => { c.pose = 'floor'; },
    onTick: (c) => { c.anim = 'shake'; },
    onEnd: (c) => { c.pose = 'stand'; setNeed('stress', 72); } }), true);
  for (const n of CHARS) if (!n.isPlayer && n.onMap && npcSeesPlayer(n, 8)) { n.rel -= 5; addSus(n, 5); ui.bubble(n, 'question', 'speech', 3); }
  ui.note('nerve', 'Panic attack', 'bad');
  audio.sting('whisper');
}

