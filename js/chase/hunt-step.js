//@ chase/hunt-step — The hunt each frame: seeing, chasing, grabs, being beaten
//@ Defines: huntFrame, huntSees, huntStep, huntRoam, huntMove, huntLeave, huntLeaveStep, huntBeamTick, huntSlow, huntGrab, huntGrabTick, huntKey, huntWinNear, huntClimb, huntDown, huntDownTick, …
//@ Uses:    chase/hunt, sim/core, horror/layer, audio/sound, chase/hunt-end, taken/taken, sim/actions, core/util, gfx/renderer, world/paths, …
//@ (header made by tools/map.js; stripped by build.py)
// ── every frame (after the horror layer has cleared its lights)
function huntFrame(dtR) {
  try {
    chaseFrame(dtR);
  } catch (e) {
    console.error(e);
  }
  try {
    fbiFrame(dtR);
  } catch (e) {
    console.error(e);
  }
  try {
    arrestFrame();
  } catch (e) {
    console.error(e);
  }
  if (!HUNT.on) {
    huntUI();
    return;
  }
  const P = PLAYER;
  if (!G || !G.started || G.over || CAP.on || !P.onMap) {
    if (!CAP.on) huntClear();
    huntUI();
    return;
  }
  const live = G.speed > 0 && !UI.caseOpen && !UI.scene && !UI.cf;
  const dt = live ? dtR : 0;
  if (G.speed > 1) G.speed = 1; // no fast-forward through this
  HUNT.t += dt;
  HUNT.slowT = Math.max(0, HUNT.slowT - dt);
  if (HUNT.runHint > 0 && P.run && P.moving) HUNT.runHint = Math.max(0, HUNT.runHint - dt * 0.8);
  if (HUNT.down) huntDownTick(dt);
  else {
    if (HUNT.grab) huntGrabTick(dt);
    for (const h of HUNT.hs) {
      try {
        huntStep(h, dt);
      } catch (e) {
        console.error(e);
        h.state = 'gone';
        h.a.hide = true;
      }
    }
    if (HUNT.beam) huntBeamTick(dt);
  }
  if (!HUNT.on) {
    huntUI();
    return;
  }
  for (const a of HUNT.actors) capAnimate(a, dt);
  huntFx(dtR);
  // the danger you can feel: the nearest of THEM, or the light on you
  let dg = 0;
  for (const h of HUNT.hs)
    if (huntLive(h) && !h.a.hide)
      dg = Math.max(dg, clamp(1 - Math.hypot(h.a.x - P.x, h.a.z - P.z) / 10, 0, 1) * (h.see ? 1 : 0.6));
  if (HUNT.beam && HUNT.beam.lock) dg = Math.max(dg, 0.5 + HUNT.beam.held * 0.5);
  if (HUNT.down) dg = 1;
  HX.danger = Math.max(HX.danger, Math.min(dg, HUNT.down || HUNT.grab ? 1 : 0.8));
  // over: everything that came for you has gone back
  if (
    !HUNT.down &&
    !HUNT.grab &&
    HUNT.hs.every((h) => h.state === 'gone') &&
    (!HUNT.beam || HUNT.beam.gone) &&
    HUNT.t > 3
  )
    huntEscaped();
  huntUI();
}
function huntSees(h, d) {
  const P = PLAYER,
    a = h.a,
    [range, cone] = HUNT_SEE[h.kind];
  if (!P.onMap || d > range || a.hide) return false;
  if (!losClear(Math.floor(a.x), Math.floor(a.z), Math.floor(P.x), Math.floor(P.z))) return false;
  if (d < 1.5) return true;
  const ang = Math.abs(angDiff(a.dir, Math.atan2(P.x - a.x, P.z - a.z)));
  if (ang > cone) return P.run && P.moving && d < 3.2; // you can't sprint past one without it hearing
  const lit = lumAt(P.x, P.z) >= 0.12 || (h.lantern && d < 4.2) || h.kind === 'grey' || d < 3;
  return lit;
}
function huntStep(h, dt) {
  const a = h.a,
    P = PLAYER;
  if (h.state === 'gone') return;
  if (h.state === 'wait') {
    h.wait -= dt;
    if (h.onWait) h.onWait(h, dt);
    if (h.appear && h.wait < 0.35 && a.hide) {
      a.hide = false;
      a.ghost = 0.9;
      R.flash = Math.max(R.flash, visAt(a.x, a.z) > 0.3 ? 0.3 : 0);
      audio.hx('zip', hxPan(a.x, a.z), 0.7);
    }
    if (h.wait <= 0) {
      h.state = 'hunt';
      a.ghost = 0;
      if (h.onGo) h.onGo(h);
    }
    return;
  }
  if (h.freeze > 0) {
    h.freeze -= dt;
    a.moving = false;
    capFace(a, P.x, P.z);
    return;
  }
  if (h.stun > 0) {
    h.stun -= dt;
    a.moving = false;
    a.tell.lunge = false;
    return;
  }
  if (HUNT.grab && HUNT.grab.h === h) {
    a.moving = false;
    capFace(a, P.x, P.z);
    a.tell.lunge = true;
    return;
  }
  const d = Math.hypot(P.x - a.x, P.z - a.z);
  h.seeT -= dt;
  if (h.seeT <= 0) {
    h.seeT = 0.15;
    h.see = huntSees(h, d);
  }
  if (h.see) {
    h.last = [P.x, P.z];
    h.lost = 0;
    h.srch = null;
    if (!h.spotted) {
      h.spotted = true;
      audio.hx(h.kind === 'grey' ? 'alarm' : h.kind === 'lizard' ? 'hiss' : 'groan', hxPan(a.x, a.z), 0.9);
      HX.jolt = Math.max(HX.jolt, 0.55);
      if (h.kind === 'lizard') a.fx.frill = 1;
    }
  }
  if (h.state === 'leave') return huntLeaveStep(h, dt);
  // THEY don't follow you far from where THEY came for you
  if (Math.hypot(a.x - HUNT.home[0], a.z - HUNT.home[1]) > HUNT.leash && !(h.see && d < 2)) return huntLeave(h);
  if (Math.hypot(P.x - HUNT.home[0], P.z - HUNT.home[1]) > HUNT.leash + 3 && !h.see) {
    h.lost += dt * 2;
  }
  if (h.see) {
    h.out = 0;
    huntMove(h, [P.x, P.z], HUNT_SPD[h.kind], dt, d < 2.6);
    // a grey that has you in sight skips ahead: there, then nearer
    if (h.kind === 'grey' && d > 2.4 && d < 7) {
      h.blink -= dt;
      if (h.blink <= 0 && h.path && h.pi < h.path.length - 2) {
        h.blink = rand(2.6, 3.8);
        const k = Math.min(h.path.length - 2, h.pi + 2);
        a.x = h.path[k][0];
        a.z = h.path[k][1];
        h.pi = k + 1;
        R.flash = Math.max(R.flash, 0.15);
        audio.hx('zip', hxPan(a.x, a.z), 0.5);
      }
    }
  } else if (h.last) {
    const dl = Math.hypot(h.last[0] - a.x, h.last[1] - a.z);
    if (dl > 0.6 && !h.srch) huntMove(h, h.last, h.spotted ? HUNT_SPD[h.kind] * 0.9 : HUNT_SRCH[h.kind], dt);
    else {
      // here's where you were: it looks about, then gives it up
      if (h.spotted || h.kind !== 'lizard' || HUNT.t > 9) h.lost += dt;
      if (!h.srch || Math.hypot(h.srch[0] - a.x, h.srch[1] - a.z) < 0.5) {
        const p = huntRoam(h.last, 3.5);
        h.srch = p;
      }
      if (h.srch) huntMove(h, h.srch, HUNT_SRCH[h.kind], dt);
      a.tdir += Math.sin(HUNT.t * 1.7 + a.x) * dt * 1.4;
      if (h.lost > HUNT_LOSE[h.kind]) return huntLeave(h);
    }
  }
  a.tell.lunge = d < 1.8 && h.see;
  if (d < HUNT_GRAB[h.kind] && !HUNT.grab && !(a.y < -0.3)) huntGrab(h);
}
// somewhere near a spot that it can walk to
function huntRoam(at, r) {
  for (let k = 0; k < 12; k++) {
    const x = Math.floor(at[0] + rand(-r, r)),
      z = Math.floor(at[1] + rand(-r, r));
    if (walkable(x, z, HUNT_WHO) && losClear(Math.floor(at[0]), Math.floor(at[1]), x, z)) return [x + 0.5, z + 0.5];
  }
  return null;
}
// along a path, through doors, straight at you when there's nothing between
function huntMove(h, tgt, spd, dt, direct) {
  const a = h.a;
  if (direct && losClear(Math.floor(a.x), Math.floor(a.z), Math.floor(tgt[0]), Math.floor(tgt[1]))) {
    capWalk(a, tgt[0], tgt[1], spd, dt);
    a.run = spd > 2.9;
    return;
  }
  h.rp -= dt;
  if (h.rp <= 0 || !h.path) {
    h.rp = 0.35;
    const t = nearestWalkable(tgt[0], tgt[1], HUNT_WHO, 2),
      p = t && findPath(a.x, a.z, t[0], t[1], HUNT_WHO);
    h.path = p ? p.map(([x, z]) => [x + 0.5, z + 0.5]) : null;
    h.pi = 0;
  }
  if (!h.path || h.pi >= h.path.length) {
    a.moving = false;
    return;
  }
  const [tx, tz] = h.path[h.pi];
  if (capWalk(a, tx, tz, spd, dt)) h.pi++;
  a.run = spd > 2.9;
}
function huntLeave(h) {
  h.state = 'leave';
  h.path = null;
  h.rp = 0;
  h.out = 0;
  h.a.tell.lunge = false;
  h.see = false;
}
function huntLeaveStep(h, dt) {
  const a = h.a;
  h.out += dt;
  const d = Math.hypot(h.src[0] - a.x, h.src[1] - a.z),
    seen = visAt(a.x, a.z) > 0.3;
  if (d > 0.6 && h.out < 12) huntMove(h, h.src, HUNT_SRCH[h.kind] * 1.2, dt);
  if (d <= 0.6 || (h.out > 6 && !seen) || h.out > 14) {
    // gone the way it came
    if (h.down) {
      h.sink = (h.sink || 0) + dt;
      a.y = -h.sink * 1.4;
      a.moving = false;
      if (CAP.cover != null && h.kind === 'lizard') CAP.cover = 1;
      if (h.sink < 1.2) return;
      if (h.kind === 'lizard') {
        CAP.cover = 0;
        audio.hx('knock', hxPan(a.x, a.z), 0.6);
      }
    } else if (h.kind === 'grey' && seen) {
      R.flash = Math.max(R.flash, 0.15);
      audio.hx('zip', hxPan(a.x, a.z), 0.5);
    }
    h.state = 'gone';
    a.hide = true;
  }
}
// the beam: it goes where you are, slower than you can run. Under a roof, it loses you.
function huntBeamTick(dt) {
  const B = HUNT.beam,
    P = PLAYER,
    cr = B.cr;
  if (B.gone) return;
  B.t += dt;
  cr.spin += dt * (0.6 + cr.glow * 1.6);
  if (B.leaving) {
    cr.y += dt * 5;
    cr.x += dt * 4;
    cr.glow = Math.max(0, cr.glow - dt);
    if (cr.y > 24) {
      B.gone = true;
      const i = HX.crafts.indexOf(cr);
      if (i >= 0) HX.crafts.splice(i, 1);
    }
    return;
  }
  cr.y += (B.yTo - cr.y) * Math.min(1, dt * 0.9);
  cr.glow = Math.min(1, cr.glow + dt * 0.5);
  const out = P.onMap && !roomAt(P.x, P.z),
    on = B.t > B.delay;
  const dP = Math.hypot(P.x - B.x, P.z - B.z),
    dH = Math.hypot(P.x - B.home[0], P.z - B.home[1]);
  B.lock = on && out && dH < B.leash && dP < 16;
  if (B.lock) {
    B.lost = 0;
    const sp = 2.75 * dt,
      k = Math.min(1, sp / Math.max(dP, 1e-3));
    B.x += (P.x - B.x) * k;
    B.z += (P.z - B.z) * k;
  } else if (on) {
    // it combs the ground where it last had you
    B.lost += dt;
    B.sweep += dt;
    B.x += Math.sin(B.sweep * 0.9) * dt * 1.6;
    B.z += Math.cos(B.sweep * 0.7) * dt * 1.2;
    if (B.lost > B.lose) {
      B.leaving = true;
      audio.hx('whoosh', hxPan(cr.x, cr.z), 0.5);
    }
  }
  cr.x += (B.x - cr.x) * Math.min(1, dt * 0.8);
  cr.z += (B.z - 2.5 - cr.z) * Math.min(1, dt * 0.8);
  const inside = on && out && dP < 1.25;
  if (inside) {
    B.held += dt;
    if (!B.hum) {
      B.hum = true;
      audio.hx('beam', 0, 0.9);
      HX.jolt = Math.max(HX.jolt, 0.6);
    }
  } else {
    B.held = Math.max(0, B.held - dt * 0.7);
    if (B.held === 0) B.hum = false;
  }
  P.y = B.held * 0.3;
  if (B.held > 1.1) huntCaught('beam');
}
function huntSlow() {
  if (!HUNT.on) return 1;
  let k = HUNT.slowT > 0 ? 0.5 : 1;
  const B = HUNT.beam;
  if (B && !B.gone && B.held > 0) k *= 0.55; // the light pulls
  return k;
}

// ── its hands on you: a moment to tear free (once). Hit E, hard and fast.
function huntGrab(h) {
  const P = PLAYER;
  if (HUNT.grab || HUNT.climb) {
    if (HUNT.climb) {
      HUNT.climb = null;
    }
  }
  if (HUNT.grabs >= 1 || h.grabbed) return huntCaught('grab', h);
  h.grabbed = true;
  HUNT.grab = { h, k: 0, t: 0, lim: 1.8 };
  cancelAll(P);
  P.path = null;
  enqueue(
    P,
    mkAct({
      kind: 'wait',
      label: '…',
      icon: 'fist',
      dur: null,
      anim: 'idle',
      interruptible: false,
      swing: true,
      until: () => !HUNT.grab,
    }),
  );
  audio.hx('grab', 0, 1);
  HX.jolt = 1;
  HX.shake = 0.7;
  R.pulse = 1;
  psyMark('fight'); // in ITS hands
  capFace(h.a, P.x, P.z);
  P.tdir = Math.atan2(h.a.x - P.x, h.a.z - P.z);
  P.poseFn = (T, c) => {
    const s = HUNT.grab ? HUNT.grab.shake || 0 : 0;
    T.torso = -0.15;
    T.uaL = -1.1 - s * 0.6;
    T.uaR = -1.0 + s * 0.5;
    T.faL = T.faR = -1.2;
    T.roll = Math.sin(c.animT * 30) * 0.05 * (0.4 + s);
  };
}
function huntGrabTick(dt) {
  const g = HUNT.grab;
  g.t += dt;
  g.shake = Math.max(0, (g.shake || 0) - dt * 4);
  if (g.k < 1) g.k = Math.max(0, g.k - dt * 0.32);
  if (g.k >= 1) {
    // free: you shove it off and it reels
    const h = g.h,
      a = h.a,
      P = PLAYER,
      dx = a.x - P.x,
      dz = a.z - P.z,
      l = Math.hypot(dx, dz) || 1;
    for (let k = 1.6; k > 0.2; k -= 0.3) {
      const x = P.x + (dx / l) * k,
        z = P.z + (dz / l) * k;
      if (walkable(Math.floor(x), Math.floor(z), HUNT_WHO)) {
        a.x = x;
        a.z = z;
        break;
      }
    }
    h.stun = 1.7;
    HUNT.grabs++;
    HUNT.grab = null;
    P.poseFn = null;
    audio.hx('thud', 0, 0.9);
    audio.hx('breath', 0, 0.7);
    HX.shake = 0.5;
    R.pulse = 0.6;
    return;
  }
  if (g.t > g.lim) huntCaught('grab', g.h);
}
// E while it's happening: tear free, get up, climb out the window
function huntKey() {
  if (FRI.hold) {
    const H = FRI.hold;
    H.k = Math.min(1, H.k + 0.26);
    H.shake = 1;
    audio.hx('rope', rand(-0.2, 0.2), 0.5);
    return true;
  }
  if (!HUNT.on) return false;
  if (HUNT.grab) {
    HUNT.grab.k = Math.min(1, HUNT.grab.k + 0.27);
    HUNT.grab.shake = 1;
    audio.hx('rope', rand(-0.2, 0.2), 0.5);
    return true;
  }
  if (HUNT.down) {
    const D = HUNT.down;
    D.k = Math.min(1, D.k + 1 / D.need);
    D.shake = 1;
    audio.hx('breath', 0, 0.35);
    return true;
  }
  if (HUNT.spot === 'win' && !HUNT.climb) {
    huntClimb();
    return true;
  }
  return false;
}
function huntWinNear() {
  const P = PLAYER;
  if (HUNT.kind !== 'sleep' || !P.onMap || HUNT.climb || HUNT.grab) return false;
  const p = nearestWalkable(...WIN_IN, PLAYER, 1);
  if (!p) return false;
  return Math.hypot(P.x - (p[0] + 0.5), P.z - (p[1] + 0.5)) < 0.9;
}
function huntClimb() {
  const P = PLAYER;
  HUNT.climb = { t: 0 };
  cancelAll(P);
  P.tdir = Math.atan2(BED_WIN[0] - P.x, BED_WIN[1] + 0.3 - P.z);
  audio.hx(HUNT.winOpen ? 'drag' : 'glass', 0, HUNT.winOpen ? 0.6 : 0.8);
  if (!HUNT.winOpen) {
    for (let i = 0; i < 12; i++)
      hxDecal(
        BED_WIN[0] + rand(-0.6, 0.6),
        BED_WIN[1] - rand(0.1, 0.9),
        rand(0.02, 0.05),
        [0.75, 0.85, 0.9, 0.7],
        0,
        600,
      );
    HUNT.winOpen = true;
  }
  enqueue(
    P,
    mkAct({
      kind: 'wait',
      label: '…',
      icon: 'window',
      dur: 2.6,
      anim: 'use',
      interruptible: false,
      swing: true,
      onTick: (c) => {
        c.tdir = Math.atan2(BED_WIN[0] - c.x, BED_WIN[1] + 0.3 - c.z);
      },
      onEnd: (c, a, ok) => {
        if (!ok || !HUNT.climb) return;
        HUNT.climb = null;
        c.x = WIN_OUT[0];
        c.z = WIN_OUT[1] + 0.1;
        c.dir = c.tdir = 0;
        c.path = null;
        cam.follow = true;
        lastPlayerCell = -1;
        audio.hx('thud', 0, 0.5);
      },
    }),
  );
}

// ── beaten by one of THEM: you're on the ground and it takes its time. Get up before it gets to you.
function huntDown(foe) {
  const P = PLAYER;
  if (HUNT.on || CAP.on || ARREST.on || !foe || !foe.trueForm || !foe.onMap || !P.onMap) return false;
  if (G.t - (G.downAt || -1e9) < 90) return false; // twice in a row: no more getting up
  huntClear();
  Object.assign(HUNT, {
    on: true,
    kind: 'beaten',
    fac: G.faction,
    why: null,
    t: 0,
    grabs: 9,
    foe,
    home: [P.x, P.z],
    leash: 99,
    beam: null,
    grab: null,
    light: null,
    climb: null,
    slowT: 0,
    runHint: 0,
  });
  HUNT.down = { foe, k: 0, t: 0, gloat: 1.7, need: 6, shake: 0 };
  closeMenu();
  combatClear();
  UI.aim = null;
  BOLTS.length = 0;
  G.health = 1;
  cancelAll(P);
  P.path = null;
  enqueue(
    P,
    mkAct({
      kind: 'wait',
      label: '…',
      icon: 'fist',
      dur: null,
      anim: 'idle',
      interruptible: false,
      swing: true,
      until: () => !HUNT.down,
      onStart: (c) => {
        c.pose = 'floorlie';
      },
    }),
  );
  P.poseFn = (T, c) => {
    const D = HUNT.down;
    if (!D) return;
    T.pitch = -Math.PI / 2;
    T.rootY = 0.14;
    T.roll = 0.25 + Math.sin(c.animT * 22) * 0.06 * D.shake;
    T.uaR = -1.3 - D.k * 0.8;
    T.faR = -0.6;
    T.uaL = -0.3;
    T.hp = -0.3 + D.k * 0.4;
    T.thL = -0.3 * D.k;
  };
  hardReset(foe);
  foe.fleeing = null;
  foe.chase = null;
  foe.trueForm.mode = 'hold';
  foe.trueForm.holdT = 0;
  knockBack(foe, P, 2.4);
  foe.tdir = Math.atan2(P.x - foe.x, P.z - foe.z);
  if (foe.tell) foe.tell.lunge = false;
  audio.hx('thud', 0, 1);
  HX.shake = 0.9;
  R.pulse = 1;
  HX.jolt = 1;
  setTimeout(() => {
    if (HUNT.down && HUNT.down.foe === foe)
      audio.hx(
        G.faction === 'lizards' ? 'laugh' : G.faction === 'aliens' ? 'thrum' : 'groan',
        hxPan(foe.x, foe.z),
        0.9,
      );
  }, 500);
  return true;
}
function huntDownTick(dt) {
  const D = HUNT.down,
    P = PLAYER,
    f = D.foe;
  D.t += dt;
  D.shake = Math.max(0, D.shake - dt * 4);
  if (!f.onMap || !f.trueForm || f.slain) return huntUp(false);
  if (D.k >= 1) return huntUp(true);
  D.k = Math.max(0, D.k - dt * 0.12);
}
// the foe's own tick while it has you down: a moment to enjoy it, then it walks over
function huntHoldTick(n, dt) {
  const D = HUNT.down,
    P = PLAYER,
    tf = n.trueForm;
  if (!D || D.foe !== n) {
    tf.mode = 'flee';
    return flee(n);
  }
  n.tdir = Math.atan2(P.x - n.x, P.z - n.z);
  if (D.t < D.gloat) {
    n.path = null;
    n.moving = false;
    if (n.tell) {
      n.tell.lunge = false;
      n.tell.feed = false;
    }
    if (G.faction === 'lizards') n.fx.frill = 0.6 + 0.4 * Math.sin(D.t * 9);
    return;
  }
  const d = Math.hypot(P.x - n.x, P.z - n.z);
  if (d < 0.95) return huntCaught('down', null);
  tf.rp = (tf.rp || 0) - dt;
  if (tf.rp <= 0 || !n.path || n.pi >= n.path.length) {
    tf.rp = 0.5;
    const t = nearestWalkable(P.x, P.z, n, 2);
    if (t) setPath(n, t[0], t[1]);
  }
  n.run = false;
  n.spd = 0.6;
  followPath(n, dt);
  if (n.tell) n.tell.lunge = d < 1.6;
}
function huntUp(got) {
  const P = PLAYER,
    f = HUNT.foe;
  HUNT.down = null;
  P.poseFn = null;
  P.pose = 'stand';
  G.downAt = G.t;
  G.health = 24;
  if (f && f.trueForm && f.onMap) {
    hardReset(f);
    knockBack(f, P, 1.4);
    f.trueForm.mode = 'attack';
    f.trueForm.t0 = G.t;
    f.trueForm.lastSeen = G.t;
    f.trueForm.cd = 3;
    f.spd = 1;
    f.trueForm.atk = { ph: 'rec', t: 0, dur: 5, seen: G.t, open: false }; // a moment before it comes at you again
  }
  if (got) {
    audio.hx('breath', 0, 0.9);
    audio.hx('thud', 0, 0.6);
    HX.shake = 0.4;
  }
  huntClear();
}
