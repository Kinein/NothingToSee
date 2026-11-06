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
python3 tools/object_sheets.py office   # → renders/office/: every object in the 4 keys-camera views, one PNG each
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
written by the tools (`check.py` runs them all). Commit them together with the source change. The `guard-files`
and `bash-gate` hooks refuse a hand edit of any of them.

## Where to change things

| To change… | Go to |
| --- | --- |
| Speeds, controls, damage, need drain, odds, any "feel" number | `js/data/tuning.js` (evidence, confrontation and fight-by-situation numbers: `EVIDENCE`) |
| Anything people say or read: gossip, Lenny, rumours, headlines, endings | `js/data/lines.js` |
| The cast (names, looks, roles) and the three factions | `js/town/cast.js` (`CAST`, `FACTIONS`, `CREATURE_LOOK`) |
| The town map, houses, rooms, THEIR lairs | `js/world/grid.js` |
| Where furniture and doors stand | `js/world/objects.js` |
| What furniture looks like | `js/gfx/models.js` (`MODELS`), lair things in `js/gfx/lair-models.js` |
| Lights, line of sight, what the player can see | `js/world/light-map.js`, `js/world/vision.js` |
| Pathfinding, who may walk where | `js/world/paths.js` (`findPath`, `walkable`) |
| Shaders, bloom, what's drawn each frame | `js/gfx/shaders*.js`, `js/gfx/post.js`, `js/gfx/frame.js` (`renderFrame`) |
| The art style: cozy cartoon town that turns harsh noir when something bad happens (`LOOK.h`, `lookTarget`, `lookDoors`). Render only | `js/gfx/look.js`; the shader side in gfx/shaders.js, the grade in gfx/post.js. Rule: [look.md](.claude/rules/look.md) |
| How people and creatures are drawn | `js/gfx/people.js` (`drawPerson`), `js/gfx/creatures.js`, `js/gfx/body-parts.js` |
| Animation, poses, gaits, sitting | `js/sim/pose.js`, `js/sim/body-motion.js`, `js/sim/seat-moves.js` |
| The action queue every character runs | `js/sim/actions.js` (`mkAct`, `enqueue`, `runAct`) |
| Player needs (hunger, energy, bladder, the accident's spray `accident`/`peeFx`, Psychic: big steps `psyMark`, the drain near IT `psyDrain`; numbers in `PSY`, `BLADDER`) | `js/player/needs.js` |
| Work bar, shifts, being fired, a new day | `js/player/work.js` (`workTick`, `newDay`) |
| NPC daily schedule, habits, quirks | `js/town/daily-plans.js`, `js/town/routines.js`, `js/town/quirks.js` |
| What an NPC decides each frame | `js/town/npc-update.js` (`npcUpdate`, `npcThink`) |
| Suspicion, panic, fleeing | `js/town/suspicion.js`, `js/town/fleeing.js` |
| Talking and gossip (`gossipLine`: clues only, told once each) | `js/town/talk.js` (`talkAct`, `talkTick`), `js/town/echoes.js` |
| Police, arrest, the cells | `js/town/arrest.js`, `js/town/cell.js` (the hours held, played in 3D; `CELL.forever` for the jailed ending); the cell block: `STATION_MAP` in `js/world/grid.js`, `js/gfx/station.js` |
| Running from an arrest (Shift while the cuffs go on or on the walk to the car), the officer's gun and dive, being wanted | `js/town/on-the-run.js` (`runForIt`, `pursuitBegin`, `copGun`, `wantedTick`); numbers in `RESIST` |
| THEIR week: phases, stages, midnight progression | `js/them/plan.js` (`PHASES`, `advanceWeek`) |
| Tells (every slip heard from close by: `slipHeard`), the slipping-off cue (`slipCue`, town/routines), THEIR awareness of you | `js/them/tells.js`, `js/them/awareness.js` (`bookAware`) |
| Evidence: four frames per suspect (Home, Habit, Body, Biography), one plain card each (✓/✗ only in a confrontation) | `js/them/proofs.js` (`addProof`, `cardIn`, `caseCards`) |
| Biography: six facts a suspect, where they turn up (chat, rummaging, the paper, Mom), your odd mark | `js/play/biography.js` (`makeBios`, `markFact`); the facts: `BIO_*` in data/lines.js |
| Innocent oddities (lookalikes, habits, tics), rumours (talk only, never cards) | `js/play/oddities.js`; the lookalikes: `ODDITY_HOME` in data/lines.js |
| THEIR morning moves (bribes, scatter, destroy) | `js/them/moves.js` |
| A card destroyed in person: someone at your computer for half an hour, scared off or hit with no police | `js/them/wipe.js` (`wipeLater`, `wipeTick`, `burglar`); numbers in `WIPE` |
| Night attacks, the office after dark | `js/them/night-attacks.js`, `js/them/office-night.js` |
| True forms, fights | `js/them/true-form.js`, `js/combat/*.js` (`foeMelee`, `foeRanged`, `hurt`, `fireBolt`); your swing: `js/town/fleeing.js` (`attackKey`, `swingAct`) |
| Hitting people: hit count, onlookers, police calls, knockouts | `js/combat/brawl.js` (`struck`, `onlook`, `callPolice`, `knockCold`); numbers in `BRAWL` |
| Blood: the spray from every blow, splats on floors and runs down walls, kept all game (`G.blood`), THEIR colours, the hit-stop | `js/combat/blood.js` (`bleed`, `bleedAt`, `bloodPool`, `bloodDraw`); numbers in `BLOOD`; the splat/drip shapes in `DFS` (gfx/shaders-fx.js) |
| What a shaken head hears: sharper ears, sounds that aren't there, catching one of THEM slip to clear your name (`catchThem`); numbers in `EARS` | `js/horror/ears.js`, `visionPing` in horror/visions.js, `heardIt` in them/plan.js |
| Horror events and scenes | `js/horror/director.js` (daily plan), `layer.js` (machinery), `midday.js`, `night.js` |
| Encounters (rites) | `js/horror/encounters.js`, `encounter-outcomes.js`, `encounter-draw.js` |
| Player verbs: eat, sleep, snoop, Lenny | `js/play/verbs.js` |
| Hidden things, the fridge, taking and the place rule (`takeThing`, `placeOwner`) | `js/play/stashes.js` (`STASH_KINDS`, `PLANTS`) |
| THEIR plant at a victim's place and in your home, THEY take things back, signs for a gut feeling | `js/play/plants.js` (`morningThings`) |
| Traps (V puts one down in front of you: `trapKey`, `setTrapAct`; E on it baits it or picks it up: `baitTrap`, `liftTrap`), raids, items on the floor | `js/play/traps.js`, `raids.js`, `items.js` |
| Photos: the wedge, the photo hint, the flash rule, what F turns you onto; the camera's square, the photo's sky, the staged shot | `js/play/photos.js` (`playerPhoto`, `takePhoto`), `js/gfx/viewfinder.js` (`vfOpen`, `vfRender`), `js/gfx/vf-sky.js` (`vfBackdrop`), `js/gfx/vf-stage.js` (`vfPlan`). Rule: [photos.md](.claude/rules/photos.md) |
| The confrontation (every card turns ✓ or ✗; 0–1 shrug, 2 ugly, 3+ gives up) | `js/play/confrontation.js` (`openConfront`, `cardHolds`, `cfOutcome`), `js/ui/confront-view.js`; the stage light: `uStage` in gfx/post.js |
| Giving up, the FBI, talk verbs (`SOC`) | `js/play/confront.js` (`surrender`, `fbiTake`) |
| "Come with me", witnesses THEY visit at night | `js/town/company.js` |
| People who come up to you on their own (a word, Hale shouting you back to your desk, THEM probing, THEIR people warning then following, strangers, drunks) | `js/town/approach.js` (`approachTick`, `approachAct`); numbers in `APPROACH`, lines in `APPROACH_LINES` |
| Autopilot / "what should I do" advice | `js/play/advice.js` |
| What E does, keyboard handling | `js/input/targeting.js` (`interact`, `initInput`), then `js/ui/menus.js` |
| WASD walking, collisions | `js/input/walking.js` |
| Mouse, camera | `js/input/camera.js`, camera state in `js/gfx/renderer.js` |
| Menus, HUD, pie menu, the evidence book, notes | `js/ui/menus.js`, `hud.js`, `pie-menu.js`, `case-board.js`, `interface.js` |
| HUD markup and all CSS | `shell/page.html`, `shell/styles.css` |
| Sound | `js/audio/sound.js` (synthesised: `hx`, `voice`, `loop`); what plays when: `js/audio/foley.js` (`soundTick`, `foleyTick`, `voiceFor`). Sound only listens; never `Math.random`. Rule: [sound.md](.claude/rules/sound.md) |
| Being taken to the lair and escaping | `js/taken/` (`taken.js` capture → `coming.js` → `down-there.js` → `way-out*.js` → `back-up.js`) |
| THEY come for you, hunts, the FBI | `js/chase/` (`they-come.js`, `hunt*.js`, `flee.js`, `fbi.js`) |
| Friday finale | `js/game/last-day.js` (`looseBegin`) |
| New game, saving, loading, endings | `js/game/state.js` (`freshG`, `newGame`, `saveGame`, `loadGame`, `gameOver`: a lost game deletes the save, no reloading) |
| The last picture before the end card: your body, the cell for good, THEIR win on day five | `js/game/endings.js` (`endBegin`, `endBody`, `endCell`, `endFired`: Hale yells you out of the job, `endThey`); captions `THEY_WON` in data/lines.js |
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
- `docs/DESIGN.md` is the agreed redesign of talking, evidence, Psychic and the confrontation, built in v1.11–v1.17.
  Read it before changing any of those (the `design` rule below says how); FOLLOWUP.md lists what isn't built yet.
- Ask before deciding what is the designer's: a feel number, a line people say, anything `docs/DESIGN.md` settled,
  whether a change in behaviour is meant (and so a new determinism baseline). Propose, don't settle it silently.
- Every name or path you cite you have seen in a file in this session; otherwise say it's unverified. Say which
  check a change reached: `check.py`, `check.py --full`, or played in the browser.

## Rules

`.claude/rules/<name>.md` load when you read or edit a file under their `paths:`. Each is short and names the
document to read first. **Read the rule that loads before you change anything in its area.**

| Rule | Covers | Loads for |
| --- | --- | --- |
| [design.md](.claude/rules/design.md) | talking, evidence, Psychic, the confrontation: what `docs/DESIGN.md` settled | `docs/DESIGN.md`, town/talk, echoes, suspicion, them/proofs, tells, play/biography, oddities, confrontation, confront, stashes, plants, player/needs, ui/confront-view, case-board |
| [frame-code.md](.claude/rules/frame-code.md) | no allocation per frame, read-backs via `warmLater`, measuring | `js/gfx/**`, `js/sim/**`, game/loop, world/light-map, world/vision, combat/blood, audio/foley |
| [look.md](.claude/rules/look.md) | the art style, cartoon to noir, render only | gfx/look, shaders, shaders-fx, post, frame |
| [photos.md](.claude/rules/photos.md) | photos, the viewfinder, the photo's sky, the staged shot | play/photos, gfx/viewfinder, vf-sky, vf-stage |
| [sound.md](.claude/rules/sound.md) | sound only listens, `audio.rnd` | `js/audio/**` |
| [state.md](.claude/rules/state.md) | `G`, `freshG`, saving | game/state, sim/core, sim/characters |
| [data.md](.claude/rules/data.md) | the tuning numbers and the lines are the designer's; hand-aligned tables | `js/data/**` |
| [tools.md](.claude/rules/tools.md) | the gate, the determinism baseline, formatting | `tools/**`, `build.py` |
| [docs.md](.claude/rules/docs.md) | generated vs written docs, `docs-check`, `/docs-sync` | README, FOLLOWUP, 3D_ASSETS, CLAUDE, `docs/DESIGN.md`, `docs/PERFORMANCE.md`, `.claude/rules/**`, `.claude/skills/**` |

## Hooks

Wired in `.claude/settings.json`, described in [.claude/hooks/README.md](.claude/hooks/README.md). They refuse a hand
edit of the generated files and the `//@` headers, protect `main` and uncommitted work from destructive git, ask
before a new determinism baseline, and ask before editing the guardrails themselves. A denied call is the rule
speaking: change the approach, don't work around the hook. A plain push is allowed; a force-push or a delete of
`main` is not. After changing a hook, run `node .claude/tools/hooks-selftest.js`.

## Skills

- `/grill-me <topic>`: interview the user about a plan until no branch of it is open.
- `nts-review`: review a change against this file and `docs/DESIGN.md`: `node tools/review-checks.js`, then the
  checklist. Not a bug hunt; `/code-review` is.
- `/docs-sync <doc>`: reconcile one document with the code since its marker; `docs-check` is its mechanical half.
- `temp-instrumentation`: temporary timing or ordering logs for a hitch or a race, removed afterwards.

## Docs check

After editing a `.md` (other than the generated ones), run `node .claude/tools/docs-check.js` and fix the dead
references it reports for the files you touched.
