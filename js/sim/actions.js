//@ sim/actions — The action queue shared by player and NPCs
//@ Defines: ACT_ID, SIM_SPD, mkAct, TUCK, objSlots, chooseSlot, enqueue, hardReset, cancelAll, finishAct, runAct, SIT_TALK, talkSeat, talkApproach, STEP_MAX, lineFree, …
//@ Uses:    core/util, data/tuning, ui/interface, sim/core, world/paths, sim/movement, world/objects, sim/seat-moves, player/needs, town/suspicion
//@ (header made by tools/map.js; stripped by build.py)
// ───────────────────────── actions (shared by player and NPCs)
let ACT_ID = 0;
let SIM_SPD = SPEEDS[1]; // game minutes per real second right now
function mkAct(o) {
  return Object.assign(
    { id: ++ACT_ID, stage: 'init', t: 0, waitT: 0, icon: 'dots', label: '…', interruptible: true },
    o,
  );
}
// Chairs are pushed in toward the desk or table they face, so the floor behind them stays a lane you can walk.
const TUCK = { chair_office: 0.2, chair: 0.16 };
const tuckOf = (o) => TUCK[o.type] || 0;
function objSlots(o) {
  if (o._slots) return o._slots;
  const t = o.t,
    f = DIRS[o.face],
    ang = Math.atan2(f[0], f[1]);
  const fps = [];
  for (let z = o.z; z < o.z + o.h; z++) for (let x = o.x; x < o.x + o.w; x++) fps.push([x, z]);
  const neigh = (list) => {
    const out = [];
    for (const [x, z] of list)
      for (const [dx, dz] of [
        [0, 1],
        [0, -1],
        [1, 0],
        [-1, 0],
      ]) {
        const ax = x + dx,
          az = z + dz;
        if (!objCovers(o, ax, az) && !out.some((q) => q[0] === ax && q[1] === az)) out.push([ax, az]);
      }
    return out;
  };
  const slots = [];
  if (t.kind === 'sit') {
    for (const [x, z] of fps) {
      const cands = [[x + f[0], z + f[1]], ...neigh([[x, z]]).filter((q) => !(q[0] === x + f[0] && q[1] === z + f[1]))];
      const k = tuckOf(o) - 0.06;
      slots.push({
        px: x + 0.5 + f[0] * k,
        pz: z + 0.5 + f[1] * k,
        y: 0,
        seatY: t.seatY,
        dir: ang,
        pose: 'sit',
        cands,
      });
    }
  } else if (t.kind === 'lie') {
    slots.push({ px: o.cx + f[0] * 0.92, pz: o.cz + f[1] * 0.92, y: 0, dir: ang, pose: 'lie', cands: neigh(fps) });
  } else if (t.kind === 'in') {
    slots.push({
      px: o.cx,
      pz: o.cz,
      y: 0.1,
      dir: ang,
      pose: 'stand',
      cands: fps.map(([x, z]) => [x + f[0], z + f[1]]).filter(([x, z]) => !objCovers(o, x, z)),
    });
  } else {
    for (const [x, z] of fps) {
      const ax = x + f[0],
        az = z + f[1];
      if (objCovers(o, ax, az)) continue;
      slots.push({
        px: ax + 0.5,
        pz: az + 0.5,
        y: 0,
        dir: ang + Math.PI,
        pose: 'stand',
        cands: [[ax, az]],
        stand: true,
      });
    }
    if (!slots.length)
      for (const [ax, az] of neigh(fps))
        slots.push({
          px: ax + 0.5,
          pz: az + 0.5,
          y: 0,
          dir: Math.atan2(o.cx - ax - 0.5, o.cz - az - 0.5),
          pose: 'stand',
          cands: [[ax, az]],
          stand: true,
        });
  }
  slots.forEach((s, k) => (s.k = k));
  o._slots = slots;
  o.users = slots.map(() => null);
  return slots;
}
function chooseSlot(c, o, prefer) {
  if (o.wrecked) return null; // thrown and smashed: nothing to sit on till it's put back
  const slots = objSlots(o);
  let best = null,
    bd = 1e9;
  for (const s of slots) {
    if (prefer != null && s.k !== prefer) continue;
    const u = o.users[s.k];
    if (u && u !== c) continue;
    for (const [ax, az] of s.cands) {
      if (!walkable(ax, az, c)) continue;
      const d = Math.hypot(ax + 0.5 - c.x, az + 0.5 - c.z);
      if (d < bd) {
        bd = d;
        best = { slot: s, app: [ax, az] };
      }
    }
  }
  return best;
}
function enqueue(c, acts, front) {
  acts = Array.isArray(acts) ? acts : [acts];
  for (const a of acts) {
    a.actor = c;
    if (front) c.queue.unshift(a);
    else c.queue.push(a);
  }
  const cur = c.queue[0];
  if (!front && cur && acts.indexOf(cur) < 0 && cur.long && cur.stage !== 'init') cur.cancel = true;
}
// drop everything at once (fainting, panic, being caught)
function hardReset(c) {
  for (const a of c.queue) {
    if (a.slot && a.obj && a.obj.users[a.slot.k] === c) a.obj.users[a.slot.k] = null;
    if (a.kind === 'talk' && a.target && a.target.engaged === c) a.target.engaged = null;
    if (a.onEnd)
      try {
        a.onEnd(c, a, false);
      } catch (e) {
        /* ignore */
      }
  }
  c.queue = [];
  c.path = null;
  c.moving = false;
  c.pose = 'stand';
  c.y = 0;
  c.vault = null;
  if (c.fx) c.fx.prop = null;
  c.run = false;
  c.seatTr = null;
}
function cancelAll(c) {
  for (const a of c.queue) a.cancel = true;
  c.queue = c.queue.filter((a) => a.stage !== 'init' || a === c.queue[0]);
}
function finishAct(c, a, ok, why) {
  if (a.slot && a.obj && a.obj.users[a.slot.k] === c) a.obj.users[a.slot.k] = null;
  if (c.seatTr && c.seatTr.a === a) c.seatTr = null;
  a.tr = null;
  if (a.kind === 'talk' && a.target && a.target.engaged === c) a.target.engaged = null;
  c.run = false;
  const i = c.queue.indexOf(a);
  if (i >= 0) c.queue.splice(i, 1);
  if (c.pose !== 'stand' && !a.keepPose) {
    c.pose = 'stand';
    c.y = 0;
  }
  if (a.onEnd) a.onEnd(c, a, ok, why);
  if (!ok && why && c.isPlayer && !a.cancel) {
    ui.bubble(c, 'question', 'thought', 1.6);
    ui.note('x', why, 'bad');
  }
}
function runAct(c, a, dt) {
  if (a.stage === 'init') {
    if (a.cancel) return finishAct(c, a, false);
    if (a.check) {
      const why = a.check(c, a);
      if (why) return finishAct(c, a, false, why);
    }
    c.run = !!a.run;
    if (a.kind === 'go') {
      if (c.isPlayer) return finishAct(c, a, false); // you walk yourself; nothing ever routes you anywhere
      if (!setPath(c, a.to[0], a.to[1])) return finishAct(c, a, false, 'No way there');
      a.stage = 'move';
      return;
    }
    if (a.kind === 'use' && c.isPlayer) return playerUseInit(c, a, dt);
    if (a.kind === 'talk' && c.isPlayer) {
      if (a.soc === 'gossip' && tooShaken()) {
        shakenNote();
        return finishAct(c, a, false);
      }
      const tg = a.target,
        d = Math.hypot(tg.x - c.x, tg.z - c.z);
      if (!tg.onMap) return finishAct(c, a, false, 'They left');
      if (d > CTRL.reachChar + CTRL.holdDist + 0.8) return finishAct(c, a, false, 'Too far');
      if (tg.engaged && tg.engaged !== c) return finishAct(c, a, false, 'Busy');
      if (!tg.isPlayer && !tg.fleeing && !tg.trueForm) {
        tg.engaged = c;
        tg.moving = false;
      }
      c.path = null;
      c.moving = false;
      talkSeat(c, a); // they're on a bench: you sit down beside them
      a.stage = 'enter';
      a.t = 0;
      a.from = [c.x, c.z];
      return;
    }
    if (a.kind === 'use') {
      const pk = chooseSlot(c, a.obj, a.prefer);
      if (!pk) {
        a.waitT += dt;
        c.anim = 'idle';
        if (!a.waitNoted) {
          a.waitNoted = true;
          const busy = objSlots(a.obj)[a.prefer || 0];
          if (c.isPlayer && busy) {
            const ap = busy.cands.find(([x, z]) => walkable(x, z, c));
            if (ap && Math.hypot(ap[0] + 0.5 - c.x, ap[1] + 0.5 - c.z) > 1) setPath(c, ap[0], ap[1]);
            ui.bubble(c, 'clock', 'thought', 2);
          }
        }
        if (c.path) followPath(c, dt);
        if (a.waitT > (a.maxWait || 40)) return finishAct(c, a, false, 'Occupied');
        return;
      }
      a.obj.users[pk.slot.k] = c;
      a.slot = pk.slot;
      a.app = pk.app;
      if (!setPath(c, a.app[0], a.app[1])) {
        a.obj.users[pk.slot.k] = null;
        return finishAct(c, a, false, 'Can’t reach');
      }
      a.stage = 'move';
      return;
    }
    if (a.kind === 'talk') {
      const tg = a.target;
      if (!tg.onMap) return finishAct(c, a, false, 'They left');
      // you walked up to them on purpose: a person within reach stops to hear you out instead of strolling off
      if (
        c.isPlayer &&
        !tg.engaged &&
        !tg.fleeing &&
        !tg.trueForm &&
        !tg.isPlayer &&
        Math.hypot(tg.x - c.x, tg.z - c.z) < CTRL.reachChar + CTRL.holdDist
      ) {
        tg.engaged = c;
        tg.moving = false;
      }
      if (!talkApproach(c, a)) return finishAct(c, a, false, 'Can’t reach');
      a.stage = 'move';
      return;
    }
    a.stage = 'run';
    a.t = 0;
    if (a.onStart) a.onStart(c, a);
    return;
  }
  if (a.stage === 'move') {
    if (a.cancel) {
      c.path = null;
      c.moving = false;
      return finishAct(c, a, false);
    }
    if (a.kind === 'talk') {
      a.rp = (a.rp || 0) + dt;
      const tg = a.target;
      if (!tg.onMap) {
        c.path = null;
        c.moving = false;
        return finishAct(c, a, false, 'They left');
      }
      if (a.rp > 1.5 && Math.hypot(tg.x - a.tgx, tg.z - a.tgz) > 1.2) {
        a.rp = 0;
        if (!talkApproach(c, a)) return finishAct(c, a, false, 'Lost them');
      }
      if (Math.hypot(tg.x - c.x, tg.z - c.z) < 1.25 && !tg.moving) {
        c.path = null;
        c.moving = false;
      }
    }
    if (followPath(c, dt)) {
      if (a.kind === 'go') return finishAct(c, a, true);
      if (a.kind === 'talk') {
        const tg = a.target;
        if (Math.hypot(tg.x - c.x, tg.z - c.z) > 1.8) {
          if (!talkApproach(c, a)) return finishAct(c, a, false, 'Lost them');
          return;
        }
        if (tg.engaged && tg.engaged !== c) return finishAct(c, a, false, 'Busy');
        tg.engaged = c;
      }
      a.stage = 'enter';
      a.t = 0;
      a.from = [c.x, c.z];
    }
    return;
  }
  if (a.stage === 'enter') {
    if (a.here) {
      // the player, right where they stand: turn to it and get on with it
      if (a.obj) c.tdir = angleToObj(c, a.obj);
      a.stage = 'run';
      a.t = 0;
      if (a.onStart) a.onStart(c, a);
      return;
    }
    a.t += dt;
    if (a.slot && a.slot.pose !== 'stand' && c.look) {
      // onto a seat or a bed: the steps, then down (see trBegin)
      const tr = a.tr || (a.tr = trBegin(c, a, false));
      c.seatTr = tr;
      tr.k = clamp(a.t / tr.D, 0, 1);
      trPlace(c, tr);
      if (tr.k >= tr.kPose && c.pose !== a.slot.pose) {
        c.pose = a.slot.pose;
        c.seatY = a.slot.seatY;
      }
      if (tr.k < 1) return;
      c.seatTr = null;
      a.tr = null;
      c.x = a.slot.px;
      c.z = a.slot.pz;
      c.y = a.slot.y;
      c.tdir = c.dir = a.slot.dir;
      c.pose = a.slot.pose;
      c.seatY = a.slot.seatY;
      c._pose = c.pose;
      c.poseAt = null; // already there: nothing left for the pose blend to ease
      a.stage = 'run';
      a.t = 0;
      if (a.onStart) a.onStart(c, a);
      return;
    }
    // into the shower and the like: a short eased step across. Timed in real seconds at normal speed so it reads as
    // a movement; on fast-forward it never holds anyone up for long.
    const D = a.slot ? a.enterD || (a.enterD = clamp(0.8 * SIM_SPD, 0.45, 2.2)) : 0.45;
    const k = clamp(a.t / D, 0, 1),
      e = k * k * (3 - 2 * k);
    if (a.slot) {
      c.x = lerp(a.from[0], a.slot.px, e);
      c.z = lerp(a.from[1], a.slot.pz, e);
      c.y = lerp(0, a.slot.y, e);
      c.tdir = a.slot.dir;
      if (k > 0.4 && a.slot.pose !== 'stand') {
        c.pose = a.slot.pose;
        c.seatY = a.slot.seatY;
      }
    } else if (a.kind === 'talk') c.tdir = Math.atan2(a.target.x - c.x, a.target.z - c.z);
    if (k >= 1) {
      a.stage = 'run';
      a.t = 0;
      if (a.onStart) a.onStart(c, a);
    }
    return;
  }
  if (a.stage === 'run') {
    if (a.cancel && a.interruptible !== false) {
      a.stage = 'exit';
      a.t = 0;
      return;
    }
    a.t += dt;
    c.anim = a.anim || 'use';
    if (a.kind === 'talk') {
      c.tdir = Math.atan2(a.target.x - c.x, a.target.z - c.z);
      if (a.slot && c.pose === 'sit') {
        const d = angDiff(a.slot.dir, c.tdir);
        if (Math.abs(d) > 0.9) c.tdir = a.slot.dir + Math.sign(d) * 0.9;
      } // seated: half-turned toward them, not sideways on the bench
      if (a.target.engaged !== c) {
        a.stage = 'exit';
        a.t = 0;
        return;
      }
    }
    if (a.fx && c.isPlayer) applyNeedFx(a.fx, dt);
    if (a.onTick) a.onTick(c, a, dt);
    if (a.stage !== 'run') return;
    const met =
      c.isPlayer && a.dur == null && !a.until && !a.sleep && a.need === 'stress' && a.t >= 10 && c.needs.stress <= 1; // calm again: the dial is full
    if ((a.dur != null && a.t >= a.dur) || (a.until && a.until(c, a)) || met) {
      a.ok = true;
      a.stage = 'exit';
      a.t = 0;
    }
    return;
  }
  if (a.stage === 'exit') {
    if (a.slot && !a.slot.stand && a.slot.pose !== 'stand' && c.look && (a.tr || c.pose === a.slot.pose)) {
      // up off it (see trBegin)
      a.t += dt;
      const tr = a.tr || (a.tr = trBegin(c, a, true));
      c.seatTr = tr;
      tr.k = clamp(a.t / tr.D, 0, 1);
      trPlace(c, tr);
      if (tr.k >= tr.kPose) c.pose = 'stand';
      if (tr.k < 1) return;
      c.seatTr = null;
      a.tr = null;
      c.x = a.app[0] + 0.5;
      c.z = a.app[1] + 0.5;
      c.pose = c._pose = 'stand';
      c.poseAt = null;
    } else if (a.slot && !a.slot.stand) {
      a.t += dt;
      const D = a.exitD || (a.exitD = clamp(0.65 * SIM_SPD, 0.4, 1.8)),
        k = clamp(a.t / D, 0, 1),
        e = k * k * (3 - 2 * k);
      if (k > 0.12) c.pose = 'stand';
      c.x = lerp(a.slot.px, a.app[0] + 0.5, e);
      c.z = lerp(a.slot.pz, a.app[1] + 0.5, e);
      c.y = lerp(a.slot.y, 0, e);
      if (k < 1) return;
    }
    c.pose = 'stand';
    c.y = 0;
    return finishAct(c, a, !!a.ok);
  }
}
// talking to someone sitting on a bench or a sofa: you take the free seat beside them. Not to confront anyone.
const SIT_TALK = new Set(['chat', 'gossip', 'lenny', 'feed']);
function talkSeat(c, a) {
  const tg = a.target;
  if (!SIT_TALK.has(a.soc) || tg.isPlayer || tg.pose !== 'sit' || tg.trueForm || tg.fleeing || tg.riteBy) return;
  const ta = tg.queue[0],
    o = ta && ta.obj && ta.slot ? ta.obj : null;
  if (!o || (o.type !== 'bench' && o.type !== 'sofa') || o.users[ta.slot.k] !== tg) return;
  let best = null,
    bd = 2.6;
  for (const sl of objSlots(o)) {
    if (o.users[sl.k]) continue;
    const d = Math.hypot(sl.px - c.x, sl.pz - c.z);
    if (d < bd) {
      bd = d;
      best = sl;
    }
  }
  if (!best) return;
  o.users[best.k] = c;
  a.obj = o;
  a.slot = best;
  a.app = [Math.floor(c.x), Math.floor(c.z)];
}
function talkApproach(c, a) {
  const tg = a.target;
  a.tgx = tg.x;
  a.tgz = tg.z;
  const tx = Math.floor(tg.x),
    tz = Math.floor(tg.z);
  let best = null,
    bd = 1e9;
  for (let dz = -1; dz <= 1; dz++)
    for (let dx = -1; dx <= 1; dx++) {
      if (!dx && !dz) continue;
      const x = tx + dx,
        z = tz + dz;
      if (!walkable(x, z, c)) continue;
      if (
        CHARS.some((o) => o !== c && o !== tg && o.onMap && Math.floor(o.x) === x && Math.floor(o.z) === z && !o.moving)
      )
        continue;
      const d = Math.hypot(x + 0.5 - c.x, z + 0.5 - c.z) + (dx && dz ? 0.4 : 0);
      if (d < bd) {
        bd = d;
        best = [x, z];
      }
    }
  if (!best) {
    const nw = nearestWalkable(tg.x, tg.z, c, 2);
    if (!nw) return false;
    best = nw;
  }
  return setPath(c, best[0], best[1]);
}
// ── the player never pathfinds. E acts from where you stand; a seat or a bed takes one short straight step,
// and so does the next thing in a chain (fridge → stove → table). Never a route around anything.
const STEP_MAX = 4.5;
function lineFree(c, ax, az, bx, bz) {
  const d = Math.hypot(bx - ax, bz - az),
    n = Math.max(1, Math.ceil(d / 0.2));
  for (let i = 1; i <= n; i++) {
    const x = ax + ((bx - ax) * i) / n,
      z = az + ((bz - az) * i) / n,
      cx = Math.floor(x),
      cz = Math.floor(z);
    if (cx === Math.floor(ax) && cz === Math.floor(az)) continue;
    if (!walkable(cx, cz, c)) return false;
  }
  return true;
}
const objEdgeDist = (o, x, z) => Math.hypot(clamp(x, o.x, o.x + o.w) - x, clamp(z, o.z, o.z + o.h) - z);
function angleToObj(c, o) {
  const qx = clamp(c.x, o.x + 0.1, o.x + o.w - 0.1),
    qz = clamp(c.z, o.z + 0.1, o.z + o.h - 0.1);
  return Math.hypot(qx - c.x, qz - c.z) > 0.05 ? Math.atan2(qx - c.x, qz - c.z) : Math.atan2(o.cx - c.x, o.cz - c.z);
}
// close enough to act on, by the same measure E uses to pick it
function inReach(f) {
  const P = PLAYER;
  if (!f || !P.onMap) return false;
  if (f.char) return Math.hypot(f.char.x - P.x, f.char.z - P.z) <= CTRL.reachChar + CTRL.holdDist;
  if (f.obj) return objEdgeDist(f.obj, P.x, P.z) <= CTRL.reachObj + CTRL.holdDist;
  if (f.item) return Math.hypot(f.item.x - P.x, f.item.z - P.z) <= CTRL.reachItem + CTRL.holdDist;
  return true;
}
function playerUseInit(c, a, dt) {
  const o = a.obj,
    slots = objSlots(o);
  let busy = false,
    best = null,
    bd = 1e9;
  for (const s of slots) {
    if (a.prefer != null && s.k !== a.prefer) continue;
    const u = o.users[s.k];
    if (u && u !== c) {
      busy = true;
      continue;
    }
    for (const [ax, az] of s.cands) {
      if (!walkable(ax, az, c)) continue;
      const tx = ax + 0.5,
        tz = az + 0.5,
        d = Math.hypot(tx - c.x, tz - c.z);
      if (d > STEP_MAX || (d > 0.35 && !lineFree(c, c.x, c.z, tx, tz))) continue;
      if (d < bd) {
        bd = d;
        best = { slot: s, app: [ax, az] };
      }
    }
  }
  const standing = slots.length && slots.every((s) => s.stand);
  const near = objEdgeDist(o, c.x, c.z) <= CTRL.reachObj + CTRL.holdDist + 0.3;
  if (standing && near && !busy) {
    // a counter, a fridge, a shelf: right here
    const s = best ? best.slot : slots.find((q) => !o.users[q.k] || o.users[q.k] === c);
    if (s) {
      o.users[s.k] = c;
      a.slot = s;
    }
    a.here = true;
    a.stage = 'enter';
    return;
  }
  if (!best) {
    if (busy && !a.anywhere) {
      // someone's on it: wait where you are
      a.waitT += dt;
      c.anim = 'idle';
      if (!a.waitNoted) {
        a.waitNoted = true;
        ui.bubble(c, 'clock', 'thought', 2);
      }
      if (a.waitT > (a.maxWait || 40)) return finishAct(c, a, false, 'Occupied');
      return;
    }
    if (a.anywhere || (standing && near)) {
      a.here = true;
      a.stage = 'enter';
      return;
    } // eat standing up, if the chair's out of the way
    return finishAct(c, a, false, 'Too far');
  }
  o.users[best.slot.k] = c;
  a.slot = best.slot;
  a.app = best.app;
  if (bd <= 0.35) {
    a.stage = 'enter';
    a.t = 0;
    a.from = [c.x, c.z];
    return;
  }
  c.path = [best.app];
  c.pi = 0;
  c.moving = true; // one straight step, not a route
  a.stage = 'move';
}
// You stop someone to talk: the moment your menu opens on them they turn to you and wait while you choose.
// Not IT, and not anyone out to get you right now.
const MENU_WAIT = 20; // game minutes they'll stand there before they shrug and move on
function hostileToYou(n) {
  const a = n.queue[0];
  return !!(
    n.trueForm ||
    n.exposed ||
    n.hunting ||
    n.breakIn ||
    n.raiding ||
    n.surrendered ||
    (a && a.chase === PLAYER) ||
    (G.control && (G.control.by === n.id || G.control.who === n.id))
  );
}
function waitsForYou(n) {
  return (
    !!n &&
    !n.isPlayer &&
    n.onMap &&
    !hostileToYou(n) &&
    !n.fleeing &&
    !n.under &&
    !n.trapped &&
    !n.riteBy &&
    !n.trance &&
    !n.inRite &&
    !(n.hideUntil > G.t) &&
    !asleep(n)
  );
}
function holdForMenu(n) {
  UI.menuAt = G.t;
  if (!waitsForYou(n)) return;
  const a = n.queue[0];
  if (a && a.kind === 'talk' && a.target && !a.target.isPlayer && a.target.engaged === n) {
    a.target.engaged = null;
    a.cancel = true;
  } // you cut in: their chat is over
  n.engaged = PLAYER;
  n.moving = false;
}
const menuHolds = (c) =>
  !!(UI.menuOpen && UI.menuAnchor && UI.menuAnchor.char === c && G.t - (UI.menuAt || 0) < MENU_WAIT);
function stepChar(c, dt) {
  if (c.engaged && !c.seatTr) {
    // half sat down (or up): that finishes first
    const e = c.engaged,
      q = e.queue || [],
      i = q.findIndex((a) => a.target === c && !a.cancel);
    const talking = e.onMap && (i === 0 || (i === 1 && q[0].cancel)); // talking to them, or just getting up to
    const menu = e.isPlayer && menuHolds(c);
    if ((talking || menu) && !(e.isPlayer && hostileToYou(c))) {
      c.tdir = Math.atan2(e.x - c.x, e.z - c.z);
      if (c.pose === 'sit' && Math.abs(angDiff(c.dir, c.tdir)) > 1.2)
        c.tdir = c.dir + Math.sign(angDiff(c.dir, c.tdir)) * 0.6;
      c.anim = 'listen';
      c.moving = false;
      return;
    }
    if (e.isPlayer && UI.menuOpen && UI.menuAnchor && UI.menuAnchor.char === c) ui.bubble(c, 'question', 'speech', 1.6); // waited long enough
    c.engaged = null;
  }
  const a = c.queue[0];
  if (!a) {
    c.anim = 'idle';
    c.moving = false;
    return;
  }
  runAct(c, a, dt);
}
