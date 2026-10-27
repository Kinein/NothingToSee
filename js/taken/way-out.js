//@ taken/way-out — The way out of the lair: the setup for each lair
//@ Defines: ESC, capEscape, capMarksOff, ESC_SETUP, escWatcher, escSleeper, escFree
//@ Uses:    taken/taken, world/grid, core/util, them/awareness, world/objects, taken/down-there, taken/coming, world/paths, gfx/renderer, taken/way-out-play, …
//@ (header made by tools/map.js; stripped by build.py)
// ───────────── the way out: you come round alone. Somewhere in here there's a way back up.
// watchers walk their rounds and see only what's in front of them (and only so far); the dead in the nest sleep until
// something comes too near or too loud. Caught, and it's the long way after all.
const ESC = {
  ship: { goal: 'Find a way off', free: 'Pull free', mash: 6, hold: 0, walk: 1.25, chase: 3.5, cone: 0.9, range: 6.2, close: 2.0, gain: 1.15, listen: 4.6 },
  sewer: { goal: 'Find the way up', free: 'Work the knots', mash: 7, hold: 0, walk: 1.1, chase: 3.9, cone: 0.72, range: 3.4, close: 1.5, gain: 1.6, listen: 4.2 },
  den: { goal: 'Get out. Don’t wake them.', free: 'Slide out from under it', mash: 0, hold: 2.6, walk: 0, chase: 2.7, cone: 0, range: 0, close: 0, gain: 0, listen: 0 },
};
function capEscape() {
  const k = CAP.lair;
  return {
    name: 'escape', esc: true, done: {},
    start() {
      capEnterLair(k);
      CAP.cast = lairCast(k);
      const E = CAP.esc = { k, cfg: ESC[k], phase: 'wake', free: 0, held: 0, watchers: [], sleepers: [], talkers: [], heard: 0, said: 0, intel: null, alarm: 0, caught: null, marks: [], t: 0 };
      ESC_SETUP[k](E);
      capFxNow({ fade: 1, lid: 1, daze: 0.9, letter: 1, washK: 0 });
      capFx({ fade: 0, lid: 0.25, daze: 0.55, letter: 0.35 }, { fade: 0.9, lid: 0.6, daze: 0.5, letter: 1 });
    },
    step(dt, t) {
      const E = CAP.esc;
      if (E.phase === 'wake') {
        const cfg = E.cfg;
        if (t > 2.0) capPrompt('E', '', E.free, cfg.hold ? 'clock' : 'fist');
        if (cfg.hold) {   // slow and careful: holding E, and the one lying across you stirs if you're rough with it
          if (E.holdE && t > 2.0) { E.free = Math.min(1, E.free + dt / cfg.hold); if (E.near) E.near.stir = Math.min(0.9, E.near.stir + dt * 0.12); }
          else E.free = Math.max(0, E.free - dt * 0.15);
        }
        if (E.free >= 1) escFree();
        return;
      }
      if (E.phase === 'free') return escPlay(dt);
      if (E.phase === 'done') return false;
    },
    fx(dtR, t) {},
    skip: null,
    end() { capMarksOff(); },
  };
}
function capMarksOff() { const box = capUI().querySelector('.cp-marks'); if (box) box.innerHTML = ''; }
// each place: where you wake, who walks where, who talks, who sleeps
const ESC_SETUP = {
  ship(E) {
    const T = OBJ_BY_ID.lxTable;
    E.you = capYou(T.cx, T.cz + 0.85, { dir: 0, pose: 'lie', y: 0.38 });
    E.you.poseFn = (T2, a) => { T2.uaL = T2.uaR = 0.05; T2.aoL = T2.aoR = 0.12; const s = E.struggle || 0; T2.roll = Math.sin(a.animT * 30) * 0.08 * s; T2.uaR = 0.05 - 0.5 * s; T2.hp = -0.1 - 0.3 * s; };
    E.start = [T.cx + 1.0, T.cz + 0.3];
    capEye(T.cx, T.cz, 0); capCut(T.cx, T.cz + 0.4, 3.0, 0); CAP.camK = 3;
    const L = LZ.bind(null, 'ship');
    // one walks the ring, slowly, all the way round
    E.watchers.push(escWatcher('grey', [[2.0, 43.0], [18.0, 43.0], [18.0, 54.0], [2.0, 54.0]], 2, { glow: [0.45, 1, 0.75] }));
    // three stand round the map of Wexley, talking it over
    const h = OBJ_BY_ID.lxHolo, hx = h.cx, hz = h.cz;
    for (const [x, z, d] of [[hx - 2.4, hz - 0.3, Math.PI / 2], [hx + 2.4, hz + 0.3, -Math.PI / 2], [hx + 0.2, hz - 1.6, 0]]) { const w = escWatcher('grey', [[x, z]], 0, { stay: d, cone: 0.85, range: 4.3 }); w.talker = true; E.watchers.push(w); }
    E.talkAt = [hx, hz + 2.0];
    const m = pick(covert()) || pick(alive());
    const who = m ? m.short : 'the tall one';
    E.lines = [
      ['[clicking]', 'The one from Larkspur Court. Its sleep is thin now.'],
      ['[clicking]', 'It keeps the pictures in a box under the bed.'],
      ['[clicking]', who + '’s skin needs mending before Friday.'],
      ['[clicking]', 'The Beacon goes up over the park. Then nobody needs to hide.'],
    ];
    E.intelOn = m;
    E.exits = LAIRS.ship.at('p').map(([x, z]) => ({ x: x + 0.5, z: z - 0.25, label: 'Climb in', kind: 'pod', px: x + 0.5, pz: z + 0.5 }));
    const vt = (CAP.cast.tanks || []).find((x) => x.what === 'person' && x.name);
    if (vt) E.looks = [{ x: vt.x, z: vt.z + (vt.z < LAIR_Z0 + 12 ? 0.9 : -0.9), label: 'Look', text: '', n: vt.n, done: false }];
  },
  sewer(E) {
    const [cx, cz] = LAIRS.sewer.at('@')[0];
    E.you = capYou(cx + 0.5, cz + 0.5, { dir: 0, pose: 'sit', seatY: 0.47 });
    E.you.poseFn = (T2, a) => { CPOSE.bound(T2, a); const s = E.struggle || 0; T2.roll = Math.sin(a.animT * 25) * 0.07 * s; T2.torso = 0.15 * s; };
    E.start = [cx + 1.5, cz + 0.5];
    capEye(cx + 0.5, cz + 0.5, 0); capCut(cx + 0.5, cz + 0.8, 3.1, 0); CAP.camK = 3;
    const S = (lx, lz) => { const p = LZ('sewer', lx, lz); return [p[0] + 0.5, p[1] + 0.5]; };
    E.watchers.push(escWatcher('lizard', [S(1, 14), S(18, 14)], 1, { lantern: true, ping: true }));
    E.watchers.push(escWatcher('lizard', [S(9, 1), S(9, 6), S(11, 6), S(11, 1)], 0, { lantern: true }));
    E.watchers.push(escWatcher('lizard', [S(14, 4), S(14, 8), S(18, 8), S(18, 11)], 2, { lantern: true, ping: true }));
    // gold room by the stairs: two counting; the other gold room: one of them, and somebody bought, counting with it
    const tb = OBJ.filter((o) => o.type === 'lx_ctable');
    const ta = tb.find((o) => o.z < LAIR_Z0 + 8), tbb = tb.find((o) => o.z >= LAIR_Z0 + 8);
    for (const [x, z, d] of [[ta.cx - 1.25, ta.cz, Math.PI / 2], [ta.cx + 1.25, ta.cz, -Math.PI / 2]]) { const w = escWatcher('lizard', [[x, z]], 0, { stay: d, cone: 0.8, range: 3.6 }); w.counting = true; E.watchers.push(w); }
    if (tbb) {
      const w = escWatcher('lizard', [[tbb.cx - 1.0, tbb.cz - 0.4]], 0, { stay: Math.PI / 2, cone: 0.8, range: 3.6 }); w.talker = true; w.counting = true; E.watchers.push(w);
      const b = capBought(); E.bought = b;
      const ba = capActor('man', tbb.cx + 1.0, tbb.cz + 0.3, { dir: -Math.PI / 2, look: b.look }); E.boughtA = ba; ba.poseFn = (T2, a) => { T2.uaL = T2.uaR = -0.8; T2.faL = -0.9 + Math.sin(a.animT * 3) * 0.2; T2.faR = -0.9; T2.hp = 0.35; a.fx.prop = 'cash'; };
      E.talkAt = [tbb.cx, tbb.cz];
    }
    const m = pick(covert()) || pick(alive());
    E.intelOn = m;
    E.lines = [
      ['A lizard', 'Pell’s is ours. The council’s next.'],
      [E.bought && E.bought.name ? E.bought.name : 'The bought one', 'I signed it. I sign everything you give me.'],
      ['A lizard', (m ? m.short : 'Ours') + ' says the one asking questions has a price too.'],
      ['A lizard', 'Friday night, we come up for good.'],
    ];
    E.exits = [{ x: OBJ_BY_ID.lxStairs.cx - 0.85, z: OBJ_BY_ID.lxStairs.cz, label: 'Climb', kind: 'stairs' }];
  },
  den(E) {
    const [nx, nz] = LAIRS.den.at('@')[0], x = nx + 0.5, z = nz + 0.5;
    E.you = capYou(x, z, { dir: Math.PI * 0.6 }); E.you.poseFn = (T2) => CPOSE.limp(T2);
    E.start = [x, z];
    capEye(x, z, 0); capCut(x, z + 0.3, 3.0, 0); CAP.camK = 3;
    const D = (lx, lz) => { const p = LZ('den', lx, lz); return [p[0] + 0.5, p[1] + 0.5]; };
    // the one that fell asleep beside you, with an arm thrown across you
    const yd = Math.PI * 0.6;
    E.near = escSleeper(x + Math.cos(yd) * 0.62, z - Math.sin(yd) * 0.62, yd); E.near.over = true; E.sleepers.push(E.near);
    E.near.a.poseFn = (T2, a) => { T2.aoR = 1.45; T2.uaR = -0.25 - (E.near.stir > 0.3 ? Math.sin(a.animT * 3) * 0.1 * E.near.stir : 0); T2.faR = -0.2; T2.hy = -0.5; if (E.near.awake) a.poseFn = null; };
    for (const [lx, lz, d] of [[12, 19, -2.2], [9, 23, 2.9], [4, 13, 1.2], [15, 12, -1.0], [16, 14, 2.4], [6, 5, 0.3], [10, 4, -2.6]]) E.sleepers.push(escSleeper(...D(lx, lz), d));
    // somebody's clothes, folded neat on a crate, like a person getting ready for bed
    const m = pick(covert()) || pick(alive());
    const [fx, fz] = D(12, 6);
    E.intelOn = m;
    E.folded = { x: fx, z: fz, look: m ? m.look : hxLook() };
    E.looks = [{ x: fx, z: fz + 0.8, label: 'Look', text: '', n: m || null, intel: true, done: false }];
    E.exits = [{ x: LAIRS.den.at('*')[0][0] + 0.5, z: LAIRS.den.at('*')[0][1] + 0.9, label: 'Crawl out', kind: 'hole', auto: true }];
  },
};
function escWatcher(kind, route, ri, o = {}) {
  const [x, z] = route[ri] || route[0];
  const a = capActor(kind, x, z, { dir: o.stay != null ? o.stay : 0 });
  return Object.assign({ a, route, ri, dir: 1, state: o.stay != null ? 'stay' : 'route', wait: 0, alert: 0, lastSeen: null, lost: 0, rp: 0, path: null }, o);
}
function escSleeper(x, z, dir) {
  const a = capActor('dead', x, z, { dir });
  a.tell.down = true;
  return { a, stir: 0, awake: false, groaned: 0, wakeAt: 0 };
}
// up and moving: you, in the flesh, at the controls
function escFree() {
  const E = CAP.esc, P = PLAYER;
  E.phase = 'free'; capPrompt(null);
  capKill(E.you); E.you = null;
  let [x, z] = E.start;
  if (!walkable(Math.floor(x), Math.floor(z), P)) { const w = nearestWalkable(x, z, P, 3); if (w) { x = w[0] + 0.5; z = w[1] + 0.5; } }
  P.x = x; P.z = z; P.y = 0; P.onMap = true; P.pose = 'stand'; P.anim = 'idle'; P.moving = false; P.path = null; P.queue = []; P.shown = 1; P.dir = P.tdir = Math.PI;
  CAP.eye = null; darkSight = 2.6; lastPlayerCell = -1;
  UI.scene = null; cam.follow = true; cam.zoomT = 4.6; CAP.cam = null;
  capFx({ daze: 0.12, lid: 0, letter: 0, washK: 0 }, { daze: 0.4, lid: 1, letter: 1, washK: 3 });
  audio.hx('rope', 0, 0.7);
  if (E.near && E.near.stir > 0.6) E.near.stir = 0.6;
}
// the play itself
