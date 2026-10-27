//@ chase/hunt-end — How a hunt ends, and how it looks and sounds
//@ Defines: huntCaught, huntEscaped, huntClear, huntGoal, huntFx, huntDraw, huntDecals, huntUI
//@ Uses:    chase/hunt, sim/core, horror/layer, core/util, taken/taken, gfx/renderer, taken/coming, world/grid, audio/sound, ui/interface, …
//@ (header made by tools/map.js; stripped by build.py)
// ── caught: the dark, and what comes after it
function huntCaught(via, h) {
  if (!HUNT.on) return;
  const P = PLAYER,
    kind = HUNT.kind,
    foe = HUNT.foe;
  const from = HUNT.hs
    .filter((x) => huntLive(x) && !x.a.hide && Math.hypot(x.a.x - P.x, x.a.z - P.z) < 6)
    .map((x) => ({ kind: x.kind, x: x.a.x, z: x.a.z, dir: x.a.dir, lead: x === h }));
  if (kind === 'beaten' && foe)
    from.unshift({ kind: capLook(G.faction), x: foe.x, z: foe.z, dir: foe.dir, lead: true });
  const B = HUNT.beam,
    craft = B && !B.gone ? { x: B.cr.x, y: B.cr.y, z: B.cr.z } : null;
  CAP.grabFrom = { from, beam: via === 'beam', craft, indoor: !!roomAt(P.x, P.z) };
  huntClear();
  P.poseFn = null;
  P.pose = 'stand';
  P.y = 0;
  hardReset(P);
  if (foe && foe.trueForm && foe.trueForm.mode === 'hold') {
    foe.trueForm.mode = 'flee';
  }
  if (!capture(kind === 'beaten' ? 'beaten' : kind, { pre: 'grab', foe: foe || null, reason: null })) {
    CAP.grabFrom = null;
    G.health = Math.max(G.health, 20);
  }
}
// got away: THEY'll be back, another night. Something of THEIRS stayed behind.
function huntEscaped() {
  const kind = HUNT.kind,
    F = G.faction,
    P = PLAYER;
  if (kind === 'sleep') G.takenAt = G.t - 1440;
  if (kind === 'ground') G.groundCd = G.t + 180;
  addStress(6);
  G.aware = Math.min(100, G.aware + 4);
  const spot =
    HUNT.kind === 'sleep'
      ? [8.5 + rand(0, 1), 29.2 + rand(0, 1.4)]
      : HUNT.kind === 'ground'
        ? [HUNT.home[0] + rand(-1, 1), HUNT.home[1] + rand(-1, 1)]
        : null;
  if (spot && HUNT.lead) {
    const t = nearestWalkable(spot[0], spot[1], null, 2);
    if (t) {
      const x = t[0] + 0.5 + rand(-0.2, 0.2),
        z = t[1] + 0.5 + rand(-0.2, 0.2);
      addItem({
        kind: F === 'aliens' ? 'device' : FACTIONS[F].item,
        x,
        z,
        rot: rand(0, TAU),
        by: HUNT.lead.id,
        room: (roomAt(x, z) || {}).key || null,
        at: G.t,
      });
    }
  }
  audio.hx('breath', 0, 0.8);
  R.pulse = 0.5;
  ui.bubble(P, 'heart', 'thought', 2.2);
  huntClear();
}
function huntClear() {
  for (const a of HUNT.actors) a.hide = true;
  HUNT.actors.length = 0;
  HUNT.hs.length = 0;
  if (HUNT.beam) {
    const i = HX.crafts.indexOf(HUNT.beam.cr);
    if (i >= 0) HX.crafts.splice(i, 1);
  }
  if (PLAYER) {
    if (HUNT.grab || HUNT.down) PLAYER.poseFn = null;
    PLAYER.y = 0;
  }
  Object.assign(HUNT, {
    on: false,
    beam: null,
    grab: null,
    down: null,
    light: null,
    climb: null,
    spot: null,
    glass: null,
  });
  if (CAP.cover && !CAP.on) CAP.cover = 0;
}
// where the glow points while it's on you: out of the building, or under a roof from the light
function huntGoal() {
  if (!HUNT.on || HUNT.down || HUNT.grab) return null;
  const P = PLAYER,
    r = roomAt(P.x, P.z);
  if (HUNT.kind === 'sleep' && r && r.bld === 'apt') return { at: [12, 18], icon: 'walk', urgent: true, flee: true };
  const B = HUNT.beam;
  if (B && !B.gone && B.lock) {
    let best = null,
      bd = 1e9;
    for (const d of DOORS) {
      if (d.lair || d.locked || !walkable(d.x, d.z, P)) continue;
      if (d.shop && !shopOpen()) continue;
      const dd = Math.hypot(d.x + 0.5 - P.x, d.z + 0.5 - P.z);
      if (dd < bd) {
        bd = dd;
        best = d;
      }
    }
    if (best && bd < 22) return { at: [best.x, best.z], icon: 'home', urgent: true, flee: true };
  }
  return null;
}

// ── what it looks and sounds like
function huntFx(dtR) {
  const P = PLAYER,
    t = HUNT.t;
  // the bedroom fills with green before anything is in it
  if (HUNT.light) {
    const k = capSeg(t, 0.2, 1.8) * (1 - capSeg(t, 7, 10)) * (0.75 + 0.25 * Math.sin(R.time * 7));
    if (k > 0.01) {
      hxLight(BED_WIN[0], 1.6, BED_WIN[1] - 0.5, 6.0, mul3([0.5, 1, 0.78], 1.1 * k));
      HX.beams.push({
        x: BED_WIN[0] + 2.4,
        y: 9,
        z: BED_WIN[1] + 4.2,
        r: 1.5 + k,
        h: 10,
        col: [0.45, 1, 0.75],
        a: 0.5 * k,
        lean: -0.55,
        leanDir: 0,
      });
    }
  }
  // the window: hands on the glass, cracks, then nothing between you and it
  if (HUNT.glass) {
    const G0 = HUNT.glass;
    if (t > 0.4 && !G0.s1) {
      G0.s1 = 1;
      audio.hx('skitter', 0, 0.7);
    }
    if (t > 2.4 && !G0.c1) {
      G0.c1 = 1;
      audio.hx('crack', 0, 0.8);
    }
    if (t > 4.1 && !G0.c2) {
      G0.c2 = 1;
      audio.hx('crack', 0, 1);
      HX.shake = 0.3;
    }
    if (t > 5.5 && !G0.sh) {
      G0.sh = 1;
      audio.hx('glass', 0, 1);
      HX.jolt = 1;
      HX.shake = 0.8;
      HUNT.winOpen = true;
      R.flash = Math.max(R.flash, 0.12);
      for (let i = 0; i < 16; i++)
        hxDecal(
          BED_WIN[0] + rand(-0.6, 0.6),
          BED_WIN[1] - rand(0.1, 0.9),
          rand(0.02, 0.06),
          [0.75, 0.85, 0.9, 0.7],
          0,
          600,
        );
    }
    if (!G0.sh) {
      const k = capSeg(t, 2.4, 5.5);
      for (let i = 0; i < 5 * k; i++)
        hxGlint(
          BED_WIN[0] - 0.35 + i * 0.17,
          1.1 + Math.sin(i * 2.3) * 0.3,
          BED_WIN[1] - 0.05,
          0.05,
          [0.8, 0.88, 0.95],
          0.5 * k,
        );
    }
    hxLight(BED_WIN[0], 1.6, BED_WIN[1] + 1.0, 4.0, [0.22, 0.28, 0.45]);
  }
  for (const h of HUNT.hs) {
    const a = h.a;
    if (a.hide || h.state === 'gone') continue;
    const seen = visAt(a.x, a.z) > 0.18 || Math.hypot(a.x - P.x, a.z - P.z) < 2.5;
    // the eyes: what you see of them in the dark, before anything else
    const eyeY = (a.y || 0) + (h.kind === 'grey' ? 1.92 : h.kind === 'lizard' ? 1.62 : 1.66),
      eo = h.kind === 'grey' ? 0.24 : h.kind === 'lizard' ? 0.42 : 0.2;
    const col = h.kind === 'grey' ? [0.4, 1, 0.75] : h.kind === 'lizard' ? [1, 0.72, 0.15] : [0.85, 0.92, 0.8];
    if (seen && eyeY > 0.2)
      for (const s of [1, -1])
        hxGlint(
          a.x + Math.sin(a.dir) * eo + Math.cos(a.dir) * s * (h.kind === 'dead' ? 0.06 : 0.1),
          eyeY,
          a.z + Math.cos(a.dir) * eo - Math.sin(a.dir) * s * (h.kind === 'dead' ? 0.06 : 0.1),
          h.kind === 'dead' ? 0.07 : 0.1,
          col,
          h.see ? 1 : 0.6,
        );
    if (h.lantern && a.y > -0.5) {
      const lx = a.x + Math.sin(a.dir) * 0.45,
        lz = a.z + Math.cos(a.dir) * 0.45,
        fl = 0.9 + 0.1 * Math.sin(R.time * 17 + a.x);
      hxLight(lx, 1.3, lz, 4.2, mul3([1.1, 0.66, 0.26], fl));
      hxGlint(lx, 1.2, lz, 0.42, [1, 0.72, 0.35], 0.55 * fl);
      a.fx.prop = 'torch';
    }
    if (h.kind === 'grey') hxLight(a.x, 1.9, a.z, 2.2, mul3([0.3, 0.9, 0.6], 0.6 + 0.4 * (1 - (a.ghost || 0))));
    if (h.kind === 'dead' && h.state === 'wait' && a.y > -0.2 && HUNT.glass)
      hxLight(a.x, 1.6, a.z - 0.6, 1.6, [0.14, 0.16, 0.2]);
  }
  // the light from above: the ring on the ground is where not to be
  const B = HUNT.beam;
  if (B && !B.gone) {
    const cr = B.cr;
    if (cr.glow > 0.05) hxLight(cr.x, cr.y - 0.8, cr.z, 4, mul3([0.3, 1, 0.65], 0.6 * cr.glow));
    const on =
      B.t > B.delay && !B.leaving
        ? capSeg(B.t, B.delay, B.delay + 0.5)
        : B.leaving
          ? Math.max(0, 1 - (cr.y - B.yTo) / 6)
          : 0;
    if (on > 0.01) {
      const dx = B.x - cr.x,
        dz = B.z - cr.z,
        len = Math.hypot(dx, cr.y, dz);
      HX.beams.push({
        x: cr.x,
        y: cr.y - 0.3,
        z: cr.z,
        r: 1.3,
        h: len,
        col: [0.55, 1, 0.8],
        a: (0.5 + 0.35 * (B.held > 0 ? 1 : 0)) * on,
        lean: Math.atan2(Math.hypot(dx, dz), cr.y),
        leanDir: Math.atan2(dx, dz) + Math.PI,
      });
      hxLight(B.x, 0.9, B.z, 3.6, mul3([0.45, 1, 0.75], 1.5 * on));
      for (let i = 0; i < 10; i++) {
        const ph = (R.time * 0.35 + i / 10) % 1,
          a = i * 2.4 + R.time * 0.5;
        hxGlint(
          B.x + Math.sin(a) * 1.1 * (1 - ph * 0.4),
          ph * 3,
          B.z + Math.cos(a) * 1.1 * (1 - ph * 0.4),
          0.1,
          [0.6, 1, 0.85],
          on * (1 - ph) * 0.6,
        );
      }
    }
  }
  if (HUNT.down) {
    const f = HUNT.down.foe;
    if (f && f.onMap)
      for (const s of [1, -1])
        hxGlint(
          f.x + Math.sin(f.dir) * 0.3 + Math.cos(f.dir) * s * 0.09,
          1.7,
          f.z + Math.cos(f.dir) * 0.3 - Math.sin(f.dir) * s * 0.09,
          0.1,
          FACTIONS[G.faction].eye,
          0.9,
        );
  }
  HUNT.spot = huntWinNear() ? 'win' : null;
}
function huntDraw() {
  for (const a of HUNT.actors) {
    if (a.hide) continue;
    gl.uniform1f(U.uVisMin, a.ghost || 0);
    drawChar(a);
  }
  gl.uniform1f(U.uVisMin, 0);
}
function huntDecals() {
  for (const a of HUNT.actors) if (!a.hide && (a.y || 0) > -0.5) drawDecal(a.x, a.z, 0.44, [0, 0, 0, 0.5], 0, 0.013);
  const R0 = HUNT.ring;
  if (R0 && R0.k > 0.01) {
    // THEIR ground, marked out on the ground itself
    drawDecal(R0.x, R0.z, R0.r, [R0.col[0], R0.col[1], R0.col[2], 0.35 * R0.k], 3, 0.015);
    drawDecal(R0.x, R0.z, R0.core * 1.25, [R0.col[0], R0.col[1], R0.col[2], 0.55 * R0.k * R0.deep], 1, 0.016);
  }
}
// the marks over THEIR heads (seen you: "!"; looking: "?"), the key to press, and the run key at the start
function huntUI() {
  let el = $('#hunt');
  if (!el) {
    el = document.createElement('div');
    el.id = 'hunt';
    el.innerHTML =
      '<div class="cp-marks"></div><div class="hk"><svg class="hk-ring" viewBox="0 0 44 44"><circle class="trk" cx="22" cy="22" r="18"/><circle class="val" cx="22" cy="22" r="18" stroke-dasharray="113.1" stroke-dashoffset="113.1"/></svg><kbd>E</kbd><i></i></div><div class="hrun"><kbd>Shift</kbd><i></i></div>';
    document.body.appendChild(el);
    const hk = el.querySelector('.hk');
    hk.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      huntKey();
    });
    el.querySelector('.hrun i').innerHTML = svgIcon('walk');
  }
  const on = (HUNT.on || !!FRI.hold) && !CAP.on;
  el.hidden = !on;
  if (!on) return;
  const P = PLAYER,
    box = el.querySelector('.cp-marks'),
    items = [];
  for (const h of HUNT.hs) {
    const a = h.a;
    if (a.hide || !huntLive(h) || visAt(a.x, a.z) < 0.25) continue;
    if (h.see) items.push({ x: a.x, y: (a.y || 0) + 2.35, z: a.z, k: 1, hot: true });
    else if (h.last && (h.spotted || h.lost > 0))
      items.push({ x: a.x, y: (a.y || 0) + 2.35, z: a.z, k: clamp(1 - h.lost / HUNT_LOSE[h.kind], 0, 1), hot: false });
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
    m.classList.toggle('hot', it.hot);
    m.querySelector('i').textContent = it.hot ? '!' : '?';
  });
  // the key: a ring that fills as you fight it off or drag yourself up; the window to climb out of
  const hk = el.querySelector('.hk'),
    q = HUNT.grab || HUNT.down || FRI.hold;
  const show = !!q || HUNT.spot === 'win';
  hk.classList.toggle('on', show);
  hk.classList.toggle('ring', !!q);
  hk.classList.toggle('hot', !!q);
  if (show) {
    const [x, y] = project(P.x, q && HUNT.down ? 1.2 : 2.5, P.z);
    hk.style.transform =
      'translate(' +
      (x - 22).toFixed(1) +
      'px,' +
      (y - 22).toFixed(1) +
      'px)' +
      (q && q.shake > 0.5 ? ' scale(1.12)' : '');
    hk.querySelector('.val').setAttribute('stroke-dashoffset', (113.1 * (1 - (q ? q.k : 0))).toFixed(1));
    const ic = q ? 'fist' : 'window';
    if (hk.dataset.ic !== ic) {
      hk.dataset.ic = ic;
      hk.querySelector('i').innerHTML = svgIcon(ic);
    }
  }
  const hr = el.querySelector('.hrun');
  hr.classList.toggle(
    'on',
    HUNT.runHint > 0.05 &&
      !HUNT.down &&
      !HUNT.grab &&
      HUNT.t > 1 &&
      HUNT.hs.some((h) => huntLive(h) && h.see) &&
      !isTouch(),
  );
}
