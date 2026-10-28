//@ taken/taken — Being taken: the capture
//@ Defines: CAP, CAP_ESCAPE, camBounds, capOnce, capUI, capLine, capSay, capTime, capTimeOff, capReason, capPrompt, capGoal, capPortrait, capSayAt, capBub, capSkipShown, …
//@ Uses:    sim/core, gfx/renderer, core/util, ui/interface, horror/layer, world/grid, audio/sound, game/loop, world/vision, world/objects, …
//@ (header made by tools/map.js; stripped by build.py)
// ───────────────────────── taken ─────────────────────────
// When THEY get you. First what you see coming (in your own bed, in THEIR part of town, on the ground after a fight);
// then THEIR place, half awake: hours go missing in the dark between glimpses of what they do to you. One time in three
// you come round alone and there's a way out, if you can find it. Either way you end up back in Wexley as if nothing
// had happened. The town waits while it plays; the hours you lose are run through afterwards, in the dark.
const CAP = {
  on: false,
  lit: null,
  lair: null,
  fac: null,
  how: null,
  foe: null,
  reason: null,
  act: null,
  acts: [],
  actors: [],
  decals: [],
  glow: [],
  fx: { fade: 0, daze: 0, lid: 0, washK: 0, letter: 0 },
  fxT: { fade: 0, daze: 0, lid: 0, washK: 0, letter: 0 },
  fxR: { fade: 3, daze: 1.5, lid: 3, washK: 2, letter: 2 },
  wash: [1, 1, 1],
  cam: null,
  camK: 3,
  eye: null,
  reveal: 0,
  saved: null,
  esc: null,
  ffTo: 0,
  ffSecs: 1,
  hold: 0,
  holdKey: false,
  skip: false,
  quiet: false,
  out: null,
  lost: 0,
  seen: 0,
  tick: 0,
};
const CAP_ESCAPE = 1 / 3; // the odds of coming round alone, with a way out
function camBounds() {
  const L = CAP.on && CAP.lair && CAP.lit === CAP.lair ? LAIRS[CAP.lair] : null;
  return L ? [L.x0 - 2, L.z0 - 2, L.x1 + 3, L.z1 + 3] : [-2, -2, W + 2, TOWN_H + 2];
}
const capSeg = (t, a, b) => sstep(a, b, t);
function capOnce(act, k, fn) {
  if (act.done[k]) return false;
  act.done[k] = true;
  try {
    fn();
  } catch (e) {
    console.error(e);
  }
  return true;
}

// ── the overlay: a line of type at the foot of the screen, the clock between glimpses, a key to press, where to go
function capUI() {
  let el = $('#cap');
  if (el) return el;
  el = document.createElement('div');
  el.id = 'cap';
  el.hidden = true;
  el.innerHTML =
    '<div class="cp-reason"><span class="cp-ri"></span><b></b></div><div class="cp-time"><b></b><span></span></div>' +
    '<div class="cp-goal"></div><div class="cp-line"></div><div class="cp-say"></div>' +
    '<div class="cp-prompt"><span class="cp-k"><svg class="cp-ring" viewBox="0 0 44 44" aria-hidden="true"><circle class="trk" cx="22" cy="22" r="18"/><circle class="val" cx="22" cy="22" r="18" stroke-dasharray="113.1" stroke-dashoffset="113.1"/></svg><kbd></kbd></span><span class="cp-t"></span></div>' +
    '<div class="cp-skip"><kbd>Space</kbd>' +
    svgIcon('ff') +
    '</div><div class="cp-who"><img alt=""></div><div class="cp-bub"><span></span></div>';
  document.body.appendChild(el);
  el.querySelector('.cp-skip').addEventListener('pointerdown', (e) => {
    e.preventDefault();
    if (CAP.act && CAP.act.skip && !CAP.esc) CAP.act.skip();
  });
  const pr = el.querySelector('.cp-prompt'); // the key's prompt, pressed with a finger or the mouse
  pr.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    if (CAP.esc) {
      escKey('e');
      CAP.esc.holdE = true;
    }
  });
  for (const ev of ['pointerup', 'pointerleave', 'pointercancel'])
    pr.addEventListener(ev, () => {
      if (CAP.esc) CAP.esc.holdE = false;
    });
  return el;
}
function capLine(text, secs = 3.2) {
  const el = capUI().querySelector('.cp-line');
  clearTimeout(capLine.t);
  clearInterval(capLine.iv);
  el.textContent = '';
  el.classList.add('on');
  let i = 0;
  capLine.iv = setInterval(() => {
    i++;
    el.textContent = text.slice(0, i);
    if (i >= text.length) clearInterval(capLine.iv);
  }, 38);
  capLine.t = setTimeout(() => el.classList.remove('on'), secs * 1000);
}
function capSay(who, text, secs = 2.6) {
  const el = capUI().querySelector('.cp-say');
  clearTimeout(capSay.t);
  el.innerHTML = (who ? '<em></em>' : '') + '<span></span>';
  if (who) el.querySelector('em').textContent = who;
  el.querySelector('span').textContent = text;
  el.classList.add('on');
  capSay.t = setTimeout(() => el.classList.remove('on'), secs * 1000);
}
function capTime(t, sub) {
  const el = capUI().querySelector('.cp-time');
  el.querySelector('b').textContent = fmtTime(t);
  el.querySelector('span').textContent = sub || '';
  el.classList.remove('on');
  void el.offsetWidth;
  el.classList.add('on');
}
function capTimeOff() {
  capUI().querySelector('.cp-time').classList.remove('on');
}
function capReason(icon, text, hi) {
  const el = capUI().querySelector('.cp-reason');
  el.classList.toggle('hi', !!hi);
  el.querySelector('.cp-ri').innerHTML = svgIcon(icon);
  el.querySelector('b').textContent = text;
  el.classList.remove('on');
  void el.offsetWidth;
  el.classList.add('on');
  clearTimeout(capReason.t);
  capReason.t = setTimeout(() => el.classList.remove('on'), 2900);
}
function capPrompt(key, text, k, icon) {
  const el = capUI().querySelector('.cp-prompt');
  if (!key) {
    el.classList.remove('on');
    return;
  }
  el.classList.add('on');
  if (el.querySelector('kbd').textContent !== key) el.querySelector('kbd').textContent = key;
  const t = el.querySelector('.cp-t'),
    want = icon ? 'i:' + icon : text;
  if (t.dataset.w !== want) {
    t.dataset.w = want;
    if (icon) t.innerHTML = svgIcon(icon);
    else t.textContent = text;
  }
  el.querySelector('.val').setAttribute('stroke-dashoffset', (113.1 * (1 - clamp(k || 0, 0, 1))).toFixed(1));
  el.classList.toggle('ring', k != null);
}
function capGoal(text) {
  const el = capUI().querySelector('.cp-goal');
  if (!text) {
    el.classList.remove('on');
    return;
  }
  el.textContent = text;
  el.classList.add('on');
}
function capPortrait(n) {
  if (!n) return;
  const el = capUI().querySelector('.cp-who');
  el.querySelector('img').src = getPortrait(n);
  el.classList.remove('on');
  void el.offsetWidth;
  el.classList.add('on');
  audio.hx('sting', 0, 0.4);
}
// a line said out loud down there: over the head of whoever says it
function capSayAt(a, text, secs = 3) {
  CAP.bub = { a, text, until: R.time + secs };
  const el = capUI().querySelector('.cp-bub');
  el.querySelector('span').textContent = text;
  el.classList.add('on');
}
function capBub() {
  const b = CAP.bub,
    el = capUI().querySelector('.cp-bub');
  if (!b || R.time > b.until || !b.a || b.a.hide) {
    if (b) {
      CAP.bub = null;
      el.classList.remove('on');
    }
    return;
  }
  const [x, y] = project(b.a.x, (b.a.y || 0) + 2.25, b.a.z);
  el.style.transform = 'translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px) translate(-50%,-100%)';
}
function capSkipShown(v) {
  capUI().querySelector('.cp-skip').classList.toggle('on', !!v);
}

// ── phantoms for the scenes: THEM as they are, people, and you, drawn from your own looks
function capActor(kind, x, z, o = {}) {
  const fac = kind === 'grey' ? 'aliens' : kind === 'lizard' ? 'lizards' : kind === 'dead' ? 'zombies' : null;
  const a = Object.assign(
    {
      id: 'cap' + ++HX.id,
      cap: true,
      kind,
      x,
      z,
      y: 0,
      dir: o.dir || 0,
      tdir: o.dir || 0,
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
      tell: fac ? { type: 'true', t: 9, w: 0, fac } : null,
      look: o.look || (fac ? null : hxLook()),
      poseFn: null,
      seatY: 0.47,
    },
    o,
  );
  if (fac && !o.look) a.look = null;
  a.tdir = a.dir;
  CAP.actors.push(a);
  return a;
}
function capYou(x, z, o = {}) {
  const a = capActor('you', x, z, Object.assign({ look: PLAYER.look, name: PLAYER.name }, o));
  a.fx.foil = !!G.inv.foilOn;
  return a;
}
function capKill(a) {
  const i = CAP.actors.indexOf(a);
  if (i >= 0) CAP.actors.splice(i, 1);
}
function capAnimate(a, dt) {
  a.animT += dt;
  motionPre(a, dt);
  const T = a.tell || a.look ? animTargets(a, dt) : defaultJ();
  applyGestures(a, T);
  if (a.poseFn) {
    try {
      a.poseFn(T, a, dt);
    } catch (e) {
      console.error(e);
      a.poseFn = null;
    }
  }
  snapOrBlend(a, T, dt);
  a.dir += angDiff(a.dir, a.tdir) * Math.min(1, dt * (a.turn || 7));
}
function capWalk(a, tx, tz, spd, dt) {
  const dx = tx - a.x,
    dz = tz - a.z,
    d = Math.hypot(dx, dz);
  if (d < 0.04) {
    a.moving = false;
    return true;
  }
  const st = Math.min(d, spd * dt);
  a.x += (dx / d) * st;
  a.z += (dz / d) * st;
  a.tdir = Math.atan2(dx, dz);
  a.moving = true;
  a.run = spd > 2.9;
  a.walkPh += st * (a.run ? 4.6 : 3.7);
  return false;
}
const capFace = (a, x, z) => {
  a.tdir = Math.atan2(x - a.x, z - a.z);
};
const capLook = (fac) => (fac === 'aliens' ? 'grey' : fac === 'lizards' ? 'lizard' : 'dead');
// where a grey's eyes and fingers are this frame: the same chain of joints drawCreature walks
const xfp = (m, x, y, z) => [
  m[0] * x + m[4] * y + m[8] * z + m[12],
  m[1] * x + m[5] * y + m[9] * z + m[13],
  m[2] * x + m[6] * y + m[10] * z + m[14],
];
function greyPts(a) {
  const Q = CREATURE_LOOK.aliens,
    J = a.J,
    sc = Q.s;
  let Rm = M4.trans(a.x, (a.y || 0) + (J.rootY + (J.float || 0)) * sc, a.z);
  Rm = M4.mul(Rm, M4.rotY(a.dir));
  if (J.pitch) Rm = M4.mul(Rm, M4.rotX(J.pitch));
  if (J.roll) Rm = M4.mul(Rm, M4.rotZ(J.roll));
  Rm = M4.mul(Rm, M4.scale(sc, sc, sc));
  const P = M4.joint(Rm, 0, 1.06, 0, 0, 0, 0),
    T = M4.joint(P, 0, 0.03, 0, J.torso, J.twist || 0, 0),
    Hd = M4.joint(T, 0, 0.83, 0.02, J.hp - 0.1, J.hy, J.hr);
  const arm = (s) => {
    const Ua = M4.joint(T, s * 0.15, 0.6, -0.01, s > 0 ? J.uaL : J.uaR, 0, s * (s > 0 ? J.aoL : J.aoR)),
      Fa = M4.joint(Ua, 0, -0.5, 0, s > 0 ? J.faL : J.faR, 0, 0);
    return [xfp(Fa, 0, -0.52, 0.01), xfp(Fa, 0, -0.86, 0.03)];
  };
  const [hl, tl] = arm(1),
    [hr, tr] = arm(-1);
  return {
    eyes: [xfp(Hd, 0.08, 0.2, 0.2), xfp(Hd, -0.08, 0.2, 0.2)],
    head: xfp(Hd, 0, 0.2, 0),
    handL: hl,
    tipL: tl,
    handR: hr,
    tipR: tr,
  };
}
// the wet shine in a grey's eyes
function greyEyes(a, k) {
  if (a.hide) return;
  const p = greyPts(a);
  for (const e of p.eyes)
    hxGlint(e[0], e[1], e[2], 0.045, [0.6, 1, 0.85], k * (0.75 + 0.25 * Math.sin(R.time * 2.3 + a.x)));
}
// a thin rod between two points, lit from inside
function capRod(a, b, w, col, emit) {
  const dx = b[0] - a[0],
    dy = b[1] - a[1],
    dz = b[2] - a[2],
    L = Math.hypot(dx, dy, dz);
  if (L < 1e-3) return;
  const M = M4.mul(
    M4.mul(M4.trans((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2), M4.rotY(Math.atan2(dx, dz))),
    M4.rotX(-Math.asin(clamp(dy / L, -1, 1))),
  );
  part(M, 0, 0, 0, w, w, L, 'box', col, emit);
}
// a victim of THEIRS, by name if there is one: [look, name]
function capVictim(how) {
  const ids = (G.victims || []).filter((id) => NPC[id] && (!how || NPC[id].gone === how));
  const n = ids.length ? NPC[pick(ids)] : null;
  return n ? { look: n.look, name: n.short, n } : { look: hxLook(), name: null, n: null };
}

// ── the camera and the screen
function capCut(x, z, zoom, yaw) {
  CAP.cam = { x, z, zoom, yaw: yaw == null ? (CAP.cam ? CAP.cam.yaw : cam.yaw) : yaw };
  cam.tx = x;
  cam.tz = z;
  cam.zoom = cam.zoomT = zoom;
  cam.yaw = cam.yawT = CAP.cam.yaw;
  cam.follow = false;
}
function capCam(x, z, zoom, yaw, k) {
  CAP.cam = { x, z, zoom: zoom == null ? CAP.cam.zoom : zoom, yaw: yaw == null ? CAP.cam.yaw : yaw };
  if (k) CAP.camK = k;
}
function capFx(o, rates) {
  Object.assign(CAP.fxT, o);
  if (o.wash) CAP.wash = o.wash;
  if (rates) Object.assign(CAP.fxR, rates);
}
function capFxNow(o) {
  Object.assign(CAP.fxT, o);
  for (const k in o) if (k in CAP.fx) CAP.fx[k] = o[k];
  if (o.wash) CAP.wash = o.wash;
}

// nothing in the town is pointed at while it plays: no outline, no prompt, no hover
function capClearFocus() {
  UI.focus = null;
  UI.focusT = 0.2;
  R.hoverMesh = null;
  R.hoverChar = null;
  R.focusMesh = null;
  R.focusChar = null;
  R.goalObj = null;
  R.goalChar = null;
  for (const c of CHARS) c.hover = false;
  if (UI.promptEl) UI.promptEl.hidden = true;
  const tip = $('#tip');
  if (tip) tip.hidden = true;
}
// ── going under: everything stops for it
function capture(how, o = {}) {
  if (CAP.on || !G || !G.started || G.over || !PLAYER.onMap || G.away || ARREST.on) return false;
  if (G.loose) {
    gameOver('taken');
    return true;
  } // Friday: there is no coming back from it
  const P = PLAYER,
    fac = G.faction;
  CAP.on = true;
  CAP.how = how;
  CAP.fac = fac;
  CAP.lair = LAIR_OF[fac];
  CAP.foe = o.foe || null;
  CAP.reason = o.reason || null;
  CAP.actors.length = 0;
  CAP.decals.length = 0;
  CAP.acts = [];
  CAP.act = null;
  CAP.esc = null;
  CAP.ffTo = 0;
  CAP.out = null;
  CAP.eye = null;
  CAP.reveal = 0;
  CAP.lit = null;
  CAP.skip = false;
  CAP.hold = 0;
  CAP.cast = null;
  CAP.folded = null;
  CAP.chip = false;
  CAP.cover = 0;
  CAP.escNotes = null;
  CAP.paused = false;
  CAP.after = null;
  CAP.holdKey = false;
  CAP.t0 = G.t;
  CAP.at = [P.x, P.z];
  CAP.wasAsleep = !!G.sleeping;
  CAP.pose = { x: P.x, z: P.z, y: P.y || 0, dir: P.dir, pose: P.pose, anim: P.anim, J: Object.assign({}, P.J) };
  CAP.saved = { yaw: cam.yawT, zoom: cam.zoomT, speed: G.speed || 1, darkSight };
  CAP.escape =
    how === 'out' ? false : o.escape != null ? !!o.escape : CAP.forceEsc != null ? CAP.forceEsc : chance(CAP_ESCAPE);
  // the world stops for it: the menu, the fight, the bolt in the air, whatever was on the street
  closeMenu();
  combatClear();
  UI.aim = null;
  BOLTS.length = 0;
  capClearFocus();
  if (HX.scene) hxEndScene();
  HX.far.length = 0;
  hardReset(P);
  G.sleeping = false;
  for (const c of CHARS) {
    if (c.isPlayer || !c.onMap || !c.trueForm) continue;
    const near = Math.hypot(c.x - P.x, c.z - P.z) < 14;
    if (c.trueForm.mode === 'attack' || c.trueForm.mode === 'raid') {
      c.trueForm.mode = 'flee';
      c.raiding = null;
      c.breakIn = false;
      flee(c);
    }
    if (near) c.capHide = true; // the scene puts its own in its place
  }
  if (G.attack && G.attack.target === 'player') G.attack = null;
  if (how !== 'out') {
    G.takenAt = G.t;
    G.taken = (G.taken || 0) + 1;
  }
  if (isWorkday() && tod() < 17 * 60) G.sickDay = true; // the day is lost, but not held against you
  document.body.classList.add('capturing');
  $('#hud').hidden = true;
  capUI().hidden = false;
  UI.scene = CAP;
  audio.init();
  // what happens: the coming, down there (or the way out), and back
  if (!o.pre) CAP.grabFrom = null;
  if (HUNT.on) huntClear();
  huntUI();
  CAP.acts =
    how === 'out'
      ? [capPreOut(), capBlackOut()]
      : [capPre(o.pre || how), ...(CAP.escape ? [capEscape()] : capDown()), capDrop()];
  capNext();
  return true;
}
function capNext() {
  const prev = CAP.act;
  if (prev && prev.end)
    try {
      prev.end();
    } catch (e) {
      console.error(e);
    }
  CAP.act = CAP.acts.shift() || null;
  if (!CAP.act) return capFinish();
  CAP.act.t = 0;
  CAP.act.done = {};
  if (CAP.act.start)
    try {
      CAP.act.start();
    } catch (e) {
      console.error(e);
    }
}
// back to the street: the HUD, the controls, the clock running
function capFinish() {
  const P = PLAYER;
  if (CAP.moved) {
    for (const [m, base] of CAP.moved) m.model = base;
    CAP.moved = null;
  }
  CAP.on = false;
  CAP.act = null;
  CAP.acts = [];
  CAP.actors.length = 0;
  CAP.decals.length = 0;
  CAP.esc = null;
  CAP.lit = null;
  CAP.eye = null;
  CAP.lair = null;
  CAP.fillK = null;
  UI.scene = null;
  for (const c of CHARS) c.capHide = false;
  for (const k in CAP.fx) {
    CAP.fx[k] = 0;
    CAP.fxT[k] = 0;
  }
  darkSight = CAP.saved ? CAP.saved.darkSight : 2.6;
  if (CAP.saved) {
    cam.yaw = cam.yawT = CAP.saved.yaw;
    cam.zoomT = CAP.saved.zoom;
    G.speed = CAP.saved.speed;
  }
  cam.follow = true;
  document.body.classList.remove('capturing');
  $('#hud').hidden = false;
  capUI().hidden = true;
  capPrompt(null);
  capGoal(null);
  capSkipShown(false);
  capTimeOff();
  capMarksOff();
  CAP.bub = null;
  capUI().querySelector('.cp-bub').classList.remove('on');
  audio.amb(null);
  lastPlayerCell = -1;
  lightT = 0;
  if (P.onMap) {
    P.path = null;
    P.moving = false;
  }
  if (CAP.after) {
    const f = CAP.after;
    CAP.after = null;
    try {
      f();
    } catch (e) {
      console.error(e);
    }
  }
}

// ── the frame: called instead of the town's own step while it plays
function capUpdate(dtReal) {
  DYN.length = 0;
  const dt = CAP.paused ? 0 : dtReal;
  // the hours run past in the dark
  if (CAP.ffTo > G.t) {
    const left = CAP.ffTo - G.t,
      spd = Math.max(30, left / Math.max(0.15, CAP.ffSecs));
    CAP.ffSecs = Math.max(0.05, CAP.ffSecs - dtReal);
    try {
      simStep(dtReal, Math.min(spd, left / Math.max(dtReal, 1e-3)));
    } catch (e) {
      console.error(e);
      CAP.ffTo = 0;
    }
    if (G.over) return;
    DYN.length = 0;
  }
  const a = CAP.act;
  if (a && dt > 0) {
    a.t += dt;
    let r;
    try {
      r = a.step(dt, a.t);
    } catch (e) {
      console.error(e);
      r = false;
    }
    if (r === false) capNext();
  }
  if (!CAP.on) return;
  for (const x of CAP.actors) capAnimate(x, dt);
  lairDoors(dt);
  if (!CAP.esc || CAP.esc.phase !== 'free') capClearFocus();
  // holding Space: the scene goes by
  const can = CAP.act && CAP.act.skip && !CAP.esc;
  if (can && CAP.act.t > 1.2) capSkipShown(true);
  else capSkipShown(false);
  if (can && CAP.holdKey) {
    CAP.hold += dtReal;
    if (CAP.hold > 0.7) {
      CAP.hold = 0;
      CAP.holdKey = false;
      CAP.act.skip();
    }
  } else CAP.hold = 0;
  // the screen eases toward what the scene wants
  for (const k in CAP.fx) CAP.fx[k] += (CAP.fxT[k] - CAP.fx[k]) * Math.min(1, dtReal * (CAP.fxR[k] || 2));
  capAudio();
}
// after the horror layer has cleared its lights for the frame: the scene's own, and the camera
function capLate(dtReal) {
  if (!CAP.on) return;
  CAP.glow.length = 0;
  const a = CAP.act;
  if (a && a.fx)
    try {
      a.fx(dtReal, a.t);
    } catch (e) {
      console.error(e);
    }
  if (CAP.esc && a && a.esc) escFx(dtReal);
  capBub();
  lairLive();
  capFill();
  if (CAP.cam) {
    const c = CAP.cam,
      k = Math.min(1, dtReal * CAP.camK);
    cam.tx += (c.x - cam.tx) * k;
    cam.tz += (c.z - cam.tz) * k;
    cam.zoomT = c.zoom;
    cam.zoom += (c.zoom - cam.zoom) * k;
    cam.yawT = c.yaw;
    cam.follow = false;
  }
  HX.letterT = CAP.fx.letter;
  HX.letter = CAP.fx.letter;
}
// a film's fill light: enough to read the faces in the dark places, never enough to light them
function capFill() {
  const lit = CAP.lit,
    free = CAP.esc && CAP.esc.phase === 'free';
  let k = CAP.fillK != null ? CAP.fillK : lit === 'ship' ? 0 : lit === 'den' ? 0.5 : lit ? 0.3 : darkNow() ? 0.3 : 0;
  if (free) k *= 0.6;
  if (k < 0.01) return;
  const col = lit === 'sewer' ? [1, 0.72, 0.45] : lit === 'den' ? [0.72, 0.76, 1] : [0.66, 0.74, 1];
  const onP = free || (CAP.act && CAP.act.name === 'drop'),
    x = onP ? PLAYER.x : cam.tx,
    z = onP ? PLAYER.z : cam.tz;
  hxLight(x, 2.3, z + 0.3, free ? 3.0 : 3.8, mul3(col, k));
}
// THEIR place's own sound: a drone in the craft, water in the drains, flies in the nest
function capAudio() {
  const lit = CAP.lit;
  audio.amb(lit, lit ? 1 - CAP.fx.fade * 0.8 : 0);
  audio.update({
    hum: false,
    outside: false,
    night: true,
    stress: 30,
    rain: 0,
    car: 0,
    dread: CAP.lit ? 0.25 : HX.dread,
  });
}

// ── into the dark and out again: a cut between shots, with the clock running on behind it
function capBlack(secs, then) {
  return {
    name: 'black',
    skip: null,
    start() {
      capFx({ fade: 1 }, { fade: 4 });
    },
    step(dt, t) {
      if (t > secs) {
        if (then) then();
        return false;
      }
    },
  };
}
// lose some hours: the screen black, the clock in the middle, the town run on to the new time
function capHours(mins, secs = 2.4, sub) {
  return {
    name: 'hours',
    skip: null,
    start() {
      capFx({ fade: 1, daze: 0 }, { fade: 5 });
      this.to = G.t + mins;
      CAP.ffTo = this.to;
      CAP.ffSecs = secs * 0.75;
      capTime(G.t, sub);
      audio.hx('whoosh', 0, 0.5);
      G.away = { kind: 'taken', until: Infinity };
      G.sleeping = false;
    },
    step(dt, t) {
      const el = capUI().querySelector('.cp-time b'),
        s = fmtTime(G.t);
      if (el.textContent !== s) el.textContent = s;
      if (t > secs && G.t >= this.to - 0.01) {
        capTimeOff();
        return false;
      }
    },
  };
}
// the camera's eye: where sight is reckoned from while you aren't standing there yourself
function capEye(x, z, reveal = 0) {
  CAP.eye = [x, z];
  CAP.reveal = reveal;
  darkSight = reveal || 2.6;
  lastPlayerCell = -1;
  lightT = 0;
}
// THEIR place, lit and forgotten: what you saw last time is gone
function capEnterLair(k) {
  CAP.lit = k;
  const L = LAIRS[k];
  for (let z = L.z0; z <= L.z1; z++)
    for (let x = L.x0; x <= L.x1; x++) {
      const i = I(x, z);
      explored[i] = 0;
      visCur[i] = 0;
      visTarget[i] = 0;
    }
  for (const d of DOORS) if (d.lair) d.open = d.hold ? 1 : 0;
  if (k === 'ship') {
    const pd = DOORS[doorAt[I(...LZ('ship', 9, 5))]];
    if (pd) {
      pd.hold = 1;
      pd.open = 1;
      if (pd.pairR) {
        pd.pairR.hold = 1;
        pd.pairR.open = 1;
      }
    }
  }
  if (!G.factionKnown) revealFaction();
  lastPlayerCell = -1;
  lightT = 0;
}
// the craft's doors open for whoever walks up to them
function lairDoors(dt) {
  if (CAP.lit !== 'ship') return;
  const who = CAP.actors
    .filter((a) => !a.hide && a.kind !== 'you')
    .concat(PLAYER.onMap && lairAt(PLAYER.x, PLAYER.z) ? [PLAYER] : []);
  for (const d of DOORS) {
    if (!d.lair) continue;
    d.want = d.hold ? 1 : 0;
    if (!d.want)
      for (const c of who) {
        const ax = Math.abs(c.x - d.x - 0.5),
          az = Math.abs(c.z - d.z - 0.5);
        if (d.horiz ? ax < 0.9 && az < 1.35 : az < 0.9 && ax < 1.35) {
          d.want = 1;
          break;
        }
      }
  }
  for (const d of DOORS) {
    if (!d.lair) continue;
    const want = d.want || (d.pairL && d.pairL.want) || (d.pairR && d.pairR.want);
    if (want && d.open < 0.05 && !d.hiss && !d.pairL) {
      d.hiss = true;
      audio.hx('door', 0, PLAYER.onMap ? clamp(1.2 - Math.hypot(PLAYER.x - d.x, PLAYER.z - d.z) / 9, 0.1, 0.8) : 0.5);
    }
    if (!want && d.open > 0.95) d.hiss = false;
    d.open = clamp(d.open + (want ? 1 : -1) * dt * 3.2, 0, 1);
  }
}
