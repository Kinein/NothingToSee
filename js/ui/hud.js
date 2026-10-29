//@ ui/hud — The corner HUD: bars, days, clock, THEIR eye, evidence
//@ Defines: PSY_PATH, PSY_GROOVES, BARS, EYE_STATES, buildHud, initTips, toggleWalls, setBar, TREND_DRIFT, barTrend, updateHud
//@ Uses:    ui/interface, sim/core, them/plan, gfx/renderer, ui/hud-images, core/util, player/needs, audio/sound, data/tuning, ui/case-board, …
//@ (header made by tools/map.js; stripped by build.py)
// the rows down the left: your body, then your job, then your head. The fill is what you have left: full is good, for all of them.
// (Psychic is the stress dial turned round: 100 − stress. Inside, the game still counts stress.)
// A pulsing mark beside a row once it's dangerous: red for health and work, the two that can end it; yellow for the rest.
const PSY_PATH =
  'M11.3 4.6C10.6 3.6 9.5 3 8.3 3 6.6 3 5.2 4.2 4.9 5.8 3.5 6.3 2.5 7.6 2.5 9.2c0 .7.2 1.3.6 1.8-.4.6-.6 1.3-.6 2 0 1.6 1 2.9 2.4 3.4.2 1.8 1.7 3.2 3.6 3.2 1.1 0 2.1-.5 2.8-1.3zM12.7 4.6c.7-1 1.8-1.6 3-1.6 1.7 0 3.1 1.2 3.4 2.8 1.4.5 2.4 1.8 2.4 3.4 0 .7-.2 1.3-.6 1.8.4.6.6 1.3.6 2 0 1.6-1 2.9-2.4 3.4-.2 1.8-1.7 3.2-3.6 3.2-1.1 0-2.1-.5-2.8-1.3z';
const PSY_GROOVES =
  'M4.6 9.3c1.3-.3 2.4.3 2.8 1.4M7.6 6.2c.5 1 .3 2-.5 2.7M5.2 15.9c.5-1.2 1.6-1.9 2.9-1.8M9.4 12.3c-.6.9-.6 1.9.1 2.7M19.4 9.3c-1.3-.3-2.4.3-2.8 1.4M16.4 6.2c-.5 1-.3 2 .5 2.7M18.8 15.9c-.5-1.2-1.6-1.9-2.9-1.8M14.6 12.3c.6.9.6 1.9-.1 2.7';
const psySvg = (cls) =>
  '<svg class="ic ' +
  cls +
  '" viewBox="0 0 24 24" aria-hidden="true"><path d="' +
  PSY_PATH +
  '"/><path class="grv" d="' +
  PSY_GROOVES +
  '"/></svg>';
const BARS = [
  { k: 'health', cls: 'hp', tip: 'Health', img: 'health', red: true, warn: () => G.health < 35 },
  { k: 'hunger', cls: 'hunger', tip: 'Hunger', img: 'hunger', warn: () => PLAYER.needs.hunger < 22 },
  {
    k: 'energy',
    cls: 'energy',
    tip: 'Energy',
    svg: 'M13.6 2 4.8 13.4h6.4L9.9 22l9.3-11.6h-6.5z',
    warn: () => PLAYER.needs.energy < 20,
  },
  { k: 'bladder', cls: 'bladder', tip: 'Bladder', img: 'toilet', warn: () => PLAYER.needs.bladder < 22 || G.smelly },
  { k: 'work', cls: 'work', tip: 'Work', img: 'work', red: true, warn: () => G.workBar < WORK.low && isWorkday() },
  { k: 'stress', cls: 'psy', tip: 'Psychic', psy: true, warn: () => psychic() < PSY.mute },
];
// THEIR eye: how much THEY know about you, in four steps
// THEIR eye: nothing aimed at you · watching you · framing people, tearing your cards · coming for you every night
const EYE_STATES = [
  [10, 'THEY DON’T KNOW YOU'],
  [40, 'THEY NOTICE YOU'],
  [70, 'THEY KNOW YOU'],
  [Infinity, 'THEY HUNT YOU'],
];
const eyeState = (a = G.aware) => (G.huntNights > 0 || theirDay() >= 5 ? 3 : EYE_STATES.findIndex(([lim]) => a < lim));
const eyeLine = () => (theirDay() >= 5 && G.started ? 'THEY COME' : EYE_STATES[eyeState()][1]);
function buildHud() {
  const rs = document.documentElement.style;
  rs.setProperty('--ex-red', 'url("' + HUD_IMG.exRed + '")');
  rs.setProperty('--ex-yel', 'url("' + HUD_IMG.exYel + '")');
  $('#bars').innerHTML = BARS.map(
    (b) =>
      '<button class="bar ' +
      b.cls +
      '" data-k="' +
      b.k +
      '" data-tip="' +
      b.tip +
      '" aria-label="' +
      b.tip +
      '"><span class="bi">' +
      (b.img
        ? '<img alt="" src="' + HUD_IMG[b.img] + '">'
        : b.psy
          ? psySvg('')
          : '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="' + b.svg + '"/></svg>') +
      '</span><span class="bt"><b></b>' +
      '</span><span class="tr"><i></i><i></i><i></i></span><i class="wx ' +
      (b.red ? 'red' : 'yel') +
      '"></i></button>',
  ).join('');
  $('#bars').onclick = (e) => {
    const b = e.target.closest('.bar');
    if (!b || !G || !G.started || G.over || ARREST.on || G.away) return;
    if (b.dataset.k === 'work') {
      if (isWorkday() && !G.sickDay) enqueue(PLAYER, deskWork(false));
    } else doNeed(b.dataset.k);
    audio.blip('click');
  };
  UI.bars = {};
  for (const el of $('#bars').children)
    UI.bars[el.dataset.k] = {
      el,
      fill: el.querySelector('b'),
      wx: el.querySelector('.wx'),
      trEl: el.querySelector('.tr'),
      v: null,
      w: null,
      tip: null,
      tr: null,
      trK: '',
    };
  $('#eye img').src = HUD_IMG.eye0;
  $('#boardBtn img').src = HUD_IMG.book;
  $('#tools').innerHTML = [
    ['walls', 'walls', 'Walls · V'],
    ['follow', 'target', 'Find me · C'],
    ['rot', 'rot', 'Rotate · Q R'],
    ['will', 'brain', 'Free will'],
    ['sound', 'sound', 'Sound'],
    ['help', 'help', 'Controls · H'],
  ]
    .map(
      ([id, ic, t]) =>
        '<button class="tool" id="t-' +
        id +
        '" data-tip="' +
        t +
        '" aria-label="' +
        t +
        '">' +
        svgIcon(ic) +
        '</button>',
    )
    .join('');
  $('#t-walls').onclick = () => toggleWalls();
  $('#t-follow').onclick = () => {
    cam.follow = true;
  };
  $('#t-rot').onclick = () => {
    cam.yawT += Math.PI / 2;
  };
  $('#t-will').onclick = () => {
    G.freeWill = !G.freeWill;
    ui.note('brain', G.freeWill ? 'Free will on' : 'Free will off', '');
  };
  $('#t-sound').onclick = () => {
    UI.sound = !UI.sound;
    audio.setOn(UI.sound);
    $('#t-sound').innerHTML = svgIcon(UI.sound ? 'sound' : 'mute');
  };
  $('#t-help').onclick = () => toggleHelp();
  $('#inv').onclick = (e) => {
    const b = e.target.closest('[data-i]');
    if (!b) return;
    const it = ITEMS_INV.find((x) => x.k === b.dataset.i);
    if (it) {
      it.use();
      audio.blip('click');
    }
  };
  $('#portrait').onclick = () => {
    cam.follow = true;
  };
  $('#boardBtn').onclick = () => openBoard();
  initTips();
}
function initTips() {
  const tip = $('#tip');
  document.addEventListener('pointerover', (e) => {
    const t = e.target.closest && e.target.closest('[data-tip]');
    if (!t || e.pointerType === 'touch') return;
    tip.textContent = t.dataset.tip;
    tip.hidden = false;
    tip.classList.add('ui');
    const r = t.getBoundingClientRect();
    const w = tip.offsetWidth,
      below = r.top < 60; // the corner HUD sits at the top: its tips hang below it
    tip.style.transform =
      'translate(' +
      clamp(r.left + r.width / 2 - w / 2, 8, window.innerWidth - w - 8) +
      'px,' +
      (below ? r.bottom + 8 : Math.max(8, r.top - 34)) +
      'px)';
  });
  document.addEventListener(
    'pointerdown',
    () => {
      tip.hidden = true;
      tip.classList.remove('ui');
    },
    true,
  );
  document.addEventListener('pointerout', (e) => {
    const t = e.target.closest && e.target.closest('[data-tip]');
    if (t) {
      tip.hidden = true;
      tip.classList.remove('ui');
    }
  });
}
function toggleWalls() {
  cam.wallsDown = cam.wallsDown ? 0 : 1;
  $('#t-walls').classList.toggle('on', !!cam.wallsDown);
}
function setBar(k, v, tip) {
  const B = UI.bars[k],
    d = BARS.find((b) => b.k === k);
  const pct = clamp(v, 0, 100).toFixed(1) + '%';
  if (B.v !== pct) {
    B.v = pct;
    B.fill.style.setProperty('--v', pct);
  }
  const w = !!d.warn();
  if (B.w !== w) {
    B.w = w;
    B.wx.classList.toggle('on', w);
  }
  if (tip && B.tip !== tip) {
    B.tip = tip;
    B.el.dataset.tip = tip;
  }
  barTrend(k, clamp(v, 0, 100));
}
// The arrows beside a bar. Something that just happened to you (a scare, a meal, a blow, the bonus for sitting down at
// your desk) jolts it: arrows for a moment, more of them the bigger it was. A steady climb or slide that's clearly faster
// than the day's own drift (eating, sleeping, the job draining while you're away from your desk) shows one or two for as
// long as it keeps up. Up is good and down is bad, on every bar. Measured in game time, so fast-forward doesn't fake it.
const TREND_DRIFT = { health: 0, hunger: -5.6, energy: -4, bladder: -10, stress: 1, work: 0 }; // points per game hour, left alone
function barTrend(k, v) {
  const B = UI.bars[k];
  if (!B || !B.trEl) return;
  const now = R.time,
    gt = G.t,
    drift = TREND_DRIFT[k] || 0;
  let T = B.tr;
  if (!T || gt < T.gt || gt - T.gt > 90) T = B.tr = { v, gt, ev: 0, evAt: -99, hist: [] };
  const dg = gt - T.gt,
    jump = v - T.v - (drift * dg) / 60;
  if (Math.abs(jump) >= 1.6 && dg < 4) {
    // a jolt: one thing, all at once
    if (now - T.evAt > 1.6 || Math.sign(jump) !== Math.sign(T.ev)) T.ev = 0;
    T.ev += jump;
    T.evAt = now;
  }
  T.v = v;
  T.gt = gt;
  T.hist.push([now, gt, v]);
  while (T.hist.length > 2 && now - T.hist[0][0] > 1.6) T.hist.shift();
  let dir = 0,
    n = 0,
    jolt = false;
  if (now - T.evAt < 2.4 && Math.abs(T.ev) >= 1.6) {
    const a = Math.abs(T.ev);
    dir = Math.sign(T.ev);
    n = a >= 22 ? 3 : a >= 8 ? 2 : 1;
    jolt = true;
  } else {
    const [, g0, v0] = T.hist[0],
      span = gt - g0;
    if (span >= 0.3) {
      const r = ((v - v0) / span) * 60 - drift,
        a = Math.abs(r); // how much faster than its own drift, per game hour
      const atEdge = (r > 0 && v >= 99.5) || (r < 0 && v <= 0.5);
      if (a >= 4 && !atEdge) {
        dir = Math.sign(r);
        n = a >= 160 ? 3 : a >= 45 ? 2 : 1;
      }
    }
  }
  const key = dir ? (dir > 0 ? 'up' : 'dn') + n + (jolt ? 'j' + Math.round(T.evAt * 10) : '') : '';
  if (B.trK === key) return;
  const was = B.trK;
  B.trK = key;
  B.trEl.className = dir
    ? 'tr ' + (dir > 0 ? 'up' : 'dn') + ' n' + n + (jolt && !was.startsWith(key.slice(0, 3) + 'j') ? ' jolt' : '')
    : 'tr';
}
function updateHud(dtReal) {
  UI.heatPulse = Math.max(0, UI.heatPulse - dtReal);
  UI.hudT -= dtReal;
  if (UI.hudT > 0) return;
  UI.hudT = 0.12;
  const N = PLAYER.needs;
  UI.hudL = $('#hudL').getBoundingClientRect();
  UI.hudR = $('#topr').getBoundingClientRect();
  // the clock, the date, and THEIR five days
  const ck = fmtTime(G.t),
    clk = $('#clock');
  if (clk.textContent !== ck) clk.textContent = ck;
  const ph = phaseNow(),
    late = ph > WEEK,
    di = clamp(ph, 1, WEEK) - 1,
    wk = $('#week'),
    wkey = ph + ':' + dayNo();
  if (wk.dataset.k !== wkey) {
    wk.dataset.k = wkey;
    [...wk.querySelector('.segs').children].forEach(
      (e, i) => (e.className = (late || i < di ? 'past' : i === di ? 'now' : '') + (i === WEEK - 1 ? ' end' : '')),
    );
    wk.classList.toggle('endday', !late && di === WEEK - 1);
    wk.style.setProperty('--x', ((di + 0.5) * (100 / WEEK)).toFixed(2) + '%');
    wk.style.setProperty('--k', (di / (WEEK - 1)).toFixed(3));
    wk.querySelector('.dname').textContent = DOW_LONG[dow()];
    wk.classList.toggle('late', late);
    const cd = calDate();
    $('#date-d').textContent = MONTHS[cd.getUTCMonth()] + ' ' + cd.getUTCDate();
    $('#date-y').textContent = cd.getUTCFullYear();
  }
  UI.planBump = Math.max(0, (UI.planBump || 0) - 0.12);
  wk.classList.toggle('bump', UI.planBump > 0);
  const ngt = nextGatherT(),
    left = 1440 - tod();
  wk.dataset.tip = late
    ? 'THEIR plan · it’s done'
    : 'THEIR plan · day ' +
      (di + 1) +
      ' of ' +
      WEEK +
      (G.factionKnown ? ' · ' + phaseName(di + 1) : '') +
      ' · ' +
      (di + 1 === WEEK ? 'it ends in ' : 'next step in ') +
      fmtDur(left) +
      (ngt ? ' · THEY meet 1:30' : '');
  // you
  $('#portrait').dataset.tip = PLAYER.name + ' · ' + moodWord();
  const pk = G.inv.foilOn ? 'foil' : 'plain';
  if (UI.portraitKey !== pk) {
    UI.portraitKey = pk;
    $('#portrait img').src = getPortrait(PLAYER);
  }
  setBar('health', G.health, 'Health ' + Math.round(G.health) + (G.health < 100 ? ' · sleep heals' : ''));
  setBar('hunger', N.hunger, 'Hunger');
  setBar('energy', N.energy, 'Energy');
  setBar('bladder', N.bladder, 'Bladder' + (G.smelly ? ' · you smell: shower' : ''));
  setBar(
    'stress',
    100 - N.stress,
    'Psychic ' +
      Math.round(100 - N.stress) +
      ' · ' +
      [
        'steady',
        'uneasy · you see things',
        'shaken · your hands shake: no photos',
        'breaking · no gossip, no confronting',
        'panic',
      ][stressBand(N.stress)],
  );
  // work: it only moves in the shift, and it's the job itself
  const m = tod(),
    atDesk = playerAtDesk();
  const wtip = !isWorkday()
    ? 'No work today'
    : G.sickDay
      ? 'Day off'
      : m < 540
        ? 'Shift at 9:00'
        : m >= 1020
          ? 'Shift over'
          : atDesk
            ? 'Working'
            : 'Away · it drains';
  setBar('work', G.workBar, 'Work ' + Math.round(G.workBar) + ' · ' + wtip + ' · empty, and you’re let go');
  UI.bars.work.el.classList.toggle('idle', !inShift());
  // what you carry: the inventory isn't on screen yet, but it's kept up to date for when it is
  const inv = ITEMS_INV.filter((x) => x.has());
  const html = inv
    .map(
      (x) =>
        '<button class="chip' +
        (x.on && x.on() ? ' on' : '') +
        '" data-i="' +
        x.k +
        '" data-tip="' +
        x.label +
        '">' +
        svgIcon(x.icon) +
        (x.count ? '<em>' + x.count() + '</em>' : '') +
        '</button>',
    )
    .join('');
  const invEl = $('#inv');
  if (invEl.dataset.h !== html) {
    invEl.innerHTML = html;
    invEl.dataset.h = html;
  }
  $('#t-will').classList.toggle('on', !!G.freeWill);
  // THEIR eye
  const es = eyeState(),
    eye = $('#eye');
  if (UI.eyeS !== es) {
    const turned = UI.eyeS != null;
    UI.eyeS = es;
    eye.querySelector('img').src = HUD_IMG['eye' + es];
    eye.className = 's' + es;
    const tx = $('#eyeTx');
    tx.className = 's' + es;
    if (turned) {
      eye.classList.add('turn');
      setTimeout(() => eye.classList.remove('turn'), 750);
      void tx.offsetWidth;
      tx.classList.add('turn');
    }
  }
  {
    const tx = $('#eyeTx'),
      line = eyeLine();
    if (tx.textContent !== line) tx.textContent = line;
  }
  eye.classList.toggle('pulse', UI.heatPulse > 0);
  // the evidence: one mark for each of THEM, filled in as you catch THEM. Nothing here says a case is enough.
  const slots = $('#boardBtn .slots').children;
  const unm = them().filter((n) => n.exposed && !n.slain).length,
    dead = G.slain.length;
  for (let i = 0; i < 3; i++) slots[i].className = i < dead ? 'done' : i < dead + unm ? 'unm' : '';
  $('#boardBtn').dataset.tip =
    'Evidence · Tab' + (dead ? ' · ' + dead + ' caught' : '') + (unm ? ' · ' + unm + ' unmasked, still out there' : '');
  document.body.classList.toggle('jumpy', N.stress >= 60);
  document.body.classList.toggle('breaking', N.stress >= 80);
  const zz = $('#zz');
  zz.hidden = (!G.sleeping && !G.away) || !!(G.away && G.away.kind === 'held'); // held: the cell says it
  if (!zz.hidden) {
    const w = G.away
      ? G.away.kind === 'held'
        ? 'Held'
        : G.away.kind === 'taken'
          ? '…'
          : G.away.kind === 'out'
            ? 'Out cold'
            : 'Hospital'
      : 'Sleeping';
    if (zz.lastChild.textContent !== w) zz.lastChild.textContent = w;
  }
}
