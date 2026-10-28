//@ ui/arena-view — How the confrontation looks: the spotlit ring, the crowd, the speech, your cards
//@ Defines: leanBand, arenaOpen, arenaSay, arenaCrowd, arenaTimer, arenaShow, arenaBeat, arenaDraw, arenaBarDraw, arenaClose
//@ Uses:    ui/interface, play/arena, data/lines, them/proofs, gfx/portraits, game/loop, core/util, data/tuning, sim/core, town/quirks, …
//@ (header made by tools/map.js; stripped by build.py)
// ───────────── the arena on screen. A spotlit circle in the dark: you on the left, the accused on the right, the people who
// were in earshot as silhouettes in a ring behind (up to eight). The crowd is the meter: it shuffles toward whoever
// it believes. THEIR face shows the pressure (at +2 a flicker in the eyes, at +3 the skin pulls); a human's never slips.
// the crowd meter runs from you (left, +5) to the accused (right, −5), coloured by what each end of it means
function leanBand(L) {
  const B = EVIDENCE.bands;
  return L >= B.total ? 'win' : L >= B.partial ? 'good' : L >= B.pfail ? 'meh' : 'bad';
}
function arenaOpen(A) {
  const el = $('#arena');
  el.innerHTML =
    '<div class="ar-stage"><div class="ar-ring"></div><div class="ar-spot"></div><div class="ar-top">' +
    '<div class="ar-lean"><span class="ar-side">You</span><div class="ar-track">' +
    Array.from({ length: 11 }, (_, i) => '<i class="' + leanBand(5 - i) + (i === 5 ? ' mid' : '') + '"></i>').join('') +
    '<b class="ar-mark"></b></div><span class="ar-side them"></span></div><div class="ar-room"></div>' +
    '<div class="ar-beat"><b></b><span></span></div></div>' +
    '<figure class="ar-you"><img alt=""><figcaption>You</figcaption></figure>' +
    '<figure class="ar-acc"><img alt=""><i class="ar-eyes"></i><figcaption></figcaption></figure>' +
    '<div class="ar-say them"><span class="ar-fi"></span><p></p><i class="ar-t"><i></i></i></div>' +
    '<div class="ar-say you"><p></p></div><div class="ar-shown" hidden></div><b class="ar-delta"></b>' +
    '<div class="ar-opts"></div><div class="ar-bar" hidden><i class="fg"></i><i class="ft"></i></div>' +
    '<div class="ar-bfuse" hidden><i></i></div><div class="ar-verdict"><b></b><span></span></div>' +
    '<div class="ar-fan"></div></div>';
  el.querySelector('.ar-you img').src = getPortrait(PLAYER);
  el.querySelector('.ar-acc img').src = A.n.trueForm ? snapImage(A.n, fightSnapRec(A.n)) : getPortrait(A.n); // held in your trap: no face to hide behind
  el.querySelector('.ar-side.them').textContent = A.n.short;
  el.querySelector('.ar-acc figcaption').textContent = A.n.short;
  // why the meter starts where it does: only what you could know (who's THEIRS, or got to, stays unsaid)
  const room = el.querySelector('.ar-room'),
    said = new Set();
  for (const m of A.mods) {
    const w = m.w && (NPC[m.w] || CHARS.find((c) => c.id === m.w)),
      t = ARENA_ROOM[m.why] && ARENA_ROOM[m.why].replace('{w}', w ? w.short : 'Someone');
    if (!t || said.has(t) || said.size >= 4) continue;
    said.add(t);
    const c = document.createElement('span');
    c.className = m.v > 0 ? 'up' : 'down';
    c.textContent = (m.v > 0 ? '+' : '−') + Math.abs(m.v) + ' ' + t;
    room.appendChild(c);
  }
  const ring = el.querySelector('.ar-ring'),
    k = A.crowd.length;
  A.crowd.forEach((w, i) => {
    const f = k > 1 ? i / (k - 1) : 0.5,
      p = document.createElement('i');
    p.className = 'ar-p';
    p.dataset.id = w.id;
    p.style.setProperty('--x', (8 + f * 84).toFixed(1) + '%');
    p.style.setProperty('--y', (Math.sin(f * Math.PI) * -26).toFixed(1) + 'px');
    p.style.setProperty('--s', (0.82 + Math.sin(f * Math.PI) * 0.14).toFixed(2));
    p.innerHTML = '<img alt="">';
    p.querySelector('img').src = getPortrait(w);
    ring.appendChild(p);
  });
  // the escape bar takes a tap as well as E
  el.querySelector('.ar-stage').onpointerdown = (e) => {
    if (!UI.cf || !UI.cf.bar) return;
    e.preventDefault();
    arenaStrike();
  };
  el.hidden = false;
  el.classList.remove('out');
  arenaCrowd(A, 0);
  arenaDraw(A);
}
// a line, in a bubble over whoever says it: THEIRS (tagged with the frame it's about), yours, or someone's in the crowd
function arenaSay(A, who, text, frame) {
  const el = $('#arena');
  if (!el || el.hidden) return;
  if (who === 'them' || who === 'you') {
    const b = el.querySelector('.ar-say.' + who);
    b.querySelector('p').textContent = text;
    if (who === 'them')
      b.querySelector('.ar-fi').innerHTML = frame
        ? svgIcon(FRAME[frame].icon) + '<em>' + FRAME[frame].name + '</em>'
        : '';
    b.classList.remove('pop');
    void b.offsetWidth;
    b.classList.add('pop', 'on');
    if (who === 'them') el.querySelector('.ar-say.you').classList.remove('on');
    return;
  }
  const p = el.querySelector('.ar-p[data-id="' + who.id + '"]');
  if (!p) return arenaSay(A, 'you', text);
  const s = document.createElement('span');
  s.className = 'ar-pq';
  s.textContent = text;
  p.appendChild(s);
  p.classList.add('lit');
  setTimeout(() => {
    s.remove();
    p.classList.remove('lit');
  }, 2600);
}
// the ring shuffles toward whoever it believes; a few of them murmur, gasp or laugh; the number says by how much, and why
function arenaCrowd(A, v, why) {
  const el = $('#arena');
  if (!el) return;
  const L = A.lean,
    mark = el.querySelector('.ar-mark');
  el.querySelector('.ar-ring').style.setProperty('--lean', L);
  mark.style.setProperty('--i', 5 - L);
  mark.className = 'ar-mark ' + leanBand(L);
  const acc = el.querySelector('.ar-acc');
  acc.classList.toggle('shine', A.isThem && L >= 2);
  acc.classList.toggle('pull', A.isThem && L >= 3);
  if (!v) return;
  const d = el.querySelector('.ar-delta');
  d.textContent = (v > 0 ? '+' : '−') + Math.abs(v) + (ARENA_WHY[why] ? ' · ' + ARENA_WHY[why] : '');
  d.className = 'ar-delta ' + (v > 0 ? 'up' : 'down');
  void d.offsetWidth;
  d.classList.add('go');
  const ps = [...el.querySelectorAll('.ar-p')];
  for (let i = 0; i < Math.min(2, ps.length); i++) {
    const p = pick(ps),
      s = document.createElement('span');
    s.className = 'ar-pq small';
    s.textContent = pick(v > 0 ? ARENA_CROWD.up : v < 0 ? ARENA_CROWD.down : ARENA_CROWD.still);
    p.appendChild(s);
    setTimeout(() => s.remove(), 1500);
  }
  const st = el.querySelector('.ar-stage');
  st.classList.remove('up', 'down');
  void st.offsetWidth;
  st.classList.add(v > 0 ? 'up' : 'down');
}
function arenaTimer(A) {
  const el = $('#arena'),
    t = el && el.querySelector('.ar-t');
  if (!t) return;
  const f = A.tMax > 0 ? clamp(A.t / A.tMax, 0, 1) : 0;
  t.firstChild.style.width = (100 * f).toFixed(1) + '%';
  t.classList.toggle('low', A.tMax > 0 && f < 0.34);
}
// the card you just laid down, big, on the floor between you, for a moment
function arenaShow(A, p) {
  const el = $('#arena .ar-shown');
  if (!el) return;
  el.className = 'ar-shown ' + p.q;
  el.innerHTML =
    '<img alt=""><span class="pc-fi">' +
    svgIcon(FRAME[p.frame].icon) +
    '</span><em>' +
    FRAME[p.frame].name +
    ' · ' +
    p.q +
    '</em>';
  el.querySelector('img').src = proofImage(p);
  el.hidden = false;
  clearTimeout(UI.arShownT);
  UI.arShownT = setTimeout(() => (el.hidden = true), 1600);
}
// the banner: which part of it this is, and what you can do in it
function arenaBeat(A) {
  const T = ARENA_BEAT,
    b = A.bar ? 'escape' : A.beat;
  let x = T[b];
  if (b === 'stmt' && !A.hand.length) x = T.stmtEmpty;
  else if (b === 'rebut' && !(A.hand.length || habitFits(A) || A.wits.length)) x = T.rebutNone;
  return x
    ? x.map((s) =>
        s
          .replace('{n}', A.n.short)
          .replace('{i}', A.si + 1)
          .replace('{k}', A.stmts.length),
      )
    : null;
}
// your cards along the bottom, and what you can do right now
function arenaDraw(A) {
  const el = $('#arena');
  if (!el || el.hidden) return;
  const fan = el.querySelector('.ar-fan'),
    s = A.beat === 'stmt' && A.stmts[A.si],
    fits = s && s.f; // the frame this line is about: the card that could break it sits up
  const key = A.hand.map((p) => p.id).join(',') + ':' + A.sel + ':' + A.beat + ':' + A.si;
  if (fan.dataset.k !== key) {
    fan.dataset.k = key;
    fan.innerHTML = '';
    A.hand.forEach((p, i) => {
      const c = document.createElement('button');
      c.className = 'ar-card ' + p.q + (i === A.sel ? ' sel' : '') + (fits && p.frame === fits ? ' fit' : '');
      c.style.setProperty('--r', ((i - (A.hand.length - 1) / 2) * 5).toFixed(1) + 'deg');
      c.innerHTML =
        '<img alt=""><span class="pc-fi">' +
        svgIcon(FRAME[p.frame].icon) +
        '</span><em class="ar-ct">' +
        FRAME[p.frame].name +
        ' · ' +
        p.q +
        '</em>';
      c.querySelector('img').src = proofImage(p);
      c.onclick = () => {
        A.sel = i;
        showCard(A, p);
        arenaDraw(A);
      };
      fan.appendChild(c);
    });
  }
  const opts = el.querySelector('.ar-opts'),
    o = [];
  const btn = (k, icon, label, fn) => o.push({ k, icon, label, fn });
  if (A.beat === 'stmt') {
    if (A.hand.length) btn('E', 'board', 'Show', () => showCard(A, A.hand[A.sel]));
    btn('Q', 'pause', 'Let it pass', () => arenaKey('q'));
  } else if (A.beat === 'rebut') {
    if (A.hand.length) btn('E', 'board', 'And this', () => showCard(A, A.hand[A.sel]));
    if (habitFits(A)) btn('W', 'clock', 'I watched you', () => backUp(A, 'habit'));
    if (A.wits.length) btn('S', 'people', A.wits[0].short, () => backUp(A, 'witness'));
  } else if (A.beat === 'know') {
    const c = A.claims[A.ki];
    if (c && c.chip) o.push({ chip: true, icon: QUIRKS[c.q].icon, label: 'You watched: ' + QUIRKS[c.q].short });
    btn('A', 'chat', 'True', () => callClaim(A, false));
    btn('D', 'x', 'Lie', () => callClaim(A, true));
  }
  const okey = A.beat + ':' + o.map((x) => x.label).join('|');
  if (opts.dataset.k !== okey) {
    opts.dataset.k = okey;
    opts.innerHTML = '';
    for (const x of o) {
      const b = document.createElement(x.chip ? 'span' : 'button');
      b.className = x.chip ? 'ar-chip' : 'ar-opt';
      b.innerHTML = (x.k ? '<kbd>' + x.k + '</kbd>' : '') + svgIcon(x.icon) + '<span></span>';
      b.querySelector('span').textContent = x.label;
      if (x.fn)
        b.onclick = () => {
          x.fn();
          arenaDraw(A);
        };
      opts.appendChild(b);
    }
  }
  const bt = arenaBeat(A),
    beat = el.querySelector('.ar-beat'),
    bkey = bt ? bt.join('|') : '';
  if (A.beat !== 'wait' && beat.dataset.k !== bkey) {
    // between an answer and the next line it keeps saying what it said
    beat.dataset.k = bkey;
    beat.hidden = !bt;
    if (bt) {
      beat.querySelector('b').textContent = bt[0];
      beat.querySelector('span').textContent = bt[1];
      beat.classList.remove('pop');
      void beat.offsetWidth;
      beat.classList.add('pop');
    }
  }
  const vd = el.querySelector('.ar-verdict');
  if (A.res && !vd.dataset.k) {
    const k = A.res === 'partial' && A.escaped ? 'escaped' : A.res,
      V = ARENA_VERDICT[k] || ARENA_VERDICT.fail;
    vd.dataset.k = k;
    vd.className =
      'ar-verdict on ' + (k === 'total' || k === 'partial' ? 'good' : k === 'pfail' || k === 'escaped' ? 'meh' : 'bad');
    vd.querySelector('b').textContent = V[0];
    vd.querySelector('span').textContent = V[1];
  }
  el.querySelector('.ar-bar').hidden = el.querySelector('.ar-bfuse').hidden = !A.bar;
  if (A.bar) {
    const fg = el.querySelector('.ar-bar .fg');
    fg.style.left = (A.bar.a * 100).toFixed(1) + '%';
    fg.style.width = ((A.bar.b - A.bar.a) * 100).toFixed(1) + '%';
  }
  el.classList.toggle('ending', A.beat === 'end');
  arenaTimer(A);
}
function arenaBarDraw(A) {
  const el = $('#arena'),
    bar = el && el.querySelector('.ar-bar'),
    f = A.bar;
  if (!bar || !f) return;
  const ft = bar.querySelector('.ft');
  ft.style.left = (f.pos * 100).toFixed(2) + '%';
  ft.classList.toggle('back', f.dir < 0);
  bar.classList.toggle('hit', f.res === 'hit');
  bar.classList.toggle('miss', f.res === 'miss');
  const left = clamp(1 - (f.t - FIGHT.grace) / FIGHT.timeout, 0, 1); // the fuse under it, as in a fight
  el.querySelector('.ar-bfuse i').style.transform = 'scaleX(' + left.toFixed(3) + ')';
  el.querySelector('.ar-bfuse').classList.toggle('late', left < 0.3);
}
function arenaClose() {
  const el = $('#arena');
  el.classList.add('out');
  setTimeout(() => {
    el.hidden = true;
    el.classList.remove('out');
  }, 450);
}
