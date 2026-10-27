//@ play/stashes — Stashes and rummaging
//@ Defines: SHAKE_TYPES, STASH_KINDS, BUG, junkIn, ownerOf, stashPool, makeStashes, frontOf, tamperSeen, RUMMAGE_FIND, RUMMAGE_DIG, rummageAct, pryAct, openUp, closeUp, takeStash, …
//@ Uses:    sim/core, core/util, town/cast, world/objects, ui/interface, town/suspicion, play/verbs, world/grid, them/proofs, play/photos, …
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
const STASH_KINDS = {
  lizards: [
    { k: 'cash', what: 'A roll of cash', icon: 'coin', desc: 'cash, rolled tight. Scales on the band' },
    { k: 'token', what: 'Brass tokens', icon: 'coin', desc: 'brass tokens, each stamped with scales' },
    { k: 'ledger', what: 'A ledger page', icon: 'paper', desc: 'a ledger page. Names, sums, scales' },
  ],
  aliens: [
    { k: 'gadget', what: 'A humming cylinder', icon: 'glyph', desc: 'a warm metal cylinder. It hums' },
    { k: 'chips', what: 'A tray of chips', icon: 'glyph', desc: 'a tray of tiny chips, still blinking' },
    { k: 'chart', what: 'A star chart', icon: 'paper', desc: 'a star chart. Wexley circled' },
  ],
};
const BUG = { k: 'bug', what: 'A bug', icon: 'glyph', desc: 'a bug, wired into your TV' };
const stashDef = (st) =>
  st.k === 'bug'
    ? BUG
    : (STASH_KINDS[G.faction] || STASH_KINDS.aliens).find((s) => s.k === st.k) || STASH_KINDS.aliens[0];
const stashIn = (o) => G.stashes && G.stashes.find((s) => s.obj === o.idx && !s.bagged);
// some things just rattle: a spoon down the back, coins in the works. It changes every few days.
function junkIn(o) {
  const h = hash2(o.idx, Math.floor(dayNo() / 3), 7);
  return h < 0.22 ? JUNK[Math.floor(hash2(o.idx, 3, Math.floor(dayNo() / 3)) * JUNK.length)] : null;
}
// whose thing is this: a desk, a home, Agnes's flat, your flat
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
function makeStashes() {
  G.stashes = [];
  G.stashId = G.stashId || 0;
  if (!STASH_KINDS[G.faction]) return; // the dead keep nothing worth hiding
  const used = new Set(),
    kinds = shuffle(STASH_KINDS[G.faction].slice());
  them().forEach((n, i) => {
    const pool = stashPool(n).filter((o) => !used.has(o.idx));
    if (!pool.length) return;
    const o = pick(pool);
    used.add(o.idx);
    G.stashes.push({
      id: ++G.stashId,
      by: n.id,
      obj: o.idx,
      k: kinds[i % kinds.length].k,
      out: false,
      moveAt: G.t + rand(0.6, 2.2) * 1440,
    });
  });
  if (G.faction === 'aliens') {
    const m = pick(them());
    G.stashes.push({
      id: ++G.stashId,
      by: m.id,
      obj: OBJ_BY_ID.homeTV.idx,
      k: 'bug',
      bug: true,
      out: false,
      moveAt: 1e12,
    });
  }
}
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
    n.rel -= own ? (k > 1 ? 12 : 4) : k > 1 ? 4 : 1;
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
        v.rel -= 8;
        addSus(v, 4);
        ui.say(v, 'Staff only.', 2.5);
      }
    },
    onTick: (c, a) => {
      tamperSeen(o, a, 1);
      if (a.hit || a.t < a.dur * 0.45) return;
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
      o.data.rattle = -1;
      o.data.shakenUntil = G.t + CTRL.shakeHold;
      if (RUMMAGE_FIND.has(o.type)) return rummageResult(o);
      ui.note('search', 'Nothing. Just a ' + o.name.toLowerCase() + '.', '');
    },
  });
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
function openUp(o) {
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
      obj: o.idx,
      room: (roomAt(o.cx, o.cz) || {}).key || null,
      at: G.t,
    });
    ui.note('box', 'Inside: ' + S.desc + '.', 'onto');
    addStress(6);
    audio.sting('whisper');
  } else {
    const j = junkIn(o);
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
function takeStash(it) {
  const st = G.stashes.find((s) => s.id === it.stash);
  if (!st) return;
  const S = stashDef(st);
  st.bagged = true;
  st.out = false;
  st.lostAt = G.t;
  const o = OBJ[it.obj],
    own = o ? ownerOf(o) : null;
  removeItem(it);
  addStress(5);
  takeProofItem({
    true: st.by,
    auto: own === st.by,
    what: S.what,
    where: o ? 'In the ' + o.name.toLowerCase() : placeName(it.x, it.z),
    k: st.k,
    icon: S.icon,
    pr: { kind: 'item', what: S.what, icon: S.icon },
  });
  setTimeout(() => ui.note('bag', S.what + ' · in your pocket. Someone will miss it.', 'onto'), 900);
}
// THEY come back for it: to put it away again, or to move it somewhere new. That trip is your best photo.
function stashTick() {
  if (!G.stashes || !G.started) return;
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
    if (st.bug) continue;
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
// a photo of a stash: proof of something, and of someone only if it sits in their own things
function photoStash(it) {
  const st = G.stashes.find((s) => s.id === it.stash);
  if (!st || it.photo) return false;
  it.photo = true;
  const S = stashDef(st),
    o = OBJ[it.obj],
    own = o ? ownerOf(o) : null,
    n = own && NPC[own];
  if (!G.factionKnown && !st.bug) revealFaction();
  const where = o ? 'In the ' + o.name.toLowerCase() : placeName(it.x, it.z);
  const mine = !!(n && own === st.by),
    before = mine ? n.evidence : 0;
  const p = addProof({
    cat: mine ? 'strong' : 'weak',
    true: st.by,
    auto: mine,
    what: S.what + (mine ? ', in their own ' + o.name.toLowerCase() : ''),
    where,
    pr: { kind: 'item', what: S.what, icon: S.icon },
  });
  if (mine)
    addNote(n, 'Photo: ' + S.what.toLowerCase() + ', hidden in their own ' + o.name.toLowerCase() + '.', { by: 'you' });
  else {
    G.leads.push(S.what + ' in the ' + (o ? o.name.toLowerCase() : 'street') + ' — whose?');
    if (G.leads.length > 6) G.leads.shift();
  }
  proofCard(p, before);
  audio.sting('onto');
  return true;
}
// a photo of one of THEM caught in the middle of something odd
function photoOdd(n) {
  const o = n.odd;
  o.photo = true;
  if (n.isThem) {
    const b = n.evidence,
      strong = ODD_STRONG.has(o.k);
    const p = addProof({
      cat: strong ? 'strong' : 'weak',
      true: n.id,
      auto: true,
      what: o.note.replace(/\.$/, ''),
      where: placeName(n.x, n.z),
      pr: { kind: 'plain', who: n.id, what: n.short, icon: 'people', t: n.animT },
    });
    addNote(n, 'Photo: ' + o.note, { by: 'you' });
    n.clues.photo = (n.clues.photo || 0) + 1;
    proofCard(p, b);
    bookPhoto(n);
    addDanger(n, strong ? 25 : 15);
    n.pinnedDay = dayNo();
    n.shotAt = G.t;
    if ((o.stash || strong) && !G.factionKnown) revealFaction();
    audio.sting('onto');
  } else addPrint({ kind: 'plain', who: n.id, what: n.short, icon: 'people', where: placeName(n.x, n.z), t: n.animT });
  if (o.control && G.control === o.control) catchControl(n, o.control);
}
