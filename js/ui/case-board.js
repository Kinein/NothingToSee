//@ ui/case-board — The evidence board (case file)
//@ Defines: CLUE_ICONS, openBoard, drawPrints, drawSightings, drawHeard, pinPrint, drawStrings, showSuspect, closeBoard, toggleHelp
//@ Uses:    sim/core, ui/interface, world/grid, them/proofs, input/camera, core/util, town/quirks, town/cast, them/plan, gfx/portraits, …
//@ (header made by tools/map.js; stripped by build.py)
// ───────────── the board (case file)
const CLUE_ICONS = { seen: 'eye', photo: 'camera', item: 'bag', found: 'search', odd: 'question', rumor: 'ear' };
function openBoard(focusId) {
  if (!G || !G.started) return;
  const F = FACTIONS[G.faction];
  const fc = $('#bd-faction');
  fc.innerHTML =
    '<span class="pin"></span><span class="fi">' +
    svgIcon(G.factionKnown ? F.icon : 'question') +
    '</span><b></b><span class="exp"></span><span class="plan" data-tip="THEIR plan"></span>';
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
  fc.querySelector('b').textContent = G.factionKnown ? F.label : '';
  fc.querySelector('b').hidden = !G.factionKnown;
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
  const leads = $('#bd-leads');
  leads.innerHTML = '';
  for (const l of G.leads.slice(-3).reverse()) {
    const p = document.createElement('p');
    p.className = 'sticky';
    p.textContent = l;
    p.style.setProperty('--tilt', (Math.random() * 6 - 3).toFixed(1) + 'deg');
    leads.appendChild(p);
  }
  const eye = $('#bd-eye');
  eye.innerHTML = svgIcon('eye') + '<span><i style="width:' + Math.round(G.aware) + '%"></i></span>';
  eye.dataset.tip = 'THEY know · ' + awareWord(G.aware);
  const list = $('#bd-pols');
  list.innerHTML = '';
  for (const n of suspects()) {
    const card = document.createElement('button');
    card.className =
      'pol2' +
      (n.slain || n.gone ? ' gone' : '') +
      (n.exposed && !n.slain ? ' unmasked' : '') +
      (n.evidence >= 100 && !n.exposed ? ' proof' : '') +
      (G.cleared[n.id] ? ' cleared' : '');
    card.dataset.id = n.id;
    card.style.setProperty('--tilt', (hash2(n.id.length, n.id.charCodeAt(0), 3) * 7 - 3.5).toFixed(1) + 'deg');
    const pins = Math.round(n.evidence / 20);
    let clues = '';
    for (const k in CLUE_ICONS)
      if (n.clues[k])
        clues +=
          '<span data-tip="' +
          k +
          '">' +
          svgIcon(CLUE_ICONS[k]) +
          (n.clues[k] > 1 ? '<em>' + n.clues[k] + '</em>' : '') +
          '</span>';
    const held = G.proofs.filter((p) => p.pin === n.id),
      strong = held.filter(proofShownStrong).length;
    if (held.length)
      clues +=
        '<span data-tip="' +
        held.length +
        (held.length === 1 ? ' proof' : ' proofs') +
        (strong ? ' · ' + strong + ' strong' : '') +
        '">' +
        svgIcon('clip') +
        '<em>' +
        held.length +
        '</em></span>';
    card.innerHTML =
      '<span class="pin"></span><img alt=""><b></b><span class="pips">' +
      [0, 1, 2, 3, 4].map((i) => '<i class="' + (i < pins ? 'on' : '') + '"></i>').join('') +
      '</span><span class="clues">' +
      clues +
      '</span><span class="hab">' +
      (!G.cleared[n.id] && !n.exposed
        ? knownQ(n)
            .map((q) => '<span data-tip="' + esc(QUIRKS[q].short) + '">' + svgIcon(QUIRKS[q].icon) + '</span>')
            .join('')
        : '') +
      '</span>' +
      (n.slain ? '<span class="xx"></span>' : '') +
      (G.cleared[n.id] ? '<span class="okst">CLEARED</span>' : '') +
      (n.slain
        ? '<span class="okst caught">' + (n.slain === 'mob' ? 'FINISHED' : 'KILLED') + '</span>'
        : n.exposed
          ? '<span class="okst caught">UNMASKED</span>'
          : '') +
      (n.gone ? '<span class="okst gonest">GONE</span>' : '');
    card.querySelector('img').src = getPortrait(n);
    card.querySelector('b').textContent = n.short;
    card.onclick = () => {
      if (UI.pinSel) {
        pinPrint(UI.pinSel, n.id);
        return;
      }
      showSuspect(n);
    };
    list.appendChild(card);
  }
  drawPrints();
  drawSightings();
  drawHeard();
  $('#bd-detail').hidden = true;
  $('#board').hidden = false;
  UI.caseOpen = true;
  UI.prevSpeed = G.speed;
  G.speed = 0;
  requestAnimationFrame(drawStrings);
  if (focusId) showSuspect(NPC[focusId]);
}
// the Unsorted strip: prints that didn't file themselves. Pick one, then a polaroid, to pin it there.
// the Whose? strip: proofs with nobody's name on them yet. Pick one, then a polaroid, to pin it there.
// Pinned on the wrong face, a proof proves nothing.
function drawPrints() {
  const box = $('#bd-prints');
  if (!box) return;
  const loose = looseProofs().slice(-12).reverse();
  box.hidden = !loose.length;
  box.innerHTML =
    '<b class="tape">Whose?</b>' +
    (UI.pinSel ? '<span class="pinhint">' + svgIcon('clip') + 'Pick a suspect</span>' : '');
  for (const p of loose) {
    const el = document.createElement('button');
    el.className = 'print' + (UI.pinSel === p.id ? ' sel' : '');
    el.style.setProperty('--tilt', ((p.id * 37) % 7) - 3 + 'deg');
    el.innerHTML = '<img alt=""><span></span><i class="pq">' + (p.src === 'item' ? svgIcon('bag') : '?') + '</i>';
    el.querySelector('img').src = proofImage(p);
    el.querySelector('span').textContent = p.what + ' · ' + DOW[dow(dayNo(p.at))] + ' ' + fmtTime(p.at);
    el.dataset.tip =
      (p.where || '') + ' · ' + (p.src === 'item' ? 'in your pocket' : 'a print') + ' · pin it on someone';
    el.onclick = (e) => {
      e.stopPropagation();
      UI.pinSel = UI.pinSel === p.id ? null : p.id;
      drawPrints();
    };
    box.appendChild(el);
  }
}
function drawSightings() {
  const box = $('#bd-sight');
  if (!box) return;
  const list = G.sightings.slice(-8).reverse();
  box.hidden = !list.length;
  box.innerHTML = '<b class="tape">Sightings</b>';
  const F = FACTIONS[G.faction];
  for (const sg of list) {
    const el = document.createElement('div');
    el.className = 'sight' + (sg.linked ? ' linked' : '');
    el.style.setProperty('--tilt', ((sg.id * 29) % 5) - 2 + 'deg');
    const names = suspects()
      .map(
        (s) =>
          '<i class="' +
          (sg.linked ? (sg.linked === s.id ? 'hit' : 'x') : sg.struck[s.id] || s.slain || s.gone ? 'x' : '') +
          '">' +
          esc(s.short.replace('Mr. ', '')) +
          '</i>',
      )
      .join('');
    el.innerHTML =
      '<span class="sg-ic">' +
      svgIcon(G.factionKnown ? F.icon : 'question') +
      '</span><em></em><span class="sg-w"></span><span class="sg-n">' +
      names +
      '</span>';
    el.querySelector('em').textContent = DOW[dow(dayNo(sg.t))] + ' ' + fmtTime(sg.t);
    el.querySelector('.sg-w').textContent = sg.where;
    box.appendChild(el);
  }
}
function drawHeard() {
  const box = $('#bd-heard');
  if (!box) return;
  const list = G.heard.slice(-10).reverse();
  box.hidden = !list.length;
  box.innerHTML = '<b class="tape">Heard around town</b>';
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
function pinPrint(id, who) {
  const p = G.proofs.find((x) => x.id === id);
  UI.pinSel = null;
  if (p && !p.auto) {
    p.pin = who;
    refreshEvidence();
  }
  openBoard();
  showSuspect(NPC[who]);
}
function drawStrings() {
  const svg = $('#bd-strings'),
    board = $('#board .cork');
  if (!svg || !board) return;
  const br = board.getBoundingClientRect();
  svg.setAttribute('viewBox', '0 0 ' + br.width + ' ' + br.height);
  const pin = (el) => {
    const r = el.querySelector('.pin').getBoundingClientRect();
    return [r.left + r.width / 2 - br.left, r.top + r.height / 2 - br.top];
  };
  // who you keep seeing together: a thread between their polaroids, thicker the more you've seen
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
      '"><title>Seen talking</title></path>';
  }
  const [fx, fy] = pin($('#bd-faction'));
  let paths = '';
  for (const el of document.querySelectorAll('.pol2')) {
    const n = NPC[el.dataset.id];
    if (!n || n.evidence <= 0) continue;
    const [x, y] = pin(el);
    const sag = 30 + Math.hypot(x - fx, y - fy) * 0.12;
    paths +=
      '<path d="M' +
      fx +
      ' ' +
      fy +
      ' Q' +
      (fx + x) / 2 +
      ' ' +
      (Math.max(fy, y) + sag) +
      ' ' +
      x +
      ' ' +
      y +
      '" stroke-width="' +
      (1.2 + n.evidence / 45).toFixed(1) +
      '" opacity="' +
      (0.45 + n.evidence / 200).toFixed(2) +
      '"/>';
  }
  svg.innerHTML = talk + paths;
}
function showSuspect(n) {
  if (!n) return;
  const d = $('#bd-detail');
  d.innerHTML =
    '<button class="x" id="bd-dx" aria-label="Back">' +
    svgIcon('x') +
    '</button><div class="sd-head"><img alt=""><div><b></b><span class="sd-role"></span>' +
    hearts(n.rel) +
    '<span class="pev big" data-tip="Evidence"><i style="width:' +
    Math.round(n.evidence) +
    '%"></i></span>' +
    (n.id !== 'lenny'
      ? '<span class="psus big' +
        (n.sus >= 60 ? ' hi' : '') +
        '" data-tip="Suspicion of you">' +
        svgIcon('eye') +
        '<span><i style="width:' +
        Math.round(n.sus) +
        '%"></i></span></span>'
      : '') +
    '</div></div><div class="sd-hab"></div><div class="sd-snaps"></div><ul class="sd-notes"></ul>';
  d.querySelector('.sd-head img').src = getPortrait(n);
  d.querySelector('.sd-head b').textContent = n.name;
  d.querySelector('.sd-role').textContent =
    n.role +
    (n.slain
      ? ' · dead'
      : n.exposed
        ? ' · unmasked, still out there · kill it, trap it, or break into its home'
        : G.cleared[n.id]
          ? ' · cleared'
          : n.evidence >= 100
            ? ' · proof — confront them in public'
            : '');
  const hab = d.querySelector('.sd-hab'),
    kq = knownQ(n);
  if (G.cleared[n.id] || n.exposed || !kq.length) hab.hidden = true;
  else hab.innerHTML = kq.map((q) => '<span>' + svgIcon(QUIRKS[q].icon) + esc(QUIRKS[q].short) + '</span>').join('');
  const snaps = d.querySelector('.sd-snaps');
  // the proofs you hold on them: STRONG says so; the rest are "?" until you lay them down
  const held = G.proofs
    .filter((p) => p.pin === n.id)
    .sort((a, b) => proofShownStrong(b) - proofShownStrong(a) || b.at - a.at);
  for (const p of held) {
    const f = document.createElement('figure');
    f.className = 'sdp' + (proofShownStrong(p) ? ' strong' : '') + (p.auto ? '' : ' pinned');
    f.style.setProperty('--tilt', ((p.id * 53) % 7) - 3 + 'deg');
    f.innerHTML = '<img alt=""><span class="stamp"></span><figcaption></figcaption>';
    f.querySelector('img').src = proofImage(p);
    f.querySelector('.stamp').textContent = proofLabel(p);
    f.querySelector('figcaption').textContent = p.what;
    f.dataset.tip =
      (p.where || '') + ' · ' + DOW[dow(dayNo(p.at))] + ' ' + fmtTime(p.at) + (p.auto ? '' : ' · click to unpin');
    if (!p.auto)
      f.onclick = () => {
        p.pin = null;
        refreshEvidence();
        openBoard();
        showSuspect(n);
      };
    snaps.appendChild(f);
  }
  for (const rec of n.snaps.slice().reverse()) {
    const im = document.createElement('img');
    im.src = snapImage(n, rec);
    im.alt = '';
    im.style.setProperty('--tilt', (Math.random() * 6 - 3).toFixed(1) + 'deg');
    snaps.appendChild(im);
  }
  if (!snaps.children.length) snaps.innerHTML = '<span class="empty">' + svgIcon('camera') + '</span>';
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
  $('#bd-dx').onclick = () => {
    d.hidden = true;
  };
}
function closeBoard() {
  UI.pinSel = null;
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
