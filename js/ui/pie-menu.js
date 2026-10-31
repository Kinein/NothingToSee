//@ ui/pie-menu — The directional pie menu
//@ Defines: MENU_KEYS, MENU_XY, openMenu, placeMenu, runOpt, presentMenu, closeMenu
//@ Uses:    ui/interface, ui/menus, core/util, audio/sound, town/fleeing, sim/actions, town/arrest, input/camera
//@ (header made by tools/map.js; stripped by build.py)
// ───────────── pie menu
// the directional menu: up to four actions on W A S D (or the mouse). Two sit left and right; a third goes on top; a fourth below.
// Slots fill in that order, so an action keeps its key as a menu grows: A, D, W, S. With mouse controls a person's menu
// has one more, down on the right: Attack, on Space (m.hit, set in presentMenu).
const MENU_KEYS = ['a', 'd', 'w', 's'];
const MENU_XY = { a: [-150, 0], d: [150, 0], w: [0, -116], s: [0, 116], hit: [120, 96] };
function openMenu(m, x, y, anchor) {
  if (!m || !m.ops || !m.ops.length) return;
  fitMenu(m);
  const pie = $('#pie');
  pie.innerHTML =
    '<div class="pc">' +
    (m.img
      ? '<span class="pcf"><img alt=""></span>'
      : '<span class="pcf"><span class="pci">' + artIcon(m.icon || 'dots') + '</span></span>') +
    '<b></b>' +
    (m.sub ? '<span class="psub"></span>' : '') +
    '</div>';
  if (m.img) pie.querySelector('img').src = m.img;
  pie.querySelector('.pc b').textContent = m.title;
  if (m.sub) pie.querySelector('.psub').textContent = m.sub;
  UI.menuOps = {};
  const slot = (o, key) => {
    const b = document.createElement('button');
    b.className = 'po' + (o.dis ? ' dis' : '') + ' k-' + key;
    b.innerHTML =
      '<span class="pi">' +
      (o.dis ? svgIcon(o.icon || 'dots') : artIcon(o.icon)) +
      (o.dis ? '<s>' + svgIcon('lock') + '</s>' : '') +
      '<kbd>' +
      (key === 'hit' ? 'Space' : key.toUpperCase()) +
      '</kbd></span><b></b>' +
      (o.dis ? '<i class="pwhy"></i>' : '');
    b.querySelector('b').textContent = o.label;
    if (o.dis) {
      b.dataset.tip = o.dis;
      b.querySelector('.pwhy').textContent = o.dis;
    }
    b.onclick = (e) => {
      e.stopPropagation();
      runOpt(o, true);
    };
    b.style.left = MENU_XY[key][0] + 'px';
    b.style.top = MENU_XY[key][1] + 'px';
    pie.appendChild(b);
    UI.menuOps[key] = o;
  };
  m.ops.forEach((o, k) => slot(o, MENU_KEYS[k]));
  if (m.hit) slot(m.hit, 'hit');
  pie.hidden = false;
  UI.menuOpen = true;
  UI.menuAnchor = anchor || null;
  UI.menuX = x;
  UI.menuY = y;
  if (anchor && anchor.char && !anchor.char.isPlayer) holdForMenu(anchor.char);
  placeMenu(x, y);
}
function placeMenu(x, y) {
  const pie = $('#pie'),
    vw = window.innerWidth,
    vh = window.innerHeight,
    padX = 150 + 70,
    padY = 116 + 56;
  pie.style.left = clamp(x, Math.min(padX, vw / 2), Math.max(vw - padX, vw / 2)) + 'px';
  pie.style.top = clamp(y, Math.min(padY, vh / 2), Math.max(vh - padY, vh / 2)) + 'px';
}
// pick an option: locked ones say why and stay put
function runOpt(o, pointer) {
  if (!o) return;
  if (o.dis || !o.fn) {
    if (o.dis) {
      ui.note('lock', o.label + ' · ' + o.dis, '');
      audio.blip('click');
    }
    return;
  }
  closeMenu();
  audio.blip('click');
  UI.viaPointer = !!pointer;
  try {
    o.fn();
  } finally {
    UI.viaPointer = false;
  }
}
// one option: do it. Two to four (locked ones count): show the menu. Mouse controls: anyone you can hit has Attack too,
// unless the menu already has a blow on it, so even a one-option person opens a menu
function presentMenu(m, x, y, anchor, pointer) {
  if (!m || !m.ops || !m.ops.length || ARREST.on) return false;
  const n = anchor && anchor.char;
  if (n && mouseMode() && swingable(n) && !m.ops.some((o) => o.icon === 'fist' || o.label === 'Catch'))
    m.hit = opt('Attack', 'fist', () => attackChar(n));
  if (m.ops.length === 1 && !m.hit) {
    runOpt(m.ops[0], pointer);
    return true;
  }
  openMenu(m, x, y, anchor);
  return true;
}
function closeMenu() {
  $('#pie').hidden = true;
  UI.menuOpen = false;
  UI.menuAnchor = null;
  UI.menuOps = {};
  $('#tip').hidden = true;
}
