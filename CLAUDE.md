# CLAUDE.md

Nothing to See Here is a browser game that ships as **one self-contained HTML page**. The source is ~100 small
JavaScript modules plus a shell page; `build.py` concatenates them into `dist/`. There is no bundler, no npm
dependency and no `import`/`export`.

## Read this first

- **One shared scope.** Every module is pasted, in `js/ORDER.txt` order, into a single function (the IIFE in
  `shell/page.html`) under `'use strict'`. Every top-level `function`/`const`/`let` is visible everywhere.
  - Functions are hoisted, so any module can *call* any function.
  - A top-level `const`/`let`, or code that runs at load time, may only use names defined by an *earlier*
    module in `ORDER.txt`.
  - Top-level names must be unique across the whole game (`tools/map.js` reports duplicates).
- **Don't read the whole codebase.** Find the module with the tables below or with
  `grep -w someName SYMBOLS.tsv`, open it and two or three neighbours from `MAP.md`.
- **New file?** Add it to `js/ORDER.txt` with a `# purpose` comment at the point where its code should run.
  A file that isn't listed is left out of the build.

## Commands

```
python3 build.py                  # → dist/nothing-to-see-here.html (the game)
python3 build.py --dev            # → dist/nothing-to-see-here.dev.html (with window.__dev tools)
python3 tools/check.py            # after EVERY change: headers, MAP.md, SYMBOLS.tsv, docs/STATE.md, builds, syntax
python3 tools/check.py --full     # + headless boot test + seeded determinism check (needs Python playwright)
npx prettier@3 --write js tools   # formatting (config in .prettierrc.json; js/data/ is hand-aligned and ignored)
```

`tools/check.py --full` must stay green for refactors. If a change is *meant* to alter behaviour, the determinism
check goes red: play the game, then record a new baseline with
`python3 tools/regress.py --save tools/regress-baseline.json` and say so in the commit.

## Version number: bump it with every change

The title screen shows the version and the date of the last update, so the player can tell a new build has
arrived: `<p id="version">` in `shell/page.html`, e.g. `v1.1 · updated Oct 28, 2026`.

**Every change that alters `dist/` (gameplay, graphics, text, build changes) bumps it:** raise the last number by
one (`v1.1` → `v1.2`, `v1.9` → `v1.10`) and set the date to today. Bump once per pull request (or per push to
`main`), not for every commit along the way, and name the new version in the commit message that bumps it.
Changes that leave `dist/` untouched (docs, tools, CLAUDE.md) don't bump it.

## Generated files: never edit by hand

`dist/`, `MAP.md`, `SYMBOLS.tsv`, `docs/STATE.md` and the `//@` header lines at the top of each module are
written by the tools (`check.py` runs them all). Commit them together with the source change.

## Where to change things

| To change… | Go to |
| --- | --- |
| Speeds, controls, damage, need drain, odds, any "feel" number | `js/data/tuning.js` (evidence, arena and fight-by-situation numbers: `EVIDENCE`) |
| Anything people say or read: gossip, Lenny, rumours, headlines, endings | `js/data/lines.js` |
| The cast (names, looks, roles) and the three factions | `js/town/cast.js` (`CAST`, `FACTIONS`, `CREATURE_LOOK`) |
| The town map, houses, rooms, THEIR lairs | `js/world/grid.js` |
| Where furniture and doors stand | `js/world/objects.js` |
| What furniture looks like | `js/gfx/models.js` (`MODELS`), lair things in `js/gfx/lair-models.js` |
| Lights, line of sight, what the player can see | `js/world/light-map.js`, `js/world/vision.js` |
| Pathfinding, who may walk where | `js/world/paths.js` (`findPath`, `walkable`) |
| Shaders, bloom, what's drawn each frame | `js/gfx/shaders*.js`, `js/gfx/post.js`, `js/gfx/frame.js` (`renderFrame`) |
| How people and creatures are drawn | `js/gfx/people.js` (`drawPerson`), `js/gfx/creatures.js`, `js/gfx/body-parts.js` |
| Animation, poses, gaits, sitting | `js/sim/pose.js`, `js/sim/body-motion.js`, `js/sim/seat-moves.js` |
| The action queue every character runs | `js/sim/actions.js` (`mkAct`, `enqueue`, `runAct`) |
| Player needs (hunger, energy, bladder, Psychic: big steps `psyMark`, the drain near IT `psyDrain`; numbers in `PSY`, `BLADDER`) | `js/player/needs.js` |
| Work bar, shifts, being fired, a new day | `js/player/work.js` (`workTick`, `newDay`) |
| NPC daily schedule, habits, quirks | `js/town/daily-plans.js`, `js/town/routines.js`, `js/town/quirks.js` |
| What an NPC decides each frame | `js/town/npc-update.js` (`npcUpdate`, `npcThink`) |
| Suspicion, panic, fleeing | `js/town/suspicion.js`, `js/town/fleeing.js` |
| Talking and gossip (`gossipLine`: clues only, told once each) | `js/town/talk.js` (`talkAct`, `talkTick`), `js/town/echoes.js` |
| Police, arrest, the cells | `js/town/arrest.js`, `js/town/cell.js` (the hours held, played in 3D); the cell block: `STATION_MAP` in `js/world/grid.js`, `js/gfx/station.js` |
| THEIR week: phases, stages, midnight progression | `js/them/plan.js` (`PHASES`, `advanceWeek`) |
| Tells, THEIR awareness of you | `js/them/tells.js`, `js/them/awareness.js` (`bookAware`) |
| Evidence: four frames per suspect, clear/fuzzy/grey/dashed cards | `js/them/proofs.js` (`addProof`, `cardIn`, `frameState`, `greyFrame`) |
| False cards: innocent oddities, rumours (talk only, never cards), THEIR frame-ups | `js/play/oddities.js` |
| THEIR morning moves (bribes, scatter, destroy) | `js/them/moves.js` |
| Night attacks, the office after dark | `js/them/night-attacks.js`, `js/them/office-night.js` |
| True forms, fights | `js/them/true-form.js`, `js/combat/*.js` (`foeMelee`, `foeRanged`, `hurt`, `fireBolt`); your swing: `js/town/fleeing.js` (`attackKey`, `swingAct`) |
| Hitting people: hit count, onlookers, police calls, knockouts | `js/combat/brawl.js` (`struck`, `onlook`, `callPolice`, `knockCold`); numbers in `BRAWL` |
| Horror events and scenes | `js/horror/director.js` (daily plan), `layer.js` (machinery), `midday.js`, `night.js` |
| Encounters (rites) | `js/horror/encounters.js`, `encounter-outcomes.js`, `encounter-draw.js` |
| Player verbs: eat, sleep, snoop, Lenny | `js/play/verbs.js` |
| Stashes, traps, raids, items on the floor | `js/play/stashes.js`, `traps.js`, `raids.js`, `items.js` |
| Photos | `js/play/photos.js` (`playerPhoto`, `takePhoto`) |
| The confrontation (arena battle) and its outcomes | `js/play/arena.js` (`openConfront`, `arenaOutcome`), `js/ui/arena-view.js` |
| Giving up, the FBI, talk verbs (`SOC`) | `js/play/confront.js` (`surrender`, `fbiTake`) |
| "Come with me", witnesses THEY visit at night | `js/town/company.js` |
| Autopilot / "what should I do" advice | `js/play/advice.js` |
| What E does, keyboard handling | `js/input/targeting.js` (`interact`, `initInput`), then `js/ui/menus.js` |
| WASD walking, collisions | `js/input/walking.js` |
| Mouse, camera | `js/input/camera.js`, camera state in `js/gfx/renderer.js` |
| Menus, HUD, pie menu, the evidence book, notes | `js/ui/menus.js`, `hud.js`, `pie-menu.js`, `case-board.js`, `interface.js` |
| HUD markup and all CSS | `shell/page.html`, `shell/styles.css` |
| Sound | `js/audio/sound.js` (all synthesised with Web Audio) |
| Being taken to the lair and escaping | `js/taken/` (`taken.js` capture → `coming.js` → `down-there.js` → `way-out*.js` → `back-up.js`) |
| THEY come for you, hunts, the FBI | `js/chase/` (`they-come.js`, `hunt*.js`, `flee.js`, `fbi.js`) |
| Friday finale | `js/game/last-day.js` (`looseBegin`) |
| New game, saving, loading, endings | `js/game/state.js` (`freshG`, `newGame`, `saveGame`, `loadGame`, `gameOver`) |
| Main loop and boot | `js/game/loop.js` (`simStep`, `worldStep`, `frame`, `boot`) |
| Dev console tools (`__dev`) | `js/dev/devtools.js` (dev build only) |

Anything else: `grep -w name SYMBOLS.tsv` gives the module and line; `MAP.md` shows what that module uses and
who uses it; `docs/STATE.md` lists every field of the game state `G` with who writes and reads it.

## Shared globals

`G` (the current game, saved to localStorage; start values in `freshG`), `PLAYER`, `NPC` / `CHARS` (people),
`UI` (interface), `R` / `cam` / `gl` (renderer), and running set pieces `HX`, `CAP`, `HUNT`, `ARREST`.
A new field on `G` belongs in `freshG` (game/state.js) with its "unset" value.

## Rules of thumb

- Move code between modules with `tools/split.js` / `tools/move.js`, not by retyping; they refuse moves that
  break load order.
- Per-frame code must not allocate (no `new Float32Array`, `[...]`, `{...}` in every-frame loops); use the
  `M4.*Into` helpers in core/util.js. See `docs/PERFORMANCE.md`.
- GPU read-backs (`readPixels`, `toDataURL`) go through `warmLater` (gfx/portraits.js), never mid-frame.
- Randomness that isn't part of the simulation (film grain etc.) must not use `Math.random`, or the seeded
  determinism check breaks.
- `README.md` has the long version of the layout; `FOLLOWUP.md` lists open tasks.
