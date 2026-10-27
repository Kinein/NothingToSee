//@ horror/encounters — Who's who; encounters: choosing when, where, who, and getting everyone in place
//@ Defines: dressStranger, ENC_TYPES, ENC_NEED, ENC_DUR, ENC_COL, encTick, encFitRoom, encRoomSpot, encVenueIn, encOpen, encSpot, encMemberFree, encVictimFree, encNamedOk, encStranger, encStart, …
//@ Uses:    sim/core, core/util, world/grid, gfx/renderer, horror/encounter-outcomes, world/paths, town/npc-update, them/plan, sim/actions, them/awareness, …
//@ (header made by tools/map.js; stripped by build.py)
// ───────────── who's who: the women in town can be spoken to by THEM one way, the men another
const isFem = (c) => !!(c && (c.fem != null ? c.fem : c.def && c.def.fem));
function dressStranger(s, fem) {
  const L = fem
    ? { skin: pick([0xd8b399, 0xa87a5c, 0x7a523f, 0xe8c9b0, 0xc49274]), hair: pick(['long', 'bun', 'long']), hairCol: pick([0x1a1410, 0x5a3a20, 0x8a7a60, 0x3a2a1a, 0xb39d64, 0x6a2a1a]), top: pick([0x5a3a4a, 0x3a4a5a, 0x6b3a2e, 0x4a4a3a, 0x74485a, 0x2e3a3a]), bottom: pick([0x22252a, 0x3a2a2c, 0x2a2a30]), h: rand(0.92, 0.99), w: rand(0.86, 0.95), sleeves: 1, outfit: pick(['coat', 'cardigan', 'scarf', '']), acc: pick([0xd8cdb8, 0x7a2a24, 0xb08a3a, 0x2a2a2a]), skirt: chance(0.75) ? 1 : 0 }
    : { skin: pick([0xd8b399, 0xa87a5c, 0x7a523f, 0xe8c9b0, 0xc49274]), hair: pick(['short', 'bald', 'side', 'messy']), hairCol: pick([0x1a1410, 0x5a3a20, 0x8a7a60, 0x3a2a1a]), top: pick([0x3a3e46, 0x5a4a3a, 0x2e3a2e, 0x4a2e2e, 0x6a6a62]), bottom: pick([0x22252a, 0x3a342c, 0x2a2a30]), h: rand(0.98, 1.06), w: rand(1.0, 1.12), sleeves: 1, outfit: pick(['coat', 'jacket', '', 'tie']), acc: pick([0x2a2a2a, 0x7a2a24, 0x2f394d]), beard: chance(0.3) ? 1 : 0, hat: chance(0.25) ? 'beanie' : '', hatCol: 0x2a2a30 };
  s.look = Object.assign({}, L, { skinC: hex(L.skin), topC: hex(L.top), botC: hex(L.bottom), shoeC: hex(L.shoes || 0x1b1b1c), hairC: hex(L.hairCol), accC: hex(L.acc != null ? L.acc : L.top), hatC: hex(L.hatCol || 0x2a2a2a), eyeC: [0.06, 0.05, 0.05], mouthC: mul3(hex(L.skin), 0.55) });
  s.fem = !!fem;
  if (R.portraits) delete R.portraits[s.id];
}

// ───────────── encounters: one of THEM, out of its skin, doing something to somebody ordinary.
// Not a vision and not a show. Real people, and it stays done: the taken are chipped, the kneelers are bought, the danced-with
// are marked for the dead. Walk up and it stops (and late in the week it may come for you instead); creep up out of its
// sight and pull them out, and it just runs. Most nights, more than once. Now and then by day, where nobody looks.
const ENC_TYPES = { aliens: ['probe', 'specimen'], lizards: ['worship', 'massage', 'court'], zombies: ['dance', 'tend'] };
const ENC_NEED = { probe: [1, 1, 0], specimen: [1, 1, 0], worship: [2, 3, 'm'], massage: [1, 2, 'm'], court: [1, 1, 'f'], dance: [1, 1, 0], tend: [1, 1, 0] };
const ENC_DUR = { probe: [26, 34], specimen: [24, 30], worship: [30, 40], massage: [28, 36], court: [24, 32], dance: [28, 36], tend: [26, 34] };
const ENC_COL = { aliens: [0.35, 1, 0.7], lizards: [1, 0.62, 0.22], zombies: [0.62, 0.72, 0.6] };
const encChar = (id) => NPC[id] || CHARS.find((c) => c.id === id) || null;
const encNight = () => { const h = hourF(); return h >= 21 || h < 5; };
function encTick() {
  if (!G.started || G.over || G.landing || G.endAt || !alive().length) return;
  if (G.enc) return;
  if (!G.encNext) G.encNext = G.t + rand(20, 60);
  if (G.t < G.encNext) return;
  const h = hourF(), ph = clamp(G.phase || 1, 1, WEEK) * 1.4, night = encNight(), dusk = !night && (h >= 19 || h < 6.5);   // scaled to the old seven-day pace
  const watching = PLAYER.onMap && !G.sleeping && !G.away, early = !theyOut();
  let gap, p;
  if (night) { gap = rand(40, 75) * (1.2 - ph * 0.06); p = 0.42 + ph * 0.04; }
  else if (dusk) { gap = rand(70, 120); p = 0.25; }
  else { gap = rand(130, 220); p = 0.15 + ph * 0.03; }
  if (early) { gap *= 1.7; p *= 0.6; }   // days 2–3: now and then, behind a door
  if (!watching) p *= 0.45;
  G.encNext = G.t + gap;
  if (!theyStir() || (!darkNow() && (G.phase || 1) < 3)) return;   // day 1 and its night: nothing. By daylight: only from day 3.
  if (G.attack && G.attack.phase !== 'wait') return;
  if (G.t - (G.encLast || -1e9) < 25 || !chance(p)) return;
  encStart(night || dusk, early);
}
// early in THEIR week it happens behind a door: in somebody's home, or a back room of the office after hours
function encFitRoom(room, S) {   // a facing that keeps the whole picture inside the room's walls
  const fw = [cam.fwd[0], cam.fwd[2]], axes = shuffle([[cam.right[0], cam.right[2]], fw.slice()]);
  for (const [ax, az] of axes) {
    const l = Math.hypot(ax, az) || 1;
    for (const sg of chance(0.5) ? [1, -1] : [-1, 1]) {
      const fx = (ax / l) * sg, fz = (az / l) * sg, px = fz, pz = -fx;
      const pts = [[fx * 1.2, fz * 1.2], [-fx * 0.9, -fz * 0.9], [px * 0.9, pz * 0.9], [-px * 0.9, -pz * 0.9], [fx * 0.98 + px * 0.76, fz * 0.98 + pz * 0.76], [fx * 0.98 - px * 0.76, fz * 0.98 - pz * 0.76]];
      if (!pts.every(([dx, dz]) => roomAt(S[0] + dx, S[1] + dz) === room && !isWallish(Math.floor(S[0] + dx), Math.floor(S[1] + dz)))) continue;
      const bs = px * fw[0] + pz * fw[1] >= 0 ? 1 : -1;
      return { F: [fx, fz], B: [px * bs, pz * bs] };
    }
  }
  return null;
}
function encRoomSpot(room) {
  if (!room) return null;
  const P = PLAYER;
  if (P.onMap && roomAt(P.x, P.z) === room) return null;   // not with you in the room
  for (const [x, z] of shuffle(room.cells.filter(([x, z]) => walkable(x, z)))) {
    const S = [x + 0.5, z + 0.5], fit = encFitRoom(room, S);
    if (fit) return Object.assign({ S, room }, fit);
  }
  return null;
}
function encVenueIn(m, night, only) {
  const out = [], free = (c) => c && !c.isThem && !c.gone && !c.exposed && c.onMap && !c.engaged && !c.fleeing && !c.trueForm && !c.hideUntil && !c.riteBy && !c.under && !c.surrendered && G.t - (c.riteAt || -1e9) > 900;
  const hk = m.id === 'agnes' ? 'agnes' : HOUSE_OF[m.id] ? HOUSE_OF[m.id].key : null;
  if (hk && only !== 'office') out.push({ room: roomByKey(hk), kind: 'host', w: 2 });   // its own home: somebody is walked in, half asleep
  if (encNamedOk() && only !== 'office') for (const c of suspects()) if (free(c) && atHome(c) && encVictimFree(c, true)) out.push({ room: roomAt(c.x, c.z), kind: 'visit', who: c, w: 1.5 });   // theirs: it lets itself in
  const officeBusy = CHARS.some((c) => c !== m && !c.isPlayer && c.onMap && (roomAt(c.x, c.z) || {}).bld === 'office');
  if (!officeBusy && !officeLit()) for (const k of ['closet', 'break', 'boss']) out.push({ room: roomByKey(k), kind: 'office', w: 0.6 });   // a back room, after hours
  for (let tries = 0; tries < 4 && out.length; tries++) {
    let r = Math.random() * out.reduce((a, v) => a + v.w, 0), v = out[0];
    for (const o of out) { r -= o.w; if (r <= 0) { v = o; break; } }
    out.splice(out.indexOf(v), 1);
    const sp = encRoomSpot(v.room);
    if (sp) return Object.assign(sp, { kind: v.kind, who: v.who || null });
  }
  return null;
}
// a patch of open ground: not the road, room all round. By night near enough for you to see the light; by day, nowhere anyone looks.
function encOpen(x, z) {
  if (!inb(x, z) || !OUTDOOR.has(tiles[I(x, z)]) || tiles[I(x, z)] === '=' || !walkable(x, z)) return false;
  let n = 0; for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) if ((dx || dz) && inb(x + dx, z + dz) && walkable(x + dx, z + dz) && tiles[I(x + dx, z + dz)] !== '=') n++;
  return n >= 7;
}
function encSpot(night) {
  const P = PLAYER, out = P.onMap && !G.sleeping && !G.away && !roomAt(P.x, P.z);
  let best = null;
  for (let k = 0; k < 300; k++) {
    let x, z;
    if (P.onMap && k < 220) { x = Math.floor(P.x + rand(-17, 17)); z = Math.floor(P.z + rand(-14, 14)); } else { x = irand(1, W - 2); z = irand(0, H - 1); }
    if (!encOpen(x, z)) continue;
    const cx = x + 0.5, cz = z + 0.5, d = Math.hypot(cx - P.x, cz - P.z), lum = lumAt(cx, cz);
    if (P.onMap && d < 6.5) continue;
    let s = rand(0, 1);
    if (P.onMap) s += (out ? 3 : 1.5) - Math.abs(d - 11) * 0.22 + (out && losClear(Math.floor(P.x), Math.floor(P.z), x, z) ? 2.6 : 0);   // somewhere you could see it from where you stand
    if (night) s -= lum * 1.5;
    else {   // by day: off the pavements, and nobody about
      if (tiles[I(x, z)] === '-' || lum > 0.5 && chance(0.5)) continue;
      if (CHARS.some((c) => !c.isPlayer && c.onMap && !roomAt(c.x, c.z) && Math.hypot(c.x - cx, c.z - cz) < 7)) continue;
      s -= lum * 2;
    }
    if (!best || s > best.s) best = { x: cx, z: cz, s };
  }
  return best;
}
function encMemberFree(n, night) {
  if (!n.onMap || n.trueForm || n.raiding || n.breakIn || n.hideUntil || n.under || n.engaged || n.fleeing || n.surrendered || n.trapped || n.inRite) return false;
  if (n.tell && n.tell.type !== 'glare' && n.tell.type !== 'half') return false;
  if ((G.control && G.control.by === n.id) || G.t - (n.riteAt || -1e9) < 150) return false;
  const b = curBlock(n).a;
  if (['work', 'clerk', 'courier', 'gather', 'watch', 'lunch'].includes(b)) return false;
  if (!night && roomAt(n.x, n.z) && !atHome(n)) return false;
  return true;
}
function encVictimFree(c, night) {
  const b = curBlock(c).a;
  if (['work', 'clerk', 'courier', 'gather', 'watch', 'lunch'].includes(b)) return false;
  if (c.queue[0] && c.queue[0].interruptible === false) return false;
  return night || !roomAt(c.x, c.z);
}
// people with names only when you're up and about to see it: asleep, you can't stop it, so it takes strangers off the street
function encNamedOk() { return PLAYER.onMap && !G.sleeping && !G.away && (G.encNamedDay !== dayNo() || (G.encNamed || 0) < 2); }
function encStranger(fem, S) {
  const s = CHARS.find((c) => c.def.stranger && !c.def.officer && !c.onMap);
  if (!s) return null;
  dressStranger(s, fem);
  let at = null;
  for (let k = 0; k < 80 && !at; k++) {
    const x = Math.floor(S[0] + rand(-14, 14)), z = Math.floor(S[1] + rand(-12, 12)), d = Math.hypot(x + 0.5 - S[0], z + 0.5 - S[1]);
    if (d > 6 && d < 15 && inb(x, z) && isOutdoor(x, z) && walkable(x, z) && tiles[I(x, z)] !== '=' && visCur[I(x, z)] < 0.2) at = [x, z];
  }
  if (!at) at = edgeFor(s, S[1]);
  placeChar(s, at[0], at[1]); s.onMap = true; s.queue = []; s.shown = 0; s.spd = 1; s.kind = 'enc'; s.drunk = false; s.tell = null; s.fleeing = null; s.engaged = null; s.vis = null; s.hideUntil = 0;
  return s;
}
function encStart(night, indoor, only, wantType) {
  const fac = G.faction;
  let S, m = null, V = null;
  if (indoor) {   // behind a door: its home, the home of whoever it's come for, or the office after hours
    for (const c of shuffle(alive().filter((n) => encMemberFree(n, night)))) { V = encVenueIn(c, night, only); if (V) { m = c; break; } }
    if (!m) return false;
    S = V.S;
  } else {
    const sp = encSpot(night); if (!sp) return false;
    S = [sp.x, sp.z];
    const ms = alive().filter((n) => encMemberFree(n, night) && Math.hypot(n.x - S[0], n.z - S[1]) < 44).sort((a, b) => Math.hypot(a.x - S[0], a.z - S[1]) - Math.hypot(b.x - S[0], b.z - S[1]));
    m = ms[0]; if (!m) return false;
  }
  const types = ENC_TYPES[fac].filter((t) => !(V && V.who) || !ENC_NEED[t][2] || (ENC_NEED[t][2] === 'f') === isFem(V.who));
  if (!types.length) return false;
  const type = wantType && types.includes(wantType) ? wantType : pick(types), [mn, mx, sex] = ENC_NEED[type];
  const fits = (c) => !sex || (sex === 'f') === isFem(c);
  let vic = [];
  if (V && V.who) vic = [V.who];
  else {
    const pool = encNamedOk() ? suspects().concat(fac !== 'lizards' ? [NPC.lenny] : []).filter((c) => c && !c.isThem && !c.gone && !c.exposed && c.onMap && !c.engaged && !c.fleeing && !c.trueForm && !c.hideUntil && !c.riteBy && !c.under && !c.surrendered && G.t - (c.riteAt || -1e9) > 900 && fits(c) && encVictimFree(c, night) && Math.hypot(c.x - S[0], c.z - S[1]) < (V ? 40 : 30)) : [];
    const want = irand(mn, mx);
    for (const c of shuffle(pool)) { if (vic.length >= want || (vic.length && chance(0.4))) break; vic.push(c); }
    while (vic.length < want) { const s = encStranger(sex ? sex === 'f' : chance(0.5), S); if (!s) break; vic.push(s); }
  }
  if (vic.length < mn && !(vic.length && type === 'worship')) return false;
  if (!vic.length) return false;
  if (vic.some((c) => !c.def.stranger)) { if (G.encNamedDay !== dayNo()) { G.encNamedDay = dayNo(); G.encNamed = 0; } G.encNamed++; }
  // they face each other across the picture, so you see both of them side-on
  let fx = cam.right[0], fz = cam.right[2]; const fl = Math.hypot(fx, fz) || 1; fx /= fl; fz /= fl; if (chance(0.5)) { fx = -fx; fz = -fz; }
  let bx = cam.fwd[0], bz = cam.fwd[2]; const bl = Math.hypot(bx, bz) || 1; bx /= bl; bz /= bl;   // away from you, along the ground
  if (V) { [fx, fz] = V.F; [bx, bz] = V.B; }   // indoors: whichever way the room has space for
  const E = (G.enc = { id: (G.encId = (G.encId || 0) + 1), type, fac, by: m.id, vic: vic.map((c) => c.id), S, F: [fx, fz], B: [bx, bz], phase: 'gather', t0: G.t, tAct: null, dur: 0, night, known: false, seen: false, snd: 0, say: 0, indoor: !!V, venue: V ? V.kind : 'street', room: V ? V.room.key : null });
  m.inRite = true; m.riteAt = G.t;
  hardReset(m); m.engaged = null;
  if (V && V.kind === 'visit') { m.breakIn = true; m.encDoor = E.id; }   // it lets itself in
  const ms0 = encSlot(E, m), mt = nearestWalkable(ms0.x, ms0.z, m, 2) || [Math.floor(S[0]), Math.floor(S[1])];
  enqueue(m, [goAct(mt, { label: '…', interruptible: false, rite: E.id, onEnd: (c, a, ok) => { if (ok || Math.hypot(c.x - mt[0] - 0.5, c.z - mt[1] - 0.5) < 2.5) c.encIn = E.id; } }),
    waitAct({ label: '…', dur: null, anim: 'stare', interruptible: false, rite: E.id, until: () => G.enc !== E || E.phase !== 'gather' })]);
  for (const v of vic) { encLure(E, v); if (V && V.kind === 'host') { v.breakIn = true; v.encDoor = E.id; } }   // walked in through its door
  return true;
}
// they come out to it like sleepwalkers: out of bed, out of the door, arms loose, eyes open
function encLure(E, v) {
  v.riteAt = G.t;
  hardReset(v); v.engaged = null; v.riteBy = E.by; v.trance = true; v.encIn = 0; v.spd = 0.78;
  v.poseFn = encPose(E, v);
  const sl = encSlot(E, v), vt = nearestWalkable(sl.x, sl.z, v, 2) || [Math.floor(sl.x), Math.floor(sl.z)];
  enqueue(v, [goAct(vt, { label: '…', interruptible: false, rite: E.id, onEnd: (c, a, ok) => { if (ok || Math.hypot(c.x - vt[0] - 0.5, c.z - vt[1] - 0.5) < 2.5) c.encIn = E.id; } }),
    waitAct({ label: '…', dur: null, anim: 'stare', interruptible: false, rite: E.id, until: (c) => !G.enc || G.enc.id !== E.id || c.riteBy !== E.by })]);
}
// where everyone stands for it, relative to the spot and the way the thing faces
function encSlot(E, c) {
  const [sx, sz] = E.S, [fx, fz] = E.F, px = fz, pz = -fx, fd = Math.atan2(fx, fz);
  const at = (f, q) => [sx + fx * f + px * q, sz + fz * f + pz * q];
  const isM = c.id === E.by, i = Math.max(0, E.vic.indexOf(c.id));
  const L = (p, dir) => ({ x: p[0], z: p[1], dir });
  const toward = (p) => Math.atan2(sx - p[0], sz - p[1]);
  switch (E.type) {
    case 'probe': {   // laid out across the picture in the air, the thing bent over it from the far side
      const [bx, bz] = E.B || [-px, -pz];
      if (isM) { const p = [sx + bx * 0.85, sz + bz * 0.85]; return L(p, Math.atan2(-bx, -bz)); }
      return L([sx + fx * 0.88, sz + fz * 0.88], fd);
    }
    case 'specimen': {   // it walks round and round what it's got, and what it's got turns slowly on nothing
      const V = at(0.24, 0), tg = E.tAct != null ? G.t - E.tAct : 0, sp = sstep(0, 3, tg);
      if (!isM) return L(V, fd + Math.PI + Math.sin(tg * 0.17) * 0.7 * sp);
      const a = fd + Math.PI + Math.sin(tg * 0.23) * 1.15 * sp, Mp = [V[0] + Math.sin(a) * 0.95, V[1] + Math.cos(a) * 0.95];
      return L(Mp, Math.atan2(V[0] - Mp[0], V[1] - Mp[1]));
    }
    case 'worship': { if (isM) return L([sx, sz], fd); const p = [at(1.12, 0), at(0.98, -0.76), at(0.98, 0.76)][i % 3]; return L(p, toward(p)); }
    case 'massage': if (isM) return L([sx, sz], fd); return i === 0 ? L(at(-0.5, 0), fd) : L(at(0.85, 0), fd + Math.PI);
    case 'court': {   // it circles her, displaying, then closes in
      const Wp = at(1.0, 0), p = encProg(E), tg = E.tAct != null ? G.t - E.tAct : 0;
      const arc = Math.sin(tg * 0.2) * 0.75 * (1 - sstep(0.3, 0.5, p)) * sstep(0, 3, tg), dd = lerp(1.05, 0.74, sstep(0.32, 0.55, p));
      const a = fd + Math.PI + arc, Lz = [Wp[0] + Math.sin(a) * dd, Wp[1] + Math.cos(a) * dd];
      return isM ? L(Lz, Math.atan2(Wp[0] - Lz[0], Wp[1] - Lz[1])) : L(Wp, Math.atan2(Lz[0] - Wp[0], Lz[1] - Wp[1]));
    }
    case 'dance': { const th = E.tAct != null ? (G.t - E.tAct) * 0.11 : 0, a = fd + th, ox = Math.sin(a) * 0.21, oz = Math.cos(a) * 0.21; return isM ? L([sx - ox, sz - oz], a) : L([sx + ox, sz + oz], a + Math.PI); }
    case 'tend': { if (isM) return L([sx, sz], fd); const p = at(0.62, 0.45); return L(p, Math.atan2(sx + fx * 0.25 - p[0], sz + fz * 0.25 - p[1])); }
  }
  return L([sx, sz], fd);
}
// on the mark: eased into place, facing its work
function encHold(c, E, dt) {
  const s = encSlot(E, c), k = Math.min(1, dt * 3.5);
  c.path = null; c.moving = false;
  c.x += (s.x - c.x) * k; c.z += (s.z - c.z) * k; c.tdir = s.dir;
}
function encStep(dt) {
  const E = G.enc; if (!E) return;
  const m = encChar(E.by);
  if (!m || m.slain || !m.onMap) return encAbort(E, 'member');
  const vs = E.vic.map(encChar).filter((v) => v && v.onMap && v.riteBy === E.by);
  E.vic = vs.map((v) => v.id);
  if (!vs.length) return encAbort(E, 'novictims');
  if (E.phase === 'gather') {
    if (m.trueForm || (!m.queue.some((a) => a.rite === E.id))) return encAbort(E, 'hijacked');   // something else got hold of it
    for (const v of vs) if (v.encIn === E.id) { v.trance = false; encHold(v, E, dt); }
    if (m.encIn === E.id) encHold(m, E, dt);
    const inV = vs.filter((v) => v.encIn === E.id);
    const all = inV.length === vs.length, late = G.t - E.t0 > 32;
    if (m.encIn === E.id && inV.length && (all || late)) {
      for (const v of vs) if (v.encIn !== E.id) encLetGo(v);
      E.vic = inV.map((v) => v.id);
      return encBegin(E, m);
    }
    if (G.t - E.t0 > 55) return encAbort(E, 'late');
    return;
  }
  if (E.phase === 'change' || E.phase === 'act') {
    if (!m.trueForm || (m.trueForm.mode !== 'rite')) { E.broken = 'fight'; encRelease(E, true); return encEnd(E); }
    for (const v of vs) encHold(v, E, dt);
    encMood(E, m, vs, dt);
  }
}
