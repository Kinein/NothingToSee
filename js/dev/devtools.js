//@ dev/devtools — window.__dev: state access, skip time, per-system timing
//@ Defines: DEV, devWrap, DEV_TIMED
//@ Uses:    sim/core, game/loop, core/util, data/tuning, gfx/frame, ui/interface
//@ (header made by tools/map.js; stripped by build.py)
// Developer tools: only in `python3 build.py --dev` builds (dist/nothing-to-see-here.dev.html), never in the real page.
// From the browser console:
//   __dev.G, __dev.PLAYER, __dev.NPC          live game state
//   __dev.skip(minutes)                      run the simulation forward without rendering
//   __dev.perf()                             per-system milliseconds per frame, and the slowest frames
//   __dev.perfReset()                        start counting again
// Timing works by wrapping top-level functions: function declarations are plain bindings in the shared scope,
// so replacing one here replaces it for every caller.
const DEV = { acc: {}, calls: {}, frames: 0, cur: null, slow: [], t0: performance.now() };
function devWrap(name, f) {
  return function devTimed() {
    const t = performance.now();
    try { return f.apply(this, arguments); } finally {
      const d = performance.now() - t;
      DEV.acc[name] = (DEV.acc[name] || 0) + d; DEV.calls[name] = (DEV.calls[name] || 0) + 1;
      if (DEV.cur && name !== 'frame') DEV.cur[name] = (DEV.cur[name] || 0) + d;
    }
  };
}
// every function listed here is timed; names that don't exist (any more) are skipped
const DEV_TIMED = ('simStep worldStep renderFrame updateHud updateFx updateFocus hxUpdate styleStep computeLight computeVision smoothVision ' +
  'expandMaps npcUpdate needsTick perceptionTick findPath saveGame horrorTick talkTick hxTick nightTick streetTick hourlyEvents onTimeCross ' +
  'capUpdate capLate groundTick huntFrame looseFrame looseTick encStep updateCars cellFrame getPortrait renderPortrait animate stepChar ' +
  'newDay planDay morningPaper applyAwareness capture capFinish trueForm openBoard drawStrings buildItemMesh makeMesh compileProgram ' +
  'hallucinate drawChar gatherLamps encStart looseBegin huntStart goAway comeBack').split(' ');
for (const n of DEV_TIMED) { try { eval(n + ' = devWrap(' + JSON.stringify(n) + ', ' + n + ')'); } catch (e) { console.warn('devtools: cannot time ' + n); } }   // eslint-disable-line no-eval
const devFrameInner = frame;
frame = function devFrame(now) {
  DEV.cur = {};
  if (DEV.alive && G && G.started && !G.over) { G.workBar = 100; G.health = 100; for (const k of ['hunger', 'energy', 'bladder']) PLAYER.needs[k] = 100; PLAYER.needs.stress = Math.min(PLAYER.needs.stress, 40); }
  const t = performance.now();
  devFrameInner(now);   // it schedules the next frame through the `frame` binding: this wrapper again
  const d = performance.now() - t;
  DEV.frames++; DEV.acc.frame = (DEV.acc.frame || 0) + d;
  if (d > 12) {
    DEV.slow.push({ ms: +d.toFixed(1), at: G && fmtTime(G.t), day: G && dayNo(), parts: Object.fromEntries(Object.entries(DEV.cur).filter(([, v]) => v > 1).sort((a, b) => b[1] - a[1]).map(([k, v]) => [k, +v.toFixed(1)])) });
    DEV.slow.sort((a, b) => b.ms - a.ms); DEV.slow.length = Math.min(DEV.slow.length, 40);
  }
  DEV.cur = null;
};
window.__dev = {
  get G() { return G; }, get PLAYER() { return PLAYER; }, NPC, CHARS, get UI() { return UI; },
  /** run the simulation forward `min` game minutes, in steps, without drawing */
  /** run the simulation forward `min` game minutes without drawing; returns the slowest steps with what they spent it on */
  skip(min, spd = 12) {
    const end = G.t + min, slow = []; let guard = 0, total = 0;
    while (G.t < end && !G.over && guard++ < 1e6) {
      DEV.cur = {}; const at = G.t, t = performance.now();
      simStep(0.05, spd); worldStep(0.05, false);
      const d = performance.now() - t; total += d;
      if (d > 4) slow.push({ ms: +d.toFixed(1), at: fmtTime(at), day: dayNo(at), parts: Object.fromEntries(Object.entries(DEV.cur).filter(([, v]) => v > 0.5).sort((a, b) => b[1] - a[1]).map(([k, v]) => [k, +v.toFixed(1)])) });
      DEV.cur = null;
    }
    slow.sort((a, b) => b.ms - a.ms);
    return { now: fmtTime(G.t) + ' day ' + dayNo(), over: G.over || null, msPerGameHour: +(total / (min / 60)).toFixed(1), slowest: slow.slice(0, 12) };
  },
  perf() {
    const n = Math.max(1, DEV.frames), secs = (performance.now() - DEV.t0) / 1000;
    const rows = Object.entries(DEV.acc).sort((a, b) => b[1] - a[1]).map(([k, v]) => ({ fn: k, msPerFrame: +(v / n).toFixed(2), calls: DEV.calls[k] || n, totalMs: +v.toFixed(0) }));
    return { frames: DEV.frames, fps: +(DEV.frames / secs).toFixed(1), rows, slowest: DEV.slow.slice(0, 15) };
  },
  /** play at `x` game minutes per real second (normal is 2), e.g. speed(45) to watch days go by */
  speed(x) { SPEEDS[1] = SPEEDS[2] = x; },
  /** render(false) skips drawing (the 3D view freezes, everything else runs): for timing the game without the GPU */
  render(on = true) { if (!DEV.realRender) DEV.realRender = renderFrame; renderFrame = on ? DEV.realRender : function noRender() {}; },
  /** top up work, needs and health every frame so a long test run doesn't end in getting fired or passing out */
  keepAlive(on = true) { DEV.alive = on; },
  perfReset() { DEV.acc = {}; DEV.calls = {}; DEV.frames = 0; DEV.slow = []; DEV.t0 = performance.now(); },
  run(code) { return eval(code); },   // eslint-disable-line no-eval: reaches any top-level name, for poking at the game
};
