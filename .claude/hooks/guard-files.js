'use strict';

const fs = require('fs');
const path = require('path');
const lib = require('./lib');

const HOOK = 'guard-files';

const OWN_GUARDRAILS = [/^\.claude\/hooks\//, /^\.claude\/settings\.json$/, /^\.claude\/settings\.local\.json$/, /^\.claude\/tools\//];

const GENERATED_RULE = 'CLAUDE.md, "Generated files: never edit by hand": dist/, MAP.md, SYMBOLS.tsv and docs/STATE.md are written by the tools. Change the source (js/, shell/, build.py, freshG) and run python3 tools/check.py, which rewrites them all.';

const HEADER_RULE = 'The //@ header lines at the top of each module are written by tools/map.js --headers (python3 tools/check.py runs it) and stripped by the build. Leave them exactly as they are; a new module gets its header from the tool.';

function targets(input) {
    const toolInput = input.tool_input || {};
    const found = [toolInput.file_path, toolInput.notebook_path].filter(Boolean);
    for (const edit of toolInput.edits || []) {
        if (edit && edit.file_path) {
            found.push(edit.file_path);
        }
    }
    return found;
}

function headerLines(text) {
    return String(text || '')
        .split(/\r?\n/)
        .filter((line) => line.startsWith('//@'))
        .join('\n');
}

function readOrEmpty(file) {
    try {
        return fs.readFileSync(file, 'utf8');
    } catch (error) {
        return '';
    }
}

/** An edit whose //@ lines differ before and after, or a Write that brings //@ lines the file did not have. */
function touchesHeader(input, root) {
    const toolInput = input.tool_input || {};
    const file = toolInput.file_path || '';
    if (!/^js\/.+\.js$/.test(lib.checkoutRelative(root, file))) {
        return false;
    }
    if (input.tool_name === 'Write') {
        const wanted = headerLines(toolInput.content);
        return wanted !== '' && wanted !== headerLines(readOrEmpty(path.isAbsolute(file) ? file : path.join(root, file)));
    }
    const edits = toolInput.edits && toolInput.edits.length ? toolInput.edits : [toolInput];
    return edits.some((edit) => edit && headerLines(edit.old_string) !== headerLines(edit.new_string));
}

lib.runHook(HOOK, (input, root) => {
    const found = targets(input);
    for (const target of found) {
        const generated = lib.generatedPath(root, target);
        if (generated) {
            lib.deny(root, HOOK, `'${generated}' is generated. ${GENERATED_RULE}`);
        }
    }
    if (touchesHeader(input, root)) {
        lib.deny(root, HOOK, `This changes the //@ header of '${lib.checkoutRelative(root, input.tool_input.file_path)}'. ${HEADER_RULE}`);
    }
    for (const target of found) {
        const relative = lib.checkoutRelative(root, target);
        if (OWN_GUARDRAILS.some((pattern) => pattern.test(relative))) {
            lib.ask(root, HOOK, `'${relative}' is one of the agent's own guardrails (hooks, settings, tools). Approve only if the human asked for this change; run node .claude/tools/hooks-selftest.js afterwards.`);
        }
    }
});
