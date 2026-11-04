//@ gfx/viewfinder — The camera's square: the town through your eyes, the flash, the print
//@ Defines: VF, VF_HOLD, VF_WIDE, VF_TIGHT, vfEl, vfOpen, vfShoot, vfHold, vfPrint, vfClose, vfLabel, VF_SUBJ, vfSubjAt, vfLens, vfInWayAt, VF_PAST, …
//@ Uses:    gfx/gl, gfx/renderer, sim/core, core/util, world/grid, ui/interface, world/light-map, gfx/world-geometry, gfx/post, horror/layer, …
//@ (header made by tools/map.js; stripped by build.py)
// ───────────── the viewfinder. F lifts the camera and a square comes up on the right: the town through your own eyes,
// live. With evidence in front of you (play/photos photoAim) the lens swings onto it, zooms in until it fills the frame,
// and whatever stands between you and it (a wall, a window, a wardrobe, somebody in the way) is left out of the
// picture; with none, it's simply the way you face. The shutter fires in the square (the town only gets a
// glint of it), the frame it froze develops there as the print, with whatever the shot filed stamped on it, and after a
// few seconds it goes; the evidence cards the shot made come in after it. Render only: what a photo files is still
// takePhoto's business (play/photos), and nothing here touches the simulation.
const VF = {
  S: 512, // the square's pixels
  fov: 1.2, // the lens, top to bottom, eased toward the zoom
  mode: null, // 'live' | 'shot' (white, the still on its way) | 'print' | null
  act: null, // the action holding the camera up
  aim: null, // the subject: a person (or what they really are), or { item | obj, x, z }, or a place { x, z }
  yaw: 0,
  cut: null, // while the square draws: { at, back, r } for the wall cut (useMain), and the line it hides things on
  eye: [0, 0, 0],
  pitch: 0,
  t0: 0, // R.time the mode began
  still: 0, // frames left before the still is drawn, under the flash's white (a vision lets go of its body meanwhile)
  at: 0, // G.t of the shot, for the date on the print
  blur: false,
  stamp: '',
  cap: '',
  board: undefined, // whose board a click on the print opens
  catchUntil: 0, // cards made until then belong to this shot
  cards: [],
  prints: [],
  el: null,
};
const VF_HOLD = 4.4, // real seconds the print stays up
  VF_WIDE = 1.2, // the lens with nothing to zoom on
  VF_TIGHT = 0.36; // as far as it zooms
function vfEl() {
  if (VF.el) return VF.el;
  const el = $('#vf');
  if (!el) return null;
  VF.el = el;
  VF.win = el.querySelector('.vf-win');
  VF.img = el.querySelector('img');
  el.onclick = () => {
    if (VF.mode !== 'print') return;
    const id = VF.board;
    vfClose(true);
    openBoard(id || null);
  };
  return el;
}
// F (or a click photo) lifts the camera: the square comes up, live
function vfOpen(act, aim) {
  const el = R.ready && vfEl();
  if (!el) return;
  if (VF.mode) vfClose(true);
  const P = PLAYER;
  VF.mode = 'live';
  VF.act = act;
  VF.aim = aim ? (aim.look ? aim : aim.char || (aim.x != null ? aim : null)) : null;
  VF.t0 = R.time;
  VF.blur = false;
  VF.stamp = VF.cap = '';
  VF.board = undefined;
  VF.cards.length = VF.prints.length = 0;
  VF.yaw = P.dir;
  VF.fov = VF_WIDE;
  vfLens(1);
  VF.fov = VF_WIDE; // it zooms in once it's up
  VF.img.hidden = true;
  VF.img.removeAttribute('src');
  el.className = 'live';
  el.style.setProperty('--tilt', filmRange(-3, 3).toFixed(1) + 'deg');
  el.querySelector('.stamp').textContent = '';
  el.querySelector('.vf-cap').textContent = '';
  el.hidden = false;
}
// the shutter: white in the square, a glint in the town. False when the square isn't up (then the old full flash).
function vfShoot() {
  if (VF.mode !== 'live') return false;
  VF.mode = 'shot';
  VF.t0 = R.time;
  VF.still = 3;
  VF.at = G.t;
  VF.catchUntil = R.time + 0.9;
  VF.el.classList.replace('live', 'shot');
  vfUnclip();
  R.flash = Math.max(R.flash, 0.12);
  return true;
}
// a card the shot made waits for the print to go; its stamp goes on the print
function vfHold(o) {
  if (!VF.mode || VF.mode === 'live' || R.time > VF.catchUntil) return false;
  VF.cards.push(o);
  if (!VF.stamp && o.stamp) VF.stamp = o.stamp;
  if (!VF.cap) VF.cap = o.title || (o.char ? o.char.short : '');
  if (VF.board === undefined) VF.board = o.char ? o.char.id : null;
  if (VF.mode === 'print') vfLabel();
  return true;
}
// a print the shot filed: it gets this picture in the book (until the page reloads; then its recipe again)
function vfPrint(pr) {
  if (!VF.mode || VF.mode === 'live' || R.time > VF.catchUntil) return;
  VF.prints.push(pr);
  if (!VF.cap) VF.cap = pr.what === pr.where ? pr.what : pr.what + ' · ' + pr.where;
}
function vfClose(flush) {
  const cards = VF.cards.slice();
  VF.mode = null;
  VF.act = null;
  VF.cards.length = VF.prints.length = 0;
  if (VF.el) VF.el.hidden = true;
  vfUnclip();
  if (flush) for (const o of cards) ui.card(o);
}
function vfLabel() {
  VF.el.querySelector('.stamp').textContent = VF.stamp;
  VF.el.querySelector('.vf-cap').textContent = VF.cap || placeName(PLAYER.x, PLAYER.z);
  VF.el.classList.toggle('stamped', !!VF.stamp);
  VF.el.classList.toggle('nothing', VF.stamp === 'NOTHING' || VF.stamp === 'BLURRED');
}
// where the lens points, and how tight: the subject's middle, a person filling about two thirds of the frame (a
// thing on the floor with some floor round it); no subject, the way you face, wide
const VF_SUBJ = { x: 0, y: 0, z: 0, h: 0 };
function vfSubjAt(tg) {
  const S = VF_SUBJ;
  S.x = tg.x;
  S.z = tg.z;
  if (tg.look) {
    const big = tg.trueForm || (tg.tell && tg.tell.type === 'true');
    S.h = (big ? 2.5 : 1.85) * tg.look.h;
    S.y = (tg.y || 0) + S.h * 0.5;
  } else if (tg.item) {
    S.h = 1;
    S.y = 0.25;
  } else {
    S.h = tg.obj ? 2.4 : 8; // a piece of furniture; a bare spot on the floor isn't worth a zoom
    S.y = 0.7;
  }
  return S;
}
function vfLens(k) {
  const P = PLAYER,
    tg = VF.aim && (!VF.aim.look || VF.aim.onMap !== false) ? VF.aim : null,
    eyeY = (P.y || 0) + 1.52 * (P.look.h || 1);
  let yaw = P.dir,
    pitch = -0.13,
    fov = VF_WIDE;
  if (tg) {
    const S = vfSubjAt(tg),
      d = Math.hypot(S.x - P.x, S.z - P.z);
    if (d > 0.3) {
      yaw = Math.atan2(S.x - P.x, S.z - P.z);
      pitch = clamp(Math.atan2(S.y - eyeY, d), -0.7, 0.3);
      fov = clamp(2 * Math.atan((S.h * 0.75) / Math.hypot(d, S.y - eyeY)), VF_TIGHT, VF_WIDE);
    }
  }
  VF.yaw += angDiff(VF.yaw, yaw) * k;
  VF.pitch += (pitch - VF.pitch) * k;
  VF.fov += (fov - VF.fov) * k;
}
// the line from the lens to the subject: a thing standing on it, nearer than the subject, would block the shot. wide:
// anywhere in the frame at its depth, not just on the line (furniture; a person only goes if they're right in front)
function vfInWayAt(x, z, r, wide) {
  const C = VF.cut;
  if (!C) return false;
  const ex = VF.eye[0],
    ez = VF.eye[2],
    tx = C.tx - ex,
    tz = C.tz - ez,
    d = Math.hypot(tx, tz) || 1,
    t = ((x - ex) * tx + (z - ez) * tz) / d;
  if (t < 0.15 || t > d - (wide ? 0.15 : 0.45)) return false;
  return Math.abs((x - ex) * tz - (z - ez) * tx) / d < r + (wide ? 0.2 + t * Math.tan(VF.fov / 2) * 0.9 : 0.35);
}
// no subject, but a window in front of you: the shot is through it, at what's on the other side
const VF_PAST = { x: 0, z: 0 };
function vfWindow(eye, fx, fz) {
  for (let s = 0.3; s < 4; s += 0.2) {
    const x = Math.floor(eye[0] + fx * s),
      z = Math.floor(eye[2] + fz * s);
    if (!inb(x, z)) return null;
    const c = tiles[I(x, z)];
    if (c === 'W') {
      VF_PAST.x = eye[0] + fx * (s + 2.5);
      VF_PAST.z = eye[2] + fz * (s + 2.5);
      return VF_PAST;
    }
    if (WALLISH.has(c)) return null; // a blank wall: that's the picture
  }
  return null;
}
// a mesh in the way, by its bounding sphere (gfx/draw-helpers meshInView); nothing big enough to be half the street
function vfInWay(m) {
  const b = m.bound;
  if (!VF.cut || !b) return false;
  const M = m.model,
    s = Math.max(Math.hypot(M[0], M[1], M[2]), Math.hypot(M[8], M[9], M[10])),
    r = b[3] * s;
  if (r > 2.5) return false;
  return vfInWayAt(
    M[0] * b[0] + M[4] * b[1] + M[8] * b[2] + M[12],
    M[2] * b[0] + M[6] * b[1] + M[10] * b[2] + M[14],
    r,
    true,
  );
}
function vfTargets() {
  if (VF.out) return;
  const S = VF.S,
    fb = gl.createFramebuffer(),
    cr = gl.createRenderbuffer(),
    dr = gl.createRenderbuffer(),
    samples = Math.min(4, gl.getParameter(gl.MAX_SAMPLES) || 0);
  gl.bindRenderbuffer(gl.RENDERBUFFER, cr);
  gl.renderbufferStorageMultisample(gl.RENDERBUFFER, samples, R.hdr ? gl.RGBA16F : gl.RGBA8, S, S);
  gl.bindRenderbuffer(gl.RENDERBUFFER, dr);
  gl.renderbufferStorageMultisample(gl.RENDERBUFFER, samples, gl.DEPTH_COMPONENT24, S, S);
  gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
  gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.RENDERBUFFER, cr);
  gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, dr);
  VF.ms = fb;
  VF.scene = makeTarget(S, S, R.hdr);
  VF.blm = [];
  for (let k = 1; k <= 4; k++) VF.blm.push(makeTarget(S >> k, S >> k, R.hdr));
  VF.out = makeTarget(S, S, false);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
}
// above the walls: the sky outdoors, a dark ceiling indoors (the town has no ceilings to draw)
const VF_ROOF = [0.025, 0.022, 0.024];
function vfSky() {
  if (roomAt(PLAYER.x, PLAYER.z)) return VF_ROOF;
  const f = LOOK.fog;
  return [f[0] * 0.9 + SKY[0] * 0.25, f[1] * 0.9 + SKY[1] * 0.25, f[2] * 0.9 + SKY[2] * 0.3];
}
// the town through your eyes into VF.out; the still has the flash in it, and only what is really there
function vfRender(still) {
  vfTargets();
  const P = PLAYER,
    S = VF.S;
  let yaw = VF.yaw,
    pitch = VF.pitch;
  if (!still) {
    yaw += Math.sin(R.time * 1.7) * 0.006; // held in two hands, not on a tripod
    pitch += Math.sin(R.time * 2.3) * 0.005;
  }
  const fx = Math.sin(yaw),
    fz = Math.cos(yaw),
    cp = Math.cos(pitch),
    eye = [P.x + fx * 0.14, (P.y || 0) + 1.52 * (P.look.h || 1), P.z + fz * 0.14];
  const view = M4.lookAt(eye, [eye[0] + fx * cp, eye[1] + Math.sin(pitch), eye[2] + fz * cp], [0, 1, 0]);
  const keep = [cam.VP, cam.view, cam.right, cam.up, cam.fwd, cam.eye, cam.wallsDown];
  cam.VP = M4.mul(M4.persp(VF.fov, 1, 0.08, 70), view);
  cam.view = view;
  cam.right = [view[0], view[4], view[8]];
  cam.up = [view[1], view[5], view[9]];
  cam.fwd = [-view[2], -view[6], -view[10]];
  cam.eye = eye;
  cam.wallsDown = 0;
  VF.eye = eye;
  // a subject: the walls between you and it come down (the shader's own cut, aimed at a point just past it; nothing
  // else is cut), and vfInWay leaves out what stands on the line
  const tg = VF.aim && (!VF.aim.look || VF.aim.onMap !== false) ? vfSubjAt(VF.aim) : vfWindow(eye, fx, fz);
  if (tg) {
    const dx = tg.x - eye[0],
      dz = tg.z - eye[2],
      d = Math.hypot(dx, dz) || 1;
    VF.cut = {
      tx: tg.x,
      tz: tg.z,
      at: [tg.x + (dx / d) * 0.3, 1, tg.z + (dz / d) * 0.3],
      back: [eye[0] - fx * 60, 1, eye[2] - fz * 60],
      r: clamp(d * Math.tan(VF.fov / 2) + 1.4, 1.8, 4), // wide enough that no wall in frame is half cut
    };
  }
  R.cut = VF.cut;
  const flash = still
    ? { x: eye[0] + fx * 0.3, y: eye[1], z: eye[2] + fz * 0.3, r: 8, col: [0.62, 0.6, 0.56], dark: 0 }
    : null;
  if (flash) HX.lights.unshift(flash);
  try {
    drawScene(VF.ms, S, S, still ? 'still' : 'live');
  } finally {
    [cam.VP, cam.view, cam.right, cam.up, cam.fwd, cam.eye, cam.wallsDown] = keep;
    VF.cut = R.cut = null;
    if (flash) HX.lights.splice(HX.lights.indexOf(flash), 1);
  }
  gl.bindFramebuffer(gl.READ_FRAMEBUFFER, VF.ms);
  gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, VF.scene.fb);
  gl.blitFramebuffer(0, 0, S, S, 0, 0, S, S, gl.COLOR_BUFFER_BIT, gl.NEAREST);
  gl.bindFramebuffer(gl.READ_FRAMEBUFFER, null);
  gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, null);
  bloomPasses(VF.scene, VF.blm);
  composite(VF.scene.tex, VF.blm[0].tex, VF.out, true);
}
// VF.out onto the screen, under the square's frame
function vfBlit() {
  const w = VF.win.getBoundingClientRect(),
    c = R.canvas.getBoundingClientRect(),
    kx = R.canvas.width / c.width,
    ky = R.canvas.height / c.height,
    H = R.canvas.height,
    S = VF.S;
  gl.bindFramebuffer(gl.READ_FRAMEBUFFER, VF.out.fb);
  gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, null);
  gl.blitFramebuffer(
    0,
    0,
    S,
    S,
    Math.round((w.left - c.left) * kx),
    Math.round(H - (w.bottom - c.top) * ky),
    Math.round((w.right - c.left) * kx),
    Math.round(H - (w.top - c.top) * ky),
    gl.COLOR_BUFFER_BIT,
    gl.LINEAR,
  );
  gl.bindFramebuffer(gl.READ_FRAMEBUFFER, null);
  // the bubbles and words over people's heads live above the canvas: keep them out of the hole the square looks through
  const fx = $('#fx');
  if (fx)
    fx.style.clipPath =
      'polygon(evenodd,0 0,100% 0,100% 100%,0 100%,0 0,' +
      w.left +
      'px ' +
      w.top +
      'px,' +
      w.right +
      'px ' +
      w.top +
      'px,' +
      w.right +
      'px ' +
      w.bottom +
      'px,' +
      w.left +
      'px ' +
      w.bottom +
      'px,' +
      w.left +
      'px ' +
      w.top +
      'px)';
}
function vfUnclip() {
  const fx = $('#fx');
  if (fx) fx.style.clipPath = '';
}
// every frame, at the end of renderFrame
function vfFrame() {
  if (!VF.mode) return;
  const P = PLAYER,
    gone = !G.started || G.over || UI.caseOpen || UI.scene || CAP.on || !P.onMap;
  if (VF.mode === 'live') {
    if (gone || P.queue[0] !== VF.act) return vfClose(false); // put down before the shutter
    vfLens(0.12);
    vfRender(false);
    vfBlit();
    return;
  }
  if (VF.mode === 'shot') {
    if (VF.still === 3) for (const n of CHARS) if (n.vis && !n.tell) n.vis = null; // the camera never lies: the flash finds nothing there
    if (VF.still > 0 && --VF.still === 0) {
      vfRender(true);
      warmLater(vfDevelop, true);
    }
    if (gone) vfClose(true);
    return;
  }
  if (gone || R.time - VF.t0 > VF_HOLD + 0.6) return vfClose(true);
  if (R.time - VF.t0 > VF_HOLD && !VF.el.classList.contains('out')) VF.el.classList.add('out');
}
// the still, read back once, becomes the print: the date in the corner, smeared if your hands shook
function vfDevelop() {
  if (VF.mode !== 'shot' || VF.still) return;
  const S = VF.S,
    px = new Uint8Array(S * S * 4);
  gl.bindFramebuffer(gl.FRAMEBUFFER, VF.out.fb);
  gl.readPixels(0, 0, S, S, gl.RGBA, gl.UNSIGNED_BYTE, px);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  let cv = document.createElement('canvas');
  cv.width = cv.height = S;
  let ctx = cv.getContext('2d');
  const id = ctx.createImageData(S, S);
  for (let y = 0; y < S; y++) id.data.set(px.subarray((S - 1 - y) * S * 4, (S - y) * S * 4), y * S * 4);
  ctx.putImageData(id, 0, 0);
  if (VF.blur) {
    const sm = document.createElement('canvas');
    sm.width = sm.height = S;
    const sx = sm.getContext('2d');
    sx.drawImage(cv, 0, 0);
    for (let k = 1; k <= 6; k++) {
      sx.globalAlpha = 0.32;
      sx.drawImage(cv, k * 4.5, k * 1.6);
    }
    cv = sm;
    ctx = sx;
    ctx.globalAlpha = 1;
  }
  ctx.font = '600 21px ui-monospace, Menlo, monospace';
  ctx.fillStyle = '#ff8a2a';
  ctx.fillText('D' + dayNo(VF.at) + ' ' + fmtTime(VF.at), S - 146, S - 18);
  let url = '';
  try {
    url = cv.toDataURL('image/jpeg', 0.88);
  } catch (e) {
    url = '';
  }
  if (url) for (const pr of VF.prints) R.snaps['print:' + pr.id] = url;
  VF.mode = 'print';
  VF.t0 = R.time;
  if (url) {
    VF.img.src = url;
    VF.img.hidden = false;
  }
  vfLabel();
  VF.el.classList.replace('shot', 'print');
}
