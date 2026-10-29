//@ input/targeting — What E acts on; keyboard handling
//@ Defines: DEG, wallBetween, menuForFocus, pickFocus, updateFocus, anchorXY, interact, initInput
//@ Uses:    input/camera, ui/interface, sim/core, gfx/renderer, data/tuning, ui/pie-menu, core/util, ui/case-board, chase/hunt, world/grid, …
//@ (header made by tools/map.js; stripped by build.py)
// ───────────── what E would act on: the nearest thing you're roughly facing. Forgiving, and sticky once picked.
const DEG = Math.PI / 180;
function wallBetween(ax, az, bx, bz) {
  const d = Math.hypot(bx - ax, bz - az),
    n = Math.ceil(d / 0.2);
  for (let i = 1; i < n; i++) {
    const x = Math.floor(ax + ((bx - ax) * i) / n),
      z = Math.floor(az + ((bz - az) * i) / n);
    if (!inb(x, z)) return true;
    const t = tiles[I(x, z)];
    if (t === '#' || t === 'W') return true;
    if ((t === 'L' || t === 'D') && !walkable(x, z, PLAYER)) return true;
  }
  return false;
}
function menuForFocus(f) {
  if (f.char) return menuForChar(f.char);
  if (f.obj) return menuForObject(f.obj);
  if (f.item) return menuForItem(f.item);
  return null;
}
function pickFocus() {
  const P = PLAYER;
  if (
    !P.onMap ||
    G.away ||
    UI.scene ||
    ARREST.on ||
    FRI.hold ||
    (HUNT.on && (HUNT.grab || HUNT.down || HUNT.climb || HUNT.spot))
  )
    return null;
  const cur = UI.focus,
    face = P.tdir,
    out = [];
  const consider = (f, x, z, d, reach, a) => {
    const same = cur && (cur.char || cur.obj || cur.item) === (f.char || f.obj || f.item);
    const ok =
      (d <= reach && (a <= CTRL.facing * DEG || d <= CTRL.close)) ||
      (same && d <= reach + CTRL.holdDist && (a <= CTRL.holdFacing * DEG || d <= CTRL.close));
    if (!ok || wallBetween(P.x, P.z, x, z)) return;
    f.score = d + a * 1.1 - (same ? 0.45 : 0) - (f.char ? 0.15 : 0) - (f.char && f.char.riteBy ? 0.7 : 0); // someone in ITS grip comes first: E pulls them out, not a swing at it
    out.push(f);
  };
  const angTo = (x, z) => Math.abs(angDiff(face, Math.atan2(x - P.x, z - P.z)));
  for (const n of CHARS) {
    if (n.isPlayer || !n.onMap || n.shown < 0.5 || n.under) continue;
    const d = Math.hypot(n.x - P.x, n.z - P.z);
    if (d > CTRL.reachChar + CTRL.holdDist) continue;
    consider(
      { char: n },
      n.x,
      n.z,
      d,
      CTRL.reachChar + (n.riteBy ? 0.6 : 0) + (n.fleeing && !n.def.stranger ? 1.0 : 0),
      angTo(n.x, n.z),
    );
  }
  for (const o of OBJ) {
    if (Math.abs(o.cx - P.x) > 5 || Math.abs(o.cz - P.z) > 5 || !interactive(o) || HUNT.on || o.wrecked) continue; // while THEY're after you, nothing to fiddle with
    const qx = clamp(P.x, o.x, o.x + o.w),
      qz = clamp(P.z, o.z, o.z + o.h),
      d = Math.hypot(qx - P.x, qz - P.z);
    if (d > CTRL.reachObj + CTRL.holdDist) continue;
    const ex = clamp(qx, o.x + 0.05, o.x + o.w - 0.05),
      ez = clamp(qz, o.z + 0.05, o.z + o.h - 0.05); // just inside its edge, so the wall check doesn't hit the wall it stands against
    consider({ obj: o }, ex, ez, d, CTRL.reachObj, Math.min(angTo(qx, qz), angTo(o.cx, o.cz)));
  }
  for (const it of G.items) {
    if (it.kind === 'tape') continue;
    const d = Math.hypot(it.x - P.x, it.z - P.z);
    if (d > CTRL.reachItem + CTRL.holdDist) continue;
    consider({ item: it }, it.x, it.z, d, CTRL.reachItem, angTo(it.x, it.z));
  }
  out.sort((a, b) => a.score - b.score);
  for (const f of out) {
    const m = menuForFocus(f);
    if (m && m.ops && m.ops.length) {
      f.menu = m;
      return f;
    }
  }
  return null;
}
function updateFocus(dtReal) {
  UI.focusT = (UI.focusT || 0) - dtReal;
  const live = G && G.started && !G.over && !UI.caseOpen && !UI.cf && PLAYER.onMap && !G.away && !G.sleeping;
  if (!live) UI.focus = null;
  else if (!UI.menuOpen && UI.focusT <= 0) {
    UI.focusT = 0.1;
    UI.focus = pickFocus();
  }
  const f = UI.menuOpen ? null : UI.focus;
  R.focusChar = f && f.char ? f.char : null;
  R.focusMesh = f && f.obj ? f.obj.mesh || null : null;
  // the prompt: the key, and either the one thing it does or whose menu it opens
  let el = UI.promptEl;
  if (!el) {
    el = UI.promptEl = document.createElement('div');
    el.className = 'prompt';
    el.innerHTML = '<kbd>E</kbd><span></span>';
    $('#fx').appendChild(el);
  }
  if (!f || !f.menu || playerActShown()) {
    el.hidden = true;
    return;
  } // busy: the dial over your head says what you're doing
  const m = f.menu,
    one = m.ops.length === 1 ? m.ops[0] : null;
  const label = one
    ? one.label + (one.dis ? ' · ' + one.dis : '')
    : f.char && !hidesName(f.char)
      ? f.char.short || m.title
      : m.title;
  if (el.dataset.l !== label) {
    el.dataset.l = label;
    el.querySelector('span').textContent = label;
  }
  el.classList.toggle('dis', !!(one && one.dis));
  el.classList.toggle('hit', !!(f.char && f.char.trueForm));
  let wx, wy, wz;
  if (f.char) {
    wx = f.char.x;
    wz = f.char.z;
    wy = headY(f.char) + 0.55;
  } else if (f.obj) {
    wx = f.obj.cx;
    wz = f.obj.cz;
    wy = Math.min(f.obj.t.h, 2.1) + 0.35;
  } else {
    wx = f.item.x;
    wz = f.item.z;
    wy = 0.6;
  }
  const [x, y] = project(wx, wy, wz);
  el.hidden = false;
  layoutPush(el, x, y, 0.5, 1, 90);
}
function anchorXY(an) {
  if (an.char) return project(an.char.x, headY(an.char) * 0.6, an.char.z);
  if (an.obj) return project(an.obj.cx, Math.min(an.obj.t.h, 2) * 0.6, an.obj.cz);
  if (an.item) return project(an.item.x, 0.3, an.item.z);
  return null;
}
// E / Space
function interact() {
  if (!G || !G.started || G.over || UI.caseOpen || UI.scene || UI.cf || !PLAYER.onMap || G.away || ARREST.on) return;
  if (huntKey()) return; // tear free, get up, climb out
  if (UI.menuOpen) {
    closeMenu();
    return;
  }
  dismissHints();
  const f = pickFocus();
  UI.focus = f;
  UI.focusT = 0.1;
  if (!f) return;
  if (f.char && f.char.trueForm && f.menu.ops.length === 1) return runOpt(f.menu.ops[0]); // its true form: the key is the blow
  if (f.char && f.char.thrall && G.loose) return playerMelee(f.char); // one of THEIRS today: the key is the blow
  if (f.char && f.char.fleeing && !f.char.def.stranger) return playerMelee(f.char); // running from you: the key is the tackle
  const an = { char: f.char, obj: f.obj, item: f.item },
    xy = anchorXY(an) || [window.innerWidth / 2, window.innerHeight / 2];
  presentMenu(menuForFocus(f), xy[0], xy[1], an, false);
}

function initInput() {
  const cv = R.canvas;
  const mid = () => {
    const a = [...ptrs.values()];
    return [(a[0].x + a[1].x) / 2, (a[0].y + a[1].y) / 2];
  };
  const dist = () => {
    const a = [...ptrs.values()];
    return Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y);
  };
  cv.addEventListener('pointerdown', (e) => {
    audio.init();
    cv.setPointerCapture(e.pointerId);
    ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (ptrs.size === 1)
      drag = { moved: false, btn: e.button, x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY };
    else if (ptrs.size === 2) drag = { pinch: true, d: dist(), m: mid(), moved: true };
  });
  cv.addEventListener('pointermove', (e) => {
    if (!ptrs.has(e.pointerId)) {
      if (e.pointerType === 'mouse') handleHover(e.clientX, e.clientY);
      return;
    }
    ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (!drag) return;
    if (drag.pinch && ptrs.size === 2) {
      const d = dist(),
        m = mid();
      cam.zoomT = clamp(cam.zoomT * (drag.d / Math.max(10, d)), 2.7, 18);
      cam.zoom = cam.zoomT;
      panBy(m[0] - drag.m[0], m[1] - drag.m[1]);
      drag.d = d;
      drag.m = m;
      return;
    }
    const dx = e.clientX - drag.x,
      dy = e.clientY - drag.y;
    if (!drag.moved && Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) > (e.pointerType === 'touch' ? 10 : 6))
      drag.moved = true;
    if (drag.moved) {
      panBy(dx, dy);
      if (UI.menuOpen) closeMenu();
    }
    drag.x = e.clientX;
    drag.y = e.clientY;
  });
  const up = (e) => {
    const had = ptrs.has(e.pointerId);
    ptrs.delete(e.pointerId);
    if (!had || !drag) return;
    if (!drag.moved && !drag.pinch && drag.btn === 0 && e.type === 'pointerup') handleClick(e.clientX, e.clientY);
    if (!drag.moved && drag.btn === 2 && UI.menuOpen) closeMenu();
    if (ptrs.size === 0) drag = null;
    else if (drag.pinch) {
      const v = [...ptrs.values()][0];
      drag = { moved: true, x: v.x, y: v.y };
    }
  };
  cv.addEventListener('pointerup', up);
  cv.addEventListener('pointercancel', up);
  cv.addEventListener(
    'wheel',
    (e) => {
      e.preventDefault();
      cam.zoomT = clamp(cam.zoomT * Math.exp(e.deltaY * 0.0011), 2.7, 18);
      if (UI.menuOpen) closeMenu();
    },
    { passive: false },
  );
  cv.addEventListener('contextmenu', (e) => e.preventDefault());
  cv.addEventListener('pointerleave', () => {
    if (!$('#tip').classList.contains('ui')) $('#tip').hidden = true;
    R.hoverMesh = null;
    R.hoverChar = null;
  });
  $('#pie').addEventListener('pointerdown', (e) => {
    if (e.target === $('#pie') || e.target.closest('.pc')) closeMenu();
  });
  const DIRK = { w: 'w', arrowup: 'w', a: 'a', arrowleft: 'a', s: 's', arrowdown: 's', d: 'd', arrowright: 'd' };
  window.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT') {
      if (e.key === 'Enter') $('#begin').click();
      return;
    }
    const kk = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    keys[kk] = true;
    if (e.key === 'Shift') keys.Shift = true;
    if (!G || !G.started) return;
    const k = e.key.toLowerCase();
    if (k.startsWith('arrow') || k === ' ' || k === 'tab') e.preventDefault();
    if (CAP.on) {
      capKeyDown(k, e);
      return;
    }
    if (UI.scene) return;
    if (UI.cf) {
      e.preventDefault();
      if (!e.repeat) cfKey(k); // the confrontation: no way out but through
      return;
    }
    if (k === 'escape') {
      if (UI.menuOpen) closeMenu();
      else if (!$('#bd-detail').hidden && UI.caseOpen) closeSuspect();
      else if (UI.caseOpen) closeBoard();
      else if (!$('#help').hidden) toggleHelp();
      return;
    }
    if (G.over) return;
    if (UI.menuOpen) {
      if (DIRK[k]) {
        e.preventDefault();
        if (!e.repeat) {
          swallowed.add(kk);
          runOpt(UI.menuOps[DIRK[k]]);
        }
        return;
      }
      if (k === 'e' || k === ' ' || k === 'enter') {
        if (!e.repeat) closeMenu();
        return;
      }
    }
    if (k === 'tab' || k === 'n' || k === 'b') {
      e.preventDefault();
      if (!e.repeat) {
        if (UI.caseOpen) closeBoard();
        else openBoard();
      }
      return;
    }
    if (k === 'h' || k === '?') {
      toggleHelp();
      return;
    }
    if (UI.caseOpen) {
      if (!e.repeat && boardKey(k)) e.preventDefault();
      return;
    }
    if (k === 'e') {
      if (!e.repeat) interact();
      return;
    }
    if (k === ' ') {
      if (!e.repeat) attackKey(); // the one key for a fight
      return;
    }
    if (k === 'f') {
      if (!e.repeat) playerPhoto();
      return;
    }
    if (k === 'q') cam.yawT += Math.PI / 2;
    if (k === 'r') cam.yawT -= Math.PI / 2;
    if (k === 'c') cam.follow = true;
    if (k === 'v') toggleWalls();
    if (k === 'l' && G.inv.flashlight) G.inv.flashOn = !G.inv.flashOn;
    if (k === '+' || k === '=') cam.zoomT = clamp(cam.zoomT / 1.2, 2.7, 18);
    if (k === '-' || k === '_') cam.zoomT = clamp(cam.zoomT * 1.2, 2.7, 18);
  });
  window.addEventListener('keyup', (e) => {
    const kk = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    keys[kk] = false;
    swallowed.delete(kk);
    if (e.key === 'Shift') keys.Shift = false;
    if (CAP.on) capKeyUp(e.key.toLowerCase());
  });
  window.addEventListener('blur', () => {
    for (const k in keys) keys[k] = false;
    swallowed.clear();
  });
  window.addEventListener('resize', () => {
    if (UI.caseOpen) requestAnimationFrame(drawStrings);
  });
}
