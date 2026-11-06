'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync, spawnSync } = require('child_process');

const REPO = path.resolve(__dirname, '..', '..');
const HOOKS = path.join(REPO, '.claude', 'hooks');

let passed = 0;
let failed = 0;
const failures = [];

const HEADER = '//@ town/talk — Talk\n//@ Defines: talkAct\n';

function makeFixtureRepo() {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'nts-hooks-'));
    const write = (relative, content) => {
        const file = path.join(root, relative);
        fs.mkdirSync(path.dirname(file), { recursive: true });
        fs.writeFileSync(file, content);
    };
    write('js/town/talk.js', HEADER + 'function talkAct() {}\n');
    write('js/ORDER.txt', 'town/talk.js\n');
    write('MAP.md', '# Map\n');
    write('SYMBOLS.tsv', 'talkAct\ttown/talk\t3\n');
    write('docs/STATE.md', '# Game state\n');
    write('docs/DESIGN.md', '# Design\n');
    write('dist/nothing-to-see-here.html', '<html>\n');
    write('shell/page.html', '<p id="version">v1.0</p>\n');
    const git = (...args) => execFileSync('git', args, { cwd: root, stdio: 'ignore' });
    git('init', '-q', '-b', 'main');
    git('config', 'user.email', 'selftest@example.com');
    git('config', 'user.name', 'selftest');
    git('add', '-A');
    git('commit', '-q', '-m', 'fixture');
    return { root, git };
}

function runHook(hook, input, root, env) {
    const result = spawnSync('node', [path.join(HOOKS, `${hook}.js`)], {
        input: JSON.stringify(input),
        env: Object.assign({}, process.env, { CLAUDE_PROJECT_DIR: root, DISABLE_NTS_HOOKS: '', NTS_HOOK_MODE: '' }, env || {}),
        encoding: 'utf8',
        timeout: 15000,
    });
    let decision = 'pass';
    let parsed = null;
    try {
        parsed = result.stdout.trim() ? JSON.parse(result.stdout) : null;
    } catch (error) {
        decision = 'bad-json';
    }
    if (parsed && parsed.hookSpecificOutput) {
        decision = parsed.hookSpecificOutput.permissionDecision || 'pass';
    } else if (parsed && parsed.systemMessage) {
        decision = 'warn';
    }
    if (result.status !== 0) {
        decision = `exit-${result.status}`;
    }
    return decision;
}

function expect(name, hook, input, root, expected, env) {
    const actual = runHook(hook, input, root, env);
    if (actual === expected) {
        passed++;
        return;
    }
    failed++;
    failures.push(`${hook}: ${name} -> expected ${expected}, got ${actual}`);
}

function tool(name, root, fields) {
    return { tool_name: name, tool_input: fields, cwd: root };
}

function bash(root, command) {
    return tool('Bash', root, { command });
}

function fileCases(root) {
    const hook = 'guard-files';
    const at = (relative) => path.join(root, relative);
    const edit = (relative, oldString, newString) => tool('Edit', root, { file_path: at(relative), old_string: oldString || 'a', new_string: newString || 'b' });
    const write = (relative, content) => tool('Write', root, { file_path: at(relative), content: content || 'x' });
    // generated files
    expect('edit dist', hook, edit('dist/nothing-to-see-here.html'), root, 'deny');
    expect('write dist', hook, write('dist/new.html'), root, 'deny');
    expect('edit MAP.md', hook, edit('MAP.md'), root, 'deny');
    expect('edit SYMBOLS.tsv', hook, edit('SYMBOLS.tsv'), root, 'deny');
    expect('edit docs/STATE.md', hook, edit('docs/STATE.md'), root, 'deny');
    expect('multiedit docs/STATE.md', hook, tool('MultiEdit', root, { file_path: at('docs/STATE.md'), edits: [{ old_string: 'a', new_string: 'b' }] }), root, 'deny');
    expect('relative path to MAP.md', hook, tool('Edit', root, { file_path: 'MAP.md', old_string: 'a', new_string: 'b' }), root, 'deny');
    expect('MAP.md in a worktree', hook, edit('.claude/worktrees/wt/MAP.md'), root, 'deny');
    expect('dist in a worktree', hook, write('.claude/worktrees/wt/dist/x.html'), root, 'deny');
    expect('edit docs/DESIGN.md', hook, edit('docs/DESIGN.md'), root, 'pass');
    expect('a file named MAP.md elsewhere', hook, edit('docs/MAP.md'), root, 'pass');
    // //@ headers
    expect('edit module code', hook, edit('js/town/talk.js', 'function talkAct() {}', 'function talkAct(x) {}'), root, 'pass');
    expect('edit spanning an unchanged header', hook, edit('js/town/talk.js', HEADER + 'function talkAct() {}', HEADER + 'function talkAct(x) {}'), root, 'pass');
    expect('edit a header line', hook, edit('js/town/talk.js', '//@ Defines: talkAct', '//@ Defines: talkAct, more'), root, 'deny');
    expect('add a header line', hook, edit('js/town/talk.js', 'function talkAct() {}', '//@ Defines: x\nfunction talkAct() {}'), root, 'deny');
    expect('drop a header line', hook, edit('js/town/talk.js', '//@ Defines: talkAct\n', ''), root, 'deny');
    expect('multiedit a header line', hook, tool('MultiEdit', root, { file_path: at('js/town/talk.js'), edits: [{ old_string: 'x', new_string: 'y' }, { old_string: '//@ a', new_string: '//@ b' }] }), root, 'deny');
    expect('rewrite keeping the header', hook, write('js/town/talk.js', HEADER + 'function talkAct(x) {}\n'), root, 'pass');
    expect('rewrite without a header', hook, write('js/town/talk.js', 'function talkAct(x) {}\n'), root, 'pass');
    expect('rewrite with a changed header', hook, write('js/town/talk.js', '//@ town/talk — new\nfunction talkAct() {}\n'), root, 'deny');
    expect('new module without a header', hook, write('js/town/new.js', 'function fresh() {}\n'), root, 'pass');
    expect('new module with a hand-made header', hook, write('js/town/new.js', '//@ town/new — x\nfunction fresh() {}\n'), root, 'deny');
    expect('//@ in a non-module file', hook, edit('docs/DESIGN.md', 'a', '//@ b'), root, 'pass');
    // guardrails
    expect('edit a hook', hook, edit('.claude/hooks/bash-gate.js'), root, 'ask');
    expect('edit settings.json', hook, edit('.claude/settings.json'), root, 'ask');
    expect('edit a tool', hook, edit('.claude/tools/docs-check.js'), root, 'ask');
    expect('edit a hook in a worktree', hook, edit('.claude/worktrees/wt/.claude/hooks/lib.js'), root, 'ask');
    expect('edit a rule is fine', hook, edit('.claude/rules/docs.md'), root, 'pass');
    expect('edit a skill is fine', hook, edit('.claude/skills/grill-me/SKILL.md'), root, 'pass');
    expect('outside project', hook, tool('Write', os.tmpdir(), { file_path: path.join(os.tmpdir(), 'MAP.md'), content: 'x' }), root, 'pass');
}

function bashCases(root) {
    const hook = 'bash-gate';
    const cases = [
        // generated files: the tools write them, a shell edit does not
        ['python3 tools/check.py', 'pass'],
        ['python3 build.py --dev', 'pass'],
        ['node tools/map.js --headers', 'pass'],
        ["sed -i '' 's/a/b/' MAP.md", 'deny'],
        ["sed -i.bak 's/a/b/' dist/nothing-to-see-here.html", 'deny'],
        ["perl -pi -e 's/a/b/' SYMBOLS.tsv", 'deny'],
        ['echo x > docs/STATE.md', 'deny'],
        ['echo x >> MAP.md', 'deny'],
        ['echo x >MAP.md', 'deny'],
        ['echo x > "MAP.md"', 'deny'],
        ['cd docs && echo x > STATE.md', 'deny'],
        ['echo x | tee dist/x.html', 'deny'],
        ['cp /tmp/x.html dist/nothing-to-see-here.html', 'deny'],
        ["sed -i '' 's/v1.0/v1.1/' shell/page.html", 'pass'],
        ['cat MAP.md', 'pass'],
        ["grep -n '>' MAP.md", 'pass'],
        ['grep -w talkAct SYMBOLS.tsv > /tmp/hits.txt', 'pass'],
        ['node tools/state.js 2>&1 | tail -3', 'pass'],
        ['cp MAP.md /tmp/map-before.md', 'pass'],
        ['git commit -m "update MAP.md > SYMBOLS.tsv"', 'pass'],
        // the determinism baseline is the human's call
        ['python3 tools/regress.py --save tools/regress-baseline.json', 'ask'],
        ['python3 tools/regress.py --check tools/regress-baseline.json', 'pass'],
        ['python3 tools/check.py --full', 'pass'],
        // push is allowed
        ['git push', 'pass'],
        ['git push origin main', 'pass'],
        ['git push -u origin claude/x', 'pass'],
        // rewriting a shared branch is not
        ['git push --force origin main', 'deny'],
        ['git push -f origin master', 'deny'],
        ['git push origin +main', 'deny'],
        ['git push origin --delete main', 'deny'],
        ['git push origin :main', 'deny'],
        ['git push --force', 'deny'],
        ['git push --force origin claude/x', 'pass'],
        ['git push --all --force', 'deny'],
        // destructive git asks
        ['git reset --hard', 'ask'],
        ['git reset --soft HEAD~1', 'pass'],
        ['git clean -fd', 'ask'],
        ['git clean -n', 'pass'],
        ['git checkout -- js/town/talk.js', 'ask'],
        ['git restore js/town/talk.js', 'ask'],
        ['git restore --staged js/town/talk.js', 'pass'],
        ['git branch -D old', 'ask'],
        ['git stash', 'ask'],
        ['git stash pop', 'ask'],
        ['git stash list', 'pass'],
        ['git switch other', 'ask'],
        ['git checkout -b new', 'ask'],
        ['git status', 'pass'],
        ['git log --oneline -5', 'pass'],
        ['git add -A && git commit -m "v1.36: x"', 'pass'],
        // worktrees
        ['git worktree remove .claude/worktrees/wt', 'deny'],
        ['git worktree prune', 'deny'],
        ['git worktree list', 'pass'],
        // rm
        ['rm -rf js', 'deny'],
        ['rm -rf shell', 'deny'],
        ['rm -rf docs', 'deny'],
        ['rm -rf .', 'deny'],
        ['rm -rf ~', 'deny'],
        ['rm -rf *', 'ask'],
        ['rm -rf renders/office', 'pass'],
        ['rm js/town/old.js', 'pass'],
        // ordinary
        ['npx prettier@3 --write js tools', 'pass'],
        ['cat <<EOF\ngit reset --hard\nEOF', 'pass'],
        ['echo "git reset --hard"', 'pass'],
        ['ls && git reset --hard', 'ask'],
    ];
    for (const [command, expected] of cases) {
        expect(command.split('\n')[0], hook, bash(root, command), root, expected);
    }
}

function switchCases(root) {
    const rm = bash(root, 'git reset --hard');
    expect('DISABLE_NTS_HOOKS turns every hook off', 'bash-gate', rm, root, 'pass', { DISABLE_NTS_HOOKS: '1' });
    expect('DISABLE_HOOK_BASH_GATE turns one hook off', 'bash-gate', rm, root, 'pass', { DISABLE_HOOK_BASH_GATE: '1' });
    expect('another hook switch does not', 'bash-gate', rm, root, 'ask', { DISABLE_HOOK_GUARD_FILES: '1' });
    expect('NTS_HOOK_MODE=warn only warns', 'bash-gate', rm, root, 'warn', { NTS_HOOK_MODE: 'warn' });
    expect('a malformed input passes', 'bash-gate', {}, root, 'pass');
}

function main() {
    const { root } = makeFixtureRepo();
    try {
        fileCases(root);
        bashCases(root);
        switchCases(root);
    } finally {
        fs.rmSync(root, { recursive: true, force: true });
    }
    for (const failure of failures) {
        process.stdout.write(`FAIL ${failure}\n`);
    }
    process.stdout.write(`${passed} passed, ${failed} failed\n`);
    process.exit(failed === 0 ? 0 : 1);
}

main();
