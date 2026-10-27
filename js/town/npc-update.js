//@ town/npc-update — Per-frame NPC update
//@ Defines: npcUpdate, theirThingsOnYou, placeAgnes, useAct, goAct, waitAct, randomTileIn, randomOutdoor, npcThink, goToilet, thinkWork, thinkLunch, thinkShop, thinkClerk, thinkHome, thinkHouse, …
//@ Uses:    core/util, sim/actions, sim/core, world/objects, town/cast, town/quirks, world/grid, town/daily-plans, ui/interface, them/tells, …
//@ (header made by tools/map.js; stripped by build.py)
// ───────────── per-frame NPC update
function npcUpdate(n, dt) {
  // let in through a door that isn't theirs for an encounter: the key goes once they're back out in the street
  if (n.encDoor && !(G.enc && G.enc.id === n.encDoor) && n.onMap && !roomAt(n.x, n.z)) { n.encDoor = 0; if (!n.raiding) n.breakIn = false; }
  if (n.def.stranger) { if (!n.onMap) return; stepChar(n, dt); if (!n.queue.length) n.onMap = false; return; }
  if (n.hideUntil && G.t >= n.hideUntil) { n.hideUntil = 0; n.danger = Math.max(dangerFloor(n), n.danger - 20); }
  if (n.hideUntil && !n.onMap) return;
  if (n.trueForm && n.onMap) { stepChar(n, dt); if (n.tell) n.tell.t += dt; if (n.trueForm) trueFormTick(n, dt); return; }
  if (!n.onMap) {
    const b = curBlock(n);
    if (b.a !== 'off' && b.a !== 'gone') {
      if (n.def.plan === 'agnes') { placeAgnes(n); return; }
      if (n.def.plan === 'lenny') { const o = OBJ_BY_ID.lennyBench; placeChar(n, o.x, o.z + 1); n.onMap = true; return; }
      if (HOUSE_OF[n.id] && !n.slain) { const h = HOUSE_OF[n.id]; placeChar(n, h.spot[0], h.spot[1]); n.onMap = true; n.queue = []; n.shown = 0; n.thinkCd = 0; n.prevRoom = roomAt(n.x, n.z); return; }
      spawnNPC(n, b);
    }
    return;
  }
  n.bladder -= (dt * (hasQ(n, 'loo') ? 30 : 7)) / 60;
  if (n.odd && G.t > n.odd.until) n.odd = null;
  if (n.exposed && !n.trueForm) exposedTick(n, dt);
  if (n.isThem && !n.tell && !n.exposed) n.urge += dt;
  if (n.isThem && !n.exposed) theirThingsOnYou(n, dt);
  if (n.wcCd > 0) n.wcCd -= dt;
  stepChar(n, dt);
  if (n.tell) tellTick(n, dt);
  if (n.secret) secretTick(n, dt);
  if (habitReady(n) && !n.fleeing && !n.hideUntil) { const cur = n.queue[0]; if (!cur) n.thinkCd = 0; else if (!cur.habit && !cur.cancel && cur.kind !== 'talk' && cur.label !== 'Toilet' && cur.interruptible !== false) cur.cancel = true; }
  n.thinkCd -= dt;
  if (!n.queue.length && !n.engaged && n.thinkCd <= 0) { npcThink(n); n.thinkCd = rand(0.4, 1.6); }
}
// you, walking about with something of THEIRS in your pocket: THEY can tell. It frays THEM, and the mask slips sooner.
function theirThingsOnYou(n, dt) {
  if (!PLAYER.onMap || G.away || !G.proofs.some((p) => p.src === 'item' && p.true === n.id) || !npcSeesPlayer(n, 6)) return;
  addDanger(n, 3 * dt);
  n.urge += dt * 2;
  if (G.t - (n.smellAt || -1e9) > 120) {
    n.smellAt = G.t; ui.bubble(n, 'frown', 'speech', 2.2);
    if (chance(0.6)) ui.say(n, pick(['What’s that in your pocket?', 'You have something of mine.', 'That isn’t yours.', 'Funny smell on you.']), 3);
  }
}
function placeAgnes(n) { placeChar(n, 18, 22); n.onMap = true; n.queue = []; n.shown = 0; }

function useAct(n, obj, o) { return mkAct(Object.assign({ kind: 'use', obj, anim: 'use', dur: 5 }, o)); }
function goAct(to, o) { return mkAct(Object.assign({ kind: 'go', to }, o)); }
function waitAct(o) { return mkAct(Object.assign({ kind: 'wait', anim: 'idle', dur: 5 }, o)); }
function randomTileIn(roomKey) { const r = roomByKey(roomKey); return pick(r.cells.filter(([x, z]) => walkable(x, z))); }
function randomOutdoor() {
  for (let k = 0; k < 40; k++) { const x = irand(26, 44), z = irand(20, 32); if (walkable(x, z) && isOutdoor(x, z)) return [x, z]; }
  return [33, 26];
}

function npcThink(n) {
  const b = curBlock(n);
  if (b.a === 'off' || b.a === 'gone') return leaveMap(n);
  if (habitReady(n)) return doHabit(n);
  const room = roomAt(n.x, n.z), bld = room && room.bld;
  if (n.bladder < 30 && !(n.wcCd > 0)) {
    const wc = bld === 'office' || b.a === 'work' ? OBJ_BY_ID.wcOffice : n.id === 'agnes' && room && room.agnes ? OBJ_BY_ID.wcAgnes : null;
    if (wc) return goToilet(n, wc);
  }
  if (n.isThem && !n.exposed && n.urge > n.urgeTh && b.a !== 'gather' && b.a !== 'watch' && !n.hideUntil && tryTell(n, b)) return;
  if (n.isThem && baitPull(n)) return;
  const sneaky = n.isThem && !n.exposed && b.a !== 'gather' && b.a !== 'watch' && b.a !== 'sleep' && !n.hideUntil;
  if (sneaky && tryScatter(n)) return;
  if (sneaky && theyStir() && tryBribe(n)) return;
  if (sneaky && theyStir() && tryControl(n)) return;
  if (n.isThem && G.faction === 'lizards' && theyStir() && b.a !== 'gather' && b.a !== 'sleep' && tryUnder(n)) return;
  switch (b.a) {
    case 'work': return thinkWork(n, b);
    case 'lunch': return thinkLunch(n, b);
    case 'shop': return thinkShop(n, b);
    case 'clerk': return thinkClerk(n, b);
    case 'home': return thinkHome(n, b);
    case 'sleep': { const bed = n.id === 'agnes' ? OBJ_BY_ID.agnesBed : OBJ_BY_ID['bed_' + n.id]; if (!bed) return leaveMap(n); return enqueue(n, useAct(n, bed, { label: 'Sleeping', anim: 'sleep', dur: null, until: blockOver(b), long: true, maxWait: 30 })); }
    case 'house': return thinkHouse(n, b);
    case 'park': {
      const bench = pick([OBJ_BY_ID.parkBench, OBJ_BY_ID.parkBench2].filter((o) => !objSlots(o).every((s) => o.users[s.k]))) || OBJ_BY_ID.parkBench;
      return enqueue(n, useAct(n, bench, { label: 'Sitting', anim: 'watch', dur: rand(40, 80), until: blockOver(b), maxWait: 6 }));
    }
    case 'lenny': {
      const night = hourF() >= 23 || hourF() < 7;
      return enqueue(n, useAct(n, OBJ_BY_ID.lennyBench, { prefer: 0, label: 'Sitting', anim: night ? 'sleep' : 'watch', dur: rand(30, 90), maxWait: 5 }));
    }
    case 'stroll': return thinkStroll(n, b);
    case 'courier': return thinkCourier(n, b);
    case 'prowl': return thinkProwl(n, b);
    case 'gather': return thinkGather(n, b);
    case 'watch': return thinkWatch(n, b);
  }
  enqueue(n, waitAct({ dur: 3 }));
}
function goToilet(n, wc) {
  const act = useAct(n, wc, { label: 'Toilet', anim: 'idle', dur: rand(5, 8), maxWait: 25,
    onStart: (c, a) => { if (c.isThem && c.urge > c.urgeTh * 0.45 && chance(0.85)) beginTell(c, a); },
    onEnd: (c, a, ok) => {
      if (ok) c.bladder = 100; if (c.tell) endTell(c, ok);
      if (ok && wc.id === 'wcOffice' && !(G.faction === 'aliens' && c.isThem)) enqueue(c, useAct(c, objOfType('sink', (o) => o.x === 11), { label: 'Washing', anim: 'use', dur: rand(1, 2), maxWait: 3 }), true);
    } });
  if (hasQ(n, 'loo')) tagQ(act, 'loo', { office: true });
  enqueue(n, act);
}
function thinkWork(n, b) {
  if (n.atDesk) {
    n.atDesk = false;
    const qa = chance(0.35) && quirkAct(n, 'work');
    if (qa) return enqueue(n, qa);
    const r = Math.random();
    if (n.id === 'hale' && r < 0.45) {
      return enqueue(n, [goAct([8, 10], { label: 'Walking the floor' }), waitAct({ dur: 4, anim: 'stare', onStart: (c) => { c.tdir = Math.atan2(7.5 - c.x, 9.5 - c.z); if (inShift() && !playerAtDesk()) { ui.bubble(c, 'question', 'speech', 3); G.haleSaw = true; } } })]);
    }
    if (r < 0.25) {
      const cup = useAct(n, OBJ_BY_ID.coffee, { label: 'Coffee', anim: 'drink', dur: rand(5, 8), maxWait: 6, prop: 'cup' });
      if (!(G.faction === 'aliens' && n.isThem && chance(0.6))) return enqueue(n, cup);
      return enqueue(n, [cup, goAct([12, 10], { label: '…' }), waitAct({ label: '…', dur: 3, anim: 'use', prop: 'cup', onStart: (c) => { c.tdir = Math.PI; c.odd = { k: 'coffee', amt: 12, note: 'Poured a full coffee into the plant. Didn’t drink a drop.', until: G.t + 3.2 }; } })]);
    }
    if (r < 0.42) {
      const cool = OBJ_BY_ID.cooler; const u = cool.users[0];
      if (u && u !== n && !u.isPlayer && !u.engaged) return enqueue(n, npcTalkAct(n, u, rand(4, 7)));
      return enqueue(n, useAct(n, cool, { label: 'Water', anim: 'drink', dur: rand(3, 6), maxWait: 4 }));
    }
    if (r < 0.62) {
      const others = suspects().filter((o) => o !== n && o.onMap && !o.engaged && o.queue[0] && o.queue[0].npcWork && o.queue[0].stage === 'run');
      const lodge = G.faction === 'lizards' && n.isThem ? others.filter((o) => o.isThem || G.bought[o.id]) : [];
      if (lodge.length && chance(0.75)) return enqueue(n, npcTalkAct(n, pick(lodge), rand(6, 12)));
      if (others.length) return enqueue(n, npcTalkAct(n, pick(others), rand(4, 8)));
    }
    if (r < 0.72) return enqueue(n, useAct(n, objOfType('printer'), { label: 'Printing', anim: 'use', dur: rand(2, 4), maxWait: 3 }));
    if (r < 0.8) {   // poking at the microwave, the radio, the vending machine: everybody fiddles
      const pool = [objOfType('microwave'), OBJ_BY_ID.radioBreak, objOfType('vending'), objOfType('metalshelf', (o) => o.x === 13), objOfType('serverrack'), objOfType('fridge_office')].filter(Boolean);
      return enqueue(n, useAct(n, pick(pool), { label: 'Fiddling', anim: 'use', dur: rand(2.5, 4.5), maxWait: 4 }));
    }
  }
  n.atDesk = true;
  enqueue(n, useAct(n, OBJ_BY_ID[n.def.chair], { label: 'Working', anim: 'type', dur: rand(25, 60), long: true, until: blockOver(b), npcWork: true, maxWait: 10 }));
}
function thinkLunch(n, b) {
  if (n.ate === b) return enqueue(n, waitAct({ dur: 4, anim: 'idle' }));
  n.ate = b;
  const chair = [OBJ_BY_ID.breakChairA, OBJ_BY_ID.breakChairB].find((c) => !objSlots(c).some((s) => c.users[s.k]));
  enqueue(n, [
    useAct(n, objOfType('fridge_office'), { label: 'Fridge', anim: 'use', dur: 2, maxWait: 6 }),
    chair ? useAct(n, chair, { label: 'Lunch', anim: 'eat', dur: rand(15, 25), until: blockOver(b), maxWait: 4 }) : waitAct({ label: 'Lunch', anim: 'eat', dur: 12 }),
  ]);
  if (G.faction === 'aliens' && n.isThem) enqueue(n, useAct(n, OBJ_BY_ID.breakBin, { label: 'Bin', anim: 'use', dur: 2.5, maxWait: 4, prop: 'plate', onStart: (c) => (c.odd = { k: 'bin', amt: 10, note: 'Tipped a whole lunch into the bin. Not one bite.', until: G.t + 2.7 }), onEnd: (c, a, ok) => { if (ok) { G.binFood.push({ by: c.id, t: G.t }); if (G.binFood.length > 6) G.binFood.shift(); } } }));
}
function thinkShop(n, b) {
  if (n.shopped === b) { const t = randomOutdoor(); return enqueue(n, [goAct(t), waitAct({ dur: rand(4, 10) })]); }
  n.shopped = b;
  const v = NPC.vic;
  if (n.exposed && n !== v && v.onMap && !v.isThem && curBlock(v).a === 'clerk') {   // Vic won't serve it
    return enqueue(n, [goAct([35, 13], { label: '…' }), waitAct({ dur: 3, anim: 'stare', onStart: (c) => { c.tdir = Math.PI; ui.say(v, pick(['Not in my shop. Not any more.', 'OUT. We’re closed. To you.']), 3); } }), goAct(randomOutdoor(), { label: '…' })]);
  }
  const shelf = pick([objOfType('shelf_groc'), objOfType('shelf_snack'), objOfType('cooler'), objOfType('shelf_house')]);
  enqueue(n, [useAct(n, shelf, { label: 'Browsing', anim: 'use', dur: rand(3, 7), maxWait: 5 }), useAct(n, OBJ_BY_ID.till, { label: 'Paying', anim: 'use', dur: 2, maxWait: 6 })]);
}
function thinkClerk(n, b) {
  const spot = [33, 11];
  const there = Math.floor(n.x) === spot[0] && Math.floor(n.z) === spot[1];
  if (there && chance(0.12)) { const qa = quirkAct(n, 'clerk'); if (qa) return enqueue(n, qa); }
  if (there && chance(0.15)) return enqueue(n, [goAct([41, 10], { label: 'Stockroom' }), waitAct({ dur: rand(4, 8), anim: 'use', onStart: (c) => (c.tdir = Math.PI / 2) })]);
  if (!there) return enqueue(n, goAct(spot, { label: 'To the till' }));
  enqueue(n, waitAct({ label: 'Till', dur: rand(20, 60), until: blockOver(b), anim: 'idle', onStart: (c) => (c.tdir = Math.PI), onTick: (c) => { const cust = OBJ_BY_ID.till.users.some((u) => u && u !== c); c.anim = cust ? 'use' : 'idle'; } }));
}
function thinkHome(n, b) {
  const qa = chance(0.35) && quirkAct(n, 'agnes');
  if (qa) return enqueue(n, qa);
  const r = Math.random();
  if (r < 0.5) return enqueue(n, useAct(n, OBJ_BY_ID.agnesChair, { label: 'Television', anim: 'watch', dur: rand(40, 90), until: blockOver(b) }));
  if (r < 0.75) return enqueue(n, useAct(n, objOfType('stove', (o) => o.x === 21), { label: 'Cooking', anim: 'cook', dur: rand(10, 18) }));
  if (r < 0.9) return enqueue(n, useAct(n, objOfType('birdcage'), { label: 'Cage', anim: 'talk', dur: rand(4, 8), onTick: (c, a, dt) => { a.bt = (a.bt || 0) + dt; if (a.bt > 2) { a.bt = 0; ui.bubble(c, pick(['heart', 'question', 'dots']), 'speech', 1.6); } } }));
  enqueue(n, [goAct(randomTileIn('agnes')), waitAct({ dur: rand(3, 8), anim: 'idle' })]);
}
// at home: the armchair, the window, the radiator, pacing about. Lights on.
function thinkHouse(n, b) {
  const h = HOUSE_OF[n.id]; if (!h) return leaveMap(n);
  const r = roomAt(n.x, n.z);
  if (!r || r.house !== n.id) return enqueue(n, goAct(h.spot, { label: 'Home' }));
  n.bladder = 100;
  if (tod() < 6 * 60 && hasQ(n, 'awake')) {   // up in the small hours, the light on: in the chair, or pacing
    const cells = r.cells.filter(([xx, zz]) => walkable(xx, zz, n));
    const acts = chance(0.5) ? useAct(n, OBJ_BY_ID['chair_' + n.id], { label: 'Sitting', anim: 'watch', dur: rand(15, 40), until: blockOver(b) }) : [goAct(pick(cells)), waitAct({ dur: rand(4, 10), anim: 'idle' })];
    return enqueue(n, tagQ(acts, 'awake', { window: true, lit: true }));
  }
  const qa = chance(0.4) && quirkAct(n, 'house');
  if (qa) return enqueue(n, qa);
  const x = Math.random();
  if (x < 0.45) return enqueue(n, useAct(n, OBJ_BY_ID['chair_' + n.id], { label: 'Sitting', anim: 'watch', dur: rand(30, 80), until: blockOver(b) }));
  if (x < 0.62) return enqueue(n, [goAct(h.window, { label: 'Window' }), waitAct({ dur: rand(3, 7), anim: 'idle', onStart: (c) => (c.tdir = h.row === 'N' ? 0 : Math.PI) })]);
  if (x < 0.75) return enqueue(n, useAct(n, OBJ_BY_ID['rad_' + n.id], { label: 'Warm', anim: 'warm', dur: rand(6, 14) }));
  const cells = r.cells.filter(([xx, zz]) => walkable(xx, zz, n));
  enqueue(n, [goAct(pick(cells)), waitAct({ dur: rand(4, 10), anim: 'idle' })]);
}
// out for a walk: along Main street or through the park, stopping for a word with a neighbour
function streetSpot() { for (let k = 0; k < 30; k++) { const x = irand(2, W - 3), z = chance(0.5) ? 13 : 18; if (walkable(x, z)) return [x, z]; } return [20, 18]; }
function thinkStroll(n, b) {
  if (hasQ(n, 'lamps') && chance(0.45)) { const qa = quirkAct(n, 'out'); if (qa) return enqueue(n, qa); }
  if (tod() < 6 * 60 && hasQ(n, 'night')) return enqueue(n, tagQ([goAct(chance(0.5) ? streetSpot() : randomOutdoor(), { label: 'Walking' }), waitAct({ dur: rand(2, 6), anim: 'idle' })], 'night'));
  if (chance(0.35)) {
    const o = CHARS.find((c) => c !== n && !c.isPlayer && c.onMap && !c.engaged && !c.def.stranger && !c.fleeing && !c.trueForm && !roomAt(c.x, c.z) && Math.hypot(c.x - n.x, c.z - n.z) < 8 && ['stroll', 'park', 'shop'].includes(curBlock(c).a));
    if (o) return enqueue(n, npcTalkAct(n, o, rand(4, 9)));
  }
  enqueue(n, [goAct(chance(0.6) ? streetSpot() : randomOutdoor(), { label: 'Walking' }), waitAct({ dur: rand(2, 7), anim: 'idle' })]);
}
// Ray's round: a stack of parcels from the office closet, then door to door until the stack is gone
const COURIER_STOPS = [
  (n) => useAct(n, OBJ_BY_ID.till, { label: 'Delivery', anim: 'use', dur: rand(2, 3), maxWait: 6 }),
  (n) => useAct(n, objOfType('mailbox'), { label: 'Post', anim: 'use', dur: rand(2, 4), maxWait: 6 }),
  (n) => useAct(n, objOfType('newsrack'), { label: 'Papers', anim: 'use', dur: 2, maxWait: 5 }),
  (n) => useAct(n, objOfType('payphone'), { label: 'Dispatch', anim: 'phone', dur: rand(2, 4), maxWait: 5 }),
  (n) => useAct(n, OBJ_BY_ID.deskBoss, { label: 'Delivery', anim: 'use', dur: 2, maxWait: 6 }),
  (n) => { const h = pick(HOUSE_DEFS.filter((x) => x.id !== n.id)); return [goAct(h.out, { label: 'Delivery' }), waitAct({ label: 'Knock', dur: rand(1.5, 3), anim: 'knock', onStart: (c) => (c.tdir = h.row === 'N' ? Math.PI : 0) })]; },
  (n) => [goAct([12, 22], { label: 'Delivery' }), waitAct({ label: 'Knock', dur: 1.5, anim: 'knock', onStart: (c) => (c.tdir = -Math.PI / 2) })],
];
function thinkCourier(n, b) {
  if (!n.bag) { n.bag = irand(2, 4); return enqueue(n, useAct(n, objOfType('metalshelf', (o) => o.x === 13), { label: 'Parcels', anim: 'use', dur: rand(2, 4), maxWait: 8 })); }
  n.bag--;
  if (chance(0.12)) { const qa = quirkAct(n, 'courier'); if (qa) return enqueue(n, qa); }
  if (chance(0.25)) {   // a word with whoever's about
    const o = CHARS.find((c) => c !== n && !c.isPlayer && c.onMap && !c.engaged && !c.def.stranger && !c.fleeing && !c.trueForm && !c.exposed && Math.hypot(c.x - n.x, c.z - n.z) < 7);
    if (o) enqueue(n, npcTalkAct(n, o, rand(3, 6)));
  }
  const s = pick(COURIER_STOPS)(n);
  enqueue(n, s);
}
// out at night with nothing left to hide: the alley, the park, Main street, and back
function thinkProwl(n, b) {
  const spots = [[27, 6], [27, 10], [35, 25], [41, 29], streetSpot(), streetSpot(), [12, 18]];
  enqueue(n, [goAct(pick(spots), { label: '…' }), waitAct({ dur: rand(2, 6), anim: 'stare' })]);
}
const atHome = (n) => { const r = n.onMap && roomAt(n.x, n.z); return !!(r && (r.house === n.id || (n.id === 'agnes' && r.agnes))); };
function thinkGather(n, b) {
  const idx = Math.max(0, G.them.indexOf(n.id));
  const spot = RITUAL.spots[idx % RITUAL.spots.length];
  enqueue(n, [goAct(spot, { label: 'Going out' }), waitAct({ label: '…', dur: null, until: blockOver(b), anim: 'stare',
    onStart: (c) => {
      c.tdir = Math.atan2(RITUAL.x - c.x, RITUAL.z - c.z);
      c.tell = { type: FACTIONS[G.faction].ritual, ritual: true, t: 0, w: 0 };
      if (G.started && visAt(c.x, c.z) < 0.4 && !G.pingRitual) { G.pingRitual = true; setTimeout(() => (G.pingRitual = false), 20000); if (heardIt('far', RITUAL.x, RITUAL.z)) notifyPing(RITUAL.x, RITUAL.z); }
    },
    onEnd: (c) => { c.tell = null; } })]);
}
function thinkWatch(n, b) {
  enqueue(n, [goAct(WATCH_SPOT, { label: 'Walking' }), waitAct({ label: 'Watching', dur: null, until: blockOver(b), anim: 'stare',
    onStart: (c) => { c.tdir = Math.atan2(8.5 - c.x, 19.5 - c.z); c.tell = { type: 'glare', watch: true, t: 0, w: 0 }; },
    onTick: (c) => { if (Math.hypot(PLAYER.x - c.x, PLAYER.z - c.z) < 4.5) { c.queue[0].cancel = true; overlay(c.plan, tod(), 360, 'off'); } },
    onEnd: (c) => { c.tell = null; } })]);
}
function npcTalkAct(n, other, dur) {
  return mkAct({ kind: 'talk', target: other, label: 'Chatting', anim: 'talk', dur, maxWait: 3,
    onTick: (c, a, dt) => {
      if (G.started && c.shown > 0.5 && other.shown > 0.5 && visAt(c.x, c.z) > 0.5 && !c.def.stranger && !other.def.stranger) { const k = [c.id, other.id].sort().join('|'); G.pairs[k] = (G.pairs[k] || 0) + dt; }
      if (!a.pairLogged && a.t > 2 && G.started && !c.def.stranger && !other.def.stranger && c.id !== 'lenny' && other.id !== 'lenny') { a.pairLogged = true; const [x, y] = c.id < other.id ? [c, other] : [other, c]; quirkSeen(x, 'pair', { other: y.id }); }
      overhear(c, other, a); a.bt = (a.bt || 0) + dt; if (a.bt > 1.8) { a.bt = 0; a.flip = !a.flip; ui.bubble(a.flip ? c : other, pick(TOPICS), 'speech', 1.6); } } });
}

// two people talking, and you close by: one line of it reaches you. Too close, and they hush.
// What carries is what they'd tell you themselves: what someone did, or THEIR lies. Two of THEM together let things slip.
function overhear(c, o, a) {
  if (a.heard || !G.started || a.t < 1.2 || c.def.stranger || o.def.stranger || c.trueForm || o.trueForm) return;
  const P = PLAYER; if (!P.onMap || G.sleeping || G.away || (G.overCd || 0) > G.t) return;
  const d = Math.min(Math.hypot(P.x - c.x, P.z - c.z), Math.hypot(P.x - o.x, P.z - o.z));
  if (d > 4.2 || roomAt(P.x, P.z) !== roomAt(c.x, c.z) || !youSee(c)) return;
  a.heard = true; G.overCd = G.t + 5;
  const sp = c.id === 'lenny' ? o : o.id === 'lenny' ? c : chance(0.5) ? c : o, ls = sp === c ? o : c;
  if (d < 1.5 && chance(sp.isThem ? 0.6 : 0.3)) { ui.bubble(sp, 'dots', 'speech', 2); addSus(sp, 3); if (sp.isThem) addDanger(sp, 3); return; }   // they've seen you listening
  let r;
  if (sp.isThem && ls.isThem) { const qs = G.quirks[sp.id] || []; r = { text: theyStir() || !qs.length ? slipLine(sp) : selfLine(sp, pick(qs)), self: true }; }
  else r = sp.isThem || misled(sp) || bought(sp) ? lieTalk(sp) : trueTalk(sp);
  if (!r || !r.text) return;
  ui.say(sp, r.text, 5);
  if (r.subj) { noteOnce(r.subj, '“' + r.text + '” Overheard.', { by: sp.id }); r.subj.clues.rumor++; }
  else if (r.self) noteOnce(sp, '“' + r.text + '” Overheard, to ' + ls.short + '.', { by: sp.id, quote: true });
  hear(null, r.text, sp.id);
}

