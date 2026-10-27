//@ town/spawning — Placing people on the map
//@ Defines: edgeFor, spawnNPC, leaveMap
//@ Uses:    world/grid, sim/actions, town/npc-update, world/objects, sim/characters
//@ (header made by tools/map.js; stripped by build.py)
// ───────────── spawning
function edgeFor(n, destZ) {
  const side = EDGES[n.def.edge || 'W'];
  return destZ < 15.5 ? side[0] : side[1];
}
function spawnNPC(n, b) {
  const dest =
    b.a === 'clerk' || b.a === 'shop' || b.a === 'courier'
      ? 8
      : b.a === 'gather'
        ? 7
        : b.a === 'stroll' || b.a === 'prowl'
          ? 22
          : b.a === 'watch'
            ? 17
            : 9;
  const [x, z] = edgeFor(n, dest);
  placeChar(n, x, z);
  n.onMap = true;
  n.queue = [];
  n.pose = 'stand';
  n.shown = 0;
  n.prevRoom = null;
  n.thinkCd = 0;
  n.dir = n.tdir = x < 5 ? Math.PI / 2 : -Math.PI / 2;
}
function leaveMap(n) {
  if (!n.slain && !n.def.stranger && HOUSE_OF[n.id]) {
    const h = HOUSE_OF[n.id],
      r = roomAt(n.x, n.z);
    return enqueue(n, r && r.house === n.id ? waitAct({ dur: 5 }) : goAct(h.spot, { label: 'Home' }));
  }
  const [x, z] = edgeFor(n, n.z);
  enqueue(
    n,
    mkAct({
      kind: 'go',
      to: [x, z],
      label: 'Leaving',
      onEnd: (c, a, ok) => {
        if (ok || Math.hypot(c.x - x - 0.5, c.z - z - 0.5) < 2) c.onMap = false;
        else c.thinkCd = 2;
      },
    }),
  );
}
