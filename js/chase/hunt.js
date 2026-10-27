//@ chase/hunt — When THEY come for you: the hunters, their tuning, how each kind of hunt starts
//@ Defines: HUNT, HUNT_WHO, HUNT_SPD, HUNT_SRCH, HUNT_SEE, HUNT_LOSE, HUNT_GRAB, BED_SPOT, WIN_IN, WIN_OUT, BLDG_OUT, huntActor, huntH, huntStart, HUNT_SETUP, huntBeam
//@ Uses:    sim/core, audio/sound, horror/layer, core/util, ui/interface, taken/coming, taken/taken, world/paths, chase/they-come, sim/characters, …
//@ (header made by tools/map.js; stripped by build.py)
// ───────────────────────── when THEY come for you: the chase before the dark ─────────────────────────
// Nothing is decided off-screen. THEY come in through the front door, the bedroom window, a cover in the alley, the ground
// under the park's trees or a light in the sky, and you're awake for it, on your own feet: run, hide, climb out, break a grip,
// get up off the ground. Only if THEY lay hands on you does the dark come. Everything here reads off the map: eyes in the
// dark, a lantern, a beam on the ground, a mark over a head that's seen you. No words.
const HUNT = {
  on: false,
  kind: null,
  fac: null,
  why: null,
  t: 0,
  hs: [],
  actors: [],
  home: [0, 0],
  leash: 14,
  beam: null,
  grab: null,
  down: null,
  grabs: 0,
  foe: null,
  lead: null,
  light: null,
  climb: null,
  winOpen: false,
  fxT: 0,
  slowT: 0,
  runHint: 0,
  spot: null,
};
const HUNT_WHO = { id: 'hunter', isPlayer: true, breakIn: true, x: 0, z: 0 }; // how THEY path: through any door in the building
const HUNT_SPD = { grey: 3.5, lizard: 4.1, dead: 2.85 }; // a run, in tiles a second (yours: 5.0; jogging, 3.3)
const HUNT_SRCH = { grey: 1.7, lizard: 1.9, dead: 1.35 }; // looking for you
const HUNT_SEE = { grey: [7.5, 1.15], lizard: [7, 0.95], dead: [6, 1.35] }; // how far, and how wide
const HUNT_LOSE = { grey: 6, lizard: 4.5, dead: 8 }; // seconds of looking before THEY give it up
const HUNT_GRAB = { grey: 0.72, lizard: 0.75, dead: 0.85 };
const BED_SPOT = [9.5, 29.5],
  WIN_IN = [8.5, 31.5],
  WIN_OUT = [9.5, 33.45],
  BLDG_OUT = [12.6, 18.4];
ICON_PATHS.window = 'M5 3h14v18H5zM12 3v18M5 12h14';
ICON_PATHS.up = 'M12 20V5M6 11l6-6 6 6';

function huntActor(kind, x, z, o = {}) {
  const fac = kind === 'grey' ? 'aliens' : kind === 'lizard' ? 'lizards' : 'zombies';
  const a = Object.assign(
    {
      id: 'hunt' + ++HX.id,
      cap: true,
      hunter: true,
      kind,
      x,
      z,
      y: 0,
      dir: 0,
      tdir: 0,
      onMap: true,
      shown: 1,
      J: defaultJ(),
      fx: {},
      pose: 'stand',
      anim: 'idle',
      animT: rand(0, 10),
      walkPh: 0,
      moving: false,
      run: false,
      queue: [],
      hover: false,
      gaze: 0,
      ghost: 0,
      hide: false,
      shadow: 0.5,
      tell: { type: 'true', t: 9, w: 0, fac },
      look: null,
      poseFn: null,
      breakIn: true,
      isPlayer: false,
    },
    o,
  );
  a.tdir = a.dir;
  HUNT.actors.push(a);
  return a;
}
function huntH(kind, x, z, o = {}) {
  const a = huntActor(kind, x, z, { dir: o.dir || 0, hide: !!o.hide, y: o.y || 0 });
  const h = Object.assign(
    {
      a,
      kind,
      state: 'wait',
      wait: 0,
      see: false,
      seeT: 0,
      last: null,
      lost: 0,
      path: null,
      pi: 0,
      rp: 0,
      src: [x, z],
      stun: 0,
      blink: 2.5,
      lantern: kind === 'lizard',
      spotted: false,
      freeze: 0,
      out: 0,
      bash: 0,
    },
    o,
    { a },
  );
  HUNT.hs.push(h);
  return h;
}
const huntLive = (h) => h.state !== 'gone' && h.state !== 'wait';

// ── the start of it
function huntStart(kind, o = {}) {
  if (HUNT.on || CAP.on || ARREST.on || !G || !G.started || G.over || !PLAYER.onMap || G.away || UI.scene) return false;
  const P = PLAYER,
    fac = G.faction;
  const S = HUNT_SETUP[kind] && HUNT_SETUP[kind][fac];
  if (!S) return false;
  huntClear();
  Object.assign(HUNT, {
    on: true,
    kind,
    fac,
    why: o.why || null,
    t: 0,
    grabs: 0,
    foe: o.foe || null,
    beam: null,
    grab: null,
    down: null,
    light: null,
    climb: null,
    winOpen: false,
    slowT: 0,
    runHint: 1,
    spot: null,
  });
  HUNT.lead = pick(alive()) || null;
  closeMenu();
  UI.fight = null;
  $('#fight').hidden = true;
  UI.aim = null;
  BOLTS.length = 0;
  if (HX.scene) hxEndScene();
  HX.far.length = 0;
  if (G.sleeping) {
    const a = P.queue[0];
    if (a) a.cancel = true;
  } // you wake
  G.sleeping = false;
  G.speed = 1;
  cam.follow = true;
  for (const c of CHARS)
    if (c.trueForm && c.trueForm.mode === 'attack' && Math.hypot(c.x - P.x, c.z - P.z) < 14) {
      c.trueForm.mode = 'flee';
      flee(c);
    }
  G.dayShown = dayNo();
  S(o);
  // why tonight: the eye at the top of the screen (THEY know you) or THEIR week, flaring as it starts
  if (HUNT.why === 'aware') UI.heatPulse = 3.5;
  else if (HUNT.why === 'plan') UI.planBump = 3.5;
  addStress(8);
  audio.init();
  HX.jolt = Math.max(HX.jolt, 0.6);
  return true;
}
const HUNT_SETUP = {
  // in your own bed: you wake as THEY come in
  sleep: {
    aliens() {
      HUNT.home = [11, 24];
      HUNT.leash = 14;
      HUNT.light = { t0: 0 }; // the bedroom fills with green from the window before anything is in it
      audio.hx('thrum', 0.2, 0.8);
      huntH('grey', ...WIN_IN, {
        wait: 2.8,
        hide: true,
        appear: true,
        freeze: 0.8,
        last: BED_SPOT.slice(),
        dir: Math.PI * 0.75,
      });
      const lv = nearestWalkable(4.5, 21.5, HUNT_WHO, 2) || [4, 21];
      huntH('grey', lv[0] + 0.5, lv[1] + 0.5, {
        wait: 5.6,
        hide: true,
        appear: true,
        freeze: 0.6,
        last: [8.5, 24.5],
        dir: Math.PI / 2,
      });
      HUNT.beam = huntBeam(12.5, 15.8, { delay: 3, home: [12.5, 16], leash: 13, y: 11 });
    },
    lizards() {
      HUNT.home = [11, 24];
      HUNT.leash = 14;
      audio.hx('lock', 0.5, 0.9); // THEY have a key
      setTimeout(() => {
        if (HUNT.on) {
          capDoor(FLAT_DOOR, 1);
          audio.hx('creak', 0.4, 0.7);
        }
      }, 900);
      huntH('lizard', 12.5, 22.5, { wait: 1.3, last: BED_SPOT.slice(), dir: -Math.PI / 2, src: [12.5, 21.5] });
      huntH('lizard', 12.5, 23.5, { wait: 2.6, last: [6.5, 23.5], dir: -Math.PI / 2, src: [12.5, 21.5] });
    },
    zombies() {
      HUNT.home = [11, 24];
      HUNT.leash = 14;
      const climb = (h) => {
        const p = nearestWalkable(...WIN_IN, HUNT_WHO, 1) || [8, 31];
        h.a.x = p[0] + 0.5;
        h.a.z = p[1] + 0.5;
        h.a.y = 0;
        h.a.poseFn = null;
        HUNT.winOpen = true;
        audio.hx('drag', 0, 0.6);
      };
      const press = (h) => {
        h.a.poseFn = (T, a) => {
          T.uaL = -2.5 + Math.sin(a.animT * 6) * 0.15;
          T.uaR = -2.3 + Math.cos(a.animT * 5) * 0.2;
          T.faL = T.faR = -0.3;
          T.hp = -0.2;
        };
      };
      const d1 = huntH('dead', WIN_OUT[0], WIN_OUT[1], {
        wait: 5.8,
        dir: Math.PI,
        last: BED_SPOT.slice(),
        onGo: climb,
      });
      press(d1);
      const d2 = huntH('dead', WIN_OUT[0] - 0.7, WIN_OUT[1] + 0.2, {
        wait: 8.6,
        dir: Math.PI,
        last: BED_SPOT.slice(),
        onGo: climb,
      });
      press(d2);
      huntH('dead', 2.5, 18.5, { wait: 9.5, dir: Math.PI / 2, last: BLDG_OUT.slice(), src: [0.5, 18.5] }); // and one more coming up the pavement to the front
      HUNT.glass = { t0: 0 };
    },
  },
  // THEIR ground, at night: walk into the heart of it and it wakes
  ground: {
    aliens() {
      const Z = GROUND.aliens;
      HUNT.home = Z.at.slice();
      HUNT.leash = 13;
      HUNT.beam = huntBeam(Z.at[0], Z.at[1], {
        delay: 0.6,
        home: Z.at.slice(),
        leash: 13,
        y: 9,
        x0: PLAYER.x,
        z0: PLAYER.z,
      });
      huntH('grey', Z.at[0] + 0.5, Z.at[1] - 0.5, {
        wait: 1.8,
        hide: true,
        appear: true,
        freeze: 0.5,
        last: [PLAYER.x, PLAYER.z],
      });
      audio.hx('thrum', 0, 1);
    },
    lizards() {
      HUNT.home = MANHOLE.slice();
      HUNT.leash = 13;
      const h = huntH('lizard', MANHOLE[0], MANHOLE[1], {
        wait: 0.9,
        y: -1.4,
        dir: Math.atan2(PLAYER.x - MANHOLE[0], PLAYER.z - MANHOLE[1]),
        src: MANHOLE.slice(),
        emerge: true,
        last: [PLAYER.x, PLAYER.z],
        down: true,
      });
      h.onWait = (hh) => {
        hh.a.y = lerp(-1.4, 0, 1 - hh.wait / 0.9);
        CAP.cover = 1;
        capFace(hh.a, PLAYER.x, PLAYER.z);
        hh.a.tell.lunge = hh.wait < 0.4;
      };
      h.onGo = (hh) => {
        hh.a.y = 0;
        hh.a.tell.lunge = false;
        if (Math.hypot(PLAYER.x - hh.a.x, PLAYER.z - hh.a.z) < 1.5) huntGrab(hh);
      }; // the first snatch, straight out of the hole
      audio.hx('knock', 0, 1);
      audio.hx('hiss', 0, 1);
      HX.shake = 0.6;
    },
    zombies() {
      const Z = GROUND.zombies;
      HUNT.home = Z.at.slice();
      HUNT.leash = 12;
      const P = PLAYER;
      [0, 1, 2].forEach((i) => {
        const ang = Math.atan2(P.x - Z.at[0], P.z - Z.at[1]) + Math.PI + (i - 1) * 1.2,
          r = 1.3 + (i % 2) * 0.5;
        const p = nearestWalkable(Z.at[0] + Math.sin(ang) * r, Z.at[1] + Math.cos(ang) * r, HUNT_WHO, 2) || [
          Math.floor(Z.at[0]),
          Math.floor(Z.at[1]),
        ];
        const h = huntH('dead', p[0] + 0.5, p[1] + 0.5, {
          wait: 0.7 + i * 0.5,
          y: -1.7,
          last: [P.x, P.z],
          down: true,
          emerge: true,
        });
        const w0 = h.wait;
        h.onWait = (hh) => {
          hh.a.y = lerp(-1.7, 0, clamp(1 - hh.wait / w0, 0, 1));
          capFace(hh.a, PLAYER.x, PLAYER.z);
          hh.a.tell.lunge = true;
        };
        h.onGo = (hh) => {
          hh.a.y = 0;
          hh.a.tell.lunge = false;
        };
      });
      audio.hx('groan', 0, 1);
      audio.hx('sting', 0, 0.7);
      HX.shake = 0.7;
      for (let i = 0; i < 10; i++)
        hxDecal(
          Z.at[0] + rand(-1.6, 1.6),
          Z.at[1] + rand(-1.6, 1.6),
          rand(0.12, 0.32),
          [0.12, 0.08, 0.04, 0.8],
          0,
          240,
        );
    },
  },
  // a red dot found you: the light in the sky comes down for what it hit
  beam: {
    aliens(o) {
      const P = PLAYER;
      HUNT.home = [P.x, P.z];
      HUNT.leash = 18;
      HUNT.slowT = 1.6;
      HUNT.beam = huntBeam(P.x + 0.6, P.z - 0.4, {
        delay: 1.1,
        home: [P.x, P.z],
        leash: 18,
        y: 18,
        drop: true,
        lose: 9,
      });
      audio.hx('thrum', 0, 1);
    },
  },
};
// the light from the craft: a ring on the ground that comes after you. Under a roof it can't see you.
function huntBeam(x, z, o) {
  const cr = { x, y: o.y || 10, z, spin: 0, glow: 0.4, tilt: 0.1, hunt: true };
  HX.crafts.push(cr);
  return Object.assign(
    {
      x: o.x0 != null ? o.x0 : x,
      z: o.z0 != null ? o.z0 : z,
      cr,
      t: 0,
      delay: 1,
      held: 0,
      lock: false,
      lost: 0,
      lose: 7,
      leash: 14,
      home: [x, z],
      leaving: false,
      yTo: 8,
      sweep: rand(0, 9),
    },
    o,
  );
}
