//@ them/moves — THEIR morning moves: the Bought, Scatter, Destroy, Protect
//@ Defines: buy, unbuyBy, tryBribe, tryUnder, tryControl, controlled, catchControl, tryScatter, morningResist, stealPrint, abductCheck, abduct, lodgeTick, destroyTick, protectAfter, policeTick, …
//@ Uses:    sim/core, core/util, town/npc-update, sim/actions, them/awareness, ui/interface, town/echoes, gfx/world-geometry, them/plan, town/cast, …
//@ (header made by tools/map.js; stripped by build.py)
// ───────────── the Bought (lizards). Slight: they look past things and make your day worse. Heavy: THEIRS to the end.
const bought = (n) => (G.bought && G.bought[n.id]) || 0;
function buy(n, by, up) {
  if (!n || n.isThem || n.gone || n.exposed || n.id === 'lenny' || n.def.stranger) return;
  const was = bought(n);
  G.bought[n.id] = Math.min(2, Math.max(was, up ? was + 1 : 1));
  G.boughtBy[n.id] = by;
}
function unbuyBy(id) {
  for (const k in G.boughtBy)
    if (G.boughtBy[k] === id) {
      delete G.bought[k];
      delete G.boughtBy[k];
    }
}
// a bribe handed over: an operation. See it, and it's spoiled.
function tryBribe(n) {
  if (G.faction !== 'lizards' || n.bribeDay >= dayNo() - 2 || watchedNow(n) || chance(0.85)) return false;
  const near = suspects().filter(
    (o) =>
      !o.isThem &&
      !o.exposed &&
      !o.gone &&
      o.onMap &&
      !o.engaged &&
      !asleep(o) &&
      bought(o) < 2 &&
      Math.hypot(o.x - n.x, o.z - n.z) < 12,
  );
  if (!near.length) return false;
  // whoever already distrusts you; once THEY know you, whoever stands with you: your crowd turns
  near.sort((a, b) => (G.aware >= EVIDENCE.frameAt[0] ? b.rel - a.rel : b.sus - a.sus));
  const o = near[0];
  n.bribeDay = dayNo();
  const a = npcTalkAct(n, o, rand(4, 6));
  a.label = 'Envelope';
  a.prop = 'paper';
  a.onStart = (c, aa) =>
    (c.odd = {
      k: 'envelope',
      amt: 15,
      note: 'Slipped ' + o.short + ' a thick envelope. ' + o.short + ' pocketed it.',
      until: G.t + aa.dur + 0.3,
    });
  a.onEnd = (c, aa, ok) => {
    if (!ok) return;
    const seen =
      PLAYER.onMap && visAt(c.x, c.z) > 0.5 && c.shown > 0.5 && Math.hypot(PLAYER.x - c.x, PLAYER.z - c.z) < 12;
    buy(o, c.id, true);
    if (seen && npcSeesPlayer(c, 10)) bookNight(c); // seen handing it over: it spoils the deal, and THEY remember your face
    opDone('bribe', seen);
    echo('bribe', { who: c.id, other: o.id, x: c.x, z: c.z, quiet: true, seen: seen ? [] : [o.id] });
  };
  enqueue(n, a);
  return true;
}

// ───────────── Scatter (from the start): once a day each member has a word with a normal person, who is Misled for 2 days
const misled = (n) => !!(G.misled[n.id] && G.misled[n.id].until > G.t);
function tryUnder(n) {
  if (n.underDay === dayNo() || n.underAt == null) {
    if (n.underDay !== dayNo() && n.underAt == null) n.underAt = Math.round(rand(17.5, 21.5) * 60);
    if (n.underDay === dayNo()) return false;
  }
  if (tod() < n.underAt) return false;
  n.underDay = dayNo();
  n.underAt = null;
  const den = theyOut() ? chance(0.5) || !HOUSE_OF[n.id] : !HOUSE_OF[n.id]; // the storm drain behind Pell's: not before day 5 (unless it has no home)
  const spot = den ? [26, 10] : HOUSE_OF[n.id].spot,
    dur = rand(40, 60);
  const grate = (out) =>
    waitAct({
      label: '…',
      dur: 2.5,
      anim: 'dig',
      interruptible: false,
      onStart: (c) => {
        c.tdir = Math.PI / 2;
        c.odd = {
          k: 'drain',
          amt: 25,
          note: out
            ? 'Climbed OUT of the storm drain behind Pell’s.'
            : 'Lifted the grate and climbed into the storm drain behind Pell’s.',
          until: G.t + 2.7,
        };
      },
    });
  enqueue(n, [
    goAct(spot, { label: '…' }),
    ...(den ? [grate(false)] : []),
    waitAct({
      label: 'Below',
      dur,
      anim: 'idle',
      interruptible: false,
      onStart: (c) => {
        c.under = den;
      },
      onEnd: (c) => {
        c.under = false;
      },
    }),
    ...(den ? [grate(true)] : []),
  ]);
  return true;
}
function tryControl(n) {
  if (G.faction !== 'aliens' || G.control || n.controlDay >= dayNo() - 1 || chance(0.9)) return false;
  const pool = suspects().filter(
    (o) => !o.isThem && !o.exposed && !o.gone && o.onMap && !o.engaged && !asleep(o) && !o.fleeing && o !== n,
  );
  if (!pool.length) return false;
  const chipped = pool.filter((o) => G.chipped[o.id]);
  const who = pick(chipped.length && chance(0.7) ? chipped : pool);
  n.controlDay = dayNo();
  const dur = rand(20, 40),
    C = (G.control = { by: n.id, who: who.id, until: G.t + dur, seen: 0 });
  markVictim(who, n.id);
  hardReset(n);
  enqueue(
    n,
    waitAct({
      label: '…',
      dur,
      anim: 'stare',
      interruptible: false,
      onTick: (c, a, dt) => {
        if (G.control !== C) {
          a.dur = 0;
          return;
        }
        c.fx.glaze = true;
        c.odd = {
          k: 'control',
          amt: 30,
          note:
            'Sat perfectly still, eyes glazed, while ' +
            (NPC[C.who] ? NPC[C.who].short : 'someone') +
            ' wandered about like a sleepwalker.',
          until: G.t + 0.6,
          control: C,
        };
      },
      onEnd: (c) => {
        c.fx.glaze = false;
        if (G.control === C) {
          G.control = null;
          opDone('control');
        }
      },
    }),
  );
  controlled(who, dur);
  return true;
}
function controlled(o, dur) {
  hardReset(o);
  const k = pick(theyOut() ? ['wall', 'road', 'talk', 'window'] : ['wall', 'talk', 'window']); // out into the road only late in the week
  o.wrongTalk = G.t + 6 * 60;
  if (k === 'road')
    return enqueue(o, [
      goAct([irand(6, 50), 15], { label: '…' }),
      waitAct({ label: '…', dur: Math.min(dur, 15), anim: 'stare', interruptible: false }),
    ]);
  if (k === 'window') {
    const w = pick(WINDOWS);
    const t = nearestWalkable(w[0] + 0.5, w[1] + 0.5, o, 2);
    if (t)
      return enqueue(o, [
        goAct(t, { label: '…' }),
        waitAct({
          label: '…',
          dur: Math.min(dur, 15),
          anim: 'use',
          interruptible: false,
          onStart: (c) => (c.tdir = Math.atan2(w[0] + 0.5 - c.x, w[1] + 0.5 - c.z)),
        }),
      ]);
  }
  enqueue(
    o,
    waitAct({
      label: '…',
      dur: Math.min(dur, 18),
      anim: 'stare',
      interruptible: false,
      onStart: (c) => (c.tdir = rand(0, TAU)),
    }),
  );
}
// the flash breaks it: the one being steered drops (the photo itself is filed by takePhoto)
function catchControl(c, C) {
  G.control = null;
  const o = NPC[C.who];
  if (o && o.onMap) {
    hardReset(o);
    o.wrongTalk = 0;
    enqueue(
      o,
      waitAct({ label: 'Down', dur: 5, anim: 'sleep', interruptible: false, onStart: (cc) => (cc.pose = 'floorlie') }),
    );
  }
  c.queue.forEach((a) => (a.cancel = true));
}
function tryScatter(n) {
  if (n.scatterDay === dayNo() || chance(0.8)) return false; // spread across the day
  const near = suspects().filter(
    (o) =>
      o !== n &&
      !o.isThem &&
      !o.exposed &&
      o.onMap &&
      !o.engaged &&
      !o.fleeing &&
      !o.hideUntil &&
      !asleep(o) &&
      !misled(o) &&
      Math.hypot(o.x - n.x, o.z - n.z) < 10,
  );
  if (!near.length) return false;
  const o = pick(near);
  n.scatterDay = dayNo();
  const a = npcTalkAct(n, o, rand(6, 9));
  a.onEnd = (c, aa, ok) => {
    if (!ok) return;
    G.misled[o.id] = { until: G.t + 2 * 1440, by: n.id };
    echo('scatter', { who: n.id, other: o.id, x: c.x, z: c.z, quiet: true });
  };
  enqueue(n, a);
  return true;
}

// ───────────── Destroy (50) and the rest of the morning's moves
function morningResist() {
  const d = dayNo();
  G.overtimeToday = G.overtimeDay === d && isWorkday(d);
  if (G.aware < 50 || d - (G.destroyDay || -9) < 3) return;
  const care = covert().filter((n) => temper(n) === 'careful'),
    agg = covert().filter((n) => temper(n) === 'aggressive');
  const opts = [];
  if (care.length) opts.push('theft');
  if (agg.length && isWorkday(d)) opts.push('job');
  if (!opts.length || chance(0.35)) return;
  G.destroyDay = d;
  if (pick(opts) === 'theft') return stealPrint(pick(care));
  const m = pick(agg);
  if (chance(0.5))
    G.filesAt = (d - 1) * 1440 + irand(600, 960); // your files vanish some time today
  else {
    // Mr. Hale orders overtime for the next workday
    let nd = d + 1;
    while (!isWorkday(nd)) nd++;
    G.overtimeDay = nd;
    G.overtimeBy = m.id;
    setTimeout(() => ui.note('work', 'Hale: overtime ' + DOW[dow(nd)] + '. No slacking.', 'warn'), 3000);
    echo('overtime', { who: m.id, x: 4, z: 4, seen: ['hale'], quiet: true });
  }
}
// a card vanishes from your flat overnight: torn, half of it on the floor; the next day their routine shifts
function stealPrint(n) {
  if (!tearCard(n)) return;
  addNote(n, 'Torn photo on your floor. Half of it gone.', { by: 'you' });
  const hb = G.habits[n.id];
  if (hb) {
    const sh = (chance(0.5) ? 1 : -1) * rand(20, 40);
    hb.ms = (hb.ms || [hb.m]).map((t) => clamp(Math.round((t + sh) / 5) * 5, 440, 1290));
    hb.m = hb.ms[0];
  }
  setTimeout(() => {
    ui.note('print', 'A photo is gone. Torn.', 'bad');
    audio.sting('whisper');
  }, 2600);
  echo('theft', { who: n.id, x: 12, z: 21, seen: n.id !== 'agnes' ? ['agnes'] : [], quiet: true });
}
function abductCheck() {
  sleepTakeCheck();
}
// the scene plays with the town paused, then the hours go missing
function abduct(how) {
  if (capture(how === 'sleep' ? 'sleep' : 'beam', { reason: 'plan' })) return; // the old 6-second card: only if the new one can't play
  if (UI.scene || G.over) return;
  G.takenAt = G.t;
  G.taken = (G.taken || 0) + 1;
  const probe = !G.playerChip && chance(0.5) ? false : true,
    el = $('#scene');
  UI.scene = { t: 0, probe };
  el.querySelector('.cap').textContent = G.taken > 1 ? 'Again.' : probe ? 'Something cold.' : 'A tiny pinch.';
  el.hidden = false;
  el.querySelectorAll('*').forEach((e) => {
    e.style.animation = 'none';
    void e.offsetWidth;
    e.style.animation = '';
  });
  closeMenu();
  audio.sting('whisper');
  setTimeout(() => {
    el.hidden = true;
    UI.scene = null;
    if (G.over) return;
    if (probe) {
      G.stressFloor = Math.min(50, G.stressFloor + 5);
      setTimeout(() => ui.note('sick', 'Hours missing. Your neck hurts.', 'bad'), 1500);
    } else {
      G.playerChip = true;
      setTimeout(() => ui.note('sick', 'A small scar behind your ear', 'bad'), 1500);
    }
    addStress(12);
    G.visionOff = G.t + 120;
    G.sickNext = true;
    goAway('taken', G.t + irand(150, 200));
    echo('abduct', { x: PLAYER.x, z: PLAYER.z, quiet: true });
    opDone('abduct');
  }, 6600);
}
function lodgeTick() {
  if (G.faction !== 'lizards' || !alive().length) return;
  const P = PLAYER,
    away = !inRoomSet(P, (r) => r.home);
  if (G.skimAt && G.t >= G.skimAt) {
    G.skimAt = 0;
    if (away) {
      const m = pick(alive()); // in your flat while you were out: nothing missing that you can name
      G.skims = (G.skims || 0) + 1;
      if (m && m.onMap && !m.trueForm) {
        hardReset(m);
        enqueue(m, [goAct([12, 24], { label: '…' }), waitAct({ dur: 4, anim: 'stare' })]);
      }
      opDone('skim');
      echo('skim', { who: m ? m.id : null, x: 12, z: 21, seen: ['agnes'], quiet: true });
    }
  }
  if (!G.skimAt) G.skimAt = G.t + rand(2, 4) * 1440 + rand(0, 600);
  // complaints to Hale from the Bought (stage 4): your bar takes the hit
  if (G.stage >= 4 && inShift() && G.t >= (G.complainAt || 0)) {
    G.complainAt = G.t + rand(1.5, 3) * 1440;
    const who = pick(suspects().filter((s) => bought(s) && !s.gone));
    if (!who) return;
    workHit(15);
    ui.note('work', 'Hale got a complaint about you', 'bad');
    echo('complaint', { who: who.id, x: 4, z: 4, seen: ['hale'], quiet: true });
  }
  // Hale on the take shaves your bar
  if (bought(NPC.hale) && inShift() && G.shaveDay !== dayNo() && tod() >= 11 * 60) {
    G.shaveDay = dayNo();
    const v = bought(NPC.hale) > 1 ? 15 : 8;
    G.workBar = Math.max(1, G.workBar - v);
    if (NPC.hale.onMap) ui.say(NPC.hale, pick(['Sloppy work.', 'I’ll be watching you.', 'This isn’t good enough.']), 3);
  }
}
function destroyTick() {
  lodgeTick();
  if (G.filesAt && G.t >= G.filesAt) {
    G.filesAt = 0;
    if (!inShift()) return;
    workHit(40);
    ui.note('work', 'Your files are gone', 'bad');
    audio.sting('awkward');
    const m = alive().find((n) => temper(n) === 'aggressive');
    echo('files', { who: m ? m.id : null, x: 9, z: 9 });
  }
  // careful members clean up what THEY left, unless you bagged it
  for (const it of G.items.slice())
    if (it.cleanAt && G.t >= it.cleanAt) {
      removeItem(it);
      echo('cleanup', { who: it.by, x: it.x, z: it.z });
    }
}

// ───────────── Protect (70): police holds through an officer THEY own, and the night ambush
// after a confront or a fight with witnesses, an officer comes within the hour
function protectAfter(n) {
  if (G.aware < 70 || G.policeAt || G.away || !alive().some((m) => temper(m) === 'aggressive')) return;
  G.policeAt = G.t + rand(15, 60);
}
function policeTick() {
  const P = PLAYER,
    off = NPC.officer;
  if (!G.policeAt || G.t < G.policeAt || !off || ARREST.on) return;
  if (!P.onMap || off.onMap) {
    if (!P.onMap) G.policeAt = 0;
    return;
  }
  G.policeAt = 0;
  const side = P.x < W / 2 ? 'W' : 'E',
    [x, z] = EDGES[side][P.z < 15.5 ? 0 : 1];
  placeChar(off, x, z);
  off.onMap = true;
  off.queue = [];
  off.shown = 0;
  off.spd = 1;
  enqueue(off, [
    chaseAct(P, {
      label: 'Officer',
      walk: true,
      giveUp: 90,
      reach: 1.5,
      quit: () => !P.onMap || G.away,
      onCatch: (c) => {
        ui.say(c, 'You. Come with me.', 3);
        arrestStart(c);
      },
      onLose: () => {},
    }),
    goAct([x, z], { label: 'Leaving' }),
  ]);
}
function heldUntil() {
  const h = hourF(),
    d = dayNo();
  return h >= 6 && h < 12 ? (d - 1) * 1440 + 12 * 60 : (h >= 12 ? d : d - 1) * 1440 + 6 * 60;
}
function arrest() {
  // no street to do it on: straight inside
  addStress(8);
  echo('police', { x: PLAYER.x, z: PLAYER.z });
  audio.sting('caught');
  goAway('held', heldUntil());
}
