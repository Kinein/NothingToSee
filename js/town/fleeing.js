//@ town/fleeing — Fleeing to hideouts
//@ Defines: HIDEOUTS, hideoutFor, flee, hideAway, giveUp, chaseAct, swingAct, playerMelee
//@ Uses:    sim/core, sim/actions, world/grid, ui/interface, data/tuning, core/util, town/spawning, world/paths, town/npc-update, town/suspicion, …
//@ (header made by tools/map.js; stripped by build.py)
// ───────────── fleeing: their flat, a den, the stockroom, the alley or the park at night. Lose them and they hide 1–3 hours.
const HIDEOUTS = { stock: [41, 9], agnes: [21, 22], alley: [27, 5], park: [41, 30] };
function hideoutFor(n) {
  const h = hourF(),
    night = h >= 20 || h < 6;
  if (n.exposed)
    return { at: n.id === 'agnes' ? HIDEOUTS.agnes : HOUSE_OF[n.id] ? HOUSE_OF[n.id].spot : HIDEOUTS.alley }; // nowhere left but home
  if (n.trueForm && !theyOut()) {
    if (n.id === 'agnes') return { at: HIDEOUTS.agnes };
    if (HOUSE_OF[n.id]) return { at: HOUSE_OF[n.id].spot };
  } // early in the week: straight home, off the street
  if (n.id === 'vic' && !n.trueForm) return { at: HIDEOUTS.stock };
  if (n.id === 'agnes' && !n.trueForm) return { at: HIDEOUTS.agnes };
  if (HOUSE_OF[n.id] && (!n.trueForm || !night || chance(0.5)) && !(night && !n.trueForm && chance(0.3)))
    return { at: HOUSE_OF[n.id].spot };
  if (night || n.trueForm) {
    const far = [HIDEOUTS.alley, HIDEOUTS.park].sort(
      (a, b) => Math.hypot(b[0] - PLAYER.x, b[1] - PLAYER.z) - Math.hypot(a[0] - PLAYER.x, a[1] - PLAYER.z),
    )[0];
    if (n.trueForm && !night) return { at: edgeFor(n, n.z), edge: true };
    return { at: far };
  }
  return { at: edgeFor(n, n.z), edge: true };
}
function flee(n, o = {}) {
  n.fleeing = null;
  hardReset(n);
  n.engaged = null;
  const ho = o.to || hideoutFor(n);
  const to = walkable(ho.at[0], ho.at[1], n)
    ? ho.at
    : nearestWalkable(ho.at[0] + 0.5, ho.at[1] + 0.5, n, 3) || edgeFor(n, n.z);
  const f = (n.fleeing = { t0: G.t, edge: !!ho.edge });
  n.spd =
    o.spd ||
    (n.trueForm
      ? n.trueForm.wounded
        ? 0.8
        : G.faction === 'lizards'
          ? 1.4
          : G.faction === 'aliens'
            ? 0.88
            : 0.82
      : n.isThem
        ? 0.95
        : 0.8);
  if (!n.trueForm) {
    ui.bubble(n, 'exclaim', 'speech', 2.5);
    if (!n.def.stranger) echo('flee', { x: n.x, z: n.z, who: n.id });
  }
  enqueue(
    n,
    goAct(to, {
      label: 'Fleeing',
      run: true,
      interruptible: false,
      flee: true,
      onEnd: (c, a, ok) => {
        if (c.fleeing !== f) return;
        c.fleeing = null;
        if (ok || Math.hypot(c.x - to[0] - 0.5, c.z - to[1] - 0.5) < 2.5) hideAway(c, f.edge);
        else c.spd = 1;
      },
    }),
  );
}
function hideAway(n, edge) {
  n.spd = 1;
  if (n.def.stranger) {
    n.onMap = false;
    return;
  }
  n.hideUntil = G.t + rand(60, 180);
  if (n.trueForm) revert(n);
  if (edge) {
    n.onMap = false;
    return;
  }
  if (n.exposed) return;
  enqueue(
    n,
    waitAct({
      label: 'Hiding',
      dur: null,
      anim: 'shake',
      interruptible: false,
      until: (c) => G.t >= c.hideUntil,
      onStart: (c) => (c.pose = 'crouch'),
    }),
  );
}
// a caught normal person gives up, frightened
function giveUp(n) {
  n.fleeing = null;
  hardReset(n);
  n.spd = 1;
  addSus(n, 20);
  for (const b of earshot(n)) addSus(b, 20);
  ui.say(n, pick(['Okay! Okay. Don’t hurt me.', 'Please. Leave me alone.', 'What do you WANT?']), 3);
  enqueue(
    n,
    waitAct({
      label: 'Cowering',
      dur: 8,
      anim: 'shake',
      interruptible: false,
      onStart: (c) => {
        c.pose = 'crouch';
        c.tdir = Math.atan2(PLAYER.x - c.x, PLAYER.z - c.z);
      },
    }),
  );
}
// run after someone; next to them, onCatch fires. The player catches the slow ones; the fast get away.
function chaseAct(tg, o) {
  return mkAct({
    kind: 'wait',
    label: o.label || 'Chase',
    icon: o.icon || 'walk',
    dur: null,
    run: !o.walk,
    anim: 'idle',
    chase: tg,
    check: () => (tg.onMap ? null : 'Gone'),
    onStart: (c, a) => {
      a.t0 = G.t;
      a.rp = 99;
    },
    onTick: (c, a, dt) => {
      if (a.done) return;
      if (!tg.onMap || (o.quit && o.quit(c, a))) {
        a.cancel = true;
        c.path = null;
        c.moving = false;
        if (o.onLose) o.onLose(c, a);
        return;
      }
      const d = Math.hypot(tg.x - c.x, tg.z - c.z);
      if (o.tick) o.tick(c, a, d);
      if (d < (o.reach || 1.35) && (!o.reachOk || o.reachOk(c))) {
        c.path = null;
        c.moving = false;
        c.tdir = Math.atan2(tg.x - c.x, tg.z - c.z);
        a.done = true;
        a.dur = 0;
        if (o.onCatch) o.onCatch(c, a);
        return;
      }
      a.rp += dt;
      if (a.rp > 0.5 || !c.path || c.pi >= c.path.length) {
        a.rp = 0;
        const t = nearestWalkable(tg.x, tg.z, c, 2);
        if (t) setPath(c, t[0], t[1]);
      }
      c.run = !o.walk;
      followPath(c, dt);
      if (G.t - a.t0 > (o.giveUp || 15)) {
        a.cancel = true;
        c.path = null;
        c.moving = false;
        if (o.onLose) o.onLose(c, a);
      }
    },
  });
}
// your blow: no bar, no minigame. You swing at whoever it is; it lands if they're still within reach when your arm comes round.
// Fight unlocks on anyone you have confronted and on anyone in true form. On a frightened person running away it's a grab: they give up.
function swingAct(n) {
  return mkAct({
    kind: 'wait',
    label: n.fleeing && !n.isThem && !n.trueForm ? 'Catch' : 'Hit',
    icon: 'fist',
    dur: CTRL.windup + 0.4,
    anim: 'punch',
    swing: true,
    interruptible: false,
    onStart: (c) => {
      c.tdir = Math.atan2(n.x - c.x, n.z - c.z);
    },
    onTick: (c, a, dt) => {
      if (a.landed) return;
      c.tdir = Math.atan2(n.x - c.x, n.z - c.z);
      if (n.fleeing && a.t < CTRL.windup) {
        // after it: you throw yourself at it
        const dd = Math.hypot(n.x - c.x, n.z - c.z);
        if (dd > 0.75 && (a.lunge || 0) < 2.4) {
          const s = Math.min(dd - 0.7, dt * 7, 2.4 - (a.lunge || 0));
          a.lunge = (a.lunge || 0) + tryMove(c, ((n.x - c.x) / dd) * s, ((n.z - c.z) / dd) * s);
          c.moving = true;
          c.walkPh += s * 4.6;
        }
      }
      if (a.t < CTRL.windup) return;
      a.landed = true;
      if (!n.onMap || n.slain || UI.fight || Math.hypot(n.x - c.x, n.z - c.z) > CTRL.melee) {
        ui.float(c, 'Missed', '');
        audio.blip('click');
        return;
      }
      if (n.fleeing && !n.isThem && !n.trueForm) return giveUp(n);
      fightOutcome(n, true);
    },
  });
}
function playerMelee(n) {
  const P = PLAYER;
  if (!P.onMap || R.time < (UI.swingCd || 0) || P.queue.some((a) => a.swing)) return;
  if (tooShaken()) return shakenNote(); // breaking: your hands won't do it
  UI.swingCd = R.time + CTRL.swingCd;
  cancelAll(P);
  enqueue(P, swingAct(n)); // you swing where you stand: closing the gap is your legs' job
}
