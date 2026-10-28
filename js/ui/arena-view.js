//@ ui/arena-view — How the confrontation looks: the spotlit ring, the crowd, the speech, your cards
//@ Defines: arenaOpen, arenaSay, arenaCrowd, arenaTimer, arenaShow, arenaDraw, arenaBarDraw, arenaClose
//@ Uses:    ui/interface, play/arena, them/proofs, gfx/portraits, game/loop, core/util, data/lines, town/quirks, sim/core, combat/timing-bar
//@ (header made by tools/map.js; stripped by build.py)
// ───────────── the arena on screen. A spotlit circle in the dark: you on the left, the accused on the right, the people who
// were in earshot as silhouettes in a ring behind (up to eight). The crowd is the meter: it shuffles toward whoever
// it believes. THEIR face shows the pressure (at +2 a flicker in the eyes, at +3 the skin pulls); a human's never slips.
function arenaOpen(A) {
  const el = $('#arena');
  el.innerHTML =
    '<div class="ar-stage"><div class="ar-lean"><span>THEM</span><div class="ar-track">' +
    Array.from({ length: 11 }, (_, i) => '<i class="' + (i === 5 ? 'mid' : '') + '"></i>').join('') +
    '<b class="ar-mark"></b></div><span>YOU</span></div><div class="ar-ring"></div><div class="ar-spot"></div>' +
    '<figure class="ar-you"><img alt=""></figure><figure class="ar-acc"><img alt=""><i class="ar-eyes"></i></figure>' +
    '<div class="ar-say them"><span class="ar-fi"></span><p></p><i class="ar-t"><i></i></i></div>' +
    '<div class="ar-say you"><p></p></div><div class="ar-shown" hidden></div><div class="ar-opts"></div>' +
    '<div class="ar-bar" hidden><i class="fg"></i><i class="ft"></i></div><div class="ar-fan"></div></div>';
  el.querySelector('.ar-you img').src = getPortrait(PLAYER);
  el.querySelector('.ar-acc img').src = A.n.trueForm ? snapImage(A.n, fightSnapRec(A.n)) : getPortrait(A.n); // held in your trap: no face to hide behind
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
  el.hidden = false;
  el.classList.remove('out');
  arenaCrowd(A, 0);
  arenaDraw(A);
}
// a line, in a bubble: THEIRS (with the frame it's about), yours, or someone's in the crowd
function arenaSay(A, who, text, frame) {
  const el = $('#arena');
  if (!el || el.hidden) return;
  if (who === 'them' || who === 'you') {
    const b = el.querySelector('.ar-say.' + who);
    b.querySelector('p').textContent = text;
    if (who === 'them') b.querySelector('.ar-fi').innerHTML = frame ? svgIcon(FRAME[frame].icon) : '';
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
// the ring shuffles toward whoever it believes; a few of them murmur, gasp or laugh
function arenaCrowd(A, v) {
  const el = $('#arena');
  if (!el) return;
  const L = A.lean;
  el.querySelector('.ar-ring').style.setProperty('--lean', L);
  el.querySelector('.ar-mark').style.left = ((L + 5) * 10).toFixed(1) + '%';
  const acc = el.querySelector('.ar-acc');
  acc.classList.toggle('shine', A.isThem && L >= 2);
  acc.classList.toggle('pull', A.isThem && L >= 3);
  if (!v) return;
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
    t = el && el.querySelector('.ar-t i');
  if (t) t.style.width = (A.tMax > 0 ? (100 * clamp(A.t / A.tMax, 0, 1)).toFixed(1) : 0) + '%';
}
// the card you just laid down, big, for a moment
function arenaShow(A, p) {
  const el = $('#arena .ar-shown');
  if (!el) return;
  el.className = 'ar-shown ' + p.q;
  el.innerHTML = '<img alt=""><span class="pc-fi">' + svgIcon(FRAME[p.frame].icon) + '</span>';
  el.querySelector('img').src = proofImage(p);
  el.hidden = false;
  clearTimeout(UI.arShownT);
  UI.arShownT = setTimeout(() => (el.hidden = true), 1600);
}
// your cards along the bottom, and what you can do right now
function arenaDraw(A) {
  const el = $('#arena');
  if (!el || el.hidden) return;
  const fan = el.querySelector('.ar-fan');
  const key = A.hand.map((p) => p.id).join(',') + ':' + A.sel + ':' + A.beat;
  if (fan.dataset.k !== key) {
    fan.dataset.k = key;
    fan.innerHTML = '';
    A.hand.forEach((p, i) => {
      const c = document.createElement('button');
      c.className = 'ar-card ' + p.q + (i === A.sel ? ' sel' : '');
      c.style.setProperty('--r', ((i - (A.hand.length - 1) / 2) * 5).toFixed(1) + 'deg');
      c.innerHTML = '<img alt=""><span class="pc-fi">' + svgIcon(FRAME[p.frame].icon) + '</span>';
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
    if (c && c.chip) o.push({ chip: true, icon: QUIRKS[c.q].icon, label: QUIRKS[c.q].short });
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
  el.querySelector('.ar-bar').hidden = !A.bar;
  if (A.bar) {
    const fg = el.querySelector('.ar-bar .fg');
    fg.style.left = (A.bar.a * 100).toFixed(1) + '%';
    fg.style.width = ((A.bar.b - A.bar.a) * 100).toFixed(1) + '%';
  }
  el.classList.toggle('ending', A.beat === 'end');
  arenaTimer(A);
}
function arenaBarDraw(A) {
  const el = $('#arena .ar-bar');
  if (!el || !A.bar) return;
  el.querySelector('.ft').style.left = (A.bar.pos * 100).toFixed(2) + '%';
  el.classList.toggle('hit', A.bar.res === 'hit');
  el.classList.toggle('miss', A.bar.res === 'miss');
}
function arenaClose() {
  const el = $('#arena');
  el.classList.add('out');
  setTimeout(() => {
    el.hidden = true;
    el.classList.remove('out');
  }, 450);
}
