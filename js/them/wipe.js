//@ them/wipe — THEY destroy a card in person: at your computer, half an hour
//@ Defines: wipeLater, wipeWho, burglar, wipeTick, wipeGo, wipeWatch, wipeEnd
//@ Uses:    world/grid, sim/core, core/util, data/tuning, ui/interface, data/lines, them/awareness, world/objects, sim/actions, audio/sound, …
//@ (header made by tools/map.js; stripped by build.py)
// ───────────── a card destroyed in person. Instead of a card just being gone in the morning, one of THEM, or one of THEIR
// people, lets themselves into your flat while you're out and sits at your computer for half an hour (WIPE.mins), going
// through your evidence. Walk in on it and they bolt; the bold ones of THEM keep at it until you hit them. A fight with
// whoever is at your computer is nobody's business but yours: no police while you're in your flat, nor for a moment after.
// One visit waits at a time (G.wipe). It's saved; the act isn't, so a loaded game starts the visit again later.
function wipeLater(by) {
  if (G.wipe || G.loose || !G.proofs.some((p) => p.src !== 'item' && !p.spare)) return false;
  G.wipe = { phase: 'wait', at: G.t + rand(WIPE.after[0], WIPE.after[1]), pref: by ? by.id : null, by: null };
  return true;
}
// who goes: THEM, or someone THEY own, free to walk over now
function wipeWho(W) {
  const free = (n) =>
    n &&
    n.onMap &&
    !n.gone &&
    n.id !== 'lenny' &&
    !n.def.officer &&
    !n.trueForm &&
    !n.raiding &&
    !n.breakIn &&
    !n.hideUntil &&
    !n.under &&
    !n.engaged &&
    !n.fleeing &&
    !n.surrendered &&
    !n.trapped &&
    !n.inRite &&
    !n.riteBy &&
    !n.ko &&
    !(n.tell && n.tell.type !== 'glare' && n.tell.type !== 'half') &&
    !(G.control && G.control.by === n.id) &&
    !['clerk', 'gather', 'watch', 'sleep'].includes(curBlock(n).a); // slipping out of work is fine
  if (W.pref && free(NPC[W.pref])) return NPC[W.pref];
  const own = suspects().filter((s) => !s.isThem && servantKind(s));
  return pick(covert().concat(own).filter(free)) || null;
}
const wipeAct = (c) => c.queue.find((a) => a.wipe);
const inFlat = (c) => c.onMap && inRoomSet(c, (r) => r.home);
// a fight with this one is between the two of you: in your flat, and for WIPE.grace game minutes after either of you left it
function burglar(n) {
  const W = G.wipe;
  return !!(W && W.by === n.id && W.phase !== 'wait' && (inFlat(PLAYER) || inFlat(n) || G.t - W.homeT < WIPE.grace));
}
function wipeTick() {
  const W = G.wipe;
  if (!W || G.over) return;
  const P = PLAYER;
  if (W.phase === 'wait') {
    if (G.t < W.at) return;
    if (!G.proofs.some((p) => p.src !== 'item' && !p.spare)) return (G.wipe = null);
    const h = hourF();
    const m = h >= 8 && h < 22 && !inFlat(P) && !G.loose && !ARREST.on ? wipeWho(W) : null;
    if (!m) return (W.at = G.t + rand(30, 90)); // you're in, or nobody's free: later
    return wipeGo(m, W);
  }
  if (inFlat(P) || (NPC[W.by] && inFlat(NPC[W.by]))) W.homeT = G.t;
  if (W.phase === 'go' && !(NPC[W.by] && wipeAct(NPC[W.by]))) {
    // pulled off it some other way, or a loaded game: try again later
    W.phase = 'wait';
    W.by = null;
    W.at = G.t + rand(60, 120);
  }
  if (W.phase === 'done' && G.t - W.homeT > WIPE.grace) G.wipe = null;
}
function wipeGo(m, W) {
  const pc = OBJ_BY_ID.pcChair || OBJ_BY_ID.pc;
  W.phase = 'go';
  W.by = m.id;
  W.homeT = -1e9;
  hardReset(m);
  m.engaged = null;
  const a = useAct(m, pc, {
    label: 'At your computer',
    op: true,
    anim: 'type',
    dur: WIPE.mins,
    maxWait: 10,
    interruptible: false,
    onStart: (c) => {
      W.t0 = G.t;
      if (!inFlat(PLAYER)) {
        ui.note('pc', pick(WIPE_LINES.away), 'bad');
        audio.sting('whisper');
      }
    },
    onTick: (c, a) => wipeWatch(c, a, W),
    onEnd: (c, a, ok) => wipeEnd(c, a, ok, W),
  });
  a.wipe = true;
  enqueue(m, a);
}
// you walk in on it: most bolt, the bold ones of THEM look at you and carry on
function wipeWatch(c, a, W) {
  if (a.scared || W.t0 == null) return;
  const P = PLAYER,
    d = Math.hypot(P.x - c.x, P.z - c.z);
  if (!inFlat(P) || d > WIPE.scare || !npcSeesPlayer(c, WIPE.scare + 1)) return;
  c.tdir = Math.atan2(P.x - c.x, P.z - c.z);
  W.seen = true;
  if (c.isThem && temper(c) === 'aggressive') {
    if (a.glared) return;
    a.glared = true;
    ui.bubble(c, 'frown', 'speech', 2.5);
    ui.say(c, pick(WIPE_LINES.bold), 3);
    addDanger(c, 12);
    return;
  }
  a.scared = true;
  a.dur = a.t + 0.4;
}
function wipeEnd(c, a, ok, W) {
  if (G.wipe !== W || W.phase === 'done') return;
  if (W.seen) addNote(c, 'At your computer, in your flat. Going through your evidence.', { by: 'you' });
  if (a.scared || W.hit) {
    W.phase = 'done';
    ui.note('pc', 'Your evidence is safe. This time.', 'good');
    if (a.scared) setTimeout(() => !G.over && c.onMap && (ui.say(c, pick(WIPE_LINES.caught), 2.5), flee(c)), 0);
    return;
  }
  if (!ok) return; // the check in wipeTick tries again later
  W.phase = 'done';
  const pf = tearCard(c);
  if (pf) {
    setTimeout(() => {
      if (G.over) return;
      ui.note('print', 'A card is gone. Wiped off your computer.', 'bad');
      audio.sting('whisper');
    }, 1200);
    echo('theft', { who: c.id, x: 12, z: 21, seen: c.id !== 'agnes' ? ['agnes'] : [], quiet: true });
  }
  // THEY change THEIR habits after: the next day the routine shifts
  const hb = c.isThem && G.habits[c.id];
  if (hb) {
    const sh = (chance(0.5) ? 1 : -1) * rand(20, 40);
    hb.ms = (hb.ms || [hb.m]).map((t) => clamp(Math.round((t + sh) / 5) * 5, 440, 1290));
    hb.m = hb.ms[0];
  }
}
