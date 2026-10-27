//@ horror/tenth-forms — Tenth forms: barely visible traits
//@ Defines: TRACE_KINDS, TRACE_NOTE, TRACE_TINT, traceHeadM, EYE_WHITE, SHINE, traceEye, deadWalk, traceTick, startTrace, traceStep, photoTrace
//@ Uses:    sim/core, core/util, them/plan, them/proofs, town/cast, town/suspicion, play/photos, town/cell
//@ (header made by tools/map.js; stripped by build.py)
// ───────────── the tenth part. Nothing happens: somebody just looks a little more like what they are, for an hour or so.
// Nothing is added to them and nothing moves wrong. Only what's already there, a shade off: the skin a little grey, the head
// a little long, the eyes catching the light. It settles in while they're on their own or on their way somewhere, and it
// comes and goes while you aren't looking, so all you're left with is the question: was it always like that?
const TRACE_KINDS = {
  aliens: ['shine', 'shine', 'shine', 'long', 'long', 'fingers', 'grey'],
  lizards: ['shine', 'shine', 'shine', 'cold', 'neck'],
  zombies: ['shine', 'shine', 'shine', 'pallor', 'pallor', 'blue'],
};
const TRACE_NOTE = {
  long: 'Head looked longer. Greyer.', fingers: 'Fingers too long.', grey: 'Skin gone grey.',
  shine: 'Eyes caught the light.', cold: 'Skin a little green.', neck: 'Neck too long.',
  pallor: 'Grey skin. Dark lips.', blue: 'Hands gone blue.',
};
// how far each one tints the skin, and toward what: head (and neck), and the rest (hands)
const TRACE_TINT = {
  long: { col: [0.6, 0.64, 0.63], head: 0.38 }, grey: { col: [0.56, 0.6, 0.62], head: 0.24, body: 0.24 }, fingers: { col: [0.6, 0.64, 0.63], body: 0.22 },
  cold: { col: [0.42, 0.56, 0.32], head: 0.16, body: 0.2 },
  pallor: { col: [0.5, 0.54, 0.45], head: 0.45, body: 0.36 }, blue: { col: [0.4, 0.46, 0.58], body: 0.5 },
};
// the head's own shape, stretched about a point under the chin: longer and further back
function traceHeadM(kind, k) {
  if (kind === 'long') return M4.mul(M4.trans(0, 0.03, 0.07), M4.mul(M4.scale(1 - 0.02 * k, 1 + 0.13 * k, 1 + 0.1 * k), M4.trans(0, -0.03, -0.07)));
  return null;
}
// the eyes: the one thing they ever do is catch the light, faintly, the same pale gold whoever THEY are
const EYE_WHITE = [0.52, 0.48, 0.42], SHINE = [0.66, 0.5, 0.16];
function traceEye(kind, k, base) {
  return kind === 'shine' ? { col: mix3(base, SHINE, 0.28 * k), emit: mul3(SHINE, 0.55 * k), sx: 1, sy: 1 } : null;
}
// the dead walk nearly like anyone, every time they walk: a small sway left and right over each foot, one knee lifting
// a little less than the other, the arms swinging a little less. Nothing you'd see unless you were watching for it.
function deadWalk(c, T) {
  const p = c.vph != null ? c.vph : c.walkPh, sd = c.id && c.id.charCodeAt(0) % 2 ? 1 : -1;
  T.roll = (T.roll || 0) + Math.sin(p) * 0.024;
  if (sd > 0) T.shL *= 0.85; else T.shR *= 0.85;
  T.uaL *= 0.82; T.uaR *= 0.82;
  T.hr += sd * 0.02;
}
const aloneNow = (n) => !CHARS.some((c) => c !== n && !c.isPlayer && c.onMap && Math.hypot(c.x - n.x, c.z - n.z) < 5);
// once a game minute: anyone of THEM on their own, or walking somewhere, may start to show it
function traceTick() {
  if (!G.started || G.over || !theyStir() || !PLAYER.onMap) return;
  const care = clamp(1.2 - G.aware / 100, 0.35, 1.2);   // the more THEY watch you, the tighter THEY hold it
  for (const n of them()) {
    if (!n || n.trace || !n.onMap || n.exposed || n.surrendered || n.slain || n.gone || n.trueForm || n.under || n.hideUntil || asleep(n)) continue;
    if (G.t < (n.traceNext || 0)) continue;
    const dp = Math.hypot(n.x - PLAYER.x, n.z - PLAYER.z);
    if (dp < 2.5) continue;   // not with you right at their elbow
    if (!(n.moving && n.path) && !aloneNow(n)) continue;
    const p = (0.0025 + 0.0007 * (G.phase || 1)) * care * (darkNow() ? 1.35 : 1) * (dp < 16 ? 1.4 : 0.6) * (n.shown > 0.4 ? 0.5 : 1);
    if (chance(p)) startTrace(n);
  }
}
function startTrace(n, kind) {
  const K = TRACE_KINDS[G.faction] || TRACE_KINDS.aliens;
  kind = kind || pick(K.filter((q) => q !== n.traceLast || q === 'shine')) || pick(K);   // the eyes may come back; nothing else twice running
  const dur = rand(45, 80);
  n.trace = { fac: G.faction, kind, from: G.t, until: G.t + dur, k: 0, side: chance(0.5) ? 1 : -1 };
  n.traceLast = kind; n.traceNext = G.t + dur + rand(300, 600);
}
// it never changes in front of you if it can help it: out of sight it settles in a couple of minutes; watched, it creeps
function traceStep(n, dt) {
  const tr = n.trace;
  if (n.exposed || n.surrendered || n.slain) { n.trace = null; return; }
  const want = G.t < tr.until, rate = n.onMap && n.shown > 0.35 ? 1 / 28 : 1 / 2;
  tr.k = want ? Math.min(1, tr.k + dt * rate) : Math.max(0, tr.k - dt * rate);
  if (!want && tr.k <= 0) n.trace = null;
}
// on film it's there or it isn't. Close up, it's odd; it's never more than odd. One a day per face.
function photoTrace(n) {
  const tr = n.trace;
  if (!tr || tr.photo || tr.k < 0.6 || !n.isThem || n.exposed || n.surrendered || Math.hypot(n.x - PLAYER.x, n.z - PLAYER.z) > 4.5) return false;
  tr.photo = true;
  const key = n.id + ':' + dayNo(); G.traceShot = G.traceShot || {};
  if (G.traceShot[key]) return false;
  G.traceShot[key] = 1;
  const before = n.evidence;
  const p = addProof({ cat: 'weak', true: n.id, auto: true, what: n.short + ' · ' + TRACE_NOTE[tr.kind].replace(/\.$/, ''), where: placeName(n.x, n.z), rec: { how: 'photo', at: G.t, t: n.animT, pose: n.pose, trace: { fac: tr.fac, kind: tr.kind, k: 1 } }, recWho: n.id });
  n.clues.photo = (n.clues.photo || 0) + 1;
  addNote(n, 'Photo: ' + TRACE_NOTE[tr.kind], { by: 'you' });
  proofCard(p, before);
  return true;
}

