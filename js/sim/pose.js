//@ sim/pose — Each frame's pose: targets, gestures, door reach, blending, turning, animate
//@ Defines: animTargets, gesture, applyGestures, doorReach, blendJoints, turnBody, rootSlide, animate, updateShown
//@ Uses:    core/util, sim/body-motion, sim/core, them/tells, gfx/renderer, input/camera, sim/characters, sim/seat-moves, data/tuning, gfx/reach-rig, …
//@ (header made by tools/map.js; stripped by build.py)
function animTargets(c, dt) {
  if (c.tell && c.tell.type === 'true' && c.tell.t >= TF_CHANGE * 0.72) return creatureTargets(c);
  const T = defaultJ(),
    h = c.look.h,
    t = c.animT,
    fx = c.fx;
  fx.eye = null;
  fx.slit = false;
  fx.tongue = 0;
  fx.skin = null;
  fx.armOff = false;
  fx.cloak = 0;
  fx.big = 0;
  fx.half = null;
  fx.sharp = false;
  fx.trace = c.trace && c.trace.k > 0.005 ? c.trace : null;
  const cur = c.queue && c.queue[0];
  fx.prop = (cur && cur.stage === 'run' && cur.prop) || null;
  if (c.thrall) thrallFx(c, fx);
  if (c.seatTr) {
    if (trLive(c)) {
      c._trDir = trEval(c, c.seatTr, T).dir;
      if (c.tell) applyTellAnim(c, T, c.tell);
      else if (c.vis) {
        if (R.time > c.vis.until) c.vis = null;
        else applyTellAnim(c, T, c.vis);
      }
      return T;
    }
    c.seatTr = null;
  }
  const g = c.moving ? Math.max(c.gaitW || 0, 0.05) : c.pose === 'stand' ? c.gaitW || 0 : 0;
  if (g > 0.02) {
    const p = c.vph != null ? c.vph : c.walkPh || 0,
      rw = c.runW != null ? c.runW : c.run ? 1 : 0;
    gaitTargets(c, T, p, rw);
    if (c.isPlayer && PLAYER && PLAYER.needs && PLAYER.needs.energy < 20) {
      T.torso = Math.max(T.torso, 0.16);
      T.hp = 0.25;
      T.uaL *= 0.6;
      T.uaR *= 0.6;
    }
    if (c.limpDay && G && c.limpDay === dayNo()) {
      T.roll = Math.sin(p) * 0.1;
      T.torso += 0.1;
    }
    if (c.drunk) {
      T.hr = Math.sin(t * 2) * 0.22;
      T.roll = Math.sin(t * 1.3) * 0.08;
      T.torso += 0.08;
    }
    if (c.trance) {
      // sleepwalking out to it: short dragging steps, arms dead at the sides, the head hanging off to one side
      T.thL *= 0.55;
      T.thR *= 0.55;
      T.shL = T.shL * 0.5 + 0.08;
      T.shR = T.shR * 0.5 + 0.08;
      T.rootY *= 0.5;
      T.twist = 0;
      T.uaL = 0.05 - Math.sin(p) * 0.07;
      T.uaR = 0.05 + Math.sin(p) * 0.07;
      T.faL = T.faR = -0.1;
      T.aoL = T.aoR = 0.05;
      T.hp = 0.34 + Math.sin(p * 2) * 0.03;
      T.hr = 0.2 + Math.sin(t * 0.55) * 0.12;
      T.hy = Math.sin(t * 0.37) * 0.12;
      T.torso = 0.08;
      T.roll = Math.sin(p) * 0.035;
      fx.eye = [0.4, 0.44, 0.42];
    }
    if (c.fleeing && !c.trueForm && !c.isPlayer && rw > 0.2) {
      // running from something: a look back over the shoulder, arms everywhere
      const sd = bodySide(c),
        lb = sstep(0.5, 0.85, Math.sin(t * 1.3 + bodySeed(c))) * rw;
      T.hy += sd * 0.95 * lb;
      T.twist += sd * 0.16 * lb;
      T.hp -= 0.1 * lb;
      T.aoL += 0.14 * rw;
      T.aoR += 0.14 * rw;
      T.uaL *= 1 + 0.3 * rw;
      T.uaR *= 1 + 0.3 * rw;
    }
    if (c.tell && c.tell.walkweird) {
      T.hr = Math.sin(t * 2) * 0.25;
      T.torso = 0.25;
      T.uaL = -0.9;
      T.uaR = -0.9;
    }
    if (G && G.inv && G.inv.flashOn && c.isPlayer) {
      T.uaR = -1.1;
      T.faR = -0.4;
      T.aoR = 0.08;
      fx.prop = 'torch';
    }
    if ((c.isThem || c.thrall === 'zombies') && G && G.faction === 'zombies') deadWalk(c, T);
    if (c.tell && (c.tell.type === 'true' || c.tell.type === 'half')) applyTellAnim(c, T, c.tell);
    else if (c.vis && c.vis.type === 'half') {
      if (R.time > c.vis.until) c.vis = null;
      else applyTellAnim(c, T, c.vis);
    }
    if (g < 1) {
      const D = defaultJ(),
        ge = g * g * (3 - 2 * g);
      for (const k in T) T[k] = D[k] + (T[k] - D[k]) * ge;
    } // a walk coming on, or dying away
    return T;
  }
  const pose = c.vpose || c.pose,
    sd = bodySide(c),
    seed = bodySeed(c);
  if (pose === 'sit') seatPose(c, T, c.seatY || 0.45);
  else if (pose === 'lie') liePose(c, T);
  else if (pose === 'floor') {
    T.rootY = 0.17 - 0.88 * h;
    T.thL = T.thR = -1.35;
    T.shL = T.shR = 2.1;
    T.uaL = T.uaR = -1.0;
    T.faL = T.faR = -1.15;
    T.hp = 0.45;
    T.torso = 0.25 + Math.sin(t * 1.6) * 0.015;
  } else if (pose === 'floorlie') {
    T.pitch = -Math.PI / 2;
    T.rootY = 0.14;
    T.roll = 0.15;
    T.uaL = -0.2;
    T.uaR = 0.3;
    T.hp = -0.2;
    T.hy = 0.5;
    T.thL = -0.15;
    T.shL = 0.3;
  } else if (pose === 'crouch') {
    T.rootY = -0.38;
    T.thL = T.thR = -1.3;
    T.shL = T.shR = 1.95;
    T.torso = 0.45 + Math.sin(t * 1.7) * 0.015;
    T.uaL = T.uaR = -1.0;
    T.faL = T.faR = -0.6;
    T.hp = 0.2;
  } else if (pose === 'buckle') {
    T.rootY = -0.2;
    T.thL = -0.55;
    T.thR = -0.45;
    T.shL = 1.0;
    T.shR = 0.85;
    T.torso = 0.25;
    T.uaL = T.uaR = 0.1;
    T.faL = T.faR = -0.1;
    T.hp = 0.5;
    T.hr = 0.25;
  } else if (pose === 'kneel') {
    T.rootY = -0.42;
    T.thL = T.thR = -0.1;
    T.shL = T.shR = 1.55;
    T.torso = 0.3;
    T.uaL = T.uaR = -0.2;
    T.faL = T.faR = -0.25;
    T.hp = 0.45;
  } else {
    // standing about: the weight drifts from foot to foot, the breath comes and goes, now and then the head wanders
    const ws = sstep(-0.4, 0.4, Math.sin(t * 0.17 + seed));
    if (sd > 0) {
      T.thL = -0.05 * ws;
      T.shL = 0.13 * ws;
      T.thR = -0.05 * (1 - ws);
      T.shR = 0.13 * (1 - ws) * 0.4;
    } else {
      T.thR = -0.05 * ws;
      T.shR = 0.13 * ws;
      T.thL = -0.05 * (1 - ws);
      T.shL = 0.13 * (1 - ws) * 0.4;
    }
    T.roll = (ws - 0.5) * 0.014 * sd;
    T.torso = Math.sin(t * 1.4) * 0.012;
    T.faL = T.faR = -0.14;
    T.aoL = T.aoR = 0.075 + Math.sin(t * 1.4) * 0.006;
    T.hy = Math.sin(t * 0.35 + seed) * 0.27 * sstep(0.25, 0.6, Math.sin(t * 0.13 + seed));
    if (!c.isPlayer) T.hr = Math.sin(t * 0.23) * 0.13 * Math.max(0, Math.sin(t * 0.061 + 1)); // now and then a head drifts over to one side, and stays there
    if (c.isPlayer && PLAYER.needs && PLAYER.needs.energy < 20) {
      T.torso = 0.14;
      T.hp = 0.3;
      T.uaL = T.uaR = 0.05;
    }
    if (c.isPlayer && PLAYER.needs && PLAYER.needs.bladder < 15) {
      T.thL = -0.15;
      T.thR = 0.1;
      T.hr = Math.sin(t * 9) * 0.05;
    }
    const tv = Math.abs(c.dirV || 0); // turning on the spot: a couple of small steps round
    if (tv > 1.4) {
      const k = clamp((tv - 1.4) / 2.5, 0, 1),
        ph = t * 12,
        a = Math.max(0, Math.sin(ph)) ** 2,
        b = Math.max(0, -Math.sin(ph)) ** 2;
      T.shL += 0.32 * k * a;
      T.shR += 0.32 * k * b;
      T.thL -= 0.1 * k * a;
      T.thR -= 0.1 * k * b;
    }
  }
  // sitting down and getting up: the body leans out over the feet to lower itself, or to lift itself, arms forward
  const pe = c.poseAt == null ? 9 : R.time - c.poseAt;
  if (pe < 0.9) {
    if (pose === 'sit' && c.poseFrom === 'stand') {
      const k = sstep(0, 0.2, pe) * (1 - sstep(0.3, 0.8, pe));
      T.torso += 0.34 * k;
      T.hp -= 0.18 * k;
      T.uaL -= 0.25 * k;
      T.uaR -= 0.25 * k;
    } else if (pose === 'stand' && (c.poseFrom === 'sit' || c.poseFrom === 'lie')) {
      const k = sstep(0, 0.1, pe) * (1 - sstep(0.25, 0.75, pe));
      T.torso += 0.42 * k;
      T.hp -= 0.22 * k;
      T.uaL -= 0.3 * k;
      T.uaR -= 0.3 * k;
      T.thL -= 0.35 * k;
      T.thR -= 0.35 * k;
      T.shL += 0.5 * k;
      T.shR += 0.5 * k;
      T.rootY -= 0.1 * k;
    }
  }
  const osc = (f, a) => Math.sin(t * f) * a;
  const act = cur && cur.stage === 'run' && cur.anim === c.anim ? cur : null; // the action behind this anim, when there is one
  const prog = act && act.dur ? clamp(act.t / act.dur, 0, 1) : null;
  let head = 0;
  switch (c.anim) {
    case 'type':
      T.uaL = T.uaR = -0.55;
      T.faL = -0.95 + osc(19, 0.06);
      T.faR = -0.95 + osc(23, 0.06);
      T.hp = 0.12;
      break;
    case 'use':
      T.uaL = T.uaR = -0.75;
      T.faL = -0.7 + osc(6, 0.15);
      T.faR = -0.7 + osc(7.3, 0.15);
      T.hp = 0.15;
      T.torso += 0.06;
      break;
    case 'cook':
      T.uaL = -0.7;
      T.uaR = -0.8;
      T.faL = -0.6 + osc(4, 0.2);
      T.faR = -0.9 + osc(9, 0.35);
      T.hp = 0.3;
      T.torso += 0.06;
      break;
    case 'eat':
      T.uaR = -0.45;
      T.faR = -2.0 + Math.max(0, Math.sin(t * 2.6)) * 0.55;
      T.uaL = -0.4;
      T.faL = -0.9;
      T.hp = 0.12 - Math.max(0, Math.sin(t * 2.6 - 0.4)) * 0.06;
      fx.prop = 'plate';
      break;
    case 'drink':
      T.uaR = -0.35;
      T.faR = -2.2 + Math.max(0, Math.sin(t * 1.4)) * 0.8;
      T.hp = -0.05 - Math.max(0, -Math.sin(t * 1.4)) * 0.15;
      break;
    case 'talk': {
      // talking with the hands, one and then the other, a nod on the stresses
      const a1 = Math.max(0, Math.sin(t * 2.3)),
        a2 = Math.max(0, Math.sin(t * 1.7 + 2));
      T.hp = 0.03 + osc(5.5, 0.06);
      T.hy = osc(0.9, 0.12);
      T.uaR = -0.2 - a1 * 0.25;
      T.faR = -1.05 - a1 * 0.4;
      T.aoR = 0.12 + a1 * 0.12;
      T.uaL = Math.min(T.uaL, -0.15) - a2 * 0.15;
      T.faL = Math.min(T.faL, -0.6) - a2 * 0.45;
      T.aoL = 0.1 + a2 * 0.08;
      break;
    }
    case 'listen':
      T.hr = 0.08;
      T.hp = 0.05 + osc(1.3, 0.03) + Math.pow(Math.max(0, Math.sin(t * 0.8 + seed)), 12) * 0.14;
      break; // a nod, now and then
    case 'shower':
      T.uaL = T.uaR = -2.7;
      T.faL = -0.6 + osc(8, 0.3);
      T.faR = -0.6 + osc(7, 0.3);
      T.hp = -0.3;
      break;
    case 'phone':
      T.uaR = -0.15;
      T.aoR = 0.4;
      T.faR = -2.55;
      T.hr = 0.12;
      fx.prop = 'phone';
      break;
    case 'dig':
      T.torso = 0.7;
      T.uaL = T.uaR = -1.0;
      T.faL = -0.3 + osc(6, 0.3);
      T.faR = -0.3 + osc(5, 0.3);
      T.hp = 0.3;
      if (pose === 'stand') {
        T.thL = T.thR = -0.1;
        T.shL = T.shR = 0.24;
        T.rootY = -0.04;
      }
      break;
    case 'watch':
      T.hp = -0.06;
      T.uaL = T.uaR = -0.15;
      break;
    case 'read':
      T.uaL = T.uaR = -0.65;
      T.faL = T.faR = -1.35;
      T.hp = 0.35;
      fx.prop = 'paper';
      break;
    case 'photo':
      break; // after the pose: it needs the head where it is
    case 'shake':
      if (pose === 'floor') {
        // a panic: knees up, hands over the head, rocking, the breath coming too fast
        const rock = Math.sin(t * 3.1);
        T.torso = 0.36 + rock * 0.1;
        T.hp = 0.55 + osc(17, 0.03) + osc(9, 0.02);
        T.hr = osc(1.1, 0.06);
        T.roll = osc(31, 0.016);
        T.aoL = T.aoR = 0.3 + osc(9, 0.03);
        head = 1;
      } else if (pose === 'crouch') {
        // hiding: arms over the head, shaking, and every so often a look out from under them
        const peek = sstep(0.55, 0.85, Math.sin(t * 0.45 + seed));
        T.torso = 0.55 - 0.15 * peek;
        T.hp = 0.55 - 0.5 * peek + osc(17, 0.03);
        T.roll = osc(29, 0.02);
        head = 1 - 0.55 * peek;
      } else {
        // on their feet: face in the hands, shoulders shaking
        T.torso = 0.18;
        T.hp = 0.45 + osc(17, 0.04);
        T.roll = osc(31, 0.02);
        T.uaL = T.uaR = -0.95;
        T.aoL = T.aoR = 0.12;
        T.faL = T.faR = -2.15;
        T.thL = T.thR = -0.06;
        T.shL = T.shR = 0.12 + osc(23, 0.02);
        T.rootY = -0.02;
      }
      break;
    case 'knock': {
      // three raps, then a pause to listen
      const cy = (t * 1.25) % 1,
        rap = cy < 0.5 ? Math.max(0, Math.sin(cy * 6 * TAU)) : 0,
        lis = sstep(0.55, 0.7, cy) * (1 - sstep(0.9, 1, cy));
      T.uaR = -0.9 - rap * 0.06;
      T.faR = -1.55 + rap * 0.42;
      T.aoR = 0.12;
      T.torso = 0.08 + rap * 0.025;
      T.hr = 0.16 * lis;
      T.hp = 0.05 * lis;
      T.hy = -0.12 * lis;
      break;
    }
    case 'punch': {
      const p = act ? clamp(act.t / (CTRL.windup + 0.4), 0, 1) : 0.56;
      keyPose(T, act && act.label === 'Catch' ? GRAB : PUNCH, p, 1);
      fx.sharp = true;
      break;
    }
    case 'pickup':
    case 'mop': {
      // down on one knee, a hand out to it; up again with it (or wiping, round and round)
      const mop = c.anim === 'mop',
        pr = prog == null ? 0.45 : prog;
      const dn = mop ? sstep(0, 0.08, pr) * (1 - sstep(0.92, 1, pr)) : sstep(0, 0.32, pr) * (1 - sstep(0.66, 0.96, pr));
      T.thL = lerp(T.thL, -1.2, dn);
      T.shL = lerp(T.shL, 1.9, dn);
      T.thR = lerp(T.thR, -0.15, dn);
      T.shR = lerp(T.shR, 1.55, dn);
      T.rootY = lerp(T.rootY, -0.39, dn);
      T.torso = lerp(T.torso, mop ? 0.78 : 0.62, dn);
      T.hp = lerp(T.hp, mop ? 0.2 : 0.3, dn);
      T.uaL = lerp(T.uaL, -0.55, dn);
      T.faL = lerp(T.faL, -0.95, dn); // the other hand on the knee
      const at = act && act.reach;
      if (at) {
        const wipe = mop ? [Math.cos(t * 4.2) * 0.16, Math.sin(t * 4.2) * 0.12] : [0, 0];
        c._reach = { pt: [at[0] + wipe[0], at[1], at[2] + wipe[1]], w: mop ? dn : dn * (1 - sstep(0.52, 0.72, pr)) };
        if (!mop) {
          const up = sstep(0.5, 0.75, pr) * (1 - sstep(0.85, 1, pr));
          T.uaR = lerp(T.uaR, -0.55, up);
          T.faR = lerp(T.faR, -1.9, up);
        }
      }
      if (mop) fx.prop = 'rag';
      break;
    }
    case 'warm':
      T.uaL = T.uaR = -0.6;
      T.faL = T.faR = -0.4;
      T.torso = 0.15;
      break;
    case 'stare':
      T.hp = 0.0;
      T.hy = 0;
      T.uaL = T.uaR = 0;
      break;
    case 'lookup':
      T.hp = -0.75;
      T.hy = 0;
      T.uaL = T.uaR = 0.05;
      break;
    case 'think':
      T.uaR = -0.6;
      T.faR = -2.2;
      T.hp = 0.15;
      T.hr = 0.1;
      break;
    case 'sleep':
      if (pose === 'sit') {
        T.hp = 0.65;
        T.hr = 0.2;
      } else if (pose === 'lie') {
        T.hy = 0.35 * sd;
        T.torso = Math.sin(t * 0.9) * 0.015;
      }
      break;
    case 'pace':
      T.hp = 0.3;
      break;
  }
  if (c.anim === 'photo') photoPose(c, T, prog);
  if (head > 0) handsToHead(c, T, head);
  if (c._reach) {
    armIK(c, T, -1, c._reach.pt, c._reach.w);
    c._reach = null;
  }
  if (c.tell) applyTellAnim(c, T, c.tell);
  else if (c.vis) {
    if (R.time > c.vis.until) c.vis = null;
    else applyTellAnim(c, T, c.vis);
  }
  return T;
}
// small things that happen to a body, riding over whatever pose it's in
// p0: start part-way in (a swing already on its way); delay: real seconds before it starts
function gesture(c, k, dur, p0 = 0, delay = 0) {
  if (c) (c.gest || (c.gest = [])).push({ k, t0: R.time + delay - p0 * dur, dur });
}
function applyGestures(c, T) {
  const gs = c.gest;
  if (!gs || !gs.length) return;
  const it = !!(c.tell && c.tell.type === 'true');
  for (let i = gs.length - 1; i >= 0; i--) {
    const g = gs[i],
      p = (R.time - g.t0) / g.dur;
    if (p >= 1) {
      gs.splice(i, 1);
      continue;
    }
    if (p < 0) continue;
    if (g.k === 'punch' && !it) {
      keyPose(T, PUNCH, p, sstep(0, 0.12, p) * (1 - sstep(0.85, 1, p)));
      c.fx.sharp = true;
    } else if (g.k === 'flinch') {
      // hit: the head snaps back, the arms come up, the knees give
      const k = sstep(0, 0.1, p) * (1 - sstep(0.3, 1, p));
      T.torso -= 0.22 * k;
      T.hp -= 0.28 * k;
      T.rootY -= 0.05 * k;
      if (!it) {
        T.uaL = lerp(T.uaL, -0.95, k);
        T.uaR = lerp(T.uaR, -0.85, k);
        T.faL = lerp(T.faL, -2.15, k);
        T.faR = lerp(T.faR, -2.25, k);
        T.aoL = lerp(T.aoL, 0.18, k);
        T.aoR = lerp(T.aoR, 0.18, k);
        T.shL += 0.2 * k;
        T.shR += 0.2 * k;
        T.thL -= 0.1 * k;
        T.thR -= 0.1 * k;
      }
      c.fx.sharp = true;
    }
  }
}
// walking up to a shut door: the near hand goes out and pushes it as it swings
function doorReach(c, dt) {
  const g = c.moving ? c.gaitW || 0 : 0;
  let w = 0;
  if (g > 0.1 && c.pose === 'stand' && !c.trueForm && c.look) {
    const f0 = Math.sin(c.dir),
      f1 = Math.cos(c.dir),
      x0 = Math.floor(c.x),
      z0 = Math.floor(c.z);
    let best = 2;
    for (let dz = -1; dz <= 1; dz++)
      for (let dx = -1; dx <= 1; dx++) {
        const x = x0 + dx,
          z = z0 + dz;
        if (!inb(x, z)) continue;
        const di = doorAt[I(x, z)];
        if (di < 0) continue;
        const d = DOORS[di];
        if (d.lair || d.open > 0.9) continue;
        const vx = x + 0.5 - c.x,
          vz = z + 0.5 - c.z,
          ahead = vx * f0 + vz * f1;
        if (
          ahead < 0.22 ||
          ahead > 1.3 ||
          ahead >= best ||
          Math.abs(vx * f1 - vz * f0) > 0.65 ||
          Math.abs(d.horiz ? f1 : f0) < 0.5
        )
          continue;
        best = ahead;
        const M = doorMatrix(d),
          a = M4.xform(M, 0.76, 1.0, 0.09),
          b = M4.xform(M, 0.76, 1.0, -0.09);
        const q = Math.hypot(a[0] - c.x, a[2] - c.z) < Math.hypot(b[0] - c.x, b[2] - c.z) ? a : b;
        c.doorT = [q[0], q[1], q[2]];
        const lx = (q[0] - c.x) * Math.cos(c.dir) - (q[2] - c.z) * Math.sin(c.dir),
          held = c.doorSp && c.doorSp.o.w > 0.04;
        if (!held) c.doorS = lx > 0 || fx_hasProp(c) ? 1 : -1; // the hand is chosen as it goes out, and kept till it's back
        w =
          (1 - sstep(0.95, 1.3, ahead)) *
          sstep(0.22, 0.42, ahead) *
          (1 - sstep(0.5, 0.88, d.open)) *
          Math.min(1, g * 1.5);
      }
  }
  // the reach is laid over the finished pose, and both how far it goes and where the arm ends up ride springs:
  // a door swinging away, or the hand changing over, never jerks the arm
  const S = c.doorSp || (c.doorSp = { o: { w: 0 }, v: {}, q: null, qv: {} });
  S.o.w -= w;
  settle0(S.o, S.v, 'w', 0.09, dt);
  S.o.w += w;
  const ww = clamp(S.o.w, 0, 1);
  if (ww < 0.005 || !c.doorT) {
    S.q = null;
    return;
  }
  const side = c.doorS,
    J = c.J,
    keys = side > 0 ? ['uaL', 'aoL', 'faL'] : ['uaR', 'aoR', 'faR'];
  const tmp = Object.assign({}, J);
  armIK(c, tmp, side, c.doorT, 1);
  if (!S.q || S.side !== side) {
    S.side = side;
    S.q = {};
    S.qv = {};
    for (const k of keys) S.q[k] = J[k];
  }
  for (const k of keys) {
    S.q[k] -= tmp[k];
    settle0(S.q, S.qv, k, 0.07, dt);
    S.q[k] += tmp[k];
    J[k] = lerp(J[k], S.q[k], ww);
  }
}
const fx_hasProp = (c) => !!(c.fx && c.fx.prop);
// blend toward the pose: whatever it jumped by this frame (a new pose, a cut in the sim) is taken up and let out
// on a spring, so the body never snaps; ordinary motion passes straight through at full strength
function blendJoints(c, T, dt) {
  const J = c.J,
    g = c.moving ? 1 : c.pose === 'stand' ? c.gaitW || 0 : 0,
    vp = c.vpose || c.pose;
  const key = c.seatTr
    ? 'move'
    : g > 0.02
      ? 'walk'
      : vp + '/' + c.anim + (c.tell && c.tell.type === 'true' ? '/it' : '');
  if (!c.jT) {
    c.jT = {};
    c.jO = {};
    c.jV = {};
    c.jKey = null;
  }
  const cut = key !== c.jKey;
  if (cut) {
    c.jSt =
      key === 'move'
        ? 0.07
        : key === 'walk'
          ? SETTLE.walk
          : SETTLE[vp] || (c.jKey && /^(sit|lie|floor|crouch|kneel)/.test(c.jKey) ? 0.2 : 0.15);
    c.jKey = key;
  }
  const lim = c.fx && c.fx.sharp ? 0.9 : key === 'walk' || key === 'move' ? 0.6 : MOTION.cut + dt * 4;
  for (const k in T) {
    const tv = T[k],
      was = c.jT[k];
    if (was == null) {
      c.jO[k] = (J[k] != null ? J[k] : tv) - tv;
      c.jV[k] = 0;
    } else {
      const d = tv - was;
      if (cut || Math.abs(d) > lim) c.jO[k] -= d;
    }
    if (c.jO[k] || c.jV[k]) settle0(c.jO, c.jV, k, c.jSt || 0.15, dt);
    J[k] = tv + c.jO[k];
    c.jT[k] = tv;
  }
}
// heading: a spring onto where they mean to face, quick but never a snap
function turnBody(c, dtReal, dtGame) {
  const sp = dtGame / Math.max(dtReal, 1e-4),
    st = (c.isPlayer ? MOTION.turn : MOTION.turn * 1.35) / (1 + 0.07 * sp);
  const o = { e: -angDiff(c.dir, c.tdir) },
    v = { e: c.dirE || 0 };
  settle0(o, v, 'e', st, dtReal);
  c.dir = c.tdir + o.e;
  c.dirE = v.e;
  c.dirV = (c.dirV || 0) + (Math.abs(v.e) - (c.dirV || 0)) * Math.min(1, dtReal * 8);
}
// where the body is drawn: the sim's spot, plus whatever jump it made that legs couldn't have, sliding out
function rootSlide(c, dtReal, dtGame) {
  const px = c._rx,
    pz = c._rz;
  c._rx = c.x;
  c._rz = c.z;
  if (px == null) {
    c.ox = c.oz = 0;
    return;
  }
  const dx = c.x - px,
    dz = c.z - pz,
    d = Math.hypot(dx, dz);
  if (d > 2.4) {
    c.ox = c.oz = 0;
    c.ovx = c.ovz = 0;
    return;
  } // a cut: somewhere else now
  if (d > 0.05 + dtGame * WALK * 2.7) {
    c.ox = (c.ox || 0) - dx;
    c.oz = (c.oz || 0) - dz;
  } // faster than legs go: a shove, a lunge
  if (!c.ox && !c.oz) return;
  const o = { x: c.ox, z: c.oz },
    v = { x: c.ovx || 0, z: c.ovz || 0 };
  settle0(o, v, 'x', MOTION.root, dtReal);
  settle0(o, v, 'z', MOTION.root, dtReal);
  const done = Math.abs(o.x) + Math.abs(o.z) < 2e-4 && Math.abs(v.x) + Math.abs(v.z) < 2e-3;
  c.ox = done ? 0 : o.x;
  c.oz = done ? 0 : o.z;
  c.ovx = done ? 0 : v.x;
  c.ovz = done ? 0 : v.z;
}
const drawX = (c) => c.x + (c.ox || 0),
  drawZ = (c) => c.z + (c.oz || 0);
function animate(c, dtReal, dtGame) {
  c.animT += dtReal * Math.min(3, 0.6 + (dtGame / Math.max(dtReal, 1e-4)) * 0.2);
  motionPre(c, dtReal);
  if (c.fx) c.fx.sharp = false;
  c._trDir = null;
  const T = animTargets(c, dtReal);
  applyGestures(c, T);
  if (c.poseFn) {
    try {
      c.poseFn(T, c);
    } catch (e) {
      c.poseFn = null;
    }
  }
  blendJoints(c, T, dtReal);
  if (!(c.tell && c.tell.type === 'true')) doorReach(c, dtReal);
  turnBody(c, dtReal, dtGame);
  if (c.seatTr && c._trDir != null) {
    c.dir = c._trDir;
    c.dirE = 0;
  }
  rootSlide(c, dtReal, dtGame);
}
function updateShown(c, dtReal) {
  const target = c.isPlayer || c === SHADE.c ? 1 : c.under ? 0 : visAt(c.x, c.z) > 0.32 ? 1 : 0;
  c.shown += (target - c.shown) * Math.min(1, dtReal * 7);
}
