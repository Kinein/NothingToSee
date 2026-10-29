//@ play/stashes — Stashes and rummaging: THEIR things, lookalikes, the fridge, taking and the place rule
//@ Defines: SHAKE_TYPES, STASH_KINDS, FRIDGE_THEM, FRIDGE_PLAIN, PLANTS, junkIn, ownerOf, stashPool, placeOwner, placeLabel, makeStashes, frontOf, tamperSeen, RUMMAGE_FIND, RUMMAGE_DIG, rummageAct, …
//@ Uses:    sim/core, core/util, town/cast, ui/interface, world/objects, world/grid, town/suspicion, data/lines, play/verbs, play/photos, …
//@ (header made by tools/map.js; stripped by build.py)
// ───────────── stashes: what THEY keep inside ordinary things
// Shake a thing and you hear whether something's loose in it, never what. Open it up and you see. Only a photo
// of it counts, and it counts for less than a photo of one of THEM doing something. THEY tidy up after you,
// and every couple of days each of THEM moves their stash somewhere else, in broad daylight.
const SHAKE_TYPES = new Set([
  'microwave',
  'coffee',
  'printer',
  'vending',
  'watercooler',
  'fridge_office',
  'fridge',
  'stove',
  'phone',
  'payphone',
  'tv',
  'oldtv',
  'radio',
  'mailbox',
  'crates',
  'boxes',
  'metalshelf',
  'serverrack',
  'newsrack',
  'cooler',
  'trashcan',
  'dumpster',
  'desk',
  'bossdesk',
  'pcdesk',
  'bookshelf',
  'wardrobe',
  'nightstand',
  'counter',
  'shelf_groc',
  'shelf_house',
  'shelf_snack',
  'birdcage',
]);
// THEIR own things: one at each of THEIR places (it's them), and one in a shared place THEY come back for. Coloured by
// the faction's look (scales and gold; chrome and green light; rot and old newspaper), never by what they mean.
const STASH_KINDS = {
  lizards: [
    { k: 'skin', what: 'Shed skin', icon: 'bag', desc: 'a whole shed skin, folded in with the laundry' },
    { k: 'token', what: 'Brass tokens', icon: 'coin', desc: 'brass tokens, each stamped with scales' },
    { k: 'fish', what: 'A cooler of eaten fish', icon: 'bag', desc: 'a cooler of fish, eaten to the bones', stink: 1 },
  ],
  aliens: [
    { k: 'laser', what: 'A laser pistol', icon: 'glyph', desc: 'a pistol with no trigger, warm, a green light inside' },
    { k: 'gadget', what: 'A humming cylinder', icon: 'glyph', desc: 'a warm metal cylinder. It hums' },
    { k: 'chart', what: 'A star chart', icon: 'paper', desc: 'a star chart. Wexley circled' },
  ],
  zombies: [
    { k: 'obit', what: 'An obituary', icon: 'paper', desc: 'an obituary, decades old. The face in it is theirs' },
    { k: 'teeth', what: 'A jar of teeth', icon: 'bag', desc: 'a jam jar of teeth. Human ones' },
    { k: 'finger', what: 'Something in newspaper', icon: 'bag', desc: 'a finger, wrapped in old newspaper' },
  ],
};
// what's in THEIR fridge (the aliens' is empty and spotless: nothing to take)
const FRIDGE_THEM = {
  lizards: { k: 'fishes', what: 'A fridge of fish', icon: 'bag', desc: 'nothing but fish. Raw, to the top', fridge: 1 },
  zombies: { k: 'meat', what: 'Raw meat', icon: 'bag', desc: 'raw meat going off, and nothing else', fridge: 1 },
};
const FRIDGE_PLAIN = ['milk, eggs, half a cake', 'leftovers in tubs', 'beer and a sad lettuce', 'cheese, jam, a lemon'];
// THEIR plant: one object per faction, the same wherever it's found. At a human's place it means THEY got to them (the
// device: watched, maybe taken soon · the till cash: bought · the mark: bitten). In your own home it's aimed at you.
const PLANTS = {
  aliens: {
    k: 'device',
    what: 'A listening device',
    icon: 'glyph',
    desc: 'a listening device, no bigger than a button',
  },
  lizards: {
    k: 'till',
    what: 'Cash from Pell’s till',
    icon: 'coin',
    desc: 'cash from Pell’s till, scales on the band',
  },
  zombies: { k: 'mark', what: 'A mark on the door frame', icon: 'paper', desc: 'a mark scratched into the door frame' },
};
const stashDef = (st) =>
  st.plant
    ? PLANTS[G.faction]
    : st.innocent
      ? ODDITY_HOME[st.k] || ODDITY_HOME.envelope
      : st.fridge
        ? FRIDGE_THEM[G.faction]
        : (STASH_KINDS[G.faction] || STASH_KINDS.aliens).find((s) => s.k === st.k) || STASH_KINDS[G.faction][0];
// the look a thing is drawn in: a lookalike borrows the faction it looks like; the rest look like this week's THEM
const thingLook = (st) => (st.innocent && ODDITY_HOME[st.k] && ODDITY_HOME[st.k].look) || G.faction;
const stashIn = (o) => G.stashes && G.stashes.find((s) => s.obj === o.idx && !s.bagged);
// some things just rattle: a spoon down the back, coins in the works. It changes every few days.
function junkIn(o) {
  const h = hash2(o.idx, Math.floor(dayNo() / 3), 7);
  return h < 0.22 ? JUNK[Math.floor(hash2(o.idx, 3, Math.floor(dayNo() / 3)) * JUNK.length)] : null;
}
// whose place is this: a desk, a home, Agnes's flat, your flat, the shop's back room (Vic's). Nobody's: a shared place.
function ownerOf(o) {
  if (DESK_OWNER[o.id]) return DESK_OWNER[o.id];
  const r = roomAt(o.cx, o.cz);
  if (r && r.house) return r.house;
  if (r && r.agnes) return 'agnes';
  if (r && r.home) return 'you';
  if (r && (r.key === 'store' || (r.bld === 'shop' && ['crates', 'metalshelf', 'radio'].includes(o.type))))
    return 'vic';
  return null;
}
const shakeable = (o) => SHAKE_TYPES.has(o.type);
function stashPool(n) {
  const out = [],
    add = (o) => {
      if (o && SHAKE_TYPES.has(o.type) && !out.includes(o)) out.push(o);
    };
  const inOffice = (o) => {
    const r = roomAt(o.cx, o.cz);
    return !!(r && r.bld === 'office');
  };
  const k = n.def.plan;
  if (k === 'office' || k === 'boss') {
    for (const t of ['microwave', 'coffee', 'vending', 'printer', 'watercooler', 'fridge_office', 'serverrack'])
      add(objOfType(t, inOffice));
    add(OBJ_BY_ID.radioBreak);
    add(objOfType('metalshelf', (o) => o.x === 13));
    add(OBJ_BY_ID.breakBin);
    add(OBJ.find((o) => DESK_OWNER[o.id] === n.id));
  } else if (k === 'clerk') {
    add(objOfType('crates'));
    add(objOfType('metalshelf', (o) => o.x === 40));
    add(OBJ_BY_ID.radioStock);
    add(objOfType('newsrack'));
    add(objOfType('cooler'));
    add(objOfType('shelf_house'));
  } else if (k === 'courier') {
    add(objOfType('mailbox'));
    add(objOfType('payphone'));
    add(objOfType('newsrack'));
    add(OBJ_BY_ID.dumpster);
    add(objOfType('metalshelf', (o) => o.x === 13));
    add(objOfType('trashcan', (o) => o.id !== 'breakBin'));
    add(objOfType('crates'));
  } else if (k === 'agnes') {
    add(OBJ_BY_ID.radioAgnes);
    add(objOfType('birdcage'));
    add(objOfType('mailbox'));
    add(objOfType('oldtv'));
    add(objOfType('stove', (o) => o.x === 21));
  }
  if (HOUSE_OF[n.id]) add(OBJ_BY_ID['lamp_' + n.id]);
  return out;
}
// the place rule: a thing found at someone's place goes on their board. Off the floor, it's the room it lies in.
function placeOwner(x, z, o) {
  if (o) return ownerOf(o);
  const r = roomAt(x, z);
  if (r && r.house) return r.house;
  if (r && r.agnes) return 'agnes';
  if (r && r.home) return 'you';
  if (r && r.key === 'store') return 'vic';
  return null;
}
// where it was, in two words: "Earl’s desk", "Pell’s back room"
function placeLabel(id, o, x, z) {
  const n = NPC[id],
    r = o ? roomAt(o.cx, o.cz) : roomAt(x, z),
    nm = n ? n.short + '’s ' : '';
  if (o && DESK_OWNER[o.id]) return nm + 'desk';
  if (o && o.type === 'fridge') return nm + 'fridge';
  if (r && (r.key === 'store' || r.bld === 'shop')) return 'Pell’s back room';
  if (r && r.agnes) return 'Agnes’s flat';
  return nm + 'home';
}
function makeStashes() {
  G.stashes = [];
  G.stashId = G.stashId || 0;
  const kinds = shuffle(STASH_KINDS[G.faction].slice()),
    used = new Set();
  const put = (n, o, k, extra) => {
    used.add(o.idx);
    G.stashes.push(
      Object.assign(
        { id: ++G.stashId, by: n.id, obj: o.idx, k, out: false, moveAt: G.t + rand(0.6, 2.2) * 1440 },
        extra,
      ),
    );
  };
  them().forEach((n, i) => {
    const pool = stashPool(n).filter((o) => !used.has(o.idx) && o.type !== 'fridge');
    const own = pool.filter((o) => ownerOf(o) === n.id),
      shared = pool.filter((o) => !ownerOf(o));
    if (own.length) put(n, pick(own), kinds[i % kinds.length].k, { home: true, moveAt: 1e12 }); // it lives with them
    if (shared.length) put(n, pick(shared), kinds[(i + 1) % kinds.length].k); // THEY come back for this one
    const fr = fridgeOf(n);
    if (fr && FRIDGE_THEM[G.faction]) put(n, fr, FRIDGE_THEM[G.faction].k, { fridge: true, moveAt: 1e12 });
  });
}
const fridgeOf = (n) => OBJ_BY_ID['fridge_' + n.id] || (n.id === 'agnes' ? OBJ_BY_ID.agnesFridge : null);
// in front of a thing: where its insides end up when you take it apart
function frontOf(o) {
  const s = objSlots(o)[0],
    c = (s && s.cands.find(([x, z]) => walkable(x, z))) ||
      nearestWalkable(o.cx, o.cz, null, 2) || [Math.floor(o.cx), Math.floor(o.cz) + 1];
  const x = c[0] + 0.5,
    z = c[1] + 0.5,
    dx = o.cx - x,
    dz = o.cz - z,
    l = Math.hypot(dx, dz) || 1;
  return { x: x + (dx / l) * 0.28, z: z + (dz / l) * 0.28, ax: -dz / l, az: dx / l, rot: Math.atan2(dx, dz) };
}
// anyone who watches you shake or take apart something that isn't yours
function tamperSeen(o, a, k) {
  for (const n of CHARS) {
    if (n.isPlayer || !n.onMap || asleep(n) || n.trueForm || (a.seenBy && a.seenBy[n.id]) || !npcSeesPlayer(n, 9))
      continue;
    (a.seenBy = a.seenBy || {})[n.id] = 1;
    const own = ownerOf(o) === n.id,
      st = stashIn(o),
      mine = st && st.by === n.id;
    if (n.def.stranger) {
      if (k > 1) ui.bubble(n, 'question', 'speech', 2);
      continue;
    }
    if (n.exposed) continue;
    addSus(n, (own ? 2 : 1) * (k > 1 ? 11 : 3));
    if (k > 1 || own) {
      ui.bubble(n, 'exclaim', 'speech', 2.4);
      ui.say(
        n,
        own
          ? pick(['That’s MINE.', 'Hands off my things!', 'What are you doing with that?'])
          : pick(['What are you DOING?', 'You can’t just break that.', 'Hey! Put that back.']),
        2.6,
      );
    }
    if (mine) {
      addDanger(n, k > 1 ? 30 : 10);
      if (k > 1) bookNight(n);
    } // you, with your hands in THEIR stash
    else if (n.isThem) addDanger(n, k > 1 ? 6 : 2);
  }
}
// Rummage: hands in, feeling about. Something loose in there and your fingers find it: you stop, and the same key opens
// it up. Nothing, and that's all it was. The back shelves (the stockroom, the crates) sometimes give you something to keep.
const RUMMAGE_FIND = new Set(['metalshelf', 'crates']);
const RUMMAGE_DIG = new Set([
  'metalshelf',
  'crates',
  'boxes',
  'dumpster',
  'trashcan',
  'bookshelf',
  'wardrobe',
  'nightstand',
  'desk',
  'bossdesk',
  'pcdesk',
  'counter',
  'shelf_groc',
  'shelf_house',
  'shelf_snack',
  'cooler',
  'newsrack',
]);
function rummageAct(o) {
  return useP(o, 'Rummage', 'search', {
    dur: 4,
    anim: RUMMAGE_DIG.has(o.type) ? 'dig' : 'use',
    onStart: () => {
      const r = roomAt(o.cx, o.cz),
        v = NPC.vic;
      if (r && r.bld === 'shop' && v.onMap && npcSeesPlayer(v, 8) && !v.isPlayer) {
        addSus(v, 4);
        ui.say(v, 'Staff only.', 2.5);
      }
    },
    onTick: (c, a) => {
      tamperSeen(o, a, 1);
      if (o.type === 'fridge' || a.hit || a.t < a.dur * 0.45) return; // a fridge you just open and look in
      const st = stashIn(o),
        loose = (st && !st.out) || junkIn(o);
      if (!loose) return;
      a.hit = true;
      a.ok = true;
      a.stage = 'exit';
      a.t = 0; // your fingers close on it: stop right there
      o.data.rattle = 1;
      o.data.shakenUntil = G.t + CTRL.shakeHold;
      audio.blip('click');
      ui.bubble(c, 'exclaim', 'thought', 1.6);
      ui.note(
        'search',
        pick([
          'Something in there. Wedged in tight.',
          'Your fingers find something that shouldn’t be in there.',
          'Something loose, right at the back.',
        ]),
        'onto',
      );
    },
    onEnd: (c, a, ok) => {
      if (!ok || a.hit) return;
      if (o.type === 'fridge') return fridgeLook(o);
      o.data.rattle = -1;
      o.data.shakenUntil = G.t + CTRL.shakeHold;
      if (RUMMAGE_FIND.has(o.type)) return rummageResult(o);
      ui.note('search', 'Nothing. Just a ' + o.name.toLowerCase() + '.', '');
      searchedHome(o);
    },
  });
}
// the fridge: one more place to search. What's in it is a note under its owner; something odd in there you can take.
// A human's can look odd too: a broke person's is empty, someone who loves fish has a lot of it.
function fridgeLook(o) {
  const own = ownerOf(o),
    n = own && own !== 'you' ? NPC[own] : null,
    st = stashIn(o),
    S = st && stashDef(st);
  const what = S ? S.desc : n && n.isThem && G.faction === 'aliens' ? 'empty, and spotless' : pick(FRIDGE_PLAIN);
  ui.note('fridge', (n ? n.short + '’s fridge: ' : 'The fridge: ') + what, S ? 'onto' : '');
  if (n) noteOnce(n, 'Their fridge: ' + what + '.', { by: 'you' });
  if (st && !S.empty) openUp(o, true);
}
// taking a thing apart: slow, loud, and everyone who sees you remembers it
function pryAct(o) {
  const desk = o.type === 'desk' || o.type === 'bossdesk',
    mins = desk ? 5 : G.inv.crowbar ? 6 : 10;
  return useP(o, desk ? 'Go through it' : 'Open it up', desk ? 'search' : 'box', {
    dur: mins,
    anim: 'dig',
    long: true,
    check: () => (o.data.openUntil > G.t ? 'Already open' : null),
    onTick: (c, a, dt) => {
      a.st = (a.st || 0) + dt;
      if (a.st >= 0.5) {
        a.st = 0;
        tamperSeen(o, a, 2);
      }
    },
    onEnd: (c, a, ok) => {
      if (ok) openUp(o);
    },
  });
}
function openUp(o, quiet) {
  const f = frontOf(o),
    st = stashIn(o),
    desk = o.type === 'desk' || o.type === 'bossdesk';
  o.data.openUntil = G.t + 10 * 60;
  o.data.rattle = 0;
  o.data.shakenUntil = 0;
  addItem({
    kind: 'opened',
    x: f.x + f.ax * 0.3,
    z: f.z + f.az * 0.3,
    rot: f.rot,
    obj: o.idx,
    room: (roomAt(o.cx, o.cz) || {}).key || null,
    at: G.t,
  });
  if (st) {
    const S = stashDef(st);
    st.out = true;
    st.outAt = G.t;
    st.photo = false;
    st.rehideAt = G.t + rand(40, 150);
    st.trip = false;
    addItem({
      kind: 'stash',
      what: st.k,
      stash: st.id,
      x: f.x - f.ax * 0.12,
      z: f.z - f.az * 0.12,
      rot: f.rot + 0.4,
      by: st.by,
      innocent: st.innocent ? 1 : undefined,
      look: thingLook(st),
      obj: o.idx,
      room: (roomAt(o.cx, o.cz) || {}).key || null,
      at: G.t,
    });
    if (!quiet) ui.note('box', 'Inside: ' + S.desc + '.', 'onto');
    if (!st.innocent) psyMark('sign');
    audio.sting('whisper');
  } else {
    const j = junkIn(o);
    searchedHome(o);
    ui.note(
      'box',
      j
        ? 'Inside: ' + j + '.'
        : desk
          ? 'Drawers: ' + pick(SNOOP_MUNDANE).toLowerCase() + '.'
          : 'Nothing inside. Wires and dust.',
      '',
    );
  }
}
// put it all back the way it was: nobody needs to know you looked
function closeUp(o, quiet) {
  const st = G.stashes.find((s) => s.obj === o.idx && s.out);
  if (st) {
    st.out = false;
    st.trip = false;
  }
  for (const it of G.items.slice())
    if ((it.kind === 'opened' || it.kind === 'stash') && it.obj === o.idx) removeItem(it);
  o.data.openUntil = 0;
  if (!quiet) ui.note('box', 'Back together. Almost like you were never here.', '');
}
// you take it. At someone's place it goes on their board under Home, whoever's thing it really is; THEIR plant taken
// from a victim keeps THEM away from that person tonight. Nobody's place: a clue, and bait. The owner will miss it.
function takeStash(it) {
  const st = G.stashes.find((s) => s.id === it.stash);
  if (!st) return;
  const S = stashDef(st),
    o = OBJ[it.obj];
  st.bagged = true;
  st.out = false;
  st.lostAt = G.t;
  removeItem(it);
  if (!st.innocent) psyMark('sign');
  if (S.stink) {
    G.smelly = true; // take it and you stink
    setTimeout(() => !G.over && ui.note('shower', 'It reeks. So do you, now. Shower', 'warn'), 1600);
  }
  takeThing(
    {
      what: S.what,
      icon: S.icon,
      k: st.k,
      look: thingLook(st),
      by: st.by,
      innocent: st.innocent,
      plant: st.plant ? st.on : null,
    },
    o,
  );
}
// anything you take: a stash, or something off the floor. The card is on whoever's place it was.
function takeThing(T, o, x, z) {
  const own = T.place !== undefined ? T.place : placeOwner(x, z, o),
    n = own && own !== 'you' ? NPC[own] : null,
    where = n ? placeLabel(own, o, x, z) : o ? 'the ' + o.name.toLowerCase() : placeName(x, z);
  const card = {
    frame: 'home',
    src: 'item',
    k: T.k,
    icon: T.icon,
    what: T.what,
    where,
    true: T.by,
    innocent: T.innocent ? T.by : undefined,
    planted: T.plant || undefined,
    pr: { kind: 'item', what: T.what, icon: T.icon, look: T.look, place: o ? o.type : 'floor' },
  };
  if (n) {
    const p = addProof(Object.assign({ pin: n.id }, card));
    proofCard(p);
    (G.missing = G.missing || []).push({ id: n.id, at: G.t }); // they'll notice it's gone
    if (T.plant && n.id === T.plant) protectTonight(n);
    setTimeout(
      () => !G.over && ui.note('bag', T.what + ' · on ' + n.short + '’s board. Someone will miss it.', 'onto'),
      900,
    );
    return p;
  }
  // nobody's: not evidence. A clue (who was just in here?), and something for a trap.
  G.proofs.push(Object.assign({ id: ++G.proofId, at: G.t, pin: null, spare: true }, card));
  G.leads.push(T.what + ' in ' + where + ' · who was just in here?');
  if (G.leads.length > 6) G.leads.shift();
  ui.note('bag', T.what + ' · in your pocket. Nobody’s place: a clue, not evidence. Bait, maybe', 'onto');
  return null;
}
// THEIR plant, taken from the person THEY got to: none of THEM comes for them tonight (but on THEIR nights 4 and 5,
// hell is let loose and nothing keeps THEM away)
function protectTonight(n) {
  (G.safeNight = G.safeNight || {})[n.id] = tonightId();
}
// THEY come back for it: to put it away again, or to move it somewhere new. That trip is your best photo.
function stashTick() {
  if (!G.stashes || !G.started) return;
  arenaTalkTick();
  witnessTick();
  tailTick();
  for (const st of G.stashes) {
    const n = NPC[st.by];
    if (!n || n.slain || n.gone) continue;
    if (st.trip) {
      if (!n.queue.some((a) => a.stashTrip === st.id)) st.trip = false;
      else continue;
    }
    if (st.out && G.t - st.outAt > 9 * 60) {
      const o = OBJ[st.obj];
      if (o) closeUp(o, true);
      continue;
    } // nobody came: tidied up somehow
    if (st.bagged) {
      if (G.t - st.lostAt > 1.2 * 1440 && !G.traps.some((t) => t.bait === n.id)) {
        const pool = stashPool(n).filter((o) => !G.stashes.some((s) => s.obj === o.idx && !s.bagged));
        if (pool.length) {
          st.bagged = false;
          st.obj = pick(pool).idx;
          st.moveAt = G.t + rand(1.5, 2.5) * 1440;
        }
      }
      continue;
    }
    if (st.home || st.fridge || st.plant || st.innocent) continue; // nobody comes back for these: they live there
    if (!st.out && G.aware >= EVIDENCE.cleanAt && st.moveAt - G.t > 1440) st.moveAt = G.t + rand(0.4, 1) * 1440; // THEY know you: THEY move it more often
    const due = st.out ? G.t >= st.rehideAt : G.t >= st.moveAt;
    if (due) startStashTrip(n, st);
  }
}
function stashFree(n) {
  const b = curBlock(n),
    h = hourF();
  if (
    !n.onMap ||
    n.trueForm ||
    n.fleeing ||
    n.hideUntil ||
    n.engaged ||
    n.tell ||
    n.odd ||
    asleep(n) ||
    n.raiding ||
    n.under ||
    n.trapped
  )
    return false;
  if (['sleep', 'gather', 'watch', 'gone', 'off'].includes(b.a)) return false;
  if (watchedNow(n)) return false; // the town's eyes on it today
  if (!n.exposed && (h < 8 || h > 21.5)) return false;
  const cur = n.queue[0];
  return !cur || (cur.interruptible !== false && !cur.habit && cur.kind !== 'talk');
}
function startStashTrip(n, st) {
  if (!stashFree(n)) {
    if (st.out) st.rehideAt = G.t + rand(20, 60);
    else st.moveAt = G.t + rand(30, 90);
    return;
  }
  const o = OBJ[st.obj];
  if (!o) return;
  const S = stashDef(st),
    prop = st.k === 'gadget' || st.k === 'chips' ? 'phone' : st.k === 'cash' || st.k === 'token' ? 'cash' : 'paper';
  const odd = (c, where) =>
    (c.odd = {
      k: 'stash',
      amt: 30,
      note: 'Caught on film with a hand in the ' + where.name.toLowerCase() + ': ' + S.what.toLowerCase() + '.',
      until: G.t + 4.5,
      stash: st.id,
    });
  const pool = stashPool(n).filter((x) => x !== o && !G.stashes.some((s) => s !== st && s.obj === x.idx));
  const move = !st.out || chance(0.45);
  const dest = move && pool.length ? pick(pool) : o;
  for (const a of n.queue) a.cancel = true;
  st.trip = true;
  const take = useAct(n, o, {
    label: '…',
    anim: 'use',
    dur: 4,
    maxWait: 10,
    prop,
    stashTrip: st.id,
    onStart: (c, a) => {
      if (!c.exposed && lookAround(c)) {
        a.dur = 0.5;
        a.aborted = true;
        ui.bubble(c, 'dots', 'speech', 2);
        addDanger(c, 5);
        if (st.out) st.rehideAt = G.t + rand(60, 140);
        else st.moveAt = G.t + rand(120, 300);
        return;
      }
      odd(c, o);
      if (st.out) {
        c.danger = Math.min(100, c.danger + 15);
        book(c).night++;
      } // left open: someone's been at it
    },
    onEnd: (c, a, ok) => {
      if (!ok || a.aborted) {
        st.trip = false;
        for (const q of c.queue) if (q.stashTrip === st.id) q.cancel = true;
        return;
      }
      if (st.out) closeUp(o, true);
      if (dest === o) {
        st.trip = false;
        st.moveAt = G.t + rand(1.5, 2.5) * 1440;
        for (const q of c.queue) if (q.stashTrip === st.id) q.cancel = true;
        return;
      }
      st.obj = -1; // in their pocket, on the way
    },
  });
  const put = useAct(n, dest, {
    label: '…',
    anim: 'use',
    dur: 4,
    maxWait: 12,
    prop,
    stashTrip: st.id,
    onStart: (c) => odd(c, dest),
    onEnd: (c, a, ok) => {
      st.trip = false;
      st.obj = (ok ? dest : o).idx;
      st.moveAt = G.t + rand(1.5, 2.5) * 1440;
    },
  });
  enqueue(n, dest === o ? [take] : [take, put]);
}
// a photo of a thing is just a print: you take things, you photograph people
function photoStash(it) {
  const st = G.stashes.find((s) => s.id === it.stash);
  if (!st || it.photo) return false;
  it.photo = true;
  const S = stashDef(st);
  thingPrint(S.what, it);
  return true;
}
function thingPrint(what, it) {
  const pr = addPrint({ kind: 'item', what, icon: 'bag', where: placeName(it.x, it.z) });
  ui.card({ title: what, img: printImage(pr), stamp: 'PRINT' });
  setTimeout(() => !G.over && ui.note('bag', 'Take it to use as evidence', ''), 1200);
}
// a photo of one of THEM caught in the middle of something odd
// THEIR business, plainly: handing over an envelope, fetching a hidden thing, working THEIR gear
const ODD_BUSINESS = new Set(['stash', 'envelope', 'control', 'drain', 'lure', 'rack', 'copier', 'ledger', 'implant']);
function photoOdd(n) {
  const o = n.odd;
  o.photo = true;
  if (n.isThem) {
    const strong = ODD_BUSINESS.has(o.k);
    const p = addProof({
      frame: 'habit',
      true: n.id,
      pin: n.id,
      what: o.note.replace(/\.$/, ''),
      where: placeName(n.x, n.z),
      pr: { kind: 'plain', who: n.id, what: n.short, icon: 'people', t: n.animT },
    });
    addNote(n, 'Photo: ' + o.note, { by: 'you' });
    n.clues.photo = (n.clues.photo || 0) + 1;
    proofCard(p);
    bookPhoto(n);
    addDanger(n, strong ? 25 : 15);
    n.pinnedDay = dayNo();
    n.shotAt = G.t;
    if ((o.stash || strong) && !G.factionKnown) revealFaction();
    audio.sting('onto');
  } else addPrint({ kind: 'plain', who: n.id, what: n.short, icon: 'people', where: placeName(n.x, n.z), t: n.animT });
  if (o.control && G.control === o.control) catchControl(n, o.control);
}
// a search of someone's own things that turns up nothing: a note for you, and nothing more
function searchedHome(o) {
  const own = ownerOf(o),
    n = own && NPC[own];
  if (n && !n.isPlayer && !n.def.never)
    noteOnce(n, 'Searched their ' + o.name.toLowerCase() + ': nothing.', { by: 'you' });
}
