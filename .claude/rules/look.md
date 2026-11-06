---
paths:
  - "js/gfx/look.js"
  - "js/gfx/shaders.js"
  - "js/gfx/shaders-fx.js"
  - "js/gfx/post.js"
  - "js/gfx/frame.js"
---

# The art style

Moved unchanged from the *Where to change things* table in `CLAUDE.md`.

The art style: a cozy cartoon town (fill light, clean walls, toon-shaded people with an ink edge, warm picture-book
grade) that turns into the old harsh noir when something bad happens, worst at night: colour drained but the red,
blood that isn't there, wet streets, red doorways and windows (`LOOK.h`; what turns it: `lookTarget`; the doorways:
`lookDoors`). Render only, the game's light map never sees it.

Where: `js/gfx/look.js`; the shader side: `uLook`/`uFill`, grime `GR`, the blood `gore` in gfx/shaders.js, the
grade in gfx/post.js.

- **Render only.** Nothing here may feed back into `js/world/light-map.js` or `js/world/vision.js`: what the
  player can see is decided by the light map, never by the grade.
- Its randomness (grain, flicker) is not the simulation's: never `Math.random` (see `CLAUDE.md`, *Rules of thumb*).
- How it looks is a judgement only a browser can settle: open the page (`preview_start` with the `dist` server)
  and look, at day and at night, before calling a change done.
