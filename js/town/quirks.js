//@ town/quirks — Quirks: repeated odd behaviour, THEIRS from what THEY are
//@ Defines: QUIRKS, wpick, makeQuirks, quirkFolk, seedQuirkLog, quirkSeen, logQ, quirkYou, quirkTick, tagQ, QDO, Q_OPTS, quirkAct, quirkPlan, smellOf, HABIT_WINDOWS, …
//@ Uses:    sim/core, core/util, town/npc-update, world/grid, town/cast, town/routines, world/objects, world/paths, town/daily-plans, data/lines, …
//@ (header made by tools/map.js; stripped by build.py)
// ───────────── quirks: everybody does something a little odd, over and over. THEIRS come from what THEY are; the rest
// are only people being people, and some of those look just like THEIRS. It happens first, out in the town, where
// somebody can see it; then people talk about it. Nobody says a thing about anyone that didn't happen, except THEM.
// self: what they let slip about it themselves (man: an ordinary person) · about: what other people say ({s}) ·
// see: what you note when you catch it yourself · watch: what a long look at them gives away · icon, short: the board
const QUIRKS = {
  loo: {
    icon: 'toilet',
    short: 'Always in the loo',
    fac: ['lizards', 'aliens'],
    who: (n) => isOfficePlan(n),
    see: 'Off to the restroom. Again.',
    watch: 'Can’t sit still. Up and out of the chair every few minutes.',
    self: {
      man: [
        'New pills. I’m up and down to the loo all day.',
        'Doctor says drink more water. So I do, and then I pay for it.',
        'Too much coffee. I know, I know.',
      ],
      lizards: [
        'I get so dry in here. Like paper.',
        'Cold water on the face. Best feeling there is.',
        'I just need to be near water. Is that strange?',
      ],
      aliens: [
        'The restroom’s the only room in there without ears.',
        'Mirrors are funny. There’s always something behind them.',
      ],
    },
    about: [
      'Funny how {s} goes to the toilet so often, right?',
      '{s} was in the restroom four times before lunch. I counted.',
      'Every hour, {s} off to the loo. Every hour!',
      'What does {s} DO in that restroom all day?',
      '{s}’s chair is empty half the day. Restroom again, I bet.',
    ],
  },
  mirror: {
    icon: 'mirror',
    short: 'Stares into mirrors',
    fac: ['aliens', 'lizards', 'zombies'],
    who: (n) => !!HOUSE_OF[n.id] || isOfficePlan(n),
    see: 'At the mirror for ages. Just looking.',
    watch: 'Checks their face in anything shiny. A spoon. A window.',
    self: {
      man: [
        'I love looking at myself in the mirror. Is that bad?',
        'I check my face a lot. Old habit.',
        'You’re never lonely with a mirror.',
      ],
      aliens: [
        'Faces are hard. You have to keep practising.',
        'Do I look right to you? Today, I mean.',
        'Smile. Like this. That’s how it goes, isn’t it?',
      ],
      lizards: ['My skin’s been so dry. I keep checking it.', 'Does my skin look tight to you? Be honest.'],
      zombies: ['Do I look grey to you? Be honest.', 'I keep checking I’m still all there.'],
    },
    about: [
      '{s} stands at the mirror for ages. Ages!',
      'I saw {s} through the window. Staring into a mirror. Just staring.',
      '{s} can’t walk past a mirror. Never could.',
      'Who looks at themselves that long? {s} does.',
      'Caught {s} pulling faces at the mirror. Not funny faces. Practising ones.',
    ],
  },
  night: {
    icon: 'moon',
    short: 'Out at night',
    fac: ['lizards', 'zombies'],
    who: (n) => !!HOUSE_OF[n.id],
    see: 'Out walking in the middle of the night. Nowhere to go.',
    watch: 'Bags under the eyes. Yawns every few minutes.',
    self: {
      man: [
        'I like to walk at night. Like a lunatic.',
        'Can’t sleep, so I walk. Round and round the park.',
        'Night’s the only time this town shuts up.',
      ],
      lizards: ['Night air’s the best. Cool and damp.', 'I like the drains at night. The sound, I mean.'],
      zombies: ['I don’t sleep much. Haven’t in a while.', 'Night’s when I feel most like myself.'],
    },
    about: [
      'I saw {s} out walking at three in the morning. Like a lunatic.',
      '{s} wanders about at night. What for?',
      'Somebody walks past my window every night. I think it’s {s}.',
      '{s} looked half dead this morning. Out all night again.',
      'Bumped into {s} at two in the morning. Didn’t even say hello.',
    ],
  },
  stink: {
    icon: 'smell',
    short: 'A smell at home',
    fac: ['lizards', 'zombies'],
    who: (n) => !!HOUSE_OF[n.id],
    place: true,
    see: 'A bad smell from the front door.',
    watch: 'A faint smell off their clothes. Sour.',
    self: {
      man: [
        'I wash my socks in the sink and dry them on the radiator. Saves money.',
        'My place smells a bit. Socks. Don’t judge me.',
      ],
      lizards: ['I buy fish every day. Fresh. Mostly fresh.', 'I like my place warm and wet. Like a bathroom.'],
      zombies: ['I keep the windows shut. Things keep better.', 'Flies love my place. I don’t mind them.'],
    },
    about: [
      'I felt a bad smell from {s}’s home lately. Weird.',
      'Something stinks round {s}’s door. Has done for days.',
      'Walk past {s}’s place and hold your nose. Seriously.',
      'Even the cats keep off {s}’s doorstep. The smell.',
    ],
  },
  cold: {
    icon: 'warm',
    short: 'Hugs radiators',
    fac: ['lizards', 'zombies'],
    who: (n) => !!HOUSE_OF[n.id] || n.id === 'agnes' || isOfficePlan(n),
    see: 'Hugging the radiator. In this weather.',
    watch: 'Rubbing their hands. Sleeves pulled right down.',
    self: {
      man: ['I’m always cold. Poor circulation.', 'My mother was the same. Cold hands, cold feet.'],
      lizards: [
        'I could lie on a warm stone all day.',
        'Warmth is everything. You don’t know.',
        'Is it cold in here, or is it me? It’s me.',
      ],
      zombies: ['I can’t feel the radiator. I just like being near it.', 'Cold right through. It doesn’t go away.'],
    },
    about: [
      '{s} is always glued to the radiator. In this weather!',
      '{s}’s hands are like ice. Every time.',
      'Touch {s}’s hand some time. Freezing.',
      '{s} wears a scarf indoors. Indoors!',
    ],
  },
  gadgets: {
    icon: 'glyph',
    short: 'Fiddles with machines',
    fac: ['aliens'],
    who: (n) => isOfficePlan(n) || n.def.plan === 'clerk' || n.def.plan === 'courier',
    see: 'Had the back off a machine. Poking about inside.',
    watch: 'Takes a pen apart and puts it back. Over and over.',
    self: {
      man: [
        'I take things apart. Always have. Mostly they go back together.',
        'If it’s got screws in it, I want to see inside.',
      ],
      aliens: [
        'I like weird devices. How they think.',
        'Your radios are so… simple. I like that.',
        'Everything here hums at the wrong pitch. I fix it.',
      ],
    },
    about: [
      '{s} had the back off the microwave again.',
      '{s} talks to the machines. I heard it.',
      'Every machine {s} touches goes funny afterwards.',
      '{s} took the radio apart at lunch. Put it back with a screw left over.',
    ],
  },
  lamps: {
    icon: 'spark',
    short: 'Stares at lights',
    fac: ['aliens'],
    who: (n) => !!HOUSE_OF[n.id],
    see: 'Standing under a lamp, looking straight up into it.',
    watch: 'Keeps looking up at the lights. Doesn’t even squint.',
    self: {
      man: ['I like lamps. Moths and me.', 'Light helps. I get gloomy otherwise.'],
      aliens: ['Light tastes different here.', 'Your lamps are so warm. So yellow.'],
    },
    about: [
      '{s} stood under the streetlamp for an hour. Just looking up.',
      '{s} stares at lights. Like a moth.',
      'I saw {s} staring into a bulb. Didn’t blink once.',
      '{s} turned every light on in the place and just stood there.',
    ],
  },
  hungry: {
    icon: 'fridge',
    short: 'Always eating',
    fac: ['zombies', 'lizards'],
    who: (n) => isOfficePlan(n) || n.id === 'agnes' || n.def.plan === 'clerk',
    see: 'At the fridge again. Eating straight out of it.',
    watch: 'Chewing something. Always chewing something.',
    self: {
      man: ['I eat when I’m nervous. So, always.', 'Somebody keeps eating my lunch. Fine. I eat theirs.'],
      zombies: ['I’m hungry all the time lately. Not for bread.', 'Raw is better. Honestly. You should try it.'],
      lizards: ['Fish. Raw. Don’t knock it till you’ve tried it.', 'I could eat a whole mouse. Joking.'],
    },
    about: [
      'Someone keeps eating everyone’s lunch. I bet it’s {s}.',
      '{s} opens that fridge every ten minutes.',
      '{s} ate my sandwich. Didn’t even unwrap it properly.',
      '{s} eats standing up. Fast. Like someone’s about to take it.',
    ],
  },
  window: {
    icon: 'window',
    short: 'Watches the street',
    fac: ['aliens', 'zombies'],
    who: (n) => !!HOUSE_OF[n.id] || n.id === 'agnes',
    see: 'At the window. Watching the street for hours.',
    watch: 'Keeps glancing out of the window.',
    self: {
      man: ['I like to know who’s coming and going. Sue me.', 'Better than television, the street.'],
      aliens: [
        'I like to watch. Who comes home late. Who doesn’t.',
        'I know which window is yours. The light’s always on.',
      ],
      zombies: [
        'I just stand at the window. The time goes quicker.',
        'I like watching people walk by. All that… life.',
      ],
    },
    about: [
      '{s} stands at the window half the night. Watching.',
      'Every time I look up, {s}’s at the window. Looking back.',
      'There’s always a face at {s}’s window. Always.',
    ],
  },
  awake: {
    icon: 'clock',
    short: 'Up all night',
    fac: ['zombies', 'aliens'],
    who: (n) => !!HOUSE_OF[n.id],
    see: 'Lights on at three in the morning. Pacing.',
    watch: 'Red eyes. Hasn’t slept, by the look of it.',
    self: {
      man: ['I haven’t slept properly in weeks. The neighbour’s dog.', 'Insomnia. I count the cars going by.'],
      zombies: ['Sleep? I don’t really need it any more.', 'I lie down. I just don’t… go anywhere.'],
      aliens: ['Sleep is such a waste. All those hours.', 'I don’t dream. Do you? What about?'],
    },
    about: [
      '{s}’s light is on all night. Every night.',
      'Three in the morning and {s}’s up. Pacing. I can see the shadow.',
      '{s} looks like they haven’t slept in a week. Maybe they haven’t.',
    ],
  },
};
const hasQ = (n, q) => !!(n && G && G.quirks && G.quirks[n.id] && G.quirks[n.id].includes(q));
// weighted pick from [[weight, thing], ...]
function wpick(list) {
  let t = 0;
  for (const [w] of list) t += w;
  let r = Math.random() * t;
  for (const [w, v] of list) {
    r -= w;
    if (r <= 0) return v;
  }
  return list.length ? list[list.length - 1][1] : null;
}
// who gets what: two of THEIR own kind for each of THEM; one or two ordinary ones for everyone else, and every habit
// of THEIRS turns up on at least one ordinary person too, so no habit gives anybody away on its own
function makeQuirks() {
  G.quirks = {};
  const F = G.faction,
    fits = (n, q) => QUIRKS[q].who(n),
    all = Object.keys(QUIRKS);
  for (const n of them())
    G.quirks[n.id] = shuffle(all.filter((q) => QUIRKS[q].fac.includes(F) && fits(n, q))).slice(0, 2);
  const normals = shuffle(suspects().filter((n) => !n.isThem));
  for (const n of normals) G.quirks[n.id] = [];
  for (const q of shuffle([...new Set(them().flatMap((n) => G.quirks[n.id]))])) {
    const w = normals.filter((n) => fits(n, q) && G.quirks[n.id].length < 2);
    if (w.length) G.quirks[pick(w).id].push(q);
  }
  for (const n of normals) {
    const want = n.id === 'agnes' || chance(0.45) ? 1 : 2;
    while (G.quirks[n.id].length < want) {
      const pool = all.filter((q) => fits(n, q) && !G.quirks[n.id].includes(q));
      if (!pool.length) break;
      G.quirks[n.id].push(pick(pool));
    }
  }
  G.qlog = [];
  seedQuirkLog();
}
// who'd know about it in the ordinary run of things: the office for office habits, Pell's customers for Vic's, the
// neighbours across the road for home ones, Lenny for anything after dark, Ray for every doorstep in town
function quirkFolk(n, q) {
  const S = suspects().filter((w) => w !== n && !w.gone),
    ids = (f) => S.filter(f).map((w) => w.id),
    hn = HOUSE_OF[n.id];
  const work = ['loo', 'gadgets', 'hungry', 'cold', 'mirror', 'sneak'].includes(q);
  if (work && isOfficePlan(n)) return ids((w) => isOfficePlan(w) || w.id === 'ray');
  if (work && n.def.plan === 'clerk') return ids(() => true);
  if (work && n.def.plan === 'courier') return ids((w) => isOfficePlan(w) || w.id === 'vic');
  if (n.id === 'agnes') return q === 'window' || q === 'sneak' ? ['lenny', 'ray'] : [];
  const out = hn ? ids((w) => HOUSE_OF[w.id] && HOUSE_OF[w.id].row === hn.row) : [];
  if (['night', 'lamps', 'window', 'awake'].includes(q)) out.push('lenny');
  if (q === 'stink' || q === 'window') out.push('ray');
  return [...new Set(out)];
}
// the town had a life before you started watching it: a few times each, in the last few days
function seedQuirkLog() {
  for (const n of suspects()) {
    const qs = (G.quirks[n.id] || []).concat(G.habits && G.habits[n.id] && habitDay(n) ? ['sneak'] : []);
    for (const q of qs) {
      const folk = quirkFolk(n, q);
      if (!folk.length) continue;
      for (let k = irand(1, 2); k > 0; k--)
        G.qlog.push({
          id: n.id,
          q,
          t: G.t - irand(1, 3) * 1440 + irand(-240, 240),
          by: shuffle(folk.slice()).slice(0, irand(1, 3)),
        });
    }
  }
  G.qlog.sort((a, b) => a.t - b.t);
}
// it happened: who saw it. Anybody awake with the spot in view; the neighbours over the road when it's at a window;
// Lenny, out of doors and across the park, because Lenny never properly sleeps
function quirkSeen(n, q, o = {}) {
  if (!G || !G.started || !n.onMap) return;
  G.qlog = G.qlog || [];
  const by = [],
    hn = HOUSE_OF[n.id],
    out = !roomAt(n.x, n.z);
  for (const w of suspects().concat([NPC.lenny])) {
    if (!w || w === n || !w.onMap || w.gone || w.trueForm) continue;
    const d = Math.hypot(w.x - n.x, w.z - n.z);
    if (w.id === 'lenny') {
      if ((out || o.lit) && d < 21) by.push(w.id);
      continue;
    }
    if (asleep(w)) continue;
    if (seesSpot(w, n.x, n.z, 10)) {
      by.push(w.id);
      continue;
    }
    if (
      o.office &&
      (roomAt(w.x, w.z) || {}).bld === 'office' &&
      (roomAt(n.x, n.z) || {}).bld === 'office' &&
      chance(0.35)
    ) {
      by.push(w.id);
      continue;
    }
    const hw = HOUSE_OF[w.id];
    if (o.window && hn && hw && hw !== hn && atHome(w) && Math.abs(hw.x0 - hn.x0) <= 8 && chance(0.5)) by.push(w.id);
    else if (o.lit && hn && !roomAt(w.x, w.z) && Math.hypot(w.x - hn.out[0], w.z - hn.out[1]) < 9) by.push(w.id);
  }
  logQ(n.id, q, by, o.other);
}
function logQ(id, q, by, other) {
  G.qlog = G.qlog || [];
  const last = G.qlog.find((e) => e.id === id && e.q === q && e.other === other && G.t - e.t < 90);
  if (last) {
    for (const b of by) if (!last.by.includes(b)) last.by.push(b);
    return;
  }
  G.qlog.push(Object.assign({ id, q, t: G.t, by: by.slice() }, other ? { other } : {}));
  if (G.qlog.length > 120) G.qlog.shift();
}
// you saw it yourself: it goes under their polaroid, once. One trip to the loo is nothing; two in a day is a habit.
const youSee = (c) => PLAYER.onMap && !G.sleeping && !G.away && c.onMap && c.shown > 0.5 && visAt(c.x, c.z) > 0.5;
function quirkYou(c, q) {
  G.qyou = G.qyou || {};
  G.qcnt = G.qcnt || {};
  const k = c.id + ':' + q;
  if (G.qyou[k]) return;
  if (q === 'loo') {
    const d = dayNo(),
      r = G.qcnt[k];
    G.qcnt[k] = r && r.d === d ? { d, n: r.n + 1 } : { d, n: 1 };
    if (G.qcnt[k].n < 2) return;
  }
  G.qyou[k] = G.t;
  addNote(c, QUIRKS[q].see, { by: 'you' });
  ui.note(QUIRKS[q].icon, c.short + ' · ' + QUIRKS[q].short.toLowerCase(), '');
}
const knownQ = (n) =>
  Object.keys(QUIRKS).filter((q) => (G.qyou && G.qyou[n.id + ':' + q]) || (G.qwatch && G.qwatch[n.id + ':' + q]));
// on every tick of a quirk's own action: once it's under way, whoever's looking has seen it
function quirkTick(c, a, q) {
  if (!G.started) return;
  if (!a.qLogged && a.t > 1.5) {
    a.qLogged = true;
    quirkSeen(c, q, a.qo || {});
  }
  if (!a.qYou && a.t > 2 && youSee(c)) {
    a.qYou = true;
    quirkYou(c, q);
  }
}
function tagQ(acts, q, o) {
  for (const a of [].concat(acts)) {
    if (!a || a.kind === 'go') continue;
    a.quirk = q;
    a.qo = o || null;
    const prev = a.onTick;
    a.onTick = (c, x, dt) => {
      if (prev) prev(c, x, dt);
      quirkTick(c, x, q);
    };
  }
  return acts;
}
// a quirk's turn in somebody's day, by where they are: what they do. null: not here, not now.
const QDO = {
  mirror: {
    work: (n) =>
      walkable(9, 4, n)
        ? [
            goAct([9, 4], { label: 'Restroom' }),
            waitAct({ label: '…', anim: 'stare', dur: rand(7, 12), onStart: (c) => (c.tdir = 0) }),
          ]
        : null,
    house: (n) => {
      const h = HOUSE_OF[n.id],
        t = [h.x0 + 3, h.row === 'N' ? 10 : 21];
      return walkable(t[0], t[1], n)
        ? [
            goAct(t, { label: 'Mirror' }),
            waitAct({ label: 'Mirror', anim: 'stare', dur: rand(12, 28), onStart: (c) => (c.tdir = Math.PI / 2) }),
          ]
        : null;
    },
  },
  cold: {
    work: (n) => {
      const r = n.id === 'hale' ? objOfType('radiator', (o) => o.x === 2) : objOfType('radiator', (o) => o.x === 22);
      return r ? useAct(n, r, { label: 'Warm', anim: 'warm', dur: rand(8, 14), maxWait: 4 }) : null;
    },
    house: (n) => useAct(n, OBJ_BY_ID['rad_' + n.id], { label: 'Warm', anim: 'warm', dur: rand(15, 35) }),
    agnes: (n) => useAct(n, OBJ_BY_ID.agnesRad, { label: 'Warm', anim: 'warm', dur: rand(15, 30) }),
  },
  gadgets: {
    work: (n) => {
      const pool = [
        objOfType('microwave'),
        OBJ_BY_ID.radioBreak,
        objOfType('vending'),
        objOfType('serverrack'),
        objOfType('printer'),
      ].filter(Boolean);
      return pool.length
        ? useAct(n, pick(pool), { label: 'Fiddling', anim: 'use', dur: rand(8, 14), maxWait: 4 })
        : null;
    },
    clerk: (n) => useAct(n, OBJ_BY_ID.radioStock, { label: 'Fiddling', anim: 'use', dur: rand(5, 10), maxWait: 4 }),
    courier: (n) => useAct(n, objOfType('payphone'), { label: 'Fiddling', anim: 'use', dur: rand(4, 7), maxWait: 4 }),
    house: (n) => useAct(n, OBJ_BY_ID['lamp_' + n.id], { label: 'Fiddling', anim: 'use', dur: rand(8, 16) }),
  },
  hungry: {
    work: (n) => useAct(n, objOfType('fridge_office'), { label: 'Fridge', anim: 'eat', dur: rand(5, 9), maxWait: 5 }),
    agnes: (n) => useAct(n, OBJ_BY_ID.agnesFridge, { label: 'Fridge', anim: 'eat', dur: rand(3, 6), maxWait: 5 }),
    clerk: (n) => useAct(n, objOfType('shelf_snack'), { label: 'Snack', anim: 'eat', dur: rand(2, 4), maxWait: 4 }),
  },
  window: {
    house: (n) => {
      const h = HOUSE_OF[n.id];
      return [
        goAct(h.window, { label: 'Window' }),
        waitAct({
          label: 'Window',
          anim: 'stare',
          dur: rand(15, 40),
          onStart: (c) => (c.tdir = h.row === 'N' ? 0 : Math.PI),
        }),
      ];
    },
    agnes: () => [
      goAct([21, 22], { label: 'Window' }),
      waitAct({ label: 'Window', anim: 'stare', dur: rand(15, 35), onStart: (c) => (c.tdir = Math.PI / 2) }),
    ],
  },
  lamps: {
    house: (n) => useAct(n, OBJ_BY_ID['lamp_' + n.id], { label: '…', anim: 'lookup', dur: rand(6, 12) }),
    out: (n) => {
      const h = hourF();
      if (h > 6 && h < 18.5) return null;
      const lamp = OBJ.filter(
        (o) => (o.type === 'streetlamp' || o.type === 'parklamp') && Math.hypot(o.cx - n.x, o.cz - n.z) < 16,
      ).sort((a, b) => Math.hypot(a.cx - n.x, a.cz - n.z) - Math.hypot(b.cx - n.x, b.cz - n.z))[0];
      const t = lamp && nearestWalkable(lamp.x + 1.5, lamp.z + 0.5, n, 2);
      if (!t) return null;
      return [
        goAct(t, { label: 'Walking' }),
        waitAct({
          label: '…',
          anim: 'lookup',
          dur: rand(8, 16),
          onStart: (c) => (c.tdir = Math.atan2(lamp.cx - c.x, lamp.cz - c.z)),
        }),
      ];
    },
  },
  stink: {
    house: (n) =>
      n.isThem ? null : useAct(n, OBJ_BY_ID['rad_' + n.id], { label: 'Socks', anim: 'use', dur: rand(2, 4) }),
  },
};
const Q_OPTS = { window: { window: true }, lamps: { lit: true }, mirror: { window: true } };
function quirkAct(n, where) {
  const opts = [];
  for (const q of (G.quirks && G.quirks[n.id]) || []) {
    const f = QDO[q] && QDO[q][where];
    if (f) opts.push(q);
  }
  for (const q of shuffle(opts)) {
    const acts = QDO[q][where](n);
    if (acts) return tagQ(acts, q, Object.assign({ office: where === 'work' }, Q_OPTS[q]));
  }
  return null;
}
// the ones that live in the plan: out walking in the small hours, up with the light on, out to the lamps after dark
function quirkPlan(n, P) {
  if (!HOUSE_OF[n.id] || !G.quirks) return;
  const up = (P.find((b) => b.a === 'sleep' && b.s === 0) || { e: 360 }).e;
  if (hasQ(n, 'night') && chance(0.65)) {
    const s = Math.round(rand(0.4, 2.6) * 60),
      e = Math.min(up - 20, s + Math.round(rand(40, 90)));
    if (e - s > 25) overlay(P, s, e, 'stroll');
  }
  if (hasQ(n, 'awake') && chance(0.7)) {
    const s = Math.round(rand(0.6, 3.2) * 60),
      e = Math.min(up - 20, s + Math.round(rand(60, 150)));
    if (e - s > 30) overlay(P, s, e, 'house');
  }
  if (hasQ(n, 'lamps') && chance(0.55)) {
    const eve = P.find(
      (b) => b.a === 'house' && b.e >= 21 * 60 && b.s <= 22.4 * 60 && b.e - Math.max(b.s, 20.5 * 60) > 40,
    );
    if (eve) {
      const s = Math.round(Math.max(eve.s, 20.5 * 60) + rand(0, 20)),
        e = Math.min(eve.e - 5, s + Math.round(rand(25, 45)));
      if (e - s > 15) overlay(P, s, e, 'stroll');
    }
  }
}
// what hangs about somebody's door: the socks of an ordinary person, THEIR flies or THEIR fish, or what was left
// behind by one of THEM who came in the night
function smellOf(id) {
  const s = G.smell && G.smell[id];
  if (s && s.until > G.t) return { k: s.k, inv: true };
  const n = NPC[id];
  if (n && !n.gone && !n.slain && hasQ(n, 'stink')) return { k: n.isThem ? G.faction : 'socks' };
  return null;
}
const HABIT_WINDOWS = (n) =>
  isOfficePlan(n)
    ? [
        [580, 680],
        [840, 975],
      ]
    : n.def.plan === 'clerk'
      ? [[480, 1260]]
      : n.def.plan === 'courier'
        ? [
            [560, 700],
            [820, 990],
          ]
        : [
            [450, 570],
            [1020, 1260],
          ];
const HABIT_SPOTS_FOR = (n) =>
  n.def.plan === 'boss'
    ? ['boss', 'closet', 'wc']
    : isOfficePlan(n)
      ? ['closet', 'wc', 'breakroom', 'alley']
      : n.def.plan === 'clerk'
        ? ['stock', 'alley']
        : n.def.plan === 'courier'
          ? ['alley', 'stock', 'closet', 'wc']
          : ['agnes', 'alley'];
// an invented half that leads nowhere
function falseHalf(n, half) {
  const real = G.habits[n.id];
  if (half === 't') {
    for (let k = 0; k < 20; k++) {
      const w = pick(HABIT_WINDOWS(n)),
        m = Math.round(rand(w[0], w[1]) / 5) * 5;
      if (!real || Math.abs(m - real.m) >= 60) return m;
    }
    return real ? (real.m + 180) % 1440 : 600;
  }
  const spots = HABIT_SPOTS_FOR(n).filter((x) => !real || x !== real.spot);
  return pick(spots.length ? spots : ['alley']);
}
// THEIR cover story about themselves: a whole routine, all of it false
function makeCover() {
  G.cover = {};
  for (const n of them()) G.cover[n.id] = { m: falseHalf(n, 't'), spot: falseHalf(n, 'p') };
}
// temperaments, the odd ones, and harmless habits that overlap THEIR signatures
function rollTraits() {
  G.traits = {};
  const normals = suspects().filter((n) => !n.isThem);
  const odd = shuffle(normals.map((n) => n.id)).slice(0, chance(0.5) ? 1 : 2);
  const sigPool = [...RUMORS.aliens, ...RUMORS.lizards, ...RUMORS.zombies];
  // two or three ordinary office people can't sit still; THEY are no more and no less restless than anyone
  const offN = shuffle(normals.filter((n) => isOfficePlan(n)).map((n) => n.id)),
    rest = offN.slice(0, irand(2, 3));
  for (const n of suspects()) {
    if (n.isThem)
      G.traits[n.id] = {
        temper: pick(['careful', 'aggressive']),
        fightR: irand(2, 5),
        catchR: G.faction === 'lizards' ? 5 : 3,
        restless: isOfficePlan(n) && chance(0.5) ? irand(1, 2) : 0,
      };
    else
      G.traits[n.id] = {
        temper: pick(['aggressive', 'mocker', 'timid']),
        odd: odd.includes(n.id),
        sig: shuffle(sigPool.slice()).slice(0, chance(0.5) ? 1 : 2),
        restless: rest.includes(n.id) ? irand(1, 2) : 0,
      };
  }
}
