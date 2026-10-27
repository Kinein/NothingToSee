//@ taken/way-out-play — Escaping the lair: watchers, sleepers, being caught, getting out
//@ Defines: escPlay, escKey, escListen, escIntel, escWatch, escFollow, escSleep, escWake, escFx, escCaught, escOut, ESC_OUT
//@ Uses:    taken/taken, gfx/renderer, horror/layer, audio/sound, world/grid, core/util, sim/core, world/light-map, ui/interface, world/paths, …
//@ (header made by tools/map.js; stripped by build.py)
function escPlay(dt) {
  const E = CAP.esc,
    P = PLAYER;
  E.t += dt;
  if (E.t > 5) capGoal(null);
  const dtg = dt * SPEEDS[1];
  driveTick(dtg);
  animate(P, dt, dtg);
  updateShown(P, dt);
  cam.tx += (P.x - cam.tx) * Math.min(1, dt * 5);
  cam.tz += (P.z - cam.tz) * Math.min(1, dt * 5);
  for (const w of E.watchers) escWatch(w, dt);
  for (const s of E.sleepers) escSleep(s, dt);
  escListen(dt);
  // what E would do here: a way out, or something worth a look
  let near = null;
  for (const x of E.exits) {
    const d = Math.hypot(P.x - x.x, P.z - x.z);
    if (d < (x.auto ? 0.75 : 1.25)) {
      near = x;
      break;
    }
  }
  if (!near && E.looks)
    for (const x of E.looks)
      if (!x.done && Math.hypot(P.x - x.x, P.z - x.z) < 1.2) {
        near = x;
        break;
      }
  E.focus = near;
  if (near && near.auto) return escOut(near);
  capPrompt(near ? 'E' : null, '', null, near ? (near.kind ? 'up' : 'eye') : null);
  const danger = Math.max(0, ...E.watchers.map((w) => w.alert), ...E.sleepers.map((s) => (s.awake ? 1 : s.stir)));
  HX.danger = Math.max(HX.danger, danger * 0.9);
  if (E.caught) return;
}
function escKey(k) {
  const E = CAP.esc;
  if (!E) return;
  if (E.phase === 'wake' && k === 'e' && E.cfg.mash && CAP.act.t > 2.0) {
    E.free = Math.min(1, E.free + 1 / E.cfg.mash);
    E.struggle = 1;
    setTimeout(() => {
      if (CAP.esc === E) E.struggle = 0;
    }, 260);
    audio.hx(CAP.lair === 'ship' ? 'strap' : 'rope', rand(-0.2, 0.2), 0.7);
    return;
  }
  if (E.phase !== 'free' || k !== 'e') return;
  const f = E.focus;
  if (!f) return;
  if (f.kind) return escOut(f);
  f.done = true;
  if (f.n) capPortrait(f.n);
  else audio.hx('sting', 0, 0.35);
  addStress(3);
  if (f.intel) escIntel();
}
function escListen(dt) {
  const E = CAP.esc,
    P = PLAYER;
  if (!E.talkAt || !E.lines || E.said >= E.lines.length) return;
  const d = Math.hypot(P.x - E.talkAt[0], P.z - E.talkAt[1]);
  if (d > E.cfg.listen + 1.4) return;
  E.heard += dt * (d < E.cfg.listen ? 1 : 0.4);
  if (E.heard >= 2.6) {
    E.heard = 0;
    const [who, line] = E.lines[E.said++];
    const bought = E.boughtA && E.bought && (who === E.bought.name || who === 'The bought one');
    const talkers = E.watchers
      .filter((w) => w.talker)
      .sort(
        (a, b) =>
          Math.hypot(a.a.x - E.talkAt[0], a.a.z - E.talkAt[1]) - Math.hypot(b.a.x - E.talkAt[0], b.a.z - E.talkAt[1]),
      );
    const sp = bought ? E.boughtA : talkers.length ? talkers[E.said % talkers.length].a : null;
    if (sp) capSayAt(sp, line, 3.2);
    if (E.said >= E.lines.length) escIntel();
  }
}
// what you take away: a name said out loud down here
function escIntel() {
  const E = CAP.esc;
  if (E.intel) return;
  E.intel = true;
  const m = E.intelOn;
  if (m)
    addNote(
      m,
      CAP.lair === 'ship'
        ? 'Overheard in THEIR craft: “' + m.short + '’s skin needs mending.”'
        : CAP.lair === 'sewer'
          ? 'Overheard under Wexley: “' + m.short + ' says the one asking questions has a price.”'
          : 'In the nest: ' + m.short + '’s clothes, folded.',
      { by: 'you' },
    );
  if (E.bought && E.bought.n) addNote(E.bought.n, 'Counting gold with THEM, under the alley.', { by: 'you' });
  E.notes = (E.notes || []).concat([[m ? 'people' : 'ear', m ? m.short + ' · overheard' : 'Overheard', 'onto']]);
  audio.hx('sting', 0, 0.5);
}
// a watcher: its round, its look, its chase
function escWatch(w, dt) {
  const P = PLAYER,
    a = w.a,
    E = CAP.esc,
    cfg = E.cfg;
  if (E.caught) {
    a.moving = false;
    return;
  }
  const dx = P.x - a.x,
    dz = P.z - a.z,
    d = Math.hypot(dx, dz);
  const cone = w.cone || cfg.cone,
    range = w.range || cfg.range;
  let see = false;
  if (P.onMap && d < range) {
    const ang = Math.abs(angDiff(a.dir, Math.atan2(dx, dz)));
    const lit = lumAt(P.x, P.z) >= 0.12 || (w.lantern && d < 2.6);
    if ((ang < cone && (lit || d < cfg.close)) || d < 0.95)
      see = losClear(Math.floor(a.x), Math.floor(a.z), Math.floor(P.x), Math.floor(P.z));
  }
  const loud =
    P.moving &&
    P.run &&
    d < 4.2 &&
    w.state !== 'chase' &&
    losClear(Math.floor(a.x), Math.floor(a.z), Math.floor(P.x), Math.floor(P.z));
  if (see) {
    w.alert = Math.min(1, w.alert + dt * (w.state === 'chase' ? 4 : cfg.gain * (1.25 - d / range) * (P.run ? 1.6 : 1)));
    w.lastSeen = [P.x, P.z];
    w.lost = 0;
  } else w.alert = Math.max(0, w.alert - dt * (w.state === 'chase' ? 0.12 : 0.3));
  if (loud) {
    w.alert = Math.max(w.alert, 0.4);
    w.lastSeen = [P.x, P.z];
  }
  if (w.alert >= 1 && w.state !== 'chase') {
    w.state = 'chase';
    w.rp = 0;
    E.alarm = 1;
    audio.hx(a.kind === 'grey' ? 'alarm' : 'hiss', 0, 1);
    HX.jolt = Math.max(HX.jolt, 0.7);
    if (a.kind === 'lizard') a.fx.frill = 1;
  }
  if (w.state === 'chase') {
    if (!see) w.lost += dt;
    if (w.lost > 3.5) {
      w.state = w.stay != null ? 'stay' : 'route';
      w.alert = 0.5;
      w.path = null;
      return;
    }
    const tgt = see ? [P.x, P.z] : w.lastSeen;
    w.rp -= dt;
    if (w.rp <= 0 || !w.path) {
      w.rp = 0.35;
      const t = nearestWalkable(tgt[0], tgt[1], null, 2);
      const p = t && findPath(a.x, a.z, t[0], t[1], null);
      w.path = p ? p.map(([x, z]) => [x + 0.5, z + 0.5]) : null;
      w.pi = 0;
    }
    escFollow(w, cfg.chase, dt, see ? [P.x, P.z] : null);
    a.tell.lunge = d < 2;
    if (d < 0.8 && P.onMap) return escCaught(w);
    return;
  }
  a.tell.lunge = false;
  if (w.alert > 0.2) {
    // something's there: it stops, and looks
    a.moving = false;
    const tg = w.lastSeen || [P.x, P.z];
    capFace(a, tg[0], tg[1]);
    return;
  }
  if (w.state === 'stay') {
    a.moving = false;
    a.tdir = w.stay;
    if (w.counting)
      a.poseFn = (T2, aa) => {
        T2.torso = 0.35;
        T2.hp = 0.55;
        T2.uaL = T2.uaR = -0.9;
        T2.faL = -0.8 + Math.sin(aa.animT * 3.1) * 0.25;
        T2.faR = -0.8;
      };
    return;
  }
  // the round
  if (w.wait > 0) {
    w.wait -= dt;
    a.moving = false;
    a.tdir += Math.sin(E.t * 0.9 + w.ri) * dt * 0.8;
    return;
  }
  const [tx, tz] = w.route[w.ri];
  if (capWalk(a, tx, tz, cfg.walk, dt)) {
    w.wait = rand(0.8, 2.0);
    if (w.ping) {
      if (w.ri === w.route.length - 1) w.dir = -1;
      else if (w.ri === 0) w.dir = 1;
      w.ri += w.dir;
    } else w.ri = (w.ri + 1) % w.route.length;
  }
}
function escFollow(w, spd, dt, direct) {
  const a = w.a;
  if (
    direct &&
    losClear(Math.floor(a.x), Math.floor(a.z), Math.floor(direct[0]), Math.floor(direct[1])) &&
    Math.hypot(direct[0] - a.x, direct[1] - a.z) < 2.5
  ) {
    capWalk(a, direct[0], direct[1], spd, dt);
    a.run = true;
    return;
  }
  if (!w.path || w.pi >= w.path.length) {
    a.moving = false;
    return;
  }
  const [tx, tz] = w.path[w.pi];
  if (capWalk(a, tx, tz, spd, dt)) w.pi++;
  a.run = true;
}
// the dead asleep: too close or too loud and they stir; stirred enough, they wake, and wake the rest
function escSleep(s, dt) {
  const P = PLAYER,
    a = s.a,
    E = CAP.esc;
  const d = Math.hypot(P.x - a.x, P.z - a.z);
  if (s.awake) {
    if (E.caught) {
      a.moving = false;
      return;
    }
    if (R.time < s.wakeAt) return;
    a.tell.down = false;
    s.rp = (s.rp || 0) - dt;
    if (s.rp <= 0 || !s.path) {
      s.rp = 0.45;
      const t = nearestWalkable(P.x, P.z, null, 2);
      const p = t && findPath(a.x, a.z, t[0], t[1], null);
      s.path = p ? p.map(([x, z]) => [x + 0.5, z + 0.5]) : null;
      s.pi = 0;
    }
    escFollow(s, E.cfg.chase, dt, [P.x, P.z]);
    a.tell.lunge = d < 2.2;
    if (d < 0.8) escCaught(s);
    return;
  }
  let rate = -0.2;
  if (P.moving) rate = P.run ? (d < 4.6 ? 1.0 * (1.25 - d / 4.6) : -0.2) : d < 1.7 ? 0.36 : d < 2.6 ? 0.1 : -0.2;
  if (s.over && E.phase === 'wake') rate = 0;
  s.stir = clamp(s.stir + rate * dt, 0, 1);
  if (s.stir > 0.5 && R.time > s.groaned) {
    s.groaned = R.time + rand(2.5, 4);
    audio.hx('groan', 0, 0.35 + s.stir * 0.4);
  }
  if (s.stir >= 1) escWake(s, true);
}
function escWake(s, first) {
  if (s.awake) return;
  const E = CAP.esc;
  s.awake = true;
  s.wakeAt = R.time + (first ? 0.3 : rand(0.5, 1.4));
  if (first) {
    audio.hx('scream', 0, 1);
    HX.jolt = 1;
    HX.shake = 0.8;
    E.alarm = 1;
    for (const o of E.sleepers) if (o !== s && Math.hypot(o.a.x - s.a.x, o.a.z - s.a.z) < 7.5) escWake(o, false);
  } else
    setTimeout(() => {
      if (CAP.esc === E) audio.hx('groan', rand(-0.5, 0.5), 0.8);
    }, 400);
}
// the screen while you play: who's looking your way, the lights THEY carry
function escFx(dtR) {
  const E = CAP.esc;
  if (!E) return;
  const ui = capUI();
  let box = ui.querySelector('.cp-marks');
  if (!box) {
    box = document.createElement('div');
    box.className = 'cp-marks';
    ui.appendChild(box);
  }
  const items = [];
  for (const w of E.watchers) {
    const a = w.a;
    if (w.lantern) {
      const lx = a.x + Math.sin(a.dir) * 0.45,
        lz = a.z + Math.cos(a.dir) * 0.45;
      DYN.push({ x: Math.floor(lx), z: Math.floor(lz), col: [1, 0.66, 0.3], int: 0.72, r: 3.6 });
      hxLight(lx, 1.3, lz, 3.0, [1, 0.6, 0.22]);
      hxGlint(lx, 1.2, lz, 0.4, [1, 0.72, 0.35], 0.55 + 0.1 * Math.sin(R.time * 13));
    }
    if (a.kind === 'grey') {
      DYN.push({ x: Math.floor(a.x), z: Math.floor(a.z), col: [0.4, 0.9, 0.7], int: 0.32, r: 2.2 });
      hxLight(a.x, 1.9, a.z, 2.2, [0.3, 0.9, 0.6]);
    }
    const eyeY = a.kind === 'grey' ? 1.92 : 1.62,
      eo = a.kind === 'grey' ? 0.24 : 0.42;
    for (const s of [1, -1])
      hxGlint(
        a.x + Math.sin(a.dir) * eo + Math.cos(a.dir) * s * 0.1,
        eyeY,
        a.z + Math.cos(a.dir) * eo - Math.sin(a.dir) * s * 0.1,
        0.1,
        a.kind === 'grey' ? [0.4, 1, 0.75] : [1, 0.72, 0.15],
        0.5 + w.alert * 0.5,
      );
    if (w.alert > 0.08 && visAt(a.x, a.z) > 0.3)
      items.push({
        x: a.x,
        y: a.kind === 'grey' ? 2.45 : 2.2,
        z: a.z,
        k: w.state === 'chase' ? 1 : w.alert,
        hot: w.state === 'chase',
      });
  }
  for (const s of E.sleepers) {
    const a = s.a;
    if (s.stir > 0.65 || s.awake)
      for (const sd of [1, -1])
        hxGlint(
          a.x + Math.cos(a.dir) * sd * 0.07,
          s.awake ? 1.6 : 0.32,
          a.z - Math.sin(a.dir) * sd * 0.07,
          0.07,
          [0.85, 0.92, 0.8],
          s.awake ? 0.8 : (s.stir - 0.65) * 2,
        );
    if ((s.stir > 0.12 || s.awake) && visAt(a.x, a.z) > 0.3)
      items.push({ x: a.x, y: s.awake ? 2.2 : 1.0, z: a.z, k: s.awake ? 1 : s.stir, hot: s.awake, dead: true });
  }
  while (box.children.length < items.length) {
    const m = document.createElement('div');
    m.className = 'cp-mk';
    m.innerHTML =
      '<svg viewBox="0 0 36 36"><circle class="bg" cx="18" cy="18" r="14"/><circle class="fl" cx="18" cy="18" r="14" stroke-dasharray="88" stroke-dashoffset="88"/></svg><i></i>';
    box.appendChild(m);
  }
  [...box.children].forEach((m, i) => {
    const it = items[i];
    if (!it) {
      m.style.display = 'none';
      return;
    }
    m.style.display = '';
    const [x, y] = project(it.x, it.y, it.z);
    m.style.transform = 'translate(' + (x - 15).toFixed(1) + 'px,' + (y - 15).toFixed(1) + 'px)';
    m.querySelector('.fl').setAttribute('stroke-dashoffset', (88 * (1 - it.k)).toFixed(1));
    m.classList.toggle('hot', !!it.hot);
    m.classList.toggle('dead', !!it.dead);
    m.querySelector('i').textContent = it.hot ? '!' : it.dead ? '' : '?';
  });
  if (E.folded) lairFolded(E.folded);
}
// caught: it has you, and it's the long way after all
function escCaught(w) {
  const E = CAP.esc;
  if (E.caught) return;
  E.caught = w;
  const P = PLAYER,
    a = w.a;
  audio.hx('grab', 0, 1);
  audio.hx('scream', 0, 0.8);
  HX.jolt = 1;
  HX.shake = 1;
  R.pulse = 1;
  capPrompt(null);
  capGoal(null);
  const box = capUI().querySelector('.cp-marks');
  if (box) box.innerHTML = '';
  E.you = capYou(P.x, P.z, { dir: P.dir });
  P.onMap = false;
  capFace(a, P.x, P.z);
  a.tell.lunge = true;
  CAP.cam = { x: P.x, z: P.z, zoom: 3.2, yaw: cam.yaw };
  UI.scene = CAP;
  E.phase = 'done';
  CAP.esc.fail = true;
  CAP.acts = [
    {
      name: 'grabbed',
      done: {},
      step(dt, t) {
        capFall(E.you, t, 0.1, 0.5);
        if (t > 0.6) capFx({ lid: 1, daze: 0.8 }, { lid: 1.6 });
        if (t > 1.6) capFx({ fade: 1 }, { fade: 2.5 });
        if (t > 2.4) return false;
      },
      end() {
        for (const x of CAP.actors.slice()) capKill(x);
        CAP.esc = null;
      },
    },
    ...capDown(true),
    capDrop(),
  ];
}
// out: into the pod, up the stairs, through the hole
function escOut(x) {
  const E = CAP.esc;
  if (E.phase !== 'free') return;
  const P = PLAYER;
  E.phase = 'done';
  E.out = x.kind;
  capPrompt(null);
  capGoal(null);
  const box = capUI().querySelector('.cp-marks');
  if (box) box.innerHTML = '';
  E.you = capYou(P.x, P.z, { dir: P.dir });
  P.onMap = false;
  UI.scene = CAP;
  CAP.cam = { x: P.x, z: P.z, zoom: 3.2, yaw: cam.yaw };
  CAP.out = x.kind;
  CAP.acts = [ESC_OUT[x.kind](x, E), capHours(irand(50, 100), 1.4), capDrop()];
}
const ESC_OUT = {
  // into the pod; the hatch; it drops through the floor of the craft, and the floor of the craft is the sky
  pod: (x, E) => ({
    name: 'pod',
    done: {},
    start() {
      this.x = x;
      let best = null,
        bd = 1e9;
      for (const m of R.objMeshes)
        if (m.obj && m.obj.type === 'lx_pod') {
          const d = Math.hypot(m.obj.cx - x.px, m.obj.cz - x.pz);
          if (d < bd) {
            bd = d;
            best = m;
          }
        }
      this.mesh = best;
      if (best) {
        this.base = best.model;
        (CAP.moved || (CAP.moved = [])).push([best, best.model]);
      }
    },
    step(dt, t) {
      const you = E.you;
      if (t < 1.2) capWalk(you, x.px, x.pz, 1.4, dt);
      else {
        you.hide = true;
      }
      if (t > 1.2) capOnce(this, 'shut', () => audio.hx('door', 0, 0.9));
      if (t > 1.6)
        capOnce(this, 'pod', () => {
          audio.hx('pod', 0, 1);
          HX.shake = 1.0;
          HX.jolt = 1;
        });
      const drop = Math.max(0, t - 2.3);
      if (this.mesh)
        this.mesh.model = M4.mul(
          M4.trans((Math.random() - 0.5) * 0.03 * capSeg(t, 1.6, 2.3), -drop * drop * 2.6, 0),
          this.base,
        );
      if (t > 2.3)
        capOnce(this, 'go', () => {
          R.flash = Math.max(R.flash, 0.5);
          HX.shake = 1.4;
          audio.hx('whoosh', 0, 1);
        });
      if (t > 2.6) capFx({ washK: 0.85, wash: [1, 0.82, 0.62] }, { washK: 1.1 });
      capCam(x.px, x.pz - 0.6, 2.8 - capSeg(t, 0, 3) * 0.4, cam.yaw, 2);
      if (t > 3.4) {
        capFx({ fade: 1 }, { fade: 3 });
      }
      if (t > 4.0) return false;
    },
    fx(dtR, t) {
      const k = capSeg(t, 1.5, 2.2),
        g = capSeg(t, 2.3, 2.5);
      if (k > 0) hxLight(x.px, 1.0, x.pz, 3, mul3([1, 0.55, 0.25], 1.5 * k));
      if (g > 0) {
        hxLight(x.px, 0.2, x.pz, 4.5, mul3([1, 0.7, 0.4], 2.2 * g));
        CAP.glow.push({ x: x.px, y: 0.1, z: x.pz, size: 1.4, col: [1, 0.75, 0.45], a: 0.6 * g });
      }
      for (let i = 0; i < 10 * k; i++) {
        const ph = (R.time * 1.3 + i * 0.13) % 1,
          a = i * 2.4 + R.time;
        hxGlint(
          x.px + Math.sin(a) * (0.5 + ph * 0.5),
          0.1 + ph * 0.6,
          x.pz + Math.cos(a) * (0.5 + ph * 0.5),
          0.05,
          [1, 0.8, 0.5],
          (1 - ph) * 0.7,
        );
      }
    },
    end() {
      if (this.mesh) this.mesh.model = this.base;
      for (const a of CAP.actors.slice()) capKill(a);
    },
  }),
  stairs: (x, E) => ({
    name: 'stairs',
    done: {},
    step(dt, t) {
      const you = E.you,
        s = OBJ_BY_ID.lxStairs;
      if (t < 0.9) capWalk(you, s.cx - 0.3, s.cz, 1.3, dt);
      else {
        you.y = capSeg(t, 0.9, 3.2) * 2.6;
        you.tdir = Math.PI / 2;
        you.moving = true;
        you.walkPh += dt * 3;
      }
      if (t > 1.0) capOnce(this, 'clang', () => audio.hx('knock', 0, 0.6));
      if (t > 2.4) capOnce(this, 'clang2', () => audio.hx('knock', 0, 0.8));
      capCam(s.cx - 0.3, s.cz, 3.0, cam.yaw, 2);
      if (t > 2.8) capFx({ fade: 1 }, { fade: 2.5 });
      if (t > 3.6) return false;
    },
    end() {
      for (const a of CAP.actors.slice()) capKill(a);
    },
  }),
  hole: (x, E) => ({
    name: 'hole',
    done: {},
    step(dt, t) {
      const you = E.you;
      you.poseFn = (T2) => {
        T2.rootY = -0.36;
        T2.thL = T2.thR = -1.3;
        T2.shL = T2.shR = 1.95;
        T2.torso = 0.9;
        T2.uaL = T2.uaR = -1.6;
      };
      if (capWalk(you, x.x, x.z - 1.15, 0.7, dt)) you.y = Math.max(-0.9, (you.y || 0) - dt * 0.8); // up the roots and into the hole
      if (t > 0.6) capOnce(this, 'scr', () => audio.hx('drag', 0, 0.6));
      capCam(x.x, x.z - 0.4, 2.6, cam.yaw, 2);
      if (t > 2.0) capFx({ fade: 1 }, { fade: 2.5 });
      if (t > 2.8) return false;
    },
    fx() {
      hxLight(x.x, 1.6, x.z - 0.9, 2.8, [0.34, 0.38, 0.52]);
    },
    end() {
      for (const a of CAP.actors.slice()) capKill(a);
    },
  }),
};
