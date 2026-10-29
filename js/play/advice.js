//@ play/advice — Needs to the right thing to do, here; inventory hooks
//@ Defines: playerWhere, pathLen, nearestObj, needTarget, doNeed, autonomy, currentGoal, computeGoal, goalAct
//@ Uses:    sim/core, sim/actions, play/verbs, world/objects, ui/interface, player/needs, world/grid, data/tuning, town/cast, town/talk, …
//@ (header made by tools/map.js; stripped by build.py)
// ───────────── needs → the right thing to do, here
function playerWhere() {
  const r = roomAt(PLAYER.x, PLAYER.z);
  return r ? r.bld : 'out';
}
// distance to an object's nearest usable spot, ignoring whether someone is using it right now
function pathLen(o) {
  return objEdgeDist(o, PLAYER.x, PLAYER.z) + (roomAt(o.cx, o.cz) === roomAt(PLAYER.x, PLAYER.z) ? 0 : 8);
}
function nearestObj(list) {
  let best = null,
    bd = 1e9;
  for (const o of list) {
    if (!o) continue;
    const d = pathLen(o);
    if (d < bd) {
      bd = d;
      best = o;
    }
  }
  return best;
}
function needTarget(k) {
  const w = playerWhere(),
    shift = inShift();
  switch (k) {
    case 'health': {
      const b = OBJ_BY_ID.homeBed,
        night = hourF() >= 20 || hourF() < 6;
      return { obj: b, icon: 'bed', acts: () => [sleepAct(b, !night)] };
    }
    case 'bladder': {
      const o = nearestObj([OBJ_BY_ID.wcHome, OBJ_BY_ID.wcOffice]);
      return o && { obj: o, icon: 'toilet', acts: () => [toiletAct(o)] };
    }
    case 'hunger': {
      if (G.inv.meal > 0)
        return {
          obj: null,
          icon: 'food',
          acts: () => {
            G.inv.meal--;
            return [eatHereAct('Ready meal', 10, 45)];
          },
        };
      if (w === 'office' || shift) {
        const v = objOfType('vending');
        return { obj: v, icon: 'snack', acts: () => vendAct(v) };
      } // the machine in the office, or your own fridge: both free
      const f = OBJ_BY_ID.homeFridge;
      return PLAYER.needs.hunger < 55
        ? { obj: f, icon: 'cook', acts: () => cookChain() }
        : { obj: f, icon: 'snack', acts: () => snackAct(f) };
    }
    case 'energy': {
      if (shift || w === 'office') {
        const c = OBJ_BY_ID.coffee;
        return { obj: c, icon: 'coffee', acts: () => [coffeeAct(c)] };
      }
      const b = OBJ_BY_ID.homeBed,
        night = hourF() >= 20 || hourF() < 6;
      return { obj: b, icon: night ? 'moon' : 'bed', acts: () => [sleepAct(b, !night)] };
    }
    case 'stress': {
      // TV at home; by day outdoors, a sit on the bench with Lenny; otherwise a radiator
      const h = hourF(),
        day = h > 7 && h < 19.5,
        L = NPC.lenny;
      if (
        !shift &&
        w === 'out' &&
        day &&
        L &&
        L.onMap &&
        L.pose === 'sit' &&
        !L.exposed &&
        !L.trueForm &&
        !L.riteBy &&
        !asleep(L)
      )
        return { obj: null, char: L, icon: 'chat', acts: () => [talkAct(L, 'chat')] };
      if (!shift && w !== 'office') {
        const s = objOfType('sofa');
        return { obj: s, icon: 'tv', acts: () => [tvAct(60)] };
      }
      const r = nearestObj(OBJ.filter((o) => o.type === 'radiator' && o.id !== 'agnesRad'));
      return r && { obj: r, icon: 'warm', acts: () => [warmAct(r)] };
    }
  }
  return null;
}
function doNeed(k) {
  const t = needTarget(k);
  if (!t) {
    ui.note((NEEDS.find((d) => d.k === k) || { icon: 'plus' }).icon, 'Nothing nearby', 'bad');
    return;
  }
  if (t.obj && !inReach({ obj: t.obj })) {
    ui.note(t.icon, t.obj.name + ' · go there, then E', '');
    return;
  } // nothing walks you anywhere
  if (t.char && !inReach({ char: t.char })) {
    ui.note(t.icon, t.char.short + ' · go there, then E', '');
    return;
  }
  enqueue(PLAYER, t.acts());
  ui.bubble(PLAYER, t.icon, 'thought', 1.8);
}
// free will: handle bodily needs when idle; interrupt long actions when desperate
function autonomy(dt) {
  const P = PLAYER,
    N = P.needs,
    cur = P.queue[0];
  if (hunted()) {
    G.idleT = 0;
    return;
  }
  if (!cur) G.idleT += dt;
  else G.idleT = 0;
  if (!G.freeWill) return;
  G.autoT += dt;
  if (G.autoT < 4) return;
  G.autoT = 0;
  if (cur && cur.sleep && cur.stage === 'run' && N.bladder < 9 && inReach({ obj: OBJ_BY_ID.wcHome })) {
    const wc = OBJ_BY_ID.wcHome,
      bed = cur.obj;
    cur.cancel = true;
    P.queue = [cur];
    const acts = [toiletAct(wc), sleepAct(bed)];
    acts.forEach((a) => (a.auto = true));
    enqueue(P, acts);
    ui.bubble(P, 'toilet', 'thought', 2.5);
    return;
  }
  if (cur && (cur.passout || cur.breakdown || cur.sleep || (cur.auto && cur.need))) return;
  if (P.queue.some((a) => a.auto && a.need)) return;
  const urgent = ['bladder', 'hunger', 'energy'].filter((k) => N[k] < 11).sort((a, b) => N[a] - N[b])[0]; // these interrupt even work
  if (
    urgent &&
    !(cur && cur.need === urgent) &&
    (!cur || (cur.long && cur.stage === 'run' && cur.interruptible !== false))
  ) {
    if (urgent === 'energy' && !inShift() && playerWhere() !== 'apt') return;
    const t = needTarget(urgent);
    if (!t || (t.obj && !inReach({ obj: t.obj })) || (t.char && !inReach({ char: t.char }))) return;
    const acts = t.acts();
    acts.forEach((a) => (a.auto = true));
    const resume = cur && cur.work ? deskWork(false) : null;
    if (cur) cur.cancel = true;
    P.queue = P.queue.filter((a) => a === cur);
    enqueue(P, acts);
    if (resume) enqueue(P, resume);
    ui.bubble(P, t.icon, 'thought', 2.5);
    return;
  }
  if (!cur && G.idleT >= 30) {
    const so = stakeoutGoal();
    if (so && so.here) return;
    const order = NEEDS.map((d) => d.k)
      .filter((k) => lvl(k) < 32)
      .sort((a, b) => lvl(a) - lvl(b));
    for (const k of order) {
      const t = needTarget(k);
      if (!t || (t.obj && !inReach({ obj: t.obj })) || (t.char && !inReach({ char: t.char }))) continue;
      const acts = t.acts();
      acts.forEach((a) => (a.auto = true));
      enqueue(P, acts);
      ui.bubble(P, t.icon, 'thought', 2.5);
      G.idleT = 0;
      return;
    }
  }
}
// the one glowing thing that tells you what to do next
const goalCache = { t: -1, gt: -1, g: null };
function currentGoal() {
  const now = performance.now();
  if (now - goalCache.t < 450 && Math.abs(G.t - goalCache.gt) < 3) return goalCache.g;
  goalCache.t = now;
  goalCache.gt = G.t;
  goalCache.g = computeGoal();
  return goalCache.g;
}
function computeGoal() {
  const P = PLAYER,
    N = P.needs,
    m = tod(),
    cur = P.queue[0];
  if (!P.onMap || G.sleeping || (cur && (cur.passout || cur.breakdown))) return null;
  const busy = (pred) => P.queue.some(pred);
  if (G.loose) return looseGoal();
  {
    const hg = huntGoal() || chaseGoal();
    if (hg) return hg;
    if (HUNT.on) return null;
  }
  if (
    CHARS.some((c) => c.trueForm && c.trueForm.mode === 'attack' && c.onMap) &&
    !inRoomSet(P, (r) => r.home) &&
    !busy((a) => a.flee)
  )
    return { at: [5, 22], icon: 'home', urgent: true, flee: true };
  const eg = encGoal();
  if (eg) return eg;
  const needG = (k) => {
    if (busy((a) => a.need === k)) return null;
    const t = needTarget(k);
    if (!t) return null;
    return { obj: t.obj, char: t.char || null, icon: t.icon, need: k, urgent: lvl(k) < 15 };
  };
  // 1. a critical need
  const crit = ['bladder', 'hunger', 'energy'].filter((k) => N[k] < 15).sort((a, b) => N[a] - N[b])[0];
  if (crit) {
    const g = needG(crit);
    if (g) return g;
  }
  // 2. your desk, during the shift, when the work bar is under 60
  const atDesk = playerAtDesk(),
    deskQueued = busy((a) => a.work);
  if (inShift() && G.workBar < 60 && !atDesk && !deskQueued)
    return { obj: OBJ_BY_ID.chairA2, icon: 'work', urgent: G.workBar < WORK.low, work: true };
  // 3. lunch
  const lunch = m >= 11 * 60 + 45 && m < 13 * 60 + 15 && N.hunger < 45;
  if (lunch && !busy((a) => a.need === 'hunger')) {
    const g = needG('hunger');
    if (g) return g;
  }
  // a routine you believe in, about to happen
  const so = stakeoutGoal();
  if (so) return so.here ? null : so;
  if (atDesk || deskQueued) return null;
  // 4. any need below its threshold, the worst first
  const order = [
    ['bladder', 30],
    ['hunger', 45],
    ['energy', 26],
    ['stress', 30],
  ];
  let worst = null,
    wr = 1;
  for (const [k, th] of order)
    if (lvl(k) < th && lvl(k) / th < wr) {
      wr = lvl(k) / th;
      worst = k;
    }
  if (worst) {
    const g = needG(worst);
    if (g) return g;
  }
  // 5. bed after 22:30
  if ((m >= 22 * 60 + 30 || m < 5 * 60) && !busy((a) => a.sleep))
    return { obj: OBJ_BY_ID.homeBed, icon: 'moon', sleep: true };
  return null; // nothing says when a case is enough: that's yours to decide
}
// the glow only points: a click acts on it if it's in reach, otherwise it just says so
function goalAct(g) {
  if (g.stake || g.flee || g.at) return null;
  const tgt = g.char ? { char: g.char } : g.obj ? { obj: g.obj } : null;
  if (tgt && !inReach(tgt))
    return () => ui.note(g.icon, (g.char ? g.char.short : g.obj.name) + ' · go there, then E', '');
  if (g.work) return () => enqueue(PLAYER, deskWork(false));
  if (g.need) return () => doNeed(g.need);
  if (g.sleep) return () => enqueue(PLAYER, sleepAct(OBJ_BY_ID.homeBed));
  if (g.lenny) return () => enqueue(PLAYER, talkAct(NPC.lenny, 'lenny'));
  return null;
}
