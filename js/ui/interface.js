//@ ui/interface — Notes, bubbles, tooltips, overlays
//@ Defines: ICON_PATHS, NEED_ART, ICON_NEED, BOLT_PATH, needArt, UI, RING_C, setRing, LAYOUT, layoutPush, layoutOverlays, headY, updateFx, updateActRing, playerActShown, actProgress, …
//@ Uses:    sim/core, gfx/renderer, world/grid, core/util, them/plan, gfx/frame, play/advice, audio/sound, ui/hud-images, ui/hud, …
//@ (header made by tools/map.js; stripped by build.py)
// ───────────────────────── interface ─────────────────────────
const ICON_PATHS = {
  food: 'M7 3v8M5 3v4a2 2 0 0 0 4 0V3M7 11v10M17 3c-2.5 2-2.5 7 0 9v9',
  cook: 'M3 11h12v2a5 5 0 0 1-5 5H8a5 5 0 0 1-5-5zM15 12h6M7 7c0-1.5 1.2-1.5 1.2-3M11 7c0-1.5 1.2-1.5 1.2-3',
  snack: 'M12 7.5c-1-1.8-4-2.3-5.8-.8C3.8 8.7 4.3 13.4 6.3 16.4c1.4 2.1 3.4 2.9 5.7 1.9 2.3 1 4.3.2 5.7-1.9 2-3 2.5-7.7.1-9.7-1.8-1.5-4.8-1-5.8.8zM12 7.5c0-2 .8-3.5 2.8-4.3',
  fridge: 'M6 3h12v18H6zM6 10h12M9 6v2M9 13v3',
  bed: 'M3 19V7M3 15h18v4M21 15v-2.5A2.5 2.5 0 0 0 18.5 10H11v5M7 13.2a1.6 1.6 0 1 0 0-.1',
  moon: 'M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z',
  bolt: 'M13 2L4.5 13.5H11L10 22l8.5-11.5H12z',
  toilet: 'M6 3h5v7H6zM4 10h15a6 6 0 0 1-6 6h-2l1 5H8l1-5',
  shower: 'M12 3c-3 5-6 8-6 11a6 6 0 0 0 12 0c0-3-3-6-6-11z',
  wash: 'M8 4c-1.6 2.6-3 4.2-3 6.2a3 3 0 0 0 6 0C11 8.2 9.6 6.6 8 4zM16 10c-1.6 2.6-3 4.2-3 6.2a3 3 0 0 0 6 0c0-2-1.4-3.6-3-6.2z',
  mirror: 'M12 3a5.5 7.5 0 1 0 0 15 5.5 7.5 0 1 0 0-15zM12 18v3M9 21h6M9.5 8.5l2-2',
  people: 'M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM3 20c0-3 3-5 6-5s6 2 6 5M16.5 11a2.5 2.5 0 1 0 0-5M17 15c2.2 0 4 1.6 4 4',
  chat: 'M4 5h16v11H10l-5 4v-4H4z',
  laugh: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM8 14c1 2 2.5 3 4 3s3-1 4-3M9 9.5v.01M15 9.5v.01',
  frown: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM8 17c1-2 2.5-3 4-3s3 1 4 3M9 9.5v.01M15 9.5v.01',
  ear: 'M7 10a5 5 0 1 1 10 0c0 3-2.5 4-3 6.5A3 3 0 0 1 9 18M10 10a2 2 0 1 1 4 0c0 1.2-1 1.8-1.8 2.4',
  eye: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
  nerve: 'M2 12h4l2-5 4 10 3-7 2 2h5',
  camera: 'M3 8h4l2-3h6l2 3h4v11H3zM12 17a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z',
  coffee: 'M4 9h12v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5zM16 10h2a2.5 2.5 0 0 1 0 5h-2M8 3v3M12 3v3',
  water: 'M6 3h12l-1.6 18H7.6zM6.6 9h10.8',
  work: 'M3 7h18v12H3zM8 7V4h8v3M3 12h18',
  print: 'M7 9V3h10v6M5 9h14v8H5zM7 14h10v7H7z',
  tv: 'M3 7h18v12H3zM8 3l4 4 4-4',
  phone: 'M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z',
  sick: 'M10 4a2 2 0 0 1 4 0v10a4 4 0 1 1-4 0zM12 9v8',
  cart: 'M3 4h3l2.5 11h10l2-8H7M9.5 20a1 1 0 1 0 0-.1M17.5 20a1 1 0 1 0 0-.1',
  coin: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 6.5v11M15 9.5c-.6-1-1.7-1.5-3-1.5-1.7 0-3 .9-3 2.2 0 3 6 1.7 6 4.6 0 1.3-1.3 2.2-3 2.2-1.4 0-2.6-.6-3.2-1.6',
  home: 'M3 11l9-7 9 7M5 9.5V20h14V9.5M10 20v-6h4v6',
  chair: 'M7 3v18M7 13h10v8M17 13V9',
  warm: 'M12 3c1 4 5 5.5 5 10a5 5 0 0 1-10 0c0-2.5 1.5-3.5 2.5-5 .5 1.5 1.5 2 2.5 2 0-3-1-5 0-7z',
  box: 'M3 8l9-4 9 4v9l-9 4-9-4zM3 8l9 4 9-4M12 12v9',
  trash: 'M4 7h16M9 7V4h6v3M6 7l1 14h10l1-14',
  bag: 'M6 8h12l-1 13H7zM9 8a3 3 0 0 1 6 0',
  mop: 'M12 3v11M7 14h10l1.5 7h-13z',
  knock: 'M7 3h10v18H7zM14 12h.01',
  mail: 'M3 6h18v12H3zM3 6l9 7 9-7',
  pc: 'M3 4h18v12H3zM8 20h8M12 16v4',
  publish: 'M12 16V4M7 9l5-5 5 5M4 20h16',
  dots: 'M6 12h.01M12 12h.01M18 12h.01',
  clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2',
  walk: 'M13 4a1.6 1.6 0 1 0 0-.1M10 21l2-6 3 3v3M9 11l3-3 3 3 3 1M12 8l-1 6',
  paper: 'M5 4h14v16H5zM8 8h8M8 12h8M8 16h5',
  can: 'M8 4h8v16H8zM8 7.5h8M8 16.5h8',
  foil: 'M4 19L12 4l8 15zM8 14h8',
  torch: 'M8 3h8l-1.5 6h-5zM9.5 9h5v12h-5zM12 13v2',
  gift: 'M4 11h16v3a7 7 0 0 1-16 0zM12 4v4M9 6.5L12 4l3 2.5',
  wave: 'M8 13V5.5a1.5 1.5 0 0 1 3 0V11M11 10V4a1.5 1.5 0 0 1 3 0v7M14 10.5V6a1.5 1.5 0 0 1 3 0v8.5a6.5 6.5 0 0 1-6.5 6.5h-.5a5.8 5.8 0 0 1-4.7-2.4l-2.6-3.8a1.5 1.5 0 0 1 2.4-1.8L8 15',
  lock: 'M6 11h12v10H6zM8 11V7a4 4 0 0 1 8 0v4',
  brain: 'M9.5 4A3 3 0 0 0 6.5 7a3 3 0 0 0-2 5 3 3 0 0 0 2.5 4.5A3 3 0 0 0 12 18V5.5A2.5 2.5 0 0 0 9.5 4zM14.5 4A3 3 0 0 1 17.5 7a3 3 0 0 1 2 5 3 3 0 0 1-2.5 4.5A3 3 0 0 1 12 18',
  board: 'M3 4h18v14H3zM8 21l4-3 4 3M8 9l7 3M8 9h.01M15 12h.01',
  alien: 'M12 3C7.5 3 4 6.5 4 11c0 5 5 10 8 10s8-5 8-10c0-4.5-3.5-8-8-8zM6.5 10.5c2 0 3.5 1.3 4 3-2.2.3-4-.8-4-3zM17.5 10.5c-2 0-3.5 1.3-4 3 2.2.3 4-.8 4-3z',
  lizard: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 6.5c-1.2 2-1.2 9 0 11 1.2-2 1.2-9 0-11z',
  skull: 'M12 3a8 8 0 0 0-8 8c0 3 1.5 5 3.5 6v4h9v-4c2-1 3.5-3 3.5-6a8 8 0 0 0-8-8zM9 11.5h.01M15 11.5h.01M10.5 21v-2.5M13.5 21v-2.5',
  question: 'M9 9a3 3 0 1 1 4.5 2.6c-1 .6-1.5 1.2-1.5 2.4M12 18v.01',
  exclaim: 'M12 4v10M12 19v.01',
  heart: 'M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.5-7 10-7 10z',
  weather: 'M7 18h10a4 4 0 0 0 0-8 6 6 0 0 0-11.5 1.5A3.5 3.5 0 0 0 7 18z',
  car: 'M3 15l2-6h14l2 6v4H3zM7 19v2M17 19v2M6.5 15h.01M17.5 15h.01',
  glyph: 'M5 6h6l-3 6h7M15 4v7l4 4M5 18l3-2 3 2 3-2 3 2',
  search: 'M10.5 17a6.5 6.5 0 1 0 0-13 6.5 6.5 0 0 0 0 13zM15.5 15.5L21 21',
  spark: 'M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5L18 18M18 6l-2.5 2.5M8.5 15.5L6 18',
  mouse: 'M7 9a5 5 0 0 1 10 0v6a5 5 0 0 1-10 0zM12 4v5M7 9h10',
  drag: 'M5 9l-3 3 3 3M19 9l3 3-3 3M9 5l3-3 3 3M9 19l3 3 3-3M2 12h20M12 2v20',
  pause: 'M8 5v14M16 5v14', play: 'M7 5l12 7-12 7z', ff: 'M4 6l8 6-8 6zM12 6l8 6-8 6zM12 6v12', fff: 'M2 6l6 6-6 6zM9 6l6 6-6 6zM16 6l6 6-6 6z',
  walls: 'M3 20V9l6-4v15M9 20V5l12 4v11M3 20h18', sound: 'M4 9h4l5-4v14l-5-4H4zM17 9a4 4 0 0 1 0 6', mute: 'M4 9h4l5-4v14l-5-4H4zM17 9l4 6M21 9l-4 6',
  help: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.3-1 .9-1 1.7M12 17v.01', target: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
  x: 'M6 6l12 12M18 6L6 18', rot: 'M4 12a8 8 0 0 1 14-5.3M20 4v4h-4M20 12a8 8 0 0 1-14 5.3M4 20v-4h4',
};
ICON_PATHS.money = ICON_PATHS.coin;
ICON_PATHS.confront = 'M3 10v4h3l7 4V6L6 10zM16.5 9.5a3.5 3.5 0 0 1 0 5M19 7a7 7 0 0 1 0 10';
ICON_PATHS.fist = 'M7 11V7.5a1.8 1.8 0 0 1 3.6 0V11M10.6 10V6.5a1.8 1.8 0 0 1 3.6 0V10M14.2 10.5V7.5a1.8 1.8 0 0 1 3.6 0v6A7.5 7.5 0 0 1 10.3 21h-.6A5.7 5.7 0 0 1 4 15.3V13a2 2 0 0 1 3-1.7';
ICON_PATHS.plus = 'M9.5 3.5h5v6h6v5h-6v6h-5v-6h-6v-5h6z';
ICON_PATHS.badge = 'M12 3l7 3v5c0 5-3 8.3-7 10-4-1.7-7-5-7-10V6zM9 12l2 2 4-4';
ICON_PATHS.shake = 'M8 4h8v16H8zM4 8l-2 4 2 4M20 8l2 4-2 4M11 16h2';
ICON_PATHS.clip = 'M8.5 12.5l6-6a2.8 2.8 0 0 1 4 4l-8 8a4.8 4.8 0 0 1-6.8-6.8l7.3-7.3';
ICON_PATHS.trap = 'M3 17h18M5 17l1.5-6 2 4 2-6 1.5 5 1.5-5 2 6 2-4L19 17M12 17v3';
ICON_PATHS.pill = 'M10.5 20.5a5 5 0 0 1-7-7l6-6a5 5 0 0 1 7 7zM7.5 10.5l6 6';
ICON_PATHS.flag = 'M5 21V4M5 4h12l-2.5 4 2.5 4H5';
ICON_PATHS.smell = 'M7 20c-2-3 2-5 0-8s2-5 0-8M12 20c-2-3 2-5 0-8s2-5 0-8M17 20c-2-3 2-5 0-8s2-5 0-8';
ICON_PATHS.crowbar = 'M5 20L17 5c.8-1 2.6-1.2 3 .2.3 1-.4 1.6-1.2 1.4M5 20l-1.5-1.2';
// a need's own picture, wherever something fills it: the goal glow, the dial over your head, a thought, a menu choice.
// The HUD's raster art where the pack has it; energy has none yet, so its bolt is drawn to match.
const NEED_ART = { hunger: 'hunger', bladder: 'toilet', health: 'health', work: 'work' };
const ICON_NEED = { food: 'hunger', snack: 'hunger', cook: 'hunger', fridge: 'hunger', toilet: 'bladder', bolt: 'energy', bed: 'energy', moon: 'energy', coffee: 'energy', nerve: 'stress', tv: 'stress', warm: 'stress', shower: 'stress', plus: 'health', work: 'work' };
const BOLT_PATH = 'M13.6 2 4.8 13.4h6.4L9.9 22l9.3-11.6h-6.5z';
function needArt(k) {
  if (NEED_ART[k]) return '<img class="na" alt="" src="' + HUD_IMG[NEED_ART[k]] + '">';
  if (k === 'energy') return '<svg class="ic na" viewBox="0 0 24 24" aria-hidden="true"><path d="' + BOLT_PATH + '"/></svg>';
  if (k === 'stress') return psySvg('na');
  return null;
}
const artIcon = (icon, need) => needArt(need || ICON_NEED[icon]) || svgIcon(icon || 'dots');
const svgIcon = (k, cls = '') => '<svg class="ic ' + cls + '" viewBox="0 0 24 24" aria-hidden="true"><path d="' + (ICON_PATHS[k] || ICON_PATHS.dots) + '"/></svg>';
const $ = (s) => document.querySelector(s);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const UI = { walkMark: null, bubbles: [], floats: [], says: [], pings: [], hudT: 0, trend: {}, lastNeeds: null, menuOpen: false, sound: true, caseOpen: false, goalEl: null, heatPulse: 0, hinted: false };
const RING_C = 2 * Math.PI * 18;
const ringSvg = (cls) => '<svg class="ring ' + (cls || '') + '" viewBox="0 0 44 44" aria-hidden="true"><circle class="trk" cx="22" cy="22" r="18"/><circle class="val" cx="22" cy="22" r="18" stroke-dasharray="' + RING_C.toFixed(1) + '" stroke-dashoffset="0"/></svg>';
function setRing(el, v) { const c = el.querySelector('.val'); if (c) c.setAttribute('stroke-dashoffset', (RING_C * (1 - clamp(v, 0, 1))).toFixed(1)); }

const ui = {
  note(icon, text, kind) {
    const box = $('#notes'); if (!box) return;
    for (const el of [...box.children]) if (el.dataset.t === text) el.remove();
    const el = document.createElement('div');
    el.className = 'note ' + (kind || ''); el.dataset.t = text;
    el.innerHTML = svgIcon(icon) + '<span></span>';
    el.querySelector('span').textContent = text;
    box.prepend(el);
    while (box.children.length > 3) box.lastChild.remove();
    setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 450); }, kind === 'bad' || kind === 'onto' ? 4600 : 3400);
  },
  card(o) {
    const box = $('#cards'); if (!box || !(o.char || o.title)) return;
    const el = document.createElement('div');
    el.className = 'pcard' + (o.strong ? ' strong' : '') + (o.gone ? ' gone' : '') + (o.cleared ? ' cleared' : '') + (o.stamp === 'NOTHING' || o.stamp === 'BLURRED' ? ' nothing' : '') + (!o.char ? ' bare' : '');
    el.style.setProperty('--tilt', (Math.random() * 6 - 3).toFixed(1) + 'deg');
    el.innerHTML = '<div class="pol"><img alt=""><span class="stamp"></span></div><div class="pc-meta"><b></b><span class="evb"><i class="was"></i><i class="now"></i></span></div>';
    el.querySelector('img').src = o.img || getPortrait(o.char);
    el.querySelector('.stamp').textContent = o.stamp || '';
    el.querySelector('b').textContent = o.title || o.char.short + (o.extra > 0 ? ' +' + o.extra : '');
    el.querySelector('.was').style.width = clamp(o.before || 0, 0, 100) + '%';
    el.querySelector('.now').style.width = clamp(o.before || 0, 0, 100) + '%';
    el.onclick = () => { el.remove(); openBoard(o.char ? o.char.id : null); };
    box.prepend(el);
    while (box.children.length > 2) box.lastChild.remove();
    requestAnimationFrame(() => requestAnimationFrame(() => { el.querySelector('.now').style.width = clamp(o.after || 0, 0, 100) + '%'; }));
    setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 600); }, 6200);
    R.pulse = o.gone ? 0.4 : 1;
  },
  almost() {
    const el = $('#almost'); if (!el) return;
    const w = el.querySelector('.wf'), r = el.querySelector('.wr');
    if (!w.innerHTML) { w.innerHTML = svgIcon('fist'); r.innerHTML = svgIcon('out'); }
    $('#daycard').hidden = true; UI.dayT = null;
    G.dayShown = dayNo();
    el.hidden = false; el.style.opacity = 0; UI.almostT = 0;
  },
  reveal(F) {
    const el = $('#reveal'); if (!el) return;
    el.innerHTML = '<span class="rv-ic">' + svgIcon(F.icon) + '</span><b></b>';
    el.querySelector('b').textContent = F.label;
    el.hidden = false; el.classList.remove('out'); void el.offsetWidth; el.classList.add('in');
    if (UI.dayT != null) { $('#daycard').hidden = true; UI.dayT = null; }
    setTimeout(() => { el.classList.add('out'); setTimeout(() => { el.hidden = true; el.classList.remove('in', 'out'); }, 700); }, 3000);
    R.pulse = 1;
  },
  say(c, text, secs) {
    if (!c || !c.onMap) return;
    const old = UI.says.find((s) => s.c === c); if (old) { old.el.remove(); UI.says.splice(UI.says.indexOf(old), 1); }
    const el = document.createElement('div'); el.className = 'say'; el.innerHTML = '<i class="si"></i><span></span>';
    el.querySelector('span').textContent = text;
    const b = UI.bubbles.find((bb) => bb.c === c); if (b) el.querySelector('.si').innerHTML = b.el.innerHTML;   // whatever face they were pulling goes in with the words
    $('#fx').appendChild(el);
    UI.says.push({ el, c, t: 0, life: secs || 3 });
  },
  bubble(c, icon, kind, secs) {
    if (!c || !c.onMap) return;
    const old = UI.bubbles.find((b) => b.c === c); if (old) { old.el.remove(); UI.bubbles.splice(UI.bubbles.indexOf(old), 1); }
    const el = document.createElement('div'); el.className = 'bub ' + (kind || 'speech');
    el.innerHTML = c.isPlayer ? artIcon(icon) : svgIcon(icon);
    $('#fx').appendChild(el);
    UI.bubbles.push({ el, c, t: 0, life: secs || 2 });
  },
  float(c, text, cls) {
    if (!c || !c.onMap) return;
    const el = document.createElement('div'); el.className = 'float ' + (cls || ''); el.textContent = text;
    $('#fx').appendChild(el);
    UI.floats.push({ el, c, t: 0, off: UI.floats.filter((f) => f.c === c).length * 18 });
  },
  ping(x, z) {
    const el = document.createElement('div'); el.className = 'ping';
    el.innerHTML = '<i></i><i></i>' + svgIcon('ear');
    $('#fx').appendChild(el);
    UI.pings.push({ el, x, z, t: 0, life: 7 });
  },
  flash() { R.flash = 1; },
  dayCard() {
    if (!G || !G.started) return;
    G.dayShown = dayNo();
    if (phaseNow() === WEEK && !G.loose) return;   // Friday: THEY ALMOST WIN says it, the moment you're up
    const el = $('#daycard'); if (!el) return;
    el.querySelector('b').textContent = DOW_LONG[dow()];
    const ph = phaseNow();
    const cd = calDate();
    el.querySelector('span').textContent = MONTHS[cd.getUTCMonth()] + ' ' + cd.getUTCDate() + ' · ' + (ph < WEEK ? (WEEK - ph + 1) + ' days left' : ph === WEEK ? 'last day' : 'too late');
    el.hidden = false; UI.dayT = 0; el.style.opacity = 0;
  },
};

// nothing floating over the town covers anything else: each frame everything is laid out together, most important first,
// and whatever would sit on top of something already placed is lifted clear above it
const LAYOUT = [];
function layoutPush(el, x, y, ax, ay, prio) { LAYOUT.push({ el, x, y, ax, ay, prio }); }
function layoutOverlays() {
  const items = LAYOUT.splice(0).filter((it) => !it.el.hidden && it.el.isConnected);
  items.sort((a, b) => b.prio - a.prio);
  const placed = [], gap = 5;
  for (const it of items) {
    const w = it.el.offsetWidth, h = it.el.offsetHeight;
    const l = it.x - it.ax * w;
    let t = it.y - it.ay * h;
    if (!(parseFloat(it.el.style.opacity) < 0.05)) {   // a faded-out bubble takes up no room
      for (let pass = 0; pass < 8; pass++) {
        let hit = null;
        for (const p of placed) if (l < p.r + gap && l + w > p.l - gap && t < p.b + gap && t + h > p.t - gap) { hit = p; break; }
        if (!hit) break;
        t = hit.t - gap - h;
      }
      placed.push({ l, t, r: l + w, b: t + h });
    }
    it.el.style.transform = 'translate(' + l.toFixed(1) + 'px,' + t.toFixed(1) + 'px)';
  }
}
function headY(c) { return (c.y || 0) + c.J.rootY + (c.J.float || 0) + (c.pose === 'lie' || c.pose === 'floorlie' ? 0.9 : 1.95 * c.look.h); }
function updateFx(dtReal) {
  for (let i = UI.bubbles.length - 1; i >= 0; i--) {
    const b = UI.bubbles[i]; b.t += dtReal;
    if (b.t > b.life || !b.c.onMap) { b.el.remove(); UI.bubbles.splice(i, 1); continue; }
    const s = UI.says.find((ss) => ss.c === b.c);
    if (s) {   // they're talking: the icon rides inside the words instead of floating over them
      const si = s.el.querySelector('.si'); if (si.innerHTML !== b.el.innerHTML) si.innerHTML = b.el.innerHTML;
      b.el.style.opacity = '0'; b.el.hidden = true; continue;
    }
    b.el.hidden = false;
    const [x, y] = project(b.c.x, headY(b.c) + 0.25, b.c.z);
    b.el.style.opacity = b.c.shown > 0.5 ? Math.min(1, (b.life - b.t) * 3, b.t * 8).toFixed(3) : '0';
    layoutPush(b.el, x, y - 6, 0.5, 1, b.c.isPlayer ? 75 : 70);
  }
  for (let i = UI.says.length - 1; i >= 0; i--) {
    const s = UI.says[i]; s.t += dtReal;
    if (s.t > s.life || !s.c.onMap) { s.el.remove(); UI.says.splice(i, 1); continue; }
    const [x, y] = project(s.c.x, headY(s.c) + 0.3, s.c.z);
    s.el.style.opacity = s.c.shown > 0.4 ? Math.min(1, (s.life - s.t) * 3, s.t * 6).toFixed(3) : '0';
    layoutPush(s.el, x, y - 12, 0.5, 1, s.c.isPlayer ? 85 : 80);
  }
  for (let i = UI.floats.length - 1; i >= 0; i--) {
    const f = UI.floats[i]; f.t += dtReal;
    if (f.t > 2.2) { f.el.remove(); UI.floats.splice(i, 1); continue; }
    const [x, y] = project(f.c.x, headY(f.c), f.c.z);
    f.el.style.transform = 'translate(' + x + 'px,' + (y - 20 - f.off - f.t * 26) + 'px) translateX(-50%)';
    f.el.style.opacity = Math.min(1, (2.2 - f.t) * 2) * (f.c.shown > 0.5 ? 1 : 0);
  }
  for (let i = UI.pings.length - 1; i >= 0; i--) {
    const p = UI.pings[i]; p.t += dtReal;
    if (p.t > p.life) { p.el.remove(); UI.pings.splice(i, 1); continue; }
    const [x, y] = project(p.x, 1.2, p.z);
    p.el.style.transform = 'translate(' + x + 'px,' + y + 'px)';
    p.el.style.opacity = Math.min(1, (p.life - p.t) * 0.8, p.t * 4);
  }
  if (UI.walkMark) { UI.walkMark.t += dtReal * 1.6; if (UI.walkMark.t > 1) UI.walkMark = null; }
  if (CAP.on) { if (UI.actEl) UI.actEl.hidden = true; if (UI.goalEl) UI.goalEl.hidden = true; R.goalObj = R.goalChar = null; }
  else { updateActRing(); updateGoal(); }
  layoutOverlays();
  if (UI.menuOpen && UI.menuAnchor) { const xy = anchorXY(UI.menuAnchor); if (xy) placeMenu(xy[0], xy[1]); }   // the menu rides along with whoever it's about
  if (UI.aim && UI.aim.c.onMap && PLAYER.onMap) {
    if (!UI.aimEl) { UI.aimEl = document.createElement('div'); UI.aimEl.className = 'aim'; UI.aimEl.innerHTML = '<i></i>'; $('#fx').appendChild(UI.aimEl); }
    const [x, y] = project(PLAYER.x, 1.3, PLAYER.z); UI.aimEl.hidden = false; UI.aimEl.style.transform = 'translate(' + x + 'px,' + y + 'px)';
  } else if (UI.aimEl) UI.aimEl.hidden = true;
  if (UI.dayT != null) {
    UI.dayT += dtReal; const t = UI.dayT, el = $('#daycard');
    const a = t < 0.5 ? t / 0.5 : t < 2.2 ? 1 : Math.max(0, 1 - (t - 2.2) / 0.7);
    el.style.opacity = a.toFixed(3); el.style.transform = 'translate(-50%,' + (-50 + Math.max(0, 0.5 - t) * 20).toFixed(1) + '%)';
    if (t > 2.9) { el.hidden = true; UI.dayT = null; }
  }
  if (UI.almostT != null) {
    UI.almostT += dtReal; const t = UI.almostT, el = $('#almost');
    const a = t < 0.7 ? t / 0.7 : t < 6.4 ? 1 : Math.max(0, 1 - (t - 6.4) / 0.9);
    el.style.opacity = a.toFixed(3); el.style.transform = 'translate(-50%,' + (-50 + Math.max(0, 0.7 - t) * 18).toFixed(1) + '%)';
    if (t > 7.3 || (G && G.over)) { el.hidden = true; UI.almostT = null; }
  }
}
// the current action as a dial beside your head: how far along it is, and a click to stop it
function updateActRing() {
  let el = UI.actEl;
  if (!el) {
    el = UI.actEl = document.createElement('button'); el.className = 'actring'; el.setAttribute('aria-label', 'Stop');
    el.innerHTML = '<span class="ai"></span><span class="ab"><b></b></span><span class="qx">' + svgIcon('x') + '</span>';
    $('#fx').appendChild(el);
    el.addEventListener('pointerdown', (e) => e.stopPropagation());
    el.onclick = (e) => { e.stopPropagation(); const a = PLAYER.queue[0]; if (a && a.interruptible !== false) { cancelAll(PLAYER); audio.blip('click'); } };
  }
  const a = playerActShown();
  if (!a) { el.hidden = true; return; }
  el.hidden = false;
  const aic = (a.need || '') + ':' + a.icon;
  if (el.dataset.ic !== aic) { el.dataset.ic = aic; el.querySelector('.ai').innerHTML = artIcon(a.icon, a.need && !a.work ? a.need : a.work ? 'work' : null); }
  const tip = a.label + (a.auto ? ' · free will' : '') + (a.interruptible !== false ? ' · click or walk to stop' : '');
  if (el.dataset.tip !== tip) el.dataset.tip = tip;
  const p = actProgress(a);
  el.classList.toggle('open', p == null);
  const pv = ((p == null ? 0 : clamp(p, 0, 1)) * 100).toFixed(1) + '%'; if (el.dataset.p !== pv) { el.dataset.p = pv; el.style.setProperty('--p', pv); }
  const [x, y] = project(PLAYER.x, headY(PLAYER) + 0.3, PLAYER.z);
  layoutPush(el, x, y - 14, 0.5, 1, 100);
}
// what you're doing right now, if it's worth showing
function playerActShown() {
  const P = PLAYER, a = G && G.started && !G.over && P.onMap && !G.away && !G.sleeping && !UI.caseOpen ? P.queue[0] : null;
  return a && !a.swing && !a.photo && (a.stage === 'run' || a.stage === 'enter' || a.stage === 'move' || a.waitT > 0) ? a : null;
}
// how far along: by the clock when it has a length, by the end of the shift at your desk, by how much better you feel
// when it's for a need. Nothing to measure (a chase): null, and the dial shows the icon alone.
function actProgress(a) {
  if (a.stage !== 'run') return 0;
  if (a.dur != null && a.dur > 0) return clamp(a.t / a.dur, 0, 1);
  if (a.work) { const end = Math.floor(G.t / 1440) * 1440 + 17 * 60; if (a.g0 == null) a.g0 = G.t; return clamp((G.t - a.g0) / Math.max(1, end - a.g0), 0, 1); }
  if (a.need === 'stress') { const st = PLAYER.needs.stress; if (a.n0 == null) a.n0 = Math.max(st, 1); return clamp(1 - st / a.n0, 0, 1); }
  if (a.need === 'energy') return clamp(PLAYER.needs.energy / 100, 0, 1);
  return null;
}
function updateGoal() {
  const g = G && G.started && !G.over && !UI.caseOpen && !UI.menuOpen && !ARREST.on && !G.away ? currentGoal() : null;
  R.goalObj = g ? g.obj : null; R.goalChar = g ? g.char : null;
  let el = UI.goalEl;
  if (!el) {
    el = UI.goalEl = document.createElement('button');
    el.className = 'goal'; el.setAttribute('aria-label', 'Do this next');
    el.innerHTML = '<span class="gr"></span><span class="gi"></span><span class="ga"></span><i class="gx"></i>';
    $('#fx').appendChild(el);
    el.addEventListener('pointerdown', (e) => e.stopPropagation());
    el.onclick = (e) => { e.stopPropagation(); const gg = UI.goalShown; const f = gg && goalAct(gg); if (f) { f(); goalCache.t = -1; audio.blip('click'); } };
  }
  UI.goalShown = g;
  if (!g) { el.hidden = true; return; }
  el.hidden = false;
  const gn = g.need || (g.work ? 'work' : g.sleep ? 'energy' : null), gic = (gn || '') + ':' + g.icon;
  if (el.dataset.ic !== gic) { el.dataset.ic = gic; el.querySelector('.gi').innerHTML = artIcon(g.icon, gn); }
  el.classList.toggle('urgent', !!g.urgent);
  let wx, wy, wz;
  if (g.at) { wx = g.at[0] + 0.5; wz = g.at[1] + 0.5; wy = 1.5; }
  else if (g.obj) { wx = g.obj.cx; wz = g.obj.cz; wy = Math.min(g.obj.t.h, 2.1) + 0.6; }
  else { const c = g.char || PLAYER; wx = c.x; wz = c.z; wy = headY(c) + 0.75; }
  const [sx, sy] = project(wx, wy, wz);
  const r = R.canvas.getBoundingClientRect(), pad = 30, top = pad + 50, bottom = r.height - 50;
  const inside = sx > pad && sx < r.width - pad && sy > top && sy < bottom;
  if (inside) { el.classList.remove('off'); layoutPush(el, sx, sy, 0.5, 0.5, 60); }
  else {
    const cx = r.width / 2, cy = (top + bottom) / 2, dx = sx - cx, dy = sy - cy;
    const k = Math.min((r.width / 2 - pad) / Math.max(Math.abs(dx), 1e-3), (bottom - top) / 2 / Math.max(Math.abs(dy), 1e-3));
    let px = cx + dx * k, py = cy + dy * k;
    for (const L of [UI.hudL, UI.hudR]) if (L && px > L.left - 26 && px < L.right + 26 && py < L.bottom + 26) {   // never under the corner HUD
      if (Math.abs(dy) > Math.abs(dx)) py = L.bottom + 28;
      else px = L === UI.hudR ? L.left - 28 : L.right + 28;
    }
    el.classList.add('off');
    el.style.transform = 'translate(' + (px - 22) + 'px,' + (py - 22) + 'px)';
    el.querySelector('.ga').style.transform = 'rotate(' + Math.atan2(dy, dx) + 'rad)';
  }
}

