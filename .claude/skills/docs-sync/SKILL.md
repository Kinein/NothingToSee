---
name: docs-sync
description: Reconcile one Nothing to See Here document (CLAUDE, README, DESIGN, PERFORMANCE, FOLLOWUP or ASSETS) with the code changed since that document's sync marker, propose the edits, apply the approved ones and move the marker. Run as /docs-sync <CLAUDE|README|DESIGN|PERFORMANCE|FOLLOWUP|ASSETS>.
disable-model-invocation: true
argument-hint: <CLAUDE|README|DESIGN|PERFORMANCE|FOLLOWUP|ASSETS>
---

# Docs sync for one document

Document: `$ARGUMENTS`. The code is the ground and the document is the map. This finds where the map drifted, proposes fixes and moves the document's marker only after the human accepts them. The marker lives in `.claude/tools/docs-markers.json`: the commit the document was last reconciled against and the code paths that matter to it. The first marker is a baseline set when the tool was introduced, not a verification; the first sync of each document is therefore a full read.

`MAP.md`, `SYMBOLS.tsv` and `docs/STATE.md` are generated: they are never synced here, `python3 tools/check.py` rewrites them.

## 1. Scope

1. Read `.claude/tools/docs-markers.json`. No entry for `$ARGUMENTS`: stop and list the entries.
2. `git merge-base --is-ancestor <hash> HEAD` must succeed; otherwise stop and report.
3. `node .claude/tools/docs-check.js --changes <name>` prints the commits and diffstat on the document's code since the marker. Nothing changed and the marker is under six weeks old: report that and stop.
4. `node .claude/tools/docs-check.js` shows the dead references (a backticked path that is gone, a link or anchor that goes nowhere) and the marker age. Fix those first; they need no judgement.

## 2. Verify

Read the document in full (a section at a time for the big ones, and use a read-only subagent for a large diff; re-check every finding yourself before proposing it).

1. Every statement with a pointer (`path`, a module like `town/talk.js`, a function, a constant): confirm it with `grep -w name SYMBOLS.tsv` and by opening the code. Classify each as **holds**, **wrong** (the code says otherwise), **stale** (the name or path is gone) or **thin** (true, but the diff added a case it does not cover). `node .claude/tools/docs-check.js --identifiers` lists backticked names no code mentions.
2. Every command in the document: run the cheap ones and compare with what it says. Run the browser tools one at a time, never side by side.
3. **What each document may and may not say:**
   - **CLAUDE.md** is the map an agent works from: every row of *Where to change things* must name files and functions that exist and still own what the row says. A row that grew into a paragraph moves into a `.claude/rules/` file.
   - **README.md** holds the layout, the layers, the tools table and publishing. A tool added or removed in `tools/` changes its table.
   - **docs/DESIGN.md** is the agreed design. If the code disagrees with it, **do not edit DESIGN.md to match the code and do not edit the code to match DESIGN.md here**: list the disagreement and ask which side wins. Its last table, *Where it lives in the code*, is a pointer table and is fixed like any other.
   - **docs/PERFORMANCE.md** holds measured numbers: re-measure with the tool it names rather than hand-editing a number, or mark the number as old.
   - **FOLLOWUP.md** is the task list. A task the code shows done is proposed for removal (or moved to done), never silently deleted; its *Rules* follow `CLAUDE.md`.
   - **3D_ASSETS.md** lists what the game has: check it against `MODELS` (gfx/models.js), `OT` (world/objects.js) and the files it names.

## 3. Propose

List the findings as a table: location in the document, class, what the code says (`path:line`), the proposed edit. Group by section. Ask for approval; apply only what is approved. A finding that needs a design decision (which side wins, what a number should be) goes to the human as a question and is never decided here.

## 4. Apply and move the marker

1. Apply the approved edits. Run `node .claude/tools/docs-check.js --fail` and fix every dead reference in the files you touched.
2. Set the document's entry in `.claude/tools/docs-markers.json` to today's date and the current `git rev-parse HEAD`. That file is a guardrail path, so the edit asks for the human's approval; say what the new marker is claiming. Move the marker only when the human accepted the reconciliation; a partial sync leaves it where it was.
3. Docs-only edits don't bump the version. Report: findings by class, edits applied, questions left open, the new marker.
