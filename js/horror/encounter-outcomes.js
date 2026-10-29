//@ horror/encounter-outcomes — An encounter under way: the rite, being noticed, pulling victims out, how it ends
//@ Defines: encBegin, riteTick, encAnnounce, encMood, encNoticed, encThreat, encPullAct, encPulled, encRelease, encLetGo, encThank, encFinish, ENC_AFTER, encAftermath, encMark, encTakeStranger, …
//@ Uses:    sim/core, sim/actions, core/util, horror/encounters, town/fleeing, town/npc-update, ui/interface, horror/layer, gfx/renderer, horror/encounter-draw, …
//@ (header made by tools/map.js; stripped by build.py)
// out of its skin, on the spot, with them in front of it
function encBegin(E, m) {
  E.phase = 'change';
  E.tChange = G.t;
  trueForm(m, 'rite', 'rite');
  if (!m.trueForm) return encAbort(E);
  m.trueForm.long = 60;
  m.queue = [];
  const fd = encSlot(E, m).dir;
  enqueue(
    m,
    waitAct({ label: '…', dur: TF_CHANGE, anim: 'stare', interruptible: false, onTick: (c) => (c.tdir = fd) }),
  );
  m.poseFn = encPose(E, m);
  // a noise as it changes: most of the time you never hear it, and only from close by. An ear, never a marker.
  if (visAt(E.S[0], E.S[1]) < 0.4 && heardIt('noise', E.S[0], E.S[1])) notifyPing(E.S[0], E.S[1]);
}
// the member's own tick while it's at it (called from trueFormTick)
function riteTick(n, dt) {
  const tf = n.trueForm,
    E = G.enc,
    P = PLAYER,
    d = Math.hypot(P.x - n.x, P.z - n.z);
  if (tf.mode === 'riteOut') {
    // walking off into the dark. Home, the skin goes back on.
    if (!n.queue.length) {
      n.poseFn = null;
      revert(n);
      n.inRite = false;
      n.thinkCd = 0;
      return;
    }
    if (P.onMap && !G.away && d < 4.5 && seesSpot(n, P.x, P.z, 4.5)) {
      n.poseFn = null;
      hardReset(n);
      if (mayHuntYou() && !tf.wit) {
        tf.mode = 'attack';
        tf.t0 = G.t;
        tf.lastSeen = G.t;
      } else {
        tf.mode = 'flee';
        flee(n);
      }
    }
    return;
  }
  if (!E || E.by !== n.id) {
    n.poseFn = null;
    tf.mode = 'flee';
    return flee(n);
  }
  if (E.phase === 'change') {
    E.phase = 'act';
    E.tAct = G.t;
    const r = ENC_DUR[E.type];
    E.dur = rand(r[0], r[1]);
    encAnnounce(E, n);
  }
  encHold(n, E, dt);
  // it's busy, not blind: right up close, in front of it, or with you running about, it knows you're there
  if (P.onMap && !G.away) {
    const ahead = Math.abs(angDiff(n.dir, Math.atan2(P.x - n.x, P.z - n.z))) < 1.0;
    if (d < 1.2 || (d < 5 && seesSpot(n, P.x, P.z, 5) && (ahead || P.run))) return encNoticed(E, n);
    if (n.tell && n.tell.photo && d < 12) return encNoticed(E, n); // the flash
  }
  if (G.t - E.tAct >= E.dur) return encFinish(E, n);
}
function encAnnounce(E, n) {
  const snd = {
    probe: 'beam',
    specimen: 'thrum',
    worship: 'choir',
    massage: 'hiss',
    court: 'hiss',
    dance: 'choir',
    tend: 'groan',
  }[E.type];
  // a scream, if you're close and it happens to carry: that, and only that, puts a marker on it. Otherwise it goes unnoticed.
  if (E.seen || heardIt('scream', E.S[0], E.S[1])) {
    E.known = true;
    hxSound(snd, E.S[0], E.S[1], 0.8);
    if (!E.seen) hxSound('scream', E.S[0], E.S[1], 0.5);
  }
}
// what it sounds like while it lasts: only once you've heard it or seen it, or you're right on top of it
const encAudible = (E) => !!(E && (E.known || E.seen || (PLAYER.onMap && hxDist(E.S[0], E.S[1]) < 4)));
// the little sounds and words that go with it
function encMood(E, m, vs, dt) {
  // paced in real seconds, so fast-forward doesn't turn it into a racket
  if (E.phase !== 'act') return;
  E.snd -= dt / Math.max(1, SIM_SPD || 1);
  E.say -= dt / Math.max(1, SIM_SPD || 1);
  const lines = {
    worship: ['We are yours.', 'Warm. So warm.', 'Bless us.', 'Below. Below.'],
    massage: ['Is that better?', 'So cold. You’re so cold.', 'There. There.'],
    court: ['…yes.', 'Where are we going?', 'I don’t mind.'],
    tend: ['There. There.', 'Hold still.', 'You poor thing.'],
    dance: ['…', 'Don’t stop.'],
    probe: [],
    specimen: [],
  }[E.type];
  if (E.say <= 0 && vs.length) {
    E.say = rand(3.5, 6.5);
    const v = pick(vs);
    if (lines.length && chance(0.7)) ui.say(v, pick(lines), 2.6);
    else
      ui.bubble(
        v,
        {
          probe: 'sick',
          specimen: 'exclaim',
          worship: 'heart',
          massage: 'heart',
          court: 'question',
          dance: 'heart',
          tend: 'heart',
        }[E.type],
        'speech',
        1.8,
      );
  }
  if (E.snd <= 0) {
    E.snd = rand(6, 10);
    if (encAudible(E))
      hxSound(
        {
          probe: 'zip',
          specimen: 'beam',
          worship: 'choir',
          massage: 'slurp',
          court: 'whisper',
          dance: 'choir',
          tend: 'groan',
        }[E.type],
        E.S[0],
        E.S[1],
        0.55,
      );
  }
}
// you're seen. They wake; it breaks off, and THEY remember your face.
function encNoticed(E, n) {
  const tf = n.trueForm;
  E.broken = 'seen';
  bookNight(n);
  encRelease(E, true);
  n.poseFn = null;
  hardReset(n);
  ui.bubble(n, 'exclaim', 'speech', 2);
  hxSound(E.fac === 'lizards' ? 'hiss' : E.fac === 'aliens' ? 'zip' : 'groan', n.x, n.z, 0.9);
  const attack = mayHuntYou() && (n.exposed || G.stage >= 4) && chance(0.55),
    blink = !attack && E.fac === 'aliens' && chance(0.5);
  if (attack && G.speed > 1) G.speed = 1;
  encThreat(n, E.fac, attack ? 1.4 : 2, (c) => {
    const t2 = c.trueForm;
    if (attack) {
      t2.mode = 'attack';
      t2.t0 = G.t;
      t2.lastSeen = G.t;
      t2.cornered = false;
      audio.sting('caught');
    } else if (blink) {
      R.flash = Math.max(R.flash, 0.5);
      hideAway(c, true);
    } else {
      t2.mode = 'flee';
      flee(c);
    }
  });
  encEnd(E);
}
// it turns on you: a moment of it, facing you, before whatever comes next
function encThreat(n, fac, dur, then) {
  n.poseFn = encThreatPose(fac, G.t, dur);
  enqueue(
    n,
    waitAct({
      label: '…',
      dur,
      anim: 'stare',
      interruptible: false,
      onTick: (c) => (c.tdir = Math.atan2(PLAYER.x - c.x, PLAYER.z - c.z)),
      onEnd: (c) => {
        c.poseFn = null;
        if (c.tell) c.tell.lunge = false;
        if (c.trueForm && c.trueForm.mode === 'rite' && c.onMap && !c.slain) then(c);
      },
    }),
  );
}
// E on one of them: you pull them out of it. From out of its sight, it never knew you were there: it just runs.
function encPullAct(v) {
  return mkAct({
    kind: 'wait',
    label: 'Pull away',
    icon: 'wave',
    dur: 0.6,
    anim: 'use',
    interruptible: false,
    check: () =>
      tooShaken()
        ? 'Too shaken'
        : G.enc && G.enc.vic.includes(v.id) && v.riteBy && inReach({ char: v })
          ? null
          : 'Too far',
    onStart: (c) => {
      c.tdir = Math.atan2(v.x - c.x, v.z - c.z);
    },
    onEnd: (c, a, ok) => {
      if (ok) encPulled(v);
    },
  });
}
function encPulled(v) {
  const E = G.enc;
  if (!E || !E.vic.includes(v.id)) return;
  const m = encChar(E.by);
  E.broken = 'pulled';
  if (E.phase === 'gather' && m && !m.trueForm) {
    // still in its own skin: it lets them go and walks away like nothing happened
    encRelease(E, true);
    hardReset(m);
    m.inRite = false;
    m.encIn = 0;
    ui.bubble(m, 'dots', 'speech', 2);
    return encEnd(E);
  }
  encRelease(E, true);
  if (m && m.trueForm) {
    m.poseFn = null;
    hardReset(m);
    ui.bubble(m, 'exclaim', 'speech', 2);
    encThreat(m, E.fac, 1.2, (c) => {
      if (E.fac === 'aliens') {
        R.flash = Math.max(R.flash, 0.5);
        hideAway(c, true);
      } else {
        c.trueForm.mode = 'flee';
        flee(c);
      }
    });
  }
  encEnd(E);
}
// everybody it had, let go. Saved: they know what you did for them, and some of them saw whose face it was.
function encRelease(E, saved) {
  const m = encChar(E.by);
  for (const id of E.vic) {
    const v = encChar(id);
    if (!v) continue;
    const idx = E.vic.indexOf(id);
    encLetGo(v, saved);
    if (m && m.trueForm) {
      m.trueForm.wits[v.id] = 1;
      m.trueForm.wit = true;
    }
    if (saved) encThank(E, v, m, idx);
  }
}
function encLetGo(v, stay) {
  v.riteBy = null;
  v.poseFn = null;
  v.trance = false;
  v.encIn = 0;
  v.spd = 1;
  if (v.fx) {
    v.fx.prop = null;
    v.fx.slime = 0;
    v.fx.gape = 0;
  }
  hardReset(v);
  if (v.def.stranger && v.onMap && !stay)
    enqueue(v, [waitAct({ label: '…', dur: rand(1, 2), anim: 'stare' }), goAct(edgeFor(v, v.z), { label: 'Walking' })]); // a stranger wakes and walks off home
}
function encThank(E, v, m, idx) {
  addStress(-5);
  ui.float(PLAYER, 'Saved', 'good');
  const act = E.phase === 'act',
    lifted = act && (E.type === 'probe' || E.type === 'specimen');
  const dur = lifted ? 3.2 : 2.2,
    kneel = act && (E.type === 'worship' || E.type === 'tend' || (E.type === 'massage' && idx === 1));
  v.poseFn = encAfterPose(act ? E.type : 'stand', G.t, dur, true, kneel);
  if (v.def.stranger) {
    ui.say(v, pick(['What… where am I?', 'Oh God. Oh God.', 'Thank you. THANK you.']), 2.6);
    enqueue(
      v,
      waitAct({
        label: '…',
        dur,
        anim: 'stare',
        interruptible: false,
        onStart: (c) => (c.tdir = Math.atan2(PLAYER.x - c.x, PLAYER.z - c.z)),
        onEnd: (c) => {
          c.poseFn = null;
          if (c.onMap) flee(c, { spd: 1 });
        },
      }),
    );
    return;
  }
  v.sus = Math.max(0, v.sus - 40); // you pulled them out of it: you're not the mad one
  v.frightUntil = G.t + 1440;
  ui.say(v, pick(['What… what was I doing?', 'You — you pulled me out of that.', 'That THING. It had me.']), 3);
  if (m && E.phase === 'gather') {
    // it never changed: all they know is who walked them out here
    addNote(m, 'Walked ' + v.short + ' out into the dark, like a sleepwalker.', { by: v.id });
  } else if (m && !m.exposed && chance(0.65)) {
    // it was a person when they got there: they watched the face come off
    (v.sawChange || (v.sawChange = {}))[m.id] = G.t;
    addNote(m, v.short + ': it was ' + m.short + '. The face came off.', { by: v.id });
    G.leads.push(v.short + ' saw whose face it was');
    if (G.leads.length > 6) G.leads.shift();
    setTimeout(() => {
      if (v.onMap && !G.over) ui.say(v, 'It was ' + m.short + '. The face just… came off.', 3.5);
    }, 3300);
  }
  echo('saved', { x: v.x, z: v.z, who: v.id });
  enqueue(v, [
    waitAct({
      label: '…',
      dur,
      anim: 'stare',
      onStart: (c) => (c.tdir = Math.atan2(PLAYER.x - c.x, PLAYER.z - c.z)),
      onEnd: (c) => {
        c.poseFn = null;
      },
    }),
    waitAct({ label: '…', dur: 1.5, anim: 'shake' }),
  ]);
  setTimeout(() => {
    if (v.onMap && !G.over && !v.fleeing && m && m.trueForm) flee(v, { spd: 1 });
  }, 3200);
}
// left alone, it finishes. What it did stays done.
function encFinish(E, n) {
  const tf = n.trueForm,
    seen = !!tf.seenByYou,
    spot = E.S.slice();
  E.phase = 'out';
  E.why = 'finished';
  let named = null;
  for (const id of E.vic.slice()) {
    const v = encChar(id);
    if (!v) continue;
    const idx = E.vic.indexOf(id),
      kneel = E.type === 'worship' || E.type === 'tend' || (E.type === 'massage' && idx === 1);
    encLetGo(v, true);
    tf.wits[v.id] = 1;
    if (!v.def.stranger) {
      named = named || v;
      encMark(E, v, n, seen, kneel);
    } else encTakeStranger(E, v, n, kneel);
  }
  echo('rite', { x: spot[0], z: spot[1], who: named ? named.id : null });
  // home in its own skin, the long way round
  n.poseFn = null;
  hardReset(n);
  const night = encNight(),
    home = n.id === 'agnes' ? HIDEOUTS.agnes : HOUSE_OF[n.id] ? HOUSE_OF[n.id].spot : null;
  const dest =
    (night || E.indoor || !theyOut()) && home && !n.exposed
      ? home
      : [HIDEOUTS.alley, HIDEOUTS.park].sort(
          (a, b) => Math.hypot(a[0] - n.x, a[1] - n.z) - Math.hypot(b[0] - n.x, b[1] - n.z),
        )[0];
  tf.mode = 'riteOut';
  const to = walkable(dest[0], dest[1], n)
    ? dest
    : nearestWalkable(dest[0] + 0.5, dest[1] + 0.5, n, 3) || edgeFor(n, n.z);
  n.spd = 0.85;
  enqueue(n, goAct(to, { label: 'Away', interruptible: false }));
  encEnd(E);
}
const ENC_AFTER = { probe: 7, specimen: 6, worship: 4.5, massage: 4, court: 5, dance: 4, tend: 4.5 };
function encAftermath(E, v, kneel, then) {
  const dur = ENC_AFTER[E.type] || 4;
  v.poseFn = encAfterPose(E.type, G.t, dur, false, kneel);
  enqueue(v, [
    waitAct({
      label: '…',
      dur,
      anim: 'stare',
      onEnd: (c) => {
        c.poseFn = null;
      },
    }),
    ...(then || []),
  ]);
}
function encMark(E, v, n, seen, kneel) {
  const next = dayNo(G.t + 6 * 60);
  v.frightUntil = G.t + 1440;
  markVictim(v, n.id);
  if (E.fac === 'aliens') {
    G.chipped[v.id] = 1;
    v.lostDay = next;
  } else if (E.fac === 'lizards') buy(v, n.id, true);
  else {
    v.limpDay = next;
    if (!G.attackFoe && G.victims.length < 2 && v.id !== 'lenny') G.attackFoe = v.id;
    v.marked = G.t;
    G.bitten[v.id] = 1;
  }
  encAftermath(E, v, kneel);
  if (seen) {
    // you watched it happen and did nothing
    addStress(6);
    const what =
      E.fac === 'aliens'
        ? ' was opened up and put back. Doesn’t remember.'
        : E.fac === 'lizards'
          ? isFem(v)
            ? ' went soft-eyed for it. Doesn’t remember.'
            : ' knelt to it. Doesn’t remember.'
          : ' was held by one of the dead. It marked them.';
    G.leads.push(v.short + what);
    if (G.leads.length > 6) G.leads.shift();
  }
}
// a stranger: nobody misses them. Some walk off home in a daze; some go with it.
function encTakeStranger(E, v, n, kneel) {
  const take = chance(E.fac === 'aliens' ? 0.5 : E.fac === 'lizards' ? 0.35 : 0.5);
  if (!take) {
    encAftermath(E, v, kneel, [goAct(edgeFor(v, v.z), { label: 'Walking' })]);
    return;
  }
  if (E.fac === 'aliens' && !E.indoor) {
    // up, in a column of light, slowly, arms hanging; and gone (indoors: it walks them out)
    const t0 = G.t,
      x = v.x,
      z = v.z;
    v.poseFn = (T, c) => {
      const q = clamp((G.t - t0) / 3, 0, 1);
      T.pitch = 0;
      T.roll = 0;
      T.float = sstep(0.1, 1, q) * 3.2;
      T.uaL = T.uaR = 0.15;
      T.aoL = T.aoR = 0.25;
      T.faL = T.faR = -0.05;
      T.hp = -0.6;
      T.thL = 0.05;
      T.thR = 0.1;
      T.shL = 0.2;
      T.shR = 0.3;
      c.fx.eye = [0.88, 0.93, 0.84];
      c.fx.gape = 0.6;
    };
    ENC_FX.push({ kind: 'lift', x, z, t0, dur: 3 });
    enqueue(
      v,
      waitAct({
        label: '…',
        dur: 3,
        anim: 'stare',
        interruptible: false,
        onEnd: (c) => {
          c.poseFn = null;
          if (visAt(x, z) > 0.4) R.flash = Math.max(R.flash, 0.3);
          addItem({ kind: 'scorch', x, z, rot: rand(0, TAU), by: n.id, room: null, at: G.t });
          c.onMap = false;
          c.queue = [];
        },
      }),
    );
  } else {
    // it walks, and they follow
    hardReset(v);
    v.trance = true;
    v.spd = 0.85;
    enqueue(
      v,
      chaseAct(n, {
        label: '…',
        walk: true,
        giveUp: 40,
        reach: 1.1,
        onCatch: (c) => {
          if (E.fac === 'zombies')
            addItem({ kind: 'stain', x: c.x, z: c.z, rot: rand(0, TAU), by: null, room: null, at: G.t });
          c.trance = false;
          c.onMap = false;
          c.queue = [];
        },
        onLose: (c) => {
          c.trance = false;
          c.onMap = false;
        },
      }),
    );
  }
  echo('victim', { x: v.x, z: v.z, stranger: true });
}
function encAbort(E, why) {
  if (G.enc !== E) return;
  E.why = why || 'abort';
  for (const id of E.vic) {
    const v = encChar(id);
    if (v && v.riteBy) encLetGo(v);
  }
  const m = encChar(E.by);
  if (m) {
    m.encIn = 0;
    if (m.trueForm && m.trueForm.mode === 'rite') {
      m.poseFn = null;
      hardReset(m);
      m.trueForm.mode = 'flee';
      flee(m);
    }
    if (!m.trueForm) {
      m.inRite = false;
      m.poseFn = null;
      if (m.queue.some((a) => a.rite === E.id)) hardReset(m);
    }
  }
  encEnd(E);
}
function encEnd(E) {
  if (G.enc === E) G.enc = null;
  E.phase = 'done';
  G.encLast = G.t;
  const m = encChar(E.by);
  if (m) {
    m.encIn = 0;
    if (!m.trueForm || m.trueForm.mode !== 'riteOut') m.poseFn = null;
    if (!m.trueForm) m.inRite = false;
  }
}
// a marker on it, once you've heard it or seen it
function encGoal() {
  const E = G.enc;
  if (!E || !E.known || (E.phase !== 'act' && E.phase !== 'change')) return null;
  const d = Math.hypot(PLAYER.x - E.S[0], PLAYER.z - E.S[1]);
  if (d < 3.5 || d > 26 || (d < 15 && visAt(E.S[0], E.S[1]) > 0.5)) return null; // in plain sight: no marker over it
  return { at: [Math.floor(E.S[0]), Math.floor(E.S[1])], icon: 'exclaim', urgent: true, enc: true };
}
// it lights itself: green round the taken, the warm of a basking thing, the grey of the dead. Enough to see it by.
function encDyn() {
  const E = G.enc;
  if (!E || (E.phase !== 'act' && E.phase !== 'change')) return;
  const p = E.phase === 'change' ? 0.5 : 1;
  DYN.push({
    x: E.S[0],
    z: E.S[1],
    col: ENC_COL[E.fac],
    int: (E.fac === 'aliens' ? 1.1 : E.fac === 'lizards' ? 0.85 : 0.75) * p,
    r: E.fac === 'aliens' ? 5.5 : 4.5,
  });
  if (visAt(E.S[0], E.S[1]) > 0.5 && PLAYER.onMap && hxDist(E.S[0], E.S[1]) < 20) E.known = E.seen = true;
}
