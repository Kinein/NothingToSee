# Hooks

Guards that run on the agent's tool calls. Node scripts, CommonJS, no dependencies; wired in `.claude/settings.json`. They encode the rules a wrong call breaks silently here: the generated files, the `//@` headers, the determinism baseline, `main` and uncommitted work. A hook never answers "allow": it either says nothing (the normal permission flow decides), asks the human, or denies with a reason the agent reads.

| Hook | Event, matcher | Denies | Asks | Why |
|---|---|---|---|---|
| `guard-files.js` | PreToolUse `Edit\|Write\|MultiEdit\|NotebookEdit` | an edit of `dist/`, `MAP.md`, `SYMBOLS.tsv` or `docs/STATE.md` (in this checkout or a worktree under `.claude/worktrees/`); an edit or Write of a `js/**.js` module that changes its `//@` header lines | an edit of `.claude/hooks/**`, `.claude/settings.json`, `.claude/settings.local.json`, `.claude/tools/**` | CLAUDE.md, *Generated files: never edit by hand*; the guardrails are the human's to change |
| `bash-gate.js` | PreToolUse `Bash` | a shell write into a generated file (`>`, `>>`, `tee`, `sed -i`, `perl -i`, `cp`/`mv` onto one); a force-push or a delete of `main`, `master` or `release/*` (an undeterminable branch counts as shared); `rm -r` of `/`, `~`, the project root, `js`, `shell`, `tools`, `docs`, `.claude`, `.git`; `git worktree remove` and `prune` | `python3 tools/regress.py --save` (a new determinism baseline); `git reset --hard`, `git clean -f`, `git checkout -- …`/`.`/`-f`, `git restore` of the worktree, `git switch -f`, `git branch -D`, any `git stash` but `list`/`show`, every branch switch (`git switch <b>`, `git checkout <b>`/`-b`), `rm -r *` | shared history, uncommitted work and the baseline are not the agent's to discard or move; **a plain push is allowed** |

## Details

- A generated file reached through the tools (`python3 tools/check.py`, `build.py`, `node tools/map.js`, `node tools/state.js`) is never blocked: the hook only sees what the shell command itself names.
- The header check compares the `//@` lines an Edit removes with the ones it adds; a Write may leave the header out (the tool puts it back) but may not bring a different one. A brand-new module gets its header from `tools/map.js --headers`.
- `bash-gate.js` splits a command on `&&`, `||`, `;`, `|`, newlines and subshells, skips heredoc bodies and quoted text, follows `cd`, and ignores leading `VAR=value`, `sudo`, `env`, `xargs`. A `>` inside quotes is text, not a redirect. It reads a push's target branch from the refspec, else from `git rev-parse --abbrev-ref HEAD`. A deny anywhere in the command wins over an ask elsewhere in it. The word after `-m` / `--message` is a commit message, not a path.
- `.claude/settings.json` also carries `permissions.deny` for editing the generated files, so the permission system refuses them too; the hooks are the second line and also cover worktrees.
- A script that writes a generated file itself (`python3 -c`, `node -e`) is not visible to the hook; the rule in `CLAUDE.md` covers that.
- `git stash` is gated because this tree often holds uncommitted work and a stash is never the way to take a baseline; `git worktree remove` is denied because it half-guts the worktree before the sandbox stops it. Hand the human the command.

## Kill switches

Environment variables of the Claude Code process:

- `DISABLE_NTS_HOOKS=1`: every hook off.
- `DISABLE_HOOK_<NAME>=1`: one hook off; `<NAME>` is the file name in upper case with `-` as `_`, e.g. `DISABLE_HOOK_BASH_GATE=1`.
- `NTS_HOOK_MODE=warn`: nothing is denied or asked; the reason shows as a warning instead.

Hooks are Node scripts: without `node` on `PATH`, every guarded call shows a hook error, and the guards are off.

## Log and self-test

- Decisions and errors go to `.claude/hooks.log` (git-ignored). A hook that crashes logs the error and lets the call through.
- `node .claude/tools/hooks-selftest.js` runs every hook against fixtures in a throwaway git repo; it prints `N passed, 0 failed` and exits 1 on any failure. Run it after every hook change.
