//@ taken/coming — What you see coming
//@ Defines: BED_WIN, FLAT_DOOR, BED_DOOR, MANHOLE, DEAD_CORNER, SUIT, capPre, capWhy, CPOSE, capFall, CAP_PRE, capGrabCast, capBeamFx, bedMoon, capDoor, capPreOut, …
//@ Uses:    taken/taken, audio/sound, horror/layer, gfx/renderer, core/util, input/camera, sim/core, town/cast, world/objects, them/plan, …
//@ (header made by tools/map.js; stripped by build.py)
// ───────────── what you see coming
const BED_WIN = [9.5, 32.0]; // your bedroom window, on the south wall
const FLAT_DOOR = [11, 22],
  BED_DOOR = [9, 26];
const MANHOLE = [27.5, 3.75]; // the alley's back end, past the bins: a cover that never quite sits flat
const DEAD_CORNER = [41.5, 30.5]; // the park's far corner, under the trees, where the leaves are always turned over
const SUIT = {
  skin: 0xdcc6b2,
  hair: 'side',
  hairCol: 0x0e0d0c,
  top: 0x1b1d22,
  bottom: 0x121317,
  outfit: 'tie',
  acc: 0x5e1414,
  h: 1.07,
  w: 1.08,
  shoes: 0x0a0a0a,
};
function capPre(how) {
  const fac = CAP.fac,
    P = PLAYER;
  const base = {
    name: 'pre:' + how,
    done: {},
    start() {
      // you, as a puppet in your own place: the scene moves you, not the controls
      const s = CAP.pose;
      this.you = capYou(s.x, s.z, {
        dir: s.dir,
        pose: s.pose === 'lie' ? 'lie' : 'stand',
        anim: s.pose === 'lie' ? 'sleep' : 'idle',
        y: s.y,
      });
      Object.assign(this.you.J, s.J);
      P.onMap = false;
      capCut(cam.tx, cam.tz, cam.zoom, cam.yaw);
      capCam(s.x, s.z, how === 'sleep' ? 3.3 : 3.6, cam.yaw, 2.2);
      capFx({ letter: 1, daze: 0, lid: 0, fade: 0, washK: 0 }, { letter: 2, fade: 3 });
      HX.jolt = Math.max(HX.jolt, 0.5);
      this.scene = (CAP_PRE[fac] && CAP_PRE[fac][how]) || CAP_PRE[fac].beaten;
      this.scene.start.call(this);
    },
    step(dt, t) {
      return this.scene.step.call(this, dt, t);
    },
    fx(dtR, t) {
      if (this.scene.fx) this.scene.fx.call(this, dtR, t);
    },
    skip() {
      this.t = 999;
    },
    end() {
      if (this.scene.end) this.scene.end.call(this);
      for (const a of CAP.actors.slice()) capKill(a);
      HX.crafts.length = 0;
      HX.decals = HX.decals.filter((d) => d.tag !== 'cap');
    },
  };
  return base;
}
// the reason it's tonight, before anything happens: what THEY know, or how far along THEY are
function capWhy() {
  return; // the why is on screen already: the eye, THEIR plan, the ground you stood on, the fight you lost
  const r = CAP.reason;
  if (r === 'aware') capReason('eye', 'THEY know where you sleep.');
  else if (r === 'plan')
    capReason(
      FACTIONS[CAP.fac].icon,
      'Day ' + clamp(theirDay(), 1, WEEK) + ' of THEIR week. THEY don’t wait any more.',
    );
  else if (r === 'ground') capReason(FACTIONS[CAP.fac].icon, 'You went too far in.', true);
  else if (r === 'beaten') capReason(FACTIONS[CAP.fac].icon, 'You fought one of THEM. You lost.', true);
}
// your body, out of your hands: lying still, falling, dragged, lifted
const CPOSE = {
  limp(T) {
    T.pitch = -Math.PI / 2;
    T.rootY = 0.14;
    T.roll = 0.2;
    T.uaL = -0.3;
    T.uaR = 0.4;
    T.faL = -0.2;
    T.faR = -0.1;
    T.hp = -0.25;
    T.hy = 0.4;
  },
  rigid(T, a) {
    T.pitch = -Math.PI / 2;
    T.rootY = 0.6;
    T.aoL = T.aoR = 0.9;
    T.uaL = T.uaR = 0.05;
    T.faL = T.faR = 0;
    T.hp = -0.35;
    T.roll = Math.sin(a.animT * 27) * 0.02;
  },
  bound(T, a) {
    T.thL = T.thR = -1.5;
    T.shL = T.shR = 1.48;
    T.rootY = 0.47 + 0.08 - 0.88 * a.look.h;
    T.uaL = T.uaR = 0.55;
    T.aoL = T.aoR = -0.15;
    T.faL = T.faR = -1.1;
    T.hp = 0.5;
    T.hr = 0.25;
  },
};
function capFall(a, t, t0, dur = 0.7) {
  // standing to the floor, over dur seconds from t0
  const k = capSeg(t, t0, t0 + dur);
  if (k <= 0) return false;
  a.poseFn = (T) => {
    if (k < 1) {
      T.pitch = (-Math.PI / 2) * k;
      T.rootY = 0.14 * k;
      T.thL = T.thR = -0.4 * Math.sin(k * Math.PI);
      T.uaL = -1.2 * Math.sin(k * Math.PI);
      T.uaR = -0.8 * Math.sin(k * Math.PI);
      T.hp = 0.4 * k;
    } else CPOSE.limp(T);
  };
  return true;
}
const CAP_PRE = {
  aliens: {
    sleep: {
      start() {
        capFxNow({ fade: 1 });
        this.greys = [
          [8.95, 30.25, Math.PI / 2],
          [9.1, 31.45, 1.0],
          [9.55, 28.95, 2.4],
        ].map(([x, z, d]) => capActor('grey', x, z, { dir: d }));
        for (const g of this.greys) g.dark = 1;
      },
      step(dt, t) {
        const A = this;
        capOnce(A, 'why', capWhy);
        if (t > 1.6) capFx({ fade: 0 }, { fade: 0.8 });
        capOnce(A, 'th1', () => audio.hx('thrum', 0.2, 0.7));
        if (t > 4.2) capOnce(A, 'th2', () => audio.hx('thrum', 0.1, 1));
        if (t > 5.4)
          capOnce(A, 'beam', () => {
            audio.hx('beam', 0, 1);
            HX.jolt = 0.8;
            HX.shake = 0.6;
            R.flash = Math.max(R.flash, 0.25);
          });
        // the one at the head leans over you; your head turns toward it; and you go up
        const g = A.greys[0];
        g.poseFn = (T) => {
          const k = capSeg(t, 6.2, 7.2);
          T.torso += 0.55 * k;
          T.uaR = -1.3 * k;
          T.faR = -0.6 * k;
          T.hp = 0.5 * k;
          T.hy = -0.3 * k;
        };
        for (const x of A.greys.slice(1))
          x.poseFn = (T) => {
            const k = capSeg(t, 7.4, 8.6);
            T.uaL = T.uaR = -1.1 * k;
            T.aoL = T.aoR = 0.6 * k;
            T.faL = T.faR = 0.2 * k;
            T.hp = -0.4 * k;
          };
        const lift = capSeg(t, 7.6, 10.4);
        A.you.y = (CAP.pose.y || 0) + lift * 0.95;
        A.you.tdir = CAP.pose.dir + lift * 0.5;
        A.you.poseFn = (T, a) => {
          if (lift > 0) CPOSE.rigid(T, a);
          else if (t > 6.6) {
            T.hy = -0.6;
            a.fx.eye = [0.92, 0.94, 0.9];
          }
        };
        if (t > 6.7) capOnce(A, 'gasp', () => audio.hx('breath', 0, 0.8));
        if (t > 9.6) capFx({ washK: 1, wash: [0.82, 1, 0.92] }, { washK: 1.3 });
        if (t > 11.4) return false;
        capCam(CAP.pose.x - 0.4, CAP.pose.z - 0.2 + lift * 0.2, 3.3 - lift * 0.7, cam.yaw, 1.5);
      },
      fx(dtR, t) {
        const A = this,
          k = capSeg(t, 1.8, 4.2) * 0.35 + capSeg(t, 5.2, 6.0) * 0.9,
          pul = 0.75 + 0.25 * Math.sin(R.time * 7);
        if (k > 0.01) {
          hxLight(BED_WIN[0], 1.5, BED_WIN[1] - 0.4, 6.5, mul3([0.55, 1, 0.8], k * 1.15 * pul));
          hxLight(9.6, 2.4, 30.0, 3.5, mul3([0.75, 1, 0.9], k * 0.7));
          HX.beams.push({
            x: BED_WIN[0] + 2.5,
            y: 9,
            z: BED_WIN[1] + 4.5,
            r: 1.6 + k,
            h: 10,
            col: [0.45, 1, 0.75],
            a: 0.55 * k,
            lean: -0.55,
            leanDir: 0,
          });
          for (let i = 0; i < 14; i++) {
            const ph = (R.time * 0.25 + i / 14) % 1,
              a = i * 2.4;
            hxGlint(
              9.2 + Math.sin(a) * 0.8,
              0.4 + ph * 2.2,
              30.6 + Math.cos(a) * 0.7,
              0.1,
              [0.6, 1, 0.8],
              k * (1 - ph) * 0.5,
            );
          }
        }
        for (const g of A.greys) {
          g.ghost = 0;
          for (const s of [1, -1])
            hxGlint(
              g.x + Math.sin(g.dir) * 0.24 + Math.cos(g.dir) * s * 0.09,
              1.92,
              g.z + Math.cos(g.dir) * 0.24 - Math.sin(g.dir) * s * 0.09,
              0.12,
              [0.4, 1, 0.75],
              0.25 + k * 0.4,
            );
        }
      },
    },
    ground: {
      start() {
        this.cr = { x: CAP.pose.x, y: 17, z: CAP.pose.z, spin: 0, glow: 0, tilt: 0 };
        HX.crafts.push(this.cr);
        capWhy();
      },
      step(dt, t) {
        const A = this,
          cr = A.cr;
        cr.spin += dt * (0.6 + cr.glow * 2);
        cr.y = lerp(17, 6.2, capSeg(t, 0.2, 2.4));
        cr.glow = capSeg(t, 1.6, 2.4);
        capOnce(A, 'th', () => audio.hx('thrum', 0, 1));
        if (t > 2.3)
          capOnce(A, 'beam', () => {
            audio.hx('beam', 0, 1);
            HX.jolt = 0.9;
            HX.shake = 0.8;
          });
        const lift = capSeg(t, 2.8, 6.4);
        A.you.y = lift * 3.6;
        A.you.tdir += dt * lift * 1.2;
        A.you.anim = t > 1.2 && t < 2.8 ? 'lookup' : 'idle';
        A.you.poseFn = (T, a) => {
          a.fx.big = 0;
          if (t < 2.8) return;
          const w = a.animT;
          if (t < 4.8) {
            T.uaL = -2.6 + Math.sin(w * 11) * 0.6;
            T.uaR = -2.4 + Math.sin(w * 13 + 1) * 0.7;
            T.thL = Math.sin(w * 10) * 0.5;
            T.thR = -Math.sin(w * 10) * 0.5;
            T.shL = 0.6 + Math.sin(w * 12) * 0.4;
            T.hp = -0.4;
            a.fx.gape = 1;
            return;
          }
          T.aoL = T.aoR = 1.35;
          T.uaL = T.uaR = -0.1;
          T.hp = -0.95;
          T.thL = T.thR = 0.05;
          a.fx.gape = 1;
        };
        if (t > 3.6) capOnce(A, 'scream', () => audio.hx('scream', 0, 0.9));
        if (t > 5.2) capFx({ washK: 1, wash: [0.85, 1, 0.92] }, { washK: 1.1 });
        capCam(CAP.pose.x, CAP.pose.z - lift * 1.4, 3.6 + lift * 0.8, cam.yaw, 2);
        if (t > 7.2) return false;
      },
      fx(dtR, t) {
        capBeamFx(this.cr, CAP.pose.x, CAP.pose.z, capSeg(t, 2.3, 2.6));
      },
    },
    beam: null,
    beaten: {
      start() {
        const f = CAP.foe,
          s = CAP.pose;
        const fx = f ? f.x : s.x + Math.sin(s.dir) * 1.3,
          fz = f ? f.z : s.z + Math.cos(s.dir) * 1.3;
        this.g = capActor('grey', fx, fz, { look: f ? f.look : null });
        capFace(this.g, s.x, s.z);
        this.g2 = capActor('grey', s.x - 4.5, s.z + 1.5);
        this.g2.hide = true;
        this.cr = { x: s.x, y: 18, z: s.z, spin: 0, glow: 0, tilt: 0 };
        HX.crafts.push(this.cr);
      },
      step(dt, t) {
        const A = this,
          s = CAP.pose;
        capFall(A.you, t, 0.15, 0.6);
        capOnce(A, 'hit', () => {
          audio.hx('thud', 0, 0.9);
          HX.shake = 0.7;
          R.pulse = 1;
          capFx({ daze: 0.5 }, { daze: 2 });
        });
        if (t > 0.9) capOnce(A, 'why', capWhy);
        if (t > 1.4) {
          capWalk(A.g, s.x + 0.7, s.z + 0.2, 1.1, dt);
          if (t > 2.6) {
            A.g.tell.kneel = true;
            capFace(A.g, s.x, s.z);
          }
        }
        if (t > 2.4) {
          A.g2.hide = false;
          capWalk(A.g2, s.x - 0.9, s.z + 0.5, 1.3, dt);
        }
        A.cr.y = lerp(18, 6.5, capSeg(t, 2.6, 4.4));
        A.cr.glow = capSeg(t, 3.6, 4.4);
        A.cr.spin += dt;
        if (t > 3.0) capOnce(A, 'th', () => audio.hx('thrum', 0, 1));
        if (t > 4.4)
          capOnce(A, 'beam', () => {
            audio.hx('beam', 0, 1);
            HX.jolt = 0.7;
          });
        A.you.y = capSeg(t, 4.6, 6.6) * 1.6;
        if (t > 4.0) capFx({ lid: 0.55, daze: 0.8 }, { lid: 1 });
        if (t > 5.8) capFx({ washK: 1, wash: [0.85, 1, 0.92] }, { washK: 1.2 });
        capCam(s.x, s.z, 3.1, cam.yaw, 1.6);
        if (t > 7.4) return false;
      },
      fx(dtR, t) {
        capBeamFx(this.cr, CAP.pose.x, CAP.pose.z, capSeg(t, 4.4, 4.7));
      },
    },
  },
  lizards: {
    sleep: {
      start() {
        capFxNow({ fade: 1 });
        // two of them, already inside the flat: in the hall outside your bedroom door, waiting for it to open
        this.l1 = capActor('lizard', 9.5, 24.9, { dir: 0 });
        this.l2 = capActor('lizard', 10.2, 24.4, { dir: 0 });
        this.path1 = [
          [9.5, 26.6],
          [9.4, 28.6],
          [9.25, 30.05],
        ];
        this.path2 = [
          [9.6, 26.4],
          [9.3, 27.6],
          [8.6, 29.4],
        ];
        this.p1 = 0;
        this.p2 = 0;
      },
      step(dt, t) {
        const A = this,
          s = CAP.pose;
        capOnce(A, 'why', capWhy);
        if (t > 1.6) capFx({ fade: 0 }, { fade: 0.8 });
        if (t > 2.2)
          capOnce(A, 'lock', () => {
            audio.hx('lock', 0.5, 0.8);
            capDoor(FLAT_DOOR, 1);
          }); // the front door: they have a key
        if (t > 2.9) capOnce(A, 'creak', () => audio.hx('creak', 0.4, 0.6));
        if (t > 3.6)
          capOnce(A, 'bd', () => {
            capDoor(BED_DOOR, 1);
            audio.hx('creak', 0, 0.8);
          });
        const go = (a, path, key, spd) => {
          if (A[key] < path.length && capWalk(a, path[A[key]][0], path[A[key]][1], spd, dt)) A[key]++;
        };
        if (t > 3.9) go(A.l1, A.path1, 'p1', 1.25);
        if (t > 4.5) go(A.l2, A.path2, 'p2', 1.1);
        if (A.p1 >= A.path1.length) capFace(A.l1, s.x, s.z);
        if (A.p2 >= A.path2.length) capFace(A.l2, s.x, s.z);
        // it leans over you and tastes the air; you wake; a hand
        A.l1.poseFn = (T, a) => {
          const k = capSeg(t, 7.6, 8.4);
          T.torso += 0.5 * k;
          T.hp = 0.35 * k;
          a.fx.tongue = k * (0.6 + 0.4 * Math.sin(a.animT * 9));
          a.fx.tongueLen = 0.9;
          a.fx.frill = capSeg(t, 9.0, 9.4);
          if (t > 9.6) {
            T.uaL = -1.5;
            T.faL = -0.4;
          }
        };
        A.l2.poseFn = (T, a) => {
          if (t > 5.0) {
            T.uaR = -0.9;
            a.fx.prop = 'torch';
          }
        };
        A.you.poseFn = (T, a) => {
          if (t > 9.0) {
            T.hp = -0.55;
            T.hy = -0.4;
            a.fx.eye = [0.94, 0.94, 0.9];
            a.fx.gape = 0.6;
          }
        };
        if (t > 8.0) capOnce(A, 'hiss', () => audio.hx('hiss', 0, 0.7));
        if (t > 9.0) capOnce(A, 'gasp', () => audio.hx('breath', 0, 1));
        if (t > 9.6)
          capOnce(A, 'laugh', () => {
            audio.hx('laugh', 0, 0.9);
            HX.jolt = 0.6;
          });
        if (t > 9.7) capFx({ lid: 1, daze: 0.6 }, { lid: 1.6 });
        if (t > 10.8) capFx({ fade: 1 }, { fade: 2 });
        capCam(
          lerp(s.x - 0.4, s.x - 0.3, capSeg(t, 6, 9)),
          lerp(s.z - 2.2, s.z - 0.7, capSeg(t, 3.6, 8.6)),
          lerp(3.9, 3.0, capSeg(t, 3, 10)),
          cam.yaw,
          1.2,
        );
        if (t > 11.6) return false;
      },
      fx(dtR, t) {
        const A = this,
          lamp = A.l2;
        bedMoon(0.8);
        if (t > 3.0) {
          const lx = lamp.x + Math.sin(lamp.dir) * 0.5,
            lz = lamp.z + Math.cos(lamp.dir) * 0.5,
            fl = 0.9 + 0.1 * Math.sin(R.time * 17) * Math.sin(R.time * 5.3);
          DYN.push({ x: Math.floor(lx), z: Math.floor(lz), col: [1, 0.66, 0.3], int: 0.9 * fl, r: 4.6 });
          hxLight(lx, 1.4, lz, 4.4, mul3([1.1, 0.66, 0.26], fl));
          hxGlint(lx, 1.25, lz, 0.5, [1, 0.7, 0.3], 0.6 * fl);
        }
        for (const l of [A.l1, A.l2])
          for (const s of [1, -1])
            hxGlint(
              l.x + Math.sin(l.dir) * 0.42 + Math.cos(l.dir) * s * 0.11,
              1.62,
              l.z + Math.cos(l.dir) * 0.42 - Math.sin(l.dir) * s * 0.11,
              0.1,
              [1, 0.72, 0.15],
              0.85,
            );
      },
      end() {
        capDoor(FLAT_DOOR, 0);
        capDoor(BED_DOOR, 0);
      },
    },
    ground: {
      start() {
        this.l = capActor('lizard', MANHOLE[0], MANHOLE[1], { y: -2.2 });
        capFace(this.l, CAP.pose.x, CAP.pose.z);
        this.cover = 0;
        capWhy();
      },
      step(dt, t) {
        const A = this,
          s = CAP.pose,
          l = A.l;
        if (t > 0.5) capOnce(A, 'rattle', () => audio.hx('knock', 0, 0.6));
        if (t > 1.0) capOnce(A, 'rattle2', () => audio.hx('knock', 0, 0.8));
        A.cover = capSeg(t, 1.6, 2.0);
        l.y = lerp(-2.2, -0.95, capSeg(t, 1.7, 2.3)) - capSeg(t, 3.4, 4.6) * 1.2;
        l.tell.lunge = t > 1.9 && t < 3.6;
        if (t > 1.7)
          capOnce(A, 'hiss', () => {
            audio.hx('hiss', 0, 1);
            HX.jolt = 0.9;
            HX.shake = 0.6;
          });
        capFall(A.you, t, 2.2, 0.45);
        if (t > 2.2)
          capOnce(A, 'grab', () => {
            audio.hx('grab', 0, 1);
            R.pulse = 1;
          });
        const drag = capSeg(t, 2.8, 4.0);
        if (drag > 0) {
          A.you.x = lerp(s.x, MANHOLE[0], drag * 0.92);
          A.you.z = lerp(s.z, MANHOLE[1], drag * 0.92);
          A.you.tdir = Math.atan2(s.x - MANHOLE[0], s.z - MANHOLE[1]);
        }
        if (t > 2.8) capOnce(A, 'drag', () => audio.hx('drag', 0, 1));
        A.you.y = -capSeg(t, 3.8, 4.8) * 1.6;
        if (t > 4.7)
          capOnce(A, 'slam', () => {
            audio.hx('knock', 0, 1);
            HX.shake = 0.5;
          });
        if (t > 4.4) capFx({ lid: 1, daze: 0.6 }, { lid: 2.4 });
        capCam(lerp(s.x, MANHOLE[0], 0.5), lerp(s.z, MANHOLE[1], 0.5), 3.2, cam.yaw, 2);
        if (t > 5.6) return false;
      },
      fx(dtR, t) {
        const A = this,
          o = A.cover;
        for (const s of [1, -1])
          hxGlint(
            MANHOLE[0] + s * 0.1 + o * 0.3,
            0.06 + o * 0.25,
            MANHOLE[1],
            0.09,
            [1, 0.72, 0.15],
            capSeg(t, 0.6, 1.2) * (1 - capSeg(t, 4.6, 4.9)),
          );
        hxLight(MANHOLE[0], 0.4, MANHOLE[1], 2.2, mul3([1, 0.6, 0.2], 0.4 * capSeg(t, 1.6, 2.2)));
        CAP.cover = o * (1 - capSeg(t, 4.6, 4.75));
      },
      end() {
        CAP.cover = 0;
      },
    },
    beaten: {
      start() {
        const f = CAP.foe,
          s = CAP.pose;
        this.l = capActor('lizard', f ? f.x : s.x + 1.2, f ? f.z : s.z, { look: f ? f.look : null });
        capFace(this.l, s.x, s.z);
      },
      step(dt, t) {
        const A = this,
          s = CAP.pose,
          l = A.l;
        capFall(A.you, t, 0.15, 0.6);
        capOnce(A, 'hit', () => {
          audio.hx('thud', 0, 0.9);
          HX.shake = 0.7;
          R.pulse = 1;
          capFx({ daze: 0.5 }, { daze: 2 });
        });
        if (t > 0.9) capOnce(A, 'why', capWhy);
        if (t > 1.0) capWalk(l, s.x + Math.sin(s.dir + 1.2) * 0.9, s.z + Math.cos(s.dir + 1.2) * 0.9, 1.0, dt);
        if (t > 2.0) capFace(l, s.x, s.z);
        l.poseFn = (T, a) => {
          const k = capSeg(t, 2.0, 2.4) - capSeg(t, 3.6, 3.8);
          a.fx.frill = k;
          a.fx.tongue = k * 0.8;
          if (t > 3.8) {
            T.torso += 0.6;
            T.uaL = T.uaR = -1.6;
          }
        };
        if (t > 2.1) capOnce(A, 'laugh', () => audio.hx('laugh', 0, 1));
        const drag = capSeg(t, 4.0, 6.2);
        if (drag > 0) {
          const dx = Math.sin(s.dir + Math.PI) * 2.6,
            dz = Math.cos(s.dir + Math.PI) * 2.6;
          A.you.x = s.x + dx * drag;
          A.you.z = s.z + dz * drag;
          l.x = A.you.x + Math.sin(s.dir + Math.PI) * 0.7;
          l.z = A.you.z + Math.cos(s.dir + Math.PI) * 0.7;
          l.moving = true;
          l.walkPh += dt * 4;
        }
        if (t > 4.0) capOnce(A, 'drag', () => audio.hx('drag', 0, 1));
        if (t > 4.6) capFx({ lid: 1, daze: 0.8 }, { lid: 1.4 });
        capCam(s.x, s.z, 3.2, cam.yaw, 1.6);
        if (t > 6.6) return false;
      },
    },
  },
  zombies: {
    sleep: {
      start() {
        capFxNow({ fade: 1 });
        this.z1 = capActor('dead', 9.45, 33.35, { dir: Math.PI });
        this.z2 = capActor('dead', 10.2, 33.8, { dir: Math.PI });
        this.z2.hide = true;
      },
      step(dt, t) {
        const A = this,
          s = CAP.pose;
        capOnce(A, 'why', capWhy);
        if (t > 1.6) capFx({ fade: 0 }, { fade: 0.8 });
        if (t > 2.2) capOnce(A, 'scr1', () => audio.hx('skitter', 0, 0.7));
        if (t > 3.0) capOnce(A, 'scr2', () => audio.hx('skitter', 0, 0.9));
        A.z1.poseFn = (T, a) => {
          if (t < 5.6) {
            T.uaL = -2.5 + Math.sin(a.animT * 6) * 0.15;
            T.uaR = -2.3 + Math.cos(a.animT * 5) * 0.2;
            T.faL = T.faR = -0.3;
            T.hp = -0.2;
          }
        };
        if (t > 4.0) capOnce(A, 'cr1', () => audio.hx('crack', 0, 0.7));
        if (t > 4.7)
          capOnce(A, 'cr2', () => {
            audio.hx('crack', 0, 1);
            HX.shake = 0.3;
          });
        if (t > 5.4)
          capOnce(A, 'shatter', () => {
            audio.hx('glass', 0, 1);
            HX.jolt = 1;
            HX.shake = 0.8;
            R.flash = Math.max(R.flash, 0.15);
            for (let i = 0; i < 18; i++)
              CAP.decals.push({
                x: 9.0 + rand(0, 1.1),
                z: 31.2 + rand(0, 0.8),
                r: rand(0.02, 0.06),
                col: [0.75, 0.85, 0.9, 0.7],
                shape: 0,
              });
          });
        if (t > 5.6) {
          A.z2.hide = false;
          capWalk(A.z1, 9.15, 31.35, 0.9, dt);
          if (t > 6.2) capWalk(A.z2, 9.5, 30.0, 0.9, dt);
        }
        if (t > 6.0) capOnce(A, 'groan', () => audio.hx('groan', 0, 1));
        // they take you by the ankles and pull you off the bed, down, toward the window
        const off = capSeg(t, 7.4, 8.0),
          drag = capSeg(t, 8.2, 10.0);
        if (off > 0) {
          A.you.y = lerp(s.y || 0, 0, off);
          A.you.x = lerp(s.x, 9.6, off) + (BED_WIN[0] - 9.6) * drag;
          A.you.z = lerp(s.z, 31.3, off) + (BED_WIN[1] - 31.3 + 0.3) * drag;
          A.you.tdir = Math.PI;
          A.you.pose = 'stand';
          A.you.poseFn = (T, a) => {
            CPOSE.limp(T);
            T.uaL = -2.6;
            T.uaR = -2.5;
            a.fx.gape = 1;
          };
          capFace(A.z1, BED_WIN[0], BED_WIN[1] + 2);
          capFace(A.z2, BED_WIN[0], BED_WIN[1] + 2);
          if (drag > 0) {
            A.z1.z = A.you.z + 1.0;
            A.z1.x = A.you.x - 0.2;
            A.z1.moving = true;
            A.z1.walkPh += dt * 3;
            A.z2.z = A.you.z + 1.3;
            A.z2.x = A.you.x + 0.35;
            A.z2.moving = true;
            A.z2.walkPh += dt * 3;
          }
        }
        if (t > 7.4)
          capOnce(A, 'grab', () => {
            audio.hx('grab', 0, 1);
            audio.hx('scream', 0, 0.6);
            R.pulse = 1;
          });
        if (t > 8.2) capOnce(A, 'drag', () => audio.hx('drag', 0, 1));
        if (t > 9.0) capFx({ lid: 1, daze: 0.7 }, { lid: 1.4 });
        capCam(
          lerp(s.x - 0.5, 9.5, capSeg(t, 3, 8)),
          lerp(s.z - 0.3, 31.6, capSeg(t, 3, 8)),
          lerp(3.4, 3.0, capSeg(t, 3, 9)),
          cam.yaw,
          1.4,
        );
        if (t > 10.6) return false;
      },
      fx(dtR, t) {
        hxLight(BED_WIN[0], 1.6, BED_WIN[1] + 1.0, 4.5, [0.25, 0.32, 0.5]);
        bedMoon(1.25);
        hxLight(BED_WIN[0] + 0.6, 1.8, BED_WIN[1] - 1.6, 2.6, [0.12, 0.14, 0.2]); // the street's light off the ceiling, on their faces
        for (const z of [this.z1, this.z2])
          if (!z.hide)
            for (const sd of [1, -1])
              hxGlint(
                z.x + Math.sin(z.dir) * 0.2 + Math.cos(z.dir) * sd * 0.06,
                1.66,
                z.z + Math.cos(z.dir) * 0.2 - Math.sin(z.dir) * sd * 0.06,
                0.07,
                [0.85, 0.92, 0.8],
                0.9,
              );
      },
    },
    ground: {
      start() {
        const s = CAP.pose;
        this.hands = [];
        for (let i = 0; i < 3; i++) {
          const a = s.dir + Math.PI + (i - 1) * 1.1,
            d = 1.0 + (i % 2) * 0.25;
          const z = capActor('dead', s.x + Math.sin(a) * d, s.z + Math.cos(a) * d, { y: -1.9 });
          capFace(z, s.x, s.z);
          z.tell.lunge = true;
          this.hands.push(z);
        }
        capWhy();
      },
      step(dt, t) {
        const A = this,
          s = CAP.pose;
        if (t > 0.4) capOnce(A, 'buzz', () => audio.hx('buzz', 0, 0.8));
        if (t > 1.0) capOnce(A, 'groan', () => audio.hx('groan', 0, 1));
        A.hands.forEach((z, i) => {
          z.y = lerp(-1.9, -0.95, capSeg(t, 1.2 + i * 0.2, 1.7 + i * 0.2)) - capSeg(t, 3.0, 4.2) * 0.8;
        });
        if (t > 1.3)
          capOnce(A, 'burst', () => {
            HX.jolt = 1;
            HX.shake = 0.9;
            audio.hx('sting', 0, 0.8);
            for (let i = 0; i < 10; i++)
              CAP.decals.push({
                x: s.x + rand(-1.4, 1.4),
                z: s.z + rand(-1.4, 1.4),
                r: rand(0.1, 0.3),
                col: [0.12, 0.08, 0.04, 0.8],
                shape: 0,
              });
          });
        capFall(A.you, t, 1.8, 0.4);
        if (t > 1.8)
          capOnce(A, 'grab', () => {
            audio.hx('grab', 0, 1);
            audio.hx('scream', 0, 0.7);
            R.pulse = 1;
          });
        A.you.y = -capSeg(t, 2.8, 4.4) * 0.75;
        if (t > 3.2) capFx({ lid: 1, daze: 0.7, washK: 0.25, wash: [0.3, 0.02, 0.02] }, { lid: 1.6 });
        capCam(s.x, s.z, 3.3, cam.yaw, 2);
        if (t > 5.0) return false;
      },
      fx(dtR, t) {
        const s = CAP.pose;
        for (let i = 0; i < 10; i++) {
          const a = R.time * (1.5 + i * 0.3) + i,
            r = 0.4 + (i % 3) * 0.3;
          hxGlint(
            s.x + Math.sin(a) * r,
            0.6 + Math.sin(a * 1.7) * 0.3,
            s.z + Math.cos(a) * r,
            0.04,
            [0.25, 0.3, 0.2],
            0.5,
          );
        }
      },
    },
    beaten: {
      start() {
        const f = CAP.foe,
          s = CAP.pose;
        this.z = capActor('dead', f ? f.x : s.x + 1.2, f ? f.z : s.z, { look: f ? f.look : null });
        capFace(this.z, s.x, s.z);
        this.z2 = capActor('dead', s.x - 5, s.z + 2);
        this.z2.hide = true;
      },
      step(dt, t) {
        const A = this,
          s = CAP.pose;
        capFall(A.you, t, 0.15, 0.6);
        capOnce(A, 'hit', () => {
          audio.hx('thud', 0, 0.9);
          HX.shake = 0.7;
          R.pulse = 1;
          capFx({ daze: 0.5 }, { daze: 2 });
        });
        if (t > 0.9) capOnce(A, 'why', capWhy);
        if (t > 1.0 && t < 2.2) capWalk(A.z, s.x + Math.sin(s.dir) * 0.8, s.z + Math.cos(s.dir) * 0.8, 1.0, dt);
        if (t > 2.2) {
          capFace(A.z, s.x, s.z);
          A.z.tell.feed = true;
        }
        if (t > 2.4) {
          A.z.tick = (A.z.tick || 0) - dt;
          if (A.z.tick <= 0) {
            A.z.tick = rand(0.45, 0.8);
            audio.hx('bite', 0, 0.9);
          }
        }
        if (t > 2.4)
          capOnce(A, 'blood', () => {
            const t0 = R.time;
            CAP.decals.push({
              x: s.x,
              z: s.z,
              r: () => 0.3 + clamp((R.time - t0) / 4, 0, 1) * 0.7,
              col: [0.22, 0.01, 0.015, 0.8],
              shape: 0,
            });
            audio.hx('scream', 0, 0.6);
          });
        if (t > 3.2) {
          A.z2.hide = false;
          capWalk(A.z2, s.x - 0.8, s.z + 0.7, 1.0, dt);
          if (t > 4.6) {
            capFace(A.z2, s.x, s.z);
            A.z2.tell.feed = true;
          }
        }
        if (t > 3.6) capFx({ lid: 1, daze: 0.8, washK: 0.3, wash: [0.32, 0.02, 0.02] }, { lid: 0.9 });
        capCam(s.x, s.z, 3.0, cam.yaw, 1.6);
        if (t > 6.0) return false;
      },
    },
  },
};
// caught on your feet: the ones that had you close in from where they were, and take you where you stand
function capGrabCast() {
  const s = CAP.pose,
    g = CAP.grabFrom || { from: [] },
    kind = capLook(CAP.fac);
  const list =
    g.from && g.from.length
      ? g.from.slice(0, 3)
      : [{ kind, x: s.x + Math.sin(s.dir) * 0.9, z: s.z + Math.cos(s.dir) * 0.9, lead: true }];
  list.sort((a, b) => (b.lead ? 1 : 0) - (a.lead ? 1 : 0));
  return list.map((f, i) => {
    const a = capActor(f.kind || kind, f.x, f.z, { dir: Math.atan2(s.x - f.x, s.z - f.z) });
    const ang = Math.atan2(f.x - s.x, f.z - s.z) + (i ? (i === 1 ? 0.5 : -0.5) : 0),
      r = i ? 0.85 : 0.62;
    a.to = [s.x + Math.sin(ang) * r, s.z + Math.cos(ang) * r];
    return a;
  });
}
CAP_PRE.aliens.grab = {
  start() {
    this.gs = capGrabCast();
    this.lying = CAP.how === 'beaten';
    const g = CAP.grabFrom || {};
    this.beam = !!g.beam || (!g.indoor && !!g.craft);
    if (this.beam) {
      const c = g.craft || { x: CAP.pose.x, y: 9, z: CAP.pose.z - 2 };
      this.cr = { x: c.x, y: c.y, z: c.z, spin: 0, glow: 1, tilt: 0.1 };
      HX.crafts.push(this.cr);
    }
  },
  step(dt, t) {
    const A = this,
      s = CAP.pose;
    if (A.cr) {
      A.cr.spin += dt * 2;
      A.cr.x += (s.x - A.cr.x) * Math.min(1, dt * 2);
      A.cr.z += (s.z - 1.5 - A.cr.z) * Math.min(1, dt * 2);
    }
    for (const g of A.gs) {
      if (t < 1.4) capWalk(g, g.to[0], g.to[1], 1.2, dt);
      capFace(g, A.you.x, A.you.z);
    }
    A.gs[0].poseFn = (T) => {
      const k = capSeg(t, 0.5, 1.1);
      T.uaR = -1.4 * k;
      T.faR = -0.5 * k;
      T.torso += 0.25 * k;
    };
    for (const g of A.gs.slice(1))
      g.poseFn = (T) => {
        const k = capSeg(t, 1.0, 1.8);
        T.uaL = T.uaR = -1.1 * k;
        T.aoL = T.aoR = 0.5 * k;
      };
    capOnce(A, 'grab', () => {
      audio.hx('grab', 0, 1);
      HX.jolt = 0.9;
      R.pulse = 1;
    });
    if (t > 0.9)
      capOnce(A, 'beam', () => {
        audio.hx('beam', 0, 1);
        HX.shake = 0.5;
      });
    const lift = capSeg(t, 1.3, 3.6);
    A.you.y = (s.y || 0) + lift * (A.beam ? 2.6 : 0.85);
    A.you.tdir += dt * lift * 0.8;
    A.you.poseFn = (T, a) => {
      if (lift > 0) return CPOSE.rigid(T, a);
      if (A.lying) return CPOSE.limp(T);
      const w = a.animT;
      T.uaL = -1.6 + Math.sin(w * 13) * 0.5;
      T.uaR = -1.5 + Math.sin(w * 11 + 1) * 0.5;
      T.roll = Math.sin(w * 17) * 0.06;
      a.fx.gape = 0.8;
    };
    if (t > 1.4) capOnce(A, 'gasp', () => audio.hx('breath', 0, 0.8));
    if (t > 3.0) capFx({ washK: 1, wash: [0.82, 1, 0.92] }, { washK: 1.3 });
    capCam(s.x, s.z - lift * 0.3, 3.2 - lift * 0.4, cam.yaw, 1.8);
    if (t > 4.8) return false;
  },
  fx(dtR, t) {
    const s = CAP.pose;
    if (this.beam) capBeamFx(this.cr, s.x, s.z, capSeg(t, 0.9, 1.2));
    else hxLight(s.x, 1.6, s.z, 3.5, mul3([0.4, 1, 0.75], capSeg(t, 0.9, 1.5) * 1.3));
    for (const g of this.gs) greyEyes(g, 0.4);
  },
};
CAP_PRE.lizards.grab = {
  start() {
    this.ls = capGrabCast();
    this.lying = CAP.how === 'beaten';
    const l = this.ls[0],
      s = CAP.pose;
    this.away = Math.atan2(l.x - s.x, l.z - s.z);
  },
  step(dt, t) {
    const A = this,
      s = CAP.pose,
      l = A.ls[0];
    for (const x of A.ls) {
      if (t < 1.0) capWalk(x, x.to[0], x.to[1], 1.4, dt);
      if (x !== l || t < 1.6) capFace(x, A.you.x, A.you.z);
    }
    capOnce(A, 'grab', () => {
      audio.hx('grab', 0, 1);
      audio.hx('hiss', 0, 0.8);
      HX.jolt = 0.9;
      R.pulse = 1;
    });
    if (!A.lying) capFall(A.you, t, 0.5, 0.5);
    else A.you.poseFn = (T) => CPOSE.limp(T);
    l.poseFn = (T, a) => {
      a.fx.frill = capSeg(t, 0.3, 0.7);
      T.uaL = -1.5 * capSeg(t, 0.4, 0.8);
      T.faL = -0.4;
      if (t > 1.4) T.torso += 0.4;
    };
    if (t > 1.0) capOnce(A, 'laugh', () => audio.hx('laugh', 0, 0.9));
    const drag = capSeg(t, 1.6, 3.8);
    if (drag > 0) {
      const dx = Math.sin(A.away) * 2.4,
        dz = Math.cos(A.away) * 2.4;
      A.you.x = s.x + dx * drag;
      A.you.z = s.z + dz * drag;
      l.x = A.you.x + Math.sin(A.away) * 0.75;
      l.z = A.you.z + Math.cos(A.away) * 0.75;
      l.tdir = A.away;
      l.moving = true;
      l.walkPh += dt * 4;
    }
    if (t > 1.6) capOnce(A, 'drag', () => audio.hx('drag', 0, 1));
    if (t > 3.0) capFx({ lid: 1, daze: 0.8 }, { lid: 1.4 });
    capCam(lerp(s.x, A.you.x, 0.5), lerp(s.z, A.you.z, 0.5), 3.1, cam.yaw, 1.6);
    if (t > 4.6) return false;
  },
  fx() {
    for (const l of this.ls)
      for (const sd of [1, -1])
        hxGlint(
          l.x + Math.sin(l.dir) * 0.42 + Math.cos(l.dir) * sd * 0.11,
          1.62,
          l.z + Math.cos(l.dir) * 0.42 - Math.sin(l.dir) * sd * 0.11,
          0.1,
          [1, 0.72, 0.15],
          0.85,
        );
  },
};
CAP_PRE.zombies.grab = {
  start() {
    this.zs = capGrabCast();
    this.lying = CAP.how === 'beaten';
  },
  step(dt, t) {
    const A = this,
      s = CAP.pose;
    for (const z of A.zs) {
      if (t < 1.2) capWalk(z, z.to[0], z.to[1], 1.1, dt);
      capFace(z, A.you.x, A.you.z);
      if (t > 1.2) z.tell.feed = true;
    }
    capOnce(A, 'grab', () => {
      audio.hx('grab', 0, 1);
      audio.hx('groan', 0, 0.9);
      HX.jolt = 1;
      R.pulse = 1;
    });
    if (!A.lying) capFall(A.you, t, 0.4, 0.5);
    else A.you.poseFn = (T) => CPOSE.limp(T);
    if (t > 1.2) {
      A.bt = (A.bt || 0) - dt;
      if (A.bt <= 0) {
        A.bt = rand(0.4, 0.75);
        audio.hx('bite', rand(-0.3, 0.3), 0.9);
      }
    }
    if (t > 1.3)
      capOnce(A, 'blood', () => {
        const t0 = R.time;
        CAP.decals.push({
          x: s.x,
          z: s.z,
          r: () => 0.3 + clamp((R.time - t0) / 4, 0, 1) * 0.7,
          col: [0.22, 0.01, 0.015, 0.8],
          shape: 0,
        });
        audio.hx('scream', 0, 0.6);
      });
    if (t > 2.4) capFx({ lid: 1, daze: 0.8, washK: 0.3, wash: [0.32, 0.02, 0.02] }, { lid: 1 });
    capCam(s.x, s.z, 3.0, cam.yaw, 1.6);
    if (t > 4.6) return false;
  },
  fx() {
    for (const z of this.zs)
      for (const sd of [1, -1])
        hxGlint(
          z.x + Math.sin(z.dir) * 0.2 + Math.cos(z.dir) * sd * 0.06,
          1.66,
          z.z + Math.cos(z.dir) * 0.2 - Math.sin(z.dir) * sd * 0.06,
          0.07,
          [0.85, 0.92, 0.8],
          0.9,
        );
  },
};
CAP_PRE.aliens.beam = {
  start() {
    this.cr = { x: CAP.pose.x, y: 7, z: CAP.pose.z, spin: 0, glow: 1, tilt: 0 };
    HX.crafts.push(this.cr);
    audio.hx('beam', 0, 1);
    HX.jolt = 1;
  },
  step(dt, t) {
    const A = this;
    A.cr.spin += dt * 2;
    const lift = capSeg(t, 0.4, 3.6);
    A.you.y = lift * 3.4;
    A.you.tdir += dt * lift;
    A.you.poseFn = (T, a) => {
      if (t < 2) {
        const w = a.animT;
        T.uaL = -2.6 + Math.sin(w * 11) * 0.6;
        T.uaR = -2.4 + Math.sin(w * 13) * 0.7;
        T.hp = -0.4;
        a.fx.gape = 1;
      } else {
        T.aoL = T.aoR = 1.35;
        T.hp = -0.95;
        a.fx.gape = 1;
      }
    };
    if (t > 0.6) capOnce(A, 'scream', () => audio.hx('scream', 0, 0.9));
    if (t > 2.8) capFx({ washK: 1, wash: [0.85, 1, 0.92] }, { washK: 1.2 });
    capCam(CAP.pose.x, CAP.pose.z - lift, 3.6 + lift * 0.6, cam.yaw, 2);
    if (t > 4.6) return false;
  },
  fx(dtR, t) {
    capBeamFx(this.cr, CAP.pose.x, CAP.pose.z, 1);
  },
};
// a craft overhead and its beam on the ground at x, z
function capBeamFx(cr, x, z, k) {
  if (!cr) return;
  if (cr.glow > 0.05) hxLight(cr.x, cr.y - 0.8, cr.z, 4, mul3([0.3, 1, 0.65], 0.6 * cr.glow));
  if (k < 0.01) return;
  HX.beams.push({ x: cr.x, y: cr.y - 0.3, z: cr.z, r: 1.4, h: cr.y - 0.3, col: [0.42, 1, 0.74], a: k * 0.9 });
  hxLight(x, 1.2, z, 5.5, mul3([0.3, 1, 0.65], 1.6 * k));
  for (let i = 0; i < 18; i++) {
    const ph = (R.time * 0.32 + i / 18) % 1,
      a = i * 2.4;
    hxGlint(
      x + Math.sin(a) * 0.9 * (1 - ph * 0.5),
      ph * (cr.y - 0.5),
      z + Math.cos(a) * 0.9 * (1 - ph * 0.5),
      0.14,
      [0.5, 1, 0.8],
      k * (1 - ph) * 0.6,
    );
  }
}
// the bedroom by the light of the street through the blind: enough to see who's in it
function bedMoon(k) {
  hxLight(BED_WIN[0], 2.0, BED_WIN[1] - 0.7, 4.6, mul3([0.16, 0.2, 0.33], k));
}
function capDoor(at, open) {
  const i = doorAt[I(at[0], at[1])];
  if (i >= 0) {
    DOORS[i].open = open;
    DOORS[i].slack = open ? G.t + 30 : 0;
  }
}
// not THEM: somebody just hit you too hard. You go down, and a day goes with you.
function capPreOut() {
  return {
    name: 'out',
    skip() {
      this.t = 99;
    },
    start() {
      const s = CAP.pose;
      this.you = capYou(s.x, s.z, { dir: s.dir });
      PLAYER.onMap = false;
      capCut(cam.tx, cam.tz, cam.zoom, cam.yaw);
      capCam(s.x, s.z, 3.6, cam.yaw, 2);
      capFx({ letter: 1 });
      audio.hx('thud', 0, 1);
      HX.shake = 0.8;
      R.pulse = 1;
    },
    step(dt, t) {
      capFall(this.you, t, 0.05, 0.55);
      if (t > 0.8) capFx({ lid: 1, daze: 0.7 }, { lid: 1.2 });
      if (t > 2.2) capFx({ fade: 1 }, { fade: 2 });
      if (t > 3.0) return false;
    },
    end() {
      for (const a of CAP.actors.slice()) capKill(a);
    },
  };
}
function capBlackOut() {
  return {
    name: 'blackout',
    skip: null,
    start() {},
    step(dt, t) {
      if (t < 0.3) return;
      const prev = CAP.after;
      CAP.after = () => {
        PLAYER.onMap = true;
        goAway('out', G.t + CTRL.knockout);
        if (prev) prev();
      };
      return false;
    },
  };
}
