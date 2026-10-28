//@ sim/core — Shared state (G, PLAYER, NPC, CHARS), the calendar, sky colours
//@ Defines: PLAN_MAX, DOW, DOW_LONG, CHARS, PLAYER, NPC, FOG_COL, SHADE, CAL0, MONTHS, shopOpen, officeLit, inRoomSet, NO_TINT, NEON_OFF, lightGroupOn, …
//@ Uses:    core/util, world/grid, taken/taken, town/cell
//@ (header made by tools/map.js; stripped by build.py)
// ───────────────────────── simulation core ─────────────────────────
const PLAN_MAX = 8;
const DOW = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const DOW_LONG = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
let G = null;
const CHARS = [];
let PLAYER = null;
const NPC = {};
let FOG_COL = [0.03, 0.035, 0.06];
const SHADE = { on: false, c: null, t: 0 };

const dayNo = (t = G.t) => Math.floor(t / 1440) + 1;
const tod = (t = G.t) => ((t % 1440) + 1440) % 1440;
const hourF = (t = G.t) => tod(t) / 60;
const dow = (d = dayNo()) => (d - 1) % 7;
const isWorkday = (d = dayNo()) => dow(d) < 5;
const inShift = () => isWorkday() && tod() >= 540 && tod() < 1020 && !G.sickDay;
// the calendar on the wall: day 1 is Monday, October 16, 2023
const CAL0 = Date.UTC(2023, 9, 16);
const calDate = (d = dayNo()) => new Date(CAL0 + (d - 1) * 864e5);
const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
function shopOpen() {
  const h = hourF();
  return h >= 7 && h < 23;
}
function officeLit() {
  const h = hourF();
  return isWorkday() && h >= 6.5 && h < 20;
}
function inRoomSet(c, pred) {
  const r = roomAt(c.x, c.z);
  return !!(r && pred(r));
}
// the shop's neon, switched off: dead grey glass, not a pink that still reads as lit
const NO_TINT = [1, 1, 1],
  NEON_OFF = ((on, off) => off.map((v, i) => v / Math.max(0.05, on[i])))(hex(0xff4d86), hex(0x45484c));
function lightGroupOn(grp) {
  if (grp.startsWith('house:')) return !!(G && G.houseLit && G.houseLit[grp.slice(6)]);
  if (grp.startsWith('lair:')) return CAP.lit === grp.slice(5);
  if (grp === 'station') return CELL.on; // the cells, only while you're in them
  switch (grp) {
    case 'always':
      return true;
    case 'office':
      return officeLit();
    case 'officeNight':
      return !officeLit();
    case 'shop':
    case 'shopSign':
      return shopOpen();
    case 'street': {
      const h = hourF();
      return h >= 18.4 || h < 6.8;
    }
    case 'home':
      return G.homeLights;
    case 'homeBed':
      return G.homeLights || G.bedLamp;
    case 'tv':
      return G.tvOn;
    case 'agnes':
      return G.agnesLights;
    case 'agnesBed':
      return G.agnesLights;
  }
  return true;
}
const SKY_KEYS = [
  [0, [0.03, 0.04, 0.085]],
  [4.6, [0.035, 0.045, 0.095]],
  [5.6, [0.2, 0.13, 0.2]],
  [6.6, [0.42, 0.37, 0.4]],
  [8, [0.58, 0.6, 0.64]],
  [12, [0.66, 0.68, 0.7]],
  [16, [0.58, 0.58, 0.6]],
  [18, [0.6, 0.4, 0.3]],
  [19.2, [0.24, 0.15, 0.24]],
  [20.4, [0.055, 0.055, 0.11]],
  [24, [0.03, 0.04, 0.085]],
];
function skyAt(h) {
  for (let k = 0; k < SKY_KEYS.length - 1; k++) {
    const [h0, c0] = SKY_KEYS[k],
      [h1, c1] = SKY_KEYS[k + 1];
    if (h >= h0 && h <= h1) return mix3(c0, c1, (h - h0) / (h1 - h0));
  }
  return SKY_KEYS[0][1];
}
