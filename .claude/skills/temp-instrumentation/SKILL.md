---
name: temp-instrumentation
description: Add temporary timing or ordering instrumentation to Nothing to See Here to investigate a hitch, a frame spike, a race or an "it sometimes happens" bug that reading code cannot settle, then remove it and leave a clean tree and a clean dist/. Use when the question is when or in what order something happens (a frame hitch, a sim step that spikes, a state that flips between two frames, an action that runs before another), or when the user pastes timings or a console log and asks what they mean.
---

# Temporary instrumentation

For questions reading the code cannot settle: *when*, *how long*, *in what order*. The output is **a diagnosis plus a clean tree**, never logging that quietly ships in `dist/`.

Do **not** instrument when a targeted read of two files answers it, or when the user asks for a behaviour change rather than a diagnosis.

## First, the tools that already measure

- `__dev.perf()` in the dev build: per-system milliseconds per frame and the slowest frames (the functions in `DEV_TIMED`, js/dev/devtools.js). `__dev.perfReset()` starts counting again.
- `__dev.skip(minutes)`: runs the simulation forward without drawing and returns the slowest steps with what they spent it on.
- `python3 tools/profile.py`, `tools/playtest.py` (where the time goes, slow frames over a fast-forwarded week), `tools/allocs.py` (memory per frame by function). `docs/PERFORMANCE.md`, *How to measure*.

Often one of these is the answer, and nothing needs to change at all.

## Next, a patch that touches no file

Build the dev page (`python3 build.py --dev`) and wrap functions at runtime. Every module shares one scope inside the page's IIFE, so its functions are **not** on `window`; `__dev.run(code)` evaluates code inside that scope, where a top-level function binding can be replaced for every caller (that is how `devWrap` times `DEV_TIMED`):

```js
// in the browser pane's javascript_tool, or the console of dist/nothing-to-see-here.dev.html
__dev.run(`(() => {
  window.__trace = { t0: performance.now(), rows: [] };
  for (const name of ['npcThink', 'talkTick']) {           // names from the question: grep -w name SYMBOLS.tsv
    const f = eval(name);
    eval(name + ' = function () { const s = performance.now(); const r = f.apply(this, arguments);' +
      ' window.__trace.rows.push([name, +(s - window.__trace.t0).toFixed(2), +(performance.now() - s).toFixed(2), G.t]); return r; }');
  }
})()`);
```

A reload throws it all away. A `const`/`let` (a table, an object of methods) cannot be rebound this way, and neither can a question *inside* a function; for those, use source markers.

## Source markers (when you must edit a file)

1. **One tag, one helper.** Put every temporary line between `/* TMP-INSTR */` markers and every message under the tag `[tmp-instr]`, so one grep finds all of it. Define the helper once, at the top of the first module that needs it in `js/ORDER.txt` order (below the `//@` header, which you never touch):

   ```js
   /* TMP-INSTR */ const TMPLOG = (() => { const t0 = performance.now(); return (m, o) => console.log('[tmp-instr] +' + (performance.now() - t0).toFixed(1) + 'ms ' + m, o === undefined ? '' : o); })(); /* /TMP-INSTR */
   ```

   A top-level `const` is only usable at load time by later modules; called from inside a function it works anywhere.
2. Log at each boundary the question is about: before and after the suspect call, at the top of each action, at each branch of the race. Log the fields that decide the order (`G.t`, a character's id, an action's kind, a flag), never a whole object.
3. **Never** draw from `Math.random` (the seeded determinism check shares that stream) and never change what the instrumented code does: no early return, no state write, no allocation in a per-frame loop (log on the event, or every Nth frame, not every frame). Instrumentation that changes the timing it measures answers a different question.
4. Rebuild the dev page after each edit: `python3 build.py --dev`. Don't run `check.py` with markers in: it would write them into `dist/`.
5. A log line is not a player-facing word: never in `js/data/lines.js`.

## Run it

- **In the browser:** `preview_start({name: 'dist'})` serves `dist/` (`.claude/launch.json`); open `/nothing-to-see-here.dev.html`. Pane screenshots lag; sample transitions in JS instead of by eye. The game saves when the page is hidden, so a run may leave a save behind.
- **Timings from a hidden pane are slow** and `requestAnimationFrame` is throttled: ask the user to show the pane, or use `__dev.skip` and the headless tools for the simulation side. Headless WebGL is software rendering: it measures the CPU side, not the GPU. **Report the tail (p95, p99, max), not the mean**: a hitch is one frame.
- Isolate rather than ablate: time the suspect alone before removing things around it. Anything that changes how many random numbers the simulation draws hands the regression check a different world.

## Report, then remove

1. Report the timeline: what happened, in what order, how long between, with the log lines that show it. State the diagnosis and its evidence; say what the log could not show.
2. **Remove every marker** and confirm: `grep -rn "TMP-INSTR\|tmp-instr\|__trace" js shell tools` prints nothing, `git diff --stat` shows only the files the user asked you to change, and `python3 tools/check.py` is green (it rebuilds both pages, so `dist/` is clean again: `grep -c "tmp-instr" dist/*.html` is 0). A scratch script you wrote goes in the scratchpad, not in `tools/`.
3. Instrumentation that was removed changes nothing in `dist/`: no version bump. The fix is a separate step; do not smuggle it into the instrumentation edit.
