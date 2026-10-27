//@ them/true-form — True form: the change, then hunt or flee
//@ Defines: trueForm, trueFormTick, mayHuntYou, witnessTrue, youSeeTrue, addSighting, alibiTick, revert, exposeMember, killMember, exposedTick
//@ Uses:    sim/core, ui/interface, core/util, town/suspicion, sim/actions, town/cast, town/fleeing, gfx/portraits, town/npc-update, audio/sound, …
//@ (header made by tools/map.js; stripped by build.py)
// ───────────── true form: two game minutes to change, then it hunts you or runs
function trueForm(n, why, mode) {
  if (n.trueForm || n.slain || !n.onMap || G.over) return !!n.trueForm;
  if (!mayShed(n, why)) return false;   // not now, not here: the face stays on
  const P = PLAYER, alone = !bystanders(n).length;
  hardReset(n); n.engaged = null; n.fleeing = null; n.hideUntil = 0;
  n.trueForm = { t0: G.t, why, mode: mode || (alone || why === 'ambush' || n.exposed ? 'attack' : 'flee'), lastSeen: G.t, cd: 0, aim: 0, wits: {}, hp: FOE_HP[G.faction] || 3, long: n.exposed ? 25 : 0 };
  warmLater(() => { if (n.trueForm) snapImage(n, fightSnapRec(n)); });   // its picture for the fight panel, drawn before the fight needs it
  n.tell = { type: 'true', t: 0, w: 0, awarded: true, caught: true, fac: G.faction };
  if (!['raid', 'prowl', 'open', 'ambush', 'rite'].includes(why)) { n.danger = 100; n.dangerPeak = 100; }
  // only what you can see (or what's coming for you) stops the clock and sounds the sting: out of sight, it gives nothing away
  const inView = (P.onMap && Math.hypot(P.x - n.x, P.z - n.z) < 14 && visAt(n.x, n.z) > 0.3) || why === 'confront' || why === 'hit' || why === 'surrender';
  if ((inView || forYou(n, why)) && G.speed > 1) G.speed = 1;
  enqueue(n, waitAct({ label: '…', dur: TF_CHANGE, anim: 'stare', interruptible: false, onTick: (c) => (c.tdir = Math.atan2(PLAYER.x - c.x, PLAYER.z - c.z)) }));
  if (inView || forYou(n, why)) audio.sting('caught');
  return true;
}
function trueFormTick(n, dt) {
  const tf = n.trueForm, P = PLAYER, fac = G.faction, d = Math.hypot(P.x - n.x, P.z - n.z);
  tf.scan = (tf.scan || 0) - dt;
  if (tf.scan <= 0) {
    tf.scan = 0.5;
    const bs = bystanders(n).filter((w) => w.riteBy !== n.id);
    if (bs.length && n.tell.t < TF_CHANGE + 0.5) {   // somebody watched the face come off: they'll say so, with you in the room
      tf.witChange = true;
      for (const w of bs) if (!w.def.stranger) (w.sawChange || (w.sawChange = {}))[n.id] = G.t;
    }
    for (const w of bs) witnessTrue(w, n);
    if (P.onMap && visAt(n.x, n.z) > 0.5 && n.shown > 0.5) { tf.seenIn = G.t; if (!tf.seenByYou) youSeeTrue(n); }
  }
  if (tf.stunUntil) { if (G.t < tf.stunUntil) { n.path = null; n.moving = false; if (n.tell) n.tell.down = true; return; } tf.stunUntil = 0; if (n.tell) n.tell.down = false; }   // flat on the ground where you brought it down
  if (tf.mode === 'hold') return huntHoldTick(n, dt);
  if (tf.mode === 'escort') return fbiEscortTick(n, dt);
  // nothing out of its skin should stand frozen on a way out it can't take. A few minutes stuck: out of your sight,
  // the skin goes back on and it carries on as itself; in sight, it takes the nearest way off the street.
  if ((tf.mode === 'flee' || tf.mode === 'riteOut' || tf.mode === 'prowl') && n.tell && n.tell.t >= TF_CHANGE) {
    const a0 = n.queue[0], waiting = !!(a0 && a0.kind === 'wait');
    if (waiting || tf.wx == null || Math.hypot(n.x - tf.wx, n.z - tf.wz) > 0.05) { tf.wx = n.x; tf.wz = n.z; tf.stuck = 0; }
    else if ((tf.stuck = (tf.stuck || 0) + dt) > 5) {
      tf.stuck = 0; tf.wx = null;
      if (!(P.onMap && visAt(n.x, n.z) > 0.3 && n.shown > 0.3)) { hardReset(n); n.fleeing = null; n.poseFn = null; n.inRite = false; revert(n); n.thinkCd = 0; return; }
      n.breakIn = true; tf.mode = 'flee'; return flee(n, { to: { at: edgeFor(n, n.z), edge: true } });
    }
  }
  // days 2–4 the street never sees it: once it's out of a door and out of your sight, the skin goes back on
  if (!theyOut() && !n.exposed && !G.landing && !forYou(n, tf.why) && !['attack', 'surrender', 'trapped', 'rite'].includes(tf.mode) &&
      n.tell && n.tell.t >= TF_CHANGE && !roomAt(n.x, n.z) && !(visAt(n.x, n.z) > 0.3 && n.shown > 0.3)) {
    n.poseFn = null; n.inRite = false;
    if (n.raiding) { if (G.attack === n.raiding) G.attack = null; n.raiding = null; n.breakIn = false; }
    revert(n);
    return;
  }
  if (tf.mode === 'surrender') {   // on its knees, waiting for the grey cars
    n.path = null; n.moving = false; n.run = false;
    if (P.onMap) n.tdir = Math.atan2(P.x - n.x, P.z - n.z);
    if (n.tell) { n.tell.kneel = true; n.tell.lunge = n.tell.feed = n.tell.aim = false; }
    if (n.surrendered && G.t >= n.surrendered.takeAt - 6) fbiStart(n);   // the grey car is on its way down Main street
    if (n.surrendered && G.t >= n.surrendered.takeAt + 90 && !FBI.ops.some((o) => o.n === n)) fbiTake(n);   // nobody could come for it: it's gone all the same
    return;
  }
  if (tf.mode === 'trapped') {   // in the jaws: it thrashes, it can't leave, and in time it tears free
    n.path = null; n.moving = false; n.tdir = Math.atan2(P.x - n.x, P.z - n.z);
    if (n.tell.t >= TF_CHANGE) { n.tell.lunge = Math.sin(G.t * 2.3) > 0.4; n.tell.feed = !n.tell.lunge && Math.sin(G.t * 1.1) > 0.6; }
    const mob = bystanders(n, 9).filter((w) => tf.wits[w.id] && !w.fleeing && !w.def.stranger);
    if (mob.length >= 2 && hourF() > 6.5 && hourF() < 21.5) {
      tf.mobT = (tf.mobT || 0) + dt;
      if (tf.mobT > 1.5 && !tf.mobSaid) { tf.mobSaid = true; ui.say(mob[0], pick(['Get the shovels.', 'Everybody. NOW.', 'Don’t let it get loose!']), 3); }
      if (tf.mobT >= 5) { for (const w of mob) { w.tdir = Math.atan2(n.x - w.x, n.z - w.z); ui.bubble(w, 'fist', 'speech', 2.5); } return killMember(n, 'mob'); }
    }
    if (P.onMap && d < 1.5 && n.tell.t >= TF_CHANGE && !UI.fight && R.time > (UI.fightCd || 0)) return openFight(n);
    if (G.t >= tf.until) { n.trapped = false; n.tell.lunge = n.tell.feed = false; tf.mode = 'flee'; tf.until = 0; ui.bubble(n, 'exclaim', 'speech', 2); if (P.onMap && d < 20) ui.note('trap', 'It tore loose', 'bad'); return flee(n); }
    return;
  }
  if (n.tell.t < TF_CHANGE || n.queue.length && n.queue[0].label === '…') return;   // still changing
  if (tf.mode === 'rite' || tf.mode === 'riteOut') return riteTick(n, dt);
  if (tf.mode === 'raid') return raidTick(n, dt);
  if (tf.mode === 'prowl') {
    const P2 = PLAYER, d2 = Math.hypot(P2.x - n.x, P2.z - n.z);
    if (P2.onMap && d2 < 8 && seesSpot(n, P2.x, P2.z, 8) && (lumAt(P2.x, P2.z) >= 0.12 || d2 < 3)) {   // it noticed you
      if (mayHuntYou()) { tf.mode = 'attack'; tf.t0 = G.t; tf.lastSeen = G.t; hardReset(n); n.breakIn = false; if (G.speed > 1) G.speed = 1; audio.sting('caught'); return; }
      tf.mode = 'flee'; return flee(n);
    }
    if (!n.queue.length) { if (G.t - tf.t0 > (tf.long || 20)) { tf.mode = 'flee'; return flee(n); } enqueue(n, [goAct(tf.route ? pick(tf.route) : randomOutdoor(), { label: '…' }), waitAct({ dur: fac === 'zombies' ? rand(0.6, 1.6) : rand(2, 5), anim: 'stare' })]); }
    return;
  }
  if (tf.mode === 'flee') {
    if (!n.fleeing && !n.queue.length) flee(n);
    // aliens blink a few strides ahead when you're on their heels: a chase, not a vanishing act
    if (fac === 'aliens' && d < 3.5 && n.path && n.pi < n.path.length - 2 && G.t - (tf.blinkAt || -99) > 7) {
      tf.blinkAt = G.t; const k = Math.min(n.path.length - 1, n.pi + 4);
      n.x = n.path[k][0] + 0.5; n.z = n.path[k][1] + 0.5; n.pi = k + 1; R.flash = Math.max(R.flash, 0.3); audio.ping(0, 0.5);
    }
    return;
  }
  const sees = P.onMap && seesSpot(n, P.x, P.z, 14);
  if (sees || tf.raidYou) tf.lastSeen = G.t;   // inside your flat it knows where you are
  const home = inRoomSet(P, (r) => r.home) && !tf.raidYou;
  const crowd = !n.exposed && !tf.cornered && G.stage < 4 && (tf.wit || bystanders(n).length);
  if (!P.onMap || (home && !tf.cornered) || G.t - tf.lastSeen > 3 || (!tf.cornered && G.t - tf.t0 > (tf.long || 12)) || crowd) {   // you got away: behind your door, out of sight, or among people
    tf.mode = 'flee'; tf.aim = 0; n.tell.aim = false; UI.aim = null; n.path = null; return flee(n);
  }
  tf.cd -= dt;
  if (fac === 'aliens' && sees && d < (G.loose ? 11 : 9) && tf.cd <= 0) {   // the laser: a red dot first, so breaking line of sight saves you
    n.path = null; n.moving = false; n.tdir = Math.atan2(P.x - n.x, P.z - n.z);
    if (!tf.aim) { tf.aim = G.t; n.tell.aim = true; UI.aim = { c: n }; if (G.speed > 1) G.speed = 1; }
    else if (G.t - tf.aim >= (G.loose ? 2.3 : 3)) { tf.aim = 0; n.tell.aim = false; UI.aim = null; tf.cd = G.loose ? 3.8 : 6; fireBolt(n, HURT.laser); }   // the shot itself flies: step off its line
    return;
  }
  if (tf.aim) { tf.aim = 0; n.tell.aim = false; UI.aim = null; }
  if (fac === 'aliens' && d < 4.5 && (!tf.cornered || G.loose) && !tf.wounded && tf.cd > 2) { n.path = null; n.moving = false; n.tdir = Math.atan2(P.x - n.x, P.z - n.z); return; }   // it keeps its distance while the gun recharges; cornered or hurt, it comes at you
  if (d < 1.4) {   // on you: it's a fight now
    n.path = null; n.moving = false; n.tdir = Math.atan2(P.x - n.x, P.z - n.z);
    if (!UI.fight && R.time > (UI.fightCd || 0) && P.onMap) { tf.lunge = true; return openFight(n, true); }
    return;
  }
  tf.rp = (tf.rp || 0) - dt;
  if (tf.rp <= 0 || !n.path || n.pi >= n.path.length) { tf.rp = 0.5; const t = nearestWalkable(P.x, P.z, n, 2); if (t) setPath(n, t[0], t[1]); }
  n.run = true; n.spd = (fac === 'lizards' ? 1.2 : fac === 'aliens' ? 0.9 : 0.85) * (G.loose ? LOOSE_SPD[fac] || 1 : 1); followPath(n, dt);
}
// an ordinary person who sees it panics and runs, and stops thinking you're mad
// attacks on you are gated by both bars: awareness says THEY know you, progress says THEY no longer need to hide
function mayHuntYou() {
  const a = G.aware, s = G.stage;
  return s >= 5 || (s >= 4 && a >= 30) || (s >= 3 && a >= 50) || a >= 70;
}
function witnessTrue(w, n) {
  if ((w.def && w.def.fbi) || w.thrall) return;   // they've seen worse
  const tf = n.trueForm;
  if (tf.wits[w.id] || (n.raiding && n.raiding.target === w.id) || w.riteBy === n.id) return;
  tf.wits[w.id] = 1; tf.wit = true;
  if (!w.def.stranger) w.sus = Math.max(0, w.sus - 40);   // you weren't mad after all
  if (!tf.echoed) { tf.echoed = true; echo('trueform', { x: n.x, z: n.z, who: tf.witChange || n.exposed ? n.id : null, seen: [w.id] }); }
  // stuck in a trap, on its knees, or a monster everyone already knows: the brave stand their ground and shout it down
  const T = (G.traits[w.id] || {}).temper;
  if (tf.mode === 'trapped' || tf.mode === 'surrender' || (n.exposed && (T === 'aggressive' || w.id === 'lenny' || w.def.officer))) {
    hardReset(w); w.tdir = Math.atan2(n.x - w.x, n.z - w.z);
    ui.bubble(w, 'exclaim', 'speech', 3);
    ui.say(w, pick(tf.mode === 'trapped' ? ['It’s stuck! Get a shovel!', 'Don’t let it loose!', 'Hit it! HIT IT!'] : tf.mode === 'surrender' ? ['Don’t you MOVE.', 'Somebody call someone!', 'You were RIGHT.', 'I’m not looking away.'] : ['Get back, you THING!', 'Somebody get a rake!', 'Go on! Get OUT of here!']), 2.8);
    enqueue(w, waitAct({ label: '…', dur: 6, anim: 'stare', onTick: (c) => (c.tdir = Math.atan2(n.x - c.x, n.z - c.z)) }));
    return;
  }
  ui.bubble(w, 'exclaim', 'speech', 3); ui.say(w, pick(['WHAT IS THAT', 'Oh God. Oh God.', 'RUN!']), 2.5);
  if (w.id !== 'lenny' && !w.def.officer && !w.engaged) flee(w, { spd: 1 });
}
// you see it with your own eyes. Your body knows; the board doesn't, not without a photo.
function youSeeTrue(n) {
  const tf = n.trueForm; tf.seenByYou = true;
  addStress(tf.mode === 'rite' || tf.mode === 'riteOut' ? 8 : 12); G.visionOff = Math.max(G.visionOff, G.t + 120); G.shakenUntil = G.t + 120;
  if (n.tell.t < TF_CHANGE + 0.2) tf.sawChange = true;
  G.shakenFrom = G.t + Math.max(0, TF_CHANGE - n.tell.t);   // the hands only start shaking once it's done
  R.pulse = 1; audio.sting('caught');
}
// a dated card for every true form you see without seeing whose it is; alibis strike names off
function addSighting(n, where) {
  const sg = { id: ++G.sightId, t: G.t, where, who: n.id, until: G.t + 3, struck: {} };
  for (const s of suspects()) if (s !== n && s.seenAt != null && Math.abs(G.t - s.seenAt) <= 2) sg.struck[s.id] = 1;
  G.sightings.push(sg); if (G.sightings.length > 12) G.sightings.shift();
  if (n.trueForm) n.trueForm.sighting = sg;
  return sg;
}
function alibiTick(n) {
  for (const sg of G.sightings) if (G.t <= sg.until && sg.who !== n.id && !sg.struck[n.id] && NPC[sg.who] && NPC[sg.who].trueForm) sg.struck[n.id] = 1;
}
// back in human shape. If anyone watched the face come off, the whole town knows whose it was.
function revert(n) {
  const tf = n.trueForm; n.trueForm = null; n.tell = null; n.spd = 1; n.trapped = false;
  if (G.faction === 'lizards' && tf && (tf.mode === 'attack' || tf.seenByYou) && !tf.wit) for (const k in G.boughtBy) if (G.boughtBy[k] === n.id) buy(NPC[k], n.id, true);
  if (UI.aim && UI.aim.c === n) UI.aim = null;
  if (tf && tf.public && tf.witChange && !G.over && !n.exposed) exposeMember(n, 'seen');   // called out in front of people and got away: everyone knows. It hides at home now.
}
// unmasked: everybody knows. That isn't the end of it. It still lives here, it still goes out, and now it has nothing to hide.
function exposeMember(n, how) {
  if (n.exposed || n.slain) return;
  n.exposed = true; G.exposed.push(n.id);
  if (!G.factionKnown) revealFaction();
  if (G.faction === 'lizards' && G.stage < 4) unbuyBy(n.id);
  n.urge = 0; n.danger = 100; n.dangerPeak = 100; n.fleeing = null; n.hideUntil = 0;
  makePlan(n);
  bookRemoval();
  for (const o of suspects()) if (!o.isThem) o.sus = Math.max(0, o.sus - 25);   // they believe you now, a little
  const rec = { type: 'true', how: 'witness', at: G.t, t: n.animT, pose: 'stand' };
  n.snaps.push(rec); if (n.snaps.length > 4) n.snaps.shift();
  addNote(n, how === 'unmask' ? 'Unmasked in front of witnesses. It didn’t leave town.' : 'Changed in front of witnesses. Everybody knows now.', { by: 'you' });
  cardSoon({ char: n, stamp: 'UNMASKED', before: n.evidence, after: 100 }, () => snapImage(n, rec));
  n.evidence = 100;
  setTimeout(() => { if (!G.over) ui.note('confront', n.short + ' is unmasked. Still out there.', 'bad'); }, 2600);
  echo('exposed', { x: n.x, z: n.z, who: n.id });
  audio.sting('onto');
}
// put down for good: in a fight, in a trap, by a mob. Three of these and it's over.
function killMember(n, how) {
  if (n.slain) return;
  const tf = n.trueForm, wasKnown = n.exposed;
  hardReset(n); n.trueForm = null; n.trapped = false; n.fleeing = null; n.hideUntil = 0; n.raiding = null; n.breakIn = false;
  if (UI.aim && UI.aim.c === n) UI.aim = null;
  n.tell = { type: 'true', t: 9, w: 0, awarded: true, caught: true, fac: G.faction, down: true };
  n.slain = how || 'killed'; G.slain.push(n.id);
  if (!n.exposed) { n.exposed = true; G.exposed.push(n.id); }
  if (!G.factionKnown) revealFaction();
  if (G.faction === 'lizards') unbuyBy(n.id);
  G.stashes = (G.stashes || []).filter((st) => st.by !== n.id);
  for (const o of them()) if (!o.slain) o.danger = Math.max(o.danger, dangerFloor(o));
  makePlan(n);
  bookRemoval();
  const spot = [n.x, n.z];
  enqueue(n, waitAct({ label: 'Down', dur: 40, anim: 'stare', interruptible: false, onEnd: (c) => { c.tell = null; c.onMap = false; addItem({ kind: 'stain', x: spot[0], z: spot[1], rot: rand(0, TAU), by: null, room: (roomAt(spot[0], spot[1]) || {}).key || null, at: G.t }); } }));
  if (tf && tf.wits) for (const id of Object.keys(tf.wits)) if (NPC[id]) NPC[id].sus = 0;
  const rec = { type: 'true', how: 'witness', at: G.t, t: n.animT, pose: 'stand' };
  n.snaps.push(rec); if (n.snaps.length > 4) n.snaps.shift();
  addNote(n, how === 'mob' ? 'The town finished it in the trap. It was ' + n.short + '.' : 'Dead. ' + (wasKnown ? 'It won’t come back.' : 'It was ' + n.short + ' all along.'), { by: 'you' });
  cardSoon({ char: n, stamp: how === 'mob' ? 'FINISHED' : 'KILLED', before: n.evidence, after: 100 }, () => snapImage(n, rec));
  n.evidence = 100;
  addStress(how === 'mob' ? 3 : 6);
  echo('killed', { x: n.x, z: n.z, who: n.id });
  audio.sting('onto');
  if (!alive().length) { const g0 = G; G.endAt = { k: 'won', t: G.t + 8 }; setTimeout(() => { if (G === g0) gameOver('won'); }, 4500); }
}
// an unmasked one out and about: booed, shouted at, kept away from. And it remembers who did this to it.
function exposedTick(n, dt) {
  if (n.slain || !n.onMap || asleep(n) || n.under) return;
  n.booT = (n.booT || 0) + dt;
  if (n.booT < 1.2) return;
  n.booT = 0;
  const room = roomAt(n.x, n.z), home = !!(room && (room.house === n.id || (n.id === 'agnes' && room.agnes)));
  if (!home) {
    const ws = CHARS.filter((w) => w !== n && !w.isPlayer && !w.isThem && !w.def.fbi && !w.thrall && w.onMap && !asleep(w) && !w.trueForm && !w.fleeing && !w.engaged && seesSpot(w, n.x, n.z, 8) && G.t - (w.booAt || -99) > 25);
    if (ws.length) {
      const w = pick(ws), T = (G.traits[w.id] || {}).temper, d = Math.hypot(w.x - n.x, w.z - n.z);
      w.booAt = G.t; w.tdir = Math.atan2(n.x - w.x, n.z - w.z);
      if (w.def.stranger ? chance(0.5) : T === 'timid') { ui.say(w, pick(['Keep away from me!', 'Don’t come near me.', 'Oh no. Not you.']), 2.4); ui.bubble(w, 'frown', 'speech', 2); if (d < 4 && !w.def.officer) flee(w, { spd: 1 }); }
      else if (T === 'aggressive' || w.id === 'lenny' || w.def.officer) { ui.say(w, pick(['MONSTER!', 'Crawl back in your hole!', 'We know what you are!', 'Get off our street!']), 2.6); ui.bubble(w, 'exclaim', 'speech', 2); }
      else { ui.say(w, pick(['Boo! BOO!', 'Shame on you.', 'Look who’s out.', 'Freak.']), 2.4); ui.bubble(w, 'laugh', 'speech', 2); }
      if (chance(0.5)) { n.tdir = Math.atan2(w.x - n.x, w.z - n.z); setTimeout(() => { if (n.onMap && !n.trueForm) ui.say(n, pick(['Enjoy it while it lasts.', 'Soon.', 'I remember every face.', '…']), 2.4); }, 1300); }
    }
  }
  // you did this to it
  const P = PLAYER;
  if (!P.onMap || G.away || G.sleeping || UI.fight || inRoomSet(P, (r) => r.home) || G.t - (n.huntAt || -1e9) < 360) return;
  const d = Math.hypot(P.x - n.x, P.z - n.z);
  if (d > 10 || !seesSpot(n, P.x, P.z, 10)) return;
  const h = hourF(), night = h >= 21 || h < 5.5;
  const crowd = CHARS.some((w) => !w.isPlayer && !w.isThem && w.onMap && !asleep(w) && !w.fleeing && Math.hypot(w.x - P.x, w.z - P.z) < 9);
  if (night || !crowd || home) { n.huntAt = G.t; hardReset(n); ui.say(n, pick(['You.', 'There you are.', 'You did this to me.']), 2); trueForm(n, 'hunt', 'attack'); return; }
  if (G.t - (n.stalkAt || -1e9) > 240 && d < 7) {   // too many eyes: it follows you instead, close enough to smell
    n.stalkAt = G.t; hardReset(n);
    enqueue(n, chaseAct(P, { label: '…', walk: true, giveUp: 15, reach: 2.4,
      onCatch: (c) => { c.tdir = Math.atan2(P.x - c.x, P.z - c.z); ui.say(c, pick(['Not here. Not with all of them watching.', 'Later.', 'I know where you sleep.']), 3); addStress(5); },
      onLose: () => {} }));
  }
}
