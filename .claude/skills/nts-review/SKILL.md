---
name: nts-review
description: Review a change in Nothing to See Here against the project's own rules - one shared scope and load order, generated files, the version bump, per-frame allocation, GPU read-backs, randomness and the determinism check, freshG, and what docs/DESIGN.md settled about talking, evidence, Psychic and the confrontation. Use before committing or opening a PR, when asked to review a diff, branch or file, or to audit the code against its rules. Not a bug hunt - use /code-review for general logic bugs.
---

# Nothing to See Here review

Three layers, in order:
1. **`tools/review-checks.js`** finds what a script can find, on the lines that changed.
2. **`checklist.md`** holds every rule a script cannot see; apply the relevant ones by reading the change.
3. **The built-in `/code-review`** catches general logic bugs, optionally.

## 1. Decide what is under review

- **Default:** uncommitted and untracked changes in this checkout.
- **A branch or PR:** `--base $(git merge-base HEAD origin/main)`. A big branch means a big report: narrow to the files the change is about.
- **Whole-code audit:** `--all` lists every line of `js/`; expect old warnings and judge each against `git blame` before reporting it.

## 2. Run the gate and the mechanical checks

```bash
python3 tools/check.py          # the gate: headers, MAP.md, SYMBOLS.tsv, docs/STATE.md, both builds, syntax
node tools/review-checks.js     # add --base REF or --all
```

`check.py` must be green first: a red one is the finding, and it also refreshes `docs/STATE.md`, which `review-checks` reads. `review-checks` prints `file:line [error|warn] id message` and exits 1 on an error. **Errors are findings.** Warnings are leads: open the line, read around it, and report it only when the rule really applies (a `new Float32Array` in a function that runs once at boot is not a finding). It also runs `docs-check` when a `.md` changed.

## 3. Apply the checklist

Open [checklist.md](checklist.md). For each changed file decide which sections apply and read the diff against them. Do not recite sections that do not apply. For a gameplay change also say whether `python3 tools/check.py --full` was run and whether the determinism check is meant to move.

## 4. Report

Findings first, most severe first, each with `path:line`, the rule it breaks (the `CLAUDE.md` section, the `docs/DESIGN.md` section, or the `.claude/rules/` file) and the smallest fix. Then what you checked and could not (how it looks or feels needs the page opened in a browser). Say plainly when the change is clean. Do not fix anything unless asked.
