//@ play/plants — THEIR plant at a victim's place and in your home; THEY take things back; signs for a gut feeling
//@ Defines: PLANT_FROM, KNOWN_AT, putPlant, destroyPlant, morningThings, takeBack, eveningThings
//@ Uses:    sim/core, world/objects, them/awareness, play/stashes, core/util, play/items, ui/interface, them/plan, town/cast, them/moves, …
//@ (header made by tools/map.js; stripped by build.py)
// ───────────── THEIR plant, and the signs THEY leave on people.
// When THEY get to a human (bought, bitten, probed), THEIR plant turns up at that person's place the next morning, never
// before THEIR day 3. It's the same object wherever it's found (the device, the till cash, the mark on the door frame).
// Take it as evidence and none of THEM comes for that person that night, except on THEIR nights 4 and 5, when hell is
// let loose. Once THEY know you, the plant turns up in your home, aimed at you: the device listens (THEY learn about
// you faster), the till cash is for the police to find (bought from day 2), the mark means THEY come that night.
// There, and only there, you can destroy it.
// Signs for a gut feeling, never cards: bitten, they stay home ill the day after; taken in the night, they sleep the
// morning off and come in after lunch, dazed (town/daily-plans); bought, money: more trips to the shop, and something
// new at home.
const PLANT_FROM = 3; // THEIR day the plants start: never in the first few days
const KNOWN_AT = 40; // awareness at which THEY plant something in your home (THEY know your number)
// a person's own place, free to hide something in: their desk, their home, the back room
const placeThings = (id) =>
  OBJ.filter(
    (o) =>
      shakeable(o) && o.type !== 'fridge' && ownerOf(o) === id && !G.stashes.some((s) => s.obj === o.idx && !s.bagged),
  );
// the front door of someone's place, for the dead's mark
const doorOf = (id) =>
  id === 'you' ? OBJ_BY_ID.homeLock : id === 'agnes' ? OBJ_BY_ID.agnesDoor : OBJ_BY_ID['door_' + id];
// THEIR plant at someone's place (a person's id, or 'you')
function putPlant(id, byId) {
  const P = PLANTS[G.faction];
  if (P.k === 'mark') {
    const d = doorOf(id);
    if (!d) return false;
    addItem({ kind: 'mark', x: d.cx, z: d.cz, rot: FACE_ANG[d.face] || 0, by: byId, plant: id, place: id, at: G.t });
    return true;
  }
  const pool = placeThings(id),
    o = (id === 'you' && G.faction === 'aliens' && OBJ_BY_ID.homeTV) || pick(pool);
  if (!o) return false;
  G.stashes.push({ id: ++G.stashId, by: byId, obj: o.idx, k: P.k, plant: true, on: id, out: false, moveAt: 1e12 });
  return true;
}
// is THEIR plant still in your home?
const homePlanted = (k) =>
  !!(G.homePlant && !G.homePlant.gone && (!k || G.homePlant.k === k)) &&
  (G.homePlant.k === 'mark'
    ? G.items.some((it) => it.kind === 'mark' && it.plant === 'you')
    : G.stashes.some((s) => s.plant && s.on === 'you' && !s.bagged));
// in your own home: you get rid of it
function destroyPlant(it) {
  if (it.kind === 'stash') {
    const st = G.stashes.find((s) => s.id === it.stash);
    if (st) st.bagged = true;
    const o = OBJ[it.obj];
    if (o) closeUp(o, true);
  }
  removeItem(it);
  if (G.homePlant) G.homePlant.gone = true;
  ui.note('fist', 'Gone. THEY’ll know you found it', 'good');
  audio.sting('clear');
}
// at 06:00: plants for whoever THEY got to, one in your home once THEY know you, and what comes of them
function morningThings() {
  if (!G.started || G.over) return;
  const f = G.faction;
  G.plants = G.plants || {};
  if (theirDay() >= PLANT_FROM && alive().length)
    for (const n of suspects()) {
      if (n.isThem || n.gone || n.slain || n.id === 'lenny' || G.plants[n.id] || !servantKind(n)) continue;
      const by = (G.boughtBy && G.boughtBy[n.id]) || pick(alive()).id;
      if (putPlant(n.id, by)) G.plants[n.id] = { by, at: G.t };
    }
  if (!G.homePlant && G.aware >= KNOWN_AT && alive().length && putPlant('you', pick(alive()).id))
    G.homePlant = { k: PLANTS[f].k, at: G.t };
  // the till cash in your flat: the police knew exactly where to look
  if (homePlanted('till') && G.policeBought && G.t - G.homePlant.at > 600 && !G.away) {
    G.homePlant.gone = true;
    G.stashes = G.stashes.filter((s) => !(s.plant && s.on === 'you'));
    setTimeout(() => {
      if (G.over) return;
      ui.note('badge', 'Police at the door. They knew exactly where to look', 'bad');
      arrest();
    }, 2200);
  }
  // they've noticed what went missing from their place
  for (const m of G.missing || []) if (NPC[m.id] && G.t - m.at > 300) addSus(NPC[m.id], 8);
  G.missing = (G.missing || []).filter((m) => G.t - m.at <= 300);
  takeBack();
  // bought: something new at home
  for (const n of suspects())
    if (bought(n) && HOUSE_OF[n.id] && !G.items.some((it) => it.kind === 'goldart' && it.of === n.id)) {
      const h = HOUSE_OF[n.id],
        N = h.row === 'N';
      addItem({ kind: 'goldart', of: n.id, x: h.x0 + 2.5, z: N ? 5.2 : 25.8, rot: N ? 0 : Math.PI, at: G.t });
    }
}
// THEY know you, and THEY come into your flat in the night for something of THEIRS you took
function takeBack() {
  if (G.aware < KNOWN_AT || !chance(0.4)) return;
  const live = (id) => NPC[id] && NPC[id].isThem && !NPC[id].slain;
  const p = G.proofs.filter((x) => x.src === 'item' && !x.innocent && live(x.true)).sort((a, b) => b.at - a.at)[0];
  if (!p) return;
  G.proofs.splice(G.proofs.indexOf(p), 1);
  setTimeout(() => !G.over && ui.note('home', 'THEY were in your flat. ' + p.what + ' is gone', 'bad'), 2600);
}
// at 20:00: the mark on your door means THEY come for you tonight
function eveningThings() {
  if (homePlanted('mark')) G.huntNight = tonightId();
}
// none of THEM comes for this person tonight: you took THEIR plant from their place (not on THEIR nights 4 and 5)
const safeTonight = (n) => !!(G.safeNight && G.safeNight[n.id] === tonightId() && theirDay() < 4);
