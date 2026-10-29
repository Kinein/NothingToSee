//@ them/tells — Tells: the small signs THEY give
//@ Defines: npcSeesPlayer, roomHasOthers, tryTell, beginTell, notifyPing, endTell, tellTick, applyTellAnim, awardTell, caughtWatching, ritualCaught, revealFaction
//@ Uses:    sim/core, core/util, town/cast, world/grid, ui/interface, town/npc-update, audio/sound, world/objects, sim/actions, player/needs, …
//@ (header made by tools/map.js; stripped by build.py)
// ───────────── the tells
function npcSeesPlayer(n, maxD = 9) {
  const P = PLAYER;
  if (!P.onMap || !n.onMap || n.pose === 'lie' || (n.queue[0] && n.queue[0].anim === 'sleep')) return false;
  const dx = P.x - n.x,
    dz = P.z - n.z,
    d = Math.hypot(dx, dz);
  // you're easy to notice: in a hedge with your trousers down, or smelling of your own accident
  const pee = P.queue[0] && P.queue[0].pee && P.queue[0].stage === 'run';
  if (pee) maxD *= BLADDER.peeSeen;
  else if (G.smelly) maxD *= BLADDER.smell;
  if (d > maxD) return false;
  if (pee && d < 4 && losClear(Math.floor(n.x), Math.floor(n.z), Math.floor(P.x), Math.floor(P.z))) return true;
  const rn = roomAt(n.x, n.z),
    rp = roomAt(P.x, P.z);
  if (rn && rn === rp && rn.private) return true;
  if (!losClear(Math.floor(n.x), Math.floor(n.z), Math.floor(P.x), Math.floor(P.z))) return false;
  const facing = Math.abs(angDiff(n.dir, Math.atan2(dx, dz))) < 1.9 || d < 1.6;
  const lit = lumAt(P.x, P.z) >= 0.12 || d < 2.6;
  return facing && lit;
}
function roomHasOthers(room, n) {
  return CHARS.some((o) => o !== n && o.onMap && !o.isPlayer && roomAt(o.x, o.z) === room);
}
function tryTell(n, b) {
  const room = roomAt(n.x, n.z),
    bld = room && room.bld;
  const F = G.faction,
    spots = [];
  if (bld === 'office' || b.a === 'work' || b.a === 'lunch') {
    spots.push(
      { obj: OBJ_BY_ID.wcOffice, room: 'wc' },
      { at: [14, 3], room: 'closet' },
      { at: [13, 4], room: 'closet' },
    );
    if (F === 'lizards')
      spots.push(
        { obj: objOfType('radiator', (o) => o.x === 22), room: 'break', type: 'bask' },
        { obj: objOfType('radiator', (o) => o.x === 2), room: 'boss', type: 'bask', boss: 1 },
      );
    if (F === 'zombies') spots.push({ obj: objOfType('fridge_office'), room: 'break', type: 'feed' });
    if (F === 'aliens') spots.push({ obj: objOfType('serverrack'), room: 'closet', type: 'speak' });
  } else if (b.a === 'courier')
    spots.push({ at: [27, 4], out: true }, { at: [28, 10], out: true }, { at: [41, 10], room: 'store' });
  else if (n.id === 'vic' && b.a === 'clerk')
    spots.push({ at: [41, 9], room: 'store' }, { at: [40, 10], room: 'store' });
  else if (n.id === 'agnes' && room && room.agnes) {
    spots.push({ at: [21, 22], room: 'agnes' }, { obj: OBJ_BY_ID.wcAgnes, room: 'agnesbath' });
    if (F === 'lizards') spots.push({ obj: OBJ_BY_ID.agnesRad, room: 'agnes', type: 'bask' });
    if (F === 'zombies') spots.push({ obj: OBJ_BY_ID.agnesFridge, room: 'agnes', type: 'feed' });
  } else if (HOUSE_OF[n.id] && room && room.house === n.id) {
    const h = HOUSE_OF[n.id];
    spots.push({ at: [h.x0 + 2, h.row === 'N' ? 6 : 24], room: h.key }, { at: h.window, room: h.key });
    if (F === 'lizards') spots.push({ obj: OBJ_BY_ID['rad_' + n.id], room: h.key, type: 'bask' });
  } else return false;
  if (F === 'lizards' && G.stage >= 4 && (bld === 'office' || b.a === 'work'))
    spots.push({ obj: objOfType('radiator', (o) => o.x === 22), room: 'break', type: 'bask', open: 1 });
  const lonely = (s) =>
    s.out
      ? !CHARS.some((o) => o !== n && o.onMap && !o.isPlayer && Math.hypot(o.x - s.at[0], o.z - s.at[1]) < 7)
      : !roomHasOthers(roomByKey(s.room), n);
  const ok = spots.filter(
    (s) =>
      (s.at || s.obj) &&
      (!s.boss || n.id === 'hale') &&
      (s.open || lonely(s)) &&
      (!s.obj || !objSlots(s.obj).every((sl) => s.obj.users[sl.k])),
  );
  if (!ok.length) {
    n.urge = n.urgeTh * 0.8;
    return false;
  }
  const s = pick(ok);
  const opts = {
    label: '…',
    dur: rand(7, 12),
    anim: 'stare',
    maxWait: 4,
    onStart: (c, a) => beginTell(c, a, s.type),
    onEnd: (c, a, ok2) => {
      if (c.tell) endTell(c, ok2);
    },
  };
  if (s.obj) {
    if (s.obj.type === 'toilet') {
      goToilet(n, s.obj);
      return true;
    }
    enqueue(n, useAct(n, s.obj, opts));
  } else enqueue(n, [goAct(s.at), waitAct(opts)]);
  return true;
}
function beginTell(n, a, typeHint) {
  if (watchedNow(n) && !atHome(n)) {
    a.dur = Math.min(a.dur || 1, 1);
    n.urge = n.urgeTh * 0.6;
    return;
  } // doubted in public: the whole town is watching it today
  if (!theyStir() && darkNow()) {
    a.dur = Math.min(a.dur || 1, 1);
    n.urge = n.urgeTh * 0.6;
    return;
  } // the first night: nothing
  if (npcSeesPlayer(n, 11)) {
    a.dur = 1;
    n.urge = n.urgeTh * 0.75;
    ui.bubble(n, 'dots', 'speech', 2);
    return;
  }
  const F = FACTIONS[G.faction];
  let type = typeHint || pick(F.tells.filter((t) => t !== 'bask' && t !== 'feed'));
  if (!typeHint && type === 'shed' && n.pose === 'sit') type = 'tongue';
  n.tell = { type, t: 0, w: 0, awarded: false, caught: false, room: roomAt(n.x, n.z), dur: a.dur };
  if (type === 'shed' && n.pose !== 'sit') n.pose = 'crouch';
  n.danger = Math.min(100, n.danger + 5);
  // from close by and out of sight you always hear it: sneak up, peek through a door left ajar
  if (visAt(n.x, n.z) < 0.4 && slipHeard(n.x, n.z)) notifyPing(n.x, n.z);
}
function notifyPing(x, z) {
  ui.ping(x, z);
  const [sx] = project(x, 1, z);
  audio.ping(
    clamp((sx / Math.max(1, window.innerWidth)) * 2 - 1, -1, 1),
    clamp(1 - Math.hypot(PLAYER.x - x, PLAYER.z - z) / 18, 0.2, 1),
  );
}
function endTell(n, ok) {
  const tl = n.tell;
  n.tell = null;
  if (n.fx) n.fx.prop = null;
  if (n.pose === 'crouch') n.pose = 'stand';
  n.urge = 0;
  n.urgeTh = rand(280, 500) * (0.8 + G.aware / 125);
  if (!tl || tl.caught || tl.ritual || tl.watch) return;
  const room = roomAt(n.x, n.z),
    care = clamp(1.2 - G.aware / 100, 0.25, 1.2);
  const drop =
    (tl.type === 'shed' && chance(0.9 * care)) ||
    (tl.type === 'limb' && chance(0.6 * care)) ||
    ((tl.type === 'hum' || tl.type === 'speak') && chance(0.35 * care));
  if (drop && room) {
    const spot = nearestWalkable(n.x + rand(-0.6, 0.6), n.z + rand(-0.6, 0.6), null, 2) || [
      Math.floor(n.x),
      Math.floor(n.z),
    ];
    addItem({
      kind: FACTIONS[G.faction].item,
      x: spot[0] + rand(0.3, 0.7),
      z: spot[1] + rand(0.3, 0.7),
      rot: rand(0, TAU),
      by: n.id,
      room: room.key,
      at: G.t,
      cleanAt: G.aware >= 50 && temper(n) === 'careful' ? G.t + rand(30, 90) : 0,
    });
  }
}
function tellTick(n, dt) {
  const tl = n.tell;
  tl.t += dt;
  if (tl.type === 'half') {
    // over in a blink: whoever saw it, saw it
    if (R.time > tl.t0r + tl.dur + 0.15) {
      n.tell = null;
      return;
    }
    const seen = visAt(n.x, n.z) > 0.55 && n.shown > 0.5;
    if (seen && !tl.seen) {
      tl.seen = true;
      psyMark('sign');
    }
    if (seen && !tl.caught && npcSeesPlayer(n, 8)) {
      tl.caught = true;
      addDanger(n, 8);
      n.pinnedDay = dayNo();
      ui.bubble(n, 'exclaim', 'speech', 1.6);
    }
    return;
  }
  if (!G.started || tl.unmask || tl.type === 'true') return;
  if (tl.type === 'glare' && !tl.watch) return;
  // what you see is only what you see: nothing is filed, nothing slows down. A photo is the only record.
  const seen = visAt(n.x, n.z) > 0.55 && n.shown > 0.5;
  if (seen) tl.w += dt;
  if (seen && tl.w > 0.8 && n.isThem) psyMark('sign'); // a slight sign, seen with your own eyes
  if (tl.watch) {
    if (seen && !tl.scared && tl.w > 1) {
      tl.scared = true;
      psyMark('sign');
      audio.sting('whisper');
    }
    n.odd = { k: 'watch', amt: 15, note: 'Standing in the road at night, staring at my window.', until: G.t + 2 };
    return;
  }
  if (tl.ritual) {
    if (seen && tl.w > 1.2 && !G.ritualSeenDay[dayNo()]) {
      G.ritualSeenDay[dayNo()] = true;
      psyMark('sign');
      audio.sting('whisper');
    } // watched: it spoils THEIR night, and tells you nothing
    if (!tl.caught && tl.t > 2 && npcSeesPlayer(n, 8)) {
      tl.spotT = (tl.spotT || 0) + dt;
      if (tl.spotT > 1.5 || Math.hypot(PLAYER.x - n.x, PLAYER.z - n.z) < 4) ritualCaught();
    } else if (tl.spotT) tl.spotT = Math.max(0, tl.spotT - dt);
    return;
  }
  if (!tl.caught && tl.t > 0.4 && npcSeesPlayer(n)) caughtWatching(n);
  if ((tl.type === 'speak' || tl.type === 'stare') && seen) {
    tl.bt = (tl.bt || 0) + dt;
    if (tl.bt > 1.4) {
      tl.bt = 0;
      ui.bubble(n, tl.type === 'speak' ? 'glyph' : 'dots', 'speech', 1.3);
    }
  }
}
function applyTellAnim(c, T, tl) {
  const F = FACTIONS[tl.fac || G.faction],
    fx = c.fx,
    t = c.animT;
  const k = tl.ritual ? 1 : clamp(tl.t / 0.6, 0, 1);
  const skinMix = (m) => (fx.skin = mix3(c.look.skinC, F.skin, m * k));
  switch (tl.type) {
    case 'hum':
      T.hp = -0.85;
      T.aoL = T.aoR = 0.45;
      T.uaL = T.uaR = -0.12;
      T.float = (0.28 + Math.sin(t * 2) * 0.05) * k;
      fx.eye = F.eye;
      skinMix(0.5 + 0.3 * Math.sin(t * 3));
      break;
    case 'speak':
      T.hp = Math.sin(t * 13) * 0.12;
      T.hr = Math.sin(t * 3.1) * 0.3;
      fx.eye = F.eye;
      skinMix(0.3);
      break;
    case 'flicker':
      if (Math.sin(t * 23) > 0.1) {
        skinMix(1);
        fx.eye = F.eye;
      }
      T.hr = Math.sin(t * 17) * 0.2;
      T.hy = Math.sin(t * 9) * 0.3;
      break;
    case 'tongue':
      fx.tongue = Math.pow(Math.max(0, Math.sin(t * 6)), 6) * k;
      fx.eye = F.eye;
      fx.slit = true;
      T.hp = -0.2;
      skinMix(0.25);
      break;
    case 'shed':
      T.uaL = -1.4;
      T.faL = -1.0 + Math.sin(t * 5) * 0.3;
      T.uaR = -0.9;
      T.faR = -1.2 + Math.sin(t * 4) * 0.3;
      T.hp = 0.35;
      skinMix(0.5 + 0.5 * Math.sin(t * 2));
      fx.slit = true;
      fx.eye = F.eye;
      break;
    case 'bask':
      T.aoL = T.aoR = 1.25;
      T.uaL = T.uaR = -0.25;
      T.hp = -0.5;
      fx.eye = F.eye;
      fx.slit = true;
      skinMix(0.7);
      break;
    case 'feed':
      fx.prop = 'meat';
      T.uaR = -0.5;
      T.faR = -2.05 + Math.max(0, Math.sin(t * 5)) * 0.45;
      T.uaL = -0.6;
      T.faL = -1.5;
      T.hp = 0.35;
      skinMix(0.8);
      break;
    case 'limb': {
      const ph = tl.dur ? tl.t / tl.dur : 0.5;
      fx.armOff = ph > 0.18 && ph < 0.72;
      T.torso = ph > 0.3 && ph < 0.7 ? 0.55 : 0.1;
      T.hp = 0.4;
      T.uaR = -0.9;
      skinMix(0.85);
      break;
    }
    case 'stare':
      T.hp = 0.42;
      T.hr = 0.38;
      T.roll = Math.sin(t * 0.9) * 0.07;
      T.uaL = T.uaR = 0.05;
      T.faL = T.faR = 0;
      skinMix(0.8);
      fx.eye = mul3(F.eye, 0.6);
      break;
    case 'glare':
      T.hp = 0;
      T.hy = 0;
      T.uaL = T.uaR = 0;
      fx.eye = F.eye;
      fx.slit = !!F.slit;
      skinMix(0.35);
      break;
    case 'half': {
      // a second or two of IT, showing through
      const hk = halfK(tl),
        hfac = tl.fac || G.faction,
        pr = tl.parts || [];
      fx.half = hk > 0.02 ? { fac: hfac, parts: pr, side: tl.side || 1, k: hk } : null;
      {
        // the body holds still against it, the way you would: a catch of breath, the head dipping a little away, a shiver; a small shake as it goes back
        const hp0 = tl.t0r != null ? clamp((R.time - tl.t0r) / (tl.dur || 1), 0, 1) : 0.5,
          on = sstep(0, 0.12, hp0) * (1 - sstep(0.8, 1, hp0)),
          sd = tl.side || 1;
        const snap = bell(hp0, 0, 0.2, 0.05),
          shake = bell(hp0, 0.8, 1, 0.05);
        const face = pr.some(
          (q) =>
            q === 'eye' ||
            q === 'face' ||
            q === 'snout' ||
            q === 'jaw' ||
            q === 'veins' ||
            q === 'skull' ||
            q === 'frill',
        );
        if (face) {
          T.hy = lerp(T.hy, sd * 0.18, on * 0.7);
          T.hp -= 0.16 * on;
        } // chin up, a breath in
        T.hr += Math.sin(t * 29) * 0.03 * hk - sd * 0.1 * snap;
        T.hp -= 0.08 * snap;
        T.hy += Math.sin(t * 31) * 0.2 * shake;
        T.torso += 0.06 * on;
        T.roll = Math.sin(t * 23) * 0.012 * hk;
        const arm = (s, ua, fa, ao, w) => {
          if (s > 0) {
            T.uaL = lerp(T.uaL, ua, w);
            T.faL = lerp(T.faL, fa, w);
            T.aoL = lerp(T.aoL, ao, w);
          } else {
            T.uaR = lerp(T.uaR, ua, w);
            T.faR = lerp(T.faR, fa, w);
            T.aoR = lerp(T.aoR, ao, w);
          }
        };
        if (pr.includes('ribs')) {
          T.hp = lerp(T.hp, 0.42, on);
          T.hy = lerp(T.hy, sd * 0.25, on);
          arm(sd, -0.15, -0.35, 0.28, on);
        } // looking down at it, the arm lifted off it
        if (pr.includes('hand') || pr.includes('arm')) {
          arm(sd, -0.5, -1.0, 0.1, on);
          T.hy = lerp(T.hy, sd * 0.42, on);
          T.hp = lerp(T.hp, 0.5, on);
        } // the hand comes up a little, and they look at it
        if (pr.includes('tail')) {
          T.torso += 0.05 * on;
          T.hp += 0.08 * on;
        }
      }
      break;
    }
    case 'true': {
      // the disguise drops: the tell pushed all the way
      const kk = clamp(tl.t / (TF_CHANGE * 0.6), 0, 1),
        fac = tl.fac || G.faction,
        CF = CREATURE[fac];
      fx.cloak = kk;
      fx.cfac = fac;
      fx.big = 1 + 0.2 * kk;
      fx.skin = mix3(c.look.skinC, CF.skin, kk);
      fx.eye = F.eye;
      if (kk < 1) {
        T.roll = Math.sin(t * 29) * 0.06;
        T.hp = 0.5;
        T.uaL = T.uaR = -0.4;
        break;
      }
      if (c.moving) {
        T.torso = fac === 'lizards' ? 0.55 : 0.25;
        T.hp = fac === 'lizards' ? -0.3 : 0.1;
        if (fac === 'lizards') fx.tongue = Math.pow(Math.max(0, Math.sin(t * 7)), 6);
        if (fac === 'zombies') {
          T.uaL = T.uaR = -1.4;
          T.faL = T.faR = 0;
        }
        break;
      }
      if (fac === 'aliens') {
        T.float = 0.3 + Math.sin(t * 2) * 0.05;
        T.aoL = T.aoR = 0.5;
        T.uaL = T.uaR = -0.2;
        T.hp = -0.3;
        if (tl.aim) {
          T.uaR = -1.55;
          T.faR = 0;
        }
      } else if (fac === 'lizards') {
        T.rootY = -0.25;
        T.thL = T.thR = -0.9;
        T.shL = T.shR = 1.3;
        T.torso = 0.6;
        T.hp = -0.45;
        T.uaL = T.uaR = -1.1;
        T.faL = T.faR = -0.4;
        fx.tongue = Math.pow(Math.max(0, Math.sin(t * 6)), 6);
      } else {
        // the dead, standing: never quite still. The weight rocks foot to foot, the arms drift, and now and then the head snaps round
        const snap = Math.pow(Math.max(0, Math.sin(t * 0.73 + 1.3)), 24);
        T.hp = 0.5 + Math.sin(t * 0.6) * 0.08;
        T.hr = 0.4 * Math.cos(t * 0.45);
        T.hy = Math.sin(t * 0.37) * 0.3 + snap * 0.55;
        T.roll = Math.sin(t * 1.1) * 0.13;
        T.torso = 0.12 + Math.sin(t * 1.1) * 0.05;
        T.uaL = -1.5 + Math.sin(t * 1.3) * 0.16;
        T.uaR = -1.4 + Math.sin(t * 1.3 + 2) * 0.16;
        T.faL = T.faR = 0;
        fx.armOff = Math.sin(t * 0.7) > 0.4;
      }
      if (tl.lunge) {
        T.torso = 0.7;
        T.uaL = T.uaR = -1.6;
      }
      if (tl.down) {
        T.pitch = -Math.PI / 2;
        T.rootY = 0.14;
        T.float = 0;
      }
      break;
    }
  }
  if (F.slit && fx.eye) fx.slit = true;
}
// a tell caught on film: a card in your hand. The body slipping is Body, THEIR business at THEIR spot is Habit.
// Mid-change the face is still there: a clear Body card on whoever it is.
function awardTell(n) {
  const tl = n.tell;
  if (tl) tl.awarded = true;
  const type = tl ? tl.type : 'stare',
    change = type === 'true';
  psyMark(change ? 'form' : 'sign');
  if (!G.factionKnown) revealFaction();
  const where = placeName(n.x, n.z);
  const rec = change
    ? { type: 'true', how: 'photo', at: G.t, t: n.animT, pose: 'stand', tt: 2.2 }
    : {
        type,
        how: 'photo',
        at: G.t,
        t: n.animT,
        pose: n.pose,
        parts: tl && tl.parts,
        side: tl && tl.side,
        fac: tl && tl.fac,
      };
  const p = addProof({
    frame: TELL_FRAME[type] || 'body',
    true: n.id,
    pin: n.id,
    what: n.short + ' · ' + TELL_NOTE[type].replace(/\.$/, ''),
    where,
    rec,
    recWho: n.id,
  });
  n.clues.photo = (n.clues.photo || 0) + 1;
  addNote(n, 'Photo: ' + TELL_NOTE[type], { by: 'you' });
  proofCard(p);
  audio.sting('onto');
}
// THEY notice you watching. You learn nothing from it; THEY learn about you.
function caughtWatching(n) {
  const tl = n.tell;
  tl.caught = true;
  n.pinnedDay = dayNo();
  addSus(n, 10);
  ui.bubble(n, 'exclaim', 'speech', 3);
  const cur = n.queue[0];
  const app = cur && cur.app && cur.slot && !cur.slot.stand ? cur.app : null;
  hardReset(n);
  if (app) placeChar(n, app[0], app[1]);
  n.tell = { type: 'glare', t: 0, w: 0, caught: true };
  n.urge = 0;
  enqueue(
    n,
    waitAct({
      label: 'Watching you',
      dur: 3,
      anim: 'stare',
      onTick: (c) => (c.tdir = Math.atan2(PLAYER.x - c.x, PLAYER.z - c.z)),
      onEnd: (c) => {
        if (c.tell && c.tell.type === 'glare') c.tell = null;
        c.urge = 0;
      },
    }),
  );
  audio.sting('caught');
  addDanger(n, 20);
}
function ritualCaught() {
  for (const c of them())
    if (c.tell && c.tell.ritual) {
      c.tell.caught = true;
      ui.bubble(c, 'exclaim', 'speech', 3);
    }
  G.ritualBroke = dayNo();
  for (const c of them())
    if (c.tell && c.tell.ritual) {
      bookNight(c);
      addDanger(c, 15);
    }
  ui.note('eye', 'Every one of them turned to look at you', 'bad');
  audio.sting('caught');
}
function revealFaction() {
  G.factionKnown = true;
  ui.reveal(FACTIONS[G.faction]);
}
