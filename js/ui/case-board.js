//@ ui/case-board — The evidence book: four frames on every suspect, the suspect page, the Whose? tray
//@ Defines: SLOT_TIP, MARK_STAMP, openBoard, drawTop, slotHtml, fillSlotImgs, stampFor, drawPols, drawHeard, refreshBoard, drawStrings, showSuspect, closeSuspect, focusPol, boardKey, closeBoard, …
//@ Uses:    ui/interface, sim/core, them/proofs, core/util, town/cast, world/grid, play/biography, them/plan, town/quirks, ui/hud, …
//@ (header made by tools/map.js; stripped by build.py)
// ───────────── the board. A cork board that pauses the town. Every suspect shows four frame slots under their polaroid,
// empty or holding a card. A card says plainly what it shows, where and when; nothing on it says whether it holds up.
// That's decided only when you confront them (✓ or ✗), and whether a case is enough is yours to judge.
const SLOT_TIP = { empty: 'Nothing yet' };
const MARK_STAMP = { them: 'IT’S THEM', cleared: 'CLEARED' };
function openBoard(focusId) {
  if (!G || !G.started) return;
  drawTop();
  drawPols();
  drawHeard();
  $('#bd-detail').hidden = true;
  $('#board .cork').classList.remove('paged');
  $('#board').hidden = false;
  UI.caseOpen = true;
  if (UI.prevSpeed == null) UI.prevSpeed = G.speed;
  G.speed = 0;
  requestAnimationFrame(drawStrings);
  if (focusId && NPC[focusId]) showSuspect(NPC[focusId]);
  else focusPol(UI.bdSel || suspects()[0].id);
}
// the top strip: THEIR card (what THEY are once you know, THEIR five days) and THEIR eye
function drawTop() {
  const F = FACTIONS[G.faction];
  const fc = $('#bd-faction');
  fc.innerHTML =
    '<span class="pin"></span><span class="fi">' +
    svgIcon(G.factionKnown ? F.icon : 'question') +
    '</span><b></b><span class="plan" data-tip="THEIR plan"></span><span class="exp"></span>';
  const ph = clamp(G.phase || 1, 1, WEEK);
  fc.querySelector('.plan').innerHTML = Array.from(
    { length: WEEK },
    (_, i) =>
      '<i class="' +
      (i < ph - 1 ? 'on' : i === ph - 1 ? 'cur' : '') +
      '" data-tip="' +
      DOW_LONG[i] +
      (G.factionKnown ? ' · ' + PHASES[G.faction][i] : '') +
      '"></i>',
  ).join('');
  fc.querySelector('b').textContent = G.factionKnown ? F.label : 'THEM';
  fc.querySelector('.exp').innerHTML = [0, 1, 2]
    .map(
      (i) =>
        '<i class="' +
        (i < G.slain.length
          ? 'on'
          : i < G.slain.length + them().filter((n) => n.exposed && !n.slain).length
            ? 'half'
            : '') +
        '"></i>',
    )
    .join('');
  fc.dataset.tip = G.factionKnown ? 'What THEY are' : 'Catch one in the act';
  // how many ordinary people think you're mad: three of them at 06:00 and the clinic writes
  const mad = $('#bd-mad'),
    nMad = thinkMad().length;
  if (mad) {
    mad.className = nMad >= 3 ? 's2' : nMad >= 1 ? 's1' : '';
    mad.innerHTML = svgIcon('eye') + '<span>Think you’re mad</span><b></b>';
    mad.querySelector('b').textContent = Math.min(nMad, 3) + ' of 3';
    mad.dataset.tip =
      nMad >= 3
        ? 'Three people think you’re mad. At 06:00, Mom calls and the clinic writes'
        : 'People who find you weird enough (60+) to call your mother. Three, and the clinic writes';
  }
  const eye = $('#bd-eye'),
    es = eyeState();
  eye.className = 's' + es;
  eye.innerHTML = svgIcon('eye') + '<b></b>';
  eye.querySelector('b').textContent = eyeLine();
}
// a card says what, where and when, nothing else: THEIRS and an innocent's look the same
const cardWhen = (p) =>
  (p.what ? p.what + ' · ' : '') + (p.where ? p.where + ' · ' : '') + DOW[dow(dayNo(p.at))] + ' ' + fmtTime(p.at);
function slotHtml(n, f, big) {
  const st = frameState(n, f),
    p = cardIn(n, f);
  const tip = p ? cardWhen(p) : SLOT_TIP[st];
  return (
    '<span class="slot ' +
    st +
    (big ? ' big' : '') +
    '" data-f="' +
    f +
    '"' +
    (p ? ' data-pid="' + p.id + '"' : '') +
    ' data-tip="' +
    esc(FRAME[f].name + ' · ' + tip) +
    '">' +
    (p ? '<img alt="">' : '') +
    '<i class="fi">' +
    svgIcon(FRAME[f].icon) +
    '</i>' +
    (big ? '<em>' + FRAME[f].name + '</em>' : '') +
    '</span>'
  );
}
function fillSlotImgs(el) {
  for (const s of el.querySelectorAll('.slot[data-pid]')) {
    const p = G.proofs.find((x) => x.id === +s.dataset.pid),
      im = s.querySelector('img');
    if (p && im) im.src = proofImage(p);
  }
}
function stampFor(n) {
  if (n.slain) return ['caught', n.slain === 'mob' ? 'FINISHED' : n.slain === 'fbi' ? 'TAKEN' : 'KILLED'];
  if (n.exposed) return ['caught', 'UNMASKED'];
  if (n.gone) return ['gonest', 'GONE'];
  if (G.mark[n.id]) return [G.mark[n.id], MARK_STAMP[G.mark[n.id]]];
  return null;
}
function drawPols() {
  const list = $('#bd-pols');
  list.innerHTML = '';
  for (const n of suspects()) {
    const card = document.createElement('button'),
      sp = stampFor(n);
    card.className =
      'pol2' +
      (n.slain || n.gone ? ' gone' : '') +
      (n.exposed && !n.slain ? ' unmasked' : '') +
      (G.mark[n.id] === 'cleared' ? ' cleared' : '') +
      (UI.bdSel === n.id ? ' sel' : '');
    card.dataset.id = n.id;
    card.style.setProperty('--tilt', (hash2(n.id.length, n.id.charCodeAt(0), 3) * 7 - 3.5).toFixed(1) + 'deg');
    card.innerHTML =
      '<span class="pin"></span><img alt=""><b></b><span class="slots">' +
      FRAMES.map((f) => slotHtml(n, f)).join('') +
      '</span>' +
      (n.slain ? '<span class="xx"></span>' : '') +
      (sp ? '<span class="okst ' + sp[0] + '">' + sp[1] + '</span>' : '');
    card.querySelector('img').src = getPortrait(n);
    card.querySelector('b').textContent = n.short;
    fillSlotImgs(card);
    card.onclick = () => showSuspect(n);
    list.appendChild(card);
  }
}
function drawHeard() {
  const box = $('#bd-heard');
  if (!box) return;
  const list = G.heard.slice(-5).reverse();
  box.innerHTML = '<b class="tape">Heard around town</b>';
  box.classList.toggle('empty', !list.length);
  for (const h of list) {
    const el = document.createElement('p');
    el.className = 'heard';
    el.style.setProperty('--tilt', (((h.at * 13) % 5) - 2).toFixed(1) + 'deg');
    el.innerHTML = '<em></em><span></span><i></i>';
    el.querySelector('em').textContent = DOW[dow(dayNo(h.t))] + ' ' + fmtTime(h.t);
    el.querySelector('span').textContent = h.text;
    el.querySelector('i').textContent =
      '— ' +
      (h.by === 'paper'
        ? 'the paper'
        : h.by === 'stranger'
          ? 'a stranger'
          : h.by === 'lenny'
            ? 'Lenny'
            : NPC[h.by]
              ? NPC[h.by].short
              : 'someone');
    box.appendChild(el);
  }
}
function refreshBoard() {
  const open = !$('#bd-detail').hidden && UI.bdSel;
  drawPols();
  requestAnimationFrame(drawStrings);
  if (open) showSuspect(NPC[UI.bdSel]);
}
// threads on the cork: who you keep seeing together, and your own red string from THEM to whoever you've marked
function drawStrings() {
  const svg = $('#bd-strings'),
    board = $('#board .cork');
  if (!svg || !board || board.hidden) return;
  const br = board.getBoundingClientRect();
  svg.setAttribute('viewBox', '0 0 ' + br.width + ' ' + br.height);
  const pin = (el) => {
    const r = el.querySelector('.pin').getBoundingClientRect();
    return [r.left + r.width / 2 - br.left + board.scrollLeft, r.top + r.height / 2 - br.top + board.scrollTop];
  };
  let talk = '';
  const pol = {};
  for (const el of document.querySelectorAll('.pol2')) pol[el.dataset.id] = el;
  for (const k in G.pairs) {
    const v = G.pairs[k];
    if (v < 8) continue;
    const [a, b] = k.split('|');
    if (!pol[a] || !pol[b]) continue;
    const [x1, y1] = pin(pol[a]),
      [x2, y2] = pin(pol[b]);
    talk +=
      '<path class="talk" d="M' +
      x1 +
      ' ' +
      (y1 + 4) +
      ' Q' +
      (x1 + x2) / 2 +
      ' ' +
      (Math.min(y1, y2) - 24) +
      ' ' +
      x2 +
      ' ' +
      (y2 + 4) +
      '" stroke-width="' +
      Math.min(4, 0.8 + v / 25).toFixed(1) +
      '"><title>Seen together</title></path>';
  }
  const [fx, fy] = pin($('#bd-faction'));
  let paths = '';
  for (const el of document.querySelectorAll('.pol2')) {
    const n = NPC[el.dataset.id];
    if (!n || (G.mark[n.id] !== 'them' && !n.exposed)) continue;
    const [x, y] = pin(el);
    const sag = 30 + Math.hypot(x - fx, y - fy) * 0.12;
    paths +=
      '<path d="M' + fx + ' ' + fy + ' Q' + (fx + x) / 2 + ' ' + (Math.max(fy, y) + sag) + ' ' + x + ' ' + y + '"/>';
  }
  svg.innerHTML = talk + paths;
}
// the suspect page: the four frames at full size, what you know about them, who they're with, notes, your mark
function showSuspect(n) {
  if (!n) return;
  UI.bdSel = n.id;
  UI.bdFrame = UI.bdFrame || 0;
  const d = $('#bd-detail');
  const with_ = Object.entries(G.pairs)
    .filter(([k, v]) => v >= 8 && k.split('|').includes(n.id))
    .sort((a, b) => b[1] - a[1])
    .map(([k]) => NPC[k.split('|').find((x) => x !== n.id)])
    .filter(Boolean)
    .slice(0, 4);
  d.innerHTML =
    '<button class="x" id="bd-dx" aria-label="Back">' +
    svgIcon('x') +
    '</button><div class="sd-head"><img alt=""><div><b></b><span class="sd-role"></span>' +
    (n.id !== 'lenny'
      ? '<span class="psus big' +
        (n.sus >= 60 ? ' hi' : '') +
        '" data-tip="Suspicion of you">' +
        svgIcon('eye') +
        '<span><i style="width:' +
        Math.round(n.sus) +
        '%"></i></span></span>'
      : '') +
    '<span class="sd-mark"></span></div></div><div class="sd-frames">' +
    FRAMES.map((f) => slotHtml(n, f, true)).join('') +
    '</div><div class="sd-zoom" hidden></div><h4>What you know</h4><div class="sd-hab"></div>' +
    (bioOf(n).length ? '<h4>Biography</h4><ol class="sd-bio"></ol>' : '') +
    (with_.length ? '<h4>Who they’re with</h4><div class="sd-with"></div>' : '') +
    '<h4>Notes</h4><ul class="sd-notes"></ul>';
  d.querySelector('.sd-head img').src = getPortrait(n);
  d.querySelector('.sd-head b').textContent = n.name;
  d.querySelector('.sd-role').textContent =
    n.role + (n.slain ? ' · dead' : n.exposed ? ' · unmasked, still out there' : '');
  // your mark: your conviction only. It changes nothing in the world.
  const mk = d.querySelector('.sd-mark');
  for (const [k, label] of [
    [null, 'No mark'],
    ['them', 'IT’S THEM'],
    ['cleared', 'CLEARED'],
  ]) {
    const b = document.createElement('button');
    b.className = 'mk ' + (k || 'none') + ((G.mark[n.id] || null) === k ? ' on' : '');
    b.textContent = label;
    b.onclick = () => {
      if (k) G.mark[n.id] = k;
      else delete G.mark[n.id];
      refreshBoard();
    };
    mk.appendChild(b);
  }
  fillSlotImgs(d);
  const zoom = d.querySelector('.sd-zoom');
  d.querySelectorAll('.sd-frames .slot').forEach((s, i) => {
    s.classList.toggle('foc', i === UI.bdFrame);
    if (!s.dataset.pid) return;
    s.onclick = () => {
      const p = G.proofs.find((x) => x.id === +s.dataset.pid);
      if (!p) return;
      UI.bdFrame = i;
      zoom.hidden = false;
      zoom.className = 'sd-zoom card';
      zoom.innerHTML = '<img alt=""><span></span>';
      zoom.querySelector('img').src = proofImage(p);
      zoom.querySelector('span').textContent = cardWhen(p);
      zoom.onclick = () => (zoom.hidden = true);
    };
  });
  const hab = d.querySelector('.sd-hab'),
    kq = knownQ(n);
  hab.innerHTML = kq.length
    ? kq.map((q) => '<span class="chip">' + svgIcon(QUIRKS[q].icon) + esc(QUIRKS[q].short) + '</span>').join('')
    : '<span class="none">Nothing yet. Watch them.</span>';
  // the facts: found ones, with where they came from and your mark; blank lines for the rest
  const bio = d.querySelector('.sd-bio'),
    marked = cardIn(n, 'biography');
  if (bio)
    bioOf(n).forEach((f, i) => {
      const li = document.createElement('li');
      if (!f.found) {
        li.className = 'blank';
        li.innerHTML = '<span></span>';
        return bio.appendChild(li);
      }
      const on = !!(marked && marked.bio === i);
      li.className = on ? 'odd' : '';
      li.innerHTML = '<span></span><em></em><button class="mk-odd"></button>';
      li.querySelector('span').textContent = f.t;
      li.querySelector('em').textContent = BIO_SRC[f.src];
      const b = li.querySelector('button');
      b.textContent = on ? 'Odd' : 'Mark odd';
      b.disabled = !!n.confronted;
      b.dataset.tip = n.confronted
        ? 'You’ve called them out: the mark stays'
        : on
          ? 'Their Biography card. Click to take the mark off'
          : 'Make this fact their Biography card';
      b.onclick = (e) => {
        e.stopPropagation();
        if (markFact(n, i)) refreshBoard();
      };
      bio.appendChild(li);
    });
  const wb = d.querySelector('.sd-with');
  if (wb) wb.innerHTML = with_.map((w) => '<span class="chip">' + esc(w.short) + '</span>').join('');
  const ul = d.querySelector('.sd-notes');
  for (const note of n.notes.slice(-8).reverse()) {
    const li = document.createElement('li');
    li.innerHTML = '<em></em> ';
    li.querySelector('em').textContent = DOW[dow(dayNo(note.t))] + ' ' + fmtTime(note.t);
    li.appendChild(document.createTextNode(note.text));
    if (note.by) {
      const src = note.by === 'you' ? 'you' : NPC[note.by] ? NPC[note.by].short : 'someone';
      const sig = document.createElement('i');
      sig.textContent = ' — ' + src;
      li.appendChild(sig);
    }
    if (note.quote) li.classList.add('quote');
    ul.appendChild(li);
  }
  d.hidden = false;
  $('#board .cork').classList.add('paged');
  for (const el of document.querySelectorAll('.pol2')) el.classList.toggle('sel', el.dataset.id === n.id);
  $('#bd-dx').onclick = closeSuspect;
  requestAnimationFrame(drawStrings);
}
function closeSuspect() {
  $('#bd-detail').hidden = true;
  $('#board .cork').classList.remove('paged');
  requestAnimationFrame(drawStrings);
}
function focusPol(id) {
  UI.bdSel = id;
  for (const el of document.querySelectorAll('.pol2')) {
    el.classList.toggle('sel', el.dataset.id === id);
    if (el.dataset.id === id) el.focus({ preventScroll: false });
  }
}
// keys on the board: arrows move between suspects, E opens the page, A/D move between frames, Esc closes
function boardKey(k) {
  const ids = suspects().map((n) => n.id),
    i = Math.max(0, ids.indexOf(UI.bdSel)),
    cols = getComputedStyle($('#bd-pols')).gridTemplateColumns.split(' ').length || 5;
  const step = { arrowleft: -1, arrowright: 1, arrowup: -cols, arrowdown: cols }[k];
  if (step) {
    const j = clamp(i + step, 0, ids.length - 1);
    focusPol(ids[j]);
    if (!$('#bd-detail').hidden) showSuspect(NPC[ids[j]]);
    return true;
  }
  if (k === 'e' || k === 'enter' || k === ' ') {
    showSuspect(NPC[ids[i]]);
    return true;
  }
  if ((k === 'a' || k === 'd') && !$('#bd-detail').hidden) {
    UI.bdFrame = (UI.bdFrame + (k === 'a' ? 3 : 1)) % 4;
    const s = $('#bd-detail').querySelectorAll('.sd-frames .slot');
    s.forEach((x, j) => x.classList.toggle('foc', j === UI.bdFrame));
    if (s[UI.bdFrame] && s[UI.bdFrame].dataset.pid) s[UI.bdFrame].click();
    else $('#bd-detail .sd-zoom').hidden = true;
    return true;
  }
  return false;
}
function closeBoard() {
  $('#board').hidden = true;
  UI.caseOpen = false;
  if (UI.prevSpeed != null) G.speed = UI.prevSpeed || 1;
  UI.prevSpeed = null;
  $('#tip').hidden = true;
}
function toggleHelp() {
  const h = $('#help');
  h.hidden = !h.hidden;
}
