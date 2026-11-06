'use strict';

const path = require('path');
const lib = require('./lib');

const HOOK = 'bash-gate';

// A push is allowed. What is not: rewriting or deleting one of these on the remote.
const PROTECTED_BRANCHES = [/^main$/, /^master$/, /^release\/.+/];

const PROTECTED_RM_TARGETS = new Set([
    '.', '..', '~', '/', 'js', 'shell', 'tools', 'docs', '.git', '.claude',
]);

const WILDCARD_RM_TARGETS = new Set(['*', '.*', './*', '*/']);

const GENERATED_RULE = 'CLAUDE.md, "Generated files: never edit by hand": dist/, MAP.md, SYMBOLS.tsv and docs/STATE.md are written by the tools. Change the source and run python3 tools/check.py, which rewrites them all.';

const BASELINE_RULE = 'CLAUDE.md: a new determinism baseline says the behaviour change is meant. Play the game first, then save the baseline, and say so in the commit. Approve only if the human asked for this change in behaviour.';

const HUMAN_OK_RULE = "Project rule: no branch switch without the human's OK. Approve only if the human asked for it in this session.";

function isProtectedBranch(branch) {
    const name = branch.replace(/^refs\/heads\//, '');
    return PROTECTED_BRANCHES.some((pattern) => pattern.test(name));
}

function currentBranch(root, directory) {
    const cwd = directory ? path.resolve(root, directory) : root;
    const output = lib.git(cwd, ['rev-parse', '--abbrev-ref', 'HEAD']);
    return output ? output.trim() : null;
}

function pushTargets(args) {
    const positional = [];
    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        if (arg === '--repo' || arg === '-o' || arg === '--push-option' || arg === '--receive-pack' || arg === '--exec') {
            i++;
            continue;
        }
        if (!arg.startsWith('-') || arg === '-') {
            positional.push(arg);
        }
    }
    return positional.slice(1);
}

function refspecDestination(refspec) {
    const spec = refspec.replace(/^\+/, '');
    const colon = spec.lastIndexOf(':');
    const destination = colon === -1 ? spec : spec.slice(colon + 1);
    return destination || spec.slice(0, colon);
}

function checkPush(command, root) {
    const args = command.args;
    const deleting = lib.hasFlag(args, ['--delete'], ['d']);
    const forced = lib.hasFlag(args, ['--force', '--force-with-lease', '--force-if-includes', '--mirror'], ['f']);
    const refspecs = pushTargets(args);
    const plusForced = refspecs.some((spec) => spec.startsWith('+'));
    const colonDelete = refspecs.some((spec) => spec.startsWith(':') && spec.length > 1);
    if (!(forced || plusForced || deleting || colonDelete)) {
        return;
    }
    if (lib.hasFlag(args, ['--all', '--mirror', '--branches'], [])) {
        lib.deny(root, HOOK, 'A forced or deleting push of all branches touches main. Push one branch by name instead.');
    }
    const destinations = refspecs.map(refspecDestination).filter((name) => name && name !== 'HEAD');
    if (destinations.length === 0) {
        destinations.push(currentBranch(root, command.directory) || '<unknown>');
    }
    for (const destination of destinations) {
        if (destination === '<unknown>' || isProtectedBranch(destination)) {
            const what = deleting || colonDelete ? 'Deleting' : 'Force-pushing';
            lib.deny(root, HOOK, `${what} '${destination}' is not allowed from an agent: main, master and release/* are shared. A branch that cannot be determined counts as shared. If history must change there, the human does it.`);
        }
    }
}

function switchesBranch(command) {
    const { subcommand, args } = command;
    if (args.includes('--') || lib.hasFlag(args, ['--help', '--patch'], ['h', 'p'])) {
        return false;
    }
    if (subcommand === 'switch') {
        return args.length > 0;
    }
    if (subcommand !== 'checkout') {
        return false;
    }
    const positional = args.filter((arg) => !arg.startsWith('-'));
    const creates = lib.hasFlag(args, ['--orphan', '--detach'], ['b', 'B']);
    return creates || (positional.length > 0 && !(positional.length === 1 && positional[0] === '.'));
}

function checkBranchSwitch(command, asks) {
    if (switchesBranch(command)) {
        asks.add(`git ${command.subcommand} changes the checked-out branch. ${HUMAN_OK_RULE}`);
    }
}

function checkWorktree(command, root) {
    const verb = command.args[0];
    if (command.subcommand === 'worktree' && (verb === 'remove' || verb === 'prune')) {
        lib.deny(root, HOOK, `git worktree ${verb} half-guts a worktree before the sandbox can stop it. Hand the human the exact command to run instead.`);
    }
}

function checkDestructiveGit(command, asks) {
    const { subcommand, args } = command;
    const stashVerb = args[0];
    const reasons = {
        reset: args.includes('--hard') && 'git reset --hard discards uncommitted work in the tree.',
        clean: lib.hasFlag(args, ['--force'], ['f']) && !lib.hasFlag(args, ['--dry-run'], ['n']) && 'git clean -f deletes untracked files.',
        checkout: (args.includes('--') || args.includes('.') || lib.hasFlag(args, ['--force'], ['f'])) && 'git checkout of paths or -f discards local changes.',
        restore: (lib.hasFlag(args, ['--worktree'], ['W']) || !lib.hasFlag(args, ['--staged'], ['S'])) && 'git restore discards local changes in the working tree.',
        switch: lib.hasFlag(args, ['--discard-changes', '--force'], ['f']) && 'git switch with --discard-changes/-f throws away local changes.',
        branch: (lib.hasFlag(args, [], ['D']) || (lib.hasFlag(args, ['--delete'], ['d']) && lib.hasFlag(args, ['--force'], ['f']))) && 'git branch -D deletes a branch even when it is not merged.',
        stash: !['list', 'show'].includes(stashVerb) && `git stash ${stashVerb || ''} moves or deletes uncommitted work. This tree often holds the human's unsaved work, and a stash is never the way to get a baseline: copy the tree or use a worktree.`,
    };
    const reason = reasons[subcommand];
    if (reason) {
        asks.add(`${reason} Check the real state first (git status, git log -1 --format=%an). Approve only if losing that work is intended.`);
    }
}

function rmTargets(words) {
    if (words.length === 0 || path.basename(words[0]) !== 'rm') {
        return null;
    }
    const args = words.slice(1);
    if (!lib.hasFlag(args, ['--recursive'], ['r', 'R'])) {
        return null;
    }
    return args.filter((arg) => !arg.startsWith('-'));
}

function normalizeTarget(root, target) {
    const home = process.env.HOME || '';
    const value = target.replace(/^\$HOME/, '~').replace(/^\$\{HOME\}/, '~');
    if (value === '~' || value === '~/' || (home && path.resolve(value) === path.resolve(home))) {
        return '~';
    }
    if (value === '/' || /^\/+$/.test(value)) {
        return '/';
    }
    const absolute = path.resolve(root, value.replace(/^~(?=\/|$)/, home));
    if (absolute === path.resolve(root)) {
        return '.';
    }
    if (path.resolve(root).startsWith(absolute + path.sep)) {
        return '..';
    }
    return lib.relativeToRoot(root, absolute).replace(/\/+$/, '');
}

function checkRm(words, root, asks) {
    const targets = rmTargets(words);
    if (!targets) {
        return;
    }
    for (const target of targets) {
        if (WILDCARD_RM_TARGETS.has(target)) {
            asks.add(`rm -r '${target}' deletes everything in the current directory, and this hook cannot see which directory that is. Name the paths instead, or approve if the directory is a scratch folder.`);
        }
        const normalized = normalizeTarget(root, target);
        if (PROTECTED_RM_TARGETS.has(normalized) || PROTECTED_RM_TARGETS.has(target.replace(/\/+$/, ''))) {
            lib.deny(root, HOOK, `rm -r on '${target}' would delete the project root, a top-level project folder or a home/system directory. Delete the specific files you mean, or ask the human.`);
        }
    }
}

const IN_PLACE_EDITORS = new Set(['sed', 'gsed', 'perl']);

/** Shell writes into a generated file: a redirect, tee, sed -i / perl -i, or a cp/mv onto one. */
function checkGeneratedWrites(segment, words, root, directory) {
    const targets = [];
    // A '>' inside quotes is text, not a redirect: drop it, keep the quoted words themselves.
    const unquoted = segment.replace(/'([^']*)'|"((?:\\.|[^"\\])*)"/g, (whole, single, double) => (single !== undefined ? single : double).replace(/[<>]/g, ' '));
    for (const match of unquoted.matchAll(/(?:^|[\s\d&])>>?\|?\s*([^\s<>;&|()]+)/g)) {
        targets.push(match[1]);
    }
    const name = path.basename(words[0] || '');
    const args = words.slice(1);
    if (name === 'tee') {
        targets.push(...positional(args));
    }
    if (IN_PLACE_EDITORS.has(name) && args.some((arg) => /^-[A-Za-z]*i/.test(arg) || arg.startsWith('--in-place'))) {
        targets.push(...positional(args));
    }
    if ((name === 'cp' || name === 'mv' || name === 'install') && positional(args).length > 1) {
        targets.push(positional(args).slice(-1)[0]);
    }
    for (const target of targets.filter(Boolean)) {
        const generated = lib.generatedPath(root, path.resolve(directory, target));
        if (generated) {
            lib.deny(root, HOOK, `This writes into '${generated}', which is generated. ${GENERATED_RULE}`);
        }
    }
}

function checkBaseline(words, asks) {
    const script = words.find((word) => /(^|\/)regress\.py$/.test(word));
    if (script && words.includes('--save')) {
        asks.add(`regress.py --save records a new determinism baseline. ${BASELINE_RULE}`);
    }
}

function positional(args) {
    return args.filter((arg) => !arg.startsWith('-'));
}

function nextDirectory(words, directory) {
    if (path.basename(words[0] || '') !== 'cd') {
        return directory;
    }
    const target = positional(words.slice(1))[0];
    return target ? path.resolve(directory, target.replace(/^~(?=\/|$)/, process.env.HOME || '~')) : process.env.HOME || directory;
}

lib.runHook(HOOK, (input, root) => {
    const command = (input.tool_input && input.tool_input.command) || '';
    if (!command) {
        return;
    }
    const asks = new Set();
    let directory = input.cwd ? path.resolve(input.cwd) : root;
    for (const segment of lib.splitShellSegments(command)) {
        const words = lib.stripCommandPrefixes(lib.shellWords(segment));
        checkGeneratedWrites(segment, words, root, directory);
        checkBaseline(words, asks);
        checkRm(words, root, asks);
        directory = nextDirectory(words, directory);
        const gitCommand = lib.parseGit(words);
        if (!gitCommand) {
            continue;
        }
        if (gitCommand.subcommand === 'push') {
            checkPush(gitCommand, root);
        } else {
            checkWorktree(gitCommand, root);
            checkDestructiveGit(gitCommand, asks);
            checkBranchSwitch(gitCommand, asks);
        }
    }
    if (asks.size > 0) {
        lib.ask(root, HOOK, Array.from(asks).join(' '));
    }
});
