'use strict';

/* Docs drift check. The documents are the map and the code is the ground; this finds the places where the
   map names something that is no longer there:

     - a backticked path or file name that is not in the repo (`js/town/talk.js`, `gfx/look.js`, `town/routines`)
     - a markdown link, or its #anchor, that goes nowhere
     - (--identifiers, advisory) a backticked camelCase or CONSTANT name that no js/ or tools/ file mentions
     - each document's sync marker: how many commits on its code since it was last reconciled

   MAP.md and docs/STATE.md are generated (python3 tools/check.py) and are not checked here. Usage:

     node .claude/tools/docs-check.js                  report
     node .claude/tools/docs-check.js --fail           exit 1 when anything is dead
     node .claude/tools/docs-check.js --identifiers    also list names no code mentions
     node .claude/tools/docs-check.js --changes DESIGN commits and diffstat since DESIGN's marker */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..', '..');
const ALLOW_FILE = path.join(ROOT, '.claude', 'tools', 'docs-check.allow');
const MARKERS_FILE = path.join(ROOT, '.claude', 'tools', 'docs-markers.json');
const MARKER_MAX_AGE_DAYS = 42;
const GENERATED_DOCS = new Set(['MAP.md', 'docs/STATE.md']);
const JS_FOLDERS = fs.readdirSync(path.join(ROOT, 'js'), { withFileTypes: true }).filter((entry) => entry.isDirectory()).map((entry) => entry.name + '/');
const PATH_ROOTS = ['js/', 'tools/', 'shell/', 'docs/', 'dist/', 'renders/', '.claude/'].concat(JS_FOLDERS);
const BARE_FILE = /^[\w.-]+\.(js|md|html|css|json|py|tsv|txt)$/;

function git(args) {
    return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore'] });
}

function readOrEmpty(file) {
    try {
        return fs.readFileSync(path.join(ROOT, file), 'utf8');
    } catch (error) {
        return '';
    }
}

function projectFiles() {
    return git(['ls-files', '-z', '--cached', '--others', '--exclude-standard', '--', '.', ':(exclude).claude/worktrees']).split('\0').filter(Boolean);
}

function buildIndex(files) {
    const fileSet = new Set(files);
    const directories = new Set();
    const basenames = new Set();
    for (const file of files) {
        basenames.add(path.posix.basename(file));
        let directory = path.posix.dirname(file);
        while (directory && directory !== '.' && !directories.has(directory)) {
            directories.add(directory);
            directory = path.posix.dirname(directory);
        }
    }
    return { files, fileSet, directories, basenames };
}

function readAllowList() {
    return new Set(readOrEmpty('.claude/tools/docs-check.allow').split(/\r?\n/).map((line) => line.replace(/#.*$/, '').trim()).filter(Boolean));
}

function docFiles(index) {
    const found = index.files.filter((file) => /\.md$/.test(file) && !GENERATED_DOCS.has(file) && !/^(dist|renders|node_modules)\//.test(file));
    return Array.from(new Set(found)).filter((file) => fs.existsSync(path.join(ROOT, file))).sort();
}

function codeLines(text) {
    let inFence = false;
    return text.split(/\r?\n/).map((line, i) => {
        if (/^\s*(```|~~~)/.test(line)) {
            inFence = !inFence;
            return { line: i + 1, text: '', fence: true };
        }
        return { line: i + 1, text: line, fence: inFence };
    });
}

function codeSpans(text) {
    const spans = [];
    for (const entry of codeLines(text)) {
        if (entry.fence) {
            continue;
        }
        for (const match of entry.text.matchAll(/(`+)([^`]+?)\1(?!`)/g)) {
            spans.push({ line: entry.line, text: match[2].trim() });
        }
    }
    return spans;
}

/* ---- paths ---- */

function globToRegExp(glob) {
    let pattern = '';
    for (let i = 0; i < glob.length; i++) {
        const c = glob[i];
        if (c === '*') {
            if (glob[i + 1] === '*') {
                pattern += '.*';
                i++;
            } else {
                pattern += '[^/]*';
            }
        } else if (c === '?') {
            pattern += '[^/]';
        } else if ('\\^$+.()|{}[]'.includes(c)) {
            pattern += '\\' + c;
        } else {
            pattern += c;
        }
    }
    return new RegExp('^' + pattern + '$');
}

function isPathLike(span) {
    if (/\s/.test(span)) {
        return false;
    }
    const bare = span.replace(/:[\d,-]+$/, '');
    if (/^[\w-]+\/$/.test(bare)) {
        return true; // a folder: `data/`, `town/`
    }
    return (PATH_ROOTS.some((root) => bare.startsWith(root)) && /^[\w./*-]+$/.test(bare)) || BARE_FILE.test(bare);
}

function checkPath(span, index, docFile) {
    const value = span.replace(/#.*$/, '').replace(/[.,;)]+$/, '').replace(/:[\d,-]+$/, '').replace(/\/+$/, '');
    if (/[<>{}…]|YYYY|\$/.test(value) || value.length < 4) {
        return null;
    }
    const candidates = [value, value + '.js', 'js/' + value, 'js/' + value + '.js', 'tools/' + value, 'shell/' + value, 'docs/' + value, path.posix.join(path.posix.dirname(docFile), value)];
    for (const candidate of candidates) {
        if (/[*?]/.test(candidate)) {
            const pattern = globToRegExp(candidate);
            if (index.files.some((file) => pattern.test(file)) || Array.from(index.directories).some((directory) => pattern.test(directory))) {
                return null;
            }
            continue;
        }
        if (index.fileSet.has(candidate) || index.directories.has(candidate) || fs.existsSync(path.join(ROOT, candidate))) {
            return null;
        }
    }
    if (!value.includes('/') && index.basenames.has(value)) {
        return null;
    }
    return `path not found: ${value}`;
}

/* ---- links ---- */

function headingSlugs(file) {
    const slugs = new Set();
    for (const entry of codeLines(readOrEmpty(file))) {
        const heading = !entry.fence && /^#{1,6}\s+(.*)$/.exec(entry.text);
        if (heading) {
            slugs.add(heading[1].trim().toLowerCase().replace(/`/g, '').replace(/[^\p{L}\p{N}\s_-]/gu, '').replace(/\s/g, '-'));
        }
    }
    return slugs;
}

function checkLinks(file, text) {
    const dead = [];
    for (const entry of codeLines(text)) {
        if (entry.fence) {
            continue;
        }
        for (const match of entry.text.matchAll(/\[[^\]]*\]\(([^)\s]+)\)/g)) {
            const target = match[1];
            if (/^[a-z]+:/i.test(target)) {
                continue;
            }
            const [targetPath, anchor] = target.split('#');
            const resolved = targetPath ? path.posix.normalize(path.posix.join(path.posix.dirname(file), targetPath.replace(/:\d+$/, ''))) : file;
            if (!fs.existsSync(path.join(ROOT, resolved))) {
                dead.push({ line: entry.line, span: target, problem: `link target not found: ${resolved}` });
            } else if (anchor && resolved.endsWith('.md') && !headingSlugs(resolved).has(anchor)) {
                dead.push({ line: entry.line, span: target, problem: `heading #${anchor} not found in ${resolved}` });
            }
        }
    }
    return dead;
}

/* ---- identifiers (advisory) ---- */

function buildCorpus(index) {
    const words = new Set();
    for (const file of index.files.filter((f) => /^(js|tools|shell)\/.*\.(js|py|html|css)$/.test(f) || f === 'build.py')) {
        for (const match of readOrEmpty(file).matchAll(/[A-Za-z_][A-Za-z0-9_]*/g)) {
            words.add(match[0]);
        }
    }
    return words;
}

function checkIdentifier(span, corpus) {
    const bare = span.replace(/\(\)$/, '');
    if (!/^[A-Za-z_][\w]*(?:\.[A-Za-z_][\w]*)*$/.test(bare)) {
        return null;
    }
    const missing = bare.split('.').filter((token) => (/^[A-Z][A-Z0-9]*(_[A-Z0-9]+)+$/.test(token) || /^[a-z]+[A-Z][A-Za-z0-9]*$/.test(token)) && !corpus.has(token));
    return missing.length ? `identifier not found in code: ${missing.join(', ')}` : null;
}

/* ---- the document pass ---- */

function checkDocs(index, allow, corpus) {
    const results = [];
    for (const file of docFiles(index)) {
        const text = readOrEmpty(file);
        const dead = checkLinks(file, text);
        const advisory = [];
        for (const span of codeSpans(text)) {
            if (allow.has(span.text) || span.text.length < 3) {
                continue;
            }
            if (isPathLike(span.text)) {
                const problem = checkPath(span.text, index, file);
                if (problem) {
                    dead.push({ line: span.line, span: span.text, problem });
                }
            } else if (corpus) {
                const problem = checkIdentifier(span.text, corpus);
                if (problem) {
                    advisory.push({ line: span.line, span: span.text, problem });
                }
            }
        }
        results.push({ file, dead, advisory });
    }
    return results;
}

/* ---- markers ---- */

function readMarkers() {
    try {
        return JSON.parse(fs.readFileSync(MARKERS_FILE, 'utf8'));
    } catch (error) {
        return {};
    }
}

function markerReport(markers) {
    const lines = [];
    let mismatches = 0;
    for (const [name, entry] of Object.entries(markers)) {
        const notes = [];
        let behind;
        try {
            git(['merge-base', '--is-ancestor', entry.hash, 'HEAD']);
            const count = git(['rev-list', '--count', `${entry.hash}..HEAD`, '--', ...entry.code]).trim();
            const age = Math.max(0, Math.floor((Date.now() - Date.parse(entry.date)) / 86400000));
            behind = `${count} commits on its code since ${entry.date} (${age} days)`;
            if (age > MARKER_MAX_AGE_DAYS && count !== '0') {
                notes.push(`marker older than ${MARKER_MAX_AGE_DAYS} days: run /docs-sync ${name}`);
            }
        } catch (error) {
            behind = `marker ${entry.hash} is not an ancestor of HEAD`;
            mismatches++;
        }
        if (!fs.existsSync(path.join(ROOT, entry.doc))) {
            notes.push(`document ${entry.doc} is missing`);
            mismatches++;
        }
        lines.push(`- **${name}** (${entry.doc}): ${behind}${notes.length ? '; ' + notes.join('; ') : ''}`);
    }
    return { lines, mismatches };
}

function printChanges(name) {
    const entry = readMarkers()[name];
    if (!entry) {
        process.stderr.write(`no marker for "${name}"; documents: ${Object.keys(readMarkers()).join(', ')}\n`);
        process.exit(2);
    }
    const range = `${entry.hash}..HEAD`;
    process.stdout.write(`# ${name}: ${range} on its code (${entry.code.join(', ')})\n\n`);
    process.stdout.write(git(['log', '--oneline', range, '--', ...entry.code]) || '(no commits)\n');
    process.stdout.write('\n');
    process.stdout.write(git(['diff', '--stat', range, '--', ...entry.code]) || '(no changes)\n');
}

function render(results, markers) {
    const deadTotal = results.reduce((sum, result) => sum + result.dead.length, 0);
    const out = ['# Docs drift report', '', `Generated by \`.claude/tools/docs-check.js\` on \`${git(['rev-parse', '--short', 'HEAD']).trim()}\`.`, ''];
    out.push(`## Dead references: ${deadTotal}`, '');
    for (const result of results.filter((entry) => entry.dead.length)) {
        out.push(`### ${result.file}`, '');
        for (const dead of result.dead) {
            out.push(`- line ${dead.line}: \`${dead.span}\` — ${dead.problem}`);
        }
        out.push('');
    }
    const advisory = results.filter((entry) => entry.advisory.length);
    if (advisory.length) {
        out.push(`## Advisory: identifiers no code mentions (names the docs say were deleted show up here too; add them to docs-check.allow)`, '');
        for (const result of advisory) {
            out.push(`### ${result.file}`, '');
            for (const item of result.advisory) {
                out.push(`- line ${item.line}: \`${item.span}\``);
            }
            out.push('');
        }
    }
    out.push('## Sync markers', '', ...(markers.lines.length ? markers.lines : ['- no .claude/tools/docs-markers.json']), '');
    return { text: out.join('\n'), deadTotal };
}

function main() {
    const args = process.argv.slice(2);
    const changesIndex = args.indexOf('--changes');
    if (changesIndex >= 0) {
        printChanges(args[changesIndex + 1]);
        return;
    }
    const index = buildIndex(projectFiles());
    const corpus = args.includes('--identifiers') ? buildCorpus(index) : null;
    const results = checkDocs(index, readAllowList(), corpus);
    const markers = markerReport(readMarkers());
    const { text, deadTotal } = render(results, markers);
    process.stdout.write(text + '\n');
    if (args.includes('--fail') && deadTotal + markers.mismatches > 0) {
        process.exit(1);
    }
}

main();
