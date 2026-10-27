//@ sim/characters — Character records
//@ Defines: defaultJ, makeChar, placeChar
//@ Uses:    core/util, sim/core
//@ (header made by tools/map.js; stripped by build.py)
// ───────────────────────── characters
function defaultJ() { return { rootY: 0, float: 0, pitch: 0, roll: 0, torso: 0, twist: 0, hp: 0, hy: 0, hr: 0, thL: 0, thR: 0, shL: 0, shR: 0, uaL: 0, uaR: 0, faL: -0.1, faR: -0.1, aoL: 0.07, aoR: 0.07 }; }
function makeChar(def) {
  const L = def.look;
  const c = {
    id: def.id, name: def.name, short: def.short || def.name.split(' ')[0], role: def.role, def, isPlayer: !!def.player,
    x: 0, z: 0, y: 0, dir: 0, tdir: 0, onMap: true, shown: 0,
    look: Object.assign({}, L, {
      skinC: hex(L.skin), topC: hex(L.top), botC: hex(L.bottom), shoeC: hex(L.shoes || 0x1b1b1c), hairC: hex(L.hairCol || 0x231b15),
      accC: hex(L.acc != null ? L.acc : L.top), hatC: hex(L.hatCol || 0x2a2a2a), eyeC: [0.06, 0.05, 0.05], mouthC: mul3(hex(L.skin), 0.55),
    }),
    J: defaultJ(), fx: {}, pose: 'stand', anim: 'idle', animT: Math.random() * 10, walkPh: 0,
    path: null, pi: 0, moving: false, run: false, queue: [], engaged: null,
    rel: def.rel || 0, sus: 0, danger: 0, dangerPeak: 0, evidence: 0, rumors: 0, notes: [], snaps: [], clues: { seen: 0, photo: 0, item: 0, rumor: 0, found: 0, odd: 0 },
    seenRoom: {}, bladder: rand(55, 100), urge: rand(0, 120), urgeTh: rand(260, 480), tell: null, prevRoom: null, thinkCd: 0,
  };
  CHARS.push(c);
  return c;
}
function placeChar(c, x, z) { c.x = x + 0.5; c.z = z + 0.5; c.path = null; c.moving = false; }

