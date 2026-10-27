//@ chase/fbi — The grey cars: the FBI takes one that gave up
//@ Defines: FBI, FBI_LOOK, CUFFED_POSE, setupAgents, FBI_MESH, fbiStart, fbiCarV, fbiParked, fbiApproach, fbiCuff, fbiEscort, fbiFollow, fbiEscortTick, fbiLoad, fbiBolt, fbiRecatch, …
//@ Uses:    sim/core, sim/actions, horror/layer, audio/sound, world/paths, town/npc-update, core/util, town/fleeing, sim/movement, world/grid, …
//@ (header made by tools/map.js; stripped by build.py)
// ───────────────────────── the grey cars: the FBI comes for one that gave up ─────────────────────────
// A grey car comes down Main street and pulls up. Two men in grey suits walk to it, cuff it, and walk it to the car.
// It may still run when their hands are on it, unless you're standing over it. Then it's a chase: THEY run it down, or you do.
const FBI = { ops: [] };
const FBI_LOOK = {
  skin: 0xd0a98a,
  hair: 'short',
  hairCol: 0x1c1c1e,
  top: 0x3c4046,
  bottom: 0x2a2d32,
  h: 1.05,
  w: 1.06,
  sleeves: 1,
  outfit: 'tie',
  acc: 0x0f1113,
  shoes: 0x0a0a0a,
};
const CUFFED_POSE = (T) => {
  T.uaL = T.uaR = 0.5;
  T.aoL = T.aoR = 0.12;
  T.faL = T.faR = -1.1;
  T.hp = 0.45;
  T.torso = (T.torso || 0) + 0.15;
};
function setupAgents() {
  for (let i = 0; i < 2; i++) {
    const a = makeChar({
      id: 'fbi' + i,
      name: 'Agent',
      short: 'Agent',
      role: 'FBI',
      stranger: true,
      officer: true,
      fbi: true,
      look: Object.assign({}, FBI_LOOK, i ? { skin: 0x9a6c52, hairCol: 0x120e0a, top: 0x34383d } : {}),
    });
    a.onMap = false;
    a.breakIn = true;
  }
}
let FBI_MESH = null;
function fbiStart(n) {
  if (FBI.ops.some((o) => o.n === n)) return;
  const ag = CHARS.filter((c) => c.def && c.def.fbi && !c.onMap);
  if (FBI.ops.length || ag.length < 2) return;
  if (!FBI_MESH) FBI_MESH = buildCarMesh(0x4f545a);
  const fromW = n.x < W / 2,
    stopX = clamp(n.x, 3, W - 4);
  const car = {
    x: fromW ? -4 : W + 4,
    z: fromW ? 16.5 : 15.5,
    dir: fromW ? 1 : -1,
    v: 7,
    vMax: 7.5,
    mesh: FBI_MESH,
    wait: 0,
    honked: true,
    model: M4.ident(),
    fbi: null,
    stopX,
  };
  const op = { n, car, ag: ag.slice(0, 2), phase: 'drive', t0: G.t, curbZ: n.z >= 15.5 ? 18 : 13, tried: false };
  car.fbi = op;
  CARS.push(car);
  FBI.ops.push(op);
  if (PLAYER.onMap && Math.hypot(PLAYER.x - n.x, PLAYER.z - n.z) < 24) audio.sting('siren');
}
// the car's own speed: slows to a stop by the prisoner, waits, drives off
function fbiCarV(c, vT) {
  const op = c.fbi;
  if (op.phase === 'drive') {
    const dist = (c.stopX - c.x) * c.dir;
    if (dist <= 0.1) {
      c.v = 0;
      fbiParked(op);
      return 0;
    }
    if (!vT) return 0;
    return Math.min(vT, Math.max(0.8, dist * 1.3));
  }
  if (op.phase === 'gone') return c.vMax;
  return 0;
}
function fbiParked(op) {
  op.phase = 'walk';
  const n = op.n,
    car = op.car;
  op.ag.forEach((a, i) => {
    const p = nearestWalkable(car.x + (i ? 0.7 : -0.7), op.curbZ + 0.5, a, 3) || [Math.floor(car.x), op.curbZ];
    placeChar(a, p[0], p[1]);
    a.onMap = true;
    a.shown = 0;
    a.spd = 1.05;
    a.breakIn = true;
    a.queue = [];
    a.poseFn = null;
    a.dir = a.tdir = Math.atan2(n.x - a.x, n.z - a.z);
  });
  audio.hx('door', hxPan(car.x, car.z), 0.6);
  fbiApproach(op);
}
function fbiApproach(op) {
  const n = op.n,
    [a0, a1] = op.ag;
  for (const a of op.ag) hardReset(a);
  enqueue(
    a0,
    chaseAct(n, {
      walk: true,
      reach: 1.25,
      giveUp: 600,
      label: '…',
      onCatch: () => fbiCuff(op),
      onLose: () => fbiFail(op),
    }),
  );
  enqueue(a1, [
    chaseAct(n, { walk: true, reach: 1.9, giveUp: 600, label: '…', onLose: () => {} }),
    mkAct({
      kind: 'wait',
      label: '…',
      dur: null,
      anim: 'stare',
      until: () => op.phase !== 'walk' && op.phase !== 'cuff',
      onTick: (c) => (c.tdir = Math.atan2(n.x - c.x, n.z - c.z)),
    }),
  ]);
}
function fbiCuff(op) {
  if (op.phase !== 'walk') return;
  op.phase = 'cuff';
  op.t1 = G.t;
  const n = op.n,
    [a0] = op.ag;
  enqueue(
    a0,
    mkAct({
      kind: 'wait',
      label: '…',
      dur: 4,
      anim: 'use',
      interruptible: false,
      onTick: (c) => (c.tdir = Math.atan2(n.x - c.x, n.z - c.z)),
      onEnd: (c, a, ok) => {
        if (op.phase === 'cuff') fbiEscort(op);
      },
    }),
  );
  audio.hx('click', hxPan(n.x, n.z), 0.7);
}
function fbiEscort(op) {
  op.phase = 'escort';
  const n = op.n,
    [a0, a1] = op.ag,
    tf = n.trueForm;
  if (!tf) return fbiFail(op);
  tf.mode = 'escort';
  if (n.tell) n.tell.kneel = false;
  n.poseFn = CUFFED_POSE;
  const p = nearestWalkable(op.car.x, op.curbZ + 0.5, a0, 3) || [Math.floor(op.car.x), op.curbZ];
  op.door = p;
  hardReset(a0);
  hardReset(a1);
  enqueue(a0, [
    goAct(p, { label: '…', interruptible: false }),
    mkAct({
      kind: 'wait',
      label: '…',
      dur: null,
      anim: 'idle',
      until: () => op.phase !== 'escort',
      onTick: (c) => {
        if (Math.hypot(n.x - c.x, n.z - c.z) < 1.6) fbiLoad(op);
      },
    }),
    waitAct({ label: '…', dur: 3, anim: 'idle' }),
  ]);
  enqueue(a1, [fbiFollow(op, n, 1.3), waitAct({ label: '…', dur: 3, anim: 'idle' })]);
}
// keep a step behind someone, for as long as the job lasts
function fbiFollow(op, n, keep) {
  return mkAct({
    kind: 'wait',
    label: '…',
    dur: null,
    anim: 'idle',
    until: () => op.phase !== 'escort',
    onTick: (c, a, dt) => {
      const d = Math.hypot(n.x - c.x, n.z - c.z);
      if (d <= keep) {
        c.path = null;
        c.moving = false;
        c.tdir = Math.atan2(n.x - c.x, n.z - c.z);
        return;
      }
      a.rp = (a.rp || 0) - dt;
      if (a.rp <= 0 || !c.path || c.pi >= c.path.length) {
        a.rp = 0.5;
        const t = nearestWalkable(n.x, n.z, c, 2);
        if (t) setPath(c, t[0], t[1]);
      }
      c.run = d > 3.5;
      followPath(c, dt);
    },
  });
}
// the prisoner walks in front of the first agent, behind its hands
function fbiEscortTick(n, dt) {
  const op = FBI.ops.find((o) => o.n === n),
    tf = n.trueForm;
  if (!op || op.phase !== 'escort') {
    tf.mode = 'surrender';
    n.poseFn = null;
    return;
  }
  const a0 = op.ag[0],
    bx = a0.x - Math.sin(a0.dir) * -0.95,
    bz = a0.z - Math.cos(a0.dir) * -0.95;
  const d = Math.hypot(n.x - bx, n.z - bz);
  tf.rp = (tf.rp || 0) - dt;
  if (d > 0.4 && (tf.rp <= 0 || !n.path || n.pi >= n.path.length)) {
    tf.rp = 0.4;
    const t = nearestWalkable(bx, bz, n, 2);
    if (t) setPath(n, t[0], t[1]);
  }
  n.run = false;
  n.spd = d > 2.5 ? 1.4 : 0.95;
  if (d > 0.4) followPath(n, dt);
  else {
    n.moving = false;
    n.tdir = a0.dir;
  }
  if (n.tell) {
    n.tell.lunge = n.tell.feed = false;
    n.tell.kneel = false;
  }
}
function fbiLoad(op) {
  if (op.phase !== 'escort') return;
  op.phase = 'load';
  const n = op.n;
  n.poseFn = null;
  audio.hx('door', hxPan(n.x, n.z), 0.8);
  setTimeout(() => {
    if (!FBI.ops.includes(op)) return;
    fbiTake(n);
    for (const a of op.ag) {
      hardReset(a);
      a.onMap = false;
    }
    audio.hx('door', hxPan(op.car.x, op.car.z), 0.7);
    op.phase = 'gone';
  }, 900);
}
// hands on it, and it goes
function fbiBolt(op) {
  const n = op.n,
    tf = n.trueForm;
  if (!tf) return;
  op.phase = 'chase';
  op.t2 = G.t;
  n.surrendered = null;
  n.poseFn = null;
  tf.mode = 'flee';
  tf.hp = 1;
  tf.wounded = true;
  tf.cornered = false;
  if (n.tell) {
    n.tell.kneel = false;
    n.tell.lunge = true;
    setTimeout(() => {
      if (n.tell) n.tell.lunge = false;
    }, 500);
  }
  flee(n);
  // it throws them off: both men on the ground for a moment, and it has a start on them
  for (const a of op.ag) {
    hardReset(a);
    knockBack(a, n, 1.1);
    enqueue(a, [
      waitAct({
        label: '…',
        dur: rand(2.2, 3.2),
        anim: 'idle',
        interruptible: false,
        onStart: (c) => {
          c.pose = 'floorlie';
        },
        onEnd: (c) => {
          c.pose = 'stand';
          ui.bubble(c, 'exclaim', 'speech', 2);
        },
      }),
      chaseAct(n, { reach: 1.15, giveUp: 160, label: '…', onCatch: () => fbiRecatch(op), onLose: () => {} }),
    ]);
  }
  const P = PLAYER;
  if (P.onMap && Math.hypot(P.x - n.x, P.z - n.z) < 16) {
    audio.hx(G.faction === 'lizards' ? 'hiss' : G.faction === 'aliens' ? 'zip' : 'groan', hxPan(n.x, n.z), 1);
    HX.jolt = 0.8;
    if (G.speed > 1) G.speed = 1;
  }
}
// run down: on its knees again, and this time it goes in the car
function fbiRecatch(op) {
  if (op.phase !== 'chase') return;
  const n = op.n,
    tf = n.trueForm;
  if (!tf || !n.onMap) return fbiFail(op);
  hardReset(n);
  n.fleeing = null;
  n.chase = null;
  n.poseFn = null;
  tf.mode = 'surrender';
  tf.stunUntil = 0;
  n.surrendered = { at: G.t, takeAt: G.t, why: 'fbi', siren: true };
  if (n.tell) {
    n.tell.kneel = true;
    n.tell.down = false;
  }
  op.phase = 'walk';
  audio.hx('thud', hxPan(n.x, n.z), 0.8);
  fbiApproach(op);
}
function fbiFail(op) {
  if (op.phase === 'back' || op.phase === 'gone') return;
  op.phase = 'back';
  for (const a of op.ag) {
    hardReset(a);
    if (a.onMap)
      enqueue(a, [
        goAct(nearestWalkable(op.car.x, op.curbZ + 0.5, a, 3) || [Math.floor(op.car.x), op.curbZ], { label: '…' }),
        mkAct({
          kind: 'wait',
          label: '…',
          dur: 1,
          anim: 'idle',
          onEnd: (c) => {
            c.onMap = false;
          },
        }),
      ]);
  }
  if (!G.over) {
    ui.note('badge', op.n.short + ' · loose', 'bad');
    audio.sting('awkward');
  }
}
function fbiFrame(dtR) {
  if (!G || !G.started) return;
  for (let i = FBI.ops.length - 1; i >= 0; i--) {
    const op = FBI.ops[i],
      n = op.n;
    if (op.phase === 'gone' && !CARS.includes(op.car)) {
      FBI.ops.splice(i, 1);
      continue;
    }
    if (op.phase === 'back' && op.ag.every((a) => !a.onMap)) {
      op.phase = 'gone';
      continue;
    }
    if (op.phase === 'cuff' && !op.tried && G.t - op.t1 > 1.3) {
      // the moment: their hands on it, and it looks for a way out
      op.tried = true;
      const P = PLAYER,
        guard = P.onMap && Math.hypot(P.x - n.x, P.z - n.z) < 2.6 && visAt(n.x, n.z) > 0.4;
      const p = guard ? 0 : G.faction === 'lizards' ? 0.45 : G.faction === 'aliens' ? 0.35 : 0.3;
      if (n.trueForm && chance(p)) fbiBolt(op);
    }
    if (op.phase === 'cuff' && !op.tried && n.trueForm)
      n.poseFn = (T, c) => {
        T.hy = Math.sin(c.animT * 2.4) * 0.9;
      }; // it looks round, for a way out
    if (op.phase === 'chase' && (!n.trueForm || !n.onMap || n.hideUntil || n.slain || G.t - op.t2 > 120)) fbiFail(op);
    if ((op.phase === 'walk' || op.phase === 'cuff') && (!n.onMap || !n.trueForm || n.slain)) fbiFail(op);
    // the lights on the car while it's parked
    if (op.phase !== 'drive' && op.phase !== 'gone' && op.car) {
      const blue = Math.sin(R.time * 9) > 0;
      hxLight(op.car.x, 1.6, op.car.z, 4.5, blue ? [0.15, 0.3, 1.1] : [1.1, 0.12, 0.1]);
    }
    if (op.phase === 'cuff' && !op.tried && n.trueForm)
      for (const s of [1, -1])
        hxGlint(
          n.x + Math.cos(n.dir) * s * 0.09,
          1.2,
          n.z - Math.sin(n.dir) * s * 0.09,
          0.1,
          FACTIONS[G.faction].eye,
          0.6 + 0.4 * Math.sin(R.time * 11),
        );
  }
}
function fbiReset() {
  FBI.ops.length = 0;
}
