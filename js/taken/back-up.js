//@ taken/back-up — Back up top
//@ Defines: capDropSpot, capDrop, capOutcome
//@ Uses:    taken/taken, sim/core, taken/coming, core/util, player/needs, horror/layer, them/proofs, world/objects, audio/sound, sim/pose, …
//@ (header made by tools/map.js; stripped by build.py)
// ───────────── back up top, as if nothing had happened
function capDropSpot() {
  const fac = CAP.fac, out = CAP.out, P = PLAYER, bed = OBJ_BY_ID.homeBed;
  const free = (x, z, r = 3) => { const w = nearestWalkable(x, z, P, r); return w ? [w[0] + 0.5, w[1] + 0.5] : [x, z]; };
  if (out === 'pod') { const [x, z] = free(36.5, 28.5); return { x, z, dir: 0.5, kind: 'crater' }; }
  if (out === 'stairs') { const [x, z] = free(MANHOLE[0], MANHOLE[1] + 1); return { x, z, dir: Math.PI, kind: 'manhole' }; }
  if (out === 'hole') { const [x, z] = free(DEAD_CORNER[0] - 1, DEAD_CORNER[1] - 1); return { x, z, dir: -2.2, kind: 'bushes' }; }
  const r = Math.random();
  if (fac === 'aliens') {
    if (CAP.how === 'sleep' && r < 0.5) return { x: bed.x + 1.5, z: bed.z + 0.5, dir: Math.PI, kind: 'bed' };
    const [x, z] = free(r < 0.75 ? 37.5 : rand(12, 40), r < 0.75 ? 28.5 : 16.5); return { x, z, dir: rand(0, TAU), kind: 'lawn' };
  }
  if (fac === 'lizards') { if (r < 0.4) { const [x, z] = free(12.5, 23.5); return { x, z, dir: -Math.PI / 2, kind: 'door' }; } const [x, z] = free(MANHOLE[0] - 0.8, MANHOLE[1] + 1.4); return { x, z, dir: 2.6, kind: 'alley' }; }
  if (r < 0.5) { const [x, z] = free(27.5, 3.6); return { x, z, dir: 0.4, kind: 'bins' }; }
  const [x, z] = free(DEAD_CORNER[0] - 1.2, DEAD_CORNER[1] - 0.8); return { x, z, dir: -1.8, kind: 'bushes' };
}
function capDrop() {
  return {
    name: 'drop', done: {}, skip: null,
    start() {
      const P = PLAYER, sp = this.sp = capDropSpot();
      CAP.lit = null; CAP.eye = null; darkSight = 2.6; CAP.esc = null;
      for (const a of CAP.actors.slice()) capKill(a);
      CAP.decals.length = 0;
      G.away = null; G.sleeping = false;
      P.x = sp.x; P.z = sp.z; P.y = 0; P.dir = P.tdir = sp.dir; P.onMap = true; P.queue = []; P.path = null; P.moving = false; P.pose = 'stand'; P.shown = 1;
      if (sp.kind === 'bed') { const b = OBJ_BY_ID.homeBed; P.x = b.x + 1.5; P.z = b.z + 1; }
      capCut(P.x, P.z, 3.3, CAP.saved.yaw);
      CAP.fillK = darkNow() ? 0.55 : 0;   // enough of the street's light to find yourself lying in it
      capFxNow({ fade: 1, lid: 1, daze: 0.75, washK: 0, letter: 1 });
      capFx({ fade: 0, lid: 0, daze: 0.3 }, { fade: 0.6, lid: 0.45, daze: 0.3 });
      for (const c of CHARS) c.capHide = false;
      capOutcome(sp);
      if (sp.kind === 'crater') { hxDecal(P.x + 0.6, P.z - 0.4, 1.6, [0.02, 0.022, 0.02, 0.7], 0, 300); hxDecal(P.x + 0.6, P.z - 0.4, 2.2, [0.12, 0.25, 0.16, 0.3], 1, 300); R.flash = 0.6; HX.shake = 1.4; audio.hx('thud', 0, 1); }
      this.lie = sp.kind !== 'bed' && sp.kind !== 'door';
      P.poseFn = this.lie ? (T) => { const up = capSeg(this.t, 2.4, 3.4); if (up < 1) { CPOSE.limp(T); if (up > 0) { T.pitch *= 1 - up; T.rootY = lerp(0.14, 0.17 - 0.88 * P.look.h, up * 0.6); } } } : null;
    },
    step(dt, t) {
      const P = PLAYER;
      animate(P, dt, dt * 2); updateShown(P, dt);
      if (t > 0.9) capOnce(this, 'when', () => capTime(G.t));
      if (t > 1.4) capOnce(this, 'breath', () => audio.hx('breath', 0, 0.6));
      if (t > 3.4) { P.poseFn = null; capFx({ letter: 0, daze: 0.12 }, { letter: 1.2, daze: 0.4 }); }
      capCam(P.x, P.z, lerp(3.3, CAP.saved.zoom, capSeg(t, 2.6, 4.6)), CAP.saved.yaw, 1.4);
      if (t > 4.6) return false;
    },
    end() { PLAYER.poseFn = null; CAP.fillK = null; },
  };
}
// what it cost: by what THEY are, and whether you got away
function capOutcome(sp) {
  const P = PLAYER, fac = CAP.fac, notes = [], lost = Math.max(0, Math.round(G.t - CAP.t0));
  if (CAP.esc && CAP.esc.notes) notes.push(...CAP.esc.notes);
  if (CAP.escNotes) notes.push(...CAP.escNotes);
  G.sickNext = true;
  if (isWorkday() && tod() >= 7 * 60 && tod() < 17 * 60) G.sickDay = true;   // the day is lost, but not held against you
  if (CAP.out) {
    addStress(6);
  } else {
    addStress(12); G.visionOff = G.t + 120;
    if (fac === 'aliens') {
      if (CAP.chip || (!G.playerChip && chance(0.5))) { G.playerChip = true; notes.push(['sick', 'Scar behind the ear', 'bad']); }
      else { G.stressFloor = Math.min(50, G.stressFloor + 5); notes.push(['sick', 'Neck aches', 'bad']); }
      P.lostDay = dayNo();
      echo('abduct', { x: CAP.at[0], z: CAP.at[1], quiet: true });
    } else if (fac === 'lizards') {
      // THEY go through your pockets: the best photo you had of THEM, and whatever else you were carrying
      const pf = G.proofs.filter((p) => p.src === 'photo').sort((a, b) => PROOF_RANK[b.cat] - PROOF_RANK[a.cat])[0];
      if (pf) { G.proofs.splice(G.proofs.indexOf(pf), 1); refreshEvidence(); }
      const had = G.inv.trap > 0 || G.inv.pills > 0 || G.inv.flashlight;
      G.inv.trap = 0; G.inv.pills = 0; G.inv.flashlight = false; G.inv.flashOn = false;
      addStress(4);
      notes.push([pf ? 'camera' : 'bag', pf ? 'Photo gone' : had ? 'Pockets emptied' : 'Pockets turned out', 'bad']);
    } else {
      P.needs.hunger = Math.min(P.needs.hunger, 18); P.needs.energy = Math.min(P.needs.energy, 30); P.limpDay = dayNo(); addStress(4);
      notes.push(['sick', 'Bitten', 'bad']);
    }
  }
  if (lost > 20) notes.push(['clock', '−' + fmtDur(lost), 'bad']);
  CAP.after = () => notes.forEach(([i, t, k], j) => setTimeout(() => { if (!G.over) ui.note(i, t, k); }, 300 + j * 1500));
}

