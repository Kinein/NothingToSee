//@ play/verbs — What you can do: snooping, eating, Lenny, chat
//@ Defines: DESK_OWNER, chain, nextAlarm, sleepAct, cookChain, snackAct, eatHereAct, vendAct, coffeeAct, toiletAct, showerAct, warmAct, EAT_SEATS, nearSeat, seatedEat, comfortAct, …
//@ Uses:    sim/core, ui/interface, core/util, sim/actions, player/needs, world/objects, town/suspicion, audio/sound, them/plan, world/grid, …
//@ (header made by tools/map.js; stripped by build.py)
// ───────────────────────── what you can do ─────────────────────────
const DESK_OWNER = {
  deskA1: 'denise',
  deskB1: 'martin',
  deskA3: 'priya',
  deskB2: 'earl',
  deskB3: 'joanne',
  deskBoss: 'hale',
};

function chain(acts) {
  const gid = ++ACT_ID;
  for (const a of acts) {
    a.group = gid;
    const prev = a.onEnd;
    a.onEnd = (c, aa, ok, why) => {
      if (prev) prev(c, aa, ok, why);
      if (!ok) for (const q of c.queue) if (q.group === gid && q !== aa) q.cancel = true;
    };
  }
  return acts;
}
const useP = (obj, label, icon, o) => mkAct(Object.assign({ kind: 'use', obj, label, icon, anim: 'use' }, o));
function nextAlarm() {
  const m = tod(),
    d = dayNo();
  if (m >= 18 * 60 && isWorkday(d + 1)) return d * 1440 + 7 * 60;
  if (m < 7 * 60 && isWorkday(d)) return (d - 1) * 1440 + 7 * 60;
  return null;
}
function sleepAct(bed, nap, alarmAt) {
  let alarm = nap ? null : alarmAt || nextAlarm();
  if (!nap && !alarmAt) {
    const ng = nextGatherT();
    if (ng && gatherAware() && ng - G.t > 60 && ng - G.t < 14 * 60) alarm = Math.min(alarm || Infinity, ng - 30);
  }
  return useP(bed, nap ? 'Nap' : 'Sleep', nap ? 'bed' : 'moon', {
    anim: 'sleep',
    sleep: !nap,
    long: true,
    need: 'energy',
    dur: nap ? 60 : null,
    fx: nap ? { energy: 15, stress: -3 } : { energy: 13.5, stress: -5 },
    until: nap ? null : (c, a) => (a.alarm ? G.t >= a.alarm : c.needs.energy >= 99.5),
    alarm,
    onStart: () => {
      if (!nap) {
        G.sleeping = true;
        G.sleepFrom = G.t;
        sleepTakeCheck(true);
      }
    },
    onEnd: (c, a) => {
      if (!nap) {
        G.sleeping = false;
        if (G.t - G.sleepFrom >= 360) G.stressFloor = Math.max(0, G.stressFloor - 6);
        if (G.t - G.sleepFrom >= 240) G.health = Math.min(100, G.health + 10);
        if (G.dayShown !== dayNo()) ui.dayCard();
      }
      if (a.alarm && G.t >= a.alarm) {
        ui.note('clock', 'Alarm · ' + fmtTime(a.alarm), '');
        if (!G.speed) G.speed = 1;
      }
    },
  });
}
function cookChain() {
  const fridge = OBJ_BY_ID.homeFridge;
  return chain([
    useP(fridge, 'Ingredients', 'fridge', { dur: 2, need: 'hunger' }),
    useP(OBJ_BY_ID.stove, 'Cook', 'cook', { dur: 16, anim: 'cook', need: 'hunger' }),
    useP(OBJ_BY_ID.homeChairA, 'Eat', 'food', {
      dur: 14,
      anim: 'eat',
      need: 'hunger',
      fx: { hunger: 265, stress: -5 },
    }),
  ]);
}
// a snack from your fridge is eaten at your table
function snackAct(fridge) {
  return chain([
    useP(fridge, 'Snack', 'fridge', { dur: 1, need: 'hunger' }),
    useP(OBJ_BY_ID.homeChairA, 'Eat', 'food', {
      dur: 8,
      anim: 'eat',
      need: 'hunger',
      anywhere: true,
      maxWait: 1,
      fx: { hunger: (38 * 60) / 8 },
    }),
  ]);
}
function eatHereAct(label, mins, hungerTotal) {
  return seatedEat(label, 'food', mins, { fx: { hunger: (hungerTotal * 60) / mins } });
}
function vendAct(o) {
  return chain([
    useP(o, 'Vending', 'snack', { dur: 1, need: 'hunger' }),
    seatedEat('Snack', 'snack', 3, { fx: { hunger: (28 * 60) / 3 } }),
  ]);
}
function coffeeAct(o) {
  return useP(o, 'Coffee', 'coffee', {
    dur: 7,
    anim: 'drink',
    prop: 'cup',
    need: 'energy',
    fx: { energy: 140, bladder: -100, stress: 3 },
  });
}
function toiletAct(o) {
  return useP(o, 'Toilet', 'toilet', {
    dur: 8,
    anim: 'idle',
    need: 'bladder',
    fx: { bladder: 760 },
    onEnd: (c, a, ok) => {
      if (ok) c.needs.bladder = 100;
    },
  });
}
function showerAct(o) {
  return useP(o, 'Shower', 'shower', { dur: 14, anim: 'shower', fx: { stress: -17 } });
}
function warmAct(o) {
  return useP(o, 'Warm up', 'warm', { dur: 30, anim: 'warm', need: 'stress', fx: { stress: -6 } });
}
// Sitting is never its own action. You sit down to work, to eat, or beside someone on a bench to talk.
const EAT_SEATS = new Set(['chair', 'armchair', 'sofa', 'bench']);
// a free seat one short straight step away, somewhere you'd be welcome to sit (outdoors, your flat, the office)
function nearSeat() {
  const P = PLAYER,
    here = roomAt(P.x, P.z);
  let best = null,
    bd = 1e9;
  for (const o of OBJ) {
    if (!EAT_SEATS.has(o.type) || o.id === 'pcChair') continue;
    const r = roomAt(o.cx, o.cz);
    if (r !== here || (r && !r.home && r.bld !== 'office')) continue;
    if (objEdgeDist(o, P.x, P.z) > STEP_MAX) continue;
    for (const sl of objSlots(o)) {
      const u = o.users[sl.k];
      if (u && u !== P) continue;
      for (const [ax, az] of sl.cands) {
        if (!walkable(ax, az, P)) continue;
        const tx = ax + 0.5,
          tz = az + 0.5,
          d = Math.hypot(tx - P.x, tz - P.z);
        if (d > STEP_MAX || (d > 0.35 && !lineFree(P, P.x, P.z, tx, tz))) continue;
        if (d < bd) {
          bd = d;
          best = o;
        }
      }
    }
  }
  return best;
}
// food in hand: sit down with it if there's a seat right there, otherwise eat on your feet
function seatedEat(label, icon, mins, o) {
  const seat = nearSeat();
  const base = Object.assign({ label, icon, dur: mins, anim: 'eat', need: 'hunger' }, o);
  return seat
    ? mkAct(Object.assign({ kind: 'use', obj: seat, anywhere: true, maxWait: 1 }, base))
    : mkAct(Object.assign({ kind: 'wait' }, base));
}
function comfortAct() {
  return seatedEat('Comfort food', 'heart', 6, {
    need: 'stress',
    fx: { hunger: 100 },
    onEnd: (c, a, ok) => {
      if (ok) {
        addStress(-15);
        ui.float(c, 'Better', 'good');
      }
    },
  });
}
function momAct(o) {
  const pay = o.type === 'payphone';
  return useP(o, 'Call Mom', 'phone', {
    dur: pay ? 12 : 20,
    anim: 'phone',
    need: 'stress',
    onEnd: (c, a, ok) => {
      if (!ok) return;
      addStress(G.momToday ? -3 : -10);
      ui.note(
        'phone',
        G.momToday
          ? 'Mom sounds worried'
          : pick(['Mom: “Eat something green.”', 'Mom: “You sound tired.”', 'Mom talked about hedges']),
        '',
      );
      G.momToday = true;
      G.momWeek = true;
    },
  });
}
// rummaging: a back-room shelf, a stack of crates, the bins. Now and then something you can use.
// What you find goes in your pockets (G.inv): a trap, a flashlight, pills.
const FINDS = [
  {
    k: 'flashlight',
    icon: 'torch',
    text: 'A flashlight',
    w: () => (G.inv.flashlight ? 0 : 3),
    give: () => {
      G.inv.flashlight = true;
    },
  },
  {
    k: 'trap',
    icon: 'trap',
    text: 'A steel trap',
    w: () => (G.inv.trap >= 2 ? 0 : 2),
    give: () => {
      G.inv.trap++;
    },
  },
  {
    k: 'pills',
    icon: 'pill',
    text: 'Pills',
    w: () => (G.inv.pills >= 3 ? 0.4 : 2.5),
    give: () => {
      G.inv.pills++;
    },
  },
];
function findSomething(p) {
  const opts = FINDS.map((f) => [f.w(), f]).filter(([w]) => w > 0);
  if (!opts.length || !chance(p)) return false;
  const f = wpick(opts);
  f.give();
  ui.note(f.icon, f.text, 'good');
  audio.blip('cash');
  return true;
}
function rummageResult(o) {
  const d = o.data;
  if (d.rumDay === dayNo()) return ui.note('box', 'Nothing new', '');
  d.rumDay = dayNo();
  if (!findSomething(0.55)) ui.note('box', pick(['Toilet roll', 'Warm tins', 'Blank name badges', 'Old bulbs']), '');
}
// pills from the back of a shelf: the edge comes off for a while, and so does the energy
function pillsAct() {
  return mkAct({
    kind: 'wait',
    label: 'Pills',
    icon: 'pill',
    dur: 2,
    anim: 'drink',
    check: () => (G.inv.pills > 0 ? null : 'None left'),
    onEnd: (c, a, ok) => {
      if (!ok || G.inv.pills <= 0) return;
      G.inv.pills--;
      addStress(-28);
      bump('energy', -12);
      ui.float(c, 'Calmer', 'good');
    },
  });
}
function deskWork(slack) {
  const ch = OBJ_BY_ID.chairA2;
  return useP(ch, slack ? 'Slack off' : 'Work', slack ? 'tv' : 'work', {
    anim: 'type',
    long: !slack,
    work: !slack,
    slack: !!slack,
    dur: slack ? 45 : null,
    until: slack ? null : () => !isWorkday() || tod() >= 17 * 60,
    fx: slack ? { stress: -9, energy: -0.5 } : { energy: -1.5, stress: 1.2 },
    onStart: () => {
      if (G.awayT > 60 && NPC.hale.onMap && NPC.hale.shown > 0.5 && G.haleSaw) {
        ui.say(NPC.hale, 'Where were you?', 3);
        G.haleSaw = false;
      }
    },
    onTick: (c, a) => {
      if (slack && inShift() && !G.slackCaught) {
        const h = NPC.hale;
        if (h.onMap && npcSeesPlayer(h, 5)) {
          G.slackCaught = true;
          h.rel -= 6;
          addSus(h, 4);
          ui.say(h, 'Is that soup?', 2.5);
        }
      }
    },
  });
}
function tvAct(dur) {
  const sofa = objOfType('sofa');
  return useP(sofa, 'Watch TV', 'tv', {
    long: !dur,
    dur: dur || null,
    anim: 'watch',
    need: 'stress',
    fx: { stress: -12, energy: -1 },
    onStart: () => (G.tvOn = true),
    onTick: (c, a, dt) => {
      if (G.aware >= 25 && !a.faces && chance(dt * 0.02)) {
        a.faces = true;
        addStress(6);
        ui.note('tv', 'Faces in the static. Watching you watch.', 'bad');
        audio.sting('whisper');
      }
      const h = hourF();
      if (h >= 0 && h < 4.5 && !a.late && chance(dt * 0.02)) {
        a.late = true;
        if (G.aware >= 40) {
          addStress(12);
          ui.note('tv', 'Static. Then your name.', 'bad');
          audio.sting('whisper');
        }
      }
    },
    onEnd: () => (G.tvOn = false),
  });
}
// the break room bin: a whole sandwich, not a bite out of it. Who did you see at lunch?
function binDig() {
  const food = G.binFood.filter((f) => G.t - f.t < 8 * 60);
  if (!food.length) return ui.note('trash', pick(['Crusts. Tea bags.', 'Yogurt pots.', 'Just wrappers']), '');
  G.binFood = [];
  ui.note('trash', 'A whole sandwich. Not one bite.', 'onto');
  G.leads.push('Whole lunches in the break-room bin. Whose?');
  if (G.leads.length > 6) G.leads.shift();
}
function digResult(o) {
  const r = Math.random();
  if (r < 0.25) {
    if (!findSomething(0.6)) ui.note('trash', 'Just rubbish', '');
  } else if (r < 0.45) {
    bump('hunger', 12);
    ui.note('snack', 'Half a sandwich', '');
  } else if (r < 0.55 && clueFaction() === 'lizards') {
    ui.note('trash', 'Fish bones. Picked clean. In office paper.', 'onto');
    G.leads.push('Fish bones in the bins · office paper');
  } else if (r < 0.6 && o.type === 'dumpster') {
    const t = { aliens: 'Scorched cardboard', lizards: 'Shed skin, with nails', zombies: 'Licked-clean butcher paper' }[
      clueFaction()
    ];
    G.leads.push(t);
    ui.note('trash', t, 'onto');
  } else ui.note('trash', 'Just rubbish', '');
}

// ── people
// success depends on the relationship, their suspicion of you, your stress and the tinfoil hat
function socialChance(n) {
  const st = PLAYER.needs.stress;
  let p = 0.6 + n.rel / 220 - n.sus / 170 - Math.max(0, st - 40) / 180;
  if (G.inv.foilOn) p -= 0.28;
  return clamp(p, 0.08, 0.95);
}
const relFx = (n, v) => {
  n.rel += v;
  ui.bubble(n, v > 0 ? 'heart' : 'frown', 'speech', 1.8);
  ui.float(n, v > 0 ? '+' : '−', v > 0 ? 'good' : 'bad');
};
const PLACE_SELF = {
  closet: 'I hide in the supply closet when Hale yells.',
  wc: 'The restroom’s the only quiet place in there.',
  breakroom: 'I sneak into the break room when it’s empty.',
  boss: 'Some days I just lock my office door.',
  alley: 'I step out into the alley now and then.',
  stock: 'I’m in the stockroom more than at the till.',
  agnes: 'I sit by my front window most days.',
};
function resolveChat(n, win) {
  if ((n.limpDay === dayNo() || n.lostDay === dayNo()) && !n.isThem) {
    ui.say(n, pick(['I don’t want to talk about it.', 'Not today. Please.', 'I don’t remember last night.']), 3.5);
    addSus(n, win ? -4 : 0);
    return;
  }
  relFx(n, win ? 4 : -1);
  addSus(n, win ? -8 : -2);
  if (win) addStress(-6);
  ui.say(n, n.id === 'lenny' ? pick(LENNY_RAMBLE) : chatLine(n), 4.5);
}
function resolveGossip(n) {
  n.gossipN = n.gossipDay === dayNo() ? (n.gossipN || 1) + 1 : 1;
  n.gossipDay = dayNo();
  n.rel -= 1;
  addSus(n, 8);
  for (const b of earshot(n)) addSus(b, 4);
  if (n.id === 'vic' && !n.isThem && G.faction === 'lizards' && chance(0.5) && !bought(n)) {
    // who buys fish
    const buyers = shuffle(
      alive().concat(shuffle(suspects().filter((s) => !s.isThem && s.id !== 'vic' && !s.gone)).slice(0, 1)),
    ).slice(0, 3);
    const line = 'Fish? ' + buyers.map((b) => b.short).join(', ') + '. Every week. Raw, some of ’em.';
    ui.say(n, line, 5);
    for (const b of buyers) addNote(b, 'Buys fish at Pell’s.', { by: 'vic' });
    hear(null, line, 'vic');
    return;
  }
  if (tellRumour(n)) return; // what's going round
  gossip(n);
}
