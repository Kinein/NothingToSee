//@ world/light-map — Line of sight helpers and the per-cell light map
//@ Defines: doorClosed, blocksSight, blocksLight, fov, losClear, LIGHTS, DYN, addLight, LAIR_LAMPS, WINDOWS, SKY, lightOn, STY, ST_RED, ST_AMBER, ST_TEAL, …
//@ Uses:    world/grid, core/util, world/objects, sim/core, gfx/world-geometry
//@ (header made by tools/map.js; stripped by build.py)
// ───────────────────── sight, light and paths ─────────────────────
function doorClosed(x, z) { const d = doorAt[I(x, z)]; return d >= 0 && DOORS[d].open < 0.5; }
function blocksSight(x, z) {
  if (!inb(x, z)) return true;
  const c = tiles[I(x, z)];
  if (c === '#' || c === 'X') return true;
  if ((c === 'D' || c === 'L') && doorClosed(x, z)) return true;
  return sightAt[I(x, z)] === 1;
}
function blocksLight(x, z) {
  if (!inb(x, z)) return true;
  const c = tiles[I(x, z)];
  if (c === '#' || c === 'X') return true;
  return (c === 'D' || c === 'L') && doorClosed(x, z);
}

// Symmetric shadowcasting (after Albert Ford), float slopes.
function fov(ox, oz, radius, blocks, reveal) {
  reveal(ox, oz, 0);
  for (let q = 0; q < 4; q++) {
    const tx = (row, col) => (q === 0 ? ox + col : q === 1 ? ox + row : q === 2 ? ox + col : ox - row);
    const tz = (row, col) => (q === 0 ? oz - row : q === 1 ? oz + col : q === 2 ? oz + row : oz + col);
    const scan = (depth, start, end) => {
      if (depth > radius) return;
      let prev = 0; // 0 none, 1 wall, 2 floor
      const minC = Math.floor(depth * start + 0.5), maxC = Math.ceil(depth * end - 0.5);
      for (let col = minC; col <= maxC; col++) {
        const x = tx(depth, col), z = tz(depth, col);
        const wall = blocks(x, z);
        if (wall || (col >= depth * start && col <= depth * end)) {
          const d = Math.hypot(x - ox, z - oz);
          if (d <= radius) reveal(x, z, d);
        }
        if (prev === 1 && !wall) start = (2 * col - 1) / (2 * depth);
        if (prev === 2 && wall) scan(depth + 1, start, (2 * col - 1) / (2 * depth));
        prev = wall ? 1 : 2;
      }
      if (prev === 2) scan(depth + 1, start, end);
    };
    scan(1, -1, 1);
  }
}

// line-of-sight test between two cells (used by NPCs deciding if they are watched)
function losClear(x0, z0, x1, z1) {
  const dx = x1 - x0, dz = z1 - z0, n = Math.ceil(Math.max(Math.abs(dx), Math.abs(dz)) * 2);
  for (let i = 1; i < n; i++) {
    const x = Math.floor(x0 + 0.5 + (dx * i) / n), z = Math.floor(z0 + 0.5 + (dz * i) / n);
    if ((x === Math.floor(x0 + 0.5) && z === Math.floor(z0 + 0.5)) || (x === x1 && z === z1)) continue;
    if (blocksSight(x, z)) return false;
  }
  return true;
}

// ───────────── light map (per cell, expanded to half-tiles for the GPU)
const lightR = new Float32Array(W * H), lightG = new Float32Array(W * H), lightB = new Float32Array(W * H);
const LIGHTS = [];
const DYN = [];        // per-frame lights: car headlights
function addLight(x, z, col, int, r, o) { const l = Object.assign({ x, z, col: hex(col), int, r, flick: 0, cur: 1, f: 1, grp: 'always' }, o || {}); LIGHTS.push(l); return l; }
(function defineLights() {
  addLight(6, 9, 0xd2efe4, 0.9, 7.5, { grp: 'office' });
  addLight(12, 9, 0xd2efe4, 0.9, 7.5, { grp: 'office' });
  addLight(19, 9, 0xd2efe4, 0.9, 7.5, { grp: 'office', flick: 0.5 });
  addLight(5, 3, 0xffe1b5, 0.8, 5, { grp: 'office' });
  addLight(10, 3, 0xcdf5e2, 0.9, 4, { grp: 'office', flick: 0.25 });
  addLight(20, 3, 0xf1e6bd, 0.9, 6, { grp: 'office', flick: 0.75 });
  addLight(15, 4, 0xff2a24, 0.3, 2.6);
  addLight(13, 11, 0xff2a20, 0.4, 5.5, { grp: 'officeNight' });
  addLight(10, 3, 0x8fffc0, 0.12, 3, { grp: 'officeNight' });
  addLight(34, 7, 0xe6f2ff, 0.9, 8, { grp: 'shop' });
  addLight(37, 9, 0xe6f2ff, 0.8, 7, { grp: 'shop' });
  addLight(41, 9, 0xffd78c, 0.6, 4, { grp: 'shop', flick: 0.35 });
  addLight(41, 5, 0xbce0ff, 0.55, 3.2, { grp: 'shop' });
  addLight(35, 13, 0xff4d86, 0.65, 4.5, { grp: 'shopSign' });
  addLight(12, 22, 0xffcd7d, 0.55, 5.5, { grp: 'always', flick: 0.45 });
  addLight(13, 28, 0xffcd7d, 0.45, 5);
  addLight(5, 21, 0xffc786, 0.75, 5, { grp: 'home' });
  addLight(8, 22, 0xffbd6c, 0.95, 6.5, { grp: 'home' });
  addLight(4, 29, 0xe6eedc, 0.7, 4, { grp: 'home' });
  addLight(9, 29, 0xffb56a, 0.9, 5, { grp: 'homeBed' });
  addLight(9, 21, 0x8db3ff, 0.55, 4.5, { grp: 'tv', flick: 0.9 });
  addLight(18, 22, 0xffad6c, 0.75, 6, { grp: 'agnes' });
  addLight(16, 29, 0xff985c, 0.5, 4, { grp: 'agnesBed' });
  addLight(23, 3, 0xcdeeff, 0.4, 2.6);
  for (const h of HOUSE_DEFS) addLight(h.spot[0], h.spot[1], 0xffc27a, 0.85, 5, { grp: 'house:' + h.id });
  for (const { d, out } of EXT_DOORS) if (!d.pairL) addLight(out[0], out[1], 0xffcf8e, 0.42, 2.6, { grp: 'street' });   // a porch light over every street door
  let first = true;
  for (const o of OBJ) {
    if (o.type === 'streetlamp') { addLight(o.x, o.z, 0xffa03c, 1.2, 7.5, { grp: 'street', flick: o.x === 18 ? 0.6 : 0 }); }
    if (o.type === 'parklamp') { addLight(o.x, o.z, 0xffb35a, 0.95, 6.5, { grp: 'street', flick: first ? 0 : 1.2 }); first = false; }
    if (o.type === 'alleylamp') addLight(o.x, o.z, 0xfff0b0, 0.55, 4.6, { grp: 'street', flick: 0.6 });
  }
})();

// THEIR places light themselves only while you're down there (lightGroupOn: 'lair:<key>')
const LAIR_LAMPS = [];   // { k, x, z, y, col, size, cone } for the glow and the shaft drawn over each light
(function lairLights() {
  const A = (k, lx, lz, col, int, r, o = {}) => {
    const [x, z] = LZ(k, lx, lz);
    const l = addLight(x, z, col, int, r, Object.assign({ grp: 'lair:' + k }, o.light || {}));
    if (o.glow || o.cone) LAIR_LAMPS.push(Object.assign({ k, l, x: x + 0.5 + (o.dx || 0), z: z + 0.5 + (o.dz || 0) }, o));
    return l;
  };
  // the craft: a white well of light over the table, cold pools down the corridors, green tanks, a cyan map, red at the pods
  A('ship', 6, 11, 0xeafff7, 1.1, 5.5, { glow: 1, y: 1.66, size: 0.42, cone: { r: 0.8, h: 0.82, a: 0.12 }, dz: 0.55 });
  A('ship', 8, 13, 0x9fe8ff, 0.32, 4.2);
  A('ship', 9, 3, 0x7affe0, 1.0, 6.5, { glow: 1, y: 1.6, size: 1.6, dx: 0.0, dz: -0.5, spec: 0.5 });
  A('ship', 4, 1, 0x7ad8ff, 0.35, 4); A('ship', 15, 1, 0x7ad8ff, 0.35, 4);
  for (const [lx, lz] of [[2, 6], [9, 7], [17, 6], [1, 12], [18, 12], [2, 18], [10, 17], [17, 18]]) A('ship', lx, lz, 0x86e6d6, 0.42, 3.3, { light: { flick: lx === 18 ? 0.5 : 0 } });
  for (const [lx, lz] of [[11, 9], [13, 9], [15, 9], [11, 15], [13, 15], [15, 15]]) A('ship', lx, lz, 0x6affb4, 0.5, 2.8);
  A('ship', 9, 21, 0xff3a2a, 0.6, 5, { light: { flick: 0.3 } });
  for (const lx of [6, 9, 12]) A('ship', lx, 23, 0xff8a4a, 0.35, 2.2);
  // the drains: lanterns where the tunnels meet, a blaze of candles over the gold, the streetlight down the shaft
  for (const [lx, lz] of [[3, 12], [12, 12], [17, 14], [8, 14], [9, 3], [11, 9], [16, 8], [12, 20], [1, 24]]) A('sewer', lx, lz, 0xffb258, 0.62, 3.6, { glow: 1, y: 1.85, size: 0.5, light: { flick: 0.35 } });
  A('sewer', 4, 5, 0xffc060, 1.05, 5.5, { glow: 1, y: 1.0, size: 0.55, light: { flick: 0.25 } });
  A('sewer', 15, 20, 0xffc060, 1.05, 5.0, { glow: 1, y: 1.0, size: 0.55, light: { flick: 0.25 } });
  A('sewer', 17, 1, 0xc0d4ff, 0.9, 3.6, { cone: { r: 0.75, h: 2.7, a: 0.12 }, y: 2.7, dx: 0.5, dz: -0.25 });
  A('sewer', 3, 19, 0xffa050, 0.85, 3.8, { glow: 1, y: 1.9, size: 0.4, light: { flick: 0.4 } });
  // the nest: embers where you lie, moonlight through holes in the roof, things growing on the walls that glow
  A('den', 11, 21, 0xff6a2a, 0.8, 4.8, { light: { flick: 0.6 } });
  A('den', 3, 12, 0x9ab4ff, 0.8, 4.4, { cone: { r: 1.3, h: 3.2, a: 0.08 }, y: 3.2 });
  A('den', 16, 12, 0x9ab4ff, 0.75, 4.4, { cone: { r: 1.2, h: 3.2, a: 0.08 }, y: 3.2 });
  A('den', 8, 5, 0x9ab4ff, 0.75, 4.8, { cone: { r: 1.4, h: 3.2, a: 0.08 }, y: 3.2 });
  A('den', 15, 2, 0xb8ccff, 1.25, 4.6, { cone: { r: 0.9, h: 3.2, a: 0.16 }, y: 3.2 });
  A('den', 9, 18, 0x9ab4ff, 0.5, 3.6, { cone: { r: 1.0, h: 3.2, a: 0.06 }, y: 3.2 });
  for (const [lx, lz] of [[5, 16], [13, 16], [6, 9], [12, 9], [5, 5], [12, 5], [2, 13], [17, 14]]) A('den', lx, lz, 0x5affc8, 0.42, 3.0, { glow: 1, y: 0.25, size: 0.2, fungus: 1, spec: 0.5 });
})();

const WINDOWS = [];
for (let z = 0; z < H; z++) for (let x = 0; x < W; x++) if (tget(x, z) === 'W') WINDOWS.push([x, z]);

let SKY = [0.1, 0.12, 0.2];        // set each frame from the time of day
const personal = { r: 3.2, int: 0.24, col: [1, 0.92, 0.82], beam: false, dx: 0, dz: 1 };

function lightOn(l) { return typeof lightGroupOn === 'function' ? lightGroupOn(l.grp, l) : true; }
// The render keeps its own copy of the light map. The game reads lightR/G/B (who is lit, who can hide); the screen
// reads rLR/G/B, where a frayed mind recolours the town: sodium deepens, some lamps go the colour of blood, the
// cold lights turn teal. Same light, same reach, so nothing you can see or hide behind ever changes.
const rLR = new Float32Array(W * H), rLG = new Float32Array(W * H), rLB = new Float32Array(W * H);
const STY = { k: 0, beat: 0, beatT: 0, sky: [0.1, 0.12, 0.2] };
const ST_RED = [1, 0.055, 0.04], ST_AMBER = [1, 0.6, 0.17], ST_TEAL = [0.26, 0.92, 0.84];
// the order the street turns: the lamp that always flickered goes first; half the street stays sodium to the end
const ST_ORDER = { '18,13': 0, '38,18': 0.15, '9,18': 0.3, '52,13': 0.45, '41,25': 0.55, '29,9': 0.62 };
function lightHue(l) {
  if (l.hue == null) { const k = l.x + ',' + l.z; l.hue = l.grp === 'street' ? (k in ST_ORDER ? ST_ORDER[k] : 0.99) : 0.04 + hash2(l.x * 7 + 3, l.z * 5 + 1, 17) * 0.96; }
  return l.hue;
}
function styleLight(l) {
  const c = l.col, k = STY.k;
  if (k < 0.004 || l.grp === 'tv') return c;
  const m = Math.max(c[0], c[1], c[2]) || 1;
  const redSrc = c[1] < c[0] * 0.35;                       // exit signs, the shop's neon: already red, go deeper
  const warm = c[0] > c[2] * 1.15;
  const hue = lightHue(l), th = l.grp === 'street' ? 0.1 + hue * 1.05 : 0.15 + hue * 1.25;   // each light has its own breaking point
  const red = redSrc ? 1 : sstep(th, th + 0.2, k) * (warm ? 1 : hue < 0.3 ? 1 : 0);
  let tgt = warm || redSrc ? ST_AMBER : ST_TEAL;
  tgt = mix3(tgt, ST_RED, red);
  let out = mix3(c, mul3(tgt, m * (1 + red * 0.35)), Math.min(1, k * 1.5));
  // the red ones don't hold steady once you're past shaken
  if (red > 0.5 && k > 0.55 && Math.random() < 0.03 * k) out = mul3(out, rand(0.2, 0.6));
  if (red > 0.5) out = mul3(out, 1 + STY.beat * 0.35 * k);
  return out;
}
// ── reach cache. A fixed light's reach (which cells, how strongly) depends only on the walls, which never change,
// and on the doors its rays met. So each light's shadowcast is kept and redone only when one of those doors has
// swung across half-open since. The result is the same light map as casting every light every time, much cheaper.
const REACH = new Map();            // key → { cells: Int32Array, fall: Float64Array, doors: Int32Array, shut: Uint8Array }
const DOOR_SHUT = [];               // per door, this pass: is it closed (open < 0.5)?
let OUTDOOR_CELLS = null;           // indices of outdoor cells: the sky reaches these
function reachOf(key, x, z, r, indoorOnly) {
  const c = REACH.get(key);
  if (c) {
    let ok = true;
    for (let k = 0; k < c.doors.length; k++) if (DOOR_SHUT[c.doors[k]] !== c.shut[k]) { ok = false; break; }
    if (ok) return c;
  }
  const cells = [], fall = [], doors = new Set();
  const noteDoor = (x2, z2) => { if (inb(x2, z2)) { const d = doorAt[I(x2, z2)]; if (d >= 0) doors.add(d); } };
  fov(x, z, r, (x2, z2) => { noteDoor(x2, z2); return blocksLight(x2, z2); }, (x2, z2, d) => {
    if (!inb(x2, z2)) return;
    const i = I(x2, z2);
    noteDoor(x2, z2);
    if (WALLISH.has(tiles[i]) && !(doorAt[i] >= 0 && !doorClosed(x2, z2))) return;
    if (indoorOnly && OUTDOOR.has(tiles[i])) return;
    const f = Math.pow(clamp(1 - d / (r + 0.5), 0, 1), 1.5);
    if (f > 0) { cells.push(i); fall.push(f); }
  });
  const ds = [...doors];
  const out = { cells: Int32Array.from(cells), fall: Float64Array.from(fall), doors: Int32Array.from(ds), shut: Uint8Array.from(ds.map((d) => (DOOR_SHUT[d] ? 1 : 0))) };
  REACH.set(key, out);
  return out;
}
// adds a cached reach to both maps: the game's (col) and the screen's (rcol)
function addReach(c, col, int, rcol) {
  const cells = c.cells, fall = c.fall;
  for (let k = 0; k < cells.length; k++) {
    const i = cells[k], f = fall[k] * int;
    lightR[i] += col[0] * f; lightG[i] += col[1] * f; lightB[i] += col[2] * f;
    rLR[i] += rcol[0] * f; rLG[i] += rcol[1] * f; rLB[i] += rcol[2] * f;
  }
}
function computeLight(px, pz) {
  for (let d = 0; d < DOORS.length; d++) DOOR_SHUT[d] = DOORS[d].open < 0.5 ? 1 : 0;
  if (!OUTDOOR_CELLS) { const o = []; for (let i = 0; i < W * H; i++) if (OUTDOOR.has(tiles[i])) o.push(i); OUTDOOR_CELLS = Int32Array.from(o); }
  lightR.fill(0.022); lightG.fill(0.024); lightB.fill(0.034);
  { const t = Math.min(1, STY.k * 1.4); rLR.fill(lerp(0.034, 0.016, t)); rLG.fill(lerp(0.042, 0.04, t)); rLB.fill(lerp(0.064, 0.058, t)); }
  const sk = STY.sky = STY.k > 0.004 ? mix3(SKY, [SKY[0] * 0.55, SKY[1] * 0.9, SKY[2] * 1.05], Math.min(1, STY.k * 1.3)) : SKY;
  for (let k = 0; k < OUTDOOR_CELLS.length; k++) {
    const i = OUTDOOR_CELLS[k];
    lightR[i] += SKY[0]; lightG[i] += SKY[1]; lightB[i] += SKY[2]; rLR[i] += sk[0]; rLG[i] += sk[1]; rLB[i] += sk[2];
  }
  // moving lights (headlights, bolts, your own glow and torch) are cast fresh every time
  const add = (l, col, int, r, rcol) => {
    rcol = rcol || col;
    fov(l.x, l.z, r, blocksLight, (x, z, d) => {
      if (!inb(x, z)) return;
      const i = I(x, z);
      if (WALLISH.has(tiles[i]) && !(doorAt[i] >= 0 && !doorClosed(x, z))) return;
      if (l.indoorOnly && OUTDOOR.has(tiles[i])) return;
      let f = Math.pow(clamp(1 - d / (r + 0.5), 0, 1), 1.5) * int;
      if (l.cone && d > 0.7) { const dot = ((x - l.x) * l.dx + (z - l.z) * l.dz) / d; f *= sstep(l.cone, l.cone + 0.14, dot); if (f <= 0.001) return; }
      lightR[i] += col[0] * f; lightG[i] += col[1] * f; lightB[i] += col[2] * f;
      rLR[i] += rcol[0] * f; rLG[i] += rcol[1] * f; rLB[i] += rcol[2] * f;
    });
  };
  const skyLum = SKY[0] * 0.3 + SKY[1] * 0.59 + SKY[2] * 0.11;
  if (skyLum > 0.03) for (let w = 0; w < WINDOWS.length; w++) { const [x, z] = WINDOWS[w]; addReach(reachOf('w' + w, x, z, 4.5, true), SKY, 0.8, sk); }
  for (let k = 0; k < LIGHTS.length; k++) {
    const l = LIGHTS[k];
    if (!lightOn(l)) continue;
    if (l.flick) {
      if (l.cur < 1) l.cur = Math.min(1, l.cur + 0.25);
      if (Math.random() < l.flick * 0.07 * l.f) l.cur = rand(0.05, 0.55);
    }
    l.rcol = styleLight(l);
    addReach(reachOf('l' + k, l.x, l.z, l.r, !!l.indoorOnly), l.col, l.int * l.cur, l.rcol);
  }
  for (const l of DYN) add(l, l.col, l.int, l.r);
  if (px != null) {
    // your own faint glow: cached per cell like the fixed lights (the beam of a torch turns, so it isn't)
    if (REACH.size > 3000) REACH.clear();   // a long walk leaves many cells behind: start over now and then
    addReach(reachOf('p' + px + ',' + pz + ',' + personal.r, px, pz, personal.r, false), personal.col, personal.int, personal.col);
    if (personal.beam) add({ x: px, z: pz, dx: personal.dx, dz: personal.dz, cone: 0.74 }, [0.86, 0.93, 1], 1.15, 8.5);
  }
}
const cellLum = (i) => lightR[i] * 0.3 + lightG[i] * 0.59 + lightB[i] * 0.11;

