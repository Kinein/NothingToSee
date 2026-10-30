//@ player/needs — The player body: needs, Psychic, accidents, passing out, panic
//@ Defines: setNeed, applyNeedFx, bump, psyDrop, shakenNote, stressBand, mood, moodWord, needsTick, psyDrain, accident, accidentPool, wallFace, peePose, PEE, peeRnd, …
//@ Uses:    sim/core, data/tuning, ui/interface, world/grid, sim/actions, gfx/renderer, core/util, them/tells, town/suspicion, audio/sound, …
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
// an accident: you can't hold it. Knees together, hands everywhere, turning on the spot while it goes all over the place
// (BLADDER.spray body minutes, about three seconds, and the keys do nothing). It leaves a pool of BLADDER.pool tiles to
// mop up, and whatever wall was close enough gets some too: that never comes off.
function accident() {
  const P = PLAYER,
    N = P.needs;
  G.accidentLock = true;
  setTimeout(() => (G.accidentLock = false), 3000);
  N.bladder = 100;
  G.smelly = true; // until you shower: people notice you from further off
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
  // asleep, sitting, in the middle of something you can't leave: it just happens where you are
  const free = P.onMap && !G.sleeping && !G.away && P.pose === 'stand' && !P.seatTr && !P.vault;
  if (!free || (P.queue[0] && P.queue[0].interruptible === false)) return accidentPool();
  hardReset(P);
  routeStop();
  enqueue(
    P,
    mkAct({
      kind: 'wait',
      label: 'Accident',
      icon: 'toilet',
      anim: 'idle',
      dur: BLADDER.spray,
      interruptible: false,
      onStart: (c) => {
        PEE.on = true;
        PEE.dir0 = c.dir;
        c.poseFn = peePose;
        ui.bubble(c, 'exclaim', 'thought', 2.5);
      },
      // it gets away from you: a wild sweep one way and back, and round
      onTick: (c, a) => {
        c.tdir = PEE.dir0 + Math.sin(a.t * 1.9) * 1.9 + a.t * 0.45;
        c.moving = false;
      },
      onEnd: (c) => {
        PEE.on = false;
        if (c.poseFn === peePose) c.poseFn = null;
        accidentPool();
      },
    }),
  );
}
// what's left: the pool on the floor (mop it), and splashes up the walls close by (they stay)
function accidentPool() {
  const P = PLAYER;
  addItem({ kind: 'puddle', x: P.x, z: P.z, rot: rand(0, 3), size: BLADDER.pool });
  if (!P.onMap) return;
  // the nearest wall always gets some; any other close enough, now and then
  const faces = [];
  for (const [dx, dz] of [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ]) {
    const f = wallFace(P.x, P.z, dx, dz, BLADDER.wallReach);
    if (f) faces.push([Math.hypot(f[0] - P.x, f[1] - P.z), f, dx, dz]);
  }
  faces.sort((a, b) => a[0] - b[0]);
  faces.forEach(([, f, dx, dz], i) => {
    if (i && !chance(BLADDER.wallOdds)) return;
    addItem({
      kind: 'wallpee',
      x: f[0] - dx * 0.025,
      z: f[1] - dz * 0.025,
      rot: dx ? Math.PI / 2 : 0,
      off: rand(-0.3, 0.3),
      seed: irand(1, 9999),
    });
  });
}
// the nearest wall straight along (dx, dz) within `reach`: the point on its face, or null (a door, or furniture first)
function wallFace(x, z, dx, dz, reach) {
  for (let s = 0.1; s <= reach; s += 0.05) {
    const px = x + dx * s,
      pz = z + dz * s,
      tx = Math.floor(px),
      tz = Math.floor(pz);
    if (!inb(tx, tz)) return null;
    const c = tiles[I(tx, tz)];
    if (c === 'D' || c === 'L') return null;
    const wall = WALLISH.has(c);
    for (const b of solidCells()[I(tx, tz)])
      if (px >= b[0] && px <= b[2] && pz >= b[1] && pz <= b[3]) return wall && !b.over ? [px, pz] : null; // furniture in the way takes it
  }
  return null;
}
// knees together, bent over it, both hands down there and no use at all, the whole body jiggling
function peePose(T, c) {
  const t = c.animT;
  T.thL = T.thR = -0.35;
  T.shL = T.shR = 0.55;
  T.rootY = (T.rootY || 0) - 0.07 + Math.sin(t * 21) * 0.012;
  T.torso = 0.32;
  T.hp = 0.45;
  T.hr = Math.sin(t * 9) * 0.2;
  T.uaL = T.uaR = -0.45;
  T.faL = T.faR = -0.85;
  T.aoL = T.aoR = -0.1;
  T.roll = Math.sin(t * 17) * 0.07;
}
// the spray, drawn: droplets in an arc from where you stand, splashing where they land. Looks only: its own little
// random numbers, nothing kept in the game, no allocation once the pool of drops exists.
const PEE = { on: false, dir0: 0, seed: 1, acc: 0, drops: [] };
function peeRnd() {
  PEE.seed = (PEE.seed * 16807) % 2147483647;
  return PEE.seed / 2147483647;
}
function peeFx(dt) {
  const P = PLAYER;
  if (!PEE.drops.length)
    for (let i = 0; i < 80; i++) PEE.drops.push({ on: false, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0 });
  if (PEE.on && P.onMap) {
    PEE.acc += dt * 90;
    const fx = Math.sin(P.dir),
      fz = Math.cos(P.dir);
    for (const d of PEE.drops) {
      if (PEE.acc < 1) break;
      if (d.on) continue;
      PEE.acc--;
      const sp = 2.1 + peeRnd() * 1.1,
        side = (peeRnd() - 0.5) * 0.9;
      d.on = true;
      d.x = P.x + fx * 0.16;
      d.z = P.z + fz * 0.16;
      d.y = 0.8;
      d.vx = fx * sp + fz * side;
      d.vz = fz * sp - fx * side;
      d.vy = 0.9 + peeRnd() * 1.3;
    }
    PEE.acc = Math.min(PEE.acc, 1);
  }
  for (const d of PEE.drops) {
    if (!d.on) continue;
    d.vy -= 9.8 * dt;
    const nx = d.x + d.vx * dt,
      nz = d.z + d.vz * dt,
      t = tiles[I(Math.floor(nx), Math.floor(nz))];
    if (WALLISH.has(t) && t !== 'D') {
      d.vx *= -0.15; // splash back off the wall
      d.vz *= -0.15;
    } else {
      d.x = nx;
      d.z = nz;
    }
    d.y += d.vy * dt;
    if (d.y <= 0.02) {
      d.on = false;
      if (peeRnd() < 0.15) hxDecal(d.x, d.z, 0.06 + peeRnd() * 0.08, [0.5, 0.46, 0.1, 0.5], 0, 90 + peeRnd() * 60);
      continue;
    }
    hxGlint(d.x, d.y, d.z, 0.045, [0.85, 0.75, 0.2], 0.55);
  }
}
// out cold where you fell: the hours go by as fast as in bed (G.sleeping), behind your eyelids (passOutLids), and it
// rests you worse than a bed does. You come round at half your energy.
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
      sleep: true,
      interruptible: false,
      dur: null,
      fx: { energy: BED.energy * OUT.rest, stress: BED.stress * OUT.rest },
      until: (c, a) => c.needs.energy >= OUT.wake || a.t >= 12 * 60,
      onStart: (c) => {
        c.pose = 'floorlie';
        G.sleeping = true;
      },
      onTick: (c) => {
        c.anim = 'sleep';
      },
      onEnd: (c) => {
        G.sleeping = false;
        c.pose = 'stand';
        if (G.dayShown !== dayNo()) ui.dayCard();
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
// out cold, the lids come down. Every OUT.blink game minutes they come open a crack for a moment, onto the hours going
// by, and shut again; at the end they open for good. In real seconds, so it reads the same however fast time goes.
function passOutLids(dtReal) {
  const a = G && G.started && PLAYER ? PLAYER.queue[0] : null,
    out = !!(a && a.passout && a.stage === 'run');
  const lid = R.outLid || 0;
  if (!out) {
    R.outLid = Math.max(0, lid - dtReal * 0.9);
    return;
  }
  const k = Math.floor(a.t / OUT.blink);
  if (k > 0 && a.blinkK !== k) {
    a.blinkK = k;
    a.blinkR = R.time;
  }
  const u = a.blinkR != null ? (R.time - a.blinkR) / 1.3 : 1,
    tgt = u < 1 ? 1 - 0.62 * Math.sin(Math.PI * u) : 1;
  R.outLid = lid < tgt ? Math.min(tgt, lid + dtReal * 1.6) : tgt; // going under takes a moment; a flutter is quick
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
