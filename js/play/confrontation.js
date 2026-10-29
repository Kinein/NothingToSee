//@ play/confrontation — The confrontation: your cards on IT, ✓ or ✗, and what it leaves in the street
//@ Defines: cardLine, openConfront, cfStage, CF_T, cfTick, cfNext, cfVerdict, cfKey, cfClose, cfOutcome, cfTalkLater, arenaTalkTick
//@ Uses:    gfx/world-geometry, sim/core, gfx/renderer, core/util, data/lines, ui/interface, ui/confront-view, audio/sound, town/echoes, player/needs, …
//@ (header made by tools/map.js; stripped by build.py)
// ───────────── the confrontation. Face someone with people listening and call them out. Time stops, and the camera swings
// round to frame you, IT and everyone in earshot, lit like a stage. Your case is every card on their board: no choosing.
// One by one the cards fan out over IT and flip, ✓ (it really is about them) or ✗ (it isn't), each with one line from
// IT. Then it plays out in the street, the same for anyone:
//   0–1 ✓  they shrug it off, and everyone listening thinks you're mad
//   2 ✓    it turns ugly: they run or hit you. One of THEM changes into its true form as it does; a human stays human
//   3+ ✓   only THEM get here (a human never has more than two odd true things): IT gives up, and the FBI takes it
// Someone has to take you seriously. With no listener who is clean (not bought, bitten, probed, one of THEM, nor 85+
// suspicious of you), the ✓ still show and nothing happens: nobody reacts, and that tells you the crowd is THEIRS.
// Bystanders don't vote. They help in the fight, and they're the ones who think you're mad when it fails.
// who's listening: in earshot, and still standing there as people
const cfListeners = (n) => earshot(n).filter((w) => w !== n && !w.trueForm && !w.fleeing && !w.hunter);
// a listener who takes you seriously
const takesSeriously = (w) => !servantKind(w) && !(w.sus >= 85);
// ✓: the card really is about them. Their own oddity, or something of THEIRS on one of THEM. Something THEY left at
// someone else's place lands on whoever lives there, and there it's a ✗.
const cardHolds = (p, n) => (p.true === n.id && !p.planted) || p.innocent === n.id;
// what IT says as each card turns
function cardLine(p, n, ok) {
  if (!ok) return pick(CF_NO[p.frame] || CF_NO.home);
  if (!n.isThem) return pick(CF_YES_HUMAN).replace('{t}', oddTruth(n) || 'nothing');
  return pick(CF_YES_THEM[p.frame] || CF_YES_THEM.home);
}
function openConfront(n) {
  if (!n || !n.onMap || UI.cf || G.over) return;
  closeMenu();
  if (tooShaken()) return shakenNote(); // under Psychic 20 you can't call anyone out
  const ear = cfListeners(n);
  if (!ear.length) return ui.note('confront', 'Nobody here to hear it', '');
  cancelAll(PLAYER);
  const cards = caseCards(n).map((p) => ({ p, ok: cardHolds(p, n) }));
  const C = {
    n,
    ear,
    cards,
    yes: cards.filter((c) => c.ok).length,
    serious: ear.some(takesSeriously),
    i: -1,
    t: 0,
    beat: 'swing',
    prev: G.speed,
    cam: { tx: cam.tx, tz: cam.tz, yawT: cam.yawT, zoomT: cam.zoomT, follow: cam.follow },
    res: null,
  };
  UI.cf = C;
  G.speed = 0;
  n.tdir = Math.atan2(PLAYER.x - n.x, PLAYER.z - n.z);
  PLAYER.tdir = Math.atan2(n.x - PLAYER.x, n.z - PLAYER.z);
  for (const w of ear) w.tdir = Math.atan2(n.x - w.x, n.z - w.z);
  cfStage(C);
  cfOpen(C);
  ui.say(PLAYER, pick(CF_OPEN).replace('{s}', n.short), 3);
  audio.sting('murmur');
}
// the camera swings round so you and IT stand side by side, and pulls out far enough for everyone listening
function cfStage(C) {
  const P = PLAYER,
    n = C.n,
    a = Math.atan2(n.x - P.x, n.z - P.z);
  const yaws = [a + Math.PI / 2, a - Math.PI / 2];
  cam.yawT = Math.abs(angDiff(cam.yaw, yaws[0])) <= Math.abs(angDiff(cam.yaw, yaws[1])) ? yaws[0] : yaws[1];
  const who = [P, n].concat(C.ear.slice(0, 8));
  let cx = (P.x + n.x) / 2,
    cz = (P.z + n.z) / 2;
  // across the screen and up it, after the turn: how far out it has to pull to hold them all
  const rx = Math.cos(cam.yawT),
    rz = -Math.sin(cam.yawT);
  let w = 2.5,
    h = 2.5;
  for (const c of who) {
    const dx = c.x - cx,
      dz = c.z - cz;
    w = Math.max(w, Math.abs(dx * rx + dz * rz));
    h = Math.max(h, Math.abs(dx * rz - dz * rx));
  }
  const aspect = R.canvas.width / Math.max(1, R.canvas.height);
  cam.follow = false;
  cam.tx = cx;
  cam.tz = cz;
  cam.zoomT = clamp(Math.max(h * 1.3 + 1.6, (w * 1.25 + 1.2) / aspect), 3.6, 9.5);
  C.spot = [cx, cz];
}
// real seconds: the stage settles, then each card fans out and turns
const CF_T = { swing: 1.1, deal: 0.55, turn: 1.25, verdict: 2.2 };
function cfTick(dt) {
  const C = UI.cf;
  if (!C) return;
  C.t += dt;
  cfDraw(C);
  if (C.beat === 'swing') {
    if (C.t < CF_T.swing) return;
    C.t = 0;
    C.beat = 'deal';
    if (!C.cards.length) {
      C.line = pick(CF_EMPTY);
      return cfVerdict(C);
    }
    return cfNext(C);
  }
  if (C.beat === 'deal' && C.t >= CF_T.deal) {
    C.beat = 'turn';
    C.t = 0;
    const c = C.cards[C.i];
    c.shown = true;
    C.line = cardLine(c.p, C.n, c.ok); // IT answers, under the card
    audio.sting(c.ok ? (C.serious ? 'gasp' : 'murmur') : 'awkward');
    cfDraw(C);
    return;
  }
  if (C.beat === 'turn' && C.t >= CF_T.turn) {
    C.t = 0;
    if (C.i + 1 < C.cards.length) return cfNext(C);
    return cfVerdict(C);
  }
  if (C.beat === 'verdict' && C.t >= CF_T.verdict) cfClose(C);
}
function cfNext(C) {
  C.i++;
  C.beat = 'deal';
  C.t = 0;
  audio.sting('click');
  cfDraw(C);
}
function cfVerdict(C) {
  C.beat = 'verdict';
  C.t = 0;
  C.res = !C.serious ? 'ignored' : C.yes >= 3 && C.n.isThem ? 'gives' : C.yes >= 2 ? 'ugly' : 'shrug';
  if (C.res === 'shrug') C.line = pick(CF_SHRUG);
  if (C.res === 'gives') audio.sting('slip');
  cfDraw(C);
}
// keys: E, Space or Enter hurry it along. There's no way out but through.
function cfKey(k) {
  const C = UI.cf;
  if (!C || !(k === 'e' || k === ' ' || k === 'enter')) return;
  if (C.beat === 'swing') C.t = CF_T.swing;
  else if (C.beat === 'turn') C.t = CF_T.turn;
  else if (C.beat === 'verdict') C.t = CF_T.verdict;
}
function cfClose(C) {
  UI.cf = null;
  cfHide();
  Object.assign(cam, C.cam);
  if (C.cam.follow) cam.follow = true;
  G.speed = C.prev || 1;
  if (!G.over) cfOutcome(C);
}
// what it leaves in the street
function cfOutcome(C) {
  const n = C.n,
    heed = C.ear.filter((w) => w.onMap && !w.isThem && !w.def.stranger);
  n.confronted = true;
  (G.cfLog = G.cfLog || []).push({ t: G.t, who: n.id, yes: C.yes, of: C.cards.length, res: C.res });
  if (C.res === 'ignored') return; // nobody here takes you seriously: nothing happens at all
  cfTalkLater(C.res, n);
  if (C.res === 'gives') {
    // it drops the act: on its knees, the crowd holding it, the grey cars on the way. You were right, in public.
    n.cfOk = G.t;
    return surrender(n, 'confront');
  }
  if (C.res === 'ugly') {
    n.cfOk = G.t;
    if (n.isThem) {
      // one of THEM changes as it goes: an aggressive one, or one that knows you well, comes at you with the crowd behind you
      const fight = temper(n) === 'aggressive' || G.aware >= 50;
      trueForm(n, 'confront', fight ? 'attack' : 'flee');
      if (n.trueForm) {
        const tf = n.trueForm;
        tf.public = true;
        tf.cornered = fight;
        tf.long = 30;
        tf.crowd = heed.length;
      }
      for (const w of heed) {
        ui.bubble(w, 'exclaim', 'speech', 3);
        (w.sawChange || (w.sawChange = {}))[n.id] = G.t;
      }
      exposeMember(n, 'unmask');
      echo('unmask', { x: n.x, z: n.z, who: n.id, seen: heed.map((w) => w.id) });
      G.fearUntil = G.t + EVIDENCE.cf.fearMins;
      for (const w of suspects()) if (!w.isThem && !w.gone && !w.trueForm) makePlan(w);
      return;
    }
    // a human stays human, and you've started a fight with a neighbour: they hit you, or they run
    for (const w of heed) ui.bubble(w, 'exclaim', 'speech', 2.5);
    if (temper(n) === 'aggressive') hitBack(n);
    else flee(n);
    return;
  }
  // they shrug it off, and everyone listening thinks you're mad
  for (const w of heed.concat([n])) {
    addSus(w, EVIDENCE.cf.failSus);
    if (w !== n) ui.bubble(w, 'laugh', 'speech', 2.5);
  }
  echo('ridicule', { x: n.x, z: n.z, who: n.id });
}
// the town talks about it for hours afterwards
function cfTalkLater(res, n) {
  const pool = CF_TALK[res] || CF_TALK.shrug,
    by = pick(suspects().filter((s) => s !== n && !s.isThem && !s.gone && s.id !== 'lenny'));
  for (let k = 0; k < 2; k++)
    G.arenaTalk.push({
      at: G.t + rand(30, 240) + k * 90,
      text: pick(pool).replace(/\{s\}/g, n.short).replace(/\{p\}/g, PLAYER.name),
      by: by ? by.id : null,
    });
}
function arenaTalkTick() {
  const L = G.arenaTalk; // runs every step: look before building anything
  let due = false;
  for (let i = 0; i < L.length; i++) if (G.t >= L[i].at) due = true;
  if (!due) return;
  for (const x of L.filter((y) => G.t >= y.at)) hear(null, x.text, x.by || 'stranger');
  G.arenaTalk = L.filter((y) => G.t < y.at);
}
