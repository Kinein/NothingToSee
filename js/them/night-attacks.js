//@ them/night-attacks — Night attacks
//@ Defines: planNight, attackTargets, startAttack, raidTick, endAttack, STAGE_HOOKS_BEATEN, removeVictim, morningFound, plantMark, dawnTick, nightTick
//@ Uses:    sim/core, core/util, sim/actions, them/plan, world/grid, town/fleeing, play/items, them/awareness, town/cast, town/npc-update, …
//@ (header made by tools/map.js; stripped by build.py)
// ───────────── night attacks. Most nights nothing happens; on an attack night one of THEM picks one target.
function planNight() {
  G.attack = null;
  if (!theyStir()) return; // the first night: nothing
  if (G.attackFoe && alive().length) {
    G.attack = {
      at: (dayNo() - 1) * 1440 + Math.round(rand(23, 25.5) * 60),
      phase: 'wait',
      forceTarget: G.attackFoe,
      kill: true,
    };
    G.attackFoe = null;
    return;
  }
  if (!alive().length || !(G.nightPlan === dayNo() ? G.nightYes : chance(ATTACK_ODDS[G.stage] || 0))) return;
  G.attack = { at: (dayNo() - 1) * 1440 + Math.round(rand(22.7, 26.4) * 60), phase: 'wait' };
}
function attackTargets() {
  const out = [],
    P = PLAYER;
  for (const s of suspects())
    if (!s.isThem && !s.exposed && !s.gone && s.onMap && atHome(s)) out.push([s, 1 + Math.max(0, s.rel) / 20]);
  if (!theyOut()) {
    if (P.onMap && mayHuntYou()) out.push([P, 2 + G.aware / 40]);
    return out;
  } // early: only people behind their own doors (and you)
  const L = NPC.lenny;
  if (L.onMap) out.push([L, 0.8]);
  for (const c of CHARS)
    if (c.def.stranger && !c.def.officer && c.onMap && !c.fleeing) out.push([c, G.stage >= 4 ? 2 : 1]);
  if (P.onMap && mayHuntYou()) out.push([P, 2 + G.aware / 40]);
  return out;
}
function startAttack(A) {
  const by = pick(
    alive().filter((n) => n.onMap && atHome(n) && !n.trueForm && !n.hunting && !n.fleeing && !n.hideUntil && !n.inRite),
  );
  if (!by) {
    G.attack = null;
    return;
  }
  let ts = attackTargets();
  if (A.forceYou && PLAYER.onMap) ts = [[PLAYER, 1]];
  if (A.forceTarget && CHARS.find((c) => c.id === A.forceTarget && c.onMap))
    ts = [[CHARS.find((c) => c.id === A.forceTarget), 1]];
  if (!A.forceYou && !A.forceTarget && !ts.some(([c]) => !c.isPlayer) && theyOut() && chance(0.6)) {
    const s = spawnStranger('drunk');
    if (s) ts.push([s, 1]);
  }
  if (!ts.length) {
    G.attack = null;
    return;
  }
  let tot = ts.reduce((a, [, w]) => a + w, 0),
    r = Math.random() * tot,
    tg = ts[0][0];
  for (const [c, w] of ts) {
    r -= w;
    if (r <= 0) {
      tg = c;
      break;
    }
  }
  Object.assign(A, {
    phase: 'go',
    by: by.id,
    target: tg.isPlayer ? 'player' : tg.id,
    t0: G.t,
    broken: false,
    seen: false,
  });
  hardReset(by);
  by.breakIn = true;
  by.raiding = A;
  const giveUp = (c) => {
    c.breakIn = false;
    c.raiding = null;
    if (G.attack === A) G.attack = null;
    leaveMap(c);
  };
  const toRaid = (c) => {
    if (G.attack !== A) return;
    if (trueForm(c, 'raid')) {
      c.trueForm.mode = 'raid';
      c.trueForm.long = 40;
    } else giveUp(c);
  };
  if (tg.isPlayer && inRoomSet(tg, (r) => r.home))
    return enqueue(
      by,
      goAct([12, 21], {
        label: '…',
        onEnd: (c, a, ok) => {
          if (ok) toRaid(c);
          else {
            c.breakIn = false;
            c.raiding = null;
            if (G.attack === A) G.attack = null;
          }
        },
      }),
    );
  // early in the week it changes only once it's in the room with them, behind their door
  const inside = (c) => tg.isPlayer || theyOut() || (!!roomAt(c.x, c.z) && roomAt(c.x, c.z) === roomAt(tg.x, tg.z));
  enqueue(
    by,
    chaseAct(tg, {
      label: '…',
      walk: true,
      giveUp: 90,
      reach: tg.isPlayer ? 5 : 4.5,
      reachOk: inside,
      onCatch: (c) => {
        if (!tg.isPlayer && tg.def && !tg.def.stranger) echo('stalk', { who: tg.id, x: tg.x, z: tg.z });
        toRaid(c);
      },
      onLose: (c) => {
        c.breakIn = false;
        c.raiding = null;
        if (G.attack === A) G.attack = null;
        leaveMap(c);
      },
    }),
  );
}
// the raid itself: reach the victim, the struggle, the light going out, then home
function raidTick(n, dt) {
  const A = n.raiding,
    tf = n.trueForm,
    P = PLAYER;
  const tg = A && (A.target === 'player' ? P : NPC[A.target] || CHARS.find((c) => c.id === A.target));
  if (!A || !tg || G.attack !== A) {
    tf.mode = 'flee';
    return flee(n);
  }
  const d = Math.hypot(tg.x - n.x, tg.z - n.z),
    dp = Math.hypot(P.x - n.x, P.z - n.z);
  // you arrived: it breaks off, or at high awareness it turns on you
  if (!tg.isPlayer && P.onMap && dp < 6 && G.t - (tf.seenIn || -99) < 1 && !A.broken) {
    A.broken = true;
    A.seen = true;
    addStress(12);
    if (mayHuntYou() && chance(0.6)) {
      tf.mode = 'attack';
      tf.t0 = G.t;
      tf.lastSeen = G.t;
      n.breakIn = false;
      hardReset(n);
      return;
    }
    endAttack(A, tg, true);
    if (G.faction === 'aliens') {
      R.flash = Math.max(R.flash, 0.5);
      hardReset(n);
      hideAway(n, true);
      return;
    }
    tf.mode = 'flee';
    return flee(n);
  }
  if (tg.isPlayer) {
    // a raid on you: your door, or you
    const home = inRoomSet(P, (r) => r.home);
    tf.mode = 'attack';
    tf.t0 = G.t;
    tf.lastSeen = G.t;
    tf.raidYou = home;
    n.breakIn = false;
    G.attack = null;
    if (G.sleeping) {
      const a = P.queue[0];
      if (a) a.cancel = true;
      ui.note('bed', 'Something is in your flat', 'bad');
    }
    return;
  }
  if (!A.struggle) {
    if (d < 1.4) {
      A.struggle = G.t;
      hardReset(tg);
      tg.fleeing = null;
      tg.pose = 'floorlie';
      enqueue(
        tg,
        waitAct({
          label: '…',
          dur: null,
          anim: 'shake',
          interruptible: false,
          until: () => G.attack !== A || !A.struggle,
        }),
      );
      const h = HOUSE_OF[tg.id];
      if (h) {
        G.houseDark = G.houseDark || {};
        G.houseDark[h.id] = G.t + 8 * 60;
      }
      if (tg.id === 'agnes') G.agnesDark = G.t + 8 * 60;
      return;
    }
    if (!n.path || n.pi >= n.path.length || (tf.rp = (tf.rp || 0) - dt) <= 0) {
      tf.rp = 0.6;
      const t = nearestWalkable(tg.x, tg.z, n, 2);
      if (t) setPath(n, t[0], t[1]);
    }
    n.run = true;
    followPath(n, dt);
    return;
  }
  n.path = null;
  n.moving = false;
  n.tdir = Math.atan2(tg.x - n.x, tg.z - n.z);
  n.tell.feed = Math.sin(G.t * 3) > 0;
  n.tell.lunge = !n.tell.feed;
  if (P.onMap && visAt(n.x, n.z) > 0.5 && !A.seen) {
    A.seen = true;
    addStress(12);
  }
  if (G.t - A.struggle > 8) {
    n.tell.feed = n.tell.lunge = false;
    endAttack(A, tg, false);
    tf.mode = 'flee';
    flee(n);
  }
}
// what's left of the victim
function endAttack(A, tg, broken) {
  if (G.attack !== A) return;
  G.attack = null;
  const by = NPC[A.by];
  if (by) {
    by.breakIn = false;
    by.raiding = null;
  }
  if (!tg || tg.isPlayer) return;
  if (tg.queue[0] && tg.queue[0].label === '…') tg.queue[0].cancel = true;
  tg.pose = 'stand';
  const s = G.stage,
    F = G.faction,
    named = !!(tg.def && !tg.def.stranger);
  if (broken) {
    // you got there in time: frightened, nothing more
    if (named) {
      tg.frightUntil = G.t + 2 * 1440;
      tg.danger = Math.max(tg.danger, 40);
      ui.say(tg, pick(['Did you SEE it?', 'Oh God. Oh God.']), 3);
    }
    echo('attack', { x: tg.x, z: tg.z, who: by && A.seen ? null : null, broken: true });
    return;
  }
  const spot = [tg.x, tg.z],
    hv = named && HOUSE_OF[tg.id];
  if (hv) {
    (G.smell = G.smell || {})[hv.id] = { k: F, until: G.t + rand(2, 3) * 1440 };
    if (chance(0.5))
      addItem({
        kind: FACTIONS[F].item,
        x: hv.out[0] + rand(0.25, 0.75),
        z: hv.out[1] + rand(0.25, 0.75),
        rot: rand(0, TAU),
        by: A.by,
        room: null,
        at: G.t,
      });
  }
  if (!named) {
    // nobody misses a stranger
    tg.onMap = false;
    tg.queue = [];
    addItem({
      kind: F === 'aliens' ? 'scorch' : 'stain',
      x: spot[0],
      z: spot[1],
      rot: rand(0, TAU),
      by: A.by,
      room: null,
      at: G.t,
    });
    opDone(F === 'aliens' ? 'take' : 'kill');
    echo('victim', { x: spot[0], z: spot[1], stranger: true });
    return;
  }
  const kill =
    (A.kill || s >= 3) && tg.id !== 'lenny' && G.victims.length < 2 && (A.kill || chance(F === 'aliens' ? 0.18 : 0.35));
  if (kill) {
    removeVictim(tg, F === 'aliens' ? 'taken' : 'killed', spot);
    opDone(F === 'aliens' ? 'take' : 'kill');
    return;
  }
  const next = dayNo(G.t + 6 * 60);
  tg.frightUntil = G.t + 2 * 1440;
  if (F === 'aliens') {
    tg.lostDay = next;
    if (chance(0.3)) tg.dawnStand = next;
    if (chance(0.35)) G.chipped[tg.id] = 1;
    opDone('take');
  } else {
    tg.limpDay = next;
    if (F === 'lizards') for (const f of STAGE_HOOKS_BEATEN) f(tg, A.by);
    opDone('attack');
  }
  echo('attack', { x: spot[0], z: spot[1], who: tg.id, victim: true });
}
const STAGE_HOOKS_BEATEN = [(tg, by) => buy(tg, by, false)];
function removeVictim(n, how, spot) {
  n.gone = how;
  G.victims.push(n.id);
  hardReset(n);
  n.onMap = false;
  n.fleeing = null;
  makePlan(n);
  if (spot)
    addItem({
      kind: G.faction === 'aliens' ? 'scorch' : 'stain',
      x: spot[0],
      z: spot[1],
      rot: rand(0, TAU),
      by: null,
      room: (roomAt(spot[0], spot[1]) || {}).key || null,
      at: G.t,
    });
  G.found = { id: n.id, how, day: dayNo(G.t + 6 * 60) };
  echo('victim', { x: spot ? spot[0] : n.x, z: spot ? spot[1] : n.z, who: n.id });
}
// in the morning: the office finds out, the paper says something, the taken stand in the street
function morningFound() {
  const f = G.found;
  if (!f || f.day !== dayNo()) return;
  G.found = null;
  const n = NPC[f.id];
  if (!n) return;
  addNote(n, f.how === 'taken' ? 'Gone. Nobody saw them leave.' : 'Gone. They found what was left.', { by: 'you' });
  if (isOfficePlan(n) && f.how !== 'taken') {
    addItem({ kind: 'tape', x: 10.5, z: 6.5, rot: 0, by: null, room: null, at: G.t });
    addItem({ kind: 'stain', x: 10.3, z: 3.6, rot: rand(0, TAU), by: null, room: 'wc', at: G.t });
    G.tapeUntil = G.t + 2 * 1440;
  }
  setTimeout(() => {
    ui.note('people', n.short + ' is gone', 'bad');
    ui.card({ char: n, img: getPortrait(n), stamp: 'GONE', before: 0, after: 0, gone: true });
    audio.sting('whisper');
  }, 2500);
}
// before dawn one of THEM leaves a mark by somebody else's things: a desk, a doorstep. Snap the wrong person beside it
// and you'll be holding a proof against an innocent.
function plantMark() {
  const m = pick(covert().filter((n) => !n.slain));
  if (!m || !chance(0.6)) return;
  const o = pick(suspects().filter((x) => !x.isThem && !x.gone && !x.exposed && x.id !== 'lenny'));
  if (!o) return;
  const desk = OBJ.find((ob) => DESK_OWNER[ob.id] === o.id),
    ch = desk && OBJ_BY_ID[o.def.chair];
  let at = ch ? objSlots(ch)[0].cands.find(([x, z]) => walkable(x, z)) : null;
  if (!at)
    at = o.id === 'agnes' ? HIDEOUTS.agnes : o.id === 'vic' ? [34, 9] : HOUSE_OF[o.id] ? HOUSE_OF[o.id].door : null;
  if (!at) return;
  const t = nearestWalkable(at[0] + 0.5, at[1] + 0.5, null, 2);
  if (!t) return;
  const kind = FACTIONS[G.faction].item,
    x = t[0] + rand(0.25, 0.75),
    z = t[1] + rand(0.25, 0.75);
  if (G.items.some((it) => it.by && Math.hypot(it.x - x, it.z - z) < 2)) return;
  addItem({ kind, x, z, rot: rand(0, TAU), by: m.id, room: (roomAt(x, z) || {}).key || null, at: G.t, planted: o.id });
}
function dawnTick() {
  const d = dayNo();
  if (G.started && !G.over && alive().length && theyStir()) plantMark();
  for (const n of suspects())
    if (n.dawnStand === d && n.onMap && !n.gone) {
      n.dawnStand = 0;
      hardReset(n);
      placeChar(n, irand(8, 40), chance(0.5) ? 13 : 18);
      enqueue(n, waitAct({ label: '…', dur: 90, anim: 'lookup', interruptible: false }));
    }
}
function nightTick(dt) {
  const A = G.attack;
  if (!A || G.over) return;
  if (A.phase === 'wait') {
    if (G.t >= A.at) startAttack(A);
    return;
  }
  const n = NPC[A.by];
  if (!n || n.slain || (!n.onMap && !n.trueForm) || G.t - A.t0 > 120) {
    if (n) {
      n.breakIn = false;
      n.raiding = null;
    }
    G.attack = null;
  }
}
