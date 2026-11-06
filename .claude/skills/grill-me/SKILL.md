---
name: grill-me
description: Interview the user round by round about a plan, feature or design for Nothing to See Here until no branch of it is open, then summarize the decisions. Run as /grill-me <topic>; the topic can also be the plan in the current conversation.
disable-model-invocation: true
argument-hint: <topic>
---

# Grill me

Topic: `$ARGUMENTS`, or the plan under discussion when empty.

1. Restate the plan in three to five lines and list its open branches: every decision it depends on that nobody has made yet.
2. Ask one question per round, about the branch that the most other branches depend on. Each question carries your recommended answer and the reason for it. Use `AskUserQuestion` when the options are discrete.
3. Before you ask, check the repository: `docs/DESIGN.md` for what talking, evidence, Psychic and the confrontation are (its *Open questions, and how they were settled* is already decided), `FOLLOWUP.md` for what is planned and its rules, `js/data/tuning.js` for the numbers there are, `js/data/lines.js` for what people already say, the `CLAUDE.md` table and `grep -w name SYMBOLS.tsv` for the code. A question they answer is not asked; state the answer with `path:line` or the section and move on.
4. An answer that opens new branches adds them to the list. Hold the user to an answer: "it depends" becomes the question it depends on.
5. Stop when no branch is open or the user says stop. Never decide a branch yourself. These are the user's, always: **a number that sets how the game plays or feels** (the game is playtested and tuned by feel, so ask which way and by how much rather than inventing a value), **what people say** and how it sounds, **anything that changes a rule `docs/DESIGN.md` settled**, what a card shows or whether it holds, what THEY do and when in their week, what the art style does, anything that **persists in the save** (`freshG`), and whether a change in behaviour is meant (which decides a new determinism baseline).
6. End with the decisions, one line each; the branches left open and why; and the next step you would take. Offer to write it into `docs/DESIGN.md` or `FOLLOWUP.md` only if the interview changed a design or a plan.

Write nothing to disk and change no code during the interview.
