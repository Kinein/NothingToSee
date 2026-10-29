//@ player/needs — The player body: needs, Psychic, accidents, passing out, panic
//@ Defines: setNeed, applyNeedFx, bump, psyDrop, shakenNote, stressBand, mood, moodWord, needsTick, psyDrain, accident, passOut, breakdown
//@ Uses:    sim/core, data/tuning, ui/interface, sim/actions, core/util, gfx/renderer, world/grid, them/tells, town/suspicion, audio/sound, …
//@ (header made by tools/map.js; stripped by build.py)
// ───────────────────────── the player's body
// how well a need is doing, 0 bad … 100 fine (stress is the one that counts the other way)
const lvl = (k) => (k === 'stress' ? 100 - PLAYER.needs.stress : PLAYER.needs[k]);
function setNeed(k, v) {
  PLAYER.needs[k] = clamp(v, 0, 100);
}
// what an action does to you while it runs. It can calm you; it never shakes you: Psychic only falls in steps (psyDrop)
// and drains near IT (psyDrain).
function applyNeedFx(fx, dt) {
  const N = PLAYER.needs;
  for (const k in fx) if (k in N && !(k === 'stress' && fx[k] > 0)) setNeed(k, N[k] + (fx[k] * dt) / 60);
}
function bump(k, v) {
  if (k in PLAYER.needs) setNeed(k, PLAYER.needs[k] + v);
}
// relief only: something that calms you. Nothing small shakes you any more (see psyDrop).
const addStress = (v) => v < 0 && bump('stress', v);
const psychic = () => (PLAYER && PLAYER.needs ? 100 - PLAYER.needs.stress : 100);
// a big step: Psychic falls to this mark, if it's higher. Seeing THEIR thing or a sign, a true form, a fight with one.
function psyDrop(to) {
  if (psychic() > to) setNeed('stress', 100 - to);
}
const psyMark = (kind) => psyDrop(PSY[kind]);
// under 20: no gossip and no confronting. Anything else (chat, fighting, your hands) still works.
const tooShaken = () => psychic() < PSY.mute;
const shaky = () => psychic() < PSY.shaky; // under 40 your hands shake: no photos
function shakenNote(what) {
  if (R.time < (UI.shakenNoteCd || 0)) return;
  UI.shakenNoteCd = R.time + 2.5;
  ui.bubble(PLAYER, 'nerve', 'thought', 2);
  ui.note('nerve', what || 'Too shaken to say it', 'warn');
}
// 0 calm · 1 tense · 2 shaken · 3 breaking · 4 panic
function stressBand(s = PLAYER.needs.stress) {
  return s >= 100 ? 4 : s >= 80 ? 3 : s >= 60 ? 2 : s >= 40 ? 1 : 0;
}
function mood() {
  const N = PLAYER.needs;
  return (N.hunger + N.energy + N.bladder * 0.7 + (100 - N.stress) * 1.3) / 4.0;
}
function moodWord() {
  const N = PLAYER.needs,
    m = mood();
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
  const P = PLAYER,
    N = P.needs,
    a = P.queue[0];
  const sleeping = a && a.sleep && a.stage === 'run';
  const base = {};
  for (const d of NEEDS) base[d.k] = d.rate;
  if (sleeping) {
    base.hunger = -2.6;
    base.energy = 0;
    base.bladder = BLADDER.asleep;
    base.stress = 0;
  }
  const h = hourF(),
    i = I(Math.floor(P.x), Math.floor(P.z));
  const room = roomAt(P.x, P.z);
  const dark = cellLum(i) < 0.12;
  if (!sleeping) {
    if (dark && (h >= 21 || h < 6)) base.stress += PSY.dark; // the dark at night: a slow drift
    if (room && room.home && !dark) base.stress -= 2; // a lit home
    if (N.hunger < 12) base.energy -= 3; // starving
    if (G.inv.foilOn) base.stress -= 2.5;
  }
  for (const k in base) if (k in N) setNeed(k, N[k] + (base[k] * dt) / 60);
  if (!sleeping) psyDrain(dt, room);
  autonomy(dt);
  if (N.bladder <= 0 && !G.accidentLock) accident();
  if (N.energy <= 0 && !sleeping && !(a && a.passout)) passOut();
  if (N.stress >= 99.9 && !(a && a.breakdown) && !hunted()) breakdown();
  G.thoughtCd -= dt;
  if (G.thoughtCd <= 0 && !sleeping) {
    G.thoughtCd = rand(35, 60);
    let low = null;
    for (const d of NEEDS) if (lvl(d.k) < 28 && (!low || lvl(d.k) < lvl(low.k))) low = d;
    if (low) ui.bubble(P, low.icon, 'thought', 3.5);
  }
}
const hunted = () => HUNT.on || CHARS.some((c) => c.trueForm && c.trueForm.mode === 'attack' && c.onMap);
// near IT, Psychic drains: fast by a true form you can see or something wrong going on (a rite, one of THEM changing),
// slowly by THEIR things. Seeing them is a step too: a true form drops you to 50, THEIR thing or a sign to 70.
const psySees = (x, z, r) => Math.hypot(x - PLAYER.x, z - PLAYER.z) <= r && visAt(x, z) > 0.45;
function psyDrain(dt, room) {
  const P = PLAYER;
  if (!P.onMap) return;
  let fast = false,
    slow = false;
  for (const c of CHARS) {
    if (c.isPlayer || !c.onMap || c.shown < 0.4) continue;
    const form = c.trueForm || (c.tell && c.tell.type === 'true');
    if (form && psySees(c.x, c.z, PSY.near)) {
      psyMark('form');
      fast = true;
    } else if (c.riteBy && psySees(c.x, c.z, PSY.near)) fast = true; // something wrong being done to someone
  }
  if (!fast) {
    for (const it of G.items)
      if (
        it.by &&
        !it.innocent &&
        it.kind !== 'trap' &&
        it.kind !== 'opened' &&
        psySees(it.x, it.z, PSY.things * 1.7)
      ) {
        psyMark('sign'); // THEIR thing, in plain sight
        if (Math.hypot(it.x - P.x, it.z - P.z) <= PSY.things) slow = true;
      }
    if (G.hotRooms && room && G.hotRooms.includes(room.key)) slow = true; // THEIR gear hums in the walls here
  }
  const rate = fast ? PSY.fast : slow ? PSY.slow : 0;
  if (rate) setNeed('stress', P.needs.stress + (rate * dt) / 60);
}
function accident() {
  const P = PLAYER,
    N = P.needs;
  G.accidentLock = true;
  setTimeout(() => (G.accidentLock = false), 3000);
  N.bladder = 100;
  G.smelly = true; // until you shower: people notice you from further off
  addItem({ kind: 'puddle', x: P.x, z: P.z, rot: Math.random() * 3 });
  let seen = 0;
  for (const n of CHARS)
    if (!n.isPlayer && n.onMap && npcSeesPlayer(n, 7)) {
      addSus(n, 8);
      seen++;
      ui.bubble(n, 'exclaim', 'speech', 3);
    }
  ui.note('toilet', seen ? 'Accident · ' + seen + ' saw' : 'Accident', 'bad');
  setTimeout(() => !G.over && ui.note('shower', 'You smell. People notice you from further off. Shower', 'warn'), 1800);
  audio.sting('awkward');
}
function passOut() {
  const P = PLAYER;
  hardReset(P);
  const starving = P.needs.hunger <= 1;
  enqueue(
    P,
    mkAct({
      kind: 'wait',
      label: 'Passed out',
      icon: 'bed',
      passout: true,
      interruptible: false,
      dur: starving ? 300 : 180,
      onStart: (c) => {
        c.pose = 'floorlie';
      },
      onTick: (c, a, dt) => {
        c.anim = 'sleep';
        applyNeedFx({ energy: 22 }, dt);
      },
      onEnd: (c) => {
        c.pose = 'stand';
        if (starving) {
          const b = OBJ_BY_ID.homeBed;
          placeChar(c, b.x + 1, b.z);
          c.needs.hunger = 45;
          G.health = Math.max(20, G.health - 25);
          ui.note('sick', 'Hospital', 'bad');
        }
      },
    }),
    true,
  );
  ui.note('bed', 'Passed out', 'bad');
}
function breakdown() {
  const P = PLAYER;
  hardReset(P);
  enqueue(
    P,
    mkAct({
      kind: 'wait',
      label: 'Panic',
      icon: 'nerve',
      breakdown: true,
      interruptible: false,
      dur: 12,
      onStart: (c) => {
        c.pose = 'floor';
      },
      onTick: (c) => {
        c.anim = 'shake';
      },
      onEnd: (c) => {
        c.pose = 'stand';
        setNeed('stress', 100 - PSY.after); // you come out of it at 40
      },
    }),
    true,
  );
  for (const n of CHARS)
    if (!n.isPlayer && n.onMap && npcSeesPlayer(n, 8)) {
      addSus(n, 5);
      ui.bubble(n, 'question', 'speech', 3);
    }
  ui.note('nerve', 'Panic attack', 'bad');
  audio.sting('whisper');
}
