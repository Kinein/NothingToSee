//@ gfx/look — The look: a cartoon town, and how far it has turned into the horror right now (render only)
//@ Defines: LOOK, FILL_NIGHT, FILL_WARM, FILL_DREAD_DAY, FILL_DREAD_NIGHT, FOG_TOON, FOG_NOIR_NIGHT, FOG_NOIR_DAY, DOOR_RED, lookTarget, lookStep, lookDoors
//@ Uses:    core/util, horror/layer, sim/core, world/light-map, gfx/renderer, gfx/vf-stage, taken/taken, game/last-day, them/plan, gfx/world-geometry
//@ (header made by tools/map.js; stripped by build.py)
// ───────────── the look: a bright, cartoon town by day and by night, until something mad happens
// LOOK.h is how far the picture has turned. 0 is the toy town: a soft warm fill light everywhere, clean walls, colour.
// Toward 1 it goes back to the old harsh, lonely night: no fill, the lamps the only light, black where you can't see,
// the cold grade and the grain, and the colour drains out of everything but the red. Blood on the ground and down
// the walls, the street wet and shining, a red light in some of the doorways and windows. At night it turns sooner
// and goes all the way; by day it stops at a thin cold light.
// It is render only: the game's light map, sight and hiding never see any of it.
const LOOK = {
  h: 0, // how far it has turned, smoothed
  toon: 1, // how much of the cartoon is left
  gore: 0, // how much blood there is that isn't really there
  wet: 0, // how wet the street looks: never drier than the weather
  sel: 0, // how far the colour has drained out of everything but the red
  fill: [0.36, 0.34, 0.31], // the cartoon fill light, this frame
  fog: [0.026, 0.03, 0.048], // the colour of what you can't see
  vec: new Float32Array(4), // uLook: toon, horror, night, gore
  doors: [0, 1, 2].map(() => ({ x: 0, y: 1.3, z: 0, r: 4.6, col: [0, 0, 0], dark: 0 })), // red doorways: reused every frame
  near: [null, null, null],
  nearD: [0, 0, 0],
};
const FILL_NIGHT = [0.14, 0.17, 0.34], // a storybook night: blue, but you can see the room
  FILL_WARM = [1.05, 1.0, 0.9],
  FILL_DREAD_DAY = [0.075, 0.08, 0.09], // a bad day: a thin cold light
  FILL_DREAD_NIGHT = [0.003, 0.004, 0.008], // a bad night: nothing but the lamps
  FOG_TOON = [0.026, 0.03, 0.048],
  FOG_NOIR_NIGHT = [0.011, 0.013, 0.026], // the old fog, as it was
  FOG_NOIR_DAY = [0.038, 0.042, 0.054],
  DOOR_RED = [1, 0.06, 0.035];
// what turns the picture, strongest wins: a bad hour, a blood night, something with teeth close by, a scene in front
// of you, your own frayed mind; being taken; Friday. THEIR week alone makes the town a little more wrong each day.
function lookTarget() {
  if (!G) return 0;
  if (!G.started) return 0.18;
  let h = Math.max(
    HX.dread * 0.95,
    HX.blood,
    HX.danger * 0.95,
    HX.letter * 0.85,
    HX.sel * 0.75,
    sstep(0.15, 0.95, STY.k) * 0.85,
  );
  h = Math.max(h, vfDread() * 0.85); // evidence lined up in the camera's square (gfx/vf-stage)
  if (CAP.on) h = Math.max(h, 0.75);
  if (looseOn()) h = Math.max(h, 1);
  const day = theirDay();
  h = Math.max(h, sstep(1, 5, day) * 0.16);
  return clamp(h, 0, 1);
}
function lookStep(dtReal) {
  const t = lookTarget();
  LOOK.h += (t - LOOK.h) * Math.min(1, dtReal * (t > LOOK.h ? 1.6 : 0.35)); // it turns fast, and comes back slowly
  const h = LOOK.h,
    nt = HX.night;
  LOOK.toon = 1 - sstep(0, lerp(0.8, 0.5, nt), h); // the dark takes the cartoon away sooner
  LOOK.gore = sstep(0.3, 1, h);
  LOOK.sel = sstep(0.3, 0.9, h) * lerp(0.7, 0.95, nt);
  LOOK.wet = Math.max(G ? G.wet || 0 : 0, sstep(0.3, 0.85, h) * 0.95);
  // the fill: daylight from the sky, warmed; blue at night; next to nothing once it has turned (written in place)
  const sl = SKY[0] * 0.3 + SKY[1] * 0.59 + SKY[2] * 0.11,
    dayK = clamp((sl - 0.04) / 0.5, 0, 1),
    fogK = clamp(sl / 0.6, 0, 1),
    noir = 1 - LOOK.toon;
  for (let k = 0; k < 3; k++) {
    const day = (SKY[k] * 0.42 + 0.08) * FILL_WARM[k];
    LOOK.fill[k] = lerp(lerp(FILL_NIGHT[k], day, dayK), lerp(FILL_DREAD_NIGHT[k], FILL_DREAD_DAY[k], dayK), noir);
    LOOK.fog[k] = lerp(FOG_TOON[k], lerp(FOG_NOIR_NIGHT[k], FOG_NOIR_DAY[k], fogK), noir);
  }
  LOOK.vec[0] = LOOK.toon;
  LOOK.vec[1] = h;
  LOOK.vec[2] = nt;
  LOOK.vec[3] = LOOK.gore;
  lookDoors(h, nt);
}
// a red light in the nearest of the doorways that have one: the same doors every time, spilling onto the step and
// the wet street. The horror layer's own render lights carry them (cleared by hxUpdate each frame, before this).
function lookDoors(h, nt) {
  const k = sstep(0.4, 0.9, h) * (0.3 + 0.7 * nt);
  if (k < 0.02 || !G || !G.started) return;
  const cx = cam.tx,
    cz = cam.tz;
  for (let i = 0; i < 3; i++) {
    LOOK.near[i] = null;
    LOOK.nearD[i] = 18;
  }
  for (const e of EXT_DOORS) {
    if (e.d.pairL || hash2(e.d.x, e.d.z, 61) > 0.45) continue;
    const d = Math.hypot(e.out[0] + 0.5 - cx, e.out[1] + 0.5 - cz);
    for (let i = 0; i < 3; i++)
      if (d < LOOK.nearD[i]) {
        for (let j = 2; j > i; j--) {
          LOOK.near[j] = LOOK.near[j - 1];
          LOOK.nearD[j] = LOOK.nearD[j - 1];
        }
        LOOK.near[i] = e;
        LOOK.nearD[i] = d;
        break;
      }
  }
  for (let i = 0; i < 3; i++) {
    const e = LOOK.near[i];
    if (!e) break;
    const L = LOOK.doors[i],
      p = k * (0.8 + 0.2 * Math.sin(R.time * 1.6 + i * 2.1)) * 1.4;
    L.x = (e.out[0] + e.d.x) / 2 + 0.5;
    L.z = (e.out[1] + e.d.z) / 2 + 0.5;
    for (let c = 0; c < 3; c++) L.col[c] = DOOR_RED[c] * p;
    HX.lights.push(L);
  }
}
