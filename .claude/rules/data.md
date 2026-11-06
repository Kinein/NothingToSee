---
paths:
  - "js/data/**"
---

# The data tables

- `js/data/tuning.js` holds the numbers that set how the game plays and feels; `js/data/lines.js` holds every word
  people say and read. **A feel number or a line of dialogue is the designer's call**: when a task needs a new
  value or new wording that the user did not give, propose it and say so, don't settle it silently.
- Both files are hand-aligned: one row per record, comments in a column. Prettier leaves `js/data/` alone
  (`.prettierignore`); keep the columns lined up by hand.
- A changed number or line alters the game: it bumps the version (`CLAUDE.md`, *Version number*), and a changed
  number usually moves the determinism check.
