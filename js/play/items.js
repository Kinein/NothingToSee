//@ play/items — Items left behind
//@ Defines: ITEM_ID, addItem, removeItem
//@ Uses:    sim/core, gfx/renderer, gfx/props
//@ (header made by tools/map.js; stripped by build.py)
// ───────────── items left behind
let ITEM_ID = 0;
function addItem(it) {
  it.id = ++ITEM_ID;
  G.items.push(it);
  if (R.ready) R.itemMeshes.set(it.id, buildItemMesh(it));
}
function removeItem(it) {
  G.items = G.items.filter((x) => x !== it);
  R.itemMeshes.delete(it.id);
}
