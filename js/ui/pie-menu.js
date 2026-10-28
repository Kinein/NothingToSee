//@ ui/pie-menu — The directional pie menu
//@ Defines: hearts, MENU_KEYS, MENU_XY, openMenu, placeMenu, runOpt, presentMenu, closeMenu
//@ Uses:    ui/interface, core/util, audio/sound, ui/menus, sim/actions, town/arrest
//@ (header made by tools/map.js; stripped by build.py)
// ───────────── pie menu
function hearts(rel) {
  const n = clamp(Math.round((rel + 50) / 20), 0, 5);
  let s = '';
  for (let i = 0; i < 5; i++) s += '<i class="' + (i < n ? 'on' : '') + '"></i>';
  return '<span class="hearts">' + s + '</span>';
}
// the directional menu: up to four actions on W A S D (or the mouse). Two sit left and right; a third goes on top; a fourth below.
// Slots fill in that order, so an action keeps its key as a menu grows: A, D, W, S.
const MENU_KEYS = ['a', 'd', 'w', 's'];
const MENU_XY = { a: [-150, 0], d: [150, 0], w: [0, -116], s: [0, 116] };
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
    (m.rel != null ? hearts(m.rel) : '') +
    (m.sus != null && m.sus >= 5
      ? '<span class="psus' +
        (m.sus >= 60 ? ' hi' : '') +
        '" data-tip="Suspicion of you">' +
        svgIcon('eye') +
        '<span><i style="width:' +
        Math.round(m.sus) +
        '%"></i></span></span>'
      : '') +
    (m.sub ? '<span class="psub"></span>' : '') +
    '</div>';
  if (m.img) pie.querySelector('img').src = m.img;
  pie.querySelector('.pc b').textContent = m.title;
  if (m.sub) pie.querySelector('.psub').textContent = m.sub;
  UI.menuOps = {};
  m.ops.forEach((o, k) => {
    const key = MENU_KEYS[k],
      b = document.createElement('button');
    b.className = 'po' + (o.dis ? ' dis' : '') + ' k-' + key;
    b.innerHTML =
      '<span class="pi">' +
      (o.dis ? svgIcon(o.icon || 'dots') : artIcon(o.icon)) +
      (o.dis ? '<s>' + svgIcon('lock') + '</s>' : '') +
      '<kbd>' +
      key.toUpperCase() +
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
  });
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
// one option: do it. Two to four (locked ones count): show the menu.
function presentMenu(m, x, y, anchor, pointer) {
  if (!m || !m.ops || !m.ops.length || ARREST.on) return false;
  if (m.ops.length === 1) {
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
