# Review checklist

`CLAUDE.md` and `docs/DESIGN.md` are the full text; this is the question to ask of a diff. Apply a section only when the diff touches its area.

## The build and the shared scope (CLAUDE.md, *Read this first*)

- A new file is in `js/ORDER.txt` with a `# purpose` comment, at the point where its code should run (review-checks: `not-in-order`).
- A top-level `const`/`let`, or code that runs at load, uses only names defined by an *earlier* module in `ORDER.txt`. Calling a function from anywhere is fine.
- No top-level name defined twice (`check.py` fails on it).
- Code moved between modules went through `tools/split.js` / `tools/move.js`, not retyped, and was not renamed or "improved" on the way.
- No `import` / `export`, no npm dependency: the game is one self-contained page.

## Generated files and the version (CLAUDE.md)

- `dist/`, `MAP.md`, `SYMBOLS.tsv`, `docs/STATE.md` and the `//@` headers changed only through the tools, and are committed with the source change that caused them.
- A change that reaches `dist/` (gameplay, graphics, text, build) bumps `<p id="version">` in `shell/page.html` once per pull request or push to `main`, with today's date, and the commit message names the new version. A docs- or tools-only change does not (review-checks: `version-bump`, `version-date`).
- `shell/page.html` still opens with the document skeleton line (README, *Publishing*).

## Determinism and randomness

- Randomness that isn't part of the simulation (grain, flicker, a UI tilt, sound) does not use `Math.random`; sound uses `audio.rnd` (review-checks: `sound-random`, `presentation-random`).
- A refactor keeps `python3 tools/check.py --full` green. A change meant to alter behaviour moved the determinism check, was played, and recorded a new baseline that the commit mentions.
- Sound only listens: nothing in `js/audio/` writes the game state.

## Per-frame code (docs/PERFORMANCE.md)

- No allocation in code that runs every frame: no `new Float32Array`, `[...]`, `{...}`, closures or string building in a draw or step loop; `M4.*Into`, reused buffers (review-checks: `frame-alloc`, a lead only).
- GPU read-backs (`readPixels`, `toDataURL`) go through `warmLater` (gfx/portraits.js), never mid-frame (review-checks: `gpu-readback`).
- A speed claim was measured (`tools/allocs.py`, `tools/profile.py`, `tools/playtest.py`, `__dev.perf()`), not argued.

## The game state

- A new field on `G` is in `freshG` (game/state.js) with its "unset" value (review-checks: `g-field-not-in-freshG`).
- Only `js/game/state.js` touches storage; a lost game still deletes the save.

## Talking, evidence, Psychic, the confrontation (docs/DESIGN.md)

Read the section of DESIGN.md for the piece that changed. Where the diff and DESIGN.md disagree, that is a finding to ask about, not to settle.

- Gossip is a clue, never evidence: it never makes a card, and `gossipLine` tells each clue once. Rumours are talk only.
- No daily limits on any verb; cards are never used up (only THEY can take one, from your flat).
- A human never has more than two odd true things about them (one innocent oddity, at most one THEIR plant); one of THEM can have four.
- A card says plainly what it shows, where and when; ✓ or ✗ is decided only in a confrontation. 0–1 ✓ shrug, 2 ugly, 3+ gives up (only THEM get there). Someone has to take you seriously.
- Suspicion is the only thing people hold about you; it shows in the evidence book only, not on the HUD.
- THEIR awareness of you is settled at 06:00 and never moves the moment someone notices you.
- The rule fits in one sentence a player could say out loud, with no "unless", "only when" or "except".

## Words and numbers

- Every new word people say or read is in `js/data/lines.js`; every new feel number in `js/data/tuning.js`. A value or line the user did not give was proposed to them, not chosen silently.
- `js/data/` keeps its hand alignment; the rest is Prettier-formatted (`npx prettier@3 --check js tools`).

## The art style and the light map

- The cartoon-to-noir look (gfx/look.js, shaders, post) is render only: nothing in it feeds the light map or vision.
- Anything visual was looked at in the browser, at day and at night, not only checked headless.

## Docs

- A changed `.md` passes `node .claude/tools/docs-check.js` for the file; a table row in `CLAUDE.md` or `README.md` still names files and functions that exist.
- The change names the check it reached: `check.py`, `check.py --full`, or played in the browser.
