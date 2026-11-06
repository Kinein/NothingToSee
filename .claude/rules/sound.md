---
paths:
  - "js/audio/**"
---

# Sound

Moved unchanged from the *Where to change things* table in `CLAUDE.md`.

`js/audio/sound.js` (all synthesised with Web Audio: the beds, the two reverb rooms, the muffle, every one-shot in
`hx`, `voice`, `loop`); what plays when, from the game's state (the air for here and now, footsteps by surface,
doors, hands at work `FOLEY_USE`/`FOLEY_ANIM`, voices for `ui.say`): `js/audio/foley.js` (`soundTick`,
`foleyTick`, `voiceFor`). Sound only listens and has its own randomness (`audio.rnd`): never `Math.random`.

- **Sound only listens.** It reads the game's state and never writes `G`, a character or the plan; a sound that
  needs to change the game is a gameplay change made elsewhere.
- `Math.random` here moves the seeded determinism check (`tools/review-checks.js` reports it as an error).
- `foleyTick` and `soundTick` run every frame: no allocation in them (`docs/PERFORMANCE.md`).
