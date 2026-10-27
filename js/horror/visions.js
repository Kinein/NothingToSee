//@ horror/visions — Visions
//@ Defines: VISION_FACTIONS, hallucinate, visionDoor, visionPing, visionFlicker, visionNote, visionShade
//@ Uses:    sim/core, core/util, audio/sound, world/grid, town/cast, horror/layer, world/paths, world/vision, data/lines, horror/half-forms-real, …
//@ (header made by tools/map.js; stripped by build.py)
// ───────────── visions
// From stress 60 the mind starts lying: ear pings with nothing there, shadow figures, a townsperson flickering
// into a tell for a second, and from 80 a fake overheard line pinned to the board. Fakes never move evidence.
const VISION_FACTIONS = ['aliens', 'lizards', 'zombies'];
// until you know a lot (the faction, and one of THEM unmasked) visions show any faction
const visionFaction = () => (G.factionKnown && G.exposed.length ? G.faction : pick(VISION_FACTIONS));
function hallucinate(dtReal) {
  if (SHADE.on) { SHADE.t -= dtReal; if (SHADE.t <= 0) SHADE.on = false; return; }
  const st = PLAYER.needs.stress;
  if (G.speed === 0 || G.sleeping || G.away || G.t < G.visionOff) return;
  if (st >= 40 && st < 60) {   // tense: only whispers
    G.whisperCd -= dtReal;
    if (G.whisperCd <= 0) { G.whisperCd = rand(40, 90); audio.sting('whisper'); }
    return;
  }
  if (st < 60) return;
  G.halfCd = (G.halfCd == null ? 6 : G.halfCd) - dtReal;
  if (G.halfCd <= 0) { G.halfCd = st >= 80 ? rand(5, 12) : rand(10, 22); visionHalf(); }
  G.shadeCd -= dtReal;
  if (G.shadeCd > 0) return;
  const strong = st >= 80;
  G.shadeCd = rand(16, 38) * (strong ? 0.6 : 1) * (1.5 - (st - 60) / 60);
  const r = Math.random();
  if (r < 0.3) return (st >= 70 && !HX.scene && lightGroupOn('street') && !inRoomSet(PLAYER, () => true) && chance(0.5) && visionDoor()) || visionShade();
  if (r < 0.55) return visionPing();
  if (r < 0.8 || !strong) return visionFlicker() || visionPing();
  return visionNote();
}
function visionDoor() { const sc = hxRedDoor(true); if (!sc) return false; HX.scene = sc; return true; }
function visionPing() {
  const P = PLAYER;
  for (let k = 0; k < 40; k++) {
    const x = Math.floor(P.x + rand(-12, 12)), z = Math.floor(P.z + rand(-12, 12));
    if (!inb(x, z) || !walkable(x, z)) continue;
    const d = Math.hypot(x - P.x, z - P.z);
    if (d < 5 || visAt(x + 0.5, z + 0.5) > 0.4) continue;
    notifyPing(x + 0.5, z + 0.5); return true;
  }
  return false;
}
function visionFlicker() {
  const P = PLAYER;
  const cands = CHARS.filter((c) => !c.isPlayer && c.onMap && c.shown > 0.6 && !c.tell && Math.hypot(c.x - P.x, c.z - P.z) < 12);
  if (!cands.length) return false;
  const c = pick(cands), fac = visionFaction(), F = FACTIONS[fac];
  c.vis = { type: pick(F.tells.filter((t) => t !== 'bask' && t !== 'feed')), fac, t: 1, w: 0, until: R.time + rand(0.6, 1.2) };
  audio.sting('whisper');
  return true;
}
function visionNote() {
  const subs = suspects().filter((n) => !n.exposed);
  if (!subs.length) return visionPing();
  const s = pick(subs), fac = visionFaction();
  const line = (chance(0.5) ? pick(RUMORS[fac]) : pick(FAKE_LINES)).replace('{s}', s.short);
  const src = pick(suspects().filter((n) => n !== s && !n.exposed)) || NPC.lenny;
  addNote(s, '“' + line + '”', { by: src.id, fake: true });
  ui.note('ear', line, 'onto');
  audio.sting('whisper');
  return true;
}
function visionShade() {
  const P = PLAYER; let best = null;
  for (let k = 0; k < 60; k++) {
    const x = Math.floor(P.x + rand(-9, 9)), z = Math.floor(P.z + rand(-9, 9));
    if (!inb(x, z) || !walkable(x, z)) continue;
    const d = Math.hypot(x - P.x, z - P.z);
    if (d < 4 || visCur[I(x, z)] < 0.6 || cellLum(I(x, z)) > 0.3) continue;
    best = [x, z]; break;
  }
  if (!best) return false;
  if (!SHADE.c) {
    SHADE.c = { id: 'shade', x: 0, z: 0, y: 0, dir: 0, tdir: 0, onMap: true, shown: 1, look: { h: 1.22, w: 0.82, hair: 'bald', skinC: [0.04, 0.04, 0.05], topC: [0.03, 0.03, 0.04], botC: [0.03, 0.03, 0.04], shoeC: [0.02, 0.02, 0.02], hairC: [0, 0, 0], accC: [0.03, 0.03, 0.04], hatC: [0, 0, 0], eyeC: [0.5, 0.5, 0.5], mouthC: [0, 0, 0] }, J: defaultJ(), fx: {}, anim: 'stare', pose: 'stand', animT: 0, queue: [] };
    SHADE.c.J.uaL = SHADE.c.J.uaR = 0; SHADE.c.J.hp = 0.25;
  }
  const s = SHADE.c; s.x = best[0] + 0.5; s.z = best[1] + 0.5; s.dir = s.tdir = Math.atan2(P.x - s.x, P.z - s.z);
  s.fx = { eye: [0.7, 0.7, 0.7] };
  SHADE.on = true; SHADE.t = rand(0.5, 1.1);
  audio.sting('whisper');
  return true;
}

