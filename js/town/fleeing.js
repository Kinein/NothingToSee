//@ town/fleeing — Fleeing to hideouts
//@ Defines: HIDEOUTS, hideoutFor, flee, hideAway, giveUp, chaseAct, swingAct, swingTarget, playerMelee, attackKey
//@ Uses:    sim/core, sim/actions, ui/interface, world/grid, data/tuning, core/util, town/spawning, world/paths, town/npc-update, town/suspicion, …
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
// your blow: one key, no panel. You swing at whoever you picked (or whoever's in front of you), and it lands on them if
// they're still within reach when your arm comes round. Your legs stay free: swing on the move, step back out of the
// answer. On a frightened person running away it's a grab: they give up.
function swingAct(n, wind) {
  return mkAct({
    kind: 'wait',
    label: n && n.fleeing && !n.isThem && !n.trueForm ? 'Catch' : 'Hit',
    icon: 'fist',
    dur: wind / 0.56, // the punch keyframes land at .56
    anim: 'punch',
    swing: true,
    interruptible: false,
    onStart: (c, a) => {
      a.dir = n ? Math.atan2(n.x - c.x, n.z - c.z) : c.tdir;
      c.tdir = a.dir;
    },
    onTick: (c, a, dt) => {
      if (a.landed) return;
      if (n && n.onMap) a.dir = Math.atan2(n.x - c.x, n.z - c.z);
      c.tdir = a.dir;
      if (n && n.fleeing && a.t < wind) {
        // after it: you throw yourself at it
        const dd = Math.hypot(n.x - c.x, n.z - c.z);
        if (dd > 0.75 && (a.lunge || 0) < 2.4) {
          const s = Math.min(dd - 0.7, dt * 7, 2.4 - (a.lunge || 0));
          a.lunge = (a.lunge || 0) + tryMove(c, ((n.x - c.x) / dd) * s, ((n.z - c.z) / dd) * s);
          c.moving = true;
          c.walkPh += s * 4.6;
        }
      }
      if (a.t < wind) return;
      a.landed = true;
      const reach = swingReach(),
        t = n && n.onMap && !n.slain && Math.hypot(n.x - c.x, n.z - c.z) <= reach ? n : swingTarget(c, a.dir, reach);
      if (!t) {
        ui.float(c, 'Missed', '');
        audio.hx('whoosh', 0, 0.35);
        return;
      }
      if (t.fleeing && !t.isThem && !t.trueForm) return giveUp(t);
      fightOutcome(t);
    },
  });
}
const swingReach = () => CTRL.melee + (G.inv.crowbar ? CTRL.crowbar : 0);
// who Space swings at: anything out of its skin, anyone coming at you or running from you, one of THEIRS on Friday,
// one of THEM everyone knows about. Never a bystander who happens to be standing in front of you, nor the police.
const swingable = (n) =>
  !n.isPlayer &&
  !n.surrendered &&
  !n.def.officer &&
  !n.def.fbi &&
  (n.trueForm
    ? n.tell && n.tell.t >= TF_CHANGE
    : n.exposed || (G.loose && n.thrall) || (n.fleeing && !n.def.stranger) || hostileToYou(n));
// the one a swing toward `dir` lands on: the nearest fair target in reach, in front of you (or right up against you)
function swingTarget(c, dir, reach) {
  let best = null,
    bd = 1e9;
  for (const n of CHARS) {
    if (n === c || !n.onMap || n.slain || !swingable(n)) continue;
    const dx = n.x - c.x,
      dz = n.z - c.z,
      d = Math.hypot(dx, dz);
    if (d > reach || d >= bd) continue;
    if (d > CTRL.close && Math.abs(angDiff(dir, Math.atan2(dx, dz))) > CTRL.meleeArc * DEG) continue;
    bd = d;
    best = n;
  }
  return best;
}
function playerMelee(n) {
  const P = PLAYER;
  if (!P.onMap || R.time < (UI.swingCd || 0) || P.queue.some((a) => a.swing)) return;
  if (tooShaken()) return shakenNote(); // breaking: your hands won't do it
  UI.swingCd = R.time + CTRL.swingCd;
  cancelAll(P);
  enqueue(P, swingAct(n, CTRL.windup * (P.needs.energy < 30 ? 1.3 : 1))); // worn out, it comes round slower
}
// Space: swing. At whoever's there to be hit, a little further than your arm (you turn to them); at the air if nobody.
function attackKey() {
  const P = PLAYER;
  if (!G || !G.started || G.over || UI.caseOpen || UI.scene || UI.cf || !P.onMap || G.away || ARREST.on) return;
  if (huntKey()) return; // its hands on you: Space tears at them like E does
  if (UI.menuOpen) return closeMenu();
  dismissHints();
  playerMelee(swingTarget(P, P.tdir, swingReach() + 0.6));
}
