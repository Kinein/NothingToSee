//@ town/routines — Habits and secrets: everyone sneaks off once a day
//@ Defines: HABIT_SPOTS, SECRET, RITUAL_STAKE, HABIT_SLOTS, habitTimes, makeHabits, habitDay, habitReady, habitNextAt, SECRET_BY, habitSpot, lookAround, slipCue, doHabit, secretTick
//@ Uses:    sim/core, ui/interface, town/cast, them/tells, core/util, sim/actions, town/npc-update, world/objects, world/grid, world/vision, …
//@ (header made by tools/map.js; stripped by build.py)
// ───────────── routines: everyone sneaks off once a day. The guilty do it to be themselves.
const HABIT_SPOTS = {
  closet: { at: [14, 3], stake: [14, 8], place: 'the supply closet', short: 'Closet' },
  wc: { obj: 'wcOffice', stake: [10, 8], inside: [10, 4], place: 'the office restroom', short: 'Restroom' },
  breakroom: { at: [18, 3], stake: [21, 7], place: 'the break room', short: 'Break room' },
  boss: { at: [3, 4], stake: [5, 0], place: 'his office', short: 'His office' },
  alley: { at: [27, 9], stake: [29, 13], place: 'the alley', short: 'Alley' },
  stock: { at: [41, 9], stake: [36, 9], place: 'the stockroom', short: 'Stockroom' },
  agnes: { at: [21, 22], stake: [28, 22], place: 'her front window', short: 'Her window' },
};
const SECRET = {
  closet: { anim: 'phone', note: 'a job-hunting call' },
  wc: { anim: 'read', note: 'the racing pages' },
  breakroom: { anim: 'eat', note: 'stealing cake' },
  boss: { anim: 'shake', note: 'crying' },
  alley: { anim: 'think', prop: 'cig', note: 'a secret smoke' },
  stock: { anim: 'use', note: 'skimming the till' },
  agnes: { anim: 'read', note: 'old love letters' },
};
const RITUAL_STAKE = [27, 18];
// the slots in a day when each kind of person can slip away: between arriving and lunch, after lunch, before home
const HABIT_SLOTS = {
  office: [
    [565, 655],
    [795, 890],
    [925, 975],
  ],
  clerk: [
    [450, 600],
    [690, 840],
    [900, 1050],
    [1110, 1290],
  ],
  courier: [
    [530, 660],
    [800, 900],
    [930, 990],
  ],
  agnes: [
    [440, 560],
    [660, 820],
    [1010, 1260],
  ],
};
const habitSlots = (def) =>
  def.plan === 'office' || def.plan === 'boss' ? HABIT_SLOTS.office : HABIT_SLOTS[def.plan] || HABIT_SLOTS.agnes;
function habitTimes(def, used = []) {
  return habitSlots(def).map(([a, b]) => {
    let m = a;
    for (let tries = 0; tries < 14; tries++) {
      m = Math.round(rand(a, b) / 5) * 5;
      if (!used.some((u) => Math.abs(u - m) < 25)) break;
    }
    used.push(m);
    return m;
  });
}
function makeHabits() {
  G.habits = {};
  const used = [];
  for (const d of CAST) {
    if (d.never) continue;
    const k = d.plan;
    const spots =
      k === 'boss'
        ? ['boss', 'closet', 'wc']
        : k === 'office'
          ? ['closet', 'wc', 'breakroom', 'alley']
          : k === 'clerk'
            ? ['stock', 'alley']
            : k === 'courier'
              ? ['alley', 'stock', 'closet', 'wc']
              : ['agnes'];
    const ms = habitTimes(d, used);
    G.habits[d.id] = { m: ms[0], ms, spot: pick(spots) };
  }
}
const isOfficePlan = (n) => n.def.plan === 'office' || n.def.plan === 'boss';
function habitDay(n) {
  return isOfficePlan(n) || n.def.plan === 'courier' ? isWorkday() : true;
}
function habitReady(n) {
  const hb = G.habits && G.habits[n.id];
  if (!hb || !n.onMap || n.exposed || n.tell || n.engaged || n.fleeing || n.hideUntil || n.odd || !habitDay(n))
    return false;
  const m = tod(),
    d = dayNo(),
    i = (hb.ms || [hb.m]).findIndex((t, k) => m >= t && m <= t + 45 && G.habitDone[n.id + '#' + k] !== d);
  if (i < 0) return false;
  n.habitI = i;
  const a = curBlock(n).a,
    k = n.def.plan;
  return isOfficePlan(n)
    ? a === 'work'
    : k === 'clerk'
      ? a === 'clerk'
      : k === 'courier'
        ? a === 'courier'
        : k === 'agnes'
          ? a === 'home'
          : false;
}
function habitNextAt(s) {
  const hb = G.habits && G.habits[s.id];
  if (!hb) return null;
  const ms = hb.ms || [hb.m],
    m = tod(),
    d = dayNo();
  if (habitDay(s))
    for (let k = 0; k < ms.length; k++)
      if (ms[k] + 30 >= m && G.habitDone[s.id + '#' + k] !== d)
        return { dt: Math.max(0, ms[k] - m), at: ms[k], tmr: false };
  if ((isOfficePlan(s) || s.def.plan === 'courier') && !isWorkday(d + 1)) return null;
  return { dt: 1440 - m + ms[0], at: ms[0], tmr: true };
}
// a few people keep their own secrets in the same places
const SECRET_BY = {
  ray: {
    stock: { anim: 'read', note: 'reading other people’s post' },
    closet: { anim: 'eat', note: 'eating the office biscuits' },
    alley: { anim: 'phone', note: 'calling a bookie' },
  },
};
const secretFor = (n, spot) => (SECRET_BY[n.id] && SECRET_BY[n.id][spot]) || SECRET[spot];
function habitSpot(n, hb) {
  const S = HABIT_SPOTS[hb.spot],
    F = G.faction;
  if (S.obj) return { obj: OBJ_BY_ID[S.obj] };
  if (n.isThem) {
    if (hb.spot === 'breakroom' && F === 'lizards')
      return { obj: objOfType('radiator', (o) => o.x === 22), type: 'bask' };
    if (hb.spot === 'breakroom' && F === 'zombies') return { obj: objOfType('fridge_office'), type: 'feed' };
    if (hb.spot === 'boss' && F === 'lizards') return { obj: objOfType('radiator', (o) => o.x === 2), type: 'bask' };
    if (hb.spot === 'agnes' && F === 'lizards') return { obj: OBJ_BY_ID.agnesRad, type: 'bask' };
    if (hb.spot === 'agnes' && F === 'zombies') return { at: S.at, type: 'feed' };
  } else if (hb.spot === 'breakroom') return { obj: objOfType('fridge_office') };
  return { at: S.at };
}
// on arrival they glance around once: close by, in the light or in the same room, they notice you
function lookAround(n) {
  const P = PLAYER;
  if (!P.onMap) return false;
  const d = Math.hypot(P.x - n.x, P.z - n.z);
  if (d > 11) return false;
  const rn = roomAt(n.x, n.z),
    rp = roomAt(P.x, P.z);
  if (rn && rn === rp) return true;
  if (
    d <= 3.6 &&
    losClear(Math.floor(n.x), Math.floor(n.z), Math.floor(P.x), Math.floor(P.z)) &&
    (lumAt(P.x, P.z) >= 0.12 || d < 2.6)
  )
    return true;
  return npcSeesPlayer(n, 6);
}
// about to slip off: a look over the shoulder, a glance at the watch, then up. Humans do it before their own secret,
// THEM before THEIR business: the cue gives nobody away. Follow, stay out of sight, take the photo at the spot.
function slipCue(n) {
  return mkAct({
    kind: 'wait',
    label: '…',
    dur: 3,
    anim: 'idle',
    onStart: (c) => {
      gesture(c, 'shoulder', 1.1);
      gesture(c, 'watch', 1.0, 0, 1.15);
    },
  });
}
function doHabit(n) {
  const hb = G.habits[n.id];
  G.habitDone[n.id + '#' + (n.habitI || 0)] = dayNo();
  quirkSeen(n, 'sneak');
  if (G.started && youSee(n)) {
    ui.bubble(n, 'dots', 'thought', 2.2);
    G.slipSeen = G.slipSeen || {};
    if (G.slipSeen[n.id] !== dayNo()) {
      G.slipSeen[n.id] = dayNo();
      ui.note('walk', n.short + ' slipped away', '');
    }
  }
  const S = habitSpot(n, hb),
    wc = S.obj && S.obj.type === 'toilet',
    sp = HABIT_SPOTS[hb.spot];
  const turn = (c) => {
    if (!S.obj) {
      c.dir = c.tdir = Math.atan2(S.at[0] - sp.stake[0], S.at[1] - sp.stake[1]);
    }
  };
  const o = { label: '…', habit: true, dur: rand(18, 28), maxWait: 8 };
  if (n.isThem) {
    Object.assign(o, {
      anim: 'stare',
      onStart: (c, a) => {
        if (lookAround(c)) {
          a.dur = 1;
          ui.bubble(c, 'dots', 'speech', 2);
          addDanger(c, 5);
          return;
        }
        turn(c);
        beginTell(c, a, S.type);
      },
      onEnd: (c, a, ok) => {
        if (c.tell) endTell(c, ok);
        if (wc && ok) c.bladder = 100;
      },
    });
  } else {
    const A = secretFor(n, hb.spot);
    Object.assign(o, {
      anim: A.anim,
      prop: A.prop || null,
      onStart: (c, a) => {
        if (lookAround(c)) {
          a.dur = 1;
          ui.bubble(c, 'dots', 'speech', 2);
          return;
        }
        turn(c);
        c.secret = { t: 0, w: 0, spot: hb.spot };
        // a secret makes noise too: from close by, out of sight, it sounds just like one of THEM
        if (visAt(c.x, c.z) < 0.4 && slipHeard(c.x, c.z)) notifyPing(c.x, c.z);
      },
      onEnd: (c, a, ok) => {
        c.secret = null;
        if (wc && ok) c.bladder = 100;
      },
    });
  }
  if (S.obj) enqueue(n, [slipCue(n), useAct(n, S.obj, o)]);
  else enqueue(n, [slipCue(n), goAct(S.at, { label: 'Walking', habit: true }), waitAct(o)]);
}
// an innocent's secret: what you see is yours to judge. Only a photo of it clears them.
function secretTick(n, dt) {
  const s = n.secret;
  s.t += dt;
  if (!G.started || s.done) return;
  if (!s.caught && s.t > 0.4 && npcSeesPlayer(n, 8)) {
    s.caught = true;
    addSus(n, 6);
    ui.bubble(n, 'exclaim', 'speech', 2.5);
    ui.say(n, pick(['You didn’t see this.', 'Don’t tell anyone.', '…Hi.']), 2.6);
    audio.sting('awkward');
  }
}
