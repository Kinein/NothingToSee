//@ ui/confront-view — How the confrontation looks: the stage light, the cards fanned over IT, the verdict
//@ Defines: cfOpen, cfDraw, cfLight, cfHide
//@ Uses:    gfx/world-geometry, gfx/renderer, ui/interface, them/proofs, sim/core, core/util, data/lines
//@ (header made by tools/map.js; stripped by build.py)
// ───────────── the confrontation on screen. The world stays: a stage light where you stand (gfx/frame uStage), the town
// gone dark around it, the HUD dimmed. Your cards fan out just over IT's head one at a time and turn, ✓ or ✗, and IT's
// answer to each sits between the cards and its face. A banner says who you're calling out and in front of how many;
// the verdict comes up at the bottom.
// a card says plainly what it shows, where and when
const cfCaption = (p) =>
  [p.what || FRAME[p.frame].name, p.where, DOW[dow(dayNo(p.at))] + ' ' + fmtTime(p.at)].filter(Boolean).join(' · ');
function cfOpen(C) {
  const el = $('#arena');
  el.innerHTML =
    '<div class="cf-top"><b></b><span></span></div><div class="cf-fan"><p class="cf-say" hidden></p></div>' +
    '<div class="cf-verdict" hidden><b></b><span></span></div><p class="cf-key">E · hurry it along</p>';
  el.querySelector('.cf-top b').textContent = 'Confronting ' + C.n.short;
  el.querySelector('.cf-top span').textContent =
    C.ear.length + (C.ear.length === 1 ? ' person listening' : ' people listening') + ' · ' + cfTally(C);
  const fan = el.querySelector('.cf-fan'),
    k = C.cards.length;
  C.cards.forEach((c, i) => {
    const f = document.createElement('figure');
    f.className = 'cf-card';
    f.style.setProperty('--r', ((i - (k - 1) / 2) * Math.min(11, 44 / Math.max(1, k - 1))).toFixed(1) + 'deg');
    f.style.setProperty('--x', ((i - (k - 1) / 2) * Math.min(132, 520 / Math.max(1, k))).toFixed(0) + 'px');
    f.innerHTML =
      '<div class="cf-in"><div class="cf-face"><img alt=""><i class="cf-fr"></i>' +
      '<figcaption></figcaption><b class="cf-mark"></b></div></div>';
    f.querySelector('img').src = proofImage(c.p);
    f.querySelector('.cf-fr').innerHTML = svgIcon(FRAME[c.p.frame].icon) + '<span>' + FRAME[c.p.frame].name + '</span>';
    f.querySelector('figcaption').textContent = cfCaption(c.p);
    f.querySelector('.cf-mark').textContent = c.ok ? '✓' : '✗';
    f.classList.add(c.ok ? 'yes' : 'no');
    fan.appendChild(f);
    c.el = f;
  });
  el.hidden = false;
  document.body.classList.add('cf-on');
}
const cfTally = (C) => {
  const done = C.cards.filter((c) => c.shown),
    yes = done.filter((c) => c.ok).length;
  return C.cards.length ? '✓ ' + yes + ' of ' + C.cards.length : 'no cards on them';
};
// every frame while it's on: the fan rides above IT's head, the light eases in
function cfDraw(C) {
  const el = $('#arena');
  if (!el || el.hidden || !cam.VP) return; // nothing drawn yet: nowhere to put it
  const n = C.n,
    [x, y] = project(n.x, 1.95, n.z),
    fan = el.querySelector('.cf-fan');
  fan.style.transform = 'translate(' + x.toFixed(0) + 'px,' + y.toFixed(0) + 'px)';
  C.cards.forEach((c, i) => {
    c.el.classList.toggle('dealt', i <= C.i);
    c.el.classList.toggle('turned', !!c.shown);
    c.el.classList.toggle('now', i === C.i);
  });
  el.querySelector('.cf-top span').textContent =
    C.ear.length + (C.ear.length === 1 ? ' person listening' : ' people listening') + ' · ' + cfTally(C);
  const say = el.querySelector('.cf-say');
  if (say.textContent !== (C.line || '')) {
    say.textContent = C.line || '';
    say.hidden = !C.line;
  }
  const v = el.querySelector('.cf-verdict');
  if (C.res && v.hidden) {
    const [t, s] = CF_VERDICT[C.res];
    v.querySelector('b').textContent = t;
    v.querySelector('span').textContent = s;
    v.className = 'cf-verdict ' + C.res;
    v.hidden = false;
  }
}
// the stage light, for gfx/frame: where on screen it falls, and how far in it has come
function cfLight(dtReal) {
  const on = !!UI.cf;
  R.stageK = (R.stageK || 0) + ((on ? 1 : 0) - (R.stageK || 0)) * Math.min(1, dtReal * 3.5);
  if (on && UI.cf.spot && cam.VP) {
    const [x, y] = project(UI.cf.spot[0], 0.9, UI.cf.spot[1]),
      r = R.canvas.getBoundingClientRect();
    R.stageAt = [x / Math.max(1, r.width), 1 - y / Math.max(1, r.height)];
  }
}
function cfHide() {
  const el = $('#arena');
  el.hidden = true;
  el.innerHTML = '';
  document.body.classList.remove('cf-on');
}
