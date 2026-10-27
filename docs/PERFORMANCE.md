# Performance

What made frames slow or hitch, what was changed, and how to measure. Every change below keeps the game's
behaviour: the seeded determinism check (`tools/regress.py`) lands in exactly the same state as the original
code, and the light map and paths were checked bit-for-bit against the original functions.

## What was done

| Problem | Where | Fix |
| --- | --- | --- |
| **Portrait stalls.** Drawing a face for a menu, the HUD or a card renders on the GPU and reads it back, which makes the browser wait for the GPU. It happened the first time you faced each person, at every fight, and on every unmask/killed/taken card, right in the middle of the action. In software rendering a single one took ~300 ms. | gfx/portraits.js, combat/timing-bar.js, them/true-form.js, play/confront.js | Everyone's portrait is drawn ahead, one per idle moment, right after a game starts or loads (`warmPortraits`, `warmLater`). A true form's fight picture is drawn as it starts changing, once per person per game (`fightSnapRec`). Cards that need a fresh snapshot appear from the next idle moment (`cardSoon`), so the read-back lands between frames. |
| **Pictures changing the story.** Every photo's film grain (~40,000 random numbers) came out of the same `Math.random` the simulation uses, so drawing a picture changed what happened next. | gfx/portraits.js | Grain and print scratches use their own generator (`filmRand`). |
| **Garbage every frame.** Each limb of each person allocated four fresh matrices, every frame; floor decals three. Collected garbage means collector pauses. | gfx/renderer.js `part`/`partR`, gfx/draw-helpers.js decals | Matrices are built in scratch arrays (`M4.partInto`, `M4.jointInto`, `M4.mulInto`), bit-for-bit the same results. |
| **Wall-light expansion, every frame, with garbage.** The half-tile light/sight maps were rebuilt each frame, allocating small arrays for every wall quadrant, and both textures re-uploaded to the GPU (with mipmaps). | world/vision.js `expandMaps`, gfx/frame.js | Rebuilt only when the light or sight changed, without allocating; uploaded only when rebuilt. Vision fade-outs stop counting as changes once they're within 1/1000 of done. |
| **Recasting every light.** Every light's shadowcast (100+ lamps, 70 windows, your own glow) was recomputed 12+ times a second, and every frame at night while a car's headlights were about. | world/light-map.js `computeLight` | Each fixed light's reach is cached and recast only when a door it reaches swings past half-open (`reachOf`); your glow is cached per cell. Moving lights (headlights, bolts, the torch beam) are still cast fresh. Same light map to the last bit. |
| **Drawing what's off screen.** All ~250 objects and doors were drawn every frame wherever the camera was. | gfx/frame.js, gfx/draw-helpers.js `meshInView`, `charInView` | Meshes carry a bounding sphere; anything outside the camera's view is skipped. At normal zoom that's about 80% of them. |
| **Pathfinding allocations.** Every search allocated three grid-sized arrays and a heap of little arrays, and asked `walkable` the same cells over and over. | world/paths.js `findPath` | Working arrays are kept and reset by a stamp, walkability is asked once per cell per search, the heap is two flat arrays. Same paths, same tie-breaks. |
| **A slow GPU.** On a weak GPU or a high-DPI screen the game can't hold its frame rate, and everything stutters. | gfx/renderer.js `QUALITY` | Adaptive resolution: under 25 fps for a few seconds in total, the drawing buffer shrinks a step (to 60% at most); after half a minute of smooth frames it grows back. |
| **A shader compiled mid-scene.** The lair tanks' shader was compiled the first time you were taken to the ship. | game/loop.js `boot` | Compiled at startup. |

## Measured

Headless Chrome, software WebGL, so these are CPU numbers (the GPU side can't be measured here):

| | Before | After |
| --- | --- | --- |
| Memory allocated per drawn frame | ~730 KB | ~215 KB |
| Worst frame in a fast-forwarded week (drawing off) | ~320 ms (a portrait read back mid-simulation) | ~18 ms (a burst of pathfinding) |
| Light and sight maps (worldStep), per frame average | 1.4 ms | 0.3 ms |
| Light map, one rebuild with every door changing (worst case for the cache) | 1.5–2.0 ms | 0.8 ms |
| Pathfinding, 3,000 random searches | 440 ms | 290 ms |
| Objects and doors drawn at normal zoom | ~250 | ~45 |

## How to measure

- `python3 build.py --dev`, open `dist/nothing-to-see-here.dev.html` in a real browser, play, then in the
  console: `__dev.perf()` gives milliseconds per frame per system and the slowest frames with what they spent
  their time on. `__dev.perfReset()` starts over. This is the one that matters: it's your GPU.
- `python3 tools/playtest.py [seconds] [speed]`: a fast-forwarded week headless (drawing off), the same report.
- `python3 tools/profile.py [hours] --cpu`: simulation cost per game hour, slowest steps, top functions.
- `python3 tools/allocs.py`: memory allocated per frame, by function.
- Chrome DevTools → Performance, record a few seconds: long yellow (script) bars are CPU; long green
  (GPU) bars mean the GPU is the limit, and adaptive resolution should kick in.

## Patterns for per-frame code

- No new arrays or objects in code that runs every frame. Matrices: `M4.mulInto(out, a, b)`,
  `M4.partInto(out, M, …)`, `M4.jointInto(out, …)` with arrays made once at the top of the module.
- Cache what only changes on events (doors, lights switching, the camera moving a tile), and mark it dirty
  from those events instead of recomputing every frame.
- Anything that reads back from the GPU (`readPixels`, `toDataURL`) belongs in `warmLater`, not in a frame.
