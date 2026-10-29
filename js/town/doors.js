//@ town/doors — Broken restroom lock, doors left ajar
//@ Defines: upToNoGood, ajarChance, doorPass, roomWatch, awkward
//@ Uses:    sim/core, data/tuning, core/util, world/grid, ui/interface, town/suspicion, world/objects, town/npc-update, play/raids, play/traps, …
//@ (header made by tools/map.js; stripped by build.py)
// ───────────── awkwardness: the restroom lock is broken
// ───────────── doors left ajar
function upToNoGood(n) {
  if (n.raiding || n.breakIn || n.odd || n.secret || (G.control && G.control.by === n.id)) return true;
  return n.queue.slice(0, 4).some((a) => a.habit || a.op || a.label === '…' || a.label === 'Envelope');
}
function ajarChance(n) {
  const h = hourF(),
    p = h >= 10 && h < 16 ? AJAR.mid : h >= 21 || h < 7 ? AJAR.night : AJAR.edge;
  return p * (upToNoGood(n) ? AJAR.guilty : 1);
}
const doorFree = (d) => !d.locked && !d.ajar && !(d.shop && !shopOpen());
const roomSize = (r) => (r ? r.cells.length : 1e9); // the street counts as the biggest room there is
function doorPass(c) {
  if (c.isPlayer) return;
  const di = doorAt[I(Math.floor(c.x), Math.floor(c.z))];
  if (di >= 0) {
    if (c.inDoor !== di) {
      c.inDoor = di;
      c.doorFrom = c.floorRoom;
    }
    return;
  }
  const r = roomAt(c.x, c.z);
  if (c.inDoor >= 0) {
    const d = DOORS[c.inDoor],
      from = c.doorFrom;
    c.inDoor = -1;
    if (r !== from && doorFree(d)) {
      // through it: into a smaller room they may leave it ajar; out again, they pull it shut
      const v = roomSize(r) < roomSize(from) && chance(ajarChance(c)) ? G.t + rand(AJAR.min, AJAR.max) : 0;
      for (const e of [d, d.pairL, d.pairR]) if (e) e.slack = v;
    }
  }
  c.floorRoom = r;
}
function roomWatch(c) {
  const r = roomAt(c.x, c.z);
  if (r === c.prevRoom) return;
  c.prevRoom = r;
  if (c.isPlayer && r && (r.house || r.agnes)) {
    // inside somebody's home
    const hid = r.house || 'agnes',
      owner = NPC[hid];
    if (owner && owner.onMap && atHome(owner) && !owner.trueForm && !owner.slain) {
      if (owner.isThem && G.broken[hid] > G.t) return raidEnter(owner);
      if (!owner.isThem && G.broken[hid] > G.t && G.intruded !== hid + dayNo()) {
        G.intruded = hid + dayNo();
        ui.bubble(owner, 'exclaim', 'speech', 3);
        ui.say(owner, pick(['GET OUT OF MY HOUSE!', 'I’m calling the police!']), 3);
        addSus(owner, 30);
        G.policeAt = G.policeAt || G.t + rand(8, 18);
        caution(owner, 'breakin');
        return;
      }
    }
  }
  if (!r || !r.private) return;
  if (c.isPlayer) {
    for (const n of CHARS) {
      if (n === c || !n.onMap || roomAt(n.x, n.z) !== r) continue;
      if (n.tell) {
        n.tell.w += 1;
        if (!n.tell.caught) caughtWatching(n);
      } else awkward(n, 'barge');
      break;
    }
  } else if (roomAt(PLAYER.x, PLAYER.z) === r && !c.def.stranger && !c.trueForm && !c.exposed) awkward(c, 'walkin');
}
function awkward(n, kind) {
  if (G.awkCd > 0) return;
  G.awkCd = 15;
  addSus(n, 6);
  ui.bubble(n, 'exclaim', 'speech', 3);
  ui.say(
    n,
    kind === 'barge'
      ? pick(['DO YOU MIND?', 'Occupied!', 'Get OUT.'])
      : pick(['…Oh.', 'Sorry.', 'Why is it dark in here?']),
    2.6,
  );
  audio.sting('awkward');
  if (kind === 'barge') {
    const a = n.queue[0];
    if (a) a.cancel = true;
    n.wcCd = 25;
    addSus(n, 8);
  }
}
