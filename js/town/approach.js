//@ town/approach — People come to you: a word in the street, Hale at your shoulder, THEIR people warning and following you
//@ Defines: approachFree, approachTick, approachStart, approachLines, approachAct, approachEnd, approachStep
//@ Uses:    sim/core, core/util, ui/interface, data/tuning, sim/actions, town/talk, sim/movement, world/grid, them/plan, data/lines, …
//@ (header made by tools/map.js; stripped by build.py)
// ───────────── people come to you. Not everything waits for you to start it: now and then somebody comes over on their
// own. A neighbour with something to tell you, Hale when your chair's been empty too long, one of THEM to ask how you're
// sleeping, one of THEIR people to tell you to leave it alone (and then to follow you about for a while), a stranger
// asking the way, a drunk who's decided you're his best friend. They call out, walk up and have their say. Stand and hear
// them out, or walk off: they take that badly. Talk to them yourself (E) and it's an ordinary chat instead.
// One at a time, never in a fight, a chase, a scene, or with you in handcuffs.
function approachFree(n) {
  if (n.isPlayer || !n.onMap || asleep(n) || n.engaged || n.pose !== 'stand' || n.seatTr || n.y) return false;
  if (n.fleeing || n.trueForm || n.exposed || n.surrendered || n.slain || n.gone || n.under || n.hideUntil) return false;
  if (n.tell || n.secret || n.odd || n.raiding || n.breakIn || n.hunting || n.trance || n.cornered > G.t - 30) return false;
  if (n.def.officer || n.id === 'lenny' || (G.tail && G.tail.id === n.id) || (G.control && G.control.who === n.id))
    return false;
  const a = n.queue[0];
  return !(a && (a.interruptible === false || a.habit || a.op || a.kind === 'talk' || a.approach));
}
const approachQuiet = () => {
  const P = PLAYER;
  return (
    !G.started ||
    G.over ||
    !P.onMap ||
    G.away ||
    G.sleeping ||
    G.loose ||
    G.enc ||
    ARREST.on ||
    HUNT.on ||
    CAP.on ||
    CELL.on ||
    UI.cf ||
    fightOn() ||
    !!(P.queue[0] && P.queue[0].interruptible === false)
  );
};
// once a game minute
function approachTick() {
  if (approachQuiet()) return;
  const P = PLAYER,
    A = APPROACH;
  if (G.approach) {
    const n = NPC[G.approach] || CHARS.find((c) => c.id === G.approach);
    if (n && n.onMap && n.queue.some((a) => a.approach && !a.done)) return;
    G.approach = null;
  }
  // Hale first: in the shift, your chair empty and the bar going, he comes and finds you in the office
  const h = NPC.hale;
  if (
    inShift() &&
    G.workBar < WORK.low &&
    !playerAtDesk() &&
    inOffice() &&
    G.t >= G.haleAt &&
    h &&
    approachFree(h) &&
    (roomAt(h.x, h.z) || {}).bld === 'office'
  ) {
    G.haleAt = G.t + A.boss;
    return approachStart(h, 'boss');
  }
  if (G.t < G.approachAt) return;
  G.approachAt = G.t + rand(A.every[0], A.every[1]);
  if (darkNow() && chance(0.5)) return;
  const opts = [];
  for (const n of CHARS) {
    if (G.t < (n.cameAt || -1e9) + A.again) continue; // not the same face twice running
    if (!approachFree(n) || Math.hypot(n.x - P.x, n.z - P.z) > A.near || !npcSeesPlayer(n, A.near)) continue;
    if (n.def.stranger) {
      if (n.kind === 'drunk') opts.push([1.2, [n, 'drunk']]);
      else if (n.kind === 'walker') opts.push([0.5, [n, 'lost']]);
    } else if (n.isThem) {
      if (G.aware >= A.probeAware && theirDay() < 5) opts.push([1 + G.aware / 100, [n, 'probe']]);
    } else if (servantKind(n) && theirDay() < 5) opts.push([1.2, [n, 'warn']]);
    else if (n.def.plan && n.sus < MAD_SUS) opts.push([1, [n, 'chat']]);
  }
  const pk = opts.length && wpick(opts);
  if (pk) approachStart(pk[0], pk[1]);
}
function approachStart(n, kind) {
  for (const a of n.queue) a.cancel = true; // whatever they were at winds up properly first
  enqueue(n, approachAct(n, kind));
  G.approach = n.id;
  n.cameAt = G.t;
}
const pName = (s) => s.replace(/\{p\}/g, PLAYER.name || 'you');
// what they've come to say, in order: strings, or a function that says its own (gossip, a chat line)
function approachLines(n, kind) {
  const L = APPROACH_LINES,
    P = PLAYER,
    out = [];
  if (kind === 'chat') {
    out.push(pick(L.chat.open));
    if (G.smelly) out.push(pick(L.chat.smell));
    else if (n.sus >= 40) out.push(pick(L.chat.talked));
    else if (P.needs.energy < 25) out.push(pick(L.chat.tired));
    // they came over to tell you something: what they've heard, or a word about themselves
    out.push(() => (chance(0.6) && !tooShaken() && gossip(n)) || ui.say(n, chatLine(n), 4));
    out.push(pick(L.chat.close));
  } else if (kind === 'probe') {
    out.push(pick(L.probe.open));
    const mid = pick(G.aware >= 50 ? L.probe.know : WEIRD_THEM);
    out.push(() => {
      ui.say(n, mid, 3.6);
      noteOnce(n, '“' + mid + '”', { by: n.id, quote: true });
      psyMark('sign'); // the way it looks at you while it says it: a slight sign
    });
    out.push(pick(L.probe.close));
  } else if (kind === 'warn') {
    const k = servantKind(n),
      W = L.warn[k] || L.warn.bribed;
    out.push(pick(W));
    out.push(pick(L.warn.all));
  } else if (kind === 'lost') {
    out.push(pick(L.lost.ask));
    out.push(pick(L.lost.close));
  } else if (kind === 'drunk') {
    const a = pick(L.drunk.mid);
    out.push(a, pick(L.drunk.mid.filter((l) => l !== a)));
  } else if (kind === 'boss') {
    out.push(pick(L.boss.mid), pick(L.boss.close));
  }
  return out;
}
function approachAct(n, kind) {
  return mkAct({
    kind: 'wait',
    label: kind === 'boss' ? 'Coming for you' : 'Coming over',
    icon: 'people',
    dur: null,
    anim: 'idle',
    approach: kind,
    until: (c, a) => !!a.done,
    onStart: (c, a) => {
      a.ph = 'come';
      a.rp = 99;
      a.bt = 0;
      a.next = 0;
      a.li = 0;
      a.lastT = G.t;
      a.lines = approachLines(c, kind);
    },
    onTick: (c, a, dt) => approachStep(c, a, dt, kind),
  });
}
function approachEnd(c, a, line) {
  if (line && c.shown > 0.4) ui.say(c, pName(line), 2.4);
  a.done = true;
  c.path = null;
  c.moving = false;
  c.run = false;
  c.thinkCd = 0;
  if (G.approach === c.id) G.approach = null;
  // a stranger was only passing through: on out of town, the nearer way
  if (c.def.stranger) {
    const e = EDGES.W.concat(EDGES.E).sort((p, q) => Math.hypot(p[0] - c.x, p[1] - c.z) - Math.hypot(q[0] - c.x, q[1] - c.z));
    enqueue(c, goAct(e[0], { label: 'Walking' }));
  }
}
function approachStep(c, a, dt, kind) {
  const P = PLAYER,
    A = APPROACH,
    L = APPROACH_LINES;
  if (a.done) return;
  // you talked to them yourself in the meantime (their act stood still while you did): that was the chat
  if (G.t - a.lastT > 1 && a.ph !== 'follow') return approachEnd(c, a, null);
  a.lastT = G.t;
  if (approachQuiet() || !c.onMap) return approachEnd(c, a, null);
  const d = Math.hypot(P.x - c.x, P.z - c.z),
    bd = dt * BODY;
  a.bt += bd;
  if (a.ph === 'come') {
    if (!a.called && npcSeesPlayer(c, A.near)) {
      a.called = true;
      ui.say(c, pName(pick(L.call[kind])), 2.4);
      ui.bubble(c, kind === 'probe' || kind === 'warn' ? 'eye' : 'exclaim', 'speech', 2.2);
      if (kind === 'boss') audio.sting('awkward');
    }
    if (a.bt > A.give || d > A.near + 6) return approachEnd(c, a, kind === 'drunk' ? '…Where’d he go?' : null);
    if (d < A.reach) {
      a.ph = 'talk';
      a.bt = 0;
      a.next = 0.6;
      c.path = null;
      c.moving = false;
      return;
    }
    a.rp += dt;
    if (a.rp > 0.8 || !c.path || c.pi >= c.path.length) {
      a.rp = 0;
      const t = nearestWalkable(P.x, P.z, c, 2);
      if (!t || !setPath(c, t[0], t[1])) return approachEnd(c, a, null);
    }
    c.run = d > A.runAt && kind !== 'probe' && kind !== 'drunk';
    followPath(c, dt);
    c.anim = 'idle';
    return;
  }
  if (a.ph === 'talk') {
    c.path = null;
    c.moving = false;
    c.tdir = Math.atan2(P.x - c.x, P.z - c.z);
    c.anim = kind === 'boss' ? 'yell' : 'talk';
    if (d > A.reach + A.walkOff) {
      // you walked off on them
      if (kind === 'chat') addSus(c, A.rude);
      if (kind === 'boss') G.workBar = Math.max(1, G.workBar - A.bossCost);
      const bye = L.rude[kind] || L.rude.chat;
      if (kind === 'warn' || kind === 'drunk') {
        ui.say(c, pName(pick(bye)), 2.4);
        a.ph = 'follow';
        a.until = G.t + rand(A.follow[0], A.follow[1]);
        return;
      }
      return approachEnd(c, a, pick(bye));
    }
    if (a.bt < a.next) return;
    const l = a.lines[a.li++];
    if (l == null) {
      if (kind === 'warn' || kind === 'drunk') {
        a.ph = 'follow';
        a.until = G.t + rand(A.follow[0], A.follow[1]);
        if (kind === 'warn') noteOnce(c, 'Came up to you: leave it alone. Then followed you about.', { by: 'you' });
        return;
      }
      return approachEnd(c, a, null);
    }
    if (typeof l === 'function') l();
    else ui.say(c, pName(l), 3.4);
    if (kind === 'boss') ui.bubble(c, 'exclaim', 'speech', 2);
    a.next = a.bt + A.gap;
    return;
  }
  // following you about, a few steps behind: stops when you do, stares when you turn round
  if (G.t > a.until || d > A.near + 8) return approachEnd(c, a, kind === 'drunk' ? pick(L.drunk.bye) : null);
  c.anim = 'idle';
  if (d < A.back) {
    c.path = null;
    c.moving = false;
    c.tdir = Math.atan2(P.x - c.x, P.z - c.z);
    const facing = Math.abs(angDiff(P.dir, Math.atan2(c.x - P.x, c.z - P.z))) < 0.6;
    if (facing && G.t >= (a.stareCd || 0)) {
      a.stareCd = G.t + 25;
      if (kind === 'drunk') ui.say(c, pick(L.drunk.mid), 3);
      else ui.bubble(c, 'dots', 'speech', 2.4);
    }
    return;
  }
  a.rp += dt;
  if (a.rp > 0.8 || !c.path || c.pi >= c.path.length) {
    a.rp = 0;
    const t = nearestWalkable(P.x, P.z, c, 3);
    if (!t || !setPath(c, t[0], t[1])) return approachEnd(c, a, null);
  }
  c.run = d > A.runAt + 2 && kind !== 'drunk';
  followPath(c, dt);
}
