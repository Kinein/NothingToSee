//@ horror/ears — What a shaken head hears: real slips and sounds that aren't there; catching one clears your name
//@ Defines: earsTick, earCheck, catchThem
//@ Uses:    sim/core, data/tuning, ui/interface, core/util, player/needs, horror/visions, audio/sound, world/vision
//@ (header made by tools/map.js; stripped by build.py)
// ───────────── ears: what a shaken head hears, and the catch that clears your name
// Under Psychic 60 the ear sharpens as Psychic falls (earGain 0 → 1): THEIR slips and noises carry further and none go
// by unnoticed (them/plan slipHeard, heardIt), and now and then a sound comes from somewhere there's nobody (visionPing).
// The two sound the same. Go and look: a real one is one of THEM slipping, a fake costs you Psychic. Catching a real one
// with your own eyes is the way out of being the mad one (catchThem). Numbers in `EARS`.
const earGain = () => clamp((PSY.visions - psychic()) / PSY.visions, 0, 1);
const earReach = () => 1 + earGain() * (EARS.reach - 1);
function earsTick(dtReal) {
  if (G.speed === 0 || G.sleeping || G.away || SHADE.on || G.t < G.visionOff || !PLAYER.onMap) return;
  if (G.fakeEar) return earCheck(G.fakeEar);
  const gain = earGain();
  if (gain <= 0) return;
  G.earCd -= dtReal;
  if (G.earCd > 0) return;
  G.earCd = rand(EARS.gap[0], EARS.gap[1]) * (1.2 - gain * 0.7);
  visionPing();
}
// walked up to the spot of a sound that wasn't there
function earCheck(E) {
  if (G.t > E.until) {
    G.fakeEar = null;
    return;
  }
  if (Math.hypot(PLAYER.x - E.x, PLAYER.z - E.z) > EARS.near || visAt(E.x, E.z) < 0.4) return;
  G.fakeEar = null;
  setNeed('stress', Math.min(95, PLAYER.needs.stress + EARS.fake));
  ui.bubble(PLAYER, 'nerve', 'thought', 2);
  ui.note('ear', 'Nothing there', 'warn');
  audio.sting('whisper');
  if (chance(EARS.shade)) visionShade();
}
// one of THEM slipping, seen with your own eyes. A head this shaken has to trust what it saw (the save: the lower
// Psychic, the likelier you doubt it). If it holds: the ordinary people who thought you were mad don't any more, and
// the rest ease off too. Once a day.
function catchThem(n) {
  if (!G.started || G.catchDay === dayNo()) return;
  const psy = psychic();
  if (psy < PSY.shaky && !chance(EARS.save[0] + ((EARS.save[1] - EARS.save[0]) * psy) / PSY.shaky)) {
    ui.bubble(PLAYER, 'nerve', 'thought', 2.5);
    ui.note('eye', 'Was that real?', 'warn');
    return;
  }
  G.catchDay = dayNo();
  let mad = 0;
  for (const c of CHARS) {
    if (c.isPlayer || c.isThem || c.def.stranger) continue;
    if (c.sus >= MAD_SUS) {
      c.sus = 0;
      mad++;
    } else c.sus = Math.max(0, c.sus - EARS.ease);
  }
  ui.note('eye', mad ? 'You’re not mad. You saw it.' : 'You saw it. You’re not mad.', 'good');
  audio.sting('onto');
}
