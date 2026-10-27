//@ world/paths — A* pathfinding, 8-way, no corner cutting
//@ Defines: insideOf, walkable, PF, findPath, nearestWalkable
//@ Uses:    world/grid, sim/core, world/objects
//@ (header made by tools/map.js; stripped by build.py)
// ───────────── paths (A*, 8-way, no corner cutting)
// standing in a house: its own front door opens from the inside, whoever you are
function insideOf(who, key) {
  if (who.x == null) return false;
  const r = roomAt(who.x, who.z);
  return !!(r && (r.house === key || (key === 'agnes' && r.agnes)));
}
function walkable(x, z, who) {
  if (!inb(x, z)) return false;
  const i = I(x, z),
    c = tiles[i];
  if (c === '#' || c === 'W' || VOIDISH.has(c)) return false;
  if (blockAt[i]) return false;
  if (c === 'L') {
    const d = doorAt[i],
      key = d >= 0 ? DOORS[d].key : 'agnes';
    return (
      !!who &&
      (who.id === key ||
        !!who.breakIn ||
        !!who.trueForm ||
        insideOf(who, key) ||
        (!!who.isPlayer && !!G && !!G.broken && G.broken[key] > G.t))
    );
  }
  if (c === 'D' && isShopDoor(x, z) && typeof shopOpen === 'function' && !shopOpen()) {
    return !!who && (who.id === 'vic' || (roomAt(who.x, who.z) || {}).bld === 'shop');
  }
  return true;
}
// A* over the tile grid. It runs often (every walk, every chase step) and a search that can't reach its goal
// explores everything it can before giving up, so it keeps its working arrays between calls (reset by a
// generation stamp instead of being reallocated), remembers walkable() answers for the length of one search,
// and keeps its heap in two flat arrays. Same steps, same tie-breaks, same paths as a fresh search.
const PF = {
  g: new Float32Array(W * H),
  came: new Int32Array(W * H),
  seen: new Uint32Array(W * H),
  closed: new Uint32Array(W * H),
  walk: new Uint8Array(W * H),
  wseen: new Uint32Array(W * H),
  gen: 0,
  hf: [],
  hi: [],
};
function findPath(sx, sz, tx, tz, who) {
  sx = Math.floor(sx);
  sz = Math.floor(sz);
  if (!inb(tx, tz) || !walkable(tx, tz, who)) return null;
  if (sx === tx && sz === tz) return [];
  const gen = ++PF.gen,
    g = PF.g,
    came = PF.came,
    seen = PF.seen,
    closed = PF.closed,
    walk = PF.walk,
    wseen = PF.wseen;
  const gOf = (i) => (seen[i] === gen ? g[i] : 1e9);
  const canWalk = (x, z) => {
    // walkable(), asked at most once per cell per search
    if (!inb(x, z)) return false;
    const i = I(x, z);
    if (wseen[i] !== gen) {
      wseen[i] = gen;
      walk[i] = walkable(x, z, who) ? 1 : 0;
    }
    return walk[i] === 1;
  };
  const hf = PF.hf,
    hi = PF.hi;
  hf.length = 0;
  hi.length = 0; // the open list: a binary heap of (f, cell)
  const swap = (a, b) => {
    const f = hf[a];
    hf[a] = hf[b];
    hf[b] = f;
    const i = hi[a];
    hi[a] = hi[b];
    hi[b] = i;
  };
  const push = (f, i) => {
    hf.push(f);
    hi.push(i);
    let k = hf.length - 1;
    while (k > 0) {
      const p = (k - 1) >> 1;
      if (hf[p] <= hf[k]) break;
      swap(p, k);
      k = p;
    }
  };
  const pop = () => {
    const top = hi[0],
      lf = hf.pop(),
      li = hi.pop();
    if (hf.length) {
      hf[0] = lf;
      hi[0] = li;
      let k = 0;
      for (;;) {
        const l = 2 * k + 1,
          r = l + 1;
        let m = k;
        if (l < hf.length && hf[l] < hf[m]) m = l;
        if (r < hf.length && hf[r] < hf[m]) m = r;
        if (m === k) break;
        swap(m, k);
        k = m;
      }
    }
    return top;
  };
  const hfn = (x, z) => {
    const dx = Math.abs(x - tx),
      dz = Math.abs(z - tz);
    return Math.max(dx, dz) + 0.414 * Math.min(dx, dz);
  };
  const s = I(sx, sz);
  g[s] = 0;
  seen[s] = gen;
  came[s] = -1;
  push(hfn(sx, sz), s);
  const goal = I(tx, tz);
  while (hf.length) {
    const cur = pop();
    if (cur === goal) break;
    if (closed[cur] === gen) continue;
    closed[cur] = gen;
    const cx = cur % W,
      cz = (cur / W) | 0;
    for (let dz = -1; dz <= 1; dz++)
      for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dz) continue;
        const nx = cx + dx,
          nz = cz + dz;
        if (!canWalk(nx, nz)) continue;
        if (dx && dz && (!canWalk(cx + dx, cz) || !canWalk(cx, cz + dz))) continue;
        const ni = I(nx, nz);
        const doorPen = doorAt[ni] >= 0 ? 0.3 : 0;
        const ng = g[cur] + (dx && dz ? 1.414 : 1) + doorPen;
        if (ng < gOf(ni)) {
          g[ni] = ng;
          seen[ni] = gen;
          came[ni] = cur;
          push(ng + hfn(nx, nz), ni);
        }
      }
  }
  if (seen[goal] !== gen) return null;
  const out = [];
  let k = goal;
  while (k !== s) {
    out.push([k % W, (k / W) | 0]);
    k = came[k];
  }
  return out.reverse();
}
function nearestWalkable(x, z, who, maxR = 6) {
  x = Math.floor(x);
  z = Math.floor(z);
  for (let r = 0; r <= maxR; r++) {
    let best = null,
      bd = 1e9;
    for (let dz = -r; dz <= r; dz++)
      for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dz)) !== r) continue;
        if (walkable(x + dx, z + dz, who)) {
          const d = dx * dx + dz * dz;
          if (d < bd) {
            bd = d;
            best = [x + dx, z + dz];
          }
        }
      }
    if (best) return best;
  }
  return null;
}
