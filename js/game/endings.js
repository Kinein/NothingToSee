//@ game/endings — The last picture: where you fell, the cell for good, what THEY made of Wexley
//@ Defines: END, END_HATCH, END_PARK, END_DOOR, endBegin, endCard, endSkip, endReset, endFrame, endStill, endCam, endAside, endLight, endAir, endBody, endCell, …
//@ Uses:    gfx/renderer, sim/core, horror/layer, core/util, town/cell, ui/interface, audio/sound, sim/pose, town/cast, them/plan, …
//@ (header made by tools/map.js; stripped by build.py)
// ───────────────────────── the last picture ─────────────────────────
// A game that's lost doesn't cut straight to the card. Shot down or killed, you lie where you fell with your eyes shut,
// the blood spreading and the squad car's lights going round, while your own eyes close on it. Locked up, you're booked
// and walked down and the door slides shut, and then the days go by in the window, for good. Lost on THEIR last day,
// the town gets a last picture of its own after yours: what THEY made of Wexley. By then the game is over (G.over) and
// nothing here touches the simulation: it only moves what you see. A key or a click hurries it on to the card.
const END = {
  on: false,
  kind: '',
  steps: [],
  i: 0,
  t: 0,
  T: 0,
  init: false,
  lid: 0,
  fade: 0,
  wide: false,
  card: false,
  foe: null,
  at: null,
  beat: 0,
  cellAt: 0,
  cr: null,
  yaw0: 0,
  sfx: 0,
  cap: 0,
  mob: [],
};
const END_HATCH = [30.5, 15.5]; // lizards: the drain on Main street that opens
const END_PARK = [37.5, 25.5]; // aliens: where it comes down
const END_DOOR = [12.5, 13.4]; // zombies: Meridian Records, on Monday
function endBegin(kind) {
  const friday = phaseNow() >= WEEK && !['won', 'escaped', 'plan', 'below'].includes(kind);
  const steps = [];
  if (kind === 'shot' || kind === 'killed') steps.push('body');
  else if (kind === 'jailed' || kind === 'prison') steps.push('cell');
  if (kind === 'plan' || kind === 'below' || friday) steps.push('they');
  Object.assign(END, { on: true, kind, steps, i: 0, t: 0, T: 0, init: false, lid: 0, fade: 0, card: false, foe: null });
  END.mob.length = 0;
  const th = $('#over-them');
  if (th) {
    th.hidden = !friday;
    th.textContent = friday ? ENDINGS.plan[G.faction][1] : '';
  }
  if (!steps.length) return endCard();
  closeMenu();
  if (UI.caseOpen) closeBoard();
  $('#hud').hidden = true;
  HX.letterT = 1;
}
function endCard() {
  if (END.card) return;
  END.card = true;
  const o = $('#over');
  o.classList.toggle('scene', END.steps.length > 0);
  o.hidden = false;
  audio.sting(END.kind === 'won' || END.kind === 'escaped' ? 'onto' : 'caught');
}
// any key, a click: on to the next picture, or the card
function endSkip() {
  if (!END.on || END.card || END.T < 1.5) return; // not the keys you were still mashing when it happened
  if (END.i < END.steps.length - 1) {
    END.i++;
    END.t = 0;
    END.init = false;
  } else endCard();
}
function endReset() {
  Object.assign(END, {
    on: false,
    kind: '',
    steps: [],
    i: 0,
    t: 0,
    T: 0,
    init: false,
    lid: 0,
    fade: 0,
    wide: false,
    card: false,
  });
  END.foe = END.cr = null;
  END.mob.length = 0;
  HX.letterT = HX.selT = 0;
  CELL.forever = false;
  if (CELL.on) cellExit();
  CELL.fade = 0;
  const cap = $('#endcap');
  if (cap) cap.hidden = true;
  const o = $('#over');
  if (o) o.classList.remove('scene');
}
// every frame, once it's over
function endFrame(dt) {
  if (!END.on || CAP.on) return; // a scene of THEIRS winds itself up first
  END.t += dt;
  END.T += dt;
  const s = END.steps[END.i];
  if (!s) return endCard();
  const first = !END.init;
  END.init = true;
  const done =
    s === 'body' ? endBody(dt, END.t, first) : s === 'cell' ? endCell(dt, END.t, first) : endThey(dt, END.t, first);
  if (done && !END.card) {
    if (END.i < END.steps.length - 1) {
      END.i++;
      END.t = 0;
      END.init = false;
    } else endCard(); // the last picture stays on behind the card
  }
}
const endNext = () => END.i < END.steps.length - 1;
function endStill(c) {
  c.queue.length = 0;
  c.path = null;
  c.moving = false;
  c.run = false;
  c.vault = null;
}
function endCam(x, z, zoom, dt, k = 1.4) {
  const e = Math.min(1, dt * k);
  cam.follow = false;
  cam.tx += (x - cam.tx) * e;
  cam.tz += (z - cam.tz) * e;
  cam.zoomT = zoom;
}
// where to point the camera so (x, z) sits right of centre and up a little (kx, ky: shares of the half screen), clear of
// the card low on the left
function endAside(x, z, kx, ky) {
  const rl = Math.hypot(cam.right[0], cam.right[2]) || 1,
    fl = Math.hypot(cam.fwd[0], cam.fwd[2]) || 1,
    a = cam.halfW * kx,
    u = (cam.halfH * ky) / Math.sin(cam.pitch); // along the ground, a step away from the camera climbs the screen
  return [x - (cam.right[0] / rl) * a - (cam.fwd[0] / fl) * u, z - (cam.right[2] / rl) * a - (cam.fwd[2] / fl) * u];
}
// the picture's own lights go in front of the horror layer's (it only draws the first few, nearest first)
function endLight(x, y, z, r, col) {
  HX.lights.unshift({ x, y, z, r, col, dark: 0 });
}
function endAir(o) {
  audio.update(
    Object.assign(
      {
        hum: false,
        outside: true,
        night: hourF() > 20 || hourF() < 6,
        stress: 0,
        rain: G.rainK || 0,
        car: 0,
        dread: 0,
      },
      o,
    ),
  );
}

// ── shot down, or killed: where you fell
function endBody(dt, t, first) {
  const P = PLAYER;
  if (first) {
    endStill(P);
    P.onMap = true;
    P.pose = 'floorlie';
    P.anim = 'idle';
    if (P.poseFn !== CUFFED_POSE) P.poseFn = null;
    END.at = [P.x - Math.sin(P.dir) * 1.0, P.z - Math.cos(P.dir) * 1.0]; // your chest: lying, you reach back from your feet
    END.foe =
      END.kind === 'shot' ? NPC.officer : (G.overBy && (NPC[G.overBy] || CHARS.find((c) => c.id === G.overBy))) || null;
    if (END.foe && !END.foe.onMap) END.foe = null;
    if (END.foe) endStill(END.foe);
    hxDecal(END.at[0], END.at[1], () => 0.16 + 0.8 * sstep(0.3, 7, END.T), [0.4, 0.02, 0.02, 0.95], 4, 1e9, {
      rot: rand(0, TAU),
      sx: 1.35,
      sz: 0.95,
      seed: rand(1, 9),
    });
    BOLTS.length = 0;
    UI.aim = null;
    HX.selT = 0.75;
    cam.yawT = P.dir + (Math.abs(angDiff(cam.yaw, P.dir + Math.PI / 2)) < Math.PI / 2 ? Math.PI / 2 : -Math.PI / 2); // across the body
    audio.hx('ringing', 0, 1);
    END.sfx = 0;
  }
  const [bx, bz] = END.at;
  P.shut = t > 1.1;
  animate(P, dt, dt);
  // the one who did it comes and stands over you; the officer goes down on one knee
  const f = END.foe;
  if (f) {
    const dx = f.x - bx,
      dz = f.z - bz,
      d = Math.hypot(dx, dz) || 1,
      stand = f.def && f.def.officer ? 1.15 : 1.5;
    if (t > 0.9 && d > stand + 0.05) {
      if (hxWalk(f, bx + (dx / d) * stand, bz + (dz / d) * stand, d > 4 ? 2.2 : 1.1, dt)) f.moving = false;
    } else {
      f.moving = false;
      f.tdir = Math.atan2(bx - f.x, bz - f.z);
      if (f.def && f.def.officer && t > 4 && f.pose !== 'kneel') f.pose = 'kneel';
    }
    animate(f, dt, dt);
  }
  // everyone else stops, and looks
  for (const c of CHARS) {
    if (c === P || c === f || !c.onMap || Math.hypot(c.x - bx, c.z - bz) > 12) continue;
    if (c.moving || c.path) endStill(c);
    if (!c.trueForm) c.tdir = Math.atan2(bx - c.x, bz - c.z);
    animate(c, dt, dt);
  }
  // the heart, slower and slower, then nothing
  const beats = [0.5, 1.5, 2.8, 4.4, 6.3];
  if (END.sfx < beats.length && t >= beats[END.sfx]) audio.hx('heart', 0, 0.55 - END.sfx++ * 0.09);
  if (END.kind === 'shot') {
    const blue = Math.sin(R.time * 9) > 0;
    endLight(bx + 2.2, 1.8, bz - 1.6, 6.5, blue ? [0.1, 0.22, 0.85] : [0.8, 0.08, 0.06]);
  }
  endLight(bx, 2.4, bz, 3.6, [0.55, 0.52, 0.47]); // a streetlamp's worth, so the dark doesn't take you before your eyes do
  endAir({ stress: 0 });
  // your eyes: they go, come open a crack for one more look, and go
  const close = 6.6;
  if (t < close) {
    endCam(bx, bz, t < 2.4 ? 2.2 : lerp(2.2, 1.55, sstep(2.4, close, t)), dt, 1.6);
    cam.yawT += dt * 0.03;
    END.lid =
      t < 2.4
        ? 0
        : t < 4.2
          ? 0.78 * sstep(2.4, 4.2, t)
          : t < 4.9
            ? 0.78 - 0.3 * sstep(4.2, 4.9, t)
            : 0.48 + 0.52 * sstep(4.9, close, t);
    return false;
  }
  if (endNext()) {
    END.lid = 1;
    return t > close + 0.3;
  }
  // and then the street from a little way off, drained of colour: you, and whoever stands over you, clear of the card
  const [cx, cz] = endAside(bx, bz, 0.42, 0.24);
  if (END.lid > 0) {
    END.lid = 0;
    END.fade = 1;
    cam.zoom = cam.zoomT = 2.7;
    cam.tx = cx;
    cam.tz = cz;
  }
  endCam(cx, cz, 2.7, dt, 3);
  END.fade = 1 - sstep(close + 0.2, close + 1.6, t);
  cam.yawT += dt * 0.02;
  return t > close + 1.4;
}

// ── locked up: booked, walked down, the door; then the days in the window
function endCell(dt, t, first) {
  const P = PLAYER;
  if (first) {
    END.cellAt = 0;
    END.beat = P.onMap ? 1.5 : 0; // out in the street: a moment of his hand on you first
    if (P.onMap) {
      endStill(P);
      P.pose = 'stand';
      P.poseFn = CUFFED_POSE;
    }
    BOLTS.length = 0;
    UI.aim = null;
  }
  if (t < END.beat) {
    endCam(P.x, P.z, 2.3, dt, 2);
    animate(P, dt, dt);
    const off = NPC.officer;
    if (off && off.onMap && Math.hypot(off.x - P.x, off.z - P.z) < 3) {
      off.moving = false;
      off.tdir = Math.atan2(P.x - off.x, P.z - off.z);
      animate(off, dt, dt);
    }
    END.fade = sstep(END.beat - 0.55, END.beat, t);
    endAir();
    return false;
  }
  if (!CELL.forever) {
    CELL.forever = true;
    CELL.book = true;
    P.onMap = false;
    P.poseFn = null;
    END.fade = 0;
    HX.letterT = 0; // the cells have their own frame
  }
  if (CELL.phase === 'held' && CELL.clang) {
    if (!END.cellAt) END.cellAt = t;
    G.t += lerp(0, 900, sstep(0.6, 3.6, t - END.cellAt)) * dt; // up to fifteen hours a second, and it doesn't stop
    if (endNext()) END.fade = sstep(5.2, 5.9, t - END.cellAt);
    return t - END.cellAt > (endNext() ? 5.9 : 4.2);
  }
  return false;
}

// ── THEIR last day, lost: what THEY made of Wexley
function endThey(dt, t, first) {
  const fac = G.faction;
  if (first) theySet(fac);
  END.fade = 1 - sstep(0.1, 1.6, t);
  cam.yaw += dt * 0.035;
  cam.yawT = cam.yaw;
  [cam.tx, cam.tz] = endAside(END.at[0], END.at[1], 0.2, 0.04);
  if (fac === 'aliens') theyAliens(dt, t);
  else if (fac === 'lizards') theyLizards(dt, t);
  else theyZombies(dt, t);
  for (const a of END.mob) if (!a.hide) hxAnimate(a, dt); // the horror layer stands still once it's over: these go on
  const cap = $('#endcap');
  if (cap && END.cap === 0 && t > 1.2) {
    END.cap = 1;
    cap.querySelector('b').textContent = THEY_WON[fac][0];
    cap.querySelector('span').textContent = THEY_WON[fac][1];
    cap.hidden = false;
    cap.classList.remove('go');
    void cap.offsetWidth;
    cap.classList.add('go');
  }
  if (cap && t > 6.2) cap.hidden = true;
  return t > 8.6;
}
// the stage: nobody left of the day, all of the town in view, the hour THEY took it
function theySet(fac) {
  if (CELL.on) {
    CELL.forever = false;
    cellExit();
  }
  CELL.fade = 0;
  END.lid = 0;
  END.fade = 1;
  END.wide = true;
  END.cap = 0;
  for (const c of CHARS) c.onMap = false;
  CARS.length = 0;
  BOLTS.length = 0;
  UI.aim = null;
  HX.actors.length = 0;
  HX.decals.length = 0;
  HX.crafts.length = 0;
  HX.far.length = 0;
  HX.scene = null;
  HX.letterT = 1;
  HX.selT = 0;
  explored.fill(1);
  visTarget.fill(1);
  visCur.fill(1);
  MAPS.dirty = true;
  lightT = 0;
  lastPlayerCell = -1;
  G.t = fac === 'zombies' ? (WEEK + 2) * 1440 + 8 * 60 + 40 : WEEK * 1440 - 1;
  G.rainK = G.wet = fac === 'zombies' ? 0.25 : 0.55;
  END.mob.length = 0;
  const at = (END.at = fac === 'aliens' ? END_PARK : fac === 'lizards' ? END_HATCH : END_DOOR);
  cam.follow = false;
  cam.zoom = cam.zoomT = fac === 'aliens' ? 10.5 : 8.5;
  END.yaw0 = cam.yaw = cam.yawT = fac === 'zombies' ? -0.35 : 0.5;
  // the town: everyone who's left of it, and THEM as THEY really are
  const folk = CAST.filter(
    (d) => !d.never && !G.them.includes(d.id) && NPC[d.id] && !NPC[d.id].slain && d.id !== 'officer',
  )
    .map((d) => NPC[d.id])
    .concat(NPC.officer && !NPC.officer.slain ? [NPC.officer] : []);
  const them = G.them.map((id) => NPC[id]).filter((n) => n && !n.slain);
  const spot = (cx, cz, r0, r1) => {
    for (let k = 0; k < 40; k++) {
      const a = rand(0, TAU),
        r = rand(r0, r1),
        x = Math.floor(cx + Math.sin(a) * r),
        z = Math.floor(cz + Math.cos(a) * r);
      if (hxOpen(x, z) && z < TOWN_H) return [x + rand(0.25, 0.75), z + rand(0.25, 0.75)];
    }
    return [cx + rand(-r1, r1), cz];
  };
  folk.forEach((n, i) => {
    let p;
    if (fac === 'aliens')
      p = i < 3 ? spot(at[0], at[1], 3.6, 6) : spot(at[0], at[1], 7, 15); // a few nearly there
    else if (fac === 'lizards') {
      const side = i % 2 ? 1 : -1;
      p = [at[0] + side * (3 + i * 1.6), 14.6 + (i % 3) * 0.7];
    } else p = [at[0] + 3.5 + i * 1.6, 14.4 + (i % 3) * 0.9];
    const a = hxActor(n.look, p[0], p[1], { name: n.name, shadow: 0.55, pace: rand(0.85, 1.15), delay: rand(0, 1.6) });
    if (fac === 'aliens') a.trance = true;
    if (fac === 'zombies') {
      a.thrall = 'zombies';
      a.poseFn = thrallPose;
    }
    a.dir = a.tdir = Math.atan2(at[0] - a.x, at[1] - a.z);
    END.mob.push(a);
  });
  them.forEach((n, i) => {
    let p;
    if (fac === 'aliens') {
      const a = (i / Math.max(1, them.length)) * TAU + 0.6;
      p = [at[0] + Math.sin(a) * 3.6, at[1] + Math.cos(a) * 3.6];
    } else if (fac === 'lizards') p = [at[0] + (i % 2 ? 1.7 : -1.7), at[1] + (i > 1 ? 1.2 : -1.0)];
    else p = [at[0] + 4.5 + i * 2.6, 15.9];
    const a = hxActor(n.look, p[0], p[1], { name: n.name, shadow: 0.6, them: true, pace: 1, delay: 0 });
    a.tell = { type: 'true', t: TF_CHANGE, fac };
    a.dir = a.tdir =
      fac === 'aliens'
        ? Math.atan2(a.x - at[0], a.z - at[1])
        : fac === 'lizards'
          ? Math.atan2(at[0] - a.x, 0.001)
          : Math.PI;
    END.mob.push(a);
  });
  if (fac === 'aliens') {
    END.cr = { x: at[0], y: 7.5, z: at[1], spin: 0, glow: 1, tilt: 0.04 };
    HX.crafts.push(END.cr);
    audio.hx('thrum', 0, 0.9);
  } else if (fac === 'lizards') {
    // the drain, open, and the warm coming up out of it
    hxDecal(at[0], at[1], 0.95, [0.012, 0.004, 0.002, 0.96], 0, 1e9);
    audio.hx('hiss', 0, 0.6);
  } else audio.hx('groan', 0, 0.7);
  END.sfx = 0;
}
// aliens: it sits over the park and they walk into the light, heads down, and go up
function theyAliens(dt, t) {
  const [cx, cz] = END_PARK,
    cr = END.cr;
  cr.spin += dt * 0.5;
  cr.y = 7.5 + Math.sin(t * 0.8) * 0.15;
  HX.beams.push({
    x: cx,
    y: cr.y - 0.3,
    z: cz,
    r: 2.6,
    h: cr.y - 0.3,
    col: [0.42, 1, 0.74],
    a: 0.6 + 0.08 * Math.sin(t * 3),
  });
  endLight(cx, 1.2, cz, 14, [0.45, 1.3, 0.95]);
  endLight(cx, 5, cz, 8, [0.3, 0.9, 0.6]);
  for (const a of END.mob) {
    if (a.them || a.hide) continue;
    const d = Math.hypot(a.x - cx, a.z - cz);
    if (t < a.delay) continue;
    if (d > 1.6 && !a.up) hxWalk(a, cx, cz, 0.62 * a.pace, dt);
    else {
      // under it: off the ground, and up
      a.up = true;
      a.moving = false;
      a.y = (a.y || 0) + dt * (0.5 + a.y * 0.35);
      a.ghost = clamp(a.y / 6, 0, 0.8);
      if (a.y > 7) a.hide = true;
    }
  }
  if (t > 3.2 * (END.sfx + 1)) {
    END.sfx++;
    audio.hx('thrum', 0, 0.7);
  }
  endAir({ night: true, dread: 0.5 });
}
// lizards: the streetlamps go out, the drain on Main street glows, and they go down it one after another
function theyLizards(dt, t) {
  const [hx, hz] = END_HATCH,
    pul = 0.8 + 0.2 * Math.sin(t * 2.3);
  for (const st of HX.lampSt.values()) st.dead = 2;
  HX.blood = 0.9; // the blood-night look, held (the horror layer lets it go once it's over)
  endLight(hx, 0.3, hz, 9 * pul, [3.4 * pul, 0.95 * pul, 0.22]);
  endLight(hx - 13, 0.6, hz, 11, [1.1, 0.32, 0.08]);
  endLight(hx + 13, 0.6, hz, 11, [1.1, 0.32, 0.08]);
  for (let i = 0; i < 9; i++) {
    const ph = (t * (0.28 + (i % 3) * 0.06) + i / 9) % 1,
      a = i * 2.4 + t * 0.4;
    hxGlint(
      hx + Math.sin(a) * 0.5,
      0.1 + ph * 2.6,
      hz + Math.cos(a) * 0.4,
      0.1 + 0.06 * (1 - ph),
      [1, 0.42, 0.12],
      (1 - ph) * 0.85,
    );
  }
  for (const a of END.mob) {
    if (a.hide) continue;
    if (a.them) {
      a.tdir = Math.atan2(hx - a.x, hz - a.z);
      continue;
    }
    if (t < a.delay) continue;
    const d = Math.hypot(a.x - hx, a.z - hz);
    if (d > 0.35 && !a.down) hxWalk(a, hx, hz, 0.75 * a.pace, dt);
    else {
      a.down = true;
      a.moving = false;
      a.y = (a.y || 0) - dt * 0.9;
      if (a.y < -2) a.hide = true;
    }
  }
  if (t > 2.6 * (END.sfx + 1)) {
    END.sfx++;
    audio.hx(END.sfx % 2 ? 'hiss' : 'drip', 0, 0.5);
  }
  endAir({ night: true, dread: 0.35 });
}
// zombies: Monday morning, and everyone comes in to work
function theyZombies(dt, t) {
  const [dx, dz] = END_DOOR;
  for (const a of END.mob) {
    if (t < a.delay) continue;
    const i = END.mob.indexOf(a),
      tx = dx + (i % 4) * 0.8 - 1.2,
      tz = dz + Math.floor(i / 4) * 0.75 + 0.3;
    if (!hxWalk(a, tx, tz, (a.them ? 0.55 : 0.5) * a.pace, dt)) continue;
    a.moving = false;
    a.tdir = Math.PI; // facing the doors, waiting for them to open
  }
  if (t > 2.4 * (END.sfx + 1)) {
    END.sfx++;
    const a = pick(END.mob);
    if (a) hxSound('groan', a.x, a.z, 0.6);
  }
  endAir({ night: false, dread: 0.2 });
}
