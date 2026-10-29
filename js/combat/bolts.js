//@ combat/bolts — Projectiles THEY shoot
//@ Defines: BOLTS, fireBolt, boltTick, boltHits
//@ Uses:    sim/core, gfx/renderer, data/tuning, world/grid, core/util, audio/sound, world/light-map, town/fleeing, chase/hunt, taken/taken, …
//@ (header made by tools/map.js; stripped by build.py)
// ───────────── what THEY shoot at you: a bolt you can see coming, flying at where you stood when it fired. Get off the line.
const BOLTS = [];
function fireBolt(n, dmg) {
  const P = PLAYER,
    dx = P.x - n.x,
    dz = P.z - n.z,
    l = Math.hypot(dx, dz) || 1;
  n.tdir = Math.atan2(dx, dz);
  if (n.tell && n.tell.type === 'true') {
    const tl = n.tell;
    tl.lunge = true;
    setTimeout(() => {
      tl.lunge = false;
    }, 350);
  }
  BOLTS.push({
    by: n,
    x: n.x + (dx / l) * 0.45,
    z: n.z + (dz / l) * 0.45,
    dx: dx / l,
    dz: dz / l,
    d: 0,
    dmg,
    age: 0,
    abduct: !G.loose && G.stage >= 3 && !n.exposed && !!n.trueForm && chance(0.5),
  });
  R.flash = Math.max(R.flash, 0.25);
  audio.ping(0, 0.7);
}
function boltTick(dt) {
  const P = PLAYER;
  for (let i = BOLTS.length - 1; i >= 0; i--) {
    const b = BOLTS[i],
      step = CTRL.boltSpeed * dt,
      k = Math.max(1, Math.ceil(step / 0.12));
    let gone = false;
    b.age += dt;
    for (let j = 0; j < k && !gone; j++) {
      b.x += (b.dx * step) / k;
      b.z += (b.dz * step) / k;
      b.d += step / k;
      if (P.onMap && !G.away && Math.hypot(P.x - b.x, P.z - b.z) < CTRL.boltHit) {
        gone = true;
        boltHits(b);
      } else if (b.d > CTRL.boltRange) gone = true;
      else {
        const tx = Math.floor(b.x),
          tz = Math.floor(b.z);
        if (!inb(tx, tz) || tiles[I(tx, tz)] === 'W' || blocksSight(tx, tz)) gone = true;
      }
    }
    if (gone) BOLTS.splice(i, 1);
  }
}
function boltHits(b) {
  const n = b.by;
  R.flash = 0.7;
  if (b.abduct && n && n.trueForm) {
    n.trueForm.mode = 'flee';
    flee(n);
    if (!huntStart('beam', { foe: n })) capture('beam', { foe: n });
    return;
  }
  if (n) ui.bubble(n, 'exclaim', 'speech', 1.4);
  G.lastHitBy = n ? n.id : null;
  psyMark('fight');
  hurt(b.dmg, true);
}
