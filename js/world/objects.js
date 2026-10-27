//@ world/objects — Object placement on the grid, doors, edges, ritual and watch spots
//@ Defines: DIRS, FACE_ANG, OT, PLACE, OBJ, OBJ_BY_ID, DOORS, SHOP_DOOR, EDGES, RITUAL, WATCH_SPOT
//@ Uses:    world/grid, gfx/world-geometry
//@ (header made by tools/map.js; stripped by build.py)
// ───────────────────────── objects ─────────────────────────
// Canonical models face +z (south). cw/ch are canonical footprint dims.
// kind: 'use' stand in front · 'sit' seat per tile · 'lie' bed · 'in' step inside · 'deco'
const DIRS = [
  [0, 1],
  [-1, 0],
  [0, -1],
  [1, 0],
]; // face 0=S 1=W 2=N 3=E
const FACE_ANG = [0, -Math.PI / 2, Math.PI, Math.PI / 2];
const OT = {
  bed: { n: 'Bed', cw: 1, ch: 2, h: 0.9, kind: 'lie' },
  toilet: { n: 'Toilet', h: 0.85, kind: 'sit', seatY: 0.43 },
  shower: { n: 'Shower', cw: 2, ch: 2, h: 2.2, kind: 'in' },
  sink: { n: 'Sink', h: 1.7, kind: 'use' },
  fridge: { n: 'Fridge', h: 1.9, kind: 'use', tall: 1 },
  fridge_office: { n: 'Office fridge', h: 1.9, kind: 'use', tall: 1 },
  counter: { n: 'Counter', h: 0.95, kind: 'deco' },
  microwave: { n: 'Microwave', h: 1.2, kind: 'deco' },
  stove: { n: 'Stove', h: 1.0, kind: 'use' },
  sinkcounter: { n: 'Kitchen sink', h: 1.0, kind: 'use' },
  phone: { n: 'Phone', h: 1.1, kind: 'use' },
  tv: { n: 'Television', cw: 2, h: 1.2, kind: 'use' },
  oldtv: { n: 'Television', h: 1.1, kind: 'deco' },
  table: { n: 'Table', cw: 2, h: 0.8, kind: 'deco' },
  chair: { n: 'Chair', h: 0.95, kind: 'sit', seatY: 0.47 },
  armchair: { n: 'Armchair', h: 1.0, kind: 'sit', seatY: 0.44 },
  sofa: { n: 'Sofa', cw: 3, h: 0.9, kind: 'sit', seatY: 0.44 },
  floorlamp: { n: 'Floor lamp', h: 1.7, kind: 'deco' },
  radiator: { n: 'Radiator', h: 0.7, kind: 'use' },
  desk: { n: 'Desk', cw: 2, h: 1.25, kind: 'deco' },
  bossdesk: { n: 'Big desk', cw: 2, h: 1.1, kind: 'deco' },
  chair_office: { n: 'Office chair', h: 1.05, kind: 'sit', seatY: 0.5 },
  bookshelf: { n: 'Bookshelf', cw: 2, h: 2.0, kind: 'deco', sight: 1, tall: 1 },
  plant: { n: 'Rubber plant', h: 1.4, kind: 'deco', tall: 1 },
  watercooler: { n: 'Water cooler', h: 1.35, kind: 'use' },
  printer: { n: 'Printer', h: 1.1, kind: 'use' },
  coffee: { n: 'Coffee machine', h: 1.35, kind: 'use' },
  vending: { n: 'Vending machine', h: 1.95, kind: 'use', sight: 1, tall: 1 },
  serverrack: { n: 'Server rack', h: 2.0, kind: 'use', sight: 1, tall: 1 },
  metalshelf: { n: 'Shelving', cw: 3, h: 1.9, kind: 'use', sight: 1, tall: 1 },
  shelf_groc: { n: 'Groceries', cw: 3, h: 1.8, kind: 'use', sight: 1, tall: 1 },
  shelf_house: { n: 'Household goods', cw: 3, h: 1.8, kind: 'use', sight: 1, tall: 1 },
  shelf_snack: { n: 'Snacks', cw: 3, h: 1.8, kind: 'use', sight: 1, tall: 1 },
  cooler: { n: 'Drinks cooler', cw: 3, h: 2.0, kind: 'use', sight: 1, tall: 1 },
  newsrack: { n: 'Newspaper rack', h: 1.2, kind: 'use' },
  shopcounter: { n: 'Till', cw: 3, h: 1.05, kind: 'deco' },
  crates: { n: 'Boxes', h: 1.3, kind: 'use' },
  mailbox: { n: 'Mailboxes', h: 1.6, kind: 'use' },
  stairs: { n: 'Stairs', cw: 2, ch: 2, h: 2.4, kind: 'use' },
  pcdesk: { n: 'Computer', h: 1.25, kind: 'deco' },
  nightstand: { n: 'Bedside lamp', h: 0.95, kind: 'deco' },
  wardrobe: { n: 'Wardrobe', h: 2.0, kind: 'deco', sight: 1, tall: 1 },
  birdcage: { n: 'Birdcage', h: 1.7, kind: 'use' },
  streetlamp: { n: 'Streetlamp', h: 4.2, kind: 'deco', tall: 1, thin: 1 },
  parklamp: { n: 'Park lamp', h: 3.4, kind: 'deco', tall: 1, thin: 1 },
  alleylamp: { n: 'Bare bulb', h: 2.9, kind: 'deco', tall: 1, thin: 1 },
  tree: { n: 'Elm', h: 4.6, kind: 'deco', sight: 1, tall: 1 },
  bench: { n: 'Bench', cw: 2, h: 0.95, kind: 'sit', seatY: 0.46 },
  payphone: { n: 'Payphone', h: 2.0, kind: 'use', tall: 1, thin: 1 },
  trashcan: { n: 'Bin', h: 0.95, kind: 'use' },
  dumpster: { n: 'Dumpster', cw: 2, h: 1.4, kind: 'use' },
  cart: { n: "Lenny's trolley", h: 1.1, kind: 'deco' },
  bucket: { n: 'Mop bucket', h: 1.2, kind: 'deco' },
  hydrant: { n: 'Hydrant', h: 0.8, kind: 'deco' },
  doorknock: { n: "Agnes's door", h: 2.2, kind: 'use', ghost: 1 },
  fence4: { n: 'Fence', cw: 4, h: 1.1, kind: 'deco' },
  fence3: { n: 'Fence', cw: 3, h: 1.1, kind: 'deco' },
  rug_home: { n: 'Rug', cw: 3, ch: 2, h: 0.02, kind: 'deco', flat: 1 },
  rug_agnes: { n: 'Rug', cw: 3, ch: 2, h: 0.02, kind: 'deco', flat: 1 },
  runner: { n: 'Runner', cw: 3, h: 0.02, kind: 'deco', flat: 1 },
  rug_house: { n: 'Rug', cw: 3, ch: 2, h: 0.02, kind: 'deco', flat: 1 },
  trashbags: { n: 'Rubbish bags', h: 0.7, kind: 'deco' },
  parkedcar: { n: 'Parked car', ch: 2, h: 1.0, kind: 'deco' },
  boxes: { n: 'Boxes', h: 0.8, kind: 'deco' },
  drain: { n: 'Storm drain', h: 0.1, kind: 'use' },
  radio: { n: 'Radio', h: 1.05, kind: 'deco' },
};
// [type, x, z, face, extra]
const PLACE = [
  // ── office: manager's room
  ['bossdesk', 3, 3, 2, { id: 'deskBoss' }],
  ['chair_office', 3, 2, 0, { id: 'chairBoss' }],
  ['bookshelf', 6, 2, 0],
  ['plant', 7, 4, 0],
  ['radiator', 2, 4, 3],
  // ── restroom & closet
  ['toilet', 10, 2, 0, { id: 'wcOffice' }],
  ['sink', 11, 4, 1],
  ['metalshelf', 13, 2, 0],
  ['serverrack', 15, 3, 1],
  ['bucket', 13, 3, 0],
  // ── break room
  ['fridge_office', 17, 2, 0],
  ['microwave', 18, 2, 0],
  ['coffee', 19, 2, 0, { id: 'coffee' }],
  ['counter', 20, 2, 0],
  ['radiator', 22, 2, 0],
  ['vending', 23, 2, 0],
  ['table', 23, 4, 0],
  ['chair', 22, 4, 3, { id: 'breakChairA' }],
  ['chair', 24, 3, 0, { id: 'breakChairB' }],
  // ── open plan desks (front = sitter side)
  ['desk', 3, 8, 0, { id: 'deskA1' }],
  ['chair_office', 3, 9, 2, { id: 'chairA1' }],
  ['desk', 7, 8, 0, { id: 'deskA2', mine: 1 }],
  ['chair_office', 7, 9, 2, { id: 'chairA2' }],
  ['desk', 17, 8, 0, { id: 'deskA3' }],
  ['chair_office', 17, 9, 2, { id: 'chairA3' }],
  ['desk', 21, 8, 0, { id: 'deskA4' }],
  ['chair_office', 21, 9, 2, { id: 'chairA4' }],
  ['desk', 3, 11, 2, { id: 'deskB1' }],
  ['chair_office', 3, 10, 0, { id: 'chairB1' }],
  ['desk', 7, 11, 2, { id: 'deskB2' }],
  ['chair_office', 7, 10, 0, { id: 'chairB2' }],
  ['desk', 17, 11, 2, { id: 'deskB3' }],
  ['chair_office', 17, 10, 0, { id: 'chairB3' }],
  ['desk', 21, 11, 2, { id: 'deskB4' }],
  ['chair_office', 21, 10, 0, { id: 'chairB4' }],
  ['watercooler', 11, 8, 0, { id: 'cooler' }],
  ['printer', 15, 8, 0],
  ['plant', 2, 6, 0],
  ['plant', 24, 2, 0],
  ['plant', 12, 11, 0],
  // ── Pell's Market
  ['shelf_groc', 32, 5, 0],
  ['shelf_house', 36, 5, 0],
  ['shelf_snack', 36, 8, 2],
  ['cooler', 40, 4, 0],
  ['newsrack', 31, 8, 3],
  ['shopcounter', 32, 10, 2, { id: 'till' }],
  ['crates', 42, 8, 1],
  ['metalshelf', 40, 11, 2],
  // ── your flat
  ['fridge', 3, 20, 0, { id: 'homeFridge' }],
  ['counter', 4, 20, 0],
  ['stove', 5, 20, 0, { id: 'stove' }],
  ['sinkcounter', 6, 20, 0],
  ['phone', 7, 20, 0, { id: 'homePhone' }],
  ['tv', 8, 20, 0, { id: 'homeTV' }],
  ['table', 3, 23, 1],
  ['chair', 4, 23, 1, { id: 'homeChairA' }],
  ['chair', 4, 24, 1, { id: 'homeChairB' }],
  ['sofa', 7, 23, 2],
  ['floorlamp', 6, 23, 0],
  ['radiator', 3, 25, 3],
  ['toilet', 3, 28, 3, { id: 'wcHome' }],
  ['sink', 6, 28, 1, { id: 'homeSink' }],
  ['shower', 3, 30, 2],
  ['bed', 10, 30, 2, { id: 'homeBed' }],
  ['nightstand', 9, 31, 2],
  ['pcdesk', 8, 27, 0, { id: 'pc' }],
  ['chair', 8, 28, 2, { id: 'pcChair' }],
  ['wardrobe', 10, 27, 1],
  // ── stairwell
  ['mailbox', 13, 27, 1],
  ['stairs', 12, 30, 2, { id: 'stairs' }],
  ['radiator', 13, 29, 1],
  ['doorknock', 14, 23, 1, { id: 'agnesDoor' }],
  ['doorknock', 11, 22, 1, { id: 'homeLock' }],
  // ── Agnes's flat
  ['oldtv', 17, 20, 0],
  ['armchair', 17, 23, 2, { id: 'agnesChair' }],
  ['counter', 20, 20, 0],
  ['stove', 21, 20, 0],
  ['fridge', 22, 20, 0, { id: 'agnesFridge', owner: 'agnes' }],
  ['birdcage', 22, 24, 1],
  ['radiator', 15, 21, 3, { id: 'agnesRad' }],
  ['bed', 15, 30, 2, { id: 'agnesBed' }],
  ['nightstand', 16, 31, 2],
  ['toilet', 22, 28, 1, { id: 'wcAgnes' }],
  // ── street, alley, park
  ['streetlamp', 6, 13, 0],
  ['streetlamp', 18, 13, 0],
  ['streetlamp', 41, 13, 0],
  ['streetlamp', 9, 18, 2],
  ['streetlamp', 25, 18, 2],
  ['streetlamp', 38, 18, 2],
  ['hydrant', 20, 13, 0],
  ['dumpster', 27, 2, 0, { id: 'dumpster' }],
  ['alleylamp', 29, 9, 1],
  ['bench', 34, 25, 0, { id: 'lennyBench' }],
  ['bench', 38, 27, 2, { id: 'parkBench' }],
  ['cart', 36, 24, 0],
  ['payphone', 32, 21, 3],
  ['parklamp', 32, 27, 0],
  ['parklamp', 41, 25, 0],
  ['trashcan', 36, 25, 0],
  ['fence4', 24, 19, 0],
  ['fence4', 28, 19, 0],
  ['fence4', 35, 19, 0],
  ['fence3', 39, 19, 0],
  ['parkedcar', 2, 14, 3],
  ['parkedcar', 40, 17, 1],
  ['trashbags', 26, 2, 0],
  ['boxes', 29, 4, 0],
  ['rug_home', 7, 21, 0],
  ['rug_agnes', 16, 22, 0],
  ['runner', 13, 9, 0],
  ['tree', 28, 21, 0],
  ['tree', 29, 30, 0],
  ['tree', 37, 21, 0],
  ['tree', 40, 22, 0],
  ['tree', 42, 31, 0],
  ['tree', 36, 30, 0],
  ['tree', 27, 24, 0],
  ['tree', 44, 28, 0],
  ['radio', 21, 2, 0, { id: 'radioBreak' }],
  ['radio', 40, 8, 0, { id: 'radioStock' }],
  ['radio', 19, 20, 0, { id: 'radioAgnes' }],
  ['bench', 39, 30, 2, { id: 'parkBench2' }],
  ['drain', 26, 11, 0, { id: 'drain' }],
  ['trashcan', 17, 4, 3, { id: 'breakBin' }],
  ['streetlamp', 52, 13, 0],
  ['streetlamp', 58, 18, 2],
  ['parkedcar', 55, 14, 3],
  ['tree', 50, 30, 0],
  ['tree', 57, 29, 0],
];
// a bed, a lamp, a chair and a radiator in every home
for (const h of HOUSE_DEFS) {
  const a = h.x0,
    N = h.row === 'N';
  if (N)
    PLACE.push(
      ['bed', a + 3, 5, 0, { id: 'bed_' + h.id }],
      ['nightstand', a + 1, 5, 0, { house: h.id, id: 'lamp_' + h.id }],
      ['armchair', a + 1, 8, 3, { id: 'chair_' + h.id }],
      ['radiator', a + 3, 9, 1, { id: 'rad_' + h.id }],
    );
  else
    PLACE.push(
      ['bed', a + 3, 25, 2, { id: 'bed_' + h.id }],
      ['nightstand', a + 1, 26, 2, { house: h.id, id: 'lamp_' + h.id }],
      ['armchair', a + 1, 22, 3, { id: 'chair_' + h.id }],
      ['radiator', a + 3, 23, 1, { id: 'rad_' + h.id }],
    );
  // the front door, from outside: knock, or break it in
  PLACE.push(['doorknock', h.door[0], h.door[1], N ? 0 : 2, { id: 'door_' + h.id, doorOf: h.id }]);
}

for (const h of HOUSE_DEFS) PLACE.push(['rug_house', h.x0 + 1, h.row === 'N' ? 7 : 22, 0]); // last, so every older object keeps its index (saves point at them)

// what stands in THEIR places. Appended last, so every object up top keeps its index (saves point at them).
Object.assign(OT, {
  lx_table: { n: 'Table', cw: 1, ch: 2, h: 1.0, kind: 'deco', lair: 1 },
  lx_console: { n: 'Console', h: 1.4, kind: 'deco', lair: 1 },
  lx_jars: { n: 'Jars', h: 1.9, kind: 'deco', lair: 1, tall: 1 },
  lx_tank: { n: 'Tank', h: 2.5, kind: 'deco', lair: 1, tall: 1 },
  lx_pod: { n: 'Pod', h: 2.4, kind: 'deco', lair: 1, tall: 1, sight: 1 },
  lx_holo: { n: 'Table', cw: 4, ch: 2, h: 1.0, kind: 'deco', lair: 1 },
  lx_gold: { n: 'Gold', h: 1.0, kind: 'deco', lair: 1 },
  lx_ctable: { n: 'Table', cw: 2, h: 0.9, kind: 'deco', lair: 1 },
  lx_chair: { n: 'Chair', h: 1.0, kind: 'deco', lair: 1 },
  lx_stairs: { n: 'Stairs', h: 2.7, kind: 'deco', lair: 1, tall: 1 },
  lx_nest: { n: 'Nest', h: 0.8, kind: 'deco', lair: 1 },
  lx_body: { n: 'Body', h: 0.3, kind: 'deco', lair: 1, flat: 0 },
  lx_junk: { n: 'Junk', h: 1.3, kind: 'deco', lair: 1 },
});
(function lairPlace() {
  const S = LAIRS.ship,
    Sw = LAIRS.sewer,
    D = LAIRS.den;
  for (const [x, z] of S.at('T')) PLACE.push(['lx_table', x, z, 0, { id: 'lxTable' }]);
  const hs = S.at('H');
  if (hs.length) {
    const x0 = Math.min(...hs.map((p) => p[0])),
      z0 = Math.min(...hs.map((p) => p[1]));
    PLACE.push(['lx_holo', x0, z0, 0, { id: 'lxHolo' }]);
  }
  for (const [x, z] of S.at('c')) PLACE.push(['lx_console', x, z, 3, { id: 'lxConsole' }]);
  for (const [x, z] of S.at('j')) PLACE.push(['lx_jars', x, z, 3]);
  S.at('k').forEach(([x, z], i) => PLACE.push(['lx_tank', x, z, z < S.z0 + 12 ? 0 : 2, { id: 'lxTank' + i }]));
  S.at('p').forEach(([x, z], i) => PLACE.push(['lx_pod', x, z, 2, { id: 'lxPod' + i }]));
  for (const [x, z] of Sw.at('g')) PLACE.push(['lx_gold', x, z, 0]);
  const C = Sw.at('C'),
    used = new Set();
  for (const [x, z] of C) {
    if (used.has(x + ',' + z)) continue;
    used.add(x + ',' + z);
    if (C.some(([a, b]) => a === x + 1 && b === z)) {
      used.add(x + 1 + ',' + z);
      PLACE.push(['lx_ctable', x, z, 0, { id: 'lxCount' + PLACE.length }]);
    } else {
      used.add(x + ',' + (z + 1));
      PLACE.push(['lx_ctable', x, z, 1, { id: 'lxCount' + PLACE.length }]);
    }
  }
  for (const [x, z] of Sw.at('@')) PLACE.push(['lx_chair', x, z, 0, { id: 'lxChair' }]);
  for (const [x, z] of Sw.at('S')) PLACE.push(['lx_stairs', x, z, 1, { id: 'lxStairs' }]);
  for (const [x, z] of D.at('N')) PLACE.push(['lx_nest', x, z, 0]);
  for (const [x, z] of D.at('B')) PLACE.push(['lx_body', x, z, 0]);
  for (const [x, z] of D.at('J')) PLACE.push(['lx_junk', x, z, 0]);
})();

const OBJ = []; // live object instances
const objAt = new Int16Array(W * H).fill(-1);
const blockAt = new Uint8Array(W * H);
const sightAt = new Uint8Array(W * H);
const OBJ_BY_ID = {};
(function placeObjects() {
  for (const [type, x, z, face, extra] of PLACE) {
    const t = OT[type];
    const cw = t.cw || 1,
      ch = t.ch || 1;
    const w = face % 2 === 0 ? cw : ch,
      h = face % 2 === 0 ? ch : cw;
    const o = Object.assign({ idx: OBJ.length, type, t, x, z, w, h, face, users: [], data: {} }, extra || {});
    o.cx = x + w / 2;
    o.cz = z + h / 2;
    o.name = t.n;
    OBJ.push(o);
    if (o.id) OBJ_BY_ID[o.id] = o;
    if (t.ghost || t.flat) continue;
    for (let zz = z; zz < z + h; zz++)
      for (let xx = x; xx < x + w; xx++) {
        objAt[I(xx, zz)] = o.idx;
        blockAt[I(xx, zz)] = 1;
        if (t.sight) sightAt[I(xx, zz)] = 1;
      }
  }
})();
const objCovers = (o, x, z) => x >= o.x && x < o.x + o.w && z >= o.z && z < o.z + o.h;
for (const h of HOUSE_DEFS) {
  const d = OBJ_BY_ID['door_' + h.id];
  if (d) d.name = h.name.replace('’s house', '’s door').replace('’s flat', '’s door');
}

// doors: the open/closed state lives here so path, sight and light can read it
const DOORS = [];
const doorAt = new Int16Array(W * H).fill(-1);
for (let z = 0; z < H; z++)
  for (let x = 0; x < W; x++) {
    const c = tget(x, z);
    if (c === 'D' || c === 'L') {
      const horiz = isWallish(x - 1, z) || isWallish(x + 1, z);
      doorAt[I(x, z)] = DOORS.length;
      DOORS.push({
        x,
        z,
        horiz,
        open: 0,
        locked: c === 'L',
        key: c === 'L' ? HOUSE_DOOR[x + ',' + z] || 'agnes' : null,
      });
    }
  }
// two doors side by side are one doorway: they swing apart, open together, and share no post
for (const d of DOORS) {
  const e = d.horiz && !d.locked ? DOORS[doorAt[I(d.x + 1, d.z)]] : null;
  if (e && e.horiz && !e.locked) {
    d.pairR = e;
    e.pairL = d;
    e.mirror = true;
  }
}
const SHOP_DOOR = DOORS[doorAt[I(35, 12)]];
for (const d of DOORS) if (d.z === 12 && (d.x === 35 || d.x === 36)) d.shop = true;
for (const d of DOORS) if (d.z >= LAIR_Z0) d.lair = true;
const isShopDoor = (x, z) => z === 12 && (x === 35 || x === 36);

const EDGES = {
  W: [
    [0, 13],
    [0, 18],
  ],
  E: [
    [W - 1, 13],
    [W - 1, 18],
  ],
};
const RITUAL = {
  x: 27.5,
  z: 7.5,
  spots: [
    [27, 6],
    [28, 6],
    [26, 7],
    [29, 7],
    [27, 9],
    [28, 9],
  ],
};
const WATCH_SPOT = [8, 16];
