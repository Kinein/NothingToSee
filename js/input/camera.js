//@ input/camera — Input and camera control
//@ Defines: MENU_TYPES, BARE_SEATS, panBy, pickAt, dismissHints, handleClick, handleHover
//@ Uses:    gfx/renderer, ui/interface, sim/core, ui/menus, ui/pie-menu, taken/taken, sim/actions, core/util, world/vision, world/grid, …
//@ (header made by tools/map.js; stripped by build.py)
// ───────────────────────── input & camera control ─────────────────────────
const keys = {};
const swallowed = new Set();   // a key that just picked from a menu doesn't also walk you off until it's let go
const ptrs = new Map();
let drag = null, lastTap = { t: 0, x: 0, z: 0 };
const isTouch = () => matchMedia('(pointer: coarse)').matches;
const MENU_TYPES = new Set(['desk', 'bossdesk', 'pcdesk', 'shopcounter']);
const BARE_SEATS = new Set(['chair', 'armchair', 'chair_office', 'bench']);   // nothing to do with a seat on its own
const interactive = (o) => !o.t.flat && !(BARE_SEATS.has(o.type) && o.id !== 'chairA2' && o.id !== 'pcChair') && (SHAKE_TYPES.has(o.type) || ((o.t.kind !== 'deco' || MENU_TYPES.has(o.type)) && !(o.type === 'bed' && o.id !== 'homeBed') && o.id !== 'agnesRad' && o.id !== 'agnesChair' && o.id !== 'homeLock'));
const held = (k) => !!keys[k] && !swallowed.has(k);

function panBy(dxPx, dyPx) {
  const r = R.canvas.getBoundingClientRect();
  const wx = (dxPx / r.width) * 2 * cam.halfW, wy = (dyPx / r.height) * 2 * cam.halfH;
  let ux = cam.up[0], uz = cam.up[2]; const ul = Math.hypot(ux, uz) || 1; ux /= ul; uz /= ul;
  const k = 1 / Math.sin(cam.pitch);
  cam.tx += -cam.right[0] * wx + ux * wy * k;
  cam.tz += -cam.right[2] * wx + uz * wy * k;
  { const b = camBounds(); cam.tx = clamp(cam.tx, b[0], b[2]); cam.tz = clamp(cam.tz, b[1], b[3]); }
  cam.follow = false;
}
function pickAt(px, py) {
  const ray = screenRay(px, py);
  let best = null, bt = 1e9;
  for (const c of CHARS) {
    if (!c.onMap || c.shown < 0.5) continue;
    const lying = c.pose === 'lie' || c.pose === 'floorlie';
    const h = lying ? 0.9 : 1.9 * c.look.h, r = lying ? 0.7 : 0.36;
    const t = rayBox(ray, [c.x - r, c.y || 0, c.z - r], [c.x + r, (c.y || 0) + h, c.z + r]);
    if (t != null && t < bt) { bt = t; best = { char: c }; }
  }
  if (best) return best;
  const g = rayGround(ray);
  bt = (0 - ray.o[1]) / ray.d[1];
  best = { tile: [Math.floor(g[0]), Math.floor(g[1])], gx: g[0], gz: g[1] };
  for (const it of G.items) {
    if (it.kind === 'tape' || !explored[I(Math.floor(it.x), Math.floor(it.z))]) continue;
    const t = rayBox(ray, [it.x - 0.45, -0.01, it.z - 0.45], [it.x + 0.45, 0.2, it.z + 0.45]);
    if (t != null && t <= bt + 0.01) { bt = t - 0.02; best = { item: it }; }
  }
  for (const o of OBJ) {
    if (o.t.flat || !explored[I(Math.floor(o.cx), Math.floor(o.cz))]) continue;
    const h = o.t.ghost ? 2.2 : Math.min(o.t.h, o.t.thin ? 4.5 : 2.4);
    const t = rayBox(ray, [o.x + 0.06, 0, o.z + 0.06], [o.x + o.w - 0.06, h, o.z + o.h - 0.06]);
    if (t != null && t < bt) { bt = t; best = { obj: o }; }
  }
  return best;
}
function dismissHints() { if (!UI.hinted) { UI.hinted = true; const h = $('#hints'); if (h) h.classList.add('out'); } }
function handleClick(px, py) {
  if (UI.menuOpen) { closeMenu(); return; }
  if (!G || !G.started || G.over || UI.caseOpen || UI.cf || CAP.on) return;
  dismissHints();
  const p = pickAt(px, py);
  if (!p || p.tile) return;   // clicking the floor does nothing: you walk with the keys
  const far = () => ui.float(PLAYER, 'Too far', '');
  if (p.char) {
    const n = p.char;
    if (n.isPlayer) return presentMenu(menuForChar(n), px, py, { char: n }, true);
    if (!inReach(p)) return far();
    if (n.trueForm) { if (n.tell.t >= TF_CHANGE) playerMelee(n); else ui.note('lock', 'Attack · Changing', ''); return; }
    return presentMenu(menuForChar(n), px, py, { char: n }, true);
  }
  if (p.item) return inReach(p) ? presentMenu(menuForItem(p.item), px, py, { item: p.item }, true) : far();
  if (p.obj) {
    const m = interactive(p.obj) ? menuForObject(p.obj) : null;
    if (!m) return;
    if (!inReach(p)) return far();
    presentMenu(m, px, py, { obj: p.obj }, true);
  }
}
// out of its skin it's nobody you know: no name on it, wherever a name would show
const hidesName = (c) => !!(c && !c.isPlayer && (c.trueForm || (c.tell && c.tell.type === 'true')));
function handleHover(px, py) {
  if (CAP.on) return;
  const tip = $('#tip');
  R.hoverMesh = null; R.hoverChar = null;
  for (const c of CHARS) c.hover = false;
  if (!G || !G.started || G.over || UI.menuOpen || UI.caseOpen) { if (!tip.classList.contains('ui')) tip.hidden = true; return; }
  const p = pickAt(px, py);
  let text = null, cur = 'c-walk';
  if (p && p.char) { R.hoverChar = p.char; text = p.char.isPlayer ? p.char.name : hidesName(p.char) ? null : p.char.short; cur = 'c-act'; }
  else if (p && p.obj && interactive(p.obj)) { R.hoverMesh = p.obj.mesh || null; text = p.obj.name + (shakenFresh(p.obj) && p.obj.data.rattle > 0 ? ' · something in it' : p.obj.data.openUntil > G.t ? ' · opened up' : ''); cur = 'c-act'; }
  else if (p && p.item) { text = itemName(p.item); cur = 'c-act'; }
  R.canvas.className = UI.camMode ? 'c-cam' : cur;
  if (text) { tip.textContent = text; tip.hidden = false; tip.classList.remove('ui'); tip.style.transform = 'translate(' + (px + 16) + 'px,' + (py + 18) + 'px)'; }
  else if (!tip.classList.contains('ui')) tip.hidden = true;
}

