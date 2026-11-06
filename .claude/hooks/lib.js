'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

function readInput() {
    try {
        const raw = fs.readFileSync(0, 'utf8');
        return raw.trim() ? JSON.parse(raw) : {};
    } catch (error) {
        return {};
    }
}

function projectRoot(input) {
    const root = process.env.CLAUDE_PROJECT_DIR || (input && input.cwd) || process.cwd();
    return toSlashes(path.resolve(root));
}

function toSlashes(value) {
    return String(value).replace(/\\/g, '/');
}

function relativeToRoot(root, filePath) {
    if (!filePath) {
        return '';
    }
    const absolute = toSlashes(path.isAbsolute(filePath) ? path.resolve(filePath) : path.resolve(root, filePath));
    if (absolute.toLowerCase() === root.toLowerCase().replace(/\/+$/, '')) {
        return '';
    }
    const prefix = root.endsWith('/') ? root : root + '/';
    if (absolute.toLowerCase().startsWith(prefix.toLowerCase())) {
        return absolute.slice(prefix.length);
    }
    return absolute;
}

function envName(hookName) {
    return 'DISABLE_HOOK_' + hookName.toUpperCase().replace(/[^A-Z0-9]/g, '_');
}

function isDisabled(hookName) {
    return process.env.DISABLE_NTS_HOOKS === '1' || process.env[envName(hookName)] === '1';
}

function isWarnMode() {
    return process.env.NTS_HOOK_MODE === 'warn';
}

function log(root, hookName, level, message) {
    try {
        const line = `${new Date().toISOString()} ${hookName} ${level} ${message}\n`;
        fs.appendFileSync(path.join(root, '.claude', 'hooks.log'), line);
    } catch (error) {
        return;
    }
}

function preToolDecision(root, hookName, decision, reason) {
    const text = `[hook:${hookName}] ${reason}`;
    log(root, hookName, decision, reason.split('\n')[0]);
    if (isWarnMode()) {
        process.stdout.write(JSON.stringify({ systemMessage: `${text} (NTS_HOOK_MODE=warn, not enforced)` }));
        process.exit(0);
    }
    process.stdout.write(JSON.stringify({
        hookSpecificOutput: {
            hookEventName: 'PreToolUse',
            permissionDecision: decision,
            permissionDecisionReason: text,
        },
    }));
    process.exit(0);
}

function deny(root, hookName, reason) {
    preToolDecision(root, hookName, 'deny', reason);
}

function ask(root, hookName, reason) {
    preToolDecision(root, hookName, 'ask', reason);
}

function pass() {
    process.exit(0);
}

function runHook(hookName, body) {
    if (isDisabled(hookName)) {
        pass();
    }
    let input = {};
    let root = process.cwd();
    try {
        input = readInput();
        root = projectRoot(input);
        body(input, root);
    } catch (error) {
        log(root, hookName, 'error', error && error.stack ? error.stack.split('\n')[0] : String(error));
    }
    pass();
}

function git(root, args) {
    try {
        return execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 5000 });
    } catch (error) {
        return null;
    }
}

/** CLAUDE.md, "Generated files: never edit by hand": the tools write these (python3 tools/check.py runs them all). */
const GENERATED = [/^dist\//, /^MAP\.md$/, /^SYMBOLS\.tsv$/, /^docs\/STATE\.md$/];

/** The path relative to the checkout it belongs to: a worktree under .claude/worktrees/<name>/ counts as its own root. */
function checkoutRelative(root, filePath) {
    return relativeToRoot(root, filePath).replace(/^\.claude\/worktrees\/[^/]+\//, '');
}

/** The generated file a path names (relative to its checkout), or null. */
function generatedPath(root, filePath) {
    const relative = checkoutRelative(root, filePath);
    return GENERATED.some((pattern) => pattern.test(relative)) ? relative : null;
}

function stripHeredocs(command) {
    const lines = command.split('\n');
    const kept = [];
    let delimiter = null;
    let allowTabs = false;
    for (const line of lines) {
        if (delimiter !== null) {
            const candidate = allowTabs ? line.replace(/^\t+/, '') : line;
            if (candidate.trim() === delimiter) {
                delimiter = null;
            }
            continue;
        }
        kept.push(line);
        const match = /<<(-?)\s*(['"]?)([A-Za-z_][\w.-]*)\2/.exec(line.replace(/'[^']*'|"(?:\\.|[^"\\])*"/g, (quoted) => (quoted.includes('<<') ? '""' : quoted)));
        if (match) {
            allowTabs = match[1] === '-';
            delimiter = match[3];
        }
    }
    return kept.join('\n');
}

function splitShellSegments(rawCommand) {
    const command = stripHeredocs(rawCommand);
    const segments = [];
    let current = '';
    let quote = null;
    for (let i = 0; i < command.length; i++) {
        const c = command[i];
        const next = command[i + 1];
        if (quote) {
            if (c === '\\' && quote === '"' && i + 1 < command.length) {
                current += c + next;
                i++;
                continue;
            }
            if (c === quote) {
                quote = null;
            }
            current += c;
            continue;
        }
        if (c === '\\' && i + 1 < command.length) {
            current += c + next;
            i++;
            continue;
        }
        if (c === '"' || c === "'") {
            quote = c;
            current += c;
            continue;
        }
        const isDouble = (c === '&' && next === '&') || (c === '|' && next === '|');
        if (isDouble) {
            segments.push(current);
            current = '';
            i++;
            continue;
        }
        if (c === ';' || c === '|' || c === '&' || c === '\n' || c === '(' || c === ')' || c === '`') {
            segments.push(current);
            current = '';
            continue;
        }
        if (c === '$' && next === '(') {
            segments.push(current);
            current = '';
            i++;
            continue;
        }
        current += c;
    }
    segments.push(current);
    return segments.map((s) => s.trim()).filter(Boolean);
}

function shellWords(segment) {
    const words = [];
    let current = '';
    let quote = null;
    let hasWord = false;
    for (let i = 0; i < segment.length; i++) {
        const c = segment[i];
        if (quote) {
            if (c === quote) {
                quote = null;
            } else if (c === '\\' && quote === '"' && i + 1 < segment.length) {
                current += segment[++i];
            } else {
                current += c;
            }
            continue;
        }
        if (c === '"' || c === "'") {
            quote = c;
            hasWord = true;
            continue;
        }
        if (c === '\\' && i + 1 < segment.length) {
            current += segment[++i];
            hasWord = true;
            continue;
        }
        if (/\s/.test(c)) {
            if (hasWord) {
                words.push(current);
                current = '';
                hasWord = false;
            }
            continue;
        }
        current += c;
        hasWord = true;
    }
    if (hasWord) {
        words.push(current);
    }
    return words;
}

const COMMAND_PREFIXES = new Set(['sudo', 'command', 'builtin', 'exec', 'nohup', 'time', 'env', 'nice', 'xargs']);

function stripCommandPrefixes(words) {
    let index = 0;
    while (index < words.length) {
        const word = words[index];
        if (/^[A-Za-z_][A-Za-z0-9_]*=/.test(word)) {
            index++;
            continue;
        }
        if (COMMAND_PREFIXES.has(word)) {
            index++;
            while (index < words.length && words[index].startsWith('-')) {
                index++;
            }
            continue;
        }
        break;
    }
    return words.slice(index);
}

const GIT_OPTIONS_WITH_VALUE = new Set(['-C', '-c', '--git-dir', '--work-tree', '--namespace', '--exec-path']);

function parseGit(words) {
    if (words.length === 0 || path.basename(words[0]) !== 'git') {
        return null;
    }
    let index = 1;
    let directory = null;
    while (index < words.length && words[index].startsWith('-')) {
        const option = words[index];
        if (GIT_OPTIONS_WITH_VALUE.has(option)) {
            if (option === '-C') {
                directory = words[index + 1];
            }
            index += 2;
            continue;
        }
        index++;
    }
    if (index >= words.length) {
        return null;
    }
    return { subcommand: words[index], args: words.slice(index + 1), directory };
}

function hasFlag(args, longNames, shortLetters) {
    for (const arg of args) {
        if (arg === '--') {
            return false;
        }
        if (longNames.some((name) => arg === name || arg.startsWith(name + '='))) {
            return true;
        }
        if (shortLetters && /^-[A-Za-z]+$/.test(arg)) {
            for (const letter of shortLetters) {
                if (arg.slice(1).includes(letter)) {
                    return true;
                }
            }
        }
    }
    return false;
}

module.exports = {
    readInput,
    projectRoot,
    toSlashes,
    relativeToRoot,
    isDisabled,
    isWarnMode,
    log,
    deny,
    ask,
    pass,
    runHook,
    git,
    checkoutRelative,
    generatedPath,
    stripHeredocs,
    splitShellSegments,
    shellWords,
    stripCommandPrefixes,
    parseGit,
    hasFlag,
};
