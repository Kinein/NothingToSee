---
paths:
  - "tools/**"
  - "build.py"
---

# The tools

- `tools/check.py` is the gate after every change; `--full` adds the headless boot and the seeded determinism check
  (needs Python playwright). Run the heavy browser tools one at a time, never side by side.
- `tools/regress-baseline.json` is recorded only after a change that is *meant* to alter behaviour, and only after
  playing it: `python3 tools/regress.py --save tools/regress-baseline.json` (the bash-gate hook asks first). Say so
  in the commit.
- Format with `npx prettier@3 --write js tools` (`.prettierrc.json`).
- A change to a tool alone leaves `dist/` untouched and does not bump the version; a change to `build.py` that
  changes what it writes does.
- `tools/review-checks.js` is the scripted half of the `nts-review` skill.
