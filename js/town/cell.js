//@ town/cell — Held in a cell
//@ Defines: CELL, cellEl, cellFrame, cellSky, cellDraw, ambushTick, addNote
//@ Uses:    sim/core, core/util, town/suspicion, world/grid, them/true-form, them/awareness, audio/sound, sim/actions, town/spawning, gfx/portraits, …
//@ (header made by tools/map.js; stripped by build.py)
// ───────────── the cell: the hours you're held go by in here, drawn small and blown up like the rest of the town.
// The booking photo first, the flash, then the cell: the window high up going from day to dusk to night, the patch of
// light it throws sliding across the floor, the clock behind its cage spinning, the tube light buzzing, you on the bench.
const CELL = {
  el: null,
  ctx: null,
  w: 0,
  h: 112,
  t: 0,
  on: false,
  show: 0,
  flick: 1,
  flickT: 2,
  face: null,
  faceImg: null,
  motes: null,
  clang: false,
  shut: false,
};
const rgbOf = (c, k = 1) =>
  'rgb(' +
  Math.round(((c >> 16) & 255) * k) +
  ',' +
  Math.round(((c >> 8) & 255) * k) +
  ',' +
  Math.round((c & 255) * k) +
  ')';
function cellEl() {
  if (CELL.el) return CELL.el;
  const c = document.createElement('canvas');
  c.id = 'cell';
  c.setAttribute('aria-hidden', 'true');
  c.hidden = true;
  document.body.appendChild(c);
  CELL.el = c;
  CELL.ctx = c.getContext('2d');
  return c;
}
function cellFrame(dt) {
  const want = !!(G && G.started && !G.over && G.away && G.away.kind === 'held');
  if (want && !CELL.on) {
    const el = cellEl();
    CELL.on = true;
    CELL.t = 0;
    CELL.clang = false;
    CELL.shut = false;
    el.hidden = false;
    void el.offsetWidth;
    el.classList.add('on');
    const src = getPortrait(PLAYER);
    if (src && CELL.face !== src) {
      CELL.face = src;
      const im = new Image();
      im.src = src;
      CELL.faceImg = im;
    }
  }
  if (!want && CELL.on) {
    CELL.on = false;
    if (CELL.el) CELL.el.classList.remove('on');
  }
  if (!CELL.el) return;
  CELL.show = CELL.on ? 1 : CELL.show - dt / 1.1;
  if (CELL.show <= 0) {
    CELL.el.hidden = true;
    return;
  }
  CELL.t += dt;
  const el = CELL.el,
    h = CELL.h,
    w = Math.max(150, Math.round(h * (window.innerWidth / Math.max(1, window.innerHeight))));
  if (el.width !== w || el.height !== h) {
    el.width = w;
    el.height = h;
    CELL.motes = null;
  }
  CELL.w = w;
  try {
    cellDraw(CELL.ctx, w, h, CELL.t);
  } catch (e) {
    console.error(e);
  }
}
// the light outside the window, by the hour: blue night, a warm low sun, flat grey day
function cellSky() {
  const hh = hourF(),
    k = (a, b, x) => clamp((x - a) / (b - a), 0, 1);
  const day = Math.min(k(5.2, 7.2, hh), 1 - k(18.6, 20.6, hh)),
    warm = Math.max(1 - Math.abs(hh - 6.6) / 1.4, 1 - Math.abs(hh - 19.4) / 1.4, 0);
  const night = [30, 42, 74],
    noon = [178, 192, 200],
    gold = [222, 146, 92];
  let c = night.map((v, i) => lerp(v, noon[i], day));
  c = c.map((v, i) => lerp(v, gold[i], clamp(warm, 0, 1) * 0.8));
  return { c, day, warm };
}
function cellDraw(g, w, h, t) {
  const cx = Math.round(w / 2),
    floorY = 84;
  const P = PLAYER,
    L = P.look || {};
  // the tube light: steady, and every so often it stutters
  CELL.flickT -= Math.min(0.1, 1 / 60);
  if (CELL.flickT <= 0) {
    CELL.flick = CELL.flick < 1 ? 1 : chance(0.5) ? 0.35 : 0.6;
    CELL.flickT = CELL.flick < 1 ? rand(0.04, 0.16) : rand(1.2, 5);
  }
  const lit = CELL.flick,
    sky = cellSky(),
    m = (v) => Math.round(v);
  // ── the wall: painted block, the mortar a shade darker
  g.fillStyle = '#20242a';
  g.fillRect(0, 0, w, floorY);
  for (let row = 0, y = 0; y < floorY; row++, y += 7) {
    g.fillStyle = '#1a1d22';
    g.fillRect(0, y, w, 1);
    for (let x = (row % 2) * 9 - 18; x < w; x += 18) {
      const n = hash2(x, row, 3);
      g.fillStyle = n < 0.33 ? '#23272d' : n < 0.66 ? '#21252b' : '#1f2328';
      g.fillRect(x + 1, y + 1, 17, 6);
      g.fillStyle = '#1a1d22';
      g.fillRect(x, y, 1, 7);
    }
  }
  // a stain down the wall under the window, and scratched tallies by the bench
  g.fillStyle = 'rgba(12,14,16,.35)';
  g.fillRect(cx - 26, 32, 6, 30);
  g.fillRect(cx - 24, 62, 3, 14);
  g.fillStyle = 'rgba(150,150,140,.22)';
  for (let k = 0; k < 7; k++)
    g.fillRect(cx + 78 + k * 2 - (k === 4 ? 6 : 0), k === 4 ? 66 : 62, k === 4 ? 9 : 1, k === 4 ? 1 : 6);
  // ── the floor
  g.fillStyle = '#15171b';
  g.fillRect(0, floorY, w, h - floorY);
  g.fillStyle = '#2b3036';
  g.fillRect(0, floorY, w, 1);
  g.fillStyle = '#191b1f';
  for (let y = floorY + 6, s = 6; y < h; s += 3, y += s) g.fillRect(0, y, w, 1);
  // ── the window, high up, barred: the day going by outside
  const wx = cx - 34,
    wy = 14,
    ww = 22,
    wh = 16,
    [sr, sg, sb] = sky.c;
  g.fillStyle = '#101216';
  g.fillRect(wx - 2, wy - 2, ww + 4, wh + 4);
  g.fillStyle = 'rgb(' + m(sr) + ',' + m(sg) + ',' + m(sb) + ')';
  g.fillRect(wx, wy, ww, wh);
  if (sky.day < 0.3) {
    g.fillStyle = 'rgba(230,236,255,' + (0.8 * (1 - sky.day / 0.3)).toFixed(2) + ')';
    g.fillRect(wx + 15, wy + 4, 3, 3);
  } // the moon
  g.fillStyle = '#0b0c0f';
  for (let k = 1; k < 4; k++) g.fillRect(wx + Math.round((ww * k) / 4) - 1, wy, 2, wh);
  g.fillRect(wx, wy + 7, ww, 1);
  // the patch it throws, sliding across the floor as the sun goes over; the bars across it in shadow
  const sun = clamp((hourF() - 6) / 14, 0, 1),
    shift = lerp(30, -26, sun),
    a = (0.07 + 0.18 * sky.day) * (0.75 + 0.25 * lit);
  const px0 = wx + shift,
    py0 = floorY + 4,
    pw = 30,
    ph = 18,
    skew = lerp(-14, 14, sun);
  g.save();
  g.globalCompositeOperation = 'lighter';
  g.fillStyle = 'rgba(' + m(sr) + ',' + m(sg) + ',' + m(sb) + ',' + (a * 0.28).toFixed(3) + ')';
  g.beginPath();
  g.moveTo(wx, wy + wh);
  g.lineTo(wx + ww, wy + wh);
  g.lineTo(px0 + pw + skew, py0 + ph);
  g.lineTo(px0 + skew, py0 + ph);
  g.closePath();
  g.fill();
  g.fillStyle = 'rgba(' + m(sr) + ',' + m(sg) + ',' + m(sb) + ',' + a.toFixed(3) + ')';
  g.beginPath();
  g.moveTo(px0, py0);
  g.lineTo(px0 + pw, py0);
  g.lineTo(px0 + pw + skew, py0 + ph);
  g.lineTo(px0 + skew, py0 + ph);
  g.closePath();
  g.fill();
  g.restore();
  g.fillStyle = 'rgba(8,9,12,.55)';
  for (let k = 1; k < 4; k++) {
    const bx = px0 + (pw * k) / 4;
    g.beginPath();
    g.moveTo(bx - 1, py0);
    g.lineTo(bx + 1, py0);
    g.lineTo(bx + 1 + skew * 1.1, py0 + ph);
    g.lineTo(bx - 2 + skew * 1.1, py0 + ph);
    g.closePath();
    g.fill();
  }
  // dust turning over in the light
  if (!CELL.motes) CELL.motes = Array.from({ length: 14 }, () => [Math.random(), Math.random(), rand(0.4, 1)]);
  g.fillStyle = 'rgba(' + m(sr) + ',' + m(sg) + ',' + m(sb) + ',' + (0.25 + 0.4 * sky.day).toFixed(2) + ')';
  for (const mo of CELL.motes) {
    const u = (mo[0] + t * 0.012 * mo[2]) % 1,
      v = (mo[1] + Math.sin(t * 0.4 + mo[2] * 9) * 0.03 + t * 0.006) % 1;
    const x = lerp(wx + ww * u, px0 + skew + pw * u, v),
      y = lerp(wy + wh, py0 + ph, v);
    g.fillRect(m(x), m(y), 1, 1);
  }
  // ── the clock, caged, high on the wall: the hours going round
  const ox = cx + 56,
    oy = 30,
    r = 8,
    tm = tod();
  g.fillStyle = '#0d0f12';
  g.beginPath();
  g.arc(ox, oy, r + 2, 0, TAU);
  g.fill();
  g.fillStyle = '#b8b2a2';
  g.beginPath();
  g.arc(ox, oy, r, 0, TAU);
  g.fill();
  g.fillStyle = '#3a3a36';
  for (let k = 0; k < 12; k++) {
    const an = (k / 12) * TAU;
    g.fillRect(m(ox + Math.sin(an) * (r - 1.5)), m(oy - Math.cos(an) * (r - 1.5)), 1, 1);
  }
  g.fillStyle = 'rgba(14,15,18,.4)';
  for (let k = -r; k <= r; k++) {
    g.fillRect(ox + k, oy - 3, 1, 1);
    g.fillRect(ox + k, oy + 3, 1, 1);
  } // the cage
  const hand = (an, len, wd, col) => {
    g.fillStyle = col;
    for (let q = 0; q <= len; q += 0.5) {
      const x = Math.round(ox + Math.sin(an) * q),
        y = Math.round(oy - Math.cos(an) * q);
      g.fillRect(x, y, wd, wd);
    }
  };
  hand(((tm % 720) / 720) * TAU, r * 0.5, 2, '#121317');
  hand(((tm % 60) / 60) * TAU, r * 0.85, 1, '#121317');
  g.fillStyle = '#7a2a22';
  g.fillRect(ox, oy, 1, 1);
  // ── the bench, and you on it: head down, mostly. Now and then you look up at the window, or the clock.
  const bx0 = cx + 10,
    bx1 = cx + 70;
  g.fillStyle = '#2a2622';
  g.fillRect(bx0, 72, bx1 - bx0, 4);
  g.fillStyle = '#3a342e';
  g.fillRect(bx0, 72, bx1 - bx0, 1);
  g.fillStyle = '#1b1916';
  g.fillRect(bx0 + 2, 76, 3, 10);
  g.fillRect(bx1 - 5, 76, 3, 10);
  const fx = cx + 32,
    br = Math.round(Math.sin(t * 1.6) * 0.5 + 0.5),
    look = Math.sin(t * 0.37) + Math.sin(t * 0.13 + 1) > 1.25 ? (Math.sin(t * 0.11) > 0 ? -1 : 1) : 0;
  const skin = rgbOf(L.skin || 0xd8b399),
    skinD = rgbOf(L.skin || 0xd8b399, 0.62),
    top = rgbOf(L.top || 0x8a6e36),
    topD = rgbOf(L.top || 0x8a6e36, 0.6),
    bot = rgbOf(L.bottom || 0x2d3340),
    hair = rgbOf(L.hairCol || 0x2a1f17);
  g.fillStyle = '#0e0f12';
  g.fillRect(fx - 4, 86, 3, 2);
  g.fillRect(fx + 2, 86, 3, 2); // shoes
  g.fillStyle = bot;
  g.fillRect(fx - 4, 76, 3, 10);
  g.fillRect(fx + 2, 76, 3, 10); // shins
  g.fillRect(fx - 4, 71, 9, 5); // thighs, on the bench
  g.fillStyle = top;
  g.fillRect(fx - 4, 60 + br, 9, 12 - br); // torso
  g.fillStyle = topD;
  g.fillRect(fx - 5, 61 + br, 2, 9);
  g.fillRect(fx + 4, 61 + br, 2, 9); // arms, down to the lap
  g.fillStyle = skin;
  g.fillRect(fx - 1, 70, 3, 2); // hands together
  g.fillStyle = '#8f9399';
  g.fillRect(fx - 1, 71, 3, 1); // the cuffs
  const hy = look ? 53 + br : 55 + br,
    hx = fx - 2 + (look < 0 ? -1 : look > 0 ? 1 : 0);
  g.fillStyle = skin;
  g.fillRect(hx, hy, 5, 6);
  g.fillStyle = hair;
  g.fillRect(hx, hy - 1, 5, look ? 2 : 3);
  if (look) {
    g.fillStyle = '#16171a';
    g.fillRect(hx + 1 + (look > 0 ? 1 : 0), hy + 2, 1, 1);
    g.fillRect(hx + 3 + (look > 0 ? 1 : 0), hy + 2, 1, 1);
  } else {
    g.fillStyle = skinD;
    g.fillRect(hx, hy + 4, 5, 2);
  }
  // ── the tube on the ceiling, and what it lights
  g.fillStyle = lit >= 1 ? '#e6efe9' : lit > 0.5 ? '#9aa39e' : '#3b4045';
  g.fillRect(cx - 24, 1, 48, 2);
  g.fillStyle = '#121418';
  g.fillRect(cx - 26, 0, 52, 1);
  const lg = g.createRadialGradient(cx, 0, 4, cx, 30, 120);
  lg.addColorStop(0, 'rgba(210,228,218,' + (0.16 * lit).toFixed(3) + ')');
  lg.addColorStop(1, 'rgba(210,228,218,0)');
  g.save();
  g.globalCompositeOperation = 'lighter';
  g.fillStyle = lg;
  g.fillRect(0, 0, w, h);
  g.restore();
  if (lit < 1) {
    g.fillStyle = 'rgba(0,0,0,' + ((1 - lit) * 0.35).toFixed(2) + ')';
    g.fillRect(0, 0, w, h);
  }
  // ── the bars, between you and the corridor
  const barCol = '#0a0b0e',
    hi = 'rgba(120,132,140,' + (0.35 * lit + 0.1).toFixed(2) + ')';
  for (let x = ((cx + 8) % 16) - 16; x < w; x += 16) {
    g.fillStyle = barCol;
    g.fillRect(x, 0, 3, h);
    g.fillStyle = hi;
    g.fillRect(x, 0, 1, h);
  } // spaced so you sit between two of them
  for (const y of [5, 97]) {
    g.fillStyle = barCol;
    g.fillRect(0, y, w, 4);
    g.fillStyle = hi;
    g.fillRect(0, y, w, 1);
  }
  // ── the dark round the edges
  const vg = g.createRadialGradient(cx, h * 0.55, h * 0.35, cx, h * 0.55, Math.max(w, h) * 0.75);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(0,0,0,.72)');
  g.fillStyle = vg;
  g.fillRect(0, 0, w, h);
  // ── booked: the photo against the height chart, the flash, then the door shuts on you
  const BOOK = 1.9;
  if (t < BOOK + 0.6) {
    const k = clamp((BOOK + 0.6 - t) / 0.6, 0, 1);
    g.save();
    g.globalAlpha = t < BOOK ? 1 : k;
    g.fillStyle = '#7b7e7c';
    g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(30,32,34,.55)';
    for (let y = 14; y < h; y += 8) g.fillRect(cx - 40, y, 80, 1);
    g.fillStyle = 'rgba(30,32,34,.8)';
    for (let y = 14; y < h; y += 16) (g.fillRect(cx - 44, y, 6, 1), g.fillRect(cx + 38, y, 6, 1));
    const im = CELL.faceImg;
    if (im && im.complete && im.naturalWidth) {
      const fh = 62,
        fw = Math.round((fh * im.naturalWidth) / im.naturalHeight);
      g.imageSmoothingEnabled = true;
      g.drawImage(im, cx - Math.round(fw / 2), 18, fw, fh);
    } else {
      g.fillStyle = '#2b2d30';
      g.fillRect(cx - 16, 26, 32, 50);
    }
    g.fillStyle = '#121315';
    g.fillRect(cx - 22, 80, 44, 14); // the board, held at your chest
    g.fillStyle = '#cfcabd';
    for (let k2 = 0; k2 < 6; k2++) g.fillRect(cx - 18 + k2 * 6, 84, 4, 2);
    for (let k2 = 0; k2 < 4; k2++) g.fillRect(cx - 14 + k2 * 7, 89, 5, 1);
    g.restore();
    const fl = clamp(1 - Math.abs(t - 1.15) / 0.22, 0, 1);
    if (fl > 0) {
      g.fillStyle = 'rgba(255,255,250,' + fl.toFixed(2) + ')';
      g.fillRect(0, 0, w, h);
    }
    if (t > 1.0 && !CELL.clang) {
      CELL.clang = true;
      audio.blip('shutter');
    }
  } else if (!CELL.shut) {
    CELL.shut = true;
    audio.hx('knock', 0, 0.9);
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
