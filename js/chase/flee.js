//@ chase/flee — One of THEM running from you
//@ Defines: TRIP_POSE, chaseFrame, chaseTrail, chaseGoal
//@ Uses:    gfx/world-geometry, sim/core, core/util, horror/layer, ui/interface, world/vision, gfx/renderer, taken/taken, audio/sound
//@ (header made by tools/map.js; stripped by build.py)
// ───────────────────────── the chase: one of THEM running from you ─────────────────────────
// It can sprint, but not for long: close on it and it tires, stumbles, slows. Out of sight it leaves a trail, and the
// glow points to where you saw it last. E on its heels: you throw yourself at it.
const TRIP_POSE = (T) => {
  T.torso = (T.torso || 0) + 0.7;
  T.pitch = (T.pitch || 0) + 0.2;
  T.roll = (T.roll || 0) + 0.15;
};
function chaseFrame(dtR) {
  const P = PLAYER;
  if (!G || !G.started || G.over || !P || CAP.on) return;
  const live = G.speed > 0 && !UI.caseOpen && !UI.fight;
  for (const n of CHARS) {
    if (!n.isThem || !n.onMap || !n.fleeing) {
      if (n.chase) {
        if (n.poseFn === TRIP_POSE) n.poseFn = null;
        n.chase = null;
      }
      continue;
    }
    let C = n.chase;
    if (!C || C.f !== n.fleeing)
      C = n.chase = {
        f: n.fleeing,
        st: 1,
        base: n.spd || 1,
        last: null,
        seenT: -99,
        lx: n.x,
        lz: n.z,
        trip: 0,
        stumble: 1,
      };
    if (!live) continue;
    const d = Math.hypot(P.x - n.x, P.z - n.z),
      seen = P.onMap && visAt(n.x, n.z) > 0.4 && n.shown > 0.4;
    if (seen) {
      C.last = [n.x, n.z];
      C.seenT = R.time;
    }
    if (P.onMap && d < 8) C.st = Math.max(0, C.st - dtR * 0.11);
    else if (d > 12) C.st = Math.min(1, C.st + dtR * 0.07);
    let k = 0.85 + 0.38 * C.st;
    if (C.st < 0.25) {
      C.stumble -= dtR;
      if (C.stumble <= 0) {
        C.stumble = rand(1.3, 2.3);
        C.trip = 0.45;
        if (seen) audio.hx('breath', hxPan(n.x, n.z), 0.4);
      }
    }
    if (C.trip > 0) {
      C.trip -= dtR;
      k *= 0.3;
      if (!n.poseFn) n.poseFn = TRIP_POSE;
    } else if (n.poseFn === TRIP_POSE) n.poseFn = null;
    n.spd = C.base * k;
    if (Math.hypot(n.x - C.lx, n.z - C.lz) > 0.55) {
      C.lx = n.x;
      C.lz = n.z;
      if (n.trueForm) chaseTrail(n);
    }
  }
}
function chaseTrail(n) {
  const F = G.faction,
    x = n.x + rand(-0.12, 0.12),
    z = n.z + rand(-0.12, 0.12);
  if (F === 'aliens') hxDecal(x, z, 0.11, [0.25, 0.7, 0.5, 0.45], 0, 50);
  else if (F === 'lizards')
    hxDecal(x, z, 0.14, [0.09, 0.12, 0.05, 0.6], 4, 50, { rot: rand(0, TAU), seed: rand(0, 20) });
  else hxDecal(x, z, 0.13, [0.2, 0.015, 0.015, 0.7], 4, 50, { rot: rand(0, TAU), seed: rand(0, 20) });
}
// the glow: where you last saw the one you're after
function chaseGoal() {
  const P = PLAYER;
  if (!P.onMap) return null;
  let best = null;
  for (const n of CHARS) {
    const C = n.chase;
    if (!C || !C.last || !n.fleeing) continue;
    const ago = R.time - C.seenT;
    if (ago < 0.5 || ago > 14 || Math.hypot(C.last[0] - P.x, C.last[1] - P.z) > 26) continue;
    if (visAt(n.x, n.z) > 0.4 && n.shown > 0.4) continue;
    if (!best || ago < best.ago) best = { ago, at: C.last };
  }
  return best ? { at: [Math.floor(best.at[0]), Math.floor(best.at[1])], icon: 'eye', urgent: false, flee: true } : null;
}
