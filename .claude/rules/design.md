---
paths:
  - "docs/DESIGN.md"
  - "js/town/talk.js"
  - "js/town/echoes.js"
  - "js/town/suspicion.js"
  - "js/them/proofs.js"
  - "js/them/tells.js"
  - "js/play/biography.js"
  - "js/play/oddities.js"
  - "js/play/confrontation.js"
  - "js/play/confront.js"
  - "js/play/stashes.js"
  - "js/play/plants.js"
  - "js/player/needs.js"
  - "js/ui/confront-view.js"
  - "js/ui/case-board.js"
---

# Talking, evidence, Psychic and the confrontation

`docs/DESIGN.md` is the agreed redesign of these, built in v1.11–v1.17 (see its *Building it*). **Read the section
for the piece you are changing before you change it**; its last table, *Where it lives in the code*, maps each
piece to its module. FOLLOWUP.md lists the parts of it that aren't built yet.

- **Where the code and DESIGN.md disagree, say so and ask which one wins**, then change both. Never let them drift,
  and never settle it yourself: the design is the designer's.
- The test it sets for every system: a rule fits in one sentence a player could say out loud, with no "unless",
  "only when" or "except".
- The rules that hold it together, which a change most easily breaks: gossip is a clue and never makes a card; a
  human never has more than two odd true things about them, one of THEM can have four; a card is plain and turns
  ✓ or ✗ only in a confrontation (0–1 shrug, 2 ugly, 3+ gives up); suspicion is the only thing people hold about
  you; THEIR awareness of you is settled at 06:00 and never moves the moment someone notices you.
