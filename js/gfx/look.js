//@ gfx/look — The look: a cartoon town, and how far it has turned into the horror right now (render only)
//@ Defines: LOOK, FILL_NIGHT, FILL_HORROR, FILL_WARM, FOG_TOON, FOG_HORROR, lookTarget, lookStep
//@ Uses:    core/util, horror/layer, world/light-map, sim/core, taken/taken, game/last-day, them/plan
//@ (header made by tools/map.js; stripped by build.py)
// ───────────── the look: a bright, cartoon town by day and by night, until something mad happens
// LOOK.h is how far the picture has turned: 0 is the toy-town look (a soft fill light everywhere, clean walls, colour),
// 1 is the horror (the fill gone blood red, grime back on everything, veins up the walls, the cold grade, the grain).
// It is render only: the game's light map, sight and hiding never see any of it.
const LOOK = {
  h: 0, // how far it has turned, smoothed
  toon: 1, // 1 - h, eased: how much of the cartoon is left
  veins: 0, // how far the rot has spread over walls and floors
  fill: [0.36, 0.34, 0.31], // the cartoon fill light, this frame
  fog: [0.026, 0.03, 0.048], // the colour of what you have never seen
  vec: new Float32Array(4), // uLook: toon, horror, night, veins
};
const FILL_NIGHT = [0.14, 0.17, 0.34], // a storybook night: blue, but you can see the room
  FILL_HORROR = [0.12, 0.016, 0.014], // the dark gone the colour of meat
  FILL_WARM = [1.05, 1.0, 0.9],
  FOG_TOON = [0.026, 0.03, 0.048],
  FOG_HORROR = [0.03, 0.004, 0.004];
// what turns the picture, strongest wins: a bad hour, a blood night, something with teeth close by, a scene in front
// of you, your own frayed mind; being taken; Friday. THEIR week alone makes the town a little more wrong each day.
function lookTarget() {
  if (!G) return 0;
  if (!G.started) return 0.18;
  let h = Math.max(
    HX.dread * 0.92,
    HX.blood,
    HX.danger * 0.9,
    HX.letter * 0.8,
    HX.sel * 0.7,
    sstep(0.15, 0.95, STY.k) * 0.85,
  );
  if (CAP.on) h = Math.max(h, 0.72);
  if (looseOn()) h = Math.max(h, 0.95);
  const day = theirDay();
  h = Math.max(h, sstep(1, 5, day) * 0.16);
  return clamp(h, 0, 1);
}
function lookStep(dtReal) {
  const t = lookTarget();
  LOOK.h += (t - LOOK.h) * Math.min(1, dtReal * (t > LOOK.h ? 1.6 : 0.35)); // it turns fast, and comes back slowly
  const h = LOOK.h;
  LOOK.toon = 1 - sstep(0, 0.9, h);
  LOOK.veins = sstep(0.28, 1, h);
  // the fill: daylight from the sky, warmed; blue at night; red in the horror (written in place: this runs every frame)
  const sl = SKY[0] * 0.3 + SKY[1] * 0.59 + SKY[2] * 0.11,
    dayK = clamp((sl - 0.04) / 0.5, 0, 1),
    hf = sstep(0.05, 0.95, h),
    hg = sstep(0.2, 1, h);
  for (let k = 0; k < 3; k++) {
    const day = (SKY[k] * 0.42 + 0.08) * FILL_WARM[k];
    LOOK.fill[k] = lerp(lerp(FILL_NIGHT[k], day, dayK), FILL_HORROR[k], hf);
    LOOK.fog[k] = lerp(FOG_TOON[k], FOG_HORROR[k], hg);
  }
  LOOK.vec[0] = LOOK.toon;
  LOOK.vec[1] = h;
  LOOK.vec[2] = HX.night;
  LOOK.vec[3] = LOOK.veins;
}
