//@ horror/visions — Visions
//@ Defines: VISION_FACTIONS, hallucinate, visionDoor, visionPing, visionFlicker, visionSpot, visionFigure, visionShade, visionRunner, visionWatcher, visionStep
//@ Uses:    sim/core, core/util, world/grid, data/tuning, audio/sound, world/vision, horror/layer, world/paths, town/cast, player/needs, …
//@ (header made by tools/map.js; stripped by build.py)
// ───────────── visions
// Under Psychic 60 the mind starts lying, now and then: a shadow in a dark corner, someone running off at the edge of
// sight, someone watching you who's gone when you look again. Under 40 it happens more often, and the half-seen changes,
// the faces that flicker and the pings with nothing there come too. Rare trickery, not a mad world, and a vision never
// shows up on film (play/photos).
const VISION_FACTIONS = ['aliens', 'lizards', 'zombies'];
// until you know a lot (the faction, and one of THEM unmasked) visions show any faction
const visionFaction = () => (G.factionKnown && G.exposed.length ? G.faction : pick(VISION_FACTIONS));
function hallucinate(dtReal) {
  if (SHADE.on) return visionStep(dtReal);
  const psy = psychic();
  if (G.speed === 0 || G.sleeping || G.away || G.t < G.visionOff || psy >= PSY.visions) return;
  const bad = psy < PSY.shaky;
  if (!bad) {
    // uneasy: a whisper now and then
    G.whisperCd -= dtReal;
    if (G.whisperCd <= 0) {
      G.whisperCd = rand(50, 110);
      audio.sting('whisper');
    }
  } else {
    G.halfCd = (G.halfCd == null ? 8 : G.halfCd) - dtReal;
    if (G.halfCd <= 0) {
      G.halfCd = psy < PSY.mute ? rand(8, 16) : rand(14, 28);
      visionHalf();
    }
  }
  G.shadeCd -= dtReal;
  if (G.shadeCd > 0) return;
  G.shadeCd = bad ? rand(18, 40) * (0.6 + psy / 100) : rand(70, 150);
  const r = Math.random(),
    slight = () => pick([visionShade, visionRunner, visionWatcher])() || visionShade();
  if (!bad || r < 0.55) return slight();
  if (r < 0.72) return visionPing();
  if (r < 0.9) return visionFlicker() || visionPing();
  return (lightGroupOn('street') && !HX.scene && !inRoomSet(PLAYER, () => true) && visionDoor()) || visionShade();
}
function visionDoor() {
  const sc = hxRedDoor(true);
  if (!sc) return false;
  HX.scene = sc;
  return true;
}
function visionPing() {
  const P = PLAYER;
  for (let k = 0; k < 40; k++) {
    const x = Math.floor(P.x + rand(-12, 12)),
      z = Math.floor(P.z + rand(-12, 12));
    if (!inb(x, z) || !walkable(x, z)) continue;
    const d = Math.hypot(x - P.x, z - P.z);
    if (d < 5 || visAt(x + 0.5, z + 0.5) > 0.4) continue;
    notifyPing(x + 0.5, z + 0.5);
    return true;
  }
  return false;
}
function visionFlicker() {
  const P = PLAYER;
  const cands = CHARS.filter(
    (c) => !c.isPlayer && c.onMap && c.shown > 0.6 && !c.tell && Math.hypot(c.x - P.x, c.z - P.z) < 12,
  );
  if (!cands.length) return false;
  const c = pick(cands),
    fac = visionFaction(),
    F = FACTIONS[fac];
  c.vis = {
    type: pick(F.tells.filter((t) => t !== 'bask' && t !== 'feed')),
    fac,
    t: 1,
    w: 0,
    until: R.time + rand(0.6, 1.2),
  };
  audio.sting('whisper');
  return true;
}
// a place in sight, `lo`…`hi` tiles off, where something could stand (dark: only in the dark)
function visionSpot(lo, hi, dark) {
  const P = PLAYER;
  for (let k = 0; k < 60; k++) {
    const x = Math.floor(P.x + rand(-hi, hi)),
      z = Math.floor(P.z + rand(-hi, hi));
    if (!inb(x, z) || !walkable(x, z)) continue;
    const d = Math.hypot(x - P.x, z - P.z);
    if (d < lo || d > hi || visCur[I(x, z)] < 0.6 || (dark && cellLum(I(x, z)) > 0.3)) continue;
    return [x + 0.5, z + 0.5];
  }
  return null;
}
// a figure for the mind to put there: a shadow, or somebody's shape you half know
function visionFigure(kind, at) {
  if (!SHADE.c) SHADE.c = { id: 'shade', y: 0, onMap: true, shown: 1, fx: {}, pose: 'stand', animT: 0, queue: [] };
  const s = SHADE.c,
    P = PLAYER;
  const who = kind !== 'shade' && pick(suspects().filter((n) => !n.slain && !n.gone));
  s.look = who
    ? who.look
    : {
        h: 1.22,
        w: 0.82,
        hair: 'bald',
        skinC: [0.04, 0.04, 0.05],
        topC: [0.03, 0.03, 0.04],
        botC: [0.03, 0.03, 0.04],
        shoeC: [0.02, 0.02, 0.02],
        hairC: [0, 0, 0],
        accC: [0.03, 0.03, 0.04],
        hatC: [0, 0, 0],
        eyeC: [0.5, 0.5, 0.5],
        mouthC: [0, 0, 0],
      };
  s.J = defaultJ();
  s.J.uaL = s.J.uaR = 0;
  s.J.hp = kind === 'shade' ? 0.25 : 0;
  s.x = at[0];
  s.z = at[1];
  s.dir = s.tdir = kind === 'run' ? Math.atan2(s.x - P.x, s.z - P.z) : Math.atan2(P.x - s.x, P.z - s.z);
  s.anim = kind === 'run' ? 'run' : 'stare';
  s.fx = kind === 'shade' ? { eye: [0.7, 0.7, 0.7] } : {};
  SHADE.kind = kind;
  SHADE.on = true;
  audio.sting('whisper');
  return true;
}
// a shadow with eyes in a dark corner, for a breath
function visionShade() {
  const at = visionSpot(4, 9, true);
  if (!at) return false;
  visionFigure('shade', at);
  SHADE.t = rand(0.5, 1.1);
  return true;
}
// someone running off, out at the edge of what you can see
function visionRunner() {
  const at = visionSpot(6, 11, false);
  if (!at) return false;
  visionFigure('run', at);
  SHADE.t = rand(1.1, 1.6);
  return true;
}
// someone standing there watching you. Look at them, or walk up, and there's nobody.
function visionWatcher() {
  const at = visionSpot(7, 12, false);
  if (!at) return false;
  visionFigure('watch', at);
  SHADE.t = 9;
  return true;
}
function visionStep(dtReal) {
  const s = SHADE.c,
    P = PLAYER;
  SHADE.t -= dtReal;
  if (SHADE.kind === 'run') {
    // a stride, and away: gone once it's out of sight
    s.animT += dtReal * 9;
    const w = Math.sin(s.animT);
    s.J.thL = w * 0.8;
    s.J.thR = -w * 0.8;
    s.J.shL = Math.max(0, -w) * 1.1;
    s.J.shR = Math.max(0, w) * 1.1;
    s.J.uaL = -w * 0.7;
    s.J.uaR = w * 0.7;
    s.J.torso = 0.25;
    s.x += Math.sin(s.dir) * 5.5 * dtReal;
    s.z += Math.cos(s.dir) * 5.5 * dtReal;
    if (visAt(s.x, s.z) < 0.3) SHADE.t = 0;
  } else if (SHADE.kind === 'watch') {
    s.dir = s.tdir = Math.atan2(P.x - s.x, P.z - s.z);
    const toIt = Math.atan2(s.x - P.x, s.z - P.z);
    if (Math.abs(angDiff(P.dir, toIt)) < 0.45 || Math.hypot(s.x - P.x, s.z - P.z) < 5) SHADE.t = 0; // looked: nobody
  }
  if (SHADE.t <= 0) SHADE.on = false;
}
