//@ world/vision — What the player can see: field of view and explored cells
//@ Defines: SIGHT_R, computeVision, smoothVision, TW, TH, MAPS, solidForExpand, EXP_SOLID, EXP_OUT, expandMaps
//@ Uses:    world/grid, world/light-map, world/objects
//@ (header made by tools/map.js; stripped by build.py)
// ───────────── what the player can see
const visTarget = new Uint8Array(W * H),
  visCur = new Float32Array(W * H),
  explored = new Uint8Array(W * H);
const SIGHT_R = 17;
let darkSight = 2.6;
function computeVision(px, pz) {
  visTarget.fill(0);
  fov(px, pz, SIGHT_R, blocksSight, (x, z, d) => {
    if (!inb(x, z)) return;
    const i = I(x, z);
    if (d <= darkSight || cellLum(i) >= 0.1 || WALLISH.has(tiles[i])) {
      visTarget[i] = 1;
      explored[i] = 1;
    }
  });
}
// Returns true while anything is still visibly fading in or out (the values themselves are exactly as before;
// once every cell is within 0.001 of where it's heading, the texture can't show the difference, so no re-upload).
function smoothVision(dt) {
  const up = Math.min(1, dt * 7),
    dn = Math.min(1, dt * 2.6);
  let moving = false;
  for (let i = 0; i < W * H; i++) {
    const t = visTarget[i],
      c = visCur[i];
    visCur[i] = t > c ? c + (t - c) * up : c + (t - c) * dn;
    if (!moving && (t - c > 0.001 || c - t > 0.001)) moving = true;
  }
  return moving;
}

// half-tile expansion: a wall tile's quadrants borrow from the room on their side,
// so light and sight never bleed through walls.
// It only runs when something it reads has changed (MAPS.dirty), and then MAPS.upload tells the renderer to
// send the new textures to the GPU.
const TW = W * 2,
  TH = H * 2;
const texLight = new Uint8Array(TW * TH * 4),
  texVis = new Uint8Array(TW * TH * 4);
const MAPS = { dirty: true, upload: true };
function solidForExpand(x, z) {
  const i = I(x, z);
  return WALLISH.has(tiles[i]) && !(doorAt[i] >= 0 && DOORS[doorAt[i]].open >= 0.5);
}
const EXP_SOLID = new Uint8Array(W * H),
  EXP_OUT = new Uint8Array(W * H);
function expandMaps() {
  if (!MAPS.dirty) return;
  MAPS.dirty = false;
  MAPS.upload = true;
  for (let i = 0; i < W * H; i++) {
    EXP_SOLID[i] = solidForExpand(i % W, (i / W) | 0) ? 1 : 0;
    EXP_OUT[i] = OUTDOOR.has(tiles[i]) ? 255 : 0;
  }
  for (let z = 0; z < H; z++)
    for (let x = 0; x < W; x++) {
      const solid = EXP_SOLID[I(x, z)];
      for (let qz = 0; qz < 2; qz++)
        for (let qx = 0; qx < 2; qx++) {
          let r = 0,
            g = 0,
            b = 0,
            v = 0,
            e = 0,
            out = 0;
          if (!solid) {
            const i = I(x, z);
            r = rLR[i];
            g = rLG[i];
            b = rLB[i];
            v = visCur[i];
            e = explored[i];
            out = EXP_OUT[i];
          } else {
            const dx = qx ? 1 : -1,
              dz = qz ? 1 : -1;
            for (let c = 0; c < 3; c++) {
              // the neighbours on this quadrant's side: across, along, diagonal
              const cx = c === 1 ? x : x + dx,
                cz = c === 0 ? z : z + dz;
              if (!inb(cx, cz)) continue;
              const i = I(cx, cz);
              if (EXP_SOLID[i]) continue;
              r = Math.max(r, rLR[i]);
              g = Math.max(g, rLG[i]);
              b = Math.max(b, rLB[i]);
              v = Math.max(v, visCur[i]);
              e = Math.max(e, explored[i]);
            }
          }
          const o = ((z * 2 + qz) * TW + (x * 2 + qx)) * 4;
          texLight[o] = Math.min(255, r * 127.5);
          texLight[o + 1] = Math.min(255, g * 127.5);
          texLight[o + 2] = Math.min(255, b * 127.5);
          texLight[o + 3] = 255;
          texVis[o] = v * 255;
          texVis[o + 1] = e * 255;
          texVis[o + 2] = out;
          texVis[o + 3] = 255;
        }
    }
}
const visAt = (x, z) => {
  x = Math.floor(x);
  z = Math.floor(z);
  return inb(x, z) ? visCur[I(x, z)] : 0;
};
const lumAt = (x, z) => {
  x = Math.floor(x);
  z = Math.floor(z);
  return inb(x, z) ? cellLum(I(x, z)) : 0;
};
