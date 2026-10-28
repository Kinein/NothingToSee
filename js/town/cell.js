//@ town/cell — Held in a cell
//@ Defines: CELL, CELL_YOU, CELL_ID, CELL_DOOR_M, CELL_SKY, CELL_SKY_E, CELL_SUN, CELL_TUBE, CELL_TUBE_E, CELL_HAND, CELL_BOARD, CELL_CHALK, CELL_CHALK_E, CELL_POSE, CELL_COP_POSE, cellFrame, …
//@ Uses:    gfx/renderer, sim/core, gfx/station, core/util, world/grid, taken/taken, game/loop, gfx/gl, town/suspicion, world/light-map, …
//@ (header made by tools/map.js; stripped by build.py)
// ───────────── held: the hours you're held go by in the cells under the town (STATION in world/grid, drawn by
// gfx/station), lit and drawn like everywhere else. Booked first: you against the height chart, the flash, face on and
// then side on. The officer walks you down the corridor and slides the door shut on you. Then the bench: head down,
// mostly; now and then you look up, back at the window, or lean back against the wall, and late at night you lie down on
// it. The light in the window goes from day to dusk to night and its patch slides across the floor, the clock spins, the
// tube buzzes and stutters, the man in the next cell sleeps it off, and the officer gets up from his desk now and then to
// walk past the bars. When your time's up, the car brings you back (ARREST).
const CELL = {
  on: false,
  book: false, // set by the arrest: booked on the way in (a save loaded mid-stay starts you on the bench)
  phase: null,
  t: 0,
  pt: 0,
  eye: null,
  fade: 0,
  leave: 0,
  actors: [],
  you: null,
  cop: null,
  drunk: null,
  route: null,
  door: 0,
  doorT: 0,
  clang: false,
  mood: 0,
  moodT: 0,
  moodK: [0, 0, 0, 0],
  patrolAt: 0,
  saved: null,
  cam: { x: 0, z: 0, zoom: 3 },
};
const CELL_YOU = CELL_X[2] + 2.2; // where you sit: a little left of the window, so it and the clock are both in view
const CELL_ID = M4.ident(),
  CELL_DOOR_M = M4.ident(),
  CELL_SKY = [0, 0, 0],
  CELL_SKY_E = [0, 0, 0],
  CELL_SUN = [0, 0, 0],
  CELL_TUBE = [0.9, 0.95, 0.92],
  CELL_TUBE_E = STATION_TUBES.map(() => [0, 0, 0]),
  CELL_HAND = [0.08, 0.08, 0.075],
  CELL_BOARD = [0.07, 0.075, 0.08],
  CELL_CHALK = [0.82, 0.8, 0.74],
  CELL_CHALK_E = [0.12, 0.12, 0.11];
// the speed the clock runs while you sleep or are away: the hours fly, except while you're booked and walked down
const awaySpeed = () => (CELL.on && CELL.phase !== 'held' ? 1 : SLEEP_SPEED);

// cuffed in front: hands together in your lap when you sit, held up with the board when you're booked; the head goes
// where your mood puts it (CELL.moodK: down, up at the bars, back over your shoulder at the window, leant on the wall)
const CELL_POSE = (T, a) => {
  if (a.pose === 'lie') return;
  if (a.board) {
    T.uaL = T.uaR = -0.42;
    T.faL = T.faR = -1.55;
    T.aoL = T.aoR = -0.2;
    return;
  }
  T.uaL = T.uaR = -0.3;
  T.faL = T.faR = -0.95;
  T.aoL = T.aoR = -0.2;
  if (a.pose !== 'sit') return;
  const K = CELL.moodK,
    down = K[0],
    up = K[1],
    back = K[2],
    lean = K[3];
  T.hp = (T.hp || 0) + 0.55 * down - 0.12 * up - 0.3 * back - 0.32 * lean;
  T.hy = (T.hy || 0) * (1 - back) + 1.25 * back;
  T.torso = (T.torso || 0) + 0.16 * down - 0.14 * lean;
};
// the officer at his desk: reading what's in front of him
const CELL_COP_POSE = (T, a) => {
  if (a.pose === 'sit') T.hp = (T.hp || 0) + 0.32;
};

function cellFrame(dt) {
  const want = !!(G && G.started && !G.over && G.away && G.away.kind === 'held');
  if (want && !CELL.on && !CELL.leave) cellEnter();
  if (!CELL.on) {
    CELL.fade = Math.max(0, CELL.fade - dt * 2);
    return;
  }
  if (!want && !CELL.leave) CELL.leave = 0.001; // let out: the screen goes dark on the cell, and comes up on the street
  if (CELL.leave) {
    CELL.leave += dt;
    CELL.fade = Math.min(1, CELL.fade + dt * 2.6);
    if (CELL.leave > 0.45) return cellExit();
  }
  CELL.t += dt;
  CELL.pt += dt;
  try {
    cellStep(dt);
    for (const a of CELL.actors) capAnimate(a, dt);
    cellLights();
  } catch (e) {
    console.error(e);
  }
  const c = CELL.cam,
    k = Math.min(1, dt * (CELL.phase === 'held' ? 0.8 : 2.4)),
    drift = CELL.phase === 'held' ? Math.sin(CELL.t * 0.07) * 0.25 : 0;
  cam.follow = false;
  cam.tx += (c.x + drift - cam.tx) * k;
  cam.tz += (c.z - cam.tz) * k;
  cam.zoomT = c.zoom;
  cam.yawT = 0;
  audio.update({
    hum: true,
    outside: false,
    night: hourF() > 20 || hourF() < 6,
    stress: PLAYER.needs.stress,
    rain: (G.rainK || 0) * 0.3,
    car: 0,
    dread: 0,
  });
}
function cellEnter() {
  const Z0 = STATION_Z0;
  CELL.on = true;
  CELL.t = 0;
  CELL.leave = 0;
  CELL.fade = 1;
  CELL.clang = false;
  CELL.saved = { yaw: cam.yawT, zoom: cam.zoomT, darkSight };
  darkSight = 5;
  lightT = 0;
  CELL.actors.length = 0;
  CELL.you = sceneActor('you', CELL_CHART_X, Z0 + 1.12, { look: PLAYER.look, name: PLAYER.name, poseFn: CELL_POSE });
  CELL.you.fx.foil = !!G.inv.foilOn;
  CELL.cop = sceneActor('cop', CELL_CHART_X + 0.75, Z0 + 3.6, {
    look: NPC.officer.look,
    dir: Math.PI,
    poseFn: CELL_COP_POSE,
  });
  CELL.drunk = sceneActor('drunk', CELL_X[1] + 2.5, CELL_N + 0.25, { dir: -Math.PI / 2, pose: 'lie', y: -0.12 });
  CELL.actors.push(CELL.you, CELL.cop, CELL.drunk);
  CELL.moodK.fill(0);
  CELL.moodK[0] = 1;
  CELL.mood = 0;
  CELL.moodT = 6;
  CELL.patrolAt = CELL.t + rand(6, 12);
  if (CELL.book) cellPhase('book');
  else {
    cellSeat();
    cellCopAtDesk();
    cellPhase('held');
  }
  CELL.book = false;
  for (const a of CELL.actors) {
    a.dir = a.tdir;
    capAnimate(a, 0.5);
  }
  cam.tx = CELL.cam.x;
  cam.tz = CELL.cam.z;
  cam.zoom = CELL.cam.zoom;
  cam.yaw = cam.yawT = 0;
}
function cellExit() {
  CELL.on = false;
  CELL.leave = 0;
  CELL.phase = null;
  CELL.actors.length = 0;
  CELL.you = CELL.cop = CELL.drunk = null;
  CELL.eye = null;
  const s = CELL.saved;
  if (s) {
    darkSight = s.darkSight;
    cam.yaw = cam.yawT = s.yaw;
    cam.zoomT = s.zoom;
  }
  cam.follow = true;
  if (PLAYER) {
    cam.tx = PLAYER.x;
    cam.tz = PLAYER.z;
  }
  lastPlayerCell = -1;
  lightT = 0;
}
function cellPhase(p) {
  CELL.phase = p;
  CELL.pt = 0;
  const Z0 = STATION_Z0,
    c = CELL.cam;
  if (p === 'book') Object.assign(c, { x: CELL_CHART_X, z: Z0 + 0.6, zoom: 1.9 });
  else if (p === 'walk') Object.assign(c, { x: 17.6, z: Z0 + 2.4, zoom: 3.3 });
  else if (p === 'held') Object.assign(c, { x: CELL_X[2] + 2.6, z: Z0 + 1.35, zoom: 2.55 });
  CELL.eye = p === 'book' ? [CELL_CHART_X, Z0 + 3] : [CELL_X[2] + 2.5, Z0 + 6.5]; // what the scene sees from
  lastPlayerCell = -1;
}
// you on the bench, the cop at his desk: where a stay picks up when there's nothing to show on the way in
function cellSeat() {
  const y = CELL.you;
  Object.assign(y, {
    x: CELL_YOU,
    z: CELL_N + 0.3,
    dir: 0,
    tdir: 0,
    pose: 'sit',
    seatY: 0.46,
    moving: false,
    board: false,
  });
  CELL.door = CELL.doorT = 0;
  CELL.clang = true;
}
function cellCopAtDesk() {
  Object.assign(CELL.cop, { x: 23.6, z: STATION_Z0 + 4.32, dir: 0, tdir: 0, pose: 'sit', seatY: 0.5, moving: false });
  CELL.route = null;
}
// walk an actor along a list of points; true once it's at the last
function cellRoute(a, pts, spd, dt) {
  while (pts.length && capWalk(a, pts[0][0], pts[0][1], spd, dt)) pts.shift();
  return !pts.length;
}
function cellStep(dt) {
  const Z0 = STATION_Z0,
    you = CELL.you,
    cop = CELL.cop,
    t = CELL.pt;
  CELL.door += (CELL.doorT - CELL.door) * Math.min(1, dt * 3.2);
  if (CELL.phase === 'book') {
    // the booking photo: face on, the flash; side on, the flash again
    if (t < 0.6) CELL.fade = Math.max(0, 1 - t / 0.5);
    you.board = true;
    you.tdir = t > 1.7 && t < 2.9 ? -Math.PI / 2 : 0;
    cop.tdir = Math.PI;
    if ((t - dt < 1.15 && t >= 1.15) || (t - dt < 2.35 && t >= 2.35)) {
      R.flash = 0.85;
      audio.blip('shutter');
    }
    if (t > 3.3) CELL.fade = Math.min(1, (t - 3.3) / 0.35);
    if (t > 3.7) {
      // cut: down the corridor, his hand on your arm, the door already open
      you.board = false;
      Object.assign(you, { x: 20.4, z: Z0 + 4.35, dir: -Math.PI / 2, tdir: -Math.PI / 2 });
      Object.assign(cop, { x: 21.3, z: Z0 + 4.45, dir: -Math.PI / 2, tdir: -Math.PI / 2 });
      CELL.door = CELL.doorT = 1;
      const dx = CELL_X[2] + 2.5;
      you.route = [
        [dx + 0.3, Z0 + 4.3],
        [dx, Z0 + 3.4],
        [CELL_YOU, Z0 + 1.6],
      ];
      CELL.route = [[dx + 1.05, Z0 + 4.35]];
      cellPhase('walk');
      cam.tx = CELL.cam.x;
      cam.tz = CELL.cam.z;
      cam.zoom = CELL.cam.zoom;
    }
    return;
  }
  if (CELL.phase === 'walk') {
    if (t < 0.5) CELL.fade = Math.max(0, 1 - t / 0.4);
    if (you.route) {
      if (cellRoute(you, you.route, 1.25, dt)) you.route = null;
    } else if (you.pose !== 'sit') {
      // in: turn round, and down onto the bench
      you.tdir = 0;
      if (Math.abs(angDiff(you.dir, 0)) < 0.3) Object.assign(you, { pose: 'sit', seatY: 0.46, sitT: 0 });
    } else {
      you.sitT += dt;
      you.z += (CELL_N + 0.3 - you.z) * Math.min(1, dt * 4);
    }
    if (CELL.route) {
      if (cellRoute(cop, CELL.route, 1.15, dt)) CELL.route = null;
    } else if (!CELL.clang) {
      cop.tdir = Math.PI;
      if (you.z < Z0 + 2.6) CELL.doorT = 0; // you're in: he slides it shut
      if (CELL.doorT === 0 && CELL.door < 0.06) {
        CELL.clang = true;
        audio.hx('knock', 0, 0.9);
        CELL.route = [
          [CELL_X[2] + 4.5, Z0 + 4.0],
          [23.6, Z0 + 4.0],
          [23.6, Z0 + 4.32],
        ];
      }
    } else if (cop.pose !== 'sit') {
      cop.tdir = 0;
      if (Math.abs(angDiff(cop.dir, 0)) < 0.3) Object.assign(cop, { pose: 'sit', seatY: 0.5 });
    }
    if (you.pose === 'sit' && you.sitT > 1.2 && CELL.clang) cellPhase('held');
    return;
  }
  // ── the hours
  if (!CELL.leave) CELL.fade = Math.max(0, CELL.fade - dt * 2);
  cellMood(dt);
  const h = hourF(),
    night = h >= 23.5 || h < 5.5;
  // late, you lie down on the bench; at first light you sit up again
  if (night && you.pose === 'sit')
    Object.assign(you, { pose: 'lie', x: CELL_X[2] + 2.5, z: CELL_N + 0.25, y: -0.12, tdir: Math.PI / 2 });
  else if (!night && you.pose === 'lie')
    Object.assign(you, { pose: 'sit', x: CELL_YOU, z: CELL_N + 0.3, y: 0, tdir: 0, dir: 0 });
  // the officer: at his desk, and now and then a walk down past the bars and back
  if (CELL.route) {
    if (cellRoute(cop, CELL.route, 1.05, dt)) {
      if (cop.z > Z0 + 4.2) {
        cop.tdir = 0;
        cop.pose = 'sit';
        cop.seatY = 0.5;
        CELL.route = null;
      } else CELL.route = null;
    }
  } else if (cop.pose === 'stand' && cop.z < Z0 + 4.2) {
    // stopped at your bars: a look in, then back
    cop.tdir = Math.PI;
    cop.lookT = (cop.lookT || 0) + dt;
    if (cop.lookT > 2.2)
      CELL.route = [
        [23.6, Z0 + 4.0],
        [23.6, Z0 + 4.32],
      ];
  } else if (CELL.t > CELL.patrolAt) {
    CELL.patrolAt = CELL.t + rand(9, 20);
    cop.pose = 'stand';
    cop.lookT = 0;
    CELL.route = [
      [23.6, Z0 + 4.0],
      [chance(0.5) ? CELL_X[1] + 2.5 : CELL_X[2] + 2.2, Z0 + 4.0],
    ];
  }
}
// where your eyes go while you wait: mostly the floor
function cellMood(dt) {
  CELL.moodT -= dt;
  if (CELL.moodT <= 0) {
    CELL.mood = CELL.mood ? 0 : 1 + Math.floor(Math.random() * 3);
    CELL.moodT = CELL.mood ? rand(1.6, 3.2) : rand(2.5, 6);
  }
  for (let k = 0; k < 4; k++)
    CELL.moodK[k] += ((k === CELL.mood ? 1 : 0) - CELL.moodK[k]) * Math.min(1, dt * (k === 2 ? 1.2 : 1.8));
}
// the light the window lets in: a patch of it sliding over the floor as the sun goes over, and the sky in the glass
function cellLights() {
  const day = cellSky(),
    sun = clamp((hourF() - 6) / 14, 0, 1),
    k = (0.15 + 0.85 * day) * (1 - CELL.fade);
  if (k > 0.02) {
    for (let c = 0; c < 3; c++) CELL_SUN[c] = CELL_SKY[c] * 0.9 * k;
    hxLight(
      CELL_X[2] + 2.5 + lerp(1.3, -1.3, sun),
      0.25,
      STATION_Z0 + lerp(1.7, 2.3, Math.abs(sun - 0.5) * 2),
      1.5,
      CELL_SUN,
    );
  }
}
// the light outside the window, by the hour: blue night, a warm low sun, flat grey day. Into CELL_SKY (0…1); returns
// how much day there is
const CELL_NIGHT = [30, 42, 74],
  CELL_NOON = [178, 192, 200],
  CELL_GOLD = [222, 146, 92];
function cellSky() {
  const hh = hourF(),
    day = Math.min(clamp((hh - 5.2) / 2, 0, 1), 1 - clamp((hh - 18.6) / 2, 0, 1)),
    warm = clamp(Math.max(1 - Math.abs(hh - 6.6) / 1.4, 1 - Math.abs(hh - 19.4) / 1.4), 0, 1);
  for (let i = 0; i < 3; i++)
    CELL_SKY[i] = lerp(lerp(CELL_NIGHT[i], CELL_NOON[i], day), CELL_GOLD[i], warm * 0.8) / 255;
  return day;
}
function cellHand(ang, len, wd) {
  const c = CELL_CLOCK;
  partR(
    CELL_ID,
    c[0] + Math.sin(ang) * len * 0.4,
    c[1] + Math.cos(ang) * len * 0.4,
    c[2] + 0.064,
    0,
    0,
    -ang,
    wd,
    len,
    0.006,
    'box',
    CELL_HAND,
  );
}
// in the world pass: the people, your door, the tubes, the sky in the windows, the clock's hands, the booking board
function cellDraw() {
  if (!CELL.on) return;
  gl.uniform1f(U.uVisMin, 0);
  for (const a of CELL.actors) drawChar(a);
  const doors = R.cellDoors;
  if (doors) {
    const m = doors[2];
    CELL_DOOR_M[12] = CELL_X[2] + CELL_DOOR.at - CELL.door * CELL_DOOR.slide;
    CELL_DOOR_M[14] = CELL_BARS_Z + 0.07;
    m.model = CELL_DOOR_M;
    drawMesh(doors[0]);
    drawMesh(doors[1]);
    drawMesh(m);
  }
  gl.uniform1f(U.uEmitMul, 1);
  gl.uniform1f(U.uDyn, 1);
  gl.uniform1i(U.uCut, 0);
  drawHi = 0;
  drawSpec = 0;
  for (let i = 0; i < STATION_TUBES.length; i++) {
    const tb = STATION_TUBES[i],
      e = CELL_TUBE_E[i];
    for (let c = 0; c < 3; c++) e[c] = tb.l.col[c] * tb.l.cur * 1.6;
    part(CELL_ID, tb.x, tb.y + 0.025, tb.z, tb.len, 0.04, 0.04, 'box', CELL_TUBE, e);
  }
  const day = cellSky();
  for (let c = 0; c < 3; c++) CELL_SKY_E[c] = CELL_SKY[c] * (0.3 + 0.3 * day);
  for (const x0 of CELL_X)
    part(CELL_ID, x0 + 2.5, 1.54, STATION_Z0 + 0.54, 0.94, 1.2, 0.01, 'box', CELL_SKY, CELL_SKY_E);
  // the hands, going round
  const tm = tod();
  cellHand(((tm % 720) / 720) * TAU, 0.11, 0.018);
  cellHand(((tm % 60) / 60) * TAU, 0.15, 0.011);
  // the board you hold for the photo
  const y = CELL.you;
  if (y && y.board) {
    const fx = Math.sin(y.dir),
      fz = Math.cos(y.dir),
      bx = y.x + fx * 0.27,
      bz = y.z + fz * 0.27;
    partR(CELL_ID, bx, 1.08, bz, 0, y.dir, 0, 0.44, 0.22, 0.02, 'box', CELL_BOARD);
    for (let r = 0; r < 3; r++)
      partR(
        CELL_ID,
        bx + fx * 0.012,
        1.14 - r * 0.055,
        bz + fz * 0.012,
        0,
        y.dir,
        0,
        0.34 - r * 0.07,
        0.022,
        0.004,
        'box',
        CELL_CHALK,
        CELL_CHALK_E,
      );
  }
}

// alone with you at night, at awareness 70+: one of THEM comes to eat you
function ambushTick() {
  const P = PLAYER,
    h = hourF();
  if (!theyStir() || !mayHuntYou() || !P.onMap || G.sleeping || ARREST.on || !(h >= 22 || h < 5)) return;
  const night = dayNo(G.t - 6 * 60);
  if (G.ambushNight === night || inRoomSet(P, (r) => r.home)) return;
  const near = CHARS.some(
    (w) => !w.isPlayer && !w.isThem && w.onMap && !asleep(w) && Math.hypot(w.x - P.x, w.z - P.z) < 12,
  );
  if (near) return;
  // a member already out there and close: rule 2
  for (const n of alive())
    if (
      n.onMap &&
      !n.trueForm &&
      !n.fleeing &&
      !n.engaged &&
      (!roomAt(n.x, n.z) || roomAt(n.x, n.z) === roomAt(P.x, P.z)) &&
      Math.hypot(n.x - P.x, n.z - P.z) < 6 &&
      seesSpot(n, P.x, P.z, 6)
    ) {
      G.ambushNight = night;
      return trueForm(n, 'ambush');
    }
  if (!chance(G.aware >= 100 || G.stage >= 5 ? 0.2 : 0.08)) return;
  const hunters = alive().filter(
    (n) =>
      (atHome(n) || !n.onMap) &&
      !n.hideUntil &&
      !n.trueForm &&
      (temper(n) === 'aggressive' || G.aware >= 100 || G.stage >= 4),
  );
  if (!hunters.length) return;
  const n = pick(hunters);
  G.ambushNight = night;
  if (!n.onMap) {
    const h = HOUSE_OF[n.id];
    if (!h) return;
    placeChar(n, h.spot[0], h.spot[1]);
    n.onMap = true;
    n.shown = 0;
  }
  hardReset(n);
  n.hunting = true;
  enqueue(
    n,
    chaseAct(P, {
      label: '…',
      walk: true,
      giveUp: 45,
      reach: 6,
      quit: () =>
        !P.onMap ||
        inRoomSet(P, (r) => r.home) ||
        CHARS.some(
          (w) => !w.isPlayer && !w.isThem && w !== n && w.onMap && !asleep(w) && Math.hypot(w.x - P.x, w.z - P.z) < 8,
        ),
      onCatch: (c) => {
        c.hunting = false;
        if (seesSpot(c, P.x, P.z, 8) && trueForm(c, 'ambush')) echo('ambush', { x: c.x, z: c.z });
        else leaveMap(c);
      },
      onLose: (c) => {
        c.hunting = false;
        leaveMap(c);
      },
    }),
  );
}

// a note pinned under someone's polaroid; gossip notes are signed with their source and day
function addNote(n, text, o) {
  n.notes.push(Object.assign({ t: G.t, text }, o || {}));
  if (n.notes.length > 14) n.notes.shift();
}
