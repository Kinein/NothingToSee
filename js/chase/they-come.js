//@ chase/they-come — When THEY come for you
//@ Defines: sleepTakeCheck, sleepTake, GROUND, groundTick, groundSigns, capKeyDown, capKeyUp, capReset
//@ Uses:    sim/core, taken/taken, core/util, them/plan, horror/layer, ui/interface, gfx/renderer, audio/sound, chase/hunt, taken/coming, …
//@ (header made by tools/map.js; stripped by build.py)
// ───────────── when THEY come for you
// In your sleep: once THEIR week is well along, or once THEY know too much about you. It's decided when you lie down,
// and the night tells you, if you're listening.
function sleepTakeCheck(fresh) {
  if (!G || !G.started || G.over || CAP.on || !G.sleeping || G.away || !PLAYER.onMap) return;
  const night = dayNo(G.t - 12 * 60);
  if (G.takeNight !== night) {
    G.takeNight = night;
    G.takeAt = 0;
    const ph = theirDay(),
      a = G.aware,
      forced = G.huntNights > 0 || G.huntNight === night;
    if (
      (forced || (theyStir() && (ph >= 3 || a >= 50) && G.t - (G.takenAt || -1e9) >= 2 * 1440)) &&
      inRoomSet(PLAYER, (r) => r.home)
    ) {
      // hunted, or THEY HUNT YOU: every night. Otherwise a chance that grows with THEIR week and with what THEY know.
      const p = forced || a >= 70 ? 1 : 0.16 + Math.max(0, ph - 2) * 0.14 + Math.max(0, a - 40) / 160;
      if (chance(p)) {
        const base = (night - 1) * 1440 + 24 * 60; // midnight that ends this night's day
        G.takeAt = Math.max(G.t + 45, base + irand(40, 270));
        G.takeWhy = a >= 50 && (a >= 70 || ph < 3) ? 'aware' : 'plan';
        if (fresh)
          setTimeout(() => {
            if (!G.over && G.sleeping) {
              UI.heatPulse = 1.5;
              audio.hx(G.faction === 'aliens' ? 'thrum' : G.faction === 'lizards' ? 'creak' : 'skitter', 0, 0.35);
            }
          }, 700);
      }
    }
  }
  if (G.takeAt && G.t >= G.takeAt) {
    G.takeAt = 0;
    sleepTake();
  }
}
function sleepTake() {
  const fac = G.faction,
    reason = G.takeWhy || 'plan';
  if (fac === 'aliens' && G.inv.foilOn) {
    // the hat. They come, and they can't.
    G.takenAt = G.t;
    setTimeout(() => {
      if (!G.over) {
        audio.hx('thrum', 0, 0.5);
        R.flash = Math.max(R.flash, 0.2);
        ui.bubble(PLAYER, 'foil', 'thought', 3);
      }
    }, 300);
    return;
  }
  G.dayShown = dayNo(); // waking into it: no day card over the top of it
  tearCard(pick(covert())); // on a hunt night THEY take a card from your flat, whatever happens next
  if (!huntStart('sleep', { why: reason })) capture('sleep', { reason });
}
// THEIR ground: the light over the park, the cover at the back of the alley, the dark corner under the park's trees.
// Walk in and you'll know it. Stay at the heart of it and you're gone.
const craftOverPark = () =>
  G.faction === 'aliens' &&
  ((G.stage >= 3 && (hourF() >= 23 || hourF() < 4) && Math.sin(G.t * 0.05) > 0.6) || !!G.landing);
const GROUND = {
  aliens: { at: [37.5, 26.5], r: 6.5, core: 2.3, on: craftOverPark },
  lizards: { at: MANHOLE, r: 5.2, core: 1.7, on: () => darkNow() && theirDay() >= 3 },
  zombies: { at: DEAD_CORNER, r: 5.2, core: 1.9, on: () => darkNow() && theirDay() >= 3 },
};
function groundTick(dtReal) {
  const Z = G && GROUND[G.faction],
    P = PLAYER;
  HUNT.ring = null;
  if (
    !Z ||
    !G.started ||
    G.over ||
    !P ||
    !P.onMap ||
    G.away ||
    G.sleeping ||
    UI.fight ||
    UI.caseOpen ||
    UI.scene ||
    HUNT.on
  ) {
    CAP.deep = 0;
    return;
  }
  if (!theyStir() || !Z.on() || G.t < (G.groundCd || 0)) {
    CAP.deep = 0;
    CAP.cover = 0;
    return;
  }
  const d = Math.hypot(P.x - Z.at[0], P.z - Z.at[1]),
    depth = clamp((Z.r - d) / (Z.r - Z.core), 0, 1);
  groundSigns(Z, depth, d, dtReal);
  if (!G.speed) return;
  if (d < Z.core) {
    CAP.deep = (CAP.deep || 0) + dtReal;
    if (CAP.deep > 0.6) {
      CAP.deep = 0;
      if (!huntStart('ground', { why: 'ground' })) capture('ground', { reason: 'ground' });
      return;
    }
  } else CAP.deep = Math.max(0, (CAP.deep || 0) - dtReal * 0.5);
  if (depth > 0) HX.danger = Math.max(HX.danger, depth * 0.85);
}
function groundSigns(Z, depth, d, dtReal) {
  const [x, z] = Z.at,
    seen = visAt(x, z) > 0.25,
    fac = G.faction;
  const near = clamp(1 - (d - Z.r) / 7, 0, 1);
  if (near > 0)
    HUNT.ring = {
      x,
      z,
      r: Z.r,
      core: Z.core,
      k: near * (0.6 + 0.4 * Math.sin(R.time * 2.1) ** 2),
      deep: depth,
      col: fac === 'aliens' ? [0.45, 1, 0.75] : fac === 'lizards' ? [1, 0.7, 0.2] : [0.6, 0.12, 0.08],
    };
  CAP.signT = (CAP.signT || 0) - dtReal;
  if (fac === 'aliens') {
    if (seen)
      for (let i = 0; i < 10; i++) {
        const ph = (R.time * 0.2 + i / 10) % 1,
          a = i * 2.39;
        hxGlint(
          x + Math.sin(a) * 1.6 * (1 - ph * 0.4),
          ph * 4,
          z + Math.cos(a) * 1.6 * (1 - ph * 0.4),
          0.1,
          [0.5, 1, 0.8],
          (1 - ph) * 0.45,
        );
      }
    if (depth > 0.25 && CAP.signT <= 0) {
      CAP.signT = rand(3.5, 6);
      audio.hx('thrum', hxPan(x, z), 0.25 + depth * 0.6);
    }
  } else if (fac === 'lizards') {
    CAP.cover = depth > 0.5 ? Math.abs(Math.sin(R.time * 9)) * 0.03 * depth : 0;
    if (seen && depth > 0.15)
      for (const s of [1, -1])
        hxGlint(x + s * 0.1, 0.06, z + 0.05, 0.08, [1, 0.72, 0.15], depth * (Math.sin(R.time * 0.7) > -0.6 ? 0.9 : 0));
    if (depth > 0.35 && CAP.signT <= 0) {
      CAP.signT = rand(3, 5.5);
      audio.hx(chance(0.5) ? 'hiss' : 'knock', hxPan(x, z), 0.2 + depth * 0.45);
    }
  } else {
    if (seen) flyGlints(x, z, 6 + Math.round(depth * 8));
    if (depth > 0.3 && CAP.signT <= 0) {
      CAP.signT = rand(3, 6);
      audio.hx(chance(0.6) ? 'groan' : 'buzz', hxPan(x, z), 0.25 + depth * 0.5);
    }
  }
}
// the keys while it plays: Space or E held to let it go by; E to struggle, to climb, to look
function capKeyDown(k, e) {
  if (k === ' ' || k === 'e' || k === 'enter') {
    e.preventDefault();
    if (!e.repeat) CAP.holdKey = true;
  }
  if (k === 'e' && CAP.esc) {
    if (!e.repeat) escKey('e');
    CAP.esc.holdE = true;
  }
  if (k === 'p' && CAP.esc && CAP.esc.phase === 'free') CAP.paused = !CAP.paused;
}
function capKeyUp(k) {
  if (k === ' ' || k === 'e' || k === 'enter') CAP.holdKey = false;
  if (k === 'e' && CAP.esc) CAP.esc.holdE = false;
}
function capReset() {
  CAP.on = false;
  CAP.act = null;
  CAP.acts = [];
  CAP.actors.length = 0;
  CAP.decals.length = 0;
  CAP.esc = null;
  CAP.lit = null;
  CAP.eye = null;
  CAP.lair = null;
  CAP.cover = 0;
  for (const k in CAP.fx) {
    CAP.fx[k] = 0;
    CAP.fxT[k] = 0;
  }
  document.body.classList.remove('capturing');
  const el = $('#cap');
  if (el) el.hidden = true;
}
