//@ gfx/portraits — Portraits and evidence snapshots rendered offscreen
//@ Defines: portraitTarget, renderPortrait, getPortrait, FILM_SEED, filmRand, grain, snapImage, printImage, flatPrint, WARM, warmLater, warmNext, warmPortraits, cardSoon
//@ Uses:    gfx/gl, gfx/renderer, ui/menus, core/util, sim/core, ui/interface, gfx/post, sim/characters, sim/pose, gfx/people
//@ (header made by tools/map.js; stripped by build.py)
// ───────────── portraits and evidence snapshots
function portraitTarget(w, h) {
  if (R.pt && R.pt.w === w && R.pt.h === h) return R.pt;
  if (R.pt) { gl.deleteFramebuffer(R.pt.fb); gl.deleteTexture(R.pt.tex); gl.deleteRenderbuffer(R.pt.depth); }
  const tex = makeColorTex(w, h, false), fb = gl.createFramebuffer(), depth = gl.createRenderbuffer();
  gl.bindRenderbuffer(gl.RENDERBUFFER, depth); gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT24, w, h);
  gl.bindFramebuffer(gl.FRAMEBUFFER, fb); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
  gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, depth);
  R.pt = { fb, tex, depth, w, h };
  return R.pt;
}
function renderPortrait(c, opt = {}) {
  if (!R.ready) return '';
  const head = (opt.mode || 'head') === 'head';
  const ow = head ? 128 : 180, oh = head ? 144 : 230, S = 2, w = ow * S, h = oh * S;
  const t = portraitTarget(w, h);
  const tmp = { look: c.look, x: 0, z: 0, y: 0, dir: 0, tdir: 0, moving: false, run: false, pose: opt.pose || 'stand', anim: opt.anim || 'idle', animT: opt.t != null ? opt.t : 2.2, tell: opt.tell || null, trace: opt.trace || null, queue: [], fx: {}, hover: false, seatY: 0.45 };
  tmp.J = defaultJ(); Object.assign(tmp.J, animTargets(tmp, 0));
  if (opt.foil) tmp.fx.foil = true;
  if (head) { tmp.J.hp = 0.05; tmp.J.hy = 0; tmp.J.hr = 0; }
  const hh = c.look.h, aspect = w / h;
  let view, proj;
  if (head) { const cy = 1.66 * hh; view = M4.lookAt([0.85, cy + 0.3, 4], [0, cy - 0.03, 0], [0, 1, 0]); const k = 0.33; proj = M4.ortho(-k * aspect, k * aspect, -k, k, 0.1, 30); }
  else if (opt.frame === 'upper') { const cy = 1.32 * hh + (tmp.J.float || 0); view = M4.lookAt([1.1, cy + 0.7, 4.5], [0, cy, 0], [0, 1, 0]); const k = 0.72; proj = M4.ortho(-k * aspect, k * aspect, -k, k, 0.1, 30); }
  else { const big = opt.tell && opt.tell.type === 'true', cy = tmp.pose === 'floorlie' ? 0.4 : big ? 1.12 : 0.98; view = M4.lookAt([1.5, cy + 1.2, 4.5], [0, cy, 0], [0, 1, 0]); const k = big ? 1.36 : 1.15; proj = M4.ortho(-k * aspect, k * aspect, -k, k, 0.1, 30); }
  gl.bindFramebuffer(gl.FRAMEBUFFER, t.fb); gl.viewport(0, 0, w, h);
  gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.enable(gl.DEPTH_TEST); gl.disable(gl.BLEND); gl.depthMask(true);
  const M = R.main; U = M.U; gl.useProgram(M.p);
  gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, R.tLight); gl.uniform1i(U.uLight, 0);
  gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, R.tVis); gl.uniform1i(U.uVis, 1);
  gl.uniformMatrix4fv(U.uVP, false, M4.mul(proj, view)); gl.uniformMatrix4fv(U.uView, false, view);
  gl.uniform1i(U.uMode, opt.flash ? 2 : 1);
  drawChar(tmp);
  gl.uniform1i(U.uMode, 0);
  const px = new Uint8Array(w * h * 4);
  gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, px);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  const big = document.createElement('canvas'); big.width = w; big.height = h;
  const bctx = big.getContext('2d'), img = bctx.createImageData(w, h);
  for (let y = 0; y < h; y++) img.data.set(px.subarray((h - 1 - y) * w * 4, (h - y) * w * 4), y * w * 4);
  bctx.putImageData(img, 0, 0);
  const out = document.createElement('canvas'); out.width = ow; out.height = oh;
  const ctx = out.getContext('2d');
  if (opt.bg) opt.bg(ctx, ow, oh);
  ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(big, 0, 0, ow, oh);
  if (opt.post) opt.post(ctx, ow, oh);
  try { return out.toDataURL(opt.jpeg ? 'image/jpeg' : 'image/png', 0.86); } catch (e) { return ''; }
}
function getPortrait(c) {
  if (!c) return '';
  const key = c.id + (c.isPlayer && G && G.inv.foilOn ? ':foil' : '');
  if (!R.portraits[key]) R.portraits[key] = renderPortrait(c, { mode: 'head', foil: key.endsWith(':foil') });
  return R.portraits[key];
}
// Film grain and print scratches get their own random numbers: a photo's 40,000 grains used to come out of the
// same Math.random the simulation uses, so merely looking at a picture changed what happened next in town.
let FILM_SEED = 0x9e3779b9;
function filmRand() { FILM_SEED = (FILM_SEED + 0x6d2b79f5) | 0; let t = FILM_SEED; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }
const filmRange = (a, b) => a + filmRand() * (b - a);
function grain(ctx, w, h, k) {
  const d = ctx.getImageData(0, 0, w, h);
  for (let i = 0; i < d.data.length; i += 4) { const n = (filmRand() - 0.5) * k; d.data[i] += n; d.data[i + 1] += n; d.data[i + 2] += n; }
  ctx.putImageData(d, 0, 0);
}
const photoBg = (photo) => (ctx, w, h) => {
  const g = ctx.createRadialGradient(w * 0.5, h * 0.62, 10, w * 0.5, h * 0.6, h * 0.75);
  if (photo) { g.addColorStop(0, '#3c3a36'); g.addColorStop(1, '#070707'); }
  else { g.addColorStop(0, '#3a3024'); g.addColorStop(1, '#0c0907'); }
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.beginPath(); ctx.ellipse(w * 0.5, h * 0.9, w * 0.3, h * 0.04, 0, 0, TAU); ctx.fill();
};
const photoPost = (photo, at) => (ctx, w, h) => {
  if (!photo) {
    const d = ctx.getImageData(0, 0, w, h);
    for (let i = 0; i < d.data.length; i += 4) { const l = d.data[i] * 0.3 + d.data[i + 1] * 0.59 + d.data[i + 2] * 0.11; d.data[i] = d.data[i] * 0.5 + (l * 1.08 + 10) * 0.5; d.data[i + 1] = d.data[i + 1] * 0.5 + (l * 0.95 + 4) * 0.5; d.data[i + 2] = d.data[i + 2] * 0.5 + l * 0.78 * 0.5; }
    ctx.putImageData(d, 0, 0);
  }
  const v = ctx.createRadialGradient(w / 2, h / 2, h * 0.25, w / 2, h / 2, h * 0.7);
  v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,0.7)');
  ctx.fillStyle = v; ctx.fillRect(0, 0, w, h);
  grain(ctx, w, h, photo ? 22 : 34);
  if (photo) { ctx.font = '600 11px ui-monospace, Menlo, monospace'; ctx.fillStyle = '#ff8a2a'; ctx.fillText('D' + dayNo(at) + ' ' + fmtTime(at), w - 70, h - 9); }
};
// rec: { type, how, at, t, pose }
function snapImage(n, rec) {
  const key = n.id + ':' + rec.at + ':' + rec.how + ':' + (rec.type || '') + ':' + (rec.tt != null ? rec.tt : '') + ':' + (rec.trace ? rec.trace.kind : '');
  if (R.snaps[key]) return R.snaps[key];
  const photo = rec.how === 'photo';
  const img = renderPortrait(n, {
    mode: 'snap', flash: photo, frame: rec.type === 'limb' || rec.type === 'shed' || rec.type === 'true' || (rec.type === 'half' && (rec.parts || []).some((q) => ['tail', 'hand', 'arm', 'ribs'].includes(q))) ? 'full' : 'upper', pose: rec.pose === 'crouch' || rec.pose === 'floor' || rec.pose === 'floorlie' ? rec.pose : 'stand', anim: 'stare',
    tell: rec.type ? { type: rec.type, t: rec.tt != null ? rec.tt : rec.type === 'true' ? 9 : 3, w: 0, ritual: !!rec.ritual, dur: 10, fac: rec.fac || G.faction, parts: rec.parts, side: rec.side } : null, t: rec.t || 2,
    trace: rec.trace || null, bg: photoBg(photo), post: photoPost(photo, rec.at),
  });
  R.snaps[key] = img;
  return img;
}
// prints are re-rendered from their recipe: a person in the flash, or the outline of a thing, or nothing at all
function printImage(pr) {
  const key = 'print:' + pr.id;
  if (R.snaps[key]) return R.snaps[key];
  const n = (pr.kind === 'plain' || pr.kind === 'sighting') && pr.who && NPC[pr.who];
  let img = n ? renderPortrait(n, { mode: 'snap', flash: true, frame: pr.kind === 'sighting' ? 'full' : 'upper', pose: 'stand', anim: pr.kind === 'sighting' ? 'stare' : 'idle', tell: pr.kind === 'sighting' ? { type: 'true', t: 9, w: 0, fac: G.faction } : null, t: pr.t || 2, bg: photoBg(true), post: photoPost(true, pr.at) }) : '';
  if (!img) img = flatPrint(pr);
  R.snaps[key] = img;
  return img;
}
function flatPrint(pr) {
  const w = 180, h = 230, cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  const ctx = cv.getContext('2d'), none = pr.kind === 'nothing' || pr.kind === 'blur';
  const g = ctx.createRadialGradient(w * 0.5, h * 0.5, 8, w * 0.5, h * 0.56, h * 0.75);
  g.addColorStop(0, none ? '#1d1c1a' : '#4b4740'); g.addColorStop(1, '#070707');
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  if (!none && pr.icon && ICON_PATHS[pr.icon]) {
    ctx.save(); ctx.translate(w / 2 - 56, h / 2 - 66); ctx.scale(4.7, 4.7);
    ctx.lineWidth = 1.05; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.shadowColor = 'rgba(255,236,200,.4)'; ctx.shadowBlur = 5; ctx.strokeStyle = 'rgba(234,226,206,.82)';
    ctx.stroke(new Path2D(ICON_PATHS[pr.icon]));
    ctx.restore();
  } else if (pr.kind === 'blur') {
    ctx.fillStyle = 'rgba(220,210,190,.06)'; for (let k = 0; k < 26; k++) ctx.fillRect(filmRange(0, w), filmRange(0, h), filmRange(30, 120), filmRange(2, 7));
  } else if (!none) {
    ctx.fillStyle = 'rgba(200,190,170,.08)'; for (let k = 0; k < 40; k++) ctx.fillRect(filmRange(10, w - 20), filmRange(h * 0.55, h - 20), filmRange(2, 9), 1.5);
  }
  photoPost(true, pr.at)(ctx, w, h);
  try { return cv.toDataURL('image/jpeg', 0.84); } catch (e) { return ''; }
}

// ── warming. A portrait is drawn on the GPU and read back to the CPU, and that read makes the browser wait for the
// GPU: a visible stall if it happens the moment a menu opens or someone walks into view. So everyone's portrait is
// drawn ahead of time, one per idle moment, right after a game starts. Later requests hit the cache.
const WARM = [];
let warmBusy = false;
function warmLater(fn) { WARM.push(fn); if (!warmBusy) warmNext(); }
function warmNext() {
  warmBusy = WARM.length > 0;
  if (!warmBusy) return;
  const go = () => { const fn = WARM.shift(); try { if (fn) fn(); } catch (e) { console.error(e); } warmNext(); };
  if (window.requestIdleCallback) requestIdleCallback(go, { timeout: 1000 }); else setTimeout(go, 100);
}
function warmPortraits() {
  WARM.length = 0;
  for (const c of CHARS) warmLater(() => { if (R.ready) getPortrait(c); });
}
// A card that needs a fresh snapshot (unmasked, killed, taken) is shown from the next idle moment instead of
// mid-step: the snapshot's GPU read-back then lands between frames, where it costs least. A fraction of a
// second later on screen; no stall in the middle of the action.
function cardSoon(o, snap) {
  const go = () => { try { ui.card(Object.assign(o, { img: snap() })); } catch (e) { console.error(e); } };
  if (window.requestIdleCallback) requestIdleCallback(go, { timeout: 250 }); else setTimeout(go, 30);
}
