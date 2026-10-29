# Follow-up work

The big restructure and the main performance fixes are done (see docs/PERFORMANCE.md). This file lists what's
left, smallest risk first, and the rules for working on this code. Read README.md once, then MAP.md as needed.
Never load the whole codebase: open the module you're changing and two or three neighbours.

## Rules

1. **Move code with the tools, never by retyping.** `tools/split.js` splits a module, `tools/move.js` moves
   declarations between modules; both refuse unsafe moves. Don't rename or "improve" code while moving it.
   Formatting is Prettier's job (`npx prettier@3 --write js tools`, config in `.prettierrc.json`); the
   hand-aligned tables in `js/data/` are left out of it.
2. **Check after every task:** `python3 tools/check.py --full`. A refactor must keep the determinism check
   green. If a change is *meant* to alter behaviour, it will go red: play the game, then record a new
   baseline with `python3 tools/regress.py --save tools/regress-baseline.json` and say so.
3. **Load order.** All modules share one scope and run in `js/ORDER.txt` order. Calling a function from
   anywhere is fine (hoisted). A top-level `const`/`let` or load-time code must not use a `const`/`let` from a
   *later* module.
4. **New files go into `js/ORDER.txt`** with a `# purpose` comment, at the spot where their code should run.
5. **Don't hand-edit** `dist/`, `MAP.md`, `SYMBOLS.tsv`, `docs/STATE.md` or the `//@` headers; the tools write them.
6. **Per-frame code must not allocate** when it can help it (no `new Float32Array`, `[...]`, `{...}` in loops
   that run every frame). See docs/PERFORMANCE.md for the patterns (`M4.mulInto`, `partInto`, `jointInto`).
7. **When in doubt, leave it.** Messy code that works beats tidy code that doesn't.

## Tasks

### 1. Fewer allocations in drawPerson and friends
Frames still allocate ~215 KB each (run `tools/allocs.py`). The biggest remaining sources:
- `M4.joint` / `M4.mul` chains in gfx/people.js and gfx/creatures.js (~15 per person per frame). **Trap:**
  those matrices are kept as parents for later parts, so a single scratch array won't do. Give each
  joint its own scratch array, created once per character slot.
- `gatherLamps` (gfx/draw-helpers.js) builds an object per lamp per frame; use preallocated arrays.
- `styleLight` (world/light-map.js) returns new arrays via `mix3`/`mul3` for every light when stressed, and the
  moving lights (`add` in `computeLight`) build closures for every cast.

The determinism check must stay green: matrices must come out bit-for-bit the same (the `*Into` helpers in
core/util.js are proven to be).

### 2. Fields that appear on `G` out of nowhere
docs/STATE.md lists 24 fields written to `G` that `freshG` doesn't declare. Add each to `freshG` with the
value the code treats as "not set" (usually `0`, `null` or `false`; read how it's tested first). Old saves
load through `Object.assign(freshG(0), data.G)`, so they still work. The determinism check must stay green;
if one goes red, that field's "unset" value wasn't what you chose.

### 3. Pathfinding that gives up faster
`findPath` (world/paths.js) explores everything reachable before it reports "no path", the slowest case in
the profile. A cheap fix: cache connected regions of the grid for the common walker types and return `null`
straight away when start and goal are in different regions. Careful: `walkable` depends on who is walking
(locked doors, breaking in, the shop's hours), so the cache key must include that.

### 4. Optional tidying
- taken/coming.js (450 lines) is mostly `CAP_PRE`, one scene table per way of being taken; it could be split
  per lair with `tools/split.js` if the table is cut into several constants first.
- gfx/models.js (one `MODELS` table) and gfx/shaders.js (one shader string) are long but single things.
  Leave them unless you need to work inside.

### 5. Evidence, confrontation and hunts: tuning and loose ends
The four-frame evidence book, false cards, the confrontation (✓/✗, replacing the arena) and the fights-by-situation rules are in
(numbers in `EVIDENCE`, js/data/tuning.js). Still to do:
- **Playtest the numbers.** The spec's target win chances for fights (private lizard/dead 35–45%, alien 45–55%,
  public with crowd help 70–80%, trapped 85%+) have only been checked by scripted runs, not by hand. Tune
  `EVIDENCE.fight` after real games.
- **CLEARED needs two grey frames, not three.** An ordinary person has two truths to find (their daily secret on film,
  and their oddity), so three was out of reach for most. If more ways to see a frame explained are added, raise
  `EVIDENCE.clearedGrey` back to 3.
- **Tails by day only report.** THEIR people follow you when you're hunted and book awareness; they don't block
  doors or stand in your way yet.
- **"THEY are stronger after dark"** isn't modelled in fights (crowds are just thinner at night).

### Not now
Real ES modules (`import`/`export`) would mean untangling ~1,400 shared top-level names and the circular calls
between town/, them/ and horror/. Don't start it unless asked.
