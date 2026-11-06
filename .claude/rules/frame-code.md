---
paths:
  - "js/gfx/**"
  - "js/sim/**"
  - "js/game/loop.js"
  - "js/world/light-map.js"
  - "js/world/vision.js"
  - "js/combat/blood.js"
  - "js/audio/foley.js"
---

# Code that runs every frame

The rules are in `CLAUDE.md`, *Rules of thumb*; `docs/PERFORMANCE.md` has the why, the measurements and the
patterns (*Patterns for per-frame code*). Read that section before changing a draw or step function.

- No allocation in a per-frame path: no `new Float32Array`, `[...]`, `{...}`, closures or string building in loops
  that run every frame. Hoist the buffer and reuse it; `M4.*Into` in core/util.js.
- GPU read-backs (`readPixels`, `toDataURL`) go through `warmLater` (gfx/portraits.js), never mid-frame.
- A claim that something got faster or slower is measured, not argued: `python3 tools/allocs.py` (memory per frame,
  by function), `python3 tools/profile.py` / `tools/playtest.py` (where the time goes), `__dev.perf()` in the dev
  build. Headless WebGL is software rendering: it measures the CPU side only.
