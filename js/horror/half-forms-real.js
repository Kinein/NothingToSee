//@ horror/half-forms-real — Half-changed for real, late in the week
//@ Defines: HALF_STRESS, halfTick, halfSlip, visionHalf
//@ Uses:    sim/core, core/util, gfx/renderer, horror/half-forms, data/tuning, them/awareness, town/suspicion, world/vision, horror/layer, horror/visions, …
//@ (header made by tools/map.js; stripped by build.py)
// ───────────── half-changed, for real: late in THEIR week, at night, the skin doesn't always hold.
// Only with a clear head: shaken (stress 60+), whatever you see is your own mind (see visionHalf), and the camera knows it.
const HALF_STRESS = 100 - PSY.shaky; // Psychic under 40: what you see slipping is your own mind
function halfTick() {
  if (!G.started || G.over || !PLAYER.onMap || PLAYER.needs.stress >= HALF_STRESS) return;
  const h = hourF();
  if (!(h >= 21 || h < 5) || (G.phase || 1) <= 3) return;
  for (const n of alive()) {
    if (
      !n.onMap ||
      n.trueForm ||
      n.tell ||
      n.under ||
      n.hideUntil ||
      n.surrendered ||
      asleep(n) ||
      G.t - (n.halfAt || -1e9) < 14
    )
      continue;
    const seen = visAt(n.x, n.z) > 0.5 && n.shown > 0.5;
    if (chance(seen ? 0.1 : 0.025)) halfSlip(n, seen);
  }
}
function halfSlip(n, seen) {
  n.halfAt = G.t;
  n.tell = {
    type: 'half',
    fac: G.faction,
    parts: halfParts(G.faction),
    side: chance(0.5) ? 1 : -1,
    t: 0,
    w: 0,
    t0r: R.time,
    dur: rand(1.3, 2.1),
    seed: rand(0, 9),
    awarded: false,
    caught: false,
  };
  if (seen) {
    if (G.speed > 1) G.speed = 1;
    hxSound('crack', n.x, n.z, 0.45);
  }
}
// in a shaken head the town flickers: a face that isn't, on anybody at all. It's never there on film.
function visionHalf() {
  const P = PLAYER,
    cands = CHARS.filter(
      (c) =>
        !c.isPlayer &&
        c.onMap &&
        c.shown > 0.6 &&
        !c.tell &&
        !c.vis &&
        !c.trueForm &&
        !c.riteBy &&
        Math.hypot(c.x - P.x, c.z - P.z) < 13 &&
        Math.hypot(c.x - P.x, c.z - P.z) > 1.4,
    );
  if (!cands.length) return false;
  const c = pick(cands),
    fac = visionFaction(),
    dur = rand(0.7, 1.4);
  c.vis = {
    type: 'half',
    fac,
    parts: halfParts(fac),
    side: chance(0.5) ? 1 : -1,
    t: 1,
    w: 0,
    t0r: R.time,
    dur,
    until: R.time + dur,
    seed: rand(0, 9),
  };
  if (chance(0.45)) audio.sting('whisper');
  return true;
}
