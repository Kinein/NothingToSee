//@ horror/night — Night scenes
//@ Defines: hxNightScene, hxFarScene, hxWatcher, hxEyes, hxLampsOut, hxDrag, hxCrawler, hxProcession, hxSearch, hxWindow, hxOnScreen, hxRedDoor, hxKnock
//@ Uses:    horror/layer, core/util, sim/core, gfx/renderer, world/grid, them/plan, world/vision, audio/sound, world/objects, world/light-map
//@ (header made by tools/map.js; stripped by build.py)
// ───────────── night
function hxNightScene(bad) {
  const P = PLAYER,
    home = inRoomSet(P, (r) => r.home),
    fac = hxFac();
  if (!home && !theyOut()) return; // things in the street: not before day 5
  const kinds = home
    ? ['window', 'window', 'knock']
    : [
        'watcher',
        'eyes',
        'eyes',
        'lamps',
        'drag',
        'crawler',
        'procession',
        'double',
        'door',
        'door',
        ...(fac === 'aliens' ? ['search'] : []),
      ];
  const k = pick(kinds);
  const s =
    k === 'door'
      ? hxRedDoor(false) || hxWatcher(false)
      : k === 'window'
        ? hxWindow()
        : k === 'knock'
          ? hxKnock()
          : k === 'watcher'
            ? hxWatcher(false)
            : k === 'double'
              ? hxWatcher(true)
              : k === 'eyes'
                ? hxEyes(fac)
                : k === 'lamps'
                  ? hxLampsOut(fac)
                  : k === 'drag'
                    ? hxDrag()
                    : k === 'crawler'
                      ? hxCrawler(fac)
                      : k === 'procession'
                        ? hxProcession()
                        : hxSearch(true);
  if (s) HX.scene = s;
}
function hxFarScene() {
  const fac = hxFac();
  const k = pick([
    'scream',
    'scream',
    'skitter',
    'howl',
    ...((fac === 'aliens' || !G.factionKnown) && theyOut() ? ['search'] : []),
  ]);
  if (k === 'search') {
    if (!HX.far.some((s) => s.kind === 'search')) {
      const s = hxSearch(false);
      if (s) HX.far.push(s);
    }
    return;
  }
  // somewhere you are not: a window goes red, then dark, and you might hear it from here. Before day 5, only behind people's windows.
  const spots = HOUSE_DEFS.map((h) => h.spot)
    .concat(
      theyOut()
        ? [
            [27, 6],
            [38, 26],
            [8, 16],
            [47, 16],
          ]
        : [],
    )
    .filter(([x, z]) => hxDist(x, z) > 12);
  const sp = pick(spots);
  if (!sp) return;
  const [x, z] = sp;
  let t = 0,
    said = false;
  HX.far.push({
    kind: k,
    step(dt) {
      t += dt;
      if (!said) {
        said = true;
        if (heardIt('far', x + 0.5, z + 0.5))
          hxSound(k === 'skitter' ? 'skitter' : k === 'howl' ? 'groan' : 'scream', x, z, 0.6);
      } // mostly, you never hear it
      if (k === 'scream') {
        if (t < 1.6) hxLight(x + 0.5, 1.8, z + 0.5, 3.2, mul3([1, 0.08, 0.05], Math.random() < 0.7 ? 1.2 : 0.3));
        else if (t < 4) hxDark(x + 0.5, z + 0.5, 3.4, 0.7);
      }
      return t < 4.5;
    },
  });
}
// a tall shape at the edge of what you can see. Or you, standing over there, watching you.
function hxWatcher(double) {
  const P = PLAYER,
    cx0 = Math.sin(cam.yaw),
    cz0 = Math.cos(cam.yaw);
  let sp = null;
  for (let k = 0; k < 200 && !sp; k++) {
    const x = Math.floor(P.x + rand(-13, 13)),
      z = Math.floor(P.z + rand(-13, 13));
    if (!hxOpen(x, z)) continue;
    const d = hxDist(x + 0.5, z + 0.5),
      v = visCur[I(x, z)],
      fwd = (x + 0.5 - P.x) * cx0 + (z + 0.5 - P.z) * cz0;
    if (d > 5.5 && d < 13 && fwd < -2.5 && v > 0.12 && (k > 120 || cellLum(I(x, z)) < 0.35)) sp = [x + 0.5, z + 0.5];
  }
  if (!sp) return null;
  const look = double ? Object.assign({}, P.look, { skinC: [0.62, 0.6, 0.58], eyeC: [0, 0, 0] }) : HX_SHADOW();
  const a = hxActor(look, sp[0], sp[1], { ghost: 0.5, menace: 0.55, shadow: 0.2 });
  a.dir = a.tdir = Math.atan2(P.x - a.x, P.z - a.z);
  a.poseFn = (Tg, b) => {
    Tg.uaL = Tg.uaR = 0.02;
    Tg.aoL = Tg.aoR = 0.06;
    Tg.hp = 0.15;
    Tg.hr = double ? 0.25 : 0.55 + Math.sin(b.animT * 0.5) * 0.1;
    if (double) b.fx.eye = [0.02, 0.02, 0.02];
  };
  let t = 0,
    gone = -1;
  const life = rand(5, 9);
  hxSound('sting', a.x, a.z, 0.35);
  return {
    step(dt) {
      t += dt;
      a.tdir = Math.atan2(PLAYER.x - a.x, PLAYER.z - a.z);
      const near = hxDist(a.x, a.z) < 4.5;
      if (gone < 0 && (t > life || near)) {
        gone = t;
        hxSound('whisper', a.x, a.z, 0.8);
        if (near) {
          HX.jolt = 0.7;
          HX.shake = 0.3;
        }
      }
      if (gone < 0 || t - gone < 0.25) {
        const blink = gone >= 0 ? Math.random() < 0.5 : false;
        a.hide = blink;
        const hy = 1.62 * a.look.h * 1.0;
        if (!double)
          for (const s of [1, -1])
            hxGlint(
              a.x + Math.cos(a.dir) * s * 0.07 + Math.sin(a.dir) * 0.2,
              hy,
              a.z - Math.sin(a.dir) * s * 0.07 + Math.cos(a.dir) * 0.2,
              0.17,
              [0.85, 0.9, 1],
              0.85,
            );
        hxLight(a.x - Math.sin(a.dir) * 0.9, 1.4, a.z - Math.cos(a.dir) * 0.9, 2.4, [0.35, 0.42, 0.65]); // a cold rim behind it
        hxLight(a.x + Math.sin(a.dir) * 1.2, 2.2, a.z + Math.cos(a.dir) * 1.2, 2.2, [0.12, 0.13, 0.18]);
        return true;
      }
      return false;
    },
    end() {
      hxKill(a);
    },
  };
}
// eyes in the dark, all round you, closing one pair at a time
function hxEyes(fac) {
  const P = PLAYER,
    pairs = [],
    n = irand(3, 7);
  const col = fac === 'aliens' ? [0.4, 1, 0.7] : fac === 'lizards' ? [1, 0.68, 0.1] : [0.86, 0.9, 0.8];
  for (let k = 0; k < 140 && pairs.length < n; k++) {
    const x = P.x + rand(-11, 11),
      z = P.z + rand(-11, 11),
      d = hxDist(x, z),
      cx = Math.floor(x),
      cz = Math.floor(z);
    if (!inb(cx, cz) || d < 3.5 || d > 11 || WALLISH.has(tiles[I(cx, cz)]) || visCur[I(cx, cz)] > 0.35) continue;
    pairs.push({
      x,
      z,
      y: chance(0.3) ? rand(0.3, 0.6) : rand(1.3, 1.9),
      dir: Math.atan2(P.x - x, P.z - z),
      born: rand(0, 1.6),
      life: rand(3.5, 8),
      blink: rand(1, 4),
      w: rand(0.05, 0.08),
    });
  }
  if (!pairs.length) return null;
  let t = 0,
    said = false;
  return {
    step(dt) {
      t += dt;
      if (!said && t > 0.3) {
        said = true;
        audio.hx('whisper', 0, 0.6);
      }
      let any = false;
      for (const p of pairs) {
        const age = t - p.born;
        if (age < 0 || age > p.life) continue;
        if (hxDist(p.x, p.z) < 2.8) {
          p.life = 0;
          continue;
        }
        any = true;
        const open = Math.min(1, age * 3, (p.life - age) * 3) * (Math.sin((t + p.blink) * 2.3) > -0.96 ? 1 : 0);
        for (const s of [1, -1])
          hxGlint(p.x + Math.cos(p.dir) * s * p.w, p.y, p.z - Math.sin(p.dir) * s * p.w, 0.2, col, 1.1 * open);
      }
      return any || t < 2;
    },
  };
}
// the streetlamps go out one by one, toward you. When they come back, there is something under the last one.
function hxLampsOut(fac) {
  const P = PLAYER;
  const lamps = OBJ.filter((o) => o.type === 'streetlamp' || o.type === 'parklamp' || o.type === 'alleylamp')
    .map((o) => ({ o, d: hxDist(o.cx, o.cz) }))
    .filter((l) => l.d < 16)
    .sort((a, b) => b.d - a.d);
  if (lamps.length < 2 || !lightGroupOn('street')) return null;
  const cx0 = Math.sin(cam.yaw),
    cz0 = Math.cos(cam.yaw),
    up = (l) => (l.o.cx - P.x) * cx0 + (l.o.cz - P.z) * cz0 < -1;
  const pickL = lamps.slice(-3).reverse().find(up) || lamps[lamps.length - 1];
  lamps.splice(lamps.indexOf(pickL), 1);
  lamps.push(pickL); // the one it waits under goes out last
  const last = pickL.o,
    f = DIRS[last.face];
  const at = [last.cx + f[0] * 1.1, last.cz + f[1] * 1.1];
  const thing = hxActor(hxLook(), at[0], at[1], {
    tell: { type: 'true', t: 9, w: 0, fac },
    hide: true,
    ghost: 0.6,
    menace: 0.8,
    shadow: 0.4,
  });
  thing.dir = thing.tdir = Math.atan2(P.x - at[0], P.z - at[1]);
  let t = 0;
  const T = {};
  return {
    step(dt) {
      t += dt;
      lamps.forEach((l, i) => {
        const st = HX.lampSt.get(l.o);
        if (!st) return;
        const off = 0.2 + i * 0.55;
        st.dead = t > off && t < 4.6 ? 2 : t >= 4.6 && t < 5.8 ? 0.5 : 0;
        if (t > off && !l.popped) {
          l.popped = true;
          hxSound('crack', l.o.cx, l.o.cz, 0.5);
        }
      });
      if (t > 3.0 && t < 4.6)
        for (const s of [1, -1])
          hxGlint(
            at[0] + Math.cos(thing.dir) * s * 0.08 + Math.sin(thing.dir) * 0.3,
            1.75,
            at[1] - Math.sin(thing.dir) * s * 0.08 + Math.cos(thing.dir) * 0.3,
            0.2,
            fac === 'aliens' ? [0.4, 1, 0.7] : fac === 'lizards' ? [1, 0.68, 0.1] : [0.86, 0.9, 0.8],
            0.9,
          );
      // the strobe: it is there in the flashes
      thing.hide = !(t >= 4.6 && t < 5.8 && Math.random() < 0.55);
      if (t >= 4.6 && !T.sting) {
        T.sting = true;
        hxSound('sting', at[0], at[1], 1);
        if (hxSeen(at[0], at[1], 0.2)) {
          HX.jolt = 0.9;
          HX.shake = 0.5;
        }
      }
      thing.tdir = Math.atan2(PLAYER.x - thing.x, PLAYER.z - thing.z);
      return t < 6.2;
    },
    end() {
      hxKill(thing);
      for (const l of lamps) {
        const st = HX.lampSt.get(l.o);
        if (st) st.dead = 0;
      }
    },
  };
}
// something pulls a body across the road into the dark, by the ankles
function hxDrag() {
  const st = hxStage(4.5, 11, true, 6);
  if (!st) return null;
  const S = [st.x, st.z],
    to = [st.x - st.side * 6, st.z + (st.z < 15.5 ? -0.4 : 0.4)];
  const body = hxActor(hxLook(), S[0] + st.side * 1.5, S[1], { menace: 0.5, shadow: 0.3 });
  body.dir = body.tdir = Math.atan2(st.side, 0); // head away from where it's going: it's pulled by the feet
  let t = 0,
    said = false,
    lastSmear = 0;
  body.poseFn = (Tg, a) => {
    Tg.pitch = (Math.PI / 2) * 0.98;
    Tg.rootY = 0.16;
    Tg.uaL = -2.9 + Math.sin(a.animT * 7) * 0.25;
    Tg.uaR = -2.7 + Math.sin(a.animT * 6 + 2) * 0.3;
    Tg.faL = Tg.faR = -0.4 + Math.sin(a.animT * 9) * 0.3;
    Tg.hp = -0.5;
    a.fx.gape = 0.8;
  };
  return {
    step(dt) {
      t += dt;
      if (!said) {
        said = true;
        hxSound('drag', S[0], S[1], 1);
      }
      if (t > 0.6) {
        const sp = t < 2 ? 1.2 : 2.6;
        hxWalk(body, to[0], to[1], sp, dt);
        body.moving = false;
        body.tdir = Math.atan2(st.side, 0);
      }
      if (G.t - lastSmear > 0.4) {
        lastSmear = G.t;
        hxDecal(body.x, body.z, 0.62, [0.2, 0.014, 0.014, 0.72], 5, 160, {
          rot: st.side > 0 ? Math.PI : 0,
          sx: 1,
          sz: 0.5,
          seed: rand(0, 20),
        });
        if (chance(0.35))
          hxDecal(
            body.x + rand(-0.4, 0.4),
            body.z + rand(-0.4, 0.4),
            rand(0.2, 0.34),
            [0.2, 0.014, 0.014, 0.7],
            4,
            160,
            { rot: rand(0, TAU), seed: rand(0, 20) },
          );
      }
      if (Math.hypot(body.x - to[0], body.z - to[1]) < 0.1) body.hide = true;
      return t < 6;
    },
    end() {
      hxKill(body);
    },
  };
}
// across the street, low and fast, from dark to dark
function hxCrawler(fac) {
  const st = hxStage(4, 10, true, 9);
  if (!st) return null;
  const across = st.z > 12.9 && st.z < 19,
    flip = chance(0.5);
  const A = across ? [st.x, flip ? 13.05 : 18.95] : [st.x + st.side * 6, st.z],
    B = across ? [st.x + rand(-1.5, 1.5), flip ? 18.95 : 13.05] : [st.x - st.side * 7, st.z];
  const c = hxActor(hxLook(), A[0], A[1], { tell: { type: 'true', t: 9, w: 0, fac }, menace: 0.75, ghost: 0.25 });
  let t = 0,
    said = false;
  return {
    step(dt) {
      t += dt;
      if (!said) {
        said = true;
        hxSound(fac === 'aliens' ? 'whisper' : 'skitter', st.x, st.z, 1);
      }
      const done = hxWalk(c, B[0], B[1], fac === 'aliens' ? 3.4 : 6.5, dt);
      c.run = fac !== 'aliens';
      if (fac === 'aliens') c.y = 0.3;
      if (Math.hypot(c.x - st.x, across ? c.z - 16 : 0) < 1.4 && !c.looked) {
        c.looked = true;
        if (hxSeen(c.x, c.z)) {
          HX.jolt = 0.5;
          HX.shake = 0.25;
        }
      }
      return !done && t < 6;
    },
    end() {
      hxKill(c);
    },
  };
}
// a line of people walking slowly in the road at three in the morning, heads down, each with a small light
function hxProcession() {
  const st = hxStage(6, 13, true, 8);
  if (!st) return null;
  const n = irand(4, 6),
    A = st.x + st.side * 8,
    B = st.x - st.side * 9,
    z = st.z;
  const walkers = [];
  for (let i = 0; i < n; i++) {
    const a = hxActor(
      hxLook({ top: pick([0x2a2a2e, 0x3a3630, 0x2e2a2a]), bottom: 0x1a1a1c, outfit: 'coat' }),
      A + st.side * i * 1.15,
      z,
      { ghost: 0.45, shadow: 0.3 },
    );
    a.poseFn = (Tg) => {
      Tg.hp = 0.75;
      Tg.uaL = Tg.uaR = -0.55;
      Tg.faL = Tg.faR = -1.3;
      Tg.aoL = Tg.aoR = 0.12;
    };
    walkers.push(a);
  }
  let t = 0,
    said = false;
  return {
    step(dt) {
      t += dt;
      if (!said) {
        said = true;
        hxSound('choir', st.x, z, 0.8);
      }
      let any = false;
      for (const a of walkers) {
        if (!hxWalk(a, B, z, 0.75, dt)) any = true;
        else a.hide = true;
        const fl = 0.75 + 0.25 * Math.sin(R.time * 13 + a.x * 3);
        if (!a.hide) {
          hxGlint(a.x + Math.sin(a.dir) * 0.3, 1.0, a.z + Math.cos(a.dir) * 0.3, 0.32, [1, 0.62, 0.25], 0.55 * fl);
          hxLight(a.x + Math.sin(a.dir) * 0.3, 1.0, a.z + Math.cos(a.dir) * 0.3, 2.0, mul3([1, 0.55, 0.2], 0.5 * fl));
        }
      }
      return any && t < 26;
    },
    end() {
      for (const a of walkers) hxKill(a);
    },
  };
}
// a light in the sky over Wexley, combing the streets
function hxSearch(near) {
  const P = PLAYER,
    cx = near ? P.x + rand(-6, 6) : rand(8, W - 8),
    cz = near ? P.z + rand(-4, 4) : rand(8, TOWN_H - 8);
  const cr = { x: cx - 18, y: 12.5, z: cz - 6, spin: 0, glow: 0.4, tilt: 0.12 };
  HX.crafts.push(cr);
  let t = 0,
    said = false,
    hit = false;
  return {
    kind: 'search',
    step(dt) {
      t += dt;
      cr.spin += dt * 0.7;
      const f = t / 16;
      cr.x = cx - 18 + f * 36;
      cr.z = cz - 6 + f * 12;
      if (!said) {
        said = true;
        hxSound('thrum', cx, cz, near ? 0.8 : 0.45);
      }
      const gx = cr.x + Math.sin(t * 0.9) * 4.5,
        gz = cr.z + Math.cos(t * 0.7) * 4 + 3;
      const dx = gx - cr.x,
        dz = gz - cr.z,
        len = Math.hypot(dx, cr.y, dz);
      HX.beams.push({
        x: cr.x,
        y: cr.y - 0.3,
        z: cr.z,
        r: 1.6,
        h: len,
        col: [0.75, 0.95, 1],
        a: 0.55 * Math.min(1, t, 16 - t),
        lean: Math.atan2(Math.hypot(dx, dz), cr.y),
        leanDir: Math.atan2(dx, dz) + Math.PI,
      });
      hxLight(gx, 0.8, gz, 3.4, mul3([0.7, 0.9, 1], 1.4 * Math.min(1, t, 16 - t)));
      if (G.started && PLAYER.onMap && hxDist(gx, gz) < 2.2 && !hit) {
        hit = true;
        HX.jolt = 0.6;
        R.flash = Math.max(R.flash, 0.3);
        audio.hx('beam', 0, 0.7);
      }
      return t < 16;
    },
    end() {
      const i = HX.crafts.indexOf(cr);
      if (i >= 0) HX.crafts.splice(i, 1);
    },
  };
}
// at home: a face at the window, hands flat on the glass
function hxWindow() {
  const cx = Math.sin(cam.yaw),
    cz = Math.cos(cam.yaw);
  const opts = [
    [4, 19, 0, -1],
    [5, 19, 0, -1],
    [8, 19, 0, -1],
    [9, 19, 0, -1],
    [2, 22, -1, 0],
    [2, 23, -1, 0],
    [9, 32, 0, 1],
  ].filter(([, , nx, nz]) => nx * cx + nz * cz > 0.25);
  if (!opts.length) return hxKnock();
  const [wx, wz, nx, nz] = pick(opts),
    x = wx + 0.5 + nx * 0.8,
    z = wz + 0.5 + nz * 0.8,
    dir = Math.atan2(-nx, -nz);
  const a = hxActor(
    hxLook({ skin: 0xe4dfd6, hair: 'long', hairCol: 0x0b0b0b, top: 0x8c8c86, bottom: 0x4a4a46 }),
    x,
    z,
    { ghost: 0.8, menace: 0.6, shadow: 0 },
  );
  a.dir = a.tdir = dir;
  let t = 0,
    turn = 0;
  const T = {};
  // palms on the glass, back to you. Then the head comes round. All the way round.
  a.poseFn = (Tg, b) => {
    Tg.uaL = Tg.uaR = -1.6;
    Tg.faL = Tg.faR = -0.9;
    Tg.aoL = Tg.aoR = 0.35;
    Tg.hp = 0.05 + turn * 0.12;
    Tg.hr = Math.sin(b.animT * 0.4) * 0.15 * (1 - turn) + turn * 0.22;
    b.fx.eye = [0.01, 0.01, 0.01];
    b.fx.gape = 0.25 + turn * 0.55;
  };
  return {
    step(dt) {
      t += dt;
      if (!T.tap) {
        T.tap = true;
        hxSound('tap', x, z, 1);
      }
      if (t > 1.4 && !T.tap2) {
        T.tap2 = true;
        hxSound('tap', x, z, 1);
      }
      if (t > 2.6) {
        const k = clamp((t - 2.6) / 1.8, 0, 1) * 5;
        turn = Math.min(1, (Math.floor(k) + clamp(((k % 1) - 0.7) / 0.3, 0, 1)) / 5);
      }
      a.gaze = turn * Math.PI;
      if (turn >= 1 && !T.crack) {
        T.crack = true;
        hxSound('crack', x, z, 0.8);
        if (hxSeen(x, z)) HX.jolt = Math.max(HX.jolt, 0.45);
      }
      hxLight(x + nx * 0.9, 1.6, z + nz * 0.9, 2.6, [0.4, 0.46, 0.6]);
      const near = t > 1 && hxDist(x, z) < 2.1;
      if ((near || t > 9) && !T.go) {
        T.go = true;
        T.at = t;
        hxSound('whisper', x, z, 0.9);
        if (near) HX.jolt = 0.6;
      }
      if (T.go) a.hide = Math.random() < 0.6;
      return !T.go || t - T.at < 0.3;
    },
    end() {
      hxKill(a);
    },
  };
}
// a doorway across the street goes red. Something stands in it, backlit, black, and watches. Come close or wait it out
// and the light cuts. From a frayed mind (vision) it is shorter, and it was never there.
// somewhere in the middle of the picture, clear of the panels along the bottom
function hxOnScreen(x, z) {
  if (!R.canvas || !cam.VP) return true;
  const r = R.canvas.getBoundingClientRect();
  if (!r.width) return true;
  const [sx, sy] = project(x, 1.2, z);
  return sx > r.width * 0.1 && sx < r.width * 0.9 && sy > r.height * 0.1 && sy < r.height * 0.72;
}
function hxRedDoor(vision) {
  const P = PLAYER,
    cx0 = Math.sin(cam.yaw),
    cz0 = Math.cos(cam.yaw);
  const doors = HOUSE_DEFS.map((h) => [h.door, h.out]).concat([
    [
      [35, 12],
      [35, 13],
    ],
    [
      [13, 12],
      [13, 13],
    ],
    [
      [12, 19],
      [12, 18],
    ],
  ]);
  let best = null;
  for (const [d, o] of doors) {
    const ux = o[0] - d[0],
      uz = o[1] - d[1],
      ox = o[0] + 0.5,
      oz = o[1] + 0.5,
      dist = hxDist(ox, oz);
    if (dist < 5 || dist > 14 || visCur[I(o[0], o[1])] < 0.5 || !hxOnScreen(ox, oz)) continue;
    const facing = ux * cx0 + uz * cz0,
      score = facing * 1.5 + visCur[I(o[0], o[1])] - Math.abs(dist - 9) * 0.15 + rand(0, 0.5);
    if (!best || score > best.score) best = { d, ux, uz, score };
  }
  if (!best) return null;
  const { d, ux, uz } = best,
    dx = d[0] + 0.5,
    dz = d[1] + 0.5;
  const at = (k) => [dx + ux * k, dz + uz * k];
  let pos = at(0.62);
  const a = hxActor(HX_SHADOW(), pos[0], pos[1], { ghost: 0.75, menace: vision ? 0.3 : 0.5, shadow: 0.35, hide: true });
  a.poseFn = (Tg, b) => {
    Tg.uaL = Tg.uaR = 0.03;
    Tg.aoL = Tg.aoR = 0.05;
    Tg.hp = 0.12;
    Tg.hr = Math.sin(b.animT * 0.37) * 0.06;
  };
  const life = vision ? rand(4, 6) : rand(8, 11),
    stepAt = life * rand(0.45, 0.6);
  let t = 0,
    cut = -1;
  const T = {};
  return {
    step(dt) {
      t += dt;
      a.tdir = Math.atan2(PLAYER.x - a.x, PLAYER.z - a.z);
      if (cut < 0 && (t > life || (t > 1 && hxDist(a.x, a.z) < 3.6))) {
        cut = t;
        hxSound('crack', dx, dz, 0.7);
        if (hxDist(a.x, a.z) < 4.5 && hxSeen(a.x, a.z, 0.3)) {
          HX.jolt = Math.max(HX.jolt, 0.55);
          HX.shake = 0.3;
        }
      }
      if (cut >= 0) {
        a.hide = true;
        hxDark(dx + ux * 1.2, dz + uz * 1.2, 3.2, 0.6 * (1 - (t - cut) / 0.7));
        return t - cut < 0.7;
      }
      // the light stutters on, then holds, with a faint pulse
      const on = t < 0.9 ? (Math.random() < 0.45 ? 1 : 0.08) : 0.88 + 0.12 * Math.sin(t * 5.3) * Math.sin(t * 1.7);
      // halfway, it is suddenly a step closer
      if (t > stepAt && !T.step) {
        T.step = true;
        T.blink = t;
        pos = at(1.5);
        a.x = pos[0];
        a.z = pos[1];
        hxSound('whisper', a.x, a.z, 0.7);
      }
      a.hide = t < 0.9 ? on < 0.5 : T.blink != null && t - T.blink < 0.14;
      if (t > 0.9 && !T.sting) {
        T.sting = true;
        hxSound('sting', dx, dz, vision ? 0.3 : 0.45);
      }
      hxLight(dx + ux * 0.1, 1.3, dz + uz * 0.1, 3.4, mul3([1.5, 0.07, 0.05], on));
      hxLight(dx + ux * 1.9, 0.2, dz + uz * 1.9, 2.9, mul3([0.95, 0.045, 0.03], on));
      hxGlint(dx + ux * 0.05, 1.15, dz + uz * 0.05, 1.5, [1, 0.08, 0.05], 0.3 * on);
      return true;
    },
    end() {
      hxKill(a);
    },
  };
}
function hxKnock() {
  let t = 0,
    n = 0;
  return {
    step(dt) {
      t += dt;
      if (t > n * 0.42 && n < 3) {
        n++;
        audio.hx('knock', hxPan(11.5, 22.5), 0.9);
      }
      return t < 4;
    },
  };
}
