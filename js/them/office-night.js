//@ them/office-night — The office after dark
//@ Defines: ON_SCENES, ON_ENC, ON_LEAVE, ON_DESKS, ON_SOLO, officeNightTick, officeScene, officeWatchful, officeLeaves, officeBribe, officeImplant, officeDyn, horrorTick, horrorFire, noticeTick
//@ Uses:    sim/core, core/util, town/npc-update, sim/actions, world/objects, world/grid, town/cast, ui/interface, them/awareness, horror/director, …
//@ (header made by tools/map.js; stripped by build.py)
// ───────────── the office after dark
// Most nights from THEIR second day, one of THEM lets itself into the empty office and gets on with THEIR work there:
// wiring the server rack, counting envelopes in Mr. Hale's chair, eating out of the fridge, typing at a dead desk, a quiet
// meeting with somebody who shouldn't be there, or something worse in a back room. You catch it by a door left ajar, a glow
// in a dark window, or by waiting in there yourself. Seen, it stops and stares. Unseen, it sometimes leaves something behind.
const ON_SCENES = {
  aliens: ['wire', 'copier', 'implant', 'enc'],
  lizards: ['envelopes', 'bribe', 'enc'],
  zombies: ['fridge', 'nightshift', 'enc'],
};
const ON_ENC = { aliens: 'probe', lizards: 'massage', zombies: 'tend' }; // the back-room kind: out of its skin, with someone
const ON_LEAVE = { aliens: 'device', lizards: 'skin', zombies: 'finger' };
const ON_DESKS = ['chairA1', 'chairA3', 'chairA4', 'chairB1', 'chairB2', 'chairB3', 'chairB4'];
const deskOwner = (o) => CHARS.find((c) => c.def && c.def.chair === o.id) || null;
const ON_SOLO = {
  wire: {
    at: () => objOfType('serverrack'),
    anim: 'use',
    dur: [24, 34],
    col: [0.4, 1, 0.7],
    odd: 'rack',
    note: () => 'Up to the wrists inside the server rack, in the dark. The lights blinked in time with its breathing.',
  },
  copier: {
    at: () => objOfType('printer'),
    anim: 'use',
    dur: [18, 26],
    col: [0.72, 1, 0.86],
    odd: 'copier',
    note: () => 'Copying its own hand on the office printer at night, over and over. The copies had too many fingers.',
  },
  envelopes: {
    at: () => OBJ_BY_ID.chairBoss,
    anim: 'type',
    prop: 'paper',
    dur: [22, 32],
    col: [1, 0.78, 0.45],
    odd: 'ledger',
    note: () => 'In Mr. Hale’s chair after midnight, counting envelopes. Dozens. Every one had a name on it.',
  },
  fridge: {
    at: () => objOfType('fridge_office'),
    anim: 'eat',
    dur: [16, 24],
    col: [0.78, 0.88, 1],
    odd: 'fridge',
    note: () => 'Eating out of the office fridge in the dark, with both hands. Nothing in there was cooked.',
  },
  nightshift: {
    at: (m) =>
      pick(
        ON_DESKS.map((id) => OBJ_BY_ID[id]).filter((o) => o && o.id !== m.def.chair && !(o.users || []).some((u) => u)),
      ),
    anim: 'type',
    dur: [26, 36],
    col: [0.55, 0.75, 1],
    odd: 'nightshift',
    note: (o) => {
      const w = deskOwner(o);
      return (
        'Typing at ' +
        (w ? w.short + '’s' : 'an empty') +
        ' desk in the dark. The same word, all the way down the screen.'
      );
    },
  },
};
const officeNight = () => {
  const h = hourF();
  return h >= 22 || h < 4.5;
};
const officeEmpty = () => !CHARS.some((c) => !c.isPlayer && c.onMap && (roomAt(c.x, c.z) || {}).bld === 'office');
function officeNightTick() {
  if (!G.started || G.over || G.landing || G.endAt || !theyStir()) return;
  if (G.on) {
    if (G.t > G.on.until) G.on = null;
    return;
  }
  if (!officeNight()) return;
  const night = hourF() >= 22 ? dayNo() : dayNo() - 1;
  if (G.onNight === night) return;
  if (!G.onNext) G.onNext = G.t + rand(10, 40);
  if (G.t < G.onNext) return;
  G.onNext = G.t + rand(25, 45);
  if (
    (G.enc && G.enc.indoor && (roomByKey(G.enc.room) || {}).bld === 'office') ||
    (G.attack && G.attack.phase !== 'wait') ||
    !officeEmpty()
  )
    return;
  if (!chance(0.07 + 0.03 * clamp(G.phase || 1, 1, WEEK))) return; // most nights; nearly every night late in the week
  const ms = alive().filter((n) => !n.exposed && encMemberFree(n, true));
  if (!ms.length) return;
  const pool = ms.flatMap((n) => (isOfficePlan(n) ? [n, n, n] : [n])); // the ones with a key to the place come most
  const m = pick(pool);
  for (const k of shuffle(ON_SCENES[G.faction].slice()))
    if (officeScene(m, k)) {
      G.onNight = night;
      return;
    }
}
function officeScene(m, k) {
  if (k === 'enc') return encStart(true, true, 'office', ON_ENC[G.faction]);
  if (k === 'bribe') return officeBribe(m);
  if (k === 'implant') return officeImplant(m);
  const D = ON_SOLO[k],
    obj = D.at(m);
  if (!obj) return false;
  const dur = rand(D.dur[0], D.dur[1]),
    note = D.note(obj);
  const S = (G.on = { k, by: m.id, x: obj.cx, z: obj.cz, col: D.col, lit: false, until: G.t + dur + 120 });
  hardReset(m);
  m.engaged = null;
  enqueue(
    m,
    useAct(m, obj, {
      label: '…',
      op: true,
      anim: D.anim,
      prop: D.prop || null,
      dur,
      maxWait: 6,
      interruptible: false,
      onStart: (c) => {
        S.lit = true;
        c.odd = { k: D.odd, amt: 20, note, until: G.t + dur + 0.5 };
        if (G.started && visAt(c.x, c.z) < 0.4 && heardIt('noise', c.x, c.z)) notifyPing(c.x, c.z); // close by, out of sight: a sound through the wall
      },
      onTick: (c, a) => officeWatchful(c, a, S),
      onEnd: (c, a, ok) => {
        S.lit = false;
        if (c.odd && c.odd.k === D.odd) c.odd.until = Math.min(c.odd.until, G.t + 0.5);
        if (ok && !a.spotted) officeLeaves(c, S);
        if (G.on === S) G.on = null;
      },
    }),
  );
  return true;
}
// it isn't careless about you: catch its eye and it stops, stares, and remembers
function officeWatchful(c, a, S) {
  if (a.spotted || !npcSeesPlayer(c, 7)) return;
  a.spotted = true;
  S.lit = false;
  S.done = true;
  if (c.odd) c.odd.until = G.t + 1.5; // a moment, to get the shot
  c.tdir = Math.atan2(PLAYER.x - c.x, PLAYER.z - c.z);
  ui.bubble(c, 'frown', 'speech', 2.5);
  addDanger(c, 12);
  a.dur = a.t + 1.5;
}
// half the time something stays behind on the floor: THEIR kind of thing, for you to find before the morning
function officeLeaves(c, S) {
  if (!chance(0.5)) return;
  const t = nearestWalkable(S.x, S.z, c, 2);
  if (!t) return;
  const r = roomAt(t[0] + 0.5, t[1] + 0.5);
  addItem({
    kind: ON_LEAVE[G.faction],
    x: t[0] + 0.5 + rand(-0.2, 0.2),
    z: t[1] + 0.5 + rand(-0.2, 0.2),
    rot: rand(0, TAU),
    by: c.id,
    room: r ? r.key : null,
    at: G.t,
  });
}
// lizards: somebody walks in off the dark street to the break room table, and goes home bought
function officeBribe(m) {
  const pool = suspects().filter(
    (o) =>
      !o.isThem &&
      !o.exposed &&
      !o.gone &&
      o.onMap &&
      !o.engaged &&
      !o.fleeing &&
      !o.trueForm &&
      !o.riteBy &&
      !o.under &&
      !o.hideUntil &&
      bought(o) < 2 &&
      o.id !== 'lenny',
  );
  if (!pool.length) return false;
  const o = pick(pool.flatMap((x) => (isOfficePlan(x) ? [x, x] : [x]))),
    A = OBJ_BY_ID.breakChairA,
    B = OBJ_BY_ID.breakChairB;
  const S = (G.on = {
    k: 'bribe',
    by: m.id,
    with: o.id,
    x: 23.5,
    z: 4,
    col: [1, 0.8, 0.5],
    lit: false,
    until: G.t + 150,
  });
  hardReset(m);
  m.engaged = null;
  hardReset(o);
  o.engaged = null;
  enqueue(
    o,
    useAct(o, B, { label: '…', op: true, anim: 'watch', dur: null, until: () => G.on !== S || S.done, maxWait: 10 }),
  );
  enqueue(
    m,
    useAct(m, A, {
      label: '…',
      op: true,
      anim: 'talk',
      prop: 'paper',
      dur: null,
      maxWait: 10,
      until: () => S.done || G.t > S.until - 30,
      onStart: () => (S.lit = true),
      onTick: (c, a, dt) => {
        officeWatchful(c, a, S);
        if (a.spotted) return;
        const q = o.queue[0],
          seated = q && q.obj === B && q.stage === 'run';
        if (!seated) return;
        a.met = (a.met || 0) + dt;
        c.odd = {
          k: 'envelope',
          amt: 15,
          note:
            'In the dark break room after midnight, slid ' +
            o.short +
            ' a thick envelope across the table. ' +
            o.short +
            ' counted it.',
          until: G.t + 0.6,
        };
        if (a.met >= 9) {
          S.done = true;
          buy(o, c.id, true);
        }
      },
      onEnd: () => {
        S.lit = false;
        S.done = true;
        if (G.on === S) G.on = null;
      },
    }),
  );
  return true;
}
// aliens: one of the office walks in asleep, sits at their own desk, and IT stands over them with something that glows
function officeImplant(m) {
  const pool = suspects().filter(
    (o) =>
      isOfficePlan(o) &&
      !o.isThem &&
      !o.exposed &&
      !o.gone &&
      o.onMap &&
      !o.engaged &&
      !o.fleeing &&
      !o.trueForm &&
      !o.riteBy &&
      !o.under &&
      !o.hideUntil &&
      !G.chipped[o.id] &&
      OBJ_BY_ID[o.def.chair] &&
      G.t - (o.riteAt || -1e9) > 900,
  );
  if (!pool.length) return false;
  const v = pick(pool),
    ch = OBJ_BY_ID[v.def.chair];
  const side = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ]
    .map(([dx, dz]) => [Math.floor(ch.cx) + dx, Math.floor(ch.cz) + dz])
    .find(([x, z]) => walkable(x, z, m));
  if (!side) return false;
  const S = (G.on = {
    k: 'implant',
    by: m.id,
    with: v.id,
    x: ch.cx,
    z: ch.cz,
    col: [0.4, 1, 0.7],
    lit: false,
    until: G.t + 180,
  });
  hardReset(v);
  v.engaged = null;
  v.trance = true;
  v.spd = 0.78;
  v.riteAt = G.t;
  hardReset(m);
  m.engaged = null;
  enqueue(
    v,
    useAct(v, ch, {
      label: '…',
      op: true,
      anim: 'sleep',
      dur: null,
      until: () => G.on !== S || S.done,
      maxWait: 12,
      interruptible: false,
      onEnd: (c) => {
        c.trance = false;
        c.spd = 1;
      },
    }),
  );
  enqueue(m, [
    goAct(side, { label: '…', op: true }),
    waitAct({
      label: '…',
      op: true,
      anim: 'use',
      dur: null,
      interruptible: false,
      until: () => S.done || G.t > S.until - 20,
      onTick: (c, a, dt) => {
        officeWatchful(c, a, S);
        if (a.spotted) return;
        const q = v.queue[0],
          seated = q && q.obj === ch && q.stage === 'run';
        if (!seated) return;
        S.lit = true;
        c.tdir = Math.atan2(v.x - c.x, v.z - c.z);
        a.met = (a.met || 0) + dt;
        c.odd = {
          k: 'implant',
          amt: 25,
          note:
            v.short +
            ' asleep at ' +
            (isFem(v) ? 'her' : 'his') +
            ' own desk in the middle of the night, and ' +
            c.short +
            ' bent over ' +
            (isFem(v) ? 'her' : 'him') +
            ' with something that glowed, just behind the ear.',
          until: G.t + 0.6,
        };
        if (a.met >= 18) {
          S.done = true;
          G.chipped[v.id] = 1;
          v.lostDay = dayNo(G.t + 6 * 60);
        }
      },
      onEnd: () => {
        S.lit = false;
        S.done = true;
        if (G.on === S) G.on = null;
      },
    }),
  ]);
  return true;
}
function officeDyn() {
  const S = G.on;
  if (!S || !S.lit) return;
  DYN.push({
    x: S.x,
    z: S.z,
    col: S.col,
    int: 0.7 + 0.12 * Math.sin(R.time * 6.3) + 0.06 * Math.sin(R.time * 17),
    r: 3.6,
  });
}
function horrorTick() {
  if (G.endAt && G.t >= G.endAt.t && !G.over) return gameOver(G.endAt.k);
  openTick();
  lureTick();
  try {
    encTick();
    halfTick();
    traceTick();
    officeNightTick();
  } catch (e) {
    console.error(e);
  }
  for (const ev of G.horror || [])
    if (!ev.done && G.t >= ev.at) {
      ev.done = true;
      try {
        horrorFire(ev);
      } catch (e) {
        /* skip a broken one */
      }
    }
}
function horrorFire(ev) {
  const P = PLAYER,
    F = G.faction,
    m = pick(alive()),
    home = inRoomSet(P, (r) => r.home);
  switch (ev.k) {
    case 'leftover': {
      // something THEY left: early in the week in a back room, later anywhere public
      if (!m) return;
      if (!theyOut()) {
        const rk = pick(['closet', 'break', 'store', 'hall', 'wc']),
          t = randomTileIn(rk);
        if (!t) return;
        addItem({
          kind: FACTIONS[F].item,
          x: t[0] + rand(0.3, 0.7),
          z: t[1] + rand(0.3, 0.7),
          rot: rand(0, TAU),
          by: m.id,
          room: rk,
          at: G.t,
        });
        return;
      }
      const spots = [
        [27, 10],
        [28, 4],
        [37, 23],
        [30, 28],
        [44, 16],
        [24, 13],
      ];
      const [x, z] = pick(spots);
      addItem({ kind: FACTIONS[F].item, x: x + 0.5, z: z + 0.5, rot: rand(0, TAU), by: m.id, room: null, at: G.t });
      return;
    }
    case 'smell':
      if (P.onMap) {
        const sm = SMELL[clueFaction()];
        ui.note('weather', sm, 'onto');
        echo('hint', { x: P.x, z: P.z, quiet: true, text: sm });
      }
      return;
    case 'sound': {
      // a wrong sound behind a door, near you (if you happen to catch it)
      const d = DOORS.filter((dd) => Math.hypot(dd.x - P.x, dd.z - P.z) < 12 && dd.open < 0.5).sort(
        (a, b) => Math.hypot(a.x - P.x, a.z - P.z) - Math.hypot(b.x - P.x, b.z - P.z),
      )[0];
      if (d && heardIt('noise', d.x + 0.5, d.z + 0.5)) {
        notifyPing(d.x + 0.5, d.z + 0.5);
        addStress(4);
      }
      return;
    }
    case 'moved':
      G.movedNote = pick(MOVED);
      return;
    case 'chalk':
      G.chalk = G.gatherDay;
      return;
    case 'murmur': {
      // two of THEM in the break room, falling silent when you walk in
      const two = alive().filter(
        (n) => n.onMap && isOfficePlan(n) && curBlock(n).a === 'work' && !n.engaged && !n.tell,
      );
      if (two.length < 2 || !isWorkday()) return;
      const [a, b] = two;
      hardReset(a);
      hardReset(b);
      enqueue(b, [
        goAct([20, 4], { label: '…' }),
        waitAct({ dur: 12, anim: 'listen', onTick: (c) => (c.tdir = Math.atan2(a.x - c.x, a.z - c.z)) }),
      ]);
      const act = npcTalkAct(a, b, 12);
      act.murmur = true;
      act.onStart = (c) => {
        for (const [x, y] of [
          [a, b],
          [b, a],
        ])
          x.odd = {
            k: 'murmur',
            amt: 8,
            note: 'Whispering with ' + y.short + ' in the empty break room. Heads together.',
            until: G.t + 12,
          };
      };
      enqueue(a, [goAct([21, 4], { label: '…' }), act]);
      G.murmur = { a: a.id, b: b.id, until: G.t + 25 };
      return;
    }
    case 'call':
      G.phoneRing = { until: G.t + 15, wrong: true };
      if (home) ui.note('phone', 'Phone ringing', 'warn');
      return;
    case 'window': {
      if (!home || G.watcher) return;
      const c = pick(alive().filter((x) => atHome(x) && !x.hideUntil && !x.trueForm));
      if (!c) return;
      G.watcher = c.id;
      overlay(c.plan, tod(), tod() + 100, 'watch');
      c.thinkCd = 0;
      return;
    }
    case 'still': {
      // a figure in a parked car across the street, all night
      const s = spawnStranger('walker');
      if (!s) return;
      hardReset(s);
      placeChar(s, 3, 13);
      s.kind = 'still';
      enqueue(s, [
        waitAct({ label: '…', dur: rand(240, 400), anim: 'stare', onStart: (c) => (c.tdir = Math.PI) }),
        goAct(EDGES.W[0], { label: 'Walking' }),
      ]);
      return;
    }
    case 'followed': {
      // one of THEM walks behind you for a while
      if (!P.onMap || roomAt(P.x, P.z) || !m || !m.onMap || m.trueForm) return;
      hardReset(m);
      enqueue(
        m,
        chaseAct(P, {
          label: '…',
          walk: true,
          giveUp: 25,
          reach: 5,
          quit: () => !!roomAt(P.x, P.z),
          onCatch: (c) => {
            c.tdir = Math.atan2(P.x - c.x, P.z - c.z);
            enqueue(c, waitAct({ dur: 3, anim: 'stare' }));
          },
          onLose: (c) => leaveMap(c),
        }),
      );
      return;
    }
    case 'device': {
      if (!m) return;
      addItem({
        kind: F === 'aliens' ? 'device' : FACTIONS[F].item,
        x: 6.5,
        z: 24.5,
        rot: rand(0, TAU),
        by: m.id,
        room: 'living',
        at: G.t,
      });
      G.movedNote = F === 'aliens' ? 'Something small is humming in your flat.' : 'Someone was in your flat.';
      return;
    }
    case 'alley': {
      // a true form in the alley at night
      const c = pick(alive().filter((x) => atHome(x) && !x.trueForm && !x.hideUntil && !x.raiding));
      if (!c) return;
      hardReset(c);
      c.breakIn = true;
      enqueue(c, [
        goAct([27, 8], { label: '…' }),
        waitAct({
          dur: 1,
          onEnd: (cc, a, ok) => {
            if (!ok) {
              cc.breakIn = false;
              return;
            }
            trueForm(cc, 'prowl');
            if (cc.trueForm) {
              cc.trueForm.mode = 'prowl';
              cc.trueForm.long = 18;
              cc.trueForm.route = [
                [26, 4],
                [28, 9],
                [27, 11],
                [29, 6],
              ];
            }
            cc.breakIn = false;
          },
        }),
      ]);
      return;
    }
    case 'lure': {
      // one of THEM walks a stranger into the alley. The stranger doesn't come out.
      if (F !== 'aliens' || G.lure || G.attack) return;
      const c = pick(
        alive().filter(
          (x) => (atHome(x) || (x.onMap && !roomAt(x.x, x.z))) && !x.trueForm && !x.hideUntil && !x.raiding && !x.under,
        ),
      );
      if (!c) return;
      const st = spawnStranger('walker');
      if (!st) return;
      hardReset(st);
      hardReset(c);
      c.breakIn = true;
      const L = (G.lure = { by: c.id, s: st.id, t0: G.t, go: false });
      enqueue(st, [
        goAct([22, 15], { label: 'Walking' }),
        waitAct({ label: '…', dur: null, anim: 'idle', until: () => G.lure !== L || L.go }),
        goAct([28, 3], { label: '…' }),
        waitAct({ label: '…', dur: null, anim: 'lookup', until: () => G.lure !== L }),
      ]);
      enqueue(c, [
        goAct([23, 15], { label: '…' }),
        waitAct({
          label: '…',
          dur: 2,
          anim: 'talk',
          onTick: (cc) => (cc.tdir = Math.atan2(st.x - cc.x, st.z - cc.z)),
          onEnd: (cc) => {
            L.go = true;
            cc.odd = {
              k: 'lure',
              amt: 20,
              note: 'Led a stranger into the alley behind Pell’s. The stranger walked like a sleepwalker.',
              until: G.t + 25,
            };
          },
        }),
        goAct([27, 4], { label: '…' }),
        waitAct({
          label: '…',
          dur: null,
          anim: 'stare',
          until: () => G.lure !== L || Math.hypot(st.x - 28.5, st.z - 3.5) < 1.3,
        }),
        waitAct({
          label: '…',
          dur: 3,
          anim: 'stare',
          onTick: (cc) => (cc.tdir = Math.atan2(st.x - cc.x, st.z - cc.z)),
          onEnd: () => lureEnd(L, false),
        }),
      ]);
      return;
    }
    case 'flock': {
      // the controlled stand together in the park and look up
      if (F !== 'aliens') return;
      const ps = shuffle(
        CHARS.filter(
          (n) =>
            !n.isPlayer &&
            !n.isThem &&
            !n.gone &&
            n.onMap &&
            !n.def.officer &&
            n.id !== 'lenny' &&
            !n.engaged &&
            !n.fleeing &&
            !n.trueForm &&
            !asleep(n) &&
            !roomAt(n.x, n.z),
        ),
      ).slice(0, 3);
      while (ps.length < 3) {
        const st = spawnStranger('walker');
        if (!st) break;
        ps.push(st);
      }
      if (ps.length < 2) return;
      const spots = [
        [35, 22],
        [37, 23],
        [35, 24],
      ];
      ps.forEach((n, i) => {
        hardReset(n);
        enqueue(n, [
          goAct(spots[i], { label: '…' }),
          waitAct({ label: '…', dur: rand(35, 50), anim: 'lookup', interruptible: false }),
          ...(n.def.stranger ? [goAct(EDGES.E[0], { label: 'Walking' })] : []),
        ]);
      });
      echo('hint', { x: 36, z: 23, quiet: true, text: 'People standing in the park, looking up' });
      return;
    }
    case 'handle': {
      if (!home) return;
      notifyPing(11.5, 22.5);
      addStress(8);
      ui.note('lock', 'The door handle is turning', 'bad');
      audio.sting('whisper');
      if (mayHuntYou() && !G.attack) {
        G.attack = { at: G.t, phase: 'wait' };
        G.attack.forceYou = true;
      }
      return;
    }
  }
}
// things you notice when you get home, or walk through the alley
function noticeTick() {
  const P = PLAYER;
  if (!P.onMap) return;
  if (G.movedNote && inRoomSet(P, (r) => r.home) && !G.sleeping) {
    ui.note('home', G.movedNote, 'onto');
    addStress(5);
    G.movedNote = null;
  }
  if (G.chalk && G.chalk === G.gatherDay && Math.hypot(P.x - 27.5, P.z - 7) < 4) {
    G.chalk = 0;
    G.gatherTip = G.gatherDay;
    ui.note('moon', 'Chalk marks behind Pell’s. A circle.', 'onto');
    G.leads.push('THEY meet tonight · behind Pell’s');
  }
  if (G.murmur && G.t < G.murmur.until && roomAt(P.x, P.z) === roomByKey('break')) {
    const a = NPC[G.murmur.a],
      b = NPC[G.murmur.b];
    G.murmur = null;
    for (const c of [a, b])
      if (c && c.onMap) {
        const q = c.queue[0];
        if (q) q.cancel = true;
        ui.bubble(c, 'dots', 'speech', 3);
        c.tdir = Math.atan2(P.x - c.x, P.z - c.z);
      }
  }
  if (G.tapeUntil && G.t > G.tapeUntil) {
    G.tapeUntil = 0;
    for (const it of G.items.slice()) if (it.kind === 'tape') removeItem(it);
  }
}
