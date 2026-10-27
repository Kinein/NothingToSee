//@ sim/movement — Following paths and moving characters
//@ Defines: smoothPath, setPath, followPath
//@ Uses:    data/tuning, sim/core, world/paths
//@ (header made by tools/map.js; stripped by build.py)
// ───────────────────────── paths & motion
function smoothPath(c, path) {
  if (!path || path.length < 2) return path;
  const clear = (ax, az, bx, bz) => {
    const d = Math.hypot(bx - ax, bz - az),
      n = Math.ceil(d / 0.2);
    for (let i = 1; i <= n; i++) {
      const x = ax + ((bx - ax) * i) / n,
        z = az + ((bz - az) * i) / n;
      for (const [ox, oz] of [
        [0, 0],
        [0.22, 0.22],
        [-0.22, 0.22],
        [0.22, -0.22],
        [-0.22, -0.22],
      ]) {
        const cx = Math.floor(x + ox),
          cz = Math.floor(z + oz);
        if (!walkable(cx, cz, c) && !(cx === Math.floor(ax) && cz === Math.floor(az))) return false;
      }
    }
    return true;
  };
  const out = [];
  let px = c.x,
    pz = c.z,
    i = 0;
  while (i < path.length) {
    let j = Math.min(path.length - 1, i + 8);
    while (j > i && !clear(px, pz, path[j][0] + 0.5, path[j][1] + 0.5)) j--;
    out.push(path[j]);
    px = path[j][0] + 0.5;
    pz = path[j][1] + 0.5;
    i = j + 1;
  }
  return out;
}
function setPath(c, tx, tz) {
  const p = findPath(c.x, c.z, tx, tz, c);
  if (!p) return false;
  c.path = smoothPath(c, p);
  c.pi = 0;
  c.moving = c.path.length > 0;
  return true;
}
function followPath(c, dt) {
  if (!c.path || c.pi >= c.path.length) {
    c.moving = false;
    return true;
  }
  let slow = 1;
  if (c.isPlayer && (PLAYER.needs.energy < 15 || G.t < (G.shakenUntil || 0))) slow = 0.8;
  const pace = c.isPlayer
    ? CTRL.walk * (c.run ? CTRL.sprint : 1)
    : (c.spd || 1) * (c.run ? CTRL.npcRun : c.trueForm ? 1 : CTRL.npcPace);
  let dist = WALK * dt * pace * slow,
    moved = 0;
  while (dist > 1e-6 && c.pi < c.path.length) {
    const p = c.path[c.pi],
      tx = p[0] + 0.5,
      tz = p[1] + 0.5,
      dx = tx - c.x,
      dz = tz - c.z,
      d = Math.hypot(dx, dz);
    if (d > 0.02) c.tdir = Math.atan2(dx, dz);
    if (d <= dist) {
      c.x = tx;
      c.z = tz;
      dist -= d;
      moved += d;
      c.pi++;
    } else {
      c.x += (dx / d) * dist;
      c.z += (dz / d) * dist;
      moved += dist;
      dist = 0;
    }
  }
  c.walkPh += moved * (c.run ? 4.6 : 3.7);
  c.moving = c.pi < c.path.length;
  return !c.moving;
}
