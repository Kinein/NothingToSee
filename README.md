# Nothing to See Here: source

The game ships as one self-contained HTML page. This folder is that page as ~100 small modules, a build
script that stitches them back together, and tools that keep the code navigable and the game's behaviour
pinned down while you change it.

```
python3 build.py                 # → dist/nothing-to-see-here.html (the game; open it or publish it)
python3 tools/check.py           # after any change: map, headers, state doc, both builds, syntax
python3 tools/check.py --full    # …plus a headless boot test and the determinism check (needs playwright)
```

## Layout

```
build.py               stitches shell/ + js/ (in js/ORDER.txt order) into dist/
shell/page.html        the page: <head>, fonts, HUD markup, the <script> wrapper ({{STYLES}}, {{SCRIPT}})
shell/styles.css       all CSS
js/ORDER.txt           build order: every module on one line with its purpose. A file not listed is not in the game
js/data/               tuning.js (the numbers that set the feel) and lines.js (everything people say and read)
js/<folder>/*.js       the game, by layer (below)
js/dev/devtools.js     developer tools, only in the dev build (dist/nothing-to-see-here.dev.html): window.__dev
MAP.md                 per module: what it defines, what it uses, who uses it                     (generated)
SYMBOLS.tsv            every top-level name → module and line: grep -w name SYMBOLS.tsv             (generated)
docs/STATE.md          every field of the game state G: start value, who writes it, who reads it    (generated)
docs/PERFORMANCE.md    what makes frames slow, what was done about it, how to measure
tools/                 check.py, map.js, state.js, split.js, move.js, smoke.py, regress.py, profile.py, playtest.py, allocs.py
FOLLOWUP.md            what's left to do, and the rules for doing it
```

**One scope, no imports.** All modules are concatenated into a single function (the IIFE in
`shell/page.html`) under `'use strict'`. Every top-level `function`, `const` and `let` is visible to every
other module, exactly as in the original single file:

1. **Order matters for load-time code.** Functions are hoisted, so anything can *call* anything. A top-level
   `const`/`let`, or code that runs at load, can only use what an *earlier* module in `ORDER.txt` defined.
2. **Names are global to the game.** Two modules must never define the same top-level name (map.js warns).
3. **`//@` headers** at the top of each module (purpose, main definitions, what it leans on) are written by
   `tools/map.js --headers` and stripped by the build.

## Layers

| Layer | Folders | What lives there |
| --- | --- | --- |
| Data | `data/` | Tuning numbers and all the game's text, in two files |
| Engine | `core/` `world/` `gfx/` `audio/` `input/` | Math, the grid and rooms, light and sight, A* paths, the WebGL2 renderer, models, people and creature drawing, synthesised sound, keyboard and camera |
| Simulation | `sim/` `player/` | Shared state (`G`, `PLAYER`, `NPC`, `CHARS`), the body in motion, the action queue every character runs, your needs and work |
| Town | `town/` | The cast, plans, habits, quirks, NPC update, suspicion, fleeing, police, talk and gossip, echoes, doors, traffic |
| THEM | `them/` `combat/` `horror/` | THEIR week, tells, proofs, awareness, true forms, night attacks, the office at night; bolts, hits, the timing bar; the horror director, scenes, half and tenth forms, encounters |
| Player verbs | `play/` | Items, stashes, traps, raids, snooping, confronting, photos, advice |
| Set pieces | `taken/` `chase/` | Being taken to THEIR lair and getting out; THEY come for you, chases, the FBI, Friday |
| Shell | `ui/` `game/` | Menus, notes, HUD, pie menu, case board; game state, saving, endings, the main loop and `boot()` |

## Where things are

| To change… | Look in |
| --- | --- |
| How fast things go, controls, damage, need drain, odds | js/data/tuning.js |
| Anything people say, headlines, endings | js/data/lines.js |
| The cast and factions | `CAST`, `FACTIONS` in town/cast.js |
| THEIR week | `PHASES` in them/plan.js (tuning: `TIP`, `ATTACK_ODDS`, `HORROR_MIX`, `AWARE_STEPS`) |
| Proof and confronting | them/proofs.js (`addProof`), play/confront.js (`openConfront`, `resolveConfront`) |
| Talking | town/talk.js (`talkAct`, `talkTick`) |
| Photos | play/photos.js (`playerPhoto`) |
| What E does | input/targeting.js (`interact`), then ui/menus.js |
| Fights | them/true-form.js, combat/*.js |
| Friday | game/last-day.js (`looseBegin`) |
| Saving, new game, loading | game/state.js (`saveGame`, `newGame`, `loadGame`) |
| The frame loop, boot | game/loop.js (`frame`, `boot`) |
| What gets drawn each frame | gfx/frame.js (`renderFrame`) |
| HUD look | shell/styles.css, ui/hud.js |

For anything else: `grep -w theName SYMBOLS.tsv`, then MAP.md for that module's neighbours.

## Tools

| Tool | What for |
| --- | --- |
| `tools/check.py [--full]` | Run after every change |
| `tools/split.js FILE LINE "name: purpose" …` | Split a module at top-level boundaries; the build stays byte-identical |
| `tools/move.js DEST NAME …` | Move top-level declarations between modules; refuses moves that could break load order |
| `tools/regress.py [--quick] --check tools/regress-baseline.json` | Seeded determinism check: the simulation must land in exactly the same state |
| `tools/profile.py`, `tools/playtest.py` | Where the time goes: simulation cost per game hour, slow frames during a fast-forwarded week |
| `tools/allocs.py` | Memory allocated per frame, by function (garbage means collector pauses) |
| `tools/smoke.py` | Headless boot: starts a game and fails on any JavaScript error |
| dev build: `__dev` in the browser console | `__dev.perf()`, `__dev.skip(minutes)`, `__dev.speed(45)`, `__dev.keepAlive()`, `__dev.run('…')` |

The headless tools need `pip install playwright && playwright install chromium`. Headless WebGL is software
rendering: it proves the code runs, not how it looks or plays. Open the page in a real browser too.

## Publishing

`dist/nothing-to-see-here.html` is the whole game: publish it as the artifact, or open it from disk. The
first line of `shell/page.html` holds the document skeleton (`<!doctype html>…<body>`); keep it so the
standalone file stays a complete page.
